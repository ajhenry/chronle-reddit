We are going to be creating a new game

- It is called `Lettered` and it a crossover between wheel of fortune and tetris.
- There is a picture attached for how the game should look like.
- There is a grid with a phrase on it and a category above it. For example:
  - Category: "Things people say when eating it"
  - And the phrase is "Peanut butter is good"
- The grid is a 8x8 grid of squares. There are already some letters filled in and spaces are marked with a blank white square.
- Unused spaces are marked with a gray blank square.
- Unfilled spaces are marked with a white blank square.
- The tetris pieces start out at the bottom of the grid and are draggable ontop of the grid.
  - The pieces should automatically lock into place when they are drug over the grid
  - The grid outlines should highlight green when there is a valid space for the piece to be placed.
  - The grid outlines should highlight red when there is an invalid space for the piece to be placed.
    - And if a user drops a piece in an invalid space, it should snap back to the bottom of the grid or where it was last valid.
- The game with automatically end when the grid is filled with the correct solution.
- The user has a unlimited moves
- We need to create a new button on the homepage for this game. There is a picture to use as the background for the button found at `public/letter-button-logo.svg`
- Create a new page for the game called `lettered` and it should use the same layout as the topx game.
- It follows the same score decay mechanism as topx.
- Do not worry about the API for now. We will create that later. Let's get the game working first with some mock data.
- Also figure out how to effeciently store the game state for the initial game load and how to update it as the user plays.
- Use proper libraries for the drag and drop mechanics so that it is responsive and works on mobile.
- Start with a mobile first design and we can iterate later

## Clarity on the following points

Tetris Pieces: What specific tetris piece shapes should I include? The classic 7 pieces (I, O, T, S, Z, J, L) or a custom set? Should they be different colors like the image shows?

- Do any size that will fit the board, they can be any shape as long as they connect via sides and not just corners.
- They must be at least 2 letters long.
- There should be a max of 5 letters per piece.

Letter Distribution: How should letters be distributed among the pieces? Should each piece contain multiple letters, or one letter per square of the piece?

- Each piece should contain multiple letters.
- There should be a max of 5 letters per piece.

Piece Pool: Should there be a fixed set of pieces available for each puzzle, or should pieces be generated based on the letters needed for the solution?

- Should pieces be generated based on the letters needed for the solution.

Grid Layout: In the image, I see letters like "PEANUTBUTTER" and "GOOD" arranged in blocks. Should the phrase be:
Pre-positioned with some letters already filled in?

- Yes, some letters should be pre-positioned. They are letters with a white background.

Completely empty at the start with just the grid outline showing where letters should go?

- No, there should be letters with a white background. Or a space with a gray background.

Have word boundaries indicated somehow?

- White spaces indicate word boundaries.

Phrase Input: How should the category and phrase data be structured? Do you want:
A simple text phrase that gets automatically laid out on the grid?

- Yes, then randomly chose letters to fill in the spaces.
- A max of 5 words per phrase. And a maximum of 28 letters per phrase.

Pre-defined positions for each word?
Specific grid coordinates for each letter?

- No, the letters should be randomly placed on the grid.

Scoring: Should it follow the same score decay mechanism as TopX with the same starting score (250) and timing?

- Yes, it should follow the same score decay mechanism as TopX with the same starting score (250) and timing.

Piece Snapping: When pieces snap to invalid positions, should they return to:

- In order of priority:
- The last valid position.
- A designated "piece tray" area if the last valid position is not available.

## Storage of the board

- There should be a gameboard object that stores the following properties:
  - board: GridCell[][]; // Max of 8x8
  - pieces: LetterPiece[]; // pieces that the user has dragged onto the board
  - solution: GridPosition[][]; // where each piece should be placed
  - created_at: string; // when the gameboard was created
  - updated_at: string; // when the gameboard was last updated
- The board layout should be stored in a 2 dimensional array of GridCell objects.
- A gridcell object should have the following properties:
  - letter: string | null;
  - isPreFilled: boolean; // true for letters that start on the board
  - isSpace: boolean; // true for word boundaries (gray squares)
  - isUnused: boolean; // true for cells not part of the phrase (gray squares)

