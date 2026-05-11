/**
 * Path math utilities.
 *
 * Converts waypoint arrays into distance-indexed paths and supports multiple
 * frontend-only route variants under the same controller signal ID.
 */

import { normalizePathDefinitions } from './paths.js';

/**
 * Build a computed path from raw waypoint data.
 *
 * @param {Object} raw - { points, stopIdx, detectIdx, color, desc, entityType }
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
    entityType: raw.entityType || "car",
    stopIdx: raw.stopIdx,
    detectIdx: raw.detectIdx,
  };
}

/**
 * Flatten normalized frontend route definitions into computed variant paths.
 *
 * @param {Object} rawPaths - signal keyed raw path definitions
 * @returns {Object} map of variantKey -> computed path metadata
 */
export function buildAllPaths(rawPaths) {
  const normalized = normalizePathDefinitions(rawPaths);
  const paths = {};

  for (const [signalId, signal] of Object.entries(normalized)) {
    signal.variants.forEach((variant, index) => {
      const variantKey = signal.variants.length === 1
        ? signalId
        : `${signalId}::${variant.id || index + 1}`;

      paths[variantKey] = {
        ...buildPath(variant),
        signalId,
        variantId: variant.id || `variant${index + 1}`,
        variantKey,
        signalDesc: signal.desc,
        variantDesc: variant.desc || signal.desc,
        entityType: variant.entityType || signal.entityType || "car",
      };
    });
  }

  return paths;
}

export function getSignalVariantKeys(paths, signalId) {
  return Object.keys(paths).filter((key) => paths[key].signalId === signalId);
}

export function getRepresentativePaths(paths) {
  const representative = {};

  for (const path of Object.values(paths)) {
    if (!representative[path.signalId]) {
      representative[path.signalId] = path;
    }
  }

  return representative;
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
