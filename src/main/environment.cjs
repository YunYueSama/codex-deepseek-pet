'use strict';
const { spawn } = require('node:child_process');
const path = require('node:path');

function classify(processName = '') {
  if (/code|devenv|idea|pycharm|webstorm|codex|terminal|powershell/i.test(processName)) return 'code';
  if (/vlc|potplayer|music|spotify|wmplayer/i.test(processName)) return 'media';
  if (/game|steam|unity|unreal/i.test(processName)) return 'game';
  if (/acrobat|sumatrapdf|winword|obsidian|notion/i.test(processName)) return 'reading';
  return 'other';
}
/** Windows 原生只读探针：单个隐藏进程，每 500ms 读窗口几何和前台进程；不读取标题或页面。 */
function monitor(callback) {
  if (process.platform !== 'win32') return () => {};
  // PowerShell 无法读取 Electron 虚拟 asar；原生探针文件随包解出到 asar.unpacked。
  const script = path.join(__dirname, 'foreground.ps1').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', script],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  let pending = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    pending += chunk; if (pending.length > 16000) pending = '';
    const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) try { const value = JSON.parse(line); callback({ ...value, category: classify(value.process) }); } catch { /* 忽略不完整探针输出，不记录窗口数据。 */ }
  });
  child.on('error', () => callback({ category: 'other', unavailable: true }));
  return () => { child.stdout.removeAllListeners(); child.kill(); };
}
module.exports = { classify, monitor };
