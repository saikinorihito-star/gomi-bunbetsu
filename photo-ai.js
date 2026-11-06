/* 写真判別: 外部APIに写真を送らない。画像認識モデルだけを端末にダウンロードする。
   画像から「品目候補」を提示するものであり、材質・内容物・安全性を証明しない。 */
(() => {
'use strict';
const CATALOG = [
 ['モバイルバッテリー','a photograph of a rectangular portable USB power bank for charging a phone',['モバイルバッテリー','携帯バッテリー','モバ充']],
 ['スプレー缶','a photograph of an aerosol spray can with a plastic spray nozzle',['スプレー缶','エアゾール缶','スプレー容器']],
 ['カセットボンベ','a photograph of a camping butane gas canister for a portable stove',['カセットボンベ','カセットガス','ガス缶']],
 ['乾電池','a photograph of cylindrical AA or AAA disposable alkaline batteries',['乾電池','アルカリ電池','マンガン電池']],
 ['充電式電池','a photograph of a rechargeable lithium ion battery pack',['充電式電池','リチウムイオン電池','リチウム電池']],
 ['ボタン電池','a photograph of small silver coin cell button batteries',['ボタン電池','ボタン型電池']],
 ['ペットボトル','a photograph of a transparent plastic water or soft drink bottle',['ペットボトル']],
 ['ガラスびん','a photograph of an empty glass beverage bottle',['ガラスびん','ガラス瓶','びん','ビン']],
 ['飲料用アルミ缶','a photograph of an aluminum soda drink can',['アルミ缶','飲食用缶','缶（飲食用）']],
 ['缶詰','a photograph of an empty metal food tin can',['スチール缶','缶（飲食用）','缶詰']],
 ['プラスチック容器','a photograph of a plastic food packaging container',['プラスチック容器','容器（プラスチック','プラスチック製）']],
 ['食品トレー','a photograph of a styrofoam food tray',['食品トレー','トレー','発泡スチロール']],
 ['紙コップ','a photograph of a disposable paper cup',['紙コップ']],
 ['段ボール','a photograph of a flattened cardboard shipping box',['段ボール','ダンボール']],
 ['新聞紙','a photograph of a folded newspaper',['新聞紙','新聞']],
 ['雑誌','a photograph of magazines stacked on a table',['雑誌','本（','書籍']],
 ['牛乳パック','a photograph of a paper milk carton',['牛乳パック','紙パック']],
 ['レジ袋','a photograph of a plastic grocery shopping bag',['レジ袋','買物袋']],
 ['食品包装フィルム','a photograph of a clear plastic wrapping film',['ラップ','フィルム','包装フィルム']],
 ['スマートフォン','a photograph of a smartphone mobile phone',['スマートフォン','携帯電話']],
 ['携帯充電器','a photograph of a wall outlet USB phone charger power adapter',['充電器','アダプタ']],
 ['電源コード','a photograph of an electrical cable power cord',['電源コード','コード','ケーブル']],
 ['イヤホン','a photograph of wired earphones or earbuds',['イヤホン','ヘッドホン']],
 ['電球','a photograph of a light bulb',['電球（','白熱灯','LED電球']],
 ['蛍光灯','a photograph of a long fluorescent light tube',['蛍光管','蛍光灯']],
 ['リモコン','a photograph of a television remote control',['リモコン']],
 ['パソコン','a photograph of a laptop computer',['パソコン','ノートパソコン']],
 ['テレビ','a photograph of a flat screen television',['テレビ（','テレビ']],
 ['冷蔵庫','a photograph of a kitchen refrigerator',['冷蔵庫']],
 ['洗濯機','a photograph of a front loading clothes washing machine',['洗濯機']],
 ['電子レンジ','a photograph of a microwave oven',['電子レンジ']],
 ['炊飯器','a photograph of an electric rice cooker',['炊飯器']],
 ['ドライヤー','a photograph of a handheld hair dryer',['ドライヤー','ヘアドライヤー']],
 ['アイロン','a photograph of an electric clothes iron',['アイロン']],
 ['包丁','a photograph of a metal kitchen knife',['包丁']],
 ['フライパン','a photograph of a frying pan',['フライパン']],
 ['鍋','a photograph of a cooking pot',['鍋（','なべ']],
 ['金属スプーン','a photograph of a stainless steel spoon',['スプーン（金属製）']],
 ['プラスチックスプーン','a photograph of a disposable plastic spoon',['スプーン（プラスチック製）']],
 ['ガラスコップ','a photograph of a drinking glass',['コップ（ガラス','ガラスコップ']],
 ['陶磁器の皿','a photograph of a ceramic dinner plate',['皿（陶磁器','陶器','食器（陶器']],
 ['傘','a photograph of a folded umbrella',['傘']],
 ['靴','a photograph of a pair of shoes',['靴','シューズ']],
 ['スリッパ','a photograph of house slippers',['スリッパ']],
 ['衣類','a photograph of a cotton shirt',['衣類','衣服','服（']],
 ['ぬいぐるみ','a photograph of a stuffed plush toy',['ぬいぐるみ']],
 ['おもちゃ','a photograph of a plastic toy for children',['おもちゃ','玩具']],
 ['スポンジ','a photograph of a kitchen cleaning sponge',['スポンジ']],
 ['歯ブラシ','a photograph of a toothbrush',['歯ブラシ']],
 ['タオル','a photograph of a cotton hand towel',['タオル']],
 ['ペン','a photograph of a ballpoint pen',['ボールペン','ペン']],
 ['消火器','a photograph of a red fire extinguisher cylinder',['消火器']],
 ['使い捨てライター','a photograph of a disposable cigarette lighter',['ライター']],
 ['ペンキ缶','a photograph of a can of paint',['ペンキ','塗料']],
 ['木製いす','a photograph of a wooden chair',['いす（木製）','椅子（木製）']],
 ['金属製いす','a photograph of a metal chair',['いす（金属製）','椅子（金属製）']],
 ['ベビーカー','a photograph of a baby stroller',['ベビーカー']],
 ['ホース','a photograph of a coiled garden hose',['ホース']],
 ['板ガラス','a photograph of a broken sheet of window glass',['板ガラス']],
 ['レシート','a photograph of a store receipt',['レシート']]
];
const $=id=>document.getElementById(id);
let worker=null;
let open=false;
let currentId=0;
let photoURL=null;
let imageData=null;
let labelSelection=null;
let jobTimer=null;
function clearJobTimer(){clearTimeout(jobTimer);jobTimer=null;}
function stopWorker(){clearJobTimer();worker?.terminate();worker=null;}
const B=document.createElement.bind(document);
function el(tag,cls,text){const e=B(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(text,cls,fn){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function notice(text,alert=false){return el('div','notice'+(alert?' warn':''),text);}
function resetPhoto(){if(photoURL){URL.revokeObjectURL(photoURL);photoURL=null;}imageData=null;labelSelection=null;}
function showPhotoDialog(){
 open=true;currentId++;
 const shell=$('overlay');shell.replaceChildren();shell.classList.remove('hidden');document.body.style.overflow='hidden';
 const box=el('div','sheet photo-sheet');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','写真で品目を調べる');
 box.append(el('div','sheet-grab'));
 const top=el('div','sheet-top');top.append(el('div','sheet-title','写真で品目を調べる'),btn('×','close',closePhoto));box.append(top);
 box.append(el('p','','品目全体またはラベルの文字・識別マークを明るい場所で撮影してください。文字と外観の両方から候補を探します。'));
 box.append(notice('AIによる推定です。材質・電池の有無・ガス残量・膨張・破損は写真だけでは判断できません。出す前に必ず品目と公式ルールを確認してください。',true));
 const choices=el('div','photo-choices');
 choices.append(btn('📷 カメラで撮影','primary',()=>$('photoCamera').click()),btn('▧ 写真を選ぶ','secondary',()=>$('photoLibrary').click()));box.append(choices);
 const preview=el('div','photo-preview');preview.id='photoPreview';preview.hidden=true;box.append(preview);
 const quick=el('div','photo-quick-result');quick.id='photoQuickResult';box.append(quick);
 const labelPanel=el('section','photo-label-panel');labelPanel.id='photoLabelPanel';labelPanel.setAttribute('aria-live','polite');box.append(labelPanel);
 const analysis=el('div','photo-analysis');analysis.id='photoAnalysis';analysis.append(el('p','subtle','初回は画像認識AI（約90MB目安・別途エンジン取得）のダウンロードが必要です。Wi-Fi推奨。写真は判別サーバーに送らず、このiPhone内で解析します。'));const visual=el('details','photo-visual-details');visual.append(el('summary','','外観AIのその他の候補を見る（参考）'));visual.append(analysis);box.append(visual);
 box.append(btn('文字で検索する','secondary photo-text-link',()=>{closePhoto();$('searchInput').focus();}));
 shell.append(box);shell.onclick=e=>{if(e.target===shell)closePhoto();};
}
function closePhoto(){stopWorker();currentId++;open=false;resetPhoto();$('overlay').replaceChildren();$('overlay').classList.add('hidden');document.body.style.overflow='';}
function pickFile(file){
 if(!file)return;
 if(!file.type.startsWith('image/')){setMessage('画像ファイルを選択してください。',true);return;}
 if(file.size>25*1024*1024){setMessage('25MB以下の写真を選択してください。',true);return;}
 if(!open)showPhotoDialog();
 clearJobTimer();resetPhoto();currentId++;
 photoURL=URL.createObjectURL(file);
 const preview=$('photoPreview');preview.replaceChildren();
 const img=el('img','photo-image');img.src=photoURL;img.alt='撮影した品目の写真';preview.append(img);preview.hidden=false;
 setMessage('ラベルの文字を読み取ってから、外観AIで補助判別します…');
 showLabelControls();
 renderQuickResult([]);
 const job=currentId;
 resizePhoto(file).then(data=>{
   if(!open||job!==currentId)return;
   imageData=data;
   classifyWithLabel(file,data,job);
 }).catch(err=>{if(open&&job===currentId)setMessage('写真を読み込めませんでした。別の写真を選んでください。',true);console.warn(err);});
}
function resizePhoto(file){return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    URL.revokeObjectURL(url);
    try{
      const side=768,scale=Math.min(1,side/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(img.naturalWidth*scale));canvas.height=Math.max(1,Math.floor(img.naturalHeight*scale));
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      const data=canvas.toDataURL('image/jpeg',.82);canvas.width=0;canvas.height=0;resolve(data);
    }catch(e){reject(e);}
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('画像を開けません'));};
  img.src=url;
 });}

function showLabelControls(){
 const target=$('photoLabelPanel');if(!target)return;
 target.replaceChildren();
 target.append(el('h3','photo-results-heading','① ラベル・識別表示を調べる'));
 const msg=el('p','subtle','ラベルを読み取ります。読み取りが難しいマークは、自分で選ぶこともできます。');msg.id='photoLabelStatus';target.append(msg);
 const row=el('div','photo-label-choices');
 const opts=[['plastic','プラ'],['pet','PET'],['paper','紙'],['aluminum','アルミ'],['steel','スチール'],['spray','スプレー'],['battery','電池']];
 for(const [id,title] of opts)row.append(btn(title,'photo-label-choice',()=>{
   labelSelection=id;
   const manual=[{id,label:title+'（本人確認）',evidence:'利用者が写真のマークを確認して選択'}];
   renderQuickResult(manual);
   renderLabelChoices(manual);
 }));
 target.append(row);
 const details=el('details','photo-label-details');details.append(el('summary','','読み取った文字と他の候補を見る'));
 const output=el('div','photo-label-output');output.id='photoLabelOutput';details.append(output);target.append(details);
}
function labelNorm(x){return String(x||'').normalize('NFKC').toLowerCase().replace(/[\s　・()（）_\-ー]/g,'');}
function findLabelMatches(patterns){
 const items=window.GOMI_PHOTO_API.listItems(),terms=patterns.map(labelNorm);
 return items.map(item=>{
    const n=labelNorm(item.name),aliases=(item.aliases||[]).map(labelNorm);
    const exact=terms.some(t=>n===t||aliases.includes(t));
    const partial=terms.some(t=>t.length>=3&&(n.includes(t)||aliases.some(a=>a.includes(t))));
    return {item,rank:exact?2:partial?1:0};
 }).filter(x=>x.rank>0).sort((a,b)=>b.rank-a.rank).slice(0,5).map(x=>x.item);
}
function renderLabelChoices(marks,rawText=''){
 const target=$('photoLabelOutput');if(!target)return;target.replaceChildren();
 const options=window.GOMI_LABEL_OCR?.OPTIONS||{};
 if(marks?.length){
   const summary=el('p','photo-label-evidence','確認した表示：'+marks.map(m=>m.label).join('、'));
   target.append(summary);
 }else target.append(notice('判別可能な表示が見つかりませんでした。マークを選択するか、品目名を検索してください。',true));
 const seen=new Set();
 for(const mark of marks||[]){
   if(seen.has(mark.id))continue;seen.add(mark.id);
   const option=options[mark.id];if(!option)continue;
   const card=el('div','photo-candidate');
   card.append(el('strong','',option.title),el('p','subtle','根拠：'+mark.evidence));
   card.append(notice(option.caution,true));
   const items=mark.id==='bottle'?[]:findLabelMatches(option.patterns);
   if(items.length){
     for(const item of items.slice(0,3)){
       const b=btn(item.name+'　›','photo-match',()=>{closePhoto();window.GOMI_PHOTO_API.detail(item);});
       b.append(el('small','',item.category));card.append(b);
     }
   }else card.append(notice('同名の品目が登録辞典にありません。自動的に分別方法を確定しません。'));
   card.append(btn('この品目に近いものを文字検索','secondary photo-search',()=>searchFor(option.patterns[0])));
   target.append(card);
 }
 if(rawText.trim()){
   const details=el('details','photo-ocr-raw');
   details.append(el('summary','','読み取った文字を表示（誤認識する場合があります）'));
   const pre=el('pre','',rawText.slice(0,1000));details.append(pre);target.append(details);
 }
}
async function classifyWithLabel(file,image,job){
 const status=$('photoLabelStatus');
 try{
   if(!window.GOMI_LABEL_OCR)throw Error('OCRの読み込み機能が見つかりません');
   const result=await window.GOMI_LABEL_OCR.scan(file,progress=>{if(open&&job===currentId&&status)status.textContent=progress;});
   if(!open||job!==currentId)return;
   if(status)status.textContent='日本語OCR完了。結果は推定であり、識別マークを確実に認識したとは限りません。';
   const marks=result.marks||[];
   if(labelSelection&&!marks.some(x=>x.id===labelSelection))marks.unshift({id:labelSelection,label:'利用者によるマーク指定',evidence:'利用者が写真を確認して選択'});
   renderQuickResult(marks,result.text||'');
   renderLabelChoices(marks,result.text||'');
 }catch(err){
   if(!open||job!==currentId)return;
   console.warn('ラベルOCRに失敗しました',err);
   if(status)status.textContent='ラベルの自動読み取りに失敗しました。上のマークを選ぶか、外観AIの候補をご確認ください。';
   if(labelSelection){
     const manual=[{id:labelSelection,label:'利用者によるマーク指定',evidence:'利用者が写真を確認して選択'}];
     renderQuickResult(manual);
     renderLabelChoices(manual);
   }
 }
 if(open&&job===currentId)classify(image,job);
}

function renderQuickResult(marks,rawText=''){
 const target=$('photoQuickResult');if(!target||!window.GOMI_DISPOSAL_GUIDE)return;
 const cityId=window.GOMI_PHOTO_API?.getCurrentCityId?.()||'';
 window.GOMI_DISPOSAL_GUIDE.render(target,marks,cityId,()=>{
   labelSelection='plastic';
   const choice=[{id:'plastic',label:'プラマーク（本人確認）',evidence:'利用者が実物のマークを確認'}];
   renderQuickResult(choice,rawText);
   renderLabelChoices(choice,rawText);
 });
}
function setMessage(msg,warning=false){
  const target=$('photoAnalysis');if(!target)return;
  target.replaceChildren(notice(msg,warning));
}
function getWorker(){
 if(worker)return worker;
 const instance=new Worker('./photo-worker.js',{type:'module'});
 worker=instance;
 instance.onmessage=e=>{
   if(worker!==instance)return;
   const {type,id,results,message}=e.data||{};
   if(!open||id!==currentId)return;
   if(type==='status')setMessage(message);
   if(type==='error'){console.warn(message);stopWorker();showRetry('画像認識を実行できませんでした。通信環境・空き容量を確認してください。');}
   if(type==='results'){clearJobTimer();renderResults(results||[]);}
 };
 instance.onerror=e=>{if(worker!==instance)return;console.warn('画像認識ワーカーを起動できませんでした。',e);stopWorker();if(open&&imageData)showRetry('画像認識エンジンを起動できません。Safariの更新とインターネット接続を確認してください。');};
 return worker;
}
function showRetry(message){
 setMessage(message,true);
 const target=$('photoAnalysis');
 if(target&&imageData)target.append(btn('もう一度判別する','secondary',()=>{currentId++;classify(imageData,currentId);}));
}
function classify(image,job){
 clearJobTimer();
 setMessage('画像認識AIを読み込み中です。初回のみダウンロードが発生します…');
 jobTimer=setTimeout(()=>{
   if(!open||job!==currentId)return;
   stopWorker();showRetry('写真判別が時間内に完了しませんでした。通信環境を確認して再試行するか、文字検索をご利用ください。');
 },180000);
 try{getWorker().postMessage({type:'classify',id:job,image,labels:CATALOG.map(x=>x[1])});}
 catch(e){stopWorker();showRetry('画像認識を開始できませんでした。文字検索も利用できます。');}
}
function norm(s){return String(s||'').normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-96)).replace(/[\s\u3000・ー－_()（）\-]/g,'').trim();}
function itemMatches(items,entry){
 const tokens=entry[2].map(norm).filter(x=>x.length>=2);
 const seen=new Set();
 return items.filter(x=>{
   const name=norm(x.name),aliases=(x.aliases||[]).map(norm);
   const matches=tokens.some(t=>name===t||name.includes(t)||aliases.some(a=>a===t||a.includes(t)));
   if(!matches)return false;
   const key=name+'|'+norm(x.category);
   if(seen.has(key))return false;seen.add(key);return true;
 }).slice(0,8);
}
function renderResults(scores){
 const target=$('photoAnalysis');if(!target)return;target.replaceChildren();
 const api=window.GOMI_PHOTO_API;
 const candidates=scores.map(x=>({idx:CATALOG.findIndex(c=>c[1]===x.label),score:x.score})).filter(x=>x.idx>=0);
 if(!candidates.length){target.append(notice('写真から品目候補を見つけられませんでした。名前で検索してください。',true));return;}
 target.append(el('h3','photo-results-heading','写真から考えられる品目候補'));
 target.append(el('p','subtle','似ている順の候補です。順位は正確さの保証ではありません。実際の品目を選択してください。'));
 const all=api.listItems();
 candidates.slice(0,5).forEach(({idx},n)=>{
   const entry=CATALOG[idx],matches=itemMatches(all,entry);
   const card=el('div','photo-candidate');
   const head=el('div','photo-candidate-head');head.append(el('strong','',`${n+1}. ${entry[0]}`),el('span','subtle',matches.length?`辞典に${matches.length}件`:'辞典に未登録'));card.append(head);
   if(matches.length){
      for(const item of matches.slice(0,3)){
        const b=btn(`${item.name}　›`,'photo-match',()=>{closePhoto();api.detail(item);});
        b.append(el('small','',item.category));card.append(b);
      }
      if(matches.length>3)card.append(btn('ほかの候補を検索','secondary photo-search',()=>searchFor(entry[0])));
   }else card.append(btn('品目名で検索する','secondary photo-search',()=>searchFor(entry[0])));
   target.append(card);
 });
 target.append(notice('判別できたのは「見た目が似た品目」だけです。電池入り製品・内容物が残った容器などは別ルールになる場合があります。',true));
}
function searchFor(query){closePhoto();$('searchInput').value=query;window.GOMI_PHOTO_API.runSearch();$('searchInput').scrollIntoView({behavior:'smooth',block:'center'});}
function init(){
 const camera=$('photoCamera'),library=$('photoLibrary');
 camera.addEventListener('change',e=>{pickFile(e.target.files?.[0]);e.target.value='';});
 library.addEventListener('change',e=>{pickFile(e.target.files?.[0]);e.target.value='';});
 $('openPhoto').addEventListener('click',showPhotoDialog);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)closePhoto();});
}
init();
})();
