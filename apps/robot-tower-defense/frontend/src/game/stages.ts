import type { BuildPad, PathMetrics, Point, StageDefinition, WaveDefinition } from './types';

const BOARD_WIDTH = 360;
const BOARD_HEIGHT = 500;

function metricsFromPath(path: Point[]): PathMetrics {
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    const length = Math.hypot(current.x - previous.x, current.y - previous.y);
    segmentLengths.push(length);
    totalLength += length;
  }

  return { segmentLengths, totalLength };
}

function stage(
  id: number,
  name: string,
  subtitle: string,
  briefing: string,
  path: Point[],
  pads: BuildPad[],
  waves: WaveDefinition[],
  startingCredits: number,
  coreIntegrity: number,
  starThresholds: { two: number; three: number }
): StageDefinition {
  return {
    id,
    worldId: 1,
    worldName: 'Factory Frontier',
    name,
    subtitle,
    briefing,
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    path,
    pathMetrics: metricsFromPath(path),
    pads,
    waves,
    startingCredits,
    coreIntegrity,
    starThresholds
  };
}

const PADS_A: BuildPad[] = [
  { id: 'A1', x: 66, y: 112 },
  { id: 'A2', x: 162, y: 118 },
  { id: 'A3', x: 282, y: 112 },
  { id: 'A4', x: 264, y: 214 },
  { id: 'A5', x: 106, y: 246 },
  { id: 'A6', x: 296, y: 320 },
  { id: 'A7', x: 146, y: 362 },
  { id: 'A8', x: 70, y: 414 }
];

const PADS_B: BuildPad[] = [
  { id: 'B1', x: 88, y: 96 },
  { id: 'B2', x: 246, y: 124 },
  { id: 'B3', x: 142, y: 176 },
  { id: 'B4', x: 286, y: 236 },
  { id: 'B5', x: 80, y: 250 },
  { id: 'B6', x: 230, y: 322 },
  { id: 'B7', x: 122, y: 382 },
  { id: 'B8', x: 288, y: 410 }
];

const PADS_C: BuildPad[] = [
  { id: 'C1', x: 82, y: 92 },
  { id: 'C2', x: 192, y: 100 },
  { id: 'C3', x: 288, y: 156 },
  { id: 'C4', x: 104, y: 196 },
  { id: 'C5', x: 234, y: 256 },
  { id: 'C6', x: 66, y: 302 },
  { id: 'C7', x: 188, y: 356 },
  { id: 'C8', x: 290, y: 410 }
];

const PATHS = {
  descent: [
    { x: 180, y: 18 },
    { x: 180, y: 96 },
    { x: 290, y: 96 },
    { x: 290, y: 204 },
    { x: 78, y: 204 },
    { x: 78, y: 334 },
    { x: 238, y: 334 },
    { x: 238, y: 474 }
  ],
  switchback: [
    { x: 68, y: 18 },
    { x: 68, y: 106 },
    { x: 286, y: 106 },
    { x: 286, y: 186 },
    { x: 112, y: 186 },
    { x: 112, y: 284 },
    { x: 308, y: 284 },
    { x: 308, y: 414 },
    { x: 180, y: 414 },
    { x: 180, y: 474 }
  ],
  railYard: [
    { x: 292, y: 18 },
    { x: 292, y: 86 },
    { x: 92, y: 86 },
    { x: 92, y: 176 },
    { x: 262, y: 176 },
    { x: 262, y: 260 },
    { x: 62, y: 260 },
    { x: 62, y: 384 },
    { x: 210, y: 384 },
    { x: 210, y: 474 }
  ],
  furnace: [
    { x: 140, y: 18 },
    { x: 140, y: 94 },
    { x: 286, y: 94 },
    { x: 286, y: 168 },
    { x: 164, y: 168 },
    { x: 164, y: 256 },
    { x: 304, y: 256 },
    { x: 304, y: 352 },
    { x: 104, y: 352 },
    { x: 104, y: 474 }
  ]
};

function wave(name: string, briefing: string, entries: WaveDefinition['entries']): WaveDefinition {
  return { name, briefing, entries };
}

