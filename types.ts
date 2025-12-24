export interface WordPair {
  id: string;
  char: string;
  word: string;
}

export enum GameState {
  SETUP = 'SETUP',
  PLAYING = 'PLAYING',
  COMPLETED = 'COMPLETED'
}

export interface AudioCache {
  [key: string]: AudioBuffer;
}

export interface WordStats {
  [key: string]: {
    correct: number;
    incorrect: number;
    consecutiveCorrect: number;
  };
}