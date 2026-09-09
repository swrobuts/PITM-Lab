/**
 * PITM-Lab · Laufzeit der Lernumgebung
 *
 * Zustaendig fuer:
 *   - Sprachumschaltung DE/EN (merkt sich die Wahl)
 *   - Betriebssystemwahl mac/win/cmd (merkt sich die Wahl, gilt seitenweit)
 *   - Befehlskarten mit Kopierknopf und Erklaerung der Bestandteile
 *   - die nachgebildete Kommandozeile (siehe terminal.js)
 *   - eine echte PostgreSQL-Instanz im Browser (PGlite, WebAssembly)
 *   - Uebungsboxen aus data/uebungen/<lab>.json in fuenf Bauformen
 *   - Fortschrittsanzeige je Lab
 *
 * Ohne Framework, ohne Build-Schritt, ohne fremde Server: Die Seite laesst
 * sich unveraendert auf GitHub Pages legen.
 */

import { neueWelt, zuruecksetzen as weltZuruecksetzen, fuehreAus, prompt, pfadText } from './terminal.js'

/* ------------------------------------------------------------------ Sprache */

const SPRACHSCHLUESSEL = 'pitm:sprache'
const OSSCHLUESSEL = 'pitm:os'

export function aktuelleSprache () {
  return document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'de'
}

function setzeSprache (lang) {
  document.documentElement.setAttribute('data-lang', lang)
  document.documentElement.setAttribute('lang', lang)
  try { localStorage.setItem(SPRACHSCHLUESSEL, lang) } catch { /* Privater Modus */ }
  document.querySelectorAll('[data-lang-btn]').forEach(b => {
    b.classList.toggle('active', b.dataset.langBtn === lang)
    b.setAttribute('aria-pressed', String(b.dataset.langBtn === lang))
  })
  document.querySelectorAll('a[data-lab-link]').forEach(a => {
    const ziel = a.getAttribute('href').split('?')[0]
    a.setAttribute('href', lang === 'en' ? ziel + '?lang=en' : ziel)
  })
  document.dispatchEvent(new CustomEvent('pitm:sprache', { detail: { lang } }))
}

function initSprache () {
  const ausUrl = new URLSearchParams(location.search).get('lang')
  let gespeichert = null
  try { gespeichert = localStorage.getItem(SPRACHSCHLUESSEL) } catch { /* egal */ }
  setzeSprache(ausUrl === 'en' || ausUrl === 'de' ? ausUrl : (gespeichert === 'en' ? 'en' : 'de'))
  document.querySelectorAll('[data-lang-btn]').forEach(b => {
    b.addEventListener('click', () => setzeSprache(b.dataset.langBtn))
  })
}

/* -------------------------------------------------------- Betriebssystem */

/**
 * Die Wahl gilt fuer die ganze Umgebung: Wer sich einmal als Windows-Nutzerin
 * zu erkennen gibt, soll nicht auf jeder Seite erneut umschalten. Beim ersten
 * Besuch raet die Umgebung anhand der Plattform - falsch geraten ist harmlos,
 * der Schalter steht sichtbar ueber jeder Befehlskarte.
 */
function geratenesOs () {
  const p = (navigator.userAgentData?.platform || navigator.platform || '').toLowerCase()
  if (p.includes('win')) return 'win'
  return 'mac'
}

export function aktuellesOs () {
  return document.documentElement.getAttribute('data-os') || 'mac'
}

function setzeOs (os) {
  document.documentElement.setAttribute('data-os', os)
  try { localStorage.setItem(OSSCHLUESSEL, os) } catch { /* egal */ }
  document.querySelectorAll('[data-os-btn]').forEach(b => {
    const an = b.dataset.osBtn === os
    b.classList.toggle('active', an)
    b.setAttribute('aria-pressed', String(an))
  })
  document.dispatchEvent(new CustomEvent('pitm:os', { detail: { os } }))
}

function initOs () {
  let gespeichert = null
  try { gespeichert = localStorage.getItem(OSSCHLUESSEL) } catch { /* egal */ }
  setzeOs(['mac', 'win', 'cmd'].includes(gespeichert) ? gespeichert : geratenesOs())
}

/* ------------------------------------------------------------------ Texte */

const txt = (o) => (o == null ? '' : (typeof o === 'string' ? o : (o[aktuelleSprache()] ?? o.de ?? '')))
const menge = (n, formen) => `${n} ${txt(formen)[n === 1 ? 0 : 1]}`

const M = {
  uebung:  { de: ['Übung', 'Übungen'], en: ['exercise', 'exercises'] },
  zeile:   { de: ['Zeile', 'Zeilen'], en: ['row', 'rows'] },
  schritt: { de: ['Schritt', 'Schritte'], en: ['step', 'steps'] }
}

const T = {
  pruefen:      { de: 'Prüfen', en: 'Check' },
  ausfuehren:   { de: 'Ausführen', en: 'Run' },
  loesung:      { de: 'Musterlösung anzeigen', en: 'Show model solution' },
  hinweis:      { de: 'Hinweis', en: 'Hint' },
  leeren:       { de: 'Eingabe leeren', en: 'Clear input' },
  kopieren:     { de: 'Kopieren', en: 'Copy' },
  kopiert:      { de: 'kopiert', en: 'copied' },
  kopiertNein:  { de: 'Kopieren nicht möglich – bitte von Hand markieren.', en: 'Copying failed – please select by hand.' },
  uebernehmen:  { de: 'In den Editor übernehmen', en: 'Insert into editor' },
  richtig:      { de: 'Richtig.', en: 'Correct.' },
  nochNicht:    { de: 'Noch nicht.', en: 'Not yet.' },
  ok:           { de: 'Erledigt', en: 'Done' },
  fragenOffen:  { de: 'Bitte beantworten Sie alle Fragen.', en: 'Please answer all questions.' },
  alleZuordnen: { de: 'Bitte ordnen Sie jeden Eintrag zu.', en: 'Please assign every entry.' },
  waehlen:      { de: 'bitte wählen …', en: 'please choose …' },
  leer:         { de: 'Das Feld ist leer.', en: 'The field is empty.' },
  ergebnis:     { de: 'Ergebnis', en: 'Result' },
  ausgefuehrt:  { de: 'Ausgeführt. Diese Anweisung liefert keine Tabelle zurück.', en: 'Executed. This statement returns no table.' },
  fehlerSql:    { de: 'PostgreSQL meldet einen Fehler', en: 'PostgreSQL reports an error' },
  dbLaden:      { de: 'Die Datenbank wird gestartet …', en: 'Starting the database …' },
  dbBereit:     { de: 'PostgreSQL läuft im Browser', en: 'PostgreSQL is running in your browser' },
  dbFehler:     { de: 'Die Datenbank konnte nicht gestartet werden.', en: 'The database could not be started.' },
  dbZuruck:     { de: 'Datenbank zurücksetzen', en: 'Reset database' },
  angezeigt:    { de: 'angezeigt', en: 'shown' },
  spaltenFalsch:{ de: 'Die Spalten stimmen nicht mit der Aufgabe überein.', en: 'The columns do not match the task.' },
  zeilenFalsch: { de: 'Die Zeilen stimmen nicht mit der Aufgabe überein.', en: 'The rows do not match the task.' },
  terminalZuruck:{ de: 'Zurücksetzen', en: 'Reset' },
  terminalLeeren:{ de: 'Bildschirm leeren', en: 'Clear screen' },
  auftrag:      { de: 'Auftrag', en: 'Task' },
  allesErledigt:{ de: 'Alle Schritte erledigt.', en: 'All steps completed.' },
  eingabeHier:  { de: 'Befehl eingeben und Enter drücken', en: 'Type a command and press Enter' },
  stand:        { de: 'Ihr Stand', en: 'Your progress' },
  geloest:      { de: 'gelöst', en: 'solved' },
  loeschen:     { de: 'Lernfortschritt zurücksetzen', en: 'Reset learning progress' },
  loeschenFrage:{ de: 'Den vermerkten Lernfortschritt aller Labs löschen?', en: 'Delete the recorded progress of all labs?' },
  geloescht:    { de: 'Der Lernfortschritt ist gelöscht.', en: 'Learning progress has been deleted.' },
  allesGeloest: { de: 'Alle Übungen gelöst.', en: 'All exercises solved.' },
  weiter:       { de: 'Weiter mit', en: 'Continue with' },
  zurueck:      { de: 'Zurück zu', en: 'Back to' },
  voraussetzung:{ de: 'Voraussetzung', en: 'Prerequisite' },
  umfang:       { de: 'Umfang', en: 'Scope' },
  zeitrahmen:   { de: 'Zeitrahmen', en: 'Time needed' },
  ziel:         { de: 'Kompetenzziel', en: 'Competence goal' },
  keine:        { de: 'keine', en: 'none' },
  typ: {
    quiz:       { de: 'Verständnis', en: 'Understanding' },
    zuordnen:   { de: 'Zuordnen', en: 'Matching' },
    checkliste: { de: 'Inbetriebnahme', en: 'Setting it up' },
    terminal:   { de: 'An der Konsole', en: 'At the console' },
    sql:        { de: 'SQL schreiben', en: 'Writing SQL' }
  }
}

