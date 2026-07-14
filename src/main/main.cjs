'use strict';

const path = require('node:path');
const fs = require('node:fs');
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  screen,
  Tray,
} = require('electron');
const {
  LOOK_FRAME_COUNT,
  clamp,
  clampWindowBounds,
  fixedSizeBounds,
  pointerVector,
} = require('./geometry.cjs');
const { createSettingsStore } = require('./settings.cjs');

const BASE_WIDTH = 300;
const BASE_HEIGHT = 390;
const POINTER_INTERVAL_MS = 32;
const WANDER_INTERVAL_MS = 32;
const captureArgument = process.argv.find((argument) => argument.startsWith('--capture='));
const capturePath = captureArgument ? captureArgument.slice('--capture='.length) : null;
const previewGazeArgument = process.argv.find((argument) => argument.startsWith('--preview-gaze='));
const previewGaze = previewGazeArgument ? previewGazeArgument.slice('--preview-gaze='.length) : null;
const previewLookArgument = process.argv.find((argument) => argument.startsWith('--preview-look-index='));
const parsedPreviewLookIndex = previewLookArgument
  ? Number.parseInt(previewLookArgument.slice('--preview-look-index='.length), 10)
  : Number.NaN;
const previewLookIndex = Number.isInteger(parsedPreviewLookIndex)
  && parsedPreviewLookIndex >= 0
  && parsedPreviewLookIndex < LOOK_FRAME_COUNT
  ? parsedPreviewLookIndex
  : null;
const previewActionArgument = process.argv.find((argument) => argument.startsWith('--preview-action='));
const previewAction = previewActionArgument ? previewActionArgument.slice('--preview-action='.length) : null;
const testUserDataArgument = process.argv.find((argument) => argument.startsWith('--test-user-data='));

if (testUserDataArgument) {
  app.setPath('userData', path.resolve(testUserDataArgument.slice('--test-user-data='.length)));
}

const PREVIEW_GAZE_VECTORS = {
  center: { x: 0, y: 0 },
  north: { x: 0, y: -1 },
  'north-east': { x: 0.707, y: -0.707 },
  east: { x: 1, y: 0 },
  'south-east': { x: 0.707, y: 0.707 },
  south: { x: 0, y: 1 },
  'south-west': { x: -0.707, y: 0.707 },
  west: { x: -1, y: 0 },
  'north-west': { x: -0.707, y: -0.707 },
};

function vectorForLookIndex(index) {
  const angle = index * Math.PI * 2 / LOOK_FRAME_COUNT;
  return {
    x: Math.sin(angle),
    y: -Math.cos(angle),
  };
}

function previewPointerPayload(vector) {
  return pointerVector(
    { x: vector.x * 500, y: vector.y * 500 },
    { x: 0, y: 0 },
    420,
    24,
  );
}

let petWindow = null;
let tray = null;
let settingsStore = null;
let settings = null;
let pointerTimer = null;
let wanderTimer = null;
let isQuitting = false;
let dragging = null;
let wanderTarget = null;
let nextWanderAt = Date.now() + 8_000;
let captureScheduled = false;

function migrateLegacySettings() {
  const currentSettingsPath = path.join(app.getPath('userData'), 'settings.json');
  const legacySettingsPath = path.join(app.getPath('appData'), 'Codex Pet', 'settings.json');

  if (fs.existsSync(currentSettingsPath) || !fs.existsSync(legacySettingsPath)) {
    return;
  }

  try {
    fs.mkdirSync(path.dirname(currentSettingsPath), { recursive: true });
    fs.copyFileSync(legacySettingsPath, currentSettingsPath, fs.constants.COPYFILE_EXCL);
  } catch {
    // A failed migration should not prevent the pet from starting with defaults.
  }
}

function scaledWindowSize(scale = settings.scale) {
  return {
    width: Math.round(BASE_WIDTH * scale),
    height: Math.round(BASE_HEIGHT * scale),
  };
}

