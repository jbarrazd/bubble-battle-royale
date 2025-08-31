/**
 * SoundGenerator - Professional Web Audio API Synthesizer
 * Generates all sound effects procedurally without external files
 */

import { AUDIO_CONFIG, MatchSize } from '@/config/AudioConfig';
import { BubbleColor } from '@/types/ArenaTypes';

export interface IAudioVoice {
    oscillator: OscillatorNode;
    gainNode: GainNode;
    startTime: number;
    isActive: boolean;
    id: string;
}

export class SoundGenerator {
    private audioContext: AudioContext;
    private masterGainNode: GainNode;
    private compressorNode: DynamicsCompressorNode;
    private reverbNode?: ConvolverNode;
    
    // Voice management
    private activeVoices: Map<string, IAudioVoice> = new Map();
    private voiceIdCounter: number = 0;
    
    // Performance monitoring
    private soundCount: number = 0;
    private lastCleanup: number = 0;
    
    // Settings
    private volume: number = AUDIO_CONFIG.MASTER.VOLUME;
    private muted: boolean = false;
    
    // Ambient background
    private ambientOscillators: OscillatorNode[] = [];
    private ambientGain?: GainNode;
    private ambientFilter?: BiquadFilterNode;
    private isAmbientPlaying: boolean = false;
    
    // Cleanup timer reference to prevent memory leak
    private cleanupTimerId?: number;

    constructor() {
        // Initialize Web Audio Context with fallback
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        // console.log('SoundGenerator: Audio context created, state:', this.audioContext.state);
        
        // Create master gain node
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.gain.value = this.volume;
        // console.log('SoundGenerator: Master gain set to:', this.volume);
        
        // Create compressor for dynamic range control
        this.compressorNode = this.audioContext.createDynamicsCompressor();
        this.compressorNode.threshold.value = -20;
        this.compressorNode.knee.value = 40;
        this.compressorNode.ratio.value = 12;
        this.compressorNode.attack.value = 0.003;
        this.compressorNode.release.value = 0.25;
        
        // Connect audio chain
        this.masterGainNode.connect(this.compressorNode);
        this.compressorNode.connect(this.audioContext.destination);
        
        // Initialize reverb (optional)
        this.initializeReverb();
        
        // Start cleanup timer
        this.startCleanupTimer();
    }

    /**
     * Ensure audio context is running (handles autoplay restrictions)
     */
    public async ensureContextRunning(): Promise<void> {
        if (this.audioContext.state === 'suspended') {
            let retries = 0;
            const maxRetries = AUDIO_CONFIG.MASTER.CONTEXT_RESUME_MAX_RETRIES;
            
            while (this.audioContext.state === 'suspended' && retries < maxRetries) {
                try {
                    await this.audioContext.resume();
                    if (this.audioContext.state === 'running') break;
                } catch (error) {
                    console.warn('SoundGenerator: Failed to resume audio context, retry', retries + 1);
                }
                
                retries++;
                await new Promise(resolve => 
                    setTimeout(resolve, AUDIO_CONFIG.MASTER.CONTEXT_RESUME_RETRY_DELAY)
                );
            }
        }
    }

    /**
     * Generate bubble shooting sound with pitch variation
     */
    public generateBubbleShoot(pitchVariation: number = 0): string {
        // console.log('SoundGenerator: generateBubbleShoot called');
        // console.log('Audio context state:', this.audioContext.state);
        // console.log('Muted:', this.muted);
        
        const config = AUDIO_CONFIG.EFFECTS.BUBBLE_SHOOT;
        // Softer pitch variation for more pleasant sound
        const frequency = config.frequency * (1 + pitchVariation * 0.15);
        
        const voiceId = this.createToneWithEnvelope({
            frequency,
            type: config.type as OscillatorType,
            envelope: config.envelope,
            duration: config.duration,
            volume: config.volume
        });
        
        // console.log('Created voice:', voiceId);
        return voiceId;
    }

