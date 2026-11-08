const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../disposal-guide.js'),'utf8');
const window={};
const localStorage={getItem(){return null},setItem(){}};
vm.runInNewContext(src,{window,localStorage,document:{createElement(tag){return {tagName:tag,append(){},replaceChildren(){},setAttribute(){},style:{},value:''}}},Date,Intl});
const guide=window.GOMI_DISPOSAL_GUIDE;
function date(name,after){return guide.nextCollection(name,after)?.date}
test('official district calendar: first/third and second/fourth dates differ',()=>{
 assert.equal(date('野村','2026-11-07'),'2026-11-18');
 assert.equal(date('定塚','2026-11-07'),'2026-11-11');
 assert.equal(date('川原','2026-11-07'),'2026-11-16');
 assert.equal(date('成美','2026-11-07'),'2026-11-13');
});
test('official 2026 calendar exceptions must not be guessed',()=>{
 assert.equal(date('川原','2026-05-01'),'2026-05-18');
 assert.equal(date('守山','2027-01-01'),'2027-01-15');
 assert.equal(date('東五位','2027-01-01'),'2027-01-25');
 assert.equal(date('野村','2027-04-01'),'');
});
test('classification requires photo or user evidence; a bottle alone is not PET',()=>{
 assert.equal(guide.determine([{id:'bottle'}])[1],'bottle');
 assert.equal(guide.determine([{id:'bottle'},{id:'plastic'}])[1],'plastic');
 assert.equal(guide.determine([{id:'bottle'},{id:'pet'}])[1],'pet');
 assert.equal(guide.determine([{id:'bottle'},{id:'battery'},{id:'plastic'}])[1],'battery');
 assert.equal(guide.determine([{id:'spray'},{id:'plastic'}])[1],'spray');
});
test('aluminum labels outrank the generic bottle category, but hazards retain priority',()=>{
 assert.equal(guide.determine([{id:'bottle'},{id:'aluminum'}])[1],'aluminum');
 assert.equal(guide.determine([{id:'aluminum'},{id:'foodcan'}])[1],'aluminum');
 assert.equal(guide.determine([{id:'aluminum'},{id:'spray'}])[1],'spray');
 assert.equal(guide.determine([{id:'aluminum'},{id:'battery'}])[1],'battery');
});
