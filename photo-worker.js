/* MobileCLIP: 画像はワーカー内で推定し、外部への送信処理はしない。 */
import {AutoTokenizer,AutoProcessor,CLIPTextModelWithProjection,CLIPVisionModelWithProjection,RawImage,dot,softmax,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels=false;
env.useBrowserCache=true;
// GitHub Pages のように cross-origin isolation のない環境でも実行する。
env.backends.onnx.wasm.numThreads=1;
const MODEL='Xenova/mobileclip_s0';
let ready=null;
let activeJobId=null;
let pendingJob=null;
let running=false;
let cachedLabels=null;
let cachedEmbeddings=null;
async function classifier(){
  if(!ready){
    ready=(async()=>{
      const options={device:'wasm',dtype:'q8',progress_callback:x=>{
        if(x.status==='download')self.postMessage({type:'status',id:activeJobId,message:'AIモデルをダウンロード中です…（初回のみ）'});
      }};
      const tokenizer=await AutoTokenizer.from_pretrained(MODEL,options);
      const processor=await AutoProcessor.from_pretrained(MODEL,options);
      const textModel=await CLIPTextModelWithProjection.from_pretrained(MODEL,options);
      try{
        const visionModel=await CLIPVisionModelWithProjection.from_pretrained(MODEL,options);
        return {tokenizer,processor,textModel,visionModel};
      }catch(err){await textModel.dispose();throw err;}
    })().catch(e=>{ready=null;throw e;});
  }
  return ready;
}
async function predict(image,labels){
  const {tokenizer,processor,textModel,visionModel}=await classifier();
  const key=JSON.stringify(labels);
  if(key!==cachedLabels){
    const embeddings=[];
    // 全候補を一度に推論せず、iPhone の一時メモリー使用量を抑える。
    for(let start=0;start<labels.length;start+=8){
      const inputs=tokenizer(labels.slice(start,start+8),{padding:'max_length',truncation:true});
      const {text_embeds}=await textModel(inputs);
      embeddings.push(...text_embeds.normalize().tolist());
    }
    cachedLabels=key;cachedEmbeddings=embeddings;
  }
  const input=await RawImage.read(image);
  const {image_embeds}=await visionModel(await processor(input));
  const vector=image_embeds.normalize().tolist()[0];
  const scores=softmax(cachedEmbeddings.map(row=>100*dot(vector,row)));
  return labels.map((label,i)=>({label,score:scores[i]}));
}
async function runJob({id,image,labels}){
  try{
    activeJobId=id;
    self.postMessage({type:'status',id,message:'写真判別用AIを準備しています…'});
    await classifier();
    self.postMessage({type:'status',id,message:'写真から品目候補を推定しています…'});
    const result=await predict(image,labels);
    const arr=Array.isArray(result)?result:(result?[result]:[]);
    self.postMessage({type:'results',id,results:arr.filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score).slice(0,5).map(x=>({label:x.label,score:x.score}))});
  }catch(err){self.postMessage({type:'error',id,message:String(err?.message||err)});}
}

// 推論は直列に実行し、待機中の写真は最後に選ばれたものだけを残す。
self.onmessage=async e=>{
  if(e.data?.type!=='classify')return;
  pendingJob=e.data;
  if(running)return;
  running=true;
  try{
    while(pendingJob){
      const job=pendingJob;pendingJob=null;
      await runJob(job);
    }
  }finally{running=false;activeJobId=null;}
};
