// EntityDex – Spielstile, Perk-Kategorien und Kombos. von FGSeRaser – https://github.com/FGSeRaser
// Die Kategorien sind von Hand gepflegt (beliebte/starke Perks). Das Roulette nutzt ALLE Perks.

export const SPIELSTILE = {
  survivor: [
    { id: "team", name: "Teamplayer", icon: "🤝", text: "Viele Unhooks, Rettungen und Schutz fürs Team" },
    { id: "heilen", name: "Heiler", icon: "🩹", text: "Schnell heilen und das Team auf den Beinen halten" },
    { id: "gens", name: "Generatoren", icon: "⚙️", text: "Gens schnell machen und Druck rausnehmen" },
    { id: "chase", name: "Chase", icon: "🏃", text: "Den Killer lange laufen lassen" },
    { id: "taschenlampe", name: "Rettungen & Blenden", icon: "🔦", text: "Taschenlampe, Paletten-Saves, Killer ärgern" },
    { id: "stealth", name: "Stealth", icon: "🥷", text: "Unsichtbar bleiben, nicht gefunden werden" },
    { id: "info", name: "Info", icon: "👁️", text: "Immer wissen, wo Killer und Team sind" },
    { id: "solo", name: "Solo-Queue", icon: "🎧", text: "Allein spielen ohne Voice – Perks gegen schlechte Randoms" },
  ],
  killer: [
    { id: "slowdown", name: "Gen-Bremse", icon: "🐢", text: "Generatoren aufhalten (Regression, Blockieren)" },
    { id: "chase", name: "Chase", icon: "🔪", text: "Schneller treffen, Loops brechen" },
    { id: "info", name: "Info & Tracking", icon: "🧭", text: "Survivor finden und Auren sehen" },
    { id: "haken", name: "Haken-Druck", icon: "🪝", text: "Perks, die beim Haken was auslösen" },
    { id: "hex", name: "Hex-Totems", icon: "🕯️", text: "Riskant, aber stark – Hex-Builds" },
    { id: "endgame", name: "Endgame", icon: "🚪", text: "Gerade am Ende noch Kills holen" },
    { id: "stealth", name: "Stealth", icon: "🌫️", text: "Ohne Terrorradius anschleichen" },
  ],
};

