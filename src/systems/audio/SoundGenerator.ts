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

    constructor() {
        // Initialize Web Audio Context with fallback
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create master gain node
        this.masterGainNode = this.audioContext.createGain();
        this.masterGainNode.gain.value = this.volume;
        
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
        const config = AUDIO_CONFIG.EFFECTS.BUBBLE_SHOOT;
        // Softer pitch variation for more pleasant sound
        const frequency = config.frequency * (1 + pitchVariation * 0.15);
        
        return this.createToneWithEnvelope({
            frequency,
            type: config.type as OscillatorType,
            envelope: config.envelope,
            duration: config.duration,
            volume: config.volume
        });
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
     * Generate pleasant bubble pop sound based on color
     */
    public generateBubblePop(color?: BubbleColor): string {
        // Map colors to pleasant musical notes
        const colorFrequencies: { [key: number]: number } = {
            [BubbleColor.RED]: 440,      // A4
            [BubbleColor.BLUE]: 523.25,   // C5
            [BubbleColor.GREEN]: 587.33,  // D5
            [BubbleColor.YELLOW]: 659.25, // E5
            [BubbleColor.PURPLE]: 698.46  // F5
        };
        
        const frequency = color ? (colorFrequencies[color] || 440) : 440;
        
        // Pleasant pop sound with soft envelope
        return this.createToneWithEnvelope({
            frequency,
            type: 'sine' as OscillatorType,
            envelope: {
                attack: 0.002,
                decay: 0.03,
                sustain: 0.1,
                release: 0.15
            },
            duration: 0.2,
            volume: 0.15
        });
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
        setInterval(() => {
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
        this.stopAmbience();
        this.stopAllVoices();
        
        if (this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}