/** Hinweise der Umgebung zu Terminaleingaben. Erscheinen gedimmt unter der Ausgabe. */
const TERMINAL_HINWEISE = {
  unbekannt:      { de: 'Diese Konsole ist nachgebildet und kennt nur die Befehle, die in den Labs vorkommen. Die Schreibweise stimmt aber mit der echten überein – ein Tippfehler wird hier genauso hart zurückgewiesen.', en: 'This console is a model and only knows the commands the labs use. The spelling matches the real thing, though – a typo is rejected here just as harshly.' },
  cmdKennLs:      { de: 'In der Eingabeaufforderung heißt der Befehl "dir". "ls" versteht nur PowerShell (als Alias) und die Unix-Shells.', en: 'In Command Prompt the command is "dir". Only PowerShell (as an alias) and the Unix shells understand "ls".' },
  oeffnenMac:     { de: '"open" übergibt an den Finder – in dieser Nachbildung passiert dabei nichts Sichtbares.', en: '"open" hands over to Finder – nothing visible happens in this model.' },
  python:         { de: 'Die Python-Sitzung selbst ist hier nicht nachgebildet. Versuchen Sie "python3 --version".', en: 'The Python session itself is not modelled here. Try "python3 --version".' },
  code:           { de: '"code ." öffnet den aktuellen Ordner in Visual Studio Code – der Punkt ist das Verzeichnis, nicht ein Satzzeichen.', en: '"code ." opens the current folder in Visual Studio Code – the dot is the directory, not punctuation.' },
  man:            { de: 'Hilfeseiten sind hier nicht hinterlegt. Auf dem eigenen Rechner ist "man <befehl>" bzw. "Get-Help <befehl>" der erste Griff.', en: 'Manual pages are not included here. On your own machine "man <command>" or "Get-Help <command>" is the first thing to reach for.' },
  exit:           { de: 'Die Sitzung bleibt offen – schließen lässt sich hier nichts.', en: 'The session stays open – there is nothing to close here.' },
  wsl:            { de: 'Das Windows-Subsystem für Linux ist hier nicht nachgebildet. Auf dem eigenen Rechner landen Sie damit in einer bash und arbeiten von dort an wie unter macOS – für Docker unter Windows der übliche Weg.', en: 'The Windows Subsystem for Linux is not modelled here. On your own machine it puts you into a bash and from there you work as on macOS – the usual route for Docker on Windows.' },
  psWechsel:      { de: 'Ein Wechsel der Shell ist hier nicht nachgebildet. Nutzen Sie den Schalter über den Befehlskarten – der Dateibaum bleibt dabei erhalten.', en: 'Switching shells is not modelled here. Use the switch above the command cards – the file tree is kept.' },
  cmdKennTouch:   { de: 'Die Eingabeaufforderung hat kein touch. Eine leere Datei entsteht dort mit  type nul > name.txt  – oder Sie wechseln zu PowerShell und nehmen New-Item.', en: 'Command Prompt has no touch. An empty file is created there with  type nul > name.txt  – or you switch to PowerShell and use New-Item.' },
  interaktiv:     { de: 'Interaktive Sitzungen im Container sind hier nicht nachgebildet. Auf dem eigenen Rechner landen Sie jetzt in einer Eingabeaufforderung innerhalb des Containers; "exit" bringt Sie zurück.', en: 'Interactive sessions inside the container are not modelled here. On your own machine you would now be at a prompt inside the container; "exit" brings you back.' },
  keinRepo:       { de: 'Ohne "git init" oder "git clone" gibt es kein Repository – Git verwaltet einen Ordner erst, wenn er darum gebeten wurde.', en: 'Without "git init" or "git clone" there is no repository – Git manages a folder only once it has been asked to.' },
  commitOhneAdd:  { de: 'Zwischen Arbeitsverzeichnis und Repository liegt die Stufe "Staging". Was nicht mit "git add" vorgemerkt ist, wandert auch nicht in den Commit.', en: 'Between working directory and repository sits the staging area. What is not marked with "git add" does not go into the commit.' },
  commitOhneText: { de: 'Ein Commit ohne Nachricht ist ein Commit ohne Begründung. Verwenden Sie "git commit -m \\"…\\"".', en: 'A commit without a message is a commit without a reason. Use "git commit -m \\"…\\"".' },
  zweigFehlt:     { de: 'Der Zweig existiert nicht. Neu anlegen und wechseln in einem Schritt: "git switch -c <name>".', en: 'The branch does not exist. Create and switch in one step: "git switch -c <name>".' },
  pushOhneRemote: { de: 'Ein lokales Repository kennt von sich aus keinen Server. "git remote add origin <url>" stellt die Verbindung her.', en: 'A local repository knows no server by itself. "git remote add origin <url>" establishes the link.' },
  abbildUnbekannt:{ de: 'Diese Nachbildung kennt nur wenige Abbilder: hello-world, postgres, nginx, python, adminer, ubuntu.', en: 'This model knows only a few images: hello-world, postgres, nginx, python, adminer, ubuntu.' },
  portBelegt:     { de: 'Ein Host-Port lässt sich nur einmal vergeben. Weichen Sie aus: "-p 15432:5432" bindet denselben Container-Port an einen anderen Port des Rechners.', en: 'A host port can only be assigned once. Move aside: "-p 15432:5432" binds the same container port to a different port on the machine.' },
  nameBelegt:     { de: 'Containernamen sind eindeutig. Entfernen Sie den alten mit "docker rm -f <name>" oder wählen Sie einen anderen Namen.', en: 'Container names are unique. Remove the old one with "docker rm -f <name>" or choose a different name.' },
  containerFehlt: { de: 'Diesen Container gibt es nicht. "docker ps -a" listet auch die gestoppten.', en: 'No such container. "docker ps -a" also lists the stopped ones.' },
  containerAus:   { de: 'In einen gestoppten Container lässt sich nicht hineingehen. Erst "docker start <name>".', en: 'You cannot step into a stopped container. Start it first with "docker start <name>".' },
  rmLaeuft:       { de: 'Ein laufender Container wird nicht einfach entfernt. Erst "docker stop", oder "docker rm -f".', en: 'A running container is not simply removed. Use "docker stop" first, or "docker rm -f".' },
  abbildInBenutzung: { de: 'Solange ein Container auf dem Abbild beruht, bleibt das Abbild. Erst den Container entfernen.', en: 'As long as a container is based on the image, the image stays. Remove the container first.' },
  keinDockerfile: { de: 'Ein Bau braucht eine Datei namens Dockerfile im aktuellen Ordner – der Punkt am Ende des Befehls ist der Bau-Kontext.', en: 'A build needs a file called Dockerfile in the current folder – the dot at the end of the command is the build context.' },
  keinCompose:    { de: 'Compose sucht im aktuellen Ordner nach compose.yaml. Ohne diese Datei gibt es nichts zu starten.', en: 'Compose looks for compose.yaml in the current folder. Without that file there is nothing to start.' },
  composeDownV:   { de: 'Achtung: "-v" hat die Bänder mitgelöscht. Die Datenbank ist jetzt leer – genau das ist der häufigste Datenverlust im Kurs.', en: 'Careful: "-v" deleted the volumes too. The database is empty now – that is the most common data loss in the course.' }
}

