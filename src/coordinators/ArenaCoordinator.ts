/**
 * ArenaCoordinator - Main coordinator for the game arena
 * Replaces the monolithic ArenaSystem with a clean, modular architecture
 * Manages and coordinates all game subsystems
 */

import { Scene } from 'phaser';
import { SystemRegistry } from '@/core/SystemRegistry';
import { GameEventBus } from '@/core/EventBus';
import { GameStateManager } from '@/core/GameStateManager';
import { Bubble } from '@/gameObjects/Bubble';

// Managers
import { BubbleManager } from '@/managers/BubbleManager';
import { GameFlowManager } from '@/managers/GameFlowManager';
import { LauncherManager } from '@/managers/LauncherManager';
import { UIManager } from '@/managers/UIManager';
import { VisualManager } from '@/managers/VisualManager';
import { ObjectiveManager } from '@/managers/ObjectiveManager';

// Existing Systems
import { BubbleGrid } from '@/systems/gameplay/BubbleGrid';
import { ShootingSystem } from '@/systems/gameplay/ShootingSystem';
import { GridAttachmentSystem } from '@/systems/gameplay/GridAttachmentSystem';
import { MatchDetectionSystem } from '@/systems/gameplay/MatchDetectionSystem';
import { AIOpponentSystem, AIDifficulty } from '@/systems/gameplay/AIOpponentSystem';
import { ComboManager } from '@/systems/gameplay/ComboManager';
import { PowerUpActivationSystem } from '@/systems/powerups/PowerUpActivationSystem';
import { ResetSystem } from '@/systems/gameplay/ResetSystem';
import { VictorySystem } from '@/systems/gameplay/VictorySystem';
import { CascadeSystem } from '@/systems/gameplay/CascadeSystem';
import { RowSpawnSystem } from '@/systems/gameplay/RowSpawnSystem';
import { GemCollectionSystem } from '@/systems/gameplay/GemCollectionSystem';
import { InputManager } from '@/systems/input/InputManager';
import { ScoreEventManager } from '@/systems/scoring/ScoreEventManager';
import { UnifiedFeedbackSystem } from '@/systems/scoring/UnifiedFeedbackSystem';
import { PaintSplatterSystem } from '@/systems/visual/PaintSplatterSystem';
import { RealSoundSystem } from '@/systems/audio/RealSoundSystem';

// Configuration
import { ARENA_CONFIG } from '@/config/ArenaConfig';

// Types
import { IHexPosition } from '@/types/ArenaTypes';

// UI
import { VictoryScreen } from '@/ui/VictoryScreen';
import { DefeatScreen } from '@/ui/DefeatScreen';
import { TieScreen } from '@/ui/TieScreen';

export class ArenaCoordinator {
    private scene: Scene;
    private systemRegistry: SystemRegistry;
    private eventBus: GameEventBus;
    private gameState: GameStateManager;
    
    // Core Systems
    public bubbleGrid: BubbleGrid;
    private inputManager: InputManager;
    
    // Managers
    private bubbleManager: BubbleManager;
    private gameFlowManager: GameFlowManager;
    private launcherManager: LauncherManager;
    private uiManager: UIManager;
    private visualManager: VisualManager;
    private objectiveManager: ObjectiveManager;
    
    // Gameplay Systems
    public shootingSystem: ShootingSystem;
    public gridAttachmentSystem: GridAttachmentSystem;
    public matchDetectionSystem: MatchDetectionSystem;
    public aiOpponentSystem: AIOpponentSystem;
    public comboManager: ComboManager;
    public powerUpSystem: PowerUpActivationSystem;
    public resetSystem: ResetSystem;
    public victorySystem: VictorySystem;
    
    // Compatibility property for RowSpawnSystem
    public bubbles: Bubble[] = [];
    public cascadeSystem: CascadeSystem;
    public rowSpawnSystem: RowSpawnSystem;
    public gemCollectionSystem: GemCollectionSystem;
    
    // Scoring Systems
    private scoreEventManager: ScoreEventManager;
    private unifiedFeedbackSystem: UnifiedFeedbackSystem;
    
    // Visual Systems
    private paintSplatterSystem: PaintSplatterSystem;
    
    // Audio System
    private soundSystem: RealSoundSystem;
    
    // Objective System
    private objective?: any;
    
    // Danger Zone System (from original ArenaSystem)
    private playerDangerLine?: Phaser.GameObjects.Graphics;
    private opponentDangerLine?: Phaser.GameObjects.Graphics;
    private dangerWarningActive: boolean = false;
    private dangerCheckCounter: number = 0;
    private readonly DANGER_CHECK_INTERVAL: number = 10;
    
    // Objective Shield System (from original ArenaSystem)
    private shieldCheckCounter: number = 0;
    private readonly SHIELD_CHECK_INTERVAL: number = 15; // Check every 15 frames
    private cachedShieldState: boolean = false;
    
    // State
    private isInitialized: boolean = false;
    private isSinglePlayer: boolean = true;
    
    // Victory/Defeat Screens
    private victoryScreen?: VictoryScreen;
    private defeatScreen?: DefeatScreen;
    private tieScreen?: TieScreen;
    public isGameEnded: boolean = false;
    
    // Objective hit tracking for incremental gems
    private objectiveHitCount: number = 0;
    private lastObjectiveHitTime: number = 0;
    private readonly OBJECTIVE_HIT_RESET_TIME: number = 3000; // Reset combo after 3 seconds
    
    // Debug: Track gem collection calls
    private gemCollectionCallCount: number = 0;
    
    // Reset system tracking
    private resetInProgress: boolean = false;
    private lastResetTime: number = 0;
    
    // Game timer
    private gameStartTime: number = 0;
    private gameElapsedTime: number = 0;
    private suddenDeathTriggered: boolean = false;
    private readonly GAME_DURATION: number = 180000; // 3 minutes
    private readonly SUDDEN_DEATH_TIME: number = 150000; // 2:30 for sudden death
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Initialize core systems
        this.systemRegistry = SystemRegistry.create(scene);
        this.eventBus = GameEventBus.getInstance();
        this.gameState = GameStateManager.getInstance();
        
        // Initialize bubble grid at center
        const centerX = scene.cameras.main.centerX;
        const centerY = scene.cameras.main.centerY;
        this.bubbleGrid = new BubbleGrid(centerX, centerY);
        
