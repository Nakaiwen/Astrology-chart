import { Temporal } from '@js-temporal/polyfill';
import type { SwissEphemeris } from '@swisseph/browser';
import { ASPECT_ZH, BODY_NAMES, BODY_ZH, DEFAULT_INPUT, getEngine, houseOf, signed, zodiac, type Chart, type Zodiac } from './astrology.ts';

export type PeriodMode = 'monthly' | 'yearly';
export type PeriodRequest = { mode: PeriodMode; year: number; month: number; timezone: string };
export type PeriodRange = { start: string; end_exclusive: string; local_start: string; local_end_exclusive: string; timezone: string };
export type TransitEvent = {
  id: string; transit_body: string; natal_body: string; aspect: string; angle: number;
  start: string; end: string; continues_from_before: boolean; continues_after: boolean;
  exact_times: string[]; closest_time: string; minimum_orb: number;
  position: Zodiac; natal_house?: number; motion: 'direct' | 'retrograde' | 'stationary';
};
export type TransitReport = {
  reading_type: 'transit'; tradition_mode: Chart['tradition_mode']; tone: 'practical'; language: 'zh-TW';
  user_question?: string; chart_data: Chart['chart_data']; natal_metadata: Chart['metadata'];
  transit_data: { mode: PeriodMode; period: PeriodRange; calculated_start: string; orb: number; bodies: string[]; targets: string[]; events: TransitEvent[]; months: { month: number; exact_count: number; active_count: number }[] };
  metadata: { version: string; method: string; warnings: string[] };
};
type Engine = Pick<SwissEphemeris, 'calculatePosition' | 'dateToJulianDay'>;
type Options = { signal?: AbortSignal; onProgress?: (percent: number) => void };
const HOUR = 3600000;
const ORB = 1;
const EPS = 1e-8;
const DEFINITIONS: [string, number][] = [['conjunction', 0], ['sextile', 60], ['square', 90], ['trine', 120], ['opposition', 180]];
export const MONTHLY_BODIES = ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
export const YEARLY_BODIES = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const iso = (ms: number) => new Date(Math.round(ms)).toISOString();
const unique = (values: number[]) => values.sort((a, b) => a - b).filter((t, i, a) => !i || t - a[i - 1] > 500);

export function periodRange(request: PeriodRequest): PeriodRange {
  if (!['monthly', 'yearly'].includes(request.mode) || !Number.isInteger(request.year) || request.year < 1900 || request.year > 2100) throw new Error('請選擇 1900 至 2100 年。');
  if (!Number.isInteger(request.month) || request.month < 1 || request.month > 12) throw new Error('請選擇有效月份。');
  const start = Temporal.PlainDate.from({ year: request.year, month: request.mode === 'monthly' ? request.month : 1, day: 1 });
  const end = start.add(request.mode === 'monthly' ? { months: 1 } : { years: 1 });
  try {
    // IANA midnight rules also handle rare historical transitions at midnight.
    const a = start.toZonedDateTime(request.timezone), b = end.toZonedDateTime(request.timezone);
    return { start: iso(a.epochMilliseconds), end_exclusive: iso(b.epochMilliseconds), local_start: start.toString(), local_end_exclusive: end.toString(), timezone: request.timezone };
  } catch { throw new Error('請輸入有效的觀察時區，例如 Asia/Taipei。'); }
}

export function natalTargets(chart: Chart) {
  const data = chart.chart_data;
  return [
    ...data.placements.filter(p => p.body !== 'True Node' && (chart.metadata.local_time !== null || p.body !== 'Moon')).map(p => ({ body: p.body, longitude: p.absolute_degree })),
    ...(data.ascendant ? [{ body: 'Ascendant', longitude: data.ascendant.absolute_degree }] : []),
    ...(data.midheaven ? [{ body: 'Midheaven', longitude: data.midheaven.absolute_degree }] : []),
  ];
}

/** A six-hour grid plus refined stations partitions longitude into monotonic arcs.
 * Each arc is searched for both orb boundaries and the exact aspect. This preserves
 * near-station contacts and repeated retrograde passes; 180-degree wraps are rejected.
 */
