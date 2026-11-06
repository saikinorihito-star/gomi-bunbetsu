const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../photo-worker.js'),'utf8').replace(/^import .*;$/m,'');
function harness({failLoad=false,blockFirst=false}={}){
 const messages=[],calls=[],loads=[],batches=[];
 let release,active=0,maxActive=0;
 const blocked=new Promise(r=>release=r);
 const tensor=rows=>({normalize:()=>({tolist:()=>rows})});
 const loader=(kind,value)=>({from_pretrained:async(model,options)=>{
   loads.push(kind);assert.equal(model,'Xenova/mobileclip_s0');assert.equal(options.device,'wasm');assert.equal(options.dtype,'q8');
   if(failLoad){failLoad=false;throw Error('download failed')}
   return value;
 }});
 const textModel=async labels=>({text_embeds:tensor(labels.map(label=>[Number(label),1]))});
 textModel.dispose=async()=>{};
 const env={backends:{onnx:{wasm:{}}}};
 const self={postMessage:m=>messages.push(m)};
 vm.runInNewContext(source,{
   self,env,
   AutoTokenizer:loader('tokenizer',(labels,options)=>{assert.equal(options.padding,'max_length');assert.equal(options.truncation,true);batches.push(labels.length);return labels}),
   AutoProcessor:loader('processor',async image=>image),
   CLIPTextModelWithProjection:loader('text',textModel),
   CLIPVisionModelWithProjection:loader('vision',async image=>{
     calls.push(image);active++;maxActive=Math.max(maxActive,active);
     try{if(blockFirst&&image==='first')await blocked;if(image==='bad')throw Error('decode/inference failed');return {image_embeds:tensor([[1,0]])}}
     finally{active--}
   }),
   RawImage:{read:async image=>image},
   dot:(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0),
   softmax:xs=>{const max=Math.max(...xs);const exps=xs.map(x=>Math.exp(x-max));const sum=exps.reduce((a,b)=>a+b,0);return exps.map(x=>x/sum)}
 });
 const job=(id,image,labels=Array.from({length:17},(_,i)=>String(i)))=>self.onmessage({data:{type:'classify',id,image,labels}});
 return {messages,calls,loads,batches,job,release,env,get maxActive(){return maxActive}};
}
test('inference is serialized; only latest waiting photo runs; split models and text embeddings are reused',async()=>{
 const h=harness({blockFirst:true});const first=h.job(1,'first');await new Promise(setImmediate);
 await h.job(2,'skipped');await h.job(3,'latest');h.release();await first;
 assert.deepEqual(h.calls,['first','latest']);assert.equal(h.maxActive,1);
 assert.deepEqual(h.loads,['tokenizer','processor','text','vision']);assert.deepEqual(h.batches,[8,8,1]);assert.equal(h.env.backends.onnx.wasm.numThreads,1);
 const result=h.messages.find(m=>m.type==='results'&&m.id===3);
 assert.equal(result.results.length,5);assert.equal(result.results[0].label,'16');
 assert(result.results.every(x=>Number.isFinite(x.score)));
 await h.job(4,'new-labels',['0','1']);assert.deepEqual(h.batches,[8,8,1,2]);
});
test('model download failure can be retried',async()=>{
 const h=harness({failLoad:true});await h.job(1,'first');assert(h.messages.some(m=>m.type==='error'&&m.id===1));
 await h.job(2,'retry');assert(h.messages.some(m=>m.type==='results'&&m.id===2));
});
test('image/inference failure does not block the next photo',async()=>{
 const h=harness();await h.job(1,'bad');await h.job(2,'good');
 assert(h.messages.some(m=>m.type==='error'&&m.id===1));assert(h.messages.some(m=>m.type==='results'&&m.id===2));
});
