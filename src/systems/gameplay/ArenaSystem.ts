import { Scene } from 'phaser';
import { IArenaConfig, IZoneBounds, ArenaZone, IHexPosition } from '@/types/ArenaTypes';
import { ARENA_CONFIG, BUBBLE_CONFIG, GRID_CONFIG, ZONE_COLORS, Z_LAYERS } from '@/config/ArenaConfig';
import { BubbleGrid } from './BubbleGrid';
import { Bubble } from '@/gameObjects/Bubble';
import { Launcher } from '@/gameObjects/Launcher';
import { Objective } from '@/gameObjects/Objective';
import { InputManager } from '@/systems/input/InputManager';
import { ShootingSystem } from './ShootingSystem';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { MatchDetectionSystem } from './MatchDetectionSystem';
import { AIOpponentSystem, AIDifficulty } from './AIOpponentSystem';
import { ScoreDisplay } from '@/ui/ScoreDisplay';
import { VictoryScreen } from '@/ui/VictoryScreen';
import { DefeatScreen } from '@/ui/DefeatScreen';

export { AIDifficulty };

export class ArenaSystem {
    private scene: Scene;
    private config: IArenaConfig;
    private bubbleGrid: BubbleGrid;
    private objective!: Objective;
    private playerLauncher!: Launcher;
    private opponentLauncher!: Launcher;
    private bubbles: Bubble[] = [];
    private bubblePool: Bubble[] = [];
    private zones: Map<ArenaZone, IZoneBounds> = new Map();
    private debugGraphics?: Phaser.GameObjects.Graphics;
    private debugEnabled: boolean = false;
    private inputManager: InputManager;
    private shootingSystem?: ShootingSystem;
    private gridAttachmentSystem: GridAttachmentSystem;
    private matchDetectionSystem: MatchDetectionSystem;
    private aiOpponent?: AIOpponentSystem;
    private isSinglePlayer: boolean = true;
    private scoreDisplay?: ScoreDisplay;
    private playerScore: number = 0;
    private aiScore: number = 0;
    private gameOver: boolean = false;
    private victoryScreen?: VictoryScreen;
    private defeatScreen?: DefeatScreen;
    private isRestarting: boolean = false;

