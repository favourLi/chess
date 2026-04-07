export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}
