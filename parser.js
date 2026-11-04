(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WettParser=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function num(v){if(v==null)return null;let s=String(v).replace(/[^0-9.,]/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');return Number(s)}
const dateRe=/\d{2}\.\d{2}\.\d{4}\s+\d{1,2}:\d{2}/;
function rowsFromOCR(data){
 let words=(data.words||[]).filter(w=>w.text?.trim()&&w.bbox).map(w=>({text:w.text.trim(),x:w.bbox.x0,y:w.bbox.y0,x1:w.bbox.x1,y1:w.bbox.y1}));
 if(!words.length)return (data.lines||[]).map(l=>({text:l.text,x:l.bbox?.x0||0,y:l.bbox?.y0||0,x1:l.bbox?.x1||0,y1:l.bbox?.y1||0}));
 words.sort((a,b)=>(a.y+a.y1)-(b.y+b.y1)||a.x-b.x);let rows=[];
 for(let w of words){let cy=(w.y+w.y1)/2,h=Math.max(9,w.y1-w.y),r=rows.find(r=>Math.abs(r.cy-cy)<Math.max(8,Math.min(h,r.h)*.48));if(!r){r={cy,h,words:[]};rows.push(r)}r.words.push(w);r.cy=(r.cy*(r.words.length-1)+cy)/r.words.length;}
 return rows.sort((a,b)=>a.cy-b.cy).map(r=>{r.words.sort((a,b)=>a.x-b.x);return {text:r.words.map(w=>w.text).join(' '),x:r.words[0].x,y:Math.min(...r.words.map(w=>w.y)),x1:Math.max(...r.words.map(w=>w.x1)),y1:Math.max(...r.words.map(w=>w.y1)),words:r.words}})
}
function market(raw){let s=String(raw||'').replace(/^[\s✔✓✅✖×❌●]+/u,'').replace(/\s+\d{1,2}[,.]\d{2}\s*$/,'').trim();let m=s.match(/Über\s*\/\s*Unter\s*\([\d,.]+\)\s*:\s*(Über|Unter)\s*([\d,.]+)/i);if(m)return m[1]+' '+m[2]+' Tore';if(/^Treffen beide\??\s*:/i.test(s))return 'Beide Teams treffen: '+s.split(':').slice(1).join(':').trim();return s.replace(/^Tipp\s*:\s*/i,'')}
function odds(row){let candidates=[...String(row?.text||'').matchAll(/(?:^|\s)(\d{1,2}[,.]\d{2})(?=\s|$)/g)].map(m=>num(m[1]));return candidates.filter(v=>v>=1&&v<=1000).at(-1)??null}
function parse(input){let rows=Array.isArray(input)?input:typeof input==='string'?input.split(/\r?\n/).map((text,i)=>({text,y:i*40})):rowsFromOCR(input);rows=rows.map(r=>({...r,text:String(r.text||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim()})).filter(r=>r.text);const all=rows.map(r=>r.text).join(' ');let legs=[];
 let euro=[...all.matchAll(/(\d[\d.]*,\d{2})\s*€/g)].map(m=>num(m[1]));let stake=euro.length>=2?euro.at(-2):null,potential=euro.length>=2?euro.at(-1):null;
 const matchRe=/^(.{2,}?)\s+[-–—]\s+(.{2,})$/;
 for(let i=0;i<rows.length;i++){let r=rows[i],m=r.text.match(matchRe);if(!m||dateRe.test(r.text)||!/[\p{L}]/u.test(m[1])||!/[\p{L}]/u.test(m[2]))continue;
 let top=rows[i-1]||{},alt=rows[i-2]||{},pick=market(top.text),odd=odds(top);if(!pick||/^(?:Teilen|Details|VERLOREN|GEWONNEN)/i.test(pick))pick=market(alt.text);if(odd==null)odd=odds(alt);
 let dr=rows.slice(i+1,i+4).find(z=>dateRe.test(z.text));let kickoff=dr?.text.match(dateRe)?.[0]||'',score=dr?.text.slice(dr.text.indexOf(kickoff)+kickoff.length).match(/\b\d{1,2}:\d{1,2}\b/)?.[0]||'';
 let st=/[✖×❌]/u.test(top.text)?'verloren':/[✔✓✅]/u.test(top.text)?'gewonnen':'offen';if(st==='offen'&&/[✖×❌]/u.test(alt.text))st='verloren';if(st==='offen'&&/[✔✓✅]/u.test(alt.text))st='gewonnen';
 legs.push({match:m[1].trim()+' – '+m[2].trim(),league:'',kickoff,market:pick,odds:odd??'',legStatus:st,score});}
 let header=rows.slice(0,10).map(r=>r.text).join(' '),status=/VERLOREN/i.test(header)?'verloren':/GEWONNEN/i.test(header)?'gewonnen':'offen';if(status==='offen'&&legs.some(l=>l.legStatus==='verloren'))status='verloren';
 let notes=[],missing=legs.filter(l=>!l.odds).length,product=legs.length&&missing===0?legs.reduce((p,l)=>p*Number(l.odds),1):null;
 if(!legs.length)notes.push('Keine Begegnung sicher erkannt. Bitte kontrollieren.');if(missing)notes.push(`${missing} Einzelquote(n) fehlen. Bitte ergänzen.`);if(product&&stake!=null&&potential!=null&&Math.abs(product*stake-potential)>Math.max(.12,potential*.01))notes.push('Quotenprodukt und möglicher Gewinn weichen ab. Bitte prüfen.');
 return {legs,stake,potential,status,kind:legs.length===1?'Einzel':'Kombi',notes,product,raw:rows.map(r=>r.text).join('\n')};}
return {parse,rowsFromOCR,num,market};
});
