'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{advanceWalk}=require('../src/main/walk.cjs');
test('fractional walking preserves distance at tiny scales in both directions',()=>{
 for(const direction of [-1,1])for(const scale of [.01,.25,1]){
  let x=0,remainder=0;
  for(let i=1;i<=600;i++){
   const result=advanceWalk(direction*1000,55*scale/60,remainder);x+=result.step;remainder=result.remainder;
   assert.ok(Number.isInteger(x));assert.ok(remainder>=0&&remainder<1);
   assert.ok(Math.abs(x+result.offset-direction*i*55*scale/60)<1e-8);
  }
 }
});
test('walking never overshoots its final native pixel',()=>{
 assert.deepEqual(advanceWalk(-1,9,.8),{step:-1,remainder:0,offset:-0});
 assert.deepEqual(advanceWalk(0,9,.8),{step:0,remainder:0,offset:0});
});
