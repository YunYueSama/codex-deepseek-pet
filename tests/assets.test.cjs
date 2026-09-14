'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const {PNG}=require('pngjs');const sharp=require('sharp');const root=path.join(__dirname,'..');
test('turn frames have intact transparent margins without fragments from adjacent rows',()=>{
 const png=PNG.sync.read(fs.readFileSync(path.join(root,'assets/whale/motion-turn.png')));
 assert.equal(png.width,2048);assert.equal(png.height,1024);
 for(let frame=0;frame<8;frame++)for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  if(x<12||x>499||y<12||y>499)assert.equal(png.data[((Math.floor(frame/4)*512+y)*png.width+frame%4*512+x)*4+3],0);
 }
});
for(const name of ['actions','expressions','motion-idle','motion-walk'])test(`${name} atlas has populated true-alpha cells`,()=>{
 const count=name==='motion-walk'?32:16;
 const png=PNG.sync.read(fs.readFileSync(path.join(root,'assets/whale',name+'.png')));assert.equal(png.width,2048);assert.equal(png.height,count/4*512);
 for(let cell=0;cell<count;cell++){let opaque=0,zero=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){
 const a=png.data[((Math.floor(cell/4)*512+y)*2048+(cell%4)*512+x)*4+3];if(a>200)opaque++;if(a===0)zero++;
 if(x<10||y<10||x>501||y>501)assert.equal(a,0,`${name} cell ${cell} boundary`);
 }assert.ok(opaque>10000,`${name} cell ${cell} visible`);assert.ok(zero>20000,`${name} cell ${cell} transparent`);}
});
test('Codex desktop and web exports use distinct dimensions and valid manifest',async()=>{
 const dir=path.join(root,'codex-deepseek-pet');const manifest=JSON.parse(fs.readFileSync(path.join(dir,'pet.json')));
 assert.equal(manifest.spriteVersionNumber,2);assert.equal(manifest.spritesheetPath,'spritesheet.webp');
 const desktop=await sharp(path.join(dir,'spritesheet.webp')).metadata(),web=await sharp(path.join(dir,'spritesheet-web.webp')).metadata();
 assert.equal(desktop.width,1536);assert.equal(desktop.height,2288);assert.equal(desktop.hasAlpha,true);assert.equal(web.height,1872);
});

test('front idle has two clear cells and the independently drawn icon has Windows sizes',async()=>{
 const png=PNG.sync.read(fs.readFileSync(path.join(root,'assets/whale/idle-front.png')));
 assert.equal(png.width,1024);assert.equal(png.height,512);
 for(let frame=0;frame<2;frame++){let visible=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const i=(y*1024+frame*512+x)*4,a=png.data[i+3];if(a>200)visible++;
  if(x<12||x>499||y<12||y>499)assert.equal(a,0);
 }assert.ok(visible>30000);}
 const icon=await sharp(path.join(root,'build/icon.png')).metadata();assert.equal(icon.width,512);assert.equal(icon.height,512);assert.equal(icon.hasAlpha,true);
 const ico=fs.readFileSync(path.join(root,'build/icon.ico')),sizes=[];
 for(let i=0;i<ico.readUInt16LE(4);i++)sizes.push(ico[6+i*16]||256);
 for(const size of [16,32,48,256])assert.ok(sizes.includes(size));
});