    constructor(scene: Scene) {
        this.scene = scene;
        this.config = ARENA_CONFIG;
        
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
        for (let i = 0; i < BUBBLE_CONFIG.POOL_SIZE; i++) {
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

    public setupArena(singlePlayer: boolean = true, difficulty: AIDifficulty = AIDifficulty.EASY): void {
        this.isSinglePlayer = singlePlayer;
        
        this.createLaunchers();
        this.createObjective();
        this.createInitialBubbles();
        this.createZoneVisuals();
        
        // Initialize score display (shows player score only)
        this.scoreDisplay = new ScoreDisplay(this.scene);
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
            this.aiOpponent.setDifficulty(difficulty);
            
            console.log(`ArenaSystem: AI opponent initialized with ${difficulty} difficulty`);
            
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
            
            // Show current controls
            this.showControlsHint();
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
        
        this.objective = new Objective(this.scene, {
            x: centerX,
            y: centerY,
            size: this.config.objectiveSize,
            health: 1
        });
    }

    private createInitialBubbles(): void {
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        
        // Create 3 rings of bubbles around the objective
        for (let ring = 1; ring <= GRID_CONFIG.OBJECTIVE_RADIUS; ring++) {
            const positions = this.bubbleGrid.getRing(center, ring);
            
            positions.forEach(hexPos => {
                const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
                const bubble = this.getBubbleFromPool();
                
                if (bubble) {
                    bubble.reset(pixelPos.x, pixelPos.y, Bubble.getRandomColor());
                    bubble.setGridPosition(hexPos);
                    this.bubbles.push(bubble);
                    
                    // Register with grid attachment system
                    this.gridAttachmentSystem.addGridBubble(bubble);
                    
                    // Add some random special bubbles
                    if (Math.random() < 0.1) {
                        bubble.setSpecial(true);
                    }
                }
            });
        }
        
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
        // Create subtle zone separators
        const graphics = this.scene.add.graphics();
        graphics.setDepth(Z_LAYERS.ZONE_DEBUG);
        
        const playerZone = this.zones.get(ArenaZone.PLAYER)!;
        const opponentZone = this.zones.get(ArenaZone.OPPONENT)!;
        
        // Draw zone separator lines
        graphics.lineStyle(2, 0xffffff, 0.2);
        graphics.beginPath();
        graphics.moveTo(0, playerZone.y);
        graphics.lineTo(this.scene.cameras.main.width, playerZone.y);
        graphics.strokePath();
        
        graphics.beginPath();
        graphics.moveTo(0, opponentZone.y + opponentZone.height);
        graphics.lineTo(this.scene.cameras.main.width, opponentZone.y + opponentZone.height);
        graphics.strokePath();
        
        // Add DANGER LINE for player - this is where they lose if bubbles cross
        const dangerLineY = playerZone.y + 30; // 30 pixels into player zone
        graphics.lineStyle(3, 0xFF0000, 0.5); // Red line
        graphics.beginPath();
        graphics.moveTo(0, dangerLineY);
        graphics.lineTo(this.scene.cameras.main.width, dangerLineY);
        graphics.strokePath();
        
        // Add warning text
        const warningText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            dangerLineY - 15,
            'DANGER ZONE',
            {
                fontSize: '12px',
                color: '#FF6666',
                fontFamily: 'Arial',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5);
        warningText.setDepth(Z_LAYERS.UI);
        warningText.setAlpha(0.6);
        
        // Pulse the warning
        this.scene.tweens.add({
            targets: warningText,
            alpha: 0.3,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
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
        
        // Check if there are bubbles adjacent to objective
        const center: IHexPosition = { q: 0, r: 0, s: 0 };
        const neighbors = this.bubbleGrid.getNeighbors(center);
        
        let hasAdjacentBubbles = false;
        for (const neighbor of neighbors) {
            const hasBubble = this.bubbles.some(bubble => {
                const pos = bubble.getGridPosition();
                return pos && pos.q === neighbor.q && pos.r === neighbor.r;
            });
            
            if (hasBubble) {
                hasAdjacentBubbles = true;
                break;
            }
        }
        
        this.objective.setShielded(hasAdjacentBubbles);
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
        // Update input manager
        this.inputManager.update();
        
        // Update launcher aiming based on input
        this.updateLauncherAiming();
        
        // Update shooting system
        this.shootingSystem?.update(delta);
        
        // Update objective shield
        this.updateObjectiveShield();
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
        
        // Update launcher rotation
        this.playerLauncher.setAimAngle(angle);
        
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
        
        // Stop current AI
        this.aiOpponent.stop();
        
        // Change difficulty
        this.aiOpponent.setDifficulty(difficulty);
        
        // Restart AI
        this.scene.time.delayedCall(500, () => {
            this.aiOpponent?.start();
        });
        
        // Show notification
        this.showDifficultyChangeNotification(difficulty);
    }
    
    private showDifficultyChangeNotification(difficulty: AIDifficulty): void {
        const notification = this.scene.add.container(
            this.scene.cameras.main.centerX,
            200
        );
        
        const colors = {
            [AIDifficulty.EASY]: 0x4CAF50,
            [AIDifficulty.MEDIUM]: 0xFFC107,
            [AIDifficulty.HARD]: 0xF44336
        };
        
        const bg = this.scene.add.rectangle(0, 0, 200, 40, colors[difficulty], 0.9);
        bg.setStrokeStyle(2, 0xFFFFFF);
        
        const text = this.scene.add.text(0, 0, `AI: ${difficulty}`, {
            fontSize: '18px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        
        notification.add([bg, text]);
        notification.setDepth(1500);
        notification.setScale(0);
        
        // Animate
        this.scene.tweens.add({
            targets: notification,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(1000, () => {
                    this.scene.tweens.add({
                        targets: notification,
                        scale: 0,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => notification.destroy()
                    });
                });
            }
        });
    }
    
    private showControlsHint(): void {
        // Create controls hint at bottom-left
        const hintContainer = this.scene.add.container(10, this.scene.cameras.main.height - 60);
        
        const bg = this.scene.add.rectangle(0, 0, 250, 50, 0x000000, 0.7);
        bg.setOrigin(0);
        bg.setStrokeStyle(1, 0x555555);
        
        const title = this.scene.add.text(5, 5, 'Controls:', {
            fontSize: '12px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        
        const controls = this.scene.add.text(5, 20, 
            'D: Debug | 1: Easy | 2: Medium | 3: Hard', {
            fontSize: '11px',
            color: '#CCCCCC'
        });
        
        hintContainer.add([bg, title, controls]);
        hintContainer.setDepth(900);
        hintContainer.setAlpha(0.8);
        
        // Fade in
        hintContainer.setAlpha(0);
        this.scene.tweens.add({
            targets: hintContainer,
            alpha: 0.8,
            duration: 1000,
            delay: 2000
        });
    }
    
    private onScoreUpdate = (data: { score: number; delta: number; combo?: number; isAI?: boolean }): void => {
        if (this.gameOver) return;
        
        // Track scores separately
        if (data.isAI) {
            this.aiScore += data.delta;
            console.log(`AI Score: ${this.aiScore}`);
        } else {
            this.playerScore += data.delta;
            // Only update display for player score
            this.scoreDisplay?.updateScore(this.playerScore);
            
            if (data.combo && data.combo > 1) {
                this.scoreDisplay?.setCombo(data.combo);
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
            const playerWins = shooter === 'player';
            
            console.log(`🎯 TREASURE CHEST DIRECT HIT by ${shooter}! Distance: ${distance.toFixed(1)} < ${hitRadius}`);
            console.log(`INSTANT VICTORY for ${playerWins ? 'PLAYER' : 'AI'}!`);
            
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
    
    private checkVictoryCondition = (data: { bubble: Bubble; position: IHexPosition }): void => {
        if (this.gameOver) return;
        
        const bubble = data.bubble;
        
        // Check for defeat conditions (bubbles reaching danger zone)
        const playerZone = this.zones.get(ArenaZone.PLAYER)!;
        const dangerLineY = playerZone.y + 30; // 30 pixels into player zone
        
        if (bubble.y > dangerLineY) {
            console.log('💀 Bubble crossed danger line! Player loses!');
            this.triggerGameOver(false); // Player loses
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
        
        // Play victory/defeat sound (if implemented)
        // this.scene.sound.play(playerWins ? 'victory' : 'defeat');
        
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
                    window.location.reload(true);
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
    
    public destroy(): void {
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
        this.scoreDisplay?.destroy();
        this.victoryScreen?.destroy();
        this.defeatScreen?.destroy();
        
        // Remove event listeners
        this.scene.events.off('score-update', this.onScoreUpdate, this);
        this.scene.events.off('bubble-attached', this.checkVictoryCondition, this);
        this.scene.events.off('bubble-position-update', this.checkChestHit, this);
    }
}