    /**
     * Generate bubble attachment sound
     */
    public generateBubbleAttach(): string {
        const config = AUDIO_CONFIG.EFFECTS.BUBBLE_ATTACH;
        
        return this.createToneWithEnvelope({
            frequency: config.frequency,
            type: config.type as OscillatorType,
            envelope: config.envelope,
            duration: config.duration,
            volume: config.volume
        });
    }

    /**
     * Generate convincing water bubble pop sound
     */
    public generateBubblePop(color?: BubbleColor): string {
        if (this.muted) return 'muted';
        
        const voiceId = `pop_${this.voiceIdCounter++}`;
        
        try {
            const currentTime = this.audioContext.currentTime;
            
            // Create a more water-like pop using multiple components
            
            // 1. Low frequency thump (the initial pressure release)
            const thumpOsc = this.audioContext.createOscillator();
            const thumpGain = this.audioContext.createGain();
            thumpOsc.type = 'sine';
            thumpOsc.frequency.setValueAtTime(150, currentTime);
            thumpOsc.frequency.exponentialRampToValueAtTime(40, currentTime + 0.03);
            
            thumpGain.gain.setValueAtTime(0, currentTime);
            thumpGain.gain.linearRampToValueAtTime(0.2, currentTime + 0.001);
            thumpGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.03);
            
            // 2. Mid frequency click (the actual pop)
            const clickOsc = this.audioContext.createOscillator();
            const clickGain = this.audioContext.createGain();
            const clickFilter = this.audioContext.createBiquadFilter();
            clickFilter.type = 'bandpass';
            clickFilter.frequency.value = 2000;
            clickFilter.Q.value = 1;
            
            clickOsc.type = 'square';
            clickOsc.frequency.setValueAtTime(1500 + Math.random() * 500, currentTime);
            
            clickGain.gain.setValueAtTime(0, currentTime);
            clickGain.gain.linearRampToValueAtTime(0.1, currentTime + 0.0005);
            clickGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.01);
            
