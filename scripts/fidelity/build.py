from pathlib import Path
import re,json,csv,hashlib,gzip,base64,sys
from source_html import Document
ROOT=Path(__file__).resolve().parents[2];BASE=ROOT/'MAQUETTE ET HANDOFF/maquettes';OUT=ROOT/'src/lib/source';PUBLIC=ROOT/'public/source';OUT.mkdir(exist_ok=True,parents=True);PUBLIC.mkdir(exist_ok=True,parents=True)
# Extract the exact bundled dependency bytes, never substitute a font or icon set.
bundle=(ROOT/'MAQUETTE ET HANDOFF/Prototype Lyads - autonome.html').read_text()
manifest=json.loads(re.search(r'<script type="__bundler/manifest"[^>]*>(.*?)</script>',bundle,re.S)[1]);template=json.loads(re.search(r'<script type="__bundler/template"[^>]*>(.*?)</script>',bundle,re.S)[1]);assetmap={}
for key,item in manifest.items():
 data=base64.b64decode(item['data']);data=gzip.decompress(data) if item.get('compressed') else data
 ext={'text/javascript':'js','font/woff2':'woff2','font/woff':'woff','font/ttf':'ttf','image/svg+xml':'svg'}[item['mime']]
 name=key+'.'+ext;(PUBLIC/name).write_bytes(data);assetmap[key]='/source/'+name
styles=re.findall(r'<style[^>]*>(.*?)</style>',template,re.S)
for name,css in [('fonts.css',styles[0]),('icons.css',styles[1])]:
 for k,v in assetmap.items():css=css.replace(k,v)
 (PUBLIC/name).write_text(css)
runtime=(BASE/'support.js').read_text().replace('https://unpkg.com/react@18.3.1/umd/react.production.min.js',assetmap['3cbe8206-414a-4557-8ffd-03d99aa988cf']).replace('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',assetmap['039fd9b0-0ef3-4f4c-ad5f-b5ca8260290d'])
(PUBLIC/'support.js').write_text(runtime)
(PUBLIC/'tokens.css').write_bytes((ROOT/'MAQUETTE ET HANDOFF/tokens.css').read_bytes())
cat={}; sources={};hashes=[]
known={r['reference'] for r in csv.DictReader((ROOT/'MAQUETTE ET HANDOFF/SCREENS_MANIFEST.csv').open())}
def source(name):
 if name not in sources:
  raw=(BASE/name).read_text();sources[name]={'doc':Document(raw),'css':'\n'.join(re.findall(r'<style[^>]*>(.*?)</style>',raw,re.S)),'script':re.search(r'<script type="text/x-dc"[^>]*>(.*?)</script>',raw,re.S)}
 return sources[name]
def add(ref,name,n,width,label='',default=False):
 d=source(name)['doc'];html=d.html(n);sha=hashlib.sha256(html.encode()).hexdigest();key=hashlib.sha256((name+str(n.start)).encode()).hexdigest()[:12]
 frame={'id':key,'width':width,'source':name,'start':n.start,'end':n.end,'line':d.source.count('\n',0,n.start)+1,'sha256':sha,'label':label,'html':html}
 entry=cat.setdefault(ref,{'frames':[],'defaults':{}})
 if not any(f['id']==key for f in entry['frames']):entry['frames'].append(frame)
 if str(width) not in entry['defaults'] or default:entry['defaults'][str(width)]=key
 hashes.append({'ref':ref,**{k:v for k,v in frame.items() if k!='html'}})
