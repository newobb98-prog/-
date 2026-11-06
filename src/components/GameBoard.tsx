import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Token, GamePhase, GameMode, GameSettings, GameStats, GameLogEntry, ValidMove, PlayerColor } from '../types/game';
import { Ludo3DScene, CameraViewMode } from '../three/Ludo3DScene';
import {
  getValidMoves,
  pickBotMove,
  calculateNextLocation,
  findCapturableToken,
  START_TRACK_INDEX,
  TOTAL_STEPS_TO_HOME,
  getBoardCoordinates,
  PLAYER_INFO,
} from '../game/ludoLogic';
import { sound } from '../audio/soundEffects';
import { recordMatchCompletion, auth } from '../firebase/config';
import { broadcastOnlineRoll, broadcastOnlineMove, subscribeToOnlineRoom } from '../firebase/multiplayerService';
import { OnlineRoom } from '../types/game';
import { HUD } from './HUD';
import { VictoryModal } from './VictoryModal';
import { RulesModal } from './RulesModal';
import { SettingsModal } from './SettingsModal';

interface GameBoardProps {
  players: Player[];
  mode: GameMode;
  onlineRoom?: OnlineRoom | null;
  onExitToLobby: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ players, mode, onlineRoom, onExitToLobby }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Ludo3DScene | null>(null);

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    mode,
    tokensNeededToWin: mode === 'classic' ? 4 : mode === 'rush' ? 2 : 1,
    threeSixesForfeit: true,
    fastAnimations: false,
    autoMoveSingleToken: true,
    soundEnabled: true,
    hapticsEnabled: true,
  });

  // Modals
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVictoryOpen, setIsVictoryOpen] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // Game State
  const [currentPlayers, setCurrentPlayers] = useState<Player[]>(players);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>('rolling');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [validMoves, setValidMoves] = useState<ValidMove[]>([]);
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('isometric');
  const [logs, setLogs] = useState<GameLogEntry[]>([
    { id: '1', text: 'Welcome to Super Ludo Royale! Red rolls first.', timestamp: Date.now() },
  ]);

  // Statistics
  const [stats, setStats] = useState<GameStats>({
    totalRolls: 0,
    sixesRolled: 0,
    tokensCaptured: 0,
    tokensSafelyReachedHome: 0,
    durationSeconds: 0,
  });

  // Tokens state: 4 tokens per player
  const [tokens, setTokens] = useState<Token[]>(() => {
    const list: Token[] = [];
    players.forEach(p => {
      for (let i = 0; i < 4; i++) {
        list.push({
          id: i,
          color: p.color,
          location: { type: 'yard', slotIndex: i },
          stepsTraveled: 0,
        });
      }
    });
    return list;
  });

  // Track match duration
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isVictoryOpen) {
        setStats(prev => ({ ...prev, durationSeconds: prev.durationSeconds + 1 }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isVictoryOpen]);

  const addLog = useCallback((text: string, color?: PlayerColor) => {
    setLogs(prev => [...prev.slice(-12), { id: Math.random().toString(), text, color, timestamp: Date.now() }]);
  }, []);

  const activePlayer = currentPlayers[activePlayerIndex] || currentPlayers[0];

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new Ludo3DScene(mountRef.current);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Sync token meshes to 3D scene whenever tokens or validMoves change
  useEffect(() => {
    if (!sceneRef.current) return;
    const selectableTokenIds = phase === 'moving' ? validMoves.map(m => m.tokenId) : [];
    sceneRef.current.syncTokens(tokens, selectableTokenIds, activePlayer.color);
  }, [tokens, validMoves, phase, activePlayer.color]);

  // Set click callbacks on 3D scene
  useEffect(() => {
    if (!sceneRef.current) return;

    sceneRef.current.setCallbacks(
      (clickedColor, clickedTokenId) => {
        // Token clicked directly on 3D board
        if (phase !== 'moving') return;
        if (clickedColor !== activePlayer.color) return;
        if (activePlayer.type === 'bot') return;
        if (onlineRoom && activePlayer.id !== auth.currentUser?.uid) return;

        const move = validMoves.find(m => m.tokenId === clickedTokenId);
        if (move) {
          executeMove(move);
        }
      },
      () => {
        // Dice clicked directly on 3D board
        if (phase === 'rolling' && activePlayer.type === 'human') {
          if (onlineRoom && activePlayer.id !== auth.currentUser?.uid) return;
          handleRollDice();
        }
      }
    );
  });

  /**
   * Generates step-by-step intermediate path coordinates for smooth hopping animation
   */
  const computeStepPath = (token: Token, move: ValidMove, roll: number): Array<{ col: number; row: number }> => {
    const path: Array<{ col: number; row: number }> = [];

    if (move.isSpawn) {
      // Spawn from yard directly onto start tile
      path.push(getBoardCoordinates(token.color, move.to));
      return path;
    }

    const startStep = token.stepsTraveled;
    for (let s = 1; s <= roll; s++) {
      const stepNum = startStep + s;
      if (stepNum > TOTAL_STEPS_TO_HOME) break;

      // Simulated next location at this step
      let loc: Token['location'];
      if (stepNum === TOTAL_STEPS_TO_HOME) {
        loc = { type: 'home' };
      } else if (stepNum >= 52) {
        loc = { type: 'home_path', pathIndex: stepNum - 52 };
      } else {
        const startIdx = START_TRACK_INDEX[token.color];
        loc = { type: 'track', stepIndex: (startIdx + (stepNum - 1)) % 52 };
      }
      path.push(getBoardCoordinates(token.color, loc));
    }

    return path;
  };

  /**
   * Executes a validated move: moves token, triggers animation, checks captures, checks win
   */
  const executeMove = useCallback((move: ValidMove) => {
    setPhase('animating');

    const movingToken = tokens.find(t => t.color === move.color && t.id === move.tokenId);
    if (!movingToken) return;

    const roll = diceValue || 1;
    const pathSteps = computeStepPath(movingToken, move, roll);

    // Call 3D hopping animation
    sceneRef.current?.animateTokenMove(move.color, move.tokenId, pathSteps, () => {
      // Animation complete!
      let bonusTurn = roll === 6;
      let captureOccurred = false;
      let homeReached = false;

      // Check capture
      const capturedToken = findCapturableToken(tokens, move.color, move.to);
      if (capturedToken) {
        captureOccurred = true;
        bonusTurn = true; // Capturing grants bonus turn!

        const captureCoord = getBoardCoordinates(move.color, move.to);
        sceneRef.current?.triggerCaptureEffect(captureCoord.col, captureCoord.row);

        addLog(`${activePlayer.name} CAPTURED ${capturedToken.color.toUpperCase()}! (+1 Bonus Roll)`, move.color);
        setStats(prev => ({ ...prev, tokensCaptured: prev.tokensCaptured + 1 }));
      }

      // Check Home entry
      if (move.isEnterHome) {
        homeReached = true;
        bonusTurn = true; // Entering home awards bonus turn!
        sound.playSafeZone();
        addLog(`${activePlayer.name} brought a token HOME! (+1 Bonus Roll)`, move.color);
        setStats(prev => ({ ...prev, tokensSafelyReachedHome: prev.tokensSafelyReachedHome + 1 }));
      } else if (move.isSpawn) {
        sound.playTokenSpawn();
        addLog(`${activePlayer.name} spawned a token on the start tile!`, move.color);
      }

      // Apply new state to tokens
      setTokens(prevTokens => {
        return prevTokens.map(t => {
          // The moving token
          if (t.color === move.color && t.id === move.tokenId) {
            const nextResult = calculateNextLocation(move.color, t, roll);
            return {
              ...t,
              location: move.to,
              stepsTraveled: nextResult ? nextResult.newStepsTraveled : t.stepsTraveled + roll,
            };
          }
          // The captured token (if any)
          if (capturedToken && t.color === capturedToken.color && t.id === capturedToken.id) {
            return {
              ...t,
              location: { type: 'yard', slotIndex: t.id },
              stepsTraveled: 0,
            };
          }
          return t;
        });
      });

      // Update player tokensHome if home reached
      let currentTokensHome = activePlayer.tokensHome;
      if (homeReached) {
        currentTokensHome += 1;
        setCurrentPlayers(prev =>
          prev.map(p => (p.id === activePlayer.id ? { ...p, tokensHome: currentTokensHome } : p))
        );

        // Check Victory
        if (currentTokensHome >= settings.tokensNeededToWin) {
          const finalWinner = { ...activePlayer, tokensHome: currentTokensHome };
          setWinner(finalWinner);
          setIsVictoryOpen(true);
          setPhase('game_over');
          addLog(`👑 ${activePlayer.name} WINS SUPER LUDO ROYALE! 👑`, move.color);

          recordMatchCompletion({
            winnerName: activePlayer.name,
            winnerColor: move.color,
            mode: settings.mode,
            totalRolls: stats.totalRolls,
            durationSeconds: stats.durationSeconds,
          }).catch(() => {});

          return;
        }
      }

      // Next phase or next player
      if (bonusTurn) {
        addLog(`${activePlayer.name} earned a BONUS ROLL!`, move.color);
        setPhase('rolling');
        setDiceValue(null);
      } else {
        // Advance turn to next player
        setConsecutiveSixes(0);
        setDiceValue(null);
        const nextIdx = (activePlayerIndex + 1) % currentPlayers.length;
        setActivePlayerIndex(nextIdx);
        setPhase('rolling');
        sound.playTurnPing();
      }
    });
  }, [tokens, diceValue, activePlayer, currentPlayers, settings.tokensNeededToWin, addLog]);

  /**
   * Handles Dice Rolling (Physical 3D Roll + Rules Evaluation)
   */
  const handleRollDice = useCallback(() => {
    if (phase !== 'rolling') return;

    // Generate fair uniform roll 1..6
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
    setStats(prev => ({
      ...prev,
      totalRolls: prev.totalRolls + 1,
      sixesRolled: roll === 6 ? prev.sixesRolled + 1 : prev.sixesRolled,
    }));

    // Trigger 3D dice rolling animation
    sceneRef.current?.roll3DDice(roll, () => {
      // Dice settled!
      let currentSixes = roll === 6 ? consecutiveSixes + 1 : 0;
      setConsecutiveSixes(currentSixes);

      // Check 3 consecutive 6s rule
      if (settings.threeSixesForfeit && currentSixes >= 3) {
        addLog(`Three 6s in a row! ${activePlayer.name}'s turn is forfeited.`, activePlayer.color);
        setConsecutiveSixes(0);
        setDiceValue(null);
        setActivePlayerIndex((activePlayerIndex + 1) % currentPlayers.length);
        setPhase('rolling');
        sound.playTurnPing();
        return;
      }

      addLog(`${activePlayer.name} rolled a ${roll}!`, activePlayer.color);

      // Calculate valid moves for active player
      const moves = getValidMoves(tokens, tokens, activePlayer.color, roll);
      setValidMoves(moves);

      if (moves.length === 0) {
        // No valid moves possible
        addLog(`No valid moves for ${activePlayer.name}.`, activePlayer.color);

        if (roll === 6) {
          // Keeps turn on 6 even if stuck
          setPhase('rolling');
        } else {
          // Pass turn
          setConsecutiveSixes(0);
          setDiceValue(null);
          setTimeout(() => {
            setActivePlayerIndex((activePlayerIndex + 1) % currentPlayers.length);
            setPhase('rolling');
            sound.playTurnPing();
          }, 650);
        }
      } else {
        // Valid moves exist!
        if (settings.autoMoveSingleToken && moves.length === 1 && activePlayer.type === 'human') {
          // Auto move single token
          executeMove(moves[0]);
        } else if (activePlayer.type === 'human') {
          setPhase('moving');
        } else {
          // Bot logic: evaluate and pick best tactical move
          setPhase('moving');
          setTimeout(() => {
            const botMove = pickBotMove(
              moves,
              tokens,
              tokens.filter(t => t.color === activePlayer.color),
              activePlayer.difficulty || 'hard'
            );
            if (botMove) {
              executeMove(botMove);
            }
          }, 500);
        }
      }
    });
  }, [phase, consecutiveSixes, settings, activePlayer, currentPlayers.length, activePlayerIndex, tokens, addLog, executeMove]);

  // Handle Bot Turn Auto-Roll
  useEffect(() => {
    if (phase === 'rolling' && activePlayer.type === 'bot' && !isVictoryOpen) {
      const timer = setTimeout(() => {
        handleRollDice();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [phase, activePlayer, handleRollDice, isVictoryOpen]);

  // Cycle camera views
  const handleCycleCamera = () => {
    sound.playClick();
    const modes: CameraViewMode[] = ['isometric', 'topdown', 'cinematic'];
    const curIdx = modes.indexOf(cameraMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    setCameraMode(nextMode);
    sceneRef.current?.setCameraPreset(nextMode);
  };

  const handleRestartMatch = () => {
    sound.playClick();
    setIsVictoryOpen(false);
    setWinner(null);
    setActivePlayerIndex(0);
    setPhase('rolling');
    setDiceValue(null);
    setConsecutiveSixes(0);
    setValidMoves([]);

    // Reset tokens
    const resetTokens: Token[] = [];
    players.forEach(p => {
      for (let i = 0; i < 4; i++) {
        resetTokens.push({
          id: i,
          color: p.color,
          location: { type: 'yard', slotIndex: i },
          stepsTraveled: 0,
        });
      }
    });
    setTokens(resetTokens);
    setCurrentPlayers(players.map(p => ({ ...p, tokensHome: 0 })));
    setStats({
      totalRolls: 0,
      sixesRolled: 0,
      tokensCaptured: 0,
      tokensSafelyReachedHome: 0,
      durationSeconds: 0,
    });
    addLog('Match restarted! Red rolls first.');
  };

  return (
    <div className="relative w-full h-[100dvh] bg-[#0b1120] overflow-hidden select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Game HUD */}
      <HUD
        players={currentPlayers}
        activePlayer={activePlayer}
        currentDiceValue={diceValue}
        phase={phase}
        consecutiveSixes={consecutiveSixes}
        logs={logs}
        cameraMode={cameraMode}
        soundEnabled={settings.soundEnabled}
        canRoll={phase === 'rolling' && (!onlineRoom || activePlayer.id === auth.currentUser?.uid)}
        selectableTokenCount={validMoves.length}
        onRollDice={handleRollDice}
        onToggleSound={() => {
          const next = !settings.soundEnabled;
          sound.setSoundEnabled(next);
          setSettings(prev => ({ ...prev, soundEnabled: next }));
        }}
        onCycleCamera={handleCycleCamera}
        onOpenRules={() => {
          sound.playClick();
          setIsRulesOpen(true);
        }}
        onOpenSettings={() => {
          sound.playClick();
          setIsSettingsOpen(true);
        }}
        onGoToLobby={() => {
          sound.playClick();
          onExitToLobby();
        }}
      />

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={newCfg => setSettings(prev => ({ ...prev, ...newCfg }))}
      />

      {/* Victory Celebration Modal */}
      {winner && (
        <VictoryModal
          isOpen={isVictoryOpen}
          players={currentPlayers}
          winner={winner}
          stats={stats}
          onPlayAgain={handleRestartMatch}
          onGoToLobby={() => {
            setIsVictoryOpen(false);
            onExitToLobby();
          }}
        />
      )}
    </div>
  );
};