/* --------------------------------------------------------------------- Labs */

/**
 * Reihenfolge, Umfang, Voraussetzung, Kompetenzziel und Zeitrahmen an einer
 * Stelle. Die Lab-Seiten lesen ihre Einordnung hier heraus, die Startseite
 * ihren Fortschritt.
 */
const LABS = [
  {
    id: 'lab-00', nr: '00', datei: 'lab-00-werkzeuge.html', uebungen: 4,
    titel: { de: 'Die Werkzeuglandschaft', en: 'The tool landscape' },
    voraussetzung: null,
    zeit: { de: '45 Minuten', en: '45 minutes' },
    ziel: { de: 'Ein Werkzeug seiner Ebene zuordnen und begründen, warum die Ebene bleibt und das Produkt wechselt.', en: 'Assign a tool to its layer and explain why the layer stays while the product changes.' }
  },
  {
    id: 'lab-01', nr: '01', datei: 'lab-01-kommandozeile.html', uebungen: 6,
    titel: { de: 'Die Kommandozeile', en: 'The command line' },
    voraussetzung: null,
    zeit: { de: '90 Minuten', en: '90 minutes' },
    ziel: { de: 'Sich im Dateisystem bewegen, Dateien anlegen und lesen – unter macOS wie unter Windows.', en: 'Move around the file system, create and read files – on macOS as on Windows.' }
  },
  {
    id: 'lab-02', nr: '02', datei: 'lab-02-colab.html', uebungen: 5,
    titel: { de: 'Google Colab', en: 'Google Colab' },
    voraussetzung: { de: 'Lab 00', en: 'Lab 00' },
    zeit: { de: '75 Minuten', en: '75 minutes' },
    ziel: { de: 'Ein Notebook so führen, dass es von oben nach unten reproduzierbar durchläuft.', en: 'Keep a notebook so that it runs reproducibly from top to bottom.' }
  },
  {
    id: 'lab-03', nr: '03', datei: 'lab-03-github.html', uebungen: 6,
    titel: { de: 'Git und GitHub', en: 'Git and GitHub' },
    voraussetzung: { de: 'Lab 01', en: 'Lab 01' },
    zeit: { de: '120 Minuten', en: '120 minutes' },
    ziel: { de: 'Stände festhalten, zurückholen und mit anderen zusammenführen, ohne Daten oder Zugangsdaten preiszugeben.', en: 'Record and recover states and merge them with others, without exposing data or credentials.' }
  },
  {
    id: 'lab-04', nr: '04', datei: 'lab-04-vscode.html', uebungen: 5,
    titel: { de: 'Visual Studio Code', en: 'Visual Studio Code' },
    voraussetzung: { de: 'Lab 01, Lab 03', en: 'Lab 01, lab 03' },
    zeit: { de: '75 Minuten', en: '75 minutes' },
    ziel: { de: 'Einen Projektordner mit eigener Umgebung führen und jederzeit sagen können, welcher Interpreter gerade rechnet.', en: 'Run a project folder with its own environment and always know which interpreter is computing.' }
  },
  {
    id: 'lab-05', nr: '05', datei: 'lab-05-docker.html', uebungen: 6,
    titel: { de: 'Docker', en: 'Docker' },
    voraussetzung: { de: 'Lab 01', en: 'Lab 01' },
    zeit: { de: '120 Minuten', en: '120 minutes' },
    ziel: { de: 'Eine Datenbank in einem Container betreiben und erklären, wovon ihre Daten das Löschen des Containers überleben.', en: 'Run a database in a container and explain what makes its data survive the container being deleted.' }
  },
  {
    id: 'lab-06', nr: '06', datei: 'lab-06-supabase.html', uebungen: 6,
    titel: { de: 'Supabase', en: 'Supabase' },
    voraussetzung: { de: 'Lab 05', en: 'Lab 05' },
    zeit: { de: '105 Minuten', en: '105 minutes' },
    ziel: { de: 'Eine gehostete Postgres-Datenbank einrichten, füllen und so absichern, dass sie nicht öffentlich lesbar ist.', en: 'Set up a hosted Postgres database, fill it and secure it so that it is not publicly readable.' }
  },
  {
    id: 'lab-07', nr: '07', datei: 'lab-07-datagrip.html', uebungen: 5,
    titel: { de: 'DataGrip', en: 'DataGrip' },
    voraussetzung: { de: 'Lab 06', en: 'Lab 06' },
    zeit: { de: '75 Minuten', en: '75 minutes' },
    ziel: { de: 'Eine Datenquelle sicher anbinden und eine Änderung erst prüfen, dann festschreiben.', en: 'Connect a data source safely and check a change before committing it.' }
  },
  {
    id: 'lab-08', nr: '08', datei: 'lab-08-knime.html', uebungen: 6,
    titel: { de: 'KNIME und Dataiku', en: 'KNIME and Dataiku' },
    voraussetzung: { de: 'Lab 00', en: 'Lab 00' },
    zeit: { de: '120 Minuten', en: '120 minutes' },
    ziel: { de: 'Einen Analytics-Ablauf ohne eine Zeile Code bauen und die Reihenfolge so wählen, dass kein Wissen aus der Zukunft ins Modell gerät.', en: 'Build an analytics flow without a line of code and order the steps so that no knowledge from the future leaks into the model.' }
  },
  {
    id: 'lab-09', nr: '09', datei: 'lab-09-n8n.html', uebungen: 5,
    titel: { de: 'n8n', en: 'n8n' },
    voraussetzung: { de: 'Lab 05, Lab 06', en: 'Lab 05, lab 06' },
    zeit: { de: '90 Minuten', en: '90 minutes' },
    ziel: { de: 'Eine wiederkehrende Datenbeschaffung als Ablauf beschreiben und dabei Zugangsdaten und Laufdaten getrennt halten.', en: 'Describe a recurring data collection as a workflow while keeping credentials and run data apart.' }
  }
]

const labVon = (id) => LABS.find(l => l.id === id)

/* --------------------------------------------------------------- Fortschritt */

const fortschrittSchluessel = (lab) => `pitm:fortschritt:${lab}`

function ladeFortschritt (lab) {
  try { return JSON.parse(localStorage.getItem(fortschrittSchluessel(lab)) || '{}') } catch { return {} }
}
function merkeFortschritt (lab, id) {
  const f = ladeFortschritt(lab)
  f[id] = true
  try { localStorage.setItem(fortschrittSchluessel(lab), JSON.stringify(f)) } catch { /* egal */ }
  document.dispatchEvent(new CustomEvent('pitm:fortschritt'))
}
function loescheFortschritt () {
  for (const l of LABS) {
    try { localStorage.removeItem(fortschrittSchluessel(l.id)) } catch { /* egal */ }
  }
  document.dispatchEvent(new CustomEvent('pitm:fortschritt'))
}

/* ---------------------------------------------------------------- Werkzeuge */

