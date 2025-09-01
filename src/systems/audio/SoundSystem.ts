/**
 * SoundSystem - Professional Audio Controller
 * Main orchestrator for the complete audio and haptic experience
 */

import { Scene } from 'phaser';
import { SoundGenerator } from './SoundGenerator';
import { HapticManager } from './HapticManager';
import { ExplosionSoundSystem } from './ExplosionSoundSystem';
import { AUDIO_CONFIG, SoundEventType, MatchSize } from '@/config/AudioConfig';

export interface ISoundSystemSettings {
    masterVolume: number;
    effectsVolume: number;
    musicVolume: number;
    muted: boolean;
    hapticsEnabled: boolean;
}

export interface IMatchData {
    matchSize: number;
    combo: number;
    isAI: boolean;
    x: number;
    y: number;
    bubbleColor?: number;
}

export class SoundSystem {
    private scene: Scene;
    private soundGenerator: SoundGenerator;
    private hapticManager: HapticManager;
    private explosionSystem: ExplosionSoundSystem;
    
    // Settings
    private settings: ISoundSystemSettings = {
        masterVolume: AUDIO_CONFIG.MASTER.VOLUME,
        effectsVolume: 0.8,
        musicVolume: 0.6,
        muted: false,
        hapticsEnabled: true
    };
    
    // State tracking
    private initialized: boolean = false;
    private userInteractionReceived: boolean = false;
    private currentCombo: number = 0;
    
    // Background music (if implemented)
    private backgroundMusic?: Phaser.Sound.BaseSound;
    
    // Performance tracking
    private eventCount: number = 0;
    private lastEventTime: number = 0;

    constructor(scene: Scene) {
        console.log('SoundSystem: Constructor called');
        this.scene = scene;
        this.soundGenerator = new SoundGenerator();
        this.hapticManager = new HapticManager();
        this.explosionSystem = new ExplosionSoundSystem();
        
        console.log('SoundSystem: About to initialize...');
        this.initialize();
    }

    /**
     * Initialize the sound system
     */
    private async initialize(): Promise<void> {
        try {
            // Setup event listeners for game events
            this.setupGameEventListeners();
            
            // Setup settings from localStorage
            this.loadSettings();
            
            this.initialized = true;
            console.log('SoundSystem: Initialized successfully');
            
            // Log capabilities
            const stats = this.getSystemInfo();
            console.log('SoundSystem: Audio capabilities -', stats);
            
            // Start ambient background after short delay
            setTimeout(() => {
                if (!this.settings.muted) {
                    this.soundGenerator.startAmbience();
                }
            }, 1000);
            
        } catch (error) {
            console.error('SoundSystem: Initialization failed:', error);
        }
    }

    /**
     * Setup event listeners for game events
     */
    private setupGameEventListeners(): void {
        // Shooting system events
        this.scene.events.on('bubble-shoot', this.onBubbleShoot, this);
        this.scene.events.on('shooting-started', this.onShootingStarted, this);
        this.scene.events.on('shooting-complete', this.onShootingComplete, this);
        
        // Match detection events
        this.scene.events.on('match-found', this.onMatchFound, this);
        this.scene.events.on('match-completed', this.onMatchCompleted, this);
        this.scene.events.on('bubble-exploded', this.onBubbleExploded, this);
        this.scene.events.on('bubbles-popped', this.onBubblesPopped, this);
        
        // Score and combo events
        this.scene.events.on('score-update', this.onScoreUpdate, this);
        this.scene.events.on('combo-chain', this.onComboChain, this);
        
        // Power-up events
        this.scene.events.on('power-up-activated', this.onPowerUpActivated, this);
        this.scene.events.on('power-up-collected', this.onPowerUpCollected, this);
        
        // Arena events
        this.scene.events.on('victory', this.onVictory, this);
        this.scene.events.on('defeat', this.onDefeat, this);
        this.scene.events.on('danger-warning', this.onDangerWarning, this);
        
        // Grid and physics events
        this.scene.events.on('bubble-attached', this.onBubbleAttached, this);
        this.scene.events.on('floating-bubbles-drop', this.onFloatingBubblesDrop, this);
        this.scene.events.on('wall-bounce', this.onWallBounce, this);
        this.scene.events.on('projectile-collision', this.onProjectileCollision, this);
        
        // UI events
        this.scene.events.on('ui-click', this.onUIClick, this);
        this.scene.events.on('ui-hover', this.onUIHover, this);
        
        // Settings events
        this.scene.events.on('volume-change', this.onVolumeChange, this);
        this.scene.events.on('mute-toggle', this.onMuteToggle, this);
        
        // User interaction for audio context
        this.scene.input.on('pointerdown', this.onFirstUserInteraction, this);
        this.scene.input.keyboard?.on('keydown', this.onFirstUserInteraction, this);
    }

