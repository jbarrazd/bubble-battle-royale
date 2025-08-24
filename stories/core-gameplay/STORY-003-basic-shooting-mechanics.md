# STORY-003: Basic Shooting Mechanics

## Story Details
- **ID**: STORY-003
- **Epic**: Core Gameplay
- **Priority**: P0 (Critical)
- **Status**: ✅ COMPLETED
- **Dependencies**: STORY-002 (Dual Arena Setup)

## User Story
As a player,
I want to aim and shoot bubbles with precise control,
So that I can strategically place bubbles and create matches.

## Implementation Summary

### Completed Features ✅

#### 1. Input System
- **InputManager**: Unified mouse/touch handling with 0.5x sensitivity
- **Angle Constraints**: 15° to 165° from vertical
- **Smooth Aiming**: Low sensitivity for precise control
- **Visual Feedback**: Launcher highlights during aiming

#### 2. Shooting System
- **Fixed Velocity**: 600 pixels/second
- **Straight Line**: No gravity physics
- **Wall Bouncing**: Unlimited bounces with accurate reflection
- **Cooldown**: 1 second between shots with visual indicator
- **Auto-reload**: Automatic bubble loading after shot

#### 3. Trajectory Preview
- **Partial Preview**: Shows only 40% of trajectory (upgradeable)
- **Animated Dots**: Moving wave effect with pulsing
- **Color Gradient**: White to green fade
- **Wall Bounce Prediction**: Calculates reflection angles
- **Performance**: Object pooling for dots

#### 4. Bubble Queue
- **Queue Display**: Shows next 2 bubbles
- **Auto-refill**: Maintains 3 bubbles in queue
- **Smooth Animations**: Queue shift with fade effects
- **Random Colors**: 5 color pool (Red, Blue, Green, Yellow, Purple)

## Technical Implementation

### Files Created
- `/src/systems/input/InputManager.ts` - Input handling
- `/src/systems/gameplay/ShootingSystem.ts` - Core shooting logic
- `/src/systems/gameplay/TrajectoryPreview.ts` - Aim preview
- `/src/systems/gameplay/BubbleQueue.ts` - Queue management

### Files Modified
- `/src/systems/gameplay/ArenaSystem.ts` - Integration
- `/src/gameObjects/Launcher.ts` - Rotation logic
- `/src/scenes/GameScene.ts` - Update loop
- `/src/config/GameConfig.ts` - FPS unlimited

## Performance Metrics
- ✅ Maintains 60+ FPS with shooting
- ✅ Smooth trajectory animation
- ✅ No memory leaks (proper cleanup)
- ✅ Responsive input (< 16ms latency)

## Test Scenarios Verified
- [x] Mouse and touch aiming work identically
- [x] Angle constraints prevent impossible shots
- [x] Wall bouncing reflects correctly
- [x] Cooldown prevents rapid fire
- [x] Queue refills automatically
- [x] Trajectory preview shows 40% of path
- [x] All animations run smoothly

## Future Extensibility
Ready for power-ups:
- Full trajectory preview (100% path)
- Rapid fire (reduced cooldown)
- Multi-shot (multiple bubbles)
- Laser sight (enhanced aim)
- Power shot (increased velocity)
- Special bubbles (unique physics)

## Definition of Done ✅
- [x] Aiming responds with low sensitivity
- [x] Partial trajectory with animated dots
- [x] Straight line shots at fixed velocity
- [x] Wall bouncing with unlimited bounces
- [x] Queue shows current + next 2 bubbles
- [x] 1 second cooldown enforced
- [x] Visual feedback for all interactions
- [x] No performance degradation
- [x] Code follows project patterns
- [x] Manual testing complete

## Notes
- FPS now unlimited (was 60)
- Trajectory preview foundation ready for monetization
- Input system supports both mobile and desktop
- All systems properly integrated with ArenaSystem