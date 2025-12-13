## Bug 1 (Fixed): Infinite loop on piece removal
The bug was that updateFromLayout only added/updated pieces but never removed pieces from the GameStateManager's internal state. So when a piece was removed from the grid due to overlap:
Grid correctly removed the piece from its items
onLayoutChange sent the new layout (missing the piece)
GameStateManager detected "piece was removed" as a change
GameStateManager called notifyUpdates but never actually deleted the piece
Parent re-rendered, effect ran again, saw same "removal" → infinite loop
Now it properly deletes pieces that are no longer in the layout.

## Bug 2 (Fixed): Identical pieces in wrong position
When a puzzle had two identical pieces (e.g., two "HE" pieces from two "THE" words), they could be validly swapped but the win condition would fail because validation only checked if each piece was at its exact solution position.

Fix: Group pieces by their "signature" (letters + shape). For identical pieces, check if the SET of placed positions matches the SET of solution positions, allowing any permutation.
