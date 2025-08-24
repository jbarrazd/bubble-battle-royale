# STORY-004: Bubble Grid Attachment & Bidirectional Gravity System

## Story Details
- **ID**: STORY-004
- **Epic**: Core Gameplay
- **Priority**: P0 (Critical)
- **Status**: Ready for Development
- **Dependencies**: 
  - STORY-002 (Dual Arena Setup) ✅
  - STORY-003 (Basic Shooting Mechanics) ✅

## User Story
As a player,
I want my shot bubbles to attach to the grid when they hit other bubbles,
And I want disconnected bubbles to fall towards their respective player zones,
So that I can build clusters and strategically cut opponent connections.

## Acceptance Criteria
- [ ] MUST detect collision between projectile and grid bubbles
- [ ] MUST snap bubble to nearest valid hex position
- [ ] MUST attach to correct neighbor position based on impact angle
- [ ] MUST stop projectile movement on attachment
- [ ] MUST add attached bubble to grid data structure
- [ ] MUST detect disconnected bubble groups after attachment
- [ ] MUST apply zone-based gravity to disconnected bubbles:
  - Player zone bubbles fall DOWN towards player
  - Opponent zone bubbles fall UP towards opponent
  - Objective zone bubbles remain anchored (the "ceiling")
- [ ] MUST animate falling bubbles with physics
- [ ] MUST handle edge cases (grid boundaries, invalid positions)
- [ ] MUST maintain 60+ FPS performance with full grid
- [ ] MUST update visual position smoothly

## Technical Requirements

### Collision Detection
- Use circle-to-circle collision (radius: 16px)
- Check active projectiles against all grid bubbles
- Optimize with spatial partitioning if needed
- Early exit on first collision

### Attachment Logic
- Calculate 6 neighbor positions (hexagonal)
- Find closest valid empty position
- Consider impact vector for natural placement
- Validate position is within grid bounds
- Smooth snap animation (100ms)

### Grid Management
- Update BubbleGrid data structure
- Add bubble to correct hex coordinates
- Maintain parent-child relationships
- Track connected components by zone
- Update collision bounds

### Bidirectional Gravity System
- Flood-fill from OBJECTIVE_ZONE bubbles (anchors)
- Identify disconnected bubble groups per zone
- Apply directional gravity based on zone:
  - PLAYER_ZONE: Physics.gravity.y = positive (fall down)
  - OPPONENT_ZONE: Physics.gravity.y = negative (fall up)
  - OBJECTIVE_ZONE: Always connected (no gravity)
- Remove falling bubbles when out of bounds
- Award points for opponent bubbles that fall

### Visual Feedback
- Subtle bounce effect on attachment
- Scale animation (1.1x to 1.0x)
- Optional particle effect at attachment point
- Sound effect trigger point

## Implementation Notes
- Extend existing BubbleGrid class in `/src/systems/gameplay/BubbleGrid.ts`
- Add collision detection to ShootingSystem.update()
- Create GridAttachment system class if needed
- Use existing hex coordinate system from STORY-002
- Leverage bubble object pooling for performance
- Consider future match detection needs in data structure

## Test Scenarios
1. **Direct Hit**: Bubble hits another bubble center
2. **Edge Hit**: Glancing blow on bubble edge
3. **Multiple Neighbors**: Hit point near several bubbles
4. **Boundary Test**: Attachment at grid edges
5. **Rapid Fire**: Multiple quick attachments
6. **Gravity Player Zone**: Disconnected bubbles fall down
7. **Gravity Opponent Zone**: Disconnected bubbles fall up
8. **Objective Zone Anchor**: Center bubbles never fall
9. **Chain Reaction**: Multiple groups fall after one attachment
10. **Performance**: Full grid (100+ bubbles) at 60+ FPS
11. **Invalid Position**: Handle impossible attachment points

## Code Structure
```typescript
// Suggested implementation approach
interface IGridAttachment {
  detectCollision(projectile: Bubble, gridBubbles: Bubble[]): Bubble | null;
  findAttachmentPosition(impact: Vector2, hitBubble: Bubble): IHexPosition;
  attachToGrid(bubble: Bubble, position: IHexPosition): void;
  validatePosition(position: IHexPosition): boolean;
  
  // Bidirectional gravity system
  findDisconnectedGroups(): Map<ArenaZone, Bubble[]>;
  isConnectedToAnchor(bubble: Bubble): boolean;
  applyZoneGravity(bubbles: Bubble[], zone: ArenaZone): void;
  animateFallingBubbles(bubbles: Bubble[], direction: 'up' | 'down'): void;
}
```

## Future Extensibility
- Special bubble behaviors on attachment
- Magnetic/repelling bubbles
- Chain reaction triggers
- Grid shake/physics effects
- Attachment power-ups
- Combo system for quick attachments

## Definition of Done
- [ ] Collision detection working accurately
- [ ] Bubbles snap to correct hex positions
- [ ] Natural attachment based on impact angle
- [ ] Grid data structure updates properly
- [ ] Disconnected groups detected correctly
- [ ] Bidirectional gravity working per zone:
  - [ ] Player zone bubbles fall down
  - [ ] Opponent zone bubbles fall up
  - [ ] Objective zone bubbles stay anchored
- [ ] Falling animations smooth and physics-based
- [ ] Points awarded for dropped opponent bubbles
- [ ] Smooth visual transitions
- [ ] No performance degradation
- [ ] Edge cases handled gracefully
- [ ] Code follows established patterns
- [ ] Ready for match detection integration

## Performance Targets
- Collision checks: < 2ms per frame
- Attachment animation: 100ms smooth
- Memory: No new allocations per shot
- FPS: Maintain unlimited FPS setting

## Dependencies on Existing Code
- `BubbleGrid.ts` - Hex positioning system
- `ShootingSystem.ts` - Projectile management
- `Bubble.ts` - Bubble game object
- `ArenaSystem.ts` - Grid bubble management

## Notes for Developer
- The hex grid system from STORY-002 already has methods for position calculations
- Consider using Phaser's built-in collision detection first
- Object pooling is already set up for bubbles
- Impact angle calculation: `Math.atan2(dy, dx)` from hit bubble center