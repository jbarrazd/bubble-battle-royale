# Story: Dual Arena Setup for 1v1 Battle

**Epic:** Core Gameplay  
**Story ID:** STORY-002  
**Priority:** High  
**Points:** 5  
**Status:** Draft

## Description

Implement the dual arena layout for 1v1 competitive bubble battles with a central objective. This creates the visual foundation for the core gameplay where two players (player vs AI initially) compete to clear a path to the central objective from opposite sides of the screen. The arena is divided into player zone (bottom), opponent zone (top), and the central objective area with surrounding bubbles.

**GDD Reference:** Objective Targeting System (GDD Lines 60-73), Core Gameplay Loop (GDD Lines 35-42)

## Acceptance Criteria

### Functional Requirements
- [ ] Arena displays with clear visual separation between player and opponent zones
- [ ] Central objective (treasure chest placeholder) renders at screen center
- [ ] Bubble formation surrounds the central objective
- [ ] Player launcher positioned at bottom center
- [ ] Opponent launcher positioned at top center (mirrored)
- [ ] Visual boundaries clearly define play areas
- [ ] Bubbles render with proper layering and depth

### Technical Requirements
- [ ] Code follows TypeScript strict mode standards
- [ ] Maintains 60 FPS on target devices
- [ ] No memory leaks or performance degradation
- [ ] Proper object pooling for bubbles (100+ on screen)
- [ ] Responsive scaling maintains arena proportions
- [ ] Z-ordering ensures correct visual hierarchy

### Game Design Requirements
- [ ] Portrait mode layout optimized for mobile (9:16)
- [ ] Central objective size is 1.5x bubble size (per GDD)
- [ ] Hexagonal bubble arrangement around objective
- [ ] Symmetrical layout ensures fair gameplay
- [ ] Visual indicators for arena zones
- [ ] Color palette distinguishes player/opponent/neutral areas

## Technical Specifications

### Files to Create/Modify

**New Files:**

- `src/scenes/GameScene.ts` - Main gameplay scene
- `src/gameObjects/Bubble.ts` - Bubble game object class
- `src/gameObjects/Launcher.ts` - Launcher game object class
- `src/gameObjects/Objective.ts` - Central objective game object
- `src/systems/gameplay/ArenaSystem.ts` - Arena layout management
- `src/systems/gameplay/BubbleGrid.ts` - Bubble grid positioning
- `src/config/ArenaConfig.ts` - Arena layout constants
- `src/types/ArenaTypes.ts` - Arena-specific type definitions

**Modified Files:**

- `src/types/GameTypes.ts` - Add arena and bubble types
- `src/config/GameConfig.ts` - Add arena-specific constants

### Class/Interface Definitions

```typescript
// ArenaTypes.ts
interface IArenaConfig {
    width: number;
    height: number;
    playerZoneHeight: number;
    opponentZoneHeight: number;
    objectiveZoneHeight: number;
    bubbleSize: number;
    objectiveSize: number;
    launcherOffset: number;
}

interface IBubbleData {
    gridX: number;
    gridY: number;
    color: BubbleColor;
    isSpecial: boolean;
}

enum BubbleColor {
    RED = 0xff0000,
    BLUE = 0x0000ff,
    GREEN = 0x00ff00,
    YELLOW = 0xffff00,
    PURPLE = 0xff00ff
}

enum ArenaZone {
    PLAYER = 'player',
    OPPONENT = 'opponent',
    OBJECTIVE = 'objective',
    NEUTRAL = 'neutral'
}

// Bubble.ts
class Bubble extends Phaser.GameObjects.Container {
    private bubbleSprite: Phaser.GameObjects.Arc;
    private gridPosition: { x: number; y: number };
    public color: BubbleColor;
    
    constructor(scene: Phaser.Scene, x: number, y: number, color: BubbleColor) {
        // Initialize bubble with color and position
    }
    
    public setGridPosition(gridX: number, gridY: number): void {
        // Set hexagonal grid position
    }
}

// ArenaSystem.ts
class ArenaSystem {
    private scene: Phaser.Scene;
    private config: IArenaConfig;
    private bubbleGrid: BubbleGrid;
    private objective: Objective;
    private playerLauncher: Launcher;
    private opponentLauncher: Launcher;
    
    constructor(scene: Phaser.Scene) {
        // Initialize arena layout
    }
    
    public setupArena(): void {
        // Create zones and initial bubble formation
    }
    
    public getZoneBounds(zone: ArenaZone): Phaser.Geom.Rectangle {
        // Return bounds for specific zone
    }
}
```

