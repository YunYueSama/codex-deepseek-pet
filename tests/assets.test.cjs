'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),test=require('node:test'),sharp=require('sharp');const root=path.join(__dirname,'..');
test('all newly drawn rig layers have usable resolution and true transparency',async()=>{
 const dir=path.join(root,'assets/whale/rig'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));assert.equal(manifest.render,'skeletal');assert.equal(Object.keys(manifest.assets).length,24);
 for(const name of Object.keys(manifest.assets)){const {data,info}=await sharp(path.join(dir,name+'.png')).raw().toBuffer({resolveWithObject:true});assert.equal(info.channels,4);assert.ok(info.width>=90&&info.height>=150);let visible=0,clear=0,magenta=0;
  for(let i=0;i<data.length;i+=4){const a=data[i+3];if(a>200)visible++;if(a===0)clear++;if(a>200&&data[i]>data[i+1]+80&&data[i+2]>data[i+1]+80&&data[i]>200)magenta++;}
  assert.ok(visible>3000&&clear>500,name);assert.equal(magenta,0,name+' leftover background');
 }
});
test('independent icon has native 512px PNG and Windows icon sizes',async()=>{
 const png=await sharp(path.join(root,'build/icon.png')).metadata();assert.equal(png.width,512);assert.equal(png.height,512);
 const ico=fs.readFileSync(path.join(root,'build/icon.ico')),sizes=[];for(let i=0;i<ico.readUInt16LE(4);i++)sizes.push(ico[6+i*16]||256);for(const size of [16,32,48,256])assert.ok(sizes.includes(size));
});
test('baked Codex exports keep the host dimensions',async()=>{
 const dir=path.join(root,'codex-deepseek-pet'),m=JSON.parse(fs.readFileSync(path.join(dir,'pet.json')));assert.equal(m.spriteVersionNumber,2);
 const a=await sharp(path.join(dir,'spritesheet.webp')).metadata(),b=await sharp(path.join(dir,'spritesheet-web.webp')).metadata();assert.equal(a.width,1536);assert.equal(a.height,2288);assert.equal(a.hasAlpha,true);assert.equal(b.height,1872);
});
