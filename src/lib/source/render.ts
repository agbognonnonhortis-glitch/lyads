import catalogData from "./catalog.json";
import { screens } from "../screens";
export type Frame = {
  id: string;
  width: number;
  source: string;
  start: number;
  end: number;
  line: number;
  sha256: string;
  label: string;
  html: string;
  cssUrl: string;
  script: string;
};
export type SourceEntry = {
  frames: Frame[];
  defaults: Record<string, string>;
  prototype?: { route: string; lvl: string };
};
export const catalog = catalogData as unknown as Record<string, SourceEntry>;
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function renderSource(ref: string, view?: string) {
  const entry = catalog[ref];
  if (!entry) return null;
  const override = entry.frames.find((f) => f.id === view);
  const frames = override
    ? [override]
    : Object.values(entry.defaults).map((id) =>
        entry.frames.find((f) => f.id === id)!,
      );
  const css = [...new Set(frames.map((f) => f.cssUrl))]
    .map((href) => `<link rel="stylesheet" href="${href}">`)
    .join("");
  const widths = frames.map((f) => f.width).sort((a, b) => a - b);
  let responsive = "[data-source-width]{display:none}";
  widths.forEach((width, i) => {
    const lo = i ? (width >= 1200 ? 1200 : width) : 0;
    const next = widths[i + 1];
    const hi = next ? (next >= 1200 ? 1200 : next) - 1 : null;
    responsive += `@media(min-width:${lo}px)${hi === null ? "" : ` and (max-width:${hi}px)`}{[data-source-width="${width}"]{display:block}}`;
  });
  let script = frames.find((f) => f.script)?.script ?? "";
  if (entry.prototype) {
    script += `\nconst originalMount = Component.prototype.componentDidMount;\nComponent.prototype.componentDidMount = function(){if(originalMount)originalMount.call(this);this.setState({route:'manager',lvl:'${entry.prototype.lvl}',picker:false,notes:false,vp:window.innerWidth<768?'mobile':'desktop'});};`;
  }
  const attrs =
    ref === "A1"
      ? ' data-glow="{{ glow }}" data-rotoff="{{ rotoff }}"'
      : entry.prototype
        ? ' data-vp="{{ vp }}"'
        : "";
  const config = {
    ref,
    paths: Object.fromEntries(
      screens.filter((s) => catalog[s.ref]).map((s) => [s.ref, s.path]),
    ),
    variants: entry.frames.map(({ html, script, ...rest }) => rest),
    prototype: !!entry.prototype,
  };
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(screens.find((s) => s.ref === ref)?.title ?? ref)} · Lyads</title><link rel="stylesheet" href="/source/fonts.css"><link rel="stylesheet" href="/source/icons.css"><link rel="stylesheet" href="/source/tokens.css">${css}<style>${responsive}\n[data-source-width]{margin:0 auto;width:max-content;max-width:none}body{margin:0} [data-source-go]{cursor:pointer}</style><script src="/source/support.js"></script></head><body><x-dc><div${attrs}>${frames.map((f) => `<div data-source-width="${f.width}" data-source-id="${f.id}" style="width:${entry.prototype ? "max-content" : `${f.width}px`}">${f.html}</div>`).join("")}</div></x-dc>${script ? `<script type="text/x-dc" data-dc-script>${script}</script>` : ""}<script id="source-config" type="application/json">${JSON.stringify(config).replaceAll("<", "\\u003c")}</script><script src="/source/bridge.js" defer></script></body></html>`;
}