export const STAGES: StageDefinition[] = [
  stage(
    1,
    'Stage 1-1',
    'Docking Line',
    'Warm up the defense grid and learn the lane bends.',
    PATHS.descent,
    PADS_A,
    [
      wave('Wave 1', 'Single Junkbot line incoming.', [{ enemyTypeId: 'junkbot', count: 6, interval: 0.9 }]),
      wave('Wave 2', 'Faster scouts behind the walkers.', [
        { enemyTypeId: 'junkbot', count: 5, interval: 0.75 },
        { enemyTypeId: 'scuttler', count: 4, interval: 0.5, startDelay: 1.5 }
      ]),
      wave('Wave 3', 'Mixed units and a first Bulwark.', [
        { enemyTypeId: 'junkbot', count: 6, interval: 0.7 },
        { enemyTypeId: 'scuttler', count: 4, interval: 0.45, startDelay: 1.2 },
        { enemyTypeId: 'bulwark', count: 1, interval: 1, startDelay: 2.5 }
      ])
    ],
    165,
    14,
    { two: 8, three: 12 }
  ),
  stage(
    2,
    'Stage 1-2',
    'Servo Bend',
    'Scuttlers arrive in packs. Cover both the entrance and lower bend.',
    PATHS.switchback,
    PADS_B,
    [
      wave('Wave 1', 'Scuttler scout rush.', [{ enemyTypeId: 'scuttler', count: 8, interval: 0.38 }]),
      wave('Wave 2', 'Junkbots anchor the wave.', [
        { enemyTypeId: 'junkbot', count: 6, interval: 0.65 },
        { enemyTypeId: 'scuttler', count: 6, interval: 0.42, startDelay: 1.2 }
      ]),
      wave('Wave 3', 'Bulwarks soak while scouts sprint.', [
        { enemyTypeId: 'bulwark', count: 2, interval: 1.5 },
        { enemyTypeId: 'scuttler', count: 8, interval: 0.34, startDelay: 0.6 },
        { enemyTypeId: 'junkbot', count: 4, interval: 0.55, startDelay: 1.4 }
      ])
    ],
    180,
    14,
    { two: 8, three: 12 }
  ),
  stage(
    3,
    'Stage 1-3',
    'Armor Channel',
    'Bulwarks test whether you invested in focused fire.',
    PATHS.railYard,
    PADS_C,
    [
      wave('Wave 1', 'Bulwark lead with repair backup later.', [
        { enemyTypeId: 'bulwark', count: 2, interval: 1.5 },
        { enemyTypeId: 'junkbot', count: 4, interval: 0.6, startDelay: 1.1 }
      ]),
      wave('Wave 2', 'Repair bots support the front line.', [
        { enemyTypeId: 'bulwark', count: 3, interval: 1.35 },
        { enemyTypeId: 'repair-bot', count: 2, interval: 1.4, startDelay: 1.4 },
        { enemyTypeId: 'junkbot', count: 4, interval: 0.5, startDelay: 0.8 }
      ]),
      wave('Wave 3', 'Fast support around heavy armor.', [
        { enemyTypeId: 'shield-drone', count: 3, interval: 0.9 },
        { enemyTypeId: 'bulwark', count: 3, interval: 1.2, startDelay: 1 },
        { enemyTypeId: 'scuttler', count: 6, interval: 0.35, startDelay: 0.7 }
      ])
    ],
    190,
    13,
    { two: 7, three: 11 }
  ),
  stage(
    4,
    'Stage 1-4',
    'Relay Fork',
    'Shielded targets need burst to crack the line open.',
    PATHS.furnace,
    PADS_A,
    [
      wave('Wave 1', 'Shield drones lead the route.', [
        { enemyTypeId: 'shield-drone', count: 5, interval: 0.8 },
        { enemyTypeId: 'junkbot', count: 5, interval: 0.5, startDelay: 0.9 }
      ]),
      wave('Wave 2', 'A mixed convoy tests all lanes.', [
        { enemyTypeId: 'bulwark', count: 2, interval: 1.4 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.75, startDelay: 0.8 },
        { enemyTypeId: 'scuttler', count: 8, interval: 0.34, startDelay: 1.6 }
      ]),
      wave('Wave 3', 'Repair support holds shield walls together.', [
        { enemyTypeId: 'repair-bot', count: 2, interval: 1.5 },
        { enemyTypeId: 'shield-drone', count: 5, interval: 0.72, startDelay: 0.7 },
        { enemyTypeId: 'junkbot', count: 6, interval: 0.48, startDelay: 1.4 }
      ])
    ],
    205,
    13,
    { two: 7, three: 11 }
  ),
  stage(
    5,
    'Stage 1-5',
    'Vent Stack',
    'Tight turns reward splash and control combinations.',
    PATHS.switchback,
    PADS_C,
    [
      wave('Wave 1', 'Swarm flood down the upper spine.', [
        { enemyTypeId: 'scuttler', count: 12, interval: 0.28 },
        { enemyTypeId: 'junkbot', count: 5, interval: 0.5, startDelay: 0.8 }
      ]),
      wave('Wave 2', 'Repair bots keep the swarm alive.', [
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.1 },
        { enemyTypeId: 'scuttler', count: 10, interval: 0.3, startDelay: 0.7 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.65, startDelay: 1.8 }
      ]),
      wave('Wave 3', 'Everything overlaps at the final switchback.', [
        { enemyTypeId: 'bulwark', count: 3, interval: 1.25 },
        { enemyTypeId: 'repair-bot', count: 2, interval: 1.25, startDelay: 0.8 },
        { enemyTypeId: 'scuttler', count: 12, interval: 0.26, startDelay: 1.6 }
      ])
    ],
    220,
    12,
    { two: 7, three: 10 }
  ),
  stage(
    6,
    'Stage 1-6',
    'Mag Rail Cut',
    'Long firing lanes favor sharp single-target choices.',
    PATHS.railYard,
    PADS_B,
    [
      wave('Wave 1', 'Bulwarks soak the rail corridor.', [
        { enemyTypeId: 'bulwark', count: 4, interval: 1.15 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.68, startDelay: 1.2 }
      ]),
      wave('Wave 2', 'Scuttlers flood behind armor.', [
        { enemyTypeId: 'bulwark', count: 3, interval: 1.3 },
        { enemyTypeId: 'scuttler', count: 12, interval: 0.28, startDelay: 0.8 },
        { enemyTypeId: 'junkbot', count: 5, interval: 0.45, startDelay: 1.4 }
      ]),
      wave('Wave 3', 'Support, shields, and heavies at once.', [
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.05 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.62, startDelay: 0.8 },
        { enemyTypeId: 'bulwark', count: 4, interval: 1.15, startDelay: 1.3 }
      ])
    ],
    225,
    12,
    { two: 6, three: 10 }
  ),
  stage(
    7,
    'Stage 1-7',
    'Core Intake',
    'The economy gets tighter. Build with purpose.',
    PATHS.descent,
    PADS_C,
    [
      wave('Wave 1', 'Balanced pressure, no freebies.', [
        { enemyTypeId: 'junkbot', count: 8, interval: 0.5 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.62, startDelay: 1.4 }
      ]),
      wave('Wave 2', 'Control the center or lose tempo.', [
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.25 },
        { enemyTypeId: 'scuttler', count: 10, interval: 0.26, startDelay: 0.7 },
        { enemyTypeId: 'bulwark', count: 3, interval: 1.1, startDelay: 1.5 }
      ]),
      wave('Wave 3', 'Layered heavies closing on the core.', [
        { enemyTypeId: 'bulwark', count: 5, interval: 1.1 },
        { enemyTypeId: 'shield-drone', count: 5, interval: 0.56, startDelay: 0.9 },
        { enemyTypeId: 'scuttler', count: 8, interval: 0.25, startDelay: 1.8 }
      ])
    ],
    205,
    11,
    { two: 6, three: 9 }
  ),
  stage(
    8,
    'Stage 1-8',
    'Smelter Spiral',
    'This lane asks for slow, splash, and boss prep at once.',
    PATHS.furnace,
    PADS_B,
    [
      wave('Wave 1', 'Swarm front with repair support.', [
        { enemyTypeId: 'scuttler', count: 14, interval: 0.24 },
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.1, startDelay: 0.8 }
      ]),
      wave('Wave 2', 'Shield walls and armor train.', [
        { enemyTypeId: 'shield-drone', count: 5, interval: 0.58 },
        { enemyTypeId: 'bulwark', count: 5, interval: 1.05, startDelay: 1.1 },
        { enemyTypeId: 'junkbot', count: 6, interval: 0.42, startDelay: 0.9 }
      ]),
      wave('Wave 3', 'Sustained pressure from every archetype.', [
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.15 },
        { enemyTypeId: 'shield-drone', count: 5, interval: 0.55, startDelay: 0.7 },
        { enemyTypeId: 'bulwark', count: 4, interval: 1.05, startDelay: 1.5 },
        { enemyTypeId: 'scuttler', count: 12, interval: 0.24, startDelay: 1.1 }
      ])
    ],
    220,
    11,
    { two: 6, three: 9 }
  ),
  stage(
    9,
    'Stage 1-9',
    'Titan Assembly',
    'Survive the pre-boss line and conserve reactor integrity.',
    PATHS.switchback,
    PADS_A,
    [
      wave('Wave 1', 'Heavy convoy escorted by support.', [
        { enemyTypeId: 'bulwark', count: 5, interval: 1 },
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.1, startDelay: 0.8 },
        { enemyTypeId: 'shield-drone', count: 5, interval: 0.56, startDelay: 1.2 }
      ]),
      wave('Wave 2', 'A swarm surge after the heavy line.', [
        { enemyTypeId: 'scuttler', count: 16, interval: 0.22 },
        { enemyTypeId: 'junkbot', count: 8, interval: 0.35, startDelay: 0.7 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.58, startDelay: 1.8 }
      ]),
      wave('Wave 3', 'Final systems check before the Titan.', [
        { enemyTypeId: 'repair-bot', count: 4, interval: 1.05 },
        { enemyTypeId: 'bulwark', count: 5, interval: 1 },
        { enemyTypeId: 'shield-drone', count: 6, interval: 0.54, startDelay: 0.9 },
        { enemyTypeId: 'scuttler', count: 10, interval: 0.22, startDelay: 1.4 }
      ])
    ],
    235,
    10,
    { two: 5, three: 8 }
  ),
  stage(
    10,
    'Stage 1-10',
    'Forge Gate',
    'The Forge Titan marches with escort drones. Hold the line.',
    PATHS.furnace,
    PADS_C,
    [
      wave('Wave 1', 'Shield escort to soften the grid.', [
        { enemyTypeId: 'shield-drone', count: 6, interval: 0.52 },
        { enemyTypeId: 'junkbot', count: 8, interval: 0.4, startDelay: 0.7 }
      ]),
      wave('Wave 2', 'Repair crews and Bulwarks set the pace.', [
        { enemyTypeId: 'repair-bot', count: 4, interval: 1 },
        { enemyTypeId: 'bulwark', count: 5, interval: 0.95, startDelay: 0.8 },
        { enemyTypeId: 'scuttler', count: 12, interval: 0.2, startDelay: 1.5 }
      ]),
      wave('Wave 3', 'Forge Titan deployment.', [
        { enemyTypeId: 'forge-titan', count: 1, interval: 1 },
        { enemyTypeId: 'shield-drone', count: 4, interval: 0.55, startDelay: 1.2 },
        { enemyTypeId: 'repair-bot', count: 3, interval: 1.2, startDelay: 2 },
        { enemyTypeId: 'bulwark', count: 4, interval: 1, startDelay: 2.6 }
      ])
    ],
    260,
    10,
    { two: 5, three: 8 }
  )
];

export function getStage(stageId: number): StageDefinition {
  return STAGES.find((stageItem) => stageItem.id === stageId) ?? STAGES[0];
}

export function getStageStars(stage: StageDefinition, remainingIntegrity: number): 1 | 2 | 3 {
  if (remainingIntegrity >= stage.starThresholds.three) {
    return 3;
  }

  if (remainingIntegrity >= stage.starThresholds.two) {
    return 2;
  }

  return 1;
}
