# Professional Sound System

This directory contains a complete professional audio system for the bubble shooter game, featuring procedurally generated sound effects, haptic feedback, and comprehensive game audio integration.

## 🎵 System Architecture

The sound system consists of three main components:

### 1. SoundGenerator (`SoundGenerator.ts`)
- **Purpose**: Generates all sound effects procedurally using Web Audio API
- **Features**:
  - No external sound files required for effects
  - Real-time synthesis with ADSR envelopes
  - Voice management and performance optimization
  - Advanced effects like frequency sweeps and modulation
  - Dynamic range compression and optional reverb

### 2. HapticManager (`HapticManager.ts`)
- **Purpose**: Provides contextual haptic feedback for mobile devices
- **Features**:
  - Device capability detection and fallback
  - Pattern-based vibration system
  - Rate limiting and performance optimization
  - Game-specific haptic patterns

### 3. SoundSystem (`SoundSystem.ts`)
- **Purpose**: Main orchestrator that coordinates audio and haptics
- **Features**:
  - Event-driven architecture
  - Volume controls and mute functionality
  - Settings persistence
  - Performance monitoring and optimization

## 🔧 Configuration

All audio settings are centralized in `AudioConfig.ts`:

```typescript
import { AUDIO_CONFIG } from '@/config/AudioConfig';

// Access sound parameters
const bubbleShootConfig = AUDIO_CONFIG.EFFECTS.BUBBLE_SHOOT;
const hapticPatterns = AUDIO_CONFIG.HAPTICS;
```

## 🚀 Usage Examples

### Basic Integration

```typescript
import { SoundSystem } from '@/systems/audio/SoundSystem';

// Initialize in your scene
const soundSystem = new SoundSystem(this);

// The system automatically listens for game events
// Just emit the appropriate events from your game systems:
this.events.emit('bubble-shoot');
this.events.emit('match-found', { matchSize: 5 });
this.events.emit('power-up-activated', { type: 'LASER' });
```

### Manual Sound Playback

```typescript
// Play specific sound effects
soundSystem.playEffect('bubble-shoot');
soundSystem.playEffect('match-found', { matchSize: 4 });

// Trigger haptic feedback
soundSystem.haptic('match', { size: 5 });
soundSystem.haptic('victory');
```

### Volume Controls

```typescript
// Master volume (0-1)
soundSystem.setMasterVolume(0.8);

// Effects volume
soundSystem.setEffectsVolume(0.7);

// Toggle mute
soundSystem.toggleMute();

// Haptics
soundSystem.setHapticsEnabled(false);
```

## 🎯 Event Integration

The sound system automatically responds to these game events:

### Shooting Events
- `bubble-shoot` - Bubble shooting sound + light haptic
- `shooting-started` - Shooting initiation
- `wall-bounce` - Wall collision sound + haptic
- `projectile-collision` - Projectile collision haptic

### Match Events
- `match-found` - Combo sounds scaled by match size + haptic
- `floating-bubbles-drop` - Drop sound + haptic

### UI Events
- `ui-click` - UI button clicks + haptic
- `ui-hover` - Subtle hover feedback

### Power-up Events
- `power-up-activated` - Activation sound + special haptic
- `power-up-collected` - Collection feedback

### Game State Events
- `victory` - Victory fanfare + celebration haptic
- `defeat` - Defeat sequence + haptic
- `danger-warning` - Warning sound + haptic

### Attachment Events
- `bubble-attached` - Attachment confirmation sound + haptic

## 🎼 Sound Generation Details

### Bubble Shooting
- **Type**: Sine wave with ADSR envelope
- **Frequency**: 440Hz with pitch variation
- **Duration**: 200ms
- **Features**: Pitch varies slightly for natural feel

### Match Sounds (Combo-Scaled)
- **3-match**: C-E-G major triad (triangle wave)
- **4-match**: C-E-G-B major 7th chord
- **5-match**: C-D-E-G-A pentatonic scale (sine wave)
- **6-match**: Triumphant fanfare pattern (sawtooth)
- **7+-match**: Epic orchestral hit simulation

### Special Events
- **Power-up**: Frequency sweep from 200Hz to 2000Hz
- **Victory**: Major scale flourish with increasing volume
- **Defeat**: Descending chromatic sequence
- **Danger**: Pulsing 80Hz square wave with modulation

## 📱 Haptic Patterns