## Algorithm for generating a valid board layout

Algorithm for generating a valid board layout:

We start with a 9x9 grid that is represented as a 2d array of GridCell objects.

- Start with the phrase. Layout the phrase on the grid so that it forms a square as close as possible
  - For example,
    - P E A N U T
    - B U T T E R
    - I S - G O O D
  - Or
    - B R E A K
    - A - L E G
    - - O U T -
    - T H E R E
- From there, choose random letters to be used as anchor letters
  - For example, for "PEANUT BUTTER IS GOOD"
    - - - A - - -
    - S - - - - -
    - - - - - - - D

This is a backtracking algorithm to generate a valid board layout.

There should be no specific shape for any phrase. Any phrase can be inputted and the board layout should be generated accordingly.

1. Break the phrase up into words. This can be done by splitting the phrase on spaces.
2. Calculate the length of the longest word, this is a guideline for the size of the square.
3. Choose the first word in the phrase and place it in the square.
4. Choose the next word in the phrase, combine the previous word with the next word separated by a space, if it fits in the grid, and is less than the length of the longest word+2, place it in the same row as the first word.
5. If the next word does not fit, place it in a new row.
6. Repeat until all words are placed.
7. If there are no more words to place, return the board layout.

#### Trimming the board layout

We want to trim the board layout to remove excess empty space.

- Apply trimming constraints:
- At most 1 padding of empty space between unsolved letters and top/bottom.
- If there is more than 1 padding of empty space, remove the padding from the top and bottom.
- On the sides, if there is more than 1 padding of empty space, remove the padding from the left and right. But ONLY if the size is greater than 8 square total. If the size is 8 squares or less, do not remove any padding.

### Algorithm for choosing anchor letters

1. Get the length of the phrase including spaces. For phrases less than 28 letters, use 2 anchor letters. For phrases longer than 28 letters, use 3 anchor letters.
2. Choose the first random anchor letter.
3. Mark the letter as pre-filled.
4. Check the validity of the board.
5. If the board is invalid, remove the letter from the grid and choose a new random anchor letter.
6. If the board is valid, continue to the next anchor letter.
7. If there are no more anchor letters to choose, return the board layout.

The valid board state is:

- No single letter is stranded. This means that every letter is reachable from at least one other letter and only on the sides of the letter. No corners.
- No letter overflows the bounds of the grid.
- There is at least 2 anchor pieces.

## Piece generation algorithm

This is algorithm for generating letter pieces.

- From there, start the generation of the letter pieces also using a backtracking algorithm.
  - This is a recursive backtracking algorithm
  - Choose the specifications of the pieces before starting the algorithm.
  - For example, for "PEANUT BUTTER IS GOOD" we can choose 4 pieces that are 2-5 letters long each.
    - This is decided by taking the (number of letters - count of anchor letters) and dividing it by 3 for puzzles less than 24 letters, 4 for puzzles between 24 and 28 letters, and 5 for puzzles longer than 28 letters.
    - Start with 5 pieces but if the generation fails, we can try 4 pieces. Then try 3 pieces. If all fail, return false.
  - Start with a copy of the filled out board layout. Generated by the algorithm above.
  - Remove any anchor letters from the grid by setting the letter to null.
  - First choose the next available letter by starting at 0,0 and moving towards the right. If no pieces are found, move down a row and repeat starting at position 0.
    - Choose the next available letter to be used at the starting letter.
    - From there, choose a direction randomly from up, down, left, right to find the next available letter. If there is a not a valid letter at that position, recursively go back to the previous letter and try a different direction in a clockwise manner. This should only be within the bounds of the grid. **If we reach the starting letter again, backtrack and try a different starting letter.**
      - Note that you may go over the same letter twice when choosing a direction, **this is valid**. The letter is not added to the piece until it is confirmed to be valid.
    - Once an available letter is found, add it to the piece and mark the letter as used by setting the letter to null.
    - Make a recursive call to the algorithm to generate the next letter.
    - Repeat until the piece is complete. You should perform a validity check to ensure that the piece is connected via sides and not just corners. If the piece is not valid, backtrack and try a different direction or starting letter.
    - Once the piece is complete, add it to the list of pieces.
    - The used letter should be set to null.
    - Repeat until all letters are used.
  - If there are no more available letters, backtrack and try a different starting letter.
  - If there are no more starting letters, return false.
  - If the algorithm succeeds, return the list of pieces.
  - If the algorithm fails, return false.
  - We should not strand any single letter, this is invalid.
