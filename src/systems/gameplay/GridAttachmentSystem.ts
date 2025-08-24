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
        const collisionRadius = BUBBLE_CONFIG.SIZE; // Diameter for collision
        
        for (const gridBubble of this.gridBubbles) {
            if (!gridBubble.visible) continue;
            
            const distance = Phaser.Math.Distance.Between(
                projectilePos.x, projectilePos.y,
                gridBubble.x, gridBubble.y
            );
            
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
        if (!hitHexPos) return null;
        
        // Get all neighbor positions
        const neighbors = this.bubbleGrid.getNeighbors(hitHexPos);
        
        // Find closest empty neighbor to projectile position
        let bestNeighbor: IHexPosition | null = null;
        let minDistance = Infinity;
        
        for (const neighbor of neighbors) {
            // Check if position is empty
            if (this.isPositionOccupied(neighbor)) continue;
            
            // Get pixel position of this hex
            const pixelPos = this.bubbleGrid.hexToPixel(neighbor);
            
            // Calculate distance from projectile
            const distance = Phaser.Math.Distance.Between(
                projectile.x, projectile.y,
                pixelPos.x, pixelPos.y
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                bestNeighbor = neighbor;
            }
        }
        
        return bestNeighbor;
    }
    
    /**
     * Check if a hex position is occupied
     */
    private isPositionOccupied(hexPos: IHexPosition): boolean {
        return this.gridBubbles.some(bubble => {
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
        
        // Get pixel position for hex
        const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
        
        // Set grid position
        bubble.setGridPosition(hexPos);
        
        // Animate snap to position
        this.scene.tweens.add({
            targets: bubble,
            x: pixelPos.x,
            y: pixelPos.y,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 100,
            ease: 'Back.easeOut',
            yoyo: true,
            onComplete: () => {
                // Add to grid bubbles
                this.addGridBubble(bubble);
                
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