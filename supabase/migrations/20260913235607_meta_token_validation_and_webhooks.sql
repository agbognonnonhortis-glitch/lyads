begin;

alter table public.lyads_meta_connections
 add column meta_app_id text check(meta_app_id ~ '^\d+$'),
 add column token_checked_at timestamptz;

create or replace function public.lyads_save_meta_connection(target_workspace uuid,meta_user text,scopes text[],permissions jsonb,token_expiry timestamptz,encrypted_token text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare connection uuid; begin
 insert into public.lyads_meta_connections(workspace_id,meta_user_id,granted_scopes,permission_status,expires_at,checked_at,connection_status)
 values(target_workspace,meta_user,scopes,permissions,token_expiry,now(),case when 'ads_read'=any(scopes) or 'ads_management'=any(scopes) then 'connected' else 'partial' end)
 on conflict(workspace_id,meta_user_id) do update set granted_scopes=excluded.granted_scopes,permission_status=excluded.permission_status,expires_at=excluded.expires_at,checked_at=now(),connection_status=excluded.connection_status,revoked_at=null,meta_app_id=null,token_checked_at=null,data_access_expires_at=null
 returning id into connection;
 insert into public.lyads_meta_credentials(connection_id,ciphertext,key_version) values(connection,encrypted_token,'v1')
 on conflict(connection_id) do update set ciphertext=excluded.ciphertext,key_version=excluded.key_version,updated_at=now();
 return connection;
end $$;

create function public.lyads_save_verified_meta_connection(target_workspace uuid,meta_user text,scopes text[],permissions jsonb,token_expiry timestamptz,encrypted_token text,token_app text,data_expiry timestamptz)
returns uuid language plpgsql security invoker set search_path='' as $$
declare conn uuid; begin
 if token_app is null or token_app !~ '^\d+$' then raise exception 'Invalid app'; end if;
 conn:=public.lyads_save_meta_connection(target_workspace,meta_user,scopes,permissions,token_expiry,encrypted_token);
 update public.lyads_meta_connections set meta_app_id=token_app,data_access_expires_at=data_expiry,token_checked_at=now(),
 connection_status=case when scopes @> array['ads_read','ads_management','business_management','pages_show_list','pages_read_engagement'] then 'connected' else 'partial' end where id=conn;
 return conn;
end $$;

-- Serialize with OAuth replacement before checking the ciphertext. An old job
-- must never validate, overwrite permissions or invalidate a newly saved token.
create function public.lyads_record_meta_validation(target_connection uuid,expected_ciphertext text,token_app text,token_expiry timestamptz,data_expiry timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if token_app is null or token_app !~ '^\d+$' then raise exception 'Invalid app'; end if;
 perform 1 from public.lyads_meta_connections where id=target_connection for update;
 if not exists(select 1 from public.lyads_meta_credentials where connection_id=target_connection and ciphertext=expected_ciphertext) then return false;end if;
 update public.lyads_meta_connections set meta_app_id=token_app,expires_at=token_expiry,data_access_expires_at=data_expiry,token_checked_at=now() where id=target_connection and revoked_at is null;
 return found;
end $$;

create function public.lyads_record_meta_permissions(target_connection uuid,expected_ciphertext text,scopes text[],permissions jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.lyads_meta_connections where id=target_connection for update;
 if not exists(select 1 from public.lyads_meta_credentials where connection_id=target_connection and ciphertext=expected_ciphertext) then return false;end if;
 update public.lyads_meta_connections set granted_scopes=scopes,permission_status=permissions,checked_at=now(),
 connection_status=case when scopes @> array['ads_read','ads_management','business_management','pages_show_list','pages_read_engagement'] then 'connected' else 'partial' end
 where id=target_connection and revoked_at is null;
 return found;
end $$;

create function public.lyads_invalidate_meta_token(target_connection uuid,expected_ciphertext text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.lyads_meta_connections where id=target_connection for update;
 if not exists(select 1 from public.lyads_meta_credentials where connection_id=target_connection and ciphertext=expected_ciphertext) then return false;end if;
 update public.lyads_meta_connections set connection_status='expired' where id=target_connection and revoked_at is null;
 return found;
end $$;

create table lyads_private.meta_webhook_receipts (
 app_id text not null check(app_id ~ '^\d+$'),
 body_hash text not null check(body_hash ~ '^[a-f0-9]{64}$'),
 received_at timestamptz not null default now(),
 primary key(app_id,body_hash)
);
create index meta_webhook_receipts_received_idx on lyads_private.meta_webhook_receipts(received_at);
alter table lyads_private.meta_webhook_receipts enable row level security;
revoke all on lyads_private.meta_webhook_receipts from public,anon,authenticated;
grant select,insert,delete on lyads_private.meta_webhook_receipts to service_role;

-- Called only after HMAC validation at the Edge boundary. Store no raw webhook
-- payload. A webhook can only bring forward an already authorized read sync.
create function public.lyads_receive_meta_webhook(token_app text,body_hash text,account_ids text[])
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if token_app is null or token_app !~ '^\d+$' or body_hash is null or body_hash !~ '^[a-f0-9]{64}$' or account_ids is null or cardinality(account_ids)>200 then raise exception 'Invalid event';end if;
 if exists(select 1 from unnest(account_ids) as x(id) where id is null or id !~ '^act_\d+$') then raise exception 'Invalid account';end if;
 insert into lyads_private.meta_webhook_receipts(app_id,body_hash) values(token_app,body_hash) on conflict do nothing;
 if not found then return false;end if;
 update public.lyads_meta_sync_settings s set next_sync_at=least(s.next_sync_at,now()+interval '1 minute')
 from public.lyads_ad_accounts a join public.lyads_meta_connections c on c.id=a.connection_id
 where s.ad_account_id=a.id and s.workspace_id=a.workspace_id and s.enabled
 and a.meta_account_id=any(account_ids) and c.meta_app_id=token_app and c.revoked_at is null
 and c.connection_status in ('connected','partial')
 and exists(select 1 from public.lyads_onboarding o where o.workspace_id=a.workspace_id and a.id=any(o.ad_account_ids));
 return true;
end $$;

revoke all on function public.lyads_save_verified_meta_connection(uuid,text,text[],jsonb,timestamptz,text,text,timestamptz),public.lyads_record_meta_validation(uuid,text,text,timestamptz,timestamptz),public.lyads_record_meta_permissions(uuid,text,text[],jsonb),public.lyads_invalidate_meta_token(uuid,text),public.lyads_receive_meta_webhook(text,text,text[]) from public,anon,authenticated;
grant execute on function public.lyads_save_verified_meta_connection(uuid,text,text[],jsonb,timestamptz,text,text,timestamptz),public.lyads_record_meta_validation(uuid,text,text,timestamptz,timestamptz),public.lyads_record_meta_permissions(uuid,text,text[],jsonb),public.lyads_invalidate_meta_token(uuid,text),public.lyads_receive_meta_webhook(text,text,text[]) to service_role;

create or replace function public.lyads_schedule_due_jobs() returns void language plpgsql security invoker set search_path='' as $$
declare setting record; begin
 delete from lyads_private.meta_webhook_receipts where received_at<now()-interval '30 days';
 delete from public.lyads_meta_oauth_states where expires_at<now();
 for setting in select s.*,a.connection_id,w.owner_id from public.lyads_meta_sync_settings s join public.lyads_ad_accounts a on a.id=s.ad_account_id join public.lyads_workspaces w on w.id=s.workspace_id join public.lyads_meta_connections c on c.id=a.connection_id where s.enabled and s.next_sync_at<=now() and c.revoked_at is null and c.connection_status in ('connected','partial') and (c.expires_at is null or c.expires_at>now()) and (c.data_access_expires_at is null or c.data_access_expires_at>now()) order by s.next_sync_at for update of s skip locked limit 50 loop
  if not exists(select 1 from public.lyads_jobs where ad_account_id=setting.ad_account_id and kind='meta.sync' and status in ('queued','running')) then
   insert into public.lyads_jobs(workspace_id,ad_account_id,requested_by,kind,idempotency_key,priority,payload) values(setting.workspace_id,setting.ad_account_id,setting.owner_id,'meta.sync','scheduled:'||setting.ad_account_id||':'||setting.next_sync_at,10,jsonb_build_object('connection_id',setting.connection_id,'history_days',setting.history_days,'revision_days',setting.revision_days)) on conflict do nothing;
   update public.lyads_meta_sync_settings set next_sync_at=now()+make_interval(mins=>interval_minutes) where ad_account_id=setting.ad_account_id;
  end if;
 end loop;
 -- Permissions may be withdrawn before the nominal token expiry.
 insert into public.lyads_jobs(workspace_id,requested_by,kind,idempotency_key,priority,payload)
 select c.workspace_id,w.owner_id,'meta.refresh_permissions','permissions:'||c.id||':'||to_char(now() at time zone 'UTC','YYYY-MM-DD-HH24'),5,jsonb_build_object('connection_id',c.id)
 from public.lyads_meta_connections c join public.lyads_workspaces w on w.id=c.workspace_id where c.revoked_at is null and c.connection_status in ('connected','partial') and (c.checked_at is null or c.checked_at<now()-interval '1 day' or c.token_checked_at is null or c.token_checked_at<now()-interval '6 hours') and not exists(select 1 from public.lyads_jobs j where j.kind='meta.refresh_permissions' and j.status in ('queued','running') and j.payload->>'connection_id'=c.id::text) on conflict do nothing;
 update public.lyads_meta_connections set connection_status='expired' where revoked_at is null and ((expires_at is not null and expires_at<=now()) or (data_access_expires_at is not null and data_access_expires_at<=now()));
 insert into public.lyads_notifications(workspace_id,user_id,event_key,kind,message)
 select c.workspace_id,w.owner_id,'expiry:'||c.id||':'||coalesce(c.expires_at::text,c.data_access_expires_at::text,c.checked_at::text),'meta.reconnect','La connexion Meta a expiré. Reconnectez votre compte pour reprendre la synchronisation.'
 from public.lyads_meta_connections c join public.lyads_workspaces w on w.id=c.workspace_id where c.connection_status='expired' on conflict(user_id,event_key) do nothing;
 delete from public.lyads_insight_staging s using public.lyads_jobs j where s.job_id=j.id and j.status in ('failed','cancelled') and j.updated_at<now()-interval '1 day';
end $$;

commit;
