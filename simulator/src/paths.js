/**
 * Route definitions for traffic lights that can spawn animated path entities.
 *
 * External controller IDs stay unchanged. Multiple frontend-only route variants
 * can exist under the same controller light ID.
 *
 * To edit these visually, use the path editor at /editor.html.
 */
export const RAIL_SIGNAL_ID = "sb";

export const RAW_PATHS = {
  22: {
    entityType: "bike",
    color: "#16a085",
    desc: "Fiets Oost",
    variants: [
      {
        id: "south-north",
        desc: "E arm S->N",
        points: [
          [422, 640],
          [422, 516],
          [421, 434],
          [421, 400],
          [420, 327],
          [420, 252],
          [420, 235],
          [401, 213],
          [401, 161],
        ],
        stopIdx: 3,
        detectIdx: 2,
        railStopIdx: 1,
      },
    ],
  },
  1.1: {
    entityType: "car",
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
          [451, 288],
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
    entityType: "car",
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
          [453, 315],
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
    entityType: "car",
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
    entityType: "car",
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
    entityType: "car",
    color: "#f39c12",
    desc: "W->S",
    variants: [
      {
        id: "south",
        desc: "W->S",
        points: [
          [0, 333],
          [85, 336],
          [144, 336],
          [176, 336],
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
    entityType: "car",
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
          [173, 309],
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
    entityType: "car",
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
          [172, 283],
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
    entityType: "car",
    color: "#3498db",
    desc: "N->W",
    variants: [
      {
        id: "west",
        desc: "N->W",
        points: [
          [253, 0],
          [253, 70],
          [254, 134],
          [254, 162],
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
    entityType: "car",
    color: "#3498db",
    desc: "N->S",
    variants: [
      {
        id: "south",
        desc: "N->S",
        points: [
          [281, 0],
          [282, 70],
          [281, 133],
          [281, 162],
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
    entityType: "car",
    color: "#3498db",
    desc: "N->E",
    variants: [
      {
        id: "east",
        desc: "N->E",
        points: [
          [310, 0],
          [309, 78],
          [310, 132],
          [310, 162],
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
          [336, 132],
          [336, 160],
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
  26.1: {
    entityType: "bike",
    color: "#16a085",
    desc: "Fiets West",
    variants: [
      {
        id: "north-south",
        desc: "W arm N->S",
        points: [
          [209, 139],
          [207, 166],
          [206, 197],
          [206, 226],
          [206, 317],
          [206, 376],
          [256, 382],
          [278, 414],
          [279, 450],
          [280, 551],
          [281, 636],
        ],
        stopIdx: 3,
        detectIdx: 2,
        railStopIdx: 8,
      },
    ],
  },
  28.1: {
    entityType: "bike",
    color: "#16a085",
    desc: "Fiets N-O",
    variants: [
      {
        id: "west-east",
        desc: "N arm W->E",
        points: [
          [477, 237],
          [423, 236],
          [411, 221],
          [396, 195],
          [339, 194],
          [226, 196],
          [221, 179],
          [221, 113],
        ],
        stopIdx: 3,
        detectIdx: 2,
      },
    ],
  },
  86.1: {
    entityType: "bike",
    color: "#16a085",
    desc: "Fiets Z/W",
    variants: [
      {
        id: "north-south",
        desc: "SW crossing N->S",
        points: [
          [296, 637],
          [295, 512],
          [296, 395],
          [273, 372],
          [248, 363],
          [221, 360],
          [222, 210],
          [222, 114],
        ],
        stopIdx: 5,
        detectIdx: 4,
        railStopIdx: 1,
      },
    ],
  },
  88.1: {
    entityType: "bike",
    color: "#16a085",
    desc: "Fiets West2",
    variants: [
      {
        id: "west-east",
        desc: "W arm W->E",
        points: [
          [208, 138],
          [220, 195],
          [233, 209],
          [401, 210],
          [416, 234],
          [477, 236],
        ],
        stopIdx: 2,
        detectIdx: 1,
      },
    ],
  },
  31.1: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg O Z>N 1",
    variants: [
      {
        id: "south-north",
        desc: "E crossing S->N inner",
        points: [
          [433, 341],
          [433, 333],
          [431, 242],
          [449, 242],
        ],
        stopIdx: 1,
        detectIdx: 0,
        nextSignalId: "32.1",
      },
    ],
  },
  31.2: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg O Z>N 2",
    variants: [
      {
        id: "south-north",
        desc: "E crossing S->N outer",
        points: [
          [461, 244],
          [432, 244],
          [432, 334],
        ],
        stopIdx: 1,
        detectIdx: 0,
        nextSignalId: "32.1",
      },
    ],
  },
  32.1: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg O N>Z 1",
    variants: [
      {
        id: "north-south",
        desc: "E crossing N->S inner",
        points: [
          [433, 327],
          [432, 336],
          [432, 455],
          [431, 551],
        ],
        stopIdx: 1,
        detectIdx: 0,
        railStopIdx: 2,
      },
    ],
  },
  32.2: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg O N>Z 2",
    variants: [
      {
        id: "north-south",
        desc: "E crossing N->S outer",
        points: [
          [433, 550],
          [433, 513],
          [433, 416],
          [433, 397],
          [433, 334],
        ],
        stopIdx: 3,
        detectIdx: 2,
        nextSignalId: "31.1",
        railStopIdx: 1,
      },
    ],
  },
  35.1: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg W N>Z 1",
    variants: [
      {
        id: "north-south",
        desc: "W crossing N->S inner",
        points: [
          [195, 260],
          [194, 268],
          [196, 358],
        ],
        stopIdx: 1,
        detectIdx: 0,
        nextSignalId: "36.1",
      },
    ],
  },
  35.2: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg W N>Z 2",
    variants: [
      {
        id: "north-south",
        desc: "W crossing N->S outer",
        points: [
          [172, 358],
          [194, 356],
          [195, 266],
        ],
        stopIdx: 1,
        detectIdx: 0,
        nextSignalId: "36.1",
      },
    ],
  },
  36.1: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg W Z>N 1",
    variants: [
      {
        id: "south-north",
        desc: "W crossing S->N inner",
        points: [
          [194, 271],
          [195, 263],
          [194, 173],
        ],
        stopIdx: 1,
        detectIdx: 0,
      },
    ],
  },
  36.2: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg W Z>N 2",
    variants: [
      {
        id: "south-north",
        desc: "W crossing S->N outer",
        points: [
          [194, 171],
          [195, 213],
          [194, 230],
          [195, 264],
        ],
        stopIdx: 2,
        detectIdx: 1,
        nextSignalId: "35.1",
      },
    ],
  },
  37.1: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg N O>W 1",
    variants: [
      {
        id: "east-west",
        desc: "N crossing E->W inner",
        points: [
          [360, 185],
          [349, 185],
          [233, 184],
        ],
        stopIdx: 1,
        detectIdx: 0,
      },
    ],
  },
  37.2: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg N O>W 2",
    variants: [
      {
        id: "east-west",
        desc: "N crossing E->W outer",
        points: [
          [194, 184],
          [222, 183],
          [236, 183],
          [354, 185],
        ],
        stopIdx: 2,
        detectIdx: 1,
        nextSignalId: "38.1",
      },
    ],
  },
  38.1: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg N W<O 1",
    variants: [
      {
        id: "west-east",
        desc: "N crossing W->E inner",
        points: [
          [347, 185],
          [358, 185],
          [395, 184],
        ],
        stopIdx: 1,
        detectIdx: 0,
        nextSignalId: "37.1",
      },
    ],
  },
  38.2: {
    entityType: "pedestrian",
    color: "#7bdcb5",
    desc: "Voetg N W<O 2",
    variants: [
      {
        id: "west-east",
        desc: "N crossing W->E outer",
        points: [
          [393, 156],
          [392, 185],
          [353, 185],
        ],
        stopIdx: 1,
        detectIdx: 0,
        nextSignalId: "37.1",
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
};

export const SPECIAL_LIGHTS = {
  [RAIL_SIGNAL_ID]: { desc: "Rail crossing", cat: "train" },
};

export const CONTINUATION_ONLY_PEDESTRIAN_IDS = [
  "31.1",
  "32.1",
  "35.1",
  "36.1",
  "37.1",
  "38.1",
];

export function normalizePathDefinitions(rawPaths = RAW_PATHS) {
  const normalized = {};

  for (const [signalId, raw] of Object.entries(rawPaths)) {
    const baseColor = raw.color || "#888";
    const baseDesc = raw.desc || signalId;
    const entityType = raw.entityType || "car";

    const variants =
      Array.isArray(raw.variants) && raw.variants.length
        ? raw.variants.map((variant, index) => ({
            id: variant.id || `variant${index + 1}`,
            desc: variant.desc || baseDesc,
            color: variant.color || baseColor,
            points: variant.points,
            stopIdx: variant.stopIdx,
            detectIdx: variant.detectIdx,
            entityType: variant.entityType || entityType,
            nextSignalId: variant.nextSignalId || raw.nextSignalId || null,
            railStopIdx: Number.isInteger(variant.railStopIdx)
              ? variant.railStopIdx
              : raw.railStopIdx,
          }))
        : [
            {
              id: raw.id || "default",
              desc: raw.desc || baseDesc,
              color: baseColor,
              points: raw.points,
              stopIdx: raw.stopIdx,
              detectIdx: raw.detectIdx,
              entityType,
              nextSignalId: raw.nextSignalId || null,
              railStopIdx: raw.railStopIdx,
            },
          ];

    normalized[signalId] = {
      signalId,
      desc: baseDesc,
      color: baseColor,
      entityType,
      variants,
    };
  }

  return normalized;
}

export function getSignalIds(
  rawPaths = RAW_PATHS,
  { includeRail = false, entityTypes = null, excludeIds = [] } = {},
) {
  const allowedTypes = entityTypes ? new Set(entityTypes) : null;
  const excluded = new Set(excludeIds);
  return Object.entries(normalizePathDefinitions(rawPaths))
    .filter(([id, signal]) => includeRail || id !== RAIL_SIGNAL_ID)
    .filter(([id]) => !excluded.has(id))
    .filter(
      ([, signal]) => !allowedTypes || allowedTypes.has(signal.entityType),
    )
    .map(([id]) => id);
}
