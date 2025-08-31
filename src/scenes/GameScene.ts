import { Scene } from 'phaser';
import { SceneKeys, ISceneData, GameEvents } from '@/types/GameTypes';
import { SceneManager } from '@/systems/core/SceneManager';
import { ArenaSystem, AIDifficulty } from '@/systems/gameplay/ArenaSystem';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { PremiumBubbleSound } from '@/systems/audio/PremiumBubbleSound';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class GameScene extends Scene {
    private sceneManager!: SceneManager;
    private performanceMonitor!: PerformanceMonitor;
    private arenaSystem!: ArenaSystem;
    private soundSystem!: PremiumBubbleSound;
    private backgroundMusic: Phaser.Sound.BaseSound | undefined;
    // fpsText removed for clean production UI
    // debugText removed for clean production UI
    // scoreText removed - using player-specific scores
    private isPaused: boolean = false;

    constructor() {
        super({ key: SceneKeys.GAME });
    }

    public preload(): void {
        // Load forest background v4
        this.load.image('forest-background', 'assets/backgrounds/background_forestv4.png');
        
        // Cannon sprite loading disabled - using procedural graphics
        // this.load.image('cannon', 'assets/sprites/cannon2_transparent.png');
        
        // Load background music
        // Note: Place background_music.mp3 in public/assets/audio/
        this.load.audio('background-music', 'assets/audio/background_music.mp3');
    }

    public init(_data: ISceneData): void {
        console.log('GameScene: Initializing game arena...');
        
        // Clean up any existing background music before reinitializing
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = undefined;
        }
        
        this.sceneManager = SceneManager.getInstance();
        this.sceneManager.setCurrentScene(SceneKeys.GAME);
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceMonitor.setEventEmitter(this.game.events);
        this.isPaused = false;
    }

    public create(): void {
        try {
            // Set a visible background color first
            this.cameras.main.setBackgroundColor('#3498db');
            
            console.log('GameScene: Creating background...');
            this.createBackground();
            
            console.log('GameScene: Initializing sound system...');
            this.createSoundSystem();
            
            console.log('GameScene: Starting background music...');
            this.createBackgroundMusic();
            
            console.log('GameScene: Creating arena...');
            this.createArena();
            
            console.log('GameScene: Creating UI...');
            this.createUI();
            
            console.log('GameScene: Setting up input handlers...');
            this.setupInputHandlers();
            
            // Emit arena ready event
            this.game.events.emit(GameEvents.SCENE_READY, {
                scene: SceneKeys.GAME
            });
            
            console.log('GameScene: Arena setup complete');
        } catch (error) {
            console.error('GameScene: Error during creation:', error);
        }
    }

    private createSoundSystem(): void {
        try {
            this.soundSystem = new PremiumBubbleSound(this);
            console.log('GameScene: Sound system initialized successfully');
        } catch (error) {
            console.error('GameScene: Failed to initialize sound system:', error);
            // Continue without sound system - game should still be playable
        }
    }
    
    private createBackgroundMusic(): void {
        try {
            // Stop any existing background music first to prevent overlapping
            if (this.backgroundMusic) {
                this.backgroundMusic.stop();
                this.backgroundMusic.destroy();
                this.backgroundMusic = undefined;
            }
            
            // Check if the audio file was loaded successfully
            if (this.cache.audio.exists('background-music')) {
                this.backgroundMusic = this.sound.add('background-music', {
                    loop: true,
                    volume: 0.3  // Lower volume so it doesn't overpower sound effects
                });
                
                // Start playing the background music
                this.backgroundMusic.play();
                console.log('GameScene: Background music started');
            } else {
                console.log('GameScene: Background music not found, continuing without it');
            }
        } catch (error) {
            console.error('GameScene: Failed to start background music:', error);
            // Continue without background music
        }
    }

    private createBackground(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        console.log(`GameScene: Creating forest background v4`);
        
        // Use the forest background v4 image
        const bg = this.add.image(width / 2, height / 2, 'forest-background');
        
        // Scale to cover the screen
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
        
        bg.setDepth(Z_LAYERS.BACKGROUND);
    }

    private createArena(): void {
        try {
            console.log('GameScene: Instantiating ArenaSystem...');
            this.arenaSystem = new ArenaSystem(this);
            
            console.log('GameScene: Setting up arena with AI opponent (EASY)...');
            // Setup single player mode with AI difficulty
            this.arenaSystem.setupArena(true, AIDifficulty.EASY);
            
            // Connect sound system to game events
            this.setupSoundEvents();
            
            console.log('GameScene: Arena created successfully with AI opponent');
        } catch (error) {
            console.error('GameScene: Error creating arena:', error);
            throw error;
        }
    }
    
    private setupSoundEvents(): void {
        if (!this.soundSystem) return;
        
        // Bubble shoot event
        this.events.on('bubble-shoot', () => {
            this.soundSystem.playShootSound();
        });
        
        // Bubble attach event
        this.events.on('bubble-attached', () => {
            this.soundSystem.playAttachSound();
        });
        
        // Match found event
        this.events.on('match-found', (data: any) => {
            if (data && data.matchSize) {
                this.soundSystem.playMatchSound(data.matchSize);
            }
        });
        
        // Power-up activated event
        this.events.on('power-up-activated', () => {
            this.soundSystem.playPowerUpSound();
        });
        
        // UI click event
        this.events.on('ui-click', () => {
            this.soundSystem.playClickSound();
        });
        
        // Victory event
        this.events.on('victory', () => {
            this.soundSystem.playVictorySound();
        });
        
        // Defeat event
        this.events.on('defeat', () => {
            this.soundSystem.playDefeatSound();
        });
        
        console.log('GameScene: Sound events connected');
    }

    private createUI(): void {
        // FPS Display removed for clean production UI
        
        // Debug text removed for clean production UI
        
        // Pause button removed for cleaner UI
        
        // Central score display removed - using player-specific scores only
        
        // Score events are now handled by EnhancedScoreDisplay in ArenaSystem
        
        // Listen for score events (for combo indicator only)
        this.game.events.on('match-completed', (data: any) => {
            
            // Combo indicator
            if (data.combo > 0) {
                const comboText = this.add.text(
                    this.cameras.main.width / 2,
                    90,
                    `COMBO x${data.combo + 1}!`,
                    {
                        fontFamily: 'Arial',
                        fontSize: '20px',
                        fontStyle: 'bold',
                        color: '#FF6B6B',
                        stroke: '#000000',
                        strokeThickness: 2
                    }
                ).setOrigin(0.5);
                comboText.setDepth(Z_LAYERS.UI);
                
                // Animate combo text
                this.tweens.add({
                    targets: comboText,
                    scale: 1.5,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => comboText.destroy()
                });
            }
        });
    }

    private setupInputHandlers(): void {
        // ESC key to return to menu
        this.input.keyboard?.on('keydown-ESC', () => {
            this.returnToMenu();
        });
        
        // P key to pause
        this.input.keyboard?.on('keydown-P', () => {
            this.togglePause();
        });
        
        // Space key for testing (placeholder for shooting)
        this.input.keyboard?.on('keydown-SPACE', () => {
            console.log('Space pressed - shooting not yet implemented');
            this.testBubblePop();
        });
        
        // T key to test audio system
        this.input.keyboard?.on('keydown-T', () => {
            console.log('Testing audio system...');
            this.soundSystem?.testAllSounds();
            
            // Also log sound system state
            const stats = this.soundSystem?.getInfo();
            console.log('Sound System Stats:', stats);
        });
        
        // M key to toggle mute
        this.input.keyboard?.on('keydown-M', () => {
            const muted = this.soundSystem?.toggleMute();
            
            // Also mute/unmute background music
            if (this.backgroundMusic) {
                if (muted) {
                    this.backgroundMusic.pause();
                } else {
                    this.backgroundMusic.resume();
                }
            }
            
            console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
        });
        
    }

    private testBubblePop(): void {
        // Test bubble popping animation
        const bubbles = this.arenaSystem.getBubbles();
        if (bubbles.length > 0) {
            const randomBubble = bubbles[Math.floor(Math.random() * bubbles.length)];
            if (randomBubble) {
                randomBubble.pop();
            }
        }
    }

    private togglePause(): void {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.physics.pause();
            this.backgroundMusic?.pause();
            this.showPauseOverlay();
        } else {
            this.physics.resume();
            this.backgroundMusic?.resume();
            this.hidePauseOverlay();
        }
    }

    private showPauseOverlay(): void {
        const overlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );
        overlay.setDepth(Z_LAYERS.UI + 10);
        overlay.setData('isPauseOverlay', true);
        
        const pauseText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'PAUSED',
            {
                fontFamily: 'Arial',
                fontSize: '48px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        pauseText.setDepth(Z_LAYERS.UI + 11);
        pauseText.setData('isPauseOverlay', true);
        
        const resumeText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 60,
            'Press P to Resume',
            {
                fontFamily: 'Arial',
                fontSize: '20px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);
        resumeText.setDepth(Z_LAYERS.UI + 11);
        resumeText.setData('isPauseOverlay', true);
    }

    private hidePauseOverlay(): void {
        this.children.list.forEach(child => {
            if (child.getData('isPauseOverlay')) {
                child.destroy();
            }
        });
    }

    private returnToMenu(): void {
        // Properly cleanup background music
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = undefined;
        }
        
        this.arenaSystem?.destroy();
        this.soundSystem?.destroy();
        this.sceneManager.transitionTo(SceneKeys.MENU);
    }

    public override update(time: number, delta: number): void {
        if (this.isPaused) return;
        
        // FPS display update removed
        
        // Update arena system
        this.arenaSystem?.update(time, delta);
        
        // Debug info update removed
    }

    public shutdown(): void {
        // Properly cleanup background music
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = undefined;
        }
        
        this.arenaSystem?.destroy();
        this.soundSystem?.destroy();
        this.performanceMonitor?.reset();
    }
}