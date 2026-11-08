// npm install --no-save playwright@1.56.1 && npx playwright install chromium
// CHROMIUM_PATH=/usr/bin/chromium node tests/browser-smoke.cjs
// node tests/browser-smoke.cjs --real-model  # also downloads the real model and a public sample photo
const {chromium}=require('playwright');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const key='gomi-dictionary-state-v1';
const saved={version:1,current:'test-city',municipalities:[{id:'takaoka',name:'富山県高岡市'},{id:'test-city',name:'テスト市',sourceUrl:'https://example.com/rules'}],imports:{'test-city':{items:[{name:'テスト容器',category:'テスト資源',note:'保存済み取り込み品目'}]}},favorites:{'test-city':['test-city::てすと容器::てすと資源']},recent:{'test-city':['テスト容器']}};
const server=http.createServer(async(req,res)=>{
 try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root+path.sep))throw Error('invalid path');
   const data=await fs.readFile(file);
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(data);
 }catch{res.statusCode=404;res.end('Not found')}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const proxy=process.env.HTTPS_PROXY||process.env.HTTP_PROXY;
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),...(proxy?{proxy:{server:proxy,bypass:'127.0.0.1,localhost'}}:{})});
 try{
   const context=await browser.newContext({serviceWorkers:'block'});
   await context.addInitScript(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key,saved});
   // Deterministic offline error test; actual model is exercised separately below.
   await context.route('https://cdn.jsdelivr.net/**',route=>route.abort());
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin);assert.equal(await page.locator('#cityLabel').textContent(),'テスト市');
   await page.locator('#searchInput').fill('テスト容器');await page.locator('.itemname').filter({hasText:'テスト容器'}).waitFor();
   await page.locator('[data-tab="favorites"]').click();assert.equal(await page.locator('.itemname').textContent(),'テスト容器');
   await page.locator('#cityPicker').click();await page.getByRole('button',{name:'富山県高岡市',exact:true}).click();
   await page.locator('#searchInput').fill('モバイルバッテリー');assert((await page.locator('.itemname').allTextContents()).includes('モバイルバッテリー'));
   await page.locator('#cityPicker').click();await page.getByRole('button',{name:'テスト市',exact:true}).click();
   const before=await page.evaluate(key=>localStorage.getItem(key),key);assert.deepEqual(JSON.parse(before),saved);
   await page.locator('#openPhoto').click();
   // Aluminum label → direct Takaoka disposal instructions → drink-can confirmation → collection day.
   await page.evaluate(()=>{
     const host=document.getElementById('photoQuickResult');
     const paint=marks=>window.GOMI_DISPOSAL_GUIDE.render(host,marks,'takaoka',()=>paint([{id:'aluminum'},{id:'foodcan'}]));
     paint([{id:'aluminum',label:'アルミ'}]);
   });
   assert.match(await page.locator('#photoQuickResult').textContent(),/飲食用缶類/);
   await page.locator('#photoQuickResult').getByRole('button',{name:'これは飲食用の缶です → 収集日を表示'}).click();
   assert(await page.locator('#photoQuickResult .guide-schedule').isVisible());
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
   await page.locator('#photoLibrary').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:png});
   await page.locator('.photo-visual-details > summary').click();
   await page.getByRole('button',{name:'もう一度判別する',exact:true}).waitFor();
   await page.getByRole('button',{name:'もう一度判別する',exact:true}).click();await page.getByRole('button',{name:'もう一度判別する',exact:true}).waitFor();
   await page.getByRole('button',{name:'文字で検索する',exact:true}).click();
   await page.locator('#searchInput').fill('テスト容器');assert.equal(await page.locator('.itemname').textContent(),'テスト容器');
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);assert.deepEqual(errors,[]);
   console.log('PASS: Chromium UI — saved city, imported text search, favorites, city switching, photo failure/retry, storage unchanged');
   await context.close();
   if(process.argv.includes('--real-model')){
     const real=await browser.newContext({serviceWorkers:'block'});const page=await real.newPage();await page.goto(origin);
     const response=await real.request.get('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/cats.jpg');
     assert(response.ok(),`sample download: ${response.status()}`);const buffer=await response.body();
     const result=await page.evaluate(async image=>{
       const worker=new Worker('./photo-worker.js',{type:'module'});
       try{return await new Promise((resolve,reject)=>{
         const timer=setTimeout(()=>{worker.terminate();reject(Error('real model timed out after 180 seconds'))},180000);
         worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))};
         worker.onmessage=e=>{if(e.data.type==='results'){clearTimeout(timer);resolve(e.data.results)}if(e.data.type==='error'){clearTimeout(timer);reject(Error(e.data.message))}};
         worker.postMessage({type:'classify',id:1,image,labels:['a photograph of cats','a photograph of dogs','a photograph of birds']});
       })}finally{worker.terminate()}
     },`data:image/jpeg;base64,${buffer.toString('base64')}`);
     console.log('Real model scores:',JSON.stringify(result));
     assert.equal(result[0].label,'a photograph of cats');assert(result.every(x=>Number.isFinite(x.score)));
     console.log('PASS: real MobileCLIP text q8 / vision FP32 WASM inference in Chromium:',JSON.stringify(result));
     await page.locator('#openPhoto').click();await page.locator('#photoLibrary').setInputFiles({name:'cats.jpg',mimeType:'image/jpeg',buffer});await page.locator('.photo-visual-details > summary').click();
     await page.locator('.photo-candidate').first().waitFor({timeout:180000});assert.equal(await page.locator('.photo-candidate').count(),5);
     await page.getByRole('button',{name:'文字で検索する',exact:true}).click();
     console.log('PASS: real photo upload → resize → worker → five catalog candidates (sample is not a waste item; disposal accuracy is not assessed)');
     await real.close();
   }else console.log('SKIP: real AI inference; run with --real-model when CDN/Hugging Face are reachable');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
