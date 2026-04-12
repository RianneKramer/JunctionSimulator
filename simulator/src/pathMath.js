/**
 * Path math utilities.
 *
 * Converts raw waypoint arrays into distance-indexed paths
 * and provides interpolation along those paths.
 */

/**
 * Build a computed path from raw waypoint data.
 * Pre-calculates cumulative distances for fast lookup.
 *
 * @param {Object} raw - { points, stopIdx, detectIdx, color, desc }
 * @returns {Object} computed path with distance arrays
 */
export function buildPath(raw) {
  const pts = raw.points;
  const dists = [0];

  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }

  return {
    points: pts,
    dists,
    totalLength: dists[dists.length - 1],
    stopDist: dists[raw.stopIdx],
    detectDist: dists[raw.detectIdx],
    color: raw.color,
    desc: raw.desc,
    stopIdx: raw.stopIdx,
    detectIdx: raw.detectIdx,
  };
}

/**
 * Get the position and angle at a given distance along a path.
 *
 * @param {Object} path - computed path from buildPath()
 * @param {number} dist - distance along the path
 * @returns {{ x: number, y: number, angle: number }}
 */
export function posAt(path, dist) {
  const { points: pts, dists } = path;

  if (dist <= 0) {
    return {
      x: pts[0][0],
      y: pts[0][1],
      angle: Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]),
    };
  }

  for (let i = 1; i < pts.length; i++) {
    if (dist <= dists[i]) {
      const t = (dist - dists[i - 1]) / (dists[i] - dists[i - 1]);
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      return {
        x: pts[i - 1][0] + t * dx,
        y: pts[i - 1][1] + t * dy,
        angle: Math.atan2(dy, dx),
      };
    }
  }

  const n = pts.length - 1;
  return {
    x: pts[n][0],
    y: pts[n][1],
    angle: Math.atan2(pts[n][1] - pts[n - 1][1], pts[n][0] - pts[n - 1][0]),
  };
}

/**
 * Build all paths from raw definitions.
 *
 * @param {Object} rawPaths - map of id -> raw path data
 * @returns {Object} map of id -> computed path
 */
export function buildAllPaths(rawPaths) {
  const paths = {};
  for (const [id, raw] of Object.entries(rawPaths)) {
    paths[id] = buildPath(raw);
  }
  return paths;
}
