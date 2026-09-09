/**
 * PITM-Lab · Nachgebildete Kommandozeile
 *
 * Kein echter Rechner, sondern ein Modell davon: ein Dateibaum im
 * Arbeitsspeicher, ein Satz nachgebauter Befehle und Ausgaben, die den echten
 * nachempfunden sind. Der Zweck ist der Ablauf, nicht die Vollstaendigkeit -
 * wer hier `git commit` ohne vorheriges `git add` versucht, soll dieselbe
 * Zurueckweisung sehen wie draussen, ohne dass ein Rechner Schaden nimmt.
 *
 * Drei Schalen werden unterschieden, weil sich die Studierenden auf drei
 * verschiedenen Systemen anmelden:
 *
 *   mac  zsh unter macOS (und weitgehend deckungsgleich: bash unter Linux)
 *   win  Windows PowerShell
 *   cmd  Windows Eingabeaufforderung (cmd.exe)
 *
 * Die Werkzeugbefehle `git` und `docker` sind schalenunabhaengig - genau das
 * ist ihre Eigenschaft und soll auch so erfahrbar sein.
 *
 * Ausgaben der nachgebauten Werkzeuge bleiben englisch, weil die echten
 * Werkzeuge englisch antworten. Nur die Hinweise der Umgebung selbst sind
 * uebersetzt; sie erscheinen gedimmt und mit vorangestelltem Pfeil.
 */

/* ------------------------------------------------------------ Dateibaum */

const ordner = (kinder = {}) => ({ typ: 'ordner', kinder })
const datei = (inhalt = '') => ({ typ: 'datei', inhalt })

/** Tiefe Kopie, damit `Zuruecksetzen` wirklich den Ausgangszustand herstellt. */
const kopie = (k) => k.typ === 'datei'
  ? datei(k.inhalt)
  : ordner(Object.fromEntries(Object.entries(k.kinder).map(([n, v]) => [n, kopie(v)])))

/**
 * Standard-Heimatverzeichnis. Bewusst klein und wiedererkennbar: ein
 * Projektordner mit einem Notebook und zwei Datensaetzen, mehr braucht keine
 * der Uebungen.
 */
export const HEIMAT = () => ordner({
  Dokumente: ordner({
    'notizen.txt': datei('Termine Analytics-Projekt\nKickoff 14.10.\nZwischenstand 18.11.\n')
  }),
  Downloads: ordner({
    'fahrten_2026.csv': datei('fahrt_id;rad_id;start;ziel;dauer_min\n1;R-014;Juliuspromenade;Hauptbahnhof;9\n2;R-227;Residenz;Sanderring;6\n')
  }),
  velocity: ordner({
    'README.md': datei('# Velo City\nFallstudie zur Vorlesung PITM.\n'),
    analytics: ordner({
      '01_Regression_Fahrtdauer.ipynb': datei('{ "cells": [], "nbformat": 4 }'),
      'stationen.csv': datei('station_id;name;plaetze\n1;Juliuspromenade;18\n2;Hauptbahnhof;24\n')
    })
  })
})

/* ------------------------------------------------------------------ Welt */

const DOCKER_ABBILDER = {
  'hello-world':          { groesse: '20.4kB',  tag: 'latest' },
  'postgres':             { groesse: '438MB',   tag: '16' },
  'nginx':                { groesse: '192MB',   tag: '1.27' },
  'python':               { groesse: '124MB',   tag: '3.12-slim' },
  'adminer':              { groesse: '253MB',   tag: '5' },
  'ubuntu':               { groesse: '78.1MB',  tag: '24.04' },
  'n8nio/n8n':            { groesse: '612MB',   tag: 'latest' }
}

export function neueWelt (os = 'mac') {
  return {
    os,
    benutzer: 'studi',
    rechner: os === 'mac' ? 'macbook' : 'PC-BA',
    wurzel: HEIMAT(),
    pfad: [],                 // relativ zur Heimat
    git: null,                // wird durch `git init` oder `git clone` angelegt
    docker: { abbilder: [], container: [], volumen: [], compose: false, naechsteId: 0xa1 },
    historie: []
  }
}

export function zuruecksetzen (welt) {
  const frisch = neueWelt(welt.os)
  Object.assign(welt, frisch)
  return welt
}

/* --------------------------------------------------------------- Pfade */

const heimatText = (w) => w.os === 'mac' ? '~' : `C:\\Users\\${w.benutzer}`
const trenner = (w) => w.os === 'mac' ? '/' : '\\'

export function pfadText (w) {
  return w.pfad.length ? heimatText(w) + trenner(w) + w.pfad.join(trenner(w)) : heimatText(w)
}

export function prompt (w) {
  if (w.os === 'mac') {
    const kurz = w.pfad.length ? w.pfad[w.pfad.length - 1] : '~'
    return `${w.benutzer}@${w.rechner} ${kurz} %`
  }
  if (w.os === 'win') return `PS ${pfadText(w)}>`
  return `${pfadText(w)}>`
}

