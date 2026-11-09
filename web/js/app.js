// DBD Companion 2.0 – Challenges, Timer, Builds, Perks, Ranking, Maps und Ingame-Overlay.
// von FGSeRaser – https://github.com/FGSeRaser
import * as D from "./daten.js";
import { widgetHtml } from "./overlay-render.js";
import * as Sync from "./sync.js";

const VERSION = "2.0";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const kopie = (o) => JSON.parse(JSON.stringify(o));

// ================================================================ Zustand
const TIMER_STD = [
  { id: "t_ds", name: "Decisive Strike", dauer: 60, farbe: "#2ef2ff", hotkey: "", rolle: "killer" },
  { id: "t_otr", name: "Off the Record", dauer: 80, farbe: "#7dff3a", hotkey: "", rolle: "killer" },
  { id: "t_bt", name: "Borrowed Time (Ausdauer)", dauer: 10, farbe: "#ffd23a", hotkey: "", rolle: "killer" },
  { id: "t_re", name: "Reassurance", dauer: 30, farbe: "#ff9a2e", hotkey: "", rolle: "killer" },
  { id: "t_mc", name: "Make Your Choice (Ungeschützt)", dauer: 60, farbe: "#ff5a74", hotkey: "", rolle: "survivor" },
  { id: "t_hg", name: "Haunted Ground (Ungeschützt)", dauer: 60, farbe: "#ff5a74", hotkey: "", rolle: "survivor" },
  { id: "t_bw", name: "Blood Warden", dauer: 60, farbe: "#b18cff", hotkey: "", rolle: "survivor" },
  { id: "t_ec", name: "Endgame Collapse", dauer: 120, farbe: "#e0243f", hotkey: "", rolle: "beide" },
];
const ZAEHLER_STD = [
  { id: "z_esc", name: "Escapes", wert: 0, farbe: "#4ade80", plus: "", minus: "", rolle: "survivor" },
  { id: "z_tod", name: "Geopfert", wert: 0, farbe: "#ff5a74", plus: "", minus: "", rolle: "survivor" },
  { id: "z_kill", name: "Kills", wert: 0, farbe: "#e0243f", plus: "", minus: "", rolle: "killer" },
  { id: "z_hook", name: "Haken", wert: 0, farbe: "#ffcf4a", plus: "", minus: "", rolle: "killer" },
];
const W_STD = { an: false, x: 0.02, y: 0.1, skala: 1, deckkraft: 0.55, hg: "#0d0b10", akzent: "#e0243f", text: "#ffffff" };
const STD = {
  version: 2, rolle: "survivor", tab: "start", sprache: "beide", ton: true, lautstaerke: 60,
  timers: kopie(TIMER_STD), zaehler: kopie(ZAEHLER_STD),
  challenges: [], aktiv: null,
  builds: { eigene: [], aktuell: { survivor: [null, null, null, null], killer: [null, null, null, null] }, gesperrt: [false, false, false, false], nurBesitz: false, besitz: { survivor: [], killer: [] }, pin: null, stile: [] },
  ranking: { listen: [], aktiv: null },
  maps: { notizen: {}, wertung: {} },
  overlay: {
    an: false, bildschirm: 0,
    widgets: {
      timer: { ...W_STD, an: true, x: 0.015, y: 0.3, nurLaufende: true },
      challenges: { ...W_STD, an: true, x: 0.015, y: 0.05 },
      build: { ...W_STD, x: 0.8, y: 0.05, namen: true },
      zaehler: { ...W_STD, x: 0.8, y: 0.3 },
      text: { ...W_STD, x: 0.4, y: 0.02, inhalt: "Viel Glück im Nebel!" },
    },
  },
  hotkeys: { modus: "abfangen", aktionen: { "ow:toggle": "Ctrl+Alt+KeyO", "ow:edit": "Ctrl+Alt+KeyE", "ch:plus": "Ctrl+Alt+ArrowUp", "ch:minus": "Ctrl+Alt+ArrowDown",
    "ch:versuch": "Ctrl+Alt+KeyV", "ch:erfolg": "Ctrl+Alt+KeyS", "ch:naechste": "Ctrl+Alt+ArrowRight", "timer:stopp": "Ctrl+Alt+Backspace", "build:wuerfeln": "Ctrl+Alt+KeyB" } },
  streamer: { obs: false, port: 8833, overlayVerstecken: false, fensterVerstecken: false },
  akzent: "#e0243f",
};
const AKTIONEN = {
  "ow:toggle": "Overlay ein/aus", "ow:edit": "Overlay im Spiel verschieben", "ch:plus": "Challenge: Ziel geschafft (nächstes)", "ch:minus": "Challenge: letzten Schritt zurück",
  "ch:versuch": "Challenge: Versuch (nicht geschafft)", "ch:erfolg": "Challenge: Versuch geschafft", "ch:naechste": "Nächste angepinnte Challenge", "timer:stopp": "Alle Timer stoppen", "build:wuerfeln": "Build neu würfeln",
};

function laden() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem("dbdcompanion2")); } catch {}
  if (!s) s = migrieren();
  const z = Object.assign(kopie(STD), s || {});
  z.builds = Object.assign(kopie(STD.builds), z.builds || {});
  z.ranking = Object.assign(kopie(STD.ranking), z.ranking || {});
  z.maps = Object.assign(kopie(STD.maps), z.maps || {});
  z.streamer = Object.assign(kopie(STD.streamer), z.streamer || {});
  z.hotkeys = Object.assign(kopie(STD.hotkeys), z.hotkeys || {});
  z.hotkeys.aktionen = Object.assign(kopie(STD.hotkeys.aktionen), z.hotkeys.aktionen || {});
  z.overlay = Object.assign(kopie(STD.overlay), z.overlay || {});
  for (const [k, v] of Object.entries(STD.overlay.widgets)) z.overlay.widgets[k] = Object.assign(kopie(v), z.overlay.widgets[k] || {});
  return z;
}
// Daten aus der ersten Version (Challenges, Timer) übernehmen
function migrieren() {
  try {
    const alt = JSON.parse(localStorage.getItem("dbdcompanion"));
    if (!alt) return null;
    const s = kopie(STD);
    s.challenges = (alt.challenges || []).map((c) => ({ ...c, pin: alt.overlay?.pinned === c.id, log: c.log || [], ziele: c.ziele || [] }));
    s.aktiv = alt.aktiv || null;
    const t = [...(alt.timers?.survivor || []).map((x) => ({ ...x, rolle: "survivor" })), ...(alt.timers?.killer || []).map((x) => ({ ...x, rolle: "killer" }))];
    if (t.length) s.timers = t.map((x) => ({ id: x.id || uid(), name: x.name, dauer: x.dur || 60, farbe: x.farbe || "#e0243f", hotkey: "", rolle: x.rolle }));
    s.rolle = alt.rolle || "survivor";
    return s;
  } catch { return null; }
}
let S = laden();
let speicherTimer = null;
function speichern() {
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(() => { try { localStorage.setItem("dbdcompanion2", JSON.stringify(S)); } catch {} }, 150);
  syncBald();
}

// ================================================================ Konto & Sync mit EntityDex (Handy)
let konto = null, syncLaeuft = false, letzterSync = null, syncTimer = null, letzteChHash = "";
function syncBald() {
  if (!konto) return;
  const h = JSON.stringify(S.challenges);
  if (h === letzteChHash) return;
  clearTimeout(syncTimer); syncTimer = setTimeout(() => syncJetzt(false), 2500);
}
async function syncJetzt(laut) {
  if (!konto || syncLaeuft) return;
  syncLaeuft = true;
  try {
    const r = await Sync.synchronisieren(S.challenges);
    S.challenges = r.liste;
    letzteChHash = JSON.stringify(S.challenges);
    try { localStorage.setItem("dbdcompanion2", JSON.stringify(S)); } catch {}
    letzterSync = new Date();
    if (r.runter) { toast(`☁ ${r.runter} Challenge(s) von EntityDex übernommen`); if (S.tab === "challenges" || S.tab === "start") zeichneTab(S.tab); overlaySenden(true); }
    else if (laut) toast("☁ Alles synchron");
  } catch (e) { if (laut) toast("Sync fehlgeschlagen: " + e.message); }
  syncLaeuft = false;
  if (S.tab === "einstellungen") zeichneKonto();
}
async function zeichneKonto() {
  const box = $("#e-konto");
  if (!box) return;
  if (!(await Sync.verfuegbar())) { box.innerHTML = `<div class="box">Der Online-Sync ist noch nicht eingerichtet. Sobald er in EntityDex aktiviert ist, kannst du dich hier anmelden.</div>`; return; }
  if (konto) {
    box.innerHTML = `<p>☁ Angemeldet als <b>${esc(konto.email)}</b></p>
      <p class="klein leise">${letzterSync ? "Zuletzt synchronisiert: " + letzterSync.toLocaleTimeString("de-DE") : "Noch nicht synchronisiert"} · Challenges aus der EntityDex-App kommen automatisch hier an – und Fortschritt vom PC landet auf deinem Handy.</p>
      <div class="zeile"><button class="haupt" id="k-sync">⟳ Jetzt synchronisieren</button><button id="k-ab">Abmelden</button></div>`;
    $("#k-sync").onclick = () => syncJetzt(true);
    $("#k-ab").onclick = async () => { await Sync.abmelden(); konto = null; zeichneKonto(); };
  } else {
    box.innerHTML = `<p class="klein leise">Mit demselben Konto wie in der <b>EntityDex</b>-App anmelden – dann werden deine dort geplanten Challenges automatisch übernommen.</p>
      <div class="zeile"><input id="k-mail" type="email" placeholder="E-Mail" style="flex:1"><input id="k-pw" type="password" placeholder="Passwort" style="flex:1"></div>
      <div class="zeile" style="margin-top:8px"><button class="haupt" id="k-login">Anmelden</button><button id="k-neu">Konto erstellen</button><button id="k-vergessen">Passwort vergessen</button></div>`;
    const mail = () => $("#k-mail").value.trim(), pw = () => $("#k-pw").value;
    $("#k-login").onclick = async () => { try { konto = await Sync.anmelden(mail(), pw()); toast("☁ Angemeldet"); await syncJetzt(true); syncStarten(); zeichneKonto(); } catch (e) { toast(e.message); } };
    $("#k-neu").onclick = async () => { try { const r = await Sync.registrieren(mail(), pw()); if (r.bestaetigen) toast("📧 Bitte den Link in der E-Mail anklicken, dann hier anmelden."); else { konto = r.user; syncJetzt(true); syncStarten(); zeichneKonto(); } } catch (e) { toast(e.message); } };
    $("#k-vergessen").onclick = async () => { try { await Sync.passwortVergessen(mail()); toast("📧 E-Mail zum Zurücksetzen ist unterwegs"); } catch (e) { toast(e.message); } };
  }
}
let syncGestartet = false;
function syncStarten() {
  if (syncGestartet) return;
  syncGestartet = true;
  Sync.live(() => { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncJetzt(false), 800); });
  setInterval(() => syncJetzt(false), 60000);
  addEventListener("focus", () => syncJetzt(false));
}

// ================================================================ Hilfen
function toast(t) {
  const e = $("#toast"); e.textContent = t; e.hidden = false;
  clearTimeout(e._t); e._t = setTimeout(() => (e.hidden = true), 2200);
}
function dialog(html, beimOeffnen) {
  $("#dialog-box").innerHTML = html + `<div class="zeile" style="justify-content:flex-end;margin-top:12px"><button data-zu>Schließen</button></div>`;
  $("#dialog").hidden = false;
  $$("[data-zu]", $("#dialog-box")).forEach((b) => b.addEventListener("click", dialogZu));
  beimOeffnen?.($("#dialog-box"));
}
function dialogZu() { $("#dialog").hidden = true; $("#dialog-box").innerHTML = ""; }
$("#dialog").addEventListener("click", (e) => { if (e.target.id === "dialog") dialogZu(); });

let audio = null;
function piep(freq = 880, dauer = 0.15) {
  if (!S.ton) return;
  try {
    audio = audio || new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = freq; o.type = "square";
    g.gain.value = (S.lautstaerke / 100) * 0.15;
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + dauer);
  } catch {}
}
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// ================================================================ Daten & Namen
let PERKS = [], CHARS = [], MAPS = [], BUILDS = null;
const perkNach = new Map();
function perkFinden(name) { return perkNach.get(D.norm(name)) || null; }
function anzeigename(o) {
  if (!o) return "";
  if (S.sprache === "en" || !o.de) return o.name;
  if (S.sprache === "de") return o.de;
  return o.de;
}
function zweitname(o) { return S.sprache === "beide" && o?.de && o.de !== o.name ? o.name : ""; }
function perkIcon(p, klasse = "") {
  const kurz = esc((p?.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 3));
  return `<div class="perk-icon ${klasse}">${p?.bild ? `<img src="${esc(p.bild)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${p?.bild ? "" : kurz}</div>`;
}
function portrait(c, extra = "", klasse = "") {
  return `<div class="portrait ${klasse}" data-id="${esc(c.name)}" ${extra}><img src="${esc(c.bild || "")}" alt="" loading="lazy" draggable="false"><div class="nm">${esc(anzeigename(c))}</div></div>`;
}
const charNach = new Map();
const charFinden = (n) => charNach.get(n) || CHARS.find((c) => c.de === n) || null;
const mapNach = new Map();

