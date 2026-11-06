import React, { useState, useEffect } from 'react';
import { Play, Users, Bot, Shield, Trophy, Sparkles, Sliders, HelpCircle, Smartphone, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { Player, PlayerColor, GameMode, PlayerType, BotDifficulty } from '../types/game';
import { PLAYER_COLORS, PLAYER_INFO } from '../game/ludoLogic';
import { sound } from '../audio/soundEffects';
import { auth, loginWithGoogle, logoutUser, UserProfileData, syncUserProfile, testConnection } from '../firebase/config';
import { createOnlineRoom, joinOnlineRoom } from '../firebase/multiplayerService';
import { onAuthStateChanged, User } from 'firebase/auth';

interface LobbyProps {
  onStartGame: (players: Player[], mode: GameMode) => void;
  onEnterOnlineRoom: (roomCode: string) => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
}

const AVATAR_OPTIONS = ['👑', '🦁', '🦅', '🐉', '🐯', '⚔️', '🧙', '🌟'];

export const Lobby: React.FC<LobbyProps> = ({ onStartGame, onEnterOnlineRoom, onOpenRules, onOpenSettings }) => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [onlineMode, setOnlineMode] = useState<GameMode>('classic');
  const [onlineCapacity, setOnlineCapacity] = useState<2 | 3 | 4>(4);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [onlineActionLoading, setOnlineActionLoading] = useState<boolean>(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  useEffect(() => {
    testConnection().then(connected => setIsFirebaseConnected(connected));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);
          setPlayerConfigs(prev => ({
            ...prev,
            red: {
              ...prev.red,
              name: user.displayName || prev.red.name,
            },
          }));
        } catch (e) {
          console.warn('Profile sync failed', e);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Player configs
  const [playerConfigs, setPlayerConfigs] = useState<Record<PlayerColor, {
    name: string;
    avatar: string;
    type: PlayerType;
    difficulty: BotDifficulty;
  }>>({
    red: { name: 'Player 1', avatar: '👑', type: 'human', difficulty: 'hard' },
    green: { name: 'Bot Emerald', avatar: '🐉', type: 'bot', difficulty: 'hard' },
    yellow: { name: 'Bot Gold', avatar: '🦁', type: 'bot', difficulty: 'medium' },
    blue: { name: 'Bot Sapphire', avatar: '🦅', type: 'bot', difficulty: 'medium' },
  });

  const updatePlayer = (color: PlayerColor, field: string, value: unknown) => {
    sound.playClick();
    setPlayerConfigs(prev => ({
      ...prev,
      [color]: {
        ...prev[color],
        [field]: value,
      },
    }));
  };

  const handleStart = () => {
    sound.playClick();

    // Select active players based on playerCount
    // 2 players: Red and Yellow (opposite quadrants)
    // 3 players: Red, Green, Yellow
    // 4 players: Red, Green, Yellow, Blue
    let activeColors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    if (playerCount === 2) {
      activeColors = ['red', 'yellow'];
    } else if (playerCount === 3) {
      activeColors = ['red', 'green', 'yellow'];
    }

    const finalPlayers: Player[] = activeColors.map(color => {
      const cfg = playerConfigs[color];
      return {
        id: `player_${color}`,
        color,
        name: cfg.name.trim() || PLAYER_INFO[color].name,
        avatar: cfg.avatar,
        type: cfg.type,
        difficulty: cfg.type === 'bot' ? cfg.difficulty : undefined,
        tokensHome: 0,
      };
    });

    onStartGame(finalPlayers, gameMode);
  };

  return (
    <div className="min-h-screen w-full bg-[#0b1120] text-slate-100 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
      {/* Background radial glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />

      {/* Header Bar */}
      <header className="relative w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-amber-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile-First & Telegram Ready</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Firebase Connected</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-950">
                {userProfile?.avatar || '👑'}
              </div>
              <span className="text-xs font-semibold text-white max-w-[100px] truncate">
                {currentUser.displayName || 'Player'}
              </span>
              <button
                onClick={() => logoutUser()}
                className="p-1 text-slate-400 hover:text-rose-400 transition"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => loginWithGoogle()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white transition active:scale-95 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In with Google</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playClick();
              onOpenRules();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Rules Guide"
          >
            <HelpCircle className="w-4.5 h-4.5 text-amber-400" />
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onOpenSettings();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Settings"
          >
            <Sliders className="w-4.5 h-4.5 text-slate-300" />
          </button>
        </div>
      </header>

      {/* Hero Title & Branding */}
      <main className="relative w-full max-w-3xl mx-auto my-6 flex flex-col items-center text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-3 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> 3D Luxury Edition
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500 drop-shadow-md">
          SUPER LUDO ROYALE
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-md">
          Classic 15x15 board gameplay with real dice physics, tactile haptics, and intelligent AI bots.
        </p>

        {/* Tab Selector: Local Pass & Play vs Online/Room Code */}
        <div className="mt-6 flex p-1 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('local');
            }}
            className={`py-2 px-5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'local'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pass & Play / vs AI
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('online');
            }}
            className={`py-2 px-5 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'online'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Room Code
          </button>
        </div>

        {activeTab === 'online' ? (
          <div className="w-full max-w-lg mt-6 flex flex-col gap-5 text-left">
            {!currentUser ? (
              <div className="p-6 rounded-3xl bg-slate-900/95 border border-amber-500/40 text-center shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-3">
                  <LogIn className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1.5">Sign In to Play Online</h3>
                <p className="text-xs text-slate-400 mb-4 max-w-sm mx-auto">
                  Google Sign-In is required to create or join multiplayer rooms, sync with friends in real-time, and track leaderboard stats.
                </p>
                <button
                  onClick={() => loginWithGoogle()}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition active:scale-98"
                >
                  Sign In with Google
                </button>
              </div>
            ) : (
              <>
                {onlineError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
                    <span>{onlineError}</span>
                    <button
                      onClick={() => setOnlineError(null)}
                      className="text-xs text-rose-400 hover:text-white font-bold ml-2"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Create Room Box */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Create New Online Room
                      </h3>
                      <p className="text-xs text-slate-400">Host a match and invite friends with a 6-digit code</p>
                    </div>
                  </div>

                  {/* Mode & Capacity Selection */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Mode</label>
                      <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        {(['classic', 'rush'] as GameMode[]).map(m => (
                          <button
                            key={m}
                            onClick={() => {
                              sound.playClick();
                              setOnlineMode(m);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                              onlineMode === m
                                ? 'bg-amber-500 text-slate-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Max Players</label>
                      <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        {([2, 3, 4] as Array<2 | 3 | 4>).map(num => (
                          <button
                            key={num}
                            onClick={() => {
                              sound.playClick();
                              setOnlineCapacity(num);
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                              onlineCapacity === num
                                ? 'bg-amber-500 text-slate-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {num}P
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={onlineActionLoading}
                    onClick={async () => {
                      sound.playClick();
                      setOnlineActionLoading(true);
                      setOnlineError(null);
                      try {
                        const code = await createOnlineRoom(
                          onlineMode,
                          onlineCapacity,
                          playerConfigs.red.name,
                          playerConfigs.red.avatar
                        );
                        setOnlineActionLoading(false);
                        onEnterOnlineRoom(code);
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        setOnlineError(msg);
                        setOnlineActionLoading(false);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-98 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{onlineActionLoading ? 'CREATING ROOM...' : 'CREATE ROOM AS HOST'}</span>
                  </button>
                </div>

                {/* Join Room Box */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-400" />
                      Join with Room Code
                    </h3>
                    <p className="text-xs text-slate-400">Enter a 6-character room code shared by a friend</p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER 6-DIGIT CODE"
                      value={roomCodeInput}
                      onChange={e => setRoomCodeInput(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center tracking-widest uppercase focus:outline-none focus:border-amber-500 text-sm font-bold"
                    />
                    <button
                      disabled={onlineActionLoading || roomCodeInput.trim().length < 4}
                      onClick={async () => {
                        sound.playClick();
                        setOnlineActionLoading(true);
                        setOnlineError(null);
                        try {
                          await joinOnlineRoom(
                            roomCodeInput,
                            playerConfigs.red.name,
                            playerConfigs.red.avatar
                          );
                          setOnlineActionLoading(false);
                          onEnterOnlineRoom(roomCodeInput.trim().toUpperCase());
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : String(err);
                          setOnlineError(msg);
                          setOnlineActionLoading(false);
                        }
                      }}
                      className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                    >
                      {onlineActionLoading ? 'JOINING...' : 'JOIN'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full mt-6 space-y-6">
            {/* Mode Selector */}
            <div className="w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Select Game Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  {
                    id: 'classic',
                    title: 'Classic',
                    desc: '4 Tokens to Win',
                    icon: '👑',
                  },
                  {
                    id: 'rush',
                    title: 'Rush',
                    desc: '2 Tokens to Win',
                    icon: '⚡',
                  },
                  {
                    id: 'blitz',
                    title: 'Blitz',
                    desc: '1st Token Wins',
                    icon: '🔥',
                  },
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      sound.playClick();
                      setGameMode(mode.id as GameMode);
                    }}
                    className={`p-3.5 rounded-2xl border text-center transition-all ${
                      gameMode === mode.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xl mb-1">{mode.icon}</div>
                    <div className="text-sm font-bold text-white">{mode.title}</div>
                    <div className="text-[10px] text-slate-400">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Player Count Selector */}
            <div className="w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Player Count
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      sound.playClick();
                      setPlayerCount(num as 2 | 3 | 4);
                    }}
                    className={`py-2.5 px-4 rounded-xl border text-center transition font-bold text-sm ${
                      playerCount === num
                        ? 'bg-slate-800 border-amber-500 text-white'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {num} Players
                  </button>
                ))}
              </div>
            </div>

            {/* Players Customizer Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {(playerCount === 2
                ? (['red', 'yellow'] as PlayerColor[])
                : playerCount === 3
                ? (['red', 'green', 'yellow'] as PlayerColor[])
                : PLAYER_COLORS
              ).map(color => {
                const info = PLAYER_INFO[color];
                const cfg = playerConfigs[color];

                return (
                  <div
                    key={color}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col gap-2.5"
                    style={{ borderLeftWidth: '4px', borderLeftColor: info.hex }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {/* Avatar cycle */}
                        <button
                          onClick={() => {
                            const curIdx = AVATAR_OPTIONS.indexOf(cfg.avatar);
                            const nextAvatar = AVATAR_OPTIONS[(curIdx + 1) % AVATAR_OPTIONS.length];
                            updatePlayer(color, 'avatar', nextAvatar);
                          }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow cursor-pointer hover:scale-105 transition"
                          style={{ backgroundColor: info.hex }}
                          title="Click to change avatar"
                        >
                          {cfg.avatar}
                        </button>
                        <input
                          type="text"
                          value={cfg.name}
                          onChange={e => updatePlayer(color, 'name', e.target.value)}
                          className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-amber-400 text-xs sm:text-sm font-bold text-white focus:outline-none px-1"
                        />
                      </div>

                      {/* Human vs Bot Switch */}
                      <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                        <button
                          onClick={() => updatePlayer(color, 'type', 'human')}
                          className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                            cfg.type === 'human'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Users className="w-3 h-3" /> P
                        </button>
                        <button
                          onClick={() => updatePlayer(color, 'type', 'bot')}
                          className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 ${
                            cfg.type === 'bot'
                              ? 'bg-emerald-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Bot className="w-3 h-3" /> AI
                        </button>
                      </div>
                    </div>

                    {/* Bot Difficulty if Bot */}
                    {cfg.type === 'bot' && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400">AI Difficulty</span>
                        <div className="flex gap-1">
                          {(['easy', 'medium', 'hard'] as BotDifficulty[]).map(diff => (
                            <button
                              key={diff}
                              onClick={() => updatePlayer(color, 'difficulty', diff)}
                              className={`px-2 py-0.5 rounded capitalize font-medium ${
                                cfg.difficulty === diff
                                  ? 'bg-slate-700 text-amber-300'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Primary Launch CTA */}
            <div className="w-full pt-2">
              <button
                onClick={handleStart}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-lg flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/30 transition-all transform active:scale-98 cursor-pointer ring-2 ring-amber-400/40"
              >
                <Play className="w-6 h-6 fill-current" />
                <span>START ROYALE MATCH</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Controls & Copyright */}
      <footer className="relative w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 z-10 pt-4 border-t border-slate-800/50">
        <div>Super Ludo Royale &copy; 2026. Free & Open Local Gaming.</div>
        <div className="flex items-center gap-3">
          <span>WebGL 3D Engine</span>
          <span>•</span>
          <span>Web Audio Synth</span>
          <span>•</span>
          <span>Zero Server Lag</span>
        </div>
      </footer>
    </div>
  );
};
