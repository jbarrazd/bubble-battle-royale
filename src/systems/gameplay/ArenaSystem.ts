import { Scene } from 'phaser';
import { IArenaConfig, IZoneBounds, ArenaZone, IHexPosition, BubbleColor } from '@/types/ArenaTypes';
import { ARENA_CONFIG, BUBBLE_CONFIG, GRID_CONFIG, ZONE_COLORS, Z_LAYERS, DANGER_ZONE_CONFIG } from '@/config/ArenaConfig';
import { BubbleGrid } from './BubbleGrid';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleTextureCache } from '@/systems/rendering/BubbleTextureCache';
import { MysteryBubble } from '@/gameObjects/MysteryBubble';
import { Launcher } from '@/gameObjects/Launcher';
import { Objective } from '@/gameObjects/Objective';
// import { SpaceObjective } from '@/gameObjects/SpaceObjective'; // Not needed anymore
import { InputManager } from '@/systems/input/InputManager';
import { ShootingSystem } from './ShootingSystem';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { MatchDetectionSystem } from './MatchDetectionSystem';
import { AIOpponentSystem, AIDifficulty } from './AIOpponentSystem';
import { EnhancedScoreDisplay } from '@/ui/EnhancedScoreDisplay';
import { ComboManager } from './ComboManager';
import { VictoryScreen } from '@/ui/VictoryScreen';
import { DefeatScreen } from '@/ui/DefeatScreen';
import { ScoreEventManager, ScoreEventType, ScoreContext } from '@/systems/scoring/ScoreEventManager';
import { UnifiedFeedbackSystem } from '@/systems/scoring/UnifiedFeedbackSystem';
import { PowerUpInventoryUI } from '@/ui/PowerUpInventoryUI';
import { PowerUpActivationSystem } from '@/systems/powerups/PowerUpActivationSystem';
import { AimingModeSystem } from '@/systems/powerups/AimingModeSystem';
import { PaintSplatterSystem } from '@/systems/visual/PaintSplatterSystem';
import { SpaceArenaParticles } from '@/systems/visual/SpaceArenaParticles';
import { OceanArenaParticles } from '@/systems/visual/OceanArenaParticles';
// import { GemSpawnSystem } from './GemSpawnSystem'; // Not used - gems are now inside bubbles
import { GemCollectionSystem } from './GemCollectionSystem';
import { GemCounterUI } from '@/ui/GemCounterUI';

export { AIDifficulty };

export class ArenaSystem {
    // Static variable to persist difficulty between restarts
    private static currentDifficulty: AIDifficulty = AIDifficulty.HARD;
    
    private scene: Scene;
    private config: IArenaConfig;
    public bubbleGrid: BubbleGrid;
    private objective!: Objective;
    private playerLauncher!: Launcher;
    private opponentLauncher!: Launcher;
    private bubbles: Bubble[] = [];
    private bubblePool: Bubble[] = [];
    private textureCache: BubbleTextureCache;
    private useOptimizedBubbles: boolean = true;
    private zones: Map<ArenaZone, IZoneBounds> = new Map();
    private debugGraphics?: Phaser.GameObjects.Graphics;
    private debugEnabled: boolean = false;
    private inputManager: InputManager;
    private shootingSystem?: ShootingSystem;
    public gridAttachmentSystem: GridAttachmentSystem;
    private matchDetectionSystem: MatchDetectionSystem;
    private aiOpponent?: AIOpponentSystem;
    private isSinglePlayer: boolean = true;
    private enhancedScoreDisplay?: EnhancedScoreDisplay;
    private comboManager?: ComboManager;
    private scoreEventManager?: ScoreEventManager;
    private unifiedFeedbackSystem?: UnifiedFeedbackSystem;
    private playerPowerUpInventory?: PowerUpInventoryUI;
    private opponentPowerUpInventory?: PowerUpInventoryUI;
    private powerUpActivation?: PowerUpActivationSystem;
    private aimingModeSystem?: AimingModeSystem;
    private playerScore: number = 0;
    private aiScore: number = 0;
    private gameOver: boolean = false;
    private victoryScreen?: VictoryScreen;
    private defeatScreen?: DefeatScreen;
    private isRestarting: boolean = false;
    private playerDangerLine?: Phaser.GameObjects.Graphics;
    private opponentDangerLine?: Phaser.GameObjects.Graphics;
    private dangerWarningActive: boolean = false;
    private paintSplatterSystem?: PaintSplatterSystem;
    private dangerCheckCounter: number = 0;
    private readonly DANGER_CHECK_INTERVAL: number = 10;
    
    // Performance optimization: Cache objective shield state
    private shieldCheckCounter: number = 0;
    private readonly SHIELD_CHECK_INTERVAL: number = 15; // Check every 15 frames (~4 times per second at 60fps)
    private cachedShieldState: boolean = false;
    
    // Performance optimization: Throttle aiming updates
    private aimingCheckCounter: number = 0;
    private readonly AIMING_CHECK_INTERVAL: number = 2; // Check every 2 frames for responsive aiming // Check every 10 frames instead of every frame
    private lastAimAngle: number = 0;
    
    // Arena particle managers
    private spaceParticles?: SpaceArenaParticles;
    private oceanParticles?: OceanArenaParticles;
    
    // Gem system
    // private gemSpawnSystem?: GemSpawnSystem; // Not used - gems are now inside bubbles
    private gemCollectionSystem?: GemCollectionSystem;
    private gemCounterUI?: GemCounterUI;
    
    // Objective gem throwing system
    private objectiveGemTimer?: Phaser.Time.TimerEvent;
    private lastPlayerGemCount: number = 0;
    private lastOpponentGemCount: number = 0;

    constructor(scene: Scene) {
        this.scene = scene;
        this.config = ARENA_CONFIG;
        
        // Always use texture cache for better performance
        this.useOptimizedBubbles = false; // Deprecated - always use regular Bubble with cache
        
        // Initialize texture cache for all bubbles
        this.textureCache = new BubbleTextureCache(scene);
        this.textureCache.initialize(); // Always initialize for performance
        
        // Initialize input manager
        this.inputManager = new InputManager(scene);
        
        // Initialize grid at center of objective zone
        const centerX = scene.cameras.main.centerX;
        const centerY = scene.cameras.main.centerY;
        this.bubbleGrid = new BubbleGrid(centerX, centerY);
        
        // Initialize grid attachment system
        this.gridAttachmentSystem = new GridAttachmentSystem(scene, this.bubbleGrid);
        
        // Initialize match detection system
        this.matchDetectionSystem = new MatchDetectionSystem(
            scene,
            this.bubbleGrid,
            this.gridAttachmentSystem
        );
        
        // Connect systems
        this.gridAttachmentSystem.setMatchDetectionSystem(this.matchDetectionSystem);
        
        this.initializeZones();
        this.createBubblePool();
    }

    private initializeZones(): void {
        const width = this.scene.cameras.main.width;
        const height = this.scene.cameras.main.height;
        
        // Player zone (bottom 40%)
        this.zones.set(ArenaZone.PLAYER, {
            x: 0,
            y: height - this.config.playerZoneHeight,
            width: width,
            height: this.config.playerZoneHeight,
            zone: ArenaZone.PLAYER
        });
        
        // Opponent zone (top 40%)
        this.zones.set(ArenaZone.OPPONENT, {
            x: 0,
            y: 0,
            width: width,
            height: this.config.opponentZoneHeight,
            zone: ArenaZone.OPPONENT
        });
        
        // Objective zone (middle 20%)
        this.zones.set(ArenaZone.OBJECTIVE, {
            x: 0,
            y: this.config.opponentZoneHeight,
            width: width,
            height: this.config.objectiveZoneHeight,
            zone: ArenaZone.OBJECTIVE
        });
    }

    private createBubblePool(): void {
        // Texture cache is already initialized in constructor for all themes
        
        for (let i = 0; i < BUBBLE_CONFIG.POOL_SIZE; i++) {
            // Always use regular Bubble class with texture cache
            const bubble = new Bubble(
                this.scene,
                -1000,
                -1000,
                Bubble.getRandomColor()
            );
            
            bubble.setVisible(false);
            this.bubblePool.push(bubble);
        }
    }

    public setupArena(singlePlayer: boolean = true, difficulty?: AIDifficulty): void {
        this.isSinglePlayer = singlePlayer;
        
        // Use persisted difficulty if not specified
        if (difficulty !== undefined) {
            ArenaSystem.currentDifficulty = difficulty;
        }
        const actualDifficulty = ArenaSystem.currentDifficulty;
        
        this.createLaunchers();
        this.createObjective();
        this.createInitialBubbles();
        this.createZoneVisuals();
        
        // Initialize enhanced scoring systems
        this.enhancedScoreDisplay = new EnhancedScoreDisplay(this.scene);
        this.comboManager = new ComboManager(this.scene);
        
        // Initialize new unified scoring system
        this.scoreEventManager = new ScoreEventManager(this.scene);
        this.unifiedFeedbackSystem = new UnifiedFeedbackSystem(this.scene);
        
        // Initialize visual effects systems with custom config
        this.paintSplatterSystem = new PaintSplatterSystem(this.scene, {
            // Quick persistence - splatters stay for 1.5 seconds, fade over 1 second
            fadeStartDelay: 1500,
            fadeDuration: 1000,
            
            // Balanced splatters - not too much, not too little
            initialAlpha: 0.5,  // Slightly more visible
            minDropletSize: 1.5,  // Slightly bigger minimum
            maxDropletSize: 5,  // Slightly bigger maximum
            
            // Balanced droplet count
            minDroplets: 3,
            maxDroplets: 8,
            
            // Balanced spread area
            minSpread: 10,
            maxSpread: 30,
            
            // Performance tuning
            maxSplatters: 150,
            
            // Balanced scaling with combos
            scaleWithCombo: true,
            comboScaleFactor: 0.25,  // 25% increase per combo
            maxComboScale: 2.0  // Max 2x for huge combos
        });
        console.log('ArenaSystem: Paint splatter system initialized with enhanced settings');
        
        // Initialize power-up systems
        // Arsenal is now integrated directly into the Launcher for both players
        // The Launcher class handles the arsenal display internally
        // this.playerPowerUpInventory = new PowerUpInventoryUI(this.scene, false);
        // this.opponentPowerUpInventory = new PowerUpInventoryUI(this.scene, true);
        this.aimingModeSystem = new AimingModeSystem(this.scene);
        
        // Initialize gem systems (but don't use GemSpawnSystem for floating gems)
        // this.gemSpawnSystem = new GemSpawnSystem(this.scene); // DISABLED - gems are now inside bubbles
        this.gemCollectionSystem = new GemCollectionSystem(this.scene);
        this.gemCounterUI = new GemCounterUI(this.scene);
        console.log('ArenaSystem: Gem systems and UI initialized');
        
        // Listen for objective gem collection
        this.scene.events.on('objective-gem-collected', this.handleObjectiveGemCollected, this);
        
        // Listen for gem collection from bubbles
        this.scene.events.on('gem-collected-from-bubble', this.handleBubbleGemCollected, this);
        
        // Start objective gem throwing animation for space theme
        const currentTheme = this.scene.registry.get('gameTheme') || 'ocean';
        if (currentTheme === 'space') {
            this.startObjectiveGemThrowing();
        }
        
        // Initialize power-up activation after launcher is created
        if (this.playerLauncher) {
            this.powerUpActivation = new PowerUpActivationSystem(
                this.scene,
                this.playerLauncher,
                this.bubbleGrid,
                this.aimingModeSystem
            );
        }
        
        // Connect scoring systems
        this.scoreEventManager.onScoreUpdate((score, isPlayer) => {
            if (isPlayer) {
                this.playerScore = score;
                this.enhancedScoreDisplay?.updatePlayerScore(score);
            } else {
                this.aiScore = score;
                this.enhancedScoreDisplay?.updateOpponentScore(score);
            }
        });
        
        this.scoreEventManager.onVisualEffect((result, position) => {
            this.unifiedFeedbackSystem?.queueFeedback(result, position);
        });
        
        this.playerScore = 0;
        this.aiScore = 0;
        
        // Initialize shooting system with grid attachment
        this.shootingSystem = new ShootingSystem(
            this.scene,
            this.inputManager,
            this.playerLauncher,
            this.gridAttachmentSystem,
            this.bubbleGrid
        );
        
        // Set opponent launcher for shooting system
        this.shootingSystem.setOpponentLauncher(this.opponentLauncher);
        
        // Initialize AI opponent if single player
        if (this.isSinglePlayer) {
            this.aiOpponent = new AIOpponentSystem(
                this.scene,
                this.opponentLauncher
            );
            this.aiOpponent.setDifficulty(actualDifficulty);
            
            console.log(`ArenaSystem: AI opponent initialized with ${actualDifficulty} difficulty`);
            
            // Start AI after a short delay
            this.scene.time.delayedCall(2000, () => {
                this.aiOpponent?.start();
                console.log('ArenaSystem: AI opponent started');
            });
        }
        
        // Listen for scoring events
        this.scene.events.on('score-update', this.onScoreUpdate, this);
        this.scene.events.on('bubble-attached', this.checkVictoryCondition, this);
        this.scene.events.on('bubble-position-update', this.checkChestHit, this);
        
        // Enable debug with 'D' key
        this.scene.input.keyboard?.on('keydown-D', () => {
            this.toggleDebug();
        });
        
        // Change AI difficulty with number keys
        if (this.isSinglePlayer && this.aiOpponent) {
            this.scene.input.keyboard?.on('keydown-ONE', () => {
                this.changeAIDifficulty(AIDifficulty.EASY);
            });
            
            this.scene.input.keyboard?.on('keydown-TWO', () => {
                this.changeAIDifficulty(AIDifficulty.MEDIUM);
            });
            
            this.scene.input.keyboard?.on('keydown-THREE', () => {
                this.changeAIDifficulty(AIDifficulty.HARD);
            });
        }
    }

