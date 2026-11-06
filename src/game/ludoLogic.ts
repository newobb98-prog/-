import { PlayerColor, Token, TokenLocation, ValidMove, Player } from '../types/game';

// 52 track coordinates mapping (col, row) on a 15x15 board
export const TRACK_COORDINATES: Array<{ col: number; row: number }> = [
  /* 0..4 (Red arm going right) */
  { col: 1, row: 6 }, // 0: Red Start
  { col: 2, row: 6 }, // 1
  { col: 3, row: 6 }, // 2
  { col: 4, row: 6 }, // 3
  { col: 5, row: 6 }, // 4
  /* 5..10 (Top arm going up) */
  { col: 6, row: 5 }, // 5
  { col: 6, row: 4 }, // 6
  { col: 6, row: 3 }, // 7
  { col: 6, row: 2 }, // 8: Safe Star
  { col: 6, row: 1 }, // 9
  { col: 6, row: 0 }, // 10
  /* 11..12 (Top turn) */
  { col: 7, row: 0 }, // 11
  { col: 8, row: 0 }, // 12
  /* 13..17 (Top arm going down) */
  { col: 8, row: 1 }, // 13: Green Start
  { col: 8, row: 2 }, // 14
  { col: 8, row: 3 }, // 15
  { col: 8, row: 4 }, // 16
  { col: 8, row: 5 }, // 17
  /* 18..23 (Right arm going right) */
  { col: 9, row: 6 }, // 18
  { col: 10, row: 6 }, // 19
  { col: 11, row: 6 }, // 20
  { col: 12, row: 6 }, // 21: Safe Star
  { col: 13, row: 6 }, // 22
  { col: 14, row: 6 }, // 23
  /* 24..25 (Right turn) */
  { col: 14, row: 7 }, // 24
  { col: 14, row: 8 }, // 25
  /* 26..30 (Right arm going left) */
  { col: 13, row: 8 }, // 26: Yellow Start
  { col: 12, row: 8 }, // 27
  { col: 11, row: 8 }, // 28
  { col: 10, row: 8 }, // 29
  { col: 9, row: 8 }, // 30
  /* 31..36 (Bottom arm going down) */
  { col: 8, row: 9 }, // 31
  { col: 8, row: 10 }, // 32
  { col: 8, row: 11 }, // 33
  { col: 8, row: 12 }, // 34: Safe Star
  { col: 8, row: 13 }, // 35
  { col: 8, row: 14 }, // 36
  /* 37..38 (Bottom turn) */
  { col: 7, row: 14 }, // 37
  { col: 6, row: 14 }, // 38
  /* 39..43 (Bottom arm going up) */
  { col: 6, row: 13 }, // 39: Blue Start
  { col: 6, row: 12 }, // 40
  { col: 6, row: 11 }, // 41
  { col: 6, row: 10 }, // 42
  { col: 6, row: 9 }, // 43
  /* 44..49 (Left arm going left) */
  { col: 5, row: 8 }, // 44
  { col: 4, row: 8 }, // 45
  { col: 3, row: 8 }, // 46
  { col: 2, row: 8 }, // 47: Safe Star
  { col: 1, row: 8 }, // 48
  { col: 0, row: 8 }, // 49
  /* 50..51 (Left turn) */
  { col: 0, row: 7 }, // 50
  { col: 0, row: 6 }, // 51
];

export const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

export const START_TRACK_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

export const HOME_PATH_COORDINATES: Record<PlayerColor, Array<{ col: number; row: number }>> = {
  red: [
    { col: 1, row: 7 },
    { col: 2, row: 7 },
    { col: 3, row: 7 },
    { col: 4, row: 7 },
    { col: 5, row: 7 },
  ],
  green: [
    { col: 7, row: 1 },
    { col: 7, row: 2 },
    { col: 7, row: 3 },
    { col: 7, row: 4 },
    { col: 7, row: 5 },
  ],
  yellow: [
    { col: 13, row: 7 },
    { col: 12, row: 7 },
    { col: 11, row: 7 },
    { col: 10, row: 7 },
    { col: 9, row: 7 },
  ],
  blue: [
    { col: 7, row: 13 },
    { col: 7, row: 12 },
    { col: 7, row: 11 },
    { col: 7, row: 10 },
    { col: 7, row: 9 },
  ],
};

export const HOME_GOAL_COORDINATES: Record<PlayerColor, { col: number; row: number }> = {
  red: { col: 6.2, row: 7 },
  green: { col: 7, row: 6.2 },
  yellow: { col: 7.8, row: 7 },
  blue: { col: 7, row: 7.8 },
};