const el = (tag, klasse, text) => {
  const n = document.createElement(tag)
  if (klasse) n.className = klasse
  if (text != null) n.textContent = text
  return n
}
const html = (tag, klasse, inhalt) => { const n = el(tag, klasse); n.innerHTML = inhalt; return n }
const basisUrl = new URL('..', import.meta.url)
const url = (pfad) => new URL(pfad, basisUrl).href

/** Beschriftet ein Element zweisprachig und haelt es bei Sprachwechsel nach. */
function zwei (knoten, wert, eigenschaft = 'textContent') {
  const setze = () => { knoten[eigenschaft] = txt(wert) }
  setze()
  document.addEventListener('pitm:sprache', setze)
  return knoten
}

async function kopiere (text, echo) {
  try {
    await navigator.clipboard.writeText(text)
    if (echo) echo.textContent = txt(T.kopiert)
  } catch {
    if (echo) echo.textContent = txt(T.kopiertNein)
  }
}

/* ============================================================ Befehlskarten */

const OS_NAMEN = { mac: 'macOS · zsh', win: 'PowerShell', cmd: 'cmd.exe' }
const OS_PROMPT = { mac: '%', win: 'PS>', cmd: '>' }

/**
 * Baut eine Befehlskarte: die Zeile auf dunklem Grund, ein Kopierknopf und
 * darunter die Bestandteile einzeln erklaert. Wer einen Befehl abtippt, ohne
 * zu wissen, was die Bindestriche bedeuten, hat ihn nicht gelernt.
 */
function baueBefehl (ziel, def) {
  const karte = el('div', 'befehl')

  const kopf = el('div', 'befehl-kopf')
  kopf.append(zwei(el('span', 'titel'), def.titel))
  kopf.append(el('span', 'spacer'))

  const varianten = def.varianten || { alle: { befehl: def.befehl } }
  const mehrere = !varianten.alle
  if (mehrere) {
    const schalter = el('div', 'os-schalter')
    schalter.setAttribute('role', 'group')
    for (const os of ['mac', 'win', 'cmd']) {
      if (!varianten[os]) continue
      const b = el('button', 'os-btn', OS_NAMEN[os])
      b.type = 'button'
      b.dataset.osBtn = os
      b.addEventListener('click', () => setzeOs(os))
      schalter.append(b)
    }
    kopf.append(schalter)
  }
  karte.append(kopf)

  const zeile = el('div', 'befehl-zeile')
  const promptSpan = el('span', 'prompt', '$')
  const pre = el('pre')
  const knopf = zwei(el('button', 'befehl-kopieren'), T.kopieren)
  knopf.type = 'button'
  zeile.append(promptSpan, pre, knopf)
  karte.append(zeile)

  const teile = el('div', 'befehl-teile')
  const dl = el('dl')
  teile.append(dl)

  let ausgabe = null
  if (def.ausgabe) {
    ausgabe = el('div', 'befehl-ausgabe')
    karte.append(teile, ausgabe)
  } else {
    karte.append(teile)
  }

  const zeichne = () => {
    const os = mehrere ? (varianten[aktuellesOs()] ? aktuellesOs() : Object.keys(varianten)[0]) : 'alle'
    const v = varianten[os]
    pre.textContent = v.befehl
    promptSpan.textContent = mehrere ? OS_PROMPT[os] : (def.prompt || '$')
    dl.replaceChildren()
    const liste = v.teile || def.teile || []
    for (const t of liste) {
      dl.append(el('dt', null, t.was))
      dl.append(zwei(el('dd'), t.bedeutet))
    }
    teile.hidden = !liste.length
    if (ausgabe) ausgabe.textContent = typeof def.ausgabe === 'string' ? def.ausgabe : (def.ausgabe[os] || def.ausgabe.alle || '')
    knopf.onclick = () => kopiere(v.befehl, null)
  }
  zeichne()
  document.addEventListener('pitm:os', zeichne)
  document.addEventListener('pitm:sprache', zeichne)

  ziel.replaceChildren(karte)
}

/* ======================================================= Terminalnachbildung */

/**
 * Baut eine Konsole. Ohne `auftrag` ist sie ein Spielplatz, mit `auftrag`
 * eine Uebung: Jeder Schritt hat eine Bedingung, die entweder auf die
 * eingegebene Zeile passt oder den Zustand der Welt prueft.
 */
