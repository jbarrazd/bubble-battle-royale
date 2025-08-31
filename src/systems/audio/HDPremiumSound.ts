/**
 * HDPremiumSound - Ultra HD quality bubble sounds with refined explosions
 * Optimized for mobile with crystal clear audio
 */

import { Scene } from 'phaser';

export class HDPremiumSound {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private convolver: ConvolverNode | null = null;
    private preDelay: DelayNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.8;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('HDPremiumSound: Created');
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
            console.log('HDPremiumSound: Initializing HD audio...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 48000,
                latencyHint: 'interactive'
            });
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create subtle room reverb
            await this.createReverb();
            
            // Minimal pre-delay for depth
            this.preDelay = this.audioContext.createDelay(0.1);
            this.preDelay.delayTime.value = 0.001;
            
            // Professional compressor
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -18;
            this.compressor.knee.value = 35;
            this.compressor.ratio.value = 6;
            this.compressor.attack.value = 0.0005;
            this.compressor.release.value = 0.05;
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Signal chain
            this.preDelay.connect(this.compressor);
            if (this.convolver) {
                const reverbGain = this.audioContext.createGain();
                reverbGain.gain.value = 0.15; // Very subtle reverb
                this.preDelay.connect(this.convolver);
                this.convolver.connect(reverbGain);
                reverbGain.connect(this.compressor);
            }
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('HDPremiumSound: HD audio initialized');
            
        } catch (error) {
            console.error('HDPremiumSound: Failed to initialize:', error);
        }
    }
    
    private async createReverb(): Promise<void> {
        if (!this.audioContext) return;
        
        const length = this.audioContext.sampleRate * 0.3;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3) * 0.03;
            }
        }
        
        this.convolver = this.audioContext.createConvolver();
        this.convolver.buffer = impulse;
    }
    
    /**
     * Refined bubble launch sound - softer and more pleasant
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Layer 1: Soft air cushion
        const airOsc = this.audioContext.createOscillator();
        airOsc.type = 'sine';
        airOsc.frequency.setValueAtTime(150, now);
        airOsc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        
        // Layer 2: Bubble formation with smooth envelope
        const bubbleOsc = this.audioContext.createOscillator();
        bubbleOsc.type = 'triangle';
        bubbleOsc.frequency.setValueAtTime(280, now);
        bubbleOsc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        
        // Layer 3: Gentle whoosh
        const whooshBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const whooshData = whooshBuffer.getChannelData(0);
        
        for (let i = 0; i < whooshData.length; i++) {
            const envelope = Math.sin((i / whooshData.length) * Math.PI);
            whooshData[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
        
        const whooshSource = this.audioContext.createBufferSource();
        whooshSource.buffer = whooshBuffer;
        
        const whooshFilter = this.audioContext.createBiquadFilter();
        whooshFilter.type = 'lowpass';
        whooshFilter.frequency.setValueAtTime(2000, now);
        whooshFilter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        whooshFilter.Q.value = 1;
        
        // Layer 4: Subtle pop
        const popOsc = this.audioContext.createOscillator();
        popOsc.type = 'sine';
        popOsc.frequency.value = 100;
        
        // Gains with smoother envelopes
        const airGain = this.audioContext.createGain();
        airGain.gain.setValueAtTime(0, now);
        airGain.gain.linearRampToValueAtTime(0.25, now + 0.008);
        airGain.gain.setValueAtTime(0.25, now + 0.04);
        airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        const bubbleGain = this.audioContext.createGain();
        bubbleGain.gain.setValueAtTime(0, now);
        bubbleGain.gain.linearRampToValueAtTime(0.35, now + 0.01);
        bubbleGain.gain.setValueAtTime(0.35, now + 0.05);
        bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        const whooshGain = this.audioContext.createGain();
        whooshGain.gain.setValueAtTime(0.2, now);
        whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        const popGain = this.audioContext.createGain();
        popGain.gain.setValueAtTime(0.1, now);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.002);
        
        // Connect
        airOsc.connect(airGain);
        airGain.connect(this.preDelay);
        
        bubbleOsc.connect(bubbleGain);
        bubbleGain.connect(this.preDelay);
        
        whooshSource.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(this.preDelay);
        
        popOsc.connect(popGain);
        popGain.connect(this.preDelay);
        
        // Start
        airOsc.start(now);
        bubbleOsc.start(now);
        whooshSource.start(now);
        popOsc.start(now);
        
        // Stop
        airOsc.stop(now + 0.12);
        bubbleOsc.stop(now + 0.1);
        whooshSource.stop(now + 0.1);
        popOsc.stop(now + 0.002);
    }
    
    /**
     * Refined bubble attach sound - crisp and satisfying
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Layer 1: Solid impact thud
        const impactOsc = this.audioContext.createOscillator();
        impactOsc.type = 'sine';
        impactOsc.frequency.setValueAtTime(110, now);
        impactOsc.frequency.exponentialRampToValueAtTime(55, now + 0.05);
        
        // Layer 2: Bubble stick sound
        const stickOsc = this.audioContext.createOscillator();
        stickOsc.type = 'triangle';
        stickOsc.frequency.setValueAtTime(380, now);
        stickOsc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
        
        // Layer 3: Wet suction
        const suctionBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.08, this.audioContext.sampleRate);
        const suctionData = suctionBuffer.getChannelData(0);
        
        for (let i = 0; i < suctionData.length; i++) {
            const envelope = Math.exp(-i / (suctionData.length * 0.1));
            suctionData[i] = (Math.random() * 2 - 1) * envelope * 0.5;
        }
        
        const suctionSource = this.audioContext.createBufferSource();
        suctionSource.buffer = suctionBuffer;
        
        const suctionFilter = this.audioContext.createBiquadFilter();
        suctionFilter.type = 'bandpass';
        suctionFilter.frequency.value = 1800;
        suctionFilter.Q.value = 4;
        
        // Layer 4: Click transient
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'square';
        clickOsc.frequency.value = 1000;
        
        // Gains
        const impactGain = this.audioContext.createGain();
        impactGain.gain.setValueAtTime(0.5, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        const stickGain = this.audioContext.createGain();
        stickGain.gain.setValueAtTime(0.3, now);
        stickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        
        const suctionGain = this.audioContext.createGain();
        suctionGain.gain.setValueAtTime(0.25, now);
        suctionGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.15, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.001);
        
        // Connect
        impactOsc.connect(impactGain);
        impactGain.connect(this.preDelay);
        
        stickOsc.connect(stickGain);
        stickGain.connect(this.preDelay);
        
        suctionSource.connect(suctionFilter);
        suctionFilter.connect(suctionGain);
        suctionGain.connect(this.preDelay);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.preDelay);
        
        // Start
        impactOsc.start(now);
        stickOsc.start(now);
        suctionSource.start(now);
        clickOsc.start(now);
        
        // Stop
        impactOsc.stop(now + 0.05);
        stickOsc.stop(now + 0.06);
        suctionSource.stop(now + 0.08);
        clickOsc.stop(now + 0.001);
    }
    
    /**
     * HD Quality bubble explosion sounds - crisp and impactful
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const explosionCount = Math.min(matchSize, 7);
        
        // Musical progression for satisfying cascade
        const notes = [261.63, 311.13, 349.23, 392.00, 440.00, 493.88, 523.25];
        
        for (let i = 0; i < explosionCount; i++) {
            const delay = i * 0.04; // Rapid cascade
            const startTime = now + delay;
            const baseFreq = notes[i % notes.length];
            
            // === Explosion core ===
            const explosionOsc = this.audioContext.createOscillator();
            explosionOsc.type = 'sawtooth';
            explosionOsc.frequency.setValueAtTime(baseFreq * 0.5, startTime);
            explosionOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.25, startTime + 0.15);
            
            // === Pop harmonics ===
            const popOsc = this.audioContext.createOscillator();
            popOsc.type = 'sine';
            popOsc.frequency.setValueAtTime(baseFreq * 2, startTime);
            popOsc.frequency.exponentialRampToValueAtTime(baseFreq, startTime + 0.1);
            
            // === Burst noise ===
            const burstBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate);
            const burstData = burstBuffer.getChannelData(0);
            
            for (let j = 0; j < burstData.length; j++) {
                const env = Math.exp(-j / (burstData.length * 0.05));
                const noise = Math.random() * 2 - 1;
                burstData[j] = noise * env;
            }
            
            const burstSource = this.audioContext.createBufferSource();
            burstSource.buffer = burstBuffer;
            
            // Filter for crisp burst
            const burstFilter = this.audioContext.createBiquadFilter();
            burstFilter.type = 'highpass';
            burstFilter.frequency.value = 1000 + i * 200;
            burstFilter.Q.value = 2;
            
            // === Crystal chime for sparkle ===
            const chimeOsc = this.audioContext.createOscillator();
            chimeOsc.type = 'triangle';
            chimeOsc.frequency.value = baseFreq * 4;
            
            // Dynamic volume based on cascade position
            const baseVolume = 0.5 * Math.pow(0.85, i);
            
            // Explosion gain
            const explosionGain = this.audioContext.createGain();
            explosionGain.gain.setValueAtTime(baseVolume * 0.6, startTime);
            explosionGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            
            // Pop gain
            const popGain = this.audioContext.createGain();
            popGain.gain.setValueAtTime(baseVolume * 0.4, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            // Burst gain
            const burstGain = this.audioContext.createGain();
            burstGain.gain.setValueAtTime(baseVolume * 0.5, startTime);
            burstGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);
            
            // Chime gain
            const chimeGain = this.audioContext.createGain();
            chimeGain.gain.setValueAtTime(baseVolume * 0.2, startTime);
            chimeGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
            
            // Stereo positioning for width
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = (i - explosionCount/2) * 0.4;
            
            // Connect explosion chain
            explosionOsc.connect(explosionGain);
            explosionGain.connect(panner);
            
            popOsc.connect(popGain);
            popGain.connect(panner);
            
            burstSource.connect(burstFilter);
            burstFilter.connect(burstGain);
            burstGain.connect(panner);
            
            chimeOsc.connect(chimeGain);
            chimeGain.connect(panner);
            
            panner.connect(this.preDelay);
            
            // Start
            explosionOsc.start(startTime);
            popOsc.start(startTime);
            burstSource.start(startTime);
            chimeOsc.start(startTime);
            
            // Stop
            explosionOsc.stop(startTime + 0.15);
            popOsc.stop(startTime + 0.1);
            burstSource.stop(startTime + 0.05);
            chimeOsc.stop(startTime + 0.08);
        }
        
        // === Big combo celebration ===
        if (matchSize >= 5) {
            this.playComboExplosion(now + explosionCount * 0.04, matchSize);
        }
    }
    
    private playComboExplosion(startTime: number, comboSize: number): void {
        if (!this.audioContext || !this.preDelay) return;
        
        // Deep bass drop
        const bassOsc = this.audioContext.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(55, startTime);
        bassOsc.frequency.exponentialRampToValueAtTime(27.5, startTime + 0.5);
        
        // Explosion sweep
        const sweepOsc = this.audioContext.createOscillator();
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.setValueAtTime(2000, startTime);
        sweepOsc.frequency.exponentialRampToValueAtTime(100, startTime + 0.3);
        
        // Victory chord
        const chordFreqs = [261.63, 329.63, 392.00, 523.25, 659.25];
        
        chordFreqs.forEach((freq, i) => {
            const chordOsc = this.audioContext!.createOscillator();
            chordOsc.type = 'triangle';
            chordOsc.frequency.value = freq;
            
            const chordGain = this.audioContext!.createGain();
            chordGain.gain.setValueAtTime(0, startTime);
            chordGain.gain.linearRampToValueAtTime(0.3 / (i + 1), startTime + 0.05);
            chordGain.gain.setValueAtTime(0.3 / (i + 1), startTime + 0.3);
            chordGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
            
            chordOsc.connect(chordGain);
            chordGain.connect(this.preDelay!);
            
            chordOsc.start(startTime);
            chordOsc.stop(startTime + 0.6);
        });
        
        // Gains
        const bassGain = this.audioContext.createGain();
        bassGain.gain.setValueAtTime(0.6, startTime);
        bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        
        const sweepGain = this.audioContext.createGain();
        sweepGain.gain.setValueAtTime(0.2, startTime);
        sweepGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        
        // Connect
        bassOsc.connect(bassGain);
        bassGain.connect(this.preDelay);
        
        sweepOsc.connect(sweepGain);
        sweepGain.connect(this.preDelay);
        
        // Start
        bassOsc.start(startTime);
        sweepOsc.start(startTime);
        
        // Stop
        bassOsc.stop(startTime + 0.5);
        sweepOsc.stop(startTime + 0.3);
    }
    
    /**
     * Power-up sound
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Magical ascending sweep
        for (let i = 0; i < 6; i++) {
            const startTime = now + i * 0.05;
            const freq = 400 * Math.pow(1.2, i);
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.15);
            
            const sparkle = this.audioContext.createOscillator();
            sparkle.type = 'triangle';
            sparkle.frequency.value = freq * 3;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.25 * Math.pow(0.8, i), startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            
            const sparkleGain = this.audioContext.createGain();
            sparkleGain.gain.setValueAtTime(0.1 * Math.pow(0.8, i), startTime);
            sparkleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            osc.connect(gain);
            sparkle.connect(sparkleGain);
            gain.connect(this.preDelay);
            sparkleGain.connect(this.preDelay);
            
            osc.start(startTime);
            sparkle.start(startTime);
            osc.stop(startTime + 0.15);
            sparkle.stop(startTime + 0.1);
        }
    }
    
    /**
     * UI click
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(600, now);
        clickOsc.frequency.exponentialRampToValueAtTime(400, now + 0.015);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        
        clickOsc.connect(gain);
        gain.connect(this.preDelay);
        
        clickOsc.start(now);
        clickOsc.stop(now + 0.015);
    }
    
    /**
     * Victory sound
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Victory fanfare with explosions
        const notes = [
            { time: 0, freq: 523.25, dur: 0.2 },
            { time: 0.2, freq: 659.25, dur: 0.2 },
            { time: 0.4, freq: 783.99, dur: 0.2 },
            { time: 0.6, freq: 1046.50, dur: 0.4 }
        ];
        
        notes.forEach(note => {
            const startTime = now + note.time;
            
            // Main note
            const osc = this.audioContext!.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = note.freq;
            
            // Harmony
            const harmonyOsc = this.audioContext!.createOscillator();
            harmonyOsc.type = 'triangle';
            harmonyOsc.frequency.value = note.freq * 1.5;
            
            // Bass
            const bassOsc = this.audioContext!.createOscillator();
            bassOsc.type = 'sine';
            bassOsc.frequency.value = note.freq / 2;
            
            const gain = this.audioContext!.createGain();
            gain.gain.setValueAtTime(0.4, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            const harmonyGain = this.audioContext!.createGain();
            harmonyGain.gain.setValueAtTime(0.2, startTime);
            harmonyGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            const bassGain = this.audioContext!.createGain();
            bassGain.gain.setValueAtTime(0.3, startTime);
            bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            osc.connect(gain);
            harmonyOsc.connect(harmonyGain);
            bassOsc.connect(bassGain);
            
            gain.connect(this.preDelay!);
            harmonyGain.connect(this.preDelay!);
            bassGain.connect(this.preDelay!);
            
            osc.start(startTime);
            harmonyOsc.start(startTime);
            bassOsc.start(startTime);
            
            osc.stop(startTime + note.dur);
            harmonyOsc.stop(startTime + note.dur);
            bassOsc.stop(startTime + note.dur);
        });
    }
    
    /**
     * Defeat sound
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Sad descending tones
        for (let i = 0; i < 4; i++) {
            const startTime = now + i * 0.25;
            const freq = 400 / Math.pow(1.4, i);
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.7, startTime + 0.3);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
            
            osc.connect(gain);
            gain.connect(this.preDelay);
            
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
        console.log(`HDPremiumSound: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('HDPremiumSound: Testing HD sounds...');
        
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
            setTimeout(test, i * 1000);
        });
    }
    
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created',
            type: 'HD Premium quality bubble sounds'
        };
    }
    
    public destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
        this.convolver = null;
        this.preDelay = null;
        this.isInitialized = false;
        console.log('HDPremiumSound: Destroyed');
    }
}