            // 3. High frequency splash (water droplet scatter)
            const splashOsc = this.audioContext.createOscillator();
            const splashGain = this.audioContext.createGain();
            splashOsc.type = 'triangle';
            splashOsc.frequency.setValueAtTime(4000 + Math.random() * 2000, currentTime);
            splashOsc.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.05);
            
            splashGain.gain.setValueAtTime(0, currentTime);
            splashGain.gain.linearRampToValueAtTime(0.05, currentTime + 0.002);
            splashGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.04);
            
            // Connect everything
            thumpOsc.connect(thumpGain);
            thumpGain.connect(this.masterGainNode);
            
            clickOsc.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(this.masterGainNode);
            
            splashOsc.connect(splashGain);
            splashGain.connect(this.masterGainNode);
            
            // Start all oscillators
            thumpOsc.start(currentTime);
            thumpOsc.stop(currentTime + 0.04);
            
            clickOsc.start(currentTime);
            clickOsc.stop(currentTime + 0.015);
            
            splashOsc.start(currentTime + 0.002);
            splashOsc.stop(currentTime + 0.05);
            
            // Cleanup
            const cleanup = () => {
                thumpOsc.disconnect();
                thumpGain.disconnect();
                clickOsc.disconnect();
                clickFilter.disconnect();
                clickGain.disconnect();
                splashOsc.disconnect();
                splashGain.disconnect();
                this.activeVoices.delete(voiceId);
            };
            
            thumpOsc.onended = cleanup;
            
            return voiceId;
            
        } catch (error) {
            console.error('SoundGenerator: Failed to create pop sound:', error);
            return 'error';
        }
    }
    
    /**
     * Generate modern, complex combo achievement sound
     */
    public generateComboSound(type: 'good' | 'great' | 'amazing' | 'perfect'): string {
        if (this.muted) return 'muted';
        
        const voiceId = `combo_${this.voiceIdCounter++}`;
        
        try {
            const currentTime = this.audioContext.currentTime;
            
            // Create complex layered sounds based on combo level
            switch(type) {
                case 'good':
                    this.createGoodComboSound(currentTime, voiceId);
                    break;
                case 'great':
                    this.createGreatComboSound(currentTime, voiceId);
                    break;
                case 'amazing':
                    this.createAmazingComboSound(currentTime, voiceId);
                    break;
                case 'perfect':
                    this.createPerfectComboSound(currentTime, voiceId);
                    break;
            }
            
            return voiceId;
            
        } catch (error) {
            console.error('SoundGenerator: Failed to create combo sound:', error);
            return 'error';
        }
    }
    
    private createGoodComboSound(currentTime: number, voiceId: string): void {
        // Modern synth sweep with filter modulation
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Detuned saw waves for richness
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(220, currentTime);
        osc2.frequency.setValueAtTime(221, currentTime); // Slight detune
        
        // Filter sweep
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, currentTime + 0.1);
        filter.frequency.exponentialRampToValueAtTime(500, currentTime + 0.3);
        filter.Q.value = 5;
        
        // Volume envelope
        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(0.2, currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
        
        // Connect
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGainNode);
        
        // Play
        osc1.start(currentTime);
        osc1.stop(currentTime + 0.3);
        osc2.start(currentTime);
        osc2.stop(currentTime + 0.3);
        
        // Impact layer
        this.addImpactLayer(currentTime, 0.15);
    }
    
    private createGreatComboSound(currentTime: number, voiceId: string): void {
        // Layered synth with pitch bend and resonance
        for (let i = 0; i < 3; i++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'square';
            const baseFreq = 330 * (1 + i * 0.5);
            osc.frequency.setValueAtTime(baseFreq, currentTime);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, currentTime + 0.1);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, currentTime + 0.4);
            
            filter.type = 'bandpass';
            filter.frequency.value = 1000 + i * 500;
            filter.Q.value = 10;
            
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.15 / (i + 1), currentTime + 0.02 * (i + 1));
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.4);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGainNode);
            
            osc.start(currentTime + i * 0.02);
            osc.stop(currentTime + 0.5);
        }
        
        // Add shimmer
        this.addShimmerEffect(currentTime, 0.2);
        this.addImpactLayer(currentTime, 0.2);
    }
    
    private createAmazingComboSound(currentTime: number, voiceId: string): void {
        // Complex FM synthesis with multiple carriers
        const carrier1 = this.audioContext.createOscillator();
        const carrier2 = this.audioContext.createOscillator();
        const modulator = this.audioContext.createOscillator();
        const modGain = this.audioContext.createGain();
        const carrierGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // FM synthesis setup
        modulator.frequency.value = 440;
        modGain.gain.setValueAtTime(100, currentTime);
        modGain.gain.exponentialRampToValueAtTime(500, currentTime + 0.1);
        modGain.gain.exponentialRampToValueAtTime(50, currentTime + 0.5);
        
        carrier1.frequency.value = 220;
        carrier2.frequency.value = 330;
        
        // Filter with automation
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, currentTime);
        filter.frequency.exponentialRampToValueAtTime(5000, currentTime + 0.15);
        filter.frequency.exponentialRampToValueAtTime(1000, currentTime + 0.5);
        filter.Q.value = 8;
        
        // Main envelope
        carrierGain.gain.setValueAtTime(0, currentTime);
        carrierGain.gain.linearRampToValueAtTime(0.25, currentTime + 0.02);
        carrierGain.gain.setValueAtTime(0.25, currentTime + 0.2);
        carrierGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.6);
        
        // Connect FM
        modulator.connect(modGain);
        modGain.connect(carrier1.frequency);
        modGain.connect(carrier2.frequency);
        
        carrier1.connect(filter);
        carrier2.connect(filter);
        filter.connect(carrierGain);
        carrierGain.connect(this.masterGainNode);
        
        // Start
        modulator.start(currentTime);
        carrier1.start(currentTime);
        carrier2.start(currentTime);
        modulator.stop(currentTime + 0.6);
        carrier1.stop(currentTime + 0.6);
        carrier2.stop(currentTime + 0.6);
        
        // Add multiple layers
        this.addShimmerEffect(currentTime, 0.3);
        this.addImpactLayer(currentTime, 0.3);
        this.addResonanceLayer(currentTime);
    }
    
    private createPerfectComboSound(currentTime: number, voiceId: string): void {
        // Epic multi-layered synthesis
        
        // Layer 1: Deep bass impact
        const bassOsc = this.audioContext.createOscillator();
        const bassGain = this.audioContext.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(55, currentTime);
        bassGain.gain.setValueAtTime(0, currentTime);
        bassGain.gain.linearRampToValueAtTime(0.4, currentTime + 0.02);
        bassGain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);
        bassOsc.connect(bassGain);
        bassGain.connect(this.masterGainNode);
        bassOsc.start(currentTime);
        bassOsc.stop(currentTime + 0.5);
        
        // Layer 2: Harmonic sweep
        for (let harmonic = 1; harmonic <= 5; harmonic++) {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            osc.type = 'triangle';
            const freq = 440 * harmonic;
            osc.frequency.setValueAtTime(freq * 0.5, currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq, currentTime + 0.1);
            osc.frequency.setValueAtTime(freq, currentTime + 0.3);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.5, currentTime + 0.6);
            
            filter.type = 'bandpass';
            filter.frequency.value = freq;
            filter.Q.value = 20;
            
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.1 / harmonic, currentTime + 0.05 * harmonic);
            gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.8);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGainNode);
            
            osc.start(currentTime);
            osc.stop(currentTime + 0.8);
        }
        
        // Layer 3: Sparkling top
        this.addSparkleChain(currentTime);
        this.addShimmerEffect(currentTime, 0.4);
        this.addImpactLayer(currentTime, 0.35);
        this.addResonanceLayer(currentTime);
    }
    
    private addImpactLayer(currentTime: number, volume: number): void {
        // Sub bass punch
        const impact = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        impact.type = 'sine';
        impact.frequency.setValueAtTime(80, currentTime);
        impact.frequency.exponentialRampToValueAtTime(30, currentTime + 0.1);
        gain.gain.setValueAtTime(volume, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.1);
        impact.connect(gain);
        gain.connect(this.masterGainNode);
        impact.start(currentTime);
        impact.stop(currentTime + 0.15);
    }
    
    private addShimmerEffect(currentTime: number, volume: number): void {
        // High frequency shimmer
        const shimmer = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        shimmer.type = 'sawtooth';
        shimmer.frequency.setValueAtTime(3000, currentTime);
        shimmer.frequency.exponentialRampToValueAtTime(6000, currentTime + 0.2);
        
        filter.type = 'highpass';
        filter.frequency.value = 3000;
        
        gain.gain.setValueAtTime(0, currentTime);
        gain.gain.linearRampToValueAtTime(volume * 0.5, currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
        
        shimmer.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGainNode);
        shimmer.start(currentTime);
        shimmer.stop(currentTime + 0.3);
    }
    
    private addResonanceLayer(currentTime: number): void {
        // Resonant filter sweep
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.3, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = (Math.random() * 2 - 1) * 0.1;
        }
        noise.buffer = noiseBuffer;
        
        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, currentTime);
        filter.frequency.exponentialRampToValueAtTime(4000, currentTime + 0.2);
        filter.Q.value = 20;
        
        gain.gain.setValueAtTime(0.15, currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGainNode);
        noise.start(currentTime);
        noise.stop(currentTime + 0.3);
    }
    
    private addSparkleChain(currentTime: number): void {
        // Chain of sparkles
        for (let i = 0; i < 8; i++) {
            const sparkle = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            sparkle.type = 'sine';
            sparkle.frequency.value = 2000 + i * 500;
            
            const startTime = currentTime + i * 0.05;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.05, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            
            sparkle.connect(gain);
            gain.connect(this.masterGainNode);
            sparkle.start(startTime);
            sparkle.stop(startTime + 0.15);
        }
    }
    
    /**
     * Generate UI click sound
     */
    public generateUIClick(): string {
        const config = AUDIO_CONFIG.EFFECTS.UI_CLICK;
        
        return this.createToneWithEnvelope({
            frequency: config.frequency,
            type: config.type as OscillatorType,
            envelope: config.envelope,
            duration: config.duration,
            volume: config.volume
        });
    }

    /**
     * Generate combo sound based on match size
     */
    public generateComboSound(matchSize: number): string[] {
        const size = Math.min(Math.max(matchSize, 3), 7) as MatchSize;
        const config = AUDIO_CONFIG.MATCH_SOUNDS[size];
        const voices: string[] = [];
        
        config.frequencies.forEach((frequency, index) => {
            const delay = index * config.noteDelay;
            
            setTimeout(() => {
                const voiceId = this.createToneWithEnvelope({
                    frequency,
                    type: config.type as OscillatorType,
                    envelope: {
                        attack: 0.01,
                        decay: 0.1,
                        sustain: 0.8,
                        release: 0.3
                    },
                    duration: 0.6,
                    volume: config.volume * (1 - index * 0.05) // Slight volume decrease per note
                });
                voices.push(voiceId);
            }, delay);
        });
        
        return voices;
    }

    /**
     * Generate power-up activation sound (frequency sweep)
     */
    public generatePowerUpActivation(): string {
        const config = AUDIO_CONFIG.EFFECTS.POWER_UP_ACTIVATION;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const voiceId = this.generateVoiceId();
        
        // Configure oscillator
        oscillator.type = config.type as OscillatorType;
        oscillator.frequency.value = config.startFreq;
        
        // Create frequency sweep
        const now = this.audioContext.currentTime;
        oscillator.frequency.exponentialRampToValueAtTime(config.endFreq, now + config.duration);
        
        // Configure envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(config.volume, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
        
        // Connect and start
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGainNode);
        
        oscillator.start(now);
        oscillator.stop(now + config.duration);
        
        // Track voice
        this.activeVoices.set(voiceId, {
            oscillator,
            gainNode,
            startTime: now,
            isActive: true,
            id: voiceId
        });
        
        // Cleanup
        oscillator.onended = () => {
            this.cleanupVoice(voiceId);
        };
        
        return voiceId;
    }

    /**
     * Generate danger warning sound (pulsing tone)
     */
    public generateDangerWarning(): string {
        const config = AUDIO_CONFIG.EFFECTS.DANGER_WARNING;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const pulseGain = this.audioContext.createGain();
        const pulseOsc = this.audioContext.createOscillator();
        const voiceId = this.generateVoiceId();
        
        // Main tone
        oscillator.type = config.type as OscillatorType;
        oscillator.frequency.value = config.frequency;
        
        // Pulse modulation
        pulseOsc.type = 'sine';
        pulseOsc.frequency.value = config.pulseRate;
        
        const now = this.audioContext.currentTime;
        
        // Configure pulse amplitude
        pulseGain.gain.setValueAtTime(0.5, now);
        pulseOsc.connect(pulseGain.gain);
        
        // Configure main envelope
        gainNode.gain.setValueAtTime(config.volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
        
        // Connect audio chain
        oscillator.connect(gainNode);
        gainNode.connect(pulseGain);
        pulseGain.connect(this.masterGainNode);
        
        // Start oscillators
        oscillator.start(now);
        pulseOsc.start(now);
        oscillator.stop(now + config.duration);
        pulseOsc.stop(now + config.duration);
        
        // Track voice
        this.activeVoices.set(voiceId, {
            oscillator,
            gainNode,
            startTime: now,
            isActive: true,
            id: voiceId
        });
        
        // Cleanup
        oscillator.onended = () => {
            this.cleanupVoice(voiceId);
        };
        
        return voiceId;
    }

    /**
     * Generate victory fanfare
     */
    public generateVictoryFanfare(): string[] {
        const config = AUDIO_CONFIG.SPECIAL_EVENTS.VICTORY;
        const voices: string[] = [];
        
        config.frequencies.forEach((frequency, index) => {
            const delay = index * config.noteDelay;
            
            setTimeout(() => {
                const voiceId = this.createToneWithEnvelope({
                    frequency,
                    type: config.type as OscillatorType,
                    envelope: {
                        attack: 0.02,
                        decay: 0.1,
                        sustain: 0.9,
                        release: 0.4
                    },
                    duration: 0.8,
                    volume: config.volume * (0.8 + index * 0.05) // Slight volume increase
                });
                voices.push(voiceId);
            }, delay);
        });
        
        return voices;
    }

    /**
     * Generate defeat sound sequence
     */
    public generateDefeatSequence(): string[] {
        const config = AUDIO_CONFIG.SPECIAL_EVENTS.DEFEAT;
        const voices: string[] = [];
        
        config.frequencies.forEach((frequency, index) => {
            const delay = index * config.noteDelay;
            
            setTimeout(() => {
                const voiceId = this.createToneWithEnvelope({
                    frequency,
                    type: config.type as OscillatorType,
                    envelope: {
                        attack: 0.01,
                        decay: 0.05,
                        sustain: 0.7,
                        release: 0.2
                    },
                    duration: 0.4,
                    volume: config.volume * (1 - index * 0.1) // Decreasing volume
                });
                voices.push(voiceId);
            }, delay);
        });
        
        return voices;
    }

    /**
     * Create a tone with ADSR envelope
     */
    private createToneWithEnvelope(params: {
        frequency: number;
        type: OscillatorType;
        envelope: {
            attack: number;
            decay: number;
            sustain: number;
            release: number;
        };
        duration: number;
        volume: number;
    }): string {
        if (this.muted || !this.canPlaySound()) {
            return '';
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const voiceId = this.generateVoiceId();
        
        // Configure oscillator
        oscillator.type = params.type;
        oscillator.frequency.value = params.frequency;
        
        // Configure ADSR envelope
        const now = this.audioContext.currentTime;
        const { attack, decay, sustain, release } = params.envelope;
        const sustainLevel = params.volume * sustain;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(params.volume, now + attack);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
        gainNode.gain.setValueAtTime(sustainLevel, now + params.duration - release);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + params.duration);
        
        // Connect and start
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGainNode);
        
        oscillator.start(now);
        oscillator.stop(now + params.duration);
        
        // Track voice
        this.activeVoices.set(voiceId, {
            oscillator,
            gainNode,
            startTime: now,
            isActive: true,
            id: voiceId
        });
        
        // Cleanup when ended
        oscillator.onended = () => {
            this.cleanupVoice(voiceId);
        };
        
        this.soundCount++;
        return voiceId;
    }

    /**
     * Initialize reverb effect (optional)
     */
    private initializeReverb(): void {
        if (!AUDIO_CONFIG.WEB_AUDIO.REVERB) return;
        
        try {
            this.reverbNode = this.audioContext.createConvolver();
            
            // Create impulse response for reverb
            const length = this.audioContext.sampleRate * 2; // 2 second reverb
            const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
            
            for (let channel = 0; channel < 2; channel++) {
                const channelData = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    const decay = Math.pow(1 - (i / length), 2);
                    channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
                }
            }
            
            this.reverbNode.buffer = impulse;
            
            // Connect reverb to audio chain (disabled by default)
            // this.masterGainNode.connect(this.reverbNode);
            // this.reverbNode.connect(this.compressorNode);
        } catch (error) {
            console.warn('SoundGenerator: Failed to initialize reverb:', error);
        }
    }

    /**
     * Check if we can play a sound (performance limiting)
     */
    private canPlaySound(): boolean {
        const maxConcurrent = AUDIO_CONFIG.PERFORMANCE.MAX_CONCURRENT_SOUNDS;
        const activeCount = this.activeVoices.size;
        
        if (activeCount >= maxConcurrent) {
            // Voice stealing - stop oldest voice
            this.stealVoice();
        }
        
        return true;
    }

    /**
     * Voice stealing for performance
     */
    private stealVoice(): void {
        let oldestTime = Infinity;
        let oldestVoiceId = '';
        
        this.activeVoices.forEach((voice, id) => {
            if (voice.startTime < oldestTime) {
                oldestTime = voice.startTime;
                oldestVoiceId = id;
            }
        });
        
        if (oldestVoiceId) {
            this.stopVoice(oldestVoiceId);
        }
    }

    /**
     * Stop a specific voice
     */
    public stopVoice(voiceId: string): void {
        const voice = this.activeVoices.get(voiceId);
        if (voice && voice.isActive) {
            try {
                voice.oscillator.stop();
                voice.isActive = false;
            } catch (error) {
                // Voice might already be stopped
            }
            this.cleanupVoice(voiceId);
        }
    }

    /**
     * Stop all active voices
     */
    public stopAllVoices(): void {
        this.activeVoices.forEach((_, voiceId) => {
            this.stopVoice(voiceId);
        });
        this.activeVoices.clear();
    }

    /**
     * Generate unique voice ID
     */
    private generateVoiceId(): string {
        return `voice_${++this.voiceIdCounter}_${Date.now()}`;
    }

    /**
     * Cleanup completed voice
     */
    private cleanupVoice(voiceId: string): void {
        const voice = this.activeVoices.get(voiceId);
        if (voice) {
            try {
                voice.gainNode.disconnect();
                voice.oscillator.disconnect();
            } catch (error) {
                // Already disconnected
            }
            this.activeVoices.delete(voiceId);
        }
    }

    /**
     * Start periodic cleanup timer
     */
    private startCleanupTimer(): void {
        // Clear any existing timer first
        if (this.cleanupTimerId) {
            clearInterval(this.cleanupTimerId);
        }
        
        // Store timer ID for cleanup
        this.cleanupTimerId = window.setInterval(() => {
            this.performCleanup();
        }, AUDIO_CONFIG.PERFORMANCE.CLEANUP_INTERVAL);
    }

    /**
     * Perform periodic cleanup
     */
    private performCleanup(): void {
        const now = this.audioContext.currentTime;
        const voicesToClean: string[] = [];
        
        this.activeVoices.forEach((voice, id) => {
            // Clean up voices that should have ended
            const expectedEndTime = voice.startTime + 10; // 10 second max
            if (now > expectedEndTime) {
                voicesToClean.push(id);
            }
        });
        
        voicesToClean.forEach(id => {
            this.cleanupVoice(id);
        });
        
        this.lastCleanup = now;
    }

    /**
     * Set master volume (0-1)
     */
    public setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.masterGainNode.gain.exponentialRampToValueAtTime(
            Math.max(0.01, this.volume),
            this.audioContext.currentTime + 0.1
        );
    }

    /**
     * Get current volume
     */
    public getVolume(): number {
        return this.volume;
    }

    /**
     * Toggle mute
     */
    public setMuted(muted: boolean): void {
        this.muted = muted;
        if (muted) {
            this.stopAllVoices();
        }
    }

    /**
     * Get muted state
     */
    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Start subtle ambient background sound
     */
    public startAmbience(): void {
        if (this.isAmbientPlaying || this.muted) return;
        
        try {
            // Create ambient gain node
            this.ambientGain = this.audioContext.createGain();
            this.ambientGain.gain.value = 0; // Start at 0 for fade in
            
            // Create low-pass filter for warmth
            this.ambientFilter = this.audioContext.createBiquadFilter();
            this.ambientFilter.type = 'lowpass';
            this.ambientFilter.frequency.value = 800;
            this.ambientFilter.Q.value = 1;
            
            // Create multiple oscillators for rich ambient texture
            const frequencies = [55, 82.5, 110]; // A1, E2, A2 - peaceful chord
            
            frequencies.forEach((freq, index) => {
                const oscillator = this.audioContext.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = freq;
                
                // Add subtle frequency modulation for organic feel
                const lfo = this.audioContext.createOscillator();
                lfo.frequency.value = 0.1 + index * 0.05; // Very slow modulation
                const lfoGain = this.audioContext.createGain();
                lfoGain.gain.value = 0.5; // Subtle modulation depth
                
                lfo.connect(lfoGain);
                lfoGain.connect(oscillator.frequency);
                lfo.start();
                
                // Connect oscillator
                oscillator.connect(this.ambientFilter!);
                oscillator.start();
                
                this.ambientOscillators.push(oscillator);
            });
            
            // Connect chain
            this.ambientFilter.connect(this.ambientGain);
            this.ambientGain.connect(this.masterGainNode);
            
            // Fade in slowly
            this.ambientGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            this.ambientGain.gain.linearRampToValueAtTime(
                0.03, // Very quiet background level
                this.audioContext.currentTime + 2
            );
            
            this.isAmbientPlaying = true;
        } catch (error) {
            console.warn('SoundGenerator: Failed to start ambience:', error);
        }
    }
    
    /**
     * Stop ambient background sound
     */
    public stopAmbience(): void {
        if (!this.isAmbientPlaying) return;
        
        if (this.ambientGain) {
            // Fade out
            this.ambientGain.gain.setValueAtTime(
                this.ambientGain.gain.value,
                this.audioContext.currentTime
            );
            this.ambientGain.gain.linearRampToValueAtTime(
                0,
                this.audioContext.currentTime + 1
            );
            
            // Stop oscillators after fade
            setTimeout(() => {
                this.ambientOscillators.forEach(osc => {
                    try {
                        osc.stop();
                        osc.disconnect();
                    } catch (e) {
                        // Ignore if already stopped
                    }
                });
                this.ambientOscillators = [];
                
                if (this.ambientGain) {
                    this.ambientGain.disconnect();
                    this.ambientGain = undefined;
                }
                if (this.ambientFilter) {
                    this.ambientFilter.disconnect();
                    this.ambientFilter = undefined;
                }
            }, 1100);
        }
        
        this.isAmbientPlaying = false;
    }
    
    /**
     * Adjust ambient intensity based on game state
     */
    public setAmbienceIntensity(intensity: number): void {
        if (!this.ambientGain || !this.isAmbientPlaying) return;
        
        // Clamp intensity between 0 and 1
        const clampedIntensity = Math.max(0, Math.min(1, intensity));
        
        // Map to appropriate volume range (0.01 to 0.05)
        const targetVolume = 0.01 + (clampedIntensity * 0.04);
        
        this.ambientGain.gain.setValueAtTime(
            this.ambientGain.gain.value,
            this.audioContext.currentTime
        );
        this.ambientGain.gain.linearRampToValueAtTime(
            targetVolume,
            this.audioContext.currentTime + 0.5
        );
        
        // Also adjust filter frequency for tension
        if (this.ambientFilter) {
            const targetFreq = 800 + (clampedIntensity * 1200); // 800Hz to 2000Hz
            this.ambientFilter.frequency.setValueAtTime(
                this.ambientFilter.frequency.value,
                this.audioContext.currentTime
            );
            this.ambientFilter.frequency.linearRampToValueAtTime(
                targetFreq,
                this.audioContext.currentTime + 0.5
            );
        }
    }

    /**
     * Get performance stats
     */
    public getStats(): {
        activeVoices: number;
        totalSounds: number;
        audioContextState: string;
        ambientPlaying: boolean;
    } {
        return {
            activeVoices: this.activeVoices.size,
            totalSounds: this.soundCount,
            audioContextState: this.audioContext.state,
            ambientPlaying: this.isAmbientPlaying
        };
    }

    /**
     * Destroy the sound generator
     */
    public destroy(): void {
        // CRITICAL: Clear the cleanup timer to prevent memory leak
        if (this.cleanupTimerId) {
            clearInterval(this.cleanupTimerId);
            this.cleanupTimerId = undefined;
        }
        
        this.stopAmbience();
        this.stopAllVoices();
        
        if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}