export const YARD_SLOT_COORDINATES: Record<PlayerColor, Array<{ col: number; row: number }>> = {
  red: [
    { col: 1.8, row: 1.8 },
    { col: 3.6, row: 1.8 },
    { col: 1.8, row: 3.6 },
    { col: 3.6, row: 3.6 },
  ],
  green: [
    { col: 10.8, row: 1.8 },
    { col: 12.6, row: 1.8 },
    { col: 10.8, row: 3.6 },
    { col: 12.6, row: 3.6 },
  ],
  yellow: [
    { col: 10.8, row: 10.8 },
    { col: 12.6, row: 10.8 },
    { col: 10.8, row: 12.6 },
    { col: 12.6, row: 12.6 },
  ],
  blue: [
    { col: 1.8, row: 10.8 },
    { col: 3.6, row: 10.8 },
    { col: 1.8, row: 12.6 },
    { col: 3.6, row: 12.6 },
  ],
};

export const TOTAL_STEPS_TO_HOME = 57;

export function isSafeZone(location: TokenLocation): boolean {
  if (location.type === 'home' || location.type === 'home_path' || location.type === 'yard') {
    return true;
  }
  return SAFE_TRACK_INDICES.includes(location.stepIndex);
}

// Convert TokenLocation to 15x15 board (col, row)
export function getBoardCoordinates(color: PlayerColor, location: TokenLocation): { col: number; row: number } {
  switch (location.type) {
    case 'yard':
      return YARD_SLOT_COORDINATES[color][location.slotIndex] || YARD_SLOT_COORDINATES[color][0];
    case 'track':
      return TRACK_COORDINATES[location.stepIndex] || { col: 7, row: 7 };
    case 'home_path':
      return HOME_PATH_COORDINATES[color][location.pathIndex] || { col: 7, row: 7 };
    case 'home':
      return HOME_GOAL_COORDINATES[color];
  }
}

/**
 * Calculates new location and stepsTraveled after moving by `diceValue`.
 * Returns null if the move is invalid (e.g. requires rolling 6 from yard, or overshoot home goal).
 */
export function calculateNextLocation(
  color: PlayerColor,
  token: Token,
  diceValue: number
): { nextLocation: TokenLocation; newStepsTraveled: number } | null {
  if (token.location.type === 'home') {
    return null; // Already finished
  }

  // Token is in yard
  if (token.location.type === 'yard') {
    if (diceValue === 6) {
      // Spawn onto start square
      return {
        nextLocation: { type: 'track', stepIndex: START_TRACK_INDEX[color] },
        newStepsTraveled: 1,
      };
    }
    return null;
  }

  // Token is already active
  const currentSteps = token.stepsTraveled;
  const targetSteps = currentSteps + diceValue;

  // Cannot overshoot home goal
  if (targetSteps > TOTAL_STEPS_TO_HOME) {
    return null;
  }

  // Exactly reached Home Goal
  if (targetSteps === TOTAL_STEPS_TO_HOME) {
    return {
      nextLocation: { type: 'home' },
      newStepsTraveled: TOTAL_STEPS_TO_HOME,
    };
  }

  // In home path: steps 52 to 56 correspond to pathIndex 0..4
  if (targetSteps >= 52) {
    const pathIndex = targetSteps - 52;
    return {
      nextLocation: { type: 'home_path', pathIndex },
      newStepsTraveled: targetSteps,
    };
  }

  // In regular track: steps 1 to 51
  const startIdx = START_TRACK_INDEX[color];
  const trackIndex = (startIdx + (targetSteps - 1)) % 52;
  return {
    nextLocation: { type: 'track', stepIndex: trackIndex },
    newStepsTraveled: targetSteps,
  };
}

/**
 * Checks if landing on this target location will capture an opponent token.
 */
export function findCapturableToken(
  allTokens: Token[],
  movingColor: PlayerColor,
  targetLocation: TokenLocation
): Token | null {
  // Captures only happen on outer track outside safe zones
  if (targetLocation.type !== 'track') return null;
  if (SAFE_TRACK_INDICES.includes(targetLocation.stepIndex)) return null;

  for (const t of allTokens) {
    if (t.color !== movingColor && t.location.type === 'track') {
      if (t.location.stepIndex === targetLocation.stepIndex) {
        return t;
      }
    }
  }
  return null;
}

/**
 * Returns all valid moves for the given player and dice roll.
 */
