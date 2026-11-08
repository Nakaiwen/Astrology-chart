import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SwissEphemeris } from '@swisseph/browser';
import { calculateWithEngine, DEFAULT_INPUT, normalize, signed, type Chart } from '../lib/astrology.ts';
import { calculateTransitsWithEngine, natalTargets, periodRange, transitPrompt, type PeriodRequest } from '../lib/transits.ts';
const swe = new SwissEphemeris();
await swe.init('data:application/wasm;base64,' + readFileSync('node_modules/@swisseph/browser/dist/swisseph.wasm').toString('base64'));
const natal = calculateWithEngine(swe, DEFAULT_INPUT);
let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) { await fn(); console.log(`PASS ${name}`); passed++; }
const req: PeriodRequest = { mode: 'monthly', year: 2026, month: 1, timezone: 'UTC' };
const day = 86400000, epoch = Date.UTC(2026, 0, 1);
const simple: Chart = structuredClone(natal);
simple.chart_data.placements = [{ ...simple.chart_data.placements[0], absolute_degree: 0, degree: 0, sign: 'Aries' }];
delete simple.chart_data.ascendant; delete simple.chart_data.midheaven; delete simple.chart_data.house_cusps;
function fake(fn: (t: number) => { longitude: number; longitudeSpeed: number }) {
  return { dateToJulianDay: (d: Date) => (d.getTime() - epoch) / day, calculatePosition: (t: number, planet: number) => ({ latitude: 0, distance: 1, latitudeSpeed: 0, distanceSpeed: 0, ...(planet === 0 ? fn(t) : { longitude: 27, longitudeSpeed: 0 }) }) } as unknown as Parameters<typeof calculateTransitsWithEngine>[0];
}
await test('calendar leap month, DST and annual end-exclusive bounds', () => {
  const leap = periodRange({ ...req, year: 2024, month: 2, timezone: 'Asia/Taipei' });
  assert.equal((Date.parse(leap.end_exclusive) - Date.parse(leap.start)) / day, 29);
  const dst = periodRange({ ...req, month: 3, timezone: 'America/New_York' });
  assert.equal((Date.parse(dst.end_exclusive) - Date.parse(dst.start)) / 3600000, 31 * 24 - 1);
  const year = periodRange({ ...req, mode: 'yearly', year: 2100, timezone: 'Asia/Taipei' });
  assert.equal(year.end_exclusive, '2100-12-31T16:00:00.000Z');
  assert.throws(() => periodRange({ ...req, timezone: 'not-a-zone' }));
  assert.throws(() => periodRange({ ...req, month: 13 }));
});
await test('0-degree wrap has one conjunction, no false opposition', async () => {
  const r = await calculateTransitsWithEngine(fake(t => ({ longitude: normalize(359 + t), longitudeSpeed: 1 })), simple, req);
  const es = r.transit_data.events.filter(e => e.transit_body === 'Sun');
  assert.equal(es.length, 1); assert.equal(es[0].aspect, 'conjunction');
  assert.ok(Math.abs(Date.parse(es[0].exact_times[0]) - epoch - day) < 200);
  assert.equal(es[0].continues_from_before, false);
});
await test('retrograde loop preserves three exact passes within one orb window', async () => {
  const r = await calculateTransitsWithEngine(fake(t => ({ longitude: normalize((t - 4) * (t - 8) * (t - 12) * .005), longitudeSpeed: (3 * t * t - 48 * t + 176) * .005 })), simple, req);
  const es = r.transit_data.events.filter(e => e.transit_body === 'Sun' && e.aspect === 'conjunction');
  const hits = es.flatMap(e => e.exact_times).map(t => (Date.parse(t) - epoch) / day);
  assert.equal(es.length, 1); assert.equal(hits.length, 3);
  [4, 8, 12].forEach((t, i) => assert.ok(Math.abs(hits[i] - t) < .000003));
});
await test('short contact around a station between six-hour samples is retained', async () => {
  const r = await calculateTransitsWithEngine(fake(t => ({ longitude: normalize(.999 + (t - 8.123) ** 2), longitudeSpeed: 2 * (t - 8.123) })), simple, req);
  const e = r.transit_data.events.find(e => e.transit_body === 'Sun' && e.aspect === 'conjunction' && Math.abs((Date.parse(e.closest_time) - epoch) / day - 8.123) < .001)!;
  assert.ok(e); assert.equal(e.exact_times.length, 0); assert.ok(Math.abs(e.minimum_orb - .999) < 1e-6);
  assert.ok(Date.parse(e.end) - Date.parse(e.start) < 2 * 3600000);
});
await test('ongoing slow transit without an exact hit is not discarded', async () => {
  const r = await calculateTransitsWithEngine(fake(t => ({ longitude: .5 + t * .001, longitudeSpeed: .001 })), simple, req);
  const e = r.transit_data.events.find(e => e.transit_body === 'Sun')!;
  assert.equal(e.exact_times.length, 0); assert.equal(e.continues_from_before, true); assert.equal(e.continues_after, true);
  assert.ok(e.minimum_orb >= .49999 && e.minimum_orb <= .50001);
});
await test('exact aspect at next-month boundary belongs only to next month', async () => {
  const r = await calculateTransitsWithEngine(fake(t => ({ longitude: normalize(t - 31), longitudeSpeed: 1 })), simple, req);
  const e = r.transit_data.events.find(e => e.transit_body === 'Sun' && e.aspect === 'conjunction')!;
  assert.equal(e.exact_times.length, 0); assert.ok(e.closest_time < r.transit_data.period.end_exclusive);
  const next = await calculateTransitsWithEngine(fake(t => ({ longitude: normalize(t - 31), longitudeSpeed: 1 })), simple, { ...req, month: 2 });
  assert.equal(next.transit_data.events.find(e => e.transit_body === 'Sun')!.exact_times[0], '2026-02-01T00:00:00.000Z');
});
await test('unknown birth time omits Moon, axes and houses from transit interpretation', async () => {
  const untimed = calculateWithEngine(swe, { ...DEFAULT_INPUT, unknownTime: true });
  assert.ok(natalTargets(untimed).every(t => !['Moon', 'Ascendant', 'Midheaven'].includes(t.body)));
  const r = await calculateTransitsWithEngine(swe, untimed, req);
  assert.ok(r.transit_data.events.every(e => e.natal_house === undefined && e.natal_body !== 'Moon'));
  assert.ok(r.metadata.warnings.some(w => w.includes('排除本命月亮')));
});
await test('real yearly ephemeris roots, complete month counts and export context', async () => {
  const r = await calculateTransitsWithEngine(swe, natal, { ...req, mode: 'yearly', timezone: 'Asia/Taipei' });
  assert.equal(r.transit_data.bodies.length, 5); assert.equal(r.transit_data.months.length, 12);
  const hits = r.transit_data.events.flatMap(e => e.exact_times);
  assert.ok(hits.length > 10);
  assert.equal(r.transit_data.months.reduce((n, m) => n + m.exact_count, 0), hits.length);
  const targets = natalTargets(natal);
  for (const e of r.transit_data.events) for (const t of e.exact_times) {
    const index = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].indexOf(e.transit_body);
    const p = swe.calculatePosition(swe.dateToJulianDay(new Date(t)), index, 260);
    const target = targets.find(t => t.body === e.natal_body)!;
    assert.ok(Math.abs(Math.abs(signed(p.longitude - target.longitude)) - e.angle) < 2e-6, `${e.id} residual`);
    assert.ok(t >= r.transit_data.period.start && t < r.transit_data.period.end_exclusive);
  }
  assert.ok(transitPrompt(r).includes('不是月亮／太陽回歸盤'));
  assert.deepEqual(r.chart_data, natal.chart_data);
  console.log(`  Real annual report: ${r.transit_data.events.length} windows, ${hits.length} exact passes`);
});
await test('cancellation and pre-birth requests do not produce reports', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(calculateTransitsWithEngine(swe, natal, req, { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(calculateTransitsWithEngine(swe, natal, { ...req, year: 1990 }), /早於出生/);
});
console.log(`${passed} transit checks passed.`);
swe.close();
