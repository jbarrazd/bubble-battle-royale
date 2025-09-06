import { Scene } from 'phaser';
import { BaseGameSystem } from '@/core/SystemRegistry';
import { Bubble } from '@/gameObjects/Bubble';
import { MysteryBubble } from '@/gameObjects/MysteryBubble';
import { BubbleColor, IHexPosition } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';
import { eventBus } from '@/core/EventBus';
import { gameState } from '@/core/GameStateManager';

/**
 * Manages all bubble creation, pooling, and lifecycle
 * Separated from game logic for better organization
 */
export class BubbleManager extends BaseGameSystem {
    public name = 'BubbleManager';
    public priority = 10; // Initialize early
    
    // Bubble pools
    private bubblePool: Bubble[] = [];
    private activeBubbles: Set<Bubble> = new Set();
    private readonly POOL_SIZE = 200;
    
    // Mystery bubble tracking
    private mysteryBubbles: Set<MysteryBubble> = new Set();
    private readonly MYSTERY_BUBBLE_RATIO = 0.125; // 12.5% from GDD
    
    // Statistics
    private stats = {
        totalCreated: 0,
        totalDestroyed: 0,
        currentActive: 0,
        poolHits: 0,
        poolMisses: 0
    };
    
    public initialize(): void {
        console.log('  → Initializing BubbleManager...');
        
        // Pre-populate pool
        this.initializePool();
        
        // Listen for bubble events
        this.setupEventListeners();
        
        this.markInitialized();
    }
    
    private initializePool(): void {
        for (let i = 0; i < this.POOL_SIZE; i++) {
            const bubble = new Bubble(
                this.scene,
                -1000, // Off-screen
                -1000,
                Bubble.getRandomColor()
            );
            bubble.setActive(false);
            bubble.setVisible(false);
            this.bubblePool.push(bubble);
        }
        console.log(`    Created pool of ${this.POOL_SIZE} bubbles`);
    }
    
    private setupEventListeners(): void {
        // Clean up destroyed bubbles
        eventBus.on('bubble-destroyed', (data) => {
            if (data && typeof data === 'object' && 'bubble' in data) {
                this.returnToPool(data.bubble as Bubble);
            }
        });
    }
    
    /**
     * Get a bubble from pool or create new one
     */
    public getBubble(x: number, y: number, color?: BubbleColor): Bubble {
        let bubble = this.getFromPool();
        
        // Check if pooled bubble still has valid scene reference
        if (bubble && !bubble.scene) {
            // Silently handle - this is expected when bubbles are destroyed
            bubble = null;
        }
        
        if (!bubble) {
            // Pool empty or invalid, create new
            this.stats.poolMisses++;
            bubble = new Bubble(this.scene, x, y, color || Bubble.getRandomColor());
        } else {
            // Reuse from pool
            this.stats.poolHits++;
            bubble.reset(x, y, color || Bubble.getRandomColor());
        }
        
        bubble.setActive(true);
        bubble.setVisible(true);
        this.activeBubbles.add(bubble);
        this.stats.totalCreated++;
        this.stats.currentActive = this.activeBubbles.size;
        
        return bubble;
    }
    
    /**
     * Create a mystery bubble (not pooled due to special behavior)
     */
    public createMysteryBubble(x: number, y: number): MysteryBubble {
        const mystery = new MysteryBubble(this.scene, x, y);
        this.mysteryBubbles.add(mystery);
        this.activeBubbles.add(mystery);
        this.stats.totalCreated++;
        this.stats.currentActive = this.activeBubbles.size;
        return mystery;
    }
    
    /**
     * Get bubble from pool
     */
    private getFromPool(): Bubble | null {
        for (let i = 0; i < this.bubblePool.length; i++) {
            const bubble = this.bubblePool[i];
            if (!bubble.active && !bubble.visible) {
                return bubble;
            }
        }
        return null;
    }
    
    /**
     * Return bubble to pool
     */
    public returnToPool(bubble: Bubble): void {
        if (!bubble) return;
        
        // Don't pool mystery bubbles
        if (bubble instanceof MysteryBubble) {
            this.mysteryBubbles.delete(bubble);
            bubble.destroy();
        } else {
            // Reset and return to pool
            bubble.setActive(false);
            bubble.setVisible(false);
            bubble.setPosition(-1000, -1000);
            bubble.clearTint();
            bubble.setScale(1);
            bubble.setRotation(0);
            bubble.setAlpha(1);
            
            // Clear any tweens
            this.scene.tweens.killTweensOf(bubble);
            
            // Clear physics velocity
            if (bubble.body && 'velocity' in bubble.body) {
                (bubble.body as any).velocity?.reset?.();
            }
        }
        
        this.activeBubbles.delete(bubble);
        this.stats.totalDestroyed++;
        this.stats.currentActive = this.activeBubbles.size;
    }
    
