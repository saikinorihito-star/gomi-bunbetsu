/* MobileCLIP: 画像はワーカー内で推定し、外部への送信処理はしない。 */
import {pipeline,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels=false;
env.useBrowserCache=true;
let ready=null;
let activeJobId=null;
async function classifier(){
  if(!ready){
    ready=pipeline('zero-shot-image-classification','Xenova/mobileclip_s0',{
      device:'wasm',dtype:'q8',progress_callback:x=>{
        // ダウンロード中の個別ファイル量はモデルごとに異なるため数値は表示しない
        if(x.status==='download')self.postMessage({type:'status',id:activeJobId,message:'AIモデルをダウンロード中です…（初回のみ）'});
      }
    }).catch(e=>{ready=null;throw e;});
  }
  return ready;
}
self.onmessage=async e=>{
  const {type,id,image,labels}=e.data||{};
  if(type!=='classify')return;
  try{
    activeJobId=id;
    self.postMessage({type:'status',id,message:'写真判別用AIを準備しています…'});
    const pipe=await classifier();
    self.postMessage({type:'status',id,message:'写真から品目候補を推定しています…'});
    const result=await pipe(image,labels,{topk:5});
    const arr=Array.isArray(result)?result:(result?[result]:[]);
    self.postMessage({type:'results',id,results:arr.map(x=>({label:x.label,score:x.score}))});
  }catch(err){self.postMessage({type:'error',id,message:String(err?.message||err)});}
};
