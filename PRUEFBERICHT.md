# Bugprüfung vom 15. September 2026

Ausgangsstand: `1bf7b8e` auf `main`; lokaler Ordner und GitHub waren identisch.

## Behoben

- Fehlgeschlagene Terminalbefehle konnten reguläre Übungsschritte abschließen.
  Absichtlich provozierte Fehler müssen jetzt dem erwarteten Fehlertyp entsprechen.
- Port, Band und Umgebungsvariable konnten von verschiedenen Containern stammen,
  obwohl die Aufgabe einen bestimmten Container verlangte.
- Selbst gebaute Docker-Abbilder ließen sich nicht starten; ohne Tag wurde der Bau-Kontext als Tag behandelt.
- Git griff außerhalb des Repository-Ordners auf dessen Zustand zu.
- Eine Eingabe nur aus leeren Anführungszeichen ließ die Terminalverarbeitung abstürzen.
- SQL-Bewertungen setzten die gemeinsame Datenbank zurück und löschten damit eigene Tabellen
  der freien SQL-Konsole. Bewertungen und Referenzabfragen erhalten jetzt getrennte Datenbanken.
- Beschädigte Fortschrittsdaten konnten den Aufbau der Übungen verhindern.
- Die fehlende ES-Moduldeklaration verhinderte den Prüflauf unter Node.js 20.

## Nachweise

- Sieben neue Regressionstests bestanden; alle sieben reproduzierten zuvor Fehler.
- Alle 1.021 Zusicherungen des bestehenden Abnahmelaufs bestanden, einschließlich der Terminal-Lösungswege je Dialekt.
- Alle 54 Übungen in Deutsch und Englisch im separaten Edge-Testbrowser gelöst.
- Gleichzeitige SQL-Bewertungen und fehlerhafte Abfragen erhalten eigene Tabellen der freien Konsole.
  Im unveränderten Ausgangsstand scheiterte derselbe Test mit einer fehlenden Tabelle.
- Fehlerhafte Befehle, leere Eingaben, beschädigter Fortschritt und die mobile Terminalansicht geprüft.

Die Shell ist weiterhin eine vereinfachte Simulation. Die echten Dienste und Anwendungen
wie Supabase, Docker, KNIME und n8n waren nicht Teil dieses Browser-Prüflaufs.
