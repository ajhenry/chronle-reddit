The bug was that updateFromLayout only added/updated pieces but never removed pieces from the GameStateManager's internal state. So when a piece was removed from the grid due to overlap:
Grid correctly removed the piece from its items
onLayoutChange sent the new layout (missing the piece)
GameStateManager detected "piece was removed" as a change
GameStateManager called notifyUpdates but never actually deleted the piece
Parent re-rendered, effect ran again, saw same "removal" → infinite loop
Now it properly deletes pieces that are no longer in the layout. Please test again!
