import { type Chart,SIGNS,SIGN_ZH,SIGN_GLYPHS,BODY_NAMES,BODY_GLYPHS,BODY_ZH,ASPECT_COLORS,normalize } from './astrology';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function wheelSvg(chart:Chart,selected:string|null=null,exportMode=false){
 const cx=360,cy=352,asc=chart.chart_data.ascendant?.absolute_degree??0;
 const xy=(lon:number,r:number)=>{const a=(180+lon-asc)*Math.PI/180;return [cx+r*Math.cos(a),cy-r*Math.sin(a)];};
 const pt=(p:number[])=>p.map(x=>x.toFixed(2)).join(',');
 const line=(a:number[],b:number[],color:string,width=1,extra='')=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
 const circle=(r:number,color:string,w=.8)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${w}"/>`;
 const text=(x:number,y:number,t:string,size:number,color:string,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="middle" ${extra}>${esc(t)}</text>`;
 let s=`<svg id="natal-wheel" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 720" role="img" aria-label="${esc(chart.metadata.name)}的本命星盤" style="font-family:Inter,'Noto Sans TC','PingFang TC',sans-serif"><rect width="720" height="720" fill="#fffefb"/><title>${esc(chart.metadata.name)}・本命星盤</title>`;
 if(exportMode)s+='<g transform="translate(21.6 37) scale(0.94)">';
 const fills=['#f6eae1','#eaf0e4','#f4efdf','#e6efef'],colors=['#b17e62','#788d66','#ac9253','#5b9193'];
 for(let i=0;i<12;i++){
  const points=[...Array.from({length:31},(_,k)=>xy(i*30+k,281)),...Array.from({length:31},(_,k)=>xy(i*30+30-k,246))];
  s+=`<polygon points="${points.map(pt).join(' ')}" fill="${fills[i%4]}"/>`+line(xy(i*30,246),xy(i*30,281),'#d7dfd5',.7);
  const [x,y]=xy(i*30+15,265);s+=text(x,y+1,SIGN_GLYPHS[i],20,colors[i%4],'font-family="DejaVu Sans,Arial,sans-serif"')+text(x,y+15,SIGN_ZH[i],10.5,colors[i%4]);
 }
 s+=circle(288,'#c5b58f',.7)+circle(281,'#d3d9cd')+circle(246,'#d3d9cd')+circle(236,'#e0e4db')+circle(213,'#e0e4db')+circle(151,'#e0e4db');
 for(let i=0;i<360;i++)s+=line(xy(i,246-(i%10===0?7:i%5===0?4:2)),xy(i,246),i%5===0?'#84978a':'#c1cabc',i%5===0?.8:.5);
 if(chart.chart_data.house_cusps){
  const cs=chart.chart_data.house_cusps;
  cs.forEach((p,i)=>{s+=line(xy(p.absolute_degree,151),xy(p.absolute_degree,236),'#d8ded5',.85);const mid=p.absolute_degree+normalize(cs[(i+1)%12].absolute_degree-p.absolute_degree)/2;const [x,y]=xy(mid,225);s+=text(x,y+4,String(i+1),12,'#7a8e80');});
 }
 const pos:Record<string,number>=Object.fromEntries(chart.chart_data.placements.map(p=>[p.body,p.absolute_degree]));
 if(chart.chart_data.ascendant)pos.Ascendant=chart.chart_data.ascendant.absolute_degree;
 if(chart.chart_data.midheaven)pos.Midheaven=chart.chart_data.midheaven.absolute_degree;
 for(const a of chart.chart_data.aspects){
  const highlight=!selected||[a.body_a,a.body_b].includes(selected);const alpha=highlight?(selected ? .9 : .67):.1;
  if(a.aspect==='conjunction'){
   const one=pos[a.body_a],two=pos[a.body_b],d=((two-one+540)%360)-180;
   const points=Array.from({length:20},(_,k)=>xy(one+d*k/19,146));
   s+=`<polyline points="${points.map(pt).join(' ')}" fill="none" stroke="${ASPECT_COLORS[a.aspect]}" stroke-width="${highlight?2.6:1}" opacity="${alpha}"/>`;
  }else s+=line(xy(pos[a.body_a],151),xy(pos[a.body_b],151),ASPECT_COLORS[a.aspect],highlight?1.4:.8,`opacity="${alpha}"`);
 }
 const planets=chart.chart_data.placements;
 const sorted=planets.map((p,i)=>({i,lon:p.absolute_degree})).sort((a,b)=>a.lon-b.lon);
 let largest=-1,start=0;sorted.forEach((p,i)=>{const gap=normalize(sorted[(i+1)%sorted.length].lon-p.lon);if(gap>largest){largest=gap;start=(i+1)%sorted.length;}});
 const ordered=[...sorted.slice(start),...sorted.slice(0,start)];
 const base=ordered.map(p=>normalize(p.lon-ordered[0].lon));let adjusted=[...base];
 for(let step=0;step<200;step++){for(let i=0;i<adjusted.length-1;i++){if(adjusted[i+1]-adjusted[i]<11){const d=(11-adjusted[i+1]+adjusted[i])/2;adjusted[i]-=d;adjusted[i+1]+=d;}}const shift=adjusted.reduce((v,p,i)=>v+p-base[i],0)/base.length;adjusted=adjusted.map(p=>p-shift);}
 const labels=Object.fromEntries(ordered.map((p,i)=>[p.i,adjusted[i]+ordered[0].lon]));
 planets.forEach((p,i)=>{
  const selectedHere=selected===p.body,op=selected && !selectedHere ? .6 : 1;
  const actual=xy(p.absolute_degree,151),elbow=xy(p.absolute_degree,164),target=xy(labels[i],181),[x,y]=xy(labels[i],194);
  s+=`<g data-body="${esc(p.body)}" style="cursor:pointer" opacity="${op}"><title>${esc(BODY_ZH[p.body])}・${SIGN_ZH[SIGNS.indexOf(p.sign)]}・${p.house?`第 ${p.house} 宮`:'宮位未知'}</title>`;
  s+=line(actual,elbow,'#91a092',.8)+line(elbow,target,'#91a092',.8)+line(xy(p.absolute_degree,232),xy(p.absolute_degree,236),'#345950',1.3);
  s+=`<circle cx="${actual[0]}" cy="${actual[1]}" r="${selectedHere?4:2.6}" fill="#244f47"/><rect x="${x-16}" y="${y-19}" width="32" height="41" rx="10" fill="${selectedHere?'#e6eddf':'#fffefb'}"/>`;
  s+=text(x,y+2,BODY_GLYPHS[i],22,'#254c46','font-family="DejaVu Sans,Arial,sans-serif"')+text(x,y+17,(i===10?'交':BODY_ZH[p.body][0])+(p.motion==='retrograde'?' R':''),10,'#718476')+'</g>';
 });
 if(chart.chart_data.ascendant&&chart.chart_data.midheaven){
  for(const [label,lo]of[['ASC',asc],['DSC',asc+180],['MC',chart.chart_data.midheaven.absolute_degree],['IC',chart.chart_data.midheaven.absolute_degree+180]]as[string,number][]){s+=line(xy(lo,236),xy(lo,300),'#3d6257',1.1);const[x,y]=xy(lo,315);s+=text(x,y+4,label,11,'#3d6257','letter-spacing="1"');}
 }
 if(exportMode){s+='</g>'+text(cx,24,chart.metadata.name,17,'#294d45')+text(cx,45,`${chart.metadata.local_date}  ${chart.metadata.local_time??'時間未知'}  ·  ${chart.metadata.place}`,10,'#7c8b80');}
 const legend=[['合相','conjunction'],['六合','sextile'],['四分','square'],['三分','trine'],['對分','opposition']];
 legend.forEach(([label,key],i)=>{const x=162+i*84;s+=line([x-16,688],[x-2,688],ASPECT_COLORS[key],2)+text(x+20,692,label,11,'#819080');});
 return s+'</svg>';
}
