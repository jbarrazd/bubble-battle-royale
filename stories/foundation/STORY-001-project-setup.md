# Story: Project Setup & Architecture Foundation

**Epic:** Foundation  
**Story ID:** STORY-001  
**Priority:** High  
**Points:** 5  
**Status:** Draft

## Description

Initialize the Bubble Battle Royale project with Phaser 3, TypeScript, and Firebase integration following the architecture defined in the Game Architecture Document. This story establishes the foundational project structure, build configuration, and core systems initialization that all future development will build upon. This implements the technical foundation described in the Game Brief's Technical Specifications section.

**GDD Reference:** Technical Specifications (Game Brief - Lines 89-98)

## Acceptance Criteria

### Functional Requirements
- [ ] Project initializes and runs showing a basic Phaser scene
- [ ] Development server starts with hot module replacement
- [ ] Production build generates optimized assets
- [ ] Basic scene navigation works (Boot → Preload → Menu)
- [ ] TypeScript compilation succeeds with strict mode

### Technical Requirements
- [ ] Code follows TypeScript strict mode standards
- [ ] Maintains 60 FPS on target devices
- [ ] No memory leaks or performance degradation
- [ ] Vite build configuration optimized for mobile
- [ ] Firebase SDK integrated but not yet connected
- [ ] All dependencies use exact versions for consistency

### Game Design Requirements
- [ ] Portrait mode orientation enforced (9:16 aspect ratio)
- [ ] Mobile-first responsive scaling implemented
- [ ] Base resolution supports iPhone 8 minimum (375x667)
- [ ] Performance monitoring system active

## Technical Specifications

### Files to Create/Modify

**New Files:**

- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript strict mode configuration
- `vite.config.ts` - Vite build configuration
- `.env.example` - Firebase configuration template
- `src/main.ts` - Application entry point
- `src/config/GameConfig.ts` - Phaser game configuration
- `src/scenes/BootScene.ts` - Initial boot scene
- `src/scenes/PreloadScene.ts` - Asset preloading scene
- `src/scenes/MenuScene.ts` - Main menu placeholder
- `src/systems/core/SceneManager.ts` - Scene transition management
- `src/utils/PerformanceMonitor.ts` - FPS and performance tracking
- `src/utils/DeviceDetection.ts` - Device capability detection
- `src/types/GameTypes.ts` - Core TypeScript type definitions
- `src/config/AssetManifest.ts` - Asset loading configuration
- `index.html` - Game container HTML

### Class/Interface Definitions

```typescript
// GameConfig interface
interface IGameConfig {
    width: number;
    height: number;
    type: number;
    parent: string;
    backgroundColor: string;
    scale: {
        mode: Phaser.Scale.ScaleModes;
        autoCenter: Phaser.Scale.Center;
        width: number;
        height: number;
    };
    physics: {
        default: string;
        arcade: {
            gravity: { x: number; y: number };
            debug: boolean;
        };
    };
    scene: Phaser.Scene[];
}

// SceneManager class
class SceneManager {
    private game: Phaser.Game;
    private currentScene: string;
    private transitionInProgress: boolean;

    constructor(game: Phaser.Game) {
        // Initialize scene management
    }

    public transitionTo(sceneName: string, data?: object): void {
        // Handle scene transitions with data passing
    }

    public getCurrentScene(): string {
        // Return current active scene
    }
}

// PerformanceMonitor class
class PerformanceMonitor {
    private fps: number;
    private frameTime: number;
    private lastTime: number;

    constructor() {
        // Initialize monitoring
    }

    public update(time: number): void {
        // Update performance metrics
    }

    public getFPS(): number {
        // Return current FPS
    }

    public shouldReduceQuality(): boolean {
        // Check if quality reduction needed
    }
}
```

### Integration Points

**Scene Integration:**

- BootScene: Initialize core systems and device detection
- PreloadScene: Load essential assets and show loading progress
- MenuScene: Entry point for game navigation

**System Dependencies:**

