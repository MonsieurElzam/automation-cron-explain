#!/usr/bin/env node
/* Explique une expression cron à 5 champs en langage clair et calcule ses prochaines exécutions (en UTC). */
import { isMain, parseArgs, usage, fail } from '../lib/cli.mjs'

const NAMES = {
  month: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  dow: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
}
const FIELDS = [
  { key: 'minute', min: 0, max: 59 }, { key: 'hour', min: 0, max: 23 }, { key: 'dom', min: 1, max: 31 },
  { key: 'month', min: 1, max: 12, names: NAMES.month, offset: 1 }, { key: 'dow', min: 0, max: 7, names: NAMES.dow, offset: 0 },
]

function parseField(text, f) {
  const values = new Set()
  for (const part of text.split(',')) {
    const [rangeRaw, stepRaw] = part.split('/')
    const step = stepRaw === undefined ? 1 : Number(stepRaw)
    if (!Number.isInteger(step) || step < 1) throw new Error(`pas invalide « ${part} » (${f.key})`)
    const toNum = (s) => {
      const i = f.names ? f.names.indexOf(s.toUpperCase()) : -1
      const n = i >= 0 ? i + f.offset : Number(s)
      if (!Number.isInteger(n) || n < f.min || n > f.max) throw new Error(`valeur « ${s} » hors limites ${f.min}-${f.max} (${f.key})`)
      return n
    }
    let lo, hi
    if (rangeRaw === '*') { lo = f.min; hi = f.key === 'dow' ? 6 : f.max }
    else if (rangeRaw.includes('-')) { const [a, b] = rangeRaw.split('-'); lo = toNum(a); hi = toNum(b); if (lo > hi) throw new Error(`plage inversée « ${rangeRaw} » (${f.key})`) }
    else { lo = toNum(rangeRaw); hi = stepRaw === undefined ? lo : f.max }
    for (let v = lo; v <= hi; v += step) values.add(f.key === 'dow' && v === 7 ? 0 : v)
  }
  return values
}

export function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/)
  if (parts.length !== 5) throw new Error(`5 champs attendus (minute heure jour-du-mois mois jour-de-semaine), ${parts.length} reçu(s).`)
  const sets = Object.fromEntries(FIELDS.map((f, i) => [f.key, parseField(parts[i], f)]))
  return { ...sets, domAny: parts[2] === '*', dowAny: parts[4] === '*', raw: parts }
}

const matches = (c, d) => {
  if (!c.minute.has(d.getUTCMinutes()) || !c.hour.has(d.getUTCHours()) || !c.month.has(d.getUTCMonth() + 1)) return false
  const dom = c.dom.has(d.getUTCDate()), dow = c.dow.has(d.getUTCDay())
  return c.domAny && c.dowAny ? true : c.domAny ? dow : c.dowAny ? dom : dom || dow // règle cron : jour du mois OU jour de semaine si les deux sont restreints
}

export function nextRuns(expr, from = new Date(), count = 5) {
  const c = parseCron(expr)
  const out = []
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), from.getUTCHours(), from.getUTCMinutes() + 1))
  for (let i = 0; i < 60 * 24 * 800 && out.length < count; i++, d.setUTCMinutes(d.getUTCMinutes() + 1)) if (matches(c, d)) out.push(new Date(d))
  return out
}

