import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, RefreshCw, Clock, Flag, Trophy, AlertTriangle, Play } from 'lucide-react';
import Cell from './components/Cell';
import { Difficulty, CellData, CellState, GameStatus, AiHint } from './types';
import { createEmptyBoard, placeMines, revealCell, checkWin, revealAllMines } from './services/gameLogic';
import { getAiMoveSuggestion } from './services/geminiService';

// Constants
const DIFFICULTIES: Difficulty[] = [
  { name: '简单', rows: 9, cols: 9, mines: 10 },
  { name: '中等', rows: 16, cols: 16, mines: 40 },
  { name: '困难', rows: 16, cols: 30, mines: 99 },
];

const App: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>(DIFFICULTIES[0]);
  const [board, setBoard] = useState<CellData[][]>([]);
  const [gameState, setGameState] = useState<GameStatus>(GameStatus.IDLE);
  const [time, setTime] = useState(0);
  const [flagsUsed, setFlagsUsed] = useState(0);
  const [aiHint, setAiHint] = useState<AiHint | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  // Initialize Game
  const initGame = useCallback(() => {
    setBoard(createEmptyBoard(difficulty.rows, difficulty.cols));
    setGameState(GameStatus.IDLE);
    setTime(0);
    setFlagsUsed(0);
    setAiHint(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [difficulty]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  // Timer Logic
  useEffect(() => {
    if (gameState === GameStatus.PLAYING) {
      timerRef.current = window.setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleCellClick = (r: number, c: number) => {
    if (gameState === GameStatus.WON || gameState === GameStatus.LOST) return;

    let newBoard = [...board];

    // First click logic: Generate mines
    if (gameState === GameStatus.IDLE) {
      setGameState(GameStatus.PLAYING);
      // Place mines ensuring the first click is safe
      newBoard = placeMines(newBoard, difficulty.mines, r, c);
    }

    const { board: updatedBoard, hitMine } = revealCell(newBoard, r, c);
    setBoard(updatedBoard);

    // Clear AI hint if user acted on it (or clicked elsewhere)
    if (aiHint) setAiHint(null);

    if (hitMine) {
      setGameState(GameStatus.LOST);
      setBoard(revealAllMines(updatedBoard));
    } else {
      if (checkWin(updatedBoard, difficulty)) {
        setGameState(GameStatus.WON);
        setFlagsUsed(difficulty.mines); // Just for visual nicety
      }
    }
  };

  const handleRightClick = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (gameState !== GameStatus.PLAYING && gameState !== GameStatus.IDLE) return;

    const newBoard = board.map(row => [...row]);
    const cell = newBoard[r][c];

    if (cell.state === CellState.REVEALED) return;

    if (cell.state === CellState.HIDDEN) {
      cell.state = CellState.FLAGGED;
      setFlagsUsed(prev => prev + 1);
    } else if (cell.state === CellState.FLAGGED) {
      cell.state = CellState.QUESTION;
      setFlagsUsed(prev => prev - 1);
    } else if (cell.state === CellState.QUESTION) {
      cell.state = CellState.HIDDEN;
    }

    setBoard(newBoard);
  };

  const requestAiHint = async () => {
    if (gameState !== GameStatus.PLAYING && gameState !== GameStatus.IDLE) return;
    if (loadingHint) return;

    setLoadingHint(true);
    setAiHint(null);
    try {
      const hint = await getAiMoveSuggestion(board, difficulty.mines);
      if (hint) {
        setAiHint(hint);
        // Highlight logic
        setBoard(prev => prev.map(row => row.map(cell => {
            if (cell.row === hint.row && cell.col === hint.col) {
                return { ...cell, highlight: true };
            }
            return { ...cell, highlight: false };
        })));
        
        // Remove highlight after 4 seconds
        setTimeout(() => {
             setBoard(prev => prev.map(row => row.map(cell => ({ ...cell, highlight: false }))));
        }, 4000);
      }
    } catch (e) {
      alert("AI Assistant is unavailable. Please check your API Key.");
    } finally {
      setLoadingHint(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center py-8 px-4 font-sans">
      
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight mb-2">AI 智能扫雷</h1>
        <p className="text-slate-500">Gemini 驱动的经典游戏体验</p>
      </header>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl shadow-lg w-full max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border border-slate-200">
        
        {/* Difficulty Selector */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          {DIFFICULTIES.map((diff) => (
            <button
              key={diff.name}
              onClick={() => setDifficulty(diff)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                difficulty.name === diff.name
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {diff.name}
            </button>
          ))}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-6 font-mono text-xl">
          <div className="flex items-center gap-2 text-red-500">
            <Flag size={24} />
            <span className="font-bold">{difficulty.mines - flagsUsed}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Clock size={24} />
            <span className="font-bold">{time.toString().padStart(3, '0')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
            <button
              onClick={initGame}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors"
            >
              <RefreshCw size={18} /> 重置
            </button>
            <button
              onClick={requestAiHint}
              disabled={loadingHint || gameState !== GameStatus.PLAYING && gameState !== GameStatus.IDLE}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-all shadow-md ${
                loadingHint 
                  ? 'bg-purple-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
              }`}
            >
              <Bot size={18} className={loadingHint ? "animate-spin" : ""} />
              {loadingHint ? "思考中..." : "AI 提示"}
            </button>
        </div>
      </div>

      {/* Game Board Area */}
      <div className="relative bg-white p-1 rounded-lg shadow-2xl border-4 border-slate-300 inline-block overflow-hidden max-w-full">
        {/* Scrollable container for mobile */}
        <div className="overflow-x-auto board-scroll p-2">
          <div 
            className="grid gap-[2px] bg-slate-300 border-2 border-slate-300"
            style={{
              gridTemplateColumns: `repeat(${difficulty.cols}, min-content)`
            }}
          >
            {board.map((row, rIndex) => (
              row.map((cell, cIndex) => (
                <Cell
                  key={`${rIndex}-${cIndex}`}
                  data={cell}
                  onClick={handleCellClick}
                  onRightClick={handleRightClick}
                  gameActive={gameState === GameStatus.IDLE || gameState === GameStatus.PLAYING}
                />
              ))
            ))}
          </div>
        </div>
        
        {/* Overlay for Game Over / Win */}
        {(gameState === GameStatus.WON || gameState === GameStatus.LOST) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20 animate-fade-in text-white p-6 text-center">
            {gameState === GameStatus.WON ? (
              <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
            ) : (
              <AlertTriangle size={64} className="text-red-500 mb-4" />
            )}
            <h2 className="text-4xl font-bold mb-2">
              {gameState === GameStatus.WON ? "恭喜获胜!" : "游戏结束"}
            </h2>
            <p className="text-lg mb-6 opacity-90">
              {gameState === GameStatus.WON 
                ? `你是个扫雷天才! 用时 ${time} 秒.` 
                : "下次好运! 小心炸弹."}
            </p>
            <button
              onClick={initGame}
              className="px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Play size={20} fill="currentColor" /> 再玩一次
            </button>
          </div>
        )}
      </div>

      {/* AI Hint Display */}
      {aiHint && (
        <div className="mt-6 max-w-2xl w-full bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex gap-4 items-start shadow-sm animate-slide-up">
           <div className="bg-indigo-100 p-2 rounded-full">
              <Bot size={24} className="text-indigo-600" />
           </div>
           <div>
              <h3 className="font-bold text-indigo-900 mb-1">AI 建议:</h3>
              <p className="text-indigo-800 text-sm leading-relaxed">
                <span className="font-semibold block mb-1">
                  推荐位置: 第 {aiHint.row + 1} 行, 第 {aiHint.col + 1} 列 (信心: {Math.round(aiHint.confidence * 100)}%)
                </span>
                "{aiHint.reasoning}"
              </p>
           </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-slate-400 text-sm">
         <p>Powered by Google Gemini 2.5 Flash</p>
      </footer>
    </div>
  );
};

export default App;