# Main frames and authored variants, extracted as literal source substrings.
for p in BASE.glob('*.html'):
 if p.name=='Prototype Lyads.dc.html' or 'Coquille' in p.name or 'Etape 5' in p.name:continue
 d=source(p.name)['doc']
 for i,f in enumerate(d.frames()):
  n=f['node'];style=n.attrs.get('style','').replace(' ','')
  if 'overflow:hidden' not in style:continue
  refs=[f['ref']] if f['ref'] in known else re.findall(r'(?<!\w)(?:C\d+\.\d+|[AB]\d+)',f['label'])
  if p.name.startswith('Lot 1 - C1.1'):refs=['C1.1']
  elif p.name.startswith('Lot 1 - C1.2'):refs=['C1.2']
  elif p.name.startswith('Lot 1 - Partie 3'):refs={0:['C2.1'],1:['C2.1'],2:['C2.2'],4:['C2.5']}.get(i,[])
  elif p.name.startswith('Lot 7 - A1'):refs=['A1']
  elif p.name.startswith('Lot 2'):refs=['C3.1'] if i in [1,4,7,10,13,15,16] else []
  elif p.name.startswith('Lot 5') and i in [0,1,3]:refs=['C8.1']
  if p.name=='Lot 7 - Site public.dc.html' and f['ref']=='A1':continue
  if len(refs)>2:continue
  for ref in refs:
   if ref in known:add(ref,p.name,n,f['width'],f['label'])
# Panels provided outside full-width page frames.
name='Lot 1 - Partie 3 Agent d optimisation.dc.html';d=source(name)['doc']
for ref,width in [('C2.2',640),('C2.4',1180),('C2.5',820)]:
 nodes=[n for n in d.nodes if re.search(r'(?:^|;)width:'+str(width)+r'px(?:;|$)',n.attrs.get('style','')) and (ref=='C2.5' or 'overflow:hidden' in n.attrs.get('style',''))]
 add(ref,name,nodes[0],width,ref)
# Four exact confirmation cards (their labelled presentation wrappers are omitted).
for n in d.nodes:
 if n.attrs.get('style','').startswith('width:560px;') and n.children:
  cards=[c for c in n.children if 'overflow:hidden' in c.attrs.get('style','')]
  if cards:add('C2.3',name,cards[0],560,n.children[0].text)
# Shared text/creative frame.
if 'C4.7' not in cat:cat['C4.7']=cat['C4.6']
# Auxiliary screens that actually exist in the supplied files.
name='Lot 7 - Site public.dc.html';fs=source(name)['doc'].frames()
for ref,indices in [('verify',[25,26]),('reset',[33]),('sent',[32])]:
 for i in indices:f=fs[i];add(ref,name,f['node'],f['width'],f['label'])
for ref in ['terms','privacy','cookies']:cat[ref]=cat['A7']
# C9.5 uses the explicitly public frame rather than the editor's preview frame.
name='Lot 5 - Intelligence marche et Rapports.dc.html';f=source(name)['doc'].frames()[65];add('C9.5',name,f['node'],1440,f['label'],True)
# The source prototype supplies the two manager levels absent from standalone boards.
name='Prototype Lyads.dc.html';d=source(name)['doc'];n=next(n for n in d.nodes if 'data-frame' in n.attrs)
for ref,lvl in [('C3.2','set'),('C3.3','ad')]:
 add(ref,name,n,1440,'Prototype · gestionnaire · '+lvl);cat[ref]['prototype']={'route':'manager','lvl':lvl}
# Source stylesheet and logic remain unchanged; URLs are local dependency addresses only.
for name,src in sources.items():
 key=hashlib.sha256(name.encode()).hexdigest()[:12]
 (PUBLIC/(key+'.css')).write_text(src['css'])
 src['cssUrl']='/source/'+key+'.css'
 if src['script']:
  (PUBLIC/(key+'.logic.js')).write_text(src['script'][1]);src['scriptUrl']='/source/'+key+'.logic.js'
for entry in cat.values():
 for f in entry['frames']:
  src=sources[f['source']];f['cssUrl']=src['cssUrl'];f['script']=src['script'][1] if src['script'] else ''
# Keep only references with supplied artwork. No invented Contact or Rules UI.
(OUT/'catalog.json').write_text(json.dumps(cat,ensure_ascii=False,separators=(',',':')))
(ROOT/'docs/fidelity/extraction.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2))
print('References:',len(cat),'Frames:',sum(len(v['frames']) for v in cat.values()))
print('Absent:',sorted(known-set(cat)))
