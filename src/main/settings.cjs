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
});

function sanitizeSettings(value = {}) {
  const scale = [0.8, 1, 1.2].includes(value.scale) ? value.scale : 1;
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
