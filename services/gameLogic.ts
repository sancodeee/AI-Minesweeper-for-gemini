import { CellData, CellState, Difficulty, GameStatus } from '../types';

// Directions for neighbor checking (top, top-right, right, etc.)
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

export const createEmptyBoard = (rows: number, cols: number): CellData[][] => {
  const board: CellData[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        row: r,
        col: c,
        isMine: false,
        state: CellState.HIDDEN,
        neighborMines: 0
      });
    }
    board.push(row);
  }
  return board;
};

export const placeMines = (
  board: CellData[][],
  mines: number,
  firstClickRow: number,
  firstClickCol: number
): CellData[][] => {
  const rows = board.length;
  const cols = board[0].length;
  let minesPlaced = 0;
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));

  // Avoid placing mine on first click and its immediate neighbors to ensure a safe start
  const isSafeZone = (r: number, c: number) => {
    return Math.abs(r - firstClickRow) <= 1 && Math.abs(c - firstClickCol) <= 1;
  };

  while (minesPlaced < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);

    if (!newBoard[r][c].isMine && !isSafeZone(r, c)) {
      newBoard[r][c].isMine = true;
      minesPlaced++;
    }
  }

  // Calculate numbers
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!newBoard[r][c].isMine) {
        let count = 0;
        DIRECTIONS.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
            count++;
          }
        });
        newBoard[r][c].neighborMines = count;
      }
    }
  }

  return newBoard;
};

export const revealCell = (board: CellData[][], row: number, col: number): { board: CellData[][], hitMine: boolean } => {
  const newBoard = board.map(r => r.map(c => ({ ...c })));
  const cell = newBoard[row][col];

  if (cell.state !== CellState.HIDDEN && cell.state !== CellState.QUESTION) {
    return { board: newBoard, hitMine: false };
  }

  if (cell.isMine) {
    cell.state = CellState.REVEALED;
    return { board: newBoard, hitMine: true };
  }

  // Flood fill for 0s
  const queue = [[row, col]];
  
  while (queue.length > 0) {
    const [currR, currC] = queue.shift()!;
    const currCell = newBoard[currR][currC];

    if (currCell.state === CellState.REVEALED || currCell.state === CellState.FLAGGED) continue;

    currCell.state = CellState.REVEALED;

    if (currCell.neighborMines === 0) {
      DIRECTIONS.forEach(([dr, dc]) => {
        const nr = currR + dr;
        const nc = currC + dc;
        if (nr >= 0 && nr < newBoard.length && nc >= 0 && nc < newBoard[0].length) {
          if (newBoard[nr][nc].state === CellState.HIDDEN || newBoard[nr][nc].state === CellState.QUESTION) {
             // Optimization: only add to queue if not already visited/revealed to avoid duplicates in queue
             // However, checking state at start of loop handles this.
             // We just add neighbors.
             if (newBoard[nr][nc].state === CellState.HIDDEN) {
                // Actually, flood fill needs to be careful not to re-add.
                // Best approach: Reveal immediately if safe, add to queue if 0.
             }
             queue.push([nr, nc]);
          }
        }
      });
    }
  }

  // Refined Flood Fill to avoid stack/queue explosion and redundancy
  // The above simple BFS has a flaw: it might add the same node multiple times.
  // Let's do a proper recursive-style BFS logic but iterative.
  // Actually, let's rewrite the execution part for correctness:
  
  // Reset for proper execution
  const finalBoard = board.map(r => r.map(c => ({ ...c })));
  const q = [[row, col]];
  const visited = new Set<string>();
  
  while(q.length > 0) {
    const [r, c] = q.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const target = finalBoard[r][c];
    if (target.state === CellState.FLAGGED) continue;
    
    target.state = CellState.REVEALED;

    if (target.neighborMines === 0 && !target.isMine) {
       DIRECTIONS.forEach(([dr, dc]) => {
         const nr = r + dr;
         const nc = c + dc;
         if (nr >= 0 && nr < finalBoard.length && nc >= 0 && nc < finalBoard[0].length) {
           const neighbor = finalBoard[nr][nc];
           if (neighbor.state === CellState.HIDDEN || neighbor.state === CellState.QUESTION) {
             q.push([nr, nc]);
           }
         }
       });
    }
  }

  return { board: finalBoard, hitMine: false };
};

export const checkWin = (board: CellData[][], difficulty: Difficulty): boolean => {
  const rows = board.length;
  const cols = board[0].length;
  let revealedCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].state === CellState.REVEALED) {
        revealedCount++;
      }
    }
  }

  return revealedCount === (rows * cols - difficulty.mines);
};

export const revealAllMines = (board: CellData[][]): CellData[][] => {
  return board.map(row => row.map(cell => {
    if (cell.isMine) {
      return { ...cell, state: CellState.REVEALED };
    }
    return cell;
  }));
};