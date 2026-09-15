// Optional: npm install --no-save playwright; npx playwright install chromium.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, extname, sep } from 'node:path'
import { runInNewContext } from 'node:vm'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const root = process.env.PITM_TEST_ROOT || fileURLToPath(new URL('../', import.meta.url))
const read = path => readFile(resolve(root, path), 'utf8')
const source = await read('tools/verify.mjs')
const solutions = runInNewContext('(' + source.match(/const LOESUNGEN = (\{[\s\S]*?\n\})/)[1] + ')')
const pages = (await readdir(root)).filter(n => /^lab-\d\d-.*\.html$/.test(n)).sort()
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' }
const server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'))
    if (!path.startsWith(resolve(root) + sep)) throw new Error('Outside root')
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream' }).end(await readFile(path))
  } catch { res.writeHead(404).end() }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.setDefaultTimeout(60000)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.addInitScript(() => localStorage.setItem('pitm:os', 'mac'))
  const ready = async (path, lang = 'de') => {
    const data = JSON.parse(await read('data/uebungen/' + path.slice(0, 6) + '.json'))
    await page.goto(base + '/' + path + '?lang=' + lang)
    await page.waitForFunction(n => document.querySelectorAll('.uebung').length === n, data.uebungen.length)
    if (await page.locator('[data-datenbank]').count()) await page.waitForSelector('.db-status.ready')
    return data.uebungen
  }
  const checked = async box => {
    await box.locator('.uebung-aktionen > button.primary').click()
    await box.locator('.uebung-aktionen > button.primary:not(:disabled)').waitFor()
    assert.equal(await box.locator('.uebung-status .line.ok').count(), 1, await box.locator('.uebung-status').textContent())
  }
  const freeQuery = async sql => {
    const box = page.locator('.sql-konsole')
    await box.locator('textarea').fill(sql)
    await box.locator('.uebung-aktionen > button').first().click()
    await box.locator('.uebung-aktionen > button:not(:disabled)').first().waitFor()
    assert.equal(await box.locator('.line.fail').count(), 0, await box.locator('.uebung-status').textContent())
    return box.locator('.uebung-status').textContent()
  }
  if (!process.env.SQL_ONLY) {
    for (const lang of ['de', 'en']) {
      for (const path of pages) {
        const exercises = await ready(path, lang)
        for (const u of exercises) {
          const box = page.locator('#uebung-' + u.id)
          if (u.typ === 'quiz') {
            for (const [i, question] of u.fragen.entries()) {
              for (const index of question.richtig) await box.locator('input[name="' + u.id + '-f' + i + '"]').nth(index).check()
            }
            await checked(box)
          } else if (u.typ === 'zuordnen') {
            for (const [i, pair] of u.paare.entries()) await box.locator('select').nth(i).selectOption(pair.ziel)
            await checked(box)
          } else if (u.typ === 'checkliste') {
            for (const checkbox of await box.locator('input[type="checkbox"]').all()) await checkbox.check()
          } else if (u.typ === 'terminal') {
            const steps = solutions[u.id][u.os && u.os !== 'alle' ? u.os : 'mac']
            for (const [cmd, count] of steps) {
              await box.locator('.terminal-eingabe input').fill(cmd)
              await box.locator('.terminal-eingabe input').press('Enter')
              assert.equal(await box.locator('.terminal-auftrag li.erledigt').count(), count, u.id + ': ' + cmd)
            }
          } else if (u.typ === 'sql') {
            await box.locator('textarea').fill(u.loesung)
            await checked(box)
          }
          assert.equal(await box.locator('.uebung-kopf .badge').isVisible(), true, u.id)
        }
        console.log(lang + ' ' + path.slice(0, 6) + ': ' + exercises.length + ' exercises OK')
      }
    }
  }
  const sqlExercises = (await ready('lab-06-supabase.html')).filter(u => u.typ === 'sql')
  await freeQuery('CREATE TABLE keep_my_work (value integer); INSERT INTO keep_my_work VALUES (42); SELECT * FROM keep_my_work;')
  // Checking must preserve the shared playground, including after a SQL error.
  for (const u of sqlExercises) await page.locator('#uebung-' + u.id + ' textarea').fill(u.loesung)
  await Promise.all(sqlExercises.map(u => checked(page.locator('#uebung-' + u.id))))
  assert.match(await freeQuery('SELECT * FROM keep_my_work;'), /42/)
  const first = page.locator('#uebung-' + sqlExercises[0].id)
  await first.locator('textarea').fill('SELECT missing_column FROM station;')
  await first.locator('button.primary').click()
  await first.locator('button.primary:not(:disabled)').waitFor()
  assert.equal(await first.locator('.line.fail').count(), 1)
  assert.match(await freeQuery('SELECT * FROM keep_my_work;'), /42/)
  console.log('Concurrent SQL checks preserve the free console, including failed queries')

  await ready('lab-01-kommandozeile.html')
  const terminal = page.locator('#uebung-P01-01 .terminal-eingabe input')
  await terminal.fill('pwd'); await terminal.press('Enter')
  await terminal.fill('ls missing'); await terminal.press('Enter')
  assert.equal(await page.locator('#uebung-P01-01 .terminal-auftrag li.erledigt').count(), 1)
  await terminal.fill('ls'); await terminal.press('Enter')
  assert.equal(await page.locator('#uebung-P01-01 .terminal-auftrag li.erledigt').count(), 2)
  await terminal.fill('""'); await terminal.press('Enter')
  await page.evaluate(() => localStorage.setItem('pitm:fortschritt:lab-01', 'null'))
  await ready('lab-01-kommandozeile.html')
  assert.match(await page.locator('.fortschritt .zahl').textContent(), /^0 \/ 6/)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.locator('#uebung-P01-01 .terminal-eingabe input').isVisible(), true)
  assert.deepEqual(errors, [])
  console.log('Failed-command, empty-input, storage recovery and mobile checks OK')
} finally {
  await browser.close()
  await new Promise(r => server.close(r))
}
