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
        
        console.log(`GameScene: Camera dimensions: ${width}x${height}`);
        
        // Try to load the forest background image
        if (this.textures.exists('forest-background')) {
            // Create forest background image
            const forestBg = this.add.image(
                width / 2,
                height / 2,
                'forest-background'
            );
            
            // Scale to cover the entire screen
            const scaleX = width / forestBg.width;
            const scaleY = height / forestBg.height;
            const scale = Math.max(scaleX, scaleY);
            forestBg.setScale(scale);
            
            // Set to background layer
            forestBg.setDepth(Z_LAYERS.BACKGROUND);
            
            // Optional: Add slight transparency if image is too bright
            // forestBg.setAlpha(0.9);
            
            console.log('GameScene: Forest background v4 loaded successfully');
        } else {
            // Fallback to procedural background if image not found
            console.log('GameScene: Forest background not found, using procedural background');
            
            // Create a simple visible background
            const bg = this.add.rectangle(
                width / 2,
                height / 2,
                width,
                height,
                0x2c3e50
            );
            bg.setDepth(Z_LAYERS.BACKGROUND);
            
            // Add some visual elements to verify rendering
            const graphics = this.add.graphics();
            graphics.setDepth(Z_LAYERS.BACKGROUND + 1);
            
            // Create gradient effect
            const lighterColor = 0x34495e;
            
            // Create lighter center band for objective zone
            const objectiveZone = this.cameras.main.centerY;
            const gradientHeight = height * 0.3; // 30% of screen height
            
            // Top gradient (fading from top to center)
            for (let i = 0; i < 10; i++) {
                const alpha = 0.05 * (1 - i / 10);
                const y = objectiveZone - gradientHeight/2 + (i * gradientHeight/20);
                graphics.fillStyle(lighterColor, alpha);
                graphics.fillRect(0, y, width, gradientHeight/20);
            }
            
            // Center band
            graphics.fillStyle(lighterColor, 0.3);
            graphics.fillRect(0, objectiveZone - gradientHeight/2, width, gradientHeight);
            
            // Bottom gradient (fading from center to bottom)
            for (let i = 0; i < 10; i++) {
                const alpha = 0.05 * (1 - i / 10);
                const y = objectiveZone + gradientHeight/2 - (i * gradientHeight/20);
                graphics.fillStyle(lighterColor, alpha);
                graphics.fillRect(0, y, width, gradientHeight/20);
            }
            
            // Add subtle pattern
            for (let i = 0; i < 20; i++) {
                const x = Phaser.Math.Between(0, width);
                const y = Phaser.Math.Between(0, height);
                const radius = Phaser.Math.Between(20, 40);
                
                graphics.fillStyle(0xffffff, 0.02);
                graphics.fillCircle(x, y, radius);
            }
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