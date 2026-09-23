'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.join(__dirname,'..'),{clips,sample}=require('../src/renderer/motion.js');
const context={};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/whale/motion-flow.js'),'utf8'),context);const data=context.PetFlowData;
test('motion fields match the current original drawings and every supported frame boundary',()=>{
 for(const [atlas,hash]of Object.entries(data.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/whale',atlas+'.png'))).digest('hex'),hash,`${atlas}: regenerate motion fields after redrawing`);
 for(const name of ['right','wave','eat','hum']){
  const c=clips[name];let elapsed=name==='right'?600:0;
  for(let i=0;i<c.frames.length;i++){
   const p=sample(name,elapsed+c.times[i]*.25),next=c.frames[i+1]??(c.loop?c.frames[0]:c.frames[i]);
   if(next===c.frames[i]){assert.equal(p.nextFrame,undefined);assert.equal(p.frameMix,undefined);}
   else{assert.equal(p.nextFrame,next);assert.ok(Math.abs(p.frameMix-.25)<1e-8);assert.ok(Number.isInteger(data.entries[`${c.atlas}:${c.frames[i]}:${next}`]));}
   elapsed+=c.times[i];
  }
  assert.equal(sample(name,800,true).frameMix,undefined);
 }
});