function baueTerminal (ziel, opt = {}) {
  const fest = opt.os || null
  const welt = neueWelt(fest || aktuellesOs())

  const kasten = el('div', 'terminal')

  const kopf = el('div', 'terminal-kopf')
  const ampel = el('span', 'ampel')
  ampel.append(el('i'), el('i'), el('i'))
  const shell = el('span', 'shell')
  kopf.append(ampel, shell, el('span', 'spacer'))

  const btnLeeren = zwei(el('button', 'btn-mini'), T.terminalLeeren)
  const btnZurueck = zwei(el('button', 'btn-mini'), T.terminalZuruck)
  btnLeeren.type = btnZurueck.type = 'button'
  kopf.append(btnLeeren, btnZurueck)
  kasten.append(kopf)

  const schirm = el('div', 'terminal-schirm')
  schirm.setAttribute('role', 'log')
  schirm.setAttribute('aria-live', 'polite')
  kasten.append(schirm)

  const eingabeZeile = el('div', 'terminal-eingabe')
  const promptSpan = el('span', 'prompt')
  const eingabe = document.createElement('input')
  eingabe.type = 'text'
  eingabe.spellcheck = false
  eingabe.autocapitalize = 'off'
  eingabe.autocomplete = 'off'
  eingabe.setAttribute('aria-label', 'Terminal')
  zwei(eingabe, T.eingabeHier, 'placeholder')
  eingabeZeile.append(promptSpan, eingabe)
  kasten.append(eingabeZeile)

  let auftragKasten = null
  let schritte = []
  if (opt.schritte && opt.schritte.length) {
    schritte = opt.schritte.map(s => ({ ...s, fertig: false }))
    auftragKasten = el('div', 'terminal-auftrag')
    kasten.append(auftragKasten)
  }

  ziel.replaceChildren(kasten)

  /* -- Ausgabe ------------------------------------------------------------ */

  const schreibe = (art, text) => {
    const z = el('div', art, text)
    schirm.append(z)
    schirm.scrollTop = schirm.scrollHeight
  }

  const zeichneKopf = () => {
    shell.textContent = `${OS_NAMEN[welt.os]} — ${pfadText(welt)}`
    promptSpan.textContent = prompt(welt)
  }

  const zeichneAuftrag = () => {
    if (!auftragKasten) return
    auftragKasten.replaceChildren()
    const kopfz = el('div')
    kopfz.append(el('strong', null, txt(T.auftrag) + ': '))
    kopfz.append(document.createTextNode(
      `${schritte.filter(s => s.fertig).length} / ${schritte.length}`))
    auftragKasten.append(kopfz)
    const ol = el('ol')
    for (const s of schritte) {
      const li = el('li', s.fertig ? 'erledigt' : null, txt(s.text))
      ol.append(li)
    }
    auftragKasten.append(ol)
    if (schritte.every(s => s.fertig)) {
      auftragKasten.append(el('div', 'gut', txt(T.allesErledigt)))
    }
  }

  /* -- Zustandspruefung --------------------------------------------------- */

  /**
   * Prueft eine deklarative Bedingung gegen die Welt. Absichtlich klein
   * gehalten: Es geht darum, ob ein Ziel erreicht ist, nicht darum, auf
   * welchem Weg.
   */
  const zustandPasst = (z) => {
    if (!z) return true
    if (z.pfad != null && welt.pfad.join('/') !== z.pfad) return false
    if (z.datei) {
      const teile = z.datei.split('/')
      let k = welt.wurzel
      for (const t of teile) {
        if (!k || k.typ !== 'ordner' || !k.kinder[t]) return false
        k = k.kinder[t]
      }
      if (z.dateiTyp && k.typ !== z.dateiTyp) return false
    }
    if (z.gitRepo && !welt.git) return false
    const zweig = welt.git ? welt.git.zweige[welt.git.zweig] : null
    if (z.gitCommits != null && (zweig?.commits.length || 0) < z.gitCommits) return false
    if (z.gitZweig && welt.git?.zweig !== z.gitZweig) return false
    if (z.gitIndexLeer && welt.git && welt.git.index.length) return false
    if (z.gitIndexGefuellt && !(welt.git && welt.git.index.length)) return false
    if (z.gitVeroeffentlicht && (!zweig || !zweig.commits.length || zweig.gepusht < zweig.commits.length)) return false
    if (z.containerLaeuft && !welt.docker.container.some(c => c.name === z.containerLaeuft && c.laeuft)) return false
    if (z.containerWeg && welt.docker.container.some(c => c.name === z.containerWeg)) return false
    if (z.volumen && !welt.docker.volumen.includes(z.volumen)) return false
    if (z.abbild && !welt.docker.abbilder.some(a => a.voll === z.abbild || a.name === z.abbild)) return false
    if (z.portGebunden && !welt.docker.container.some(c => c.laeuft && c.port === z.portGebunden)) return false
    if (z.umgebung && !welt.docker.container.some(c =>
      (c.umgebung || []).some(e => e.startsWith(z.umgebung)))) return false
    if (z.bandAn && !welt.docker.container.some(c =>
      (c.baender || []).some(b => b.startsWith(z.bandAn + ':')))) return false
    return true
  }

  const pruefeSchritte = (zeile) => {
    let etwasNeu = false
    for (const s of schritte) {
      if (s.fertig) continue
      const musterPasst = !s.muster || new RegExp(s.muster).test(zeile)
      if (musterPasst && zustandPasst(s.zustand)) { s.fertig = true; etwasNeu = true }
    }
    if (etwasNeu) zeichneAuftrag()
    if (schritte.length && schritte.every(s => s.fertig) && opt.beiFertig) opt.beiFertig()
  }

  /* -- Eingabe ------------------------------------------------------------ */

  const verarbeite = (roh) => {
    schreibe('eingabe-zeile', `${prompt(welt)} ${roh}`)
    const r = fuehreAus(welt, roh)
    if (r.leeren) schirm.replaceChildren()
    for (const z of r.zeilen) schreibe(z.art === 'fehler' ? 'fehler' : 'aus', z.text)
    if (r.hinweis && TERMINAL_HINWEISE[r.hinweis]) {
      schreibe('dim', '→ ' + txt(TERMINAL_HINWEISE[r.hinweis]))
    }
    zeichneKopf()
    pruefeSchritte(roh.trim())
  }

  eingabe.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const roh = eingabe.value
      eingabe.value = ''
      if (roh.trim()) verarbeite(roh)
      return
    }
    // Pfeil hoch/runter blaettert durch die Historie, wie in einer echten Shell.
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const h = welt.historie
      if (!h.length) return
      terminalZeiger += e.key === 'ArrowUp' ? -1 : 1
      terminalZeiger = Math.max(0, Math.min(h.length, terminalZeiger))
      eingabe.value = terminalZeiger === h.length ? '' : h[terminalZeiger]
    }
  })
  let terminalZeiger = 0
  eingabe.addEventListener('keyup', (e) => { if (e.key === 'Enter') terminalZeiger = welt.historie.length })

  kasten.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') eingabe.focus()
  })

  btnLeeren.addEventListener('click', () => schirm.replaceChildren())
  btnZurueck.addEventListener('click', () => {
    weltZuruecksetzen(welt)
    welt.os = fest || aktuellesOs()
    schirm.replaceChildren()
    schritte.forEach(s => { s.fertig = false })
    zeichneKopf(); zeichneAuftrag(); begruessung()
  })

  if (!fest) {
    document.addEventListener('pitm:os', () => {
      welt.os = aktuellesOs()
      zeichneKopf()
      schreibe('dim', '→ ' + (aktuelleSprache() === 'de'
        ? `Shell gewechselt: ${OS_NAMEN[welt.os]}. Der Dateibaum bleibt.`
        : `Shell changed: ${OS_NAMEN[welt.os]}. The file tree stays.`))
    })
  }
  document.addEventListener('pitm:sprache', zeichneAuftrag)

  const begruessung = () => {
    if (opt.begruessung) {
      for (const zeile of opt.begruessung) schreibe('dim', txt(zeile))
    }
  }

  zeichneKopf()
  zeichneAuftrag()
  begruessung()

  return { welt, verarbeite, schritte }
}

/* ================================================================ Datenbank */

let dbVersprechen = null

async function ladePGlite () {
  try {
    return (await import('./pglite/index.js')).PGlite
  } catch (e) {
    console.warn('Lokale PGlite-Fassung nicht ladbar, weiche auf jsDelivr aus.', e)
    return (await import('https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.5/dist/index.js')).PGlite
  }
}

async function holeDb () {
  if (!dbVersprechen) {
    dbVersprechen = (async () => {
      const PGlite = await ladePGlite()
      return PGlite.create()
    })()
  }
  return dbVersprechen
}

let saatText = null
async function holeSaat () {
  if (saatText == null) {
    const r = await fetch(url('data/velocity.sql'))
    if (!r.ok) throw new Error('data/velocity.sql: ' + r.status)
    saatText = await r.text()
  }
  return saatText
}

async function saeen (db) {
  await db.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;')
  await db.exec(await holeSaat())
}

/** Baut eine Ergebnistabelle. Zahlen rechtsbuendig, NULL erkennbar. */
function ergebnisTabelle (res, maxZeilen = 200) {
  const wrap = el('div', 'result-table')
  const tab = el('table')
  const thead = el('thead')
  const kopf = el('tr')
  for (const f of res.fields) kopf.append(el('th', null, f.name))
  thead.append(kopf); tab.append(thead)
  const tbody = el('tbody')
  for (const zeile of res.rows.slice(0, maxZeilen)) {
    const tr = el('tr')
    for (const wert of Object.values(zeile)) {
      const td = el('td')
      if (wert === null || wert === undefined) { td.className = 'null'; td.textContent = 'NULL' }
      else if (wert instanceof Date) td.textContent = wert.toISOString().slice(0, 10)
      else if (typeof wert === 'object') td.textContent = JSON.stringify(wert)
      else {
        const s = String(wert)
        if (typeof wert === 'number' || typeof wert === 'bigint' || /^-?\d+(\.\d+)?$/.test(s)) td.className = 'num'
        td.textContent = s
      }
      tr.append(td)
    }
    tbody.append(tr)
  }
  tab.append(tbody); wrap.append(tab)
  return wrap
}

/** Vergleicht zwei Ergebnisse zeilenweise; Reihenfolge nur, wenn gefordert. */
function gleich (a, b, sortiert) {
  const norm = (r) => r.rows.map(z => Object.values(z).map(v =>
    v === null || v === undefined ? '␀'
      : v instanceof Date ? v.toISOString().slice(0, 10)
        : typeof v === 'number' ? Number(v).toFixed(4)
          : /^-?\d+(\.\d+)?$/.test(String(v)) ? Number(v).toFixed(4)
            : String(v).trim()).join(''))
  let x = norm(a); let y = norm(b)
  if (!sortiert) { x = [...x].sort(); y = [...y].sort() }
  return x.length === y.length && x.every((v, i) => v === y[i])
}

