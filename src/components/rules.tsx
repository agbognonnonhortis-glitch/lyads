"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import { Rule } from "@/lib/domain";
import { route } from "@/lib/screens";
import {
  Button,
  Go,
  Card,
  Field,
  Select,
  Heading,
  Badge,
  Empty,
  Toggle,
  Alert,
  Modal,
} from "./ui";
export function Rules({ refId }: { refId: string }) {
  const s = useApp(),
    router = useRouter(),
    n = Number(refId.split(".")[1]);
  const [name, setName] = useState("Surveiller le coût par achat"),
    [metric, setMetric] = useState("CPA"),
    [operator, setOperator] = useState("supérieur"),
    [threshold, setThreshold] = useState(18000),
    [action, setAction] = useState("Notifier"),
    [confirm, setConfirm] = useState(false);
  const rules = s.rules.filter((r) => r.accountId === s.accountId);
  const matching = (r: Rule) =>
    s.campaigns
      .filter((c) => c.accountId === s.accountId && c.active)
      .filter((c) => {
        const value =
          r.metric === "CPA" ? c.cpa : r.metric === "ROAS" ? c.roas : c.spend;
        return (
          value !== null &&
          (r.operator === "supérieur"
            ? value > r.threshold
            : value < r.threshold)
        );
      });
  const run = () => {
    setConfirm(false);
    if (!s.guard()) return;
    let count = 0;
    rules
      .filter((r) => r.active)
      .forEach((r) =>
        matching(r).forEach((c) => {
          if (
            r.action === "Mettre en pause" &&
            useApp.getState().campaigns.find((x) => x.id === c.id)?.active
          )
            s.toggleCampaign(c.id);
          s.log(`${r.name} → ${r.action} : ${c.name}`, "rule-run");
          count++;
        }),
      );
    s.notify(`${count} correspondance(s) traitée(s) en démonstration`);
  };
  return (
    <>
      <Heading
        eyebrow="Garde-fous"
        title={
          n === 1
            ? "Règles automatisées"
            : n === 2
              ? "Créer une règle"
              : "Historique d’exécution"
        }
        description="Définissez une condition et son action. L’exécution est manuelle dans cette intégration locale."
        action={
          <Go to="C7.2" variant="primary">
            Créer une règle
          </Go>
        }
      />
      {n === 1 ? (
        <div className="stack">
          <Alert>
            Les règles ne tournent pas en arrière-plan. Le bouton de simulation
            permet d’observer leur effet sur les campagnes fictives.
          </Alert>
          <div>
            <Button variant="secondary" onClick={() => setConfirm(true)}>
              Simuler les règles actives
            </Button>
          </div>
          {rules.length ? (
            <Card>
              {rules.map((r) => (
                <div className="list-row wrap" key={r.id}>
                  <Toggle
                    label={"Activer " + r.name}
                    checked={r.active}
                    onChange={() => s.saveRule({ ...r, active: !r.active })}
                  />
                  <div className="grow">
                    <h3>{r.name}</h3>
                    <p className="inline-note">
                      SI {r.metric} {r.operator} à {r.threshold} → {r.action}
                    </p>
                  </div>
                  <Badge>{matching(r).length} campagne(s)</Badge>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (!s.guard()) return;
                      s.patch({ rules: s.rules.filter((x) => x.id !== r.id) });
                      s.log("Règle supprimée : " + r.name, "rule");
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </Card>
          ) : (
            <Empty title="Aucune règle sur ce compte" />
          )}
        </div>
      ) : n === 2 ? (
        <div className="detail-width">
          <Card>
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !name.trim() ||
                  !Number.isFinite(threshold) ||
                  threshold < 0
                )
                  return;
                const r: Rule = {
                  id: crypto.randomUUID(),
                  accountId: s.accountId,
                  name,
                  metric,
                  operator,
                  threshold,
                  action,
                  active: true,
                };
                if (s.saveRule(r)) router.push(route("C7.1"));
              }}
            >
              <Field
                label="Nom de la règle"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="grid3">
                <Select
                  label="Si l’indicateur"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {["CPA", "ROAS", "Dépenses"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </Select>
                <Select
                  label="Est"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                >
                  <option>supérieur</option>
                  <option>inférieur</option>
                </Select>
                <Field
                  label="Au seuil"
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(+e.target.value)}
                />
              </div>
              <Select
                label="Alors"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option>Notifier</option>
                <option>Mettre en pause</option>
              </Select>
              <Alert tone="info">
                Portée : campagnes actives du compte sélectionné. Les conditions
                strictement identiques avec des actions différentes sont
                refusées.
              </Alert>
              <Button>Enregistrer la règle</Button>
            </form>
          </Card>
        </div>
      ) : s.activity.filter(
          (a) => a.kind === "rule-run" && a.accountId === s.accountId,
        ).length ? (
        <Card>
          {s.activity
            .filter((a) => a.kind === "rule-run" && a.accountId === s.accountId)
            .map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  <h3>{a.label}</h3>
                  <small>
                    {new Date(a.at).toLocaleString("fr-FR")} · simulation
                  </small>
                </div>
              </div>
            ))}
        </Card>
      ) : (
        <Empty
          title="Aucune exécution pour le moment"
          action={<Go to="C7.1">Voir les règles</Go>}
        />
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Simuler les règles"
      >
        <div className="stack">
          <p>
            {rules
              .filter((r) => r.active)
              .reduce((n, r) => n + matching(r).length, 0)}{" "}
            correspondance(s). Les actions « Mettre en pause » modifieront les
            campagnes locales.
          </p>
          <Button onClick={run}>Confirmer la simulation</Button>
        </div>
      </Modal>
    </>
  );
}
