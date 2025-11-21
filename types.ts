export enum CellState {
  HIDDEN,
  REVEALED,
  FLAGGED,
  QUESTION
}

export interface CellData {
  row: number;
  col: number;
  isMine: boolean;
  state: CellState;
  neighborMines: number; // 0-8
  highlight?: boolean; // For AI hint
}

export enum GameStatus {
  IDLE,
  PLAYING,
  WON,
  LOST
}

export interface Difficulty {
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

export interface AiHint {
  row: number;
  col: number;
  reasoning: string;
  confidence: number;
}