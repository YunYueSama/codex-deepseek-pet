'use strict';
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..'),{clips}=require('../src/renderer/motion.js');
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/flow-input.json'),JSON.stringify(['right','wave','eat','hum'].map(k=>clips[k])));
const localPython=path.join(root,'artifacts/flow-tools/Scripts/python.exe');
const python=process.env.PET_FLOW_PYTHON||(fs.existsSync(localPython)?localPython:'python');
execFileSync(python,[path.join(__dirname,'analyze-motion-flow.py')],{stdio:'inherit',windowsHide:true});
