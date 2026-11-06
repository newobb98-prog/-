import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './config';
import { GameMode, OnlineRoom, RoomPlayer, PlayerColor } from '../types/game';

// Unambiguous character set for 6-character room codes
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

const COLOR_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

/**
 * Creates a new multiplayer room in Firestore
 */
export async function createOnlineRoom(
  mode: GameMode,
  maxPlayers: 2 | 3 | 4,
  displayName: string,
  avatar: string
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google to create an online room.');
  }

  const roomCode = generateRoomCode();
  const roomRef = doc(db, 'rooms', roomCode);

  const hostPlayer: RoomPlayer = {
    uid: user.uid,
    displayName: (displayName.trim() || user.displayName || 'Host Player').slice(0, 50),
    avatar: avatar || '👑',
    color: 'red',
    isHost: true,
    isReady: true,
    joinedAt: new Date().toISOString(),
  };

  const newRoom: OnlineRoom = {
    roomCode,
    hostId: user.uid,
    status: 'waiting',
    mode,
    maxPlayers,
    players: {
      [user.uid]: hostPlayer,
    },
    playerOrder: ['red'],
    currentTurn: 'red',
    lastRoll: null,
    lastMove: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(roomRef, newRoom);
    return roomCode;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `rooms/${roomCode}`);
  }
}

/**
 * Joins an existing room using a 6-character code
 */
export async function joinOnlineRoom(
  roomCodeInput: string,
  displayName: string,
  avatar: string
): Promise<OnlineRoom> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in with Google to join an online room.');
  }

  const cleanCode = roomCodeInput.trim().toUpperCase();
  if (cleanCode.length < 4) {
    throw new Error('Invalid room code. Please enter a 6-character code.');
  }

  const roomRef = doc(db, 'rooms', cleanCode);
  let snap;
  try {
    snap = await getDoc(roomRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `rooms/${cleanCode}`);
  }

  if (!snap.exists()) {
    throw new Error(`Room "${cleanCode}" not found. Please verify the code.`);
  }

  const roomData = snap.data() as OnlineRoom;

  if (roomData.status === 'in_game' && !roomData.players[user.uid]) {
    throw new Error('This match has already started.');
  }

  if (roomData.status === 'abandoned' || roomData.status === 'completed') {
    throw new Error('This room is no longer active.');
  }

  // If already in room, allow seamless reconnect
  if (roomData.players[user.uid]) {
    if (roomData.players[user.uid].hasLeft) {
      await updateDoc(roomRef, {
        [`players.${user.uid}.hasLeft`]: false,
        updatedAt: new Date().toISOString(),
      });
    }
    return roomData;
  }

  // Count active players
  const activePlayers = Object.values(roomData.players).filter(p => !p.hasLeft);
  if (activePlayers.length >= roomData.maxPlayers) {
    throw new Error(`Room is full (${roomData.maxPlayers}/${roomData.maxPlayers} players).`);
  }

  // Find next available color
  const takenColors = new Set(activePlayers.map(p => p.color));
  let assignedColor: PlayerColor = 'green';
  for (const c of COLOR_ORDER) {
    if (!takenColors.has(c)) {
      assignedColor = c;
      break;
    }
  }

  const newPlayer: RoomPlayer = {
    uid: user.uid,
    displayName: (displayName.trim() || user.displayName || 'Player').slice(0, 50),
    avatar: avatar || '🦁',
    color: assignedColor,
    isHost: false,
    isReady: true,
    joinedAt: new Date().toISOString(),
  };

  const updatedPlayerOrder = [...roomData.playerOrder];
  if (!updatedPlayerOrder.includes(assignedColor)) {
    updatedPlayerOrder.push(assignedColor);
  }

  try {
    await updateDoc(roomRef, {
      [`players.${user.uid}`]: newPlayer,
      playerOrder: updatedPlayerOrder,
      updatedAt: new Date().toISOString(),
    });

    return {
      ...roomData,
      players: {
        ...roomData.players,
        [user.uid]: newPlayer,
      },
      playerOrder: updatedPlayerOrder,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${cleanCode}`);
  }
}

/**
 * Player leaves the room
 */
export async function leaveOnlineRoom(roomCode: string, uid: string, isHost: boolean): Promise<void> {
  const roomRef = doc(db, 'rooms', roomCode);
  try {
    if (isHost) {
      await updateDoc(roomRef, {
        status: 'abandoned',
        [`players.${uid}.hasLeft`]: true,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(roomRef, {
        [`players.${uid}.hasLeft`]: true,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('Error marking player left', error);
  }
}

/**
 * Host starts the online match
 */
export async function startOnlineRoomGame(roomCode: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const roomRef = doc(db, 'rooms', roomCode);
  try {
    await updateDoc(roomRef, {
      status: 'in_game',
      currentTurn: 'red',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomCode}`);
  }
}

/**
 * Broadcasts a dice roll or turn advancement to all players in the room
 */
export async function broadcastOnlineRoll(roomCode: string, roll: number, nextTurn?: PlayerColor): Promise<void> {
  const roomRef = doc(db, 'rooms', roomCode);
  try {
    const updatePayload: Record<string, unknown> = {
      lastRoll: roll,
      updatedAt: new Date().toISOString(),
    };
    if (nextTurn) {
      updatePayload.currentTurn = nextTurn;
    }
    await updateDoc(roomRef, updatePayload);
  } catch (error) {
    console.warn('Error broadcasting roll', error);
  }
}

/**
 * Broadcasts a pawn move to all players in the room
 */
export async function broadcastOnlineMove(
  roomCode: string,
  moveData: NonNullable<OnlineRoom['lastMove']>,
  nextTurn: PlayerColor
): Promise<void> {
  const roomRef = doc(db, 'rooms', roomCode);
  try {
    await updateDoc(roomRef, {
      lastMove: moveData,
      currentTurn: nextTurn,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Error broadcasting move', error);
  }
}

/**
 * Real-time listener using Firestore onSnapshot
 */
export function subscribeToOnlineRoom(
  roomCode: string,
  onUpdate: (room: OnlineRoom | null) => void,
  onError?: (err: Error) => void
): () => void {
  const roomRef = doc(db, 'rooms', roomCode);

  return onSnapshot(
    roomRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
      } else {
        onUpdate(snap.data() as OnlineRoom);
      }
    },
    (error) => {
      console.error('Room snapshot error:', error);
      if (onError) onError(error);
    }
  );
}
