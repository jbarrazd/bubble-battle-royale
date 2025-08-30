/**
 * ModernSoundSystem - Modern, addictive sound effects for Bubble Clash
 * Uses advanced Web Audio API techniques for rich, satisfying sounds
 */

import { Scene } from 'phaser';

export class ModernSoundSystem {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private reverb: ConvolverNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.4;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('ModernSoundSystem: Created');
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
            console.log('ModernSoundSystem: Initializing audio context...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create master gain with compressor for professional sound
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Add compressor for punch and consistency
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 6;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.1;
            
            // Create reverb for depth
            await this.createReverb();
            
            // Connect chain
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('ModernSoundSystem: Initialized successfully');
            
            // Play confirmation sound
            this.playConfirmSound();
            
        } catch (error) {
            console.error('ModernSoundSystem: Failed to initialize:', error);
        }
    }
    
    private async createReverb(): Promise<void> {
        if (!this.audioContext) return;
        
        // Create impulse response for reverb
        const length = this.audioContext.sampleRate * 0.5;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.reverb = this.audioContext.createConvolver();
        this.reverb.buffer = impulse;
    }
    
    private playConfirmSound(): void {
        this.playSoftChime(800, 0.05);
    }
    
    /**
     * Play a soft, modern chime sound
     */
    private playSoftChime(frequency: number, duration: number, volume: number = 0.2): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Create multiple oscillators for richness
        const fundamentalOsc = this.audioContext.createOscillator();
        const harmonicOsc1 = this.audioContext.createOscillator();
        const harmonicOsc2 = this.audioContext.createOscillator();
        
        fundamentalOsc.type = 'sine';
        harmonicOsc1.type = 'sine';
        harmonicOsc2.type = 'sine';
        
        fundamentalOsc.frequency.value = frequency;
        harmonicOsc1.frequency.value = frequency * 2;
        harmonicOsc2.frequency.value = frequency * 3;
        
        // Create gains for mixing
        const fundamentalGain = this.audioContext.createGain();
        const harmonic1Gain = this.audioContext.createGain();
        const harmonic2Gain = this.audioContext.createGain();
        const mixGain = this.audioContext.createGain();
        
        // Create filter for warmth
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = frequency * 4;
        filter.Q.value = 1;
        
        // Connect oscillators
        fundamentalOsc.connect(fundamentalGain);
        harmonicOsc1.connect(harmonic1Gain);
        harmonicOsc2.connect(harmonic2Gain);
        
        fundamentalGain.connect(mixGain);
        harmonic1Gain.connect(mixGain);
        harmonic2Gain.connect(mixGain);
        
        mixGain.connect(filter);
        filter.connect(this.masterGain);
        
        // Set harmonic levels
        fundamentalGain.gain.value = volume;
        harmonic1Gain.gain.value = volume * 0.3;
        harmonic2Gain.gain.value = volume * 0.1;
        
        // Envelope
        mixGain.gain.setValueAtTime(0, now);
        mixGain.gain.linearRampToValueAtTime(1, now + 0.005);
        mixGain.gain.exponentialRampToValueAtTime(0.3, now + duration * 0.3);
        mixGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Start and stop
        fundamentalOsc.start(now);
        harmonicOsc1.start(now);
        harmonicOsc2.start(now);
        
        fundamentalOsc.stop(now + duration);
        harmonicOsc1.stop(now + duration);
        harmonicOsc2.stop(now + duration);
        
        // Cleanup
        fundamentalOsc.onended = () => {
            fundamentalOsc.disconnect();
            harmonicOsc1.disconnect();
            harmonicOsc2.disconnect();
            fundamentalGain.disconnect();
            harmonic1Gain.disconnect();
            harmonic2Gain.disconnect();
            mixGain.disconnect();
            filter.disconnect();
        };
    }
    
    /**
     * Play modern bubble shoot sound - like water drop
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Create oscillator for bubble sound
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        
        // Frequency sweep for water drop effect
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
        
        // Create filter for liquid sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 5;
        
        // Filter sweep
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.08);
        
        // Gain envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // Connect
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Add click for punch
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'square';
        clickOsc.frequency.value = 150;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.1, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        // Start
        osc.start(now);
        osc.stop(now + 0.1);
        clickOsc.start(now);
        clickOsc.stop(now + 0.01);
        
        // Cleanup
        osc.onended = () => {
            osc.disconnect();
            filter.disconnect();
            gainNode.disconnect();
            clickOsc.disconnect();
            clickGain.disconnect();
        };
    }
    
    /**
     * Play satisfying bubble attach sound
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Two-part sound: soft thud + crystalline ring
        
        // Part 1: Soft thud
        const thudOsc = this.audioContext.createOscillator();
        thudOsc.type = 'sine';
        thudOsc.frequency.value = 80;
        
        const thudGain = this.audioContext.createGain();
        thudGain.gain.setValueAtTime(0.2, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        thudOsc.connect(thudGain);
        thudGain.connect(this.masterGain);
        
        // Part 2: Crystalline ring
        const ringOsc = this.audioContext.createOscillator();
        ringOsc.type = 'sine';
        ringOsc.frequency.value = 1800;
        
        const ringOsc2 = this.audioContext.createOscillator();
        ringOsc2.type = 'sine';
        ringOsc2.frequency.value = 2400;
        
        const ringGain = this.audioContext.createGain();
        ringGain.gain.setValueAtTime(0, now);
        ringGain.gain.linearRampToValueAtTime(0.15, now + 0.005);
        ringGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        const ringFilter = this.audioContext.createBiquadFilter();
        ringFilter.type = 'highpass';
        ringFilter.frequency.value = 1000;
        ringFilter.Q.value = 2;
        
        ringOsc.connect(ringGain);
        ringOsc2.connect(ringGain);
        ringGain.connect(ringFilter);
        ringFilter.connect(this.masterGain);
        
        // Start sounds
        thudOsc.start(now);
        thudOsc.stop(now + 0.05);
        ringOsc.start(now);
        ringOsc.stop(now + 0.15);
        ringOsc2.start(now);
        ringOsc2.stop(now + 0.15);
        
        // Cleanup
        thudOsc.onended = () => {
            thudOsc.disconnect();
            thudGain.disconnect();
            ringOsc.disconnect();
            ringOsc2.disconnect();
            ringGain.disconnect();
            ringFilter.disconnect();
        };
    }
    
    /**
     * Play addictive match sound with musical progression
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        // Musical notes for satisfying progression
        const scales = {
            3: [261.63, 329.63, 392.00], // C E G - Major triad
            4: [261.63, 329.63, 392.00, 523.25], // Add high C
            5: [261.63, 329.63, 392.00, 523.25, 659.25], // Add E
            6: [261.63, 329.63, 392.00, 523.25, 659.25, 783.99], // Add G
            7: [523.25, 659.25, 783.99, 1046.50, 783.99, 659.25, 523.25] // Cascade
        };
        
        const notes = scales[Math.min(matchSize, 7)] || scales[3];
        const now = this.audioContext.currentTime;
        
        notes.forEach((freq, index) => {
            const delay = index * 0.05;
            
            // Create rich, layered tone for each note
            const osc1 = this.audioContext.createOscillator();
            const osc2 = this.audioContext.createOscillator();
            
            osc1.type = 'sine';
            osc2.type = 'triangle';
            
            osc1.frequency.value = freq;
            osc2.frequency.value = freq * 1.01; // Slight detune for richness
            
            // Filter for warmth
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = freq * 3;
            filter.Q.value = 2;
            
            // Gain envelope
            const gainNode = this.audioContext.createGain();
            const startTime = now + delay;
            
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.05, startTime + 0.2);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            // Add subtle reverb send
            const reverbSend = this.audioContext.createGain();
            reverbSend.gain.value = 0.2;
            
            // Connect
            osc1.connect(filter);
            osc2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            if (this.reverb) {
                gainNode.connect(reverbSend);
                reverbSend.connect(this.reverb);
                this.reverb.connect(this.masterGain);
            }
            
            // Start
            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(startTime + 0.4);
            osc2.stop(startTime + 0.4);
            
            // Cleanup
            osc1.onended = () => {
                osc1.disconnect();
                osc2.disconnect();
                filter.disconnect();
                gainNode.disconnect();
                reverbSend.disconnect();
            };
        });
    }
    
    /**
     * Play power-up sound - exciting sweep with sparkles
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Main sweep
        const sweepOsc = this.audioContext.createOscillator();
        sweepOsc.type = 'sawtooth';
        
        sweepOsc.frequency.setValueAtTime(100, now);
        sweepOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        
        // Filter for character
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 5;
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        sweepOsc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Add sparkle sounds
        for (let i = 0; i < 5; i++) {
            const sparkleTime = now + i * 0.06;
            const sparkleOsc = this.audioContext.createOscillator();
            sparkleOsc.type = 'sine';
            sparkleOsc.frequency.value = 2000 + Math.random() * 2000;
            
            const sparkleGain = this.audioContext.createGain();
            sparkleGain.gain.setValueAtTime(0, sparkleTime);
            sparkleGain.gain.linearRampToValueAtTime(0.1, sparkleTime + 0.01);
            sparkleGain.gain.exponentialRampToValueAtTime(0.01, sparkleTime + 0.05);
            
            sparkleOsc.connect(sparkleGain);
            sparkleGain.connect(this.masterGain);
            
            sparkleOsc.start(sparkleTime);
            sparkleOsc.stop(sparkleTime + 0.05);
        }
        
        sweepOsc.start(now);
        sweepOsc.stop(now + 0.4);
    }
    
    /**
     * Play subtle UI click
     */
    public playClickSound(): void {
        this.playSoftChime(1200, 0.03, 0.1);
    }
    
    /**
     * Play victory fanfare
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        // Triumphant chord progression
        const chords = [
            [261.63, 329.63, 392.00], // C major
            [329.63, 415.30, 493.88], // E major
            [392.00, 493.88, 587.33], // G major
            [523.25, 659.25, 783.99]  // C major octave
        ];
        
        const now = this.audioContext.currentTime;
        
        chords.forEach((chord, chordIndex) => {
            const chordTime = now + chordIndex * 0.2;
            
            chord.forEach((freq) => {
                const osc = this.audioContext.createOscillator();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                const gainNode = this.audioContext.createGain();
                gainNode.gain.setValueAtTime(0, chordTime);
                gainNode.gain.linearRampToValueAtTime(0.15, chordTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.5);
                
                osc.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                osc.start(chordTime);
                osc.stop(chordTime + 0.5);
            });
        });
    }
    
    /**
     * Play defeat sound - melancholic but not annoying
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Descending notes with low-pass filter for mellowness
        const notes = [392, 349, 311, 261]; // G F D# C
        
        notes.forEach((freq, index) => {
            const noteTime = now + index * 0.15;
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = freq * 2;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0, noteTime);
            gainNode.gain.linearRampToValueAtTime(0.1, noteTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.3);
            
            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(noteTime);
            osc.stop(noteTime + 0.3);
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
        console.log(`ModernSoundSystem: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('ModernSoundSystem: Testing all sounds...');
        
        const tests = [
            () => this.playClickSound(),
            () => this.playShootSound(),
            () => this.playAttachSound(),
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
            contextState: this.audioContext?.state || 'not created'
        };
    }
    
    public destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.masterGain = null;
        this.compressor = null;
        this.reverb = null;
        this.isInitialized = false;
        console.log('ModernSoundSystem: Destroyed');
    }
}