// ================================================================ Host (Windows-Programm)
const host = window.chrome?.webview || null;
let hostInfo = { bildschirme: [], obsUrl: "" };
let overlayAktiv = false;
function senden(typ, daten = {}) { if (host) host.postMessage(JSON.stringify({ type: typ, ...daten })); }
if (host) host.addEventListener("message", (e) => {
  let m = e.data;
  try { if (typeof m === "string") m = JSON.parse(m); } catch { return; }
  switch (m.type) {
    case "hotkey": hotkeyAusfuehren(m.id); break;
    case "owMoved": {
      const w = S.overlay.widgets[m.id];
      if (w) { w.x = m.x; w.y = m.y; speichern(); if (S.tab === "overlay") zeichneOverlayTab(); }
      break;
    }
    case "owStatus": overlayAktiv = !!m.an; S.overlay.an = overlayAktiv; speichern(); zeigeOwSchalter(); break;
    case "hostInfo": hostInfo = m; if (S.tab === "overlay" || S.tab === "einstellungen") zeichneTab(S.tab); break;
    case "hinweis": toast(m.text); break;
  }
});

// ================================================================ Tabs & Rolle
function zeigeTab(t) {
  S.tab = t; speichern();
  $$("#nav button").forEach((b) => b.classList.toggle("an", b.dataset.tab === t));
  $$(".tab").forEach((s) => s.classList.toggle("an", s.id === "tab-" + t));
  zeichneTab(t);
}
function zeichneTab(t) {
  const f = { start: zeichneStart, challenges: zeichneChallenges, timer: zeichneTimer, builds: zeichneBuilds, perks: zeichnePerks,
    charaktere: zeichneCharaktere, ranking: zeichneRanking, maps: zeichneMaps, overlay: zeichneOverlayTab, einstellungen: zeichneEinstellungen }[t];
  try { f?.(); } catch (e) { console.error(e); $("#tab-" + t).innerHTML = `<div class="hinweis">Fehler: ${esc(e.message)}</div>`; }
}
$$("#nav button").forEach((b) => b.addEventListener("click", () => zeigeTab(b.dataset.tab)));
function setRolle(r) { S.rolle = r; speichern(); $$("#rolle button").forEach((b) => b.classList.toggle("an", b.dataset.r === r)); zeichneTab(S.tab); }
$$("#rolle button").forEach((b) => b.addEventListener("click", () => setRolle(b.dataset.r)));

function zeigeOwSchalter() {
  const b = $("#ow-schalter");
  const an = host ? overlayAktiv : S.overlay.an;
  b.textContent = `🖥 Overlay: ${an ? "AN" : "AUS"}`;
  b.className = an ? "ow-an" : "ow-aus";
}
function overlayUmschalten(an = !(host ? overlayAktiv : S.overlay.an)) {
  S.overlay.an = an; speichern();
  if (host) { senden("overlayAn", { an, bildschirm: S.overlay.bildschirm }); overlayAktiv = an; }
  else toast("Das Ingame-Overlay gibt es nur im Windows-Programm. Hier siehst du die Vorschau.");
  zeigeOwSchalter(); overlaySenden(true);
}
$("#ow-schalter").addEventListener("click", () => overlayUmschalten());

// ================================================================ Start
async function zeichneStart() {
  const el = $("#tab-start");
  const pins = S.challenges.filter((c) => c.pin);
  const heute = new Date().toISOString().slice(0, 10);
  const heuteGeplant = S.challenges.filter((c) => c.geplant === heute && !c.ok);
  el.innerHTML = `
  ${heuteGeplant.length ? `<div class="hinweis" style="margin-bottom:12px">📅 <b>Heute für den Stream geplant:</b> ${heuteGeplant.map((c) => esc(c.name) + (c.planNotiz ? ` <span class="leise">(${esc(c.planNotiz)})</span>` : "")).join(" · ")}</div>` : ""}
  <div class="raster2">
    <div class="karte">
      <h2>Willkommen im Nebel 👋</h2>
      <p class="leise">Erstelle Challenges, pinne sie ans <b>Ingame-Overlay</b>, starte Timer per <b>Hotkey</b> mitten im Spiel und plane deine Builds mit den Daten aus <a href="${D.ENTITYDEX}" target="_blank">EntityDex</a>.</p>
      ${host ? "" : `<div class="hinweis">Du nutzt gerade die Browser-Version. Das Ingame-Overlay und globale Hotkeys funktionieren nur im Windows-Programm „DBD Companion.exe“.</div>`}
      <div class="trenner"></div>
      <div class="zeile">
        <button class="haupt" id="st-ow">🖥 Overlay ${(host ? overlayAktiv : S.overlay.an) ? "ausschalten" : "einschalten"}</button>
        <button id="st-neu">🎯 Neue Challenge</button>
        <button id="st-zufall">🎲 Zufalls-Challenge</button>
        <button id="st-build">🎲 Build würfeln</button>
      </div>
      <p class="klein leise" style="margin-top:12px">Tipp: Stell Dead by Daylight auf <b>Fenster-Vollbild</b> (Einstellungen → Grafik → Anzeigemodus), damit das Overlay sichtbar ist.</p>
    </div>
    <div class="karte">
      <h3>📌 Angepinnte Challenges</h3>
      ${pins.length ? pins.map((c) => challengeKurz(c)).join("") : `<div class="box">Noch nichts angepinnt. Öffne eine Challenge und klick auf „📌 Anpinnen“.</div>`}
    </div>
    <div class="karte">
      <h3>⏱ Timer (${S.rolle === "survivor" ? "Survivor" : "Killer"})</h3>
      <div id="st-timer" class="ch-liste"></div>
    </div>
    <div class="karte" id="st-schrein"><h3>🛕 Schrein der Geheimnisse</h3><div class="box">Lädt …</div></div>
  </div>`;
  $("#st-ow").onclick = () => { overlayUmschalten(); zeichneStart(); };
  $("#st-neu").onclick = () => challengeBearbeiten(null);
  $("#st-zufall").onclick = zufallsChallenge;
  $("#st-build").onclick = () => { zeigeTab("builds"); buildTab = "wuerfeln"; wuerfeln(); zeichneBuilds(); };
  $$("[data-chk]", el).forEach((b) => b.addEventListener("click", () => challengeAktion(b.dataset.chk, b.dataset.a)));
  zeichneTimerListe($("#st-timer"), true);
  const sch = await D.schrein();
  const box = $("#st-schrein");
  if (!box) return;
  const nachId = new Map(PERKS.map((p) => [p.id.toLowerCase(), p]));
  const perks = (sch?.perks || []).map((x) => nachId.get(String(x.id || "").toLowerCase()) || perkFinden(D.ohneHtml(x.name || x.id)) || { name: D.ohneHtml(x.name || x.id) });
  box.innerHTML = `<h3>🛕 Schrein der Geheimnisse</h3>` + (perks.length ? perks.map((p) => `<div class="perk" style="margin:6px 0">${perkIcon(p, "klein")}<div><div class="perk-name">${esc(anzeigename(p))}</div><div class="perk-en">${esc(zweitname(p))} ${p.charakter ? "· " + esc(p.charakter) : ""}</div></div></div>`).join("") : `<div class="box">Gerade keine Daten.</div>`);
}

// ================================================================ Timer
const laufend = {};   // id -> Endzeit (ms)
const gewarnt = {};
function timerFuerRolle() { return S.timers.filter((t) => t.rolle === "beide" || t.rolle === S.rolle); }
function timerRest(t) { return laufend[t.id] ? (laufend[t.id] - Date.now()) / 1000 : t.dauer; }
function timerStart(id) {
  const t = S.timers.find((x) => x.id === id);
  if (!t) return;
  if (laufend[id] && t.erneut === "stopp") { delete laufend[id]; piep(440); }
  else { laufend[id] = Date.now() + t.dauer * 1000; delete gewarnt[id]; piep(990, 0.08); }
  zeichneTimerUeberall();
}
function timerStopp(id) { delete laufend[id]; zeichneTimerUeberall(); }
function alleTimerStopp() { for (const k of Object.keys(laufend)) delete laufend[k]; zeichneTimerUeberall(); piep(440); }
function zeichneTimerUeberall() {
  if (S.tab === "timer") zeichneTimerListe($("#timer-liste"));
  if (S.tab === "start" && $("#st-timer")) zeichneTimerListe($("#st-timer"), true);
}
function zeichneTimerListe(el, kurz = false) {
  if (!el) return;
  const liste = timerFuerRolle();
  el.innerHTML = liste.map((t) => {
    const rest = timerRest(t), an = !!laufend[t.id];
    const warn = an && rest <= (t.warnung ?? 5);
    return `<div class="timer ${an ? "laeuft" : ""} ${warn ? "warn" : ""}" style="--f:${esc(t.farbe)}" data-t="${t.id}">
      <div class="zeit">${mmss(rest)}</div>
      <div style="flex:1"><b>${esc(t.name)}</b><div class="balken" style="margin-top:6px"><i style="width:${an ? (rest / t.dauer) * 100 : 100}%"></i></div></div>
      ${t.hotkey ? `<span class="taste">${esc(tasteText(t.hotkey))}</span>` : ""}
      ${!kurz && an ? `<button class="klein" data-stopp="${t.id}">■</button>` : ""}
    </div>`;
  }).join("") || `<div class="box">Keine Timer für diese Rolle.</div>`;
  $$("[data-t]", el).forEach((d) => d.addEventListener("click", (e) => { if (e.target.dataset.stopp) return; timerStart(d.dataset.t); }));
  $$("[data-stopp]", el).forEach((b) => b.addEventListener("click", () => timerStopp(b.dataset.stopp)));
}
function zeichneTimer() {
  const el = $("#tab-timer");
  el.innerHTML = `
  <div class="raster2">
    <div class="karte">
      <div class="zeile ab"><h2>⏱ Timer – ${S.rolle === "survivor" ? "als Survivor" : "als Killer"}</h2><button id="t-stopp">■ Alle stoppen</button></div>
      <p class="klein leise">Klick oder Hotkey startet den Timer. Die Hotkeys funktionieren auch mitten im Spiel (Windows-Programm).</p>
      <div id="timer-liste" class="ch-liste"></div>
    </div>
    <div class="karte">
      <div class="zeile ab"><h3>Timer einstellen</h3><button class="haupt" id="t-neu">+ Neuer Timer</button></div>
      <div id="t-edit"></div>
      <div class="zeile" style="margin-top:10px"><button id="t-std">Standard-Timer zurückholen</button></div>
    </div>
    <div class="karte">
      <div class="zeile ab"><h3>🔢 Zähler (Escapes, Kills …)</h3><button id="z-neu">+ Neuer Zähler</button></div>
      <p class="klein leise">Erscheinen im Overlay-Widget „Zähler“. Jeder Zähler kann eigene Hotkeys für +1 und −1 haben.</p>
      <div id="z-edit"></div>
    </div>
  </div>`;
  zeichneTimerListe($("#timer-liste"));
  $("#t-stopp").onclick = alleTimerStopp;
  $("#t-neu").onclick = () => { S.timers.push({ id: uid(), name: "Neuer Timer", dauer: 60, farbe: "#e0243f", hotkey: "", rolle: S.rolle, warnung: 5 }); speichern(); zeichneTimer(); };
  $("#t-std").onclick = () => { if (confirm("Standard-Timer wiederherstellen? Eigene Timer bleiben.")) { for (const t of TIMER_STD) if (!S.timers.find((x) => x.id === t.id)) S.timers.push(kopie(t)); speichern(); zeichneTimer(); } };
  const ed = $("#t-edit");
  ed.innerHTML = S.timers.map((t, i) => `
    <div class="karte" style="margin:6px 0;background:var(--bg2)">
      <div class="zeile"><input data-i="${i}" data-f="name" value="${esc(t.name)}" style="flex:1">
        <input type="color" data-i="${i}" data-f="farbe" value="${esc(t.farbe)}"></div>
      <div class="zeile" style="margin-top:6px">
        <label>Sekunden <input type="number" min="1" max="3600" data-i="${i}" data-f="dauer" value="${t.dauer}" style="width:80px"></label>
        <label>Warnen ab <input type="number" min="0" max="600" data-i="${i}" data-f="warnung" value="${t.warnung ?? 5}" style="width:64px"> s</label>
        <label>Rolle <select data-i="${i}" data-f="rolle">${["survivor", "killer", "beide"].map((r) => `<option value="${r}" ${t.rolle === r ? "selected" : ""}>${{ survivor: "Survivor", killer: "Killer", beide: "Beide" }[r]}</option>`).join("")}</select></label>
        <label>Nochmal drücken <select data-i="${i}" data-f="erneut"><option value="neustart">startet neu</option><option value="stopp" ${t.erneut === "stopp" ? "selected" : ""}>stoppt</option></select></label>
      </div>
      <div class="zeile" style="margin-top:6px"><label>Hotkey</label>${hotkeyFeld("timer:" + t.id, t.hotkey)}
        <button class="klein" data-del="${i}" style="margin-left:auto">🗑 Löschen</button></div>
    </div>`).join("");
  $$("[data-f]", ed).forEach((inp) => inp.addEventListener("change", () => {
    const t = S.timers[+inp.dataset.i];
    t[inp.dataset.f] = inp.type === "number" ? +inp.value : inp.value;
    speichern(); zeichneTimerListe($("#timer-liste")); hotkeysSenden();
  }));
  $$("[data-del]", ed).forEach((b) => b.addEventListener("click", () => { S.timers.splice(+b.dataset.del, 1); speichern(); zeichneTimer(); hotkeysSenden(); }));
  hotkeyFelderAktivieren(ed);
  const ze = $("#z-edit");
  ze.innerHTML = S.zaehler.map((z, i) => `
    <div class="zeile" style="margin:6px 0;padding:8px;background:var(--bg2);border-radius:10px">
      <input data-zi="${i}" data-f="name" value="${esc(z.name)}" style="width:130px">
      <input type="color" data-zi="${i}" data-f="farbe" value="${esc(z.farbe)}">
      <button class="klein" data-zm="${i}">−</button><b style="min-width:30px;text-align:center">${z.wert}</b><button class="klein" data-zp="${i}">+</button>
      <select data-zi="${i}" data-f="rolle">${["survivor", "killer", "beide"].map((r) => `<option value="${r}" ${z.rolle === r ? "selected" : ""}>${{ survivor: "Survivor", killer: "Killer", beide: "Beide" }[r]}</option>`).join("")}</select>
      <label>+1</label>${hotkeyFeld("zplus:" + z.id, z.plus)}<label>−1</label>${hotkeyFeld("zminus:" + z.id, z.minus)}
      <button class="klein" data-zdel="${i}">🗑</button>
    </div>`).join("") + `<button class="klein" id="z-null">Alle auf 0</button>`;
  $$("[data-zi]", ze).forEach((inp) => inp.addEventListener("change", () => { S.zaehler[+inp.dataset.zi][inp.dataset.f] = inp.value; speichern(); }));
  $$("[data-zp]", ze).forEach((b) => b.addEventListener("click", () => { S.zaehler[+b.dataset.zp].wert++; speichern(); zeichneTimer(); }));
  $$("[data-zm]", ze).forEach((b) => b.addEventListener("click", () => { S.zaehler[+b.dataset.zm].wert--; speichern(); zeichneTimer(); }));
  $$("[data-zdel]", ze).forEach((b) => b.addEventListener("click", () => { S.zaehler.splice(+b.dataset.zdel, 1); speichern(); zeichneTimer(); hotkeysSenden(); }));
  $("#z-null").onclick = () => { S.zaehler.forEach((z) => (z.wert = 0)); speichern(); zeichneTimer(); };
  $("#z-neu").onclick = () => { S.zaehler.push({ id: uid(), name: "Zähler", wert: 0, farbe: "#4fb8ff", plus: "", minus: "", rolle: "beide" }); speichern(); zeichneTimer(); };
  hotkeyFelderAktivieren(ze);
}
// Tick: Timer, Warnungen, Overlay
setInterval(() => {
  for (const t of S.timers) {
    if (!laufend[t.id]) continue;
    const rest = timerRest(t);
    if (rest <= (t.warnung ?? 5) && !gewarnt[t.id] && rest > 0) { gewarnt[t.id] = true; piep(660, 0.12); }
    if (rest <= 0) { delete laufend[t.id]; piep(1200, 0.35); }
  }
  if (Object.keys(laufend).length || S.tab === "timer") zeichneTimerUeberall();
  overlaySenden();
}, 250);

