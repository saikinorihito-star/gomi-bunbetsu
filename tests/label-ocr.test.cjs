const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../photo-label.js'),'utf8');
const window={};
vm.runInNewContext(source,{window,document:{},URL:{},Image:function(){}});
const parse=window.GOMI_LABEL_OCR.parse;
function ids(s){return Array.from(parse(s).marks,m=>m.id)}
test('plastic marking evidence differs from generic material text',()=>{
  assert.deepEqual(ids('ボトル：PE／プラ／キャップ：PP'),['plastic','bottle']);
  assert.deepEqual(ids('プラスチック製品の説明'),[]);
  assert.deepEqual(ids('化粧水 ボトル容器'),['bottle']);
});
test('hazard labels are advisory and require municipality confirmation',()=>{
  assert(ids('火気と高温に注意 高圧ガス: LPG').includes('spray'));
  assert(ids('リチウムイオン電池 3000mAh').includes('battery'));
});
test('PET and paper are distinct label candidates',()=>{
  assert(ids('PET1').includes('pet'));
  assert(ids('紙製容器包装').includes('paper'));
  assert(!ids('PET1').includes('plastic'));
});
test('standalone aluminum recycling label is recognized without 缶 or 製',()=>{
  assert.deepEqual(ids('アルミ'),['aluminum']);
  assert.deepEqual(ids('あきかんはリサイクル\nアル ミ'),['aluminum']);
  assert(ids('ALUMINUM').includes('aluminum'));
  assert(!ids('亜鉛・鉄').includes('aluminum'));
});
