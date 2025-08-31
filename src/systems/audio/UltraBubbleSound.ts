/**
 * UltraBubbleSound - Ultra-realistic bubble sounds using advanced synthesis
 * Focuses on authentic bubble physics with satisfying, juicy feedback
 */

import { Scene } from 'phaser';

export class UltraBubbleSound {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.7;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('UltraBubbleSound: Created');
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
            console.log('UltraBubbleSound: Initializing...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 48000
            });
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Master compressor for consistent volume
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('UltraBubbleSound: Initialized');
            
        } catch (error) {
            console.error('UltraBubbleSound: Failed to initialize:', error);
        }
    }
    
    /**
     * Play bubble launch sound - compressed air release with liquid coating
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Layer 1: Air compression release (whoosh)
        const airNoise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 0.15;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate filtered white noise for air sound
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        airNoise.buffer = buffer;
        
        // Bandpass filter for air whoosh
        const airFilter = this.audioContext.createBiquadFilter();
        airFilter.type = 'bandpass';
        airFilter.frequency.value = 800;
        airFilter.Q.value = 2;
        
        // Layer 2: Liquid bubble formation
        const bubbleOsc = this.audioContext.createOscillator();
        bubbleOsc.type = 'sine';
        bubbleOsc.frequency.setValueAtTime(250, now);
        bubbleOsc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
        
        // Layer 3: Surface tension snap
        const snapOsc = this.audioContext.createOscillator();
        snapOsc.type = 'sawtooth';
        snapOsc.frequency.value = 1500;
        
        // Modulation for liquid wobble
        const wobbleLFO = this.audioContext.createOscillator();
        wobbleLFO.frequency.value = 30;
        const wobbleGain = this.audioContext.createGain();
        wobbleGain.gain.value = 20;
        wobbleLFO.connect(wobbleGain);
        wobbleGain.connect(bubbleOsc.frequency);
        
        // Envelopes
        const airGain = this.audioContext.createGain();
        airGain.gain.setValueAtTime(0.3, now);
        airGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        const bubbleGain = this.audioContext.createGain();
        bubbleGain.gain.setValueAtTime(0, now);
        bubbleGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
        bubbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        const snapGain = this.audioContext.createGain();
        snapGain.gain.setValueAtTime(0.15, now);
        snapGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
        
        // Connect
        airNoise.connect(airFilter);
        airFilter.connect(airGain);
        airGain.connect(this.compressor);
        
        bubbleOsc.connect(bubbleGain);
        bubbleGain.connect(this.compressor);
        
        snapOsc.connect(snapGain);
        snapGain.connect(this.compressor);
        
        // Start
        airNoise.start(now);
        bubbleOsc.start(now);
        snapOsc.start(now);
        wobbleLFO.start(now);
        
        // Stop
        airNoise.stop(now + 0.15);
        bubbleOsc.stop(now + 0.12);
        snapOsc.stop(now + 0.01);
        wobbleLFO.stop(now + 0.12);
    }
    
    /**
     * Play bubble attach sound - wet impact with bubble merge
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Layer 1: Impact thud (low frequency)
        const impactOsc = this.audioContext.createOscillator();
        impactOsc.type = 'sine';
        impactOsc.frequency.setValueAtTime(120, now);
        impactOsc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
        
        // Layer 2: Bubble membrane vibration
        const membraneOsc = this.audioContext.createOscillator();
        membraneOsc.type = 'triangle';
        membraneOsc.frequency.setValueAtTime(400, now);
        membraneOsc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
        
        // Layer 3: Liquid splash (filtered noise)
        const splashNoise = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 0.08;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        splashNoise.buffer = buffer;
        
        const splashFilter = this.audioContext.createBiquadFilter();
        splashFilter.type = 'highpass';
        splashFilter.frequency.value = 2000;
        splashFilter.Q.value = 1;
        
        // Layer 4: Resonant pop
        const popOsc = this.audioContext.createOscillator();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(800, now);
        popOsc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
        
        // Envelopes
        const impactGain = this.audioContext.createGain();
        impactGain.gain.setValueAtTime(0.5, now);
        impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        const membraneGain = this.audioContext.createGain();
        membraneGain.gain.setValueAtTime(0.3, now);
        membraneGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        const splashGain = this.audioContext.createGain();
        splashGain.gain.setValueAtTime(0.2, now);
        splashGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        const popGain = this.audioContext.createGain();
        popGain.gain.setValueAtTime(0.4, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        
        // Connect
        impactOsc.connect(impactGain);
        impactGain.connect(this.compressor);
        
        membraneOsc.connect(membraneGain);
        membraneGain.connect(this.compressor);
        
        splashNoise.connect(splashFilter);
        splashFilter.connect(splashGain);
        splashGain.connect(this.compressor);
        
        popOsc.connect(popGain);
        popGain.connect(this.compressor);
        
        // Start
        impactOsc.start(now);
        membraneOsc.start(now);
        splashNoise.start(now);
        popOsc.start(now);
        
        // Stop
        impactOsc.stop(now + 0.05);
        membraneOsc.stop(now + 0.08);
        splashNoise.stop(now + 0.08);
        popOsc.stop(now + 0.03);
    }
    
    /**
     * Play match sound - cascading bubble pops with harmonics
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 8);
        
        // Base frequencies for musical progression
        const baseFreqs = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.05;
            const startTime = now + delay;
            
            // Main bubble pop with harmonic richness
            const freq = baseFreqs[i % baseFreqs.length];
            
            // Fundamental
            const fundOsc = this.audioContext.createOscillator();
            fundOsc.type = 'sine';
            fundOsc.frequency.setValueAtTime(freq, startTime);
            fundOsc.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + 0.1);
            
            // Second harmonic
            const harm2Osc = this.audioContext.createOscillator();
            harm2Osc.type = 'sine';
            harm2Osc.frequency.value = freq * 2;
            
            // Third harmonic
            const harm3Osc = this.audioContext.createOscillator();
            harm3Osc.type = 'sine';
            harm3Osc.frequency.value = freq * 3;
            
            // Pop transient
            const popNoise = this.audioContext.createBufferSource();
            const bufferSize = this.audioContext.sampleRate * 0.02;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let j = 0; j < bufferSize; j++) {
                data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.1));
            }
            popNoise.buffer = buffer;
            
            // Filter for pop character
            const popFilter = this.audioContext.createBiquadFilter();
            popFilter.type = 'bandpass';
            popFilter.frequency.value = freq * 2;
            popFilter.Q.value = 5;
            
            // Gains
            const fundGain = this.audioContext.createGain();
            fundGain.gain.setValueAtTime(0.4 * (1 - i * 0.05), startTime);
            fundGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            const harm2Gain = this.audioContext.createGain();
            harm2Gain.gain.setValueAtTime(0.2 * (1 - i * 0.05), startTime);
            harm2Gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
            
            const harm3Gain = this.audioContext.createGain();
            harm3Gain.gain.setValueAtTime(0.1 * (1 - i * 0.05), startTime);
            harm3Gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06);
            
            const popGain = this.audioContext.createGain();
            popGain.gain.setValueAtTime(0.3, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.02);
            
            // Panning for stereo spread
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = (i - popCount/2) * 0.3;
            
            // Connect
            fundOsc.connect(fundGain);
            fundGain.connect(panner);
            
            harm2Osc.connect(harm2Gain);
            harm2Gain.connect(panner);
            
            harm3Osc.connect(harm3Gain);
            harm3Gain.connect(panner);
            
            popNoise.connect(popFilter);
            popFilter.connect(popGain);
            popGain.connect(panner);
            
            panner.connect(this.compressor);
            
            // Start
            fundOsc.start(startTime);
            harm2Osc.start(startTime);
            harm3Osc.start(startTime);
            popNoise.start(startTime);
            
            // Stop
            fundOsc.stop(startTime + 0.1);
            harm2Osc.stop(startTime + 0.08);
            harm3Osc.stop(startTime + 0.06);
            popNoise.stop(startTime + 0.02);
        }
        
        // Bonus celebration for large combos
        if (matchSize >= 5) {
            this.playBonusChord(now + popCount * 0.05);
        }
    }
    
    private playBonusChord(startTime: number): void {
        if (!this.audioContext || !this.compressor) return;
        
        // Major chord with shimmer
        const chordNotes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        
        chordNotes.forEach((freq, i) => {
            const osc = this.audioContext!.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            // Add slight detune for richness
            const detuneOsc = this.audioContext!.createOscillator();
            detuneOsc.type = 'sine';
            detuneOsc.frequency.value = freq * 1.01;
            
            const gain = this.audioContext!.createGain();
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
            gain.gain.setValueAtTime(0.3, startTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
            
            const detuneGain = this.audioContext!.createGain();
            detuneGain.gain.setValueAtTime(0, startTime);
            detuneGain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            detuneGain.gain.setValueAtTime(0.15, startTime + 0.3);
            detuneGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
            
            osc.connect(gain);
            detuneOsc.connect(detuneGain);
            gain.connect(this.compressor!);
            detuneGain.connect(this.compressor!);
            
            osc.start(startTime);
            detuneOsc.start(startTime);
            osc.stop(startTime + 0.6);
            detuneOsc.stop(startTime + 0.6);
        });
    }
    
    /**
     * Play power-up sound
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Ascending magical bubbles
        for (let i = 0; i < 6; i++) {
            const startTime = now + i * 0.06;
            const freq = 400 * Math.pow(1.2, i);
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.15);
            
            // Add sparkle
            const sparkleOsc = this.audioContext.createOscillator();
            sparkleOsc.type = 'triangle';
            sparkleOsc.frequency.value = freq * 4;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            const sparkleGain = this.audioContext.createGain();
            sparkleGain.gain.setValueAtTime(0.1, startTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.connect(gain);
            sparkleOsc.connect(sparkleGain);
            gain.connect(this.compressor);
            sparkleGain.connect(this.compressor);
            
            osc.start(startTime);
            sparkleOsc.start(startTime);
            osc.stop(startTime + 0.15);
            sparkleOsc.stop(startTime + 0.1);
        }
    }
    
    /**
     * Play UI click
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        osc.connect(gain);
        gain.connect(this.compressor);
        
        osc.start(now);
        osc.stop(now + 0.02);
    }
    
    /**
     * Play victory sound
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Victory fanfare with bubbles
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        for (let i = 0; i < 16; i++) {
            const startTime = now + i * 0.08;
            const freq = notes[i % notes.length] * (1 + (i / 16) * 0.5);
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3 * (1 - i * 0.03), startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            // Stereo spread
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = Math.sin(i * 0.5) * 0.8;
            
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.compressor);
            
            osc.start(startTime);
            osc.stop(startTime + 0.15);
        }
    }
    
    /**
     * Play defeat sound
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.compressor || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Descending deflating bubbles
        for (let i = 0; i < 5; i++) {
            const startTime = now + i * 0.2;
            const freq = 400 / (i + 1);
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.3);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.connect(gain);
            gain.connect(this.compressor);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
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
        console.log(`UltraBubbleSound: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('UltraBubbleSound: Testing ultra bubble sounds...');
        
        const tests = [
            () => { console.log('Click'); this.playClickSound(); },
            () => { console.log('Shoot'); this.playShootSound(); },
            () => { console.log('Attach'); this.playAttachSound(); },
            () => { console.log('Match 3'); this.playMatchSound(3); },
            () => { console.log('Match 5'); this.playMatchSound(5); },
            () => { console.log('Match 7'); this.playMatchSound(7); },
            () => { console.log('Power-up'); this.playPowerUpSound(); },
            () => { console.log('Victory'); this.playVictorySound(); }
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
            type: 'Ultra-realistic bubble sounds with advanced synthesis'
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
        console.log('UltraBubbleSound: Destroyed');
    }
}