/**
 * SimpleSoundSystem - A working sound system for Bubble Clash
 * Handles Chrome autoplay policy and generates sounds using Web Audio API
 */

import { Scene } from 'phaser';

export class SimpleSoundSystem {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.3;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('SimpleSoundSystem: Created');
        
        // Setup user interaction listeners for audio context activation
        this.setupUserInteractionListeners();
    }
    
    /**
     * Setup listeners for first user interaction (required for Chrome autoplay)
     */
    private setupUserInteractionListeners(): void {
        const initAudio = () => {
            if (!this.isInitialized) {
                this.initializeAudioContext();
                // Remove listeners after initialization
                this.scene.input.off('pointerdown', initAudio);
                this.scene.input.keyboard?.off('keydown', initAudio);
            }
        };
        
        // Listen for any user interaction
        this.scene.input.on('pointerdown', initAudio);
        this.scene.input.keyboard?.on('keydown', initAudio);
    }
    
    /**
     * Initialize the Web Audio API context
     */
    private async initializeAudioContext(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            console.log('SimpleSoundSystem: Initializing audio context...');
            
            // Create audio context
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Resume if suspended (Chrome autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('SimpleSoundSystem: Audio context initialized successfully');
            
            // Play a test sound to confirm it's working
            this.playTestSound();
            
        } catch (error) {
            console.error('SimpleSoundSystem: Failed to initialize audio context:', error);
        }
    }
    
    /**
     * Play a test sound to confirm audio is working
     */
    private playTestSound(): void {
        this.playTone(800, 0.05, 'sine');
    }
    
    /**
     * Play a simple tone
     */
    private playTone(
        frequency: number, 
        duration: number, 
        type: OscillatorType = 'sine',
        volume: number = 0.3
    ): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        try {
            const now = this.audioContext.currentTime;
            
            // Create oscillator
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = type;
            oscillator.frequency.value = frequency;
            
            // Create gain node for this sound
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = 0;
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Envelope (ADSR)
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + 0.01); // Attack
            gainNode.gain.exponentialRampToValueAtTime(volume * 0.3, now + duration * 0.7); // Decay/Sustain
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release
            
            // Play sound
            oscillator.start(now);
            oscillator.stop(now + duration);
            
            // Cleanup
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
            
        } catch (error) {
            console.error('SimpleSoundSystem: Error playing tone:', error);
        }
    }
    
    /**
     * Play bubble shoot sound
     */
    public playShootSound(): void {
        console.log('SimpleSoundSystem: Playing shoot sound');
        this.playTone(600, 0.1, 'sine', 0.25);
    }
    
    /**
     * Play bubble attach sound
     */
    public playAttachSound(): void {
        console.log('SimpleSoundSystem: Playing attach sound');
        this.playTone(1000, 0.05, 'triangle', 0.2);
    }
    
    /**
     * Play match sound (scales with match size)
     */
    public playMatchSound(matchSize: number): void {
        console.log(`SimpleSoundSystem: Playing match sound for size ${matchSize}`);
        
        // Base frequency increases with match size
        const baseFreq = 400 + (matchSize - 3) * 100;
        
        // Play multiple tones for larger matches
        const noteCount = Math.min(matchSize - 2, 5);
        for (let i = 0; i < noteCount; i++) {
            setTimeout(() => {
                const freq = baseFreq * (1 + i * 0.25);
                this.playTone(freq, 0.2, 'sine', 0.2);
            }, i * 50);
        }
    }
    
    /**
     * Play power-up sound
     */
    public playPowerUpSound(): void {
        console.log('SimpleSoundSystem: Playing power-up sound');
        
        // Rising sweep
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        try {
            const now = this.audioContext.currentTime;
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Frequency sweep
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.4);
            
            // Volume envelope
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            
            oscillator.onended = () => {
                oscillator.disconnect();
                gainNode.disconnect();
            };
        } catch (error) {
            console.error('SimpleSoundSystem: Error playing power-up sound:', error);
        }
    }
    
    /**
     * Play UI click sound
     */
    public playClickSound(): void {
        console.log('SimpleSoundSystem: Playing click sound');
        this.playTone(800, 0.03, 'sine', 0.15);
    }
    
    /**
     * Play victory sound
     */
    public playVictorySound(): void {
        console.log('SimpleSoundSystem: Playing victory sound');
        
        // Play ascending notes
        const notes = [523, 659, 784, 1047]; // C, E, G, C
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'triangle', 0.3);
            }, i * 100);
        });
    }
    
    /**
     * Play defeat sound
     */
    public playDefeatSound(): void {
        console.log('SimpleSoundSystem: Playing defeat sound');
        
        // Play descending notes
        const notes = [523, 440, 392, 330]; // C, A, G, E
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.3, 'sine', 0.25);
            }, i * 150);
        });
    }
    
    /**
     * Set volume (0-1)
     */
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
        console.log(`SimpleSoundSystem: Volume set to ${this.volume}`);
    }
    
    /**
     * Toggle mute
     */
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        console.log(`SimpleSoundSystem: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    /**
     * Test all sounds
     */
    public testAllSounds(): void {
        console.log('SimpleSoundSystem: Testing all sounds...');
        
        const tests = [
            () => this.playClickSound(),
            () => this.playShootSound(),
            () => this.playAttachSound(),
            () => this.playMatchSound(3),
            () => this.playMatchSound(5),
            () => this.playPowerUpSound(),
            () => this.playVictorySound()
        ];
        
        tests.forEach((test, i) => {
            setTimeout(test, i * 500);
        });
    }
    
    /**
     * Get system info
     */
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created'
        };
    }
    
    /**
     * Destroy the sound system
     */
    public destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        console.log('SimpleSoundSystem: Destroyed');
    }
}