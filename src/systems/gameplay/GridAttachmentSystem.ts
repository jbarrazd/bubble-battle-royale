import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleGrid } from './BubbleGrid';
import { IHexPosition, ArenaZone } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';

export class GridAttachmentSystem {
    private scene: Scene;
    private bubbleGrid: BubbleGrid;
    private gridBubbles: Bubble[] = [];
    private attachmentInProgress: boolean = false;
    
    constructor(scene: Scene, bubbleGrid: BubbleGrid) {
        this.scene = scene;
        this.bubbleGrid = bubbleGrid;
    }
    
    /**
     * Register a bubble as part of the grid
     */
    public addGridBubble(bubble: Bubble): void {
        if (!this.gridBubbles.includes(bubble)) {
            this.gridBubbles.push(bubble);
        }
    }
    
    /**
     * Remove a bubble from the grid
     */
    public removeGridBubble(bubble: Bubble): void {
        const index = this.gridBubbles.indexOf(bubble);
        if (index > -1) {
            this.gridBubbles.splice(index, 1);
        }
    }
    
    /**
     * Check collision between projectile and grid bubbles
     */
    public checkCollision(projectile: Bubble): Bubble | null {
        const projectilePos = { x: projectile.x, y: projectile.y };
        // Use bubble diameter for collision detection
        const collisionRadius = BUBBLE_CONFIG.SIZE - 2; // Slightly less than diameter for proper touching
        
        for (const gridBubble of this.gridBubbles) {
            if (!gridBubble.visible) continue;
            
            const distance = Phaser.Math.Distance.Between(
                projectilePos.x, projectilePos.y,
                gridBubble.x, gridBubble.y
            );
            
            // Check if bubbles are touching
            if (distance < collisionRadius) {
                return gridBubble;
            }
        }
        
        return null;
    }
    
    /**
     * Find best attachment position based on impact
     */
    public findAttachmentPosition(projectile: Bubble, hitBubble: Bubble): IHexPosition | null {
        // Get hex position of hit bubble
        const hitHexPos = hitBubble.getGridPosition();
        if (!hitHexPos) {
            console.warn('Hit bubble has no grid position');
            return null;
        }
        
        console.log('Hit bubble at hex:', hitHexPos, 'pixel:', { x: hitBubble.x, y: hitBubble.y });
        console.log('Projectile at:', { x: projectile.x, y: projectile.y });
        
        // Calculate impact angle
        const dx = projectile.x - hitBubble.x;
        const dy = projectile.y - hitBubble.y;
        const angle = Math.atan2(dy, dx);
        const angleDeg = (angle * 180 / Math.PI + 360) % 360;
        
        console.log('Impact angle:', angleDeg.toFixed(1), 'degrees');
        
        // For offset grid, we need to consider the row offset when getting neighbors
        // In an offset grid, odd rows have different neighbor offsets
        const isOddRow = Math.abs(hitHexPos.r) % 2 === 1;
        
        // Define neighbor offsets for offset grid
        // Even rows and odd rows have different neighbor patterns
        let neighborOffsets: Array<{q: number, r: number, angle: number}> = [];
        
        if (!isOddRow) {
            // Even row neighbors
            neighborOffsets = [
                { q: 0, r: -1, angle: 270 },  // Top
                { q: 1, r: 0, angle: 0 },     // Right  
                { q: 0, r: 1, angle: 90 },    // Bottom
                { q: -1, r: 1, angle: 135 },  // Bottom-left
                { q: -1, r: 0, angle: 180 },  // Left
                { q: -1, r: -1, angle: 225 }  // Top-left
            ];
        } else {
            // Odd row neighbors (offset by half)
            neighborOffsets = [
                { q: 0, r: -1, angle: 270 },  // Top
                { q: 1, r: -1, angle: 315 },  // Top-right
                { q: 1, r: 0, angle: 0 },     // Right
                { q: 1, r: 1, angle: 45 },    // Bottom-right
                { q: 0, r: 1, angle: 90 },    // Bottom
                { q: -1, r: 0, angle: 180 }   // Left
            ];
        }
        
        // Find the best neighbor based on impact angle
        let bestNeighbor: IHexPosition | null = null;
        let minAngleDiff = 360;
        
        for (const offset of neighborOffsets) {
            const neighbor: IHexPosition = {
                q: hitHexPos.q + offset.q,
                r: hitHexPos.r + offset.r,
                s: 0 // Not used in offset grid
            };
            
            // Skip if position is occupied
            if (this.isPositionOccupied(neighbor)) {
                console.log('Position occupied:', neighbor);
                continue;
            }
            
            // Calculate angle difference
            let angleDiff = Math.abs(angleDeg - offset.angle);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;
            
            console.log('Checking neighbor:', neighbor, 'angle:', offset.angle, 'diff:', angleDiff.toFixed(1));
            
            // Choose the neighbor with the closest angle match
            if (angleDiff < minAngleDiff) {
                minAngleDiff = angleDiff;
                bestNeighbor = neighbor;
            }
        }
        
        if (bestNeighbor) {
            const pixelPos = this.bubbleGrid.hexToPixel(bestNeighbor);
            console.log('Best attachment position - hex:', bestNeighbor, 'pixel:', pixelPos);
        } else {
            console.warn('No valid attachment position found');
        }
        
        return bestNeighbor;
    }
    
