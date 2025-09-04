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
    private attachmentQueue: Array<{ bubble: Bubble; hexPos: IHexPosition; onComplete?: () => void }> = [];
    private matchDetectionSystem?: MatchDetectionSystem;
    private spatialGrid: Map<string, Bubble[]> = new Map(); // Spatial partitioning for faster collision
    private gridPositions: Map<string, Bubble> = new Map(); // Track positions
    
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
            this.updateSpatialGrid(); // Update spatial partitioning
        }
    }
    
    /**
     * Remove a bubble from the grid
     */
    public removeGridBubble(bubble: Bubble): void {
        const index = this.gridBubbles.indexOf(bubble);
        if (index > -1) {
            this.gridBubbles.splice(index, 1);
            this.updateSpatialGrid(); // Update spatial partitioning
        }
    }
    
    /**
     * Check collision between projectile and grid bubbles - OPTIMIZED
     */
    public checkCollision(projectile: Bubble): Bubble | null {
        const projectilePos = { x: projectile.x, y: projectile.y };
        // Use bubble diameter for collision detection
        const collisionRadius = BUBBLE_CONFIG.SIZE - 2; // Slightly less than diameter for proper touching
        
        // Check objective collision first (if near center)
        const centerPixel = this.bubbleGrid.hexToPixel({ q: 0, r: 0, s: 0 });
        const centerDistance = Phaser.Math.Distance.Between(
            projectilePos.x, projectilePos.y,
            centerPixel.x, centerPixel.y
        );
        
        // If very close to center and no bubble there, attach to center
        if (centerDistance < BUBBLE_CONFIG.SIZE && !this.isPositionOccupied({ q: 0, r: 0, s: 0 })) {
            // Create a virtual bubble at center for attachment reference
            const virtualBubble = new Bubble(
                this.scene,
                centerPixel.x,
                centerPixel.y,
                0x000000
            );
            virtualBubble.setGridPosition({ q: 0, r: 0, s: 0 });
            virtualBubble.setVisible(false);
            return virtualBubble;
        }
        
        // OPTIMIZED: Only check nearby bubbles using spatial partitioning
        const nearbyBubbles = this.getNearbyBubbles(projectilePos.x, projectilePos.y);
        
        for (const gridBubble of nearbyBubbles) {
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
     * Get bubbles near a position using spatial partitioning
     */
    private getNearbyBubbles(x: number, y: number): Bubble[] {
        // Use a simple grid-based spatial partitioning
        const gridSize = BUBBLE_CONFIG.SIZE * 2; // Cell size
        const cellX = Math.floor(x / gridSize);
        const cellY = Math.floor(y / gridSize);
        
        const nearby: Bubble[] = [];
        
        // Check current cell and adjacent cells (3x3 grid)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                const cellBubbles = this.spatialGrid.get(key);
                if (cellBubbles) {
                    nearby.push(...cellBubbles);
                }
            }
        }
        
        return nearby;
    }
    
    /**
     * Update spatial grid when bubbles are added/removed
     */
    private updateSpatialGrid(): void {
        this.spatialGrid.clear();
        const gridSize = BUBBLE_CONFIG.SIZE * 2;
        
        for (const bubble of this.gridBubbles) {
            if (!bubble.visible) continue;
            
            const cellX = Math.floor(bubble.x / gridSize);
            const cellY = Math.floor(bubble.y / gridSize);
            const key = `${cellX},${cellY}`;
            
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key)!.push(bubble);
        }
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
        
        // console.log('Hit bubble at hex:', hitHexPos, 'pixel:', { x: hitBubble.x, y: hitBubble.y });
        // console.log('Projectile at:', { x: projectile.x, y: projectile.y });
        
        // Calculate impact angle
        const dx = projectile.x - hitBubble.x;
        const dy = projectile.y - hitBubble.y;
        const angle = Math.atan2(dy, dx);
        const angleDeg = (angle * 180 / Math.PI + 360) % 360;
        
        // console.log('Impact angle:', angleDeg.toFixed(1), 'degrees');
        
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
                // console.log('Position occupied:', neighbor);
                continue;
            }
            
            // Calculate angle difference
            let angleDiff = Math.abs(angleDeg - offset.angle);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;
            
            // console.log('Checking neighbor:', neighbor, 'angle:', offset.angle, 'diff:', angleDiff.toFixed(1));
            
            // Choose the neighbor with the closest angle match
            if (angleDiff < minAngleDiff) {
                minAngleDiff = angleDiff;
                bestNeighbor = neighbor;
            }
        }
        
        if (bestNeighbor) {
            const pixelPos = this.bubbleGrid.hexToPixel(bestNeighbor);
            // console.log('Best attachment position - hex:', bestNeighbor, 'pixel:', pixelPos);
        } else {
            console.warn('No valid attachment position found');
        }
        
        return bestNeighbor;
    }
    
    /**
     * Find best available position near target
     */
    private findBestAvailablePosition(targetHex: IHexPosition, bubble: Bubble): IHexPosition | null {
        // First check if target is available
        if (!this.isPositionOccupied(targetHex) && this.isValidPosition(targetHex)) {
            return targetHex;
        }
        
        // console.log('Target position occupied or invalid, searching alternatives');
        
        // First try immediate neighbors only
        const neighbors = this.bubbleGrid.getNeighbors(targetHex);
        let bestNeighbor: IHexPosition | null = null;
        let minNeighborDist = Infinity;
        
        for (const pos of neighbors) {
            if (!this.isPositionOccupied(pos) && this.isValidPosition(pos)) {
                const pixelPos = this.bubbleGrid.hexToPixel(pos);
                const distance = Phaser.Math.Distance.Between(
                    bubble.x, bubble.y,
                    pixelPos.x, pixelPos.y
                );
                
                if (distance < minNeighborDist) {
                    minNeighborDist = distance;
                    bestNeighbor = pos;
                }
            }
        }
        
        if (bestNeighbor) {
            console.log(`Found neighbor position at (${bestNeighbor.q},${bestNeighbor.r})`);
            return bestNeighbor;
        }
        
        // Only if no neighbors available, try ring 2
        const ring2 = this.bubbleGrid.getRing(targetHex, 2);
        for (const pos of ring2) {
            if (!this.isPositionOccupied(pos) && this.isValidPosition(pos)) {
                console.log(`Using fallback position at ring 2: (${pos.q},${pos.r})`);
                return pos;
            }
        }
        
        return null;
    }
    
    /**
     * Check if position is valid (has at least one neighbor)
     */
    private isValidPosition(hexPos: IHexPosition): boolean {
        // Center position is always valid
        if (hexPos.q === 0 && hexPos.r === 0) return true;
        
        // Check if position has at least one neighbor bubble
        const neighbors = this.bubbleGrid.getNeighbors(hexPos);
        return neighbors.some(neighbor => this.isPositionOccupied(neighbor));
    }
    
    /**
     * Check if a hex position is occupied - OPTIMIZED
     */
    private isPositionOccupied(hexPos: IHexPosition): boolean {
        // OPTIMIZED: Use position map for O(1) lookup instead of O(n) iteration
        const key = this.hexToKey(hexPos);
        if (this.gridPositions.has(key)) {
            const bubble = this.gridPositions.get(key);
            // Clean up stale entries
            if (!bubble || !bubble.visible) {
                this.gridPositions.delete(key);
                return false;
            }
            return true;
        }
        
        // Double-check with actual grid bubbles to be sure
        const occupied = this.gridBubbles.some(bubble => {
            if (!bubble.visible) return false;
            
            const pos = bubble.getGridPosition();
            if (!pos) return false;
            
            return pos.q === hexPos.q && pos.r === hexPos.r;
        });
        
        // Don't use pixel proximity as it causes false positives
        // We only care about exact hex position matches
        return occupied;
    }
    
    /**
     * Convert hex position to string key
     */
    private hexToKey(hexPos: IHexPosition): string {
        return `${hexPos.q},${hexPos.r}`;
    }
    
    /**
     * Attach bubble to grid at specified position
     */
    public attachToGrid(bubble: Bubble, hexPos: IHexPosition, onComplete?: () => void): void {
        if (this.attachmentInProgress) {
            // console.warn('Attachment already in progress, queueing bubble');
            // Queue this attachment for later
            this.attachmentQueue.push({ bubble, hexPos, onComplete });
            return;
        }
        
        // Validate and find best position
        hexPos = this.findBestAvailablePosition(hexPos, bubble);
        
        if (!hexPos) {
            console.warn('No valid position found, destroying bubble');
            bubble.destroy();
            if (onComplete) onComplete();
            return;
        }
        
        this.attachmentInProgress = true;
        
        // Get exact pixel position for this hex coordinate
        const pixelPos = this.bubbleGrid.hexToPixel(hexPos);
        
        // console.log('Attaching bubble to hex:', hexPos, 'pixel:', pixelPos);
        
        // Clean up any existing bubbles that might be misaligned at this position
        this.cleanupMisalignedBubbles(hexPos, bubble);
        
        // Set grid position BEFORE moving
        bubble.setGridPosition(hexPos);
        
        // Update position map for O(1) lookups
        const key = this.hexToKey(hexPos);
        this.gridPositions.set(key, bubble);
        
        // Add to grid bubbles immediately to prevent double-occupation
        this.addGridBubble(bubble);
        
        // Animate to position
        const distance = Phaser.Math.Distance.Between(
            bubble.x, bubble.y,
            pixelPos.x, pixelPos.y
        );
        
        // Use shorter duration for closer distances
        const duration = Math.min(200, Math.max(50, distance * 0.5));
        
        // Sound is now played earlier in ShootingSystem on collision detection
        
        this.scene.tweens.add({
            targets: bubble,
            x: pixelPos.x,
            y: pixelPos.y,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                // Enhanced attachment feedback
                this.createAttachmentEffect(bubble);
                
                // Small bounce effect
                this.scene.tweens.add({
                    targets: bubble,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 80,
                    ease: 'Back.easeOut',
                    yoyo: true
                });
            }
        });
        
        // Delay slightly before checking matches to ensure position is settled
        this.scene.time.delayedCall(duration + 100, async () => {
            // console.log('Attachment complete, checking for matches...');
            
            // Verify bubble is properly positioned
            const finalPixelPos = this.bubbleGrid.hexToPixel(hexPos);
            if (Phaser.Math.Distance.Between(bubble.x, bubble.y, finalPixelPos.x, finalPixelPos.y) > 5) {
                // console.warn('Bubble not properly positioned, correcting...');
                bubble.setPosition(finalPixelPos.x, finalPixelPos.y);
            }
            
            // Check for matches FIRST
            if (this.matchDetectionSystem) {
                // console.log('MatchDetectionSystem available, checking bubble color:', bubble.getColor()?.toString(16));
                await this.matchDetectionSystem.checkForMatches(bubble);
            } else {
                console.warn('MatchDetectionSystem not available!');
            }
            
            // Then check for disconnected bubbles
            this.checkDisconnectedBubbles();
            
            this.attachmentInProgress = false;
            
            // Emit bubble attached event with data
            // Only emit if bubble is visible and has a valid position
            if (bubble.visible && bubble.getGridPosition()) {
                this.scene.events.emit('bubble-attached', { bubble, position: hexPos });
            }
            
            // If no matches, emit matches-resolved
            this.scene.time.delayedCall(100, () => {
                this.scene.events.emit('matches-resolved');
            });
            
            if (onComplete) {
                onComplete();
            }
            
            // Process queued attachments
            if (this.attachmentQueue.length > 0) {
                const next = this.attachmentQueue.shift();
                if (next) {
                    this.scene.time.delayedCall(50, () => {
                        this.attachToGrid(next.bubble, next.hexPos, next.onComplete);
                    });
                }
            }
        });
    }
    
    /**
     * Create visual effect when bubble attaches
     */
    private createAttachmentEffect(bubble: Bubble): void {
        const color = bubble.getColor();
        
        // Create a ring effect at attachment point
        const ring = this.scene.add.circle(bubble.x, bubble.y, BUBBLE_CONFIG.SIZE / 2, color, 0);
        ring.setStrokeStyle(2, color, 0.6);
        ring.setDepth(bubble.depth - 1);
        
        // Animate ring expansion
        this.scene.tweens.add({
            targets: ring,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });
        
        // Small particle burst
        for (let i = 0; i < 4; i++) {
            const particle = this.scene.add.circle(
                bubble.x,
                bubble.y,
                2,
                color,
                0.8
            );
            
            const angle = (Math.PI * 2 * i) / 4;
            const distance = 20;
            
            this.scene.tweens.add({
                targets: particle,
                x: bubble.x + Math.cos(angle) * distance,
                y: bubble.y + Math.sin(angle) * distance,
                scale: 0,
                alpha: 0,
                duration: 250,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    /**
     * Clean up any misaligned bubbles at position
     */
    private cleanupMisalignedBubbles(hexPos: IHexPosition, newBubble: Bubble): void {
        // Only remove bubbles that are in the EXACT same hex position
        // This prevents removing nearby valid bubbles
        const toRemove: Bubble[] = [];
        
        this.gridBubbles.forEach(bubble => {
            if (bubble === newBubble || !bubble.visible) return;
            
            const bubblePos = bubble.getGridPosition();
            if (!bubblePos) return;
            
            // Check if it's the EXACT same hex position
            if (bubblePos.q === hexPos.q && bubblePos.r === hexPos.r) {
                // Double check with pixel distance to be absolutely sure
                const targetPixel = this.bubbleGrid.hexToPixel(hexPos);
                const bubbleDistance = Phaser.Math.Distance.Between(
                    bubble.x, bubble.y,
                    targetPixel.x, targetPixel.y
                );
                
                // Only remove if truly at the same position (within 5 pixels)
                if (bubbleDistance < 5) {
                    console.warn(`Found duplicate bubble at exact position (${hexPos.q},${hexPos.r}), removing old one`);
                    toRemove.push(bubble);
                } else {
                    console.log(`Bubble claims position (${hexPos.q},${hexPos.r}) but is ${bubbleDistance}px away, not removing`);
                }
            }
        });
        
        // Remove only true duplicates at the same hex position
        toRemove.forEach(bubble => {
            // Final safety check before removal
            const key = this.hexToKey(hexPos);
            const existingAtPos = this.gridPositions.get(key);
            
            if (existingAtPos === bubble) {
                this.gridPositions.delete(key);
            }
            
            this.removeGridBubble(bubble);
            bubble.destroy();
        });
        
        if (toRemove.length > 0) {
            console.log(`Cleaned up ${toRemove.length} duplicate bubble(s) at position (${hexPos.q},${hexPos.r})`);
        }
    }
    
    /**
     * Check for disconnected bubbles after attachment
     */
    public checkDisconnectedBubbles(): void {
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
            // console.log('No anchors found - all bubbles are floating!');
            this.gridBubbles.forEach(bubble => {
                if (bubble.visible) {
                    const zone = this.getZoneForBubble(bubble);
                    disconnected.get(zone)?.push(bubble);
                }
            });
            return disconnected;
        }
        
        // console.log(`Found ${anchors.length} anchor bubbles near objective`);
        
        // Flood fill from each anchor to find connected bubbles
        anchors.forEach(anchor => {
            this.floodFill(anchor, visited, connected);
        });
        
        // console.log(`${connected.size} bubbles are connected to objective`);
        
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
                // console.log(`${bubbles.length} disconnected bubbles in ${zone} zone`);
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
            // console.log(`${fallingUp.length} bubbles falling UP (above center)`);
            this.animateFallingBubbles(fallingUp, 'up');
        }
        
        if (fallingDown.length > 0) {
            // console.log(`${fallingDown.length} bubbles falling DOWN (below center)`);
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
            const oldPos = bubble.getGridPosition();
            if (oldPos) {
                const key = this.hexToKey(oldPos);
                this.gridPositions.delete(key);
            }
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
    
    /**
     * Fast O(1) check if a grid position has a bubble
     * Used for performance optimization in updateObjectiveShield
     */
    public hasGridPosition(gridKey: string): boolean {
        return this.gridPositions.has(gridKey);
    }
}