    private createLaunchers(): void {
        const centerX = this.scene.cameras.main.centerX;
        
        // Player launcher at bottom
        const playerZone = this.zones.get(ArenaZone.PLAYER)!;
        this.playerLauncher = new Launcher(
            this.scene,
            centerX,
            playerZone.y + playerZone.height - this.config.launcherOffset,
            ArenaZone.PLAYER
        );
        
        // Opponent launcher at top
        const opponentZone = this.zones.get(ArenaZone.OPPONENT)!;
        this.opponentLauncher = new Launcher(
            this.scene,
            centerX,
            opponentZone.y + this.config.launcherOffset,
            ArenaZone.OPPONENT
        );
    }

    private createObjective(): void {
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        // Check current theme to decide which objective to create
        const currentTheme = this.scene.registry.get('selectedTheme') || this.scene.registry.get('gameTheme') || 'ocean';
        
        if (currentTheme === 'space') {
            // Deep Space theme - UFO delivery with space objective
            this.createUFODelivery(centerX, centerY, () => {
                // Space objective is created during the tractor beam animation
            });
        } else if (currentTheme === 'ocean_depths') {
            // Ocean Depths theme - Vortex delivery with treasure chest
            this.createOceanVortexDelivery(centerX, centerY, () => {
                // Treasure chest is created during the vortex animation
            });
        } else {
            // Default for other themes - Traditional chest
            this.objective = new Objective(this.scene, {
                x: centerX,
                y: centerY,
                size: this.config.objectiveSize,
                health: 1
            });
        }
    }
    
