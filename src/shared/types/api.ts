export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type TopXGameData = {
  id: string;
  prompt: string;
  correctAnswers: string[];
  searchSuggestions: string[];
  category: string;
  number: number;
  createdAt: string;
};

export type TopXGameResponse = {
  type: 'topx_game';
  game: TopXGameData;
};

export type TopXValidateResponse = {
  type: 'topx_validate';
  answer: string;
  isCorrect: boolean;
  position?: number; // For correct answers, which position it is
  attemptsRemaining: number;
};

export type TopXGamesResponse = {
  type: 'topx_games';
  games: TopXGameData[];
};
