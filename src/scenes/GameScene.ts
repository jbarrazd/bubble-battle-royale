import { Scene } from 'phaser';
import { SceneKeys, ISceneData, GameEvents } from '@/types/GameTypes';
import { SceneManager } from '@/systems/core/SceneManager';
import { ArenaSystem, AIDifficulty } from '@/systems/gameplay/ArenaSystem';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { SoundSystem } from '@/systems/audio/SoundSystem';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class GameScene extends Scene {
    private sceneManager!: SceneManager;
    private performanceMonitor!: PerformanceMonitor;
    private arenaSystem!: ArenaSystem;
    private soundSystem!: SoundSystem;
    // fpsText removed for clean production UI
    // debugText removed for clean production UI
    // scoreText removed - using player-specific scores
    private isPaused: boolean = false;

    constructor() {
        super({ key: SceneKeys.GAME });
    }

    public preload(): void {
        // Load forest background image v4
        this.load.image('forest-background', 'assets/backgrounds/background_forestv4.png');
        
        // Cannon sprite loading disabled - using procedural graphics
        // this.load.image('cannon', 'assets/sprites/cannon2_transparent.png');
    }

    public init(_data: ISceneData): void {
        console.log('GameScene: Initializing game arena...');
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
            this.soundSystem = new SoundSystem(this);
            console.log('GameScene: Sound system initialized successfully');
        } catch (error) {
            console.error('GameScene: Failed to initialize sound system:', error);
            // Continue without sound system - game should still be playable
        }
    }

    private createBackground(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        console.log(`GameScene: Creating forest background v4`);
        
        // Add the forest background image
        const background = this.add.image(width / 2, height / 2, 'forest-background');
        
        // Scale to cover the entire screen
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale);
        
        // Set depth to be behind everything
        background.setDepth(Z_LAYERS.BACKGROUND);
        
        // Add a subtle dark overlay for better contrast with game elements
        const overlay = this.add.rectangle(
            width / 2, 
            height / 2, 
            width, 
            height, 
            0x000000, 
            0.2  // 20% opacity for subtle darkening
        );
        overlay.setDepth(Z_LAYERS.BACKGROUND + 1);
        
        // Add animated floating particles for extra depth
        this.createBackgroundParticles();
    }
    
    private createBackgroundParticles(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create multiple floating particles
        for (let i = 0; i < 20; i++) {
            const particle = this.add.circle(
                Math.random() * width,
                Math.random() * height,
                Math.random() * 3 + 1,
                0xffffff,
                Math.random() * 0.1 + 0.05
            );
            
            particle.setDepth(Z_LAYERS.BACKGROUND + 1);
            
            // Animate particles floating upward
            this.tweens.add({
                targets: particle,
                y: -10,
                duration: Math.random() * 20000 + 30000,
                repeat: -1,
                onRepeat: () => {
                    particle.x = Math.random() * width;
                    particle.y = height + 10;
                }
            });
            
            // Add subtle horizontal drift
            this.tweens.add({
                targets: particle,
                x: particle.x + (Math.random() * 100 - 50),
                duration: Math.random() * 10000 + 15000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private createArena(): void {
        try {
            console.log('GameScene: Instantiating ArenaSystem...');
            this.arenaSystem = new ArenaSystem(this);
            
            console.log('GameScene: Setting up arena with AI opponent (EASY)...');
            // Setup single player mode with AI difficulty
            this.arenaSystem.setupArena(true, AIDifficulty.EASY);
            
            console.log('GameScene: Arena created successfully with AI opponent');
        } catch (error) {
            console.error('GameScene: Error creating arena:', error);
            throw error;
        }
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
            this.soundSystem?.testAudio();
            
            // Also log sound system state
            const stats = this.soundSystem?.getSystemInfo();
            console.log('Sound System Stats:', stats);
        });
        
        // M key to toggle mute
        this.input.keyboard?.on('keydown-M', () => {
            const muted = this.soundSystem?.toggleMute();
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
            this.showPauseOverlay();
        } else {
            this.physics.resume();
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
        this.arenaSystem?.destroy();
        this.soundSystem?.destroy();
        this.performanceMonitor?.reset();
    }
}