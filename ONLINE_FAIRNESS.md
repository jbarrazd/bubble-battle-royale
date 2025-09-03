# Online Fairness - Fixed Game Area

## Problem
Different devices have different screen sizes and aspect ratios, which in an online bubble shooter game creates unfair advantages:
- Players with larger screens can see more bubbles
- Launcher distances vary between devices
- Some players can aim at angles others cannot

## Solution
The game now uses a **FIXED game area** that is identical for all players:

### Fixed Dimensions
- Width: 375 * 2.5 = 937.5 HD units
- Height: 812 * 2.5 = 2030 HD units  
- Aspect Ratio: 9:19.5 (iPhone X/11/12/13 standard)

### Implementation Details

1. **Fixed World Size**: Every player sees exactly the same game world, regardless of device
2. **Automatic Scaling**: Phaser scales the fixed area to fit the device screen
3. **Letterboxing**: Black bars appear on devices that don't match the aspect ratio
4. **Center Alignment**: The game area is always centered on screen

### Benefits
- **Fair Competition**: All players have identical visibility and shooting ranges
- **Consistent Experience**: The game looks and plays the same on all devices
- **No Advantage**: Screen size doesn't affect competitive gameplay

### Testing
To verify the fixed area is working:
1. Test on different devices (phones, tablets, desktop)
2. Check that black bars appear on wider/taller screens
3. Confirm launcher-to-bubble distance is identical
4. Verify all players can see the same number of bubble rows

### Configuration
Settings in `src/config/GameConfig.ts`:
```typescript
export const FIXED_GAME_WIDTH = 375 * HD_SCALE;  // 937.5 HD units
export const FIXED_GAME_HEIGHT = 812 * HD_SCALE; // 2030 HD units
```

The game will automatically:
- Scale to fit while maintaining aspect ratio
- Add black letterboxing/pillarboxing as needed
- Center the play area on any screen