'use strict';
function clamp(value, minimum, maximum) { return Math.min(Math.max(value, minimum), maximum); }
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

module.exports = { clamp, clampWindowBounds, fixedSizeBounds };
