/**
 * Route definitions for traffic lights that can spawn animated vehicles.
 *
 * External controller IDs stay unchanged. Multiple frontend-only route variants
 * can exist under the same controller light ID.
 *
 * To edit these visually, use the path editor at /editor.html.
 */
export const RAIL_SIGNAL_ID = "SP";

export const RAW_PATHS = {
  1.1: {
    color: "#e74c3c",
    desc: "E->N",
    variants: [
      {
        id: "north",
        desc: "E->N",
        points: [
          [640, 289],
          [545, 289],
          [480, 288],
          [443, 287],
          [395, 282],
          [372, 237],
          [371, 160],
          [371, 118],
          [371, 3],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  2.1: {
    color: "#e74c3c",
    desc: "E->W",
    variants: [
      {
        id: "west",
        desc: "E->W",
        points: [
          [640, 314],
          [553, 316],
          [483, 315],
          [444, 315],
          [400, 312],
          [351, 301],
          [317, 273],
          [274, 257],
          [229, 245],
          [149, 245],
          [68, 246],
          [0, 246],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  5.1: {
    color: "#2ecc71",
    desc: "S lane split",
    variants: [
      {
        id: "north",
        desc: "S->N",
        points: [
          [388, 640],
          [386, 589],
          [386, 544],
          [386, 511],
          [387, 444],
          [388, 403],
          [381, 343],
          [370, 283],
          [371, 221],
          [370, 119],
          [370, 0],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
      {
        id: "east",
        desc: "S->E",
        points: [
          [388, 640],
          [386, 589],
          [386, 544],
          [386, 511],
          [387, 444],
          [389, 404],
          [413, 374],
          [489, 374],
          [559, 376],
          [640, 376],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  6.1: {
    color: "#2ecc71",
    desc: "S->W",
    variants: [
      {
        id: "west",
        desc: "S->W",
        points: [
          [363, 640],
          [362, 589],
          [360, 543],
          [360, 511],
          [360, 452],
          [358, 384],
          [350, 326],
          [325, 283],
          [282, 256],
          [217, 247],
          [123, 245],
          [0, 246],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  7.1: {
    color: "#f39c12",
    desc: "W->S",
    variants: [
      {
        id: "south",
        desc: "W->S",
        points: [
          [0, 333],
          [85, 336],
          [148, 336],
          [180, 336],
          [257, 335],
          [314, 358],
          [324, 423],
          [324, 517],
          [326, 584],
          [328, 640],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  8.1: {
    color: "#f39c12",
    desc: "W->E",
    variants: [
      {
        id: "east",
        desc: "W->E",
        points: [
          [0, 307],
          [73, 306],
          [143, 309],
          [179, 310],
          [277, 317],
          [365, 349],
          [458, 349],
          [547, 351],
          [640, 352],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  9.1: {
    color: "#f39c12",
    desc: "W->N",
    variants: [
      {
        id: "north",
        desc: "W->N",
        points: [
          [0, 279],
          [70, 280],
          [142, 282],
          [181, 283],
          [241, 285],
          [307, 283],
          [351, 271],
          [371, 226],
          [373, 129],
          [371, 0],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  10.1: {
    color: "#3498db",
    desc: "N->W",
    variants: [
      {
        id: "west",
        desc: "N->W",
        points: [
          [253, 0],
          [253, 70],
          [254, 140],
          [253, 170],
          [255, 206],
          [244, 244],
          [209, 249],
          [125, 249],
          [0, 248],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  11.1: {
    color: "#3498db",
    desc: "N->S",
    variants: [
      {
        id: "south",
        desc: "N->S",
        points: [
          [281, 0],
          [282, 70],
          [281, 140],
          [281, 168],
          [280, 250],
          [306, 325],
          [324, 396],
          [324, 524],
          [325, 640],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  12.1: {
    color: "#3498db",
    desc: "N->E",
    variants: [
      {
        id: "east",
        desc: "N->E",
        points: [
          [310, 0],
          [309, 78],
          [310, 141],
          [310, 168],
          [313, 241],
          [318, 283],
          [337, 328],
          [393, 373],
          [522, 376],
          [639, 376],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
      {
        id: "N->E_2",
        desc: "N->E-2",
        points: [
          [336, 0],
          [336, 77],
          [335, 142],
          [336, 167],
          [338, 238],
          [345, 284],
          [375, 325],
          [425, 355],
          [547, 350],
          [640, 350],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
};

export const RAIL_LAYOUT = {
  crossing: {
    points: [
      [0, 480],
      [640, 482],
    ],
  },
  signal: {
    points: [[212, 425]],
  },
  trainPath: {
    points: [
      [636, 483],
      [2, 480],
    ],
  },
};

export const MANUAL_LIGHTS = {
  42: { desc: "Bus E", cat: "bus" },
  22: { desc: "Fiets Oost", cat: "fiets" },
  26.1: { desc: "Fiets West", cat: "fiets" },
  28.1: { desc: "Fiets N-O", cat: "fiets" },
  86.1: { desc: "Fiets Z/W", cat: "fiets" },
  88.1: { desc: "Fiets West2", cat: "fiets" },
  31.1: { desc: "Voetg O Z>N 1", cat: "voetg" },
  31.2: { desc: "Voetg O Z>N 2", cat: "voetg" },
  32.1: { desc: "Voetg O N>Z 1", cat: "voetg" },
  32.2: { desc: "Voetg O N>Z 2", cat: "voetg" },
  35.1: { desc: "Voetg W N>Z 1", cat: "voetg" },
  35.2: { desc: "Voetg W N>Z 2", cat: "voetg" },
  36.1: { desc: "Voetg W Z>N 1", cat: "voetg" },
  36.2: { desc: "Voetg W Z>N 2", cat: "voetg" },
  37.1: { desc: "Voetg N O>W 1", cat: "voetg" },
  37.2: { desc: "Voetg N O>W 2", cat: "voetg" },
  38.1: { desc: "Voetg N W<O 1", cat: "voetg" },
  38.2: { desc: "Voetg N W<O 2", cat: "voetg" },
};

export const SPECIAL_LIGHTS = {
  [RAIL_SIGNAL_ID]: { desc: "Rail crossing", cat: "train" },
};

export function normalizePathDefinitions(rawPaths = RAW_PATHS) {
  const normalized = {};

  for (const [signalId, raw] of Object.entries(rawPaths)) {
    const baseColor = raw.color || "#888";
    const baseDesc = raw.desc || signalId;

    const variants =
      Array.isArray(raw.variants) && raw.variants.length
        ? raw.variants.map((variant, index) => ({
            id: variant.id || `variant${index + 1}`,
            desc: variant.desc || baseDesc,
            color: variant.color || baseColor,
            points: variant.points,
            stopIdx: variant.stopIdx,
            detectIdx: variant.detectIdx,
          }))
        : [
            {
              id: raw.id || "default",
              desc: raw.desc || baseDesc,
              color: baseColor,
              points: raw.points,
              stopIdx: raw.stopIdx,
              detectIdx: raw.detectIdx,
            },
          ];

    normalized[signalId] = {
      signalId,
      desc: baseDesc,
      color: baseColor,
      variants,
    };
  }

  return normalized;
}

export function getSignalIds(
  rawPaths = RAW_PATHS,
  { includeRail = false } = {},
) {
  return Object.keys(normalizePathDefinitions(rawPaths)).filter(
    (id) => includeRail || id !== RAIL_SIGNAL_ID,
  );
}
