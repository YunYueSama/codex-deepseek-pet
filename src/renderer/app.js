'use strict';

const root = document.querySelector('#pet-root');
const shell = document.querySelector('#pet-shell');
const image = document.querySelector('#pet-image');
const bubble = document.querySelector('#speech-bubble');
const speechText = document.querySelector('#speech-text');

const desktopBridge = window.petApi || {
  onPointer: () => {},
  onAction: () => {},
  onWalk: () => {},
  onSettings: () => {},
  ready: () => {},
  showContextMenu: () => {},
  dragStart: () => {},
  dragMove: () => {},
  dragEnd: () => {},
  recordInteraction: () => {},
};

root.dataset.runtime = window.petApi ? 'desktop' : 'browser';

const ASSET_ROOT = '../../assets/pet';
const LOOK_FRAME_COUNT = 16;
const LOOK_FRAMES = Array.from(
  { length: LOOK_FRAME_COUNT },
  (_, index) => `${ASSET_ROOT}/look/look-${String(index).padStart(2, '0')}.png`,
);
const POSES = {
  idle: {
    src: `${ASSET_ROOT}/idle.png`,
    visualScale: 1,
  },
  curious: {
    src: `${ASSET_ROOT}/curious.png`,
    visualScale: 1.05,
  },
  shy: {
    src: `${ASSET_ROOT}/shy.png`,
    visualScale: 0.89,
  },
  happy: {
    src: `${ASSET_ROOT}/happy.png`,
    visualScale: 0.92,
  },
  excited: {
    src: `${ASSET_ROOT}/excited.png`,
    visualScale: 0.92,
  },
  wave: {
    src: `${ASSET_ROOT}/wave.png`,
    visualScale: 0.89,
  },
  surprised: {
    src: `${ASSET_ROOT}/surprised.png`,
    visualScale: 0.91,
  },
  jump: {
    src: `${ASSET_ROOT}/jump.png`,
    visualScale: 0.84,
  },
  sleepy: {
    src: `${ASSET_ROOT}/sleepy.png`,
    visualScale: 0.91,
  },
  review: {
    src: `${ASSET_ROOT}/review.png`,
    visualScale: 0.91,
  },
  'run-left': {
    src: `${ASSET_ROOT}/run-left.png`,
    visualScale: 0.92,
  },
  'run-right': {
    src: `${ASSET_ROOT}/run-right.png`,
    visualScale: 0.92,
  },
};

const ACTION_NAMES = [
  'idle',
  'curious',
  'shy',
  'happy',
  'excited',
  'wave',
  'surprised',
  'jump',
  'sleepy',
  'review',
  'nap',
  'run-left',
  'run-right',
];

const RANDOM_ACTIONS = [
  { name: 'curious', message: '这个窗口里藏着什么呀？', duration: 3200 },
  { name: 'happy', message: '写得不错！奖励一朵小浪花。', duration: 2800 },
  { name: 'shy', message: '我没有偷看……只看了一点点。', duration: 3000 },
  { name: 'excited', message: '灵感来了就快点记下来！', duration: 2600 },
  { name: 'wave', message: '辛苦啦，我一直在这里。', duration: 2800 },
  { name: 'review', message: '让我认真审阅一下。', duration: 3400 },
  { name: 'idle', message: '', duration: 2400 },
];

const CLICK_ACTIONS = [
  { name: 'happy', message: '收到摸摸，心情 +1！', duration: 2400 },
  { name: 'curious', message: '是在叫我吗？', duration: 2400 },
  { name: 'shy', message: '突然碰我，会害羞的……', duration: 2500 },
  { name: 'excited', message: '再点一下，我就要起飞啦！', duration: 2300 },
  { name: 'wave', message: '嗨！今天也一起加油。', duration: 2500 },
  { name: 'surprised', message: '欸，是新的任务吗？', duration: 2500 },
];

const state = {
  pose: 'idle',
  imageKey: '',
  action: 'idle',
  walking: false,
  dragging: false,
  sleeping: false,
  actionUntil: 0,
  lastInteractionAt: Date.now(),
  lookIndex: null,
  bubbleTimer: null,
  actionTimer: null,
  clickTimer: null,
  lastClickAt: 0,
};

