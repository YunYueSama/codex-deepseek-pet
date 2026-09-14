'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Companion}=require('../src/main/behavior.cjs');
function setup(){let time=100000;return {brain:new Companion({now:()=>time,random:()=>0}),advance:n=>time+=n};}
test('dragging cannot be interrupted by random or lower priority actions',()=>{const {brain,advance}=setup();brain.interact('drag');assert.equal(brain.play('hungry','',1000,5),false);advance(1000);brain.tick();assert.equal(brain.action,'drag');brain.interact('drop');assert.equal(brain.action,'protest');});
test('focus suppresses wandering and completes once at its deadline',()=>{const {brain,advance}=setup();brain.setMode('focus',1);advance(50000);brain.tick();assert.equal(brain.canWander(),false);advance(10001);brain.tick();assert.equal(brain.action,'stretch');assert.equal(brain.focusCount,1);advance(100000);brain.tick();assert.equal(brain.focusCount,1);});
test('system idle sleeps and user return rises before idle',()=>{const {brain,advance}=setup();brain.context({idleSeconds:200});assert.equal(brain.action,'sleep');assert.equal(brain.canWander(),false);advance(1000);brain.context({idleSeconds:0});assert.equal(brain.action,'wake');assert.equal(brain.away,false);assert.equal(brain.canWander(),false);advance(2000);brain.tick();assert.equal(brain.action,'idle');});
test('quiet mode and full screen do not initiate context chatter',()=>{const {brain,advance}=setup();brain.setMode('quiet');advance(5000);brain.tick();brain.context({category:'code'});assert.equal(brain.action,'idle');brain.setMode('company');advance(5000);brain.tick();brain.context({category:'media',fullscreen:true});assert.equal(brain.action,'idle');});
test('feeding clamps satiety and never invokes network',()=>{const {brain}=setup();for(let n=0;n<100;n++)brain.interact('feed');assert.equal(brain.fullness,100);assert.equal(brain.action,'eat');assert.equal(brain.chatBusy,false);});
test('chat prevents walking and idle action until completion',()=>{const {brain,advance}=setup();brain.chatBusy=true;brain.play('think','',60000,90);advance(90000);brain.tick();assert.equal(brain.action,'think');assert.equal(brain.canWander(),false);});
test('repeated interaction keeps the animation start and postpones autonomous gestures',()=>{
 const {brain,advance}=setup();brain.interact('pet');const started=brain.started;
 advance(300);brain.interact('pet');assert.equal(brain.started,started);
 advance(10000);brain.tick();assert.equal(brain.action,'idle');assert.ok(brain.nextIdle>brain.now());assert.ok(brain.nextIdle<=brain.until+40000);
});
test('autonomous gestures are spaced and do not repeat the last two',()=>{
 const {brain,advance}=setup(),seen=[];
 for(let i=0;i<4;i++){advance(brain.nextIdle-brain.now()+1);brain.tick();assert.ok(!seen.slice(-2).includes(brain.action));seen.push(brain.action);assert.ok(brain.nextIdle-brain.now()>=19400);assert.equal(brain.message,'');}
});

test('finite interaction releases its lock when the drawn clip ends',()=>{
 const {brain,advance}=setup();brain.interact('dance');
 const duration=require('../src/renderer/motion.js').clips.dance.times.reduce((a,b)=>a+b,0);
 assert.equal(brain.until-brain.started,duration);advance(duration+1);brain.tick();assert.equal(brain.action,'idle');
});

test('ten minute company rhythm is active without random emotional performances',()=>{
 const {brain,advance}=setup();let last=brain.revision;const events=[];
 for(let i=0;i<600;i++){advance(1000);brain.context({idleSeconds:0});brain.tick();if(last!==brain.revision&&brain.action!=='idle')events.push(brain.action);last=brain.revision;}
 assert.ok(events.length>=15&&events.length<=30);assert.ok(events.every(a=>['shift','settle','breathe'].includes(a)));
});
test('expressive idle needs context and quiet/fullscreen suppresses autonomous motion',()=>{
 const {brain,advance}=setup();brain.fullness=20;advance(180001);brain.tick();assert.equal(brain.action,'hungry');
 advance(30000);brain.tick();assert.notEqual(brain.action,'hungry');
 for(const mode of ['focus','quiet']){brain.setMode(mode,25);advance(60000);brain.tick();assert.equal(brain.action,'idle');}
 brain.setMode('company');brain.context({fullscreen:true});advance(60000);brain.tick();assert.equal(brain.action,'idle');
});
