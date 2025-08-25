# STORY-009: Mystery Bubble & Power-Up System

## Story Points: 5

## Description
Implement the Mystery Bubble system where special bubbles contain random power-ups that are revealed only upon collection. Power-ups provide various strategic advantages including the essential Rainbow bubble (matches any color) and Laser Sight (extended aiming). Each power-up has unique aiming modes and mechanics, with some capable of attacking the opponent's castle directly through ballistic trajectories.

## Epic Reference
**Epic:** Core Gameplay Systems
**Dependencies:** 
- STORY-004: Bubble Grid Attachment (COMPLETED)
- STORY-008: AAA Score & Combo System (COMPLETED)
- PowerUpManager base structure (COMPLETED)

## Acceptance Criteria

### Functional Requirements
- [ ] Mystery bubbles spawn randomly in grid (10-15% spawn rate)
- [ ] Mystery bubbles have distinctive "?" visual with rainbow shimmer effect
- [ ] Breaking mystery bubbles drops a mystery box that floats for 3 seconds
- [ ] Mystery box auto-collects when passing player's launcher area
- [ ] Power-up type revealed with dramatic animation upon collection
- [ ] Each power-up has unique aiming mode that replaces crosshair:
  - [ ] **Rainbow**: Normal aim, bubble shows multicolor effect
  - [ ] **Laser Sight**: Extended trajectory line showing all bounces
  - [ ] **Bomb**: Radius preview OR ballistic arc to castle
  - [ ] **Lightning**: Cursor changes to selection mode
  - [ ] **Freeze**: Snowflake indicator shows area effect
  - [ ] **Multi-shot**: Triple arrow showing spread pattern
- [ ] Maximum 3 power-ups stored in inventory
- [ ] Power-up activation via number keys (1-3) or touch buttons
- [ ] Visual feedback shows which power-up is active

### Technical Requirements
- [ ] Create MysteryBubble class with animated "?" symbol
- [ ] Implement MysteryBox drop with countdown timer
- [ ] Create AimingModeSystem for different crosshair types
- [ ] Implement reveal animation with rarity effects
- [ ] Add click-to-target system for Lightning
- [ ] Create ballistic trajectory for Bomb castle attacks
- [ ] Implement multicolor shader for Rainbow bubble
- [ ] Add trajectory prediction for Laser Sight
- [ ] Object pooling for all visual effects

### Game Design Requirements
- [ ] Power-up distribution rates:
  - [ ] Rainbow: 25% (most common, essential tool)
  - [ ] Laser Sight: 15% (basic helper)
  - [ ] Bomb: 20% (versatile)
  - [ ] Lightning: 20% (strategic)
  - [ ] Freeze: 10% (powerful)
  - [ ] Multi-shot: 10% (rare)
- [ ] Mystery aspect creates risk/reward decisions
- [ ] No instant-win mechanics
- [ ] Visual clarity for each aiming mode
- [ ] 3-second collection timer adds urgency

## Technical Specifications

### Files to Create
```
src/gameObjects/MysteryBubble.ts
src/gameObjects/MysteryBox.ts
src/systems/powerups/AimingModeSystem.ts
src/systems/powerups/PowerUpEffectsLibrary.ts
src/ui/PowerUpInventoryUI.ts
src/effects/PowerUpVisualEffects.ts
```

### Files to Modify
```
src/systems/gameplay/ArenaSystem.ts - Integrate aiming modes
src/systems/powerups/PowerUpManager.ts - Implement all effects
src/systems/input/InputManager.ts - Add mode-specific input
src/gameObjects/Launcher.ts - Support castle attacks
src/gameObjects/Bubble.ts - Add multicolor support
```