function initialWindowBounds() {
  const size = scaledWindowSize();
  const display = screen.getDisplayNearestPoint(
    settings.position || screen.getCursorScreenPoint(),
  );
  const fallback = {
    x: display.workArea.x + display.workArea.width - size.width - 24,
    y: display.workArea.y + display.workArea.height - size.height - 8,
    ...size,
  };
  const requested = settings.position
    ? { ...settings.position, ...size }
    : fallback;

  return clampWindowBounds(requested, display.workArea, 28);
}

function send(channel, payload) {
  if (petWindow && !petWindow.isDestroyed() && !petWindow.webContents.isLoading()) {
    petWindow.webContents.send(channel, payload);
  }
}

function persistPosition() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  const { x, y } = petWindow.getBounds();
  settings.position = { x, y };
  settingsStore.save(settings);
}

function movePetWindow(x, y) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  petWindow.setBounds(fixedSizeBounds({ x, y }, scaledWindowSize()), false);
}

function applyWindowSettings() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  petWindow.setAlwaysOnTop(settings.alwaysOnTop, 'floating');
  petWindow.setIgnoreMouseEvents(settings.clickThrough, { forward: true });
  app.setLoginItemSettings(app.isPackaged
    ? { openAtLogin: settings.startAtLogin }
    : {
      openAtLogin: settings.startAtLogin,
      path: process.execPath,
      args: [app.getAppPath()],
    });
  send('pet:settings', settings);
}

function updateSetting(key, value) {
  settings = { ...settings, [key]: value };
  settingsStore.save(settings);
  applyWindowSettings();
  rebuildTrayMenu();
}

function updateScale(scale) {
  if (!petWindow || petWindow.isDestroyed() || settings.scale === scale) {
    return;
  }

  const oldBounds = petWindow.getBounds();
  const size = scaledWindowSize(scale);
  const proposed = {
    x: oldBounds.x + Math.round((oldBounds.width - size.width) / 2),
    y: oldBounds.y + oldBounds.height - size.height,
    ...size,
  };
  const display = screen.getDisplayMatching(oldBounds);
  const nextBounds = clampWindowBounds(proposed, display.workArea, 28);
  petWindow.setBounds(nextBounds, false);
  settings = { ...settings, scale, position: { x: nextBounds.x, y: nextBounds.y } };
  settingsStore.save(settings);
  send('pet:settings', settings);
  rebuildTrayMenu();
}

function resetPosition() {
  settings.position = null;
  const bounds = initialWindowBounds();
  settings.position = { x: bounds.x, y: bounds.y };
  settingsStore.save(settings);
  petWindow.setBounds(bounds, false);
  send('pet:action', { name: 'happy', message: '回来啦！这里视野刚刚好。', duration: 2400 });
}

function toggleVisibility() {
  if (!petWindow) {
    return;
  }

  if (petWindow.isVisible()) {
    petWindow.hide();
  } else {
    petWindow.showInactive();
  }
  rebuildTrayMenu();
}

function buildTrayTemplate() {
  const sizeOptions = [
    { label: '小巧 (80%)', value: 0.8 },
    { label: '标准 (100%)', value: 1 },
    { label: '大只 (120%)', value: 1.2 },
  ];

  return [
    { label: 'codex-deepseek-pet', enabled: false },
    {
      label: '和她打个招呼',
      click: () => send('pet:action', {
        name: 'happy',
        message: '今天也一起加油吧！',
        duration: 2800,
      }),
    },
    { type: 'separator' },
    {
      label: '自动散步',
      type: 'checkbox',
      checked: settings.autoWander,
      click: (item) => updateSetting('autoWander', item.checked),
    },
    {
      label: '始终置顶',
      type: 'checkbox',
      checked: settings.alwaysOnTop,
      click: (item) => updateSetting('alwaysOnTop', item.checked),
    },
    {
      label: '鼠标穿透  Ctrl+Alt+P',
      type: 'checkbox',
      checked: settings.clickThrough,
      click: (item) => updateSetting('clickThrough', item.checked),
    },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: settings.startAtLogin,
      click: (item) => updateSetting('startAtLogin', item.checked),
    },
    {
      label: '尺寸',
      submenu: sizeOptions.map((option) => ({
        label: option.label,
        type: 'radio',
        checked: settings.scale === option.value,
        click: () => updateScale(option.value),
      })),
    },
    { type: 'separator' },
    { label: '重置位置', click: resetPosition },
    {
      label: petWindow?.isVisible() ? '暂时隐藏' : '显示宠物',
      click: toggleVisibility,
    },
    { type: 'separator' },
    {
      label: '退出 codex-deepseek-pet',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ];
}