function baueDbBand (ziel) {
  const band = el('div', 'db-status busy')
  band.append(el('span', 'dot'))
  const text = el('span', null, txt(T.dbLaden))
  band.append(text, el('span', 'spacer'))
  const btn = zwei(el('button', 'btn-sm'), T.dbZuruck)
  btn.type = 'button'
  btn.disabled = true
  band.append(btn)
  ziel.append(band)

  const setzen = async () => {
    band.className = 'db-status busy'
    text.textContent = txt(T.dbLaden)
    btn.disabled = true
    try {
      const db = await holeDb()
      await saeen(db)
      band.className = 'db-status ready'
      text.textContent = txt(T.dbBereit)
      btn.disabled = false
      document.dispatchEvent(new CustomEvent('pitm:datenbank'))
    } catch (e) {
      band.className = 'db-status failed'
      text.textContent = txt(T.dbFehler) + ' ' + e.message
    }
  }
  btn.addEventListener('click', setzen)
  document.addEventListener('pitm:sprache', () => {
    if (band.classList.contains('ready')) text.textContent = txt(T.dbBereit)
  })
  return setzen()
}

/* ============================================================== Uebungsboxen */

function status (ziel, art, ueberschrift, detail) {
  ziel.replaceChildren()
  const zeile = el('div', 'line ' + art)
  zeile.append(el('strong', null, ueberschrift))
  if (detail) {
    const p = el('pre'); p.textContent = detail; zeile.append(p)
  }
  ziel.append(zeile)
  return zeile
}

/** Fragenblock fuer den Typ `quiz`. Wird von zwei Bauformen genutzt. */
function baueFragen (fragen, ziel, uebungId) {
  const zustand = []
  fragen.forEach((f, i) => {
    const block = el('div', 'frage')
    block.append(html('p', null, txt(f.frage)))
    const mehrfach = !!f.mehrfach
    const eintraege = []
    f.optionen.forEach((o, j) => {
      const lab = el('label')
      const inp = document.createElement('input')
      inp.type = mehrfach ? 'checkbox' : 'radio'
      inp.name = `${uebungId}-f${i}`
      inp.value = String(j)
      const span = zwei(el('span'), o)
      lab.append(inp, span)
      block.append(lab)
      eintraege.push({ lab, inp, j })
    })
    const erk = el('div', 'erklaerung')
    erk.hidden = true
    block.append(erk)
    ziel.append(block)
    zustand.push({ f, eintraege, erk, mehrfach })
  })

  return {
    beantwortet: () => zustand.every(z => z.eintraege.some(e => e.inp.checked)),
    pruefe: () => {
      let alleRichtig = true
      for (const z of zustand) {
        const gewaehlt = z.eintraege.filter(e => e.inp.checked).map(e => e.j).sort()
        const richtig = [...z.f.richtig].sort()
        const passt = gewaehlt.length === richtig.length && gewaehlt.every((v, i) => v === richtig[i])
        if (!passt) alleRichtig = false
        for (const e of z.eintraege) {
          e.lab.classList.remove('richtig', 'falsch')
          if (richtig.includes(e.j)) e.lab.classList.add('richtig')
          else if (e.inp.checked) e.lab.classList.add('falsch')
        }
        if (z.f.erklaerung) { z.erk.hidden = false; z.erk.innerHTML = txt(z.f.erklaerung) }
      }
      return alleRichtig
    }
  }
}

