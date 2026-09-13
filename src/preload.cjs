'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const subscribe = (channel, callback) => {
  const listener = (_e, value) => callback(value); ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};
contextBridge.exposeInMainWorld('petApi', {
  ready: () => ipcRenderer.send('pet:ready'),
  onState: cb => subscribe('pet:state', cb), onHitPoint: cb => subscribe('pet:hit-point', cb),
  onKinetics: cb => subscribe('pet:kinetics', cb),
  onSettings: cb => subscribe('pet:settings', cb), onNotice: cb => subscribe('pet:notice', cb),
  interact: kind => ipcRenderer.send('pet:interact', kind),
  drag: (phase, point) => ipcRenderer.send('pet:drag', { phase, point }),
  hit: value => ipcRenderer.send('pet:hit', value), open: () => ipcRenderer.send('pet:open'), menu: () => ipcRenderer.send('pet:menu'),
  settings: () => ipcRenderer.invoke('companion:settings'), save: value => ipcRenderer.invoke('companion:save', value),
  scale: value => ipcRenderer.invoke('companion:scale', value),
  mode: (mode, minutes) => ipcRenderer.invoke('companion:mode', { mode, minutes }),
  chat: value => ipcRenderer.invoke('companion:chat', value), cancel: () => ipcRenderer.send('companion:cancel'),
  clear: () => ipcRenderer.invoke('companion:clear'), capture: () => ipcRenderer.invoke('companion:capture'),
  discardCapture: () => ipcRenderer.send('companion:discard'), sources: () => ipcRenderer.invoke('companion:sources'),
  exportPet: () => ipcRenderer.invoke('companion:export'),
});
