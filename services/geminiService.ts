import { GoogleGenAI, Type } from "@google/genai";
import { CellData, CellState, AiHint } from '../types';

// Initialize Gemini Client
// Note: We use process.env.API_KEY as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiMoveSuggestion = async (
  board: CellData[][], 
  minesTotal: number
): Promise<AiHint | null> => {
  try {
    // 1. Convert board to a text representation efficiently
    // H = Hidden, F = Flag, 0-8 = Neighbors
    const rows = board.length;
    const cols = board[0].length;
    let gridStr = `Board Size: ${rows}x${cols}. Total Mines: ${minesTotal}.\n`;
    
    let knownMines = 0;
    let hiddenCount = 0;

    gridStr += "Current State:\n";
    for (let r = 0; r < rows; r++) {
      let rowStr = "";
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (cell.state === CellState.REVEALED) {
          rowStr += cell.neighborMines.toString() + " ";
        } else if (cell.state === CellState.FLAGGED) {
          rowStr += "F ";
          knownMines++;
        } else {
          rowStr += "H ";
          hiddenCount++;
        }
      }
      gridStr += rowStr.trim() + "\n";
    }

    const systemPrompt = `
      You are a Minesweeper Logic Expert. 
      Analyze the provided board state. 
      'H' is Hidden, 'F' is Flagged Mine, numbers 0-8 are revealed cells indicating adjacent mines.
      Coordinate system: Row 0 is top, Col 0 is left.
      
      Your goal: Find the single safest cell to REVEAL next.
      1. Look for obvious logic (e.g., a '1' touching only 1 hidden cell means that hidden cell is a mine. A '1' touching a known mine means other neighbors are safe).
      2. If no 100% safe moves exist, calculate the best probability.
      3. Return the 0-indexed row and column of the cell to REVEAL.
    `;

    const userPrompt = `
      Current Board State:
      ${gridStr}

      Remaining Mines (estimated): ${minesTotal - knownMines}
      
      Please provide the safest move in JSON format.
    `;

    // Define schema for structured output
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        row: { type: Type.INTEGER, description: "Row index of the cell to reveal" },
        col: { type: Type.INTEGER, description: "Column index of the cell to reveal" },
        confidence: { type: Type.NUMBER, description: "Confidence score 0.0 to 1.0" },
        reasoning: { type: Type.STRING, description: "Brief explanation of why this move is safe" },
      },
      required: ["row", "col", "confidence", "reasoning"],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 0 } // Flash model usually doesn't need high thinking budget for basic Minesweeper logic
      },
    });

    if (response.text) {
      const hint = JSON.parse(response.text) as AiHint;
      return hint;
    }
    
    return null;

  } catch (error) {
    console.error("Error fetching AI hint:", error);
    throw error;
  }
};