function baueBox (uebung, ctx) {
  const box = el('section', 'uebung')
  box.id = 'uebung-' + uebung.id

  const kopf = el('div', 'uebung-kopf')
  kopf.append(el('span', 'uebung-id', uebung.id))
  kopf.append(zwei(el('span', 'uebung-typ'), T.typ[uebung.typ] || ''))
  kopf.append(zwei(el('span', 'uebung-titel'), uebung.titel))
  kopf.append(el('span', 'spacer'))
  const haken = zwei(el('span', 'badge'), T.ok)
  haken.hidden = !ctx.fortschritt[uebung.id]
  kopf.append(haken)
  box.append(kopf)

  const koerper = el('div', 'uebung-koerper')
  const aufgabe = el('div', 'uebung-aufgabe')
  const zeichneAufgabe = () => { aufgabe.innerHTML = txt(uebung.aufgabe) }
  zeichneAufgabe()
  document.addEventListener('pitm:sprache', zeichneAufgabe)
  koerper.append(aufgabe)
  box.append(koerper)

  const erledigt = () => {
    haken.hidden = false
    merkeFortschritt(ctx.lab, uebung.id)
  }

  const meldung = el('div', 'uebung-status')

  /* ---------------------------------------------------------------- quiz */
  if (uebung.typ === 'quiz') {
    const fragenZiel = el('div')
    koerper.append(fragenZiel)
    const fragen = baueFragen(uebung.fragen, fragenZiel, uebung.id)
    const aktionen = el('div', 'uebung-aktionen')
    const btn = zwei(el('button', 'btn-sm primary'), T.pruefen)
    btn.type = 'button'
    aktionen.append(btn)
    koerper.append(aktionen, meldung)
    btn.addEventListener('click', () => {
      if (!fragen.beantwortet()) { status(meldung, 'note', txt(T.fragenOffen)); return }
      if (fragen.pruefe()) {
        status(meldung, 'ok', txt(T.richtig), uebung.rueckmeldung ? txt(uebung.rueckmeldung) : null)
        erledigt()
      } else {
        status(meldung, 'fail', txt(T.nochNicht))
      }
    })
  }

  /* ------------------------------------------------------------ zuordnen */
  if (uebung.typ === 'zuordnen') {
    const gitter = el('div', 'zuordnen')
    const felder = []
    for (const p of uebung.paare) {
      const zeile = el('div', 'paar')
      zeile.append(zwei(el('span', 'begriff'), p.begriff))
      const sel = document.createElement('select')
      const leer = el('option', null, txt(T.waehlen))
      leer.value = ''
      sel.append(leer)
      for (const z of uebung.ziele) {
        const o = el('option', null, txt(z.text))
        o.value = z.id
        sel.append(o)
      }
      sel.setAttribute('aria-label', txt(p.begriff))
      zeile.append(sel)
      gitter.append(zeile)
      felder.push({ p, sel, zeile })
    }
    koerper.append(gitter)
    const aktionen = el('div', 'uebung-aktionen')
    const btn = zwei(el('button', 'btn-sm primary'), T.pruefen)
    btn.type = 'button'
    aktionen.append(btn)
    koerper.append(aktionen, meldung)

    document.addEventListener('pitm:sprache', () => {
      for (const f of felder) {
        f.sel.options[0].textContent = txt(T.waehlen)
        uebung.ziele.forEach((z, i) => { f.sel.options[i + 1].textContent = txt(z.text) })
      }
    })

    btn.addEventListener('click', () => {
      if (felder.some(f => !f.sel.value)) { status(meldung, 'note', txt(T.alleZuordnen)); return }
      let alle = true
      for (const f of felder) {
        const passt = f.sel.value === f.p.ziel
        f.zeile.classList.toggle('richtig', passt)
        f.zeile.classList.toggle('falsch', !passt)
        if (!passt) alle = false
      }
      if (alle) {
        status(meldung, 'ok', txt(T.richtig), uebung.rueckmeldung ? txt(uebung.rueckmeldung) : null)
        erledigt()
      } else status(meldung, 'fail', txt(T.nochNicht))
    })
  }

  /* ---------------------------------------------------------- checkliste */
  if (uebung.typ === 'checkliste') {
    const liste = el('ul', 'checkliste')
    const kaesten = []
    uebung.schritte.forEach((s, i) => {
      const li = el('li')
      const inp = document.createElement('input')
      inp.type = 'checkbox'
      inp.id = `${uebung.id}-s${i}`
      const lab = document.createElement('label')
      lab.className = 'schritt-text'
      lab.htmlFor = inp.id
      const zeichne = () => { lab.innerHTML = txt(s.text) }
      zeichne()
      document.addEventListener('pitm:sprache', zeichne)
      li.append(el('span', 'schritt-nr', String(i + 1) + '.'), inp, lab)
      liste.append(li)
      kaesten.push({ inp, li })
    })
    koerper.append(liste, meldung)
    const pruefe = () => {
      for (const k of kaesten) k.li.classList.toggle('ab', k.inp.checked)
      if (kaesten.every(k => k.inp.checked)) {
        status(meldung, 'ok', txt(T.richtig), uebung.rueckmeldung ? txt(uebung.rueckmeldung) : null)
        erledigt()
      }
    }
    for (const k of kaesten) k.inp.addEventListener('change', pruefe)
  }

  /* ------------------------------------------------------------ terminal */
  if (uebung.typ === 'terminal') {
    const halter = el('div')
    koerper.append(halter, meldung)
    baueTerminal(halter, {
      os: uebung.os && uebung.os !== 'alle' ? uebung.os : null,
      schritte: uebung.schritte,
      begruessung: uebung.begruessung,
      beiFertig: () => {
        status(meldung, 'ok', txt(T.richtig), uebung.rueckmeldung ? txt(uebung.rueckmeldung) : null)
        erledigt()
      }
    })
  }

  /* ----------------------------------------------------------------- sql */
  if (uebung.typ === 'sql') {
    const eingabe = document.createElement('textarea')
    eingabe.spellcheck = false
    eingabe.value = uebung.start || ''
    eingabe.setAttribute('aria-label', txt(uebung.titel))
    koerper.append(eingabe)

    const aktionen = el('div', 'uebung-aktionen')
    const btnRun = zwei(el('button', 'btn-sm'), T.ausfuehren)
    const btnCheck = zwei(el('button', 'btn-sm primary'), T.pruefen)
    btnRun.type = btnCheck.type = 'button'
    btnRun.append(el('kbd', null, navigator.platform.includes('Mac') ? '⌘⏎' : 'Strg+⏎'))
    aktionen.append(btnRun, btnCheck, el('span', 'spacer'))
    const btnLeeren = zwei(el('button', 'btn-sm'), T.leeren)
    btnLeeren.type = 'button'
    aktionen.append(btnLeeren)
    koerper.append(aktionen, meldung)

    if (uebung.hinweis) {
      const d = el('details')
      d.append(zwei(el('summary'), T.hinweis))
      const inh = el('div', 'tip-box')
      const zeichne = () => { inh.innerHTML = txt(uebung.hinweis) }
      zeichne(); document.addEventListener('pitm:sprache', zeichne)
      d.append(inh)
      koerper.append(d)
    }
    if (uebung.loesung) {
      const d = el('details')
      d.append(zwei(el('summary'), T.loesung))
      d.append(el('pre', 'code-block', uebung.loesung))
      const akt = el('div', 'uebung-aktionen')
      const bk = zwei(el('button', 'btn-sm'), T.kopieren)
      const bu = zwei(el('button', 'btn-sm'), T.uebernehmen)
      bk.type = bu.type = 'button'
      const echo = el('span', 'hinweis-klein')
      akt.append(bk, bu, echo)
      bk.addEventListener('click', () => kopiere(uebung.loesung, echo))
      bu.addEventListener('click', () => { eingabe.value = uebung.loesung; eingabe.focus() })
      d.append(akt)
      koerper.append(d)
    }

    const zeigeErgebnis = (art, kopfText, res, detail) => {
      const zeile = status(meldung, art, kopfText, detail)
      if (res && res.fields && res.fields.length) {
        meldung.append(el('div', 'result-meta',
          menge(res.rows.length, M.zeile) + (res.rows.length > 200 ? ` (200 ${txt(T.angezeigt)})` : '')))
        if (res.rows.length) meldung.append(ergebnisTabelle(res))
      }
      return zeile
    }

    const fuehre = async (db, sql) => {
      if (!/;\s*\S/.test(sql)) return await db.query(sql)
      const teile = await db.exec(sql)
      return [...teile].reverse().find(t => t.fields && t.fields.length) || teile[teile.length - 1] || { fields: [], rows: [] }
    }

    const sperren = (an) => { btnRun.disabled = btnCheck.disabled = an }

    btnRun.addEventListener('click', async () => {
      const sql = eingabe.value.trim()
      if (!sql) { status(meldung, 'note', txt(T.leer)); return }
      sperren(true); status(meldung, 'note', txt(T.dbLaden))
      try {
        const db = await holeDb()
        const res = await fuehre(db, sql)
        if (res.fields && res.fields.length) zeigeErgebnis('note', txt(T.ergebnis), res)
        else status(meldung, 'note', txt(T.ausgefuehrt))
      } catch (e) {
        status(meldung, 'fail', txt(T.fehlerSql), e.message)
      } finally { sperren(false) }
    })

    eingabe.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); btnRun.click() }
    })

    btnCheck.addEventListener('click', async () => {
      const sql = eingabe.value.trim()
      if (!sql) { status(meldung, 'note', txt(T.leer)); return }
      sperren(true); status(meldung, 'note', txt(T.dbLaden))
      try {
        const db = await holeDb()
        await saeen(db)
        const meins = await fuehre(db, sql)
        await saeen(db)
        const soll = await fuehre(db, uebung.loesung)
        const spaltenGleich = meins.fields.length === soll.fields.length
        if (!spaltenGleich) {
          zeigeErgebnis('fail', txt(T.nochNicht), meins, txt(T.spaltenFalsch))
        } else if (gleich(meins, soll, !!uebung.sortiert)) {
          zeigeErgebnis('ok', txt(T.richtig), meins, uebung.rueckmeldung ? txt(uebung.rueckmeldung) : null)
          erledigt()
        } else {
          zeigeErgebnis('fail', txt(T.nochNicht), meins, txt(T.zeilenFalsch))
        }
      } catch (e) {
        status(meldung, 'fail', txt(T.fehlerSql), e.message)
      } finally { sperren(false) }
    })

    btnLeeren.addEventListener('click', () => {
      eingabe.value = uebung.start || ''
      meldung.replaceChildren()
      eingabe.focus()
    })
  }

  return box
}

/* ========================================================= Seitenbausteine */

/** Setzt den Seitentitel bei Sprachwechsel um. */
function initTitel () {
  const en = document.querySelector('meta[name="pitm:titel-en"]')?.content
  const de = document.title
  if (!en) return
  const setze = () => { document.title = aktuelleSprache() === 'en' ? en : de }
  setze()
  document.addEventListener('pitm:sprache', setze)
}

/** Einordnung im Lab-Kopf: Voraussetzung, Umfang, Zeit, Kompetenzziel. */
function baueEinordnung (labId) {
  const ziel = document.querySelector('[data-einordnung]')
  if (!ziel) return
  const l = labVon(labId)
  if (!l) return
  const dl = el('dl', 'lab-einordnung')
  const paar = (schluessel, wert) => {
    dl.append(zwei(el('dt'), schluessel))
    dl.append(zwei(el('dd'), wert))
  }
  paar(T.voraussetzung, l.voraussetzung || T.keine)
  paar(T.umfang, { de: `${l.uebungen} Übungen`, en: `${l.uebungen} exercises` })
  paar(T.zeitrahmen, l.zeit)
  paar(T.ziel, l.ziel)
  ziel.replaceChildren(dl)
}

/** Hebt den Abschnitt hervor, der gerade gelesen wird. */
function initSeitennavigation () {
  const links = [...document.querySelectorAll('.sidebar-link[href^="#"]')]
  if (!links.length) return
  const abschnitte = links
    .map(a => ({ a, el: document.getElementById(a.getAttribute('href').slice(1)) }))
    .filter(x => x.el)
  const beob = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) {
      if (!e.isIntersecting) continue
      for (const x of abschnitte) x.a.classList.toggle('active', x.el === e.target)
    }
  }, { rootMargin: '-76px 0px -70% 0px' })
  for (const x of abschnitte) beob.observe(x.el)
}

