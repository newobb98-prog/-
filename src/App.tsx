import React, { useState, useEffect } from 'react';
import { Player, GameMode, OnlineRoom, RoomPlayer } from './types/game';
import { Lobby } from './components/Lobby';
import { OnlineRoomLobby } from './components/OnlineRoomLobby';
import { GameBoard } from './components/GameBoard';
import { RulesModal } from './components/RulesModal';
import { SettingsModal } from './components/SettingsModal';
import { sound } from './audio/soundEffects';
import { auth } from './firebase/config';

export default function App() {
  const [screen, setScreen] = useState<'lobby' | 'room_waiting' | 'playing'>('lobby');
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const [activeMode, setActiveMode] = useState<GameMode>('classic');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [onlineRoomData, setOnlineRoomData] = useState<OnlineRoom | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Telegram Mini App detection & auto-expansion
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        tg.setHeaderColor?.('#0b1120');
        tg.setBackgroundColor?.('#0b1120');
      }
    } catch {
      // Non-telegram browser context
    }
  }, []);

  const handleStartGame = (players: Player[], mode: GameMode) => {
    setActivePlayers(players);
    setActiveMode(mode);
    setOnlineRoomData(null);
    setScreen('playing');
  };

  const handleEnterOnlineRoom = (roomCode: string) => {
    setActiveRoomCode(roomCode);
    setScreen('room_waiting');
  };

  const handleOnlineGameStarted = (room: OnlineRoom) => {
    setOnlineRoomData(room);
    setActiveMode(room.mode);

    // Map room.players into Player array preserving turn color order
    const players: Player[] = room.playerOrder
      .map(color => Object.values(room.players).find(p => p.color === color && !p.hasLeft))
      .filter((p): p is RoomPlayer => !!p)
      .map(p => ({
        id: p.uid,
        color: p.color,
        name: p.displayName,
        avatar: p.avatar,
        type: 'human',
        tokensHome: 0,
      }));

    setActivePlayers(players);
    setScreen('playing');
  };

  const handleExitToLobby = () => {
    setScreen('lobby');
    setActiveRoomCode(null);
    setOnlineRoomData(null);
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#0b1120] text-slate-100 font-sans antialiased overflow-hidden">
      {screen === 'lobby' ? (
        <Lobby
          onStartGame={handleStartGame}
          onEnterOnlineRoom={handleEnterOnlineRoom}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      ) : screen === 'room_waiting' && activeRoomCode ? (
        <OnlineRoomLobby
          roomCode={activeRoomCode}
          currentUserUid={auth.currentUser?.uid || ''}
          onGameStarted={handleOnlineGameStarted}
          onExitRoom={handleExitToLobby}
        />
      ) : (
        <GameBoard
          players={activePlayers}
          mode={activeMode}
          onlineRoom={onlineRoomData}
          onExitToLobby={handleExitToLobby}
        />
      )}

      {/* Global Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={{
          mode: activeMode,
          tokensNeededToWin: activeMode === 'classic' ? 4 : 2,
          threeSixesForfeit: true,
          fastAnimations: false,
          autoMoveSingleToken: true,
          soundEnabled: true,
          hapticsEnabled: true,
        }}
        onUpdateSettings={newCfg => {
          if (newCfg.soundEnabled !== undefined) {
            sound.setSoundEnabled(newCfg.soundEnabled);
          }
          if (newCfg.hapticsEnabled !== undefined) {
            sound.setHapticsEnabled(newCfg.hapticsEnabled);
          }
        }}
      />
    </div>
  );
}
