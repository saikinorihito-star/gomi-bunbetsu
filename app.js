(() => {
'use strict';
const SEED = window.GOMI_SEED;
const STORAGE_KEY = 'gomi-dictionary-state-v1';
const $ = id => document.getElementById(id);
const sourceList = SEED.sources;
let activeTab='search';
let toastTimer;
let state=loadState();
function loadState(){
  try { const v=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(v && v.version===1 && Array.isArray(v.municipalities)) return v;
  } catch(e) { console.warn(e); }
  return {version:1, current:'takaoka',municipalities:structuredClone(SEED.municipalities),imports:{}, favorites:{},recent:{}};
}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){toast('保存に失敗しました。空き容量を確認してください。');}}
function normalize(s){return String(s??'').normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s\u3000・ー－_()（）\-]/g,'').trim();}
function node(tag,cl='',text){const e=document.createElement(tag);if(cl)e.className=cl;if(text!==undefined)e.textContent=text;return e;}
function elemText(container,tag,text,cls){const e=node(tag,cls,text);container.append(e);return e;}
function button(text,cl,onClick){const e=node('button',cl,text);e.type='button';e.addEventListener('click',onClick);return e;}
function city(){return state.municipalities.find(x=>x.id===state.current)||SEED.municipalities[0];}
function safeUrl(url){try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:'';}catch{return '';}}
function listItems(){
 const data=state.current==='takaoka' ? [...SEED.items] : [];
 const imported=state.imports[state.current]?.items||[];
 const map=new Map();
 for(const v of [...data,...imported]){
    const name=String(v.name||'').trim(),cat=String(v.category||'').trim();
    if(!name||!cat)continue;
    map.set(normalize(name)+'|'+normalize(cat),{...v,name,category:cat});
 }
 if(state.current==='takaoka'){
   for(const v of SEED.overrides){
     for(const k of [...map.keys()])if(k.startsWith(normalize(v.name)+'|'))map.delete(k);
     map.set(normalize(v.name)+'|'+normalize(v.category),v);
   }
 }
 return [...map.values()];
}
function categoryType(item){const c=item.category||'';if(/収集・処理できない|回収できない|収集不可/.test(c))return 'red';if(/拠点|回収ボックス|持ち込み|戸別|窓口/.test(c))return 'orange';if(/金属|家電|有害/.test(c))return 'blue';if(/燃や|資源|びん|缶類|ペットボトル|古紙/.test(c))return 'green';return 'gray';}
function itemKey(item){return state.current+'::'+normalize(item.name)+'::'+normalize(item.category);}
function isFav(item){return !!(state.favorites[state.current]||[]).includes(itemKey(item));}
function favToggle(item){const arr=state.favorites[state.current]||[];const key=itemKey(item);state.favorites[state.current]=arr.includes(key)?arr.filter(x=>x!==key):[...arr,key];save();toast(arr.includes(key)?'お気に入りから外しました':'お気に入りに追加しました');}
function toast(s){const t=$('toast');t.textContent=s;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800);}
function categoryLabel(item){const e=node('span','category '+categoryType(item),item.category);return e;}
function displayItems(items,countLabel){const content=$('content');content.replaceChildren();const top=node('div','section-head');top.append(node('div','section-title',countLabel),node('span','section-meta',items.length+' 件'));content.append(top);if(!items.length){const e=node('div','empty');e.append(node('div','emptyicon','⌕'),node('strong','', '該当する品目がありません'),node('div','','別の名称で検索するか、公式PDFを取り込んでください。'));content.append(e);const official=safeUrl(city().sourceUrl);if(official){const b=node('div','actions');b.append(linkEl(official,'自治体の公式分別ページを開く'));content.append(b);}return;}
const list=node('div','cardlist');const subset=items.slice(0,250);for(const item of subset){const b=node('button','itemcard');b.type='button';const main=node('div','itemmain');main.append(node('div','itemname',item.name),categoryLabel(item));if(item.note)main.append(node('div','itemdesc',item.note));b.append(main,node('span','itemright','›'));b.addEventListener('click',()=>detail(item));list.append(b);}content.append(list);if(items.length>subset.length)content.append(node('p','subtle','最初の250件を表示しています。検索語を絞ってください。'));}
function runSearch(){activeTab='search';updateTabs();const q=normalize($('searchInput').value);const items=listItems();if(!q){
  const featured=['モバイルバッテリー','スプレー缶','ペットボトル','スマートフォン','乾電池（マンガン・アルカリのみ）','包丁','冷蔵庫','消火器'];const found=featured.map(n=>items.find(x=>x.name===n)).filter(Boolean);if(!found.length){displayItems([], '品目を検索');return;}displayItems(found,'よく調べる品目');return;
}
const ranked=items.map(x=>{const name=normalize(x.name), reading=normalize(x.yomi||''), aliases=(x.aliases||[]).map(normalize),cat=normalize(x.category);let score=0;if(name===q||aliases.includes(q))score=10;else if(name.startsWith(q))score=8;else if(name.includes(q))score=7;else if(reading.includes(q)||aliases.some(a=>a.includes(q)))score=6;else if(cat.includes(q)&&q.length>=3)score=2;return {x,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.x.name.localeCompare(b.x.name,'ja')).map(x=>x.x);displayItems(ranked,'検索結果');}
function updateTabs(){for(const b of document.querySelectorAll('.navbtn'))b.classList.toggle('active',b.dataset.tab===activeTab);$('cityLabel').textContent=city().name;}
function showTab(tab){activeTab=tab;updateTabs();if(tab==='search')runSearch();if(tab==='favorites')showFavorites();if(tab==='sources')showSources();window.scrollTo({top:0,behavior:'smooth'});}
function showFavorites(){const fav=state.favorites[state.current]||[];displayItems(listItems().filter(x=>fav.includes(itemKey(x))),'お気に入り');}
function header(title){const top=node('div','section-head');top.append(node('div','section-title',title));return top;}
function pNote(text,warning=false){return node('div','notice'+(warning?' warn':''),text);}
function linkEl(url,label){const a=node('a','',label);a.href=safeUrl(url)||'#';a.rel='noopener noreferrer';a.target='_blank';return a;}
function infoSource(item){if(sourceList[item.source])return {...sourceList[item.source], page:item.page};const imp=state.imports[state.current];return {title:item.sourceLabel||'取り込んだ公式資料',url:item.sourceUrl||imp?.sourceUrl||city().sourceUrl,revised:item.updated||imp?.sourceDate||'',page:item.page};}
function detail(item){
 const s=sheet(item.name);s.append(categoryLabel(item),node('div','result-category',item.category));
 if(categoryType(item)==='red')s.append(pNote('この品目は通常の集積場では回収できません。専門業者や購入店など、公式案内で指定された方法を確認してください。',true));
 if(categoryType(item)==='orange' && /電池|バッテリー/.test(item.name))s.append(pNote('電池・バッテリーは発煙・発火のおそれがあります。通常のごみに混ぜないでください。',true));
 if(item.source==='spray')s.append(pNote('火災防止のため、ガスが残ったままごみに出さないでください。中身を安全に使い切れない場合は、市の環境政策課へ確認してください。',true));
 elemText(s,'h3','出し方・注意事項');
 s.append(node('div','result-text',item.note||'この品目について、公式一覧表には追加の注意事項が記載されていません。'));
 if(state.current==='takaoka' && item.source!=='battery' && /充電式電池|ボタン型|リチウム|ニカド/.test(item.note||'')) s.append(pNote('この一覧表の電池の回収先案内は2026年9月の制度変更前の可能性があります。下の最新の市の公式案内も確認してください。',true),linkEl(sourceList.battery.url,'2026年9月の電池回収案内を見る'));
 const src=infoSource(item);elemText(s,'h3','情報の出典');const sb=node('div','sourcebox');elemText(sb,'strong',src.title);if(src.revised||src.page)elemText(sb,'small',[(src.revised?'資料日付：'+src.revised:''),(src.page?'一覧表：'+src.page+'ページ':'')].filter(Boolean).join(' ／ '));
 const url=safeUrl(src.url);if(url)sb.append(linkEl(url+(src.page&&url.endsWith('.pdf')?'#page='+src.page:''),'自治体の公式資料を開く'));else sb.append(node('span','subtle','公式URLが未登録です。'));s.append(sb);
 const actions=node('div','actions');actions.append(button(isFav(item)?'★ お気に入り解除':'☆ お気に入りに追加','secondary',()=>{favToggle(item);closeSheet();if(activeTab==='favorites')showFavorites();}),button('閉じる','primary',closeSheet));s.append(actions);}
function sheet(title){const wrap=$('overlay');wrap.replaceChildren();const s=node('div','sheet');s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');s.append(node('div','sheet-grab'));const top=node('div','sheet-top');top.append(node('div','sheet-title',title),button('×','close',closeSheet));s.append(top);wrap.append(s);wrap.classList.remove('hidden');wrap.onclick=e=>{if(e.target===wrap)closeSheet();};document.body.style.overflow='hidden';return s;}
function closeSheet(){$('overlay').classList.add('hidden');$('overlay').replaceChildren();document.body.style.overflow='';}
function showCityPicker(){const s=sheet('自治体の選択');s.append(node('p','','ごみの分別ルールは自治体ごとに異なります。'));for(const m of state.municipalities){const b=button(m.name+(m.id===state.current?'　✓':''),'selectrow'+(m.id===state.current?' selected':''),()=>{state.current=m.id;save();closeSheet();showTab('search');});s.append(b);}s.append(node('hr','sectionline'));s.append(button('＋ 新しい自治体を登録','primary',registerCity));}
function registerCity(){const s=sheet('自治体を登録');s.append(node('p','','自治体名と公式分別資料のURLを登録します。データの取り込みは登録後に行います。'));elemText(s,'label','自治体名','fieldlabel');const name=node('input','textinput');name.placeholder='例：富山県射水市';name.maxLength=80;s.append(name);elemText(s,'label','公式分別ページURL（任意）','fieldlabel');const url=node('input','textinput');url.placeholder='https://...';url.type='url';s.append(url);s.append(node('p','subtle','他の自治体のPDFは表の構造が異なるため、自動取込に失敗することがあります。その場合はCSV形式に変換して取り込めます。'));s.append(button('この自治体を登録','primary',()=>{const n=name.value.trim(),u=url.value.trim();if(!n){toast('自治体名を入力してください');return;}if(u&&!safeUrl(u)){toast('公式URLは https:// から入力してください');return;}const id='city-'+Date.now();state.municipalities.push({id,name:n,sourceUrl:u,note:'分別データ未登録'});state.current=id;save();closeSheet();showTab('sources');toast('自治体を登録しました');}));}
function showSources(){const c=$('content');c.replaceChildren();c.append(header('登録した自治体'));const m=city();const card=node('div','sourcebox');card.append(node('strong','',m.name),node('div','subtle',m.note||'公式分別資料を取り込みできます。'));if(safeUrl(m.sourceUrl))card.append(linkEl(m.sourceUrl,'自治体の公式ページ'));c.append(card);
const ib=state.imports[state.current];c.append(pNote((state.current==='takaoka'?'確認済みのサンプル品目と2026年9月の追加案内を内蔵。':'')+(ib?'取り込み済み：'+ib.items.length+'件（'+(ib.importedAt||'')+'）':'公式資料を取り込むと、検索できる品目が増えます。')));
const btns=node('div','actions');btns.append(button('自治体を切り替え','secondary',showCityPicker),button('公式資料を取り込む','primary',showImport));c.append(btns);
if(state.current==='takaoka'){
  c.append(header('高岡市の公式資料'));
  for(const key of ['battery','spray','list','forbidden']){
    const src=sourceList[key],b=node('div','sourcebox');b.append(node('strong','',src.title),node('small','',`資料の日付：${src.revised}`),linkEl(src.url,'公式資料を開く'));c.append(b);
  }
}
c.append(node('div','hint-title','品目別の検索'));const listBtn=button('回収できない品目を表示　›','selectrow',()=>{$('searchInput').value='収集・処理できないごみ';showTab('search');});c.append(listBtn);
c.append(node('div','hint-title','データの保護'));const backup=node('div','actions');backup.append(button('データをバックアップ','secondary',downloadBackup),button('バックアップを復元','secondary',()=>{$('backupFile').click()}));c.append(backup);const backInp=node('input');backInp.id='backupFile';backInp.type='file';backInp.accept='.json,application/json';backInp.hidden=true;backInp.onchange=e=>restoreBackup(e.target.files?.[0]);c.append(backInp);
c.append(node('p','subtle','このアプリはごみ分別データとお気に入りを使用端末のブラウザ内に保存します。情報の自動更新や他端末との同期はしません。ブラウザのデータ削除に備えてバックアップを保管してください。'));
}
function showImport(){const s=sheet('公式資料を取り込む');s.append(node('p','','自治体が公開する「品目名・分別区分・備考」の一覧表を検索用データに変換して保存します。'));
const n=pNote('高岡市の72ページの公式PDFを読み取れる4列形式の解析器を搭載。他自治体のPDFはレイアウトが違うと正しく解析できません。CSV・TSV・JSON形式なら自治体を問わず取り込めます。');s.append(n);
const imp=state.imports[state.current];if(imp)s.append(node('p','subtle','現在の取り込み：'+imp.items.length+'件。再取込すると、同自治体の前回の取り込みデータを置き換えます。'));
const official=safeUrl(state.current==='takaoka'?sourceList.list.url:city().sourceUrl);if(official){s.append(linkEl(official,'① 公式分別資料を開き、PDFを「ファイル」に保存'));}else{s.append(node('p','subtle','① 自治体の公式サイトで分別資料を保存してください。'));}
s.append(node('div','hint-title','② ダウンロードした資料を選択'));const label=node('label','upload','PDF / CSV / TSV / JSON ファイルを選択');const input=node('input');input.type='file';input.accept='.pdf,.csv,.tsv,.json,application/pdf,text/csv,application/json';input.onchange=async()=>{if(input.files?.[0]){const f=input.files[0];closeSheet();await importFile(f);}};label.append(input);s.append(label);
s.append(node('p','subtle','CSVの列名：品目名, 分別区分, 出し方, 読み, 出典URL, 最終確認日。PDFでは自動抽出結果を確認してから登録します。'));const acts=node('div','actions');acts.append(button('CSV見本を保存','secondary',downloadTemplate),button('閉じる','secondary',closeSheet));s.append(acts);
}
function csvRows(text){const rows=[];let row=[],val='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){val+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===','||c==='\t')){row.push(val);val='';}else if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&text[i+1]==='\n')i++;row.push(val);if(row.some(v=>v.trim()))rows.push(row);row=[];val='';}else val+=c;}row.push(val);if(row.some(v=>v.trim()))rows.push(row);return rows;}
function textRecords(t){const rows=csvRows(t.replace(/^\ufeff/,''));if(rows.length<2)throw Error('見出し行とデータ行が必要です');const h=rows[0].map(normalize);const idx=(...options)=>h.findIndex(k=>options.some(x=>normalize(x)===k));const ni=idx('品目名','ごみ名','名称','品目','name','item'),ci=idx('分別区分','分別','分類','category'),memo=idx('出し方','備考','注意事項','note'),reading=idx('読み','索引','ふりがな','yomi'),link=idx('出典URL','公式URL','sourceurl'),date=idx('最終確認日','資料日付','updated');if(ni<0||ci<0)throw Error('CSVの「品目名」と「分別区分」の列が見つかりません');return rows.slice(1).map(r=>({name:(r[ni]||'').trim(),category:(r[ci]||'').trim(),note:memo>=0?(r[memo]||'').trim():'',yomi:reading>=0?(r[reading]||'').trim():'',sourceUrl:link>=0?safeUrl(r[link]):'',updated:date>=0?r[date]:''})).filter(x=>x.name&&x.category);}
function jsonRecords(t){const v=JSON.parse(t);const arr=Array.isArray(v)?v:v.items;if(!Array.isArray(arr))throw Error('JSON形式に items 配列がありません');return arr.map(x=>({name:String(x.name||x['品目名']||'').trim(),category:String(x.category||x['分別区分']||'').trim(),note:String(x.note||x['出し方']||'').trim(),yomi:String(x.yomi||'').trim(),sourceUrl:safeUrl(x.sourceUrl||''),updated:String(x.updated||''),page:x.page||null})).filter(x=>x.name&&x.category);}
async function importFile(file){const status=sheet('資料を解析中');const label=node('div','loader',`「${file.name}」を読み込んでいます…`);status.append(label);await new Promise(r=>setTimeout(r,60));try{
  const ext=file.name.toLowerCase().split('.').pop();let items=[];
  if(ext==='pdf'||file.type==='application/pdf')items=await pdfRecords(file,txt=>{label.textContent=txt;});
  else if(ext==='json')items=jsonRecords(await file.text());
  else items=textRecords(await file.text());
  if(items.length<1)throw Error('取り込める品目がありませんでした');
  if(ext==='pdf'&&items.length<20)throw Error('PDFの表の抽出件数が少なすぎます。読み取り形式が対応していない可能性があります。CSVをご利用ください。');
  if(items.some(x=>!/\S/.test(x.name)))throw Error('不正な品目データがありました');
  closeSheet();showImportPreview(items,file.name);
}catch(e){closeSheet();const s=sheet('読み込みに失敗');s.append(pNote(e.message||String(e),true),node('p','','自治体によってPDFの表形式が異なります。CSV見本の列構成に合わせて変換したファイルを取り込んでください。'));s.append(button('戻る','primary',showImport));}}
function showImportPreview(items,filename){const s=sheet('取り込み内容を確認');s.append(pNote(`${items.length} 件の品目を抽出しました。これは機械的に読み取った結果です。分別区分や注意事項を公式PDFと照合してから保存してください。`));const check=items.filter(v=>/モバイルバッテリー|スプレー缶|ペットボトル/.test(v.name)).slice(0,4);const preview=[...check,...items.filter(v=>!check.includes(v)).slice(0,4)];const box=node('div','preview');for(const v of preview)box.append(node('div','',`・${v.name} → ${v.category}${v.note?' ／ '+v.note.slice(0,60):''}`));s.append(box);s.append(node('p','subtle',`取り込み元：${filename}。データの日付は資料記載の発行日を別途確認してください。高岡市の充電式電池に関する2026年9月の案内は、取り込みPDFより優先されます。`));const actions=node('div','actions');actions.append(button('キャンセル','secondary',closeSheet),button(`${items.length}件を登録`,'primary',()=>{state.imports[state.current]={items:items.map(x=>({...x,sourceLabel:filename})),sourceUrl:state.current==='takaoka'?sourceList.list.url:city().sourceUrl,sourceDate:'',importedAt:new Date().toLocaleDateString('ja-JP')};save();closeSheet();showTab('search');toast(`${items.length}件を登録しました`);}));s.append(actions);}
async function pdfRecords(file,progress){
  // PDF.js はオンライン読み込み。読み取り対象のPDF自体はネット送信しません。
  let pdfjs;try{pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');}catch(e){throw Error('PDF解析ライブラリの取得に失敗しました。インターネット接続を確認するかCSVを使用してください。');}
  pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  const buffer=await file.arrayBuffer();const task=pdfjs.getDocument({data:new Uint8Array(buffer)});const pdf=await task.promise;const records=[];
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    if(pageNo%2===0||pageNo===1)progress(`${pageNo} / ${pdf.numPages}ページ解析中…（PDFは端末内で処理）`);
    await new Promise(r=>requestAnimationFrame(r));
    const page=await pdf.getPage(pageNo);const viewport=page.getViewport({scale:1.5});
    const canvas=document.createElement('canvas');canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    await page.render({canvasContext:ctx,viewport}).promise;
    const lines=findTableRules(ctx,canvas.width,canvas.height);
    if(lines.length<6){page.cleanup();continue;}
    const text=await page.getTextContent();const tokens=text.items.filter(it=>it.str&&it.transform).map(it=>{const [x,y]=viewport.convertToViewportPoint(it.transform[4],it.transform[5]);return {x,y,str:it.str};});
    const xbreak=[.174,.468,.662].map(x=>canvas.width*x);
    for(let r=0;r<lines.length-1;r++){
      const from=lines[r]+1,to=lines[r+1]-1;
      if(to-from<9)continue;
      const cols=[[],[],[],[]];
      for(const t of tokens){if(t.y<from||t.y>to||t.x<canvas.width*.082||t.x>canvas.width*.9)continue;const col=t.x<xbreak[0]?0:t.x<xbreak[1]?1:t.x<xbreak[2]?2:3;cols[col].push(t);}
      const parts=cols.map(a=>a.sort((a,b)=>a.y-b.y||a.x-b.x).map(t=>t.str).join('').replace(/\s+/g,' ').trim());
      const name=parts[1],category=parts[2],note=parts[3],yomi=parts[0];
      if(!name||!category||name==='ごみ名'||category==='分別区分'||/^(ごみ名|家庭ごみ)/.test(name))continue;
      if(name.length>120||category.length>150)continue;
      records.push({name,category,note,yomi,page:pageNo});
    }
    canvas.width=0;canvas.height=0;page.cleanup();
  }
  if(pdf.destroy)await pdf.destroy();
  const dedup=new Map();for(const x of records)dedup.set(normalize(x.name)+'|'+normalize(x.category),x);
  return [...dedup.values()];
}
function findTableRules(ctx,w,h){
  const data=ctx.getImageData(0,0,w,h).data;const xpoints=[.116,.223,.325,.414,.53,.595,.735,.83].map(x=>Math.floor(x*w));const lineYs=[];
  for(let y=Math.floor(h*.09);y<Math.floor(h*.94);y++){
    let hits=0;
    for(const x of xpoints){let dark=false;for(let dx=-1;dx<=1;dx++){const k=(y*w+x+dx)*4;if(data[k]<145&&data[k+1]<145&&data[k+2]<145){dark=true;break;}}if(dark)hits++;}
    if(hits>=7)lineYs.push(y);
  }
  const groups=[];for(const y of lineYs){const last=groups[groups.length-1];if(last&&y-last[last.length-1]<=2)last.push(y);else groups.push([y]);}
  return groups.map(a=>Math.round((a[0]+a[a.length-1])/2));
}
function download(filename,content,mime){const blob=new Blob([content],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}
function downloadTemplate(){download('bunbetsu_template.csv','品目名,分別区分,出し方,読み,出典URL,最終確認日\nサンプル品目,分別区分,自治体の説明,さんぷる,https://example.com/,2026-11-06\n','text/csv;charset=utf-8');toast('CSV見本を保存しました');}
function downloadBackup(){download('gomi-bunbetsu-backup.json',JSON.stringify({app:'gomi-dictionary',version:1,state},null,2),'application/json;charset=utf-8');toast('バックアップを保存しました');}
async function restoreBackup(file){if(!file)return;try{const x=JSON.parse(await file.text());if(x.app!=='gomi-dictionary'||x.version!==1||!x.state?.municipalities)throw Error('このアプリのバックアップではありません');if(!confirm('現在の自治体・お気に入り・取り込みデータをバックアップの内容で置き換えます。続けますか？'))return;state=x.state;save();showTab('sources');toast('バックアップを復元しました');}catch(e){toast('復元できません：'+e.message);}}
function init(){for(const b of document.querySelectorAll('.navbtn'))b.addEventListener('click',()=>showTab(b.dataset.tab));$('openSettings').onclick=()=>showTab('sources');$('cityPicker').onclick=showCityPicker;$('searchInput').addEventListener('input',()=>{if(activeTab!=='search')activeTab='search';runSearch();});
for(const q of ['モバイルバッテリー','スプレー缶','ペットボトル','包丁'])$('quickChips').append(button(q,'',()=>{$('searchInput').value=q;showTab('search');}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet();});runSearch();if('serviceWorker'in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
window.GOMI_PHOTO_API={listItems,detail,runSearch};
init();
})();
