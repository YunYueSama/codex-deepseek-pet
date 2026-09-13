'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SETTINGS = Object.freeze({
  alwaysOnTop: true,
  autoWander: true,
  clickThrough: false,
  startAtLogin: false,
  scale: 1,
  position: null,
  environment: true,
  windowEdges: true,
  quietFullscreen: true,
  reducedMotion: false,
  baseUrl: 'https://api.deepseek.com/v1',
  model: '',
  memory: '',
  vision: false,
  autoVision: false,
});

function sanitizeSettings(value = {}) {
  value = value && typeof value === 'object' ? value : {};
  const scale = typeof value.scale === 'number' && Number.isFinite(value.scale) ? Math.round(Math.max(0, Math.min(1, value.scale)) * 100) / 100 : 1;
  const position = value.position
    && Number.isFinite(value.position.x)
    && Number.isFinite(value.position.y)
    ? { x: Math.round(value.position.x), y: Math.round(value.position.y) }
    : null;

  return {
    alwaysOnTop: value.alwaysOnTop !== false,
    autoWander: value.autoWander !== false,
    clickThrough: value.clickThrough === true,
    startAtLogin: value.startAtLogin === true,
    scale,
    position,
    environment: value.environment !== false,
    windowEdges: value.windowEdges !== false,
    quietFullscreen: value.quietFullscreen !== false,
    reducedMotion: value.reducedMotion === true,
    baseUrl: typeof value.baseUrl === 'string' ? value.baseUrl.slice(0, 500) : DEFAULT_SETTINGS.baseUrl,
    model: typeof value.model === 'string' ? value.model.slice(0, 120) : '',
    memory: typeof value.memory === 'string' ? value.memory.slice(0, 2000) : '',
    vision: value.vision === true,
    autoVision: value.vision === true && value.autoVision === true,
  };
}

function createSettingsStore(userDataPath) {
  const filePath = path.join(userDataPath, 'settings.json');

  return {
    load() {
      try {
        return sanitizeSettings(JSON.parse(fs.readFileSync(filePath, 'utf8')));
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },

    save(settings) {
      fs.mkdirSync(userDataPath, { recursive: true });
      const temporaryPath = `${filePath}.tmp`;
      fs.writeFileSync(temporaryPath, `${JSON.stringify(sanitizeSettings(settings), null, 2)}\n`, 'utf8');
      fs.renameSync(temporaryPath, filePath);
    },
  };
}

module.exports = {
  DEFAULT_SETTINGS,
  createSettingsStore,
  sanitizeSettings,
};
