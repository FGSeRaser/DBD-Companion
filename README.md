# 🔪 DBD Companion

**Challenges, Timer, Builds, Ranking, Maps und ein echtes Ingame-Overlay für Dead by Daylight.**
von [FGSeRaser](https://github.com/FGSeRaser)

---

- **🎯 Challenges** – selbst erstellen oder aus Vorlagen: „Gegen jeden Killer entkommen“, „Adept mit jedem Survivor“, „4K auf jeder Map“, feste Builds, eigene Listen. Fortschritt, Versuche, Erfolgsquote, Serien. **📌 Anpinnen** → erscheint im Spiel als Overlay.
- **🖥 Ingame-Overlay** – durchsichtige Teile, die über Dead by Daylight schweben und durchklickbar sind: Timer, angepinnte Challenges, Build mit Perk-Icons, Zähler (Escapes, Kills …), eigener Text. Position per Maus (in der App oder direkt im Spiel), Größe, Farben und Deckkraft frei wählbar.
- **⌨ Hotkeys** – frei wählbar für jeden Timer, jeden Zähler und alle Aktionen (Overlay an/aus, Challenge geschafft/Versuch, nächste Challenge, Build würfeln …). Funktionieren mitten im Spiel. Wahlweise „Abfangen“ oder „Durchlassen“.
- **⏱ Timer** – Decisive Strike, Off the Record, Make Your Choice, Endgame Collapse … alle editierbar, mit Warnton.
- **🎲 Builds** – vorgefertigte Builds nach Spielstil (Teamplayer, Unhook, Gens, Chase, Heilen, Stealth, Info, Solo-Queue; als Killer Gen-Bremse, Chase, Hex, Endgame …) **live aus [EntityDex](https://fgseraser.github.io/EntityDex/)**, Build-Würfel mit 🔒, eigene Builds, „nur meine Perks“.
- **🩸 Perks & 👥 Charaktere** – alle Killer, Survivor und Perks mit Icons, Porträts und Beschreibungen, **deutsch und englisch** umschaltbar. Die Daten kommen alle 3 Stunden frisch von EntityDex – neue Kapitel sind automatisch dabei.
- **🏆 Ranking** – Tier-Listen (S–F, Reihen frei benennbar) für Killer, Survivor und Maps mit allen Porträts. Als Bild speichern.
- **🗺 Maps** – alle Realms und Maps mit Bild, Beschreibung, eigener Bewertung (Killer-/Survivor-seitig) und Notizen.
- **☁ Verbunden mit EntityDex** – Challenges am Handy in der [EntityDex](https://github.com/FGSeRaser/EntityDex)-App anlegen und für den Stream planen, im Companion mit demselben Konto anmelden → werden automatisch übernommen. Fortschritt vom PC landet wieder auf dem Handy.
- **🎥 Streamer-Modus** – Overlay als **OBS-Browserquelle** (gestochen scharf, durchsichtig), Ingame-Overlay und/oder Companion-Fenster vor der Aufnahme verstecken.

## Herunterladen

Unter **[Releases](../../releases/latest)** die ZIP laden, entpacken, `DBD Companion.exe` starten. Keine Installation nötig.

> **Fürs Overlay:** In Dead by Daylight *Einstellungen → Grafik → Anzeigemodus* auf **Fenster-Vollbild** stellen.
> Bei echtem Vollbild kann kein Programm darüber zeichnen, ohne sich ins Spiel einzuklinken – das würde Easy Anti-Cheat bemerken.
> Der Companion greift **nicht** ins Spiel ein: Das Overlay sind eigene durchsichtige Fenster, die Hotkeys sind normale Windows-Tastenkürzel.

## Aufbau

```
DBDCompanion.vbproj     VB.NET (.NET 8, WinForms + WebView2)
Hauptfenster.vb         Fenster, Tray, Brücke zur Oberfläche, Overlay-Verwaltung, Streamer-Modus
OverlayWidget.vb        ein Overlay-Teil als durchsichtiges, durchklickbares Fenster
Hotkeys.vb              globale Hotkeys (RegisterHotKey oder Tastatur-Hook)
ObsServer.vb            localhost-Server für die OBS-Browserquelle
web/js/sync.js          Konto & Challenge-Sync mit EntityDex (gleiche Datei wie dort)
BildCache.vb            Perk-Icons und Porträts fürs Overlay (mit Festplatten-Cache)
web/                    Oberfläche (HTML/CSS/JS)
web/daten/              mitgelieferte Daten (falls offline) – werden beim Bauen von EntityDex aktualisiert
.github/workflows/      baut bei jedem Push die EXE und erstellt ein Release
```

Selbst bauen: `BAUEN.bat` (braucht das .NET 8 SDK) oder `DBD Companion.sln` in Visual Studio 2022 öffnen.

## Danke

Daten über [EntityDex](https://github.com/FGSeRaser/EntityDex) aus [dbd.tricky.lol](https://dbd.tricky.lol) und dem [Dead by Daylight Wiki](https://deadbydaylight.wiki.gg).
Dead by Daylight ist eine Marke von Behaviour Interactive. Dieses Tool ist ein Fan-Projekt und steht in keiner Verbindung zu Behaviour.

---
<p align="center">Gemacht von <a href="https://github.com/FGSeRaser">FGSeRaser</a></p>