- SceneManager: Central hub for all scene transitions
- PerformanceMonitor: Continuous monitoring from game start
- DeviceDetection: Run once during boot to set quality presets

**Event Communication:**

- Emits: `scene-ready` when scene fully loaded
- Emits: `performance-warning` when FPS drops below 30
- Listens: `scene-transition` to change scenes

## Implementation Tasks

### Dev Agent Record

**Tasks:**

- [ ] Initialize npm project with TypeScript and Phaser 3 dependencies
- [ ] Configure TypeScript with strict mode and proper paths
- [ ] Set up Vite build configuration for development and production
- [ ] Create base HTML template with mobile viewport settings
- [ ] Implement main.ts entry point with Phaser game initialization
- [ ] Create GameConfig with portrait mode and mobile scaling
- [ ] Implement BootScene with basic initialization logic
- [ ] Implement PreloadScene with asset loading structure
- [ ] Create placeholder MenuScene with basic UI
- [ ] Implement SceneManager for scene transitions
- [ ] Create PerformanceMonitor for FPS tracking
- [ ] Implement DeviceDetection for capability checking
- [ ] Set up TypeScript type definitions for game objects
- [ ] Configure Firebase SDK (without initialization)
- [ ] Write unit tests for SceneManager
- [ ] Write unit tests for PerformanceMonitor
- [ ] Integration testing with scene transitions
- [ ] Performance testing on mobile viewport

**Debug Log:**
| Task | File | Change | Reverted? |
|------|------|--------|-----------|
| | | | |

**Completion Notes:**

<!-- Only note deviations from requirements, keep under 50 words -->

**Change Log:**

<!-- Only requirement changes during implementation -->

## Game Design Context

**GDD Reference:** Technical Architecture (Architecture Document - Lines 18-55)

**Game Mechanic:** Foundation Systems

**Player Experience Goal:** Instant game loading with smooth 60 FPS performance

**Balance Parameters:**

- Target FPS: 60
- Maximum memory usage: 150MB
- Scene transition time: <300ms
- Asset loading timeout: 10 seconds

## Testing Requirements

### Unit Tests

**Test Files:**

- `tests/unit/SceneManager.test.ts`
- `tests/unit/PerformanceMonitor.test.ts`
- `tests/unit/DeviceDetection.test.ts`

**Test Scenarios:**

- Scene transition with data passing
- Performance monitor FPS calculation accuracy
- Device detection for various user agents
- Memory cleanup after scene changes

### Game Testing

**Manual Test Cases:**

1. Application Launch Test

   - Expected: Game loads within 3 seconds
   - Performance: Maintains 60 FPS on boot

2. Scene Navigation Test
   - Expected: Smooth transitions between all scenes
   - Edge Case: Rapid scene switching doesn't break state

### Performance Tests

**Metrics to Verify:**

- Frame rate maintains 60 FPS
- Memory usage stays under 150MB
- Initial load time under 3 seconds
- No memory leaks during scene transitions

## Dependencies

**Story Dependencies:**

- None (this is the foundation story)

**Technical Dependencies:**

- Node.js 18+ installed
- Modern web browser with WebGL support

**Asset Dependencies:**

- Placeholder logo: `assets/images/logo-placeholder.png`
- Location: `assets/images/`

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Performance targets met
- [ ] No linting errors
- [ ] Documentation updated
- [ ] README.md created with setup instructions
- [ ] Development environment verified on Mac/Windows/Linux

## Notes

**Implementation Notes:**

- Use pnpm for faster dependency installation
- Configure VS Code with recommended extensions
- Set up pre-commit hooks for linting
- Enable source maps for debugging

**Design Decisions:**

- Vite chosen over Webpack: Faster HMR and simpler configuration
- TypeScript strict mode: Catch errors early in development
- Scene-based architecture: Clean separation of game states

**Future Considerations:**

- Add PWA support for installable web app
- Implement service worker for offline caching
- Add Sentry error tracking for production
- Consider WebGPU support for future optimization