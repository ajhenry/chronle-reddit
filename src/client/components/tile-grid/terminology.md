# Terminology

These are terms used in the development of the game to make gameplay easier to understand.

- Piece Tray: The tray of pieces that the user can drag and drop onto the board.
- Phrase Area: The grid of cells that the user can place pieces onto.
- Cell: A single cell on the board. This is of any type (letter cell, dead zone, space, unused).
- Letter Cell: A single cell in the phrase area or in a piece.
- Dead Zone: A single cell in the phrase area or in a piece that does not contain any letters.
- Piece: A single piece that the user can drag and drop onto the board. This contains many cells of letters.
- Cell States:
  - Lettered Cell: A cell that contains a letter.
  - Per-filled Cell: The cell is a pre-filled letter cell.
  - Unused Cell: Cells that cannot be used to place pieces on.
- Placing a piece: The act of confirming placement of a piece on the board.
- Drag Mode: (Also called "Tap to drag") The mode in which the user needs to tap a piece to drag it. Pieces are in a draggable state until the user explicitly places them via the Place button.
- Hold to drag Mode: The more standard drag mode where users need to hold a piece in order to drag it. Upon release, the piece is placed on the board.
