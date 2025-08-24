# Match Detection Testing Guide

## How to Test Match-3 Detection

### Test 1: Basic Match Detection
1. Launch the game and enter the Game Scene
2. Shoot bubbles to create groups of 3 or more of the same color
3. Watch console for debug output:
   - "Starting match detection from bubble..."
   - "Found X connected [color] bubbles"
   - "Match detected! Removing bubbles..." (if 3+ matched)

### Test 2: Visual Feedback
When a match is detected:
1. Matched bubbles should briefly pulse and turn white (highlight effect)
2. After 200ms, bubbles should expand and fade out
3. Particle effects should appear
4. Score popup should show points earned
5. Score display at top should update

### Test 3: Combo System
1. Make multiple matches quickly (within 2 seconds)
2. Check for "COMBO x2!" text appearing
3. Verify score multiplier is applied

### Test 4: Disconnected Bubbles
1. Create a match that leaves bubbles floating
2. Verify floating bubbles fall with gravity:
   - Player zone bubbles fall down
   - Opponent zone bubbles fall up

### Debug Console Output
Enable debug mode by pressing 'D' to see:
- Grid visualization
- Bubble connections
- Zone boundaries

### Expected Behavior
✅ First shot attaches correctly
✅ Second shot attaches without overlapping
✅ 3+ same-colored connected bubbles are detected
✅ Matched bubbles are removed with animation
✅ Score is calculated and displayed
✅ Floating bubbles fall after matches

### Known Issues to Watch For
- Bubble overlapping on second shot
- Match detection not triggering
- Attachment positions incorrect

### Testing Commands
- Press 'D' for debug mode
- Press 'ESC' to return to menu
- Press 'P' to pause
- Click and drag to aim
- Release to shoot