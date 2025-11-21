import React from 'react';
import { CellData, CellState } from '../types';
import { Flag, Bomb, HelpCircle } from 'lucide-react';

interface CellProps {
  data: CellData;
  onClick: (r: number, c: number) => void;
  onRightClick: (e: React.MouseEvent, r: number, c: number) => void;
  gameActive: boolean;
}

const getNumberColor = (num: number) => {
  switch (num) {
    case 1: return 'text-blue-600';
    case 2: return 'text-green-600';
    case 3: return 'text-red-600';
    case 4: return 'text-blue-900';
    case 5: return 'text-red-900';
    case 6: return 'text-cyan-600';
    case 7: return 'text-black';
    case 8: return 'text-gray-600';
    default: return 'text-gray-800';
  }
};

const Cell: React.FC<CellProps> = ({ data, onClick, onRightClick, gameActive }) => {
  const { row, col, state, neighborMines, isMine, highlight } = data;

  const baseClasses = "w-8 h-8 sm:w-10 sm:h-10 border flex items-center justify-center font-bold select-none text-sm sm:text-base transition-all duration-100 cursor-pointer";
  
  let content = null;
  let appearanceClasses = "";

  if (state === CellState.REVEALED) {
    appearanceClasses = isMine 
      ? "bg-red-500 border-red-400" 
      : "bg-white border-gray-200 shadow-inner";
    
    if (isMine) {
      content = <Bomb size={18} className="text-white" />;
    } else if (neighborMines > 0) {
      content = <span className={getNumberColor(neighborMines)}>{neighborMines}</span>;
    }
  } else {
    // Hidden, Flagged, or Question
    appearanceClasses = "bg-gray-300 border-gray-400 hover:bg-gray-200 active:bg-gray-400 shadow-sm bevel-up";
    
    if (state === CellState.FLAGGED) {
      content = <Flag size={16} className="text-red-600 fill-red-600" />;
    } else if (state === CellState.QUESTION) {
      content = <HelpCircle size={18} className="text-blue-600" />;
    }
  }

  // AI Highlight Logic
  const highlightClass = highlight ? "ring-4 ring-yellow-400 ring-opacity-80 z-10 animate-pulse" : "";

  return (
    <div
      className={`${baseClasses} ${appearanceClasses} ${highlightClass}`}
      onClick={() => gameActive && state !== CellState.FLAGGED && onClick(row, col)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (gameActive) onRightClick(e, row, col);
      }}
    >
      {content}
    </div>
  );
};

export default React.memo(Cell);