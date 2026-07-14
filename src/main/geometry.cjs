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
  clamp,
  clampWindowBounds,
  directionFromDelta,
  fixedSizeBounds,
  pointerVector,
};