/** Vor- und Zurueck-Navigation am Fuss der Lab-Seiten. */
function baueLabNavigation (labId) {
  const ziel = document.querySelector('[data-lab-nav]')
  if (!ziel) return
  const i = LABS.findIndex(l => l.id === labId)
  const zeile = el('div', 'nav-bottom')
  const machen = (l, richtung) => {
    const a = el('a', 'btn')
    a.href = l.datei
    a.setAttribute('data-lab-link', '')
    zwei(a, {
      de: `${richtung === 'vor' ? '→ Weiter mit' : '← Zurück zu'} Lab ${l.nr}: ${l.titel.de}`,
      en: `${richtung === 'vor' ? '→ Continue with' : '← Back to'} lab ${l.nr}: ${l.titel.en}`
    })
    return a
  }
  if (i > 0) zeile.append(machen(LABS[i - 1], 'zurueck')); else zeile.append(el('span'))
  if (i < LABS.length - 1) zeile.append(machen(LABS[i + 1], 'vor')); else zeile.append(el('span'))
  ziel.replaceChildren(zeile)
  if (aktuelleSprache() === 'en') {
    ziel.querySelectorAll('a[data-lab-link]').forEach(a => { a.href = a.getAttribute('href').split('?')[0] + '?lang=en' })
  }
}

/** Fortschrittskarte: auf der Startseite ueber alle Labs, im Lab ueber eines. */
function karteFortschritt (nurLab = null) {
  const ziel = document.querySelector('[data-fortschritt]')
  if (!ziel) return
  const zeichne = () => {
    const labs = nurLab ? LABS.filter(l => l.id === nurLab) : LABS
    const geloest = labs.reduce((s, l) => s + Math.min(Object.keys(ladeFortschritt(l.id)).length, l.uebungen), 0)
    const gesamt = labs.reduce((s, l) => s + l.uebungen, 0)

    const karte = el('div', 'fortschritt')
    const kopf = el('div', 'fortschritt-kopf')
    kopf.append(zwei(el('span', 'titel'), T.stand))
    kopf.append(el('span', 'zahl', `${geloest} / ${gesamt} ${txt(T.geloest)}`))
    karte.append(kopf)

    const balken = el('div', 'balken')
    const fuellung = el('i')
    fuellung.style.width = gesamt ? `${Math.round(geloest / gesamt * 100)}%` : '0%'
    balken.append(fuellung)
    balken.setAttribute('role', 'progressbar')
    balken.setAttribute('aria-valuenow', String(geloest))
    balken.setAttribute('aria-valuemin', '0')
    balken.setAttribute('aria-valuemax', String(gesamt))
    karte.append(balken)

    if (!nurLab) {
      const ul = el('ul', 'fortschritt-liste')
      for (const l of LABS) {
        const n = Math.min(Object.keys(ladeFortschritt(l.id)).length, l.uebungen)
        const li = el('li', n === l.uebungen ? 'voll' : null)
        li.append(el('span', 'nr', l.nr))
        const a = el('a', 'name')
        a.href = l.datei
        a.setAttribute('data-lab-link', '')
        zwei(a, l.titel)
        li.append(a)
        li.append(el('span', 'stand', `${n} / ${l.uebungen}`))
        ul.append(li)
      }
      karte.append(ul)

      const akt = el('div', 'uebung-aktionen')
      const btn = zwei(el('button', 'btn-sm gefahr'), T.loeschen)
      btn.type = 'button'
      btn.disabled = geloest === 0
      const echo = el('span', 'hinweis-klein')
      akt.append(btn, echo)
      btn.addEventListener('click', () => {
        if (!confirm(txt(T.loeschenFrage))) return
        loescheFortschritt()
        echo.textContent = txt(T.geloescht)
      })
      karte.append(akt)
    } else if (geloest === gesamt && gesamt) {
      karte.append(el('p', 'hinweis-klein', txt(T.allesGeloest)))
    }

    ziel.replaceChildren(karte)
    if (aktuelleSprache() === 'en') {
      ziel.querySelectorAll('a[data-lab-link]').forEach(a => { a.href = a.getAttribute('href').split('?')[0] + '?lang=en' })
    }
  }
  zeichne()
  document.addEventListener('pitm:fortschritt', zeichne)
  document.addEventListener('pitm:sprache', zeichne)
}

/* ================================================================= Einstieg */

async function starteLab (labId) {
  const antwort = await fetch(url(`data/uebungen/${labId}.json`))
  if (!antwort.ok) throw new Error(`data/uebungen/${labId}.json: ${antwort.status}`)
  const daten = await antwort.json()

  // Befehlskarten
  for (const halter of document.querySelectorAll('[data-befehl]')) {
    const def = daten.befehle?.[halter.dataset.befehl]
    if (def) baueBefehl(halter, def)
    else halter.append(el('p', 'hinweis-klein', `Befehlskarte ${halter.dataset.befehl} fehlt.`))
  }

  // Freie Konsolen
  for (const halter of document.querySelectorAll('[data-terminal]')) {
    const schluessel = halter.dataset.terminal
    const def = schluessel ? daten.konsolen?.[schluessel] : null
    baueTerminal(halter, {
      os: halter.dataset.os || null,
      begruessung: def?.begruessung || [{
        de: 'Freie Konsole. Nichts hier richtet Schaden an – probieren Sie ruhig aus, was ein Befehl tut.',
        en: 'Free console. Nothing here does any damage – go ahead and try what a command does.'
      }]
    })
  }

  // Datenbankband, falls die Seite SQL enthaelt
  const dbHalter = document.querySelector('[data-datenbank]')
  if (dbHalter) baueDbBand(dbHalter)

  // Freie SQL-Konsole: dieselbe Bauform, aber ohne Pruefknopf und ohne
  // Fortschrittseintrag - hier gibt es keine richtige Antwort.
  for (const halter of document.querySelectorAll('[data-sql-konsole]')) {
    const box = baueBox({
      id: 'frei', typ: 'sql',
      titel: { de: 'Freie Abfrage', en: 'Free query' },
      aufgabe: {
        de: '<p>Schreiben Sie eine beliebige Abfrage gegen die Beispieldatenbank. Nichts hier wirkt über diesen Browser hinaus.</p>',
        en: '<p>Write any query against the sample database. Nothing here has any effect beyond this browser.</p>'
      },
      start: halter.dataset.start || 'SELECT * FROM station ORDER BY station_id;'
    }, { lab: labId, fortschritt: {} })
    box.querySelector('.uebung-kopf').remove()
    box.querySelectorAll('.btn-sm.primary').forEach(b => b.remove())
    box.className = 'sql-konsole'
    halter.replaceChildren(box)
  }

  // Uebungen
  const fortschritt = ladeFortschritt(labId)
  const ctx = { lab: labId, fortschritt }
  for (const halter of document.querySelectorAll('[data-uebung]')) {
    const u = (daten.uebungen || []).find(x => x.id === halter.dataset.uebung)
    if (!u) { halter.append(el('p', 'hinweis-klein', `Übung ${halter.dataset.uebung} fehlt.`)); continue }
    halter.replaceChildren(baueBox(u, ctx))
  }

  baueEinordnung(labId)
  baueLabNavigation(labId)
  karteFortschritt(labId)
}

function start () {
  initSprache()
  initOs()
  initTitel()
  initSeitennavigation()

  const labId = document.body.dataset.lab
  if (labId) {
    starteLab(labId).catch(e => {
      console.error(e)
      for (const h of document.querySelectorAll('[data-uebung], [data-befehl]')) {
        h.append(el('p', 'hinweis-klein', 'Die Übungsdaten konnten nicht geladen werden: ' + e.message))
      }
    })
  } else {
    karteFortschritt(null)
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
else start()