    /**
     * Handle first user interaction (required for Web Audio)
     */
    private async onFirstUserInteraction(): Promise<void> {
        if (this.userInteractionReceived) return;
        
        this.userInteractionReceived = true;
        console.log('SoundSystem: First user interaction detected');
        
        try {
            await this.soundGenerator.ensureContextRunning();
            await this.explosionSystem.ensureContextRunning();
            console.log('SoundSystem: Audio contexts activated after user interaction');
            
            // Test sound to confirm audio is working
            setTimeout(() => {
                console.log('SoundSystem: Playing test sound after user interaction');
                this.playEffect('ui-click');
            }, 100);
        } catch (error) {
            console.warn('SoundSystem: Failed to activate audio context:', error);
        }
        
        // Remove listeners after first interaction
        this.scene.input.off('pointerdown', this.onFirstUserInteraction, this);
        this.scene.input.keyboard?.off('keydown', this.onFirstUserInteraction, this);
    }

    // === GAME EVENT HANDLERS ===

    private onBubbleShoot(): void {
        // console.log('SoundSystem: bubble-shoot event received');
        this.playEffect('bubble-shoot');
        this.hapticManager.bubbleShoot();
        this.trackEvent('bubble-shoot');
    }

    private onShootingStarted(data?: { isAI?: boolean }): void {
        if (!data?.isAI) {
            // Only play sound for player shots, AI shots are handled separately
            const variation = Math.random() * 0.3 - 0.15; // -15% to +15% pitch variation
            this.soundGenerator.generateBubbleShoot(variation);
        }
    }

    private onShootingComplete(): void {
        // Optional: Play completion sound
    }

    private onBubbleAttached(): void {
        this.soundGenerator.generateBubbleAttach();
        this.hapticManager.bubbleAttach();
        this.trackEvent('bubble-attach');
    }

    private onMatchFound(data: IMatchData): void {
        const matchSize = Math.max(3, Math.min(data.matchSize, 10));
        
        // Play sophisticated explosion sound instead of combo sound
        if (!this.settings.muted) {
            this.explosionSystem.playExplosion(matchSize, data.combo || 0);
        }
        
        // Haptic feedback scaled with match size
        this.hapticManager.matchFound(matchSize as MatchSize);
        
        this.trackEvent('match-found');
    }

    private onMatchCompleted(data: { count: number; combo: number }): void {
        this.currentCombo = data.combo;
        
        // Haptic feedback for combos
        if (data.count >= 7) {
            // PERFECT combo - strong pattern
            this.hapticManager.customPattern([100, 50, 100, 50, 150], 'Perfect Combo!');
        } else if (data.count >= 6) {
            // AMAZING combo - strong haptic
            this.hapticManager.matchFound(8);
        } else if (data.count >= 5) {
            // GREAT combo - medium haptic
            this.hapticManager.matchFound(5);
        } else if (data.count >= 4) {
            // GOOD combo - light haptic
            this.hapticManager.matchFound(3);
        }
        
        // Explosion sounds are now handled in onMatchFound with the new ExplosionSoundSystem
        // This provides better timing and more sophisticated audio
    }

    private onBubbleExploded(data: { x: number; y: number; color: number; comboMultiplier: number }): void {
        // Skip additional sounds - let the main pop sounds handle it
    }
    
    private onBubblesPopped(data: { color: number; count: number }): void {
        // Haptic feedback for bubble pops
        if (data.count >= 3) {
            // Light haptic for small pops
            this.hapticManager.bubbleAttach();
        }
        if (data.count >= 5) {
            // Stronger haptic for bigger explosions
            this.hapticManager.matchFound(data.count);
        }
        
        if (this.settings.muted) return;
        
        // Ensure audio context is running
        this.soundGenerator.ensureContextRunning().then(() => {
            // Play pop sounds based on count
            const popCount = Math.min(data.count, 5); // Allow more pops
            
            for (let i = 0; i < popCount; i++) {
                setTimeout(() => {
                    try {
                        this.soundGenerator.generateBubblePop(data.color);
                    } catch (error) {
                        console.error('SoundSystem: Error generating pop sound:', error);
                    }
                }, i * 20); // 20ms stagger for cascade effect
            }
        });
        
        this.trackEvent('bubbles-popped');
    }

