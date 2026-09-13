import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { catalog, renderSource } from "../src/lib/source/render";
import { screens } from "../src/lib/screens";
const base = "MAQUETTE ET HANDOFF/maquettes/";
const sha = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");
const files = new Map<string, string>();
const source = (name: string) => {
  if (!files.has(name)) files.set(name, readFileSync(base + name, "utf8"));
  return files.get(name)!;
};

test("Every integrated frame is a literal unchanged slice of its supplied maquette", () => {
  const chars = new Map<string, string[]>();
  let checked = 0;
  for (const entry of Object.values(catalog))
    for (const frame of entry.frames) {
      if (!chars.has(frame.source))
        chars.set(frame.source, Array.from(source(frame.source)));
      const original = chars
        .get(frame.source)!
        .slice(frame.start, frame.end)
        .join("");
      assert.equal(frame.html, original, `${frame.source}:${frame.line}`);
      assert.equal(sha(frame.html), frame.sha256);
      checked++;
    }
  assert.ok(checked > 200);
});

test("Original source CSS, scripts and canonical tokens are preserved", () => {
  for (const entry of Object.values(catalog))
    for (const frame of entry.frames) {
      const raw = source(frame.source);
      const css = [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
        .map((m) => m[1])
        .join("\n");
      assert.equal(
        readFileSync("public" + frame.cssUrl, "utf8"),
        css,
        frame.source,
      );
      const script =
        raw.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)?.[1] ??
        "";
      assert.equal(frame.script, script, frame.source);
    }
  assert.equal(
    readFileSync("public/source/tokens.css", "utf8"),
    readFileSync("MAQUETTE ET HANDOFF/tokens.css", "utf8"),
  );
});

test("Bundled font, icon and React files match the supplied asset bytes", () => {
  const bundle = readFileSync(
    "MAQUETTE ET HANDOFF/Prototype Lyads - autonome.html",
    "utf8",
  );
  const manifest = JSON.parse(
    bundle.match(
      /<script type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/,
    )![1],
  );
  const ext: Record<string, string> = {
    "text/javascript": "js",
    "font/woff2": "woff2",
    "font/woff": "woff",
    "font/ttf": "ttf",
    "image/svg+xml": "svg",
  };
  for (const [id, item] of Object.entries(manifest) as [
    string,
    { data: string; compressed: boolean; mime: string },
  ][]) {
    let bytes = Buffer.from(item.data, "base64");
    if (item.compressed) bytes = gunzipSync(bytes);
    assert.equal(
      sha(readFileSync(`public/source/${id}.${ext[item.mime]}`)),
      sha(bytes),
      id,
    );
  }
  const runtime = source("support.js")
    .replace(
      "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
      "/source/3cbe8206-414a-4557-8ffd-03d99aa988cf.js",
    )
    .replace(
      "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
      "/source/039fd9b0-0ef3-4f4c-ad5f-b5ca8260290d.js",
    );
  assert.equal(readFileSync("public/source/support.js", "utf8"), runtime);
});

test("Every published reference resolves to original frames; invented pages are absent", () => {
  for (const [ref, entry] of Object.entries(catalog)) {
    assert.ok(ref === "sent" || screens.some((s) => s.ref === ref), ref);
    const html = renderSource(ref)!;
    for (const id of Object.values(entry.defaults)) {
      const frame = entry.frames.find((f) => f.id === id);
      assert.ok(frame, id);
      assert.ok(html.includes(frame.html), ref);
    }
    for (const frame of entry.frames) {
      assert.ok(renderSource(ref, frame.id)!.includes(frame.html));
      assert.ok(existsSync("public" + frame.cssUrl));
    }
    assert.ok(!html.includes("integration-tokens.css"));
    assert.ok(!html.includes("/globals.css"));
  }
  assert.equal(catalog.A8, undefined);
  assert.equal(
    Object.keys(catalog).some((ref) => ref.startsWith("C7.")),
    false,
  );
  assert.equal(existsSync("src/app/[[...slug]]/page.tsx"), false);
});

test("Landing v2, dashboard and agent use their specific authoritative boards", () => {
  for (const [ref, name] of [
    ["A1", "Lot 7 - A1 Landing page v2.dc.html"],
    ["C1.1", "Lot 1 - C1.1 Tableau de bord.dc.html"],
    ["C2.1", "Lot 1 - Partie 3 Agent d optimisation.dc.html"],
  ]) {
    assert.ok(catalog[ref].frames.every((f) => f.source === name));
  }
});

test("Agent history selects the actual history card, excluding the board annotation", () => {
  const entry = catalog["C2.4"];
  const frame = entry.frames.find((f) => f.id === entry.defaults["1180"])!;
  assert.ok(frame.html.includes("Historique des recommandations"));
  assert.ok(
    frame.html.includes("IMPACT RÉEL") || frame.html.includes("Impact réel"),
  );
  assert.ok(!frame.html.includes("Densité variable assumée"));
});