function setImage(key, src) {
  if (state.imageKey === key) {
    return;
  }

  state.imageKey = key;
  image.src = src;
}

function setPose(name) {
  const pose = POSES[name] || POSES.idle;
  state.pose = name;
  setImage(`pose:${name}`, pose.src);
  root.dataset.pose = name;
  delete root.dataset.lookFrame;
  document.documentElement.style.setProperty('--pose-scale', pose.visualScale);
}

function setLookFrame(index) {
  const normalizedIndex = ((index % LOOK_FRAME_COUNT) + LOOK_FRAME_COUNT) % LOOK_FRAME_COUNT;
  state.pose = 'idle';
  setImage(`look:${normalizedIndex}`, LOOK_FRAMES[normalizedIndex]);
  root.dataset.pose = 'idle';
  root.dataset.lookFrame = String(normalizedIndex);
  document.documentElement.style.setProperty('--pose-scale', 1);
}

function renderIdleLook() {
  if (Number.isInteger(state.lookIndex)) {
    setLookFrame(state.lookIndex);
  } else {
    setPose('idle');
  }
}

function clearActionClasses() {
  for (const name of ACTION_NAMES) {
    root.classList.remove(`action-${name}`);
  }
}

function showBubble(message, duration = 2600) {
  window.clearTimeout(state.bubbleTimer);

  if (!message) {
    bubble.classList.remove('is-visible');
    return;
  }

  speechText.textContent = message;
  bubble.classList.add('is-visible');
  state.bubbleTimer = window.setTimeout(() => {
    bubble.classList.remove('is-visible');
  }, duration);
}

function returnToIdle() {
  if (state.walking || state.dragging) {
    return;
  }

  state.action = 'idle';
  state.sleeping = false;
  state.actionUntil = 0;
  clearActionClasses();
  root.classList.add('action-idle');
  renderIdleLook();
}

function performAction({ name = 'idle', message = '', duration = 2600 } = {}) {
  if (state.walking && name !== 'shy') {
    return;
  }

  window.clearTimeout(state.actionTimer);
  state.action = name;
  state.sleeping = name === 'nap' || name === 'sleepy';
  state.actionUntil = Date.now() + duration;
  clearActionClasses();
  root.classList.add(`action-${name}`);
  setPose(name === 'nap' ? 'sleepy' : name);
  showBubble(message, duration - 250);
  state.actionTimer = window.setTimeout(returnToIdle, duration);
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function scheduleRandomAction() {
  const delay = 8_000 + Math.random() * 10_000;
  window.setTimeout(() => {
    const idleFor = Date.now() - state.lastInteractionAt;
    const canAct = !state.walking && !state.dragging && Date.now() >= state.actionUntil;

    if (canAct && idleFor > 90_000 && Math.random() < 0.45) {
      performAction({ name: 'nap', message: 'Zzz… 蓝色的梦，软绵绵的。', duration: 16_000 });
    } else if (canAct) {
      performAction(pick(RANDOM_ACTIONS));
    }
    scheduleRandomAction();
  }, delay);
}

function registerInteraction() {
  state.lastInteractionAt = Date.now();
  desktopBridge.recordInteraction('pointer');
}

function reactToClick() {
  registerInteraction();
  performAction(pick(CLICK_ACTIONS));
}

function reactToDoubleClick() {
  registerInteraction();
  performAction({
    name: 'jump',
    message: '双倍摸摸！高兴得跳起来啦！',
    duration: 3600,
  });
}

function lookIndexFromPointer(pointer) {
  if (Number.isInteger(pointer.lookIndex)
    && pointer.lookIndex >= 0
    && pointer.lookIndex < LOOK_FRAME_COUNT) {
    return pointer.lookIndex;
  }

  if (pointer.direction === 'center') {
    return null;
  }

  const angle = Math.atan2(pointer.x, -pointer.y);
  const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
  return Math.round(normalizedAngle / (Math.PI * 2 / LOOK_FRAME_COUNT)) % LOOK_FRAME_COUNT;
}

function handlePointer(pointer) {
  state.lookIndex = lookIndexFromPointer(pointer);
  root.dataset.gaze = state.lookIndex === null
    ? 'center'
    : `look-${String(state.lookIndex).padStart(2, '0')}`;

  if (state.action === 'idle' && !state.walking && !state.dragging) {
    renderIdleLook();
  }

  if (state.sleeping && pointer.distance < 125) {
    state.lastInteractionAt = Date.now();
    performAction({ name: 'happy', message: '唔……你回来啦？', duration: 2200 });
  }
}

desktopBridge.onPointer(handlePointer);

if (!window.petApi) {
  window.addEventListener('pointermove', (event) => {
    const bounds = shell.getBoundingClientRect();
    const dx = event.clientX - (bounds.left + bounds.width * 0.5);
    const dy = event.clientY - (bounds.top + bounds.height * 0.39);
    const distance = Math.hypot(dx, dy);
    handlePointer({
      direction: distance <= 24 ? 'center' : 'browser',
      distance,
      x: distance === 0 ? 0 : dx / distance,
      y: distance === 0 ? 0 : dy / distance,
    });
  });

  window.addEventListener('pointerleave', () => {
    handlePointer({ direction: 'center', distance: 0, x: 0, y: 0 });
  });
}

desktopBridge.onAction((action) => {
  state.lastInteractionAt = Date.now();
  performAction(action);
});

desktopBridge.onWalk(({ moving, direction }) => {
  state.walking = Boolean(moving);
  root.classList.toggle('is-walking', state.walking);

  if (state.walking) {
    window.clearTimeout(state.actionTimer);
    state.actionUntil = Number.POSITIVE_INFINITY;
    clearActionClasses();
    setPose(direction === 'left' ? 'run-left' : 'run-right');
    showBubble('', 0);
  } else {
    state.actionUntil = 0;
    performAction({
      name: Math.random() > 0.55 ? 'curious' : 'idle',
      message: Math.random() > 0.78 ? '散步回来，继续陪你。' : '',
      duration: 2100,
    });
  }
});

desktopBridge.onSettings((settings) => {
  root.dataset.clickThrough = settings.clickThrough ? 'true' : 'false';
});

let pointerDown = null;

shell.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) {
    return;
  }

  shell.setPointerCapture(event.pointerId);
  pointerDown = {
    pointerId: event.pointerId,
    screenX: event.screenX,
    screenY: event.screenY,
    moved: false,
  };
});