function rebuildTrayMenu() {
  if (tray && !tray.isDestroyed()) {
    tray.setContextMenu(Menu.buildFromTemplate(buildTrayTemplate()));
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'pet', 'idle.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 32, height: 35 });
  tray = new Tray(icon);
  tray.setToolTip('codex-deepseek-pet');
  rebuildTrayMenu();
  tray.on('click', toggleVisibility);
}

function createPetWindow() {
  petWindow = new BrowserWindow({
    ...initialWindowBounds(),
    transparent: true,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: settings.alwaysOnTop,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: process.argv.includes('--dev'),
    },
  });

  petWindow.setMenuBarVisibility(false);
  petWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  petWindow.once('ready-to-show', () => {
    petWindow.showInactive();
    applyWindowSettings();
  });
  petWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      petWindow.hide();
      rebuildTrayMenu();
    }
  });
}

function startPointerTracking() {
  pointerTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed() || !petWindow.isVisible()) {
      return;
    }

    if (previewLookIndex !== null) {
      send('pet:pointer', previewPointerPayload(vectorForLookIndex(previewLookIndex)));
      return;
    }

    if (previewGaze && PREVIEW_GAZE_VECTORS[previewGaze]) {
      send('pet:pointer', previewPointerPayload(PREVIEW_GAZE_VECTORS[previewGaze]));
      return;
    }

    const cursor = screen.getCursorScreenPoint();
    const bounds = fixedSizeBounds(petWindow.getBounds(), scaledWindowSize());
    const origin = {
      x: bounds.x + Math.round(bounds.width * 0.5),
      y: bounds.y + Math.round(bounds.height * 0.39),
    };
    send('pet:pointer', {
      ...pointerVector(cursor, origin, 420 * settings.scale, 24),
      screenX: cursor.x,
      screenY: cursor.y,
    });
  }, POINTER_INTERVAL_MS);
}

function chooseWanderTarget(bounds, workArea) {
  const minimum = workArea.x - Math.round(bounds.width * 0.15);
  const maximum = workArea.x + workArea.width - Math.round(bounds.width * 0.85);
  let target = Math.round(minimum + Math.random() * (maximum - minimum));

  if (Math.abs(target - bounds.x) < 140) {
    target = bounds.x < workArea.x + workArea.width / 2 ? maximum : minimum;
  }
  return clamp(target, minimum, maximum);
}

function stopWalking() {
  if (wanderTarget !== null) {
    wanderTarget = null;
    nextWanderAt = Date.now() + 7_000 + Math.random() * 8_000;
    send('pet:walk', { moving: false });
  }
}

