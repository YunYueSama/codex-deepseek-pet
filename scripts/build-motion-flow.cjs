'use strict';
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),{clips}=require('../src/renderer/motion.js');
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const names=['right','wave','eat','hum','jump','land','sleep','wake','dance','sneak','meal-break','token-game','tail-sway','shift','settle','stretch','hungry','proud','protest','sad','surprise'];
const inputs=names.map(k=>clips[k]);
for(const name of ['review','peek','shock','pout','sorry']){
 const c=clips[name];
 for(let i=0;i<c.frames.length-1;i++){
  const a=c.frames[i],b=c.frames[i+1],atlas=a>=16?'expressions':'actions';
  if((b>=16?'expressions':'actions')===atlas)inputs.push({atlas,frames:[a%16,b%16],loop:false});
 }
}
fs.writeFileSync(path.join(root,'artifacts/flow-input.json'),JSON.stringify(inputs));
const localPython=path.join(root,'artifacts/flow-tools/Scripts/python.exe');
const python=process.env.PET_FLOW_PYTHON||(fs.existsSync(localPython)?localPython:'python');
execFileSync(python,[path.join(__dirname,'analyze-motion-flow.py')],{stdio:'inherit',windowsHide:true});
