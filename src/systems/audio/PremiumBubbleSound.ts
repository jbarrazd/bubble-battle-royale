/**
 * PremiumBubbleSound - Premium quality bubble sounds with cinematic feel
 * Studio-quality audio with attention to detail and polish
 */

import { Scene } from 'phaser';

export class PremiumBubbleSound {
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
        console.log('PremiumBubbleSound: Created');
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
            console.log('PremiumBubbleSound: Initializing premium audio...');
            
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 48000,
                latencyHint: 'interactive'
            });
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Create impulse response for subtle reverb
            await this.createReverb();
            
            // Pre-delay for depth
            this.preDelay = this.audioContext.createDelay(0.1);
            this.preDelay.delayTime.value = 0.002;
            
            // Studio compressor settings
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -20;
            this.compressor.knee.value = 40;
            this.compressor.ratio.value = 8;
            this.compressor.attack.value = 0.001;
            this.compressor.release.value = 0.1;
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            
            // Signal chain with parallel reverb
            this.preDelay.connect(this.compressor);
            if (this.convolver) {
                this.preDelay.connect(this.convolver);
                this.convolver.connect(this.compressor);
            }
            this.compressor.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);
            
            this.isInitialized = true;
            console.log('PremiumBubbleSound: Premium audio initialized');
            
        } catch (error) {
            console.error('PremiumBubbleSound: Failed to initialize:', error);
        }
    }
    
    private async createReverb(): Promise<void> {
        if (!this.audioContext) return;
        
        const length = this.audioContext.sampleRate * 0.5;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2) * 0.05;
            }
        }
        
        this.convolver = this.audioContext.createConvolver();
        this.convolver.buffer = impulse;
    }
    
    /**
     * Play premium bubble launch sound
     */
    public playShootSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // === Layer 1: Deep sub-bass foundation ===
        const subBass = this.audioContext.createOscillator();
        subBass.type = 'sine';
        subBass.frequency.setValueAtTime(80, now);
        subBass.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        
        const subGain = this.audioContext.createGain();
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        subGain.gain.setValueAtTime(0.3, now + 0.03);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        // === Layer 2: Mid-range body with character ===
        const bodyOsc = this.audioContext.createOscillator();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(220, now);
        bodyOsc.frequency.exponentialRampToValueAtTime(160, now + 0.12);
        
        // Add subtle vibrato for organic feel
        const vibrato = this.audioContext.createOscillator();
        vibrato.frequency.value = 6;
        const vibratoGain = this.audioContext.createGain();
        vibratoGain.gain.value = 8;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(bodyOsc.frequency);
        
        const bodyGain = this.audioContext.createGain();
        bodyGain.gain.setValueAtTime(0, now);
        bodyGain.gain.linearRampToValueAtTime(0.4, now + 0.008);
        bodyGain.gain.setValueAtTime(0.4, now + 0.04);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        // === Layer 3: Pressurized air release ===
        const airBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.12, this.audioContext.sampleRate);
        const airData = airBuffer.getChannelData(0);
        
        // Generate sophisticated noise profile
        for (let i = 0; i < airData.length; i++) {
            const envelope = Math.exp(-i / (airData.length * 0.2));
            const noise = (Math.random() * 2 - 1);
            // Add some periodic components for texture
            const texture = Math.sin(i * 0.05) * 0.3;
            airData[i] = (noise + texture) * envelope * 0.5;
        }
        
        const airSource = this.audioContext.createBufferSource();
        airSource.buffer = airBuffer;
        
        // Multi-band filtering for air
        const airLowpass = this.audioContext.createBiquadFilter();
        airLowpass.type = 'lowpass';
        airLowpass.frequency.setValueAtTime(3000, now);
        airLowpass.frequency.exponentialRampToValueAtTime(800, now + 0.12);
        airLowpass.Q.value = 2;
        
        const airHighpass = this.audioContext.createBiquadFilter();
        airHighpass.type = 'highpass';
        airHighpass.frequency.value = 200;
        airHighpass.Q.value = 1;
        
        const airGain = this.audioContext.createGain();
        airGain.gain.setValueAtTime(0.25, now);
        airGain.gain.setValueAtTime(0.25, now + 0.02);
        airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        
        // === Layer 4: Liquid coating sound ===
        const liquidOsc = this.audioContext.createOscillator();
        liquidOsc.type = 'sine';
        liquidOsc.frequency.setValueAtTime(450, now);
        liquidOsc.frequency.exponentialRampToValueAtTime(350, now + 0.08);
        
        // Amplitude modulation for liquid texture
        const liquidMod = this.audioContext.createOscillator();
        liquidMod.frequency.value = 37;
        const liquidModGain = this.audioContext.createGain();
        liquidModGain.gain.value = 0.3;
        
        const liquidGain = this.audioContext.createGain();
        liquidGain.gain.setValueAtTime(0, now);
        liquidGain.gain.linearRampToValueAtTime(0.2, now + 0.01);
        liquidGain.gain.setValueAtTime(0.2, now + 0.03);
        liquidGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        liquidMod.connect(liquidModGain);
        liquidModGain.connect(liquidGain.gain);
        
        // === Layer 5: Transient click for punch ===
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'square';
        clickOsc.frequency.value = 85;
        
        const clickGain = this.audioContext.createGain();
        clickGain.gain.setValueAtTime(0.15, now);
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.003);
        
        // Connect everything with proper routing
        subBass.connect(subGain);
        subGain.connect(this.preDelay);
        
        bodyOsc.connect(bodyGain);
        bodyGain.connect(this.preDelay);
        
        airSource.connect(airHighpass);
        airHighpass.connect(airLowpass);
        airLowpass.connect(airGain);
        airGain.connect(this.preDelay);
        
        liquidOsc.connect(liquidGain);
        liquidGain.connect(this.preDelay);
        
        clickOsc.connect(clickGain);
        clickGain.connect(this.preDelay);
        
        // Start all layers
        subBass.start(now);
        bodyOsc.start(now);
        vibrato.start(now);
        airSource.start(now);
        liquidOsc.start(now);
        liquidMod.start(now);
        clickOsc.start(now);
        
        // Stop all layers
        subBass.stop(now + 0.15);
        bodyOsc.stop(now + 0.12);
        vibrato.stop(now + 0.12);
        airSource.stop(now + 0.12);
        liquidOsc.stop(now + 0.08);
        liquidMod.stop(now + 0.08);
        clickOsc.stop(now + 0.003);
    }
    
    /**
     * Play premium bubble attach sound
     */
    public playAttachSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // === Layer 1: Deep impact thump ===
        const impactOsc = this.audioContext.createOscillator();
        impactOsc.type = 'sine';
        impactOsc.frequency.setValueAtTime(95, now);
        impactOsc.frequency.exponentialRampToValueAtTime(45, now + 0.06);
        
        const impactGain = this.audioContext.createGain();
        impactGain.gain.setValueAtTime(0.6, now);
        impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        
        // === Layer 2: Bubble membrane resonance ===
        const membrane1 = this.audioContext.createOscillator();
        membrane1.type = 'triangle';
        membrane1.frequency.setValueAtTime(320, now);
        membrane1.frequency.exponentialRampToValueAtTime(280, now + 0.08);
        
        const membrane2 = this.audioContext.createOscillator();
        membrane2.type = 'sine';
        membrane2.frequency.setValueAtTime(480, now);
        membrane2.frequency.exponentialRampToValueAtTime(420, now + 0.08);
        
        const membraneGain = this.audioContext.createGain();
        membraneGain.gain.setValueAtTime(0.35, now);
        membraneGain.gain.setValueAtTime(0.35, now + 0.02);
        membraneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        // === Layer 3: Water displacement ===
        const waterBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.1, this.audioContext.sampleRate);
        const waterData = waterBuffer.getChannelData(0);
        
        for (let i = 0; i < waterData.length; i++) {
            const envelope = Math.exp(-i / (waterData.length * 0.15));
            // Create water-like texture
            const base = Math.random() * 2 - 1;
            const bubble = Math.sin(i * 0.1) * Math.cos(i * 0.03);
            waterData[i] = (base * 0.7 + bubble * 0.3) * envelope;
        }
        
        const waterSource = this.audioContext.createBufferSource();
        waterSource.buffer = waterBuffer;
        
        // Water filtering
        const waterFilter = this.audioContext.createBiquadFilter();
        waterFilter.type = 'bandpass';
        waterFilter.frequency.value = 1500;
        waterFilter.Q.value = 3;
        
        const waterGain = this.audioContext.createGain();
        waterGain.gain.setValueAtTime(0.3, now);
        waterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        // === Layer 4: Surface tension snap ===
        const snapOsc = this.audioContext.createOscillator();
        snapOsc.type = 'sawtooth';
        snapOsc.frequency.setValueAtTime(800, now);
        snapOsc.frequency.exponentialRampToValueAtTime(400, now + 0.02);
        
        const snapFilter = this.audioContext.createBiquadFilter();
        snapFilter.type = 'highpass';
        snapFilter.frequency.value = 600;
        snapFilter.Q.value = 5;
        
        const snapGain = this.audioContext.createGain();
        snapGain.gain.setValueAtTime(0.2, now);
        snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        
        // === Layer 5: Harmonic ring ===
        const ringOsc = this.audioContext.createOscillator();
        ringOsc.type = 'sine';
        ringOsc.frequency.value = 640;
        
        const ringGain = this.audioContext.createGain();
        ringGain.gain.setValueAtTime(0, now);
        ringGain.gain.linearRampToValueAtTime(0.15, now + 0.005);
        ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        // Connect all layers
        impactOsc.connect(impactGain);
        impactGain.connect(this.preDelay);
        
        membrane1.connect(membraneGain);
        membrane2.connect(membraneGain);
        membraneGain.connect(this.preDelay);
        
        waterSource.connect(waterFilter);
        waterFilter.connect(waterGain);
        waterGain.connect(this.preDelay);
        
        snapOsc.connect(snapFilter);
        snapFilter.connect(snapGain);
        snapGain.connect(this.preDelay);
        
        ringOsc.connect(ringGain);
        ringGain.connect(this.preDelay);
        
        // Start all
        impactOsc.start(now);
        membrane1.start(now);
        membrane2.start(now);
        waterSource.start(now);
        snapOsc.start(now);
        ringOsc.start(now);
        
        // Stop all
        impactOsc.stop(now + 0.06);
        membrane1.stop(now + 0.08);
        membrane2.stop(now + 0.08);
        waterSource.stop(now + 0.1);
        snapOsc.stop(now + 0.02);
        ringOsc.stop(now + 0.15);
    }
    
    /**
     * Play premium match sound - orchestrated bubble symphony
     */
    public playMatchSound(matchSize: number): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        const popCount = Math.min(matchSize, 8);
        
        // Musical scale for harmonious pops
        const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        
        for (let i = 0; i < popCount; i++) {
            const delay = i * 0.045;
            const startTime = now + delay;
            const note = scale[i % scale.length];
            
            // === Main bubble pop with rich harmonics ===
            const fundamental = this.audioContext.createOscillator();
            fundamental.type = 'sine';
            fundamental.frequency.setValueAtTime(note, startTime);
            fundamental.frequency.exponentialRampToValueAtTime(note * 0.9, startTime + 0.12);
            
            // Harmonics for richness
            const harmonic2 = this.audioContext.createOscillator();
            harmonic2.type = 'triangle';
            harmonic2.frequency.value = note * 2;
            
            const harmonic3 = this.audioContext.createOscillator();
            harmonic3.type = 'sine';
            harmonic3.frequency.value = note * 3;
            
            const harmonic4 = this.audioContext.createOscillator();
            harmonic4.type = 'sine';
            harmonic4.frequency.value = note * 4;
            
            // Pop transient
            const popBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.03, this.audioContext.sampleRate);
            const popData = popBuffer.getChannelData(0);
            
            for (let j = 0; j < popData.length; j++) {
                const env = Math.exp(-j / (popData.length * 0.08));
                popData[j] = (Math.random() * 2 - 1) * env;
            }
            
            const popSource = this.audioContext.createBufferSource();
            popSource.buffer = popBuffer;
            
            const popFilter = this.audioContext.createBiquadFilter();
            popFilter.type = 'bandpass';
            popFilter.frequency.value = note * 2.5;
            popFilter.Q.value = 8;
            
            // Gains with cascade effect
            const baseVolume = 0.45 * Math.pow(0.9, i);
            
            const fundGain = this.audioContext.createGain();
            fundGain.gain.setValueAtTime(baseVolume, startTime);
            fundGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            
            const harm2Gain = this.audioContext.createGain();
            harm2Gain.gain.setValueAtTime(baseVolume * 0.5, startTime);
            harm2Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            const harm3Gain = this.audioContext.createGain();
            harm3Gain.gain.setValueAtTime(baseVolume * 0.25, startTime);
            harm3Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
            
            const harm4Gain = this.audioContext.createGain();
            harm4Gain.gain.setValueAtTime(baseVolume * 0.125, startTime);
            harm4Gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
            
            const popGain = this.audioContext.createGain();
            popGain.gain.setValueAtTime(baseVolume * 0.6, startTime);
            popGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);
            
            // Stereo positioning
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = ((i / popCount) - 0.5) * 1.5;
            
            // Connect harmonics
            fundamental.connect(fundGain);
            fundGain.connect(panner);
            
            harmonic2.connect(harm2Gain);
            harm2Gain.connect(panner);
            
            harmonic3.connect(harm3Gain);
            harm3Gain.connect(panner);
            
            harmonic4.connect(harm4Gain);
            harm4Gain.connect(panner);
            
            popSource.connect(popFilter);
            popFilter.connect(popGain);
            popGain.connect(panner);
            
            panner.connect(this.preDelay);
            
            // Start
            fundamental.start(startTime);
            harmonic2.start(startTime);
            harmonic3.start(startTime);
            harmonic4.start(startTime);
            popSource.start(startTime);
            
            // Stop
            fundamental.stop(startTime + 0.12);
            harmonic2.stop(startTime + 0.1);
            harmonic3.stop(startTime + 0.08);
            harmonic4.stop(startTime + 0.06);
            popSource.stop(startTime + 0.03);
        }
        
        // === Bonus celebration for large combos ===
        if (matchSize >= 5) {
            this.playBonusCelebration(now + popCount * 0.045, matchSize);
        }
    }
    
    private playBonusCelebration(startTime: number, matchSize: number): void {
        if (!this.audioContext || !this.preDelay) return;
        
        // Rich celebration chord with movement
        const chordNotes = [
            { freq: 261.63, vol: 0.4 },  // C
            { freq: 329.63, vol: 0.35 }, // E
            { freq: 392.00, vol: 0.3 },  // G
            { freq: 523.25, vol: 0.25 }, // C
            { freq: 659.25, vol: 0.2 }   // E
        ];
        
        chordNotes.forEach((note, i) => {
            const osc1 = this.audioContext!.createOscillator();
            osc1.type = 'triangle';
            osc1.frequency.value = note.freq;
            
            // Slight detune for richness
            const osc2 = this.audioContext!.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = note.freq * 1.008;
            
            // Tremolo effect
            const tremolo = this.audioContext!.createOscillator();
            tremolo.frequency.value = 4 + i * 0.5;
            const tremoloGain = this.audioContext!.createGain();
            tremoloGain.gain.value = 0.1;
            
            const gain1 = this.audioContext!.createGain();
            gain1.gain.setValueAtTime(0, startTime);
            gain1.gain.linearRampToValueAtTime(note.vol, startTime + 0.08);
            gain1.gain.setValueAtTime(note.vol, startTime + 0.4);
            gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
            
            const gain2 = this.audioContext!.createGain();
            gain2.gain.setValueAtTime(0, startTime);
            gain2.gain.linearRampToValueAtTime(note.vol * 0.5, startTime + 0.08);
            gain2.gain.setValueAtTime(note.vol * 0.5, startTime + 0.4);
            gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
            
            tremolo.connect(tremoloGain);
            tremoloGain.connect(gain1.gain);
            
            osc1.connect(gain1);
            osc2.connect(gain2);
            gain1.connect(this.preDelay!);
            gain2.connect(this.preDelay!);
            
            osc1.start(startTime);
            osc2.start(startTime);
            tremolo.start(startTime);
            
            osc1.stop(startTime + 0.8);
            osc2.stop(startTime + 0.8);
            tremolo.stop(startTime + 0.8);
        });
        
        // Add sparkle effect for extra large combos
        if (matchSize >= 7) {
            for (let i = 0; i < 8; i++) {
                const sparkleTime = startTime + i * 0.1;
                const sparkleFreq = 2000 + i * 500;
                
                const sparkle = this.audioContext!.createOscillator();
                sparkle.type = 'sine';
                sparkle.frequency.setValueAtTime(sparkleFreq, sparkleTime);
                sparkle.frequency.exponentialRampToValueAtTime(sparkleFreq * 1.5, sparkleTime + 0.05);
                
                const sparkleGain = this.audioContext!.createGain();
                sparkleGain.gain.setValueAtTime(0.15, sparkleTime);
                sparkleGain.gain.exponentialRampToValueAtTime(0.001, sparkleTime + 0.05);
                
                sparkle.connect(sparkleGain);
                sparkleGain.connect(this.preDelay!);
                
                sparkle.start(sparkleTime);
                sparkle.stop(sparkleTime + 0.05);
            }
        }
    }
    
    /**
     * Play power-up sound
     */
    public playPowerUpSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Magical ascending sequence
        for (let i = 0; i < 8; i++) {
            const startTime = now + i * 0.05;
            const baseFreq = 300 * Math.pow(1.15, i);
            
            // Main tone
            const mainOsc = this.audioContext.createOscillator();
            mainOsc.type = 'sine';
            mainOsc.frequency.setValueAtTime(baseFreq, startTime);
            mainOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, startTime + 0.15);
            
            // Octave
            const octaveOsc = this.audioContext.createOscillator();
            octaveOsc.type = 'triangle';
            octaveOsc.frequency.value = baseFreq * 2;
            
            // Fifth
            const fifthOsc = this.audioContext.createOscillator();
            fifthOsc.type = 'sine';
            fifthOsc.frequency.value = baseFreq * 1.5;
            
            const mainGain = this.audioContext.createGain();
            mainGain.gain.setValueAtTime(0.3 * Math.pow(0.85, i), startTime);
            mainGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
            
            const octaveGain = this.audioContext.createGain();
            octaveGain.gain.setValueAtTime(0.15 * Math.pow(0.85, i), startTime);
            octaveGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
            
            const fifthGain = this.audioContext.createGain();
            fifthGain.gain.setValueAtTime(0.1 * Math.pow(0.85, i), startTime);
            fifthGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            mainOsc.connect(mainGain);
            octaveOsc.connect(octaveGain);
            fifthOsc.connect(fifthGain);
            
            mainGain.connect(this.preDelay);
            octaveGain.connect(this.preDelay);
            fifthGain.connect(this.preDelay);
            
            mainOsc.start(startTime);
            octaveOsc.start(startTime);
            fifthOsc.start(startTime);
            
            mainOsc.stop(startTime + 0.15);
            octaveOsc.stop(startTime + 0.12);
            fifthOsc.stop(startTime + 0.1);
        }
    }
    
    /**
     * Play UI click
     */
    public playClickSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Soft, pleasant click
        const clickOsc = this.audioContext.createOscillator();
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(800, now);
        clickOsc.frequency.exponentialRampToValueAtTime(600, now + 0.02);
        
        const clickOsc2 = this.audioContext.createOscillator();
        clickOsc2.type = 'triangle';
        clickOsc2.frequency.value = 1200;
        
        const gain1 = this.audioContext.createGain();
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        
        const gain2 = this.audioContext.createGain();
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
        
        clickOsc.connect(gain1);
        clickOsc2.connect(gain2);
        gain1.connect(this.preDelay);
        gain2.connect(this.preDelay);
        
        clickOsc.start(now);
        clickOsc2.start(now);
        clickOsc.stop(now + 0.02);
        clickOsc2.stop(now + 0.015);
    }
    
    /**
     * Play victory sound
     */
    public playVictorySound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Victory fanfare
        const fanfareNotes = [
            { time: 0, freq: 523.25, dur: 0.15 },     // C
            { time: 0.15, freq: 523.25, dur: 0.15 },  // C
            { time: 0.3, freq: 523.25, dur: 0.15 },   // C
            { time: 0.45, freq: 659.25, dur: 0.3 },   // E
            { time: 0.75, freq: 783.99, dur: 0.15 },  // G
            { time: 0.9, freq: 659.25, dur: 0.15 },   // E
            { time: 1.05, freq: 783.99, dur: 0.4 }    // G
        ];
        
        fanfareNotes.forEach(note => {
            const startTime = now + note.time;
            
            // Main note
            const osc = this.audioContext!.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = note.freq;
            
            // Harmony
            const harmonyOsc = this.audioContext!.createOscillator();
            harmonyOsc.type = 'sine';
            harmonyOsc.frequency.value = note.freq * 1.25;
            
            // Sub bass
            const bassOsc = this.audioContext!.createOscillator();
            bassOsc.type = 'sine';
            bassOsc.frequency.value = note.freq / 2;
            
            const gain = this.audioContext!.createGain();
            gain.gain.setValueAtTime(0.4, startTime);
            gain.gain.setValueAtTime(0.4, startTime + note.dur * 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            const harmonyGain = this.audioContext!.createGain();
            harmonyGain.gain.setValueAtTime(0.2, startTime);
            harmonyGain.gain.setValueAtTime(0.2, startTime + note.dur * 0.8);
            harmonyGain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);
            
            const bassGain = this.audioContext!.createGain();
            bassGain.gain.setValueAtTime(0.3, startTime);
            bassGain.gain.setValueAtTime(0.3, startTime + note.dur * 0.8);
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
     * Play defeat sound
     */
    public playDefeatSound(): void {
        if (!this.isInitialized || !this.audioContext || !this.preDelay || this.isMuted) {
            return;
        }
        
        const now = this.audioContext.currentTime;
        
        // Sad descending tones
        for (let i = 0; i < 4; i++) {
            const startTime = now + i * 0.25;
            const freq = 400 / Math.pow(1.3, i);
            
            const osc = this.audioContext.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.8, startTime + 0.3);
            
            // Minor third for sadness
            const minorThird = this.audioContext.createOscillator();
            minorThird.type = 'sine';
            minorThird.frequency.value = freq * 1.2;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
            
            const minorGain = this.audioContext.createGain();
            minorGain.gain.setValueAtTime(0.15, startTime);
            minorGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
            
            osc.connect(gain);
            minorThird.connect(minorGain);
            gain.connect(this.preDelay);
            minorGain.connect(this.preDelay);
            
            osc.start(startTime);
            minorThird.start(startTime);
            osc.stop(startTime + 0.3);
            minorThird.stop(startTime + 0.3);
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
        console.log(`PremiumBubbleSound: ${this.isMuted ? 'Muted' : 'Unmuted'}`);
        return this.isMuted;
    }
    
    public testAllSounds(): void {
        console.log('PremiumBubbleSound: Testing premium sounds...');
        
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
            type: 'Premium studio-quality bubble sounds'
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
        console.log('PremiumBubbleSound: Destroyed');
    }
}