    private createUFODelivery(targetX: number, targetY: number, onComplete: () => void): void {
        // Check if UFO asset exists
        if (!this.scene.textures.exists('ufo')) {
            // Fallback to immediate creation if no UFO
            onComplete();
            return;
        }
        
        const ufoScale = 0.35; // Larger UFO for better visibility
        const startX = -200; // Start off-screen left
        const startY = targetY - 100; // Slightly lower position
        
        // Create UFO
        const ufo = this.scene.add.image(startX, startY, 'ufo');
        ufo.setScale(ufoScale);
        ufo.setDepth(1000); // Above everything
        
        // Play UFO arrival sound
        let ufoArrivalSound: Phaser.Sound.BaseSound | null = null;
        let ufoSound: Phaser.Sound.BaseSound | null = null;
        
        try {
            ufoArrivalSound = this.scene.sound.add('ufo-arrives', {
                volume: 0.2,
                rate: 1.0  // Normal speed for arrival
            });
            ufoArrivalSound.play();
        } catch (e) {
            console.log('UFO arrival sound not loaded');
        }
        
        // Initialize particle system if not already done
        if (!this.spaceParticles) {
            this.spaceParticles = new SpaceArenaParticles(this.scene);
        }
        
        // Create UFO particles
        const trailParticles = this.spaceParticles.createUFOTrailParticles(ufo, 999);
        const engineGlow = this.spaceParticles.createUFOEngineParticles(ufo, 998);
        
        // UFO entry animation with bounce
        this.scene.tweens.add({
            targets: ufo,
            x: targetX,
            duration: 1200,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Stop trail and start engine
                trailParticles.stop();
                engineGlow.start();
                
                // Small bounce on arrival
                this.scene.tweens.add({
                    targets: ufo,
                    y: startY - 10,
                    duration: 200,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Show and animate tractor beam
                        this.animateTractorBeam(ufo, targetX, startY, targetY, () => {
                            // Space objective is created during beam animation
                            if (onComplete) onComplete();
                            
                            // UFO departure - fly up towards planet!
                            engineGlow.stop();
                            
                            // Add delay before playing UFO departure sound
                            this.scene.time.delayedCall(800, () => {
                                // Play UFO departure sound after delay
                                try {
                                    ufoSound = this.scene.sound.add('ufo-sound', {
                                        volume: 0.2,
                                        rate: 0.9  // Adjusted rate for dramatic effect
                                    });
                                    ufoSound.play();
                                } catch (e) {
                                    console.log('UFO sound not loaded');
                                }
                            });
                            
                            // Create departure particles
                            const departParticles = this.spaceParticles?.createDepartureParticles(targetX, startY, 999);
                            
                            // UFO flies up towards planet (top-right where Earth is)
                            this.scene.tweens.add({
                                targets: ufo,
                                x: this.scene.cameras.main.width * 0.85,
                                y: this.scene.cameras.main.height * 0.15, // Go to planet position
                                scale: 0.05, // Shrink as it goes to planet
                                duration: 2000,
                                ease: 'Quad.easeIn',
                                delay: 300,
                                onStart: () => {
                                    // Fade out UFO sound
                                    if (ufoSound) {
                                        this.scene.tweens.add({
                                            targets: ufoSound,
                                            volume: 0,
                                            duration: 1500,
                                            onComplete: () => {
                                                ufoSound?.stop();
                                            }
                                        });
                                    }
                                },
                                onComplete: () => {
                                    // Create classic star twinkle effect at UFO's final position
                                    const flashX = this.scene.cameras.main.width * 0.85;
                                    const flashY = this.scene.cameras.main.height * 0.15;
                                    
                                    // Play shine sound when twinkle appears
                                    try {
                                        const shineSound = this.scene.sound.add('shine', {
                                            volume: 0.15,
                                            rate: 1.0
                                        });
                                        shineSound.play();
                                    } catch (e) {
                                        console.log('Shine sound not loaded');
                                    }
                                    
                                    // Create star graphics for the classic 4-point star twinkle
                                    const starGraphics = this.scene.add.graphics();
                                    starGraphics.setDepth(1001);
                                    
                                    // Animate star twinkle
                                    let starScale = 0;
                                    let starAlpha = 1;
                                    
                                    const starTween = this.scene.tweens.add({
                                        targets: { scale: 0, alpha: 1 },
                                        scale: { from: 0, to: 1 },
                                        alpha: { from: 1, to: 0 },
                                        duration: 400,
                                        ease: 'Back.easeOut',
                                        onUpdate: (tween) => {
                                            starScale = tween.getValue();
                                            starAlpha = 1 - tween.progress;
                                            
                                            starGraphics.clear();
                                            starGraphics.lineStyle(2, 0xffffff, starAlpha);
                                            
                                            // Draw horizontal line
                                            const lineLength = 20 * starScale;
                                            starGraphics.beginPath();
                                            starGraphics.moveTo(flashX - lineLength, flashY);
                                            starGraphics.lineTo(flashX + lineLength, flashY);
                                            starGraphics.strokePath();
                                            
                                            // Draw vertical line
                                            starGraphics.beginPath();
                                            starGraphics.moveTo(flashX, flashY - lineLength);
                                            starGraphics.lineTo(flashX, flashY + lineLength);
                                            starGraphics.strokePath();
                                            
                                            // Add thin diagonal lines for extra sparkle
                                            starGraphics.lineStyle(1, 0xffffff, starAlpha * 0.7);
                                            const diagLength = lineLength * 0.7;
                                            
                                            // Diagonal 1
                                            starGraphics.beginPath();
                                            starGraphics.moveTo(flashX - diagLength, flashY - diagLength);
                                            starGraphics.lineTo(flashX + diagLength, flashY + diagLength);
                                            starGraphics.strokePath();
                                            
                                            // Diagonal 2
                                            starGraphics.beginPath();
                                            starGraphics.moveTo(flashX - diagLength, flashY + diagLength);
                                            starGraphics.lineTo(flashX + diagLength, flashY - diagLength);
                                            starGraphics.strokePath();
                                            
                                            // Central bright dot
                                            starGraphics.fillStyle(0xffffff, starAlpha);
                                            starGraphics.fillCircle(flashX, flashY, 2 * starScale);
                                        },
                                        onComplete: () => {
                                            starGraphics.destroy();
                                        }
                                    });
                                    
                                    // Destroy UFO after flash starts
                                    if (ufo && ufo.active) ufo.destroy();
                                    if (trailParticles && trailParticles.active) {
                                        trailParticles.stop();
                                        trailParticles.destroy();
                                    }
                                    if (engineGlow && engineGlow.active) {
                                        engineGlow.stop();
                                        engineGlow.destroy();
                                    }
                                    
                                    // Cleanup after delay
                                    this.scene.time.delayedCall(1000, () => {
                                        if (departParticles && departParticles.active) {
                                            departParticles.stop();
                                            departParticles.destroy();
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
        
        // Add hovering motion to UFO
        this.scene.tweens.add({
            targets: ufo,
            y: startY + 8,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private createSpaceObjectiveWithMaterialization(x: number, y: number): void {
        // Clean up any existing particle system
        if (this.spaceParticles) {
            this.spaceParticles.destroy();
        }
        
        // Initialize new particle system
        this.spaceParticles = new SpaceArenaParticles(this.scene);
        
        // For space theme, modify the original objective to give gems instead of victory
        // But keep the original visual design
        
        console.log('Creating space objective with materialization at', x, y);
        
        // Create container first
        const objectiveContainer = this.scene.add.container(x, y);
        objectiveContainer.setSize(this.config.objectiveSize, this.config.objectiveSize);
        objectiveContainer.setDepth(Z_LAYERS.OBJECTIVE);
        
        // Start with container invisible for materialization
        objectiveContainer.setAlpha(0);
        objectiveContainer.setScale(0.1);
        
        // Create the space tech orb at 0,0 relative to container
        const spaceObjective = this.scene.add.image(0, 0, 'space_objective');
        spaceObjective.setScale(0.22);
        objectiveContainer.add(spaceObjective);
        
        // Gradual materialization animation
        this.scene.tweens.add({
            targets: objectiveContainer,
            alpha: 1,
            scale: 1,
            duration: 1200,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Add slow rotation animation for the tech orb
                this.scene.tweens.add({
                    targets: spaceObjective,
                    angle: 360,
                    duration: 15000,
                    repeat: -1,
                    ease: 'Linear'
                });
                
                // Add subtle floating animation to the container
                this.scene.tweens.add({
                    targets: objectiveContainer,
                    y: y - 3,
                    duration: 3000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Add pulsing scale effect
                this.scene.tweens.add({
                    targets: spaceObjective,
                    scale: { from: 0.22, to: 0.24 },
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Create glow effect graphics
        const glowGraphics = this.scene.add.graphics();
        objectiveContainer.add(glowGraphics);
        objectiveContainer.sendToBack(glowGraphics);
        
        // Animate glow during materialization
        let glowAlpha = 0;
        const glowAnimation = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                glowAlpha = Math.min(1, glowAlpha + 0.02);
                glowGraphics.clear();
                
                // Outer glow
                glowGraphics.fillStyle(0x00ffff, 0.05 * glowAlpha);
                glowGraphics.fillCircle(0, 0, 60);
                glowGraphics.fillStyle(0x00ffff, 0.1 * glowAlpha);
                glowGraphics.fillCircle(0, 0, 45);
                glowGraphics.fillStyle(0xffffff, 0.15 * glowAlpha);
                glowGraphics.fillCircle(0, 0, 30);
            },
            loop: true
        });
        
        // Stop glow animation after materialization
        this.scene.time.delayedCall(1200, () => {
            glowAnimation.destroy();
            
            // Animate glow effect with pulsing
            this.scene.time.addEvent({
                delay: 16,
                callback: () => {
                    const time = this.scene.time.now / 1000;
                    const pulse = Math.sin(time * 2) * 0.3 + 0.7;
                    
                    glowGraphics.clear();
                    
                    // Outer glow
                    glowGraphics.fillStyle(0x00ffff, 0.05 * pulse);
                    glowGraphics.fillCircle(0, 0, 60);
                    glowGraphics.fillStyle(0x00ffff, 0.1 * pulse);
                    glowGraphics.fillCircle(0, 0, 45);
                    glowGraphics.fillStyle(0xffffff, 0.15 * pulse);
                    glowGraphics.fillCircle(0, 0, 30);
                },
                loop: true
            });
        });
        
        // Create energy particles that materialize with the objective
        const energyParticles = this.spaceParticles.createEnergyParticles(x, y, Z_LAYERS.OBJECTIVE - 1);
        
        // Start emitting particles after initial materialization
        this.scene.time.delayedCall(600, () => {
            energyParticles.start();
        });
        
        // Create orbiting particles
        const orbitParticles = this.spaceParticles.createOrbitingParticles(x, y, Z_LAYERS.OBJECTIVE - 1);
        
        // Animate orbiting particles after materialization
        this.scene.time.delayedCall(800, () => {
            this.spaceParticles?.startOrbitAnimation(orbitParticles, x, y);
        });
        
        // Add hit method for bubble collisions
        objectiveContainer.hit = (damage: number = 1) => {
            // Play success objective sound
            try {
                const successSound = this.scene.sound.add('success-objective', {
                    volume: 0.5,
                    rate: 1.0
                });
                successSound.play();
            } catch (error) {
                console.warn('Could not play success-objective sound:', error);
            }
            
            // Simple flash effect without margin
            spaceObjective.setTint(0xffffff);
            this.scene.time.delayedCall(100, () => {
                spaceObjective.clearTint();
            });
            
            // Emit extra particles on hit
            if (energyParticles && energyParticles.active) {
                energyParticles.explode(10);
            }
        };
        
        // Add playVictoryAnimation method
        objectiveContainer.playVictoryAnimation = (onComplete?: () => void) => {
            // Stop regular animations
            if (energyParticles && energyParticles.active) {
                energyParticles.stop();
                energyParticles.removeAllListeners();
            }
            if (orbitParticles && orbitParticles.active) {
                orbitParticles.stop();
                orbitParticles.removeAllListeners();
            }
            
            // Portal implosion effect - pull in then explode
            this.scene.tweens.add({
                targets: spaceObjective,
                scale: 0.35,
                angle: '+=360',
                duration: 400,
                ease: 'Power2.easeIn',
                onComplete: () => {
                    // Then collapse
                    this.scene.tweens.add({
                        targets: spaceObjective,
                        scale: 0,
                        angle: '+=180',
                        duration: 300,
                        ease: 'Power2.easeIn'
                    });
                    
                    // Big flash
                    const flash = this.scene.add.circle(x, y, 50, 0xffffff, 1);
                    flash.setDepth(Z_LAYERS.OBJECTIVE + 100);
                    this.scene.tweens.add({
                        targets: flash,
                        scale: { from: 0.5, to: 2 },
                        alpha: { from: 1, to: 0 },
                        duration: 500,
                        ease: 'Power2.easeOut',
                        onComplete: () => {
                            flash.destroy();
                        }
                    });
                    
                    // Victory particles explosion
                    const victoryParticles = this.spaceParticles?.createVictoryParticles(x, y, Z_LAYERS.OBJECTIVE + 99);
                    
                    // Cleanup and callback
                    this.scene.time.delayedCall(500, () => {
                        // Clear space particles
                        if (this.spaceParticles) {
                            this.spaceParticles.destroyParticle('energy');
                            this.spaceParticles.destroyParticle('orbit');
                        }
                        
                        // Destroy particles properly
                        if (energyParticles && energyParticles.active) {
                            energyParticles.stop();
                            energyParticles.destroy();
                        }
                        if (orbitParticles && orbitParticles.active) {
                            orbitParticles.stop();
                            orbitParticles.destroy();
                        }
                        
                        // Destroy container
                        if (objectiveContainer && objectiveContainer.active) {
                            objectiveContainer.destroy();
                        }
                        
                        this.scene.time.delayedCall(500, () => {
                            if (victoryParticles && victoryParticles.active) {
                                victoryParticles.stop();
                                victoryParticles.destroy();
                            }
                        });
                        
                        if (onComplete) onComplete();
                    });
                }
            });
        };
        
        // Add setShielded method (disabled for space objective - no shield needed)
        objectiveContainer.setShielded = (shielded: boolean) => {
            // Do nothing - space objective doesn't have a shield
            // The shield functionality is disabled for the space theme
        };
        
        this.objective = objectiveContainer as any;
    }
    
    private createOceanVortexDelivery(centerX: number, centerY: number, onComplete?: () => void): void {
        console.log('Creating ocean vortex delivery animation');
        
        // Initialize ocean particle system
        if (!this.oceanParticles) {
            this.oceanParticles = new OceanArenaParticles(this.scene);
        }
        
        // Play vortex formation sound
        try {
            const vortexSound = this.scene.sound.add('water-swirl', {
                volume: 0.4,
                rate: 0.8
            });
            vortexSound.play();
        } catch (e) {
            console.log('Vortex sound not loaded');
        }
        
        // Create vortex graphics
        const vortexGraphics = this.scene.add.graphics();
        vortexGraphics.setDepth(Z_LAYERS.OBJECTIVE - 2);
        
        // Create splash particles at the start
        const splashParticles = this.oceanParticles.createSplashParticles(centerX, centerY, Z_LAYERS.OBJECTIVE + 50);
        splashParticles.explode(30);
        
        // Create vortex swirl particles
        const vortexParticles = this.oceanParticles.createVortexParticles(centerX, centerY, Z_LAYERS.OBJECTIVE - 1);
        const foamParticles = this.oceanParticles.createFoamParticles(centerX, centerY, Z_LAYERS.OBJECTIVE);
        
        // Start vortex animations
        this.oceanParticles.startVortexAnimation(vortexParticles, centerX, centerY, 100, 10);
        this.oceanParticles.startVortexAnimation(foamParticles, centerX, centerY, 80, 15);
        
        // Animate vortex formation
        let vortexTime = 0;
        let vortexRadius = 10;
        let maxRadius = 120;
        let vortexAlpha = 0;
        
        const vortexAnimation = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                vortexTime += 0.03;
                vortexAlpha = Math.min(1, vortexAlpha + 0.02);
                
                // Expand vortex
                if (vortexRadius < maxRadius) {
                    vortexRadius += 2;
                }
                
                vortexGraphics.clear();
                
                // Draw water vortex with gradient
                for (let r = vortexRadius; r > 0; r -= 5) {
                    const alpha = (1 - r / vortexRadius) * 0.3 * vortexAlpha;
                    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                        { r: 0, g: 96, b: 100 },  // Dark ocean
                        { r: 0, g: 188, b: 212 },  // Cyan
                        r / vortexRadius,
                        1
                    );
                    
                    vortexGraphics.fillStyle(
                        Phaser.Display.Color.GetColor(color.r, color.g, color.b),
                        alpha
                    );
                    
                    // Draw spiral segments
                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
                        const spiralAngle = angle + vortexTime * (1 + r / vortexRadius);
                        const x1 = centerX + Math.cos(spiralAngle) * r;
                        const y1 = centerY + Math.sin(spiralAngle) * r;
                        const x2 = centerX + Math.cos(spiralAngle + 0.5) * (r - 5);
                        const y2 = centerY + Math.sin(spiralAngle + 0.5) * (r - 5);
                        
                        vortexGraphics.fillTriangle(centerX, centerY, x1, y1, x2, y2);
                    }
                }
                
                // Draw central dark hole
                vortexGraphics.fillStyle(0x004d40, vortexAlpha * 0.8);
                vortexGraphics.fillCircle(centerX, centerY, 20);
                vortexGraphics.fillStyle(0x00251a, vortexAlpha);
                vortexGraphics.fillCircle(centerX, centerY, 10);
            },
            loop: true
        });
        
        // Start particle emissions
        vortexParticles.start();
        foamParticles.start();
        
        // After vortex forms, emerge the treasure chest
        this.scene.time.delayedCall(2000, () => {
            // Create a bright flash in the center of the vortex
            const portalFlash = this.scene.add.circle(centerX, centerY, 5, 0x00ffff, 1);
            portalFlash.setDepth(Z_LAYERS.OBJECTIVE + 50);
            
            this.scene.tweens.add({
                targets: portalFlash,
                scale: { from: 0.5, to: 3 },
                alpha: { from: 1, to: 0 },
                duration: 600,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    portalFlash.destroy();
                }
            });
            
            // Play emergence sound
            try {
                const emergenceSound = this.scene.sound.add('chest-arrival', {
                    volume: 0.3,
                    rate: 0.9
                });
                emergenceSound.play();
            } catch (e) {
                console.log('Chest emergence sound not loaded');
            }
            
            // Create treasure chest at the center of vortex
            this.objective = new Objective(this.scene, {
                x: centerX,
                y: centerY, // Start at center, not below
                size: this.config.objectiveSize,
                health: 1
            });
            
            // Start with chest invisible and tiny (like emerging from a portal)
            this.objective.setScale(0.01);
            this.objective.setAlpha(0);
            this.objective.setDepth(Z_LAYERS.OBJECTIVE);
            
            // Create emergence particles
            const emergenceParticles = this.oceanParticles.createTreasureEmergenceParticles(
                centerX, centerY, Z_LAYERS.OBJECTIVE + 100
            );
            
            // Animate chest emerging from vortex center (scaling up with rotation)
            this.scene.tweens.add({
                targets: this.objective,
                scale: { from: 0.01, to: 1.2 }, // Overshoot slightly
                alpha: { from: 0, to: 1 },
                angle: { from: 0, to: 360 }, // Spin as it emerges
                duration: 1200,
                ease: 'Back.easeOut',
                onComplete: () => {
                    // Settle to final size
                    this.scene.tweens.add({
                        targets: this.objective,
                        scale: 1,
                        duration: 300,
                        ease: 'Sine.easeInOut'
                    });
                    
                    // Start floating animation
                    this.scene.tweens.add({
                        targets: this.objective,
                        y: centerY - 5,
                        duration: 2000,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                    
                    // Add bubble particles from chest
                    const bubbles = this.oceanParticles.createBubbleParticles(
                        centerX, centerY, Z_LAYERS.OBJECTIVE - 1
                    );
                    bubbles.start();
                    
                    // Slow down and fade vortex
                    this.scene.time.delayedCall(500, () => {
                        vortexParticles.stop();
                        foamParticles.stop();
                        
                        // Fade out vortex
                        this.scene.tweens.add({
                            targets: vortexGraphics,
                            alpha: 0,
                            duration: 1000,
                            onComplete: () => {
                                vortexAnimation.destroy();
                                vortexGraphics.destroy();
                                
                                // Cleanup splash particles
                                this.scene.time.delayedCall(1000, () => {
                                    if (splashParticles && splashParticles.active) {
                                        splashParticles.stop();
                                        splashParticles.destroy();
                                    }
                                });
                                
                                if (onComplete) onComplete();
                            }
                        });
                    });
                }
            });
        });
    }
    
    private animateTractorBeam(ufo: Phaser.GameObjects.Image, x: number, y: number, targetY: number, onComplete: () => void): void {
        // Create space objective container early but hidden
        let spaceObjectiveCreated = false;
        // Calculate beam position to connect perfectly with UFO
        const beamStartY = ufo.y + 30; // Start from UFO bottom
        const beamHeight = targetY - beamStartY;
        
        // Create main beam container
        const beamContainer = this.scene.add.container(x, beamStartY);
        beamContainer.setDepth(999);
        
        // Create beam base graphics
        const beamBase = this.scene.add.graphics();
        beamContainer.add(beamBase);
        
        // Create particle emitters for beam effect
        const beamParticles = this.scene.add.particles(0, 0, 'particle', {
            x: 0,
            y: { min: 0, max: beamHeight },
            scale: { start: 0.6, end: 0.1 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xffffff, 0x00ffff, 0x66ddff],  // White, cyan, light blue for tractor beam
            blendMode: 'ADD',
            lifespan: 800,
            speedX: { min: -20, max: 20 },
            speedY: 0,
            quantity: 3,
            frequency: 50,
            emitting: false
        });
        beamContainer.add(beamParticles);
        
        // Create spiraling energy particles
        const spiralParticles = this.scene.add.particles(0, 0, 'particle', {
            x: 0,
            y: 0,
            scale: { start: 0.4, end: 0.05 },
            alpha: { start: 1, end: 0 },
            tint: 0xffffff,  // Pure white for beam spiral
            blendMode: 'ADD',
            lifespan: 1200,
            quantity: 2,
            frequency: 80,
            emitting: false
        });
        beamContainer.add(spiralParticles);
        
        // Animate beam expansion
        beamContainer.setScale(0, 0);
        beamContainer.setAlpha(0);
        
        this.scene.tweens.add({
            targets: beamContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Start particle emissions
                beamParticles.start();
                spiralParticles.start();
                
                // Play chest arrival sound when beam particles start
                try {
                    const chestArrivalSound = this.scene.sound.add('chest-arrival', {
                        volume: 0.25,
                        rate: 1.0
                    });
                    chestArrivalSound.play();
                } catch (e) {
                    console.log('Chest arrival sound not loaded');
                }
                
                // Animate beam with real-time updates
                let time = 0;
                const beamPulse = this.scene.time.addEvent({
                    delay: 16,
                    callback: () => {
                        time += 0.03;
                        beamBase.clear();
                        
                        // Enhanced tractor beam effect
                        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
                        const wave = Math.sin(time * 2) * 0.2;
                        
                        // Draw cone shape with gradient effect
                        const topWidth = 20;
                        const bottomWidth = 60;
                        
                        // Main beam cone with gradient
                        beamBase.fillStyle(0x00ffff, 0.05 * pulse);
                        beamBase.beginPath();
                        beamBase.moveTo(-topWidth, 0);
                        beamBase.lineTo(topWidth, 0);
                        beamBase.lineTo(bottomWidth, beamHeight);
                        beamBase.lineTo(-bottomWidth, beamHeight);
                        beamBase.closePath();
                        beamBase.fillPath();
                        
                        // Inner bright cone
                        beamBase.fillStyle(0xffffff, 0.03 * pulse);
                        beamBase.beginPath();
                        beamBase.moveTo(-topWidth * 0.5, 0);
                        beamBase.lineTo(topWidth * 0.5, 0);
                        beamBase.lineTo(bottomWidth * 0.7, beamHeight);
                        beamBase.lineTo(-bottomWidth * 0.7, beamHeight);
                        beamBase.closePath();
                        beamBase.fillPath();
                        
                        // Draw energy rings moving down
                        for (let i = 0; i < 8; i++) {
                            const ringY = ((time * 50 + i * beamHeight / 8) % beamHeight);
                            const ringRadius = topWidth + (bottomWidth - topWidth) * (ringY / beamHeight);
                            const ringAlpha = (1 - ringY / beamHeight) * 0.3 * pulse;
                            
                            beamBase.lineStyle(2, 0x00ffff, ringAlpha);
                            beamBase.strokeCircle(0, ringY, ringRadius);
                            beamBase.lineStyle(1, 0xffffff, ringAlpha * 0.5);
                            beamBase.strokeCircle(0, ringY, ringRadius * 0.8);
                        }
                        
                        // Spiraling energy lines
                        for (let i = 0; i < 3; i++) {
                            const angle = (time * 2 + i * Math.PI * 2 / 3);
                            const startX = Math.cos(angle) * topWidth * 0.8;
                            const endX = Math.cos(angle + wave) * bottomWidth * 0.9;
                            
                            beamBase.lineStyle(2, 0x66ddff, 0.4 * pulse);
                            beamBase.beginPath();
                            beamBase.moveTo(startX, 0);
                            beamBase.lineTo(endX, beamHeight);
                            beamBase.strokePath();
                        }
                        
                        // Bottom impact glow with ripples
                        const ripple = Math.sin(time * 5) * 0.1 + 0.9;
                        beamBase.fillStyle(0x00ffff, 0.15 * pulse);
                        beamBase.fillCircle(0, beamHeight, 70 * ripple);
                        beamBase.fillStyle(0xffffff, 0.25 * pulse);
                        beamBase.fillCircle(0, beamHeight, 45 * ripple);
                        beamBase.fillStyle(0x00ffff, 0.1 * pulse);
                        beamBase.fillCircle(0, beamHeight, 90 * ripple);
                        
                        // Update spiral particle positions
                        const spiralAngle = time * 4;
                        spiralParticles.setParticleSpeed(
                            Math.cos(spiralAngle) * 30,
                            beamHeight / 1.2
                        );
                    },
                    loop: true
                });
                
                // Start materializing the space objective during beam animation
                this.scene.time.delayedCall(600, () => {
                    if (!spaceObjectiveCreated) {
                        spaceObjectiveCreated = true;
                        // Create the space objective with materialization effect
                        this.createSpaceObjectiveWithMaterialization(x, targetY);
                    }
                });
                
                // After beam animation, finish materialization
                this.scene.time.delayedCall(1800, () => {
                    beamPulse.destroy();
                    beamParticles.stop();
                    spiralParticles.stop();
                    
                    // Create final flash effect
                    const finalGlow = this.scene.add.graphics();
                    finalGlow.fillStyle(0x00ffff, 0);
                    finalGlow.fillCircle(x, targetY, 40);
                    finalGlow.setDepth(1000);
                    
                    // Final materialization flash
                    this.scene.tweens.add({
                        targets: finalGlow,
                        alpha: { from: 0.8, to: 0 },
                        scale: { from: 0.5, to: 2 },
                        duration: 400,
                        ease: 'Power2.easeOut',
                        onComplete: () => {
                            finalGlow.destroy();
                        }
                    });
                    
                    // Fade out beam
                    this.scene.tweens.add({
                        targets: beamContainer,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            if (beamContainer && beamContainer.active) {
                                // Destroy beam particles properly
                                if (beamParticles && beamParticles.active) {
                                    beamParticles.stop();
                                    beamParticles.destroy();
                                }
                                if (spiralParticles && spiralParticles.active) {
                                    spiralParticles.stop();
                                    spiralParticles.destroy();
                                }
                                // Destroy container
                                beamContainer.destroy();
                            }
                            onComplete();
                        }
                    });
                });
            }
        });
    }

    private createInitialBubbles(): void {
        const theme = this.scene.registry.get('gameTheme') || 'ocean';
        
        // Use theme-specific pattern
        if (theme === 'space') {
            this.createSpaceArenaPattern();
        } else {
            this.createDefaultPattern();
        }
    }
    
    /**
     * Create a space-themed initial bubble pattern
     * Forms a clear STAR shape that's easily recognizable
     */
    private createSpaceArenaPattern(): void {
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        const allPositions: { hexPos: IHexPosition, pixelPos: { x: number, y: number } }[] = [];
        const positionSet = new Set<string>();
        
        // Helper to add position without duplicates
        const addPosition = (hexPos: IHexPosition) => {
            const key = `${hexPos.q},${hexPos.r}`;
            if (!positionSet.has(key)) {
                positionSet.add(key);
                const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
                allPositions.push({ hexPos, pixelPos });
            }
        };
        
        // SPACE ARENA - CAREFULLY DESIGNED FOR BEST GAMEPLAY
        // Balanced, symmetric, and strategic
        
        // CENTER - Leave empty for objective
        // Skip (0,0,0)
        
        // PROTECTIVE RING - First ring around objective
        // This creates the shield that protects the objective
        addPosition({ q: 1, r: -1, s: 0 });
        addPosition({ q: 1, r: 0, s: -1 });
        addPosition({ q: 0, r: 1, s: -1 });
        addPosition({ q: -1, r: 1, s: 0 });
        addPosition({ q: -1, r: 0, s: 1 });
        addPosition({ q: 0, r: -1, s: 1 });
        
        // SECOND RING - Full circle for stability
        const ring2 = this.bubbleGrid.getRing({ q: 0, r: 0, s: 0 }, 2);
        ring2.forEach(pos => addPosition(pos));
        
        // THIRD RING - Almost complete with strategic gaps
        const ring3 = this.bubbleGrid.getRing({ q: 0, r: 0, s: 0 }, 3);
        ring3.forEach((pos, index) => {
            // Leave 2 gaps for strategy (at positions 4 and 10)
            if (index !== 4 && index !== 10) {
                addPosition(pos);
            }
        });
        
        // UPPER FORMATION (Opponent's side) - Symmetric and balanced
        // Row -4: Wide formation
        for (let q = -3; q <= 3; q++) {
            addPosition({ q, r: -4, s: -q + 4 });
        }
        
        // Row -5: Slightly narrower
        for (let q = -2; q <= 2; q++) {
            addPosition({ q, r: -5, s: -q + 5 });
        }
        
        // Row -6: Top edge
        addPosition({ q: -1, r: -6, s: 7 });
        addPosition({ q: 0, r: -6, s: 6 });
        addPosition({ q: 1, r: -6, s: 5 });
        
        // LOWER FORMATION (Player's side) - Mirror of upper
        // Row 4: Wide formation
        for (let q = -3; q <= 3; q++) {
            addPosition({ q, r: 4, s: -q - 4 });
        }
        
        // Row 5: Slightly narrower
        for (let q = -2; q <= 2; q++) {
            addPosition({ q, r: 5, s: -q - 5 });
        }
        
        // Row 6: Bottom edge
        addPosition({ q: -1, r: 6, s: -5 });
        addPosition({ q: 0, r: 6, s: -6 });
        addPosition({ q: 1, r: 6, s: -7 });
        
        // LEFT WING - Balanced formation
        // Column -4
        for (let r = -3; r <= 3; r++) {
            if (r !== 0) { // Skip center row for gap
                addPosition({ q: -4, r, s: 4 - r });
            }
        }
        
        // Column -5 (partial)
        addPosition({ q: -5, r: -1, s: 6 });
        addPosition({ q: -5, r: 0, s: 5 });
        addPosition({ q: -5, r: 1, s: 4 });
        
        // RIGHT WING - Mirror of left
        // Column 4
        for (let r = -3; r <= 3; r++) {
            if (r !== 0) { // Skip center row for gap
                addPosition({ q: 4, r, s: -4 - r });
            }
        }
        
        // Column 5 (partial)
        addPosition({ q: 5, r: -1, s: -4 });
        addPosition({ q: 5, r: 0, s: -5 });
        addPosition({ q: 5, r: 1, s: -6 });
        
        // CORNER CONNECTORS - Ensure everything is connected
        // These prevent orphan bubbles
        addPosition({ q: -3, r: -3, s: 6 });
        addPosition({ q: 3, r: -3, s: 0 });
        addPosition({ q: -3, r: 3, s: 0 });
        addPosition({ q: 3, r: 3, s: -6 });
        
        // Total: ~100 bubbles, leaving plenty of room in the pool
        // Symmetric design for fair competitive play
        // Strategic gaps for skillful shots
        // All bubbles connected - no orphans
        
        console.log(`Space pattern: Creating ${allPositions.length} bubbles (MOON formation)`);
        console.log(`Pool has ${BUBBLE_CONFIG.POOL_SIZE} total bubbles available`);
        
        // If we have too many positions, trim to fit pool size minus some reserve
        const maxBubbles = Math.floor(BUBBLE_CONFIG.POOL_SIZE * 0.4); // Use only 40% for initial pattern
        if (allPositions.length > maxBubbles) {
            console.warn(`Pattern has ${allPositions.length} positions but limiting to ${maxBubbles} to avoid pool exhaustion`);
            // Prioritize center positions
            allPositions.sort((a, b) => {
                const distA = Math.abs(a.hexPos.q) + Math.abs(a.hexPos.r) + Math.abs(a.hexPos.s);
                const distB = Math.abs(b.hexPos.q) + Math.abs(b.hexPos.r) + Math.abs(b.hexPos.s);
                return distA - distB;
            });
            allPositions = allPositions.slice(0, maxBubbles);
        }
        
        this.createBubblesFromPositions(allPositions);
    }
    
    /**
     * Create default pattern for other arenas
     */
    private createDefaultPattern(): void {
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        const allPositions: { hexPos: IHexPosition, pixelPos: { x: number, y: number } }[] = [];
        const positionSet = new Set<string>();
        
        // Helper to add position without duplicates
        const addPosition = (hexPos: IHexPosition) => {
            const key = `${hexPos.q},${hexPos.r}`;
            if (!positionSet.has(key)) {
                positionSet.add(key);
                const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
                allPositions.push({ hexPos, pixelPos });
            }
        };
        
        // Create 3 rings of bubbles around the objective (guaranteed connected)
        // These rings will be the anchor for all other bubbles
        for (let ring = 1; ring <= 3; ring++) {
            const positions = this.bubbleGrid.getRing(center, ring);
            positions.forEach(hexPos => {
                addPosition(hexPos);
            });
        }
        
        // Add outer rows that are guaranteed to connect
        // Top row -4: Only add positions that will connect to r=-3
        for (let q = -3; q <= 3; q++) {
            if (Math.random() < 0.8) { // Some variety but most connect
                addPosition({ q, r: -4, s: -q - (-4) });
            }
        }
        
        // Bottom row 4: Only add positions that will connect to r=3
        for (let q = -3; q <= 3; q++) {
            if (Math.random() < 0.8) { // Some variety but most connect
                addPosition({ q, r: 4, s: -q - 4 });
            }
        }
        
        console.log(`Default pattern: Creating ${allPositions.length} bubbles`);
        this.createBubblesFromPositions(allPositions);
    }
    
    /**
     * Helper to create bubbles from position array
     */
    private createBubblesFromPositions(allPositions: { hexPos: IHexPosition, pixelPos: { x: number, y: number } }[]): void {
        // Track Mystery Bubbles per side
        let playerSideMysteryCount = 0;
        let opponentSideMysteryCount = 0;
        const screenHeight = this.scene.cameras.main.height;
        const midPoint = screenHeight / 2;
        
        // Calculate how many Mystery Bubbles we want (12.5% of total)
        const totalBubbles = allPositions.length;
        const targetMysteryCount = Math.floor(totalBubbles * 0.125);
        const mysteryPerSide = Math.floor(targetMysteryCount / 2);
        
        // Randomly select positions for Mystery Bubbles, ensuring balance
        const mysteryPositions = new Set<number>();
        
        // First, ensure each side gets its fair share
        for (const side of ['player', 'opponent']) {
            let sideCount = 0;
            const maxAttempts = 100; // Prevent infinite loop
            let attempts = 0;
            
            while (sideCount < mysteryPerSide && attempts < maxAttempts) {
                const index = Math.floor(Math.random() * allPositions.length);
                if (!mysteryPositions.has(index)) {
                    const pos = allPositions[index];
                    const isPlayerSide = pos.pixelPos.y > midPoint;
                    
                    if ((side === 'player' && isPlayerSide) || (side === 'opponent' && !isPlayerSide)) {
                        mysteryPositions.add(index);
                        sideCount++;
                    }
                }
                attempts++;
            }
        }
        
        // Create bubbles with balanced Mystery Bubble distribution
        allPositions.forEach((pos, index) => {
            if (mysteryPositions.has(index)) {
                // Always use regular MysteryBubble with texture cache
                const mysteryBubble = new MysteryBubble(this.scene, pos.pixelPos.x, pos.pixelPos.y);
                mysteryBubble.setGridPosition(pos.hexPos);
                this.bubbles.push(mysteryBubble);
                this.gridAttachmentSystem.addGridBubble(mysteryBubble);
                
                // Track distribution
                if (pos.pixelPos.y > midPoint) {
                    playerSideMysteryCount++;
                } else {
                    opponentSideMysteryCount++;
                }
            } else {
                // Create normal bubble
                const bubble = this.getBubbleFromPool();
                if (bubble) {
                    // No initial gems - they come from the objective
                    bubble.reset(pos.pixelPos.x, pos.pixelPos.y, Bubble.getRandomColor(), false);
                    bubble.setGridPosition(pos.hexPos);
                    this.bubbles.push(bubble);
                    this.gridAttachmentSystem.addGridBubble(bubble);
                }
            }
        });
        
        console.log(`Mystery Bubbles distributed - Player side: ${playerSideMysteryCount}, Opponent side: ${opponentSideMysteryCount}`);
        
        // Update objective shield status based on bubbles
        this.updateObjectiveShield();
    }

    private getBubbleFromPool(): Bubble | null {
        const bubble = this.bubblePool.find(b => b.isPooled() || !b.visible);
        if (bubble) {
            const index = this.bubblePool.indexOf(bubble);
            if (index > -1) {
                this.bubblePool.splice(index, 1);
            }
        }
        return bubble || null;
    }

    private returnBubbleToPool(bubble: Bubble): void {
        bubble.returnToPool();
        this.bubblePool.push(bubble);
        
        const index = this.bubbles.indexOf(bubble);
        if (index > -1) {
            this.bubbles.splice(index, 1);
        }
    }

    private createZoneVisuals(): void {
        // All zone visuals removed for cleaner UI
        // Danger zones are now only used for game logic, not visual display
    }

    private toggleDebug(): void {
        this.debugEnabled = !this.debugEnabled;
        
        if (this.debugEnabled) {
            this.showDebugOverlay();
        } else {
            this.hideDebugOverlay();
        }
    }

    private showDebugOverlay(): void {
        if (!this.debugGraphics) {
            this.debugGraphics = this.scene.add.graphics();
            this.debugGraphics.setDepth(Z_LAYERS.DEBUG_OVERLAY);
        }
        
        this.debugGraphics.clear();
        
        // Draw zones with transparent colors
        this.zones.forEach((bounds, zone) => {
            let color = ZONE_COLORS.NEUTRAL;
            switch (zone) {
                case ArenaZone.PLAYER:
                    color = ZONE_COLORS.PLAYER;
                    break;
                case ArenaZone.OPPONENT:
                    color = ZONE_COLORS.OPPONENT;
                    break;
                case ArenaZone.OBJECTIVE:
                    color = ZONE_COLORS.OBJECTIVE;
                    break;
            }
            
            this.debugGraphics!.fillStyle(color, ZONE_COLORS.DEBUG_ALPHA);
            this.debugGraphics!.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
            
            // Add zone labels
            const text = this.scene.add.text(
                bounds.x + 10,
                bounds.y + 10,
                zone.toUpperCase(),
                {
                    fontSize: '14px',
                    color: '#ffffff',
                    backgroundColor: '#000000'
                }
            );
            text.setDepth(Z_LAYERS.DEBUG_OVERLAY + 1);
        });
        
        // Draw hexagonal grid
        this.drawHexGrid();
        
        // Draw bubble connections
        if (this.gridAttachmentSystem && this.debugGraphics) {
            this.gridAttachmentSystem.debugDrawConnections(this.debugGraphics);
        }
    }

    private drawHexGrid(): void {
        if (!this.debugGraphics) return;
        
        this.debugGraphics.lineStyle(1, 0xffffff, 0.3);
        
        const bounds = this.bubbleGrid.getGridBounds();
        for (let q = bounds.minQ; q <= bounds.maxQ; q++) {
            for (let r = bounds.minR; r <= bounds.maxR; r++) {
                const hex: IHexPosition = { q, r, s: -q - r };
                const pixel = this.bubbleGrid.hexToPixel(hex);
                
                // Draw hexagon
                const size = BUBBLE_CONFIG.SIZE / 2;
                const points: number[] = [];
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i;
                    points.push(pixel.x + size * Math.cos(angle));
                    points.push(pixel.y + size * Math.sin(angle));
                }
                
                this.debugGraphics.strokePoints(points, true);
            }
        }
    }

    private hideDebugOverlay(): void {
        if (this.debugGraphics) {
            this.debugGraphics.clear();
        }
        
        // Remove zone labels
        this.scene.children.list.forEach(child => {
            if (child instanceof Phaser.GameObjects.Text && 
                child.getData('isDebugLabel')) {
                child.destroy();
            }
        });
    }

    private updateObjectiveShield(): void {
        // Check if objective still exists (might be null after victory)
        if (!this.objective) return;
        
        // OPTIMIZATION: Use spatial grid for faster neighbor checks
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        const neighbors = this.bubbleGrid.getNeighbors(center);
        
        let hasAdjacentBubbles = false;
        
        // Use the grid attachment system's spatial grid for O(1) lookups
        for (const neighbor of neighbors) {
            // Check if grid position has a bubble (much faster than iterating all bubbles)
            const gridKey = `${neighbor.q},${neighbor.r}`;
            if (this.gridAttachmentSystem.hasGridPosition(gridKey)) {
                hasAdjacentBubbles = true;
                break;
            }
        }
        
        // Only update shield if state changed (reduces unnecessary updates)
        if (hasAdjacentBubbles !== this.cachedShieldState) {
            this.cachedShieldState = hasAdjacentBubbles;
            this.objective.setShielded(hasAdjacentBubbles);
        }
    }

    public getZoneBounds(zone: ArenaZone): IZoneBounds | undefined {
        return this.zones.get(zone);
    }

    public getBubbles(): Bubble[] {
        return this.bubbles;
    }

    public getObjective(): Objective {
        return this.objective;
    }

    public getPlayerLauncher(): Launcher {
        return this.playerLauncher;
    }

    public getOpponentLauncher(): Launcher {
        return this.opponentLauncher;
    }

    public update(time: number, delta: number): void {
        // OPTIMIZATION: Only update input every frame if pointer is active
        const isPointerActive = this.inputManager.isPointerActive();
        if (isPointerActive) {
            this.inputManager.update();
        } else {
            // Check input less frequently when not actively aiming
            this.aimingCheckCounter++;
            if (this.aimingCheckCounter >= this.AIMING_CHECK_INTERVAL * 2) {
                this.aimingCheckCounter = 0;
                this.inputManager.update();
            }
        }
        
        // OPTIMIZATION: Throttle launcher aiming updates
        if (isPointerActive) {
            // Update aiming more frequently when actively aiming
            this.updateLauncherAiming();
        } else {
            // Update less frequently when idle
            if (this.aimingCheckCounter === 0) {
                this.updateLauncherAiming();
            }
        }
        
        // Update shooting system (already optimized internally)
        this.shootingSystem?.update(delta);
        
        // Update power-up systems (only when active)
        this.powerUpActivation?.update(delta);
        
        // OPTIMIZATION: Throttle objective shield checks
        this.shieldCheckCounter++;
        if (this.shieldCheckCounter >= this.SHIELD_CHECK_INTERVAL) {
            this.shieldCheckCounter = 0;
            this.updateObjectiveShield();
        }
        
        // Check danger zone proximity only every N frames for performance
        this.dangerCheckCounter++;
        if (this.dangerCheckCounter >= this.DANGER_CHECK_INTERVAL) {
            this.dangerCheckCounter = 0;
            this.checkDangerZoneProximity();
        }
        
        // Update unified feedback system
        this.unifiedFeedbackSystem?.update(delta);
        
        // Update gem spawn system - DISABLED (gems are now inside bubbles)
        // this.gemSpawnSystem?.update(time, delta);
    }
    
    private updateLauncherAiming(): void {
        // Get angle from launcher to pointer with constraints
        const launcherPos = {
            x: this.playerLauncher.x,
            y: this.playerLauncher.y
        };
        
        const angle = this.inputManager.getAngleFromWithConstraints(
            launcherPos.x,
            launcherPos.y,
            15,  // Min angle from vertical
            165  // Max angle from vertical
        );
        
        // Only update launcher rotation if angle has changed significantly (reduces unnecessary updates)
        const angleDiff = Math.abs(angle - this.lastAimAngle);
        if (angleDiff > 0.5) { // Only update if angle changed by more than 0.5 degrees
            this.playerLauncher.setAimAngle(angle);
            this.lastAimAngle = angle;
        }
        
        // Show aiming feedback when pointer is active
        const isAiming = this.inputManager.isPointerActive();
        this.playerLauncher.showAiming(isAiming);
        
        // DEBUG: Show aim line when debug is enabled
        if (this.debugEnabled && this.debugGraphics) {
            this.debugGraphics.clear();
            this.showDebugOverlay(); // Redraw grid
            
            // Draw aim line
            this.debugGraphics.lineStyle(2, 0x00ff00, 0.8);
            this.debugGraphics.beginPath();
            this.debugGraphics.moveTo(launcherPos.x, launcherPos.y);
            
            // Calculate end point based on angle
            const distance = 200;
            const radians = Phaser.Math.DegToRad(angle - 90);
            const endX = launcherPos.x + Math.cos(radians) * distance;
            const endY = launcherPos.y + Math.sin(radians) * distance;
            
            this.debugGraphics.lineTo(endX, endY);
            this.debugGraphics.strokePath();
        }
    }
    
    private changeAIDifficulty(difficulty: AIDifficulty): void {
        if (!this.aiOpponent) return;
        
        // console.log(`=== Changing AI Difficulty to ${difficulty} ===`);
        
        // Update the static variable to persist difficulty
        ArenaSystem.currentDifficulty = difficulty;
        
        // Stop current AI
        this.aiOpponent.stop();
        
        // Change difficulty  
        this.aiOpponent.setDifficulty(difficulty);
        
        // Restart AI
        this.scene.time.delayedCall(500, () => {
            // console.log(`=== Restarting AI with ${difficulty} ===`);
            this.aiOpponent?.start();
        });
        
        // Show minimal notification
        this.showDifficultyNotification(difficulty);
    }
    
    private showDifficultyNotification(difficulty: AIDifficulty): void {
        // Colors for each difficulty
        const colors = {
            [AIDifficulty.EASY]: '#4CAF50',
            [AIDifficulty.MEDIUM]: '#FFA726', 
            [AIDifficulty.HARD]: '#F44336'
        };
        
        // Create small notification
        const notification = this.scene.add.text(
            this.scene.cameras.main.centerX,
            160,
            `AI: ${difficulty}`,
            {
                fontSize: '18px',
                color: colors[difficulty],
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        notification.setOrigin(0.5);
        notification.setDepth(1500);
        notification.setScale(0);
        
        // Animate in
        this.scene.tweens.add({
            targets: notification,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
        
        // Fade out after short delay
        this.scene.time.delayedCall(1200, () => {
            this.scene.tweens.add({
                targets: notification,
                alpha: 0,
                scale: 0.8,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    notification.destroy();
                }
            });
        });
    }
    
    private onScoreUpdate = (data: { score: number; delta: number; combo?: number; isAI?: boolean; matchSize?: number; x?: number; y?: number; isOrphanBonus?: boolean; bubbleColor?: number }): void => {
        if (this.gameOver) return;
        
        // Use new ScoreEventManager for all scoring
        if (this.scoreEventManager) {
            let context: ScoreContext;
            
            if (data.isOrphanBonus) {
                // Orphan drop event
                context = {
                    type: ScoreEventType.ORPHAN_DROP,
                    baseValue: data.delta,
                    position: { x: data.x || 0, y: data.y || 0 },
                    isPlayer: !data.isAI,
                    bubbleColor: data.bubbleColor,
                    metadata: {
                        dropCount: Math.floor(data.delta / 5) // Assuming 5 points per drop
                    }
                };
            } else if (data.matchSize) {
                // Bubble match event
                context = {
                    type: ScoreEventType.BUBBLE_MATCH,
                    baseValue: data.delta,
                    position: { x: data.x || 0, y: data.y || 0 },
                    matchSize: data.matchSize,
                    isPlayer: !data.isAI,
                    bubbleColor: data.bubbleColor
                };
            } else {
                // Generic score event
                context = {
                    type: ScoreEventType.SPECIAL_BONUS,
                    baseValue: data.delta,
                    position: { x: data.x || 0, y: data.y || 0 },
                    isPlayer: !data.isAI,
                    bubbleColor: data.bubbleColor
                };
            }
            
            this.scoreEventManager.queueEvent(context);
        } else {
            // Fallback to old system if new system not initialized
            let finalScore = data.delta;
            
            if (data.isOrphanBonus) {
                finalScore = data.delta;
            } else if (data.matchSize && this.comboManager) {
                finalScore = this.comboManager.calculateScore(data.matchSize, data.x, data.y, data.bubbleColor);
            }
            
            if (data.isAI) {
                this.aiScore += finalScore;
                this.enhancedScoreDisplay?.updateOpponentScore(this.aiScore);
            } else {
                this.playerScore += finalScore;
                this.enhancedScoreDisplay?.updatePlayerScore(this.playerScore);
            }
        }
    }
    
    private checkChestHit = (bubble: Bubble): void => {
        if (this.gameOver || !this.objective || !bubble.visible) return;
        
        // Check if bubble hit the chest during flight
        const distance = Phaser.Math.Distance.Between(
            bubble.x, bubble.y,
            this.objective.x, this.objective.y
        );
        
        // Direct hit detection - bubble must overlap with chest
        // The chest size is this.config.objectiveSize (60) and bubble is BUBBLE_CONFIG.SIZE (30)
        // So combined radius is (60/2 + 30/2) = 45
        const hitRadius = (this.config.objectiveSize / 2) + (BUBBLE_CONFIG.SIZE / 2);
        
        if (distance < hitRadius) {
            const shooter = bubble.getShooter();
            const isPlayer = shooter === 'player';
            
            // Check if we're in space theme (gives gems instead of victory)
            const currentTheme = this.scene.registry.get('gameTheme') || 'ocean';
            if (currentTheme === 'space') {
                // In space theme, hitting objective gives gems, not victory
                this.scene.events.emit('objective-gem-collected', {
                    isPlayer: isPlayer,
                    x: this.objective.x,
                    y: this.objective.y
                });
                
                // Play hit animation on objective
                this.objective.hit();
                
                // Stop and hide the bubble that hit the objective
                bubble.setVisible(false);
                bubble.destroy();
                
                // Remove from bubbles array
                const index = this.bubbles.indexOf(bubble);
                if (index > -1) {
                    this.bubbles.splice(index, 1);
                }
            } else {
                // Normal objective behavior - instant victory
                const playerWins = isPlayer;
                
                // console.log(`🎯 TREASURE CHEST DIRECT HIT by ${shooter}! Distance: ${distance.toFixed(1)} < ${hitRadius}`);
                // console.log(`INSTANT VICTORY for ${playerWins ? 'PLAYER' : 'AI'}!`);
                
                // Call the hit method on the objective to trigger sound and animation
                this.objective.hit();
                
                // Mark game as over immediately to prevent multiple triggers
                this.gameOver = true;
                
                // Stop the bubble
                bubble.setVisible(false);
                
                // Store objective reference before nulling
                const obj = this.objective;
                this.objective = null as any;
                
                // Play victory animation
                obj.playVictoryAnimation(() => {
                    this.triggerGameOver(playerWins);
                });
            }
        }
    }
    
    private checkVictoryCondition = (data: { bubble: Bubble; position: IHexPosition }): void => {
        if (this.gameOver) return;
        
        const bubble = data.bubble;
        
        // Only check bubbles that are actually attached and visible
        if (!bubble.visible || !bubble.getGridPosition()) {
            return;
        }
        
        // Check for defeat conditions (bubbles reaching danger zones)
        const screenHeight = this.scene.cameras.main.height;
        const playerDangerY = screenHeight - DANGER_ZONE_CONFIG.PLAYER_OFFSET;
        const opponentDangerY = DANGER_ZONE_CONFIG.OPPONENT_OFFSET;
        
        // Check if any bubble crossed player's danger line (player loses)
        if (bubble.y > playerDangerY) {
            // console.log('💀 Bubble crossed PLAYER danger line! Player loses!');
            // console.log(`Bubble Y: ${bubble.y}, Danger Line: ${playerDangerY}`);
            this.triggerGameOver(false); // Player loses
            return;
        }
        
        // Check if any bubble crossed opponent's danger line (opponent loses, player wins)
        // Only check for real grid positions, not falling bubbles
        if (bubble.y < opponentDangerY) {
            // Verify this bubble is actually in the grid at this position
            const hexPos = bubble.getGridPosition();
            if (hexPos) {
                const expectedPos = this.bubbleGrid.hexToPixel(hexPos);
                // Check if bubble is actually at its grid position (not falling)
                const distance = Phaser.Math.Distance.Between(bubble.x, bubble.y, expectedPos.x, expectedPos.y);
                
                if (distance < 5) {
                    // Bubble is truly at grid position and in danger zone
                    console.log('💀 Bubble crossed OPPONENT danger line! Opponent loses!');
                    console.log(`Bubble Y: ${bubble.y}, Danger Line: ${opponentDangerY}`);
                    this.triggerGameOver(true); // Player wins
                    return;
                }
            }
        }
    }
    
    private wasAIShot(bubble: Bubble): boolean {
        // Track the last shooter - for now we can check the last shot event
        // This is a simple heuristic: if the bubble was attached high, it likely came from below (player)
        // If attached low, it came from above (AI)
        // Better would be to track shooter in bubble data
        
        // Simple check: was the bubble's initial trajectory downward (AI) or upward (Player)?
        // We'll check based on the position where it attached
        const centerY = this.scene.cameras.main.centerY;
        
        // If bubble is in upper half and moving toward center, likely from AI
        // This is simplified - ideally we'd track the shooter
        return bubble.y < centerY - 100;
    }
    
    private triggerGameOver(playerWins: boolean): void {
        // Already set to true in checkChestHit, but double-check
        if (this.gameOver && (this.victoryScreen || this.defeatScreen)) return;
        
        this.gameOver = true;
        
        // Stop all game systems
        this.scene.physics.pause();
        this.aiOpponent?.stop();
        this.shootingSystem?.destroy();
        
        // Emit game over events for sound system
        if (playerWins) {
            this.scene.events.emit('victory');
        } else {
            this.scene.events.emit('defeat');
        }
        
        // Show appropriate screen
        if (playerWins) {
            console.log('🎉 VICTORY! Player wins!');
            
            // Debug callback functions
            console.log('Creating VictoryScreen with callbacks:');
            console.log('restartGame type:', typeof this.restartGame);
            console.log('returnToMenu type:', typeof this.returnToMenu);
            
            this.victoryScreen = new VictoryScreen(
                this.scene,
                this.playerScore,
                this.restartGame,
                this.returnToMenu
            );
            
            // Camera celebration effect
            this.scene.cameras.main.flash(500, 255, 215, 0);
        } else {
            console.log('💀 DEFEAT! AI wins!');
            
            // Debug callback functions
            console.log('Creating DefeatScreen with callbacks:');
            console.log('restartGame type:', typeof this.restartGame);
            console.log('returnToMenu type:', typeof this.returnToMenu);
            
            this.defeatScreen = new DefeatScreen(
                this.scene,
                this.playerScore,
                this.restartGame,
                this.returnToMenu
            );
            
            // Camera fade effect
            this.scene.cameras.main.fade(500, 0, 0, 0, false);
            this.scene.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.cameras.main.fadeIn(500);
            });
        }
        
        // Fire game over event
        this.scene.events.emit('game-over', { 
            winner: playerWins ? 'player' : 'ai', 
            playerScore: this.playerScore,
            aiScore: this.aiScore
        });
    }
    
    private restartGame = (): void => {
        console.log('🔄 RESTART BUTTON CLICKED!');
        
        try {
            // Prevent multiple clicks
            if (this.isRestarting) {
                console.log('Already restarting, ignoring click');
                return;
            }
            this.isRestarting = true;
            
            console.log('IMMEDIATE RESTART - No fade, direct action');
            
            // Clean up UI elements immediately
            if (this.victoryScreen) {
                this.victoryScreen.destroy();
                this.victoryScreen = undefined;
            }
            if (this.defeatScreen) {
                this.defeatScreen.destroy();
                this.defeatScreen = undefined;
            }
            
            console.log('UI cleaned up, attempting restart methods...');
            
            // Try Phaser method first (immediate)
            console.log('Method 0: Phaser scene destruction and recreation');
            try {
                // Destroy all game objects
                this.scene.children.removeAll(true);
                
                // Reset game state completely
                this.gameOver = false;
                this.playerScore = 0;
                this.aiScore = 0;
                this.isRestarting = false;
                
                // Restart the scene using scene manager
                const sceneKey = this.scene.scene.key;
                console.log('Restarting scene with key:', sceneKey);
                
                this.scene.scene.restart();
                
                console.log('✅ Phaser restart method attempted');
                
            } catch (phaserError) {
                console.error('Phaser restart failed:', phaserError);
                
                // Fallback to page reload methods
                console.log('Fallback: Attempting page reload methods...');
                
                // Method 1: Force reload with timestamp
                console.log('Method 1: Force reload with timestamp');
                window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
                
                // Method 2: Backup - traditional reload after delay
                setTimeout(() => {
                    console.log('Method 2: Traditional reload backup');
                    window.location.reload();
                }, 100);
            }
            
        } catch (error) {
            console.error('❌ Error in restartGame, trying alternative methods:', error);
            
            // Try alternative reload methods
            try {
                console.log('Emergency reload attempt 1: document.location.reload()');
                (document.location as any).reload(true);
            } catch (e2) {
                console.log('Emergency reload attempt 2: history manipulation');
                window.history.go(0);
            }
        }
    }
    
    private returnToMenu = (): void => {
        console.log('🏠 MENU BUTTON CLICKED!');
        
        try {
            // Prevent multiple clicks
            if (this.isRestarting) {
                console.log('Already transitioning, ignoring click');
                return;
            }
            this.isRestarting = true;
            
            console.log('MENU - Using same method as Try Again (works!)');
            
            // Clean up UI elements immediately
            if (this.victoryScreen) {
                this.victoryScreen.destroy();
                this.victoryScreen = undefined;
            }
            if (this.defeatScreen) {
                this.defeatScreen.destroy();
                this.defeatScreen = undefined;
            }
            
            console.log('UI cleaned up for menu, using restart method...');
            
            // Use the EXACT same method that works for Try Again
            try {
                // Destroy all game objects
                this.scene.children.removeAll(true);
                
                // Reset game state completely
                this.gameOver = false;
                this.playerScore = 0;
                this.aiScore = 0;
                this.isRestarting = false;
                
                // Restart the scene using scene manager
                const sceneKey = this.scene.scene.key;
                console.log('Menu: Restarting scene with key:', sceneKey);
                
                this.scene.scene.restart();
                
                console.log('✅ Menu using restart method (same as Try Again)');
                
            } catch (phaserError) {
                console.error('Menu restart failed:', phaserError);
                
                // Same fallback as Try Again
                console.log('Menu Fallback: Force reload...');
                window.location.href = window.location.href.split('?')[0] + '?t=' + Date.now();
            }
            
        } catch (error) {
            console.error('❌ Error in returnToMenu:', error);
            // Force restart as last resort
            window.location.reload();
        }
    }
    
    private checkDangerZoneProximity(): void {
        if (this.gameOver) return;
        
        const screenHeight = this.scene.cameras.main.height;
        const playerDangerY = screenHeight - DANGER_ZONE_CONFIG.PLAYER_OFFSET;
        const opponentDangerY = DANGER_ZONE_CONFIG.OPPONENT_OFFSET;
        
        let nearDanger = false;
        const warningDistance = 40; // Start warning when bubbles are within 40 pixels
        
        // Check all grid bubbles
        const gridBubbles = this.gridAttachmentSystem.getGridBubbles();
        
        // Use more efficient iteration with early exit
        for (let i = 0; i < gridBubbles.length; i++) {
            const bubble = gridBubbles[i];
            if (!bubble.visible) continue;
            
            // Check proximity to player danger zone
            const playerDistance = playerDangerY - bubble.y;
            if (playerDistance < warningDistance && playerDistance > 0) {
                nearDanger = true;
                this.activateDangerWarning(this.playerDangerLine, true);
                break; // Exit early once we find danger
            }
            
            // Check proximity to opponent danger zone
            const opponentDistance = bubble.y - opponentDangerY;
            if (opponentDistance < warningDistance && opponentDistance > 0) {
                nearDanger = true;
                this.activateDangerWarning(this.opponentDangerLine, false);
                break; // Exit early once we find danger
            }
        }
        
        // Deactivate warning if no bubbles are near danger
        if (!nearDanger && this.dangerWarningActive) {
            this.deactivateDangerWarning();
        }
    }
    
    private activateDangerWarning(dangerLine: Phaser.GameObjects.Graphics | undefined, isPlayer: boolean): void {
        if (!dangerLine || this.dangerWarningActive) return;
        
        this.dangerWarningActive = true;
        
        // Emit danger warning event for sound system
        this.scene.events.emit('danger-warning', { isPlayer });
        
        // Pulse animation for danger line
        this.scene.tweens.add({
            targets: dangerLine,
            alpha: { from: 0.6, to: 1 },
            duration: DANGER_ZONE_CONFIG.PULSE_DURATION / 2,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Flash effect for player only
        if (isPlayer) {
            this.scene.cameras.main.flash(200, 255, 0, 0, false);
        }
    }
    
    private deactivateDangerWarning(): void {
        this.dangerWarningActive = false;
        
        // Stop animations
        if (this.playerDangerLine) {
            this.scene.tweens.killTweensOf(this.playerDangerLine);
            this.playerDangerLine.setAlpha(1);
        }
        
        if (this.opponentDangerLine) {
            this.scene.tweens.killTweensOf(this.opponentDangerLine);
            this.opponentDangerLine.setAlpha(1);
        }
    }
    
    /**
     * Get all active bubbles in the arena
     * Used by RowSpawnSystem to shift bubbles
     */
    public getAllBubbles(): Bubble[] {
        return this.bubbles.filter(b => b.visible && !b.isPooled());
    }

    /**
     * Create a bubble at a specific position
     * Used by RowSpawnSystem to add new rows
     */
    public createBubbleAt(x: number, y: number, color: BubbleColor): Bubble | null {
        let bubble = this.getBubbleFromPool();
        
        // If no bubble in pool, create a new one
        if (!bubble) {
            console.log('ArenaSystem: Pool exhausted, creating new bubble');
            // No gems in shot bubbles - gems only come from objective
            bubble = new Bubble(this.scene, x, y, color, false);
        } else {
            // No gems in shot bubbles - gems only come from objective
            bubble.reset(x, y, color, false);
        }

        bubble.setVisible(true);
        bubble.setActive(true);
        
        this.bubbles.push(bubble);
        
        return bubble;
    }

    private handleObjectiveGemCollected(data: { isPlayer: boolean; x: number; y: number }): void {
        // Give gem directly to the player/AI who hit the objective
        if (data.isPlayer && this.gemCollectionSystem) {
            // Add gem to player
            this.scene.events.emit('gems-updated', {
                playerGems: (this.gemCollectionSystem as any).playerGems + 1,
                opponentGems: (this.gemCollectionSystem as any).opponentGems,
                total: (this.gemCollectionSystem as any).totalGemsCollected + 1
            });
        } else if (!data.isPlayer && this.gemCollectionSystem) {
            // Add gem to opponent
            this.scene.events.emit('gems-updated', {
                playerGems: (this.gemCollectionSystem as any).playerGems,
                opponentGems: (this.gemCollectionSystem as any).opponentGems + 1,
                total: (this.gemCollectionSystem as any).totalGemsCollected + 1
            });
        }
        
        // Visual feedback - spawn a gem that flies to the scorer
        const targetY = data.isPlayer ? this.scene.cameras.main.height - 50 : 50;
        const targetX = data.isPlayer ? 100 : this.scene.cameras.main.width - 100;
        
        const flyingGem = this.scene.add.star(data.x, data.y, 6, 8, 12, 0xFFD700);
        flyingGem.setDepth(2000);
        
        this.scene.tweens.add({
            targets: flyingGem,
            x: targetX,
            y: targetY,
            scale: 0.5,
            duration: 800,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                flyingGem.destroy();
            }
        });
    }
    
    private handleBubbleGemCollected(data: { x: number; y: number; gemType: string; isPlayer: boolean }): void {
        // Give gem to the player who popped the bubble
        if (data.isPlayer && this.gemCollectionSystem) {
            // Add gem to player
            const gemsToAdd = data.gemType === 'golden' ? 2 : 1;
            this.scene.events.emit('gems-updated', {
                playerGems: (this.gemCollectionSystem as any).playerGems + gemsToAdd,
                opponentGems: (this.gemCollectionSystem as any).opponentGems,
                total: (this.gemCollectionSystem as any).totalGemsCollected + gemsToAdd
            });
        } else if (!data.isPlayer && this.gemCollectionSystem) {
            // Add gem to opponent
            const gemsToAdd = data.gemType === 'golden' ? 2 : 1;
            this.scene.events.emit('gems-updated', {
                playerGems: (this.gemCollectionSystem as any).playerGems,
                opponentGems: (this.gemCollectionSystem as any).opponentGems + gemsToAdd,
                total: (this.gemCollectionSystem as any).totalGemsCollected + gemsToAdd
            });
        }
        
        // Create flying gem animation
        this.createFlyingGemAnimation(data.x, data.y, data.isPlayer);
    }
    
    private createFlyingGemAnimation(x: number, y: number, isPlayer: boolean): void {
        // Visual feedback - spawn a gem that flies to the scorer
        const targetY = isPlayer ? this.scene.cameras.main.height - 50 : 50;
        const targetX = isPlayer ? 100 : this.scene.cameras.main.width - 100;
        
        const flyingGem = this.scene.add.star(x, y, 6, 8, 12, 0xFFD700);
        flyingGem.setDepth(2000);
        
        this.scene.tweens.add({
            targets: flyingGem,
            x: targetX,
            y: targetY,
            scale: 0.5,
            duration: 800,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                flyingGem.destroy();
            }
        });
    }
    
    private startObjectiveGemThrowing(): void {
        // Every 8-12 seconds, the objective throws gems to random bubbles
        this.objectiveGemTimer = this.scene.time.addEvent({
            delay: Phaser.Math.Between(8000, 12000),
            callback: () => {
                this.throwGemsFromObjective();
                // Schedule next throw
                this.objectiveGemTimer = this.scene.time.addEvent({
                    delay: Phaser.Math.Between(8000, 12000),
                    callback: () => this.throwGemsFromObjective(),
                    loop: false
                });
            },
            loop: false
        });
    }
    
    private throwGemsFromObjective(): void {
        if (!this.objective || this.gameOver) return;
        
        // Get all visible bubbles without gems
        const eligibleBubbles: Bubble[] = [];
        const playerBubbles: Bubble[] = [];
        const opponentBubbles: Bubble[] = [];
        
        this.gridAttachmentSystem.getGridBubbles().forEach(bubble => {
            if (bubble.visible && !bubble.getHasGem()) {
                eligibleBubbles.push(bubble);
                // Separate by zone
                if (bubble.y > this.scene.cameras.main.centerY) {
                    playerBubbles.push(bubble);
                } else {
                    opponentBubbles.push(bubble);
                }
            }
        });
        
        if (eligibleBubbles.length === 0) return;
        
        // Decide how many gems to throw (2-4)
        const gemCount = Phaser.Math.Between(2, 4);
        
        // Try to distribute fairly between player and opponent
        const playerGems = Math.floor(gemCount / 2);
        const opponentGems = gemCount - playerGems;
        
        // Select target bubbles
        const targetBubbles: Bubble[] = [];
        
        // Add player bubbles
        for (let i = 0; i < playerGems && playerBubbles.length > 0; i++) {
            const index = Phaser.Math.Between(0, playerBubbles.length - 1);
            targetBubbles.push(playerBubbles[index]);
            playerBubbles.splice(index, 1);
        }
        
        // Add opponent bubbles
        for (let i = 0; i < opponentGems && opponentBubbles.length > 0; i++) {
            const index = Phaser.Math.Between(0, opponentBubbles.length - 1);
            targetBubbles.push(opponentBubbles[index]);
            opponentBubbles.splice(index, 1);
        }
        
        // If not enough bubbles in one zone, use from the other
        while (targetBubbles.length < gemCount && eligibleBubbles.length > 0) {
            const index = Phaser.Math.Between(0, eligibleBubbles.length - 1);
            if (!targetBubbles.includes(eligibleBubbles[index])) {
                targetBubbles.push(eligibleBubbles[index]);
            }
            eligibleBubbles.splice(index, 1);
        }
        
        // Create throwing animation for each target bubble
        targetBubbles.forEach((bubble, index) => {
            this.scene.time.delayedCall(index * 200, () => {
                this.animateGemThrow(bubble);
            });
        });
        
        // Play a special sound/effect when throwing gems
        this.playObjectiveGemThrowEffect();
    }
    
    private animateGemThrow(targetBubble: Bubble): void {
        if (!this.objective) return;
        
        // Create a gem at the objective position
        const gem = this.scene.add.star(
            this.objective.x,
            this.objective.y,
            6, 8, 12, 0xFFD700
        );
        gem.setDepth(1500);
        gem.setScale(0.5);
        
        // Create sparkle trail
        const particles = this.scene.add.particles(this.objective.x, this.objective.y, 'flares', {
            frame: 'yellow',
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.8, end: 0 },
            speed: { min: 20, max: 40 },
            lifespan: 600,
            frequency: 30,
            follow: gem
        });
        
        // Animate the gem flying to the bubble with an arc
        const midX = (this.objective.x + targetBubble.x) / 2;
        const midY = Math.min(this.objective.y, targetBubble.y) - 100; // Arc height
        
        this.scene.tweens.add({
            targets: gem,
            x: targetBubble.x,
            y: targetBubble.y,
            duration: 1000,
            ease: 'Cubic.easeInOut',
            onUpdate: (tween) => {
                // Create arc motion
                const progress = tween.progress;
                if (progress < 0.5) {
                    // First half - move up
                    const t = progress * 2;
                    gem.y = Phaser.Math.Linear(this.objective.y, midY, t);
                    gem.x = Phaser.Math.Linear(this.objective.x, midX, t);
                } else {
                    // Second half - move down
                    const t = (progress - 0.5) * 2;
                    gem.y = Phaser.Math.Linear(midY, targetBubble.y, t);
                    gem.x = Phaser.Math.Linear(midX, targetBubble.x, t);
                }
                
                // Rotate the gem
                gem.angle += 5;
            },
            onComplete: () => {
                // Add gem to the bubble
                targetBubble.setGem(true, Math.random() < 0.1 ? 'golden' : 'normal');
                
                // Flash effect on bubble
                this.scene.tweens.add({
                    targets: targetBubble,
                    scale: 1.2,
                    duration: 200,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
                
                // Cleanup
                gem.destroy();
                particles.destroy();
            }
        });
    }
    
    private playObjectiveGemThrowEffect(): void {
        if (!this.objective) return;
        
        // Flash the objective
        this.scene.tweens.add({
            targets: this.objective,
            scale: 1.1,
            duration: 300,
            yoyo: true,
            ease: 'Back.easeOut'
        });
        
        // Create burst particles around objective
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const sparkle = this.scene.add.circle(
                this.objective.x + Math.cos(angle) * 20,
                this.objective.y + Math.sin(angle) * 20,
                3, 0xFFD700
            );
            sparkle.setDepth(1400);
            
            this.scene.tweens.add({
                targets: sparkle,
                x: this.objective.x + Math.cos(angle) * 60,
                y: this.objective.y + Math.sin(angle) * 60,
                scale: 0,
                alpha: 0,
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    sparkle.destroy();
                }
            });
        }
    }
    
    public destroy(): void {
        // Clean up gem timer
        if (this.objectiveGemTimer) {
            this.objectiveGemTimer.destroy();
            this.objectiveGemTimer = undefined;
        }
        
        // Clean up particle systems
        if (this.spaceParticles) {
            this.spaceParticles.destroy();
            this.spaceParticles = undefined;
        }
        if (this.oceanParticles) {
            this.oceanParticles.destroy();
            this.oceanParticles = undefined;
        }
        
        this.inputManager?.destroy();
        this.shootingSystem?.destroy();
        this.gridAttachmentSystem?.clearGrid();
        this.matchDetectionSystem?.reset();
        this.aiOpponent?.destroy();
        this.bubbles.forEach(bubble => bubble.destroy());
        this.bubblePool.forEach(bubble => bubble.destroy());
        this.objective?.destroy();
        this.playerLauncher?.destroy();
        this.opponentLauncher?.destroy();
        this.debugGraphics?.destroy();
        this.enhancedScoreDisplay?.destroy();
        this.comboManager?.reset();
        this.scoreEventManager?.destroy();
        this.unifiedFeedbackSystem?.destroy();
        this.paintSplatterSystem?.destroy();
        this.victoryScreen?.destroy();
        this.defeatScreen?.destroy();
        // this.playerPowerUpInventory?.destroy(); // Arsenal now integrated in Launcher
        // this.opponentPowerUpInventory?.destroy(); // No longer created
        
        // Remove event listeners
        this.scene.events.off('score-update', this.onScoreUpdate, this);
        this.scene.events.off('bubble-attached', this.checkVictoryCondition, this);
        this.scene.events.off('bubble-position-update', this.checkChestHit, this);
    }
    
    /**
     * Get paint splatter system for configuration or monitoring
     */
    public getPaintSplatterSystem(): PaintSplatterSystem | undefined {
        return this.paintSplatterSystem;
    }
    
    /**
     * Set graphics quality preset (affects paint splatters and other visual effects)
     */
    public setGraphicsQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
        // Update paint splatter quality
        this.paintSplatterSystem?.setQualityPreset(quality);
        
        // Could update other visual systems here in the future
        console.log(`Graphics quality set to: ${quality}`);
    }
}