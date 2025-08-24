import { Scene } from 'phaser';
import { IArenaConfig, IZoneBounds, ArenaZone, IHexPosition } from '@/types/ArenaTypes';
import { ARENA_CONFIG, BUBBLE_CONFIG, GRID_CONFIG, ZONE_COLORS, Z_LAYERS } from '@/config/ArenaConfig';
import { BubbleGrid } from './BubbleGrid';
import { Bubble } from '@/gameObjects/Bubble';
import { Launcher } from '@/gameObjects/Launcher';
import { Objective } from '@/gameObjects/Objective';
import { InputManager } from '@/systems/input/InputManager';
import { ShootingSystem } from './ShootingSystem';

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

    constructor(scene: Scene) {
        this.scene = scene;
        this.config = ARENA_CONFIG;
        
        // Initialize input manager
        this.inputManager = new InputManager(scene);
        
        // Initialize grid at center of objective zone
        const centerX = scene.cameras.main.centerX;
        const centerY = scene.cameras.main.centerY;
        this.bubbleGrid = new BubbleGrid(centerX, centerY);
        
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

    public setupArena(): void {
        this.createLaunchers();
        this.createObjective();
        this.createInitialBubbles();
        this.createZoneVisuals();
        
        // Initialize shooting system after launchers are created
        this.shootingSystem = new ShootingSystem(
            this.scene,
            this.inputManager,
            this.playerLauncher
        );
        
        // Enable debug with 'D' key
        this.scene.input.keyboard?.on('keydown-D', () => {
            this.toggleDebug();
        });
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

    public destroy(): void {
        this.inputManager?.destroy();
        this.shootingSystem?.destroy();
        this.bubbles.forEach(bubble => bubble.destroy());
        this.bubblePool.forEach(bubble => bubble.destroy());
        this.objective?.destroy();
        this.playerLauncher?.destroy();
        this.opponentLauncher?.destroy();
        this.debugGraphics?.destroy();
    }
}