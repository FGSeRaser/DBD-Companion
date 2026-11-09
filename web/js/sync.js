// EntityDex ⇄ DBD Companion – Konto & Challenge-Sync über Supabase.
// Die gleiche Datei steckt in EntityDex (Handy) und im DBD Companion (PC).
// Zusammenführen: Pro Challenge gewinnt die neueste Änderung. Gelöschte Challenges werden als „gelöscht“ markiert,
// damit sie nicht auf dem anderen Gerät wieder auftauchen.
// von FGSeRaser – https://github.com/FGSeRaser

const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
let client = null, konfig = null, kanal = null;

// Konfiguration: zuerst live aus EntityDex (dort trägt man sie einmal ein), sonst lokale Kopie
async function ladeKonfig() {
  if (konfig) return konfig;
  const quellen = ["https://fgseraser.github.io/EntityDex/js/sync-config.js", "./sync-config.js"];
  for (const q of quellen) {
    try {
      const m = await import(q + (q.startsWith("http") ? `?t=${Math.floor(Date.now() / 3600000)}` : ""));
      if (m.SUPABASE_URL && m.SUPABASE_KEY && !m.SUPABASE_URL.includes("DEIN-PROJEKT")) { konfig = m; return konfig; }
    } catch {}
  }
  return null;
}

// nur für Tests
export function __testClient(c) { client = c; konfig = { SUPABASE_URL: "test", SUPABASE_KEY: "test" }; }

export async function verfuegbar() { return !!(await ladeKonfig()); }

async function sb() {
  if (client) return client;
  const k = await ladeKonfig();
  if (!k) throw new Error("Sync ist noch nicht eingerichtet (sync-config.js).");
  const { createClient } = await import(SUPABASE_JS);
  client = createClient(k.SUPABASE_URL, k.SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "dbd-konto" } });
  return client;
}

export async function nutzer() {
  try { const { data } = await (await sb()).auth.getSession(); return data?.session?.user || null; }
  catch { return null; }
}
export async function anmelden(email, passwort) {
  const { data, error } = await (await sb()).auth.signInWithPassword({ email, password: passwort });
  if (error) throw new Error(fehlerText(error));
  return data.user;
}
export async function registrieren(email, passwort) {
  const k = await ladeKonfig();
  const { data, error } = await (await sb()).auth.signUp({ email, password: passwort, options: { emailRedirectTo: k?.WEITERLEITUNG || "https://fgseraser.github.io/EntityDex/" } });
  if (error) throw new Error(fehlerText(error));
  return { user: data.user, bestaetigen: !data.session };
}
export async function passwortVergessen(email) {
  const k = await ladeKonfig();
  const { error } = await (await sb()).auth.resetPasswordForEmail(email, { redirectTo: k?.WEITERLEITUNG || "https://fgseraser.github.io/EntityDex/" });
  if (error) throw new Error(fehlerText(error));
}
export async function abmelden() { try { await (await sb()).auth.signOut(); } catch {} localStorage.removeItem(BASIS); }
export async function beiAenderungKonto(fn) { try { (await sb()).auth.onAuthStateChange((_e, s) => fn(s?.user || null)); } catch {} }

function fehlerText(e) {
  const m = String(e?.message || e);
  if (/Invalid login/i.test(m)) return "E-Mail oder Passwort falsch.";
  if (/Email not confirmed/i.test(m)) return "Bitte zuerst den Link in der Bestätigungs-Mail anklicken.";
  if (/already registered/i.test(m)) return "Für diese E-Mail gibt es schon ein Konto – bitte anmelden.";
  if (/Password should be/i.test(m)) return "Das Passwort muss mindestens 6 Zeichen haben.";
  if (/rate limit/i.test(m)) return "Zu viele Versuche – bitte kurz warten.";
  return m;
}