### Integration Points

**Scene Integration:**

- GameScene: Primary scene for gameplay, manages arena system
- Transition from MenuScene with proper data passing

**System Dependencies:**

- ArenaSystem: Central hub for all arena-related logic
- BubbleGrid: Manages hexagonal positioning calculations
- SceneManager: Handle transitions to/from GameScene

**Event Communication:**

- Emits: `arena-ready` when setup complete
- Emits: `bubble-added` when new bubble placed
- Listens: `scene-transition` for cleanup

## Implementation Tasks

### Dev Agent Record

**Tasks:**

- [ ] Create GameScene with basic structure
- [ ] Implement ArenaSystem with zone definitions
- [ ] Create Bubble game object with color system
- [ ] Implement Launcher game object for both players
- [ ] Create Objective game object with visual indicator
- [ ] Implement BubbleGrid for hexagonal positioning
- [ ] Setup initial bubble formation around objective
- [ ] Add visual zone separators/boundaries
- [ ] Configure proper z-ordering for all elements
- [ ] Implement responsive scaling for arena
- [ ] Add debug visualization for zones
- [ ] Create ArenaConfig with all constants
- [ ] Add arena-specific TypeScript types
- [ ] Test object pooling with 100+ bubbles
- [ ] Verify 60 FPS performance
- [ ] Add transition from MenuScene

**Debug Log:**
| Task | File | Change | Reverted? |
|------|------|--------|-----------|
| | | | |

**Completion Notes:**

<!-- Only note deviations from requirements, keep under 50 words -->

**Change Log:**

<!-- Only requirement changes during implementation -->

## Game Design Context

**GDD Reference:** Objective Targeting System (Lines 60-73)

**Game Mechanic:** Central objective with protective bubble layers

**Player Experience Goal:** Clear visual understanding of competitive arena layout

**Balance Parameters:**

- Bubble size: 32 pixels
- Objective size: 48 pixels (1.5x bubble)
- Arena split: 40% player, 40% opponent, 20% objective
- Launcher position: 50 pixels from screen edge
- Grid spacing: Hexagonal with 2-pixel gaps

## Testing Requirements

### Unit Tests

**Test Files:**

- `tests/unit/ArenaSystem.test.ts`
- `tests/unit/BubbleGrid.test.ts`
- `tests/unit/Bubble.test.ts`

**Test Scenarios:**

- Zone boundary calculations correct
- Hexagonal grid positions accurate
- Bubble color assignment works
- Object pooling handles 100+ bubbles
- Z-ordering maintains visual hierarchy

### Game Testing

**Manual Test Cases:**

1. Arena Layout Test

   - Expected: Three distinct zones visible
   - Performance: Maintains 60 FPS

2. Bubble Formation Test
   - Expected: Hexagonal arrangement around objective
   - Edge Case: Different screen resolutions maintain layout

### Performance Tests

**Metrics to Verify:**

- Frame rate maintains 60 FPS with 100+ bubbles
- Memory usage stays under 200MB
- Object pool efficiently reuses bubble instances
- No performance degradation over 5-minute session

## Dependencies

**Story Dependencies:**

- STORY-001: Project Setup & Architecture (COMPLETED)

**Technical Dependencies:**

- Phaser 3 arcade physics system
- Base game scenes and systems from STORY-001

**Asset Dependencies:**

- Bubble sprites (placeholder): `assets/images/bubbles/`
- Objective sprite (placeholder): `assets/images/objectives/`
- Launcher sprite (placeholder): `assets/images/launcher.png`

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Performance targets met
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Visual layout matches design specifications
- [ ] Transitions smoothly from MenuScene

## Notes

**Implementation Notes:**

- Start with static bubble formation (no physics yet)
- Use simple colored circles for initial bubbles
- Objective can be a simple star or chest icon
- Focus on correct layout and visual hierarchy

**Design Decisions:**

- Hexagonal grid: More authentic bubble shooter feel
- Zone separation: Visual clarity for competitive play
- Object pooling early: Prevent performance issues later

**Future Considerations:**

- Network synchronization points for multiplayer
- Different arena themes (pirate, space, fantasy)
- Dynamic bubble formations for different difficulty levels
- Power-up spawn locations in neutral zones