    private onScoreUpdate(data: { delta: number; combo: number; isOrphanBonus?: boolean }): void {
        if (data.isOrphanBonus) {
            // Special sound for orphan bonuses
            this.soundGenerator.generateUIClick();
        }
    }

    private onComboChain(data: { chainLength: number }): void {
        this.hapticManager.comboChain(data.chainLength);
        this.trackEvent('combo-chain');
    }

    private onPowerUpActivated(data?: { type?: string }): void {
        this.soundGenerator.generatePowerUpActivation();
        this.hapticManager.powerUpActivated();
        this.trackEvent('power-up-activated');
    }

    private onPowerUpCollected(): void {
        // Play collection sound (different from activation)
        this.soundGenerator.generateUIClick();
        this.hapticManager.uiClick();
    }

    private onFloatingBubblesDrop(data: { count: number }): void {
        this.hapticManager.floatingBubblesDrop(data.count);
        
        // Play subtle drop sound
        if (data.count > 0) {
            setTimeout(() => {
                this.soundGenerator.generateBubbleAttach();
            }, 200); // Slight delay for natural feel
        }
    }

    private onWallBounce(): void {
        // Subtle sound for wall bounces
        const variation = Math.random() * 0.5 + 0.7; // Quieter and higher pitch
        this.soundGenerator.generateBubbleShoot(variation);
        this.hapticManager.wallBounce();
    }

    private onProjectileCollision(): void {
        this.hapticManager.projectileCollision();
        // Sound is handled by individual projectiles
    }

    private onVictory(): void {
        this.soundGenerator.generateVictoryFanfare();
        this.hapticManager.victory();
        this.trackEvent('victory');
    }

    private onDefeat(): void {
        this.soundGenerator.generateDefeatSequence();
        this.hapticManager.defeat();
        this.trackEvent('defeat');
    }

    private onDangerWarning(): void {
        this.soundGenerator.generateDangerWarning();
        this.hapticManager.dangerWarning();
        
        // Increase ambient intensity during danger
        this.soundGenerator.setAmbienceIntensity(0.8);
        
        // Reset after warning period
        setTimeout(() => {
            this.soundGenerator.setAmbienceIntensity(0.3);
        }, 3000);
        
        this.trackEvent('danger-warning');
    }

    private onUIClick(): void {
        this.soundGenerator.generateUIClick();
        this.hapticManager.uiClick();
        this.trackEvent('ui-click');
    }

    private onUIHover(): void {
        // Subtle hover feedback (optional)
    }

    private onVolumeChange(data: { volume: number; type?: string }): void {
        if (data.type === 'master') {
            this.setMasterVolume(data.volume);
        } else if (data.type === 'effects') {
            this.setEffectsVolume(data.volume);
        } else if (data.type === 'music') {
            this.setMusicVolume(data.volume);
        }
    }

    private onMuteToggle(): void {
        this.toggleMute();
    }

    // === PUBLIC API ===

    /**
     * Play a specific sound effect
     */
    public playEffect(type: SoundEventType, data?: any): void {
        // console.log(`SoundSystem: playEffect called - type: ${type}, muted: ${this.settings.muted}`);
        if (this.settings.muted) return;
        
        switch (type) {
            case 'bubble-shoot':
                this.soundGenerator.generateBubbleShoot();
                break;
            case 'bubble-attach':
                this.soundGenerator.generateBubbleAttach();
                break;
            case 'ui-click':
                this.soundGenerator.generateUIClick();
                break;
            case 'match-found':
                if (data?.matchSize) {
                    this.soundGenerator.generateComboSound(data.matchSize);
                }
                break;
            case 'power-up-activated':
                this.soundGenerator.generatePowerUpActivation();
                break;
            case 'danger-warning':
                this.soundGenerator.generateDangerWarning();
                break;
            case 'victory':
                this.soundGenerator.generateVictoryFanfare();
                break;
            case 'defeat':
                this.soundGenerator.generateDefeatSequence();
                break;
        }
        
        this.trackEvent(type);
    }

    /**
     * Trigger haptic feedback
     */
    public haptic(type: string, data?: any): boolean {
        if (!this.settings.hapticsEnabled) return false;
        
        switch (type) {
            case 'shoot':
                return this.hapticManager.bubbleShoot();
            case 'attach':
                return this.hapticManager.bubbleAttach();
            case 'match':
                return this.hapticManager.matchFound(data?.size || 3);
            case 'victory':
                return this.hapticManager.victory();
            case 'defeat':
                return this.hapticManager.defeat();
            default:
                return this.hapticManager.uiClick();
        }
    }

