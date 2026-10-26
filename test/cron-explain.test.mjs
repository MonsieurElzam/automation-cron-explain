import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sample = (n) => readFileSync(new URL(`../samples/${n}`, import.meta.url), 'utf8')
const mod = (n) => import(`../src/${n}.mjs`)
const run = (n, args = []) => spawnSync(process.execPath, [fileURLToPath(new URL(`../src/${n}.mjs`, import.meta.url)), ...args], { encoding: 'utf8' })
const samplePath = (n) => fileURLToPath(new URL(`../samples/${n}`, import.meta.url))

test('25 cron : validation, prochaines exécutions, règle jour-du-mois OU jour-de-semaine, explication', async () => {
  const { parseCron, nextRuns, explain } = await mod('cron-explain')
  assert.throws(() => parseCron('* * * *'), /5 champs/); assert.throws(() => parseCron('61 * * * *'), /hors limites/); assert.throws(() => parseCron('5-1 * * * *'), /inversée/); assert.throws(() => parseCron('*/0 * * * *'), /pas invalide/)
  const from = new Date('2026-10-26T09:00:00Z')
  assert.deepEqual(nextRuns('*/15 * * * *', from, 3).map((d) => d.toISOString().slice(11, 16)), ['09:15', '09:30', '09:45'])
  assert.deepEqual(nextRuns('0 8 * * 1-5', from, 2).map((d) => d.toISOString().slice(0, 13)), ['2026-10-27T08', '2026-10-28T08'])
  assert.equal(nextRuns('0 0 13 * 5', from, 1)[0].toISOString().slice(0, 10), '2026-10-30') // vendredi avant le 13
  assert.equal(nextRuns('0 0 29 2 *', new Date('2026-01-01T00:00:00Z'), 1)[0].toISOString().slice(0, 10), '2028-02-29')
  assert.equal(explain('0 8 * * MON'), 'À 08:00, le lundi'); assert.equal(explain('*/15 8-18 * * 1-5'), 'Toutes les 15 minutes, de 08:00 à 18:59, du lundi au vendredi'); assert.equal(explain('30 2 1 * *', 'en'), 'At 02:30, on day 1 of the month'); assert.equal(explain('* * * * *'), 'Toutes les minutes, tous les jours')
  assert.equal(parseCron('0 0 * * 7').dow.has(0), true)
})
