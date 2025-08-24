# STORY-004: Bubble Grid Attachment System

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
So that I can build clusters and create strategic matches.

## Acceptance Criteria
- [ ] MUST detect collision between projectile and grid bubbles
- [ ] MUST snap bubble to nearest valid hex position
- [ ] MUST attach to correct neighbor position based on impact angle
- [ ] MUST stop projectile movement on attachment
- [ ] MUST add attached bubble to grid data structure
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
- Track connected components
- Update collision bounds

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
6. **Performance**: Full grid (100+ bubbles) at 60+ FPS
7. **Invalid Position**: Handle impossible attachment points

## Code Structure
```typescript
// Suggested implementation approach
interface IGridAttachment {
  detectCollision(projectile: Bubble, gridBubbles: Bubble[]): Bubble | null;
  findAttachmentPosition(impact: Vector2, hitBubble: Bubble): IHexPosition;
  attachToGrid(bubble: Bubble, position: IHexPosition): void;
  validatePosition(position: IHexPosition): boolean;
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