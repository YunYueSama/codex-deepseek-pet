'use strict';

const root = document.querySelector('#pet-root');
const shell = document.querySelector('#pet-shell');
const image = document.querySelector('#pet-image');
const bubble = document.querySelector('#speech-bubble');
const speechText = document.querySelector('#speech-text');

const ASSET_ROOT = '../../assets/pet';
const POSES = {
  idle: {
    src: `${ASSET_ROOT}/idle.png`,
    eyes: true,
    leftEye: 36,
    rightEye: 48.8,
    eyeY: 38.5,
  },
  curious: {
    src: `${ASSET_ROOT}/curious.png`,
    eyes: true,
    leftEye: 28.3,
    rightEye: 39.1,
    eyeY: 36.1,
  },
  shy: {
    src: `${ASSET_ROOT}/shy.png`,
    eyes: true,
    leftEye: 33.2,
    rightEye: 48.5,
    eyeY: 40.1,
  },
  happy: {
    src: `${ASSET_ROOT}/happy.png`,
    eyes: true,
    leftEye: 27.4,
    rightEye: 41.3,
    eyeY: 45.3,
  },
  excited: {
    src: `${ASSET_ROOT}/excited.png`,
    eyes: true,
    leftEye: 27.4,
    rightEye: 41.3,
    eyeY: 45.3,
  },
  wave: {
    src: `${ASSET_ROOT}/wave.png`,
    eyes: true,
    leftEye: 32.4,
    rightEye: 46.8,
    eyeY: 41.2,
  },
  surprised: {
    src: `${ASSET_ROOT}/surprised.png`,
    eyes: true,
    leftEye: 34.1,
    rightEye: 47.9,
    eyeY: 39.6,
  },
  jump: {
    src: `${ASSET_ROOT}/jump.png`,
    eyes: false,
  },
  sleepy: {
    src: `${ASSET_ROOT}/sleepy.png`,
    eyes: false,
  },
  review: {
    src: `${ASSET_ROOT}/review.png`,
    eyes: false,
  },
  'run-left': {
    src: `${ASSET_ROOT}/run-left.png`,
    eyes: false,
  },
  'run-right': {
    src: `${ASSET_ROOT}/run-right.png`,
    eyes: false,
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
  action: 'idle',
  walking: false,
  dragging: false,
  sleeping: false,
  actionUntil: 0,
  lastInteractionAt: Date.now(),
  targetLookX: 0,
  targetLookY: 0,
  lookX: 0,
  lookY: 0,
  bubbleTimer: null,
  actionTimer: null,
  clickTimer: null,
  lastClickAt: 0,
};

function setPose(name) {
  const pose = POSES[name] || POSES.idle;
  if (state.pose !== name) {
    state.pose = name;
    image.src = pose.src;
  }
  root.dataset.pose = name;
  root.dataset.eyes = pose.eyes ? 'visible' : 'hidden';

  if (pose.eyes) {
    document.documentElement.style.setProperty('--eye-left-x', `${pose.leftEye}vw`);
    document.documentElement.style.setProperty('--eye-right-x', `${pose.rightEye}vw`);
    document.documentElement.style.setProperty('--eye-y', `${pose.eyeY}vh`);
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
  setPose('idle');
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

function scheduleBlink() {
  const delay = 2_800 + Math.random() * 4_200;
  window.setTimeout(() => {
    if (!state.walking && !state.dragging && POSES[state.pose]?.eyes) {
      root.classList.add('is-blinking');
      window.setTimeout(() => root.classList.remove('is-blinking'), 135);
    }
    scheduleBlink();
  }, delay);
}

function registerInteraction() {
  state.lastInteractionAt = Date.now();
  window.petApi.recordInteraction('pointer');
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

function animateLook() {
  state.lookX += (state.targetLookX - state.lookX) * 0.14;
  state.lookY += (state.targetLookY - state.lookY) * 0.14;
  document.documentElement.style.setProperty('--look-x', state.lookX.toFixed(4));
  document.documentElement.style.setProperty('--look-y', state.lookY.toFixed(4));
  window.requestAnimationFrame(animateLook);
}

window.petApi.onPointer((pointer) => {
  state.targetLookX = pointer.direction === 'center' ? 0 : pointer.x;
  state.targetLookY = pointer.direction === 'center' ? 0 : pointer.y;
  root.dataset.gaze = pointer.direction;

  if (state.sleeping && pointer.distance < 125) {
    state.lastInteractionAt = Date.now();
    performAction({ name: 'happy', message: '唔……你回来啦？', duration: 2200 });
  }
});

window.petApi.onAction((action) => {
  state.lastInteractionAt = Date.now();
  performAction(action);
});

window.petApi.onWalk(({ moving, direction }) => {
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

window.petApi.onSettings((settings) => {
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
    window.petApi.dragStart({ screenX: pointerDown.screenX, screenY: pointerDown.screenY });
  }

  if (pointerDown.moved) {
    window.petApi.dragMove({ screenX: event.screenX, screenY: event.screenY });
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
    window.petApi.dragEnd();
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
    window.petApi.dragEnd();
  }
  pointerDown = null;
  state.dragging = false;
  root.classList.remove('is-dragging');
});

shell.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.petApi.showContextMenu();
});

image.addEventListener('error', () => {
  showBubble('动作图片走丢了，我先站好等你。', 3000);
  image.src = POSES.idle.src;
});

setPose('idle');
showBubble('我不是吃白饭的大肥鱼！', 3800);
scheduleBlink();
scheduleRandomAction();
animateLook();
window.petApi.ready();