const L = {
  fr: { days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'], months: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    at: 'à', and: 'et', everyMinute: 'toutes les minutes', everyN: (n, u) => `toutes les ${n} ${u === 'min' ? 'minutes' : 'heures'}`, atMinute: (m) => `à la minute ${m} de chaque heure`, atMinutes: (m) => `aux minutes ${m}`,
    hourRange: (a, b) => `de ${a} à ${b}`, hourList: (h) => `pendant les heures ${h}`, dayRange: (a, b) => `du ${a} au ${b}`, onDays: (arr) => arr.map((d) => `le ${d}`).join(', ').replace(/, ([^,]*)$/, ' et $1'), onDom: (d) => `le ${d.replace(/^1(?=$| )/, '1er')} du mois`, inMonths: (m) => `en ${m}`, daily: 'tous les jours' },
  en: { days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    at: 'at', and: 'and', everyMinute: 'every minute', everyN: (n, u) => `every ${n} ${u === 'min' ? 'minutes' : 'hours'}`, atMinute: (m) => `at minute ${m} of every hour`, atMinutes: (m) => `at minutes ${m}`,
    hourRange: (a, b) => `from ${a} to ${b}`, hourList: (h) => `during hours ${h}`, dayRange: (a, b) => `${a} through ${b}`, onDays: (arr) => `on ${arr.length > 1 ? `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}` : arr[0]}`, onDom: (d) => `on day ${d} of the month`, inMonths: (m) => `in ${m}`, daily: 'every day' },
}

const list = (arr, and) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} ${and} ${arr[arr.length - 1]}`)
const two = (n) => String(n).padStart(2, '0')
const sorted = (set) => [...set].sort((a, b) => a - b)
const contiguous = (a) => a.length >= 3 && a.every((v, i) => i === 0 || v === a[i - 1] + 1)

export function explain(expr, lang = 'fr') {
  const c = parseCron(expr)
  const t = L[lang] ?? L.fr
  const [mi, ho] = c.raw
  const hs = sorted(c.hour), ms = sorted(c.minute)
  const parts = []
  const stepOf = (s) => s.match(/^\*\/(\d+)$/)?.[1]
  if (ms.length === 1 && hs.length <= 6 && ho !== '*' && !stepOf(ho)) parts.push(`${t.at} ${list(hs.map((h) => `${two(h)}:${two(ms[0])}`), t.and)}`)
  else {
    if (stepOf(ho) && ms.length === 1) parts.push(`${t.everyN(stepOf(ho), 'h')} (:${two(ms[0])})`)
    else {
      parts.push(mi === '*' ? t.everyMinute : stepOf(mi) ? t.everyN(stepOf(mi), 'min') : ms.length === 1 ? t.atMinute(ms[0]) : t.atMinutes(list(ms, t.and)))
      if (stepOf(ho)) parts.push(t.everyN(stepOf(ho), 'h'))
    }
    if (!stepOf(ho) && ho !== '*') parts.push(contiguous(hs) ? t.hourRange(`${two(hs[0])}:00`, `${two(hs[hs.length - 1])}:59`) : t.hourList(list(hs, t.and)))
  }
  if (!c.dowAny) { const d = sorted(c.dow); parts.push(contiguous(d) ? t.dayRange(t.days[d[0]], t.days[d[d.length - 1]]) : t.onDays(d.map((x) => t.days[x]))) }
  if (!c.domAny) parts.push(t.onDom(list(sorted(c.dom).map(String), t.and)))
  if (c.raw[3] !== '*') parts.push(t.inMonths(list(sorted(c.month).map((m) => t.months[m - 1]), t.and)))
  if (c.domAny && c.dowAny && c.raw[3] === '*') parts.push(t.daily)
  const out = parts.join(', ')
  return out.charAt(0).toUpperCase() + out.slice(1)
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2), ['help'])
  usage(`
Usage : node src/cron-explain.mjs "*/15 8-18 * * 1-5" [--count 5] [--lang fr|en] [--from 2026-10-26T09:00:00Z]
Champs : minute heure jour-du-mois mois jour-de-semaine (0 ou 7 = dimanche ; JAN-DEC et SUN-SAT acceptés).
Les prochaines exécutions sont données en UTC.`, args, 1)
  try {
    const from = args.from ? new Date(args.from) : new Date()
    if (Number.isNaN(from.getTime())) fail('--from : date invalide.')
    console.log(explain(args._[0], args.lang === 'en' ? 'en' : 'fr'))
    nextRuns(args._[0], from, Number(args.count ?? 5)).forEach((d) => console.log(`  → ${d.toISOString().replace('T', ' ').slice(0, 16)} UTC`))
  } catch (e) { fail(e.message) }
}
