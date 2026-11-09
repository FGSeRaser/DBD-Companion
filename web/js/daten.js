// DBD Companion – Daten: Killer, Survivor, Perks (DE/EN), Bilder, Maps, Builds.
// Quelle ist EntityDex (https://fgseraser.github.io/EntityDex/), das alle 3 Stunden frische Daten sammelt.
// Ohne Internet werden die mitgelieferten Daten aus web/daten/ benutzt.
// von FGSeRaser – https://github.com/FGSeRaser

export const ENTITYDEX = "https://fgseraser.github.io/EntityDex/";
const cache = {};
export const herkunft = {};   // name -> "live" | "offline"

async function mitTimeout(url, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

export async function lade(name) {
  if (name in cache) return cache[name];
  try {
    cache[name] = await mitTimeout(`${ENTITYDEX}data/${name}.json?t=${Math.floor(Date.now() / 600000)}`, 7000);
    herkunft[name] = "live";
  } catch {
    try { cache[name] = await mitTimeout(`daten/${name}.json`, 5000); herkunft[name] = "offline"; }
    catch { cache[name] = null; herkunft[name] = "fehlt"; }
  }
  return cache[name];
}

// Builds und Maps direkt aus EntityDex laden (verknüpft), sonst die mitgelieferte Kopie
export async function buildsModul() {
  try { return await import(`${ENTITYDEX}js/builds.js?t=${Math.floor(Date.now() / 3600000)}`); }
  catch { return await import("./builds.js"); }
}
export async function mapsModul() {
  try { return await import(`${ENTITYDEX}js/maps.js?t=${Math.floor(Date.now() / 3600000)}`); }
  catch { return await import("./maps.js"); }
}

export const ohneHtml = (s) => String(s ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();

export function alsListe(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (typeof x === "object") return Object.entries(x).map(([id, v]) => (v && typeof v === "object" ? { id, ...v, schluessel: id } : { id, wert: v, schluessel: id }));
  return [];
}

const hübsch = (id) => String(id ?? "").replace(/^(Perk_|T_UI_iconPerks_|iconPerks_)/i, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();

export function norm(n) {
  return String(n || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[’`´]/g, "'").replace(/chilli/g, "chili").replace(/favour/g, "favor").replace(/&amp;/g, "&").replace(/[^a-z0-9]/g, "");
}

const KEYWORD_DE = { Haste: "Eile", Hindered: "Behindert", Exposed: "Ungeschützt", Exhausted: "Erschöpft", Blindness: "Blindheit", Broken: "Gebrochen",
  DeepWound: "Tiefe Wunde", Endurance: "Ausdauer", Hemorrhage: "Blutung", Haemorrhage: "Blutung", Mangled: "Verstümmelt", Oblivious: "Ahnungslos",
  Undetectable: "Unentdeckbar", Elusive: "Unauffindbar", Incapacitated: "Handlungsunfähig", Madness: "Wahnsinn" };
const INPUT = { ActivatableButton1: "Fähigkeits-Taste 1", ActivatableButton2: "Fähigkeits-Taste 2", UseItem: "Item-Taste" };

// Beschreibung lesbar machen: {Tunable.X.Name%} -> Werte je Stufe, {Keyword.X} -> Begriff, HTML -> Text
export function formatiere(beschreibung, tunables) {
  const tun = {};
  for (const [k, v] of Object.entries(tunables || {})) tun[k.toLowerCase()] = v;
  return String(beschreibung || "")
    .replace(/\{Tunable\.[^.}]+\.([^}]+)\}/g, (m, n) => {
      const w = tun[n.toLowerCase()] ?? tun[n.toLowerCase().replace(/%$/, "")];
      if (w == null) return "?";
      return Array.isArray(w) ? [...new Set(w)].join("/") : String(w);
    })
    .replace(/\{Keyword\.([^}]+)\}/g, (m, n) => { const k = n.charAt(0).toUpperCase() + n.slice(1); return k.replace(/([a-z])([A-Z])/g, "$1 $2"); })
    .replace(/\{Input\.([^}]+)\}/g, (m, n) => INPUT[n] || n)
    .replace(/<li[^>]*>/gi, "\n• ").replace(/<\/(ul|ol)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/\n{3,}/g, "\n\n").trim();
}
export const keywordDe = (t) => String(t || "").replace(/\b(Haste|Hindered|Exposed|Exhausted|Blindness|Broken|Deep Wound|Endurance|Hemorrhage|Haemorrhage|Mangled|Oblivious|Undetectable|Elusive|Incapacitated|Madness)\b/g, (m) => KEYWORD_DE[m.replace(/ /g, "")] || m);

let deutsch = null, bilder = null;
export async function uebersetzungen() {
  if (deutsch) return deutsch;
  const roh = await lade("deutsch");
  deutsch = { perks: roh?.daten?.perks || {}, charaktere: roh?.daten?.charaktere || {} };
  return deutsch;
}
export async function bilderDaten() {
  if (bilder) return bilder;
  const roh = await lade("bilder");
  // tolerant suchen: Sonderzeichen, geschützte Leerzeichen, andere Apostrophe
  const nn = (n) => String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^a-z0-9]/g, "");
  const mitNorm = (roh2, norm) => new Proxy(roh2, { get: (o, k) => { const v = o[k] || (typeof k === "string" ? norm?.[nn(k)] : undefined); return v && /IconHelp/i.test(v) ? undefined : v; } });
  bilder = { perks: mitNorm(roh?.daten?.perks || {}, roh?.daten?.perksNorm), charaktere: mitNorm(roh?.daten?.charaktere || {}, roh?.daten?.charNorm), maps: roh?.daten?.maps || {} };
  return bilder;
}

let charIndex = null;
export async function charaktere() {
  if (charIndex) return charIndex;
  const roh = await lade("charaktere");
  const de = await uebersetzungen();
  const b = await bilderDaten();
  charIndex = alsListe(roh?.daten).map((c) => {
    const name = ohneHtml(c.name || hübsch(c.id));
    return {
      schluessel: String(c.schluessel ?? c.id), id: String(c.id), name, de: de.charaktere[name] || "",
      rolle: String(c.role || "").toLowerCase().includes("killer") ? "killer" : "survivor",
      bio: formatiere(c.bio || ""), story: formatiere(c.story || ""),
      bild: b.charaktere[name] || null, perkIds: (c.perks || []).map(String), dlc: c.dlc || null,
    };
  }).filter((c) => c.name);
  // Reihenfolge wie im Spiel (Erscheinen), Survivor zuerst
  return charIndex;
}

let perkIndex = null;
export async function perks() {
  if (perkIndex) return perkIndex;
  const roh = await lade("perks");
  const chars = await charaktere();
  const de = await uebersetzungen();
  const b = await bilderDaten();
  const nachSchluessel = new Map(chars.map((c) => [String(c.schluessel), c]));
  const liste = [];
  for (const rolle of ["survivor", "killer"]) {
    let eintraege = alsListe(roh?.daten?.[rolle]?.perks ?? roh?.daten?.[rolle]).filter((p) => p && (p.name || p.id));
    for (const p of eintraege) {
      const name = ohneHtml(p.name || hübsch(p.id));
      const ch = p.character != null ? nachSchluessel.get(String(p.character)) : null;
      liste.push({
        id: String(p.schluessel ?? p.id ?? name), name, de: de.perks[name] || "", rolle,
        text: formatiere(p.description || "", p.tunables),
        charakter: ch ? ch.name : "", charakterDe: ch ? ch.de : "",
        bild: b.perks[name] || null,
      });
    }
  }
  const gesehen = new Set();
  perkIndex = liste.filter((p) => !gesehen.has(p.rolle + p.name) && gesehen.add(p.rolle + p.name)).sort((a, b2) => a.name.localeCompare(b2.name));
  return perkIndex;
}

export async function schrein() {
  const roh = await lade("schrein");
  return roh?.daten || null;
}

// Maps mit Realm, Bild und Text
export async function maps() {
  const { REALMS } = await mapsModul();
  const b = await bilderDaten();
  const liste = [];
  for (const r of REALMS) for (const m of r.maps) {
    const info = b.maps[m] || {};
    liste.push({ id: m, name: m, realm: r.realm, bild: info.bild || null, text: info.text || "" });
  }
  return liste;
}
