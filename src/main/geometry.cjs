'use strict';

const DIRECTIONS = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
];

const LOOK_FRAME_COUNT = 16;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function directionFromDelta(dx, dy, deadZone = 28) {
  const distance = Math.hypot(dx, dy);
  if (distance <= deadZone) {
    return 'center';
  }

  const angle = Math.atan2(dy, dx);
  const sector = Math.round(angle / (Math.PI / 4));
  const index = (sector + DIRECTIONS.length) % DIRECTIONS.length;
  return DIRECTIONS[index];
}

function lookFrameFromDelta(dx, dy, deadZone = 28) {
  const distance = Math.hypot(dx, dy);
  if (distance <= deadZone) {
    return null;
  }

  // atan2 normally starts at screen-right. Swapping the axes makes 0 point
  // north while preserving clockwise screen coordinates.
  const angle = Math.atan2(dx, -dy);
  const normalizedAngle = (angle + Math.PI * 2) % (Math.PI * 2);
  return Math.round(normalizedAngle / (Math.PI * 2 / LOOK_FRAME_COUNT)) % LOOK_FRAME_COUNT;
}

function pointerVector(point, origin, trackingRadius = 360, deadZone = 28) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const distance = Math.hypot(dx, dy);
  const strength = clamp((distance - deadZone) / trackingRadius, 0, 1);
  const unitX = distance === 0 ? 0 : dx / distance;
  const unitY = distance === 0 ? 0 : dy / distance;

  return {
    direction: directionFromDelta(dx, dy, deadZone),
    distance: Math.round(distance),
    lookIndex: lookFrameFromDelta(dx, dy, deadZone),
    x: unitX * strength,
    y: unitY * strength,
  };
}

function fixedSizeBounds(position, size) {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    width: Math.round(size.width),
    height: Math.round(size.height),
  };
}

function clampWindowBounds(bounds, workArea, margin = 8) {
  const minX = workArea.x - bounds.width + margin;
  const maxX = workArea.x + workArea.width - margin;
  const minY = workArea.y - bounds.height + margin;
  const maxY = workArea.y + workArea.height - margin;

  return {
    x: Math.round(clamp(bounds.x, minX, maxX)),
    y: Math.round(clamp(bounds.y, minY, maxY)),
    width: bounds.width,
    height: bounds.height,
  };
}

module.exports = {
  DIRECTIONS,
  LOOK_FRAME_COUNT,
  clamp,
  clampWindowBounds,
  directionFromDelta,
  fixedSizeBounds,
  lookFrameFromDelta,
  pointerVector,
};
