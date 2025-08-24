import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleGrid } from './BubbleGrid';
import { IHexPosition, ArenaZone } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';
import { MatchDetectionSystem } from './MatchDetectionSystem';

export class GridAttachmentSystem {
    private scene: Scene;
    private bubbleGrid: BubbleGrid;
    private gridBubbles: Bubble[] = [];
    private attachmentInProgress: boolean = false;
    private matchDetectionSystem?: MatchDetectionSystem;
    
    constructor(scene: Scene, bubbleGrid: BubbleGrid) {
        this.scene = scene;
        this.bubbleGrid = bubbleGrid;
    }
    
    public setMatchDetectionSystem(matchDetectionSystem: MatchDetectionSystem): void {
        this.matchDetectionSystem = matchDetectionSystem;
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
            onComplete: async () => {
                console.log('Attachment complete, checking for matches...');
                
                // Check for matches FIRST
                if (this.matchDetectionSystem) {
                    console.log('MatchDetectionSystem available, checking bubble color:', bubble.getColor()?.toString(16));
                    await this.matchDetectionSystem.checkForMatches(bubble);
                } else {
                    console.warn('MatchDetectionSystem not available!');
                }
                
                // Then check for disconnected bubbles
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
        
        // Apply bidirectional gravity based on Y position, not zone
        const allDisconnected: Bubble[] = [];
        disconnected.forEach((bubbles) => {
            allDisconnected.push(...bubbles);
        });
        
        if (allDisconnected.length > 0) {
            this.applyBidirectionalGravity(allDisconnected);
        }
    }
    
    /**
     * Find all disconnected bubble groups by zone
     */
    public findDisconnectedGroups(): Map<ArenaZone, Bubble[]> {
        const disconnected = new Map<ArenaZone, Bubble[]>();
        disconnected.set(ArenaZone.PLAYER, []);
        disconnected.set(ArenaZone.OPPONENT, []);
        disconnected.set(ArenaZone.OBJECTIVE, []);
        
        // Mark all bubbles as unvisited
        const visited = new Set<Bubble>();
        const connected = new Set<Bubble>();
        
        // Find bubbles adjacent to the objective (center position)
        const centerHex: IHexPosition = { q: 0, r: 0, s: 0 };
        const anchors: Bubble[] = [];
        
        // Get bubbles at center and immediate neighbors as anchors
        const centerBubble = this.getBubbleAtPosition(centerHex);
        if (centerBubble) {
            anchors.push(centerBubble);
        }
        
        // Get neighbors of center as additional anchors
        const centerNeighbors = this.bubbleGrid.getNeighbors(centerHex);
        centerNeighbors.forEach(neighborHex => {
            const bubble = this.getBubbleAtPosition(neighborHex);
            if (bubble) {
                anchors.push(bubble);
            }
        });
        
        // If no anchors (no bubbles near objective), all bubbles are disconnected
        if (anchors.length === 0) {
            console.log('No anchors found - all bubbles are floating!');
            this.gridBubbles.forEach(bubble => {
                if (bubble.visible) {
                    const zone = this.getZoneForBubble(bubble);
                    disconnected.get(zone)?.push(bubble);
                }
            });
            return disconnected;
        }
        
        console.log(`Found ${anchors.length} anchor bubbles near objective`);
        
        // Flood fill from each anchor to find connected bubbles
        anchors.forEach(anchor => {
            this.floodFill(anchor, visited, connected);
        });
        
        console.log(`${connected.size} bubbles are connected to objective`);
        
        // Any unvisited bubbles are disconnected and should fall
        this.gridBubbles.forEach(bubble => {
            if (!connected.has(bubble) && bubble.visible) {
                const zone = this.getZoneForBubble(bubble);
                disconnected.get(zone)?.push(bubble);
            }
        });
        
        // Log disconnected counts
        disconnected.forEach((bubbles, zone) => {
            if (bubbles.length > 0) {
                console.log(`${bubbles.length} disconnected bubbles in ${zone} zone`);
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
     * Apply bidirectional gravity to disconnected bubbles
     */
    public applyBidirectionalGravity(bubbles: Bubble[]): void {
        const centerY = this.scene.cameras.main.centerY;
        
        // Group bubbles by their fall direction
        const fallingUp: Bubble[] = [];
        const fallingDown: Bubble[] = [];
        
        bubbles.forEach(bubble => {
            if (bubble.y < centerY) {
                // Bubbles above center fall up
                fallingUp.push(bubble);
            } else {
                // Bubbles below center fall down
                fallingDown.push(bubble);
            }
        });
        
        // Animate each group with appropriate direction
        if (fallingUp.length > 0) {
            console.log(`${fallingUp.length} bubbles falling UP (above center)`);
            this.animateFallingBubbles(fallingUp, 'up');
        }
        
        if (fallingDown.length > 0) {
            console.log(`${fallingDown.length} bubbles falling DOWN (below center)`);
            this.animateFallingBubbles(fallingDown, 'down');
        }
    }
    
    /**
     * Animate bubbles falling in specified direction
     */
    private animateFallingBubbles(bubbles: Bubble[], direction: 'up' | 'down'): void {
        const outOfBounds = direction === 'down' 
            ? this.scene.cameras.main.height + 100
            : -100;
        
        // Sort bubbles by distance from center for cascade effect
        const centerX = this.scene.cameras.main.centerX;
        bubbles.sort((a, b) => {
            const distA = Math.abs(a.x - centerX);
            const distB = Math.abs(b.x - centerX);
            return distA - distB;
        });
        
        bubbles.forEach((bubble, index) => {
            // Remove from grid immediately
            this.removeGridBubble(bubble);
            bubble.setGridPosition(null);
            
            // Add slight random horizontal movement for natural falling
            const horizontalDrift = Phaser.Math.Between(-30, 30);
            const rotationSpeed = Phaser.Math.Between(-Math.PI * 2, Math.PI * 2);
            
            // Flash before falling
            bubble.setTint(0xFFFFFF);
            this.scene.time.delayedCall(100, () => {
                bubble.clearTint();
            });
            
            // Animate falling with physics-like acceleration
            this.scene.tweens.add({
                targets: bubble,
                y: outOfBounds,
                x: bubble.x + horizontalDrift,
                rotation: rotationSpeed,
                scale: 0.8,
                alpha: 0.3,
                duration: 800 + index * 20, // Vary duration for natural effect
                ease: 'Quad.easeIn',
                delay: index * 30, // Stagger the falls for cascade effect
                onComplete: () => {
                    // Award points based on position
                    // Bubbles falling from opponent side (up direction) give more points
                    const points = direction === 'up' ? 15 : 10;
                    
                    this.scene.events.emit('bubble-dropped', { 
                        direction: direction, 
                        points: points,
                        color: bubble.getColor()
                    });
                    
                    // Return to pool
                    bubble.returnToPool();
                }
            });
        });
        
        // Add screen shake for large groups
        if (bubbles.length >= 5) {
            this.scene.cameras.main.shake(150, 0.002);
        }
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