function startWandering() {
  wanderTimer = setInterval(() => {
    if (!settings.autoWander || dragging || !petWindow?.isVisible()) {
      stopWalking();
      return;
    }

    const now = Date.now();
    const bounds = petWindow.getBounds();
    const display = screen.getDisplayMatching(bounds);

    if (wanderTarget === null) {
      if (now < nextWanderAt) {
        return;
      }
      wanderTarget = chooseWanderTarget(bounds, display.workArea);
    }

    const delta = wanderTarget - bounds.x;
    const direction = delta < 0 ? 'left' : 'right';
    const step = Math.sign(delta) * Math.min(Math.abs(delta), Math.max(2, Math.round(2.4 * settings.scale)));
    movePetWindow(bounds.x + step, bounds.y);
    send('pet:walk', { moving: true, direction });

    if (Math.abs(delta) <= Math.abs(step)) {
      stopWalking();
      persistPosition();
    }
  }, WANDER_INTERVAL_MS);
}

function registerIpcHandlers() {
  ipcMain.on('pet:ready', (event) => {
    event.sender.send('pet:settings', settings);

    if (previewAction) {
      event.sender.send('pet:action', {
        name: previewAction,
        message: `${previewAction} action preview`,
        duration: 5_000,
      });
    }

    if (capturePath && !captureScheduled) {
      captureScheduled = true;
      setTimeout(async () => {
        try {
          const image = await petWindow.webContents.capturePage();
          fs.mkdirSync(path.dirname(capturePath), { recursive: true });
          fs.writeFileSync(capturePath, image.toPNG());
        } finally {
          isQuitting = true;
          app.quit();
        }
      }, 1_200);
    }
  });
  ipcMain.on('pet:context-menu', () => tray?.popUpContextMenu());
  ipcMain.on('pet:interaction', () => {
    nextWanderAt = Date.now() + 10_000;
    stopWalking();
  });

  ipcMain.on('pet:drag-start', (_event, point) => {
    if (!petWindow || !Number.isFinite(point?.screenX) || !Number.isFinite(point?.screenY)) {
      return;
    }
    const bounds = petWindow.getBounds();
    dragging = {
      offsetX: point.screenX - bounds.x,
      offsetY: point.screenY - bounds.y,
    };
    stopWalking();
  });

  ipcMain.on('pet:drag-move', (_event, point) => {
    if (!dragging || !Number.isFinite(point?.screenX) || !Number.isFinite(point?.screenY)) {
      return;
    }
    const size = scaledWindowSize();
    const requested = {
      x: Math.round(point.screenX - dragging.offsetX),
      y: Math.round(point.screenY - dragging.offsetY),
      width: size.width,
      height: size.height,
    };
    const display = screen.getDisplayNearestPoint({ x: point.screenX, y: point.screenY });
    const next = clampWindowBounds(requested, display.workArea, 28);
    movePetWindow(next.x, next.y);
  });

  ipcMain.on('pet:drag-end', () => {
    if (!dragging) {
      return;
    }
    dragging = null;
    nextWanderAt = Date.now() + 12_000;
    persistPosition();
    send('pet:action', {
      name: 'shy',
      message: '轻一点嘛，发饰都要歪啦……',
      duration: 2400,
    });
  });
}

function keepWindowVisible() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }
  const bounds = fixedSizeBounds(petWindow.getBounds(), scaledWindowSize());
  const display = screen.getDisplayMatching(bounds);
  const safeBounds = clampWindowBounds(bounds, display.workArea, 28);
  petWindow.setBounds(safeBounds, false);
  persistPosition();
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    petWindow?.showInactive();
    send('pet:action', { name: 'excited', message: '我已经在这里啦！', duration: 2200 });
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.yunyuesama.codexpet');
    migrateLegacySettings();
    settingsStore = createSettingsStore(app.getPath('userData'));
    settings = settingsStore.load();
    registerIpcHandlers();
    createPetWindow();
    createTray();
    startPointerTracking();
    startWandering();

    globalShortcut.register('CommandOrControl+Alt+P', () => {
      updateSetting('clickThrough', !settings.clickThrough);
    });
    screen.on('display-added', keepWindowVisible);
    screen.on('display-removed', keepWindowVisible);
    screen.on('display-metrics-changed', keepWindowVisible);
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  clearInterval(pointerTimer);
  clearInterval(wanderTimer);
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
