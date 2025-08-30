import { Scene } from 'phaser';
import { SceneKeys, ISceneData, GameEvents } from '@/types/GameTypes';
import { SceneManager } from '@/systems/core/SceneManager';
import { ArenaSystem, AIDifficulty } from '@/systems/gameplay/ArenaSystem';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class GameScene extends Scene {
    private sceneManager!: SceneManager;
    private performanceMonitor!: PerformanceMonitor;
    private arenaSystem!: ArenaSystem;
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

    private createBackground(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        console.log(`GameScene: Creating flat background for UI refinement`);
        
        // TEMPORARY: Using flat background to focus on UI refinement
        // Will add proper background later
        {
            
            // Create a simple flat background for UI refinement
            const bg = this.add.rectangle(
                width / 2,
                height / 2,
                width,
                height,
                0x1a1a2e  // Dark blue-gray for better UI contrast
            );
            bg.setDepth(Z_LAYERS.BACKGROUND);
            
            // That's it - clean flat background to focus on UI
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
        this.performanceMonitor?.reset();
    }
}