    // === VOLUME CONTROLS ===

    public setMasterVolume(volume: number): void {
        this.settings.masterVolume = Math.max(0, Math.min(1, volume));
        this.soundGenerator.setVolume(this.settings.masterVolume * this.settings.effectsVolume);
        this.saveSettings();
    }

    public setEffectsVolume(volume: number): void {
        this.settings.effectsVolume = Math.max(0, Math.min(1, volume));
        this.soundGenerator.setVolume(this.settings.masterVolume * this.settings.effectsVolume);
        this.saveSettings();
    }

    public setMusicVolume(volume: number): void {
        this.settings.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.backgroundMusic) {
            this.backgroundMusic.setVolume(this.settings.masterVolume * this.settings.musicVolume);
        }
        this.saveSettings();
    }

    public toggleMute(): boolean {
        this.settings.muted = !this.settings.muted;
        this.soundGenerator.setMuted(this.settings.muted);
        
        // Handle ambient sound
        if (this.settings.muted) {
            this.soundGenerator.stopAmbience();
        } else {
            this.soundGenerator.startAmbience();
        }
        
        this.saveSettings();
        return this.settings.muted;
    }

    public setHapticsEnabled(enabled: boolean): void {
        this.settings.hapticsEnabled = enabled;
        this.hapticManager.setEnabled(enabled);
        this.saveSettings();
    }

    // === GETTERS ===

    public isMuted(): boolean {
        return this.settings.muted;
    }

    public getSettings(): ISoundSystemSettings {
        return { ...this.settings };
    }

    public getSystemInfo(): {
        audioSupported: boolean;
        hapticsSupported: boolean;
        activeVoices: number;
        eventCount: number;
        ambientPlaying: boolean;
    } {
        const soundStats = this.soundGenerator.getStats();
        const hapticStats = this.hapticManager.getStats();
        
        return {
            audioSupported: soundStats.audioContextState !== 'closed',
            hapticsSupported: hapticStats.supported,
            activeVoices: soundStats.activeVoices,
            eventCount: this.eventCount,
            ambientPlaying: soundStats.ambientPlaying
        };
    }

    // === SETTINGS PERSISTENCE ===

    private loadSettings(): void {
        try {
            const stored = localStorage.getItem('bubble-clash-audio-settings');
            if (stored) {
                const settings = JSON.parse(stored);
                this.settings = { ...this.settings, ...settings };
                
                // Apply loaded settings
                this.soundGenerator.setVolume(this.settings.masterVolume * this.settings.effectsVolume);
                this.soundGenerator.setMuted(this.settings.muted);
                this.hapticManager.setEnabled(this.settings.hapticsEnabled);
            }
        } catch (error) {
            console.warn('SoundSystem: Failed to load settings:', error);
        }
    }

    private saveSettings(): void {
        try {
            localStorage.setItem('bubble-clash-audio-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('SoundSystem: Failed to save settings:', error);
        }
    }

    // === UTILITIES ===

    private trackEvent(eventType: string): void {
        this.eventCount++;
        this.lastEventTime = Date.now();
    }

    /**
     * Test all audio functionality
     */
    public testAudio(): void {
        console.log('SoundSystem: Running audio test...');
        
        setTimeout(() => this.playEffect('ui-click'), 0);
        setTimeout(() => this.playEffect('bubble-shoot'), 200);
        setTimeout(() => this.playEffect('bubble-attach'), 400);
        setTimeout(() => this.playEffect('match-found', { matchSize: 4 }), 600);
        setTimeout(() => this.hapticManager.testHaptic(), 800);
        
        console.log('SoundSystem: Audio test sequence started');
    }

    /**
     * Clean up and destroy the sound system
     */
    public destroy(): void {
        // Remove event listeners
        this.scene.events.off('bubble-shoot', this.onBubbleShoot, this);
        this.scene.events.off('match-found', this.onMatchFound, this);
        this.scene.events.off('bubbles-popped', this.onBubblesPopped, this);
        this.scene.events.off('power-up-activated', this.onPowerUpActivated, this);
        this.scene.events.off('victory', this.onVictory, this);
        this.scene.events.off('defeat', this.onDefeat, this);
        // ... remove all other listeners
        
        // Destroy components
        this.soundGenerator.destroy();
        this.hapticManager.destroy();
        this.explosionSystem.destroy();
        
        // Stop background music
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
        }
        
        this.initialized = false;
        console.log('SoundSystem: Destroyed');
    }
}