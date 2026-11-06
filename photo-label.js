/* ごみ分別辞典: 写真ラベルOCRと識別表示の候補検出。
 * Tesseract.js / 日本語モデルは遅延読み込み。写真データは外部OCRサービスに送信しない。
 * 文字認識・候補は誤りうるため、最終判定は自治体の公式情報と利用者による確認を必須にする。 */
(function(){
  'use strict';
  let loadPromise = null;
  const CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  function loadLibrary(){
    if(window.Tesseract && typeof window.Tesseract.createWorker === 'function')return Promise.resolve(window.Tesseract);
    if(loadPromise)return loadPromise;
    loadPromise = new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=CDN;s.async=true;
      s.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error('OCRライブラリを読み込めませんでした'));
      s.onerror=()=>reject(Error('OCRライブラリのダウンロードに失敗しました'));
      document.head.append(s);
    }).catch(err=>{loadPromise=null;throw err;});
    return loadPromise;
  }
  function imageForOCR(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{
        URL.revokeObjectURL(url);
        try{
          const limit=1900,scale=Math.min(1,limit/Math.max(img.naturalWidth,img.naturalHeight));
          const canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
          const ctx=canvas.getContext('2d');
          if(!ctx)throw Error('画像の処理に失敗しました');
          ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          const image=canvas.toDataURL('image/jpeg',0.92);
          canvas.width=0;canvas.height=0;resolve(image);
        }catch(err){reject(err);}
      };
      img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('写真を読み込めませんでした'));};
      img.src=url;
    });
  }
  function parse(text){
    const raw=String(text||'').normalize('NFKC').replace(/\r/g,'');
    const compact=raw.replace(/[\s　]/g,'').toUpperCase();
    const marks=[];
    const found=(id,label,evidence)=>{if(!marks.some(x=>x.id===id))marks.push({id,label,evidence});};
    // 「プラスチック」はプラマーク自体を意味しない。商品本体の記述も混在する。
    if(/プラ(?!スチック|イマー|イベート)/.test(compact))found('plastic','「プラ」の文字','ラベル中に「プラ」と読める文字');
    if(/PET\s*1|ペットボトル|ペット素材|PETボトル/i.test(raw))found('pet','PET関連の文字','PET表記またはペットボトルの文字');
    if(/アルミ缶|アルミ製|ALUMIN(?:UM|IUM)/i.test(raw))found('aluminum','アルミ関連の文字','アルミ関連の表示');
    if(/スチール缶|STEEL\s*CAN/i.test(raw))found('steel','スチール関連の文字','スチール関連の表示');
    if(/紙製容器包装|紙パック|紙容器/.test(raw))found('paper','紙容器の文字','紙容器・紙パックに関する表示');
    if(/高圧ガス|LPG|火気と高温|可燃性ガス|エアゾール|噴射剤/.test(raw))found('spray','ガス／噴射の注意書き','スプレー・ガスの可能性');
    if(/リチウムイオン|LI[\s\-]?ION|\d+\s*MAH|WH\b/i.test(raw))found('battery','電池に関する文字','充電式電池の可能性');
    if(/ボトル|容器|本体\s*[:：]\s*(?:PE|PP|PET)|ポリエチレン|ポリプロピレン|クレンジング|シャンプー|洗剤|化粧水|ボディソープ/.test(raw))found('bottle','容器・ボトルに関する文字','製品名・材質などから容器の可能性');
    return {text:raw,marks};
  }
  async function scan(file,onProgress){
    const progress=typeof onProgress==='function'?onProgress:()=>{};
    progress('ラベル画像を準備しています…');
    const image=await imageForOCR(file);
    progress('日本語の読み取り機能を読み込んでいます…（初回はダウンロード）');
    const tesseract=await loadLibrary();
    let worker;
    try{
      worker=await tesseract.createWorker(['jpn','eng'],1,{
        logger:m=>{if(m.status==='loading language traineddata'||m.status==='loading tesseract core')progress('文字認識用のデータを読み込んでいます…');else if(m.status==='recognizing text')progress('ラベルの文字を認識しています…');}
      });
      const response=await worker.recognize(image);
      const parsed=parse(response?.data?.text||'');
      parsed.confidence=Number(response?.data?.confidence)||0;
      return parsed;
    } finally {if(worker)await worker.terminate();}
  }
  const OPTIONS={
    plastic:{title:'プラスチック製容器包装の可能性',patterns:['プラスチック容器包装','プラスチック製容器','ボトル容器'],caution:'プラ表示は素材の識別であり、自治体で回収できる保証ではありません。中身・汚れ・容器の種類も確認してください。'},
    pet:{title:'PETボトルの可能性',patterns:['ペットボトル'],caution:'飲料・特定調味料用PETボトルと、その他のプラスチック容器は扱いが異なることがあります。用途を確認してください。'},
    aluminum:{title:'アルミ缶の可能性',patterns:['アルミ缶','飲食用缶'],caution:'飲料缶か、スプレー・塗料容器かで扱いが異なります。'},
    steel:{title:'スチール缶の可能性',patterns:['スチール缶','飲食用缶'],caution:'内容物・使用用途を確認してください。'},
    paper:{title:'紙製容器包装の可能性',patterns:['紙パック','紙製','紙容器'],caution:'防水加工などの有無も確認してください。'},
    spray:{title:'スプレー缶の可能性（要注意）',patterns:['スプレー缶','カセットボンベ'],caution:'穴あけやガス抜きは危険を伴います。自治体の最新案内を確認してください。'},
    battery:{title:'充電式電池の可能性（要注意）',patterns:['充電式電池','モバイルバッテリー','リチウムイオン電池'],caution:'電池を通常のごみに混ぜないでください。発火・膨張などは写真だけで判定できません。'},
    bottle:{title:'ボトル容器の可能性',patterns:['ボトル','容器'],caution:'容器の材質・内容物・用途・識別表示を確認してください。'}
  };
  window.GOMI_LABEL_OCR={scan,parse,OPTIONS};
})();