- No piece should ever contain just a single letter - all pieces must have at least 2 letters.

Valid board state:

- No single letter is stranded.
- All letters are used.
- The pieces are connected via sides and not just corners.
- The pieces are not overlapping.
- The pieces are not outside the grid.
- The pieces use each letter only once.
- The pieces use between 2 and 5 letters each.
- The pieces do not use any anchored letters.

If any of the above rules are violated, the board is invalid and we should backtrack and try a different starting letter.
You may undo piece generation and try again.

Example of the algorithm in action:

- For "PEANUT BUTTER IS GOOD"
  - While we have not used all the letters, we will keep generating pieces.
  - Choose the next available letter that is not used in any other piece or as an anchor letter.
    - "P" is chosen.
    - Then we move randomly right, and we choose "E", we move back to "P" but it is used, the board is still in a valid state so we move down and we choose "B", we move down and choose "I". We are finished with the first piece.
      - At each step we check if the board is in a valid state.
    - We remove the letters "P", "E", "B", and "I" from the grid.
  - We generated the following piece sizes: 4 pieces = 4 letters, 4 letters, 4 letters, and 3 letters.

### Final Board Layout

We want to generate a final board layout that will be passed to the client.

Extend the board grid created by the generation algorithm.

It should be extended by 20 rows to place the pieces.

Each letter pieces should be placed starting from top of the extended grid and moving right and then down.

- A piece should be placed in the first available space starting from top of the extended grid and moving right and then down. There should be 1 cell gap between each piece.
- There should be no overlapping pieces.
- There should be no pieces that are outside the grid. This includes any parts of the piece that are outside the grid.

Once all pieces are placed, trim the extended grid to remove any excess empty space. There should be 1 row of padding between the last piece and the bottom of the grid.

### Test Suite

Write a test suite that does the following:

- Runs the generation algorithm. For example:
  - "PEANUT BUTTER IS GOOD"
    - The algorithm should generate a valid board layout.
    - The algorithm should generate 4 pieces that are 2-5 letters long each.
    - The algorithm should generate a solution that is valid.
    - The algorithm should generate a board layout that is valid.
    - The algorithm should generate a board layout that is valid.

Then the test should place all the pieces that are generated from the solution to see if the solution is valid.
It should check that the letter at each position in the grid is a valid letter. And that the final board layout matches the original phrase.

### Letter Piece Generation Algorithm

Keep an array of used letters by their position in the grid.

2. Start looking for the next letter in a scanner starting from the top left and moving right and then down once the end of the row is reached.
3. The first valid letter is the starting letter.
4. Mark the letter as used by adding it to the array of used letters.
5. Find another letter by picking a random direction from up, down, left, right. This should only be in the bounds of the grid. This should be a loop that tries all 4 directions in a clockwise manner starting with a random direction.
6. If the letter is valid (unused in itself or any other piece), add it to the piece and mark it as used.
7. Repeat until the piece is complete by reaching the random number of letters OR if the letter is 2 or more letters long and there are no more valid moves, in which case the piece is complete.
8. Start over with step 1.
9. Each letter must be at least 2 pieces long, if that's not possible, pop the stack and start over with step 1.
10. The piece must be connected via sides and not just corners.
11. Once the generation is finished, go over any stranded pieces and then connect them to the nearest piece.
12. This is done by looping over the grid and checking if any letter is not in the array of used letters. If it is not, then it is stranded.
13. If the piece is stranded, look at it's neighbors up, down, left, right. The first valid neighbor is the nearest piece and the one to connect it to.
14. Once the piece is connected to the nearest piece, mark the letter as used by adding it to the array of used letters.
15. If there are no valid neighbors, then create a new piece with just the single letter and mark it as used.
16. repeat until all pieces are connected.
