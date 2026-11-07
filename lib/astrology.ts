import { Temporal } from '@js-temporal/polyfill';
import type { SwissEphemeris } from '@swisseph/browser';

export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export const SIGN_ZH = ['牡羊','金牛','雙子','巨蟹','獅子','處女','天秤','天蠍','射手','摩羯','水瓶','雙魚'];
export const SIGN_GLYPHS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
export const BODY_NAMES = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto','True Node'];
export const BODY_ZH: Record<string,string> = {Sun:'太陽',Moon:'月亮',Mercury:'水星',Venus:'金星',Mars:'火星',Jupiter:'木星',Saturn:'土星',Uranus:'天王星',Neptune:'海王星',Pluto:'冥王星','True Node':'北交點',Ascendant:'上升',Midheaven:'天頂'};
export const BODY_GLYPHS = ['☉','☽','☿','♀','♂','♃','♄','♅','♆','♇','☊'];
const RULERS=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const EXALTATIONS:Record<string,number>={Sun:0,Moon:1,Mercury:5,Venus:11,Mars:9,Jupiter:3,Saturn:6};
export const ASPECT_ZH:Record<string,string>={conjunction:'合相',sextile:'六合',square:'四分',trine:'三分',opposition:'對分'};
export const ASPECT_COLORS:Record<string,string>={conjunction:'#af9156',sextile:'#5598ac',square:'#c4776b',trine:'#6b9d87',opposition:'#8e75a8'};
export const DIGNITY_ZH:Record<string,string>={domicile:'入廟',exaltation:'擢升',detriment:'失勢',fall:'落陷'};
export type HouseSystemName = 'Placidus'|'Whole Sign'|'Equal';
export type FormInput = {name:string;date:string;time:string;unknownTime:boolean;place:string;latitude:string;longitude:string;timezone:string;houseSystem:HouseSystemName;tradition:'blended'|'classical'|'modern';question:string;orb:'focused'|'standard';disambiguation:'reject'|'earlier'|'later'};
export type Zodiac = {sign:string;degree:number;absolute_degree:number};
export type Placement = Zodiac & {body:string;house?:number;motion:'direct'|'retrograde'|'stationary';dignity:string[];condition:string[];rules_houses?:number[];modern_rules_houses?:number[];speed_deg_per_day:number;notes?:string};
export type Aspect = {body_a:string;body_b:string;aspect:string;orb_degrees:number;applying?:boolean;separating?:boolean;exact:boolean;notes?:string};
export type Chart = {reading_type:'natal';tradition_mode:FormInput['tradition'];tone:'practical';language:'zh-TW';user_question?:string;chart_data:{source_notes:string;birth_time_confidence:string;house_system:HouseSystemName;ascendant?:Zodiac;midheaven?:Zodiac;house_cusps?:Array<Zodiac&{house:number}>;placements:Placement[];aspects:Aspect[];sect:{status:'day'|'night'|'unknown';luminary_of_sect?:string;sect_mate_planets?:string[];notes?:string};lots?:Array<Zodiac&{name:string;house:number;formula:string}>;mercury_sect?:{status:string;solar_phase:string;elongation_deg:number;notes:string};house_rulers?:Array<{house:number;sign:string;traditional_ruler:string;modern_coruler?:string}>};metadata:{version:string;name:string;place:string;local_date:string;local_time:string|null;reference_time:string;utc:string;timezone:string;utc_offset:string;latitude:number;longitude:number;julian_day:number;ephemeris:string;aspect_orbs:string;warnings:string[]}};
export const DEFAULT_INPUT:FormInput={name:'示範星盤',date:'2000-01-01',time:'12:00',unknownTime:false,place:'台灣・台北',latitude:'25.05',longitude:'121.5',timezone:'Asia/Taipei',houseSystem:'Placidus',tradition:'blended',question:'請綜合解讀我的本命星盤，說明主要特質、優勢與需要留意的課題。',orb:'focused',disambiguation:'reject'};
export const normalize=(n:number)=>((n%360)+360)%360;
export const signed=(n:number)=>normalize(n+180)-180;
export const round=(n:number)=>Math.round(n*1e6)/1e6;
export function zodiac(n:number):Zodiac {const v=normalize(n);return {sign:SIGNS[Math.floor(v/30)],degree:Math.min(29.999999,round(v%30)),absolute_degree:Math.min(359.999999,round(v))};}
export function formatPosition(p:Zodiac|undefined,short=false){if(!p)return '時間未知';const total=Math.round(p.absolute_degree*60)%(360*60),s=Math.floor(total/1800),d=Math.floor(total%1800/60),m=total%60;return `${SIGN_ZH[s]}${short?'':'座'} ${d}°${String(m).padStart(2,'0')}′`;}
export function houseOf(n:number,cusps:number[]) {for(let i=0;i<12;i++){if(normalize(n-cusps[i])<normalize(cusps[(i+1)%12]-cusps[i]))return i+1;}throw new Error('宮位計算異常，請檢查地點與宮制。');}
export function dignity(body:string,sign:number){const result:string[]=[];if(!BODY_NAMES.slice(0,7).includes(body))return result;if(RULERS[sign]===body)result.push('domicile');if(EXALTATIONS[body]===sign)result.push('exaltation');if(RULERS[(sign+6)%12]===body)result.push('detriment');if(EXALTATIONS[body]===(sign+6)%12)result.push('fall');return result;}