### Intensity Levels
- **Light (10ms)**: UI interactions, bubble shooting
- **Medium (25ms)**: Bubble attachment, small matches
- **Strong (50ms)**: Large combos, power-ups

### Pattern Sequences
- **Victory**: `[100, 50, 100, 50, 200]` - Ascending celebration
- **Defeat**: `[200, 100, 100, 100, 50]` - Descending failure
- **Power-up**: `[50, 30, 50]` - Triple pulse
- **Combo**: Dynamic intensity based on match size

## ⚡ Performance Optimization

### Voice Management
- Maximum 16 concurrent sounds
- Automatic voice stealing for performance
- Cleanup timer every 5 seconds
- Pool-based sound management

### Memory Management
- Pattern caching for haptics
- Automatic WebGL resource cleanup
- Settings persistence in localStorage

### Mobile Optimization
- Audio context suspension handling
- Battery-aware haptic rate limiting
- Graceful degradation on unsupported devices

## 🛠️ Development & Testing

### Testing Controls (GameScene)
- **T Key**: Run complete audio test sequence
- **M Key**: Toggle mute on/off
- **Space**: Test bubble shooting sound

### Debug Information
```typescript
// Get system statistics
const stats = soundSystem.getSystemInfo();
console.log('Audio supported:', stats.audioSupported);
console.log('Haptics supported:', stats.hapticsSupported);
console.log('Active voices:', stats.activeVoices);
```

### Performance Monitoring
```typescript
// Monitor sound generation performance
const soundStats = soundGenerator.getStats();
console.log('Active voices:', soundStats.activeVoices);
console.log('Total sounds:', soundStats.totalSounds);
console.log('Context state:', soundStats.audioContextState);
```

## 🔧 Browser Compatibility

### Web Audio API Support
- ✅ Chrome 66+
- ✅ Firefox 60+
- ✅ Safari 14.1+
- ✅ Edge 79+

### Haptic Feedback Support
- ✅ Android Chrome (Vibration API)
- ✅ Mobile browsers with vibration support
- ❌ iOS (limited vibration API access)
- ℹ️ Graceful fallback on unsupported devices

### Autoplay Policy Handling
The system automatically handles browser autoplay restrictions:
- Waits for first user interaction
- Retries audio context activation
- Provides fallback behavior

## 📁 File Structure

```
src/systems/audio/
├── SoundSystem.ts           # Main orchestrator
├── SoundGenerator.ts        # Web Audio synthesis
├── HapticManager.ts         # Mobile haptics
└── README.md               # This documentation

src/config/
└── AudioConfig.ts          # Centralized configuration
```

## 🎛️ Settings UI Integration

To create audio settings UI:

```typescript
const settings = soundSystem.getSettings();

// Create volume sliders
const masterVolumeSlider = createSlider(
    settings.masterVolume,
    (value) => soundSystem.setMasterVolume(value)
);

const effectsVolumeSlider = createSlider(
    settings.effectsVolume,
    (value) => soundSystem.setEffectsVolume(value)
);

// Create toggle buttons
const muteButton = createToggle(
    settings.muted,
    () => soundSystem.toggleMute()
);

const hapticsButton = createToggle(
    settings.hapticsEnabled,
    (enabled) => soundSystem.setHapticsEnabled(enabled)
);
```

## 🚨 Troubleshooting

### Common Issues

1. **No Sound on Mobile**
   - Ensure user interaction before first sound
   - Check browser autoplay policies
   - Verify audio context state

2. **Haptics Not Working**
   - Check device support: `hapticManager.isSupported()`
   - Verify permissions on mobile browsers
   - Test with `hapticManager.testHaptic()`

3. **Performance Issues**
   - Monitor active voices with `getStats()`
   - Reduce MAX_CONCURRENT_SOUNDS if needed
   - Check cleanup timer functionality

### Debug Commands
```typescript
// Test audio functionality
soundSystem.testAudio();

// Check device capabilities
console.log(hapticManager.getCapabilities());

// Monitor performance
console.log(soundSystem.getSystemInfo());
```

## 🎯 Future Enhancements

- [ ] Spatial audio for 3D positioning
- [ ] Dynamic music system
- [ ] Audio compression for different quality levels
- [ ] Controller haptic feedback support
- [ ] Advanced reverb and audio effects
- [ ] Audio visualization integration

---

*This sound system provides a complete professional audio experience without requiring any external sound files, making the game self-contained and performant across all supported platforms.*