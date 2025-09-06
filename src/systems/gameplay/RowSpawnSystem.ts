/**
 * RowSpawnSystem - Automatic row spawning system for Bubble Gems Clash
 * BGC-001: Implements automatic spawning of bubble rows to create pressure
 * Spawns rows adjacent to existing bubbles on both sides
 */

import { Scene } from 'phaser';
import { ArenaSystem } from './ArenaSystem';
import { Bubble } from '@/gameObjects/Bubble';
import { MysteryBubble } from '@/gameObjects/MysteryBubble';
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
    private spawnCounter: number = 0; // Track spawns for Mystery Bubble timing
    private spawnAcceleration: number = 0; // Track how many times we've spawned
    private isPlayerShooting: boolean = false; // Track if player is currently shooting
    
    // Arena-specific configurations
    private readonly ARENA_CONFIGS: Record<string, RowSpawnConfig> = {
        ocean: {
            interval: 25000,  // 25 seconds - much slower pace
            pattern: 'random',
            colors: 5
        },
        space: {
            interval: 20000,   // 20 seconds initially - much slower
            pattern: 'random',
            colors: 5
        },
        volcanic: {
            interval: 22000,  // 22 seconds - slower pace
            pattern: 'random',
            colors: 5
        },
        crystal: {
            interval: 18000,   // 18 seconds - slower but still faster than others
            pattern: 'random',
            colors: 6
        }
    };
    
    // Progressive difficulty settings
    private readonly MIN_INTERVAL = 8000; // Minimum spawn interval (8 seconds) - much more manageable
    private readonly ACCELERATION_RATE = 0.98; // Each spawn makes next one 2% faster - even slower acceleration

    constructor(scene: Scene, arenaSystem: ArenaSystem) {
        this.scene = scene;
        this.arenaSystem = arenaSystem;
        this.centerY = scene.cameras.main.centerY;
        
        // Get current theme from registry or default to ocean
        const theme = this.scene.registry.get('gameTheme') || 'ocean';
        this.currentConfig = this.ARENA_CONFIGS[theme] || this.ARENA_CONFIGS.ocean;
        
        // Initialize available colors based on config
        this.initializeColors();
        
        // Listen for shooting events
        this.setupShootingListeners();
    }

    private setupShootingListeners(): void {
        this.scene.events.on('shooting-started', () => {
            this.isPlayerShooting = true;
        });
        
        this.scene.events.on('shooting-complete', () => {
            this.isPlayerShooting = false;
        });
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
        this.spawnAcceleration = 0; // Reset acceleration when starting
        
        // Create timer for spawning
        this.spawnTimer = this.scene.time.addEvent({
            delay: this.spawnInterval,
            callback: this.spawnNewRows,
            callbackScope: this,
            loop: true
        });
        
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
        
    }

    /**
     * Main spawn function - adds rows adjacent to existing edge bubbles
     */
    private spawnNewRows(): void {
        if (this.isPaused || !this.isEnabled) {
            return;
        }
        
        // Don't spawn while player is shooting to prevent unfair losses
        if (this.isPlayerShooting) {
            // Reschedule this spawn for 1 second later
            this.scene.time.delayedCall(1000, () => {
                if (!this.isPlayerShooting) {
                    this.spawnNewRows();
                }
            });
            return;
        }
        
        // Check if immunity is active from ResetSystem
        const arenaSystem = (this.scene as any).arenaSystem;
        if (arenaSystem?.resetSystem?.isImmunityActive()) {
            return;
        }
        
        // Check if field has too few bubbles and needs emergency refill
        const currentBubbles = this.arenaSystem.getAllBubbles();
        const activeBubbleCount = currentBubbles.filter(b => b.visible).length;
        const MIN_BUBBLES_THRESHOLD = 10; // Minimum bubbles before forcing refill
        
        if (activeBubbleCount < MIN_BUBBLES_THRESHOLD) {
            // Force multiple row spawns to refill the field
            this.performEmergencyRefill();
            return;
        }

        // Increment spawn counter for Mystery Bubble timing
        this.spawnCounter++;
        this.spawnAcceleration++;
        
        // Progressive difficulty: Speed up spawning over time
        if (this.spawnTimer && this.spawnInterval > this.MIN_INTERVAL) {
            // Calculate new interval (gets faster each time)
            const newInterval = Math.max(
                this.MIN_INTERVAL,
                this.spawnInterval * this.ACCELERATION_RATE
            );
            
            // Only update if significantly different (avoid too many timer recreations)
            if (Math.abs(newInterval - this.spawnInterval) > 100) {
                this.spawnInterval = newInterval;
                
                // Destroy old timer and create new one with faster interval
                this.spawnTimer.destroy();
                this.spawnTimer = this.scene.time.addEvent({
                    delay: this.spawnInterval,
                    callback: this.spawnNewRows,
                    callbackScope: this,
                    loop: true
                });
                
            }
        }
        
        
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
        
        // CRITICAL: Find THE MOST DANGEROUS bubble on each side
        // These are the bubbles closest to causing game over
        let mostDangerousTop: Bubble | null = null;
        let mostDangerousBottom: Bubble | null = null;
        let minR = Infinity;  // For top (most negative wins)
        let maxR = -Infinity; // For bottom (most positive wins)
        
        allBubbles.forEach(bubble => {
            if (!bubble.visible) return;
            const pos = bubble.getGridPosition();
            if (!pos) return;
            
            // Find THE most dangerous bubble on top (smallest r)
            if (pos.r < minR) {
                minR = pos.r;
                mostDangerousTop = bubble;
            }
            
            // Find THE most dangerous bubble on bottom (largest r)
            if (pos.r > maxR) {
                maxR = pos.r;
                mostDangerousBottom = bubble;
            }
        });
        
        // PRIORITY 1: Always spawn at the most dangerous positions first
        const criticalSpawns: { hexPos: IHexPosition, color: BubbleColor }[] = [];
        
        if (mostDangerousTop) {
            const dangerPos = mostDangerousTop.getGridPosition()!;
            const criticalPos = {
                q: dangerPos.q,
                r: dangerPos.r - 1, // Above the most dangerous
                s: -dangerPos.q - (dangerPos.r - 1)
            };
            const key = `${criticalPos.q},${criticalPos.r}`;
            
            if (!occupiedPositions.has(key) && Math.abs(criticalPos.r) <= 12) {
                const color = this.getRandomColor();
                criticalSpawns.push({ hexPos: criticalPos, color });
                occupiedPositions.set(key, true);
                console.warn(`CRITICAL SPAWN TOP: Will add at ${criticalPos.q},${criticalPos.r} - MOST DANGEROUS POSITION!`);
            }
        }
        
        if (mostDangerousBottom) {
            const dangerPos = mostDangerousBottom.getGridPosition()!;
            const criticalPos = {
                q: dangerPos.q,
                r: dangerPos.r + 1, // Below the most dangerous
                s: -dangerPos.q - (dangerPos.r + 1)
            };
            const key = `${criticalPos.q},${criticalPos.r}`;
            
            if (!occupiedPositions.has(key) && Math.abs(criticalPos.r) <= 12) {
                const color = this.getRandomColor();
                criticalSpawns.push({ hexPos: criticalPos, color });
                occupiedPositions.set(key, true);
                console.warn(`CRITICAL SPAWN BOTTOM: Will add at ${criticalPos.q},${criticalPos.r} - MOST DANGEROUS POSITION!`);
            }
        }
        
        // Create critical spawns FIRST
        criticalSpawns.forEach(spawn => {
            const pixelPos = bubbleGrid.hexToPixel(spawn.hexPos);
            
            // Mystery Bubble check for critical spawns
            const shouldSpawnMystery = this.spawnCounter % 2 === 0 && Math.random() < 0.3;
            
            if (shouldSpawnMystery) {
                // Always use regular MysteryBubble with texture cache
                const mysteryBubble = new MysteryBubble(this.scene, pixelPos.x, pixelPos.y);
                mysteryBubble.setGridPosition(spawn.hexPos);
                this.arenaSystem.bubbles.push(mysteryBubble);
                gridAttachment.addGridBubble(mysteryBubble);
                console.log(`Created CRITICAL Mystery Bubble at ${spawn.hexPos.q},${spawn.hexPos.r}`);
            } else {
                const bubble = this.arenaSystem.createBubbleAt(
                    pixelPos.x,
                    pixelPos.y,
                    spawn.color
                );
                if (bubble) {
                    bubble.setGridPosition(spawn.hexPos);
                    gridAttachment.addGridBubble(bubble);
                    console.log(`Created CRITICAL ${spawn.color} bubble at ${spawn.hexPos.q},${spawn.hexPos.r}`);
                }
            }
        });
        
        // PRIORITY 2: Continue with normal edge spawning
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
        
        // Find the topmost bubble in each column WITHOUT filtering by half
        // This ensures we always spawn at the most dangerous edge
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            
            const pos = bubble.getGridPosition();
            if (!pos) return;
            
            const existing = columnMap.get(pos.q);
            
            // Always keep the bubble with the smallest (most negative) r value
            // This is the bubble closest to the opponent's danger zone
            if (!existing || pos.r < existing.r) {
                columnMap.set(pos.q, { bubble, r: pos.r });
            }
        });
        
        // Convert map to array and log positions
        columnMap.forEach((data, q) => {
            edgeBubbles.push(data.bubble);
            console.log(`Top edge bubble at column ${q}, row ${data.r}`);
        });
        
        console.log(`Found ${edgeBubbles.length} top edge bubbles (closest to opponent danger)`);
        return edgeBubbles;
    }

    /**
     * Find the bottommost bubbles (player side edge)
     * These are the bubbles with the LARGEST (most positive) r value in each column
     */
    private findBottomEdgeBubbles(bubbles: Bubble[]): Bubble[] {
        const edgeBubbles: Bubble[] = [];
        const columnMap = new Map<number, { bubble: Bubble, r: number }>();
        
        // Find the bottommost bubble in each column WITHOUT filtering by half
        // This ensures we always spawn at the most dangerous edge
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            
            const pos = bubble.getGridPosition();
            if (!pos) return;
            
            const existing = columnMap.get(pos.q);
            
            // Always keep the bubble with the largest (most positive) r value
            // This is the bubble closest to the player's danger zone
            if (!existing || pos.r > existing.r) {
                columnMap.set(pos.q, { bubble, r: pos.r });
            }
        });
        
        // Convert map to array and log positions
        columnMap.forEach((data, q) => {
            edgeBubbles.push(data.bubble);
            console.log(`Bottom edge bubble at column ${q}, row ${data.r}`);
        });
        
        console.log(`Found ${edgeBubbles.length} bottom edge bubbles (closest to player danger)`);
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
                // AGGRESSIVE SPAWN - Allow spawning very close to danger zones
                // Player loses around r=10-11, opponent loses around r=-10 to -11
                if (Math.abs(newPos.r) > 12 || Math.abs(newPos.q) > 8) {
                    console.log(`Skipping extreme out-of-bounds position ${newPos.q},${newPos.r}`);
                    return;
                }
                
                // Since we're adding directly above/below existing bubbles,
                // they ALWAYS have support from the bubble below/above them
                // ALWAYS spawn for MAXIMUM pressure - no random chance
                const color = this.getRandomColor();
                newBubbles.push({ hexPos: newPos, color });
                occupiedPositions.set(key, true);
                supportedPositions.add(key);
                
                console.log(`FORCING bubble at ${newPos.q},${newPos.r} ${side === 'top' ? 'ABOVE' : 'BELOW'} edge bubble at ${edgePos.q},${edgePos.r}`);
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
                        
                        // Check bounds - VERY AGGRESSIVE
                        if (Math.abs(gapPos.r) > 12 || Math.abs(gapPos.q) > 8) {
                            continue;
                        }
                        
                        // Only fill gap if it has support from existing structure
                        const hasSupport = this.checkHasNeighborSupport(gapPos, supportedPositions, occupiedPositions);
                        
                        // ALWAYS fill gaps when there's support - maximum pressure
                        if (!occupiedPositions.has(key) && hasSupport) {
                            const color = this.getRandomColor();
                            newBubbles.push({ hexPos: gapPos, color });
                            occupiedPositions.set(key, true);
                            supportedPositions.add(key);
                            console.log(`FORCING gap fill at ${gapPos.q},${gapPos.r}`);
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
        
        // Determine if we should spawn Mystery Bubbles this round (every 2 spawns)
        const shouldSpawnMystery = this.spawnCounter % 2 === 0;
        const mysteryBubbleChance = 0.50; // 50% chance for ONE bubble per side if it's a Mystery round
        
        // Track how many Mystery Bubbles we've added (max 1 per side per spawn)
        let mysteryAddedThisSide = false;
        
        validatedBubbles.forEach((bubbleData, index) => {
            // Double-check connectivity right before creation with updated grid state
            const currentGrid = gridAttachment.getGridBubbles();
            const hasConnection = this.checkFinalConnection(bubbleData.hexPos, currentGrid, side);
            
            if (!hasConnection) {
                console.warn(`Skipping creation of bubble at (${bubbleData.hexPos.q},${bubbleData.hexPos.r}) - lost connection during batch creation`);
                return;
            }
            
            const pixelPos = bubbleGrid.hexToPixel(bubbleData.hexPos);
            
            // Decide if this should be a Mystery Bubble
            const makeMystery = shouldSpawnMystery && 
                               !mysteryAddedThisSide && 
                               Math.random() < mysteryBubbleChance;
            
            let bubble: Bubble | null = null;
            
            if (makeMystery) {
                // Create a Mystery Bubble
                console.log(`Spawning Mystery Bubble at (${bubbleData.hexPos.q},${bubbleData.hexPos.r}) for ${side} side`);
                // Always use regular MysteryBubble with texture cache
                const mysteryBubble = new MysteryBubble(this.scene, pixelPos.x, pixelPos.y);
                bubble = mysteryBubble;
                mysteryAddedThisSide = true;
            } else {
                // Create a normal bubble
                bubble = this.arenaSystem.createBubbleAt(
                    pixelPos.x,
                    pixelPos.y,
                    bubbleData.color
                );
            }
            
            if (bubble) {
                // Set grid position
                bubble.setGridPosition(bubbleData.hexPos);
                
                // Add to grid attachment system
                gridAttachment.addGridBubble(bubble);
                
                // If it's a Mystery Bubble, also add it to the arena's bubbles array
                if (bubble instanceof MysteryBubble) {
                    this.arenaSystem.bubbles.push(bubble);
                }
                
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
                    
                    // Emit row-spawned event for reset system to check
                    this.scene.events.emit('row-spawned');
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
        const wasEnabled = this.isEnabled;
        this.spawnInterval = interval;
        
        // Only restart if currently spawning
        if (wasEnabled && this.spawnTimer) {
            // Store current state
            const wasPaused = this.isPaused;
            
            // Stop current timer
            this.spawnTimer.destroy();
            
            // Create new timer with new interval
            this.spawnTimer = this.scene.time.addEvent({
                delay: this.spawnInterval,
                callback: this.spawnNewRows,
                callbackScope: this,
                loop: true
            });
            
            // Restore pause state if needed
            if (wasPaused) {
                this.spawnTimer.paused = true;
                this.isPaused = true;
            }
            
            console.log(`RowSpawnSystem: Updated interval to ${interval}ms`);
        }
    }
    
    /**
     * Perform emergency refill when field has too few bubbles
     */
    private performEmergencyRefill(): void {
        console.log('RowSpawnSystem: Performing emergency refill!');
        
        const bubbleGrid = this.arenaSystem.bubbleGrid;
        const gridAttachment = this.arenaSystem.gridAttachmentSystem;
        
        // Add bubbles in the center area
        const centerPositions: IHexPosition[] = [
            { q: 0, r: -2, s: 2 },
            { q: 1, r: -2, s: 1 },
            { q: -1, r: -2, s: 3 },
            { q: 0, r: -1, s: 1 },
            { q: 1, r: -1, s: 0 },
            { q: -1, r: -1, s: 2 },
            { q: 2, r: -1, s: -1 },
            { q: -2, r: -1, s: 3 },
            { q: 0, r: 0, s: 0 },
            { q: 1, r: 0, s: -1 },
            { q: -1, r: 0, s: 1 },
            { q: 2, r: 0, s: -2 },
            { q: -2, r: 0, s: 2 },
            { q: 0, r: 1, s: -1 },
            { q: 1, r: 1, s: -2 },
            { q: -1, r: 1, s: 0 },
            { q: 2, r: 1, s: -3 },
            { q: -2, r: 1, s: 1 },
            { q: 0, r: 2, s: -2 },
            { q: 1, r: 2, s: -3 },
            { q: -1, r: 2, s: -1 }
        ];
        
        // Check which positions are empty and add bubbles
        let bubblesAdded = 0;
        const existingBubbles = this.arenaSystem.getAllBubbles();
        
        for (const pos of centerPositions) {
            // Check if position is occupied
            const isOccupied = existingBubbles.some(b => {
                const bPos = b.getGridPosition();
                return bPos && bPos.q === pos.q && bPos.r === pos.r && b.visible;
            });
            
            if (!isOccupied) {
                const pixelPos = bubbleGrid.hexToPixel(pos);
                const color = this.getRandomColor();
                const bubble = this.arenaSystem.createBubbleAt(
                    pixelPos.x,
                    pixelPos.y,
                    color
                );
                
                if (bubble) {
                    bubble.setGridPosition(pos);
                    gridAttachment.addGridBubble(bubble);
                    bubblesAdded++;
                }
            }
        }
        
        console.log(`RowSpawnSystem: Emergency refill complete, added ${bubblesAdded} bubbles`);
        
        // Emit event for UI notification
        this.scene.events.emit('emergency-refill', { bubblesAdded });
    }
    
    /**
     * Enter sudden death mode - speeds up spawning dramatically
     */
    public enterSuddenDeath(): void {
        console.log('RowSpawnSystem: Entering SUDDEN DEATH mode!');
        
        // Just change the interval for next spawn without stopping
        this.spawnInterval = 5000; // 5 seconds
        
        // Don't restart the timer immediately, let it apply on next natural spawn
        console.log('RowSpawnSystem: Sudden death will apply on next spawn cycle');
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
        this.scene.events.off('shooting-started');
        this.scene.events.off('shooting-complete');
    }
}