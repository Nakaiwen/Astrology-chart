"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Compass, Copy, FileJson, Info, LoaderCircle, MapPin, Maximize2, Moon, RotateCcw, ShieldCheck, Sparkles, Sun, X } from 'lucide-react';
import { ASPECT_COLORS, ASPECT_ZH, BODY_GLYPHS, BODY_ZH, calculateChart, type Chart, DEFAULT_INPUT, DIGNITY_ZH, type FormInput, formatPosition, readingPrompt } from '@/lib/astrology';
import { CITIES } from '@/lib/cities';
import { wheelSvg } from '@/lib/chart-svg';
import PeriodPanel from './period-panel';
type Tab = 'placements'|'houses'|'aspects'|'json';
const HOUSE_LABELS = {Placidus:'普拉西德宮制', 'Whole Sign':'整宮制', Equal:'等宮制'};
function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export default function Home(){
 const [view,setView]=useState<'natal'|'monthly'|'yearly'>('natal');
 const [form,setForm]=useState<FormInput>({...DEFAULT_INPUT}),[city,setCity]=useState('taipei');
 const [chart,setChart]=useState<Chart|null>(null),[snapshot,setSnapshot]=useState('');
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState<string|null>(null),[tab,setTab]=useState<Tab>('placements');
 const [help,setHelp]=useState(false),[zoom,setZoom]=useState(false),[copyFallback,setCopyFallback]=useState(false),[pngBusy,setPngBusy]=useState(false);
 const initial=useRef(false),dialog=useRef<HTMLDialogElement>(null);
 const dirty=!!chart&&snapshot!==JSON.stringify(form);
 const svg=useMemo(()=>chart?wheelSvg(chart,selected):'',[chart,selected]);
 const set=<K extends keyof FormInput>(key:K,value:FormInput[K])=>setForm(f=>({...f,[key]:value}));
 async function calculate(input:FormInput){setBusy(true);setError('');setNotice('');try{const result=await calculateChart(input);setChart(result);setSnapshot(JSON.stringify(input));setSelected(null);return result;}catch(e){setError(e instanceof Error?e.message:'排盤未完成，請檢查資料後再試。');return null;}finally{setBusy(false);}}
 useEffect(()=>{if(initial.current)return;initial.current=true;void calculate(DEFAULT_INPUT);},[]);
 useEffect(()=>{if(help||zoom||copyFallback){dialog.current?.showModal();}else dialog.current?.close();},[help,zoom,copyFallback]);
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t);},[notice]);
 function changeCity(id:string){setCity(id);const c=CITIES.find(c=>c.id===id);if(c)setForm(f=>({...f,place:c.name,latitude:String(c.lat),longitude:String(c.lon),timezone:c.tz}));}
 function example(){const input={...DEFAULT_INPUT};setForm(input);setCity('taipei');void calculate(input);}
 function closeDialog(){setHelp(false);setZoom(false);setCopyFallback(false);}
 function wheelClick(e:React.MouseEvent<HTMLDivElement>){const body=(e.target as Element).closest('[data-body]')?.getAttribute('data-body');if(body)setSelected(s=>s===body?null:body);}
 function exportJson(){if(!chart||dirty)return;saveBlob(new Blob([JSON.stringify(chart,null,2)],{type:'application/json;charset=utf-8'}),`natal_${chart.metadata.local_date}.json`);setNotice('JSON 已準備下載，可交給解盤技能使用。');}
 async function copyReading(){if(!chart||dirty)return;try{await navigator.clipboard.writeText(readingPrompt(chart));setNotice('已複製解盤資料，貼到 AI 對話即可。');}catch{setCopyFallback(true);}}
 async function exportPng(){if(!chart||dirty)return;setPngBusy(true);try{const source=wheelSvg(chart,null,true),url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();await new Promise<void>((ok,no)=>{img.onload=()=>ok();img.onerror=()=>no(new Error('圖片轉換失敗'));img.src=url;});const canvas=document.createElement('canvas');canvas.width=2160;canvas.height=2160;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('瀏覽器無法建立圖片');ctx.drawImage(img,0,0,2160,2160);const blob=await new Promise<Blob|null>(ok=>canvas.toBlob(ok,'image/png'));if(!blob)throw new Error('圖片輸出失敗');saveBlob(blob,`natal_${chart.metadata.local_date}.png`);setNotice('2160 × 2160 星盤圖片已準備下載。');}finally{URL.revokeObjectURL(url);}}catch(e){setNotice(e instanceof Error?e.message:'圖片輸出失敗，請再試一次。');}finally{setPngBusy(false);}}
 const disabled=busy||dirty||!chart,focused=chart?.chart_data.placements.find(p=>p.body===selected);
 return <>
  <header className="topbar"><div className="bar-inner"><a className="brand" href="#" aria-label="星圖室首頁"><span className="brand-mark"><Compass size={27} strokeWidth={1.1}/></span><span>星圖室<small>NATAL ATELIER</small></span></a><nav aria-label="排盤模式">{([['natal','本命盤'],['monthly','月運'],['yearly','年運']] as const).map(([id,label])=><button key={id} className={view===id?'nav-active':''} aria-current={view===id?'page':undefined} onClick={()=>setView(id)}>{label}</button>)}<button onClick={()=>setHelp(true)}>使用方式 <ArrowUpRight size={14}/></button></nav><span className="header-caption">A MOMENT, A CONSTELLATION.</span></div></header>
  <main>
   <section className="intro"><div><p className="eyebrow"><span/> YOUR PERSONAL SKY</p><h1>從出生那一刻，<em>讀懂你的星圖。</em></h1><p className="intro-description">從本命星盤到月運與年運，整理你的特質，也看見不同時期的生活主題。</p></div><div className="intro-note"><span>01 — NATAL CHART</span><p>一張星圖，<br/>一份探索自己的座標。</p><Sparkles size={28} strokeWidth={1}/></div></section>
   <div className="workspace">
    <aside className="input-column">
     <form className="form-card" onSubmit={e=>{e.preventDefault();void calculate({...form});}}>
      <div className="section-title"><div><span className="section-no">01</span><h2>出生資料</h2></div><button type="button" className="text-button" onClick={example} disabled={busy} title="載入 2000 年 1 月 1 日中午 12:00 的示範資料"><RotateCcw size={13}/> 載入範例</button></div>
      <label className="field">星盤名稱 <span className="optional">選填</span><input value={form.name} maxLength={40} onChange={e=>set('name',e.target.value)} placeholder="為這張星盤取個名字"/></label>
      <label className="field">出生日期<input type="date" value={form.date} min="1900-01-01" max="2100-12-31" onChange={e=>set('date',e.target.value)} required/></label>
      <label className="field">出生時間 <span className="optional">出生地當地時間</span><input type="time" value={form.time} onChange={e=>set('time',e.target.value)} disabled={form.unknownTime} required={!form.unknownTime}/></label>
      <label className="check-row"><input type="checkbox" checked={form.unknownTime} onChange={e=>set('unknownTime',e.target.checked)}/>出生時間不確定</label>
      {form.unknownTime&&<p className="field-note warning-text">以正午估算行星位置，不計算上升與宮位。月亮與相關相位僅供參考。</p>}
      <label className="field">出生地點<div className="select-wrap"><select value={city} onChange={e=>changeCity(e.target.value)}>{CITIES.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}<option value="custom">其他地點／自行輸入</option></select><ChevronDown size={14}/></div></label>
      {city==='custom'&&<div className="custom-place"><label className="field">地點名稱<input value={form.place} onChange={e=>set('place',e.target.value)} placeholder="例如：台灣・南投"/></label><Coordinates form={form} update={set}/></div>}
      <p className="place-note"><MapPin size={12}/>{Math.abs(Number(form.latitude))}° {Number(form.latitude)<0?'S':'N'} · {Math.abs(Number(form.longitude))}° {Number(form.longitude)<0?'W':'E'}<span>{form.timezone}</span></p>
      <label className="field">宮位系統<div className="select-wrap"><select value={form.houseSystem} onChange={e=>set('houseSystem',e.target.value as FormInput['houseSystem'])}><option value="Placidus">普拉西德宮制 · Placidus</option><option value="Whole Sign">整宮制 · Whole Sign</option><option value="Equal">等宮制 · Equal</option></select><ChevronDown size={14}/></div></label>
      <details className="advanced"><summary>進階設定 <ChevronDown size={14}/></summary><div>
       {city!=='custom'&&<Coordinates form={form} update={set}/>}
       <label className="field">相位容許度<select value={form.orb} onChange={e=>set('orb',e.target.value as FormInput['orb'])}><option value="focused">精簡 · 主要 6°／六合 4°</option><option value="standard">寬容 · 依行星設定</option></select></label>
       <label className="field">解讀取向<select value={form.tradition} onChange={e=>set('tradition',e.target.value as FormInput['tradition'])}><option value="blended">古典與現代綜合</option><option value="classical">古典占星</option><option value="modern">現代占星</option></select></label>
       <label className="field">夏令時間重複時刻<select value={form.disambiguation} onChange={e=>set('disambiguation',e.target.value as FormInput['disambiguation'])}><option value="reject">遇到重複時刻先提醒我</option><option value="earlier">使用較早出現的一次</option><option value="later">使用較晚出現的一次</option></select></label>
       <p className="field-note">以出生地時區的歷史規則換算夏令時間。預設使用回歸黃道與地心位置。</p>
      </div></details>
      <details className="advanced question"><summary>想了解的主題 <ChevronDown size={14}/></summary><label className="field"><span className="sr-only">解盤問題</span><textarea value={form.question} onChange={e=>set('question',e.target.value)} rows={3} maxLength={1000}/></label></details>
      {error&&<p className="error-box" role="alert"><Info size={16}/>{error}</p>}
      <button type="submit" className="primary calculate" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<Sparkles size={17}/>} {busy?'正在計算星圖…':view==='natal'?'繪製我的星盤':'更新本命資料'}{!busy&&<ArrowUpRight size={17}/>}</button>
      <p className="privacy"><ShieldCheck size={13}/>出生資料在你的瀏覽器內計算</p>
     </form>
     <div className="next-note"><span className="tiny-star">✧</span><div><h3>把星圖帶進下一段對話</h3><p>完成排盤後，複製解盤資料或下載 JSON，交給 astrology-skill 接續解讀。</p><button className="text-button" onClick={()=>setHelp(true)}>了解使用步驟 <ArrowUpRight size={13}/></button></div></div>
    </aside>
    <section className="result-column" aria-label="排盤結果" aria-busy={busy}>
     {view!=='natal'?<PeriodPanel mode={view} form={form} natal={chart} natalBusy={busy} calculateNatal={()=>calculate({...form})}/>:chart?<>
      <div className="chart-card">
       <div className="chart-heading"><div><p className="eyebrow">THE SKY AT YOUR BEGINNING</p><h2>{chart.metadata.name}<span>本命星盤</span></h2><p className="birth-caption">{chart.metadata.local_date.replaceAll('-',' / ')} <b>·</b> {chart.metadata.local_time??'時間不確定'} <b>·</b> {chart.metadata.place}</p></div><span className="system-pill">{HOUSE_LABELS[chart.chart_data.house_system]}</span></div>
       {dirty&&<div className="dirty-banner" role="status"><Info size={15}/>資料已變更，請按「繪製我的星盤」更新結果。</div>}
       <div className="big-three">{[{icon:<Sun size={20}/>,label:'太陽',p:chart.chart_data.placements[0]},{icon:<Moon size={20}/>,label:'月亮',p:chart.chart_data.placements[1]},{icon:<ArrowUpRight size={20}/>,label:'上升',p:chart.chart_data.ascendant}].map(item=><div key={item.label}><span className="three-icon">{item.icon}</span><div><small>{item.label}{chart.metadata.local_time===null&&item.label==='月亮'?'・正午參考':''}</small><strong>{formatPosition(item.p,true)}</strong></div></div>)}</div>
       <div className="wheel-wrap"><button className="zoom-button" title="放大星盤" aria-label="放大星盤" onClick={()=>setZoom(true)}><Maximize2 size={17}/></button><div className="wheel" onClick={wheelClick} dangerouslySetInnerHTML={{__html:svg}}/></div>
       <div className="wheel-caption">{focused?<><span className="focus-dot"/>{BODY_ZH[focused.body]} · {formatPosition(focused)} · {focused.house?`第 ${focused.house} 宮`:'宮位未知'}<button onClick={()=>setSelected(null)} aria-label="清除行星選取"><X size={13}/></button></>:<><span className="focus-dot"/>點選圖中行星，查看它的相位連線</>}</div>
       <div className="export-bar"><button className="primary" disabled={disabled} onClick={copyReading}><Copy size={15}/>複製解盤資料</button><button className="secondary" disabled={disabled} onClick={exportJson}><FileJson size={16}/>下載 JSON</button><button className="image-button" disabled={disabled||pngBusy} onClick={exportPng}>{pngBusy?<LoaderCircle className="spin" size={15}/>:<ArrowDownToLine size={16}/>}儲存星盤 PNG</button></div>
      </div>
      <div className="data-card"><div className="data-top"><div className="tabs" role="tablist" aria-label="星盤資料">{([['placements','行星位置'],['houses','宮位與宮主'],['aspects','主要相位'],['json','JSON']]as[Tab,string][]).map(([id,label])=><button role="tab" aria-selected={tab===id} id={`tab-${id}`} aria-controls="data-panel" key={id} onClick={()=>setTab(id)}>{label}</button>)}</div><span className="data-tag">CHART DATA</span></div>
       <div role="tabpanel" id="data-panel" aria-labelledby={`tab-${tab}`}>
        {tab==='placements'&&<div className="table-scroll"><table><thead><tr><th>行星／交點</th><th>星座與度數</th><th>宮位</th><th>狀態</th></tr></thead><tbody>{chart.chart_data.placements.map((p,i)=><tr key={p.body} className={selected===p.body?'selected-row':''}><td><button className="planet-cell" onClick={()=>setSelected(selected===p.body?null:p.body)}><span>{BODY_GLYPHS[i]}</span>{BODY_ZH[p.body]}</button></td><td>{formatPosition(p)}</td><td>{p.house?`第 ${p.house} 宮`:'—'}</td><td><div className="badges">{p.motion==='retrograde'&&<span className="badge retro">逆行</span>}{p.motion==='stationary'&&<span className="badge">留</span>}{p.dignity.map(d=><span className="badge" key={d}>{DIGNITY_ZH[d]}</span>)}{p.motion==='direct'&&!p.dignity.length&&<span className="muted">順行</span>}</div></td></tr>)}</tbody></table></div>}
        {tab==='houses'&&(chart.chart_data.house_cusps?<div className="table-scroll"><table><thead><tr><th>宮位</th><th>宮頭位置</th><th>傳統宮主星</th><th>現代共主星</th></tr></thead><tbody>{chart.chart_data.house_cusps.map((p,i)=><tr key={p.house}><td>第 {p.house} 宮</td><td>{formatPosition(p)}</td><td>{BODY_ZH[chart.chart_data.house_rulers![i].traditional_ruler]}</td><td>{BODY_ZH[chart.chart_data.house_rulers![i].modern_coruler??'']??'—'}</td></tr>)}</tbody></table></div>:<div className="empty-data"><Compass size={26}/><h3>需要出生時間，才能定位宮位</h3><p>目前只顯示正午的行星參考位置。</p></div>)}
        {tab==='aspects'&&<><div className="table-note">{chart.metadata.aspect_orbs}。共 {chart.chart_data.aspects.length} 組{selected&&<> · 已篩選 {BODY_ZH[selected]} <button className="text-button" onClick={()=>setSelected(null)}>顯示全部</button></>}</div><div className="table-scroll aspect-table"><table><thead><tr><th>星體</th><th>相位</th><th>星體</th><th>容許度</th><th>方向</th></tr></thead><tbody>{chart.chart_data.aspects.filter(a=>!selected||[a.body_a,a.body_b].includes(selected)).map((a,i)=><tr key={i}><td>{BODY_ZH[a.body_a]}</td><td><span className="aspect-dot" style={{background:ASPECT_COLORS[a.aspect]}}/>{ASPECT_ZH[a.aspect]}</td><td>{BODY_ZH[a.body_b]}</td><td>{a.orb_degrees.toFixed(2)}°</td><td>{a.exact?'精確':a.applying?'入相':a.separating?'出相':'—'}</td></tr>)}</tbody></table></div></>}
        {tab==='json'&&<><div className="table-note">與 astrology-skill 輸入結構相容。額外保留出生時間、時區、計算方法與宮主星資料。</div><pre className="json-code">{JSON.stringify(chart,null,2)}</pre></>}
       </div>
      </div>
      <div className="calculation-note"><Info size={16}/><div><p><strong>這張星盤的計算依據</strong> {chart.metadata.ephemeris} · 回歸黃道 · 地心</p><p>時區 {chart.metadata.timezone}（UTC{chart.metadata.utc_offset}） · UTC {chart.metadata.utc.slice(0,16).replace('T',' ')} · {chart.chart_data.sect.status==='unknown'?'日夜盤未知':chart.chart_data.sect.status==='day'?'日生盤':'夜生盤'}</p><p>城市座標為市中心參考，可在進階設定調整。顯示度數四捨五入至角分，匯出保留小數精度。</p>{chart.metadata.warnings.map(w=><p className="warning-text" key={w}>{w}</p>)}</div></div>
     </>:<div className="loading-chart"><Compass size={58} strokeWidth={.8}/><h2>{busy?'正在展開你的星圖':'星圖等待你的資料'}</h2><p>{busy?'首次開啟正在載入排盤引擎，稍候即可。':'在左方確認出生資料，再試一次。'}</p>{busy&&<LoaderCircle className="spin" size={20}/>}</div>}
    </section>
   </div>
   <footer><div><span className="footer-brand">✧ 星圖室</span><span>以星圖為起點，以理解為方向。</span></div><div><button onClick={()=>setHelp(true)}>計算與使用說明</button><a href="./source.zip" download>原始碼</a><a href="./ephemeris/LICENSE.txt" target="_blank" rel="noreferrer">AGPL-3.0</a><span>v1.1.0</span></div></footer>
  </main>
  {notice&&<div className="toast" role="status"><Check size={17}/>{notice}</div>}
  <dialog ref={dialog} className={zoom?'modal zoom-modal':'modal'} onCancel={closeDialog} onClick={e=>{if(e.target===e.currentTarget)closeDialog();}}><button className="modal-close" aria-label="關閉" onClick={closeDialog}><X size={20}/></button>
   {help&&<div className="help-content"><p className="eyebrow">A SMALL GUIDE</p><h2>從排盤到解讀，三個步驟。</h2><ol className="steps"><li><span>01</span><div><h3>確認出生資料</h3><p>填寫當地出生日期、時間與地點。預設普拉西德宮制，也能改用整宮制或等宮制。</p></div></li><li><span>02</span><div><h3>選擇本命盤、月運或年運</h3><p>本命盤可檢視行星、宮位與相位。月運、年運切頁可選觀察期間，按計算後整理行運重點、時間表與十二個月概覽。</p></div></li><li><span>03</span><div><h3>帶著資料繼續解讀</h3><p>月運與年運也能複製完整解盤資料、下載 JSON，或用列印功能另存 PDF。按「複製解盤資料」，貼到能使用 astrology-skill 的 AI 對話；或下載 JSON 後上傳，並說「請依這份資料解讀本命星盤」。本工具提供排盤資料，解讀由該技能完成。</p></div></li></ol><div className="help-note"><h3>關於計算</h3><p>採 Swiss Ephemeris 2.10.03 的 Moshier 計算，支援西元 1900–2100 年。使用回歸黃道、地心位置與公曆；宮位依黃經落點分配。日夜盤以太陽幾何高度判定；水星依晨星／昏星分派。只計算主要本質尊貴，未計算界、面、互容、燃燒與可見性。</p><p>出生時間未知時，以正午作行星參考，不產生上升、宮位、日夜盤與福點。城市預設為市中心；歷史時區依瀏覽器時區資料換算。若接近換座、宮頭或日出日落，出生時間誤差會影響結果。</p><p>資料在瀏覽器本機計算，不傳送至外部排盤 API，也不自動保存。占星解讀適合象徵性的自我探索，並非事件必然發生的預測。</p></div><div className="credits"><a href="https://github.com/wvanderen/astrology-skill" target="_blank" rel="noreferrer">解盤資料格式：astrology-skill ↗</a><a href="https://github.com/swisseph-js/swisseph" target="_blank" rel="noreferrer">計算引擎：Swiss Ephemeris ↗</a><a href="./source.zip" download>下載完整工具原始碼</a></div></div>}
   {zoom&&chart&&<div className="zoom-content"><h2>{chart.metadata.name}</h2><div onClick={wheelClick} dangerouslySetInnerHTML={{__html:svg}}/></div>}
   {copyFallback&&chart&&<div className="help-content"><h2>手動複製解盤資料</h2><p>瀏覽器未開放自動複製，請選取下方全部內容再複製。</p><textarea className="copy-fallback" readOnly value={readingPrompt(chart)} onFocus={e=>e.target.select()} autoFocus/><button className="primary" onClick={exportJson}><ArrowDownToLine size={16}/>改為下載 JSON</button></div>}
  </dialog>
 </>;
}
function Coordinates({form,update}:{form:FormInput;update:<K extends keyof FormInput>(key:K,value:FormInput[K])=>void}){return <><div className="coordinate-fields"><label className="field">緯度（北正南負）<input type="number" step="any" min="-89" max="89" value={form.latitude} onChange={e=>update('latitude',e.target.value)} required/></label><label className="field">經度（東正西負）<input type="number" step="any" min="-180" max="180" value={form.longitude} onChange={e=>update('longitude',e.target.value)} required/></label></div><label className="field">出生地時區<input value={form.timezone} onChange={e=>update('timezone',e.target.value)} placeholder="例如 Asia/Taipei" required/></label></>;}
