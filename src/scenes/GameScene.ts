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
        
        console.log(`GameScene: Creating animated background`);
        
        // Create gradient background
        const graphics = this.add.graphics();
        
        // Draw gradient from top to bottom
        const gradientColors = [
            { pos: 0, color: 0x0a0e27 },     // Very dark blue at top
            { pos: 0.3, color: 0x1a1a3e },   // Dark purple-blue
            { pos: 0.6, color: 0x16213e },   // Deep blue
            { pos: 1, color: 0x0f1b2e }      // Dark blue-gray at bottom
        ];
        
        // Create gradient effect
        for (let i = 0; i < height; i++) {
            const ratio = i / height;
            let color = 0x0a0e27; // default
            
            // Find the appropriate color based on position
            for (let j = 0; j < gradientColors.length - 1; j++) {
                if (ratio >= gradientColors[j].pos && ratio <= gradientColors[j + 1].pos) {
                    const localRatio = (ratio - gradientColors[j].pos) / 
                                     (gradientColors[j + 1].pos - gradientColors[j].pos);
                    color = Phaser.Display.Color.Interpolate.ColorWithColor(
                        Phaser.Display.Color.IntegerToColor(gradientColors[j].color),
                        Phaser.Display.Color.IntegerToColor(gradientColors[j + 1].color),
                        1,
                        localRatio
                    );
                    color = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
                    break;
                }
            }
            
            graphics.fillStyle(color, 1);
            graphics.fillRect(0, i, width, 1);
        }
        
        graphics.setDepth(Z_LAYERS.BACKGROUND);
        
        // Add animated floating particles for depth
        this.createBackgroundParticles();
        
        // Add subtle animated light rays
        this.createLightRays();
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
    
    private createLightRays(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create subtle light rays from top
        for (let i = 0; i < 3; i++) {
            const rayGraphics = this.add.graphics();
            rayGraphics.setDepth(Z_LAYERS.BACKGROUND + 1);
            
            const startX = width * (0.2 + i * 0.3);
            const endX = startX + (Math.random() * 200 - 100);
            
            // Draw light ray with gradient
            rayGraphics.fillGradientStyle(
                0x4a69bd, 0x4a69bd, 0x4a69bd, 0x4a69bd,
                0.0, 0.02, 0.02, 0.0
            );
            
            rayGraphics.fillTriangle(
                startX - 20, 0,
                startX + 20, 0,
                endX, height
            );
            
            // Animate opacity for pulsing effect
            this.tweens.add({
                targets: rayGraphics,
                alpha: 0.03,
                duration: Math.random() * 3000 + 4000,
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