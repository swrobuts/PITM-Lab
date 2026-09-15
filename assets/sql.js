/** SQL-Ausfuehrung mit erhaltener Spaltenreihenfolge, auch bei gleichen Namen. */
export async function fuehreSql (db, sql) {
  const teile = await db.exec(sql, { rowMode: 'array' })
  return [...teile].reverse().find(t => t.fields?.length) || teile.at(-1) || { fields: [], rows: [] }
}

/**
 * Jede bewertete Abfrage erhaelt ihre eigene Datenbank.
 * So veraendern weder SQL-Fehler noch Transaktionen oder SET-Anweisungen die
 * Referenzloesung, eine andere Uebung oder den Stand der freien SQL-Konsole.
 */
export async function pruefAbfrage (erzeugeDb, saat, sql) {
  const db = await erzeugeDb()
  try {
    await db.exec(saat)
    return await fuehreSql(db, sql)
  } finally {
    await db.close()
  }
}
