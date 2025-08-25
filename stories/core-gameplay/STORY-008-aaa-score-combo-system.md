# USER STORY: Enhanced Scoring Display with AAA Combo System

## Story Metadata
- **Story ID**: STORY-008
- **Created**: 2024-12-24
- **Priority**: HIGH
- **Story Points**: 8
- **Sprint**: Current
- **Status**: Ready for Development

## User Story Statement
**AS A** Player  
**I WANT** to see separate, visually impressive score displays for myself and my opponent with exciting combo feedback  
**SO THAT** I can track competitive progress and feel rewarded for skillful play

## Acceptance Criteria

✅ **GIVEN** the game is in progress  
**WHEN** either player scores points  
**THEN** their respective score display updates with smooth animation

✅ **GIVEN** a player creates a match  
**WHEN** they match exactly 3 bubbles  
**THEN** they receive 100 base points + combo text "COMBO x1!"

✅ **GIVEN** a player creates a match  
**WHEN** they match 4 bubbles  
**THEN** they receive 150 base points + combo text "COMBO x2!"

✅ **GIVEN** a player creates a match  
**WHEN** they match 5+ bubbles  
**THEN** they receive escalating points with multipliers:
- 5 bubbles: 225 points + "COMBO x3!"
- 6 bubbles: 325 points + "SUPER COMBO!"
- 7+ bubbles: 500+ points + "MEGA COMBO!"

✅ **GIVEN** multiple matches in quick succession  
**WHEN** matches occur within 2 seconds  
**THEN** combo multiplier increases (1.5x, 2x, 2.5x, etc.)

## Technical Requirements

### Score Display Components
```typescript
// Dual score display positioning
interface ScoreDisplayConfig {
  player: {
    position: 'bottom-left',
    avatar: 'player-icon.png',
    color: '#00FF00'
  },
  opponent: {
    position: 'top-right',
    avatar: 'ai-icon.png',
    color: '#FF0000'
  },
  combo: {
    position: 'center',
    floatingNumbers: true,
    particleEffects: true
  }
}
```

### Visual Effects (AAA Quality)

#### 1. Score Updates
- Smooth number rolling animation (CountUp.js style)
- Glow pulse on score increase
- Particle burst on big scores (100+ particles)
- Screen shake on mega combos (intensity: 0.01, duration: 200ms)

#### 2. Combo Display Effects
- **Scale bounce animation**: 0 → 1.5 → 1.0 (elastic ease)
- **Color gradient based on combo level**
- **Particle trail effects**: Gold → Rainbow
- **Sound escalation**: Pitch increases per tier

#### 3. Scoring Formula
```javascript
// Base Points System
const BASE_POINTS = {
  3: 100,   // Standard match
  4: 150,   // Good match
  5: 225,   // Great match
  6: 325,   // Excellent match
  7: 500    // Perfect match
};

// Combo Multipliers
const COMBO_MULTIPLIERS = {
  'COMBO x1': 1.0,
  'COMBO x2': 1.5,
  'COMBO x3': 2.0,
  'SUPER COMBO': 2.5,
  'MEGA COMBO': 3.0
};

// Chain Bonus (successive matches within 2 seconds)
const CHAIN_BONUS = {
  2: 1.25,  // +25%
  3: 1.50,  // +50%
  4: 2.00   // +100%
};

// Final calculation
finalScore = basePoints * comboMultiplier * chainBonus;
```

## Implementation Tasks

### Phase 1: Core Systems
- [ ] Create `EnhancedScoreDisplay` component extending existing `ScoreDisplay`
- [ ] Implement `ComboManager` system for tracking combos
- [ ] Add `FloatingTextSystem` for damage numbers
- [ ] Create `ComboTier` enum and configuration

### Phase 2: Visual Effects
- [ ] Implement particle effects using Phaser's particle system
- [ ] Add screen shake manager for big combos
- [ ] Create score animation tweens (number rolling)
- [ ] Implement color gradient system for combo text

