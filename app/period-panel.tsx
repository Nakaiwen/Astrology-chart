import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, ChevronDown, Copy, FileJson, Info, LoaderCircle, Printer, Sparkles, X } from 'lucide-react';
import { BODY_ZH, ASPECT_COLORS, formatPosition, type Chart, type FormInput } from '../lib/astrology';
import { calculateTransits, eventGuidance, eventTitle, periodRange, primaryEvents, transitPrompt, type PeriodMode, type TransitEvent, type TransitReport } from '../lib/transits';

type Props = { mode: PeriodMode; form: FormInput; natal: Chart | null; natalBusy: boolean; calculateNatal: () => Promise<Chart | null> };
const ZONES = ['Asia/Taipei', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];
const localNow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
const INITIAL_YEAR = localNow.find(p => p.type === 'year')!.value;
const INITIAL_MONTH = Number(localNow.find(p => p.type === 'month')!.value);
function download(report: TransitReport) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${report.transit_data.mode === 'monthly' ? 'monthly' : 'yearly'}_${report.transit_data.period.local_start.slice(0, report.transit_data.mode === 'monthly' ? 7 : 4)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export default function PeriodPanel({ mode, form, natal, natalBusy, calculateNatal }: Props) {
  const [year, setYear] = useState(INITIAL_YEAR), [month, setMonth] = useState(INITIAL_MONTH), [timezone, setTimezone] = useState('Asia/Taipei');
  const [report, setReport] = useState<TransitReport | null>(null), [resultKey, setResultKey] = useState('');
  const [running, setRunning] = useState(false), [progress, setProgress] = useState(0), [error, setError] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | null>(null), [copied, setCopied] = useState(false), [fallback, setFallback] = useState(false);
  const controller = useRef<AbortController | null>(null), dialog = useRef<HTMLDialogElement>(null);
  const key = JSON.stringify({ mode, year, month: mode === 'monthly' ? month : null, timezone, form });
  const currentKey = useRef(key); currentKey.current = key;
  const dirty = !!report && key !== resultKey;
  const label = mode === 'monthly' ? '月運' : '年運';
  useEffect(() => {
    controller.current?.abort(); setRunning(false); setError(''); setFilterMonth(null); setFallback(false); setCopied(false);
    return () => controller.current?.abort();
  }, [key]);
  useEffect(() => { if (fallback) dialog.current?.showModal(); else dialog.current?.close(); }, [fallback]);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 4000); return () => clearTimeout(t); }, [copied]);
  async function run() {
    controller.current?.abort(); const task = new AbortController(); controller.current = task;
    const request = { mode, year: Number(year), month, timezone: timezone.trim() };
    setError(''); setRunning(true); setProgress(0); setCopied(false); setFilterMonth(null);
    try {
      periodRange(request);
      const updated = await calculateNatal();
      if (!updated) throw new Error('請先修正左側出生資料，再計算行運。');
      if (task.signal.aborted) return;
      const result = await calculateTransits(updated, request, { signal: task.signal, onProgress: setProgress });
      if (task.signal.aborted || currentKey.current !== key) return;
      setReport(result); setResultKey(key);
    } catch (e) {
      if (!task.signal.aborted) setError(e instanceof Error ? e.message : '計算未完成，請再試一次。');
    } finally { if (controller.current === task) setRunning(false); }
  }
  async function copy() {
    if (!report || dirty || running) return;
    try { await navigator.clipboard.writeText(transitPrompt(report)); setCopied(true); } catch { setFallback(true); }
  }
  const date = (iso: string, withTime = false) => new Intl.DateTimeFormat('zh-TW', { timeZone: report?.transit_data.period.timezone ?? 'Asia/Taipei', month: 'numeric', day: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}) }).format(new Date(iso));
  const themes = useMemo(() => primaryEvents(report?.transit_data.events ?? []), [report]);
  const filtered = useMemo(() => {
    if (!report) return [];
    if (filterMonth === null) return report.transit_data.events;
    const range = periodRange({ mode: 'monthly', year: Number(report.transit_data.period.local_start.slice(0, 4)), month: filterMonth, timezone: report.transit_data.period.timezone });
    return report.transit_data.events.filter(e => e.start < range.end_exclusive && e.end > range.start);
  }, [report, filterMonth]);
  const usable = !!report && !dirty && !running;
  const title = report ? `${report.transit_data.period.local_start.slice(0, 4)} 年${report.transit_data.mode === 'monthly' ? ` ${Number(report.transit_data.period.local_start.slice(5, 7))} 月` : ''}` : '';
  function windowText(e: TransitEvent) {
    const first = e.continues_from_before ? '期初已在影響範圍' : date(e.start, true);
    const last = e.continues_after ? '延續至期末以後' : date(e.end, true);
    return `${first} — ${last}`;
  }
  return <div className={`period-panel${dirty ? ' period-stale' : ''}`}>
    <div className="period-controls chart-card">
      <div className="period-heading"><div><p className="eyebrow">{mode === 'monthly' ? 'YOUR MONTH IN MOTION' : 'A YEAR OF PERSPECTIVE'}</p><h2>行運{label}<span>{mode === 'monthly' ? '看見這個月的節奏' : '把目光放回長期方向'}</span></h2></div><CalendarDays size={25} strokeWidth={1.2}/></div>
      <p className="period-intro">{mode === 'monthly' ? '對照當月行星與你的本命盤，整理值得留意的時間與主題。' : '以木星至冥王星的慢行星，整理一整年的長期主題與十二個月的變化。'}</p>
      <form onSubmit={e => { e.preventDefault(); void run(); }}>
        <div className="period-fields"><label className="field">觀察年份<input aria-label="觀察年份" type="number" min="1900" max="2100" step="1" value={year} required onChange={e => setYear(e.target.value)}/></label>
          {mode === 'monthly' && <label className="field">月份<select aria-label="觀察月份" value={month} onChange={e => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{i + 1} 月</option>)}</select></label>}
          <label className="field period-zone">日期顯示時區<input aria-label="日期顯示時區" value={timezone} list="observation-zones" required onChange={e => setTimezone(e.target.value)} spellCheck={false}/><datalist id="observation-zones">{ZONES.map(z => <option key={z} value={z}/>)}</datalist></label>
        </div>
        <div className="period-action"><button type="submit" className="primary" disabled={running || natalBusy}>{running ? <LoaderCircle size={16} className="spin"/> : <Sparkles size={16}/>} {running ? `計算中 ${progress}%` : `計算${label}`} {!running && <ArrowUpRight size={15}/>}</button><p>會套用左側最新出生資料。<br/>{mode === 'monthly' ? '依公曆月份計算' : '依公曆 1 月至 12 月計算'}，日期採上方時區。</p>{running && <button type="button" className="text-button" onClick={() => { controller.current?.abort(); setRunning(false); }}>取消計算</button>}</div>
      </form>
      {running && <div className="period-progress" role="progressbar" aria-label="行運計算進度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div>}
      {error && <p className="error-box" role="alert"><Info size={15}/>{error}</p>}
    </div>
    {dirty && <div className="period-dirty" role="status"><Info size={16}/><span>出生資料或觀察期間已改變，下方是上次結果。請按「計算{label}」更新。</span></div>}
    {report ? <div className="period-results" aria-busy={running}>
      <div className="period-result-heading"><div><p className="eyebrow">{report.natal_metadata.name} · {report.natal_metadata.local_date}</p><h2>{title} <span>{report.transit_data.mode === 'monthly' ? '月運重點' : '年運重點'}</span></h2><p>{report.transit_data.period.timezone} · 主要相位容許度 1°</p></div><span className="system-pill">{report.transit_data.events.length} 段相位期間</span></div>
      <p className="period-context">以下是依相位規則整理的象徵提示。可複製完整資料，配合你的實際近況深入解讀。</p>
      <div className="theme-grid">{themes.map((event, i) => <article className="theme-card" key={event.id}><div className="theme-top"><span>0{i + 1}</span><small>{event.exact_times.length ? `精確相位 ${date(event.closest_time)}` : `期間內最接近 ${date(event.closest_time)}`}</small></div><h3>{eventTitle(event)}</h3><p>{eventGuidance(event)}</p>{event.natal_house && <div className="theme-house">行運星體於上述時刻落入本命第 {event.natal_house} 宮</div>}</article>)}</div>
      {!themes.length && <div className="empty-data"><CalendarDays size={26}/><h3>這段期間沒有符合 1° 容許度的相位</h3><p>這不代表沒有生活變化；本頁只列出設定範圍內的行運。</p></div>}
      <div className="period-export"><button className="primary" disabled={!usable} onClick={copy}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? '已複製' : `複製${report.transit_data.mode === 'monthly' ? '月運' : '年運'}解盤資料`}</button><button className="secondary" disabled={!usable} onClick={() => download(report)}><FileJson size={15}/>下載 JSON</button><button className="secondary" disabled={!usable} onClick={() => window.print()}><Printer size={15}/>列印／PDF</button></div>
      {report.transit_data.mode === 'yearly' && <section className="year-overview data-card"><div className="period-section-title"><h3>十二個月，一眼掌握</h3><span>點選月份篩選時間表</span></div><p className="period-section-note">數字是慢行星相位次數，並非運勢分數；同一相位可能跨月延續。</p><div className="month-grid">{report.transit_data.months.map(item => <button key={item.month} aria-pressed={filterMonth === item.month} onClick={() => setFilterMonth(filterMonth === item.month ? null : item.month)}><span>{String(item.month).padStart(2, '0')}<small>月</small></span><strong>{item.exact_count}<small> 次精確相位</small></strong><p>{item.active_count} 段影響期間</p></button>)}</div></section>}
      <section className="transit-timeline data-card"><div className="period-section-title"><h3>{filterMonth === null ? '相位時間表' : `${filterMonth} 月相位時間表`}</h3>{filterMonth !== null ? <button className="text-button" onClick={() => setFilterMonth(null)}>顯示全年 <X size={13}/></button> : <span>依期間內最接近時刻排列</span>}</div><p className="period-section-note">期間為進入與離開 1° 容許度的範圍。{filterMonth !== null && '跨月相位保留完整日期。'}精確時刻用於核對星曆，不代表事件會在該分鐘發生。</p>
        <div className="event-list">{filtered.map(event => <article className="event-row" key={event.id}><div className="event-date"><strong>{date(event.closest_time)}</strong><span>{event.exact_times.length ? '精確相位' : '最接近'}</span></div><div className="event-info"><h4><i style={{ background: ASPECT_COLORS[event.aspect] }}/>{eventTitle(event)}</h4><p className="event-window">{windowText(event)}</p><p className="event-meta">{event.exact_times.length ? `精確：${event.exact_times.map(t => date(t, true)).join('、')}` : `本期無精確相位 · 最小容許度 ${event.minimum_orb.toFixed(3)}°`}</p><details><summary>查看提示與位置 <ChevronDown size={12}/></summary><p>{eventGuidance(event)}</p><p className="event-meta">最接近時：{BODY_ZH[event.transit_body]} {formatPosition(event.position)} · {event.motion === 'retrograde' ? '逆行' : event.motion === 'stationary' ? '留' : '順行'}{event.natal_house ? ` · 本命第 ${event.natal_house} 宮` : ''}</p></details></div></article>)}{!filtered.length && <p className="empty-events">這個月份沒有符合設定的相位。</p>}</div>
      </section>
      <div className="calculation-note period-method"><Info size={16}/><div><p><strong>計算範圍</strong>{report.transit_data.bodies.map(b => BODY_ZH[b]).join('、')}對本命星體{report.natal_metadata.local_time === null ? '（排除月亮）' : '、上升與天頂'}的合相、六合、四分、三分、對分。</p><p>使用 Swiss Ephemeris / Moshier。每 6 小時掃描並細化行星轉向、精確相位與容許度邊界；逆行的重複相位保留列出。</p><p>這是行運{report.transit_data.mode === 'monthly' ? '月運' : '年運'}，未計算行運月亮、交點、推運、年限法或日月回歸。年運以慢行星為主，細看單月請切換月運。</p><p>重點優先整理慢行星、日月與軸點、精確相位，屬於閱讀排序，不是吉凶評分。</p>{report.metadata.warnings.map((w, i) => <p key={i} className="warning-text">{w}</p>)}<p>占星提示用於自我觀察，不保證特定事件發生。</p></div></div>
    </div> : <div className="period-empty"><CalendarDays size={40} strokeWidth={1}/><h3>先選一段時間，讓星圖往前走。</h3><p>{natal ? `沿用「${natal.metadata.name}」的出生資料，` : '確認左側出生資料，'}選擇年份{mode === 'monthly' ? '與月份' : ''}後，按「計算{label}」。</p><p>{mode === 'monthly' ? '月運會保留快行星與慢行星的變化。' : '年運會整理長期主題、十二個月概覽及完整時間表。'}</p></div>}
    <dialog ref={dialog} className="modal" onCancel={() => setFallback(false)} onClick={e => { if (e.target === e.currentTarget) setFallback(false); }}><button className="modal-close" aria-label="關閉複製視窗" onClick={() => setFallback(false)}><X size={20}/></button><div className="help-content"><h2>手動複製解盤資料</h2><p>瀏覽器未允許直接複製，請選取下方內容後複製。</p><textarea aria-label="行運解盤資料" className="copy-fallback" readOnly value={report ? transitPrompt(report) : ''} onFocus={e => e.target.select()}/></div></dialog>
  </div>;
}
