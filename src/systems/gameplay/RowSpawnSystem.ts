/**
 * RowSpawnSystem - Automatic row spawning system for Bubble Gems Clash
 * BGC-001: Implements automatic spawning of bubble rows to create pressure
 * Spawns rows adjacent to existing bubbles on both sides
 */

import { Scene } from 'phaser';
import { ArenaSystem } from './ArenaSystem';
import { Bubble } from '@/gameObjects/Bubble';
import { BUBBLE_CONFIG, ARENA_CONFIG, GRID_CONFIG } from '@/config/ArenaConfig';
import { BubbleColor, IHexPosition } from '@/types/ArenaTypes';

export interface RowSpawnConfig {
    interval: number;      // Milliseconds between spawns
    pattern: 'random' | 'preset';
    colors: number;        // Number of available colors
}

export class RowSpawnSystem {
    private scene: Scene;
    private arenaSystem: ArenaSystem;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private spawnInterval: number = 6000; // Default 6 seconds
    private isPaused: boolean = false;
    private isEnabled: boolean = false;
    private availableColors: BubbleColor[] = [];
    private currentConfig: RowSpawnConfig;
    private centerY: number;
    
    // Arena-specific configurations
    private readonly ARENA_CONFIGS: Record<string, RowSpawnConfig> = {
        ocean: {
            interval: 12000,  // 12 seconds - balanced pace
            pattern: 'random',
            colors: 5
        },
        space: {
            interval: 9000,   // 9 seconds - faster for space battles
            pattern: 'random',
            colors: 5
        },
        volcanic: {
            interval: 10000,  // 10 seconds - moderate pace
            pattern: 'random',
            colors: 5
        },
        crystal: {
            interval: 8000,   // 8 seconds - fastest pace
            pattern: 'random',
            colors: 6
        }
    };

    constructor(scene: Scene, arenaSystem: ArenaSystem) {
        this.scene = scene;
        this.arenaSystem = arenaSystem;
        this.centerY = scene.cameras.main.centerY;
        
        // Get current theme from registry or default to ocean
        const theme = this.scene.registry.get('gameTheme') || 'ocean';
        this.currentConfig = this.ARENA_CONFIGS[theme] || this.ARENA_CONFIGS.ocean;
        
        // Initialize available colors based on config
        this.initializeColors();
    }

    private initializeColors(): void {
        this.availableColors = [];
        const colorCount = this.currentConfig.colors;
        
        const allColors: BubbleColor[] = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.GREEN,
            BubbleColor.YELLOW,
            BubbleColor.PURPLE
        ];
        