        // Initialize input
        this.inputManager = new InputManager(scene);
        
    }
    
    /**
     * Initialize all game systems
     */
    public async initialize(singlePlayer: boolean = true, difficulty: AIDifficulty = AIDifficulty.MEDIUM): Promise<void> {
        if (this.isInitialized) {
            console.warn('ArenaCoordinator already initialized');
            return;
        }
        
        this.isSinglePlayer = singlePlayer;
        
        // Reset game state
        this.gameState.resetGame();
        this.gameState.setGameState('menu');
        
        // CRITICAL: Reset objective combo counter to prevent carryover from previous games
        this.objectiveHitCount = 0;
        this.lastObjectiveHitTime = 0;
        
        // Initialize managers
        await this.initializeManagers();
        
        // Initialize gameplay systems
        await this.initializeGameplaySystems(difficulty);
        
        // Initialize scoring systems
        await this.initializeScoringSystem();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start game
        this.startGame();
        
        this.isInitialized = true;
        this.gameState.setGameState('playing');
        
    }
    
    /**
     * Initialize manager systems
     */
    private async initializeManagers(): Promise<void> {
        // Initialize BubbleManager
        this.bubbleManager = this.systemRegistry.getSystem('BubbleManager') as BubbleManager;
        if (!this.bubbleManager) {
            this.bubbleManager = new BubbleManager(this.scene);
            this.systemRegistry.register(this.bubbleManager);
        }
        
        // Initialize GameFlowManager
        this.gameFlowManager = this.systemRegistry.getSystem('GameFlowManager') as GameFlowManager;
        if (!this.gameFlowManager) {
            this.gameFlowManager = new GameFlowManager(this.scene);
            this.systemRegistry.register(this.gameFlowManager);
        }
        
        // Initialize LauncherManager
        this.launcherManager = this.systemRegistry.getSystem('LauncherManager') as LauncherManager;
        if (!this.launcherManager) {
            this.launcherManager = new LauncherManager(this.scene);
            this.systemRegistry.register(this.launcherManager);
        }
        
        // Initialize UIManager
        this.uiManager = this.systemRegistry.getSystem('UIManager') as UIManager;
        if (!this.uiManager) {
            this.uiManager = new UIManager(this.scene);
            this.systemRegistry.register(this.uiManager);
        }
        
        // Initialize VisualManager
        this.visualManager = this.systemRegistry.getSystem('VisualManager') as VisualManager;
        if (!this.visualManager) {
            this.visualManager = new VisualManager(this.scene);
            this.systemRegistry.register(this.visualManager);
        }
        
        // Initialize ObjectiveManager
        this.objectiveManager = this.systemRegistry.getSystem('ObjectiveManager') as ObjectiveManager;
        if (!this.objectiveManager) {
            this.objectiveManager = new ObjectiveManager(this.scene);
            this.systemRegistry.register(this.objectiveManager);
        }
        
        // Initialize all registered systems
        await this.systemRegistry.initializeAll();
        
        // Get objective from ObjectiveManager
        this.objective = this.objectiveManager?.getObjective();
    }
    
    /**
     * Initialize gameplay systems
     */
    private async initializeGameplaySystems(difficulty: AIDifficulty): Promise<void> {
        // Grid Attachment System
        this.gridAttachmentSystem = new GridAttachmentSystem(
            this.scene,
            this.bubbleGrid
        );
        
        // Match Detection System
        this.matchDetectionSystem = new MatchDetectionSystem(
            this.scene,
            this.bubbleGrid,
            this.gridAttachmentSystem
        );
        
        // CRITICAL: Set the match detection system reference in GridAttachmentSystem
        this.gridAttachmentSystem.setMatchDetectionSystem(this.matchDetectionSystem);
        
        // Shooting System
        this.shootingSystem = new ShootingSystem(
            this.scene,
            this.inputManager,
            this.launcherManager.getPlayerLauncher(),
            this.gridAttachmentSystem,
            this.bubbleGrid
        );
        
        // Set opponent launcher for shooting system (line 346 in original ArenaSystem)
        this.shootingSystem.setOpponentLauncher(this.launcherManager.getOpponentLauncher());
        
        // AI Opponent System (if single player)
        if (this.isSinglePlayer) {
            this.aiOpponentSystem = new AIOpponentSystem(
                this.scene,
                this.launcherManager.getOpponentLauncher()
            );
            // Set difficulty
            this.aiOpponentSystem.setDifficulty(difficulty);
        }
        
        // Combo Manager
        this.comboManager = new ComboManager(this.scene);
        
        // Connect ComboManager to MatchDetectionSystem
        this.matchDetectionSystem.setComboManager(this.comboManager);
        
        // Cascade System
        this.cascadeSystem = new CascadeSystem(
            this.scene,
            this.gridAttachmentSystem
        );
        
        // Reset System
        this.resetSystem = new ResetSystem(
            this.scene,
            this.gridAttachmentSystem
        );
        
        // Initialize sound system
        this.soundSystem = new RealSoundSystem(this.scene);
        
        // Initialize visual effects systems with EXACT config from original
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
        
        // Victory System
        this.victorySystem = new VictorySystem(
            this.scene
        );
        
        // Row Spawn System
        this.rowSpawnSystem = new RowSpawnSystem(
            this.scene,
            this // Pass coordinator instead of arena system
        );
        
        // Gem Collection System
        this.gemCollectionSystem = new GemCollectionSystem(this.scene);
        
        // Power-up System
        this.powerUpSystem = new PowerUpActivationSystem(
            this.scene,
            this.shootingSystem,
            this.gridAttachmentSystem,
            this.matchDetectionSystem
        );
        
    }
    
    /**
     * Initialize scoring and feedback systems
     */
    private async initializeScoringSystem(): Promise<void> {
        this.scoreEventManager = new ScoreEventManager(this.scene);
        this.unifiedFeedbackSystem = new UnifiedFeedbackSystem(this.scene);
        
        // Connect scoring systems - use UIManager's updateScore method
        this.scoreEventManager.onScoreUpdate((score, isPlayer) => {
            // UIManager expects a data object with score values
            if (isPlayer) {
                this.eventBus.emit('score-update', { player: score });
            } else {
                this.eventBus.emit('score-update', { opponent: score });
            }
        });
        
        this.scoreEventManager.onVisualEffect((result, position) => {
            this.unifiedFeedbackSystem?.queueFeedback(result, position);
        });
        
    }
    
    /**
     * Setup event listeners for system communication
     */
    private setupEventListeners(): void {
        // Game flow events
        this.eventBus.on('game-start', () => this.handleGameStart());
        this.eventBus.on('game-over', (data) => this.handleGameOver(data));
        this.eventBus.on('game-restart', () => this.handleRestart());
        
        // Turn events
        this.eventBus.on('turn-complete', (data) => this.handleTurnComplete(data));
        
        // Bubble events
        this.eventBus.on('bubble-shot', (data) => this.handleBubbleShot(data));
        this.eventBus.on('bubble-attached', (data) => this.handleBubbleAttached(data));
        this.eventBus.on('bubble-destroyed', (data) => this.handleBubbleDestroyed(data));
        // Listen for bubble position updates for objective collision
        this.eventBus.on('bubble-position-update', this.checkChestHit);
        
        // Match events
        this.eventBus.on('match-found', (data) => this.handleMatchFound(data));
        this.eventBus.on('combo-complete', (data) => this.handleComboComplete(data));
        
        // Sound events connection
        this.setupSoundEventListeners();
        
    }
    
    /**
     * Setup sound event listeners
     */
    private setupSoundEventListeners(): void {
        if (!this.soundSystem) return;
        
        // Bubble shoot sound
        this.eventBus.on('bubble-shot', () => {
            this.soundSystem?.playShootSound();
        });
        
        // Bubble attach sound
        this.eventBus.on('bubble-attached', () => {
            this.soundSystem?.playAttachSound();
        });
        
        // Combo sounds based on size
        this.eventBus.on('match-found', (data: any) => {
            if (data.matchedBubbles && data.matchedBubbles.length >= 3) {
                this.soundSystem?.playComboSound(data.matchedBubbles.length);
            }
        });
        
        // Bubbles drop sound for cascades
        this.eventBus.on('cascade-triggered', () => {
            this.soundSystem?.playBubblesDropSound();
        });
        
        // Arsenal sounds
        this.eventBus.on('arsenal-ready', () => {
            this.soundSystem?.playArsenalSound();
        });
        
        // Victory sound
        this.eventBus.on('game-over', (data: any) => {
            if (data.playerWins) {
                this.soundSystem?.playVictorySound();
            }
        });
        
        // Objective hit sound
        this.scene.events.on('objective-hit', () => {
            this.soundSystem?.playObjectiveHitSound();
        });
        
        // Danger warning sound
        this.scene.events.on('danger-warning', () => {
            this.soundSystem?.playDangerWarningSound();
        });
        
        // Gem collection from bubbles - Remove any existing listeners first to prevent duplicates
        this.scene.events.off('gem-collected-from-bubble');
        this.scene.events.on('gem-collected-from-bubble', (data: any) => {
            this.handleBubbleGemCollected(data);
        });
        
        // Objective gem collection - DISABLED
        // We use checkChestHit for direct objective hits instead
        // to avoid double processing and shared counter issues
        // this.scene.events.on('objective-gem-collected', (data: any) => {
        //     this.handleObjectiveGemCollected(data);
        // });
        
        // Reset system gem removal
        this.scene.events.on('reset-remove-gems', (data: any) => {
            this.handleResetGemRemoval(data);
        });
    }
    
    /**
     * Create initial bubble positions for the starting pattern
     */
    private createInitialBubblePositions(): Array<{ hexPos: IHexPosition; pixelPos: { x: number; y: number } }> {
        const theme = this.scene.registry.get('gameTheme') || 'ocean';
        
        // Use theme-specific pattern
        if (theme === 'space') {
            return this.createSpaceArenaPattern();
        } else {
            return this.createDefaultPattern();
        }
    }
    
    private createDefaultPattern(): Array<{ hexPos: IHexPosition; pixelPos: { x: number; y: number } }> {
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        const positions: Array<{ hexPos: IHexPosition; pixelPos: { x: number; y: number } }> = [];
        const positionSet = new Set<string>();
        
        // Helper to add position without duplicates
        const addPosition = (hexPos: IHexPosition) => {
            const key = `${hexPos.q},${hexPos.r}`;
            if (!positionSet.has(key)) {
                positionSet.add(key);
                const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
                positions.push({ hexPos, pixelPos });
            }
        };
        
        // OCEAN THEME - Circular pattern with rings
        // Create 3 rings of bubbles around the objective (guaranteed connected)
        // These rings will be the anchor for all other bubbles
        for (let ring = 1; ring <= 3; ring++) {
            const ringPositions = this.bubbleGrid.getRing(center, ring);
            ringPositions.forEach(pos => addPosition(pos));
        }
        
        // Add outer rows that are guaranteed to connect
        // Top row -4: Only add positions that will connect to r=-3
        for (let q = -3; q <= 3; q++) {
            if (Math.random() < 0.8) { // Some variety but most connect
                addPosition({ q, r: -4, s: -q - (-4) });
            }
        }
        
        // Top row -5
        for (let q = -2; q <= 2; q++) {
            if (Math.random() < 0.7) {
                addPosition({ q, r: -5, s: -q - (-5) });
            }
        }
        
        // Bottom row 4: Only add positions that will connect to r=3
        for (let q = -3; q <= 3; q++) {
            if (Math.random() < 0.8) { // Some variety but most connect
                addPosition({ q, r: 4, s: -q - 4 });
            }
        }
        
        // Bottom row 5
        for (let q = -2; q <= 2; q++) {
            if (Math.random() < 0.7) {
                addPosition({ q, r: 5, s: -q - 5 });
            }
        }
        
        // Add side columns for width
        for (let r = -3; r <= 3; r++) {
            if (Math.random() < 0.7) {
                addPosition({ q: -4, r, s: 4 - r });
            }
            if (Math.random() < 0.7) {
                addPosition({ q: 4, r, s: -4 - r });
            }
        }
        
        return positions;
    }
    
    private createSpaceArenaPattern(): Array<{ hexPos: IHexPosition; pixelPos: { x: number; y: number } }> {
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        let allPositions: Array<{ hexPos: IHexPosition; pixelPos: { x: number; y: number } }> = [];
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
        
        // Total: ~100 bubbles
        
        return allPositions;
    }

    /**
     * Start the game
     */
    private startGame(): void {
        
        // Create initial bubbles with theme-specific pattern
        const initialPositions = this.createInitialBubblePositions();
        const bubbles = this.bubbleManager.createFieldPattern(initialPositions);
        
        // CRITICAL: Add all initial bubbles to GridAttachmentSystem for collision detection
        bubbles.forEach(bubble => {
            this.gridAttachmentSystem.addGridBubble(bubble);
        });
        
        // Keep bubbles array in sync for RowSpawnSystem compatibility
        this.bubbles = bubbles;
        
        // Start row spawning
        const theme = this.scene.registry.get('gameTheme') || 'ocean';
        const spawnInterval = theme === 'space' ? 12000 : 15000;
        this.rowSpawnSystem.startSpawning(spawnInterval);
        
        // Start game flow
        this.gameFlowManager.startGame();
        
        // Emit game-start event to trigger all systems including AI
        this.eventBus.emit('game-start');
        
        // Start objective gem throwing for space theme
        if (theme === 'space') {
            this.startObjectiveGemThrowing();
        }
        
        // Initialize game timer
        this.gameStartTime = Date.now();
        this.createTimerDisplay();
    }
    
    /**
     * Create timer display UI
     */
    private createTimerDisplay(): void {
        // Timer is now managed by UIManager
        // This method is kept for compatibility but does nothing
    }
    
    /**
     * Update game timer
     */
    private updateTimer(): void {
        if (this.isGameEnded) return;
        
        // Calculate elapsed time
        this.gameElapsedTime = Date.now() - this.gameStartTime;
        
        // Calculate remaining time (3 minutes total)
        const remainingTime = Math.max(0, this.GAME_DURATION - this.gameElapsedTime);
        
        // Emit timer update event for UIManager to handle display
        this.eventBus.emit('timer-update', {
            elapsed: this.gameElapsedTime,
            remaining: remainingTime,
            total: this.GAME_DURATION
        });
        
        // Check for sudden death (at 2:30)
        if (!this.suddenDeathTriggered && this.gameElapsedTime >= this.SUDDEN_DEATH_TIME) {
            this.suddenDeathTriggered = true;
            this.triggerSuddenDeath();
        }
        
        // Check for time up
        if (remainingTime <= 0 && !this.isGameEnded) {
            this.handleTimeUp();
        }
    }
    
    /**
     * Trigger sudden death mode
     */
    private triggerSuddenDeath(): void {
        console.log('[ArenaCoordinator] SUDDEN DEATH ACTIVATED!');
        
        // Show sudden death notification
        const suddenDeathText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY,
            'SUDDEN DEATH!',
            {
                fontSize: '48px',
                color: '#FF0000',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                stroke: '#FFFFFF',
                strokeThickness: 6
            }
        );
        suddenDeathText.setOrigin(0.5);
        suddenDeathText.setDepth(2000);
        suddenDeathText.setScale(0);
        
        // Animate sudden death text
        this.scene.tweens.add({
            targets: suddenDeathText,
            scale: 2,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: suddenDeathText,
                    scale: 0,
                    alpha: 0,
                    duration: 500,
                    delay: 1000,
                    onComplete: () => suddenDeathText.destroy()
                });
            }
        });
        
        // For now, don't change row spawning to avoid breaking the attach system
        // The visual effect and message are enough for sudden death
        // TODO: Fix row spawn acceleration without breaking game systems
        
        // Camera shake for dramatic effect
        this.scene.cameras.main.shake(500, 0.01);
        
        // Flash screen red
        this.scene.cameras.main.flash(500, 100, 0, 0);
        
        // Emit sudden death event
        this.eventBus.emit('sudden-death');
    }
    
    /**
     * Handle time up - determine winner based on gems
     */
    private handleTimeUp(): void {
        // Prevent multiple calls
        if (this.isGameEnded) {
            return;
        }
        
        console.log('[ArenaCoordinator] TIME UP!');
        
        const playerGems = this.gameState.getPlayerGems();
        const opponentGems = this.gameState.getOpponentGems();
        
        console.log(`[ArenaCoordinator] Time up - Player: ${playerGems} gems, Opponent: ${opponentGems} gems`);
        
        // Check for tie first
        if (playerGems === opponentGems) {
            this.triggerTieGame();
        } else {
            // Determine winner based on gem count
            const playerWins = playerGems > opponentGems;
            this.triggerGameOver(playerWins);
        }
    }
    
    /**
     * Main update loop
     */
    public update(time: number, delta: number): void {
        if (!this.isInitialized) return;
        
        // Update input (always, to track mouse position)
        if (this.inputManager && typeof this.inputManager.update === 'function') {
            this.inputManager.update();
        }
        
        // Update ShootingSystem (MUST be called to move projectiles!)
        // Continue updating even after game ends for animations
        if (this.shootingSystem && typeof this.shootingSystem.update === 'function') {
            this.shootingSystem.update(delta);
        }
        
        // Note: GridAttachmentSystem and MatchDetectionSystem are event-driven
        // They don't have update methods - they respond to events
        
        // Update visual feedback system
        if (this.unifiedFeedbackSystem && typeof this.unifiedFeedbackSystem.update === 'function') {
            this.unifiedFeedbackSystem.update(delta);
        }
        
        // Update other systems
        this.systemRegistry.updateAll(time, delta);
        
        // Only update game progression logic if game hasn't ended
        if (!this.isGameEnded) {
            // Update game timer
            this.updateTimer();
            
            // Check danger zone proximity (from original ArenaSystem)
            this.dangerCheckCounter++;
            if (this.dangerCheckCounter >= this.DANGER_CHECK_INTERVAL) {
                this.dangerCheckCounter = 0;
                this.checkDangerZoneProximity();
            }
            
            // Update objective shield (from original ArenaSystem)
            this.shieldCheckCounter++;
            if (this.shieldCheckCounter >= this.SHIELD_CHECK_INTERVAL) {
                this.shieldCheckCounter = 0;
                this.updateObjectiveShield();
            }
        }
    }
    
    /**
     * Start objective gem throwing system (from original ArenaSystem)
     */
    private startObjectiveGemThrowing(): void {
        // Every 5-8 seconds, the objective throws gems to random bubbles
        const gemTimer = this.scene.time.addEvent({
            delay: 5000, // Initial delay
            callback: () => {
                this.throwGemsFromObjective();
                // Set random next interval between 5-8 seconds
                gemTimer.delay = Phaser.Math.Between(5000, 8000);
            },
            loop: true
        });
        
        // Also throw gems immediately after a short delay
        this.scene.time.delayedCall(2000, () => {
            this.throwGemsFromObjective();
        });
    }
    
    /**
     * Throw gems from objective to random bubbles (from original ArenaSystem)
     */
    private throwGemsFromObjective(): void {
        const objective = this.objectiveManager?.getObjective();
        if (!objective) return;
        
        
        // Get all visible bubbles without gems
        const eligibleBubbles: any[] = [];
        const playerBubbles: any[] = [];
        const opponentBubbles: any[] = [];
        
        const gridBubbles = this.gridAttachmentSystem.getGridBubbles();
        gridBubbles.forEach((bubble: any) => {
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
        
        if (eligibleBubbles.length === 0) {
            return;
        }
        
        // TEST: Throw LOTS of gems to test victory
        const gemCount = 20; // TEST: 20 gems to quickly reach 15!
        
        // Try to distribute fairly between player and opponent
        const playerGems = Math.floor(gemCount / 2);
        const opponentGems = gemCount - playerGems;
        
        // Select target bubbles
        const targetBubbles: any[] = [];
        
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
                this.animateGemThrow(bubble, objective);
            });
        });
        
        // Play objective flash effect
        this.playObjectiveGemThrowEffect(objective);
    }
    
    /**
     * Animate gem flying from objective to bubble (from original ArenaSystem)
     */
    private animateGemThrow(targetBubble: any, objective: any): void {
        // Create a gem at the objective position
        const gem = this.scene.add.star(
            objective.x,
            objective.y,
            6, 8, 12, 0xFFD700
        );
        gem.setDepth(1500);
        gem.setScale(0.5);
        
        // Create sparkle trail
        const sparkles: Phaser.GameObjects.GameObject[] = [];
        const sparkleTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: 20,
            callback: () => {
                const sparkle = this.scene.add.circle(
                    gem.x + Phaser.Math.Between(-5, 5),
                    gem.y + Phaser.Math.Between(-5, 5),
                    Phaser.Math.Between(1, 3),
                    0xFFD700,
                    0.8
                );
                sparkle.setDepth(1400);
                sparkles.push(sparkle);
                
                this.scene.tweens.add({
                    targets: sparkle,
                    scale: 0,
                    alpha: 0,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => {
                        sparkle.destroy();
                    }
                });
            }
        });
        
        // Animate the gem flying with arc
        const midX = (objective.x + targetBubble.x) / 2;
        const midY = Math.min(objective.y, targetBubble.y) - 100; // Arc height
        
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
                    gem.y = Phaser.Math.Linear(objective.y, midY, t);
                    gem.x = Phaser.Math.Linear(objective.x, midX, t);
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
                sparkleTimer.destroy();
                sparkles.forEach(s => s.destroy());
            }
        });
    }
    
    /**
     * Play objective gem throw visual effect (from original ArenaSystem)
     */
    private playObjectiveGemThrowEffect(objective: any): void {
        // Flash the objective
        this.scene.tweens.add({
            targets: objective,
            scale: 1.1,
            duration: 300,
            yoyo: true,
            ease: 'Back.easeOut'
        });
        
        // Create burst particles around objective
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const sparkle = this.scene.add.circle(
                objective.x + Math.cos(angle) * 20,
                objective.y + Math.sin(angle) * 20,
                3, 0xFFD700
            );
            sparkle.setDepth(1400);
            
            this.scene.tweens.add({
                targets: sparkle,
                x: objective.x + Math.cos(angle) * 60,
                y: objective.y + Math.sin(angle) * 60,
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
    
    /**
     * Check danger zone proximity (from original ArenaSystem)
     */
    private checkDangerZoneProximity(): void {
        const screenHeight = this.scene.cameras.main.height;
        const playerDangerY = screenHeight - 120 * 2.2; // DANGER_ZONE_CONFIG.PLAYER_OFFSET
        const opponentDangerY = 120 * 2.2; // DANGER_ZONE_CONFIG.OPPONENT_OFFSET
        
        let nearDanger = false;
        let playerInDanger = false;
        let opponentInDanger = false;
        const warningDistance = 40; // Start warning when bubbles are within 40 pixels
        const crossedDistance = 0; // When bubble crosses the danger zone
        
        // Check all grid bubbles
        const gridBubbles = this.gridAttachmentSystem.getGridBubbles();
        
        for (let i = 0; i < gridBubbles.length; i++) {
            const bubble = gridBubbles[i];
            if (!bubble.visible) continue;
            
            // Check proximity to player danger zone
            const playerDistance = playerDangerY - bubble.y;
            if (playerDistance < crossedDistance) {
                // Bubble crossed player danger zone!
                playerInDanger = true;
            } else if (playerDistance < warningDistance && playerDistance > 0) {
                nearDanger = true;
                this.activateDangerWarning(this.playerDangerLine, true);
            }
            
            // Check proximity to opponent danger zone
            const opponentDistance = bubble.y - opponentDangerY;
            if (opponentDistance < crossedDistance) {
                // Bubble crossed opponent danger zone!
                opponentInDanger = true;
            } else if (opponentDistance < warningDistance && opponentDistance > 0) {
                nearDanger = true;
                this.activateDangerWarning(this.opponentDangerLine, false);
            }
        }
        
        // Check if ResetSystem should be triggered
        if ((playerInDanger || opponentInDanger) && !this.resetInProgress) {
            const currentTime = Date.now();
            // Prevent multiple resets within 2 seconds
            if (currentTime - this.lastResetTime > 2000) {
                this.resetInProgress = true;
                console.log('[DEBUG] Triggering reset check - Player danger:', playerInDanger, 'Opponent danger:', opponentInDanger);
                // Let ResetSystem handle the check and execute if needed
                this.resetSystem?.checkResetCondition();
                this.lastResetTime = currentTime;
                
                // Reset flag after a short delay
                this.scene.time.delayedCall(1000, () => {
                    this.resetInProgress = false;
                });
            }
        }
        
        // Deactivate warning if no bubbles are near danger
        if (!nearDanger && this.dangerWarningActive) {
            this.deactivateDangerWarning();
        }
    }
    
    /**
     * Activate danger zone warning (from original ArenaSystem)
     */
    private activateDangerWarning(dangerLine: Phaser.GameObjects.Graphics | undefined, isPlayer: boolean): void {
        if (!dangerLine || this.dangerWarningActive) return;
        
        this.dangerWarningActive = true;
        
        // Emit danger warning event for sound system
        this.scene.events.emit('danger-warning', { isPlayer });
        
        // Pulse animation for danger line
        this.scene.tweens.add({
            targets: dangerLine,
            alpha: { from: 0.6, to: 1 },
            duration: 1000 / 2, // DANGER_ZONE_CONFIG.PULSE_DURATION / 2
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Flash effect for player only
        if (isPlayer) {
            this.scene.cameras.main.flash(200, 255, 0, 0, false);
        }
    }
    
    /**
     * Deactivate danger zone warning (from original ArenaSystem)
     */
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
     * Check chest hit (EXACT from original ArenaSystem)
     */
    private checkChestHit = (bubble: any): void => {
        if (this.isGameEnded || !bubble || !bubble.visible) return;
        
        // CRITICAL: Prevent multiple hits from the same bubble
        if (bubble.hasHitObjective) return;
        
        // Get the actual objective object from ObjectiveManager
        const objectiveObj = this.objectiveManager?.getObjective();
        if (!objectiveObj) {
            return;
        }
        
        // Check if bubble hit the chest during flight
        const distance = Phaser.Math.Distance.Between(
            bubble.x, bubble.y,
            objectiveObj.x, objectiveObj.y
        );
        
        // Direct hit detection - bubble must overlap with chest
        // The chest size is config.objectiveSize and bubble is BUBBLE_CONFIG.SIZE  
        const hitRadius = 40; // Use fixed radius for now
        
        if (distance < hitRadius) {
            // Mark bubble as having hit to prevent multiple triggers
            bubble.hasHitObjective = true;
            // Determine if it was player or AI
            const isPlayer = this.isPlayerBubble(bubble);
            
            // Check if combo timer expired
            const currentTime = Date.now();
            const timeSinceLastHit = currentTime - this.lastObjectiveHitTime;
            
            if (timeSinceLastHit > this.OBJECTIVE_HIT_RESET_TIME) {
                this.objectiveHitCount = 0;
            }
            
            // Increment hit count and update timer
            this.objectiveHitCount++;
            this.lastObjectiveHitTime = currentTime;
            
            // Calculate gems awarded based on combo
            const gemsAwarded = Math.min(this.objectiveHitCount, 5); // 1-5 gems based on combo
            
            // Call the hit method on the objective to trigger sound and animation
            if (objectiveObj && objectiveObj.hit) {
                objectiveObj.hit();
            }
            
            // IMPORTANT: Remove bubble from all systems before destroying
            // 1. Remove from grid attachment system if it was attached
            if (this.gridAttachmentSystem && bubble.getGridPosition && bubble.getGridPosition()) {
                this.gridAttachmentSystem.removeGridBubble(bubble);
            }
            
            // 2. Make bubble invisible and inactive immediately
            bubble.setVisible(false);
            bubble.setActive(false);
            
            // 3. Clear its grid position if it has one
            if (bubble.clearGridPosition) {
                bubble.clearGridPosition();
            }
            
            // Defer ALL operations to next frame to avoid physics conflicts
            this.scene.time.delayedCall(1, () => {
                // Return bubble to pool instead of destroying it
                if (bubble && this.bubbleManager) {
                    this.bubbleManager.returnToPool(bubble);
                }
                
                // Award gems
                if (isPlayer) {
                    this.gameState.addPlayerGems(gemsAwarded);
                    // Update registry for ResetSystem
                    this.scene.registry.set('playerGems', this.gameState.getPlayerGems());
                } else {
                    this.gameState.addOpponentGems(gemsAwarded);
                    // Update registry for ResetSystem
                    this.scene.registry.set('opponentGems', this.gameState.getOpponentGems());
                }
                
                // Emit event for UI update
                this.eventBus.emit('gem-collected', {
                    isPlayer,
                    delta: gemsAwarded,
                    x: objectiveObj.x,
                    y: objectiveObj.y
                });
                
                // Show visual effect
                this.showGemCollectEffect(objectiveObj.x, objectiveObj.y, isPlayer);
                
                // Show combo text
                if (this.objectiveHitCount > 1) {
                    const comboText = this.scene.add.text(
                        objectiveObj.x,
                        objectiveObj.y - 50,
                        `COMBO x${this.objectiveHitCount}!\n+${gemsAwarded} GEMS`,
                        {
                            fontSize: '24px',
                            color: '#FFD700',
                            fontStyle: 'bold',
                            align: 'center'
                        }
                    );
                    comboText.setOrigin(0.5);
                    comboText.setDepth(2000);
                    
                    this.scene.tweens.add({
                        targets: comboText,
                        y: comboText.y - 50,
                        alpha: 0,
                        scale: 1.5,
                        duration: 1000,
                        ease: 'Power2',
                        onComplete: () => comboText.destroy()
                    });
                }
                
                // Check for gem-based victory condition (15 gems)
                const playerGems = this.gameState.getPlayerGems();
                const opponentGems = this.gameState.getOpponentGems();
                
                if (playerGems >= 15 && !this.isGameEnded) {
                    this.triggerGameOver(true);
                } else if (opponentGems >= 15 && !this.isGameEnded) {
                    this.triggerGameOver(false);
                }
            });
        }
    }
    
    /**
     * Determine if bubble was shot by player
     */
    private isPlayerBubble(bubble: any): boolean {
        // Use the bubble's shooter property that was set when fired
        if (bubble.getShooter && typeof bubble.getShooter === 'function') {
            const shooter = bubble.getShooter();
            return shooter === 'player';
        }
        
        // Fallback to velocity-based detection if getShooter is not available
        // Player shoots upward (negative velocity.y), AI shoots downward (positive velocity.y)
        if (bubble.body && bubble.body.velocity) {
            const isPlayer = bubble.body.velocity.y < 0;
            return isPlayer;
        }
        
        // Last resort: position-based detection
        const centerY = this.scene.cameras.main.height / 2;
        const isPlayer = bubble.y > centerY;
        return isPlayer;
    }
    
    /**
     * Trigger game over (from original ArenaSystem)
     */
    private triggerGameOver(playerWins: boolean): void {
        
        if (this.isGameEnded || this.victoryScreen || this.defeatScreen) {
            return;
        }
        
        this.isGameEnded = true;
        
        // Reset objective combo immediately to prevent carryover
        this.objectiveHitCount = 0;
        this.lastObjectiveHitTime = 0;
        
        // Keep physics and animations running in the background
        // Do NOT pause physics or stop tweens
        
        // Stop AI from shooting new bubbles
        if (this.aiOpponentSystem) {
            this.aiOpponentSystem.stop();
        }
        
        // Stop row spawning - no new rows
        if (this.rowSpawnSystem) {
            this.rowSpawnSystem.stopSpawning();
        }
        
        // Stop player shooting - block input only
        if (this.shootingSystem) {
            this.shootingSystem.enabled = false;
        }
        
        // Stop objective gem throwing
        // ObjectiveManager doesn't have a stop method, gems will stop when game ends
        
        // Emit game over events for sound system
        this.scene.events.emit('game-over', { 
            playerWins,
            reason: 'time-up'  // Add reason for VictorySystem
        });
        
        // Get current scores
        const playerScore = this.scoreEventManager?.getPlayerScore() || 0;
        
        
        // Show appropriate screen IMMEDIATELY
        if (playerWins) {
            
            // Make sure we don't create multiple screens
            if (this.victoryScreen) {
                return;
            }
            
            try {
                // Play victory sound
                this.scene.sound.play('victory', { volume: 0.7 });
                
                this.victoryScreen = new VictoryScreen(
                    this.scene,
                    playerScore,
                    this.restartGame,
                    this.returnToMenu
                );
                
                
                // Victory screen buttons are already interactive via the backdrop
                // No need to set container interactive
                
                // Camera celebration effect (subtle)
                // flash(duration, r, g, b, force)
                this.scene.cameras.main.flash(300, 255, 215, 0);
            } catch (error) {
                // Failed to create victory screen
            }
        } else {
            
            try {
                // Play defeat sound
                this.scene.sound.play('defeat', { volume: 0.7 });
                
                this.defeatScreen = new DefeatScreen(
                    this.scene,
                    playerScore,
                    this.restartGame,
                    this.returnToMenu
                );
                
                
                // Camera fade effect (subtle)
                // fade(duration, r, g, b, force)
                this.scene.cameras.main.fade(300, 0, 0, 0, false);
                this.scene.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.cameras.main.fadeIn(300);
                });
            } catch (error) {
                // Failed to create defeat screen
            }
        }
    }
    
    /**
     * Trigger tie game
     */
    private triggerTieGame(): void {
        
        if (this.isGameEnded || this.tieScreen) {
            return;
        }
        
        this.isGameEnded = true;
        
        // Stop new input and game progression, but let animations continue
        
        // Stop AI from shooting new bubbles
        if (this.aiOpponentSystem) {
            this.aiOpponentSystem.stop();
        }
        
        // Stop row spawning
        if (this.rowSpawnSystem) {
            this.rowSpawnSystem.stopSpawning();
        }
        
        // Stop player shooting
        if (this.shootingSystem) {
            this.shootingSystem.enabled = false;
        }
        
        // Stop objective gem throwing
        // ObjectiveManager doesn't have a stop method, gems will stop when game ends
        
        // Emit game over event
        this.scene.events.emit('game-tie');
        
        // Get scores
        const playerScore = this.scoreEventManager?.getPlayerScore() || 0;
        const opponentScore = this.scoreEventManager?.getOpponentScore() || 0;
        
        // Show tie screen
        console.log('🤝 Creating Tie Screen...');
        
        try {
            this.tieScreen = new TieScreen(
                this.scene,
                playerScore,
                opponentScore,
                this.restartGame,
                this.returnToMenu
            );
            
            
            
            // No camera effects for tie
        } catch (error) {
            // Failed to create tie screen
        }
    }
    
    /**
     * Update objective shield state (EXACT from original ArenaSystem lines 1717-1742)
     */
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
    
    /**
     * Handle game start event
     */
    private handleGameStart(): void {
        
        // Start AI opponent if in single player mode
        if (this.isSinglePlayer && this.aiOpponentSystem) {
            this.aiOpponentSystem.start();
        }
    }
    
    /**
     * Handle game over event
     */
    private handleGameOver(data: any): void {
        this.gameState.setGameState(data.winner === 'player' ? 'victory' : 'defeat');
    }
    
    /**
     * Restart game (callback for victory/defeat screens)
     */
    private restartGame = (): void => {
        
        // First cleanup everything
        this.cleanup();
        
        // Then restart the scene
        this.scene.scene.restart();
    }
    
    /**
     * Return to menu (callback for victory/defeat screens)
     */
    private returnToMenu = (): void => {
        
        // First cleanup everything
        this.cleanup();
        
        // For now, just restart the scene (can be changed to menu scene later)
        this.scene.scene.restart();
    }
    
    /**
     * Handle game restart
     */
    private handleRestart(): void {
        this.cleanup();
        this.initialize(this.isSinglePlayer);
    }
    
    /**
     * Handle turn complete
     */
    private handleTurnComplete(data: any): void {
        // Row spawning logic will be handled by RowSpawnSystem
    }
    
    /**
     * Handle bubble shot
     */
    private handleBubbleShot(data: any): void {
        this.scoreEventManager?.handleBubbleShot(data);
    }
    
    /**
     * Handle bubble attached
     */
    private handleBubbleAttached(data: any): void {
        // Reset objective hit combo when bubble attaches to grid (not objective)
        // This ensures the combo only counts for consecutive direct hits to objective
        // Reset objective hit combo when bubble attaches to grid (not objective)
        this.objectiveHitCount = 0;
        this.lastObjectiveHitTime = 0;
        
        // Check for matches
        this.matchDetectionSystem?.checkForMatches(data.bubble);
    }
    
    /**
     * Handle bubble destroyed
     */
    private handleBubbleDestroyed(data: any): void {
        this.scoreEventManager?.handleBubbleDestroyed(data);
        // Visual effects handled by UnifiedFeedbackSystem through score events
    }
    
    /**
     * Handle match found
     */
    private handleMatchFound(data: any): void {
        // Process through ScoreEventManager which shows GOOD, GREAT, AMAZING, PERFECT
        this.scoreEventManager?.handleMatchFound(data);
    }
    
    /**
     * Handle combo complete
     */
    private handleComboComplete(data: any): void {
        this.scoreEventManager?.handleComboComplete(data);
        // Visual effects handled by UnifiedFeedbackSystem through score events
    }
    
    /**
     * Get all active bubbles
     */
    public getAllBubbles(): any[] {
        const activeBubbles = this.bubbleManager?.getActiveBubbles() || [];
        // Keep the bubbles array in sync for RowSpawnSystem
        this.bubbles = activeBubbles;
        return activeBubbles;
    }
    
    /**
     * Create a bubble at position (compatibility method for RowSpawnSystem)
     */
    public createBubbleAt(x: number, y: number, color: any): any {
        return this.bubbleManager?.getBubble(x, y, color);
    }
    
    /**
     * Handle gem collection from destroyed bubbles
     */
    private handleBubbleGemCollected(data: any): void {
        const { x, y, isPlayer } = data;
        
        // IMPORTANT: Always add exactly 1 gem per bubble, regardless of objectiveHitCount
        const gemsToAdd = 1; // NEVER multiply this!
        
        // Update gem count - SHOULD BE 1 GEM PER BUBBLE
        if (isPlayer) {
            this.gameState.addPlayerGems(gemsToAdd);
            // Update registry for ResetSystem
            this.scene.registry.set('playerGems', this.gameState.getPlayerGems());
        } else {
            this.gameState.addOpponentGems(1);
            // Update registry for ResetSystem
            this.scene.registry.set('opponentGems', this.gameState.getOpponentGems());
        }
        
        // Emit event for UI update
        this.eventBus.emit('gem-collected', {
            isPlayer,
            delta: 1,
            x,
            y
        });
        
        // Visual effect
        this.showGemCollectEffect(x, y, isPlayer);
        
        // Check for gem-based victory condition (15 gems)
        const playerGems = this.gameState.getPlayerGems();
        const opponentGems = this.gameState.getOpponentGems();
        
        if (playerGems >= 15 && !this.isGameEnded) {
            this.triggerGameOver(true);
        } else if (opponentGems >= 15 && !this.isGameEnded) {
            this.triggerGameOver(false);
        }
    }
    
    // Removed unused handleObjectiveGemCollected method that was causing confusion
    // The objective gem collection is handled by checkChestHit directly
    
    /**
     * Show gem collection visual effect
     */
    private showGemCollectEffect(x: number, y: number, _isPlayer: boolean): void {
        // Create sparkle effect
        for (let i = 0; i < 5; i++) {
            const sparkle = this.scene.add.star(
                x + Phaser.Math.Between(-10, 10),
                y + Phaser.Math.Between(-10, 10),
                5, 3, 5,
                0xFFD700
            );
            sparkle.setScale(0);
            sparkle.setDepth(1500);
            
            this.scene.tweens.add({
                targets: sparkle,
                scale: { from: 0, to: 0.5 },
                alpha: { from: 1, to: 0 },
                duration: 500,
                delay: i * 50,
                ease: 'Back.easeOut',
                onComplete: () => sparkle.destroy()
            });
        }
        
        // Create text effect
        const text = this.scene.add.text(x, y, '+GEM', {
            fontSize: '16px',
            color: '#FFD700',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        text.setDepth(1501);
        
        this.scene.tweens.add({
            targets: text,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy()
        });
    }
    
    /**
     * Clean up all systems
     */
    public cleanup(): void {
        
        // Mark as not initialized first
        this.isInitialized = false;
        this.isGameEnded = true;
        
        // Clean up UI screens
        if (this.victoryScreen) {
            this.victoryScreen.destroy();
            this.victoryScreen = undefined;
        }
        if (this.defeatScreen) {
            this.defeatScreen.destroy();
            this.defeatScreen = undefined;
        }
        if (this.tieScreen) {
            this.tieScreen.destroy();
            this.tieScreen = undefined;
        }
        
        // Timer is now managed by UIManager, no cleanup needed here
        
        // Stop all active systems
        this.rowSpawnSystem?.stopSpawning();
        this.aiOpponentSystem?.stop();
        this.shootingSystem?.destroy();
        
        // Clean up objective manager - CRITICAL: clear the reference
        if (this.objectiveManager) {
            this.objectiveManager.destroy();
            this.objectiveManager = undefined as any;
        }
        
        // Clear the objective reference too
        this.objective = undefined as any;
        
        // Clean up all managers
        this.bubbleManager?.destroy();
        this.launcherManager?.destroy();
        this.uiManager?.destroy();
        this.visualManager?.destroy();
        
        // Clean up systems - CRITICAL: clear references
        this.gridAttachmentSystem = undefined as any;
        this.matchDetectionSystem = undefined as any;
        this.resetSystem = undefined as any;
        this.victorySystem = undefined as any;
        this.rowSpawnSystem = undefined as any;
        this.aiOpponentSystem = undefined as any;
        this.shootingSystem = undefined as any;
        
        // Clean up systems registry
        this.systemRegistry.destroyAll();
        
        // Reset state
        this.gameState.resetGame();
        
        // Clean up event listeners
        this.eventBus.off('bubble-position-update', this.checkChestHit);
        this.eventBus.removeAllListeners();
        
        // Reset counters
        this.objectiveHitCount = 0;
        this.lastObjectiveHitTime = 0;
        
        // Destroy objective if it exists
        if (this.objectiveManager) {
            this.objectiveManager.destroy();
        }
    }
    
    /**
     * Handle gem removal from reset system
     */
    private handleResetGemRemoval(data: any): void {
        const { isPlayer, gemsToRemove } = data;
        
        
        if (isPlayer) {
            const currentGems = this.gameState.getPlayerGems();
            const newGems = Math.max(0, currentGems - gemsToRemove);
            // Use addPlayerGems with negative value to subtract
            this.gameState.addPlayerGems(-gemsToRemove);
            this.scene.registry.set('playerGems', newGems);
        } else {
            const currentGems = this.gameState.getOpponentGems();
            const newGems = Math.max(0, currentGems - gemsToRemove);
            // Use addOpponentGems with negative value to subtract
            this.gameState.addOpponentGems(-gemsToRemove);
            this.scene.registry.set('opponentGems', newGems);
        }
        
        // Emit event for UI update
        this.eventBus.emit('gems-updated', {
            playerGems: this.gameState.getPlayerGems(),
            opponentGems: this.gameState.getOpponentGems(),
            isReset: true
        });
        
        // Visual feedback - flash screen red
        this.scene.cameras.main.flash(500, 255, 0, 0);
    }
    
    /**
     * Destroy the coordinator
     */
    public destroy(): void {
        this.cleanup();
    }
}