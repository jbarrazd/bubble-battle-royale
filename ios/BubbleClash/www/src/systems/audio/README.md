# Audio System

## Overview
The audio system for Bubble Clash uses real MP3 sound files for all game sounds.

## Components

### RealSoundSystem
Main audio controller that handles all sound playback using Phaser's built-in audio system.

### HapticManager  
Handles haptic feedback (vibration) for mobile devices using Capacitor.

## Sound Files

All sound files are located in `/public/assets/sounds/`:

- **bubble-shoot.mp3** - Played when shooting a bubble
- **bubbles-attach.mp3** - Played when bubble attaches to grid
- **bubbles-drop.mp3** - Played when floating bubbles fall
- **combo-3.mp3** - 3-bubble match sound
- **combo-4.mp3** - 4-bubble match sound  
- **combo-5-plus.mp3** - 5+ bubble match sound
- **combo-celebration.mp3** - Extra celebration for 7+ combos
- **arsenal-pickup.mp3** - When collecting arsenal items
- **victory.mp3** - Victory sound
- **defeat.mp3** - Defeat/lose game sound

## Usage

The sound system is initialized in GameScene:

```typescript
this.soundSystem = new RealSoundSystem(this);
```

### Playing Sounds

```typescript
// Shoot sound
this.soundSystem.playShootSound();

// Attach sound  
this.soundSystem.playAttachSound();

// Combo sounds (automatically selects based on size)
this.soundSystem.playComboSound(matchSize);

// Victory
this.soundSystem.playVictorySound();
```

### Volume Control

```typescript
// Toggle mute (M key)
this.soundSystem.toggleMute();

// Set master volume (0-1)
this.soundSystem.setMasterVolume(0.5);
```

## Events

The system listens to these game events:

- `bubble-shoot` - Shooting sound
- `bubble-attach-collision` - Attachment sound (plays immediately on collision)
- `match-found` - Combo sounds based on match size
- `floating-bubbles-drop` - Falling bubbles sound
- `victory` / `defeat` - End game sounds

## Controls

- **M** - Toggle mute
- **T** - Test all sounds (debug)