// ------------------------------------------------------------------ Sync
const BASIS = "dbd-sync-basis";   // id -> { h: Prüfsumme beim letzten Sync, t: Server-Zeit }
function prüfsumme(o) {
  const s = JSON.stringify(o, Object.keys(o).sort());
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h);
}
// Felder, die nur auf einem Gerät gelten, nicht vergleichen
const ohneLokales = (c) => { const k = { ...c }; delete k.geaendertLokal; return k; };

/**
 * Führt lokale und Online-Challenges zusammen.
 * @param {Array} lokal  aktuelle lokale Liste (Objekte mit id)
 * @returns {Promise<{liste: Array, hoch: number, runter: number}>}
 */
export async function synchronisieren(lokal) {
  const s = await sb();
  const u = await nutzer();
  if (!u) throw new Error("Nicht angemeldet");
  let basis = {};
  try { basis = JSON.parse(localStorage.getItem(BASIS + ":" + u.id)) || {}; } catch {}
  const { data: online, error } = await s.from("challenges").select("id,daten,geaendert,geloescht");
  if (error) throw new Error(error.message);
  const R = new Map(online.map((r) => [r.id, r]));
  const L = new Map(lokal.map((c) => [c.id, c]));
  const ids = new Set([...R.keys(), ...L.keys(), ...Object.keys(basis)]);
  const ergebnis = [], hochladen = [];
  let runter = 0;
  for (const id of ids) {
    const l = L.get(id), r = R.get(id), b = basis[id];
    const rZeit = r ? Date.parse(r.geaendert) : 0;
    const lokalGeaendert = l ? prüfsumme(ohneLokales(l)) !== b?.h : !!b;
    const onlineGeaendert = r ? rZeit > (b?.t || 0) : false;
    let nimmOnline = false;
    if (onlineGeaendert && !lokalGeaendert) nimmOnline = true;
    else if (lokalGeaendert) nimmOnline = false;
    else nimmOnline = !!r;          // nichts geändert: Online-Stand ist gleich
    if (nimmOnline && r) {
      if (!r.geloescht) ergebnis.push(r.daten);
      if (onlineGeaendert && !(r.geloescht && !l)) runter++;
      if (r.geloescht) delete basis[id];
      else basis[id] = { h: prüfsumme(ohneLokales(r.daten)), t: rZeit };
    } else if (l) {
      ergebnis.push(l);
      if (lokalGeaendert || !r) hochladen.push({ id, daten: ohneLokales(l), geloescht: false });
    } else if (b) {
      // lokal gelöscht
      hochladen.push({ id, daten: r?.daten || {}, geloescht: true });
      delete basis[id];
    }
  }
  if (hochladen.length) {
    const { data, error: e2 } = await s.from("challenges").upsert(hochladen.map((x) => ({ ...x, user_id: u.id })), { onConflict: "user_id,id" }).select("id,geaendert,geloescht");
    if (e2) throw new Error(e2.message);
    for (const row of data || []) {
      if (row.geloescht) { delete basis[row.id]; continue; }
      const c = ergebnis.find((x) => x.id === row.id);
      basis[row.id] = { h: c ? prüfsumme(ohneLokales(c)) : null, t: Date.parse(row.geaendert) };
    }
  }
  localStorage.setItem(BASIS + ":" + u.id, JSON.stringify(basis));
  // Reihenfolge der lokalen Liste beibehalten, neue Online-Challenges vorne
  const reihenfolge = new Map(lokal.map((c, i) => [c.id, i]));
  ergebnis.sort((a, b) => (reihenfolge.get(a.id) ?? -1) - (reihenfolge.get(b.id) ?? -1));
  return { liste: ergebnis, hoch: hochladen.length, runter };
}

// Live-Benachrichtigung, wenn sich online etwas ändert (z. B. am Handy angelegt)
export async function live(fn) {
  try {
    const s = await sb(); const u = await nutzer();
    if (!u || kanal) return;
    kanal = s.channel("challenges-" + u.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges", filter: `user_id=eq.${u.id}` }, () => fn())
      .subscribe();
  } catch {}
}