/** Loest einen eingegebenen Pfad gegen das aktuelle Verzeichnis auf. */
function loese (w, eingabe) {
  let teile
  const roh = String(eingabe).replace(/\\/g, '/')
  if (roh === '~' || roh.startsWith('~/')) teile = roh.slice(2).split('/')
  else if (/^[A-Za-z]:\//.test(roh) || roh.startsWith('/')) {
    // Absolute Pfade fuehren in dieser Nachbildung ebenfalls in die Heimat.
    teile = roh.replace(/^[A-Za-z]:\//, '').replace(/^\//, '').split('/')
  } else teile = [...w.pfad, ...roh.split('/')]
  const aus = []
  for (const t of teile) {
    if (!t || t === '.') continue
    if (t === '..') { aus.pop(); continue }
    aus.push(t)
  }
  return aus
}

function knoten (w, teile) {
  let k = w.wurzel
  for (const t of teile) {
    if (k.typ !== 'ordner' || !k.kinder[t]) return null
    k = k.kinder[t]
  }
  return k
}

const elternteil = (w, teile) => knoten(w, teile.slice(0, -1))
const name = (teile) => teile[teile.length - 1]

/* ------------------------------------------------------- Zerlegung Eingabe */

/** Zerlegt eine Zeile in Wortmarken und achtet dabei auf Anfuehrungszeichen. */
export function zerlege (zeile) {
  const aus = []
  let m = '', q = null
  for (const z of zeile) {
    if (q) { if (z === q) q = null; else m += z; continue }
    if (z === '"' || z === "'") { q = z; continue }
    if (/\s/.test(z)) { if (m) { aus.push(m); m = '' } continue }
    m += z
  }
  if (m) aus.push(m)
  return aus
}

/* -------------------------------------------------------------- Antworten */

const ok = (zeilen = []) => ({ zeilen: zeilen.map(z => ({ art: 'aus', text: z })) })
const fehler = (zeilen, hinweis) => ({
  zeilen: zeilen.map(z => ({ art: 'fehler', text: z })),
  hinweis
})
const gemischt = (zeilen) => ({ zeilen })

/* =========================================================== POSIX-Schale */

function posix (w, marken, roh) {
  const [befehl, ...arg] = marken
  const opt = arg.filter(a => a.startsWith('-'))
  const rest = arg.filter(a => !a.startsWith('-'))
  const hat = (b) => opt.some(o => o.includes(b))

  switch (befehl) {
    case 'pwd':
      return ok([pfadText(w)])

    case 'ls': {
      const ziel = rest[0] ? loese(w, rest[0]) : w.pfad
      const k = knoten(w, ziel)
      if (!k) return fehler([`ls: ${rest[0]}: No such file or directory`])
      if (k.typ === 'datei') return ok([rest[0]])
      let namen = Object.keys(k.kinder).sort((a, b) => a.localeCompare(b))
      if (!hat('a')) namen = namen.filter(n => !n.startsWith('.'))
      if (!namen.length) return ok([])
      if (hat('l')) {
        return ok(namen.map(n => {
          const kk = k.kinder[n]
          const art = kk.typ === 'ordner' ? 'drwxr-xr-x' : '-rw-r--r--'
          const gr = kk.typ === 'ordner' ? 128 : kk.inhalt.length
          return `${art}  1 ${w.benutzer}  staff  ${String(gr).padStart(6)}  ${n}${kk.typ === 'ordner' ? '/' : ''}`
        }))
      }
      return ok([namen.map(n => k.kinder[n].typ === 'ordner' ? n + '/' : n).join('   ')])
    }

    case 'cd': {
      if (!rest.length || rest[0] === '~') { w.pfad = []; return ok([]) }
      const ziel = loese(w, rest[0])
      const k = knoten(w, ziel)
      if (!k) return fehler([`cd: no such file or directory: ${rest[0]}`])
      if (k.typ !== 'ordner') return fehler([`cd: not a directory: ${rest[0]}`])
      w.pfad = ziel
      return ok([])
    }

    case 'mkdir': {
      if (!rest.length) return fehler(['usage: mkdir [-p] directory ...'])
      for (const r of rest) {
        const ziel = loese(w, r)
        if (hat('p')) {
          let k = w.wurzel
          for (const t of ziel) {
            if (!k.kinder[t]) k.kinder[t] = ordner()
            k = k.kinder[t]
          }
        } else {
          const e = elternteil(w, ziel)
          if (!e || e.typ !== 'ordner') return fehler([`mkdir: ${r}: No such file or directory`])
          if (e.kinder[name(ziel)]) return fehler([`mkdir: ${r}: File exists`])
          e.kinder[name(ziel)] = ordner()
        }
      }
      return ok([])
    }

    case 'touch': {
      if (!rest.length) return fehler(['usage: touch file ...'])
      for (const r of rest) {
        const ziel = loese(w, r)
        const e = elternteil(w, ziel)
        if (!e || e.typ !== 'ordner') return fehler([`touch: ${r}: No such file or directory`])
        if (!e.kinder[name(ziel)]) e.kinder[name(ziel)] = datei('')
      }
      return ok([])
    }

    case 'cat': {
      if (!rest.length) return fehler(['usage: cat file ...'])
      const aus = []
      for (const r of rest) {
        const k = knoten(w, loese(w, r))
        if (!k) return fehler([`cat: ${r}: No such file or directory`])
        if (k.typ === 'ordner') return fehler([`cat: ${r}: Is a directory`])
        aus.push(...k.inhalt.replace(/\n$/, '').split('\n'))
      }
      return ok(aus)
    }

    case 'head': {
      const n = opt.includes('-n') ? 10 : Number((opt.find(o => /^-\d+$/.test(o)) || '-10').slice(1))
      const k = knoten(w, loese(w, rest[0] || ''))
      if (!k || k.typ !== 'datei') return fehler([`head: ${rest[0]}: No such file or directory`])
      return ok(k.inhalt.replace(/\n$/, '').split('\n').slice(0, n))
    }

    case 'echo': {
      // Umleitung mit > und >> wird unterstuetzt, weil sie der haeufigste
      // Weg ist, aus der Konsole heraus eine Datei anzulegen.
      const um = roh.match(/^echo\s+(.*?)\s*(>>?)\s*(\S+)\s*$/)
      if (um) {
        const text = zerlege(um[1]).join(' ')
        const ziel = loese(w, um[3])
        const e = elternteil(w, ziel)
        if (!e || e.typ !== 'ordner') return fehler([`zsh: no such file or directory: ${um[3]}`])
        const vorher = um[2] === '>>' && e.kinder[name(ziel)] ? e.kinder[name(ziel)].inhalt : ''
        e.kinder[name(ziel)] = datei(vorher + text + '\n')
        return ok([])
      }
      return ok([arg.join(' ')])
    }

    case 'rm': {
      if (!rest.length) return fehler(['usage: rm [-rf] file ...'])
      for (const r of rest) {
        const ziel = loese(w, r)
        const k = knoten(w, ziel)
        if (!k) return fehler([`rm: ${r}: No such file or directory`])
        if (k.typ === 'ordner' && !hat('r')) return fehler([`rm: ${r}: is a directory`])
        delete elternteil(w, ziel).kinder[name(ziel)]
      }
      return ok([])
    }

    case 'cp':
    case 'mv': {
      if (rest.length < 2) return fehler([`usage: ${befehl} source target`])
      const q = loese(w, rest[0]); const z = loese(w, rest[1])
      const kq = knoten(w, q)
      if (!kq) return fehler([`${befehl}: ${rest[0]}: No such file or directory`])
      const kz = knoten(w, z)
      const zielTeile = (kz && kz.typ === 'ordner') ? [...z, name(q)] : z
      const e = elternteil(w, zielTeile)
      if (!e || e.typ !== 'ordner') return fehler([`${befehl}: ${rest[1]}: No such file or directory`])
      e.kinder[name(zielTeile)] = kopie(kq)
      if (befehl === 'mv') delete elternteil(w, q).kinder[name(q)]
      return ok([])
    }

    case 'clear': return { zeilen: [], leeren: true }

    case 'open': return { zeilen: [], hinweis: 'oeffnenMac' }

    case 'which':
      return ok([`/usr/bin/${rest[0] || ''}`])

    case 'python3':
    case 'python':
      if (arg.includes('--version') || arg.includes('-V')) return ok(['Python 3.12.7'])
      return { zeilen: [], hinweis: 'python' }

    case 'pip':
    case 'pip3':
      if (rest[0] === 'install') {
        return ok([
          `Collecting ${rest[1] || 'paket'}`,
          `Successfully installed ${rest[1] || 'paket'}`
        ])
      }
      return ok(['Usage: pip <command> [options]'])

    case 'code': return { zeilen: [], hinweis: 'code' }

    case 'man': return { zeilen: [], hinweis: 'man' }

    case 'history':
      return ok(w.historie.map((h, i) => `  ${String(i + 1).padStart(3)}  ${h}`))

    case 'exit': return { zeilen: [], hinweis: 'exit' }

    default: return null
  }
}

/* ====================================================== PowerShell-Schale */

/**
 * PowerShell fuehrt fuer die gaengigen Unix-Befehle Aliase - genau das soll die
 * Uebung erfahrbar machen: `ls` funktioniert, `ls -la` aber nicht, weil
 * Get-ChildItem andere Parameter kennt.
 */
const PS_ALIAS = {
  'get-location': 'pwd', gl: 'pwd', pwd: 'pwd',
  'get-childitem': 'ls', gci: 'ls', dir: 'ls', ls: 'ls',
  'set-location': 'cd', sl: 'cd', chdir: 'cd', cd: 'cd',
  'get-content': 'cat', gc: 'cat', type: 'cat', cat: 'cat',
  'remove-item': 'rm', ri: 'rm', del: 'rm', erase: 'rm', rm: 'rm', rmdir: 'rm', rd: 'rm',
  'copy-item': 'cp', ci: 'cp', copy: 'cp', cp: 'cp',
  'move-item': 'mv', mi: 'mv', move: 'mv', mv: 'mv',
  'rename-item': 'mv', rni: 'mv', ren: 'mv',
  'clear-host': 'clear', cls: 'clear', clear: 'clear',
  'write-output': 'echo', 'write-host': 'echo', echo: 'echo',
  'new-item': 'new-item', ni: 'new-item',
  mkdir: 'mkdir', md: 'mkdir',
  'set-content': 'set-content', 'add-content': 'add-content'
}

/** Uebersetzt PowerShell-Parameter in die Kurzoptionen der Unix-Schalen. */
const PS_PARAM = {
  '-recurse': '-r', '-force': '-f', '-all': '-a', '-hidden': '-a', '-confirm': '-i'
}

/** Parameter, die einen Wert nach sich fuehren. */
const PS_WERT = ['-itemtype', '-path', '-value', '-destination', '-newname', '-totalcount', '-tail', '-encoding', '-first', '-last', '-literalpath']

function powershell (w, marken, roh) {
  const kopf = (marken[0] || '').toLowerCase()
  const abbildung = PS_ALIAS[kopf]
  const rohArg = marken.slice(1)

  const arg = []
  const werte = {}
  let wasIf = false
  for (let i = 0; i < rohArg.length; i++) {
    const a = rohArg[i]
    const klein = a.toLowerCase()
    if (PS_WERT.includes(klein)) { werte[klein] = rohArg[++i]; continue }
    if (klein === '-whatif') { wasIf = true; continue }
    if (PS_PARAM[klein]) { arg.push(PS_PARAM[klein]); continue }
    if (a.startsWith('-')) continue          // unbekannte Parameter still schlucken
    arg.push(a)
  }
  const pfade = arg.filter(a => !a.startsWith('-'))

  if (abbildung === 'new-item') {
    const typ = (werte['-itemtype'] || 'file').toLowerCase()
    const pfad = werte['-path'] || pfade[0]
    if (!pfad) return fehler(["New-Item: Cannot bind argument to parameter 'Path' because it is null."])
    const ziel = loese(w, pfad)
    let e = elternteil(w, ziel)
    if ((!e || e.typ !== 'ordner') && arg.includes('-f')) {
      let k = w.wurzel
      for (const t of ziel.slice(0, -1)) {
        if (!k.kinder[t]) k.kinder[t] = ordner()
        k = k.kinder[t]
      }
      e = k
    }
    if (!e || e.typ !== 'ordner') return fehler([`New-Item: Could not find a part of the path '${pfad}'.`])
    if (e.kinder[name(ziel)] && !arg.includes('-f')) {
      return fehler([`New-Item: The item '${pfad}' already exists.`])
    }
    e.kinder[name(ziel)] = typ === 'directory' ? ordner() : datei('')
    return ok([
      `    Verzeichnis: ${pfadText(w)}`, '',
      'Mode                 LastWriteTime         Length Name',
      '----                 -------------         ------ ----',
      `${typ === 'directory' ? 'd----' : '-a---'}         09.09.2026     08:15              0 ${name(ziel)}`
    ])
  }

  if (abbildung === 'set-content' || abbildung === 'add-content') {
    const pfad = werte['-path'] || pfade[0]
    const text = werte['-value'] ?? pfade[1] ?? ''
    if (!pfad) return fehler([`${marken[0]}: Cannot bind argument to parameter 'Path' because it is null.`])
    const ziel = loese(w, pfad)
    const e = elternteil(w, ziel)
    if (!e || e.typ !== 'ordner') return fehler([`${marken[0]}: Could not find a part of the path '${pfad}'.`])
    const vorher = abbildung === 'add-content' && e.kinder[name(ziel)] ? e.kinder[name(ziel)].inhalt : ''
    e.kinder[name(ziel)] = datei(vorher + text + '\n')
    return ok([])
  }

  if (abbildung === 'ls') {
    const zielPfad = werte['-path'] || pfade[0]
    const k = knoten(w, zielPfad ? loese(w, zielPfad) : w.pfad)
    if (!k) return fehler([`Get-ChildItem: Cannot find path '${zielPfad}' because it does not exist.`])
    if (k.typ !== 'ordner') return ok([zielPfad])
    const namen = Object.keys(k.kinder).sort((a, b) => a.localeCompare(b))
    return ok([
      `    Verzeichnis: ${zielPfad ? pfadText(w) + trenner(w) + zielPfad.replace(/\//g, '\\') : pfadText(w)}`, '',
      'Mode                 LastWriteTime         Length Name',
      '----                 -------------         ------ ----',
      ...namen.map(n => {
        const kk = k.kinder[n]
        const mode = kk.typ === 'ordner' ? 'd----' : '-a---'
        const len = kk.typ === 'ordner' ? '' : String(kk.inhalt.length)
        return `${mode}         09.09.2026     08:15 ${len.padStart(14)} ${n}`
      })
    ])
  }

  if (abbildung === 'cat') {
    const zielPfad = werte['-path'] || werte['-literalpath'] || pfade[0]
    const n = Number(werte['-totalcount'] || 0)
    const k = knoten(w, loese(w, zielPfad || ''))
    if (!k) return fehler([`Get-Content: Cannot find path '${zielPfad}' because it does not exist.`])
    if (k.typ === 'ordner') return fehler([`Get-Content: Access to the path '${zielPfad}' is denied.`])
    const zeilen = k.inhalt.replace(/\n$/, '').split('\n')
    if (werte['-tail']) return ok(zeilen.slice(-Number(werte['-tail'])))
    return ok(n ? zeilen.slice(0, n) : zeilen)
  }

  if (abbildung === 'mkdir') {
    // mkdir legt in PowerShell Zwischenordner ohnehin mit an.
    return posix(w, ['mkdir', '-p', ...pfade], 'mkdir -p ' + pfade.join(' '))
  }

  if (abbildung === 'rm' && wasIf) {
    return ok(pfade.map(p => `What if: Performing the operation "Remove Item" on target "${p}".`))
  }

  if (abbildung === 'cd') {
    return posix(w, ['cd', ...(werte['-path'] ? [werte['-path']] : pfade)], 'cd')
  }

  if (abbildung) {
    const neu = [abbildung, ...arg]
    const rohNeu = abbildung === 'echo' ? roh.replace(/^\S+/, 'echo') : neu.join(' ')
    return posix(w, neu, rohNeu)
  }

  if (kopf === 'get-command' || kopf === 'where.exe' || kopf === 'where') {
    return ok([`C:\\Program Files\\${marken[1] || ''}\\${marken[1] || ''}.exe`])
  }
  if (kopf === 'get-help') return { zeilen: [], hinweis: 'man' }
  if (kopf === '$profile') return ok([`C:\\Users\\${w.benutzer}\\Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1`])
  if (kopf === 'python' || kopf === 'python3' || kopf === 'py') return posix(w, ['python3', ...marken.slice(1)], roh)
  if (kopf === 'pip') return posix(w, marken, roh)
  if (kopf === 'code') return { zeilen: [], hinweis: 'code' }
  if (kopf === 'wsl' || kopf === 'bash') return { zeilen: [], hinweis: 'wsl' }
  if (kopf === 'exit') return { zeilen: [], hinweis: 'exit' }
  return null
}

/* ================================================ Eingabeaufforderung (cmd) */

function cmd (w, marken, roh) {
  const kopf = (marken[0] || '').toLowerCase()
  // Die Eingabeaufforderung schreibt Optionen mit Schraegstrich: /a, /s, /q.
  const schalter = marken.slice(1).filter(a => a.startsWith('/')).map(a => a.toLowerCase())
  const pfade = marken.slice(1).filter(a => !a.startsWith('/'))
  const hat = (b) => schalter.some(s => s.includes(b))

  const abb = {
    cd: 'cd', chdir: 'cd', dir: 'ls', md: 'mkdir', mkdir: 'mkdir',
    type: 'cat', del: 'rm', erase: 'rm', copy: 'cp', move: 'mv', ren: 'mv', rename: 'mv',
    cls: 'clear', echo: 'echo', rd: 'rm', rmdir: 'rm', more: 'cat'
  }[kopf]

  // `cd` ohne Gegenstand gibt in cmd den Pfad aus, statt nach Hause zu wechseln.
  if (abb === 'cd' && !pfade.length) return ok([pfadText(w)])

  if (abb === 'ls') {
    const k = knoten(w, pfade[0] ? loese(w, pfade[0]) : w.pfad)
    if (!k || k.typ !== 'ordner') return fehler(['Datei nicht gefunden'])
    let namen = Object.keys(k.kinder).sort((a, b) => a.localeCompare(b))
    if (!hat('a')) namen = namen.filter(n => !n.startsWith('.'))
    const ordnerZahl = namen.filter(n => k.kinder[n].typ === 'ordner').length
    const dateiZahl = namen.length - ordnerZahl
    return ok([
      ' Volume in Laufwerk C: hat keine Bezeichnung.',
      '',
      ` Verzeichnis von ${pfade[0] ? pfadText(w) + '\\' + pfade[0].replace(/\//g, '\\') : pfadText(w)}`, '',
      '09.09.2026  08:15    <DIR>          .',
      '09.09.2026  08:15    <DIR>          ..',
      ...namen.map(n => {
        const kk = k.kinder[n]
        return kk.typ === 'ordner'
          ? `09.09.2026  08:15    <DIR>          ${n}`
          : `09.09.2026  08:15    ${String(kk.inhalt.length).padStart(14)} ${n}`
      }),
      `               ${dateiZahl} Datei(en)`,
      `               ${ordnerZahl + 2} Verzeichnis(se)`
    ])
  }

  if (abb === 'rm') {
    const rekursiv = kopf === 'rd' || kopf === 'rmdir' || hat('s')
    const r = posix(w, ['rm', ...(rekursiv ? ['-r'] : []), ...pfade], 'rm')
    // Die Meldungen der Unix-Schale passen hier nicht; auf cmd-Deutsch umsetzen.
    if (r.zeilen.some(z => z.art === 'fehler')) {
      const text = r.zeilen[0].text
      if (/is a directory/.test(text)) {
        return fehler([`Der Zugriff auf ${pfade[0]} wurde verweigert.`,
          'Ein Verzeichnis wird mit  rd /s /q <name>  entfernt, nicht mit del.'])
      }
      return fehler(['Datei nicht gefunden'])
    }
    return r
  }

  if (abb) {
    const r = posix(w, [abb, ...pfade], roh.replace(/^\S+/, abb))
    if (r && r.zeilen.some(z => z.art === 'fehler')) {
      const text = r.zeilen[0].text
      if (/No such file or directory|not a directory/.test(text)) {
        return fehler(['Das System kann den angegebenen Pfad nicht finden.'])
      }
      if (/File exists/.test(text)) {
        return fehler(['Ein Unterverzeichnis oder eine Datei existiert bereits.'])
      }
    }
    return r
  }

  if (kopf === 'where') return ok([`C:\\Program Files\\${marken[1] || ''}\\${marken[1] || ''}.exe`])
  if (kopf === 'ver') return ok(['', 'Microsoft Windows [Version 10.0.26100.4351]'])
  if (kopf === 'help') return { zeilen: [], hinweis: 'man' }
  if (kopf === 'exit') return { zeilen: [], hinweis: 'exit' }
  if (kopf === 'powershell' || kopf === 'pwsh') return { zeilen: [], hinweis: 'psWechsel' }
  if (kopf === 'ls') return fehler(["'ls' ist entweder falsch geschrieben oder konnte nicht gefunden werden."], 'cmdKennLs')
  if (kopf === 'pwd') return fehler(["'pwd' ist entweder falsch geschrieben oder konnte nicht gefunden werden."], 'cmdKennLs')
  if (kopf === 'touch') return fehler(["'touch' ist entweder falsch geschrieben oder konnte nicht gefunden werden."], 'cmdKennTouch')
  return null
}

/* ================================================================== git */

const GIT_FERN = 'https://github.com/studi/velocity-analyse.git'

/**
 * Zustandsmodell: Je Zweig eine eigene Liste von Commits und ein Zaehler,
 * wie viele davon der Server schon kennt. Was verfolgt wird, steht in
 * `verfolgt`; alles andere im Repository-Ordner ist "untracked" und wird bei
 * jedem `status` frisch aus dem Dateibaum bestimmt - genau so, wie Git es tut.
 */
function neuesRepo (w, mitVorgeschichte = false, fern = null) {
  const commits = mitVorgeschichte
    ? [{ hash: '9c1f2ab', text: 'Erste Fassung der Auswertung', autor: 'Kursleitung' }]
    : []
  return {
    zweig: 'main',
    zweige: { main: { commits, gepusht: mitVorgeschichte ? commits.length : 0 } },
    index: [],
    verfolgt: mitVorgeschichte ? ['README.md', 'analyse.ipynb', '.gitignore'] : [],
    fern,
    wurzel: [...w.pfad]
  }
}

const zweigDaten = (g) => g.zweige[g.zweig]

/** Was liegt im Repository-Ordner und ist Git noch unbekannt? */
function unverfolgt (w, g) {
  const k = knoten(w, g.wurzel)
  if (!k || k.typ !== 'ordner') return []
  return Object.keys(k.kinder)
    .filter(n => n !== '.git')
    .filter(n => !g.verfolgt.includes(n))
    .filter(n => !g.index.includes(n))
    .sort((a, b) => a.localeCompare(b))
}

function git (w, marken) {
  const unter = marken[1]
  const arg = marken.slice(2)

  if (!unter || unter === '--help') {
    return ok(['usage: git <command> [<args>]', '',
      '   clone   Clone a repository into a new directory',
      '   init    Create an empty Git repository',
      '   add     Add file contents to the index',
      '   commit  Record changes to the repository',
      '   status  Show the working tree status',
      '   log     Show commit logs',
      '   switch  Switch branches',
      '   merge   Join two development histories together'])
  }
  if (unter === '--version') return ok(['git version 2.49.0'])

  if (unter === 'config') {
    if (arg.includes('--list') || arg.includes('-l')) {
      return ok(['user.name=Studi Beispiel', 'user.email=studi@student.thws.de',
        'init.defaultbranch=main', 'credential.helper=manager'])
    }
    return ok([])
  }

  if (unter === 'init') {
    if (w.git && w.git.wurzel.join('/') === w.pfad.join('/')) {
      return ok([`Reinitialized existing Git repository in ${pfadText(w)}/.git/`])
    }
    w.git = neuesRepo(w)
    return ok([`Initialized empty Git repository in ${pfadText(w)}/.git/`])
  }

  if (unter === 'clone') {
    const url = arg.find(a => !a.startsWith('-')) || GIT_FERN
    const projekt = (url.split('/').pop() || 'projekt').replace(/\.git$/, '')
    const e = knoten(w, w.pfad)
    if (e.kinder[projekt]) {
      return fehler([`fatal: destination path '${projekt}' already exists and is not an empty directory.`])
    }
    e.kinder[projekt] = ordner({
      'README.md': datei(`# ${projekt}\n\nFallstudie zur Vorlesung PITM.\n`),
      'analyse.ipynb': datei('{ "cells": [], "nbformat": 4 }'),
      '.gitignore': datei('.venv/\n__pycache__/\n.ipynb_checkpoints/\n.env\n*.csv\n')
    })
    const merker = [...w.pfad]
    w.pfad = [...w.pfad, projekt]
    w.git = neuesRepo(w, true, url)
    w.pfad = merker
    return ok([`Cloning into '${projekt}'...`,
      'remote: Enumerating objects: 12, done.',
      'remote: Counting objects: 100% (12/12), done.',
      'remote: Total 12 (delta 0), reused 12 (delta 0), pack-reused 0',
      'Receiving objects: 100% (12/12), 4.21 KiB | 4.21 MiB/s, done.'])
  }

  if (!w.git) {
    return fehler(['fatal: not a git repository (or any of the parent directories): .git'], 'keinRepo')
  }
  const g = w.git
  const z = zweigDaten(g)

  if (unter === 'status') {
    const offen = unverfolgt(w, g)
    const voraus = z.commits.length - z.gepusht
    const zeilen = [`On branch ${g.zweig}`]
    if (g.fern) {
      zeilen.push(voraus > 0
        ? `Your branch is ahead of 'origin/${g.zweig}' by ${voraus} commit${voraus > 1 ? 's' : ''}.`
        : `Your branch is up to date with 'origin/${g.zweig}'.`)
      zeilen.push('')
    }
    if (g.index.length) {
      zeilen.push('Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)')
      zeilen.push(...g.index.map(f => `        new file:   ${f}`), '')
    }
    if (offen.length) {
      zeilen.push('Untracked files:', '  (use "git add <file>..." to include in what will be committed)')
      zeilen.push(...offen.map(f => `        ${f}`), '')
    }
    if (!g.index.length && !offen.length) zeilen.push('nothing to commit, working tree clean')
    else if (!g.index.length) zeilen.push('nothing added to commit but untracked files present (use "git add" to track)')
    return ok(zeilen)
  }

  if (unter === 'add') {
    const offen = unverfolgt(w, g)
    if (!arg.length) {
      return fehler(['Nothing specified, nothing added.',
        'hint: Maybe you wanted to say \'git add .\'?'])
    }
    if (arg.includes('.') || arg.includes('-A') || arg.includes('--all') || arg.includes('*')) {
      if (!offen.length) return ok([])
      g.index.push(...offen)
      return ok([])
    }
    const nicht = arg.filter(a => !a.startsWith('-') && !offen.includes(a) && !g.verfolgt.includes(a))
    if (nicht.length) return fehler([`fatal: pathspec '${nicht[0]}' did not match any files`])
    for (const a of arg) if (offen.includes(a) && !g.index.includes(a)) g.index.push(a)
    return ok([])
  }

  if (unter === 'restore') {
    if (arg[0] === '--staged') {
      const f = arg.slice(1)
      g.index = f.length ? g.index.filter(x => !f.includes(x)) : []
      return ok([])
    }
    return ok([])
  }

  if (unter === 'commit') {
    const mi = marken.indexOf('-m')
    const text = mi > -1 ? marken.slice(mi + 1).join(' ') : ''
    const offen = unverfolgt(w, g)
    if (!g.index.length) {
      return fehler([`On branch ${g.zweig}`,
        offen.length
          ? 'nothing added to commit but untracked files present (use "git add" to track)'
          : 'nothing to commit, working tree clean'],
      'commitOhneAdd')
    }
    if (!text) {
      return fehler(['hint: Please supply the message using either -m or -F option.',
        'Aborting commit due to empty commit message.'], 'commitOhneText')
    }
    const hash = Math.random().toString(16).slice(2, 9)
    const n = g.index.length
    z.commits.unshift({ hash, text, autor: 'Studi Beispiel', dateien: [...g.index] })
    g.verfolgt.push(...g.index)
    g.index = []
    return ok([`[${g.zweig} ${hash}] ${text}`,
      ` ${n} file${n > 1 ? 's' : ''} changed, ${n * 12} insertions(+)`])
  }

  if (unter === 'log') {
    if (!z.commits.length) {
      return fehler([`fatal: your current branch '${g.zweig}' does not have any commits yet`])
    }
    if (arg.some(a => a.includes('oneline'))) {
      return ok(z.commits.map((c, i) => `${c.hash}${i === 0 ? ` (HEAD -> ${g.zweig})` : ''} ${c.text}`))
    }
    const aus = []
    for (const [i, c] of z.commits.entries()) {
      aus.push(`commit ${c.hash}${i === 0 ? ` (HEAD -> ${g.zweig})` : ''}`,
        `Author: ${c.autor} <studi@student.thws.de>`,
        'Date:   Wed Sep 9 08:15:00 2026 +0200', '', `    ${c.text}`, '')
    }
    return ok(aus)
  }

  if (unter === 'branch') {
    const neu = arg.find(a => !a.startsWith('-'))
    if (arg.includes('-d') || arg.includes('-D')) {
      if (!neu || !g.zweige[neu]) return fehler([`error: branch '${neu}' not found.`])
      if (neu === g.zweig) return fehler([`error: cannot delete branch '${neu}' checked out at '${pfadText(w)}'`])
      delete g.zweige[neu]
      return ok([`Deleted branch ${neu}.`])
    }
    if (neu) {
      if (g.zweige[neu]) return fehler([`fatal: a branch named '${neu}' already exists`])
      g.zweige[neu] = { commits: [...z.commits], gepusht: 0 }
      return ok([])
    }
    return ok(Object.keys(g.zweige).map(n => (n === g.zweig ? `* ${n}` : `  ${n}`)))
  }

  if (unter === 'switch' || unter === 'checkout') {
    const neu = arg.find(a => !a.startsWith('-'))
    const anlegen = arg.includes('-c') || arg.includes('-b')
    if (!neu) return fehler(['fatal: missing branch or commit argument'])
    if (anlegen) {
      if (g.zweige[neu]) return fehler([`fatal: a branch named '${neu}' already exists`])
      g.zweige[neu] = { commits: [...z.commits], gepusht: 0 }
      g.zweig = neu
      return ok([`Switched to a new branch '${neu}'`])
    }
    if (!g.zweige[neu]) {
      return fehler([`fatal: invalid reference: ${neu}`], 'zweigFehlt')
    }
    g.zweig = neu
    return ok([`Switched to branch '${neu}'`])
  }

  if (unter === 'merge') {
    const q = arg.find(a => !a.startsWith('-'))
    if (!q || !g.zweige[q]) return fehler([`merge: ${q || ''} - not something we can merge`])
    if (q === g.zweig) return ok(['Already up to date.'])
    const quelle = g.zweige[q]
    const neueCommits = quelle.commits.filter(c => !z.commits.some(x => x.hash === c.hash))
    if (!neueCommits.length) return ok(['Already up to date.'])
    const alt = z.commits[0]?.hash || '0000000'
    z.commits = [...neueCommits, ...z.commits]
    const n = neueCommits.length
    return ok([`Updating ${alt}..${neueCommits[0].hash}`, 'Fast-forward',
      ...neueCommits.flatMap(c => (c.dateien || ['analyse.ipynb']).map(d => ` ${d} | 24 ++++++++++++++++++++++`)),
      ` ${n} file${n > 1 ? 's' : ''} changed, ${n * 24} insertions(+)`])
  }

  if (unter === 'remote') {
    if (arg[0] === 'add') { g.fern = arg[2] || GIT_FERN; return ok([]) }
    if (arg[0] === 'remove' || arg[0] === 'rm') { g.fern = null; return ok([]) }
    if (arg.includes('-v')) {
      if (!g.fern) return ok([])
      return ok([`origin  ${g.fern} (fetch)`, `origin  ${g.fern} (push)`])
    }
    return ok(g.fern ? ['origin'] : [])
  }

  if (unter === 'push') {
    if (!g.fern) {
      return fehler(['fatal: No configured push destination.',
        'Either specify the URL from the command-line or configure a remote repository using',
        '', '    git remote add <name> <url>', '',
        'and then push using the remote name', '', '    git push <name>'], 'pushOhneRemote')
    }
    const voraus = z.commits.length - z.gepusht
    if (voraus <= 0) return ok(['Everything up-to-date'])
    const vorher = z.gepusht ? z.commits[voraus].hash : '0000000'
    z.gepusht = z.commits.length
    return ok(['Enumerating objects: 5, done.', 'Counting objects: 100% (5/5), done.',
      'Delta compression using up to 8 threads',
      'Writing objects: 100% (3/3), 412 bytes | 412.00 KiB/s, done.',
      `To ${g.fern}`,
      `   ${vorher}..${z.commits[0].hash}  ${g.zweig} -> ${g.zweig}`])
  }

  if (unter === 'pull' || unter === 'fetch') {
    if (!g.fern) {
      return fehler(['There is no tracking information for the current branch.',
        'Please specify which branch you want to merge with.'], 'pushOhneRemote')
    }
    return ok(['Already up to date.'])
  }

  if (unter === 'diff') {
    if (!g.index.length && !unverfolgt(w, g).length) return ok([])
    return ok(['diff --git a/analyse.ipynb b/analyse.ipynb',
      'index 3f8b2c1..7a4d9e0 100644', '--- a/analyse.ipynb', '+++ b/analyse.ipynb',
      '@@ -12,6 +12,9 @@',
      '     "cells": [',
      '+     { "cell_type": "code", "source": [',
      '+        "df = pd.read_csv(\'fahrten_2026.csv\', sep=\';\')"',
      '+     ] },'])
  }

  return fehler([`git: '${unter}' is not a git command. See 'git --help'.`])
}

/* =============================================================== docker */

function docker (w, marken) {
  const d = w.docker
  let unter = marken[1]
  let arg = marken.slice(2)

  if (!unter || unter === '--help') {
    return ok(['Usage:  docker [OPTIONS] COMMAND', '',
      'Common Commands:', '  run     Create and run a new container from an image',
      '  ps      List containers', '  images  List images', '  build   Build an image from a Dockerfile',
      '  logs    Fetch the logs of a container', '  exec    Execute a command in a running container'])
  }
  if (unter === '--version') return ok(['Docker version 28.6.1, build 4a4e5d2'])

  const zieheAbbild = (bezeichner) => {
    const [n, t] = bezeichner.split(':')
    const stamm = DOCKER_ABBILDER[n]
    if (!stamm) return null
    const tag = t || stamm.tag
    const voll = `${n}:${tag}`
    if (!d.abbilder.some(a => a.voll === voll)) {
      d.abbilder.push({ voll, name: n, tag, groesse: stamm.groesse, id: Math.random().toString(16).slice(2, 14) })
    }
    return voll
  }

  if (unter === 'pull') {
    const b = arg.find(a => !a.startsWith('-'))
    const voll = zieheAbbild(b || '')
    if (!voll) return fehler([`Error response from daemon: pull access denied for ${b}, repository does not exist`], 'abbildUnbekannt')
    return ok([`${voll.split(':')[1]}: Pulling from library/${voll.split(':')[0]}`,
      'Digest: sha256:9b1f...c0de', `Status: Downloaded newer image for ${voll}`, `docker.io/library/${voll}`])
  }

  if (unter === 'images') {
    if (!d.abbilder.length) return ok(['REPOSITORY   TAG       IMAGE ID       CREATED       SIZE'])
    return ok(['REPOSITORY   TAG          IMAGE ID       CREATED       SIZE',
      ...d.abbilder.map(a => `${a.name.padEnd(12)} ${a.tag.padEnd(12)} ${a.id.slice(0, 12)}   2 weeks ago   ${a.groesse}`)])
  }

  if (unter === 'run') {
    const nurName = (a) => !a.startsWith('-')
    const abbildIdx = arg.findIndex((a, i) => nurName(a) &&
      !['-p', '-v', '-e', '--name', '--platform', '--user'].includes(arg[i - 1]))
    if (abbildIdx < 0) return fehler(['docker: "docker run" requires at least 1 argument.'])
    const bezeichner = arg[abbildIdx]
    const voll = zieheAbbild(bezeichner)
    if (!voll) return fehler([`Unable to find image '${bezeichner}' locally`,
      `docker: Error response from daemon: pull access denied for ${bezeichner.split(':')[0]}.`], 'abbildUnbekannt')

    const hole = (flagge) => { const i = arg.indexOf(flagge); return i > -1 ? arg[i + 1] : null }
    // Mehrere gleiche Flaggen sind erlaubt: -e dreimal, -v zweimal, -p zweimal.
    const alle = (flagge) => arg.reduce((aus, a, i) => (arg[i - 1] === flagge ? [...aus, a] : aus), [])
    const nameC = (hole('--name') || voll.split(':')[0].replace(/\//g, '_') + '_' + Math.random().toString(36).slice(2, 7))
    const port = hole('-p')
    const baender = alle('-v')
    const band = baender[0] || null
    const umgebung = alle('-e')
    const imHintergrund = arg.includes('-d') || arg.includes('--detach')
    const wegDanach = arg.includes('--rm')
    const interaktiv = arg.some(a => a === '-it' || a === '-i' || a === '-ti')

    if (port) {
      const hostPort = port.split(':').slice(-2)[0]
      if (d.container.some(c => c.laeuft && c.port && c.port.split(':').slice(-2)[0] === hostPort)) {
        return fehler([`docker: Error response from daemon: driver failed programming external connectivity on endpoint ${nameC}:`,
          `Bind for 0.0.0.0:${hostPort} failed: port is already allocated.`], 'portBelegt')
      }
    }
    if (d.container.some(c => c.name === nameC)) {
      return fehler([`docker: Error response from daemon: Conflict. The container name "/${nameC}" is already in use.`], 'nameBelegt')
    }
    for (const b of baender) {
      if (!b.includes(':')) continue
      const bandName = b.split(':')[0]
      if (!bandName.includes('/') && !bandName.startsWith('$') && !bandName.startsWith('.') &&
          !d.volumen.includes(bandName)) d.volumen.push(bandName)
    }

    const id = (d.naechsteId++).toString(16).padStart(12, '0')
    const eintrag = {
      id, name: nameC, abbild: voll, port, band, baender, umgebung,
      laeuft: !wegDanach || imHintergrund, wegDanach
    }

    if (voll.startsWith('hello-world')) {
      return ok(['', 'Hello from Docker!',
        'This message shows that your installation appears to be working correctly.', '',
        'To generate this message, Docker took the following steps:',
        ' 1. The Docker client contacted the Docker daemon.',
        ' 2. The Docker daemon pulled the "hello-world" image from Docker Hub.',
        ' 3. The Docker daemon created a new container from that image.',
        ' 4. The Docker daemon streamed that output to the Docker client.', ''])
    }
    if (imHintergrund) {
      d.container.push(eintrag)
      return ok([id])
    }
    if (interaktiv) {
      d.container.push({ ...eintrag, laeuft: false })
      return { zeilen: [], hinweis: 'interaktiv' }
    }
    d.container.push(eintrag)
    return ok([`Container ${nameC} gestartet.`])
  }

  if (unter === 'ps') {
    const alle = arg.includes('-a') || arg.includes('--all')
    const liste = d.container.filter(c => alle || c.laeuft)
    const kopf = 'CONTAINER ID   IMAGE              STATUS         PORTS                    NAMES'
    if (!liste.length) return ok([kopf])
    return ok([kopf, ...liste.map(c =>
      `${c.id.slice(0, 12)}   ${c.abbild.padEnd(18)} ${(c.laeuft ? 'Up 2 minutes' : 'Exited (0) 1 min ago').padEnd(14)} ${(c.port ? c.port.replace(/^(\d+):(\d+)$/, '0.0.0.0:$1->$2/tcp') : '').padEnd(24)} ${c.name}`)])
  }

  if (unter === 'logs') {
    const n = arg.find(a => !a.startsWith('-'))
    const c = d.container.find(x => x.name === n || x.id.startsWith(n || ''))
    if (!c) return fehler([`Error response from daemon: No such container: ${n}`], 'containerFehlt')
    if (c.abbild.startsWith('postgres')) {
      return ok(['PostgreSQL init process complete; ready for start up.',
        'LOG:  starting PostgreSQL 16.4 on x86_64-pc-linux-gnu',
        'LOG:  listening on IPv4 address "0.0.0.0", port 5432',
        'LOG:  database system is ready to accept connections'])
    }
    if (c.abbild.startsWith('n8nio/n8n')) {
      const schluessel = c.umgebung && c.umgebung.some(e => e.startsWith('N8N_ENCRYPTION_KEY='))
      const zeilen = [
        'Initializing n8n process',
        'n8n ready on 0.0.0.0, port 5678',
        `Editor is now accessible via:`,
        `http://localhost:${c.port ? c.port.split(':').slice(-2)[0] : '5678'}/`
      ]
      if (!schluessel) {
        zeilen.splice(1, 0, 'No encryption key found - generating one and saving it to ~/.n8n/config')
      }
      return ok(zeilen)
    }
    return ok([`${c.abbild} started`, 'ready to accept connections'])
  }

  if (unter === 'exec') {
    const n = arg.find(a => !a.startsWith('-') && !['-it', '-i', '-t'].includes(a))
    const c = d.container.find(x => x.name === n || x.id.startsWith(n || ''))
    if (!c) return fehler([`Error response from daemon: No such container: ${n}`], 'containerFehlt')
    if (!c.laeuft) return fehler([`Error response from daemon: Container ${n} is not running`], 'containerAus')
    return { zeilen: [], hinweis: 'interaktiv' }
  }

  if (unter === 'stop' || unter === 'start') {
    const n = arg.find(a => !a.startsWith('-'))
    const c = d.container.find(x => x.name === n || x.id.startsWith(n || ''))
    if (!c) return fehler([`Error response from daemon: No such container: ${n}`], 'containerFehlt')
    c.laeuft = unter === 'start'
    return ok([n])
  }

  if (unter === 'rm') {
    const zwingen = arg.includes('-f')
    const n = arg.find(a => !a.startsWith('-'))
    const i = d.container.findIndex(x => x.name === n || x.id.startsWith(n || ''))
    if (i < 0) return fehler([`Error response from daemon: No such container: ${n}`], 'containerFehlt')
    if (d.container[i].laeuft && !zwingen) {
      return fehler([`Error response from daemon: You cannot remove a running container ${d.container[i].id}.`,
        'Stop the container before attempting removal or force remove'], 'rmLaeuft')
    }
    d.container.splice(i, 1)
    return ok([n])
  }

  if (unter === 'rmi') {
    const n = arg.find(a => !a.startsWith('-'))
    const i = d.abbilder.findIndex(x => x.voll === n || x.name === n)
    if (i < 0) return fehler([`Error response from daemon: No such image: ${n}`])
    const genutzt = d.container.some(c => c.abbild === d.abbilder[i].voll)
    if (genutzt) return fehler([`Error response from daemon: conflict: unable to remove repository reference "${n}" (must force) - container is using its referenced image`], 'abbildInBenutzung')
    d.abbilder.splice(i, 1)
    return ok([`Untagged: ${n}`])
  }

  if (unter === 'volume') {
    if (arg[0] === 'ls') {
      return ok(['DRIVER    VOLUME NAME', ...d.volumen.map(v => `local     ${v}`)])
    }
    if (arg[0] === 'create') { if (!d.volumen.includes(arg[1])) d.volumen.push(arg[1]); return ok([arg[1]]) }
    if (arg[0] === 'rm') {
      d.volumen = d.volumen.filter(v => v !== arg[1])
      return ok([arg[1]])
    }
    return ok(['Usage:  docker volume COMMAND'])
  }

  if (unter === 'build') {
    const t = arg[arg.indexOf('-t') + 1]
    const k = knoten(w, w.pfad)
    if (!k || !k.kinder['Dockerfile']) {
      return fehler(['ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory'], 'keinDockerfile')
    }
    const voll = t || 'sha256:' + Math.random().toString(16).slice(2, 14)
    d.abbilder.push({ voll, name: (t || 'unbenannt').split(':')[0], tag: (t || ':latest').split(':')[1] || 'latest', groesse: '186MB', id: Math.random().toString(16).slice(2, 14) })
    return ok(['[+] Building 12.4s (9/9) FINISHED',
      ' => [internal] load build definition from Dockerfile        0.0s',
      ' => [1/4] FROM docker.io/library/python:3.12-slim           3.1s',
      ' => [2/4] WORKDIR /app                                      0.1s',
      ' => [3/4] RUN pip install --no-cache-dir pandas             8.4s',
      ' => [4/4] COPY app.py .                                     0.0s',
      ` => => naming to docker.io/library/${voll}                  0.0s`])
  }

  if (unter === 'compose') {
    const k = knoten(w, w.pfad)
    const hatDatei = k && k.typ === 'ordner' && (k.kinder['compose.yaml'] || k.kinder['docker-compose.yml'])
    if (!hatDatei) return fehler(['no configuration file provided: not found'], 'keinCompose')
    if (arg[0] === 'up') {
      zieheAbbild('postgres'); zieheAbbild('adminer')
      d.compose = true
      if (!d.volumen.includes('pgdata')) d.volumen.push('pgdata')
      d.container = d.container.filter(c => !c.compose)
      d.container.push(
        { id: (d.naechsteId++).toString(16).padStart(12, '0'), name: 'projekt-db-1', abbild: 'postgres:16', port: '5432:5432', band: 'pgdata:/var/lib/postgresql/data', laeuft: true, compose: true },
        { id: (d.naechsteId++).toString(16).padStart(12, '0'), name: 'projekt-adminer-1', abbild: 'adminer:5', port: '8081:8080', laeuft: true, compose: true })
      return ok(['[+] Running 3/3', ' ✔ Volume "projekt_pgdata"   Created',
        ' ✔ Container projekt-db-1       Started', ' ✔ Container projekt-adminer-1  Started'])
    }
    if (arg[0] === 'down') {
      const mitBaendern = arg.includes('-v') || arg.includes('--volumes')
      d.container = d.container.filter(c => !c.compose)
      const zeilen = ['[+] Running 3/3', ' ✔ Container projekt-adminer-1  Removed',
        ' ✔ Container projekt-db-1       Removed', ' ✔ Network projekt_default      Removed']
      if (mitBaendern) {
        d.volumen = d.volumen.filter(v => v !== 'pgdata')
        zeilen.push(' ✔ Volume projekt_pgdata       Removed')
        return { zeilen: zeilen.map(t => ({ art: 'aus', text: t })), hinweis: 'composeDownV' }
      }
      return ok(zeilen)
    }
    if (arg[0] === 'ps') return docker(w, ['docker', 'ps'])
    if (arg[0] === 'logs') return docker(w, ['docker', 'logs', 'projekt-db-1'])
    return ok(['Usage:  docker compose [OPTIONS] COMMAND'])
  }

  if (unter === 'system') {
    if (arg[0] === 'df') {
      const gr = d.abbilder.length * 0.4 + 0.2
      return ok(['TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE',
        `Images          ${String(d.abbilder.length).padEnd(9)} ${String(d.container.length).padEnd(9)} ${gr.toFixed(2)}GB   ${(gr * 0.4).toFixed(2)}GB`,
        `Containers      ${String(d.container.length).padEnd(9)} ${String(d.container.filter(c => c.laeuft).length).padEnd(9)} 24.1MB    12.0MB`,
        `Local Volumes   ${String(d.volumen.length).padEnd(9)} ${String(d.volumen.length).padEnd(9)} 41.2MB    0B`,
        'Build Cache     14        0         612.4MB   612.4MB'])
    }
    if (arg[0] === 'prune') {
      const alles = arg.includes('-a')
      const weg = d.container.filter(c => !c.laeuft).length
      d.container = d.container.filter(c => c.laeuft)
      if (alles) d.abbilder = d.abbilder.filter(a => d.container.some(c => c.abbild === a.voll))
      if (arg.includes('--volumes')) d.volumen = []
      return ok(['Deleted Containers:', ...Array(weg).fill('  (1 Container entfernt)'),
        '', 'Total reclaimed space: 612.4MB'])
    }
  }

  if (unter === 'stats') {
    return ok(['CONTAINER ID   NAME            CPU %     MEM USAGE / LIMIT     MEM %',
      ...d.container.filter(c => c.laeuft).map(c => `${c.id.slice(0, 12)}   ${c.name.padEnd(15)} 0.14%     48.2MiB / 7.67GiB     0.61%`)])
  }

  return fehler([`docker: '${unter}' is not a docker command.`, "See 'docker --help'"])
}

/* ================================================================ Ausfuehrung */

/**
 * Fuehrt eine Zeile aus. Liefert `{ zeilen, leeren?, hinweis? }`.
 * `hinweis` ist ein Schluessel, den die Oberflaeche uebersetzt.
 */
export function fuehreAus (welt, zeile) {
  const roh = zeile.trim()
  if (!roh) return { zeilen: [] }
  welt.historie.push(roh)

  const marken = zerlege(roh)
  const kopf = marken[0].toLowerCase()

  if (kopf === 'git') return git(welt, marken)
  if (kopf === 'docker') return docker(welt, marken)

  let r = null
  if (welt.os === 'mac') r = posix(welt, marken, roh)
  else if (welt.os === 'win') r = powershell(welt, marken, roh)
  else r = cmd(welt, marken, roh)

  if (r) return r

  if (welt.os === 'mac') return fehler([`zsh: command not found: ${marken[0]}`], 'unbekannt')
  if (welt.os === 'win') {
    return fehler([`${marken[0]}: Die Benennung "${marken[0]}" wurde nicht als Name eines Cmdlets, einer Funktion,`,
      'einer Skriptdatei oder eines ausführbaren Programms erkannt.'], 'unbekannt')
  }
  return fehler([`'${marken[0]}' ist entweder falsch geschrieben oder konnte nicht gefunden werden.`], 'unbekannt')
}
