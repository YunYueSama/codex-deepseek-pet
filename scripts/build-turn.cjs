'use strict';
// 转身与全动作构建使用相同的连通区域切帧，避免固定格线截断呆毛。
require('node:child_process').execFileSync(process.execPath,[require('node:path').join(__dirname,'build-hq.cjs'),'--turn-only'],{windowsHide:true,stdio:'inherit'});
