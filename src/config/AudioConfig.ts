/**
 * Audio Configuration for Bubble Clash
 * Redesigned for pleasant, addictive sounds
 */

export interface AudioEnvelope {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
}

export interface SoundEffect {
    frequency: number;
    type: OscillatorType;
    envelope: AudioEnvelope;
    duration: number;
    volume: number;
}

export interface MatchSound {
    frequencies: number[];
    type: OscillatorType;
    noteDelay: number;
    volume: number;
}

export type MatchSize = 3 | 4 | 5 | 6 | 7;

export type SoundEventType = 
    | 'bubble-shoot'
    | 'bubble-attach'
    | 'ui-click'
    | 'match-found'
    | 'power-up-activated'
    | 'danger-warning'
    | 'victory'
    | 'defeat';

export const AUDIO_CONFIG = {
    // Master audio settings
    MASTER: {
        VOLUME: 0.3,  // Much softer overall
        COMPRESSOR: {
            threshold: -24,
            knee: 30,
            ratio: 12,
            attack: 0.003,
            release: 0.25
        },
        CONTEXT_RESUME_MAX_RETRIES: 3,
        CONTEXT_RESUME_RETRY_DELAY: 100
    },

    // Pleasant sound effects
    EFFECTS: {
        // Soft, satisfying bubble shoot - like a water drop
        BUBBLE_SHOOT: {
            frequency: 800,  // Higher, softer frequency
            type: 'sine' as OscillatorType,
            envelope: {
                attack: 0.001,   // Very quick attack
                decay: 0.02,     // Fast decay for "plop" effect
                sustain: 0.1,    // Low sustain
                release: 0.08    // Quick release
            },
            duration: 0.1,       // Very short
            volume: 0.25         // Soft volume
        },

        // Gentle bubble attachment - like a soft click
        BUBBLE_ATTACH: {
            frequency: 1200,
            type: 'triangle' as OscillatorType,  // Softer than square
            envelope: {
                attack: 0.001,
                decay: 0.01,
                sustain: 0.05,
                release: 0.04
            },
            duration: 0.05,
            volume: 0.2
        },

        // Pleasant UI click
        UI_CLICK: {
            frequency: 600,
            type: 'sine' as OscillatorType,
            envelope: {
                attack: 0.001,
                decay: 0.005,
                sustain: 0,
                release: 0.02
            },
            duration: 0.03,
            volume: 0.15
        },

        // Power-up activation - magical sweep
        POWER_UP_ACTIVATION: {
            startFreq: 200,
            endFreq: 1200,
            type: 'triangle' as OscillatorType,
            duration: 0.5,
            volume: 0.3
        },

        // Danger warning - subtle pulse
        DANGER_WARNING: {
            frequency: 150,
            type: 'sine' as OscillatorType,
            envelope: {
                attack: 0.1,
                decay: 0.1,
                sustain: 0.3,
                release: 0.2
            },
            duration: 0.4,
            volume: 0.2
        }
    },

    // Musical, addictive match sounds - pentatonic scale for harmony
    MATCH_SOUNDS: {
        // 3-match: Pleasant three-note chord (C-E-G)
        3: {
            frequencies: [261.63, 329.63, 392.00],  // C major triad
            type: 'sine' as OscillatorType,
            noteDelay: 30,  // Quick succession
            volume: 0.2
        },
        // 4-match: Happy progression (C-E-G-C)
        4: {
            frequencies: [261.63, 329.63, 392.00, 523.25],  // Add octave
            type: 'sine' as OscillatorType,
            noteDelay: 40,
            volume: 0.22
        },
        // 5-match: Pentatonic run (very pleasant to ears)
        5: {
            frequencies: [392.00, 440.00, 523.25, 587.33, 659.25],  // G-A-C-D-E
            type: 'triangle' as OscillatorType,
            noteDelay: 35,
            volume: 0.25
        },
        // 6-match: Satisfying ascending arpeggio
        6: {
            frequencies: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99],  // C-E-G-C-E-G
            type: 'triangle' as OscillatorType,
            noteDelay: 30,
            volume: 0.28
        },
        // 7+-match: Epic but pleasant cascade
        7: {
            frequencies: [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25],  // Up and down
            type: 'sine' as OscillatorType,
            noteDelay: 25,
            volume: 0.3
        }
    },

    // Pleasant bubble pop sounds based on color
    BUBBLE_POP_SOUNDS: {
        // Each color has a different pleasant tone
        RED: { frequency: 440, volume: 0.15 },     // A4
        BLUE: { frequency: 523.25, volume: 0.15 }, // C5
        GREEN: { frequency: 587.33, volume: 0.15 }, // D5
        YELLOW: { frequency: 659.25, volume: 0.15 }, // E5
        PURPLE: { frequency: 698.46, volume: 0.15 }  // F5
    },

    // Victory/Defeat sounds
    GAME_END_SOUNDS: {
        VICTORY: {
            frequencies: [523.25, 659.25, 783.99, 1046.50],  // C-E-G-C ascending
            type: 'triangle' as OscillatorType,
            noteDelay: 100,
            volume: 0.35
        },
        DEFEAT: {
            frequencies: [523.25, 493.88, 440.00, 392.00],  // C-B-A-G descending
            type: 'sine' as OscillatorType,
            noteDelay: 150,
            volume: 0.25
        }
    },

    // Haptic patterns (unchanged)
    HAPTIC_PATTERNS: {
        LIGHT: 8,
        MEDIUM: 20,
        STRONG: 40,
        VICTORY: [50, 30, 50, 30, 100],
        DEFEAT: [100, 50, 50, 50, 25]
    },

    // Audio limits
    LIMITS: {
        MAX_VOICES: 12,  // Reduced for cleaner sound
        CLEANUP_THRESHOLD: 8,
        MIN_TIME_BETWEEN_SOUNDS: 30  // ms between same sound
    },

    // Performance settings
    PERFORMANCE: {
        MAX_CONCURRENT_SOUNDS: 10,
        CLEANUP_INTERVAL: 1000
    }
};