/**
 * ProfessionalSoundSystem - AAA-quality sound design
 * Uses advanced Web Audio API techniques for maximum impact
 */

import { Scene } from 'phaser';

export class ProfessionalSoundSystem {
    private scene: Scene;
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private convolver: ConvolverNode | null = null;
    private analyser: AnalyserNode | null = null;
    private isInitialized: boolean = false;
    private isMuted: boolean = false;
    private volume: number = 0.75;
    
    // Advanced audio nodes
    private filterBank: BiquadFilterNode[] = [];
    private delayNode: DelayNode | null = null;
    private distortion: WaveShaperNode | null = null;
    
    // Variation tracking
    private currentVariation: number = 0;
    
    constructor(scene: Scene) {
        this.scene = scene;
        console.log('ProfessionalSoundSystem: Initializing AAA-quality audio');
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
            console.log('ProfessionalSoundSystem: Creating professional audio pipeline...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                latencyHint: 'interactive',
                sampleRate: 48000
            });
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create professional audio chain
            this.setupAudioPipeline();
            
            this.isInitialized = true;
            console.log('ProfessionalSoundSystem: Professional audio pipeline ready');
            
        } catch (error) {
            console.error('ProfessionalSoundSystem: Failed to initialize:', error);
        }
    }
    
    private setupAudioPipeline(): void {
        if (!this.audioContext) return;
        
        // Master gain control
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.volume;
        
        // Professional multiband compressor
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -6;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 8;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.1;
        
        // Create EQ filter bank
        const frequencies = [60, 170, 350, 1000, 3500, 10000];
        frequencies.forEach(freq => {
            const filter = this.audioContext!.createBiquadFilter();
            filter.type = freq === 60 ? 'highshelf' : freq === 10000 ? 'lowshelf' : 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 0.7;
            filter.gain.value = 0;
            this.filterBank.push(filter);
        });
        
        // Delay for spatial depth
        this.delayNode = this.audioContext.createDelay(0.1);
        this.delayNode.delayTime.value = 0.015;
        
        // Soft distortion for warmth
        this.distortion = this.audioContext.createWaveShaper();
        this.distortion.curve = this.makeDistortionCurve(50);
        this.distortion.oversample = '4x';
        
        // Analyser for visualization
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        // Professional impulse response reverb
        this.createProfessionalReverb();
        
        // Connect the chain
        this.connectAudioChain();
    }
    
    private connectAudioChain(): void {
        if (!this.audioContext || !this.masterGain || !this.compressor) return;
        
        // Connect filter bank in series
        let lastNode: AudioNode = this.masterGain;
        this.filterBank.forEach(filter => {
            lastNode.connect(filter);
            lastNode = filter;
        });
        
        // Continue chain
        lastNode.connect(this.compressor);
        this.compressor.connect(this.audioContext.destination);
        
        // Parallel effects sends
        if (this.delayNode) {
            const delaySend = this.audioContext.createGain();
            delaySend.gain.value = 0.1;
            this.compressor.connect(delaySend);
            delaySend.connect(this.delayNode);
            this.delayNode.connect(this.audioContext.destination);
        }
        
        if (this.analyser) {
            this.compressor.connect(this.analyser);
        }
    }
    
    private makeDistortionCurve(amount: number): Float32Array {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        
        return curve;
    }
    
    private async createProfessionalReverb(): Promise<void> {
        if (!this.audioContext) return;
        
        // Create high-quality impulse response
        const length = this.audioContext.sampleRate * 2;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
                // Professional reverb algorithm
                const n = length - i;
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
                
                // Add early reflections
                if (i < 1000) {
                    channelData[i] *= 3;
                }
                
                // Add diffusion
                if (i % 7 === 0) {
                    channelData[i] *= 1.5;
                }
            }
        }
        
        this.convolver = this.audioContext.createConvolver();
        this.convolver.buffer = impulse;
        
        // Connect reverb as send effect
        const reverbSend = this.audioContext.createGain();
        reverbSend.gain.value = 0.15;
        this.masterGain?.connect(reverbSend);
        reverbSend.connect(this.convolver);
        this.convolver.connect(this.audioContext.destination);
    }
    
    /**
     * Create professional granular synthesis texture
     */
    private createGranularTexture(duration: number): AudioBuffer {
        if (!this.audioContext) throw new Error('Audio context not initialized');
        
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            
            // Create complex granular texture
            for (let i = 0; i < length; i++) {
                let sample = 0;
                
                // Multiple grain layers
                for (let grain = 0; grain < 5; grain++) {
                    const grainFreq = 100 + grain * 50;
                    const grainEnv = Math.sin((i / length) * Math.PI);
                    sample += Math.sin(2 * Math.PI * grainFreq * i / sampleRate) * grainEnv * 0.2;
                }
                
                // Add transients
                if (Math.random() < 0.001) {
                    sample += (Math.random() - 0.5) * 2;
                }
                
                data[i] = sample;
            }
        }
        
        return buffer;
    }
    
    /**
     * PROFESSIONAL bubble launch - Multi-layered with advanced processing
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const variation = 0.9 + Math.random() * 0.2;
        
        // LAYER 1: Sub-bass foundation (20-80Hz)
        const subOsc = this.audioContext.createOscillator();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(40 * variation, now);
        subOsc.frequency.exponentialRampToValueAtTime(30 * variation, now + 0.15);
        
        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.6, now + 0.01);
        subGain.gain.setValueAtTime(0.6, now + 0.05);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        // LAYER 2: Main body with FM synthesis
        const carrierOsc = this.audioContext.createOscillator();
        carrierOsc.type = 'sine';
        carrierOsc.frequency.value = 220 * variation;
        
        const modOsc = this.audioContext.createOscillator();
        modOsc.type = 'sine';
        modOsc.frequency.value = 110 * variation;
        
        const modGain = this.audioContext.createGain();
        modGain.gain.setValueAtTime(0, now);
        modGain.gain.linearRampToValueAtTime(100, now + 0.02);
        modGain.gain.exponentialRampToValueAtTime(10, now + 0.1);
        
        modOsc.connect(modGain);
        modGain.connect(carrierOsc.frequency);
        
        const carrierGain = this.audioContext.createGain();
        carrierGain.gain.setValueAtTime(0, now);
        carrierGain.gain.linearRampToValueAtTime(0.4, now + 0.015);
        carrierGain.gain.setValueAtTime(0.4, now + 0.06);
        carrierGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        // LAYER 3: Harmonic content
        const harmonicOsc1 = this.audioContext.createOscillator();
        harmonicOsc1.type = 'triangle';
        harmonicOsc1.frequency.value = 440 * variation;
        
        const harmonicOsc2 = this.audioContext.createOscillator();
        harmonicOsc2.type = 'sawtooth';
        harmonicOsc2.frequency.value = 880 * variation;
        
        const harmonicGain = this.audioContext.createGain();
        harmonicGain.gain.setValueAtTime(0, now);
        harmonicGain.gain.linearRampToValueAtTime(0.2, now + 0.008);
        harmonicGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        // LAYER 4: Transient click
        const clickBuffer = this.audioContext.createBuffer(1, 256, this.audioContext.sampleRate);
        const clickData = clickBuffer.getChannelData(0);
        for (let i = 0; i < 256; i++) {
            clickData[i] = (Math.random() - 0.5) * Math.exp(-i / 50);
        }
        
        const clickSource = this.audioContext.createBufferSource();
        clickSource.buffer = clickBuffer;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.value = 0.3;
        
        // LAYER 5: Air pressure simulation
        const noiseBuffer = this.createGranularTexture(0.1);
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(2000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.1);
        noiseFilter.Q.value = 5;
        
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        // Connect everything
        subOsc.connect(subGain);
        subGain.connect(this.masterGain);
        
        carrierOsc.connect(carrierGain);
        carrierGain.connect(this.masterGain);
        
        harmonicOsc1.connect(harmonicGain);
        harmonicOsc2.connect(harmonicGain);
        harmonicGain.connect(this.masterGain);
        
        clickSource.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        
        // Start all layers
        subOsc.start(now);
        subOsc.stop(now + 0.15);
        
        modOsc.start(now);
        modOsc.stop(now + 0.12);
        carrierOsc.start(now);
        carrierOsc.stop(now + 0.12);
        
        harmonicOsc1.start(now);
        harmonicOsc1.stop(now + 0.1);
        harmonicOsc2.start(now);
        harmonicOsc2.stop(now + 0.1);
        
        clickSource.start(now);
        
        noiseSource.start(now);
        noiseSource.stop(now + 0.1);
    }
    
    /**
     * PROFESSIONAL bubble attach - Crisp, satisfying impact
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        this.currentVariation = (this.currentVariation + 1) % 8;
        const variation = 0.85 + (this.currentVariation * 0.03);
        
        // IMPACT TRANSIENT - The satisfying "click"
        const transientBuffer = this.audioContext.createBuffer(1, 512, this.audioContext.sampleRate);
        const transientData = transientBuffer.getChannelData(0);
        
        // Create complex transient
        for (let i = 0; i < 512; i++) {
            const envelope = Math.exp(-i / 30);
            const carrier = Math.sin(2 * Math.PI * 4000 * i / this.audioContext.sampleRate);
            const noise = (Math.random() - 0.5);
            transientData[i] = (carrier * 0.7 + noise * 0.3) * envelope;
        }
        
        const transientSource = this.audioContext.createBufferSource();
        transientSource.buffer = transientBuffer;
        
        const transientGain = this.audioContext.createGain();
        transientGain.gain.value = 0.6 * variation;
        
        // TONAL BODY - The resonant "pop"
        const bodyOsc1 = this.audioContext.createOscillator();
        bodyOsc1.type = 'sine';
        bodyOsc1.frequency.setValueAtTime(250 * variation, now);
        bodyOsc1.frequency.exponentialRampToValueAtTime(150 * variation, now + 0.06);
        
        const bodyOsc2 = this.audioContext.createOscillator();
        bodyOsc2.type = 'triangle';
        bodyOsc2.frequency.setValueAtTime(500 * variation, now);
        bodyOsc2.frequency.exponentialRampToValueAtTime(300 * variation, now + 0.06);
        
        const bodyGain = this.audioContext.createGain();
        bodyGain.gain.setValueAtTime(0, now);
        bodyGain.gain.linearRampToValueAtTime(0.5, now + 0.002);
        bodyGain.gain.setValueAtTime(0.5, now + 0.01);
        bodyGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        
        // HARMONIC RING - The satisfying aftertone
        const ringOsc = this.audioContext.createOscillator();
        ringOsc.type = 'sine';
        ringOsc.frequency.value = 1000 * variation;
        
        const ringGain = this.audioContext.createGain();
        ringGain.gain.setValueAtTime(0, now);
        ringGain.gain.setValueAtTime(0, now + 0.003);
        ringGain.gain.linearRampToValueAtTime(0.3, now + 0.006);
        ringGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        
        // BASS PUNCH - The weight
        const bassOsc = this.audioContext.createOscillator();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = 80 * variation;
        
        const bassGain = this.audioContext.createGain();
        bassGain.gain.setValueAtTime(0.4, now);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        
        // Connect all
        transientSource.connect(transientGain);
        transientGain.connect(this.masterGain);
        
        bodyOsc1.connect(bodyGain);
        bodyOsc2.connect(bodyGain);
        bodyGain.connect(this.masterGain);
        
        ringOsc.connect(ringGain);
        ringGain.connect(this.masterGain);
        
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGain);
        
        // Start all
        transientSource.start(now);
        
        bodyOsc1.start(now);
        bodyOsc1.stop(now + 0.06);
        bodyOsc2.start(now);
        bodyOsc2.stop(now + 0.06);
        
        ringOsc.start(now);
        ringOsc.stop(now + 0.1);
        
        bassOsc.start(now);
        bassOsc.stop(now + 0.04);
    }
    
    /**
     * PROFESSIONAL combo sound - Modern, impactful cascade
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 12);
        
        // Professional cascade with stereo imaging
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.025; // Tighter timing
            const startTime = now + delay;
            
            // Frequency progression
            const baseFreq = 300 + (i * 80);
            const variation = 0.9 + Math.random() * 0.2;
            
            // Create rich pop with multiple oscillators
            const popOsc1 = this.audioContext.createOscillator();
            popOsc1.type = 'sine';
            popOsc1.frequency.setValueAtTime(baseFreq * variation, startTime);
            popOsc1.frequency.exponentialRampToValueAtTime(baseFreq * variation * 0.7, startTime + 0.04);
            
            const popOsc2 = this.audioContext.createOscillator();
            popOsc2.type = 'triangle';
            popOsc2.frequency.value = baseFreq * variation * 2;
            
            const popGain = this.audioContext.createGain();
            const volume = 0.5 * Math.pow(0.85, i); // Exponential decay
            popGain.gain.setValueAtTime(volume, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.04);
            
            // Stereo panning for width
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = Math.sin(i * 0.5) * 0.7; // Alternating left-right
            
            // Connect
            popOsc1.connect(popGain);
            popOsc2.connect(popGain);
            popGain.connect(panner);
            panner.connect(this.masterGain);
            
            // Start
            popOsc1.start(startTime);
            popOsc1.stop(startTime + 0.04);
            popOsc2.start(startTime);
            popOsc2.stop(startTime + 0.04);
        }
        
        // COMBO REWARD SOUNDS for larger matches
        if (matchSize >= 5) {
            // Bass drop
            const bassOsc = this.audioContext.createOscillator();
            bassOsc.type = 'sine';
            bassOsc.frequency.setValueAtTime(100, now);
            bassOsc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
            
            const bassGain = this.audioContext.createGain();
            bassGain.gain.setValueAtTime(0, now);
            bassGain.gain.linearRampToValueAtTime(0.7, now + 0.02);
            bassGain.gain.setValueAtTime(0.7, now + 0.1);
            bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            
            // Harmonic sweep
            const sweepOsc = this.audioContext.createOscillator();
            sweepOsc.type = 'sawtooth';
            sweepOsc.frequency.setValueAtTime(200, now);
            sweepOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
            
            const sweepFilter = this.audioContext.createBiquadFilter();
            sweepFilter.type = 'lowpass';
            sweepFilter.frequency.setValueAtTime(500, now);
            sweepFilter.frequency.exponentialRampToValueAtTime(5000, now + 0.2);
            sweepFilter.Q.value = 10;
            
            const sweepGain = this.audioContext.createGain();
            sweepGain.gain.setValueAtTime(0, now);
            sweepGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            
            // Victory chord
            if (matchSize >= 7) {
                const chordNotes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major pentatonic
                chordNotes.forEach((freq, idx) => {
                    const chordOsc = this.audioContext!.createOscillator();
                    chordOsc.type = 'triangle';
                    chordOsc.frequency.value = freq;
                    
                    const chordGain = this.audioContext!.createGain();
                    const chordStart = now + idx * 0.02;
                    chordGain.gain.setValueAtTime(0, chordStart);
                    chordGain.gain.linearRampToValueAtTime(0.2, chordStart + 0.02);
                    chordGain.gain.setValueAtTime(0.2, chordStart + 0.3);
                    chordGain.gain.exponentialRampToValueAtTime(0.01, chordStart + 0.5);
                    
                    chordOsc.connect(chordGain);
                    chordGain.connect(this.masterGain!);
                    
                    chordOsc.start(chordStart);
                    chordOsc.stop(chordStart + 0.5);
                });
            }
            
            // Connect bass and sweep
            bassOsc.connect(bassGain);
            bassGain.connect(this.masterGain);
            
            sweepOsc.connect(sweepFilter);
            sweepFilter.connect(sweepGain);
            sweepGain.connect(this.masterGain);
            
            bassOsc.start(now);
            bassOsc.stop(now + 0.3);
            
            sweepOsc.start(now);
            sweepOsc.stop(now + 0.25);
        }
    }
    
    /**
     * Other sound methods (power-up, click, victory, defeat)
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Epic power-up with multiple layers
        for (let layer = 0; layer < 3; layer++) {
            const layerDelay = layer * 0.05;
            const startTime = now + layerDelay;
            
            const sweepOsc = this.audioContext.createOscillator();
            sweepOsc.type = layer === 0 ? 'sawtooth' : layer === 1 ? 'square' : 'triangle';
            sweepOsc.frequency.setValueAtTime(100 * (layer + 1), startTime);
            sweepOsc.frequency.exponentialRampToValueAtTime(2000 * (layer + 1), startTime + 0.3);
            
            const sweepGain = this.audioContext.createGain();
            sweepGain.gain.setValueAtTime(0, startTime);
            sweepGain.gain.linearRampToValueAtTime(0.3 / (layer + 1), startTime + 0.05);
            sweepGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            sweepOsc.connect(sweepGain);
            sweepGain.connect(this.masterGain);
            
            sweepOsc.start(startTime);
            sweepOsc.stop(startTime + 0.4);
        }
    }
    
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Modern UI click
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(600, now);
        clickOsc.frequency.setValueAtTime(800, now + 0.005);
        clickOsc.frequency.setValueAtTime(600, now + 0.01);
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.3, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        clickOsc.start(now);
        clickOsc.stop(now + 0.02);
    }
    
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Professional victory fanfare
        const fanfareNotes = [
            { freq: 523.25, time: 0 },      // C5
            { freq: 659.25, time: 0.1 },    // E5
            { freq: 783.99, time: 0.2 },    // G5
            { freq: 1046.50, time: 0.35 },  // C6
            { freq: 1046.50, time: 0.45 },  // C6 repeat
            { freq: 1046.50, time: 0.55 }   // C6 final
        ];
        
        fanfareNotes.forEach(note => {
            const startTime = now + note.time;
            
            for (let harmonic = 1; harmonic <= 3; harmonic++) {
                const osc = this.audioContext!.createOscillator();
                osc.type = harmonic === 1 ? 'square' : 'triangle';
                osc.frequency.value = note.freq * harmonic;
                
                const gain = this.audioContext!.createGain();
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.3 / harmonic, startTime + 0.02);
                gain.gain.setValueAtTime(0.3 / harmonic, startTime + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
                
                osc.connect(gain);
                gain.connect(this.masterGain!);
                
                osc.start(startTime);
                osc.stop(startTime + 0.3);
            }
        });
    }
    
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.masterGain || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Somber defeat
        const defeatNotes = [500, 450, 400, 350, 300];
        
        defeatNotes.forEach((freq, i) => {
            const startTime = now + i * 0.12;
            
            const osc = this.audioContext!.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + 0.15);
            
            const gain = this.audioContext!.createGain();
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
            
            osc.connect(gain);
            gain.connect(this.masterGain!);
            
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
        console.log(`ProfessionalSoundSystem: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('ProfessionalSoundSystem: Testing professional audio...');
        
        const tests = [
            () => this.playClickSound(),
            () => this.playShootSound(),
            () => this.playShootSound(),
            () => this.playAttachSound(),
            () => this.playAttachSound(),
            () => this.playAttachSound(),
            () => this.playMatchSound(3),
            () => this.playMatchSound(5),
            () => this.playMatchSound(7),
            () => this.playPowerUpSound(),
            () => this.playVictorySound()
        ];
        
        tests.forEach((test, i) => {
            setTimeout(test, i * 900);
        });
    }
    
    public getInfo(): any {
        return {
            initialized: this.isInitialized,
            muted: this.isMuted,
            volume: this.volume,
            contextState: this.audioContext?.state || 'not created',
            sampleRate: this.audioContext?.sampleRate || 'N/A',
            type: 'AAA Professional Audio System',
            features: ['FM Synthesis', 'Granular Synthesis', 'Multi-band EQ', 'Professional Reverb', 'Spatial Audio']
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
        this.analyser = null;
        this.filterBank = [];
        this.delayNode = null;
        this.distortion = null;
        this.isInitialized = false;
        console.log('ProfessionalSoundSystem: Destroyed');
    }
}