import { Scene } from 'phaser';
import { SceneKeys, ISceneData, GameEvents } from '@/types/GameTypes';
import { SceneManager } from '@/systems/core/SceneManager';
import { ArenaSystem } from '@/systems/gameplay/ArenaSystem';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class GameScene extends Scene {
    private sceneManager!: SceneManager;
    private performanceMonitor!: PerformanceMonitor;
    private arenaSystem!: ArenaSystem;
    private fpsText!: Phaser.GameObjects.Text;
    private debugText!: Phaser.GameObjects.Text;
    private isPaused: boolean = false;

    constructor() {
        super({ key: SceneKeys.GAME });
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
        const baseColor = 0x2c3e50;
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

    private createArena(): void {
        try {
            console.log('GameScene: Instantiating ArenaSystem...');
            this.arenaSystem = new ArenaSystem(this);
            
            console.log('GameScene: Setting up arena...');
            this.arenaSystem.setupArena();
            
            console.log('GameScene: Arena created successfully');
        } catch (error) {
            console.error('GameScene: Error creating arena:', error);
            throw error;
        }
    }

    private createUI(): void {
        // FPS Display
        this.fpsText = this.add.text(
            this.cameras.main.width - 10,
            10,
            'FPS: 60',
            {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#00ff00'
            }
        ).setOrigin(1, 0);
        this.fpsText.setDepth(Z_LAYERS.UI);
        
        // Debug info
        this.debugText = this.add.text(
            10,
            10,
            'Press D for Debug\nPress ESC for Menu',
            {
                fontFamily: 'Arial',
                fontSize: '12px',
                color: '#ffffff'
            }
        );
        this.debugText.setDepth(Z_LAYERS.UI);
        
        // Pause button
        const pauseButton = this.add.text(
            this.cameras.main.width / 2,
            30,
            '⏸ PAUSE',
            {
                fontFamily: 'Arial',
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
        
        pauseButton.setInteractive({ useHandCursor: true });
        pauseButton.on('pointerdown', () => this.togglePause());
        pauseButton.setDepth(Z_LAYERS.UI);
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
        
        // Update FPS display once per second
        if (this.fpsText && this.time.now % 1000 < 16) {
            const fps = Math.round(this.game.loop.actualFps);
            this.fpsText.setText(`FPS: ${fps}`);
            
            if (fps < 30) {
                this.fpsText.setTint(0xff0000);
            } else if (fps < 50) {
                this.fpsText.setTint(0xffff00);
            } else {
                this.fpsText.setTint(0x00ff00);
            }
        }
        
        // Update arena system
        this.arenaSystem?.update(time, delta);
        
        // Update debug info
        if (this.debugText) {
            const bubbleCount = this.arenaSystem?.getBubbles().length || 0;
            this.debugText.setText(
                `Press D for Debug\nPress ESC for Menu\nBubbles: ${bubbleCount}`
            );
        }
    }

    public shutdown(): void {
        this.arenaSystem?.destroy();
        this.performanceMonitor?.reset();
    }
}