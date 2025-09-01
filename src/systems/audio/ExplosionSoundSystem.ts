/**
 * ExplosionSoundSystem - Premium Explosion Sound Effects
 * Creates sophisticated, addictive explosion sounds that scale with combo size
 */

export class ExplosionSoundSystem {
    private audioContext: AudioContext;
    private masterGainNode: GainNode;
    private compressor: DynamicsCompressorNode;
    private convolver: ConvolverNode;
    private initialized: boolean = false;

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Master gain for all explosion sounds
            this.masterGainNode = this.audioContext.createGain();
            this.masterGainNode.gain.value = 0.7;
            
            // Compressor for punchy, consistent sound
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            
            // Convolver for spatial depth (reverb)
            this.convolver = this.audioContext.createConvolver();
            this.createImpulseResponse();
            
            // Connect nodes
            this.masterGainNode.connect(this.compressor);
            this.compressor.connect(this.audioContext.destination);
            
            // Also connect dry signal for immediate impact
            this.masterGainNode.connect(this.audioContext.destination);
            
            this.initialized = true;
        } catch (error) {
            console.error('ExplosionSoundSystem: Failed to initialize:', error);
        }
    }

    /**
     * Create impulse response for reverb effect
     */
    private createImpulseResponse(): void {
        const length = this.audioContext.sampleRate * 0.5; // 0.5 second reverb
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.convolver.buffer = impulse;
    }

    /**
     * Play explosion sound based on bubble count
     * @param bubbleCount Number of bubbles exploding (3-10+)
     * @param combo Current combo multiplier
     */
    public playExplosion(bubbleCount: number, combo: number = 0): void {
        if (!this.initialized || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;
        
        // Determine explosion tier
        if (bubbleCount === 3) {
            this.playSmallExplosion(currentTime, combo);
        } else if (bubbleCount === 4) {
            this.playMediumExplosion(currentTime, combo);
        } else if (bubbleCount === 5) {
            this.playLargeExplosion(currentTime, combo);
        } else if (bubbleCount === 6) {
            this.playHugeExplosion(currentTime, combo);
        } else if (bubbleCount >= 7) {
            this.playEpicExplosion(currentTime, combo, bubbleCount);
        }
    }

    /**
     * 3-bubble explosion - Crisp, satisfying pop with subtle bass
     */
    private playSmallExplosion(startTime: number, combo: number): void {
        // Main pop - bright and crisp
        const popOsc = this.audioContext.createOscillator();
        const popGain = this.audioContext.createGain();
        const popFilter = this.audioContext.createBiquadFilter();
        
        popOsc.type = 'square';
        popOsc.frequency.setValueAtTime(800, startTime);
        popOsc.frequency.exponentialRampToValueAtTime(200, startTime + 0.05);
        
        popFilter.type = 'bandpass';
        popFilter.frequency.setValueAtTime(1200, startTime);
        popFilter.Q.value = 2;
        
        popGain.gain.setValueAtTime(0.4, startTime);
        popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
        
        // Sub bass for depth
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(60, startTime);
        bassOsc.frequency.exponentialRampToValueAtTime(30, startTime + 0.15);
        
        bassGain.gain.setValueAtTime(0.3, startTime);
        bassGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        
        // Noise burst for texture
        const noiseBuffer = this.createNoiseBuffer(0.05);
        const noiseSource = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const noiseFilter = this.audioContext.createBiquadFilter();
        
        noiseSource.buffer = noiseBuffer;
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(3000, startTime);
        
        noiseGain.gain.setValueAtTime(0.2, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.03);
        
        // Sparkle overtones for addictive quality
        const sparkleOsc = this.audioContext.createOscillator();
        const sparkleGain = this.audioContext.createGain();
        
        sparkleOsc.type = 'sine';
        sparkleOsc.frequency.setValueAtTime(2400 + combo * 100, startTime);
        sparkleOsc.frequency.exponentialRampToValueAtTime(4000, startTime + 0.08);
        
        sparkleGain.gain.setValueAtTime(0.15, startTime);
        sparkleGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
        
        // Connect everything
        popOsc.connect(popFilter);
        popFilter.connect(popGain);
        popGain.connect(this.masterGainNode);
        
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGainNode);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGainNode);
        
        sparkleOsc.connect(sparkleGain);
        sparkleGain.connect(this.convolver);
        this.convolver.connect(this.masterGainNode);
        
        // Start and stop
        popOsc.start(startTime);
        popOsc.stop(startTime + 0.15);
        
        bassOsc.start(startTime);
        bassOsc.stop(startTime + 0.2);
        
        noiseSource.start(startTime);
        
        sparkleOsc.start(startTime);
        sparkleOsc.stop(startTime + 0.1);
    }

    /**
     * 4-bubble explosion - Fuller, more resonant
     */
    private playMediumExplosion(startTime: number, combo: number): void {
        // Enhanced version of small explosion
        this.playSmallExplosion(startTime, combo);
        
        // Add extra harmonic layer
        const harmOsc = this.audioContext.createOscillator();
        const harmGain = this.audioContext.createGain();
        
        harmOsc.type = 'sawtooth';
        harmOsc.frequency.setValueAtTime(400, startTime);
        harmOsc.frequency.exponentialRampToValueAtTime(100, startTime + 0.12);
        
        harmGain.gain.setValueAtTime(0.25, startTime);
        harmGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        
        harmOsc.connect(harmGain);
        harmGain.connect(this.masterGainNode);
        
        harmOsc.start(startTime);
        harmOsc.stop(startTime + 0.2);
        
        // Extra punch
        const punchOsc = this.audioContext.createOscillator();
        const punchGain = this.audioContext.createGain();
        
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(150, startTime);
        punchOsc.frequency.exponentialRampToValueAtTime(50, startTime + 0.1);
        
        punchGain.gain.setValueAtTime(0.4, startTime);
        punchGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
        
        punchOsc.connect(punchGain);
        punchGain.connect(this.masterGainNode);
        
        punchOsc.start(startTime);
        punchOsc.stop(startTime + 0.15);
    }

    /**
     * 5-bubble explosion - Rich, layered explosion
     */
    private playLargeExplosion(startTime: number, combo: number): void {
        // Base explosion
        this.playMediumExplosion(startTime, combo);
        
        // Add cascading pops
        for (let i = 0; i < 3; i++) {
            const delay = i * 0.03;
            const pitch = 1200 + i * 200;
            
            const cascadeOsc = this.audioContext.createOscillator();
            const cascadeGain = this.audioContext.createGain();
            const cascadeFilter = this.audioContext.createBiquadFilter();
            
            cascadeOsc.type = 'triangle';
            cascadeOsc.frequency.setValueAtTime(pitch, startTime + delay);
            cascadeOsc.frequency.exponentialRampToValueAtTime(pitch * 0.5, startTime + delay + 0.08);
            
            cascadeFilter.type = 'bandpass';
            cascadeFilter.frequency.value = pitch;
            cascadeFilter.Q.value = 5;
            
            cascadeGain.gain.setValueAtTime(0.2, startTime + delay);
            cascadeGain.gain.exponentialRampToValueAtTime(0.01, startTime + delay + 0.1);
            
            cascadeOsc.connect(cascadeFilter);
            cascadeFilter.connect(cascadeGain);
            cascadeGain.connect(this.convolver);
            this.convolver.connect(this.masterGainNode);
            
            cascadeOsc.start(startTime + delay);
            cascadeOsc.stop(startTime + delay + 0.15);
        }
        
        // Deep boom
        const boomOsc = this.audioContext.createOscillator();
        const boomGain = this.audioContext.createGain();
        
        boomOsc.type = 'sine';
        boomOsc.frequency.setValueAtTime(40, startTime);
        boomOsc.frequency.linearRampToValueAtTime(20, startTime + 0.3);
        
        boomGain.gain.setValueAtTime(0.5, startTime);
        boomGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        boomOsc.connect(boomGain);
        boomGain.connect(this.masterGainNode);
        
        boomOsc.start(startTime);
        boomOsc.stop(startTime + 0.35);
    }

    /**
     * 6-bubble explosion - Powerful, cinematic
     */
    private playHugeExplosion(startTime: number, combo: number): void {
        // Layer previous explosion
        this.playLargeExplosion(startTime, combo);
        
        // Add sweeping filter effect
        const sweepOsc = this.audioContext.createOscillator();
        const sweepGain = this.audioContext.createGain();
        const sweepFilter = this.audioContext.createBiquadFilter();
        
        sweepOsc.type = 'sawtooth';
        sweepOsc.frequency.value = 200;
        
        sweepFilter.type = 'lowpass';
        sweepFilter.frequency.setValueAtTime(5000, startTime);
        sweepFilter.frequency.exponentialRampToValueAtTime(200, startTime + 0.3);
        sweepFilter.Q.value = 10;
        
        sweepGain.gain.setValueAtTime(0.3, startTime);
        sweepGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);
        
        sweepOsc.connect(sweepFilter);
        sweepFilter.connect(sweepGain);
        sweepGain.connect(this.masterGainNode);
        
        sweepOsc.start(startTime);
        sweepOsc.stop(startTime + 0.4);
        
        // Resonant ring
        const ringOsc = this.audioContext.createOscillator();
        const ringGain = this.audioContext.createGain();
        const ringMod = this.audioContext.createOscillator();
        const ringModGain = this.audioContext.createGain();
        
        ringOsc.type = 'sine';
        ringOsc.frequency.value = 800;
        
        ringMod.type = 'sine';
        ringMod.frequency.value = 7;
        ringMod.connect(ringModGain);
        ringModGain.gain.value = 200;
        ringModGain.connect(ringOsc.frequency);
        
        ringGain.gain.setValueAtTime(0.2, startTime);
        ringGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        ringOsc.connect(ringGain);
        ringGain.connect(this.convolver);
        this.convolver.connect(this.masterGainNode);
        
        ringOsc.start(startTime);
        ringOsc.stop(startTime + 0.45);
        ringMod.start(startTime);
        ringMod.stop(startTime + 0.45);
    }

    /**
     * 7+ bubble explosion - Epic, multi-layered masterpiece
     */
    private playEpicExplosion(startTime: number, combo: number, bubbleCount: number): void {
        // Start with huge explosion
        this.playHugeExplosion(startTime, combo);
        
        // Add epic choir-like resonance
        for (let i = 0; i < 5; i++) {
            const choirOsc = this.audioContext.createOscillator();
            const choirGain = this.audioContext.createGain();
            const choirFilter = this.audioContext.createBiquadFilter();
            
            const freq = 300 + i * 150;
            choirOsc.type = 'sine';
            choirOsc.frequency.setValueAtTime(freq, startTime);
            choirOsc.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + 0.5);
            
            choirFilter.type = 'bandpass';
            choirFilter.frequency.value = freq;
            choirFilter.Q.value = 20;
            
            choirGain.gain.setValueAtTime(0.1, startTime);
            choirGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
            
            choirOsc.connect(choirFilter);
            choirFilter.connect(choirGain);
            choirGain.connect(this.convolver);
            this.convolver.connect(this.masterGainNode);
            
            choirOsc.start(startTime + i * 0.02);
            choirOsc.stop(startTime + 0.7);
        }
        
        // Massive sub bass drop
        const subOsc = this.audioContext.createOscillator();
        const subGain = this.audioContext.createGain();
        
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(30, startTime);
        subOsc.frequency.linearRampToValueAtTime(15, startTime + 0.5);
        
        subGain.gain.setValueAtTime(0.6, startTime);
        subGain.gain.setValueAtTime(0.6, startTime + 0.1);
        subGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);
        
        subOsc.connect(subGain);
        subGain.connect(this.masterGainNode);
        
        subOsc.start(startTime);
        subOsc.stop(startTime + 0.7);
        
        // Victory fanfare for 10+ bubbles
        if (bubbleCount >= 10) {
            this.playVictoryFanfare(startTime + 0.1);
        }
    }

    /**
     * Special victory fanfare for massive combos
     */
    private playVictoryFanfare(startTime: number): void {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
        
        notes.forEach((freq, i) => {
            const noteOsc = this.audioContext.createOscillator();
            const noteGain = this.audioContext.createGain();
            
            noteOsc.type = 'square';
            noteOsc.frequency.value = freq;
            
            const noteStart = startTime + i * 0.05;
            noteGain.gain.setValueAtTime(0, noteStart);
            noteGain.gain.linearRampToValueAtTime(0.2, noteStart + 0.01);
            noteGain.gain.setValueAtTime(0.2, noteStart + 0.1);
            noteGain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.3);
            
            noteOsc.connect(noteGain);
            noteGain.connect(this.convolver);
            this.convolver.connect(this.masterGainNode);
            
            noteOsc.start(noteStart);
            noteOsc.stop(noteStart + 0.4);
        });
    }

    /**
     * Create noise buffer for texture
     */
    private createNoiseBuffer(duration: number): AudioBuffer {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }

    /**
     * Set master volume
     */
    public setVolume(volume: number): void {
        if (this.masterGainNode) {
            this.masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Ensure audio context is running
     */
    public async ensureContextRunning(): Promise<void> {
        if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * Cleanup
     */
    public destroy(): void {
        if (this.audioContext?.state === 'running') {
            this.audioContext.close();
        }
    }
}