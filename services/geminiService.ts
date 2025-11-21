import { CellData, CellState, AiHint } from '../types';

// Mock AI Service - Local Minesweeper Logic
// Replaces Google Gemini API with local logic for demonstration

// Local Minesweeper logic to find safe moves
const findSafeMove = (board: CellData[][]): AiHint | null => {
  const rows = board.length;
  const cols = board[0].length;

  // Strategy 1: Find cells that are definitely safe
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.state === CellState.REVEALED && cell.neighborMines > 0) {
        // Get all neighbors
        const neighbors = [];
        let flaggedCount = 0;
        let hiddenCount = 0;

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              neighbors.push(board[nr][nc]);
              if (board[nr][nc].state === CellState.FLAGGED) flaggedCount++;
              if (board[nr][nc].state === CellState.HIDDEN) hiddenCount++;
            }
          }
        }

        // If all mines are found, other hidden neighbors are safe
        if (flaggedCount === cell.neighborMines && hiddenCount > flaggedCount) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (board[nr][nc].state === CellState.HIDDEN) {
                  return {
                    row: nr,
                    col: nc,
                    confidence: 1.0,
                    reasoning: `Cell (${nr}, ${nc}) is safe because all ${cell.neighborMines} mines around cell (${r}, ${c}) are already flagged.`
                  };
                }
              }
            }
          }
        }

        // If hidden cells equal remaining mines, all are mines
        if (hiddenCount === cell.neighborMines - flaggedCount && hiddenCount > 0) {
          // This would help with flagging, but we need to reveal a safe cell
          continue;
        }
      }
    }
  }

  // Strategy 2: Find the safest hidden cell based on probability
  let safestCell: { row: number; col: number; risk: number } | null = null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (cell.state === CellState.HIDDEN) {
        let totalMinesAround = 0;
        let totalRevealedNeighbors = 0;

        // Check revealed neighbors to calculate risk
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const neighbor = board[nr][nc];
              if (neighbor.state === CellState.REVEALED) {
                totalRevealedNeighbors++;
                totalMinesAround += neighbor.neighborMines;
              }
            }
          }
        }

        const avgRisk = totalRevealedNeighbors > 0 ? totalMinesAround / totalRevealedNeighbors / 8 : 0.1;

        if (!safestCell || avgRisk < safestCell.risk) {
          safestCell = { row: r, col: c, risk: avgRisk };
        }
      }
    }
  }

  if (safestCell) {
    return {
      row: safestCell.row,
      col: safestCell.col,
      confidence: Math.max(0.1, 1.0 - safestCell.risk),
      reasoning: `Cell (${safestCell.row}, ${safestCell.col}) appears to be the safest option based on neighboring numbers.`
    };
  }

  return null;
};

export const getAiMoveSuggestion = async (
  board: CellData[][],
  minesTotal: number
): Promise<AiHint | null> => {
  try {
    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const safeMove = findSafeMove(board);

    if (safeMove) {
      console.log('AI Suggestion:', safeMove);
      return safeMove;
    }

    // If no safe move found, return a random hidden cell
    const hiddenCells: Array<{row: number, col: number}> = [];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (board[r][c].state === CellState.HIDDEN) {
          hiddenCells.push({ row: r, col: c });
        }
      }
    }

    if (hiddenCells.length > 0) {
      const randomCell = hiddenCells[Math.floor(Math.random() * hiddenCells.length)];
      return {
        row: randomCell.row,
        col: randomCell.col,
        confidence: 0.3,
        reasoning: 'No obvious safe moves found. Making a calculated guess on a hidden cell.'
      };
    }

    return null;

  } catch (error) {
    console.error("Error generating AI hint:", error);
    throw error;
  }
};