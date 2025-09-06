import { Scene } from 'phaser';
import { SceneKeys, ISceneData, GameEvents } from '@/types/GameTypes';
import { SceneManager } from '@/systems/core/SceneManager';
import { ArenaCoordinator } from '@/coordinators/ArenaCoordinator';
import { AIDifficulty } from '@/systems/gameplay/AIOpponentSystem';
import { PerformanceMonitor } from '@/utils/PerformanceMonitor';
import { OptimizationMonitor, getOptimizationStats } from '@/optimization';
import { RealSoundSystem } from '@/systems/audio/RealSoundSystem';
import { Z_LAYERS } from '@/config/ArenaConfig';
import { TweenOptimizer } from '@/systems/visual/TweenOptimizer';
import { BackgroundSystem } from '@/systems/visual/BackgroundSystem';

export class GameScene extends Scene {
    private sceneManager!: SceneManager;
    private performanceMonitor!: PerformanceMonitor;
    private optimizationMonitor?: OptimizationMonitor;
    private arenaCoordinator!: ArenaCoordinator;
    private soundSystem!: RealSoundSystem;
    private backgroundSystem!: BackgroundSystem;
    private backgroundMusic?: Phaser.Sound.BaseSound;
    private fpsText!: Phaser.GameObjects.Text;
    private frameCount: number = 0;
    private lastFPSUpdate: number = 0;
    // debugText removed for clean production UI
    // scoreText removed - using player-specific scores
    private isPaused: boolean = false;
    private tweenOptimizer!: TweenOptimizer;

    constructor() {
        super({ key: SceneKeys.GAME });
    }

    public preload(): void {
        // Load background music with error handling
        if (!this.cache.audio.exists('background-music')) {
            this.load.audio('background-music', 'assets/audio/background_music.mp3');
            
            // Add load error handler
            this.load.on('loaderror', (file: any) => {
                if (file.key === 'background-music') {
                    console.warn('GameScene: Failed to load background music, continuing without it');
                }
            });
        }
    }