export function resolveTime(input:FormInput){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(input.date))throw new Error('請填寫完整的出生日期。');
  const date=Temporal.PlainDate.from(input.date);if(date.year<1900||date.year>2100)throw new Error('目前支援 1900 至 2100 年。');
  const reference=input.unknownTime?'12:00':input.time;
  if(!/^\d{2}:\d{2}(:\d{2})?$/.test(reference))throw new Error('請填寫出生時間，或勾選「時間不確定」。');
  const plain=Temporal.PlainDateTime.from(`${input.date}T${reference}`);
  let zdt;
  try{zdt=plain.toZonedDateTime(input.timezone.trim(),{disambiguation:input.disambiguation});}
  catch {throw new Error('無法確認這個當地時間。請檢查時區；夏令時間重複時刻可在進階設定選擇較早或較晚一次。');}
  if(!zdt.toPlainDateTime().equals(plain))throw new Error('這個時間位於夏令時間跳時區間，當地並不存在。請核對出生紀錄。');
  return {date:new Date(zdt.epochMilliseconds),offset:zdt.offset,reference};
}

let loading:Promise<SwissEphemeris>|null=null;
export async function getEngine(){
  if(!loading)loading=(async()=>{const {SwissEphemeris}=await import('@swisseph/browser');const engine=new SwissEphemeris();await engine.init(new URL('./ephemeris/swisseph-1.4.0.wasm', document.baseURI).href);return engine;})().catch(e=>{loading=null;throw e;});
  return loading;
}
export async function calculateChart(input:FormInput){return calculateWithEngine(await getEngine(),input);}

