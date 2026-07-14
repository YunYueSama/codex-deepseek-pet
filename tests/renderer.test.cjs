'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.join(__dirname, '..');

test('renderer clips tracked irises inside eye sockets and hides them in browser preview', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'styles.css'), 'utf8');
  const app = fs.readFileSync(path.join(projectRoot, 'src', 'renderer', 'app.js'), 'utf8');

  assert.match(html, /data-runtime="browser"/);
  assert.match(html, /id="gaze-layer"/);
  assert.match(html, /class="eye-socket eye-socket-left"/);
  assert.doesNotMatch(html, /class="pupil/);
  assert.match(css, /\.gaze-layer\s*{/);
  assert.match(css, /rotateY\(calc\(var\(--look-x\)/);
  assert.match(css, /\.eye-socket\s*{[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.pet-root\[data-runtime="browser"\] \.eye-layer/);
  assert.doesNotMatch(css, /\.pupil/);
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
