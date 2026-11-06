import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Rotate3d,
  Sliders,
  HelpCircle,
  Home,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Zap,
} from 'lucide-react';
import { Player, PlayerColor, GamePhase, GameLogEntry } from '../types/game';
import { PLAYER_INFO } from '../game/ludoLogic';
import { CameraViewMode } from '../three/Ludo3DScene';

interface HUDProps {
  players: Player[];
  activePlayer: Player;
  currentDiceValue: number | null;
  phase: GamePhase;
  consecutiveSixes: number;
  logs: GameLogEntry[];
  cameraMode: CameraViewMode;
  soundEnabled: boolean;
  canRoll: boolean;
  selectableTokenCount: number;
  onRollDice: () => void;
  onToggleSound: () => void;
  onCycleCamera: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
  onGoToLobby: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  players,
  activePlayer,
  currentDiceValue,
  phase,
  consecutiveSixes,
  logs,
  cameraMode,
  soundEnabled,
  canRoll,
  selectableTokenCount,
  onRollDice,
  onToggleSound,
  onCycleCamera,
  onOpenRules,
  onOpenSettings,
  onGoToLobby,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const activeInfo = PLAYER_INFO[activePlayer.color];

  // Pip representation for dice face
  const renderDicePips = (val: number | null) => {
    if (!val) return <span className="text-2xl font-black text-slate-400">?</span>;

    const pips: Record<number, Array<[number, number]>> = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
    };

    const dots = pips[val] || [];
    const pipColor = val === 1 ? '#ef4444' : '#0f172a';

    return (
      <div className="relative w-11 h-11 bg-white rounded-xl shadow-inner border border-slate-200">
        {dots.map(([x, y], idx) => (
          <div
            key={idx}
            className="absolute w-2.5 h-2.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-xs"
            style={{ left: `${x}%`, top: `${y}%`, backgroundColor: pipColor }}
          />
        ))}
      </div>
    );
  };

  const latestLog = logs[logs.length - 1]?.text || 'Game in progress...';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none z-20">
      {/* Top Header Status Bar */}
      <div className="flex items-center justify-between gap-2 pointer-events-auto w-full max-w-4xl mx-auto">
        {/* Left: Active Player Badge */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2 shadow-xl backdrop-blur-md">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
            style={{ backgroundColor: activeInfo.hex, color: '#ffffff' }}
          >
            {activePlayer.avatar}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide truncate max-w-[110px] sm:max-w-[150px]">
                {activePlayer.name}
              </span>
              {activePlayer.type === 'bot' ? (
                <Bot className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <User className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
            <div className="text-[11px] font-medium" style={{ color: activeInfo.lightHex }}>
              {phase === 'rolling'
                ? activePlayer.type === 'bot'
                  ? 'Bot thinking & rolling...'
                  : 'Tap Roll or the 3D Die'
                : phase === 'moving'
                ? `Select 1 of ${selectableTokenCount} moves`
                : 'Moving token...'}
            </div>
          </div>
        </div>

        {/* Players Tokens Overview Pill */}
        <div className="hidden md:flex items-center gap-2 bg-slate-900/85 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-md">
          {players.map(p => {
            const info = PLAYER_INFO[p.color];
            const isActive = p.id === activePlayer.id;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-xl transition ${
                  isActive ? 'bg-slate-800 border border-slate-600' : 'opacity-70'
                }`}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.hex }} />
                <span className="text-xs font-bold text-white">{p.tokensHome}/4</span>
              </div>
            );
          })}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-xl backdrop-blur-md">
          {/* Camera View Toggle */}
          <button
            onClick={onCycleCamera}
            title={`Camera: ${cameraMode}`}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <Rotate3d className="w-4.5 h-4.5 text-cyan-400" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute' : 'Unmute'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            {soundEnabled ? (
              <Volume2 className="w-4.5 h-4.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-4.5 h-4.5 text-slate-500" />
            )}
          </button>

          {/* Rules Guide */}
          <button
            onClick={onOpenRules}
            title="Rules"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <HelpCircle className="w-4.5 h-4.5 text-amber-400" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
          >
            <Sliders className="w-4.5 h-4.5 text-slate-300" />
          </button>

          {/* Exit to Lobby */}
          <button
            onClick={onGoToLobby}
            title="Return to Menu"
            className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition active:scale-95"
          >
            <Home className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Center 3D Viewport is completely unobstructed (85%+ clear area) */}

      {/* Unified Bottom Control Dock (Per Three.js Constitution) */}
      <div className="w-full max-w-lg mx-auto flex flex-col items-center pointer-events-auto">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="mb-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-semibold text-slate-300 hover:text-white flex items-center gap-1 shadow-md transition active:scale-95"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-amber-400" /> Show Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400" /> Minimize Dock
            </>
          )}
        </button>

        {/* Collapsible Dock Drawer */}
        {!isDockCollapsed && (
          <div className="w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl backdrop-blur-md flex flex-col gap-3">
            {/* Live Game Event Ticker */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate font-medium">{latestLog}</span>
              </div>
              {consecutiveSixes > 0 && (
                <div className="shrink-0 font-bold text-amber-400 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30">
                  {consecutiveSixes}/3 Sixes!
                </div>
              )}
            </div>

            {/* Main Interactive Roll & Action Bar */}
            <div className="flex items-center gap-3">
              {/* 3D Dice Display Box */}
              <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950 border border-slate-800 shrink-0">
                {renderDicePips(currentDiceValue)}
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  {currentDiceValue ? `Rolled ${currentDiceValue}` : 'Ready'}
                </span>
              </div>

              {/* Primary Interactive CTA Button */}
              {phase === 'rolling' ? (
                <button
                  disabled={!canRoll || activePlayer.type === 'bot'}
                  onClick={onRollDice}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-3 shadow-xl transition-all duration-150 ${
                    canRoll && activePlayer.type === 'human'
                      ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/30 active:scale-98 cursor-pointer ring-2 ring-amber-400/50'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <span className="text-xl">🎲</span>
                  <span>
                    {activePlayer.type === 'bot'
                      ? `${activePlayer.name} Rolling...`
                      : !canRoll
                      ? `Waiting for ${activePlayer.name}...`
                      : 'ROLL THE DICE!'}
                  </span>
                </button>
              ) : phase === 'moving' ? (
                <div className="flex-1 py-3 px-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center justify-center gap-2 text-center text-xs font-semibold">
                  <Zap className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span>Tap a glowing pawn on the 3D board to move!</span>
                </div>
              ) : (
                <div className="flex-1 py-3 px-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center justify-center gap-2 text-xs font-medium">
                  <div className="w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <span>Moving token on track...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
