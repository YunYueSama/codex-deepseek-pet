'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

test('renderer uses 16 real direction frames without synthetic eye or perspective layers', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'styles.css'), 'utf8');
  const app = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'app.js'), 'utf8');

  assert.match(html, /data-runtime="browser"/);
  assert.doesNotMatch(html, /gaze-layer|eye-layer|eye-socket|iris-tracker|class="pupil/);
  assert.doesNotMatch(css, /--look-[xy]|perspective\(|rotate[XYZ]\(|skew\(|iris|eye-socket/);
  assert.match(app, /const LOOK_FRAME_COUNT = 16;/);
  assert.match(app, /look-\$\{String\(index\)\.padStart\(2, '0'\)\}\.png/);
  assert.match(app, /state\.action === 'idle' && !state\.walking && !state\.dragging/);
  assert.doesNotMatch(app, /targetLook|iris|eye-left|eye-right|eye-y/);
  assert.match(app, /const desktopBridge = window\.petApi \|\|/);
  assert.doesNotMatch(app, /^const petApi\b/m);
  assert.doesNotMatch(app, /window\.petApi\.(?:onPointer|onAction|onWalk|onSettings|ready)/);
});

test('all window movement paths preserve the configured dimensions', () => {
  const main = fs.readFileSync(path.join(projectRoot, 'src', 'main', 'main.cjs'), 'utf8');

  assert.match(main, /function movePetWindow\(x, y\)/);
  assert.match(main, /setBounds\(fixedSizeBounds\(\{ x, y \}, scaledWindowSize\(\)\), false\)/);
  assert.doesNotMatch(main, /\.setPosition\(/);
});