// ================================================================ Challenges
const VORLAGEN = [
  { name: "Gegen jeden Killer entkommen", rolle: "survivor", art: "killer", regel: "Gegen jeden Killer einmal escapen.", ziel: "Escape" },
  { name: "Adept mit jedem Survivor", rolle: "survivor", art: "survivor", regel: "Nur die 3 eigenen Perks des Survivors. Escape zählt.", ziel: "Escape" },
  { name: "No Perk Escape", rolle: "survivor", art: "keine", regel: "Keine Perks, keine Items, keine Opfergaben.", ziel: "Escape", anzahl: 1 },
  { name: "Totem-Jäger", rolle: "survivor", art: "keine", regel: "Alle 5 Totems in einer Runde reinigen.", ziel: "5 Totems", anzahl: 1 },
  { name: "Flashlight-Saves", rolle: "survivor", art: "keine", regel: "3 Blind-Rettungen in einer Runde.", ziel: "3 Saves", anzahl: 1 },
  { name: "Fester Build: 10 Escapes", rolle: "survivor", art: "keine", regel: "Nur die gewählten 4 Perks.", ziel: "Escape", anzahl: 10 },
  { name: "Adept mit jedem Killer", rolle: "killer", art: "killer", regel: "Nur die 3 eigenen Perks, Merciless Killer.", ziel: "Merciless" },
  { name: "No Perk 4K mit jedem Killer", rolle: "killer", art: "killer", regel: "Keine Perks, keine Add-ons.", ziel: "4K" },
  { name: "12 Haken", rolle: "killer", art: "keine", regel: "Jeden Survivor 3× haken.", ziel: "12 Hooks", anzahl: 1 },
  { name: "4K auf jeder Map", rolle: "killer", art: "maps", regel: "Auf jeder Map einmal alle 4 opfern.", ziel: "4K" },
  { name: "Escape auf jeder Map", rolle: "survivor", art: "maps", regel: "Auf jeder Map einmal entkommen.", ziel: "Escape" },
  { name: "Eigene Challenge", rolle: "beide", art: "keine", regel: "", ziel: "", anzahl: 1 },
];
const ZUFALL_REGELN = {
  survivor: ["Keine Exhaustion-Perks", "Nur Perks mit Boon oder Teamwork", "Kein Item", "Nur Perks mit Anfangsbuchstabe des Charakters", "Mindestens 2 Rettungen", "Kein Heilen außer mit Medkit", "Gen nie loslassen, wenn Killer nicht in Chase", "Nur Taschenlampe als Item", "Alle Totems vor dem letzten Gen"],
  killer: ["Keine Slowdown-Perks", "Keine Add-ons", "Nur Hex-Perks", "Nicht camping: nie länger als 5 s am Haken", "Jeden Survivor erst hooken, bevor jemand 2. Hook bekommt", "Nur M1 (keine Kraft)", "Kein Mori", "Nur Perks des gewählten Killers"],
};
function chWerte(c) {
  const Z = c.ziele || [];
  const log = c.log || [];
  const vers = log.length, erf = log.filter((l) => l.ok).length;
  const fertig = Z.length ? Z.filter((z) => z.ok).length : Math.min(erf, c.anzahl || 1);
  const ges = Z.length || c.anzahl || 1;
  let m = 0, a = 0; for (const l of log) { a = l.ok ? a + 1 : 0; m = Math.max(m, a); }
  return { vers, erf, fertig, ges, quote: vers ? Math.round((erf / vers) * 100) : 0, streak: m, proz: Math.round((fertig / ges) * 100) };
}
function challengeKurz(c) {
  const w = chWerte(c);
  return `<div class="ch-eintrag" style="margin:6px 0"><div class="zeile ab"><b>${c.pin ? "📌 " : ""}${esc(c.name)}</b><span class="klein leise">${w.fertig}/${w.ges}</span></div>
    ${c.jetzt ? `<div class="klein">Jetzt: <b>${esc(namePlus(c.jetzt))}</b></div>` : ""}
    <div class="fortschritt" style="margin:6px 0"><i style="width:${w.proz}%"></i></div>
    <div class="zeile"><button class="klein" data-chk="${c.id}" data-a="erfolg">✔ Geschafft</button><button class="klein" data-chk="${c.id}" data-a="versuch">✘ Versuch</button></div></div>`;
}
function planDatum(d) { try { return new Date(d + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" }); } catch { return d; } }
function namePlus(n) { const c = charFinden(n); return c ? anzeigename(c) : n; }
function chAktiv() { return S.challenges.find((c) => c.id === S.aktiv) || null; }
function challengeAktion(id, a) {
  const c = S.challenges.find((x) => x.id === id);
  if (!c) return;
  const z = (c.ziele || []).find((x) => x.name === c.jetzt);
  if (a === "erfolg" || a === "versuch") {
    const ok = a === "erfolg";
    c.log = c.log || []; c.log.push({ zeit: Date.now(), ok, ziel: c.jetzt || null });
    if (z) { z.versuche = (z.versuche || 0) + 1; if (ok) { z.ok = true; c.jetzt = naechstesZiel(c); } }
    const w = chWerte(c);
    if (w.fertig >= w.ges && !c.ok) { c.ok = true; toast(`🏆 Challenge geschafft: ${c.name}!`); piep(1320, 0.4); }
    else toast(ok ? "✔ Geschafft!" : "✘ Versuch gezählt");
  } else if (a === "zurueck") {
    const l = (c.log || []).pop();
    if (l?.ok && l.ziel) { const zz = c.ziele.find((x) => x.name === l.ziel); if (zz) { zz.ok = false; c.jetzt = l.ziel; } }
    if (l?.ziel) { const zz = c.ziele.find((x) => x.name === l.ziel); if (zz) zz.versuche = Math.max(0, (zz.versuche || 1) - 1); }
    c.ok = false;
  } else if (a === "pin") { c.pin = !c.pin; toast(c.pin ? "📌 Ans Overlay angepinnt" : "Vom Overlay entfernt"); }
  speichern();
  if (S.tab === "challenges") zeichneChallenges();
  if (S.tab === "start") zeichneStart();
  overlaySenden(true);
}
function naechstesZiel(c) { const offen = (c.ziele || []).filter((z) => !z.ok); return offen.length ? offen[0].name : null; }
function zielListe(art) {
  if (art === "killer") return CHARS.filter((c) => c.rolle === "killer").map((c) => c.name);
  if (art === "survivor") return CHARS.filter((c) => c.rolle === "survivor").map((c) => c.name);
  if (art === "maps") return MAPS.map((m) => m.name);
  return [];
}
function zeichneChallenges() {
  const el = $("#tab-challenges");
  let liste = S.challenges.filter((c) => !chFilter || (chFilter === "offen" ? !c.ok : chFilter === "fertig" ? c.ok : chFilter === "geplant" ? !!c.geplant : c.pin));
  if (chFilter === "geplant") liste = liste.slice().sort((a, b) => a.geplant.localeCompare(b.geplant));
  el.innerHTML = `
  <div class="raster2" style="grid-template-columns:340px 1fr">
    <div>
      <div class="zeile" style="margin-bottom:8px"><button class="haupt" id="ch-neu">+ Neue Challenge</button><button id="ch-zufall">🎲 Zufall</button></div>
      <div class="chips">${[["", "Alle"], ["geplant", "📅 Stream-Plan"], ["offen", "Offen"], ["pin", "📌 Angepinnt"], ["fertig", "Geschafft"]].map(([k, n]) => `<span class="chip ${chFilter === k ? "an" : ""}" data-chf="${k}">${n}</span>`).join("")}</div>
      <div class="ch-liste">${liste.map((c) => { const w = chWerte(c); return `<div class="ch-eintrag ${c.id === S.aktiv ? "an" : ""} ${c.ok ? "fertig" : ""}" data-ch="${c.id}">
        <div class="zeile ab"><b>${c.pin ? '<span class="pin">📌</span> ' : ""}${esc(c.name)}</b>${c.ok ? "🏆" : ""}${c.geplant ? `<span class="chip">📅 ${esc(planDatum(c.geplant))}</span>` : ""}</div>
        <div class="klein leise">${w.fertig}/${w.ges} · ${w.vers} Versuche · ${c.rolle === "killer" ? "Killer" : c.rolle === "survivor" ? "Survivor" : "Beide"}</div>
        <div class="fortschritt" style="margin-top:5px"><i style="width:${w.proz}%"></i></div></div>`; }).join("") || `<div class="box">Noch keine Challenges. Leg los mit „+ Neue Challenge“ oder einer Vorlage!</div>`}</div>
    </div>
    <div id="ch-haupt"></div>
  </div>`;
  $("#ch-neu").onclick = () => challengeBearbeiten(null);
  $("#ch-zufall").onclick = zufallsChallenge;
  $$("[data-chf]", el).forEach((c) => c.addEventListener("click", () => { chFilter = c.dataset.chf; zeichneChallenges(); }));
  $$("[data-ch]", el).forEach((d) => d.addEventListener("click", () => { S.aktiv = d.dataset.ch; speichern(); zeichneChallenges(); }));
  zeichneChallengeDetail();
}
let chFilter = "";
function zeichneChallengeDetail() {
  const h = $("#ch-haupt"), c = chAktiv();
  if (!c) { h.innerHTML = `<div class="karte"><h3>Vorlagen</h3><div class="raster">${VORLAGEN.map((v, i) => `<div class="karte" style="background:var(--bg2)"><b>${esc(v.name)}</b><div class="klein leise">${esc(v.regel)}</div><button class="klein" data-vl="${i}" style="margin-top:6px">Übernehmen</button></div>`).join("")}</div></div>`;
    $$("[data-vl]", h).forEach((b) => b.addEventListener("click", () => challengeBearbeiten(null, VORLAGEN[+b.dataset.vl]))); return; }
  const w = chWerte(c);
  const perks = (c.perks || []).map(perkFinden).filter(Boolean);
  const istBild = c.art === "killer" || c.art === "survivor";
  h.innerHTML = `<div class="karte">
    <div class="zeile ab"><h2>${c.ok ? "🏆 " : ""}${esc(c.name)}</h2>
      <div class="zeile"><button class="${c.pin ? "an" : ""}" id="chd-pin">📌 ${c.pin ? "Angepinnt" : "Ans Overlay anpinnen"}</button><button id="chd-edit">✏ Bearbeiten</button><button id="chd-dup">⧉</button><button id="chd-del">🗑</button></div></div>
    ${c.geplant ? `<p>📅 Für den Stream geplant: <b>${esc(planDatum(c.geplant))}</b>${c.planNotiz ? " – " + esc(c.planNotiz) : ""}</p>` : ""}
    ${c.regel ? `<p style="white-space:pre-line">${esc(c.regel)}</p>` : ""}
    ${c.ziel ? `<p class="leise">Ziel: <b>${esc(c.ziel)}</b></p>` : ""}
    ${perks.length ? `<div class="slots" style="margin:10px 0">${perks.map((p) => `<div class="slot">${perkIcon(p)}<div class="klein">${esc(anzeigename(p))}</div></div>`).join("")}</div>` : ""}
    <div class="fortschritt" style="height:14px"><i style="width:${w.proz}%"></i></div>
    <div class="zeile ab klein leise" style="margin:6px 0"><span>${w.fertig} von ${w.ges} geschafft</span><span>${w.vers} Versuche · Erfolgsquote ${w.quote} % · beste Serie ${w.streak}</span></div>
    ${c.jetzt ? `<div class="karte" style="background:var(--bg2);margin:8px 0" ><div class="zeile">${charFinden(c.jetzt) ? portrait(charFinden(c.jetzt), "", "klein") : ""}<div><div class="leise klein">Aktuelles Ziel</div><h3>${esc(namePlus(c.jetzt))}</h3></div></div></div>` : ""}
    <div class="zeile" style="margin:10px 0">
      <button class="haupt" data-a="erfolg">✔ Geschafft</button><button data-a="versuch">✘ Nicht geschafft</button><button data-a="zurueck">↶ Rückgängig</button>
      ${c.ziele?.length ? `<button id="chd-skip">⏭ Ziel überspringen</button><button id="chd-zufallziel">🎲 Zufälliges Ziel</button>` : ""}
    </div>
    ${c.ziele?.length ? `<div class="trenner"></div><h3>Alle Ziele <span class="klein leise">(Klick = als aktuelles Ziel setzen, Doppelklick = abhaken)</span></h3>
      <div class="${istBild ? "portraits" : "chips"}">${c.ziele.map((z) => istBild && charFinden(z.name)
        ? portrait(charFinden(z.name), `data-z="${esc(z.name)}" title="${z.versuche || 0} Versuche"`, (z.ok ? "an " : "") + (z.name === c.jetzt ? "gewaehlt" : ""))
        : `<span class="chip ${z.ok ? "an" : ""}" data-z="${esc(z.name)}" style="${z.name === c.jetzt ? "outline:2px solid var(--gold)" : ""}">${esc(namePlus(z.name))}${z.versuche ? ` (${z.versuche})` : ""}</span>`).join("")}</div>` : ""}
  </div>`;
  $$("[data-a]", h).forEach((b) => b.addEventListener("click", () => challengeAktion(c.id, b.dataset.a)));
  $("#chd-pin").onclick = () => challengeAktion(c.id, "pin");
  $("#chd-edit").onclick = () => challengeBearbeiten(c);
  $("#chd-dup").onclick = () => { const n = kopie(c); n.id = uid(); n.name += " (Kopie)"; n.log = []; n.ok = false; (n.ziele || []).forEach((z) => { z.ok = false; z.versuche = 0; }); n.jetzt = n.ziele?.[0]?.name || null; n.pin = false; S.challenges.unshift(n); S.aktiv = n.id; speichern(); zeichneChallenges(); };
  $("#chd-del").onclick = () => { if (confirm(`„${c.name}“ wirklich löschen?`)) { S.challenges = S.challenges.filter((x) => x.id !== c.id); S.aktiv = null; speichern(); zeichneChallenges(); overlaySenden(true); } };
  $("#chd-skip") && ($("#chd-skip").onclick = () => { const offen = c.ziele.filter((z) => !z.ok); const i = offen.findIndex((z) => z.name === c.jetzt); c.jetzt = offen[(i + 1) % offen.length]?.name || null; speichern(); zeichneChallengeDetail(); overlaySenden(true); });
  $("#chd-zufallziel") && ($("#chd-zufallziel").onclick = () => { const offen = c.ziele.filter((z) => !z.ok); c.jetzt = offen[Math.floor(Math.random() * offen.length)]?.name || null; speichern(); zeichneChallengeDetail(); overlaySenden(true); });
  $$("[data-z]", h).forEach((d) => {
    d.addEventListener("click", () => { c.jetzt = d.dataset.z; speichern(); zeichneChallengeDetail(); overlaySenden(true); });
    d.addEventListener("dblclick", () => { const z = c.ziele.find((x) => x.name === d.dataset.z); z.ok = !z.ok; if (z.ok && c.jetzt === z.name) c.jetzt = naechstesZiel(c); c.ok = chWerte(c).fertig >= chWerte(c).ges; speichern(); zeichneChallengeDetail(); overlaySenden(true); });
  });
}
function challengeBearbeiten(c, vorlage = null) {
  const neu = !c;
  const v = c ? kopie(c) : { id: uid(), name: vorlage?.name || "", regel: vorlage?.regel || "", ziel: vorlage?.ziel || "", art: vorlage?.art || "keine",
    rolle: vorlage?.rolle === "beide" ? S.rolle : (vorlage?.rolle || S.rolle), perks: [], anzahl: vorlage?.anzahl || 1, eigene: "", ziele: [], log: [], pin: false, erstellt: Date.now() };
  let perkAuswahl = (v.perks || []).slice();
  dialog(`
    <h2>${neu ? "Neue Challenge" : "Challenge bearbeiten"}</h2>
    ${neu ? `<div class="chips">${VORLAGEN.map((x, i) => `<span class="chip" data-vlg="${i}">${esc(x.name)}</span>`).join("")}</div>` : ""}
    <div class="raster2">
      <div>
        <div class="feld"><label>Name</label><input id="cb-name" value="${esc(v.name)}" placeholder="z. B. Gegen jeden Killer entkommen"></div>
        <div class="feld"><label>Regeln</label><textarea id="cb-regel" placeholder="Was ist erlaubt, was nicht?">${esc(v.regel)}</textarea></div>
        <div class="zeile">
          <div class="feld"><label>Ziel (Text)</label><input id="cb-ziel" value="${esc(v.ziel)}" placeholder="Escape, 4K, Merciless …"></div>
          <div class="feld"><label>Rolle</label><select id="cb-rolle"><option value="survivor">Survivor</option><option value="killer" ${v.rolle === "killer" ? "selected" : ""}>Killer</option></select></div>
        </div>
        <div class="feld"><label>Liste</label><select id="cb-art">
          <option value="keine">Keine Liste – einfach zählen</option>
          <option value="killer" ${v.art === "killer" ? "selected" : ""}>Jeder Killer (${zielListe("killer").length})</option>
          <option value="survivor" ${v.art === "survivor" ? "selected" : ""}>Jeder Survivor (${zielListe("survivor").length})</option>
          <option value="maps" ${v.art === "maps" ? "selected" : ""}>Jede Map (${zielListe("maps").length})</option>
          <option value="eigen" ${v.art === "eigen" ? "selected" : ""}>Eigene Liste</option></select></div>
        <div class="feld" id="cb-anzahl-box"><label>Wie oft schaffen?</label><input type="number" id="cb-anzahl" min="1" max="999" value="${v.anzahl || 1}"></div>
        <div class="feld" id="cb-eigen-box"><label>Eigene Liste (eine Zeile pro Ziel)</label><textarea id="cb-eigen">${esc(v.art === "eigen" ? (v.ziele || []).map((z) => z.name).join("\n") : "")}</textarea></div>
        <label><input type="checkbox" id="cb-misch"> Reihenfolge mischen</label>
        <label style="margin-left:12px"><input type="checkbox" id="cb-pin" ${v.pin ? "checked" : ""}> Gleich ans Overlay anpinnen</label>
      </div>
      <div>
        <label>Perks für diese Challenge (bis zu 4, optional)</label>
        <div class="slots" id="cb-slots" style="margin:6px 0"></div>
        <div class="zeile"><input id="cb-suche" placeholder="Perk suchen (deutsch oder englisch) …" style="flex:1"><button class="klein" id="cb-zufallperks">🎲 4 zufällige</button><button class="klein" id="cb-leer">Leeren</button></div>
        <div class="perkwahl" id="cb-perks" style="margin-top:6px"></div>
      </div>
    </div>
    <div class="zeile" style="justify-content:flex-end;margin-top:10px"><button class="haupt" id="cb-ok">${neu ? "Erstellen" : "Speichern"}</button></div>`, (box) => {
    const artUm = () => { const a = $("#cb-art").value; $("#cb-anzahl-box").style.display = a === "keine" ? "" : "none"; $("#cb-eigen-box").style.display = a === "eigen" ? "" : "none"; };
    $("#cb-art").onchange = artUm; artUm();
    const slots = () => {
      $("#cb-slots").innerHTML = [0, 1, 2, 3].map((i) => { const p = perkFinden(perkAuswahl[i]); return `<div class="slot" data-s="${i}">${p ? perkIcon(p) + `<div class="klein">${esc(anzeigename(p))}</div>` : `<div class="leise klein" style="margin-top:30px">frei</div>`}</div>`; }).join("");
      $$("[data-s]", box).forEach((s) => s.addEventListener("click", () => { perkAuswahl.splice(+s.dataset.s, 1); slots(); liste(); }));
    };
    const liste = () => {
      const q = D.norm($("#cb-suche").value), r = $("#cb-rolle").value;
      const ps = PERKS.filter((p) => p.rolle === r && (!q || D.norm(p.name + p.de + p.charakter).includes(q))).slice(0, 200);
      $("#cb-perks").innerHTML = ps.map((p) => `<div class="perk ${perkAuswahl.includes(p.name) ? "an" : ""}" data-p="${esc(p.name)}">${perkIcon(p, "mini")}<div><div class="perk-name klein">${esc(anzeigename(p))}</div><div class="perk-en">${esc(zweitname(p))}</div></div></div>`).join("");
      $$("[data-p]", box).forEach((d) => d.addEventListener("click", () => {
        const n = d.dataset.p;
        if (perkAuswahl.includes(n)) perkAuswahl = perkAuswahl.filter((x) => x !== n);
        else if (perkAuswahl.length < 4) perkAuswahl.push(n); else toast("Höchstens 4 Perks");
        slots(); liste();
      }));
    };
    $("#cb-suche").oninput = liste; $("#cb-rolle").onchange = () => { perkAuswahl = []; slots(); liste(); };
    $("#cb-zufallperks").onclick = () => { const r = $("#cb-rolle").value; const pool = PERKS.filter((p) => p.rolle === r).map((p) => p.name); perkAuswahl = []; while (perkAuswahl.length < 4 && pool.length) perkAuswahl.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); slots(); liste(); };
    $("#cb-leer").onclick = () => { perkAuswahl = []; slots(); liste(); };
    slots(); liste();
    $$("[data-vlg]", box).forEach((ch) => ch.addEventListener("click", () => { const x = VORLAGEN[+ch.dataset.vlg]; $("#cb-name").value = x.name; $("#cb-regel").value = x.regel; $("#cb-ziel").value = x.ziel; $("#cb-art").value = x.art; $("#cb-anzahl").value = x.anzahl || 1; if (x.rolle !== "beide") $("#cb-rolle").value = x.rolle; artUm(); liste(); }));
    $("#cb-ok").onclick = () => {
      const name = $("#cb-name").value.trim();
      if (!name) return toast("Bitte einen Namen eingeben");
      const art = $("#cb-art").value;
      let namen = art === "eigen" ? [...new Set($("#cb-eigen").value.split("\n").map((x) => x.trim()).filter(Boolean))] : zielListe(art);
      if ($("#cb-misch").checked) namen.sort(() => Math.random() - 0.5);
      const alt = new Map((v.ziele || []).map((z) => [z.name, z]));
      Object.assign(v, { name, regel: $("#cb-regel").value.trim(), ziel: $("#cb-ziel").value.trim(), art, rolle: $("#cb-rolle").value, perks: perkAuswahl.slice(),
        anzahl: Math.max(1, +$("#cb-anzahl").value || 1), pin: $("#cb-pin").checked });
      v.ziele = namen.map((n) => alt.get(n) || { name: n, versuche: 0, ok: false });
      if (!v.ziele.find((z) => z.name === v.jetzt)) v.jetzt = naechstesZiel(v);
      if (neu) S.challenges.unshift(v); else S.challenges[S.challenges.findIndex((x) => x.id === v.id)] = v;
      S.aktiv = v.id; speichern(); dialogZu(); zeigeTab("challenges"); overlaySenden(true);
    };
  });
}
function zufallsChallenge() {
  const r = S.rolle;
  const chars = CHARS.filter((c) => c.rolle === r);
  const ch = chars[Math.floor(Math.random() * chars.length)];
  const regel = ZUFALL_REGELN[r][Math.floor(Math.random() * ZUFALL_REGELN[r].length)];
  const pool = PERKS.filter((p) => p.rolle === r).map((p) => p.name);
  const perks = []; while (perks.length < 4 && pool.length) perks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const c = { id: uid(), name: `Zufall: ${ch ? anzeigename(ch) : "?"}`, regel: `Spiele ${ch ? anzeigename(ch) : ""} mit den 4 Perks unten.\nZusatzregel: ${regel}`, ziel: r === "survivor" ? "Escape" : "3K oder mehr",
    art: "keine", rolle: r, perks, anzahl: 1, ziele: [], log: [], pin: true, erstellt: Date.now(), jetzt: null };
  S.challenges.unshift(c); S.aktiv = c.id; speichern(); zeigeTab("challenges"); overlaySenden(true);
  toast("🎲 Zufalls-Challenge erstellt und angepinnt");
}

// ================================================================ Builds
let buildTab = "fertig";
function aktuellerBuild() { return S.builds.aktuell[S.rolle]; }
function wuerfeln() {
  const r = S.rolle;
  let pool = PERKS.filter((p) => p.rolle === r).map((p) => p.name);
  if (S.builds.nurBesitz && S.builds.besitz[r].length >= 4) pool = pool.filter((p) => S.builds.besitz[r].includes(p));
  if (S.builds.stile?.length && BUILDS) {
    const kat = BUILDS.KATEGORIEN[r] || {};
    const ausStil = [...new Set(S.builds.stile.flatMap((s) => kat[s] || []))].map((n) => perkFinden(n)?.name).filter(Boolean);
    if (ausStil.length >= 4) pool = pool.filter((p) => ausStil.includes(p));
  }
  const b = aktuellerBuild();
  const behalten = b.filter((p, i) => S.builds.gesperrt[i] && p);
  pool = pool.filter((p) => !behalten.includes(p));
  for (let i = 0; i < 4; i++) {
    if (S.builds.gesperrt[i] && b[i]) continue;
    b[i] = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : null;
  }
  speichern(); overlaySenden(true);
}
function buildKarte(b, i, quelle) {
  const ps = b.perks.map((n) => perkFinden(n) || { name: n });
  return `<div class="karte" style="background:var(--bg2)">
    <div class="zeile ab"><b>${esc(b.name)}</b>${b.stil ? `<span class="chip">${esc(stilName(b.stil))}</span>` : ""}</div>
    <div class="slots kompakt" style="margin:8px 0">${ps.map((p) => `<div class="slot" title="${esc(p.text || "")}">${perkIcon(p, "klein")}<div class="klein">${esc(anzeigename(p))}</div><div class="perk-en">${esc(zweitname(p))}</div></div>`).join("")}</div>
    ${b.warum ? `<div class="klein leise">${esc(b.warum)}</div>` : ""}
    <div class="zeile" style="margin-top:8px"><button class="klein haupt" data-bu="${quelle}:${i}">Übernehmen</button><button class="klein" data-bpin="${quelle}:${i}">📌 Ans Overlay</button><button class="klein" data-bch="${quelle}:${i}">🎯 Als Challenge</button>
      ${quelle === "eigene" ? `<button class="klein" data-bdel="${i}">🗑</button>` : `<button class="klein" data-bsave="${quelle}:${i}">💾 Speichern</button>`}</div></div>`;
}
function stilName(id) {
  const alle = [...(BUILDS?.SPIELSTILE?.survivor || []), ...(BUILDS?.SPIELSTILE?.killer || [])];
  return String(id).split("+").map((x) => { const s = alle.find((y) => y.id === x); return s ? `${s.icon} ${s.name}` : x; }).join(" + ");
}
let buildListe = { fertig: [], vorschlag: [] };
function zeichneBuilds() {
  const el = $("#tab-builds");
  const r = S.rolle;
  const stile = BUILDS?.SPIELSTILE?.[r] || [];
  el.innerHTML = `
  <div class="leiste">${[["fertig", "📚 Vorgefertigte Builds"], ["wuerfeln", "🎲 Würfeln"], ["eigene", "💾 Meine Builds"], ["besitz", "✅ Meine Perks"]].map(([k, n]) => `<button class="${buildTab === k ? "an" : ""}" data-btab="${k}">${n}</button>`).join("")}
    <span class="leise klein" style="margin-left:auto">Builds kommen live aus <a href="${D.ENTITYDEX}#builds" target="_blank">EntityDex</a></span></div>
  <div class="karte" style="margin-bottom:12px"><b>Spielstil:</b> <span class="chips" style="display:inline-flex">${stile.map((s) => `<span class="chip ${S.builds.stile.includes(s.id) ? "an" : ""}" data-stil="${s.id}" title="${esc(s.text)}">${s.icon} ${esc(s.name)}</span>`).join("")}</span></div>
  <div id="b-inhalt"></div>`;
  $$("[data-btab]", el).forEach((b) => b.addEventListener("click", () => { buildTab = b.dataset.btab; zeichneBuilds(); }));
  $$("[data-stil]", el).forEach((c) => c.addEventListener("click", () => {
    const id = c.dataset.stil; S.builds.stile = S.builds.stile.includes(id) ? S.builds.stile.filter((x) => x !== id) : [...S.builds.stile, id];
    speichern(); zeichneBuilds();
  }));
  const inh = $("#b-inhalt");
  if (buildTab === "fertig") {
    const fest = (BUILDS?.KOMBOS?.[r] || []).filter((k) => !S.builds.stile.length || S.builds.stile.includes(k.stil));
    const alleNamen = PERKS.filter((p) => p.rolle === r).map((p) => p.name);
    const vor = S.builds.stile.length && BUILDS ? BUILDS.vorschlaege(r, S.builds.stile, alleNamen, 3).filter((b) => b.name.startsWith("Mix")) : [];
    buildListe.fertig = [...fest, ...vor];
    inh.innerHTML = `<div class="raster">${buildListe.fertig.map((b, i) => buildKarte(b, i, "fertig")).join("") || `<div class="box">Keine Builds für diesen Spielstil.</div>`}</div>`;
  } else if (buildTab === "eigene") {
    const eig = S.builds.eigene.filter((b) => b.rolle === r);
    inh.innerHTML = `<div class="raster">${eig.map((b) => buildKarte(b, S.builds.eigene.indexOf(b), "eigene")).join("") || `<div class="box">Noch keine eigenen Builds. Würfle einen oder speichere einen vorgefertigten.</div>`}</div>`;
  } else if (buildTab === "wuerfeln") {
    const b = aktuellerBuild();
    inh.innerHTML = `<div class="raster2"><div class="karte">
      <h3>Aktueller Build</h3>
      <div class="slots">${b.map((n, i) => { const p = perkFinden(n); return `<div class="slot ${S.builds.gesperrt[i] ? "gesperrt" : ""}">${p ? perkIcon(p) : perkIcon(null)}<div class="klein">${p ? esc(anzeigename(p)) : "–"}</div><div class="perk-en">${p ? esc(zweitname(p)) : ""}</div><button class="klein" data-lock="${i}">${S.builds.gesperrt[i] ? "🔒" : "🔓"}</button></div>`; }).join("")}</div>
      <div class="zeile" style="margin-top:10px"><button class="haupt" id="b-wuerfeln">🎲 Würfeln</button><button id="b-pin">📌 ${S.builds.pin === "aktuell" ? "Angepinnt" : "Ans Overlay"}</button><button id="b-save">💾 Speichern</button><button id="b-ch">🎯 Als Challenge</button></div>
      <label style="display:block;margin-top:10px"><input type="checkbox" id="b-besitz" ${S.builds.nurBesitz ? "checked" : ""}> Nur aus meinen Perks würfeln (${S.builds.besitz[r].length} markiert)</label>
      <p class="klein leise">Gewählte Spielstile oben grenzen das Würfeln ein. 🔒 hält einen Perk fest.</p>
    </div><div class="karte"><h3>Perk-Beschreibungen</h3>${b.map((n) => { const p = perkFinden(n); return p ? `<div class="perk" style="margin-bottom:10px">${perkIcon(p, "klein")}<div><div class="perk-name">${esc(anzeigename(p))}</div><div class="perk-text">${esc(p.text)}</div></div></div>` : ""; }).join("")}</div></div>`;
    $("#b-wuerfeln").onclick = () => { wuerfeln(); zeichneBuilds(); };
    $$("[data-lock]", inh).forEach((x) => x.addEventListener("click", () => { const i = +x.dataset.lock; S.builds.gesperrt[i] = !S.builds.gesperrt[i]; speichern(); zeichneBuilds(); }));
    $("#b-pin").onclick = () => { S.builds.pin = S.builds.pin === "aktuell" ? null : "aktuell"; S.overlay.widgets.build.an = !!S.builds.pin || S.overlay.widgets.build.an; speichern(); zeichneBuilds(); overlaySenden(true); };
    $("#b-save").onclick = () => { const name = prompt("Name für den Build:", "Mein Build"); if (name) { S.builds.eigene.push({ id: uid(), name, rolle: r, perks: b.filter(Boolean) }); speichern(); toast("Gespeichert"); } };
    $("#b-ch").onclick = () => buildAlsChallenge({ name: "Gewürfelter Build", perks: b.filter(Boolean) });
    $("#b-besitz").onchange = (e) => { S.builds.nurBesitz = e.target.checked; speichern(); };
  } else if (buildTab === "besitz") {
    const besitz = S.builds.besitz[r];
    inh.innerHTML = `<div class="karte"><div class="zeile ab"><h3>Welche Perks hast du freigeschaltet? (${besitz.length})</h3><div class="zeile"><input id="bp-suche" placeholder="Suchen …"><button class="klein" id="bp-alle">Alle</button><button class="klein" id="bp-keine">Keine</button></div></div>
      <div class="perkwahl" id="bp-liste" style="max-height:none"></div></div>`;
    const zeichne = () => {
      const q = D.norm($("#bp-suche").value);
      $("#bp-liste").innerHTML = PERKS.filter((p) => p.rolle === r && (!q || D.norm(p.name + p.de + p.charakter).includes(q))).map((p) => `<div class="perk ${besitz.includes(p.name) ? "an" : ""}" data-bp="${esc(p.name)}">${perkIcon(p, "mini")}<div><div class="perk-name klein">${esc(anzeigename(p))}</div><div class="perk-en">${esc(zweitname(p))}</div></div></div>`).join("");
      $$("[data-bp]", inh).forEach((d) => d.addEventListener("click", () => { const n = d.dataset.bp; const i = besitz.indexOf(n); if (i >= 0) besitz.splice(i, 1); else besitz.push(n); speichern(); d.classList.toggle("an"); }));
    };
    $("#bp-suche").oninput = zeichne; zeichne();
    $("#bp-alle").onclick = () => { S.builds.besitz[r] = PERKS.filter((p) => p.rolle === r).map((p) => p.name); speichern(); zeichneBuilds(); };
    $("#bp-keine").onclick = () => { S.builds.besitz[r] = []; speichern(); zeichneBuilds(); };
  }
  const holen = (k) => { const [q, i] = k.split(":"); return q === "eigene" ? S.builds.eigene[+i] : buildListe[q][+i]; };
  $$("[data-bu]", inh).forEach((b) => b.addEventListener("click", () => { const x = holen(b.dataset.bu); S.builds.aktuell[r] = [0, 1, 2, 3].map((i) => perkFinden(x.perks[i])?.name || x.perks[i] || null); speichern(); buildTab = "wuerfeln"; zeichneBuilds(); overlaySenden(true); toast("Build übernommen"); }));
  $$("[data-bpin]", inh).forEach((b) => b.addEventListener("click", () => { const x = holen(b.dataset.bpin); S.builds.aktuell[r] = [0, 1, 2, 3].map((i) => perkFinden(x.perks[i])?.name || x.perks[i] || null); S.builds.pin = "aktuell"; S.overlay.widgets.build.an = true; speichern(); overlaySenden(true); toast("📌 Build am Overlay"); }));
  $$("[data-bch]", inh).forEach((b) => b.addEventListener("click", () => buildAlsChallenge(holen(b.dataset.bch))));
  $$("[data-bsave]", inh).forEach((b) => b.addEventListener("click", () => { const x = holen(b.dataset.bsave); S.builds.eigene.push({ id: uid(), name: x.name, rolle: r, perks: x.perks.map((n) => perkFinden(n)?.name || n), warum: x.warum, stil: x.stil }); speichern(); toast("💾 Gespeichert"); }));
  $$("[data-bdel]", inh).forEach((b) => b.addEventListener("click", () => { S.builds.eigene.splice(+b.dataset.bdel, 1); speichern(); zeichneBuilds(); }));
}
function buildAlsChallenge(b) {
  const c = { id: uid(), name: `Build: ${b.name}`, regel: "Nur diese 4 Perks benutzen.", ziel: S.rolle === "survivor" ? "Escape" : "4K", art: "keine", rolle: S.rolle,
    perks: b.perks.map((n) => perkFinden(n)?.name || n).slice(0, 4), anzahl: 5, ziele: [], log: [], pin: true, erstellt: Date.now(), jetzt: null };
  S.challenges.unshift(c); S.aktiv = c.id; speichern(); zeigeTab("challenges"); overlaySenden(true); toast("🎯 Challenge erstellt und angepinnt");
}

// ================================================================ Perks
let perkFilter = { q: "", rolle: "", kat: "" };
function zeichnePerks() {
  const el = $("#tab-perks");
  const kats = perkFilter.rolle && BUILDS ? Object.keys(BUILDS.KATEGORIEN[perkFilter.rolle] || {}) : [];
  el.innerHTML = `
  <div class="leiste">
    <input id="pf-q" type="search" placeholder="Perk suchen – deutsch oder englisch, Charakter oder Text …" value="${esc(perkFilter.q)}" style="flex:1;min-width:240px">
    ${[["", "Alle"], ["survivor", "Survivor"], ["killer", "Killer"]].map(([k, n]) => `<button class="${perkFilter.rolle === k ? "an" : ""}" data-pr="${k}">${n}</button>`).join("")}
  </div>
  ${kats.length ? `<div class="chips">${kats.map((k) => `<span class="chip ${perkFilter.kat === k ? "an" : ""}" data-pk="${k}">${esc(stilName(k))}</span>`).join("")}</div>` : ""}
  <p class="klein leise" id="pf-anzahl"></p>
  <div class="raster" id="pf-liste"></div>`;
  const zeichne = () => {
    const q = D.norm(perkFilter.q);
    let ps = PERKS.filter((p) => (!perkFilter.rolle || p.rolle === perkFilter.rolle) && (!q || D.norm(`${p.name} ${p.de} ${p.charakter} ${p.charakterDe} ${p.text}`).includes(q)));
    if (perkFilter.kat && BUILDS) ps = ps.filter((p) => BUILDS.enthaelt(BUILDS.KATEGORIEN[perkFilter.rolle][perkFilter.kat], p.name));
    $("#pf-anzahl").textContent = `${ps.length} Perks`;
    $("#pf-liste").innerHTML = ps.slice(0, 400).map((p) => `<div class="karte perk">${perkIcon(p)}<div style="min-width:0">
      <div class="perk-name">${esc(anzeigename(p))}</div><div class="perk-en">${esc(zweitname(p))}${p.charakter ? ` · ${esc(p.charakterDe || p.charakter)}` : " · Allgemein"} · ${p.rolle === "killer" ? "Killer" : "Survivor"}</div>
      <div class="perk-text">${esc(S.sprache === "en" ? p.text : D.keywordDe(p.text))}</div></div></div>`).join("");
  };
  $("#pf-q").oninput = (e) => { perkFilter.q = e.target.value; zeichne(); };
  $$("[data-pr]", el).forEach((b) => b.addEventListener("click", () => { perkFilter.rolle = b.dataset.pr; perkFilter.kat = ""; zeichnePerks(); }));
  $$("[data-pk]", el).forEach((b) => b.addEventListener("click", () => { perkFilter.kat = perkFilter.kat === b.dataset.pk ? "" : b.dataset.pk; zeichnePerks(); }));
  zeichne();
}

// ================================================================ Charaktere
let charFilter = { rolle: "killer", q: "" };
function zeichneCharaktere() {
  const el = $("#tab-charaktere");
  const anz = (r) => CHARS.filter((c) => c.rolle === r).length;
  el.innerHTML = `<div class="leiste">
    <button class="${charFilter.rolle === "killer" ? "an" : ""}" data-cr="killer">🔪 Killer (${anz("killer")})</button>
    <button class="${charFilter.rolle === "survivor" ? "an" : ""}" data-cr="survivor">🏃 Survivor (${anz("survivor")})</button>
    <input id="cf-q" type="search" placeholder="Suchen …" value="${esc(charFilter.q)}" style="flex:1"></div>
    <div class="portraits" id="cf-liste"></div>`;
  const zeichne = () => {
    const q = D.norm(charFilter.q);
    $("#cf-liste").innerHTML = CHARS.filter((c) => c.rolle === charFilter.rolle && (!q || D.norm(c.name + c.de).includes(q))).map((c) => portrait(c)).join("");
    $$(".portrait", el).forEach((p) => p.addEventListener("click", () => charDetail(charFinden(p.dataset.id))));
  };
  $$("[data-cr]", el).forEach((b) => b.addEventListener("click", () => { charFilter.rolle = b.dataset.cr; zeichneCharaktere(); }));
  $("#cf-q").oninput = (e) => { charFilter.q = e.target.value; zeichne(); };
  zeichne();
}
function charDetail(c) {
  if (!c) return;
  const eigene = PERKS.filter((p) => p.charakter === c.name);
  dialog(`<div class="zeile" style="align-items:flex-start;gap:16px">
    <img src="${esc(c.bild || "")}" style="width:180px;border-radius:12px;background:#111">
    <div style="flex:1;min-width:240px"><h2>${esc(anzeigename(c))}</h2><div class="leise">${esc(zweitname(c))} · ${c.rolle === "killer" ? "Killer" : "Survivor"}</div>
      <p style="white-space:pre-line">${esc(c.bio)}</p></div></div>
    <h3>Eigene Perks</h3>${eigene.map((p) => `<div class="perk" style="margin-bottom:10px">${perkIcon(p)}<div><div class="perk-name">${esc(anzeigename(p))} <span class="perk-en">${esc(zweitname(p))}</span></div><div class="perk-text">${esc(S.sprache === "en" ? p.text : D.keywordDe(p.text))}</div></div></div>`).join("") || `<div class="box">Keine Daten.</div>`}
    ${c.story ? `<details><summary>Hintergrundgeschichte (englisch)</summary><p style="white-space:pre-line" class="leise">${esc(c.story)}</p></details>` : ""}
    <div class="zeile" style="margin-top:10px"><button id="cd-adept">🎯 Adept-Challenge erstellen</button><a href="${D.ENTITYDEX}#charaktere" target="_blank"><button>In EntityDex öffnen ↗</button></a></div>`, () => {
    $("#cd-adept").onclick = () => {
      const ch = { id: uid(), name: `Adept ${anzeigename(c)}`, regel: "Nur die 3 eigenen Perks, keine Add-ons/Items.", ziel: c.rolle === "killer" ? "Merciless Killer" : "Escape",
        art: "keine", rolle: c.rolle, perks: eigene.map((p) => p.name).slice(0, 4), anzahl: 1, ziele: [], log: [], pin: false, erstellt: Date.now(), jetzt: null };
      S.challenges.unshift(ch); S.aktiv = ch.id; speichern(); dialogZu(); zeigeTab("challenges");
    };
  });
}

// ================================================================ Ranking (Tier-Listen)
const TIER_STD = [["S", "#ff7f7f"], ["A", "#ffbf7f"], ["B", "#ffdf7f"], ["C", "#bfff7f"], ["D", "#7fbfff"], ["F", "#c77fff"]];
function neueListe(art) {
  const name = { killer: "Killer-Ranking", survivor: "Survivor-Ranking", maps: "Map-Ranking" }[art];
  return { id: uid(), name, art, tiers: TIER_STD.map(([n, f]) => ({ name: n, farbe: f, items: [] })) };
}
let gewaehltItem = null;
function rankingItems(art) {
  if (art === "maps") return MAPS.map((m) => ({ name: m.name, de: "", bild: m.bild }));
  return CHARS.filter((c) => c.rolle === art);
}
function zeichneRanking() {
  const el = $("#tab-ranking");
  if (!S.ranking.listen.length) { S.ranking.listen.push(neueListe("killer"), neueListe("survivor"), neueListe("maps")); S.ranking.aktiv = S.ranking.listen[0].id; speichern(); }
  const L = S.ranking.listen.find((l) => l.id === S.ranking.aktiv) || S.ranking.listen[0];
  const alle = rankingItems(L.art);
  const vergeben = new Set(L.tiers.flatMap((t) => t.items));
  const pool = alle.filter((x) => !vergeben.has(x.name));
  const item = (n) => { const x = alle.find((y) => y.name === n); return x ? portrait(x, `draggable="true" data-rk="${esc(n)}"`, gewaehltItem === n ? "gewaehlt" : "") : ""; };
  el.innerHTML = `
  <div class="leiste">
    <select id="rk-liste">${S.ranking.listen.map((l) => `<option value="${l.id}" ${l.id === L.id ? "selected" : ""}>${esc(l.name)}</option>`).join("")}</select>
    <button id="rk-neu">+ Neue Liste</button><button id="rk-name">✏ Umbenennen</button><button id="rk-tier">+ Reihe</button>
    <button id="rk-leeren">↺ Alles zurücksetzen</button><button id="rk-del">🗑 Liste löschen</button>
    ${host ? `<button id="rk-bild" class="haupt">📷 Als Bild speichern</button>` : ""}
  </div>
  <p class="klein leise">Porträts mit der Maus in eine Reihe ziehen – oder erst ein Porträt anklicken und dann auf die Reihe klicken. Klick auf den Reihen-Namen ändert Name und Farbe.</p>
  <div class="tierliste" id="rk-tiers">
    ${L.tiers.map((t, i) => `<div class="tier"><div class="tier-label" data-tl="${i}" style="background:${esc(t.farbe)}">${esc(t.name)}</div><div class="tier-inhalt" data-ziel="${i}">${t.items.map(item).join("")}</div></div>`).join("")}
  </div>
  <h3 style="margin-top:14px">Noch nicht eingeordnet (${pool.length})</h3>
  <div class="tier-inhalt karte" data-ziel="pool" style="min-height:90px">${pool.map((x) => item(x.name)).join("")}</div>`;
  $("#rk-liste").onchange = (e) => { S.ranking.aktiv = e.target.value; speichern(); zeichneRanking(); };
  $("#rk-neu").onclick = () => dialog(`<h3>Neue Tier-Liste</h3><div class="zeile"><button data-na="killer">🔪 Killer</button><button data-na="survivor">🏃 Survivor</button><button data-na="maps">🗺 Maps</button></div>`, (box) => {
    $$("[data-na]", box).forEach((b) => b.addEventListener("click", () => { const l = neueListe(b.dataset.na); S.ranking.listen.push(l); S.ranking.aktiv = l.id; speichern(); dialogZu(); zeichneRanking(); }));
  });
  $("#rk-name").onclick = () => { const n = prompt("Name der Liste:", L.name); if (n) { L.name = n; speichern(); zeichneRanking(); } };
  $("#rk-tier").onclick = () => { L.tiers.push({ name: "Neu", farbe: "#9ca3af", items: [] }); speichern(); zeichneRanking(); };
  $("#rk-leeren").onclick = () => { if (confirm("Alle Einordnungen dieser Liste zurücksetzen?")) { L.tiers.forEach((t) => (t.items = [])); speichern(); zeichneRanking(); } };
  $("#rk-del").onclick = () => { if (confirm(`„${L.name}“ löschen?`)) { S.ranking.listen = S.ranking.listen.filter((x) => x.id !== L.id); S.ranking.aktiv = S.ranking.listen[0]?.id || null; speichern(); zeichneRanking(); } };
  $("#rk-bild") && ($("#rk-bild").onclick = () => { senden("screenshot", { name: L.name, element: "#rk-tiers" }); });
  const verschieben = (name, ziel) => {
    L.tiers.forEach((t) => (t.items = t.items.filter((x) => x !== name)));
    if (ziel !== "pool") L.tiers[+ziel].items.push(name);
    gewaehltItem = null; speichern(); zeichneRanking();
  };
  $$("[data-rk]", el).forEach((p) => {
    p.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", p.dataset.rk); });
    p.addEventListener("click", (e) => { e.stopPropagation(); gewaehltItem = gewaehltItem === p.dataset.rk ? null : p.dataset.rk; zeichneRanking(); });
  });
  $$("[data-ziel]", el).forEach((z) => {
    z.addEventListener("dragover", (e) => { e.preventDefault(); z.classList.add("ziel"); });
    z.addEventListener("dragleave", () => z.classList.remove("ziel"));
    z.addEventListener("drop", (e) => { e.preventDefault(); const n = e.dataTransfer.getData("text/plain"); if (n) verschieben(n, z.dataset.ziel); });
    z.addEventListener("click", () => { if (gewaehltItem) verschieben(gewaehltItem, z.dataset.ziel); });
  });
  $$("[data-tl]", el).forEach((d) => d.addEventListener("click", () => {
    const t = L.tiers[+d.dataset.tl];
    dialog(`<h3>Reihe bearbeiten</h3><div class="zeile"><input id="tl-n" value="${esc(t.name)}"><input type="color" id="tl-f" value="${esc(t.farbe)}"></div>
      <div class="zeile" style="margin-top:10px"><button class="haupt" id="tl-ok">OK</button><button id="tl-hoch">▲</button><button id="tl-runter">▼</button><button id="tl-del">🗑 Reihe löschen</button></div>`, () => {
      const i = +d.dataset.tl;
      $("#tl-ok").onclick = () => { t.name = $("#tl-n").value; t.farbe = $("#tl-f").value; speichern(); dialogZu(); zeichneRanking(); };
      $("#tl-hoch").onclick = () => { if (i > 0) { L.tiers.splice(i - 1, 0, L.tiers.splice(i, 1)[0]); speichern(); dialogZu(); zeichneRanking(); } };
      $("#tl-runter").onclick = () => { if (i < L.tiers.length - 1) { L.tiers.splice(i + 1, 0, L.tiers.splice(i, 1)[0]); speichern(); dialogZu(); zeichneRanking(); } };
      $("#tl-del").onclick = () => { L.tiers.splice(i, 1); speichern(); dialogZu(); zeichneRanking(); };
    });
  }));
}

// ================================================================ Maps
let mapFilter = { realm: "", q: "" };
function sterne(wert, attr) { return `<span class="sterne" ${attr}>${[1, 2, 3, 4, 5].map((i) => `<span data-st="${i}">${i <= wert ? "★" : "☆"}</span>`).join("")}</span>`; }
function zeichneMaps() {
  const el = $("#tab-maps");
  const realms = [...new Set(MAPS.map((m) => m.realm))];
  el.innerHTML = `<div class="leiste"><select id="mf-realm"><option value="">Alle Realms (${MAPS.length} Maps)</option>${realms.map((r) => `<option ${mapFilter.realm === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
    <input id="mf-q" type="search" placeholder="Map suchen …" value="${esc(mapFilter.q)}" style="flex:1"><button id="mf-zufall">🎲 Zufällige Map</button></div>
    <p class="klein leise">Bewerte jede Map: ★ = wie gut sie für <b>Killer</b> bzw. <b>Survivor</b> ist (deine Einschätzung). Klick auf eine Map zeigt Details und deine Notizen.</p>
    <div class="raster" id="mf-liste"></div>`;
  const zeichne = () => {
    const q = D.norm(mapFilter.q);
    $("#mf-liste").innerHTML = MAPS.filter((m) => (!mapFilter.realm || m.realm === mapFilter.realm) && (!q || D.norm(m.name + m.realm).includes(q))).map((m) => {
      const w = S.maps.wertung[m.name] || {};
      return `<div class="karte map-karte" data-map="${esc(m.name)}"><img src="${esc(m.bild || "")}" alt="" loading="lazy">
        <div class="inn"><b>${esc(m.name)}</b><div class="klein leise">${esc(m.realm)}</div>
        <div class="zeile ab klein" style="margin-top:6px"><span>🔪 ${sterne(w.killer || 0, "")}</span><span>🏃 ${sterne(w.survivor || 0, "")}</span></div>
        ${S.maps.notizen[m.name] ? `<div class="klein" style="margin-top:4px">📝 ${esc(S.maps.notizen[m.name].slice(0, 80))}</div>` : ""}</div></div>`;
    }).join("");
    $$("[data-map]", el).forEach((d) => d.addEventListener("click", () => mapDetail(mapNach.get(d.dataset.map))));
  };
  $("#mf-realm").onchange = (e) => { mapFilter.realm = e.target.value; zeichne(); };
  $("#mf-q").oninput = (e) => { mapFilter.q = e.target.value; zeichne(); };
  $("#mf-zufall").onclick = () => mapDetail(MAPS[Math.floor(Math.random() * MAPS.length)]);
  zeichne();
}
function mapDetail(m) {
  if (!m) return;
  const w = S.maps.wertung[m.name] = S.maps.wertung[m.name] || { killer: 0, survivor: 0 };
  const wiki = `https://deadbydaylight.wiki.gg/wiki/${encodeURIComponent(m.name.replace(/ /g, "_"))}`;
  dialog(`<div class="raster2"><img src="${esc(m.bild || "")}" style="width:100%;border-radius:12px;background:#111">
    <div><h2>${esc(m.name)}</h2><div class="leise">Realm: ${esc(m.realm)}</div>
      <p style="white-space:pre-line">${esc(m.text || "Keine Beschreibung vorhanden.")}</p>
      <div class="zeile">🔪 Killer: ${sterne(w.killer, 'data-mw="killer"')}</div>
      <div class="zeile">🏃 Survivor: ${sterne(w.survivor, 'data-mw="survivor"')}</div>
      <a href="${wiki}" target="_blank"><button style="margin-top:10px">Karte & Details im Wiki ↗</button></a></div></div>
    <div class="feld" style="margin-top:10px"><label>Meine Notizen (Loops, Gen-Spots, Hatch, Taktik …)</label><textarea id="md-notiz" style="min-height:120px">${esc(S.maps.notizen[m.name] || "")}</textarea></div>`, (box) => {
    $$("[data-mw]", box).forEach((s) => $$("[data-st]", s).forEach((x) => x.addEventListener("click", () => {
      w[s.dataset.mw] = +x.dataset.st; speichern();
      $$("[data-st]", s).forEach((y) => (y.textContent = +y.dataset.st <= w[s.dataset.mw] ? "★" : "☆"));
      if (S.tab === "maps") zeichneMaps();
    })));
    $("#md-notiz").oninput = (e) => { S.maps.notizen[m.name] = e.target.value; speichern(); };
  });
}

// ================================================================ Overlay
const WIDGET_NAMEN = { timer: "⏱ Timer", challenges: "🎯 Angepinnte Challenges", build: "🎲 Build", zaehler: "🔢 Zähler", text: "📝 Eigener Text" };
function overlayBeschreibung() {
  const ws = S.overlay.widgets, out = [];
  const basis = (id, w) => ({ id, x: w.x, y: w.y, skala: w.skala, deckkraft: w.deckkraft, hg: w.hg, akzent: w.akzent, text: w.text });
  if (ws.timer.an) {
    const liste = timerFuerRolle().filter((t) => !ws.timer.nurLaufende || laufend[t.id]);
    if (liste.length || !ws.timer.nurLaufende) out.push({ ...basis("timer", ws.timer), titel: "Timer",
      zeilen: liste.map((t) => { const r = timerRest(t); return { text: t.name, wert: mmss(r), farbe: laufend[t.id] && r <= (t.warnung ?? 5) ? "#ff4d66" : t.farbe, fortschritt: laufend[t.id] ? r / t.dauer : null }; }) });
  }
  if (ws.challenges.an) {
    const pins = S.challenges.filter((c) => c.pin);
    if (pins.length) out.push({ ...basis("challenges", ws.challenges), titel: pins.length > 1 ? "Challenges" : "Challenge",
      zeilen: pins.flatMap((c) => { const w = chWerte(c); const z = [{ text: c.name, wert: `${w.fertig}/${w.ges}`, fortschritt: w.fertig / w.ges, farbe: c.ok ? "#4ade80" : ws.challenges.text }];
        if (c.jetzt) { const ch = charFinden(c.jetzt); z.push({ text: "→ " + namePlus(c.jetzt), icon: ch?.bild || null, farbe: "#ffcf4a" }); }
        if (c.regel && ws.challenges.regeln !== false) z.push({ text: c.regel.split("\n")[0].slice(0, 70), farbe: "#cfc6da" });
        return z; }),
      icons: (() => { const c = pins[0]; return pins.length === 1 && c.perks?.length ? c.perks.map((n) => perkFinden(n)?.bild || null) : []; })() });
  }
  if (ws.build.an) {
    const b = aktuellerBuild().map(perkFinden);
    if (b.some(Boolean)) out.push({ ...basis("build", ws.build), titel: "Build", icons: b.map((p) => p?.bild || null),
      zeilen: ws.build.namen ? b.filter(Boolean).map((p) => ({ text: anzeigename(p) })) : [] });
  }
  if (ws.zaehler.an) {
    const zs = S.zaehler.filter((z) => z.rolle === "beide" || z.rolle === S.rolle);
    if (zs.length) out.push({ ...basis("zaehler", ws.zaehler), titel: "Session", zeilen: zs.map((z) => ({ text: z.name, wert: String(z.wert), farbe: z.farbe })) });
  }
  if (ws.text.an && ws.text.inhalt) out.push({ ...basis("text", ws.text), titel: "", zeilen: ws.text.inhalt.split("\n").map((t) => ({ text: t, gross: true })) });
  return out;
}
let letzteBeschreibung = "";
function overlaySenden(sofort = false) {
  const desc = overlayBeschreibung();
  const json = JSON.stringify(desc);
  if (json !== letzteBeschreibung || sofort) {
    letzteBeschreibung = json;
    senden("overlay", { widgets: desc, edit: owEdit });
    if (S.tab === "overlay") zeichneVorschau(desc);
  }
}
let owEdit = false;
function zeichneVorschau(desc = overlayBeschreibung()) {
  const b = $("#ow-bild");
  if (!b) return;
  if (!desc.length) { b.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff8;text-align:center;padding:20px">Gerade ist nichts zu sehen.<br>Pinne eine Challenge an, starte einen Timer oder schalte ein Widget rechts ein.</div>`; return; }
  b.innerHTML = desc.map((w) => `<div class="ow-pos" data-w="${w.id}" style="position:absolute;left:${w.x * 100}%;top:${w.y * 100}%;transform:scale(.5);transform-origin:top left;cursor:move">${widgetHtml(w)}</div>`).join("");
  $$(".ow-pos", b).forEach((d) => d.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const r = b.getBoundingClientRect(), w = S.overlay.widgets[d.dataset.w];
    const dx = e.clientX - (r.left + w.x * r.width), dy = e.clientY - (r.top + w.y * r.height);
    const move = (ev) => {
      w.x = Math.max(0, Math.min(0.98, (ev.clientX - r.left - dx) / r.width));
      w.y = Math.max(0, Math.min(0.98, (ev.clientY - r.top - dy) / r.height));
      d.style.left = w.x * 100 + "%"; d.style.top = w.y * 100 + "%";
    };
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); speichern(); overlaySenden(true); };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
  }));
}
function zeichneOverlayTab() {
  const el = $("#tab-overlay");
  const ws = S.overlay.widgets;
  const an = host ? overlayAktiv : S.overlay.an;
  el.innerHTML = `
  <div class="raster2" style="grid-template-columns:1.4fr 1fr">
    <div>
      <div class="karte">
        <div class="zeile ab"><h2>🖥 Ingame-Overlay</h2>
          <div class="zeile"><button class="${an ? "an" : "haupt"}" id="ow-an">${an ? "Overlay ausschalten" : "Overlay einschalten"}</button>
          <button id="ow-edit" class="${owEdit ? "an" : ""}">${owEdit ? "✔ Fertig verschoben" : "✋ Im Spiel verschieben"}</button></div></div>
        <p class="klein leise">Ziehe die Teile in der Vorschau an die richtige Stelle – oder schalte „Im Spiel verschieben“ ein und ziehe sie direkt über dem Spiel. Danach wieder ausschalten, dann sind sie durchklickbar.</p>
        <div class="bildschirm" id="ow-bild"></div>
        ${host && hostInfo.bildschirme?.length > 1 ? `<div class="zeile" style="margin-top:8px"><label>Bildschirm</label><select id="ow-screen">${hostInfo.bildschirme.map((s, i) => `<option value="${i}" ${S.overlay.bildschirm === i ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></div>` : ""}
      </div>
      <div class="hinweis" style="margin-top:12px"><b>So klappt’s im Spiel:</b> In Dead by Daylight unter <i>Einstellungen → Grafik → Anzeigemodus</i> auf <b>Fenster-Vollbild</b> stellen. Bei echtem Vollbild kann kein Programm darüber zeichnen, ohne sich ins Spiel einzuklinken – das würde Easy Anti-Cheat bemerken. Das Overlay ist ein eigenes, durchsichtiges Fenster und greift nicht ins Spiel ein.</div>
    </div>
    <div class="ow-liste">${Object.entries(ws).map(([id, w]) => `
      <div class="karte">
        <div class="zeile ab"><label style="font-size:15px;color:var(--text)"><input type="checkbox" data-w="${id}" data-f="an" ${w.an ? "checked" : ""}> <b>${WIDGET_NAMEN[id]}</b></label>
          <span class="klein leise">${Math.round(w.x * 100)} % / ${Math.round(w.y * 100)} %</span></div>
        <div class="zeile" style="margin-top:6px">
          <label>Größe <input type="range" min="0.5" max="2.5" step="0.05" data-w="${id}" data-f="skala" value="${w.skala}"></label>
          <label>Hintergrund <input type="range" min="0" max="1" step="0.05" data-w="${id}" data-f="deckkraft" value="${w.deckkraft}"></label>
        </div>
        <div class="zeile" style="margin-top:6px"><label>Farbe Hintergrund <input type="color" data-w="${id}" data-f="hg" value="${w.hg}"></label><label>Akzent <input type="color" data-w="${id}" data-f="akzent" value="${w.akzent}"></label><label>Schrift <input type="color" data-w="${id}" data-f="text" value="${w.text}"></label></div>
        ${id === "timer" ? `<label style="display:block;margin-top:6px"><input type="checkbox" data-w="timer" data-f="nurLaufende" ${w.nurLaufende ? "checked" : ""}> Nur laufende Timer zeigen</label>` : ""}
        ${id === "challenges" ? `<label style="display:block;margin-top:6px"><input type="checkbox" data-w="challenges" data-f="regeln" ${w.regeln !== false ? "checked" : ""}> Regel anzeigen</label>` : ""}
        ${id === "build" ? `<label style="display:block;margin-top:6px"><input type="checkbox" data-w="build" data-f="namen" ${w.namen ? "checked" : ""}> Perk-Namen anzeigen</label>` : ""}
        ${id === "text" ? `<textarea data-w="text" data-f="inhalt" style="margin-top:6px">${esc(w.inhalt || "")}</textarea>` : ""}
      </div>`).join("")}
      <button id="ow-reset" class="klein">Positionen zurücksetzen</button>
    </div>
  </div>`;
  $("#ow-an").onclick = () => { overlayUmschalten(); zeichneOverlayTab(); };
  $("#ow-edit").onclick = () => { owEdit = !owEdit; if (owEdit && host && !overlayAktiv) overlayUmschalten(true); senden("overlayEdit", { an: owEdit }); zeichneOverlayTab(); overlaySenden(true); };
  $("#ow-screen") && ($("#ow-screen").onchange = (e) => { S.overlay.bildschirm = +e.target.value; speichern(); senden("overlayAn", { an: overlayAktiv, bildschirm: S.overlay.bildschirm }); });
  $("#ow-reset").onclick = () => { for (const [k, v] of Object.entries(STD.overlay.widgets)) { ws[k].x = v.x; ws[k].y = v.y; ws[k].skala = v.skala; } speichern(); zeichneOverlayTab(); overlaySenden(true); };
  $$("[data-w][data-f]", el).forEach((inp) => inp.addEventListener(inp.type === "range" || inp.tagName === "TEXTAREA" ? "input" : "change", () => {
    const w = ws[inp.dataset.w], f = inp.dataset.f;
    w[f] = inp.type === "checkbox" ? inp.checked : inp.type === "range" ? +inp.value : inp.value;
    speichern(); overlaySenden(true);
  }));
  zeichneVorschau();
}

// ================================================================ Hotkeys
const CODE_NAMEN = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Space: "Leertaste", Backspace: "Rück", Enter: "Enter", Escape: "Esc", Ctrl: "Strg", Shift: "Umschalt", Alt: "Alt", Win: "Win",
  Backquote: "^", Minus: "ß", Equal: "´", BracketLeft: "Ü", BracketRight: "+", Semicolon: "Ö", Quote: "Ä", Backslash: "#", Comma: ",", Period: ".", Slash: "-", IntlBackslash: "<",
  Insert: "Einfg", Delete: "Entf", Home: "Pos1", End: "Ende", PageUp: "Bild↑", PageDown: "Bild↓", NumpadAdd: "Num +", NumpadSubtract: "Num −", NumpadMultiply: "Num *", NumpadDivide: "Num /", NumpadDecimal: "Num ,", NumpadEnter: "Num Enter", Pause: "Pause", ScrollLock: "Rollen", PrintScreen: "Druck" };
function tasteText(combo) {
  if (!combo) return "";
  return combo.split("+").map((t) => CODE_NAMEN[t] || t.replace(/^Key/, "").replace(/^Digit/, "").replace(/^Numpad(\d)/, "Num $1")).join(" + ");
}
function hotkeyFeld(id, wert) { return `<input class="hotkey-feld" readonly data-hk="${esc(id)}" value="${esc(tasteText(wert) || "– keiner –")}" title="Klicken und Tastenkombination drücken. Entf/Rück = löschen"> `; }
function hotkeySetzen(id, combo) {
  const [art, ref] = id.split(/:(.+)/);
  if (art === "timer") { const t = S.timers.find((x) => x.id === ref); if (t) t.hotkey = combo; }
  else if (art === "zplus") { const z = S.zaehler.find((x) => x.id === ref); if (z) z.plus = combo; }
  else if (art === "zminus") { const z = S.zaehler.find((x) => x.id === ref); if (z) z.minus = combo; }
  else S.hotkeys.aktionen[id] = combo;
  speichern(); hotkeysSenden();
}
let lauschFeld = null;
function hotkeyFelderAktivieren(el) {
  $$("[data-hk]", el).forEach((f) => f.addEventListener("click", () => {
    $$(".hotkey-feld.lauscht").forEach((x) => x.classList.remove("lauscht"));
    lauschFeld = f; f.classList.add("lauscht"); f.value = "Taste drücken …";
    senden("hotkeyPause", { an: true });
  }));
}
addEventListener("keydown", (e) => {
  if (lauschFeld) {
    e.preventDefault();
    if (["ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(e.code)) return;
    let combo = "";
    if (e.code === "Escape") combo = null;
    else if ((e.code === "Delete" || e.code === "Backspace") && !e.ctrlKey && !e.altKey && !e.shiftKey) combo = "";
    else combo = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Win", e.code].filter(Boolean).join("+");
    const f = lauschFeld; lauschFeld = null; f.classList.remove("lauscht");
    senden("hotkeyPause", { an: false });
    if (combo === null) { f.value = "– abgebrochen –"; return; }
    const doppelt = alleHotkeys().find((h) => h.combo === combo && h.id !== f.dataset.hk && combo);
    if (doppelt) toast(`⚠ ${tasteText(combo)} ist schon belegt – trotzdem gesetzt`);
    hotkeySetzen(f.dataset.hk, combo);
    f.value = tasteText(combo) || "– keiner –";
    return;
  }
  // Ohne Windows-Programm: Hotkeys nur, wenn die Seite den Fokus hat
  if (host || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const combo = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift", e.metaKey && "Win", e.code].filter(Boolean).join("+");
  const h = alleHotkeys().find((x) => x.combo === combo);
  if (h) { e.preventDefault(); hotkeyAusfuehren(h.id); }
});
function alleHotkeys() {
  const l = [];
  for (const [id, c] of Object.entries(S.hotkeys.aktionen)) if (c) l.push({ id, combo: c });
  for (const t of S.timers) if (t.hotkey) l.push({ id: "timer:" + t.id, combo: t.hotkey });
  for (const z of S.zaehler) { if (z.plus) l.push({ id: "zplus:" + z.id, combo: z.plus }); if (z.minus) l.push({ id: "zminus:" + z.id, combo: z.minus }); }
  return l;
}
function hotkeysSenden() { senden("hotkeys", { modus: S.hotkeys.modus, liste: alleHotkeys() }); }
function hotkeyAusfuehren(id) {
  const [art, ref] = id.split(/:(.+)/);
  const pins = S.challenges.filter((c) => c.pin && !c.ok);
  const chZiel = pins.find((c) => c.id === S.aktiv) || pins[0];
  switch (art) {
    case "timer": if (ref === "stopp") alleTimerStopp(); else timerStart(ref); break;
    case "zplus": case "zminus": { const z = S.zaehler.find((x) => x.id === ref); if (z) { z.wert += art === "zplus" ? 1 : -1; speichern(); piep(art === "zplus" ? 1100 : 500, 0.06); if (S.tab === "timer") zeichneTimer(); } break; }
    case "ow": if (ref === "toggle") overlayUmschalten(); else if (ref === "edit") { owEdit = !owEdit; senden("overlayEdit", { an: owEdit }); if (S.tab === "overlay") zeichneOverlayTab(); } break;
    case "ch":
      if (!chZiel) { toast("Keine angepinnte Challenge"); break; }
      if (ref === "plus" || ref === "erfolg") challengeAktion(chZiel.id, "erfolg");
      else if (ref === "versuch") challengeAktion(chZiel.id, "versuch");
      else if (ref === "minus") challengeAktion(chZiel.id, "zurueck");
      else if (ref === "naechste") { const i = pins.indexOf(chZiel); S.aktiv = pins[(i + 1) % pins.length].id; speichern(); toast("→ " + S.challenges.find((c) => c.id === S.aktiv).name); }
      break;
    case "build": wuerfeln(); if (S.tab === "builds") zeichneBuilds(); toast("🎲 Neuer Build"); break;
  }
  overlaySenden(true);
}

// ================================================================ Einstellungen
function zeichneEinstellungen() {
  const el = $("#tab-einstellungen");
  el.innerHTML = `
  <div class="raster2">
    <div class="karte">
      <h3>🌍 Sprache der Perk- und Charakternamen</h3>
      <div class="zeile">${[["de", "Deutsch"], ["en", "Englisch"], ["beide", "Deutsch + Englisch"]].map(([k, n]) => `<button class="${S.sprache === k ? "an" : ""}" data-sp="${k}">${n}</button>`).join("")}</div>
      <p class="klein leise">Deutsche Namen kommen aus dem offiziellen Wiki. Fehlt ein deutscher Name (ganz neue Perks), wird der englische gezeigt.</p>
      <div class="trenner"></div>
      <h3>🔊 Ton</h3>
      <label><input type="checkbox" id="e-ton" ${S.ton ? "checked" : ""}> Töne bei Timern und Hotkeys</label>
      <div class="zeile" style="margin-top:6px"><label>Lautstärke</label><input type="range" id="e-vol" min="0" max="100" value="${S.lautstaerke}"><button class="klein" id="e-test">Test</button></div>
    </div>
    <div class="karte">
      <h3>⌨ Globale Hotkeys</h3>
      <p class="klein leise">Funktionieren auch mitten im Spiel. Klick ins Feld und drück die gewünschte Taste oder Kombination (z. B. Strg+Alt+F, F9, Num 5). <b>Entf</b> löscht, <b>Esc</b> bricht ab. Timer- und Zähler-Hotkeys stellst du im Tab ⏱ Timer ein.</p>
      ${Object.entries(AKTIONEN).map(([id, n]) => `<div class="zeile ab" style="margin:5px 0"><span>${n}</span>${hotkeyFeld(id, S.hotkeys.aktionen[id])}</div>`).join("")}
      <div class="trenner"></div>
      <div class="feld"><label>Was passiert mit der Taste im Spiel?</label>
        <select id="e-hkmodus"><option value="abfangen">Abfangen – das Spiel bekommt die Taste nicht (sicher, empfohlen für Kombinationen)</option>
        <option value="durchlassen" ${S.hotkeys.modus === "durchlassen" ? "selected" : ""}>Durchlassen – Taste wirkt im Spiel UND im Companion</option></select></div>
      <p class="klein leise">Tipp: Nimm Tasten, die du in DBD nicht brauchst – z. B. F5–F12, Num-Block oder Kombinationen mit Strg+Alt.</p>
    </div>
    <div class="karte">
      <h3>🎥 Streamer-Modus</h3>
      <p class="klein leise">Für Twitch &amp; Co.: Hier entscheidest du, was deine Zuschauer sehen.</p>
      <label style="display:block"><input type="checkbox" id="e-obs" ${S.streamer.obs ? "checked" : ""}> <b>Overlay als OBS-Browserquelle</b> bereitstellen</label>
      <div class="box" style="margin:6px 0">${host ? `In OBS: <i>Quelle hinzufügen → Browser</i> → URL <code>${esc(hostInfo.obsUrl || `http://localhost:${S.streamer.port}/`)}</code> · Breite/Höhe wie dein Bildschirm (z. B. 1920 × 1080). Der Hintergrund ist durchsichtig, die Widgets sind gestochen scharf.` : "Nur im Windows-Programm verfügbar."}</div>
      <label style="display:block"><input type="checkbox" id="e-owhide" ${S.streamer.overlayVerstecken ? "checked" : ""}> Ingame-Overlay im Stream <b>verstecken</b> (nur du siehst es; ideal zusammen mit der OBS-Quelle oder für geheime Infos)</label>
      <label style="display:block;margin-top:6px"><input type="checkbox" id="e-winhide" ${S.streamer.fensterVerstecken ? "checked" : ""}> Companion-Fenster im Stream <b>verstecken</b> (Bildschirmaufnahme zeigt es nicht)</label>
      <div class="zeile" style="margin-top:8px"><label>Port</label><input type="number" id="e-port" value="${S.streamer.port}" style="width:90px"></div>
    </div>
    <div class="karte">
      <h3>☁ Konto & Sync mit EntityDex</h3>
      <div id="e-konto"><div class="box">Lädt …</div></div>
    </div>
    <div class="karte">
      <h3>💾 Daten</h3>
      <div class="klein">${Object.entries(D.herkunft).map(([k, v]) => `<div><span class="status-punkt ${v === "live" ? "ok" : ""}"></span>${esc(k)}: ${v === "live" ? "live von EntityDex" : v === "offline" ? "mitgelieferte Daten" : "fehlt"}</div>`).join("")}</div>
      <p class="klein leise">${CHARS.filter((c) => c.rolle === "killer").length} Killer · ${CHARS.filter((c) => c.rolle === "survivor").length} Survivor · ${PERKS.length} Perks · ${MAPS.length} Maps</p>
      <div class="zeile"><button id="e-export">⬇ Sichern (Datei)</button><button id="e-import">⬆ Wiederherstellen</button><button id="e-reset">⚠ Alles zurücksetzen</button></div>
      <input type="file" id="e-datei" accept=".json" hidden>
    </div>
  </div>`;
  $$("[data-sp]", el).forEach((b) => b.addEventListener("click", () => { S.sprache = b.dataset.sp; speichern(); zeichneEinstellungen(); overlaySenden(true); }));
  $("#e-ton").onchange = (e) => { S.ton = e.target.checked; speichern(); };
  $("#e-vol").oninput = (e) => { S.lautstaerke = +e.target.value; speichern(); };
  $("#e-test").onclick = () => piep(880, 0.2);
  $("#e-hkmodus").onchange = (e) => { S.hotkeys.modus = e.target.value; speichern(); hotkeysSenden(); };
  const streamerSenden = () => { speichern(); senden("streamer", S.streamer); };
  $("#e-obs").onchange = (e) => { S.streamer.obs = e.target.checked; streamerSenden(); };
  $("#e-owhide").onchange = (e) => { S.streamer.overlayVerstecken = e.target.checked; streamerSenden(); };
  $("#e-winhide").onchange = (e) => { S.streamer.fensterVerstecken = e.target.checked; streamerSenden(); };
  $("#e-port").onchange = (e) => { S.streamer.port = Math.max(1024, Math.min(65535, +e.target.value || 8833)); streamerSenden(); };
  $("#e-export").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: "application/json" }));
    a.download = `dbd-companion-sicherung-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  $("#e-import").onclick = () => $("#e-datei").click();
  $("#e-datei").onchange = async (e) => {
    try { const d = JSON.parse(await e.target.files[0].text()); localStorage.setItem("dbdcompanion2", JSON.stringify(d)); S = laden(); toast("Wiederhergestellt"); zeigeTab("start"); hotkeysSenden(); }
    catch { toast("Datei konnte nicht gelesen werden"); }
  };
  $("#e-reset").onclick = () => { if (confirm("Wirklich ALLES zurücksetzen (Challenges, Timer, Rankings, Einstellungen)?")) { localStorage.removeItem("dbdcompanion2"); S = laden(); zeigeTab("start"); hotkeysSenden(); } };
  hotkeyFelderAktivieren(el);
  zeichneKonto();
}

// ================================================================ Start
(async function init() {
  $$("#rolle button").forEach((b) => b.classList.toggle("an", b.dataset.r === S.rolle));
  zeigeOwSchalter();
  try {
    [CHARS, PERKS, MAPS, BUILDS] = await Promise.all([D.charaktere(), D.perks(), D.maps(), D.buildsModul().catch(() => null)]);
  } catch (e) { console.error(e); toast("Daten konnten nicht geladen werden"); }
  for (const p of PERKS) { perkNach.set(D.norm(p.name), p); if (p.de) perkNach.set(D.norm(p.de), p); }
  for (const c of CHARS) charNach.set(c.name, c);
  for (const m of MAPS) mapNach.set(m.name, m);
  $("#daten-stand").textContent = `${CHARS.filter((c) => c.rolle === "killer").length} Killer · ${CHARS.filter((c) => c.rolle === "survivor").length} Survivor · ${PERKS.length} Perks · v${VERSION}`;
  zeigeTab(S.tab || "start");
  hotkeysSenden();
  senden("streamer", S.streamer);
  senden("bereit", { version: VERSION, overlayAn: S.overlay.an, bildschirm: S.overlay.bildschirm });
  try { konto = await Sync.nutzer(); } catch {}
  if (konto) { syncJetzt(false); syncStarten(); }
  overlaySenden(true);
})();
