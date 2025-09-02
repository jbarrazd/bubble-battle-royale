/**
 * RealSoundSystem - Simple MP3 sound playback system
 * Uses Phaser's built-in audio system to play real sound files
 */

import { Scene } from 'phaser';
import { ASSET_KEYS } from '@/config/AssetManifest';

export class RealSoundSystem {
    private scene: Scene;
    private sounds: Map<string, Phaser.Sound.BaseSound> = new Map();
    private muted: boolean = false;
    private masterVolume: number = 0.5;
    
    // Volume settings for different sound types
    private volumes = {
        shoot: 0.3,
        attach: 0.4,
        combo: 0.6,
        celebration: 1.0,  // Maximum volume for celebration
        arsenal: 0.5,
        victory: 0.9,
        background: 0.2
    };

    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeSounds();
    }

    private initializeSounds(): void {
        console.log('RealSoundSystem: Initializing sounds...');
        
        // Check if sounds are loaded
        const audioCache = this.scene.cache.audio;
        
        Object.values(ASSET_KEYS.AUDIO).forEach(key => {
            if (audioCache.exists(key)) {
                console.log(`RealSoundSystem: Sound ${key} is available`);
            } else {
                console.warn(`RealSoundSystem: Sound ${key} not found in cache`);
            }
        });
    }

    /**
     * Play bubble shoot sound
     */
    public playShootSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.BUBBLE_SHOOT, this.volumes.shoot);
    }

    /**
     * Play bubble attach sound
     */
    public playAttachSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.BUBBLE_ATTACH, this.volumes.attach);
    }

    /**
     * Play bubbles drop sound (slower playback, lower volume)
     */
    public playBubblesDropSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.BUBBLES_DROP, this.volumes.combo * 0.6, 0.85); // 40% quieter, 15% slower
    }

    /**
     * Play combo sound based on size
     */
    public playComboSound(size: number): void {
        if (this.muted) return;
        
        let soundKey: string;
        let volume = this.volumes.combo;
        
        if (size === 3) {
            soundKey = ASSET_KEYS.AUDIO.COMBO_3;
            this.playSound(soundKey, volume);
        } else if (size === 4) {
            soundKey = ASSET_KEYS.AUDIO.COMBO_4;
            this.playSound(soundKey, volume);
        } else if (size >= 5) {
            soundKey = ASSET_KEYS.AUDIO.COMBO_5_PLUS;
            volume = this.volumes.combo * 0.7; // Quieter, more subtle
            
            // Play combo 5+ slower and quieter for more dramatic effect
            this.playSound(soundKey, volume, 0.85); // 30% quieter, 15% slower
            
            // ALWAYS play celebration for 5+ combos (not just 7+)
            setTimeout(() => {
                this.playSound(ASSET_KEYS.AUDIO.COMBO_CELEBRATION, this.volumes.celebration); // Full celebration volume
            }, 200);
        } else {
            return; // No sound for less than 3
        }
    }

    /**
     * Play match sound (alias for combo sound)
     */
    public playMatchSound(matchSize: number): void {
        this.playComboSound(matchSize);
    }

    /**
     * Play arsenal pickup sound
     */
    public playArsenalPickupSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.ARSENAL_PICKUP, this.volumes.arsenal);
    }

    /**
     * Play success objective sound (for mystery box/treasure chest)
     */
    public playSuccessObjectiveSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.SUCCESS_OBJECTIVE, this.volumes.arsenal * 1.2); // Slightly louder for impact
    }

    /**
     * Play victory sound
     */
    public playVictorySound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.VICTORY, this.volumes.victory);
    }

    /**
     * Play defeat sound
     */
    public playDefeatSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.DEFEAT, this.volumes.victory * 0.7);
    }

    /**
     * Play power-up sound (using arsenal pickup)
     */
    public playPowerUpSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.ARSENAL_PICKUP, this.volumes.arsenal);
    }

    /**
     * Play UI click sound (using attach sound at lower volume)
     */
    public playClickSound(): void {
        if (this.muted) return;
        this.playSound(ASSET_KEYS.AUDIO.BUBBLE_ATTACH, this.volumes.attach * 0.5);
    }

    /**
     * Play background music
     */
    public playBackgroundMusic(): Phaser.Sound.BaseSound | undefined {
        if (this.muted) return undefined;
        
        const key = ASSET_KEYS.AUDIO.BACKGROUND_MUSIC;
        
        // Check if we have background music file
        if (!this.scene.cache.audio.exists(key)) {
            console.log('RealSoundSystem: No background music file found');
            return undefined;
        }
        
        // Stop any existing background music
        const existingMusic = this.sounds.get('background-music');
        if (existingMusic) {
            existingMusic.stop();
        }
        
        const music = this.scene.sound.add(key, {
            volume: this.volumes.background * this.masterVolume,
            loop: true
        });
        
        this.sounds.set('background-music', music);
        music.play();
        
        return music;
    }

    /**
     * Helper to play a sound
     * @param key Sound key
     * @param volume Volume level (0-1)
     * @param rate Playback rate (1 = normal, 0.5 = half speed, 2 = double speed)
     */
    private playSound(key: string, volume: number = 0.5, rate: number = 1): void {
        try {
            if (!this.scene.cache.audio.exists(key)) {
                console.warn(`RealSoundSystem: Sound ${key} not loaded`);
                return;
            }
            
            const sound = this.scene.sound.add(key, {
                volume: volume * this.masterVolume,
                rate: rate // Playback speed
            });
            
            sound.play();
            
            // Clean up after playing
            sound.once('complete', () => {
                sound.destroy();
            });
        } catch (error) {
            console.error(`RealSoundSystem: Error playing sound ${key}:`, error);
        }
    }

    /**
     * Toggle mute
     */
    public toggleMute(): boolean {
        this.muted = !this.muted;
        
        // Mute/unmute all playing sounds
        this.scene.sound.mute = this.muted;
        
        return this.muted;
    }

    /**
     * Set master volume
     */
    public setMasterVolume(volume: number): void {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.scene.sound.volume = this.masterVolume;
    }

    /**
     * Test all sounds
     */
    public testAllSounds(): void {
        console.log('RealSoundSystem: Testing all sounds...');
        
        const sounds = [
            { key: ASSET_KEYS.AUDIO.BUBBLE_SHOOT, name: 'Shoot' },
            { key: ASSET_KEYS.AUDIO.BUBBLE_ATTACH, name: 'Attach' },
            { key: ASSET_KEYS.AUDIO.COMBO_3, name: 'Combo 3' },
            { key: ASSET_KEYS.AUDIO.COMBO_4, name: 'Combo 4' },
            { key: ASSET_KEYS.AUDIO.COMBO_5_PLUS, name: 'Combo 5+' },
            { key: ASSET_KEYS.AUDIO.VICTORY, name: 'Victory' }
        ];
        
        let delay = 0;
        sounds.forEach(({ key, name }) => {
            setTimeout(() => {
                console.log(`Playing: ${name}`);
                this.playSound(key, 0.5);
            }, delay);
            delay += 1000;
        });
    }

    /**
     * Get system info
     */
    public getInfo(): any {
        return {
            muted: this.muted,
            masterVolume: this.masterVolume,
            soundsLoaded: Object.values(ASSET_KEYS.AUDIO).filter(key => 
                this.scene.cache.audio.exists(key)
            ).length,
            totalSounds: Object.values(ASSET_KEYS.AUDIO).length
        };
    }

    /**
     * Cleanup
     */
    public destroy(): void {
        // Stop all sounds
        this.sounds.forEach(sound => {
            sound.stop();
            sound.destroy();
        });
        this.sounds.clear();
    }
}