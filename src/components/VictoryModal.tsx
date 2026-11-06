import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Home, Crown, Flame, Crosshair, Dices, Clock } from 'lucide-react';
import { Player, GameStats } from '../types/game';
import { PLAYER_INFO } from '../game/ludoLogic';
import { sound } from '../audio/soundEffects';

interface VictoryModalProps {
  isOpen: boolean;
  players: Player[];
  winner: Player;
  stats: GameStats;
  onPlayAgain: () => void;
  onGoToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  isOpen,
  players,
  winner,
  stats,
  onPlayAgain,
  onGoToLobby,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    sound.playHomeGoal();

    // Triumphant confetti shower
    const end = Date.now() + 3000;
    const colors = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#fbbf24'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, [isOpen]);

  if (!isOpen) return null;

  const winnerInfo = PLAYER_INFO[winner.color];

  // Sort players by tokensHome descending
  const rankedPlayers = [...players].sort((a, b) => b.tokensHome - a.tokensHome);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col items-center text-center">
        {/* Glow halo */}
        <div className="absolute -top-12 w-28 h-28 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

        {/* Crown & Trophy Header */}
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-xl shadow-amber-500/30 flex items-center justify-center mb-4">
          <div className="w-full h-full rounded-[14px] bg-slate-950/40 flex items-center justify-center text-white">
            <Trophy className="w-10 h-10 text-amber-300 drop-shadow-md" />
          </div>
          <div className="absolute -top-3 -right-2 text-2xl">👑</div>
        </div>

        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 tracking-tight">
          VICTORY ROYALE!
        </h2>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="font-bold text-white text-base">{winner.name}</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: winnerInfo.hex + '33', color: winnerInfo.hex }}
          >
            {winnerInfo.name}
          </span>
        </div>

        {/* Ranked Podium */}
        <div className="w-full my-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left mb-1">
            Match Standings
          </div>
          {rankedPlayers.map((player, idx) => {
            const info = PLAYER_INFO[player.color];
            const medal = idx === 0 ? '🥇 1st' : idx === 1 ? '🥈 2nd' : idx === 2 ? '🥉 3rd' : '4th';
            return (
              <div
                key={player.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-amber-400 w-10 text-left">{medal}</span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                    style={{ backgroundColor: info.hex, color: '#ffffff' }}
                  >
                    {player.avatar}
                  </div>
                  <span className="text-xs font-semibold text-white">{player.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="font-bold text-amber-400">{player.tokensHome}</span>
                  <span className="text-[10px] text-slate-400">Tokens Home</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 w-full mb-6">
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex flex-col items-center">
            <Dices className="w-4 h-4 text-amber-400 mb-1" />
            <span className="text-xs font-bold text-white">{stats.totalRolls}</span>
            <span className="text-[9px] text-slate-400">Rolls</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex flex-col items-center">
            <Flame className="w-4 h-4 text-rose-400 mb-1" />
            <span className="text-xs font-bold text-white">{stats.sixesRolled}</span>
            <span className="text-[9px] text-slate-400">Sixes</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex flex-col items-center">
            <Crosshair className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-xs font-bold text-white">{stats.tokensCaptured}</span>
            <span className="text-[9px] text-slate-400">Captures</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40 flex flex-col items-center">
            <Clock className="w-4 h-4 text-blue-400 mb-1" />
            <span className="text-xs font-bold text-white">{formatDuration(stats.durationSeconds)}</span>
            <span className="text-[9px] text-slate-400">Time</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={onGoToLobby}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <Home className="w-4 h-4" />
            Lobby
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition active:scale-98"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
