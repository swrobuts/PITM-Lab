# PITM-Lab

**Live:** [swrobuts.github.io/PITM-Lab](https://swrobuts.github.io/PITM-Lab/)

Interaktive Lernumgebung zur Werkzeuglandschaft eines Analytics-Projekts für das Modul
**Projekt- und IT-Management (PITM)** der THWS Business School.

Zehn Labs führen von der Werkzeugübersicht über Kommandozeile, Notebook, Versionierung,
Entwicklungsumgebung, Container, gehostete Datenbank und Datenbank-Werkzeug bis zu grafischer
Modellierung und Automatisierung. **54 Übungen** in fünf Formen, jede mit sofortiger Rückmeldung;
eine **nachgebildete Kommandozeile** mit drei Shells, `git` und `docker`; ein **echter
PostgreSQL-Server im Browser** (PGlite) auf den Daten der Fallstudie Velo City.

Die Umgebung ist zweisprachig (Deutsch / Englisch) und läuft als statische Seite auf GitHub
Pages: ohne Build-Schritt, ohne Server, ohne Anmeldung. Schwesterprojekte: DABA-Lab
(Datenbanken), PROM-Lab (Prozessmodellierung), BINT (Business Intelligence).

> **Hinweis zu den Werkzeugen.** Bei den in dieser Lernumgebung gezeigten Tools handelt es sich um
> eine Auswahl – diese ist weder als Empfehlung noch als Werbung zu verstehen. Zu jedem Werkzeug
> nennt das jeweilige Lab Alternativen auf derselben Ebene, den Lizenztyp und die Grenzen der
> kostenfreien Nutzung. Was bleibt, ist die Ebene; das Produkt wechselt.

---

## Aufbau

```
index.html                    Übersicht mit den zehn Lab-Kacheln und dem Gesamtfortschritt
lab-00-werkzeuge.html         Sieben Ebenen, Lizenztypen, Fallen der kostenfreien Kontingente   (4 Übungen)
lab-01-kommandozeile.html     pwd/ls/cd/mkdir/cat/cp/mv/rm in zsh, PowerShell und cmd.exe       (6)
lab-02-colab.html             Notebook, Runtime, Kernel, Ausführungsreihenfolge, Secrets        (5)
lab-03-github.html            Drei Bereiche, clone/add/commit/push, Zweige, .gitignore          (6)
lab-04-vscode.html            Ordner statt Datei, venv, Interpreterwahl, Erweiterungen, Trust  (5)
lab-05-docker.html            Abbild, Container, Band, Ports, Dockerfile, compose, prune        (6)
lab-06-supabase.html          Gehostetes Postgres, RLS, zwei Schlüsselarten, Verbindungswege    (6)
lab-07-datagrip.html          Datenquelle, sichtbare Schemata, Tx:Auto vs. Tx:Manual, Import    (5)
lab-08-knime.html             Workflow, Knoten, Ampel, CRISP-DM-Knotenkarte, Data Leakage      (6)
lab-09-n8n.html               Trigger, Item, Credential, Webhook, Error Workflow, Laufdaten     (5)

assets/
  pitm.css                    Gemeinsames Stylesheet: Indigo #2E2A72, Bernstein #FFC300
  pitm.js                     Laufzeit: Sprache, OS-Umschaltung, LABS, Übungsboxen, Fortschritt
  terminal.js                 Nachgebildete Shell: zsh, PowerShell, cmd.exe, git, docker
  pglite/                     PostgreSQL als WebAssembly (PGlite), lokal statt vom CDN

data/
  velocity.sql                Saatdaten der Fallstudie: station, rad, kunde, fahrt, fahrt_mit_typ
  uebungen/lab-XX.json        Befehlskarten und Übungen je Lab
```

---

## Fünf Übungstypen

| Typ | Was Studierende tun | Wie geprüft wird |
|---|---|---|
| `quiz` | Fragen mit Einfach- oder Mehrfachauswahl beantworten | Vergleich mit `richtig`; Erklärung nach der Prüfung |
| `zuordnen` | Begriffe, Symptome oder Knoten auf Kategorien ziehen | Paarweise gegen `ziel`; falsche Zuordnungen werden markiert |
| `checkliste` | Schritte an der Bedienoberfläche abarbeiten und bestätigen | Selbstbestätigung, mit Prüffrage je Schritt |
| `terminal` | Befehle in der nachgebildeten Shell eingeben | Muster **und** Zustand der Welt (Pfad, Datei, Repo, Container, Band) |
| `sql` | Eine Abfrage gegen echtes PostgreSQL schreiben | Abfrage und Referenzlösung laufen; Zeilenmengen werden verglichen |

Eine Übung sieht so aus (Auszug, Typ `terminal`):

```jsonc
{
  "id": "P09-01", "typ": "terminal",
  "titel": { "de": "…", "en": "…" },
  "aufgabe": { "de": "<p>…</p>", "en": "<p>…</p>" },
  "schritte": [
    { "text": { "de": "…", "en": "…" },
      "muster": "^docker\\s+logs\\b",                     // was getippt werden muss
      "zustand": { "containerLaeuft": "n8n",              // was danach wahr sein muss
                   "bandAn": "n8n_data",
                   "umgebung": "N8N_ENCRYPTION_KEY=" } }
  ],
  "rueckmeldung": { "de": "…", "en": "…" }
}
```

Die HTML-Seite enthält je Übung nur `<div data-uebung="P09-01"></div>`, je Befehlskarte
`<div data-befehl="B03"></div>`; eine freie Konsole steht als `<div data-terminal="frei"></div>`,
eine SQL-Konsole als `<div data-sql-konsole></div>`.

---

## Die nachgebildete Kommandozeile

`assets/terminal.js` ist eine Shell ohne Server: ein Dateibaum im Speicher, drei Dialekte und
zwei Werkzeuge, die unabhängig vom Dialekt arbeiten.

| Teil | Was er kennt |
|---|---|
| `posix()` | zsh/bash: `pwd ls cd mkdir touch cat head tail cp mv rm echo wc grep open` |
| `powershell()` | echte Alias-Auflösung (`ls` → `Get-ChildItem`), `-Recurse/-Force/-TotalCount`, `New-Item`, `Set-Content`, `-WhatIf` |
| `cmd()` | `dir cd md rd copy move del type` samt Schaltern `/s /q /a` und Fehlertexten im cmd-Stil |
| `git()` | `init clone status add commit log switch branch merge push` auf einem Zustand mit Zweigen, Index, verfolgten Dateien und Fernstand |
| `docker()` | `run ps images volume logs stop rm rmi exec build compose prune` mit Abbildern, Containern, Ports, Bändern und Umgebungsvariablen |

Die Werkzeugausgaben sind englisch wie im Original; nur die Erläuterungen der Umgebung sind
übersetzt und mit „→“ gekennzeichnet. Die OS-Umschaltung oben in jeder Befehlskarte gilt
seitenübergreifend (`localStorage`, `pitm:os`) und schaltet gleichzeitig die Prosa: Blöcke mit
`class="nur-win"` oder `nur-mac` erscheinen nur im passenden Modus.

Der Zustand der Welt ist das, was `terminal`-Übungen prüfen. Verfügbare Prädikate:
`pfad`, `datei`, `gitRepo`, `gitCommits`, `gitZweig`, `gitIndexLeer`, `gitIndexGefuellt`,
`gitVeroeffentlicht`, `containerLaeuft`, `containerWeg`, `volumen`, `abbild`, `portGebunden`,
`umgebung`, `bandAn`. Damit wird der Weg zum Ziel nicht vorgeschrieben: Wer `Get-ChildItem -Force`
tippt statt `ls -a`, hat die Aufgabe genauso gelöst.

---

## PostgreSQL im Browser

Labs 06 und 07 rechnen auf einer echten Datenbank: PGlite lädt PostgreSQL als WebAssembly in die
Seite. `data/velocity.sql` legt bei jedem Zurücksetzen die Fallstudie neu an – 10 Stationen,
60 Räder, 200 Kunden, 1.500 Fahrten und die Sicht `fahrt_mit_typ`. Die Zufallszahlen sind über
`setseed(0.42)` festgenagelt, die Daten also auf jedem Rechner identisch: Fahrtdauern
rechtsschief, Tageszeiten zweigipflig, Preise je Radtyp – damit eine Auswertung etwas zeigt und
nicht eine Gleichverteilung.

Eine `sql`-Übung wird nicht am Text der Abfrage geprüft, sondern am Ergebnis: Die eingegebene und
die Referenzabfrage laufen beide, die Zeilenmengen werden verglichen (sortiert oder unsortiert, je
nach Aufgabe). Es gibt also mehrere richtige Abfragen.

Das PGlite-Bündel liegt unter `assets/pglite/` (19 MB), damit die Umgebung ohne CDN funktioniert;
schlägt der lokale Pfad fehl, greift ein Rückfall auf jsDelivr.

---

## Zweisprachigkeit

Jeder Text steht doppelt im HTML:

```html
<span lang="de">Ein Ablauf läuft nur, wenn er aktiviert ist.</span>
<span lang="en">A workflow runs only when it is activated.</span>
```

`pitm.css` blendet über `[data-lang="de"] [lang="en"] { display: none }` die jeweils andere Sprache
aus – kein JavaScript im Rendering-Pfad, kein Umbau des DOM. Die Wahl liegt im `localStorage`
unter `pitm:sprache`; der Seitentitel wird aus `<meta name="pitm:titel-en">` getauscht. In den
JSON-Dateien ist jedes Textfeld ein Objekt `{ "de": …, "en": … }`.

---

## Fortschritt

Gelöste Übungen liegen im `localStorage` unter `pitm:fortschritt:<lab>`, die OS-Wahl unter
`pitm:os`, die Sprache unter `pitm:sprache`. Nichts davon verlässt das Gerät, es gibt keine
Anmeldung und keine Auswertung. Die Startseite zeigt den Gesamtstand, je Lab einen Balken und
„Weiter mit Lab X“.

---

## Lokal ausprobieren

Ein Server ist nötig, weil die Seite Module und JSON per `fetch` lädt – `file://` genügt nicht.

```bash
cd PITM
python3 -m http.server 8777
# http://localhost:8777
```

---

## Veröffentlichen

```bash
gh repo create swrobuts/PITM-Lab --public --source=. --push
gh api repos/swrobuts/PITM-Lab/pages -X POST -f source[branch]=main -f source[path]=/
```

`.nojekyll` liegt bei, damit GitHub Pages die Ordner unverändert ausliefert.

---

## Quellen der Inhalte

Die Labs sind an den Vorlesungsunterlagen ausgerichtet: die sieben Ebenen der
Werkzeuglandschaft und die Lizenz-Unterscheidung aus *01 Einleitung und Motivation*, die
Begriffe von Daten über Information bis Modell und die Bewertungsmaße aus *02 Analytische
Begrifflichkeiten*, CRISP-DM samt Phasenfolge und Informationsgrenze aus *03 Vorgehensmodelle*.
Die Fallstudie Velo City liefert die durchgehenden Beispiele – Preisspanne, Wartungsrangfolge,
Stationsgruppen, Nachfrageprognose, Assoziationen, Auffälligkeiten.

Zu jedem Werkzeug prüft das Lab, was die Herstellerdokumentation zu Lizenz, Kontingenten und
Datenverarbeitung sagt, und nennt es beim Namen: Sustainable Use License bei n8n, Bildungs- statt
Vollizenz bei DataGrip, Telemetrie in Visual Studio Code, Pausierung ruhender Projekte bei
Supabase, Abrufgrenzen bei Docker Hub, kostenfreie aber nicht quelloffene Free Edition bei
Dataiku. Das ist Prüfungsstoff, nicht
Kleingedrucktes.