### Phase 3: Audio & Polish
- [ ] Add combo sound effects with pitch scaling
- [ ] Implement combo timer system (2-second window)
- [ ] Create visual feedback hierarchy
- [ ] Add celebration effects for mega combos

## UI/UX Specifications

### Score Display Layout
```
┌─────────────────────────────────────────┐
│  ┌──────────────┐                       │
│  │ AI: 2,450 🤖 │  ← Opponent Score     │
│  └──────────────┘                       │
│                                          │
│           ✨ MEGA COMBO! ✨              │  ← Center Combo
│              x3.0                        │
│            ⭐⭐⭐⭐⭐                      │
│             +1500                        │  ← Floating Points
│                                          │
│  ┌──────────────┐                       │
│  │ 👤 You: 3,825│  ← Player Score       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

### Combo Tiers & Visual Specifications

| Combo Level | Points | Color | Effects |
|------------|--------|-------|---------|
| COMBO x1 | 100 | Gold (#FFD700) | Subtle glow |
| COMBO x2 | 150 | Orange (#FFA500) | Medium glow + sparkles |
| COMBO x3 | 225 | Red (#FF4500) | Strong glow + fire particles |
| SUPER COMBO | 325 | Purple (#9400D3) | Rainbow shimmer + rotation |
| MEGA COMBO | 500+ | Rainbow Gradient | Screen effects + explosions |

### Animation Timings
```typescript
const ANIMATION_CONFIG = {
  scoreRoll: 500,        // ms for number animation
  comboAppear: 200,      // ms for combo text to appear
  comboStay: 1500,       // ms for combo text to remain
  comboFade: 300,        // ms for combo text to fade
  particleDuration: 1000, // ms for particle effects
  shakeIntensity: {
    small: 0.002,
    medium: 0.005,
    large: 0.01
  }
};
```

## Definition of Done

- [ ] Both score displays (player/opponent) update in real-time
- [ ] Combo system triggers correctly for all match sizes (3-7+)
- [ ] Visual effects maintain 60 FPS on target devices
- [ ] Sound effects perfectly sync with visual feedback
- [ ] Score persistence works between rounds
- [ ] Animations don't interfere with gameplay input
- [ ] Mobile performance remains optimal (< 16ms frame time)
- [ ] Code is fully documented with JSDoc comments
- [ ] Unit tests cover scoring calculations
- [ ] Integration tests verify combo triggers

## Test Scenarios

### Functional Tests
1. **Basic Scoring**
   - Verify 3-bubble match = 100 points
   - Verify 4-bubble match = 150 points
   - Verify 5-bubble match = 225 points
   - Verify 6-bubble match = 325 points
   - Verify 7+ bubble match = 500+ points

2. **Combo System**
   - Test combo multiplier stacking
   - Verify 2-second window for chains
   - Test maximum combo cap (if any)
   - Verify combo reset after timeout

3. **Visual Feedback**
   - Verify all animations trigger
   - Test particle system performance
   - Verify screen shake intensity scales
   - Test floating number positioning

4. **Edge Cases**
   - Simultaneous player/AI scoring
   - Score overflow handling (999,999+)
   - Rapid combo succession
   - Game pause during animations

## Dependencies
- Existing `ScoreDisplay` component (src/ui/ScoreDisplay.ts)
- `MatchDetectionSystem` for combo triggers
- Phaser 3 particle system
- Audio manager for sound effects

## Notes for Developer
- Consider using object pooling for floating text to optimize performance
- Implement easing functions for smooth animations (recommend Sine.easeOut)
- Use CSS classes for score displays to enable easy theming
- Consider adding accessibility options to disable screen shake
- Store high combo streak for end-game statistics

## Acceptance Testing Checklist
- [ ] Product Owner review of visual effects
- [ ] QA validation of all combo tiers
- [ ] Performance testing on minimum spec devices
- [ ] Accessibility review for visual effects
- [ ] Player feedback session for "game feel"

---

**Story prepared by**: Sarah (Product Owner)  
**Ready for**: Development Team  
**Next Step**: Sprint Planning & Task Breakdown