    /**
     * Create initial field pattern with better color clustering for matches
     */
    public createFieldPattern(
        positions: Array<{ hexPos: IHexPosition; pixelPos: { x: number; y: number } }>,
        mysteryRatio: number = this.MYSTERY_BUBBLE_RATIO
    ): Bubble[] {
        const bubbles: Bubble[] = [];
        const totalBubbles = positions.length;
        const mysteryCount = Math.floor(totalBubbles * mysteryRatio);
        
        // Randomly select positions for mystery bubbles
        const mysteryIndices = new Set<number>();
        while (mysteryIndices.size < mysteryCount) {
            mysteryIndices.add(Math.floor(Math.random() * totalBubbles));
        }
        
        // Create a color map to encourage clustering
        const colorMap = new Map<string, BubbleColor>();
        const availableColors: BubbleColor[] = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.GREEN,
            BubbleColor.YELLOW,
            BubbleColor.PURPLE
        ];
        
        // Create bubbles with clustering tendency
        positions.forEach((pos, index) => {
            let bubble: Bubble;
            
            if (mysteryIndices.has(index)) {
                bubble = this.createMysteryBubble(pos.pixelPos.x, pos.pixelPos.y);
            } else {
                // Determine color with clustering
                let color: BubbleColor;
                const key = `${pos.hexPos.q},${pos.hexPos.r}`;
                
                // Check if neighbors already have colors assigned
                const neighborColors: BubbleColor[] = [];
                const offsets = [
                    { q: 0, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
                    { q: -1, r: 1 }, { q: -1, r: 0 }, { q: -1, r: -1 }
                ];
                
                for (const offset of offsets) {
                    const neighborKey = `${pos.hexPos.q + offset.q},${pos.hexPos.r + offset.r}`;
                    if (colorMap.has(neighborKey)) {
                        neighborColors.push(colorMap.get(neighborKey)!);
                    }
                }
                
                // 60% chance to match a neighbor's color if available
                if (neighborColors.length > 0 && Math.random() < 0.6) {
                    // Pick a random neighbor's color
                    color = neighborColors[Math.floor(Math.random() * neighborColors.length)];
                } else {
                    // Use weighted random for better distribution
                    // Favor fewer colors for more matches
                    const weightedColors = availableColors.slice(0, 3 + Math.floor(Math.random() * 2));
                    color = weightedColors[Math.floor(Math.random() * weightedColors.length)];
                }
                
                colorMap.set(key, color);
                
                bubble = this.getBubble(
                    pos.pixelPos.x,
                    pos.pixelPos.y,
                    color
                );
                
                // Add gems based on theme
                const theme = gameState().getState().settings.theme;
                if (theme === 'space' && Math.random() < 0.2) {
                    bubble.setGem(true, Math.random() < 0.1 ? 'golden' : 'normal');
                }
            }
            
            bubble.setGridPosition(pos.hexPos);
            bubbles.push(bubble);
        });
        
        console.log('[BubbleManager] Created field with color clustering for better match potential');
        return bubbles;
    }
    
    /**
     * Get all active bubbles
     */
    public getActiveBubbles(): Bubble[] {
        return Array.from(this.activeBubbles);
    }
    
    /**
     * Get active bubble count
     */
    public getActiveBubbleCount(): number {
        return this.activeBubbles.size;
    }
    
    /**
     * Clear all bubbles (for game reset)
     */
    public clearAllBubbles(): void {
        // Return all to pool
        this.activeBubbles.forEach(bubble => {
            this.returnToPool(bubble);
        });
        
        // Clear mystery bubbles
        this.mysteryBubbles.forEach(mystery => {
            mystery.destroy();
        });
        this.mysteryBubbles.clear();
        
        this.activeBubbles.clear();
        this.stats.currentActive = 0;
    }
    
    /**
     * Get pool statistics for debugging
     */
    public getStats(): typeof this.stats {
        return { ...this.stats };
    }
    
    /**
     * Get pool usage percentage
     */
    public getPoolUsage(): number {
        const usedCount = this.bubblePool.filter(b => b.active || b.visible).length;
        return (usedCount / this.POOL_SIZE) * 100;
    }
    
    /**
     * Optimize pool size based on usage
     */
    public optimizePool(): void {
        const usage = this.getPoolUsage();
        
        if (usage > 90) {
            // Expand pool
            const expansion = Math.floor(this.POOL_SIZE * 0.5);
            for (let i = 0; i < expansion; i++) {
                const bubble = new Bubble(
                    this.scene,
                    -1000,
                    -1000,
                    Bubble.getRandomColor()
                );
                bubble.setActive(false);
                bubble.setVisible(false);
                this.bubblePool.push(bubble);
            }
            console.log(`Expanded bubble pool by ${expansion} (usage was ${usage.toFixed(1)}%)`);
        }
    }
    
    public update(time: number, delta: number): void {
        // Periodic pool optimization
        if (Math.floor(time / 10000) % 3 === 0) {
            this.optimizePool();
        }
    }
    
    public destroy(): void {
        // Clean up all bubbles
        this.clearAllBubbles();
        
        // Destroy pool
        this.bubblePool.forEach(bubble => bubble.destroy());
        this.bubblePool = [];
        
        super.destroy();
    }
}