'use strict';
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'whale-integration-'));
const complete=path.join(dir,'complete.json');
const child=spawn(require('electron'),[path.join(__dirname,'integration-entry.cjs'),`--test-user-data=${dir}`,`--integration-complete=${complete}`,'--panel',...(process.env.PET_TEST_EDGES?['--test-native-edges']:[])],{windowsHide:true,stdio:'inherit'});
const timer=setTimeout(()=>child.kill(),90000);
child.on('exit',(code,signal)=>{clearTimeout(timer);const finished=fs.existsSync(complete);fs.rmSync(dir,{recursive:true,force:true});process.exitCode=signal||code===null||!finished?1:code;});
child.on('error',()=>{clearTimeout(timer);process.exitCode=1;});
