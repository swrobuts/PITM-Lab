import test from 'node:test'
import assert from 'node:assert/strict'
import { neueWelt, fuehreAus } from '../assets/terminal.js'
import { zustandTrifft, schrittErfuellt } from '../assets/pruefung.js'

const failed = r => r.zeilen.some(z => z.art === 'fehler')
const run = (w, cmd) => fuehreAus(w, cmd)

test('failed commands do not complete ordinary terminal steps', () => {
  const w = neueWelt()
  const r = run(w, 'git commit -m "nothing"')
  assert(failed(r))
  assert.equal(schrittErfuellt(w, { muster: '^git\\s+commit\\b' }, 'git commit -m "nothing"', false, r), false)
})
test('deliberate error exercises require the specified error', () => {
  const w = neueWelt()
  const step = { muster: '^docker\\s+rm\\b', erwarteterFehler: 'rmLaeuft' }
  assert.equal(schrittErfuellt(w, step, 'docker rm missing', false, run(w, 'docker rm missing')), false)
  run(w, 'docker run -d --name web nginx')
  assert.equal(schrittErfuellt(w, step, 'docker rm web', false, run(w, 'docker rm web')), true)
})
test('container properties must hold on the requested container', () => {
  const w = neueWelt()
  run(w, 'docker run -d --name other -p 5678:5678 -v n8n_data:/home/node/.n8n -e N8N_ENCRYPTION_KEY=test n8nio/n8n')
  run(w, 'docker run -d --name n8n n8nio/n8n')
  assert.equal(zustandTrifft(w, { containerLaeuft: 'n8n', portGebunden: '5678:5678', bandAn: 'n8n_data', umgebung: 'N8N_ENCRYPTION_KEY=' }), false)
})
test('built images can be used by docker run', () => {
  const w = neueWelt()
  run(w, 'touch Dockerfile')
  assert.equal(failed(run(w, 'docker build -t analytics .')), false)
  assert.equal(failed(run(w, 'docker run -d --name app analytics')), false)
  assert.equal(w.docker.container.find(c => c.name === 'app').abbild, 'analytics:latest')
})
test('build without a tag does not treat the context as a tag', () => {
  const w = neueWelt()
  run(w, 'touch Dockerfile')
  run(w, 'docker build .')
  assert(!w.docker.abbilder.some(a => a.name === '.'))
})
test('Git commands outside the repository do not access its state', () => {
  const w = neueWelt()
  run(w, 'git clone https://github.com/studi/velocity-analyse.git')
  assert(failed(run(w, 'git status')))
  run(w, 'cd velocity-analyse')
  assert.equal(failed(run(w, 'git status')), false)
})
test('quoted empty input does not throw', () => {
  for (const os of ['mac', 'win', 'cmd']) assert.doesNotThrow(() => run(neueWelt(os), '""'))
})