export function getValidMoves(
  playerTokens: Token[],
  allTokens: Token[],
  color: PlayerColor,
  diceValue: number
): ValidMove[] {
  const validMoves: ValidMove[] = [];

  for (const token of playerTokens) {
    if (token.color !== color) continue;
    if (token.location.type === 'home') continue;

    const result = calculateNextLocation(color, token, diceValue);
    if (!result) continue;

    const capturable = findCapturableToken(allTokens, color, result.nextLocation);
    const isSpawn = token.location.type === 'yard' && result.nextLocation.type === 'track';
    const isEnterHome = result.nextLocation.type === 'home';

    validMoves.push({
      tokenId: token.id,
      color,
      from: token.location,
      to: result.nextLocation,
      isCapture: !!capturable,
      isEnterHome,
      isSpawn,
    });
  }

  return validMoves;
}

/**
 * Bot AI Decision Maker.
 * Evaluates valid moves and picks the best one according to strategy:
 * Hard: High tactical acumen (captures > goals > escapes > spawning > strategic advancement).
 * Medium: Balanced.
 * Easy: Somewhat random with slight preference for captures and spawning.
 */
export function pickBotMove(
  validMoves: ValidMove[],
  allTokens: Token[],
  playerTokens: Token[],
  difficulty: 'easy' | 'medium' | 'hard' = 'hard'
): ValidMove | null {
  if (validMoves.length === 0) return null;
  if (validMoves.length === 1) return validMoves[0];

  if (difficulty === 'easy' && Math.random() < 0.35) {
    // Pick randomly on easy
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  let bestMove = validMoves[0];
  let highestScore = -Infinity;

  for (const move of validMoves) {
    let score = 0;

    // 1. Entering Home is huge (guaranteed points/closer to win)
    if (move.isEnterHome) {
      score += 250;
    }

    // 2. Capturing an opponent sends them back and awards bonus roll!
    if (move.isCapture) {
      score += 200;
    }

    // 3. Spawning onto track on a 6
    if (move.isSpawn) {
      // Prioritize having at least 1-2 tokens on board
      const tokensOnBoard = playerTokens.filter(
        t => t.location.type === 'track' || t.location.type === 'home_path'
      ).length;
      score += tokensOnBoard < 2 ? 140 : 80;
    }

    // 4. Moving into a safe zone
    if (move.to.type === 'track' && SAFE_TRACK_INDICES.includes(move.to.stepIndex)) {
      score += 65;
    }

    // 5. Entering the home runway (safe from captures)
    if (move.to.type === 'home_path') {
      score += 90;
    }

    // 6. Escaping danger: If currently on an unsafe tile with opponent 1-6 steps behind
    if (move.from.type === 'track' && !SAFE_TRACK_INDICES.includes(move.from.stepIndex)) {
      const currentIdx = move.from.stepIndex;
      for (const opponent of allTokens) {
        if (opponent.color !== move.color && opponent.location.type === 'track') {
          const oppIdx = opponent.location.stepIndex;
          const dist = (currentIdx - oppIdx + 52) % 52;
          if (dist >= 1 && dist <= 6) {
            score += 110; // Under imminent threat!
            break;
          }
        }
      }
    }

    // 7. General progress: advancing forward closer to home
    const token = playerTokens.find(t => t.id === move.tokenId);
    if (token) {
      score += (token.stepsTraveled / TOTAL_STEPS_TO_HOME) * 30;
    }

    // Slight noise to prevent mechanical predictability
    score += Math.random() * 8;

    if (score > highestScore) {
      highestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

export const PLAYER_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export const PLAYER_INFO: Record<PlayerColor, { name: string; hex: string; lightHex: string; darkHex: string; glow: string }> = {
  red: {
    name: 'Red Ruby',
    hex: '#ef4444',
    lightHex: '#fca5a5',
    darkHex: '#991b1b',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
  green: {
    name: 'Green Emerald',
    hex: '#10b981',
    lightHex: '#6ee7b7',
    darkHex: '#065f46',
    glow: 'rgba(16, 185, 129, 0.4)',
  },
  yellow: {
    name: 'Yellow Gold',
    hex: '#f59e0b',
    lightHex: '#fde68a',
    darkHex: '#92400e',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  blue: {
    name: 'Blue Sapphire',
    hex: '#3b82f6',
    lightHex: '#93c5fd',
    darkHex: '#1e40af',
    glow: 'rgba(59, 130, 246, 0.4)',
  },
};