### Key Interfaces & Classes
```typescript
// AimingModeSystem.ts
export enum AimingMode {
    NORMAL = 'crosshair',
    RAINBOW = 'rainbow_sphere',
    LASER = 'extended_line',
    BOMB_NORMAL = 'explosion_radius',
    BOMB_BALLISTIC = 'ballistic_arc',
    LIGHTNING = 'selection_cursor',
    FREEZE = 'snowflake_area',
    MULTI = 'triple_arrow'
}

export class AimingModeSystem {
    private currentMode: AimingMode = AimingMode.NORMAL;
    private aimingGraphics: Phaser.GameObjects.Graphics;
    private trajectoryPreview?: Phaser.Geom.Curve;
    
    public setMode(mode: AimingMode, powerUp?: PowerUpType): void;
    public updateAiming(pointerPos: Point): void;
    public getTargetingData(): TargetingInfo;
    private drawCrosshair(x: number, y: number): void;
    private drawBallisticArc(from: Point, to: Point): void;
    private drawSelectionCursor(x: number, y: number): void;
}

// PowerUpEffectsLibrary.ts
export class RainbowEffect implements IPowerUpEffect {
    type = PowerUpType.RAINBOW;
    
    activate(context: PowerUpContext): void {
        const nextBubble = context.launcher.getNextBubble();
        nextBubble.setMulticolor(true);
        nextBubble.addRainbowShader();
        context.shotsRemaining = 1;
    }
}

export class LaserSightEffect implements IPowerUpEffect {
    type = PowerUpType.LASER_SIGHT;
    
    activate(context: PowerUpContext): void {
        context.aimingMode.setMode(AimingMode.LASER);
        context.aimingMode.showExtendedTrajectory(true);
        context.shotsRemaining = 5; // 5 shots with enhanced aim
    }
}

export class BombEffect implements IPowerUpEffect {
    type = PowerUpType.BOMB;
    
    activate(context: PowerUpContext): void {
        // Player chooses: normal shot or castle attack
        if (context.targetMode === TargetMode.CASTLE) {
            context.aimingMode.setMode(AimingMode.BOMB_BALLISTIC);
            this.prepareBallistic(context);
        } else {
            context.aimingMode.setMode(AimingMode.BOMB_NORMAL);
            this.prepareNormalBomb(context);
        }
    }
    
    private prepareNormalBomb(context: PowerUpContext): void {
        const nextBubble = context.launcher.getNextBubble();
        nextBubble.setBombMode(true, 7); // 7 bubble radius
    }
    
    private prepareBallistic(context: PowerUpContext): void {
        // Changes shooting to ballistic arc
        context.launcher.setBallisticMode(true);
        context.launcher.setTarget(context.opponentCastle);
    }
}

export class LightningEffect implements IPowerUpEffect {
    type = PowerUpType.LIGHTNING;
    
    activate(context: PowerUpContext): void {
        context.aimingMode.setMode(AimingMode.LIGHTNING);
        context.inputMode = InputMode.SELECTION;
        
        // Wait for bubble selection
        context.scene.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const bubble = this.getBubbleAtPosition(pointer.x, pointer.y);
            if (bubble) {
                this.destroyBubble(bubble);
                context.complete();
            }
        });
    }
    
    private getBubbleAtPosition(x: number, y: number): Bubble | null {
        // Raycast to find bubble
        return context.bubbleGrid.getBubbleAt(x, y);
    }
}

export class FreezeEffect implements IPowerUpEffect {
    type = PowerUpType.FREEZE;
    
    activate(context: PowerUpContext): void {
        context.aimingMode.setMode(AimingMode.FREEZE);
        
        // Freeze physics for 5 seconds
        context.scene.physics.world.pause();
        context.bubbleGrid.setFrozen(true);
        
        // Visual effect
        this.createFrostOverlay(context.scene);
        
        // Resume after 5 seconds
        context.scene.time.delayedCall(5000, () => {
            context.scene.physics.world.resume();
            context.bubbleGrid.setFrozen(false);
            this.removeFrostOverlay();
        });
    }
}

export class MultiShotEffect implements IPowerUpEffect {
    type = PowerUpType.MULTI_SHOT;
    
    activate(context: PowerUpContext): void {
        context.aimingMode.setMode(AimingMode.MULTI);
        
        // Prepare 3 bubbles
        const angles = [-15, 0, 15];
        const bubbles = angles.map(angle => {
            const bubble = context.launcher.createBubble();
            bubble.setLaunchAngle(context.baseAngle + angle);
            return bubble;
        });
        
        // Launch simultaneously
        context.launcher.launchMultiple(bubbles);
    }
}

// MysteryBubble.ts
export class MysteryBubble extends Bubble {
    private questionMark: Phaser.GameObjects.Text;
    private shimmerEffect: Phaser.GameObjects.Graphics;
    private glowRadius: number = 30;
    
    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, BubbleColor.MYSTERY);
        this.createMysteryVisuals();
    }
    
    private createMysteryVisuals(): void {
        // Question mark
        this.questionMark = this.scene.add.text(0, 0, '?', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFD700'
        });
        this.questionMark.setOrigin(0.5);
        this.add(this.questionMark);
        
        // Rainbow shimmer
        this.shimmerEffect = this.scene.add.graphics();
        this.add(this.shimmerEffect);
        
        // Rotation animation
        this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 8000,
            repeat: -1
        });
    }
    
    public dropMysteryBox(): MysteryBox {
        const box = new MysteryBox(this.scene, this.x, this.y);
        box.setRandomPowerUp(this.getWeightedRandom());
        return box;
    }
    
    private getWeightedRandom(): PowerUpType {
        const weights = {
            [PowerUpType.RAINBOW]: 25,
            [PowerUpType.LASER_SIGHT]: 15,
            [PowerUpType.BOMB]: 20,
            [PowerUpType.LIGHTNING]: 20,
            [PowerUpType.FREEZE]: 10,
            [PowerUpType.MULTI_SHOT]: 10
        };
        // Weighted random selection logic
        return this.selectWeighted(weights);
    }
}
```

