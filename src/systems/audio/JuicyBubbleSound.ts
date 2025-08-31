/**
 * JuicyBubbleSound - Professional, juicy bubble sounds with impact
 * Rich, satisfying sounds that feel premium
 */

import { Scene } from 'phaser';

export class JuicyBubbleSound {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.7;
    
    // Track variations
    private shootVariation: number = 0;
    private popVariation: number = 0;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('JuicyBubbleSound: Created');
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
            console.log('JuicyBubbleSound: Initializing...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Add compressor for punch
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -10;
            this.compressor.knee.value = 40;
            this.compressor.ratio.value = 4;
            this.compressor.attack.value = 0;
            this.compressor.release.value = 0.25;
            
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('JuicyBubbleSound: Initialized');
            
        } catch (error) {
            console.error('JuicyBubbleSound: Failed to initialize:', error);
        }
    }
    
    /**
     * Play JUICY bubble launch sound - Professional with impact
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Variation for richness
        const variations = [1.0, 0.95, 1.05, 0.9, 1.1];
        this.shootVariation = (this.shootVariation + 1) % variations.length;
        const pitchMod = variations[this.shootVariation];
        
        // LAYER 1: Impact thump (bass)
        const bassOsc = this.audioContext.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(80 * pitchMod, now);
        bassOsc.frequency.exponentialRampToValueAtTime(60 * pitchMod, now + 0.1);
        
        const bassGain = this.audioContext.createGain();
        bassGain.gain.setValueAtTime(0.4, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        // LAYER 2: Mid "whoosh" for body
        const midOsc = this.audioContext.createOscillator();
        midOsc.type = 'triangle';
        midOsc.frequency.setValueAtTime(200 * pitchMod, now);
        midOsc.frequency.exponentialRampToValueAtTime(400 * pitchMod, now + 0.05);
        midOsc.frequency.exponentialRampToValueAtTime(300 * pitchMod, now + 0.12);
        
        const midGain = this.audioContext.createGain();
        midGain.gain.setValueAtTime(0, now);
        midGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
        midGain.gain.setValueAtTime(0.3, now + 0.05);
        midGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        // LAYER 3: High frequency "air" for crispness
        const airOsc = this.audioContext.createOscillator();
        airOsc.type = 'sine';
        airOsc.frequency.setValueAtTime(800 * pitchMod, now);
        airOsc.frequency.exponentialRampToValueAtTime(1200 * pitchMod, now + 0.03);
        airOsc.frequency.exponentialRampToValueAtTime(600 * pitchMod, now + 0.08);
        
        const airGain = this.audioContext.createGain();
        airGain.gain.setValueAtTime(0, now);
        airGain.gain.linearRampToValueAtTime(0.15, now + 0.005);
        airGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // LAYER 4: White noise for texture
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.3;
        }
        
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000 * pitchMod;
        noiseFilter.Q.value = 2;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        // Connect all layers
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);
        
        midOsc.connect(midGain);
        midGain.connect(this.masterGain);
        
        airOsc.connect(airGain);
        airGain.connect(this.masterGain);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        // Start all layers
        bassOsc.start(now);
        bassOsc.stop(now + 0.1);
        midOsc.start(now);
        midOsc.stop(now + 0.12);
        airOsc.start(now);
        airOsc.stop(now + 0.08);
        noiseSource.start(now);
        noiseSource.stop(now + 0.05);
    }
    
    /**
     * Play JUICY bubble pop/attach - Satisfying with multiple layers
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Variations
        const variations = [1.0, 0.9, 1.1, 0.95, 1.05, 0.85, 1.15];
        this.popVariation = (this.popVariation + 1) % variations.length;
        const pitch = variations[this.popVariation];
        
        // LAYER 1: Initial "crack" - the bubble breaking
        const crackOsc = this.audioContext.createOscillator();
        crackOsc.type = 'sawtooth';
        crackOsc.frequency.value = 2000 * pitch;
        
        const crackFilter = this.audioContext.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.value = 1000;
        crackFilter.Q.value = 5;
        
        const crackGain = this.audioContext.createGain();
        crackGain.gain.setValueAtTime(0.3, now);
        crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
        
        // LAYER 2: The main "pop" body
        const popOsc = this.audioContext.createOscillator();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(400 * pitch, now);
        popOsc.frequency.exponentialRampToValueAtTime(200 * pitch, now + 0.05);
        
        const popGain = this.audioContext.createGain();
        popGain.gain.setValueAtTime(0, now);
        popGain.gain.linearRampToValueAtTime(0.5, now + 0.002);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        // LAYER 3: Sub bass for weight
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.value = 100 * pitch;
        
        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0.3, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        
        // LAYER 4: Resonance tail for juiciness
        const resOsc = this.audioContext.createOscillator();
        resOsc.type = 'triangle';
        resOsc.frequency.value = 800 * pitch;
        
        const resGain = this.audioContext.createGain();
        resGain.gain.setValueAtTime(0, now);
        resGain.gain.setValueAtTime(0, now + 0.002);
        resGain.gain.linearRampToValueAtTime(0.2, now + 0.005);
        resGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // Connect all
        crackOsc.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.masterGain);
        
        popOsc.connect(popGain);
        popGain.connect(this.masterGain);
        
        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        
        resOsc.connect(resGain);
        resGain.connect(this.masterGain);
        
        // Start all
        crackOsc.start(now);
        crackOsc.stop(now + 0.01);
        popOsc.start(now);
        popOsc.stop(now + 0.05);
        subOsc.start(now);
        subOsc.stop(now + 0.03);
        resOsc.start(now);
        resOsc.stop(now + 0.08);
    }
    
    /**
     * Play JUICY combo sound - Cascade of satisfying pops
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 10);
        
        // Create JUICY cascading pops
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.035;
            const startTime = now + delay;
            
            // Variation per pop
            const pitch = 0.7 + Math.random() * 0.6;
            const baseFreq = 300 + i * 40;
            
            // Main pop
            const popOsc = this.audioContext.createOscillator();
            popOsc.type = 'sine';
            popOsc.frequency.setValueAtTime(baseFreq * pitch * 1.5, startTime);
            popOsc.frequency.exponentialRampToValueAtTime(baseFreq * pitch, startTime + 0.03);
            
            const popGain = this.audioContext.createGain();
            const volume = 0.4 * (1 - i * 0.06);
            popGain.gain.setValueAtTime(volume, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.03);
            
            // Add crack for each pop
            const crackOsc = this.audioContext.createOscillator();
            crackOsc.type = 'square';
            crackOsc.frequency.value = 1000 + i * 100;
            
            const crackGain = this.audioContext.createGain();
            crackGain.gain.setValueAtTime(volume * 0.2, startTime);
            crackGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.005);
            
            popOsc.connect(popGain);
            popGain.connect(this.masterGain);
            crackOsc.connect(crackGain);
            crackGain.connect(this.masterGain);
            
            popOsc.start(startTime);
            popOsc.stop(startTime + 0.03);
            crackOsc.start(startTime);
            crackOsc.stop(startTime + 0.005);
        }
        
        // BIG IMPACT for large combos
        if (matchSize >= 5) {
            // Deep impact bass
            const impactOsc = this.audioContext.createOscillator();
            impactOsc.type = 'sine';
            impactOsc.frequency.setValueAtTime(50, now);
            impactOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            
            const impactGain = this.audioContext.createGain();
            impactGain.gain.setValueAtTime(0, now);
            impactGain.gain.linearRampToValueAtTime(0.6, now + 0.02);
            impactGain.gain.setValueAtTime(0.6, now + 0.1);
            impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            // Celebration chord
            const chord = [261.63, 329.63, 392.00, 523.25]; // C major with octave
            chord.forEach((freq, i) => {
                const chordOsc = this.audioContext.createOscillator();
                chordOsc.type = 'triangle';
                chordOsc.frequency.value = freq;
                
                const chordGain = this.audioContext.createGain();
                chordGain.gain.setValueAtTime(0, now);
                chordGain.gain.linearRampToValueAtTime(0.15, now + 0.05 + i * 0.01);
                chordGain.gain.setValueAtTime(0.15, now + 0.2);
                chordGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                
                chordOsc.connect(chordGain);
                chordGain.connect(this.masterGain);
                
                chordOsc.start(now);
                chordOsc.stop(now + 0.5);
            });
            
            impactOsc.connect(impactGain);
            impactGain.connect(this.masterGain);
            
            impactOsc.start(now);
            impactOsc.stop(now + 0.3);
        }
    }
    
    /**
     * Play power-up sound - Epic and juicy
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // EPIC sweep up
        const sweepOsc = this.audioContext.createOscillator();
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(100, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(1600, now + 0.3);
        
        const sweepFilter = this.audioContext.createBiquadFilter();
        sweepFilter.type = 'lowpass';
        sweepFilter.frequency.setValueAtTime(200, now);
        sweepFilter.frequency.exponentialRampToValueAtTime(4000, now + 0.3);
        sweepFilter.Q.value = 5;
        
        const sweepGain = this.audioContext.createGain();
        sweepGain.gain.setValueAtTime(0, now);
        sweepGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
        sweepGain.gain.setValueAtTime(0.5, now + 0.2);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        // Sparkle on top
        for (let i = 0; i < 8; i++) {
            const sparkleTime = now + i * 0.04;
            const sparkleOsc = this.audioContext.createOscillator();
            sparkleOsc.type = 'sine';
            sparkleOsc.frequency.value = 1000 + i * 300;
            
            const sparkleGain = this.audioContext.createGain();
            sparkleGain.gain.setValueAtTime(0.15, sparkleTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, sparkleTime + 0.05);
            
            sparkleOsc.connect(sparkleGain);
            sparkleGain.connect(this.masterGain);
            
            sparkleOsc.start(sparkleTime);
            sparkleOsc.stop(sparkleTime + 0.05);
        }
        
        sweepOsc.connect(sweepFilter);
        sweepFilter.connect(sweepGain);
        sweepGain.connect(this.masterGain);
        
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.4);
    }
    
    /**
     * UI click - Quick and responsive
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(800, now);
        clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.25, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
    }
    
    /**
     * Victory - Epic celebration
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Victory fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        const rhythm = [0, 0.1, 0.2, 0.35];
        
        notes.forEach((freq, i) => {
            const startTime = now + rhythm[i];
            
            // Main note
            const noteOsc = this.audioContext.createOscillator();
            noteOsc.type = 'square';
            noteOsc.frequency.value = freq;
            
            const noteGain = this.audioContext.createGain();
            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
            noteGain.gain.setValueAtTime(0.3, startTime + 0.15);
            noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            // Harmony
            const harmonyOsc = this.audioContext.createOscillator();
            harmonyOsc.type = 'triangle';
            harmonyOsc.frequency.value = freq * 0.5;
            
            const harmonyGain = this.audioContext.createGain();
            harmonyGain.gain.setValueAtTime(0.15, startTime);
            harmonyGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            noteOsc.connect(noteGain);
            noteGain.connect(this.masterGain);
            harmonyOsc.connect(harmonyGain);
            harmonyGain.connect(this.masterGain);
            
            noteOsc.start(startTime);
            noteOsc.stop(startTime + 0.3);
            harmonyOsc.start(startTime);
            harmonyOsc.stop(startTime + 0.4);
        });
    }
    
    /**
     * Defeat - Sad but not annoying
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Descending notes
        const notes = [400, 350, 300, 250];
        
        notes.forEach((freq, i) => {
            const startTime = now + i * 0.15;
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.9, startTime + 0.15);
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0.25, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        });
    }
    
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
    
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        console.log(`JuicyBubbleSound: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('JuicyBubbleSound: Testing JUICY sounds...');
        
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
            setTimeout(test, i * 800);
        });
    }
    
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created',
            type: 'JUICY professional bubble sounds'
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
        console.log('JuicyBubbleSound: Destroyed');
    }
}