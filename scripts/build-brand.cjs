'use strict';
// 独立保留角色标准图、正面眨眼原图及图标原图，避免通用素材构建覆盖品牌资源。
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),{execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..'),source=path.join(root,'design/sources/brand'),out=path.join(root,'artifacts/brand');
const clear={r:0,g:0,b:0,alpha:0};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 execFileSync(process.execPath,[path.join(__dirname,'key-motion.cjs'),path.join(source,'app-icon-magenta.png'),path.join(out,'app-icon.png')],{stdio:'inherit',windowsHide:true});
 // 默认立绘与眨眼直接取自同一批新待机原画，不再混用旧品牌立绘。
 const frames=await Promise.all([0,11].map(i=>sharp(path.join(root,'assets/whale/motion-idle.png')).extract({left:i%4*512,top:Math.floor(i/4)*512,width:512,height:512}).png().toBuffer()));
 await sharp({create:{width:1024,height:512,channels:4,background:clear}}).composite(frames.map((input,i)=>({input,left:i*512,top:0}))).png().toFile(path.join(root,'assets/whale/idle-front.png'));
 const badge=await sharp(path.join(out,'app-icon.png')).trim({background:'#00000000',threshold:10}).resize(480,480,{fit:'contain',background:clear}).png().toBuffer();
 await sharp(badge).extend({top:16,bottom:16,left:16,right:16,background:clear}).png().toFile(path.join(root,'build/icon.png'));
 execFileSync(process.execPath,[path.join(__dirname,'build-icon.mjs')],{stdio:'inherit',windowsHide:true});
 console.log('Built independent icon and front idle frames.');
})().catch(e=>{console.error(e);process.exitCode=1;});
