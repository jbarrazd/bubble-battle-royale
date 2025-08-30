# Game Story: Professional Sound System with Dynamic Audio and Mobile Haptics

## Story Information
- **ID:** GS-2024-001
- **Type:** Feature
- **Points:** 8
- **Priority:** Critical
- **Sprint:** Current
- **Created:** 2025-08-30
- **Status:** Ready for Development

## User Story
As a player, I want dynamic sound effects and haptic feedback so that the game feels more immersive and provides better feedback for my actions and achievements.

## Acceptance Criteria
- [ ] MUST generate sound effects programmatically using Phaser/Web Audio API (no external files for SFX)
- [ ] MUST have different sounds for combo levels (3, 4, 5, 6, 7+ matches)
- [ ] MUST implement mobile haptic feedback for key actions
- [ ] MUST have volume controls and mute options
- [ ] MUST scale sound pitch/intensity based on combo size
- [ ] SHOULD have background music (can use external file)
- [ ] MUST work on both desktop and mobile devices

## Technical Requirements

### Sound Generation Architecture
Use Phaser.Sound.WebAudioSoundManager for synthesis with these programmatically generated effects:

1. **Basic Actions:**
   - `bubble_shoot`: Sine wave 440Hz with quick envelope
   - `bubble_attach`: Square wave 880Hz, short burst
   - `ui_click`: Triangle wave 1000Hz, 10ms

2. **Match Sounds (Combo-Scaled):**
   - `match_3`: Major chord arpeggio (C-E-G)
   - `match_4`: Major 7th chord (C-E-G-B)
   - `match_5`: Ascending pentatonic scale
   - `match_6`: Triumphant fanfare pattern
   - `match_7plus`: Epic orchestral hit simulation

3. **Special Events:**
   - `power_up_activation`: Rising sweep 200Hz to 2000Hz
   - `danger_warning`: Pulsing low frequency 80Hz
   - `victory`: Major scale flourish
   - `defeat`: Descending chromatic scale

### Haptic Feedback Patterns
- **Light (10ms):** Bubble shoot, UI clicks
- **Medium (25ms):** Bubble attach, small match
- **Strong (50ms):** Large combo, power-up activation
- **Pattern Sequences:** Victory (ascending pulses), Defeat (descending pulses)

### File Structure
```
src/
├── systems/
│   └── audio/
│       ├── SoundSystem.ts        # Main audio controller
│       ├── SoundGenerator.ts     # Synthesizer for effects
│       └── HapticManager.ts      # Mobile vibration handler
└── config/
    └── AudioConfig.ts             # Audio settings and parameters
```

## Implementation Tasks

### 1. Create SoundGenerator Class
```typescript
class SoundGenerator {
    private audioContext: AudioContext;
    private masterGain: GainNode;
    
    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.connect(this.audioContext.destination);
    }
    
    generateBubblePop(frequency: number = 440, combo: number = 1): void {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        // Scale frequency based on combo
        osc.frequency.value = frequency * (1 + combo * 0.2);
        osc.type = 'sine';
        
        // ADSR envelope
        const now = this.audioContext.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05); // Decay
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);  // Sustain
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); // Release
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }
    
    generateComboSound(comboLevel: number): void {
        const frequencies = this.getComboFrequencies(comboLevel);
        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.generateTone(freq, 0.15, 'triangle');
            }, index * 50);
        });
    }
    
    private getComboFrequencies(level: number): number[] {
        const scales = {
            3: [261.63, 329.63, 392.00], // C-E-G
            4: [261.63, 329.63, 392.00, 493.88], // C-E-G-B
            5: [261.63, 293.66, 329.63, 392.00, 440.00], // C-D-E-G-A
            6: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99], // Fanfare
            7: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50] // Epic
        };
        return scales[Math.min(level, 7)] || scales[7];
    }
}
```

