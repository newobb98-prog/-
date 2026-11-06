import React from 'react';
import { X, Shield, Award, Sparkles, RotateCcw, Dices } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      icon: <Dices className="w-6 h-6 text-amber-400" />,
      title: '1. Spawning & Rolling 6',
      desc: 'All tokens start in your yard base. You must roll a 6 to bring a token out onto your colored starting square. Rolling a 6 also grants an immediate extra roll!',
    },
    {
      icon: <RotateCcw className="w-6 h-6 text-emerald-400" />,
      title: '2. Clockwise Navigation',
      desc: 'Tokens journey clockwise around the 52 perimeter squares. Advance your tokens strategically to navigate all the way around to your colored home runway.',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-rose-400" />,
      title: '3. Captures & Bonus Rolls',
      desc: 'Landing on an opponent token outside safe zones captures it, sending it all the way back to their yard base! Capturing awards you a bonus dice roll.',
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      title: '4. Safe Star Zones',
      desc: 'Tiles with the Golden Star and all 4 colored Start squares are Safe Zones. Tokens resting on safe squares cannot be captured by any opponent!',
    },
    {
      icon: <Award className="w-6 h-6 text-yellow-400" />,
      title: '5. Home Runway & Victory',
      desc: 'After circumnavigating the board, your tokens enter your private colored runway. Reach the center triumph goal with exact rolls to claim victory!',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              👑
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Official Rules of Ludo</h2>
              <p className="text-xs text-slate-400">Master the board & claim the crown</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto py-4 space-y-3.5 pr-1">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex gap-3.5 items-start"
            >
              <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 shrink-0">
                {rule.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{rule.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{rule.desc}</p>
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            ⚡ <strong>Pro Tip:</strong> Rolling three consecutive 6s in a row will forfeit your turn. Keep your tokens on star tiles when opponents are lurking behind you!
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition active:scale-98"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