### Integration Points
- **BubbleGrid**: Spawn mystery bubbles during initialization
- **MatchDetectionSystem**: Trigger mystery box drops
- **InputManager**: Handle mode-specific inputs (click for Lightning)
- **Launcher**: Support different shooting modes
- **CastleSystem**: Receive bomb attacks (STORY-010)
- **ScoreEventManager**: Award bonus points for power-up usage

## Implementation Tasks

### Phase 1: Mystery Bubble System (2 hours)
1. Create MysteryBubble with "?" animation
2. Implement rainbow shimmer effect
3. Add rotation animation
4. Create spawn logic with 10-15% rate
5. Test visual distinction

### Phase 2: Mystery Box & Reveal (1.5 hours)
1. Create MysteryBox drop system
2. Implement 3-second float timer
3. Add countdown visual
4. Create reveal animation
5. Implement weighted random selection

### Phase 3: Aiming Mode System (2 hours)
1. Create AimingModeSystem class
2. Implement crosshair variants for each power-up
3. Add mode switching logic
4. Create visual transitions between modes
5. Test input handling per mode

### Phase 4: Basic Power-Ups (2 hours)
1. **Rainbow**: Multicolor bubble implementation
2. **Laser Sight**: Extended trajectory preview
3. Add visual effects for both
4. Test shooting mechanics
5. Implement shot counters

### Phase 5: Intermediate Power-Ups (2 hours)
1. **Bomb**: Normal explosion + ballistic mode
2. **Lightning**: Click-to-destroy selection
3. Add explosion effects
4. Implement target detection
5. Test damage calculations

### Phase 6: Advanced Power-Ups (1.5 hours)
1. **Freeze**: Physics pause implementation
2. **Multi-shot**: Triple bubble spread
3. Add frost overlay effect
4. Test simultaneous shooting
5. Balance timing and angles

## Testing Requirements

### Unit Tests
- [ ] Mystery bubble spawn rate: 10-15%
- [ ] Power-up distribution matches percentages
- [ ] Each aiming mode renders correctly
- [ ] Rainbow bubble matches any color
- [ ] Bomb explosion radius accurate
- [ ] Lightning selection works properly
- [ ] Freeze duration exactly 5 seconds

### Integration Tests
- [ ] Mystery boxes drop when bubbles destroyed
- [ ] Auto-collection near launcher works
- [ ] Power-up inventory management (3 max)
- [ ] Aiming modes switch correctly
- [ ] Castle attacks register damage (with STORY-010)
- [ ] Input modes change appropriately

### Balance Tests
- [ ] No power-up creates instant-win
- [ ] Rainbow frequency feels right (25%)
- [ ] Collection risk/reward balanced
- [ ] All power-ups feel useful
- [ ] Castle attacks not overpowered

### Performance Tests
- [ ] 60 FPS with multiple effects
- [ ] Object pooling prevents memory leaks
- [ ] Smooth aiming mode transitions
- [ ] Mobile touch responsive

## Dependencies
- PowerUpManager base (COMPLETED)
- Bubble physics system (COMPLETED)
- Will integrate with: STORY-010 (Castle System)

## Definition of Done
- [ ] All acceptance criteria met
- [ ] Mystery bubbles visually distinctive
- [ ] Each power-up has unique aiming mode
- [ ] Rainbow and Laser Sight feel essential
- [ ] Bomb can attack bubbles or castle
- [ ] Lightning selection intuitive
- [ ] No balance issues identified
- [ ] Performance targets met (60 FPS)
- [ ] Code review completed
- [ ] Unit tests passing
- [ ] Mobile tested
- [ ] Documentation updated
- [ ] Merged to main branch

## Notes
- Rainbow is the most common (25%) as it's the essential "get out of trouble" tool
- Laser Sight (15%) helps new players with aiming
- Bomb versatility (bubbles or castle) adds strategic depth
- Lightning requires skill to use effectively
- Mystery aspect adds excitement to every drop
- Castle attacks will fully integrate with STORY-010

## Risk Factors
- **Complexity**: Multiple aiming modes might confuse players
- **Balance**: Power-up frequency might need tuning
- **Performance**: Multiple simultaneous effects
- **Input**: Mode switching might feel clunky

## Mitigation Strategies
- Clear visual feedback for each mode
- Make distribution rates easily configurable
- Aggressive object pooling
- Smooth transitions with clear indicators