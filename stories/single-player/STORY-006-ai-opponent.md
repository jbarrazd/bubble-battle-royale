# STORY-006: AI Opponent Basic Shooting System

## Story Details
- **ID**: STORY-006
- **Type**: Feature
- **Priority**: MEDIUM
- **Points**: 13
- **Epic**: Single Player Mode
- **Sprint**: Next Available

## Description
Implement an AI-controlled opponent that shoots bubbles from the top launcher in single player mode. The system should support multiple difficulty levels with progressively smarter targeting algorithms and variable decision timing. Architecture must be modular and reusable for potential multiplayer integration.

## Context

### Current Game State
- Grid attachment system working (STORY-004)
- Match-3 detection operational (STORY-005)
- Bidirectional gravity implemented
- Player shooting from bottom launcher works
- Opponent launcher exists but not functional

### Technical Requirements
- Reuse existing ShootingSystem for consistency
- Modular architecture for easy multiplayer swap
- Efficient decision-making algorithms
- Progressive difficulty system

## User Story
**As a** player,  
**I want** to play against a computer opponent in single player mode,  
**So that** I can practice and enjoy the game offline without requiring another player.

## Acceptance Criteria

### AC1: AI Activation
- **Given** Single player mode is selected
- **When** Game starts
- **Then** AI opponent begins shooting bubbles from top launcher

### AC2: AI Decision Timing
- **Given** AI opponent's turn
- **When** Decision time based on difficulty
  - Easy: 3 seconds
  - Medium: 2 seconds  
  - Hard: 1 second
- **Then** AI selects target and shoots bubble

### AC3: AI Targeting Behavior
- **Given** AI is targeting
- **When** Making shot decision
- **Then** Behavior varies by difficulty:
  - **Easy**: 70% random, 30% match attempt
  - **Medium**: 30% random, 50% match, 20% strategic block
  - **Hard**: 10% random, 60% match, 30% optimal play

### AC4: Shot Physics
- **Given** AI shoots a bubble
- **When** Bubble travels and attaches
- **Then** Same physics and attachment rules as player shots

### AC5: Match Detection
- **Given** AI creates matches
- **When** 3+ bubbles connect
- **Then** Standard match detection and scoring applies

### AC6: Difficulty Selection
- **Given** Multiple difficulty levels available
- **When** Player selects difficulty
- **Then** AI behavior adjusts accordingly

## Technical Details

### Architecture
- AIOpponentSystem class extends base controller
- Interfaces with existing ShootingSystem
- Strategy pattern for difficulty behaviors
- Observable pattern for turn management

### Components
1. **AIController**: Main AI logic orchestrator
2. **TargetSelector**: Analyzes grid and selects targets
3. **DifficultyManager**: Handles behavior per level
4. **DecisionTimer**: Manages shooting intervals

### Algorithms

#### Easy Mode
- 70% random valid positions
- 30% attempt to match existing colors
- 3 second decision time

#### Medium Mode
- Analyzes top 3 color frequencies
- Targets potential matches
- Occasionally blocks player matches
- 2 second decision time

#### Hard Mode
- Full grid analysis
- Minimax-style decision making
- Prioritizes offensive and defensive plays
- 1 second decision time

### Integration Points
- `ShootingSystem.shoot()` for projectile launch
- `GridAttachmentSystem` for collision detection
- `BubbleGrid.getValidTargets()` for position analysis
- `TurnManager` for player/AI alternation

## Implementation Notes
1. Start with AIOpponentSystem class in `src/systems/gameplay/`
2. Implement basic shooting first (Easy mode)
3. Layer in targeting intelligence progressively
4. Ensure clean separation for future multiplayer swap
5. Use dependency injection for testability
6. Performance: Cache grid analysis results when possible

## Dependencies
- ShootingSystem (existing)
- GridAttachmentSystem (existing)
- BubbleGrid (existing)
- TurnManager (new - may need creation)

## Risks
- AI decision time might feel too fast/slow
- Difficulty balance might need tuning
- Performance impact of grid analysis

## Testing Requirements
- Unit tests for each difficulty algorithm
- Integration tests for AI shooting flow
- Performance tests for decision-making speed
- Gameplay tests for difficulty balance

## Definition of Done
- [ ] AI shoots bubbles from opponent launcher
- [ ] Three difficulty levels implemented
- [ ] Decision timing varies by difficulty
- [ ] AI respects all game rules
- [ ] Modular architecture for multiplayer swap
- [ ] No performance degradation
- [ ] Unit tests passing
- [ ] Code reviewed and documented

## Notes
Created for single player mode with consideration for future multiplayer integration. The AI system should be easily swappable with network player input when implementing PvP functionality.