export const KATEGORIEN = {
  survivor: {
    team: ["Borrowed Time", "We'll Make It", "Kindred", "Bond", "Deliverance", "Babysitter", "Reassurance", "Off the Record", "Decisive Strike", "Prove Thyself", "Guardian", "Mettle of Man", "Shoulder the Burden", "Wiretap", "Breakout", "Boon: Shadow Step", "For the People", "Champion of Light", "Friendly Competition"],
    heilen: ["Botany Knowledge", "Self-Care", "Empathy", "Boon: Circle of Healing", "Desperate Measures", "Inner Strength", "Resurgence", "Strength in Shadows", "Solidarity", "We'll Make It", "Reactive Healing", "Autodidact", "Pharmacy", "Leader"],
    gens: ["Prove Thyself", "Déjà Vu", "Hyperfocus", "Stake Out", "Fast Track", "Repressed Alliance", "Corrective Action", "Potential Energy", "Overzealous", "Built to Last", "Leader", "Technician", "Teamwork: Power of Two", "Visionary", "Fogwise"],
    chase: ["Dead Hard", "Sprint Burst", "Lithe", "Balanced Landing", "Overcome", "Made for This", "Resilience", "Windows of Opportunity", "Adrenaline", "Unbreakable", "Lucky Break", "Iron Will", "Background Player", "Hardened"],
    taschenlampe: ["Flashbang", "Blast Mine", "Head On", "Breakout", "Saboteur", "Boil Over", "Flip-Flop", "Power Struggle", "Background Player", "Champion of Light", "Any Means Necessary", "Chemical Trap", "Plot Twist"],
    stealth: ["Distortion", "Lightweight", "Urban Evasion", "Quick & Quiet", "Calm Spirit", "Iron Will", "Low Profile", "Diversion", "Deception", "Boon: Shadow Step", "Spine Chill", "Premonition", "Light-Footed"],
    info: ["Kindred", "Bond", "Spine Chill", "Alert", "Premonition", "Dark Sense", "Small Game", "Visionary", "Wiretap", "Detective's Hunch", "Plunderer's Instinct", "Clairvoyance", "Fogwise", "Counterforce", "Small Game"],
    solo: ["Kindred", "Windows of Opportunity", "Deliverance", "Self-Care", "Resilience", "Lithe", "Bond", "Spine Chill", "Decisive Strike", "Off the Record", "Unbreakable", "Déjà Vu"],
  },
  killer: {
    slowdown: ["Corrupt Intervention", "Deadlock", "Pop Goes the Weasel", "Grim Embrace", "Scourge Hook: Pain Resonance", "Dead Man's Switch", "Eruption", "Overcharge", "Call of Brine", "Surge", "Jolt", "Thanatophobia", "Hex: Ruin", "Sloppy Butcher", "Dying Light", "Hex: Pentimento", "Leverage", "Merciless Storm", "Dissolution"],
    chase: ["Bamboozle", "Brutal Strength", "Enduring", "Spirit Fury", "Fire Up", "Save the Best for Last", "Play with Your Food", "Unrelenting", "Hex: Crowd Control", "Agitation", "Mad Grit", "Coup de Grâce", "Zanshin Tactics", "Hubris", "Batteries Included"],
    info: ["Barbecue & Chilli", "Nowhere to Hide", "Lethal Pursuer", "Discordance", "Bitter Murmur", "I'm All Ears", "Darkness Revealed", "Gearhead", "Infectious Fright", "Whispers", "Bloodhound", "A Nurse's Calling", "Thrilling Tremors", "Alien Instinct", "Friends 'til the End"],
    haken: ["Scourge Hook: Pain Resonance", "Grim Embrace", "Pop Goes the Weasel", "Barbecue & Chilli", "Make Your Choice", "Scourge Hook: Gift of Pain", "Scourge Hook: Floods of Rage", "Scourge Hook: Monstrous Shrine", "Scourge Hook: Hangman's Trick", "Agitation", "Iron Grasp", "Starstruck", "Monitor & Abuse"],
    hex: ["Hex: Ruin", "Hex: Undying", "Hex: Devour Hope", "Hex: No One Escapes Death", "Hex: Pentimento", "Hex: Plaything", "Hex: Thrill of the Hunt", "Hex: Crowd Control", "Hex: Retribution", "Hex: Haunted Ground", "Hex: Face the Darkness", "Hex: Blood Favour"],
    endgame: ["Hex: No One Escapes Death", "No Way Out", "Blood Warden", "Remember Me", "Rancor", "Terminus", "Bloodhound", "Dead Man's Switch", "Hex: Blood Favour"],
    stealth: ["Monitor & Abuse", "Tinkerer", "Trail of Torment", "Dark Devotion", "Insidious", "Furtive Chase", "Unforeseen", "Mindbreaker", "Lightborn"],
  },
};