    /**
     * Check if a hex position is occupied
     */
    private isPositionOccupied(hexPos: IHexPosition): boolean {
        // Simply check if any bubble has this grid position
        return this.gridBubbles.some(bubble => {
            if (!bubble.visible) return false;
            const pos = bubble.getGridPosition();
            return pos && pos.q === hexPos.q && pos.r === hexPos.r;
        });
    }
    
    /**
     * Attach bubble to grid at specified position
     */
    public attachToGrid(bubble: Bubble, hexPos: IHexPosition, onComplete?: () => void): void {
        if (this.attachmentInProgress) return;
        this.attachmentInProgress = true;
        
        // Get exact pixel position for this hex coordinate
        const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
        
        console.log('Attaching bubble to hex:', hexPos, 'pixel:', pixelPos);
        
        // Set grid position BEFORE moving
        bubble.setGridPosition(hexPos);
        
        // Immediately snap to correct position (no animation for now to debug)
        bubble.x = pixelPos.x;
        bubble.y = pixelPos.y;
        
        // Add to grid bubbles
        this.addGridBubble(bubble);
        
        // Small visual feedback
        this.scene.tweens.add({
            targets: bubble,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 50,
            ease: 'Back.easeOut',
            yoyo: true,
            onComplete: () => {
                // Check for disconnected bubbles
                this.checkDisconnectedBubbles();
                
                this.attachmentInProgress = false;
                
                if (onComplete) {
                    onComplete();
                }
            }
        });
    }
    
    /**
     * Check for disconnected bubbles after attachment
     */
    private checkDisconnectedBubbles(): void {
        const disconnected = this.findDisconnectedGroups();
        
        disconnected.forEach((bubbles, zone) => {
            if (bubbles.length > 0) {
                this.applyZoneGravity(bubbles, zone);
            }
        });
    }
    
    /**
     * Find all disconnected bubble groups by zone
     */
    public findDisconnectedGroups(): Map<ArenaZone, Bubble[]> {
        const disconnected = new Map<ArenaZone, Bubble[]>();
        disconnected.set(ArenaZone.PLAYER, []);
        disconnected.set(ArenaZone.OPPONENT, []);
        
        // Mark all bubbles as unvisited
        const visited = new Set<Bubble>();
        const connected = new Set<Bubble>();
        
        // Find all bubbles in OBJECTIVE zone (anchors)
        const anchors = this.gridBubbles.filter(bubble => {
            const zone = this.getZoneForBubble(bubble);
            return zone === ArenaZone.OBJECTIVE;
        });
        
        // If no anchors, all bubbles are disconnected
        if (anchors.length === 0) {
            this.gridBubbles.forEach(bubble => {
                const zone = this.getZoneForBubble(bubble);
                if (zone !== ArenaZone.OBJECTIVE) {
                    disconnected.get(zone)?.push(bubble);
                }
            });
            return disconnected;
        }
        
        // Flood fill from each anchor
        anchors.forEach(anchor => {
            this.floodFill(anchor, visited, connected);
        });
        
        // Any unvisited bubbles are disconnected
        this.gridBubbles.forEach(bubble => {
            if (!connected.has(bubble)) {
                const zone = this.getZoneForBubble(bubble);
                if (zone !== ArenaZone.OBJECTIVE) {
                    disconnected.get(zone)?.push(bubble);
                }
            }
        });
        
        return disconnected;
    }
    