        for (let i = 0; i < Math.min(colorCount, allColors.length); i++) {
            this.availableColors.push(allColors[i]);
        }
    }

    /**
     * Start automatic row spawning
     */
    public startSpawning(interval?: number): void {
        if (this.isEnabled) {
            console.warn('RowSpawnSystem: Already spawning');
            return;
        }

        this.isEnabled = true;
        this.spawnInterval = interval || this.currentConfig.interval;
        
        // Create timer for spawning
        this.spawnTimer = this.scene.time.addEvent({
            delay: this.spawnInterval,
            callback: this.spawnNewRows,
            callbackScope: this,
            loop: true
        });
        
        console.log(`RowSpawnSystem: Started spawning with ${this.spawnInterval}ms interval`);
    }

    /**
     * Stop automatic row spawning
     */
    public stopSpawning(): void {
        this.isEnabled = false;
        
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
            this.spawnTimer = null;
        }
        
        console.log('RowSpawnSystem: Stopped spawning');
    }

    /**
     * Main spawn function - adds rows adjacent to existing edge bubbles
     */
    private spawnNewRows(): void {
        if (this.isPaused || !this.isEnabled) {
            return;
        }

        console.log('RowSpawnSystem: Adding new rows adjacent to edges');
        
        const bubbleGrid = this.arenaSystem.bubbleGrid;
        const gridAttachment = this.arenaSystem.gridAttachmentSystem;
        const allBubbles = this.arenaSystem.getAllBubbles();
        
        // Create a map of occupied positions for quick lookup
        const occupiedPositions = new Map<string, boolean>();
        allBubbles.forEach(bubble => {
            const pos = bubble.getGridPosition();
            if (pos && bubble.visible) {
                const key = `${pos.q},${pos.r}`;
                occupiedPositions.set(key, true);
            }
        });
        
        // Find edge bubbles for both sides
        const topEdgeBubbles = this.findTopEdgeBubbles(allBubbles);
        const bottomEdgeBubbles = this.findBottomEdgeBubbles(allBubbles);
        
        // IMPORTANT: For fair competitive play, spawn must be symmetric
        // Add new bubbles adjacent to BOTH edges equally
        this.addBubblesAdjacentToEdge(topEdgeBubbles, 'top', occupiedPositions, bubbleGrid, gridAttachment);
        this.addBubblesAdjacentToEdge(bottomEdgeBubbles, 'bottom', occupiedPositions, bubbleGrid, gridAttachment);
        
        // For Space arena, add extra pressure to BOTH sides equally
        const theme = this.scene.registry.get('gameTheme');
        if (theme === 'space' && Math.random() < 0.3) {
            console.log('Space arena: Adding extra pressure wave to BOTH sides!');
            
            // Re-find edges after first spawn
            const updatedBubbles = this.arenaSystem.getAllBubbles();
            const newTopEdge = this.findTopEdgeBubbles(updatedBubbles);
            const newBottomEdge = this.findBottomEdgeBubbles(updatedBubbles);
            
            // Update occupied positions
            updatedBubbles.forEach(bubble => {
                const pos = bubble.getGridPosition();
                if (pos && bubble.visible) {
                    const key = `${pos.q},${pos.r}`;
                    occupiedPositions.set(key, true);
                }
            });
            
            // Add second wave to BOTH sides for fairness
            this.addBubblesAdjacentToEdge(newTopEdge, 'top', occupiedPositions, bubbleGrid, gridAttachment);
            this.addBubblesAdjacentToEdge(newBottomEdge, 'bottom', occupiedPositions, bubbleGrid, gridAttachment);
        }
        
        // Emit event
        this.scene.events.emit('row-spawned', { 
            timestamp: Date.now(),
            topCount: topEdgeBubbles.length,
            bottomCount: bottomEdgeBubbles.length
        });
    }

    /**
     * Find the topmost bubbles (opponent side edge)
     * These are the bubbles with the SMALLEST (most negative) r value in each column
     */
    private findTopEdgeBubbles(bubbles: Bubble[]): Bubble[] {
        const edgeBubbles: Bubble[] = [];
        const columnMap = new Map<number, { bubble: Bubble, r: number }>();
        
        // Find the topmost bubble in each column (smallest/most negative r value)
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            
            const pos = bubble.getGridPosition();
            if (!pos) return;
            
            // Consider ANY bubble on the upper half OR center area
            if (pos.r <= 0) {
                const existing = columnMap.get(pos.q);
                
                // Keep the bubble with the smallest (most negative or zero) r
                if (!existing || pos.r < existing.r) {
                    columnMap.set(pos.q, { bubble, r: pos.r });
                }
            }
        });
        
        // If no bubbles found in upper half, use any topmost bubbles
        if (columnMap.size === 0) {
            console.log('No bubbles in upper half, finding absolute topmost bubbles');
            bubbles.forEach(bubble => {
                if (!bubble.visible) return;
                
                const pos = bubble.getGridPosition();
                if (!pos) return;
                
                const existing = columnMap.get(pos.q);
                // Keep the bubble with the smallest r value
                if (!existing || pos.r < existing.r) {
                    columnMap.set(pos.q, { bubble, r: pos.r });
                }
            });
        }
        
        // Convert map to array and log positions
        columnMap.forEach((data, q) => {
            edgeBubbles.push(data.bubble);
            console.log(`Top edge bubble at column ${q}, row ${data.r}`);
        });
        
        console.log(`Found ${edgeBubbles.length} top edge bubbles for opponent side`);
        return edgeBubbles;
    }

    /**
     * Find the bottommost bubbles (player side edge)
     * These are the bubbles with the LARGEST (most positive) r value in each column
     */
    private findBottomEdgeBubbles(bubbles: Bubble[]): Bubble[] {
        const edgeBubbles: Bubble[] = [];
        const columnMap = new Map<number, { bubble: Bubble, r: number }>();
        
        // Find the bottommost bubble in each column (largest/most positive r value)
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            
            const pos = bubble.getGridPosition();
            if (!pos) return;
            
            // Consider ANY bubble on the lower half OR center area
            if (pos.r >= 0) {
                const existing = columnMap.get(pos.q);
                
                // Keep the bubble with the largest (most positive or zero) r
                if (!existing || pos.r > existing.r) {
                    columnMap.set(pos.q, { bubble, r: pos.r });
                }
            }
        });
        
        // If no bubbles found in lower half, use any bottommost bubbles
        if (columnMap.size === 0) {
            console.log('No bubbles in lower half, finding absolute bottommost bubbles');
            bubbles.forEach(bubble => {
                if (!bubble.visible) return;
                
                const pos = bubble.getGridPosition();
                if (!pos) return;
                
                const existing = columnMap.get(pos.q);
                // Keep the bubble with the largest r value
                if (!existing || pos.r > existing.r) {
                    columnMap.set(pos.q, { bubble, r: pos.r });
                }
            });
        }
        
        // Convert map to array and log positions
        columnMap.forEach((data, q) => {
            edgeBubbles.push(data.bubble);
            console.log(`Bottom edge bubble at column ${q}, row ${data.r}`);
        });
        
        console.log(`Found ${edgeBubbles.length} bottom edge bubbles for player side`);
        return edgeBubbles;
    }

    /**
     * Add new bubbles adjacent to edge bubbles
     */
    private addBubblesAdjacentToEdge(
        edgeBubbles: Bubble[], 
        side: 'top' | 'bottom',
        occupiedPositions: Map<string, boolean>,
        bubbleGrid: any,
        gridAttachment: any
    ): void {
        const newBubbles: { hexPos: IHexPosition, color: BubbleColor }[] = [];
        
        // Track which positions will have support
        const supportedPositions = new Set<string>();
        
        // First pass: identify all positions that will have direct support
        edgeBubbles.forEach(edgeBubble => {
            const edgePos = edgeBubble.getGridPosition();
            if (!edgePos) return;
            
            // Add the edge bubble position as a support
            supportedPositions.add(`${edgePos.q},${edgePos.r}`);
        });
        
        // Second pass: add new bubbles directly above/below edge bubbles
        edgeBubbles.forEach(edgeBubble => {
            const edgePos = edgeBubble.getGridPosition();
            if (!edgePos) return;
            
            // Determine the new position based on side
            let newPos: IHexPosition;
            
            if (side === 'top') {
                // For opponent: new row appears ABOVE (more negative r)
                newPos = {
                    q: edgePos.q,
                    r: edgePos.r - 1,
                    s: -edgePos.q - (edgePos.r - 1)
                };
            } else {
                // For player: new row appears BELOW (more positive r)
                newPos = {
                    q: edgePos.q,
                    r: edgePos.r + 1,
                    s: -edgePos.q - (edgePos.r + 1)
                };
            }
            
            // Check if position is already occupied
            const key = `${newPos.q},${newPos.r}`;
            if (!occupiedPositions.has(key)) {
                // Check bounds - don't spawn beyond reasonable limits
                if (Math.abs(newPos.r) > 7 || Math.abs(newPos.q) > 5) {
                    console.log(`Skipping out-of-bounds position ${newPos.q},${newPos.r}`);
                    return;
                }
                
                // Since we're adding directly above/below existing bubbles,
                // they ALWAYS have support from the bubble below/above them
                // 85% chance to spawn for more pressure
                if (Math.random() < 0.85) {
                    const color = this.getRandomColor();
                    newBubbles.push({ hexPos: newPos, color });
                    occupiedPositions.set(key, true);
                    supportedPositions.add(key);
                    
                    console.log(`Adding bubble at ${newPos.q},${newPos.r} ${side === 'top' ? 'ABOVE' : 'BELOW'} edge bubble at ${edgePos.q},${edgePos.r}`);
                }
            } else {
                console.log(`Position ${newPos.q},${newPos.r} already occupied - skipping`);
            }
        });
        
        // Also fill gaps between edge bubbles if they exist
        if (edgeBubbles.length > 1) {
            // Sort edge bubbles by column
            const sortedEdge = [...edgeBubbles].sort((a, b) => {
                const posA = a.getGridPosition()!;
                const posB = b.getGridPosition()!;
                return posA.q - posB.q;
            });
            
            // Check for gaps between adjacent columns
            for (let i = 0; i < sortedEdge.length - 1; i++) {
                const currentPos = sortedEdge[i].getGridPosition()!;
                const nextPos = sortedEdge[i + 1].getGridPosition()!;
                
                // If there's a gap in columns
                if (nextPos.q - currentPos.q > 1) {
                    // Fill the gap
                    for (let q = currentPos.q + 1; q < nextPos.q; q++) {
                        // Use average r position for gap filling
                        const avgR = Math.round((currentPos.r + nextPos.r) / 2);
                        const gapR = side === 'top' ? avgR - 1 : avgR + 1;
                        
                        const gapPos: IHexPosition = {
                            q: q,
                            r: gapR,
                            s: -q - gapR
                        };
                        
                        const key = `${gapPos.q},${gapPos.r}`;
                        
                        // Check bounds
                        if (Math.abs(gapPos.r) > 7 || Math.abs(gapPos.q) > 5) {
                            continue;
                        }
                        
                        // Only fill gap if it has support from existing structure
                        const hasSupport = this.checkHasNeighborSupport(gapPos, supportedPositions, occupiedPositions);
                        
                        if (!occupiedPositions.has(key) && hasSupport && Math.random() < 0.7) { // Increased from 0.5
                            const color = this.getRandomColor();
                            newBubbles.push({ hexPos: gapPos, color });
                            occupiedPositions.set(key, true);
                            supportedPositions.add(key);
                            console.log(`Filling gap at ${gapPos.q},${gapPos.r}`);
                        }
                    }
                }
            }
        }
        
        // Sort bubbles by distance from center column to spawn from center outward
        // This ensures better connectivity
        newBubbles.sort((a, b) => {
            const distA = Math.abs(a.hexPos.q);
            const distB = Math.abs(b.hexPos.q);
            return distA - distB; // Closer to center first
        });
        
        // Pre-validate all positions before creating any bubbles
        const validatedBubbles: { hexPos: IHexPosition, color: BubbleColor }[] = [];
        const currentGridBubbles = gridAttachment.getGridBubbles();
        
        console.log(`Validating ${newBubbles.length} potential new bubbles (sorted by center distance)...`);
        
        // Create a temporary map of all current positions for faster lookup
        const currentPositionMap = new Map<string, boolean>();
        currentGridBubbles.forEach(b => {
            const pos = b.getGridPosition();
            if (pos && b.visible) {
                currentPositionMap.set(`${pos.q},${pos.r}`, true);
            }
        });
        
        newBubbles.forEach(bubbleData => {
            // First check if this exact position already has a bubble
            const posKey = `${bubbleData.hexPos.q},${bubbleData.hexPos.r}`;
            if (currentPositionMap.has(posKey)) {
                console.warn(`Position ${bubbleData.hexPos.q},${bubbleData.hexPos.r} already has a bubble - skipping!`);
                return;
            }
            
            // Simulate the bubble position to check connectivity
            const willConnect = this.checkPositionWillConnect(
                bubbleData.hexPos, 
                currentGridBubbles,
                validatedBubbles,
                side
            );
            
            if (willConnect) {
                validatedBubbles.push(bubbleData);
                // Add to temp map so subsequent checks know this position will be filled
                currentPositionMap.set(posKey, true);
                console.log(`Position ${bubbleData.hexPos.q},${bubbleData.hexPos.r} validated for spawn`);
            } else {
                console.warn(`Position ${bubbleData.hexPos.q},${bubbleData.hexPos.r} rejected - would not connect!`);
            }
        });
        
        console.log(`Creating ${validatedBubbles.length} validated bubbles (rejected ${newBubbles.length - validatedBubbles.length})`);
        
        // Sort validated bubbles by center distance again for creation order
        validatedBubbles.sort((a, b) => {
            const distA = Math.abs(a.hexPos.q);
            const distB = Math.abs(b.hexPos.q);
            return distA - distB; // Create center bubbles first
        });
        
        // Now create only the validated bubbles
        const createdBubbles: Bubble[] = [];
        
        validatedBubbles.forEach((bubbleData, index) => {
            // Double-check connectivity right before creation with updated grid state
            const currentGrid = gridAttachment.getGridBubbles();
            const hasConnection = this.checkFinalConnection(bubbleData.hexPos, currentGrid, side);
            
            if (!hasConnection) {
                console.warn(`Skipping creation of bubble at (${bubbleData.hexPos.q},${bubbleData.hexPos.r}) - lost connection during batch creation`);
                return;
            }
            
            const pixelPos = bubbleGrid.hexToPixel(bubbleData.hexPos);
            
            const bubble = this.arenaSystem.createBubbleAt(
                pixelPos.x,
                pixelPos.y,
                bubbleData.color
            );
            
            if (bubble) {
                // Set grid position
                bubble.setGridPosition(bubbleData.hexPos);
                
                // Add to grid attachment system
                gridAttachment.addGridBubble(bubble);
                
                // IMMEDIATE validation after adding to grid
                const allCurrentBubbles = gridAttachment.getGridBubbles();
                const neighbors = this.arenaSystem.bubbleGrid.getNeighbors(bubbleData.hexPos);
                let hasNeighbor = false;
                
                for (const neighbor of neighbors) {
                    const neighborExists = allCurrentBubbles.some(b => {
                        const bPos = b.getGridPosition();
                        return bPos && bPos.q === neighbor.q && bPos.r === neighbor.r && b.visible && b !== bubble;
                    });
                    
                    if (neighborExists) {
                        hasNeighbor = true;
                        break;
                    }
                }
                
                // If bubble has no neighbors and is not in center area, remove it immediately
                if (!hasNeighbor && Math.abs(bubbleData.hexPos.r) > 3) {
                    console.error(`CRITICAL: Bubble at (${bubbleData.hexPos.q},${bubbleData.hexPos.r}) has no neighbors after creation!`);
                    gridAttachment.removeGridBubble(bubble);
                    bubble.destroy();
                    return; // Skip this bubble
                }
                
                createdBubbles.push(bubble);
                
                // Check for danger zones
                if (side === 'top' && bubbleData.hexPos.r <= -7) {
                    console.log('WARNING: Opponent approaching danger zone!');
                    this.scene.events.emit('danger-zone-warning', { side: 'opponent', row: bubbleData.hexPos.r });
                } else if (side === 'bottom' && bubbleData.hexPos.r >= 7) {
                    console.log('WARNING: Player approaching danger zone!');
                    this.scene.events.emit('danger-zone-warning', { side: 'player', row: bubbleData.hexPos.r });
                }
                
                // Fade in animation
                bubble.setAlpha(0);
                bubble.setScale(0.5);
                
                this.scene.tweens.add({
                    targets: bubble,
                    alpha: 1,
                    scale: 1,
                    duration: 400,
                    ease: 'Back.out',
                    delay: index * 30 // Stagger effect
                });
            }
        });
        
        // Post-creation validation - check if any newly created bubbles will fall
        if (createdBubbles.length > 0) {
            console.log(`Post-spawn validation: Checking ${createdBubbles.length} created bubbles...`);
            
            // Delay the disconnection check to let animations complete
            this.scene.time.delayedCall(600, () => {
                const allCurrentBubbles = gridAttachment.getGridBubbles();
                let foundIssues = false;
                
                createdBubbles.forEach(bubble => {
                    if (!bubble || !bubble.visible) return;
                    
                    const pos = bubble.getGridPosition();
                    if (!pos) return;
                    
                    // Check if this bubble has neighbors now that all are created
                    const neighbors = this.arenaSystem.bubbleGrid.getNeighbors(pos);
                    let neighborCount = 0;
                    
                    for (const neighbor of neighbors) {
                        const neighborExists = allCurrentBubbles.some(b => {
                            const bPos = b.getGridPosition();
                            return bPos && bPos.q === neighbor.q && bPos.r === neighbor.r && b.visible;
                        });
                        
                        if (neighborExists) {
                            neighborCount++;
                        }
                    }
                    
                    // Bubbles should have at least one neighbor unless in center
                    if (neighborCount === 0 && Math.abs(pos.r) > 3) {
                        console.error(`⚠️ POST-SPAWN ISSUE: Bubble at (${pos.q},${pos.r}) has NO neighbors!`);
                        foundIssues = true;
                    }
                });
                
                if (!foundIssues) {
                    console.log(`✓ All spawned bubbles are properly connected`);
                }
                
                // Force a disconnection check after spawning
                this.scene.time.delayedCall(100, () => {
                    gridAttachment.checkDisconnectedBubbles();
                });
            });
        }
    }

    /**
     * Check if a position has neighbor support
     */
    private checkHasNeighborSupport(
        pos: IHexPosition, 
        supportedPositions: Set<string>,
        occupiedPositions: Map<string, boolean>
    ): boolean {
        // Use the proper offset grid neighbors
        const neighbors = this.arenaSystem.bubbleGrid.getNeighbors(pos);
        
        let foundNeighbors = 0;
        
        // Check if at least TWO neighbors exist for stability
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.q},${neighbor.r}`;
            if (supportedPositions.has(neighborKey) || occupiedPositions.has(neighborKey)) {
                foundNeighbors++;
            }
        }
        
        // Require at least 2 neighbors for gap filling
        if (foundNeighbors < 2) {
            console.warn(`Position ${pos.q},${pos.r} has only ${foundNeighbors} neighbors! Will not spawn gap filler.`);
            return false;
        }
        
        return true;
    }

    /**
     * Verify that a bubble is connected to the main structure
     */
    private verifyBubbleConnection(bubble: Bubble, allBubbles: Bubble[]): boolean {
        const pos = bubble.getGridPosition();
        if (!pos) return false;
        
        // Check if bubble is in center area (always connected)
        if (Math.abs(pos.r) <= 3) {
            return true; // Center bubbles are always connected
        }
        
        // For opponent bubbles (negative r), prioritize checking connection below
        // For player bubbles (positive r), prioritize checking connection above
        const priorityNeighbors = pos.r < 0 ? 
            [
                { q: pos.q, r: pos.r + 1 },     // Below (toward center)
                { q: pos.q - 1, r: pos.r + 1 }, // Below-left
                { q: pos.q + 1, r: pos.r },     // Right
                { q: pos.q - 1, r: pos.r },     // Left
            ] : 
            [
                { q: pos.q, r: pos.r - 1 },     // Above (toward center)
                { q: pos.q + 1, r: pos.r - 1 }, // Above-right
                { q: pos.q + 1, r: pos.r },     // Right
                { q: pos.q - 1, r: pos.r },     // Left
            ];
        
        // Check priority neighbors first
        for (const neighbor of priorityNeighbors) {
            const hasNeighbor = allBubbles.some(b => {
                if (b === bubble) return false;
                const bPos = b.getGridPosition();
                return bPos && bPos.q === neighbor.q && bPos.r === neighbor.r && b.visible;
            });
            
            if (hasNeighbor) {
                return true;
            }
        }
        
        // If no priority neighbors, check all 6 neighbors
        const allNeighbors = [
            { q: pos.q + 1, r: pos.r },
            { q: pos.q - 1, r: pos.r },
            { q: pos.q, r: pos.r - 1 },
            { q: pos.q, r: pos.r + 1 },
            { q: pos.q + 1, r: pos.r - 1 },
            { q: pos.q - 1, r: pos.r + 1 }
        ];
        
        for (const neighbor of allNeighbors) {
            const hasNeighbor = allBubbles.some(b => {
                if (b === bubble) return false;
                const bPos = b.getGridPosition();
                return bPos && bPos.q === neighbor.q && bPos.r === neighbor.r && b.visible;
            });
            
            if (hasNeighbor) {
                return true;
            }
        }
        
        console.error(`Bubble at ${pos.q},${pos.r} has NO connection to structure!`);
        return false;
    }

    /**
     * Check if a position will connect to existing structure
     */
    private checkPositionWillConnect(
        pos: IHexPosition,
        existingBubbles: Bubble[],
        pendingBubbles: { hexPos: IHexPosition, color: BubbleColor }[],
        side: 'top' | 'bottom'
    ): boolean {
        // Center area is always connected (within 3 rings of center)
        if (Math.abs(pos.r) <= 3 && Math.abs(pos.q) <= 3) {
            return true;
        }
        
        // Get correct neighbors using the offset grid system
        const neighbors = this.arenaSystem.bubbleGrid.getNeighbors(pos);
        const isOddRow = Math.abs(pos.r) % 2 === 1;
        
        // For spawn validation, count connections
        let existingConnectionCount = 0;
        let pendingConnectionCount = 0;
        let hasDirectConnection = false;
        
        for (const neighbor of neighbors) {
            // Check existing bubbles
            const hasExisting = existingBubbles.some(b => {
                const bPos = b.getGridPosition();
                return bPos && bPos.q === neighbor.q && bPos.r === neighbor.r && b.visible;
            });
            
            if (hasExisting) {
                existingConnectionCount++;
                
                // Check if this is a direct connection in the right direction
                if (side === 'top' && neighbor.r === pos.r + 1) {
                    // For top side, direct connection is exactly one row below
                    hasDirectConnection = true;
                } else if (side === 'bottom' && neighbor.r === pos.r - 1) {
                    // For bottom side, direct connection is exactly one row above
                    hasDirectConnection = true;
                }
            }
            
            // Check pending bubbles
            const hasPending = pendingBubbles.some(pending => {
                return pending.hexPos.q === neighbor.q && pending.hexPos.r === neighbor.r;
            });
            
            if (hasPending) {
                pendingConnectionCount++;
            }
        }
        
        const totalConnections = existingConnectionCount + pendingConnectionCount;
        
        // Strict validation rules:
        // 1. If we have a direct connection to the row we're extending from, that's valid
        if (hasDirectConnection) {
            return true;
        }
        
        // 2. For gap filling, require at least 2 existing connections (not pending)
        if (existingConnectionCount >= 2) {
            return true;
        }
        
        // 3. Special case: directly aligned vertically with an edge bubble
        const directVertical = existingBubbles.some(b => {
            const bPos = b.getGridPosition();
            if (!bPos || !b.visible) return false;
            
            // Check if directly above/below
            if (bPos.q === pos.q) {
                if (side === 'top' && bPos.r === pos.r + 1) return true;
                if (side === 'bottom' && bPos.r === pos.r - 1) return true;
            }
            return false;
        });
        
        if (directVertical) {
            return true;
        }
        
        // Otherwise, not enough connections
        return false;
    }

    /**
     * Final connection check right before creating a bubble
     */
    private checkFinalConnection(pos: IHexPosition, currentBubbles: Bubble[], side: 'top' | 'bottom'): boolean {
        // Center area is always connected
        if (Math.abs(pos.r) <= 3) {
            return true;
        }
        
        // Get neighbors using offset grid system
        const neighbors = this.arenaSystem.bubbleGrid.getNeighbors(pos);
        
        // Check for at least one neighbor
        for (const neighbor of neighbors) {
            const hasNeighbor = currentBubbles.some(b => {
                const bPos = b.getGridPosition();
                return bPos && bPos.q === neighbor.q && bPos.r === neighbor.r && b.visible;
            });
            
            if (hasNeighbor) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get a random color from available colors
     */
    private getRandomColor(): BubbleColor {
        return this.availableColors[
            Math.floor(Math.random() * this.availableColors.length)
        ];
    }

    /**
     * Pause row spawning (e.g., during combos)
     */
    public pause(): void {
        this.isPaused = true;
        if (this.spawnTimer) {
            this.spawnTimer.paused = true;
        }
        console.log('RowSpawnSystem: Paused');
    }

    /**
     * Resume row spawning
     */
    public resume(): void {
        this.isPaused = false;
        if (this.spawnTimer) {
            this.spawnTimer.paused = false;
        }
        console.log('RowSpawnSystem: Resumed');
    }

    /**
     * Update spawn interval (for difficulty scaling)
     */
    public setSpawnInterval(interval: number): void {
        this.spawnInterval = interval;
        
        // Restart timer with new interval if active
        if (this.isEnabled && this.spawnTimer) {
            this.stopSpawning();
            this.startSpawning(interval);
        }
    }

    /**
     * Get current spawn interval
     */
    public getSpawnInterval(): number {
        return this.spawnInterval;
    }

    /**
     * Check if system is currently active
     */
    public isSpawning(): boolean {
        return this.isEnabled && !this.isPaused;
    }

    /**
     * Cleanup on scene shutdown
     */
    public destroy(): void {
        this.stopSpawning();
        
        // Clean up event listeners
        this.scene.events.off('combo-start');
        this.scene.events.off('combo-complete');
    }
}