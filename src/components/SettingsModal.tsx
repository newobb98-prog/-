import React from 'react';
import { X, Volume2, VolumeX, Smartphone, Zap, Sparkles, Sliders } from 'lucide-react';
import { GameSettings } from '../types/game';
import { sound } from '../audio/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Game Settings</h2>
              <p className="text-xs text-slate-400">Personalize sound, speed & rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings options */}
        <div className="py-4 space-y-4">
          {/* Sound FX */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <div className="text-sm font-semibold text-white">Sound Effects</div>
                <div className="text-xs text-slate-400">Dice rattle, pawn hops & triumphs</div>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                sound.setSoundEnabled(next);
                onUpdateSettings({ soundEnabled: next });
                if (next) sound.playClick();
              }}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${
                settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.soundEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-sm font-semibold text-white">Haptic Vibration</div>
                <div className="text-xs text-slate-400">Vibrate on 6s, captures & taps</div>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !settings.hapticsEnabled;
                sound.setHapticsEnabled(next);
                onUpdateSettings({ hapticsEnabled: next });
                if (next) sound.triggerHaptic('medium');
              }}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${
                settings.hapticsEnabled ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.hapticsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Fast Animations */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">Fast Move Speed</div>
                <div className="text-xs text-slate-400">Snappier token hops and dice tosses</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ fastAnimations: !settings.fastAnimations })}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${
                settings.fastAnimations ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.fastAnimations ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-Move Single Token */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-teal-400" />
              <div>
                <div className="text-sm font-semibold text-white">Auto-Move Single Token</div>
                <div className="text-xs text-slate-400">Auto advances if only 1 move is possible</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoMoveSingleToken: !settings.autoMoveSingleToken })}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${
                settings.autoMoveSingleToken ? 'bg-teal-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.autoMoveSingleToken ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3 Sixes Forfeit Rule */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div>
              <div className="text-sm font-semibold text-white">Three 6s Forfeit Rule</div>
              <div className="text-xs text-slate-400">Rolling three 6s in a row passes turn</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ threeSixesForfeit: !settings.threeSixesForfeit })}
              className={`w-12 h-6.5 rounded-full transition-colors relative flex items-center px-1 ${
                settings.threeSixesForfeit ? 'bg-rose-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  settings.threeSixesForfeit ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
