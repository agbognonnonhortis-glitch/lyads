"use client";
import {
  useEffect,
  useRef,
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  WarningCircle,
  Sparkle,
  MagnifyingGlass,
  CaretDown,
} from "@phosphor-icons/react";
import { route } from "@/lib/screens";
import { useApp, Creative } from "@/lib/store";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
  return (
    <button className={`btn ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function Go({
  to,
  children,
  variant = "secondary",
  className = "",
  onClick,
}: {
  to: string;
  children: ReactNode;
  variant?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      onClick={onClick}
      prefetch={false}
      className={`btn ${variant} ${className}`}
      href={to.startsWith("/") ? to : route(to)}
    >
      {children}
    </Link>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}
export function Area({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
const statuses: Record<string, [string, string]> = {
  active: ["▲ Active", "good"],
  en_pause: ["‖ En pause", "neutral"],
  budget_epuise: ["■ Budget épuisé", "bad"],
  apprentissage_limite: ["◆ Apprentissage limité", "warn"],
  en_apprentissage: ["◐ Apprentissage", "info"],
  rejetee: ["▼ Rejetée", "bad"],
  programmee: ["◷ Programmée", "neutral"],
  en_revision: ["◷ En révision", "neutral"],
  erreur: ["▼ Erreur", "bad"],
};
export function Status({ status }: { status: string }) {
  const [label, tone] = statuses[status] ?? [status, "neutral"];
  return <Badge tone={tone}>{label}</Badge>;
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-actions">{action}</div>}
    </div>
  );
}
export function Empty({
  title = "Aucune donnée pour le moment",
  description = "Choisissez un autre compte ou créez votre premier élément.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <MagnifyingGlass size={30} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Alert({
  children,
  tone = "warn",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`alert ${tone}`}>
      <WarningCircle size={22} />
      <div>{children}</div>
    </div>
  );
}
export function AgentBox({ children }: { children: ReactNode }) {
  return (
    <Card className="agent-box">
      <div className="agent-label">
        <Sparkle size={18} weight="fill" /> Lyads propose
      </div>
      {children}
    </Card>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Progression"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: Math.max(0, Math.min(value, 100)) + "%" }} />
    </div>
  );
}
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <Button variant="icon" aria-label="Fermer" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={"switch-wrap"}
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
    >
      <span className={"switch " + (checked ? "on" : "")}>
        <span />
      </span>
    </button>
  );
}
export function Search({
  value,
  onChange,
  placeholder = "Rechercher…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search">
      <MagnifyingGlass size={20} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function Thumb({
  creative,
  small = false,
}: {
  creative: Creative;
  small?: boolean;
}) {
  return (
    <div className={`creative-art ${creative.color} ${small ? "small" : ""}`}>
      <div className="creative-brand">
        {creative.accountId === "market" ? (
          creative.name
        ) : (
          <>
            KOLA<span>BEAUTÉ</span>
          </>
        )}
      </div>
      <div className="creative-copy">
        {creative.created || creative.accountId === "market" ? (
          creative.text.slice(0, 62)
        ) : (
          <>
            {creative.id.endsWith("2") ? "Votre rituel." : "Le karité,"}
            <br />
            {creative.id.endsWith("2") ? "Naturellement." : "simplement."}
          </>
        )}
      </div>
      <span className="creative-format">{creative.format} · Démonstration</span>
    </div>
  );
}
export function Chart({
  variant = "spend",
  compact = false,
}: {
  variant?: string;
  compact?: boolean;
}) {
  const path =
    variant === "spend"
      ? "M0 145 L35 132 L70 145 L105 90 L140 110 L175 80 L210 93 L245 45 L280 65 L315 25 L350 55 L385 38 L420 42 L455 18 L490 39 L525 24 L560 15"
      : "M0 120 L35 115 L70 100 L105 110 L140 78 L175 83 L210 57 L245 68 L280 28 L315 55 L350 40 L385 70 L420 45 L455 65 L490 52 L525 86 L560 61";
  return (
    <div className={compact ? "chart compact" : "chart"}>
      <svg
        viewBox="0 0 560 190"
        role="img"
        aria-label="Évolution de démonstration sur la période"
      >
        <defs>
          <linearGradient id={"fill-" + variant} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--ly-primary-400)" stopOpacity=".22" />
            <stop
              offset="1"
              stopColor="var(--ly-primary-400)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        {[35, 80, 125, 170].map((y) => (
          <line
            key={y}
            x1="0"
            x2="560"
            y1={y}
            y2={y}
            stroke="var(--ly-border)"
            strokeDasharray="4 5"
          />
        ))}
        <path d={path + " L560 190 L0 190 Z"} fill={`url(#fill-${variant})`} />
        <path
          d="M0 160 L70 134 L140 145 L210 99 L280 108 L350 89 L420 95 L490 65 L560 78"
          fill="none"
          stroke="var(--ly-neutral-400)"
          strokeWidth="2"
          strokeDasharray="5 5"
        />
        <path
          d={path}
          fill="none"
          stroke="var(--ly-primary-600)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <div className="chart-labels">
          <span>Lun.</span>
          <span>Mar.</span>
          <span>Mer.</span>
          <span>Jeu.</span>
          <span>Ven.</span>
          <span>Sam.</span>
          <span>Dim.</span>
        </div>
      )}
    </div>
  );
}
export function download(name: string, body: string, type = "text/plain") {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Toast() {
  const toast = useApp((s) => s.toast);
  const notify = useApp((s) => s.notify);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => notify(""), 4500);
    return () => clearTimeout(id);
  }, [toast, notify]);
  return toast ? (
    <div role="status" className="toast">
      <Check size={20} />
      <span>{toast}</span>
      <button aria-label="Fermer le message" onClick={() => notify("")}>
        <X size={18} />
      </button>
    </div>
  ) : null;
}