shell.addEventListener('pointermove', (event) => {
  if (!pointerDown || pointerDown.pointerId !== event.pointerId) {
    return;
  }

  const distance = Math.hypot(
    event.screenX - pointerDown.screenX,
    event.screenY - pointerDown.screenY,
  );

  if (!pointerDown.moved && distance > 5) {
    pointerDown.moved = true;
    state.dragging = true;
    root.classList.add('is-dragging');
    setPose('shy');
    showBubble('等等，我的尾巴要打结啦！', 5000);
    desktopBridge.dragStart({ screenX: pointerDown.screenX, screenY: pointerDown.screenY });
  }

  if (pointerDown.moved) {
    desktopBridge.dragMove({ screenX: event.screenX, screenY: event.screenY });
  }
});

shell.addEventListener('pointerup', (event) => {
  if (!pointerDown || pointerDown.pointerId !== event.pointerId) {
    return;
  }

  const didMove = pointerDown.moved;
  pointerDown = null;

  if (didMove) {
    state.dragging = false;
    root.classList.remove('is-dragging');
    desktopBridge.dragEnd();
    return;
  }

  const now = Date.now();
  if (now - state.lastClickAt < 300) {
    window.clearTimeout(state.clickTimer);
    state.lastClickAt = 0;
    reactToDoubleClick();
  } else {
    state.lastClickAt = now;
    state.clickTimer = window.setTimeout(reactToClick, 310);
  }
});

shell.addEventListener('pointercancel', () => {
  if (pointerDown?.moved) {
    desktopBridge.dragEnd();
  }
  pointerDown = null;
  state.dragging = false;
  root.classList.remove('is-dragging');
});

shell.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  desktopBridge.showContextMenu();
});

image.addEventListener('error', () => {
  showBubble('动作图片走丢了，我先站好等你。', 3000);
  image.src = POSES.idle.src;
});

for (const src of LOOK_FRAMES) {
  const preload = new Image();
  preload.src = src;
}

setPose('idle');
showBubble('我不是吃白饭的大肥鱼！', 3800);
scheduleRandomAction();
desktopBridge.ready();
