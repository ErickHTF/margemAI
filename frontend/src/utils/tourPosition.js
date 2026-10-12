export function positionTour(rect, viewport, cardHeight) {
  const margin = 16, gap = 18
  const width = Math.min(340, viewport.width - margin * 2)
  const height = Math.min(cardHeight, viewport.height - margin * 2)
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max))
  if (!rect) return { left: (viewport.width - width) / 2, top: Math.max(margin, viewport.height - height - margin), width, spotlight: null }
  const spotlight = {
    left: clamp(rect.left - 6, 8, viewport.width - 8),
    top: clamp(rect.top - 6, 8, viewport.height - 8),
    right: clamp(rect.right + 6, 8, viewport.width - 8),
    bottom: clamp(rect.bottom + 6, 8, viewport.height - 8)
  }
  spotlight.width = Math.max(0, spotlight.right - spotlight.left)
  spotlight.height = Math.max(0, spotlight.bottom - spotlight.top)
  let left, top
  if (viewport.width - spotlight.right >= width + gap + margin) {
    left = spotlight.right + gap
    top = spotlight.top
  } else if (spotlight.left >= width + gap + margin) {
    left = spotlight.left - gap - width
    top = spotlight.top
  } else {
    left = spotlight.left + (spotlight.width - width) / 2
    top = viewport.height - spotlight.bottom >= height + gap + margin
      ? spotlight.bottom + gap
      : spotlight.top >= height + gap + margin
        ? spotlight.top - gap - height
        : viewport.height - height - margin
  }
  return {
    left: clamp(left, margin, viewport.width - width - margin),
    top: clamp(top, margin, viewport.height - height - margin),
    width, spotlight
  }
}