    public init(data: ISceneData): void {
        
        
        // Store theme selection if provided
        if (data && (data as any).theme) {
            this.registry.set('gameTheme', (data as any).theme);
        }
        
        // Set isCapacitor flag in registry for global access
        const isCapacitor = !!(window as any).Capacitor;
        this.game.registry.set('isCapacitor', isCapacitor);
        
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
            
            // Initialize TweenOptimizer for performance
            this.tweenOptimizer = new TweenOptimizer(this);
            
            this.createBackground();
            
            this.createSoundSystem();
            
            this.createBackgroundMusic();
            
            this.createArena();
            
            // Initialize optimization monitor
            this.optimizationMonitor = new OptimizationMonitor(this);
            
            this.createUI();
            
            this.setupInputHandlers();
            
            // Emit arena ready event
            this.game.events.emit(GameEvents.SCENE_READY, {
                scene: SceneKeys.GAME
            });
            
        } catch (error) {
            console.error('GameScene: Error during creation:', error);
        }
    }

    private createSoundSystem(): void {
        try {
            this.soundSystem = new RealSoundSystem(this);
        } catch (error) {
            console.error('GameScene: Failed to initialize sound system:', error);
            // Continue without sound system - game should still be playable
        }
    }
    
    private createBackgroundMusic(): void {
        try {
            // Stop any existing background music first
            if (this.backgroundMusic) {
                this.backgroundMusic.stop();
                this.backgroundMusic.destroy();
                this.backgroundMusic = undefined;
            }
            
            // Check if audio is already loaded
            if (this.cache.audio.exists('background-music')) {
                this.backgroundMusic = this.sound.add('background-music', {
                    volume: 0.3,
                    loop: true
                });
                
                // Handle locked audio context (browser requirement)
                if (this.sound.locked) {
                    console.log('GameScene: Audio context locked, waiting for user interaction');
                    
                    // Add visual indicator that audio is locked
                    const unlockText = this.add.text(
                        this.cameras.main.centerX,
                        50,
                        'Click to enable sound',
                        {
                            fontSize: '16px',
                            color: '#ffffff',
                            backgroundColor: '#000000',
                            padding: { x: 10, y: 5 }
                        }
                    ).setOrigin(0.5).setDepth(10000);
                    
                    // Listen for unlock
                    this.sound.once('unlocked', () => {
                        console.log('GameScene: Audio unlocked, starting background music');
                        unlockText.destroy();
                        this.backgroundMusic?.play();
                    });
                    
                    // Also try to unlock on first click
                    this.input.once('pointerdown', () => {
                        if (this.sound.locked) {
                            this.sound.unlock();
                        }
                    });
                } else {
                    console.log('GameScene: Starting background music immediately');
                    this.backgroundMusic.play();
                }
            } else {
                console.warn('GameScene: Background music not loaded, skipping');
            }
        } catch (error) {
            console.error('GameScene: Failed to create background music:', error);
        }
    }
    

    private createBackground(): void {
        // Detect device performance for quality settings
        const isCapacitor = this.registry.get('isCapacitor');
        const quality = isCapacitor ? 'medium' : 'high'; // Lower quality on mobile for performance
        
        // Get selected theme or default to ocean
        const selectedTheme = this.registry.get('gameTheme') || this.registry.get('selectedTheme') || 'ocean';
        
        // Create the new advanced background system
        this.backgroundSystem = new BackgroundSystem(this, {
            theme: selectedTheme as any,
            quality: quality,
            enableParticles: true,
            enableAnimation: true
        });
        
        console.log(`GameScene: Created advanced background system with ${selectedTheme} theme and ${quality} quality`);
    }
    
    // Old methods commented out - replaced by BackgroundSystem
    /*
    private createGeometricPattern(width: number, height: number): void {
        const patternGraphics = this.add.graphics();
        
        // Create subtle hexagonal pattern
        const hexSize = 40;
        const hexColor = 0x1e3a5f;
        const hexAlpha = 0.1;
        
        patternGraphics.lineStyle(1, hexColor, hexAlpha);
        
        // Draw hexagonal grid pattern
        const hexWidth = hexSize * Math.sqrt(3);
        const hexHeight = hexSize * 2;
        const vertSpacing = hexHeight * 0.75;
        
        for (let row = 0; row < Math.ceil(height / vertSpacing) + 2; row++) {
            for (let col = 0; col < Math.ceil(width / hexWidth) + 2; col++) {
                const x = col * hexWidth + (row % 2) * (hexWidth / 2) - hexWidth;
                const y = row * vertSpacing - vertSpacing;
                
                if (x < width + hexSize && y < height + hexSize) {
                    this.drawHexagon(patternGraphics, x, y, hexSize);
                }
            }
        }
        
        patternGraphics.setDepth(Z_LAYERS.BACKGROUND + 1);
    }
    
    private drawHexagon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
        const points: number[] = [];
        
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            points.push(x + size * Math.cos(angle));
            points.push(y + size * Math.sin(angle));
        }
        
        graphics.strokePoints(points, true);
    }
    
    private createAmbientParticles(width: number, height: number): void {
        // Create subtle floating particles for atmosphere
        const particleCount = Math.min(25, Math.floor((width * height) / 15000));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.add.graphics();
            const size = Phaser.Math.Between(1, 3);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
            const color = Phaser.Math.RND.pick([0x2a4d6b, 0x3e6b8a, 0x4a7ba7]);
            
            particle.fillStyle(color, alpha);
            particle.fillCircle(0, 0, size);
            
            // Random starting position
            const startX = Phaser.Math.Between(-50, width + 50);
            const startY = Phaser.Math.Between(-50, height + 50);
            particle.setPosition(startX, startY);
            particle.setDepth(Z_LAYERS.BACKGROUND + 2);
            
            // Gentle floating animation
            const duration = Phaser.Math.Between(8000, 15000);
            const endX = startX + Phaser.Math.Between(-100, 100);
            const endY = startY + Phaser.Math.Between(-100, 100);
            
            this.tweens.add({
                targets: particle,
                x: endX,
                y: endY,
                alpha: { from: alpha, to: 0 },
                duration: duration,
                ease: 'Sine.easeInOut',
                repeat: -1,
                yoyo: true,
                onRepeat: () => {
                    // Randomize position on repeat for variety
                    particle.setPosition(
                        Phaser.Math.Between(-50, width + 50),
                        Phaser.Math.Between(-50, height + 50)
                    );
                }
            });
        }
    }
    */

    private createArena(): void {
        try {
            console.log('GameScene: Creating ArenaCoordinator...');
            this.arenaCoordinator = new ArenaCoordinator(this);
            
            console.log('GameScene: Initializing arena with AI opponent (HARD)...');
            this.arenaCoordinator.initialize(true, AIDifficulty.HARD);
            
            // Setup combo events to pause spawning
            this.setupRowSpawnEvents();
            
            // Connect sound system to game events
            this.setupSoundEvents();
            
            console.log('GameScene: Arena created successfully with AI opponent');
        } catch (error) {
            console.error('GameScene: Error creating arena:', error);
            throw error;
        }
    }
    
    private setupRowSpawnEvents(): void {
        // Row spawn events are now handled internally by ArenaCoordinator
        // This method is kept for potential future use
    }
    
    private setupSoundEvents(): void {
        if (!this.soundSystem) return;
        
        // Bubble shoot event
        this.events.on('bubble-shoot', () => {
            this.soundSystem.playShootSound();
        });
        
        // Bubble attach event (for game logic)
        this.events.on('bubble-attached', () => {
            // Game logic handled elsewhere
        });
        
        // Bubble attach collision event (plays at exact collision moment)
        this.events.on('bubble-attach-collision', () => {
            this.soundSystem.playAttachSound();
        });
        
        // Bubble attach sound event (backup for other attach cases)
        this.events.on('bubble-attached-sound', () => {
            // Already played on collision
        });
        
        // Match found event - play combo sounds
        this.events.on('match-found', (data: any) => {
            // Play real MP3 combo sounds based on match size
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
        
        // Floating bubbles drop event
        this.events.on('floating-bubbles-drop', () => {
            this.soundSystem.playBubblesDropSound();
        });
        
        // Mystery box collected event
        this.events.on('mystery-box-collected', () => {
            this.soundSystem.playSuccessObjectiveSound();
        });
        
        // Objective hit event (when hitting the treasure chest)
        this.events.on('objective-hit', () => {
            this.soundSystem.playSuccessObjectiveSound();
        });
        
        console.log('GameScene: Sound events connected');
    }

    private createFPSDisplay(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // Create FPS text in bottom right corner - more visible on mobile
        this.fpsText = this.add.text(width - 100, height - 100, 'FPS: 0', {
            fontSize: '20px',
            color: '#00FF00',
            fontFamily: 'Arial, sans-serif',
            fontStyle: 'bold',
            backgroundColor: '#000000CC',
            padding: { x: 10, y: 6 }
        });
        
        this.fpsText.setDepth(Z_LAYERS.UI + 1000); // Make sure it's on top
        this.fpsText.setScrollFactor(0);
        this.fpsText.setOrigin(0.5, 0.5);
        
        // Initialize FPS tracking
        this.frameCount = 0;
        this.lastFPSUpdate = performance.now();
    }

    private createUI(): void {
        // Add FPS counter in bottom right corner
        this.createFPSDisplay();
        
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
            if (this.backgroundMusic) {
                if (muted) {
                    this.backgroundMusic.pause();
                } else {
                    this.backgroundMusic.resume();
                }
            }
            console.log(`Audio ${muted ? 'muted' : 'unmuted'}`);
        });
        
        // O key to test UFO delivery animation
        this.input.keyboard?.on('keydown-O', () => {
            console.log('Testing UFO delivery animation...');
            
            // Get center position for the UFO animation
            const centerX = this.cameras.main.centerX;
            const centerY = this.cameras.main.centerY;
            
            // Trigger the UFO delivery animation
            if (this.arenaCoordinator) {
                // Call the UFO delivery method directly for testing
                // TODO: Implement UFO delivery in ArenaCoordinator if needed
                console.log('UFO delivery test - not yet implemented in ArenaCoordinator');
            }
        });
        
        // L key to log optimization stats
        this.input.keyboard?.on('keydown-L', () => {
            if (this.optimizationMonitor) {
                this.optimizationMonitor.logReport();
            }
            const stats = getOptimizationStats();
        });
        
        // Number keys 5-9 to change background themes (for testing)
        if (!this.registry.get('isCapacitor')) { // Only on desktop for testing
            this.input.keyboard?.on('keydown-FIVE', () => {
                this.backgroundSystem?.setTheme('ocean');
                console.log('Background theme: Ocean');
            });
            
            this.input.keyboard?.on('keydown-SIX', () => {
                this.backgroundSystem?.setTheme('sunset');
                console.log('Background theme: Sunset');
            });
            
            this.input.keyboard?.on('keydown-SEVEN', () => {
                this.backgroundSystem?.setTheme('forest');
                console.log('Background theme: Forest');
            });
            
            this.input.keyboard?.on('keydown-EIGHT', () => {
                this.backgroundSystem?.setTheme('space');
                console.log('Background theme: Space');
            });
            
            this.input.keyboard?.on('keydown-NINE', () => {
                this.backgroundSystem?.setTheme('aurora');
                console.log('Background theme: Aurora');
            });
            
            this.input.keyboard?.on('keydown-ZERO', () => {
                this.backgroundSystem?.setTheme('ocean_depths');
                console.log('Background theme: Ocean Depths');
            });
        }
    }

    private testBubblePop(): void {
        // Test bubble popping animation
        const bubbles = this.arenaCoordinator?.getAllBubbles() || [];
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
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = undefined;
        }
        this.arenaCoordinator?.cleanup();
        this.soundSystem?.destroy();
        this.sceneManager.transitionTo(SceneKeys.MENU);
    }

    public override update(time: number, delta: number): void {
        if (this.isPaused) return;
        
        // Update FPS counter
        this.updateFPSDisplay();
        
        // Update arena coordinator - continue updating even after game ends
        // This is necessary for UI interactions and animations
        this.arenaCoordinator?.update(time, delta);
        
        // Record optimization metrics every frame
        if (this.optimizationMonitor) {
            this.optimizationMonitor.recordMetrics();
            
            // Log performance report every 5 seconds
            if (Math.floor(time / 5000) !== Math.floor((time - delta) / 5000)) {
                // Performance stats calculation removed
            }
        }
    }
    
    private updateFPSDisplay(): void {
        if (!this.fpsText) return;
        
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFPSUpdate;
        
        // Update FPS every 1000ms to reduce overhead when targeting 120 FPS
        if (elapsed >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / elapsed);
            
            // Safety check before updating text
            if (this.fpsText && this.fpsText.active) {
                this.fpsText.setText(`FPS: ${fps}`);
                
                // Color code based on performance
                if (fps >= 100) {
                    this.fpsText.setColor('#00FF00'); // Green for excellent
                } else if (fps >= 60) {
                    this.fpsText.setColor('#FFFF00'); // Yellow for good  
                } else if (fps >= 30) {
                    this.fpsText.setColor('#FFA500'); // Orange for okay
                } else {
                    this.fpsText.setColor('#FF0000'); // Red for poor
                }
            }
            
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
    }
    
    public shutdown(): void {
        // Stop and cleanup background music
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
            this.backgroundMusic.destroy();
            this.backgroundMusic = undefined;
        }
        
        // Clean up systems
        this.arenaCoordinator?.cleanup();
        this.arenaCoordinator = undefined as any; // Clear reference
        this.soundSystem?.destroy();
        this.soundSystem = undefined;
        this.backgroundSystem?.destroy();
        this.backgroundSystem = undefined;
        this.performanceMonitor?.reset();
        
        // Clear FPS text reference
        this.fpsText = undefined;
    }
}