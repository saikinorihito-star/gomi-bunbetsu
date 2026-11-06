/* 写真判別から結論を最初に表示する。地区は利用者が選び、公式2026年度カレンダーの範囲で日付を表示。 */
(function(){
'use strict';
const STORAGE='gomi-collection-district-v1';
const LINKS={
plastic:'https://www.city.takaoka.toyama.jp/gyosei/kurashi_tetsuzuki/gomi_recycle/2/5710.html',
calendar:'https://www.city.takaoka.toyama.jp/soshiki/kankyoseisakuka/2/1/4/1/1/4860.html',
towns:'https://www.city.takaoka.toyama.jp/soshiki/kankyoseisakuka/2/1/4/3/2/10496.html'};
const WEEK=['日','月','火','水','木','金','土'];
const GROUPS=[
['川原',0,1],['西条',1,1],
['二上',2,1],['能町',2,1],['野村',2,1],['木津',2,1],['国吉',2,1],['太田',2,1],['福岡',2,1],['西五位',2,1],['赤丸',2,1],
['平米',3,1],['福田',3,1],['小勢',3,1],['中田',3,1],['守山',4,1],['二塚',4,1],['牧野',4,1],
['東五位',0,2],['立野',0,2],['横田',1,2],['石堤',1,2],
['定塚',2,2],['下関',2,2],['博労',2,2],['戸出',2,2],['山王',2,2],['大滝',2,2],['五位山',2,2],
['伏木',3,2],['古府',3,2],['成美',4,2],['佐野',4,2]];
// 高岡市2026年度公式PDF：各月の「燃やせないごみ」の10欄（1･3週 月火水木金、2･4週 月火水木金）
const CAL={
'2026-04':[[6,20],[7,21],[1,15],[2,16],[3,17],[13,27],[14,28],[8,22],[9,23],[10,24]],
'2026-05':[[18],[19],[6,20],[7,21],[1,15],[11,25],[12,26],[13,27],[14,28],[8,22]],
'2026-06':[[1,15],[2,16],[3,17],[4,18],[5,19],[8,22],[9,23],[10,24],[11,25],[12,26]],
'2026-07':[[6,20],[7,21],[1,15],[2,16],[3,17],[13,27],[14,28],[8,22],[9,23],[10,24]],
'2026-08':[[3,17],[4,18],[5,19],[6,20],[7,21],[10,24],[11,25],[12,26],[13,27],[14,28]],
'2026-09':[[7,21],[1,15],[2,16],[3,17],[4,18],[14,28],[8,22],[9,23],[10,24],[11,25]],
'2026-10':[[5,19],[6,20],[7,21],[1,15],[2,16],[12,26],[13,27],[14,28],[8,22],[9,23]],
'2026-11':[[2,16],[3,17],[4,18],[5,19],[6,20],[9,23],[10,24],[11,25],[12,26],[13,27]],
'2026-12':[[7,21],[1,15],[2,16],[3,17],[4,18],[14,28],[8,22],[9,23],[10,24],[11,25]],
'2027-01':[[4,18],[5,19],[6,20],[7,21],[15],[25],[12,26],[13,27],[14,28],[8,22]],
'2027-02':[[1,15],[2,16],[3,17],[4,18],[5,19],[8,22],[9,23],[10,24],[11,25],[12,26]],
'2027-03':[[1,15],[2,16],[3,17],[4,18],[5,19],[8,22],[9,23],[10,24],[11,25],[12,26]]
};
const el=(t,c,v)=>{const x=document.createElement(t);if(c)x.className=c;if(v!==undefined)x.textContent=v;return x;};
function link(label,url){const n=el('a','guide-link',label);n.href=url;n.target='_blank';n.rel='noopener noreferrer';return n;}
function button(label,fn,cls='guide-button'){const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;}
function getDistrict(){try{return JSON.parse(localStorage.getItem(STORAGE)||'null')?.name||''}catch{return ''}}
function setDistrict(name){try{localStorage.setItem(STORAGE,JSON.stringify({name,source:'高岡市2026年度公式カレンダー'}));return true}catch{return false}}
const pad=x=>String(x).padStart(2,'0');
function todayJapan(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());const val=Object.fromEntries(parts.map(p=>[p.type,p.value]));return val.year+'-'+pad(val.month)+'-'+pad(val.day);}
function nextCollection(name,after=todayJapan()){
 const group=GROUPS.find(g=>g[0]===name);if(!group)return null;
 const col=(group[2]===1?0:5)+group[1],dates=[];
 for(const [ym,cells] of Object.entries(CAL))for(const day of cells[col]){const d=ym+'-'+pad(day);if(d>=after)dates.push(d);}
 dates.sort();
 return {date:dates[0]||'',weekday:WEEK[group[1]+1],weeks:group[2]===1?'第1・3':'第2・4'};
}
function humanDate(v){const [year,month,day]=v.split('-').map(Number);const week=WEEK[new Date(Date.UTC(year,month-1,day)).getUTCDay()];return month+'月'+day+'日（'+week+'）';}
function schedulePanel(host){
 const box=el('section','guide-schedule');box.append(el('strong','', '収集日（燃やせないごみの日）'));
 const region=getDistrict(),found=nextCollection(region);
 if(found){box.append(el('div','guide-next',found.date?'次回 '+humanDate(found.date):'この年度の収集日は終了'));box.append(el('p','',region+'地区：'+found.weeks+found.weekday+'曜日／朝8:30まで'));}
 else box.append(el('div','guide-next','地区を登録すると、次の収集日を表示'));
 const lbl=el('label','guide-form-label','地区（校下）を選択');
 const select=el('select','guide-district');select.setAttribute('aria-label','収集地区');
 const blank=el('option','', '地区を選んでください');blank.value='';select.append(blank);
 for(const g of GROUPS){const option=el('option','',g[0]);option.value=g[0];select.append(option);}
 select.value=region;lbl.append(select);box.append(lbl);
 box.append(button('この地区を保存',()=>{if(!select.value)return;setDistrict(select.value);if(host?._refresh)host._refresh();},'guide-save'));
 box.append(el('p','guide-small','町名と校下が不明な場合や同じ町名で収集日が異なる場合は、公式住所別検索で確認してください。'));
 box.append(link('町名から校下・収集日を調べる（高岡市公式）',LINKS.towns));
 box.append(link('2026年度の公式収集カレンダー',LINKS.calendar));
 return box;
}
function determine(marks){
 const ids=new Set((marks||[]).map(m=>m.id));
 if(ids.has('battery'))return ['電池・バッテリーの可能性','battery'];
 if(ids.has('spray'))return ['スプレー容器の可能性','spray'];
 if(ids.has('pet'))return ['PETボトルの可能性','pet'];
 if(ids.has('plastic'))return ['プラスチック資源類','plastic'];
 if(ids.has('bottle'))return ['ボトル容器（材質は未確認）','bottle'];
 if(ids.has('aluminum')||ids.has('steel'))return ['金属製容器の可能性','metal'];
 if(ids.has('paper'))return ['紙製容器の可能性','paper'];
 return ['品目を確認してください','unknown'];
}
function render(host,marks,cityId,confirmPlastic){
 if(!host)return;
 const isTakaoka=cityId==='takaoka',found=determine(marks),type=found[1];
 const box=el('section','guide-card');
 box.append(el('div','guide-eyebrow','最初に確認する分別結果'));
 box.append(el('h2','guide-title',found[0]));
 if(isTakaoka&&type==='plastic'){
   box.append(el('p','guide-answer','高岡市では「プラスチック資源類」として出します（対象品の場合）。'));
   box.append(el('p','', '出し方：中身を使い切り、汚れを落として出してください。'));
   box.append(el('p','guide-small','袋は中身が見える透明・半透明の20L以上。プラマークは回収可否を保証しません。'));
   box.append(schedulePanel(host));
   box.append(link('分別の公式根拠（高岡市）',LINKS.plastic));
 }else if(isTakaoka&&type==='bottle'){
   box.append(el('p','', '容器の形は認識しましたが、材質と識別マークをまだ確定できません。'));
   box.append(button('ラベルに「プラ」マークがある → 確認',()=>confirmPlastic&&confirmPlastic(),'guide-confirm'));
   box.append(el('p','guide-small','実物のプラマークを見つけた場合だけ押してください。飲食用PETボトルは別区分です。'));
 }else{
   box.append(el('p','',type==='battery'?'電池類は通常のごみに混ぜないでください。':type==='spray'?'中身・ガスの残量を確認し、市の安全な処分方法を確認してください。':'用途・材質を確認してから、ごみ区分を選びます。'));
   box.append(el('p','guide-small','この段階では収集曜日を断定しません。'));
 }
 if(!isTakaoka)box.append(el('p','guide-small','登録自治体のルールと収集日は未確認です。公式資料を参照してください。'));
 box.append(el('p','guide-disclaimer','写真の認識結果は推定です。材質・内容物・電池の有無を確認し、公式ルールに従ってください。'));
 host.replaceChildren(box);
 host._refresh=()=>render(host,marks,cityId,confirmPlastic);
}
window.GOMI_DISPOSAL_GUIDE={render,nextCollection,determine,GROUPS,LINKS};
})();