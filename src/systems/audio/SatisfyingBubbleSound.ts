/**
 * SatisfyingBubbleSound - Satisfying cartoon-style bubble sounds
 * Like bubble wrap popping - simple, clean, and addictive
 */

import { Scene } from 'phaser';

export class SatisfyingBubbleSound {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.6;
    
    // Track variations to avoid repetition
    private lastPopIndex: number = 0;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('SatisfyingBubbleSound: Created');
        this.setupUserInteractionListeners();
    }
    
    private setupUserInteractionListeners(): void {
        const initAudio = () => {
            if (!this.isInitialized) {
                this.initializeAudioContext();
                this.scene.input.off('pointerdown', initAudio);
                this.scene.input.keyboard?.off('keydown', initAudio);
            }
        };
        
        this.scene.input.on('pointerdown', initAudio);
        this.scene.input.keyboard?.on('keydown', initAudio);
    }
    
    private async initializeAudioContext(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            console.log('SatisfyingBubbleSound: Initializing...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('SatisfyingBubbleSound: Initialized');
            
        } catch (error) {
            console.error('SatisfyingBubbleSound: Failed to initialize:', error);
        }
    }
    
    /**
     * Play bubble launch sound - soft, low "poof" sound
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Soft, low frequency poof
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        
        // Low, pleasant frequencies only
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        
        // Very soft envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }
    
    /**
     * Play bubble pop sound - soft, muffled pop
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Vary the pop sound slightly
        const variations = [
            { pitch: 1.0, duration: 0.04 },
            { pitch: 1.1, duration: 0.035 },
            { pitch: 0.9, duration: 0.045 },
            { pitch: 1.05, duration: 0.038 },
            { pitch: 0.95, duration: 0.042 }
        ];
        
        this.lastPopIndex = (this.lastPopIndex + 1) % variations.length;
        const variation = variations[this.lastPopIndex];
        
        // Soft, muffled pop - much lower frequency
        const popOsc = this.audioContext.createOscillator();
        popOsc.type = 'sine';
        const baseFreq = 300 * variation.pitch; // Much lower
        popOsc.frequency.setValueAtTime(baseFreq, now);
        popOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + variation.duration);
        
        // Very soft click
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sine'; // Changed from square to sine for softer sound
        clickOsc.frequency.value = 150 * variation.pitch;
        
        // Softer volumes
        const popGain = this.audioContext.createGain();
        popGain.gain.setValueAtTime(0.3, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + variation.duration);
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.1, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.003);
        
        popOsc.connect(popGain);
        popGain.connect(this.masterGain);
        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        popOsc.start(now);
        popOsc.stop(now + variation.duration);
        clickOsc.start(now);
        clickOsc.stop(now + 0.003);
    }
    
    /**
     * Play match sound - satisfying cascade of cartoon pops
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 10);
        
        // Create bubble wrap style popping cascade with lower frequencies
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.04; // Quick succession
            const startTime = now + delay;
            
            // Each pop is slightly different for bubble wrap feel
            const pitch = 0.8 + Math.random() * 0.4; // Random pitch
            const freq = 250 * pitch + i * 30; // Lower frequencies, gentle rise
            
            // Simple, satisfying pop
            const popOsc = this.audioContext.createOscillator();
            popOsc.type = 'sine';
            popOsc.frequency.setValueAtTime(freq, startTime);
            popOsc.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + 0.04);
            
            const popGain = this.audioContext.createGain();
            const volume = 0.35 * (1 - i * 0.03); // Slightly quieter as cascade continues
            popGain.gain.setValueAtTime(volume, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.04);
            
            popOsc.connect(popGain);
            popGain.connect(this.masterGain);
            
            popOsc.start(startTime);
            popOsc.stop(startTime + 0.04);
        }
        
        // Bonus sound for large combos - satisfying chord
        if (matchSize >= 5) {
            const chordFreqs = [261.63, 329.63, 392.00]; // C major triad
            chordFreqs.forEach((freq, i) => {
                const chordOsc = this.audioContext.createOscillator();
                chordOsc.type = 'triangle';
                chordOsc.frequency.value = freq;
                
                const chordGain = this.audioContext.createGain();
                chordGain.gain.setValueAtTime(0, now);
                chordGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
                chordGain.gain.setValueAtTime(0.2, now + 0.2);
                chordGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                
                chordOsc.connect(chordGain);
                chordGain.connect(this.masterGain);
                
                chordOsc.start(now);
                chordOsc.stop(now + 0.4);
            });
        }
    }
    
    /**
     * Play power-up sound - magical bubble effect
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Magical ascending bubbles
        for (let i = 0; i < 8; i++) {
            const startTime = now + i * 0.04;
            const freq = 400 + i * 200;
            
            const bubbleOsc = this.audioContext.createOscillator();
            bubbleOsc.type = 'sine';
            bubbleOsc.frequency.setValueAtTime(freq, startTime);
            bubbleOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.08);
            
            const bubbleGain = this.audioContext.createGain();
            bubbleGain.gain.setValueAtTime(0.25, startTime);
            bubbleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
            
            // Add shimmer
            const shimmerOsc = this.audioContext.createOscillator();
            shimmerOsc.type = 'triangle';
            shimmerOsc.frequency.value = freq * 3;
            
            const shimmerGain = this.audioContext.createGain();
            shimmerGain.gain.setValueAtTime(0.1, startTime);
            shimmerGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06);
            
            bubbleOsc.connect(bubbleGain);
            bubbleGain.connect(this.masterGain);
            shimmerOsc.connect(shimmerGain);
            shimmerGain.connect(this.masterGain);
            
            bubbleOsc.start(startTime);
            bubbleOsc.stop(startTime + 0.08);
            shimmerOsc.start(startTime);
            shimmerOsc.stop(startTime + 0.06);
        }
    }
    
    /**
     * Play UI click - tiny bubble pop
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Tiny pop
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.02);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.02);
    }
    
    /**
     * Play victory sound - celebration pops
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Firework-style bubble pops
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        
        // Initial burst
        for (let i = 0; i < 12; i++) {
            const startTime = now + i * 0.05;
            const freq = notes[i % notes.length] * (1 + Math.random() * 0.1);
            
            const popOsc = this.audioContext.createOscillator();
            popOsc.type = 'triangle';
            popOsc.frequency.value = freq;
            
            const popGain = this.audioContext.createGain();
            popGain.gain.setValueAtTime(0.3, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            popOsc.connect(popGain);
            popGain.connect(this.masterGain);
            
            popOsc.start(startTime);
            popOsc.stop(startTime + 0.1);
        }
    }
    
    /**
     * Play defeat sound - sad deflating bubbles
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Descending sad bubbles
        for (let i = 0; i < 4; i++) {
            const startTime = now + i * 0.15;
            const freq = 500 - i * 100;
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.2);
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0.25, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.2);
        }
    }
    
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
    
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        console.log(`SatisfyingBubbleSound: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('SatisfyingBubbleSound: Testing satisfying bubble sounds...');
        
        const tests = [
            () => this.playClickSound(),
            () => this.playShootSound(),
            () => this.playAttachSound(),
            () => this.playAttachSound(), // Test variation
            () => this.playMatchSound(3),
            () => this.playMatchSound(5),
            () => this.playMatchSound(7),
            () => this.playPowerUpSound(),
            () => this.playVictorySound()
        ];
        
        tests.forEach((test, i) => {
            setTimeout(test, i * 700);
        });
    }
    
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created',
            type: 'Satisfying cartoon bubble sounds'
        };
    }
    
    public destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.masterGain = null;
        this.isInitialized = false;
        console.log('SatisfyingBubbleSound: Destroyed');
    }
}