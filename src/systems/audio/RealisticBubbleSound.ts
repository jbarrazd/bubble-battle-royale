/**
 * RealisticBubbleSound - Authentic bubble sounds like real soap bubbles
 * Uses complex synthesis to create wet, liquid bubble effects
 */

import { Scene } from 'phaser';

export class RealisticBubbleSound {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private reverbNode: ConvolverNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.6;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('RealisticBubbleSound: Created');
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
            console.log('RealisticBubbleSound: Initializing...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Create reverb for underwater/wet effect
            await this.createWetReverb();
            
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('RealisticBubbleSound: Initialized');
            
        } catch (error) {
            console.error('RealisticBubbleSound: Failed to initialize:', error);
        }
    }
    
    private async createWetReverb(): Promise<void> {
        if (!this.audioContext) return;
        
        // Short, wet reverb for liquid effect
        const length = this.audioContext.sampleRate * 0.1;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                // Wet, short reverb
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.5);
                // Add some early reflections for liquid feel
                if (i < length * 0.1) {
                    channelData[i] *= 2;
                }
            }
        }
        
        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = impulse;
        this.reverbNode.connect(this.audioContext.destination);
    }
    
    /**
     * Create complex bubble texture using multiple noise types
     */
    private createBubbleTexture(duration: number): AudioBuffer {
        if (!this.audioContext) throw new Error('Audio context not initialized');
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Mix of brown noise (low freq) and pink noise (mid freq) for realistic bubble
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
        let lastOut = 0;
        
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            
            // Pink noise component
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            
            const pink = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.11;
            
            // Brown noise component for low frequency rumble
            const brown = (lastOut + (0.02 * white)) / 1.02;
            lastOut = brown;
            
            // Mix pink and brown for bubble texture
            data[i] = pink * 0.7 + brown * 0.3;
            
            // Add occasional "bubble membrane" clicks
            if (Math.random() < 0.001) {
                data[i] += (Math.random() - 0.5) * 0.5;
            }
        }
        
        return buffer;
    }
    
    /**
     * Realistic bubble shooting - like blowing bubbles through water
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Multiple formants for realistic bubble formation
        const formants = [
            { freq: 250, q: 3, gain: 0.4 },  // Low bubble resonance
            { freq: 700, q: 5, gain: 0.3 },  // Mid water sound
            { freq: 1500, q: 8, gain: 0.2 }, // High liquid detail
            { freq: 3000, q: 10, gain: 0.1 } // Air/foam texture
        ];
        
        // Create bubble formation sound
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = this.createBubbleTexture(0.15);
        
        // Master filter for bubble character
        const masterFilter = this.audioContext.createBiquadFilter();
        masterFilter.type = 'bandpass';
        masterFilter.frequency.setValueAtTime(800, now);
        masterFilter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
        masterFilter.Q.value = 2;
        
        // Create formant filters for realistic bubble sound
        let lastNode: AudioNode = noiseSource;
        formants.forEach(formant => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = formant.freq;
            filter.Q.value = formant.q;
            
            const gain = this.audioContext.createGain();
            gain.gain.value = formant.gain;
            
            lastNode.connect(filter);
            filter.connect(gain);
            gain.connect(masterFilter);
        });
        
        // Amplitude envelope for bubble formation
        const envelope = this.audioContext.createGain();
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(0.3, now + 0.02); // Quick formation
        envelope.gain.setValueAtTime(0.3, now + 0.06);
        envelope.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        // Add subtle "plop" at the end
        const plopOsc = this.audioContext.createOscillator();
        plopOsc.type = 'sine';
        plopOsc.frequency.setValueAtTime(180, now + 0.08);
        plopOsc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        
        const plopGain = this.audioContext.createGain();
        plopGain.gain.setValueAtTime(0, now);
        plopGain.gain.setValueAtTime(0, now + 0.08);
        plopGain.gain.linearRampToValueAtTime(0.15, now + 0.09);
        plopGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        // Connect everything
        masterFilter.connect(envelope);
        envelope.connect(this.masterGain);
        
        // Send some to reverb for wet effect
        const reverbSend = this.audioContext.createGain();
        reverbSend.gain.value = 0.2;
        envelope.connect(reverbSend);
        if (this.reverbNode) {
            reverbSend.connect(this.reverbNode);
        }
        
        plopOsc.connect(plopGain);
        plopGain.connect(this.masterGain);
        
        // Start sounds
        noiseSource.start(now);
        noiseSource.stop(now + 0.15);
        plopOsc.start(now + 0.08);
        plopOsc.stop(now + 0.12);
    }
    
    /**
     * Realistic bubble pop - wet, satisfying bubble burst
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Bubble pop has multiple components
        
        // 1. The initial membrane break (high frequency click)
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sawtooth';
        clickOsc.frequency.value = 2000 + Math.random() * 1000;
        
        const clickFilter = this.audioContext.createBiquadFilter();
        clickFilter.type = 'highpass';
        clickFilter.frequency.value = 1500;
        clickFilter.Q.value = 5;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.4, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);
        
        // 2. The water droplet sound (main pop)
        const dropOsc = this.audioContext.createOscillator();
        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(1200, now);
        dropOsc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
        dropOsc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        
        const dropGain = this.audioContext.createGain();
        dropGain.gain.setValueAtTime(0, now);
        dropGain.gain.linearRampToValueAtTime(0.5, now + 0.003);
        dropGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // 3. Bubble cavity collapse (low thud)
        const thudOsc = this.audioContext.createOscillator();
        thudOsc.type = 'sine';
        thudOsc.frequency.value = 150;
        
        const thudGain = this.audioContext.createGain();
        thudGain.gain.setValueAtTime(0, now);
        thudGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        // 4. Liquid spray (filtered noise)
        const spraySource = this.audioContext.createBufferSource();
        spraySource.buffer = this.createBubbleTexture(0.08);
        
        const sprayFilter = this.audioContext.createBiquadFilter();
        sprayFilter.type = 'bandpass';
        sprayFilter.frequency.setValueAtTime(3000, now);
        sprayFilter.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        sprayFilter.Q.value = 3;
        
        const sprayGain = this.audioContext.createGain();
        sprayGain.gain.setValueAtTime(0.3, now);
        sprayGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // Connect all components
        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        dropOsc.connect(dropGain);
        dropGain.connect(this.masterGain);
        
        thudOsc.connect(thudGain);
        thudGain.connect(this.masterGain);
        
        spraySource.connect(sprayFilter);
        sprayFilter.connect(sprayGain);
        sprayGain.connect(this.masterGain);
        
        // Add reverb to spray for wet effect
        if (this.reverbNode) {
            const reverbSend = this.audioContext.createGain();
            reverbSend.gain.value = 0.3;
            sprayGain.connect(reverbSend);
            reverbSend.connect(this.reverbNode);
        }
        
        // Start all components
        clickOsc.start(now);
        clickOsc.stop(now + 0.01);
        dropOsc.start(now);
        dropOsc.stop(now + 0.08);
        thudOsc.start(now);
        thudOsc.stop(now + 0.05);
        spraySource.start(now);
        spraySource.stop(now + 0.08);
    }
    
    /**
     * Multiple bubble pops for matches - like bubble wrap
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 8);
        
        // Create realistic bubble wrap popping sequence
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.03 + Math.random() * 0.02; // Slightly random timing
            const startTime = now + delay;
            
            // Each pop has different characteristics
            const size = 0.7 + Math.random() * 0.6; // Bubble size variation
            const pitch = 1 / size; // Smaller bubbles = higher pitch
            
            // Water drop component
            const dropOsc = this.audioContext.createOscillator();
            dropOsc.type = 'sine';
            const baseFreq = 800 * pitch;
            dropOsc.frequency.setValueAtTime(baseFreq * 1.5, startTime);
            dropOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, startTime + 0.04 * size);
            
            const dropGain = this.audioContext.createGain();
            dropGain.gain.setValueAtTime(0.4 * size, startTime);
            dropGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06 * size);
            
            // Membrane pop
            const popNoise = this.audioContext.createBufferSource();
            popNoise.buffer = this.createBubbleTexture(0.03);
            
            const popFilter = this.audioContext.createBiquadFilter();
            popFilter.type = 'bandpass';
            popFilter.frequency.value = 2000 * pitch;
            popFilter.Q.value = 10;
            
            const popGain = this.audioContext.createGain();
            popGain.gain.setValueAtTime(0.3 * size, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.02);
            
            // Connect
            dropOsc.connect(dropGain);
            dropGain.connect(this.masterGain);
            
            popNoise.connect(popFilter);
            popFilter.connect(popGain);
            popGain.connect(this.masterGain);
            
            // Start
            dropOsc.start(startTime);
            dropOsc.stop(startTime + 0.06 * size);
            popNoise.start(startTime);
            popNoise.stop(startTime + 0.03);
        }
        
        // Add a water splash for large combos
        if (matchSize >= 5) {
            // Water splash sound
            const splashNoise = this.audioContext.createBufferSource();
            splashNoise.buffer = this.createBubbleTexture(0.3);
            
            const splashFilter = this.audioContext.createBiquadFilter();
            splashFilter.type = 'lowpass';
            splashFilter.frequency.setValueAtTime(4000, now);
            splashFilter.frequency.exponentialRampToValueAtTime(500, now + 0.3);
            
            const splashGain = this.audioContext.createGain();
            splashGain.gain.setValueAtTime(0, now);
            splashGain.gain.linearRampToValueAtTime(0.5, now + 0.05);
            splashGain.gain.setValueAtTime(0.5, now + 0.1);
            splashGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            splashNoise.connect(splashFilter);
            splashFilter.connect(splashGain);
            splashGain.connect(this.masterGain);
            
            // Heavy reverb for splash
            if (this.reverbNode) {
                const reverbSend = this.audioContext.createGain();
                reverbSend.gain.value = 0.5;
                splashGain.connect(reverbSend);
                reverbSend.connect(this.reverbNode);
            }
            
            splashNoise.start(now);
            splashNoise.stop(now + 0.3);
            
            // Deep underwater boom
            const boomOsc = this.audioContext.createOscillator();
            boomOsc.type = 'sine';
            boomOsc.frequency.value = 60;
            
            const boomGain = this.audioContext.createGain();
            boomGain.gain.setValueAtTime(0, now);
            boomGain.gain.linearRampToValueAtTime(0.6, now + 0.02);
            boomGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            
            boomOsc.connect(boomGain);
            boomGain.connect(this.masterGain);
            
            boomOsc.start(now);
            boomOsc.stop(now + 0.4);
        }
    }
    
    /**
     * Power-up - Magical bubble effect
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Magical bubble formation - multiple small bubbles
        for (let i = 0; i < 10; i++) {
            const startTime = now + i * 0.03;
            const freq = 500 + i * 150;
            
            const bubbleOsc = this.audioContext.createOscillator();
            bubbleOsc.type = 'sine';
            bubbleOsc.frequency.setValueAtTime(freq, startTime);
            bubbleOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.05);
            
            const bubbleGain = this.audioContext.createGain();
            bubbleGain.gain.setValueAtTime(0.2, startTime);
            bubbleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
            
            bubbleOsc.connect(bubbleGain);
            bubbleGain.connect(this.masterGain);
            
            bubbleOsc.start(startTime);
            bubbleOsc.stop(startTime + 0.05);
        }
        
        // Underwater whoosh
        const whooshNoise = this.audioContext.createBufferSource();
        whooshNoise.buffer = this.createBubbleTexture(0.4);
        
        const whooshFilter = this.audioContext.createBiquadFilter();
        whooshFilter.type = 'bandpass';
        whooshFilter.frequency.setValueAtTime(200, now);
        whooshFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
        whooshFilter.frequency.exponentialRampToValueAtTime(500, now + 0.4);
        whooshFilter.Q.value = 2;
        
        const whooshGain = this.audioContext.createGain();
        whooshGain.gain.setValueAtTime(0, now);
        whooshGain.gain.linearRampToValueAtTime(0.6, now + 0.05);
        whooshGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        whooshNoise.connect(whooshFilter);
        whooshFilter.connect(whooshGain);
        whooshGain.connect(this.masterGain);
        
        whooshNoise.start(now);
        whooshNoise.stop(now + 0.4);
    }
    
    /**
     * UI click - Small bubble pop
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Tiny bubble pop
        const popOsc = this.audioContext.createOscillator();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(1500, now);
        popOsc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
        
        const popGain = this.audioContext.createGain();
        popGain.gain.setValueAtTime(0.15, now);
        popGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        popOsc.connect(popGain);
        popGain.connect(this.masterGain);
        
        popOsc.start(now);
        popOsc.stop(now + 0.02);
    }
    
    /**
     * Victory - Bubble celebration
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Lots of celebratory bubble pops
        for (let i = 0; i < 15; i++) {
            const delay = i * 0.05 + Math.random() * 0.03;
            const startTime = now + delay;
            const freq = 400 + i * 100 + Math.random() * 200;
            
            const bubbleOsc = this.audioContext.createOscillator();
            bubbleOsc.type = 'sine';
            bubbleOsc.frequency.setValueAtTime(freq, startTime);
            bubbleOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + 0.1);
            
            const bubbleGain = this.audioContext.createGain();
            bubbleGain.gain.setValueAtTime(0.3, startTime);
            bubbleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            bubbleOsc.connect(bubbleGain);
            bubbleGain.connect(this.masterGain);
            
            bubbleOsc.start(startTime);
            bubbleOsc.stop(startTime + 0.1);
        }
    }
    
    /**
     * Defeat - Bubbles deflating
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Sad deflating bubbles
        const deflateNoise = this.audioContext.createBufferSource();
        deflateNoise.buffer = this.createBubbleTexture(1);
        
        const deflateFilter = this.audioContext.createBiquadFilter();
        deflateFilter.type = 'lowpass';
        deflateFilter.frequency.setValueAtTime(2000, now);
        deflateFilter.frequency.exponentialRampToValueAtTime(100, now + 1);
        
        const deflateGain = this.audioContext.createGain();
        deflateGain.gain.setValueAtTime(0.4, now);
        deflateGain.gain.exponentialRampToValueAtTime(0.01, now + 1);
        
        // Descending bubble pops
        const deflateOsc = this.audioContext.createOscillator();
        deflateOsc.type = 'sine';
        deflateOsc.frequency.setValueAtTime(500, now);
        deflateOsc.frequency.exponentialRampToValueAtTime(50, now + 1);
        
        const oscGain = this.audioContext.createGain();
        oscGain.gain.setValueAtTime(0.3, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 1);
        
        deflateNoise.connect(deflateFilter);
        deflateFilter.connect(deflateGain);
        deflateGain.connect(this.masterGain);
        
        deflateOsc.connect(oscGain);
        oscGain.connect(this.masterGain);
        
        deflateNoise.start(now);
        deflateNoise.stop(now + 1);
        deflateOsc.start(now);
        deflateOsc.stop(now + 1);
    }
    
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
    
    public toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        console.log(`RealisticBubbleSound: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('RealisticBubbleSound: Testing realistic bubble sounds...');
        
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
            setTimeout(test, i * 800);
        });
    }
    
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created',
            type: 'Realistic bubble sounds with water physics'
        };
    }
    
    public destroy(): void {
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.audioContext = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.isInitialized = false;
        console.log('RealisticBubbleSound: Destroyed');
    }
}