### 2. Create HapticManager Class
```typescript
class HapticManager {
    private canVibrate: boolean;
    
    constructor() {
        this.canVibrate = 'vibrate' in navigator;
    }
    
    vibrate(pattern: number | number[]): void {
        if (this.canVibrate) {
            navigator.vibrate(pattern);
        }
    }
    
    // Preset patterns
    shootBubble(): void {
        this.vibrate(10);
    }
    
    matchFound(comboSize: number): void {
        const intensity = Math.min(25 + (comboSize * 10), 100);
        this.vibrate(intensity);
    }
    
    powerUpActivated(): void {
        this.vibrate([50, 30, 50]);
    }
    
    victory(): void {
        this.vibrate([100, 50, 100, 50, 200]);
    }
    
    defeat(): void {
        this.vibrate([200, 100, 100, 100, 50]);
    }
}
```

### 3. Create SoundSystem Class
```typescript
class SoundSystem {
    private generator: SoundGenerator;
    private haptics: HapticManager;
    private volume: number = 0.7;
    private muted: boolean = false;
    
    constructor(scene: Phaser.Scene) {
        this.generator = new SoundGenerator();
        this.haptics = new HapticManager();
        this.setupEventListeners(scene);
    }
    
    private setupEventListeners(scene: Phaser.Scene): void {
        scene.events.on('bubble-shoot', () => {
            if (!this.muted) {
                this.generator.generateBubbleShoot();
                this.haptics.shootBubble();
            }
        });
        
        scene.events.on('match-found', (data: { matchSize: number }) => {
            if (!this.muted) {
                this.generator.generateComboSound(data.matchSize);
                this.haptics.matchFound(data.matchSize);
            }
        });
    }
    
    setVolume(value: number): void {
        this.volume = Math.max(0, Math.min(1, value));
        this.generator.setMasterVolume(this.volume);
    }
    
    toggleMute(): void {
        this.muted = !this.muted;
    }
}
```

### 4. Integration Points
- **GameScene:** Initialize SoundSystem in create()
- **ShootingSystem:** Emit 'bubble-shoot' event
- **MatchDetectionSystem:** Emit 'match-found' with matchSize
- **PowerUpActivationSystem:** Emit 'power-up-activated'
- **ArenaSystem:** Emit 'victory' or 'defeat' events
- **All UI Buttons:** Add click sound callbacks

## Testing Checklist
- [ ] Sound generation works without external files
- [ ] Each combo level (3-7+) has distinct sound
- [ ] Volume control adjusts all sounds
- [ ] Mute toggle silences all audio
- [ ] Haptic feedback works on Android devices
- [ ] Haptic feedback works on iOS devices
- [ ] No audio artifacts or glitches
- [ ] Performance remains smooth with sounds
- [ ] Audio context properly suspended/resumed
- [ ] Memory usage stays stable (no leaks)

## Definition of Done
- [ ] All acceptance criteria verified
- [ ] Code peer reviewed
- [ ] Tested on Chrome, Firefox, Safari (desktop)
- [ ] Tested on iOS Safari, Android Chrome (mobile)
- [ ] No console errors or warnings
- [ ] Settings UI implemented with volume slider and mute button
- [ ] Documentation comments added to all classes
- [ ] README updated with audio system usage

## Dependencies
- Phaser 3.80+ (for WebAudio support)
- Web Audio API (native browser)
- Vibration API (native browser)
- No external sound files for effects
- Optional: Background music file (MP3/OGG)

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Browser audio autoplay restrictions | Require user interaction before first sound |
| Web Audio API not supported | Fallback to basic Phaser audio |
| Vibration API not available | Graceful degradation, no errors |
| Performance impact on low-end devices | Add quality settings for audio |

## Notes
- Priority on synthesized sounds to avoid asset dependencies
- Focus on immediate feedback for better game feel
- Combo sounds should create sense of achievement progression
- Haptic feedback enhances mobile experience significantly

---
**Story prepared by:** Game Scrum Master (Jordan)
**Ready for:** Game Developer Agent Implementation