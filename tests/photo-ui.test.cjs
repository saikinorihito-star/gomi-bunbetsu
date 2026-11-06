const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function harness(){
 const nodes=new Map(),timers=new Map(),workers=[];let timerId=0;
 function element(){return {children:[],listeners:{},append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},addEventListener(type,fn){this.listeners[type]=fn},classList:{add(){},remove(){}},style:{}}}
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement:element,addEventListener(){},body:element()};
 class Worker{constructor(){workers.push(this);this.terminated=false}postMessage(message){this.message=message}terminate(){this.terminated=true}}
 // Expose only the entry points needed to simulate preparation; production has no test API.
 const source=fs.readFileSync(path.join(__dirname,'../photo-ai.js'),'utf8').replace('init();',`window.test={start(){open=true;imageData='photo';currentId++;classify(imageData,currentId)},closePhoto};`);
 const window={};vm.runInNewContext(source,{document,window,Worker,console:{warn(){}},setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),URL:{revokeObjectURL(){}}});
 return {nodes,timers,workers,api:window.test};
}
test('timeout terminates worker; retry button starts a new worker and job',()=>{
 const h=harness();h.api.start();const first=h.workers[0];[...h.timers.values()][0]();assert(first.terminated);
 const retry=h.nodes.get('photoAnalysis').children.find(x=>x.textContent==='もう一度判別する');assert(retry);retry.listeners.click();
 assert.equal(h.workers.length,2);assert(h.workers[1].message.id>first.message.id);
});
test('old job and old worker events cannot replace a new job message',()=>{
 const h=harness();h.api.start();const first=h.workers[0];const id=first.message.id;
 h.api.start();first.onmessage({data:{type:'status',id,message:'old job'}});
 assert.notEqual(h.nodes.get('photoAnalysis').children[0].textContent,'old job');
 h.api.closePhoto();h.api.start();const current=h.workers[1];first.onerror({message:'late error'});
 assert(!current.terminated);first.onmessage({data:{type:'status',id:current.message.id,message:'old worker'}});
 assert.notEqual(h.nodes.get('photoAnalysis').children[0].textContent,'old worker');
});
test('worker failure offers retry; closing clears timer and terminates worker',()=>{
 const h=harness();h.api.start();const first=h.workers[0];first.onerror({message:'failed import'});assert(first.terminated);assert.equal(h.timers.size,0);
 const retry=h.nodes.get('photoAnalysis').children.find(x=>x.textContent==='もう一度判別する');retry.listeners.click();
 h.api.closePhoto();assert(h.workers[1].terminated);assert.equal(h.timers.size,0);
});
