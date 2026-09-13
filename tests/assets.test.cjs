'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test');
const {PNG}=require('pngjs');const sharp=require('sharp');const root=path.join(__dirname,'..');
for(const name of ['actions','expressions','motion-idle','motion-walk'])test(`${name} atlas has 16 populated true-alpha cells`,()=>{
 const png=PNG.sync.read(fs.readFileSync(path.join(root,'assets/whale',name+'.png')));assert.equal(png.width,2048);assert.equal(png.height,2048);
 for(let cell=0;cell<16;cell++){let opaque=0,zero=0;for(let y=0;y<512;y++)for(let x=0;x<512;x++){
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
