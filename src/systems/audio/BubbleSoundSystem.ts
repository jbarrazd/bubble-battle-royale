/**
 * BubbleSoundSystem - Satisfying bubble pop sounds for Bubble Clash
 * Focus on bubble explosions and satisfying pop effects
 */

import { Scene } from 'phaser';

export class BubbleSoundSystem {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.5;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('BubbleSoundSystem: Created');
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
            console.log('BubbleSoundSystem: Initializing audio context...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Soft compressor for consistency
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 40;
            this.compressor.ratio.value = 4;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            // Connect chain
            this.masterGain.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('BubbleSoundSystem: Initialized successfully');
            
        } catch (error) {
            console.error('BubbleSoundSystem: Failed to initialize:', error);
        }
    }
    
    /**
     * Create white noise for bubble effects
     */
    private createNoiseBuffer(duration: number): AudioBuffer {
        if (!this.audioContext) throw new Error('Audio context not initialized');
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    /**
     * Play soft bubble shoot sound - like blowing through water
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Soft "puff" sound
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        // Add some noise for air texture
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer(0.1);
        
        // Filter the noise
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 400;
        noiseFilter.Q.value = 1;
        
        // Gain envelopes
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0, now);
        oscGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.05, now + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // Connect
        osc.connect(oscGain);
        oscGain.connect(this.masterGain);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        // Start
        osc.start(now);
        osc.stop(now + 0.1);
        noiseSource.start(now);
        noiseSource.stop(now + 0.1);
        
        // Cleanup
        osc.onended = () => {
            osc.disconnect();
            oscGain.disconnect();
            noiseSource.disconnect();
            noiseFilter.disconnect();
            noiseGain.disconnect();
        };
    }
    
    /**
     * Play soft bubble attach sound - gentle pop
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Create a soft "pop" with filtered noise
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer(0.05);
        
        // Filter for pop character
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        filter.Q.value = 5;
        
        // Quick envelope for pop
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
        
        // Add a tiny click for definition
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sine';
        clickOsc.frequency.value = 600;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.1, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.005);
        
        // Connect
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        // Start
        noiseSource.start(now);
        noiseSource.stop(now + 0.05);
        clickOsc.start(now);
        clickOsc.stop(now + 0.005);
        
        // Cleanup
        noiseSource.onended = () => {
            noiseSource.disconnect();
            filter.disconnect();
            gainNode.disconnect();
            clickOsc.disconnect();
            clickGain.disconnect();
        };
    }
    
    /**
     * Play bubble explosion sounds for matches - cascading pops
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 7);
        
        // Create cascading bubble pops
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.04; // Rapid succession
            const startTime = now + delay;
            
            // Each pop is slightly different
            const frequency = 800 + (i * 100) + (Math.random() * 200);
            const duration = 0.05 + (Math.random() * 0.02);
            
            // Create pop sound with noise
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = this.createNoiseBuffer(duration);
            
            // Filter for each pop
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(frequency * 2, startTime);
            filter.frequency.exponentialRampToValueAtTime(frequency * 0.5, startTime + duration);
            filter.Q.value = 10 - i; // Less resonance for later pops
            
            // Volume envelope - later pops are slightly quieter
            const gainNode = this.audioContext.createGain();
            const volume = 0.25 * (1 - i * 0.1);
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            // Add subtle tone for body
            const toneOsc = this.audioContext.createOscillator();
            toneOsc.type = 'sine';
            toneOsc.frequency.value = frequency;
            
            const toneGain = this.audioContext.createGain();
            toneGain.gain.setValueAtTime(volume * 0.3, startTime);
            toneGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.5);
            
            // Connect
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            toneOsc.connect(toneGain);
            toneGain.connect(this.masterGain);
            
            // Start
            noiseSource.start(startTime);
            noiseSource.stop(startTime + duration);
            toneOsc.start(startTime);
            toneOsc.stop(startTime + duration * 0.5);
            
            // Cleanup
            noiseSource.onended = () => {
                noiseSource.disconnect();
                filter.disconnect();
                gainNode.disconnect();
                toneOsc.disconnect();
                toneGain.disconnect();
            };
        }
        
        // Add a satisfying low frequency boom for larger matches
        if (matchSize >= 5) {
            const boomOsc = this.audioContext.createOscillator();
            boomOsc.type = 'sine';
            boomOsc.frequency.value = 60;
            
            const boomGain = this.audioContext.createGain();
            boomGain.gain.setValueAtTime(0, now);
            boomGain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            boomOsc.connect(boomGain);
            boomGain.connect(this.masterGain);
            
            boomOsc.start(now);
            boomOsc.stop(now + 0.3);
        }
    }
    
    /**
     * Play power-up sound - energetic woosh
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Create whoosh with filtered noise
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createNoiseBuffer(0.4);
        
        // Sweep filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 2;
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.4);
        
        // Volume envelope
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        // Add resonant tone
        const resonanceOsc = this.audioContext.createOscillator();
        resonanceOsc.type = 'sawtooth';
        resonanceOsc.frequency.setValueAtTime(100, now);
        resonanceOsc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
        
        const resonanceGain = this.audioContext.createGain();
        resonanceGain.gain.setValueAtTime(0, now);
        resonanceGain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        resonanceGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        // Connect
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        resonanceOsc.connect(resonanceGain);
        resonanceGain.connect(this.masterGain);
        
        // Start
        noiseSource.start(now);
        noiseSource.stop(now + 0.4);
        resonanceOsc.start(now);
        resonanceOsc.stop(now + 0.3);
    }
    
    /**
     * Play subtle UI click
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Very soft tick
        const osc = this.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1000;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.01);
    }
    
    /**
     * Play victory sound - celebration pops
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Series of celebration pops
        for (let i = 0; i < 8; i++) {
            const delay = i * 0.08;
            const startTime = now + delay;
            
            // Rising frequencies for celebration
            const frequency = 400 + (i * 150);
            
            const noiseSource = this.audioContext.createBufferSource();
            noiseSource.buffer = this.createNoiseBuffer(0.1);
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = frequency;
            filter.Q.value = 5;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            noiseSource.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            noiseSource.start(startTime);
            noiseSource.stop(startTime + 0.1);
        }
    }
    
    /**
     * Play defeat sound - deflating bubble
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Deflating sound
        const osc = this.audioContext.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        
        // Filter for deflation effect
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.15, now);
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
        console.log(`BubbleSoundSystem: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('BubbleSoundSystem: Testing all sounds...');
        
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
            setTimeout(test, i * 700);
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
        this.isInitialized = false;
        console.log('BubbleSoundSystem: Destroyed');
    }
}