import React, { useState, useEffect } from 'react';
import { Copy, Check, Users, Play, LogOut, Crown, AlertCircle, Sparkles } from 'lucide-react';
import { OnlineRoom, RoomPlayer, PlayerColor } from '../types/game';
import { PLAYER_INFO } from '../game/ludoLogic';
import { subscribeToOnlineRoom, leaveOnlineRoom, startOnlineRoomGame } from '../firebase/multiplayerService';
import { sound } from '../audio/soundEffects';

interface OnlineRoomLobbyProps {
  roomCode: string;
  currentUserUid: string;
  onGameStarted: (room: OnlineRoom) => void;
  onExitRoom: () => void;
}

export const OnlineRoomLobby: React.FC<OnlineRoomLobbyProps> = ({
  roomCode,
  currentUserUid,
  onGameStarted,
  onExitRoom,
}) => {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToOnlineRoom(
      roomCode,
      (updatedRoom) => {
        if (!updatedRoom) {
          setErrorMsg('This room has been closed or does not exist.');
          return;
        }

        if (updatedRoom.status === 'abandoned') {
          setErrorMsg('The host has left or closed this room.');
          return;
        }

        setRoom(updatedRoom);

        // If host started match, transition to gameboard!
        if (updatedRoom.status === 'in_game') {
          sound.playHomeGoal();
          onGameStarted(updatedRoom);
        }
      },
      (err) => {
        console.error('Subscription error:', err);
        setErrorMsg('Failed to sync room updates. Please check connection.');
      }
    );

    return () => unsubscribe();
  }, [roomCode, onGameStarted]);

  const handleCopyCode = () => {
    sound.playClick();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isHost = room?.hostId === currentUserUid;
  const activePlayers = room ? Object.values(room.players).filter(p => !p.hasLeft) : [];
  const canStart = isHost && activePlayers.length >= 2;

  const handleStartGame = async () => {
    if (!canStart || isStarting) return;
    sound.playClick();
    setIsStarting(true);
    try {
      await startOnlineRoomGame(roomCode);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsStarting(false);
    }
  };

  const handleLeave = async () => {
    sound.playClick();
    await leaveOnlineRoom(roomCode, currentUserUid, isHost);
    onExitRoom();
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen w-full bg-[#0b1120] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-4 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Room Notification</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">{errorMsg}</p>
        <button
          onClick={onExitRoom}
          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition"
        >
          Return to Lobby
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen w-full bg-[#0b1120] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-full border-3 border-amber-400 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-slate-400">Connecting to Room {roomCode}...</p>
      </div>
    );
  }

  // Pre-allocate slots based on maxPlayers
  const slots: Array<{ color: PlayerColor; player?: RoomPlayer }> = [];
  const order: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  for (let i = 0; i < room.maxPlayers; i++) {
    const col = order[i];
    const found = Object.values(room.players).find(p => p.color === col && !p.hasLeft);
    slots.push({ color: col, player: found });
  }

  return (
    <div className="min-h-screen w-full bg-[#0b1120] text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

      {/* Top Header */}
      <header className="relative w-full max-w-2xl mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Room</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="capitalize">{room.mode} Mode ({activePlayers.length}/{room.maxPlayers})</span>
        </div>
      </header>

      {/* Center Room Card */}
      <main className="relative w-full max-w-xl mx-auto my-6 flex flex-col items-center text-center z-10">
        {/* Room Code Lockup */}
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Share Room Code With Friends
          </span>
          <div className="mt-2 flex items-center justify-center gap-3">
            <div className="px-6 py-3 rounded-2xl bg-slate-950 border-2 border-amber-500/60 shadow-xl font-mono text-3xl sm:text-4xl font-black text-amber-400 tracking-widest selection:bg-amber-500 selection:text-slate-950">
              {roomCode}
            </div>
            <button
              onClick={handleCopyCode}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition active:scale-95 shadow-md flex items-center gap-1.5 text-xs font-bold"
              title="Copy Room Code"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 text-amber-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Others can join from any phone or computer by entering this code in the Lobby.
          </p>
        </div>

        {/* Real-time Player Slots Grid */}
        <div className="w-full my-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {slots.map((slot, idx) => {
            const info = PLAYER_INFO[slot.color];
            const p = slot.player;

            return (
              <div
                key={slot.color}
                className={`p-3.5 rounded-2xl border transition-all ${
                  p
                    ? 'bg-slate-900/90 border-slate-700 shadow-lg'
                    : 'bg-slate-950/40 border-dashed border-slate-800 opacity-60'
                }`}
                style={{ borderLeftWidth: '4px', borderLeftColor: info.hex }}
              >
                {p ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md font-bold text-white relative"
                        style={{ backgroundColor: info.hex }}
                      >
                        {p.avatar}
                        {p.isHost && (
                          <div className="absolute -top-1.5 -right-1 text-xs">👑</div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white truncate max-w-[120px]">
                            {p.displayName}
                          </span>
                          {p.uid === currentUserUid && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color: info.lightHex }}>
                          {info.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-1 rounded-lg">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-10 h-10 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                      P{idx + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-400">Waiting for player...</span>
                      <span className="text-[10px] text-slate-500">Slot for {info.name}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Action Area */}
        <div className="w-full mt-4">
          {isHost ? (
            <div className="flex flex-col gap-2">
              <button
                disabled={!canStart || isStarting}
                onClick={handleStartGame}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition-all ${
                  canStart && !isStarting
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/25 active:scale-98 cursor-pointer ring-2 ring-amber-400/40'
                    : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {isStarting
                    ? 'STARTING GAME...'
                    : canStart
                    ? 'START ONLINE MATCH NOW'
                    : `WAITING FOR AT LEAST 1 MORE PLAYER (${activePlayers.length}/${room.maxPlayers})`}
                </span>
              </button>
              <p className="text-[11px] text-slate-400">
                As host, you can launch the match once 2 or more players have joined.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>Waiting for Host to Start the Match</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sit tight! As soon as the host launches the match, your screen will automatically load the 3D board.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer status */}
      <footer className="relative w-full max-w-xl mx-auto flex items-center justify-between text-xs text-slate-500 z-10 pt-4 border-t border-slate-800/40">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Real-time Firestore Sync Active</span>
        </div>
        <span>Room Code: {roomCode}</span>
      </footer>
    </div>
  );
};
