/**
 * OptimizedSoundSystem - Research-based sound system for maximum satisfaction
 * Based on 2024 industry best practices for mobile bubble games
 * 
 * Key features:
 * - Multiple sound variations to prevent fatigue
 * - Smooth attack envelopes (10ms+ fade-in)
 * - Frequency ranges optimized for mobile speakers
 * - Dopamine-triggering feedback patterns
 */

import { Scene } from 'phaser';

interface SoundVariation {
    pitch: number;
    volume: number;
    filter?: number;
}

export class OptimizedSoundSystem {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.5; // 50% default as per research
    
    // Sound variation tracking
    private lastShootVariation: number = 0;
    private lastPopVariation: number = 0;
    
    // Sound variations for preventing repetition
    private shootVariations: SoundVariation[] = [
        { pitch: 1.0, volume: 1.0 },
        { pitch: 0.95, volume: 0.95 },
        { pitch: 1.05, volume: 1.05 },
        { pitch: 0.92, volume: 0.98 },
        { pitch: 1.08, volume: 1.02 }
    ];
    
    private popVariations: SoundVariation[] = [
        { pitch: 1.0, volume: 1.0, filter: 1200 },
        { pitch: 0.9, volume: 0.95, filter: 1000 },
        { pitch: 1.1, volume: 1.05, filter: 1400 },
        { pitch: 0.95, volume: 0.98, filter: 1100 },
        { pitch: 1.05, volume: 1.02, filter: 1300 },
        { pitch: 0.88, volume: 0.92, filter: 900 }
    ];
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('OptimizedSoundSystem: Created with research-based parameters');
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
            console.log('OptimizedSoundSystem: Initializing audio context...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Master gain at 50% default (research-based)
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Gentle compressor for consistency without harshness
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -12;
            this.compressor.knee.value = 40;
            this.compressor.ratio.value = 3;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            // Connect chain
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('OptimizedSoundSystem: Initialized successfully');
            
        } catch (error) {
            console.error('OptimizedSoundSystem: Failed to initialize:', error);
        }
    }
    
    /**
     * Get next variation to prevent repetition
     */
    private getNextShootVariation(): SoundVariation {
        this.lastShootVariation = (this.lastShootVariation + 1) % this.shootVariations.length;
        // Skip one to add more randomness
        if (Math.random() > 0.7) {
            this.lastShootVariation = (this.lastShootVariation + 1) % this.shootVariations.length;
        }
        return this.shootVariations[this.lastShootVariation];
    }
    
    private getNextPopVariation(): SoundVariation {
        this.lastPopVariation = (this.lastPopVariation + 1) % this.popVariations.length;
        if (Math.random() > 0.6) {
            this.lastPopVariation = (this.lastPopVariation + 1) % this.popVariations.length;
        }
        return this.popVariations[this.lastPopVariation];
    }
    
    /**
     * Create pink noise for more natural bubble sounds
     */
    private createPinkNoiseBuffer(duration: number): AudioBuffer {
        if (!this.audioContext) throw new Error('Audio context not initialized');
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
        
        return buffer;
    }
    
    /**
     * Play bubble shoot sound - Soft and satisfying (40-50% volume)
     * Duration: 50-100ms, Frequency: 400-800Hz base
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const variation = this.getNextShootVariation();
        
        // Base frequency in optimal range
        const baseFreq = 600 * variation.pitch;
        
        // Main tone - soft sine wave
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.08);
        
        // Soft noise layer for texture
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createPinkNoiseBuffer(0.08);
        
        // Filter for mobile-friendly frequencies
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = baseFreq;
        filter.Q.value = 2;
        
        // Smooth envelope with 10ms attack (research-based)
        const oscGain = this.audioContext.createGain();
        const noiseGain = this.audioContext.createGain();
        
        // 45% volume for shoot sounds (research-based)
        const shootVolume = 0.45 * variation.volume;
        
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(shootVolume, now + 0.01); // 10ms attack
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(shootVolume * 0.3, now + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        
        // Connect
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        
        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        // Start
        osc.start(now);
        osc.stop(now + 0.08);
        noiseSource.start(now);
        noiseSource.stop(now + 0.08);
        
        // Cleanup
        osc.onended = () => {
            osc.disconnect();
            oscGain.disconnect();
            noiseSource.disconnect();
            filter.disconnect();
            noiseGain.disconnect();
        };
    }
    
    /**
     * Play bubble attach sound - Satisfying pop (60-70% volume)
     * Duration: 100-150ms, Frequency: 600-1200Hz
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const variation = this.getNextPopVariation();
        
        // Create multi-layered pop for satisfaction
        const frequency = (variation.filter || 1000) * variation.pitch;
        
        // Layer 1: Impact thud
        const thudOsc = this.audioContext.createOscillator();
        thudOsc.type = 'sine';
        thudOsc.frequency.value = 120 * variation.pitch;
        
        const thudGain = this.audioContext.createGain();
        thudGain.gain.setValueAtTime(0, now);
        thudGain.gain.linearRampToValueAtTime(0.3 * variation.volume, now + 0.005);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        
        // Layer 2: Pop sound with noise
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createPinkNoiseBuffer(0.12);
        
        const popFilter = this.audioContext.createBiquadFilter();
        popFilter.type = 'bandpass';
        popFilter.frequency.setValueAtTime(frequency * 1.5, now);
        popFilter.frequency.exponentialRampToValueAtTime(frequency * 0.5, now + 0.1);
        popFilter.Q.value = 8;
        
        // 65% volume for pop sounds (research-based)
        const popVolume = 0.65 * variation.volume;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(popVolume, now + 0.01); // Smooth 10ms attack
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        // Layer 3: Resonant tone for satisfaction
        const toneOsc = this.audioContext.createOscillator();
        toneOsc.type = 'triangle';
        toneOsc.frequency.value = frequency;
        
        const toneGain = this.audioContext.createGain();
        toneGain.gain.setValueAtTime(0, now);
        toneGain.gain.linearRampToValueAtTime(popVolume * 0.4, now + 0.01);
        toneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // Connect all layers
        thudOsc.connect(thudGain);
        thudGain.connect(this.masterGain);
        
        noiseSource.connect(popFilter);
        popFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        toneOsc.connect(toneGain);
        toneGain.connect(this.masterGain);
        
        // Start all layers
        thudOsc.start(now);
        thudOsc.stop(now + 0.04);
        noiseSource.start(now);
        noiseSource.stop(now + 0.12);
        toneOsc.start(now);
        toneOsc.stop(now + 0.08);
        
        // Cleanup
        thudOsc.onended = () => {
            thudOsc.disconnect();
            thudGain.disconnect();
            noiseSource.disconnect();
            popFilter.disconnect();
            noiseGain.disconnect();
            toneOsc.disconnect();
            toneGain.disconnect();
        };
    }
    
    /**
     * Play match sound - Cascading pops with dopamine-triggering pattern
     * Volume: 70-80% for reward feeling
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 7);
        
        // Create cascading pops with rising satisfaction
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.05; // 50ms apart for cascade effect
            const startTime = now + delay;
            
            // Rising frequency pattern for dopamine trigger
            const baseFreq = 600 + (i * 150);
            const variation = this.popVariations[i % this.popVariations.length];
            
            // Each pop
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = this.createPinkNoiseBuffer(0.08);
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(baseFreq * variation.pitch * 1.5, startTime);
            filter.frequency.exponentialRampToValueAtTime(baseFreq * variation.pitch * 0.7, startTime + 0.08);
            filter.Q.value = 10 - i;
            
            // 75% base volume for match sounds
            const popVolume = 0.75 * variation.volume * (1 - i * 0.05);
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(popVolume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
            
            // Subtle tone for each pop
            const toneOsc = this.audioContext.createOscillator();
            toneOsc.type = 'sine';
            toneOsc.frequency.value = baseFreq * variation.pitch;
            
            const toneGain = this.audioContext.createGain();
            toneGain.gain.setValueAtTime(0, startTime);
            toneGain.gain.linearRampToValueAtTime(popVolume * 0.3, startTime + 0.01);
            toneGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06);
            
            // Connect
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            toneOsc.connect(toneGain);
            toneGain.connect(this.masterGain);
            
            // Start
            noiseSource.start(startTime);
            noiseSource.stop(startTime + 0.08);
            toneOsc.start(startTime);
            toneOsc.stop(startTime + 0.06);
        }
        
        // Add satisfying bass hit for large matches (6+)
        if (matchSize >= 6) {
            const bassOsc = this.audioContext.createOscillator();
            bassOsc.type = 'sine';
            bassOsc.frequency.value = 80;
            
            const bassGain = this.audioContext.createGain();
            bassGain.gain.setValueAtTime(0, now);
            bassGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            
            bassOsc.connect(bassGain);
            bassGain.connect(this.masterGain);
            
            bassOsc.start(now);
            bassOsc.stop(now + 0.4);
        }
    }
    
    /**
     * Play power-up sound - 80% volume for impact
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Magical sweep with energy
        const sweepOsc = this.audioContext.createOscillator();
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(200, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 3;
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.8, now + 0.02); // 80% volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        // Add shimmer
        const shimmerOsc = this.audioContext.createOscillator();
        shimmerOsc.type = 'sine';
        shimmerOsc.frequency.value = 3000;
        
        const shimmerGain = this.audioContext.createGain();
        shimmerGain.gain.setValueAtTime(0, now);
        shimmerGain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        sweepOsc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        shimmerOsc.connect(shimmerGain);
        shimmerGain.connect(this.masterGain);
        
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.4);
        shimmerOsc.start(now);
        shimmerOsc.stop(now + 0.3);
    }
    
    /**
     * Play UI click - 30% volume for subtlety
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 900;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.02);
    }
    
    /**
     * Play victory sound - 90% volume for celebration
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Ascending celebration pops
        const frequencies = [400, 500, 600, 800, 1000, 1200, 1600, 2000];
        
        frequencies.forEach((freq, i) => {
            const delay = i * 0.1;
            const startTime = now + delay;
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.9, startTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    /**
     * Play defeat sound - 60% volume to not punish
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Gentle deflating sound
        const osc = this.audioContext.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.8);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.8);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.8);
    }
    
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
    
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        console.log(`OptimizedSoundSystem: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('OptimizedSoundSystem: Testing all sounds with variations...');
        
        const tests = [
            () => this.playClickSound(),
            () => this.playShootSound(),
            () => this.playShootSound(), // Test variation
            () => this.playAttachSound(),
            () => this.playAttachSound(), // Test variation
            () => this.playMatchSound(3),
            () => this.playMatchSound(5),
            () => this.playMatchSound(7),
            () => this.playPowerUpSound(),
            () => this.playVictorySound()
        ];
        
        tests.forEach((test, i) => {
            setTimeout(test, i * 600);
        });
    }
    
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created',
            research: 'Optimized based on 2024 industry research'
        };
    }
    
    public destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
        this.isInitialized = false;
        console.log('OptimizedSoundSystem: Destroyed');
    }
}