export async function calculateTransitsWithEngine(engine: Engine, natal: Chart, request: PeriodRequest, options: Options = {}): Promise<TransitReport> {
  const period = periodRange(request), requestedStart = Date.parse(period.start), end = Date.parse(period.end_exclusive);
  const start = Math.max(requestedStart, Date.parse(natal.metadata.utc));
  if (start >= end) throw new Error('觀察期間早於出生日期，請選擇出生後的月份或年份。');
  const bodies = request.mode === 'monthly' ? MONTHLY_BODIES : YEARLY_BODIES;
  const targets = natalTargets(natal), events: TransitEvent[] = [];
  const check = () => { if (options.signal?.aborted) throw new DOMException('已取消計算', 'AbortError'); };
  const pause = async () => { check(); await new Promise<void>(resolve => setTimeout(resolve, 0)); check(); };
  const root = (fn: (t: number) => number, a: number, b: number) => {
    let fa = fn(a), fb = fn(b);
    if (Math.abs(fa) < EPS) return a;
    if (Math.abs(fb) < EPS) return b;
    for (let n = 0; n < 50 && b - a > 100; n++) {
      const mid = (a + b) / 2, fm = fn(mid);
      if (Math.abs(fm) < EPS) return mid;
      if (fa * fm <= 0) { b = mid; fb = fm; } else { a = mid; fa = fm; }
    }
    return (a + b) / 2;
  };
  for (let bi = 0; bi < bodies.length; bi++) {
    check();
    const body = bodies[bi], planet = BODY_NAMES.indexOf(body);
    const cache = new Map<number, { lon: number; speed: number }>();
    const position = (time: number) => {
      const ms = Math.round(time), saved = cache.get(ms);
      if (saved) return saved;
      const p = engine.calculatePosition(engine.dateToJulianDay(new Date(ms)), planet, 4 | 256);
      if (!Number.isFinite(p.longitude) || !Number.isFinite(p.longitudeSpeed)) throw new Error('星曆計算未完成，請重新計算。');
      const value = { lon: p.longitude, speed: p.longitudeSpeed }; cache.set(ms, value); return value;
    };
    const grid: number[] = [start];
    for (let t = start + 6 * HOUR; t < end; t += 6 * HOUR) grid.push(t);
    grid.push(end);
    const stations: number[] = [];
    for (let i = 0; i < grid.length - 1; i++) {
      const a = position(grid[i]).speed, b = position(grid[i + 1]).speed;
      if (a * b < 0) stations.push(root(t => position(t).speed, grid[i], grid[i + 1]));
      if (i % 128 === 0) await pause();
    }
    const samples = unique([...grid, ...stations]);
    for (const target of targets) for (const [aspect, angle] of DEFINITIONS) {
      for (const branch of angle === 0 || angle === 180 ? [angle] : [angle, -angle]) {
        const delta = (t: number) => signed(position(t).lon - target.longitude - branch);
        const exact: number[] = [], cuts: number[] = [start, end];
        for (let i = 0; i < samples.length - 1; i++) {
          const a = samples[i], b = samples[i + 1], da = delta(a), db = delta(b);
          if (Math.abs(da - db) > 180) continue;
          for (const level of [-ORB, 0, ORB]) {
            if ((da - level) * (db - level) <= 0 || Math.abs(da - level) < EPS || Math.abs(db - level) < EPS) {
              const t = root(t => delta(t) - level, a, b);
              if (level === 0) exact.push(t); else cuts.push(t);
            }
          }
        }
        const boundaries = unique(cuts), windows: { a: number; b: number }[] = [];
        for (let i = 0; i < boundaries.length - 1; i++) {
          const a = boundaries[i], b = boundaries[i + 1];
          if (Math.abs(delta((a + b) / 2)) > ORB + EPS) continue;
          const last = windows.at(-1);
          if (last && Math.abs(last.b - a) <= 500) last.b = b; else windows.push({ a, b });
        }
        for (const { a, b } of windows) {
          const hits = unique(exact).filter(t => t >= a - 100 && t <= b + 100 && t >= start && t < end);
          const candidates = hits.length ? hits : [a, Math.min(b, end - 1), ...stations.filter(t => t >= a && t < b)];
          const closest = candidates.reduce((best, t) => Math.abs(delta(t)) < Math.abs(delta(best)) ? t : best);
          const p = position(closest), cusps = natal.chart_data.house_cusps?.map(h => h.absolute_degree);
          events.push({
            id: `${body}-${target.body}-${aspect}-${branch}-${Math.round(a)}`,
            transit_body: body, natal_body: target.body, aspect, angle,
            start: iso(a), end: iso(b),
            continues_from_before: a === start && Math.abs(delta(start - 1000)) <= ORB,
            continues_after: b === end && Math.abs(delta(end)) <= ORB,
            exact_times: hits.map(iso), closest_time: iso(closest), minimum_orb: Math.abs(delta(closest)),
            position: zodiac(p.lon), ...(cusps ? { natal_house: houseOf(p.lon, cusps) } : {}),
            motion: Math.abs(p.speed) < .0001 ? 'stationary' : p.speed < 0 ? 'retrograde' : 'direct',
          });
        }
      }
    }
    options.onProgress?.(Math.round((bi + 1) / bodies.length * 100));
    await pause();
  }
  events.sort((a, b) => a.closest_time.localeCompare(b.closest_time) || a.id.localeCompare(b.id));
  const months = (request.mode === 'yearly' ? Array.from({ length: 12 }, (_, i) => i + 1) : [request.month]).map(month => {
    const r = periodRange({ ...request, mode: 'monthly', month }), a = Date.parse(r.start), b = Date.parse(r.end_exclusive);
    return { month, exact_count: events.reduce((n, e) => n + e.exact_times.filter(t => Date.parse(t) >= a && Date.parse(t) < b).length, 0), active_count: events.filter(e => Date.parse(e.start) < b && Date.parse(e.end) > a).length };
  });
  const warnings = [...natal.metadata.warnings];
  if (natal.metadata.local_time === null) warnings.push('月運／年運排除本命月亮、上升、天頂及宮位；其他本命行星仍以正午估算，精確相位日期可能因出生時刻而變動。');
  if (start > requestedStart) warnings.push('觀察期間包含出生前日期，僅計算出生時刻以後。');
  return {
    reading_type: 'transit', tradition_mode: natal.tradition_mode, tone: 'practical', language: 'zh-TW', user_question: natal.user_question === DEFAULT_INPUT.question ? `請白話解讀這段${request.mode === 'monthly' ? '月運' : '年運'}的主要生活主題與可行建議。` : natal.user_question,
    chart_data: natal.chart_data, natal_metadata: natal.metadata,
    transit_data: { mode: request.mode, period, calculated_start: iso(start), orb: ORB, bodies: [...bodies], targets: targets.map(t => t.body), events, months },
    metadata: { version: '1.1.0', method: 'Swiss Ephemeris / Moshier; tropical geocentric ecliptic longitude. Calendar period in observation timezone; end exclusive. Major transits to fixed natal positions; 1° orb. Six-hour grid with refined stations, orb-boundary and exact-angle roots (100 ms numerical bracket). Report dates are displayed to the minute, not a claim of birth-time accuracy. No lunar transits, returns, progressions or profections.', warnings },
  };
}
export async function calculateTransits(natal: Chart, request: PeriodRequest, options: Options = {}) {
  return calculateTransitsWithEngine(await getEngine(), natal, request, options);
}
export function eventTitle(e: TransitEvent) { return `行運${BODY_ZH[e.transit_body]} ${ASPECT_ZH[e.aspect]} 本命${BODY_ZH[e.natal_body]}`; }
const DOMAINS: Record<string, string> = { Sun: '自我方向與目標', Moon: '情緒、安全感與生活節奏', Mercury: '學習、思考與表達', Venus: '關係、喜好與價值選擇', Mars: '行動、競爭與精力分配', Jupiter: '學習視野與成長規劃', Saturn: '責任、紀律與長期安排', Uranus: '自主性與改變方式', Neptune: '理想、想像與界線', Pluto: '深層習慣與掌控感', Ascendant: '自我呈現與生活步調', Midheaven: '工作方向與公開角色' };
const ACTIONS: Record<string, string> = { Sun: '把注意力放回當下最想完成的事', Mercury: '整理資訊、反覆演練並確認溝通', Venus: '調整合作方式與自己的優先順序', Mars: '把動力拆成可以持續執行的小步驟', Jupiter: '探索成長機會，同時確認可投入的時間', Saturn: '建立規律、縮小範圍，讓計畫更可持續', Uranus: '嘗試小幅調整，保留選擇與彈性', Neptune: '記錄靈感，並用具體資訊核對期待', Pluto: '辨認反覆出現的習慣，逐步調整自己的反應' };
export function eventGuidance(e: TransitEvent) {
  const tone = e.aspect === 'square' || e.aspect === 'opposition' ? '可留意不同需求之間的拉扯，先排出優先順序。' : e.aspect === 'conjunction' ? '這個主題可能較容易進入注意範圍，適合主動觀察。' : '可把這段時間當作練習與整合的提醒，成果仍需要實際投入。';
  return `以占星象徵來看，這組相位對應${DOMAINS[e.natal_body]}。${tone}可試著${ACTIONS[e.transit_body]}。`;
}
export function primaryEvents(events: TransitEvent[], count = 3) {
  const rank = (e: TransitEvent) => (YEARLY_BODIES.includes(e.transit_body) ? 10 : 0) + (['Sun', 'Moon', 'Ascendant', 'Midheaven'].includes(e.natal_body) ? 4 : 0) + (e.exact_times.length ? 2 : 0) - e.minimum_orb;
  const seen = new Set<string>();
  return [...events].sort((a, b) => rank(b) - rank(a) || a.closest_time.localeCompare(b.closest_time)).filter(e => { const key = `${e.transit_body}-${e.natal_body}-${e.aspect}`; if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, count);
}
export function transitPrompt(report: TransitReport) {
  const mode = report.transit_data.mode === 'monthly' ? '月運' : '年運';
  return `請依下方本命與行運資料，以繁體中文、白話解讀${mode}。先說三個重點，再依時間順序整理主題、機會、壓力與可行建議。這是公曆行運${mode}，不是月亮／太陽回歸盤。只引用資料內計算的相位與日期，尊重出生時間的不確定性；跨期相位及逆行重複精確時刻請分清楚。沒有精確相位不代表沒有影響，相位數量不代表吉凶。請將占星象徵與實際生活事實分開，不保證事件、考試結果或健康與投資結果。若資料不足請明說。\n\n${JSON.stringify(report, null, 2)}`;
}