    /**
     * Flood fill to find connected bubbles
     */
    private floodFill(bubble: Bubble, visited: Set<Bubble>, connected: Set<Bubble>): void {
        if (visited.has(bubble)) return;
        visited.add(bubble);
        connected.add(bubble);
        
        const hexPos = bubble.getGridPosition();
        if (!hexPos) return;
        
        // Get neighbors
        const neighbors = this.bubbleGrid.getNeighbors(hexPos);
        
        // Check each neighbor
        neighbors.forEach(neighborHex => {
            const neighborBubble = this.getBubbleAtPosition(neighborHex);
            if (neighborBubble && !visited.has(neighborBubble)) {
                this.floodFill(neighborBubble, visited, connected);
            }
        });
    }
    
    /**
     * Get bubble at specific hex position
     */
    private getBubbleAtPosition(hexPos: IHexPosition): Bubble | null {
        return this.gridBubbles.find(bubble => {
            const pos = bubble.getGridPosition();
            return pos && pos.q === hexPos.q && pos.r === hexPos.r;
        }) || null;
    }
    
    /**
     * Determine which zone a bubble is in based on Y position
     */
    private getZoneForBubble(bubble: Bubble): ArenaZone {
        const screenHeight = this.scene.cameras.main.height;
        const objectiveTop = screenHeight * 0.4; // 40% from top
        const objectiveBottom = screenHeight * 0.6; // 60% from top
        
        if (bubble.y < objectiveTop) {
            return ArenaZone.OPPONENT;
        } else if (bubble.y > objectiveBottom) {
            return ArenaZone.PLAYER;
        } else {
            return ArenaZone.OBJECTIVE;
        }
    }
    
    /**
     * Apply gravity to disconnected bubbles based on zone
     */
    public applyZoneGravity(bubbles: Bubble[], zone: ArenaZone): void {
        const direction = zone === ArenaZone.PLAYER ? 'down' : 'up';
        this.animateFallingBubbles(bubbles, direction);
    }
    
    /**
     * Animate bubbles falling in specified direction
     */
    private animateFallingBubbles(bubbles: Bubble[], direction: 'up' | 'down'): void {
        const gravity = direction === 'down' ? 500 : -500;
        const outOfBounds = direction === 'down' 
            ? this.scene.cameras.main.height + 100
            : -100;
        
        bubbles.forEach((bubble, index) => {
            // Remove from grid immediately
            this.removeGridBubble(bubble);
            bubble.setGridPosition(null);
            
            // Add slight random horizontal movement
            const horizontalDrift = Phaser.Math.Between(-50, 50);
            
            // Animate falling with physics-like acceleration
            this.scene.tweens.add({
                targets: bubble,
                y: outOfBounds,
                x: bubble.x + horizontalDrift,
                rotation: Phaser.Math.Between(-Math.PI, Math.PI),
                alpha: 0.5,
                duration: 1000,
                ease: 'Quad.easeIn',
                delay: index * 50, // Stagger the falls
                onComplete: () => {
                    // Award points if opponent bubble
                    if (zone === ArenaZone.OPPONENT) {
                        this.scene.events.emit('bubble-dropped', { 
                            zone: ArenaZone.OPPONENT, 
                            points: 10 
                        });
                    }
                    
                    // Return to pool or destroy
                    bubble.returnToPool();
                }
            });
        });
    }
    
    /**
     * Get all grid bubbles
     */
    public getGridBubbles(): Bubble[] {
        return this.gridBubbles;
    }
    
    /**
     * Clear all grid bubbles
     */
    public clearGrid(): void {
        this.gridBubbles = [];
    }
    
    /**
     * Debug: Visualize connections
     */
    public debugDrawConnections(graphics: Phaser.GameObjects.Graphics): void {
        graphics.lineStyle(1, 0x00ff00, 0.5);
        
        this.gridBubbles.forEach(bubble => {
            const hexPos = bubble.getGridPosition();
            if (!hexPos) return;
            
            const neighbors = this.bubbleGrid.getNeighbors(hexPos);
            neighbors.forEach(neighborHex => {
                const neighborBubble = this.getBubbleAtPosition(neighborHex);
                if (neighborBubble) {
                    graphics.lineBetween(
                        bubble.x, bubble.y,
                        neighborBubble.x, neighborBubble.y
                    );
                }
            });
        });
    }
}