export function calculateWithEngine(swe:SwissEphemeris,input:FormInput):Chart{
  if(!input.latitude.trim()||!input.longitude.trim())throw new Error('請填寫出生地經緯度。');
  const lat=Number(input.latitude),lon=Number(input.longitude);
  if(!Number.isFinite(lat)||Math.abs(lat)>89||!Number.isFinite(lon)||Math.abs(lon)>180)throw new Error('緯度需介於 -89 與 89，經度需介於 -180 與 180。');
  if(!input.unknownTime&&input.houseSystem==='Placidus'&&Math.abs(lat)>=66)throw new Error('高緯度地點不使用此版本的 Placidus 計算，請改選整宮制或等宮制。');
  const time=resolveTime(input),jd=swe.dateToJulianDay(time.date),flags=4|256;
  const raw=BODY_NAMES.map((_,i)=>swe.calculatePosition(jd,i===10?11:i,flags));
  const houseCode={Placidus:'P','Whole Sign':'W',Equal:'A'}[input.houseSystem];
  const hd=input.unknownTime?null:swe.calculateHouses(jd,lat,lon,houseCode as Parameters<SwissEphemeris['calculateHouses']>[3]);
  const cusps=hd?.cusps.slice(1,13);
  if(cusps&&(!cusps.every(Number.isFinite)||cusps.length!==12))throw new Error('無法計算這個地點的宮位，請更換宮制。');
  const warnings:string[]=[];
  if(input.unknownTime)warnings.push('出生時間未知：採當地正午作行星參考，不提供上升、天頂、宮位、宮主星、日夜盤或福點；月亮與相關相位需保留不確定性。');
  if(input.disambiguation!=='reject')warnings.push(`重複時刻處理採${input.disambiguation==='earlier'?'較早':'較晚'}一次，實際 UTC 偏移為 ${time.offset}。`);
  const houseRulers=cusps?.map((c,i)=>{const sign=Math.floor(normalize(c)/30);const modern:Record<number,string>={7:'Pluto',10:'Uranus',11:'Neptune'};return {house:i+1,sign:SIGNS[sign],traditional_ruler:RULERS[sign],...(modern[sign]?{modern_coruler:modern[sign]}:{})};});
  const placements:Placement[]=raw.map((p,i)=>({body:BODY_NAMES[i],...zodiac(p.longitude),...(cusps?{house:houseOf(p.longitude,cusps),rules_houses:houseRulers!.filter(h=>h.traditional_ruler===BODY_NAMES[i]).map(h=>h.house),modern_rules_houses:houseRulers!.filter(h=>h.modern_coruler===BODY_NAMES[i]).map(h=>h.house)}:{}),motion:Math.abs(p.longitudeSpeed)<.0001?'stationary':p.longitudeSpeed<0?'retrograde':'direct',speed_deg_per_day:round(p.longitudeSpeed),dignity:dignity(BODY_NAMES[i],Math.floor(normalize(p.longitude)/30)),condition:p.longitudeSpeed<0?['retrograde']:[],...(i===10?{notes:'真北交點；短暫順行是正常的真交點運動。'}:{})}));
  const defs:[string,number][]=[['conjunction',0],['sextile',60],['square',90],['trine',120],['opposition',180]];
  const aspects:Aspect[]=[];
  const bodies=[...placements.map(p=>({name:p.body,lon:p.absolute_degree,speed:p.speed_deg_per_day})),...(hd?[{name:'Ascendant',lon:hd.ascendant,speed:null},{name:'Midheaven',lon:hd.mc,speed:null}]:[])];
  const maxOrb=(name:string)=>['Sun','Moon'].includes(name)?10:['Mercury','Venus','Mars'].includes(name)?7:name==='True Node'?5:8;
  for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){
    if(i>=placements.length&&j>=placements.length)continue;
    const a=bodies[i],b=bodies[j],delta=signed(a.lon-b.lon),sep=Math.abs(delta);
    for(const [type,angle] of defs){
      const orb=Math.abs(sep-angle),allowed=input.orb==='focused'?(type==='sextile'?4:6):Math.min(Math.max(maxOrb(a.name),maxOrb(b.name)),type==='sextile'?6:180);
      if(orb>allowed)continue;
      const record:Aspect={body_a:a.name,body_b:b.name,aspect:type,orb_degrees:round(orb),exact:orb<=.01};
      if(a.speed!==null&&b.speed!==null){
        const target=(delta>=0?1:-1)*angle,offset=delta-target,rate=a.speed-b.speed;
        if(orb>.000001&&Math.abs(rate)>.0000001){record.applying=offset*rate<0;record.separating=!record.applying;}
      }else record.notes='軸點相位不判定入相／出相。';
      if(input.unknownTime&&(a.name==='Moon'||b.name==='Moon'))record.notes='月亮採正午參考位置，此相位不確定。';
      aspects.push(record);break;
    }
  }
  let sect:Chart['chart_data']['sect']={status:'unknown',notes:'出生時間未知。'};
  let mercurySect:Chart['chart_data']['mercury_sect'];
  let lots:Chart['chart_data']['lots'];
  if(hd&&cusps){
    const sun=raw[0],alt=swe.horizontalCoordinates(jd,{longitude:lon,latitude:lat},[sun.longitude,sun.latitude,sun.distance]).altitude;
    const day=alt>0,elong=signed(raw[2].longitude-sun.longitude),uncertain=Math.abs(elong)<.01||Math.abs(Math.abs(elong)-180)<.01;
    const mercuryStatus=uncertain?'unknown':elong<0?'day':'night';
    const mates=day?['Jupiter','Saturn']:['Venus','Mars'];if(mercuryStatus===(day?'day':'night'))mates.push('Mercury');
    sect={status:day?'day':'night',luminary_of_sect:day?'Sun':'Moon',sect_mate_planets:mates,notes:`太陽幾何高度 ${alt.toFixed(3)}°，以地平線 0° 為日夜分界。`};
    if(Math.abs(alt)<.5)warnings.push('出生接近日出或日落，日夜盤判定對出生時間誤差較敏感。');
    mercurySect={status:mercuryStatus,solar_phase:uncertain?'unknown':elong<0?'morning':'evening',elongation_deg:round(elong),notes:'依水星相對太陽的黃經判定晨星／昏星及日夜派別；不代表實際肉眼可見性。'};
    const fortune=normalize(hd.ascendant+(day?raw[1].longitude-raw[0].longitude:raw[0].longitude-raw[1].longitude));
    lots=[{name:'Lot of Fortune',...zodiac(fortune),house:houseOf(fortune,cusps),formula:day?'Asc + Moon - Sun (day)':'Asc + Sun - Moon (night)'}];
  }
  const orbs=input.orb==='focused'?'主要相位 6°，六合 4°':'日月 10°，水金火 7°，其他行星與軸點 8°，真交點 5°；兩者取較大值，六合上限 6°';
  return {reading_type:'natal',tradition_mode:input.tradition,tone:'practical',language:'zh-TW',...(input.question.trim()?{user_question:input.question.trim()}:{}),chart_data:{house_system:input.houseSystem,birth_time_confidence:input.unknownTime?'Unknown':'Timed',...(hd&&cusps?{ascendant:zodiac(hd.ascendant),midheaven:zodiac(hd.mc),house_cusps:cusps.map((c,i)=>({house:i+1,...zodiac(c)})),house_rulers:houseRulers}:{}),placements,aspects,sect,...(mercurySect?{mercury_sect:mercurySect}:{}),...(lots?{lots}:{}),source_notes:`星圖室 1.0.1; Swiss Ephemeris ${swe.version()} / @swisseph/browser 1.4.0; Moshier built-in. Tropical, geocentric, Gregorian calendar. ${input.houseSystem}; ${orbs}. Traditional domicile rulers; modern co-rulers stored separately. Only major essential dignities are computed; minor dignity, reception, combustion and visibility are not computed. Longitude-interval house placement. ${warnings.join(' ')}`},metadata:{version:'1.0.1',name:input.name.trim()||'我的星盤',place:input.place.trim()||'自訂地點',local_date:input.date,local_time:input.unknownTime?null:input.time,reference_time:time.reference,utc:time.date.toISOString(),timezone:input.timezone.trim(),utc_offset:time.offset,latitude:lat,longitude:lon,julian_day:jd,ephemeris:`Swiss Ephemeris ${swe.version()} · Moshier`,aspect_orbs:orbs,warnings}};
}

export function readingPrompt(chart:Chart){return `請使用 astrology-skill 解讀以下已計算的本命星盤，以繁體中文回答。保留資料中的宮制、相位容許度與不確定性；不要補造缺少的星盤因素。先綜合主要結構，再回應 user_question。不要把星盤象徵說成必然發生的事件。\n\n${JSON.stringify(chart,null,2)}`;}