// Bewährte Kombos (Perks, die gut zusammen funktionieren)
export const KOMBOS = {
  survivor: [
    { name: "Unhook-König", stil: "team", perks: ["Borrowed Time", "We'll Make It", "Kindred", "Reassurance"], warum: "Sichere Unhooks unter Druck, danach schnell geheilt; Kindred zeigt dir, wer schon unterwegs ist." },
    { name: "Gen-Maschine", stil: "gens", perks: ["Prove Thyself", "Déjà Vu", "Hyperfocus", "Stake Out"], warum: "Gemeinsam schneller reparieren, die 3-Gen-Ecke früh sehen und Great Skillchecks stapeln." },
    { name: "Unkaputtbar", stil: "solo", perks: ["Decisive Strike", "Off the Record", "Unbreakable", "Deliverance"], warum: "Anti-Tunnel-Paket: der Killer kann dich kaum durchziehen." },
    { name: "Chase-Profi", stil: "chase", perks: ["Lithe", "Dead Hard", "Windows of Opportunity", "Resilience"], warum: "Vaults und Paletten sehen, schneller vaulten, ein Extra-Leben im Chase." },
    { name: "Taschenlampen-Squad", stil: "taschenlampe", perks: ["Flashbang", "Breakout", "Boil Over", "Background Player"], warum: "Pick-ups verhindern, Wiggle beschleunigen, mit Background Player rechtzeitig zur Stelle." },
    { name: "Unsichtbar", stil: "stealth", perks: ["Distortion", "Lightweight", "Calm Spirit", "Spine Chill"], warum: "Keine Aura-Reads, keine Kratzspuren, keine Schreie – du weißt immer, wann er kommt." },
    { name: "Heil-Station", stil: "heilen", perks: ["Boon: Circle of Healing", "Botany Knowledge", "Empathy", "We'll Make It"], warum: "Boon-Totem zum Selbstheilen, schnellere Heilung, verletzte Teammates überall sehen." },
    { name: "Info-Netz", stil: "info", perks: ["Kindred", "Bond", "Alert", "Visionary"], warum: "Teammates, Killer-Aktionen und Generatoren immer im Blick." },
  ],
  killer: [
    { name: "Gen-Bremse", stil: "slowdown", perks: ["Scourge Hook: Pain Resonance", "Grim Embrace", "Dead Man's Switch", "Deadlock"], warum: "Fast jeder Haken bremst Gens – das Spiel zieht sich für die Survivor." },
    { name: "Treten & Bremsen", stil: "slowdown", perks: ["Pop Goes the Weasel", "Eruption", "Overcharge", "Call of Brine"], warum: "Gen-Kicks werden zum echten Rückschritt, Fehler beim Reparieren tun weh." },
    { name: "Jäger", stil: "info", perks: ["Lethal Pursuer", "Barbecue & Chili", "Nowhere to Hide", "Bitter Murmur"], warum: "Survivor zum Start und nach jedem Haken sehen – du findest immer jemanden." },
    { name: "Chase-Monster", stil: "chase", perks: ["Bamboozle", "Brutal Strength", "Enduring", "Spirit Fury"], warum: "Fenster blockieren, Paletten schnell kaputt, durch Paletten-Stuns durchziehen." },
    { name: "Hex-Party", stil: "hex", perks: ["Hex: Undying", "Hex: Ruin", "Hex: Devour Hope", "Hex: Pentimento"], warum: "Undying schützt die anderen Hex-Totems; riskant, aber verheerend, wenn es hält." },
    { name: "Endgame-Falle", stil: "endgame", perks: ["Hex: No One Escapes Death", "No Way Out", "Remember Me", "Blood Warden"], warum: "Wenn die Tore aufgehen, fängt das Spiel für dich erst an." },
    { name: "Schleichen", stil: "stealth", perks: ["Monitor & Abuse", "Tinkerer", "Trail of Torment", "Furtive Chase"], warum: "Kein Terrorradius genau im richtigen Moment – Überraschungsangriffe." },
  ],
};

// Namen tolerant vergleichen (Akzente, Apostrophe, Chilli/Chili, Favour/Favor …)
export function norm(n) {
  return String(n || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[’`´]/g, "'").replace(/chilli/g, "chili").replace(/favour/g, "favor").replace(/&amp;/g, "&").replace(/[^a-z0-9]/g, "");
}
export function enthaelt(liste, name) { const n = norm(name); return (liste || []).some((x) => norm(x) === n); }

export function zufall(liste, n, behalten = []) {
  const pool = liste.filter((p) => !behalten.includes(p));
  const out = [...behalten];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

// Vorschläge für gewählte Spielstile: feste Kombos + gemischte Zufalls-Builds aus den Kategorien
export function vorschlaege(rolle, stile, alle, anzahl = 3) {
  // Kategorie-Namen auf die echten Live-Namen abbilden
  const live = new Map(alle.map((n) => [norm(n), n]));
  const echt = (p) => (live.size ? live.get(norm(p)) : p);
  const kat = Object.fromEntries(Object.entries(KATEGORIEN[rolle]).map(([k, l]) => [k, l.map(echt).filter(Boolean)]));
  const fest = KOMBOS[rolle].filter((k) => stile.includes(k.stil)).map((k) => ({ ...k, perks: k.perks.map(echt).filter(Boolean) }));
  const ok = () => true;
  const pool = [...new Set(stile.flatMap((s) => kat[s] || []))];
  const gemischt = [];
  for (let i = 0; i < anzahl && pool.length >= 4; i++) {
    // Jeden Stil mindestens einmal vertreten, Rest auffüllen
    const build = [];
    for (const s of stile) {
      const k = (kat[s] || []).filter((p) => ok(p) && !build.includes(p));
      if (k.length && build.length < 4) build.push(k[Math.floor(Math.random() * k.length)]);
    }
    gemischt.push({ name: `Mix ${i + 1}`, stil: stile.join("+"), perks: zufall(pool, 4, build.slice(0, 4)), warum: "Zufällig aus deinen gewählten Spielstilen zusammengestellt." });
  }
  return [...fest, ...gemischt];
}

export function kategorienVon(rolle, perk) {
  return Object.entries(KATEGORIEN[rolle] || {}).filter(([, l]) => enthaelt(l, perk)).map(([k]) => k);
}
