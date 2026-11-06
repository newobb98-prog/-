export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type PlayerType = 'human' | 'bot';

export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  color: PlayerColor;
  name: string;
  avatar: string;
  type: PlayerType;
  difficulty?: BotDifficulty;
  tokensHome: number;
  rank?: number; // 1st, 2nd, 3rd, 4th
}

export type TokenLocation = 
  | { type: 'yard'; slotIndex: number } // 0..3 in yard
  | { type: 'track'; stepIndex: number } // 0..51 on main perimeter
  | { type: 'home_path'; pathIndex: number } // 0..4 on color runway (5 tiles)
  | { type: 'home' }; // reached center triangle!

export interface Token {
  id: number; // 0..3 for each player
  color: PlayerColor;
  location: TokenLocation;
  // Visual position tracking
  stepsTraveled: number; // 0 when in yard, 1 when just entered start, up to 57 for home
}

export type GamePhase = 'lobby' | 'rolling' | 'moving' | 'animating' | 'game_over';

export type GameMode = 'classic' | 'rush' | 'blitz';

export interface GameSettings {
  mode: GameMode; // classic (4 tokens), rush (2 tokens), blitz (1 token to win)
  tokensNeededToWin: number;
  threeSixesForfeit: boolean; // 3 sixes forfeits turn
  fastAnimations: boolean;
  autoMoveSingleToken: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface GameLogEntry {
  id: string;
  text: string;
  color?: PlayerColor;
  timestamp: number;
}

export interface ValidMove {
  tokenId: number;
  color: PlayerColor;
  from: TokenLocation;
  to: TokenLocation;
  isCapture: boolean;
  isEnterHome: boolean;
  isSpawn: boolean;
}

export interface GameStats {
  totalRolls: number;
  sixesRolled: number;
  tokensCaptured: number;
  tokensSafelyReachedHome: number;
  durationSeconds: number;
}

export interface RoomPlayer {
  uid: string;
  displayName: string;
  avatar: string;
  color: PlayerColor;
  isHost: boolean;
  isReady: boolean;
  hasLeft?: boolean;
  joinedAt: string;
}

export interface OnlineRoom {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'in_game' | 'completed' | 'abandoned';
  mode: GameMode;
  maxPlayers: 2 | 3 | 4;
  players: Record<string, RoomPlayer>;
  playerOrder: PlayerColor[];
  currentTurn?: PlayerColor;
  lastRoll?: number | null;
  lastMove?: {
    color: PlayerColor;
    tokenId: number;
    from: TokenLocation;
    to: TokenLocation;
    roll: number;
    timestamp: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

