'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('petApi', {
  onPointer: (callback) => subscribe('pet:pointer', callback),
  onAction: (callback) => subscribe('pet:action', callback),
  onWalk: (callback) => subscribe('pet:walk', callback),
  onSettings: (callback) => subscribe('pet:settings', callback),
  ready: () => ipcRenderer.send('pet:ready'),
  showContextMenu: () => ipcRenderer.send('pet:context-menu'),
  dragStart: (point) => ipcRenderer.send('pet:drag-start', point),
  dragMove: (point) => ipcRenderer.send('pet:drag-move', point),
  dragEnd: () => ipcRenderer.send('pet:drag-end'),
  recordInteraction: (kind) => ipcRenderer.send('pet:interaction', kind),
});
