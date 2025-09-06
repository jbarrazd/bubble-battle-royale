import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor } from '@/types/ArenaTypes';

/**
 * Optimized bubble pooling system
 * Reduces garbage collection and improves performance
 */
export class BubblePool {
    private scene: Scene;
    private pools: Map<BubbleColor, Bubble[]> = new Map();
    private activeMap: WeakMap<Bubble, boolean> = new WeakMap();
    
    // Pool configuration
    private readonly INITIAL_SIZE = 30; // Per color
    private readonly MAX_SIZE = 50; // Per color
    private readonly EXPANSION_SIZE = 10;
    
    // Performance metrics
    private metrics = {
        created: 0,
        reused: 0,
        expanded: 0,
        hitRate: 0
    };
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializePools();
    }
    
    /**
     * Initialize pools for each bubble color
     */
    private initializePools(): void {
        const colors: BubbleColor[] = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.YELLOW,
            BubbleColor.GREEN,
            BubbleColor.PURPLE
        ];
        
        for (const color of colors) {
            this.pools.set(color, []);
            this.preallocate(color, this.INITIAL_SIZE);
        }
        
        console.log(`🎱 BubblePool: Initialized with ${colors.length * this.INITIAL_SIZE} bubbles`);
    }
    
    /**
     * Preallocate bubbles for a color
     */
    private preallocate(color: BubbleColor, count: number): void {
        const pool = this.pools.get(color)!;
        
        for (let i = 0; i < count; i++) {
            const bubble = this.createBubble(color);
            pool.push(bubble);
        }
        
        this.metrics.created += count;
    }
    
    /**
     * Create a new bubble
     */
    private createBubble(color: BubbleColor): Bubble {
        const bubble = new Bubble(
            this.scene,
            -1000, // Off-screen
            -1000,
            color
        );
        
        bubble.setActive(false);
        bubble.setVisible(false);
        
        // Clear physics
        if (bubble.body) {
            (bubble.body as any).enable = false;
        }
        
        return bubble;
    }
    
    /**
     * Get a bubble from the pool
     */
    public acquire(color: BubbleColor, x: number, y: number): Bubble {
        let pool = this.pools.get(color);
        
        if (!pool) {
            // Color not in pool, create new pool
            pool = [];
            this.pools.set(color, pool);
            this.preallocate(color, this.INITIAL_SIZE);
        }
        
        // Find inactive bubble
        let bubble: Bubble | undefined;
        for (const b of pool) {
            if (!this.activeMap.get(b) && !b.active) {
                bubble = b;
                break;
            }
        }
        
        // If no inactive bubble, expand pool if possible
        if (!bubble) {
            if (pool.length < this.MAX_SIZE) {
                this.preallocate(color, Math.min(this.EXPANSION_SIZE, this.MAX_SIZE - pool.length));
                this.metrics.expanded++;
                bubble = pool[pool.length - 1];
            } else {
                // Pool at max size, create temporary bubble
                console.warn(`BubblePool: Max size reached for color ${color}`);
                bubble = this.createBubble(color);
            }
        }
        
        // Activate and position bubble
        this.activateBubble(bubble, x, y, color);
        this.metrics.reused++;
        this.updateHitRate();
        
        return bubble;
    }
    
    /**
     * Activate a pooled bubble
     */
    private activateBubble(bubble: Bubble, x: number, y: number, color: BubbleColor): void {
        // Reset position
        bubble.setPosition(x, y);
        
        // Reset visual state
        bubble.setActive(true);
        bubble.setVisible(true);
        bubble.setAlpha(1);
        bubble.setScale(1);
        bubble.setRotation(0);
        bubble.clearTint();
        
        // Reset physics
        if (bubble.body) {
            (bubble.body as any).enable = true;
            if ('velocity' in bubble.body) {
                (bubble.body as any).velocity.reset();
            }
        }
        
        // Reset bubble state
        bubble.reset(x, y, color);
        
        // Mark as active
        this.activeMap.set(bubble, true);
        
        // Clear any existing tweens
        this.scene.tweens.killTweensOf(bubble);
    }
    
    /**
     * Release a bubble back to the pool
     */
    public release(bubble: Bubble): void {
        if (!bubble) return;
        
        // Mark as inactive
        this.activeMap.set(bubble, false);
        
        // Deactivate
        bubble.setActive(false);
        bubble.setVisible(false);
        
        // Move off-screen
        bubble.setPosition(-1000, -1000);
        
        // Clear physics
        if (bubble.body) {
            (bubble.body as any).enable = false;
        }
        
        // Kill any tweens
        this.scene.tweens.killTweensOf(bubble);
    }
    
    /**
     * Release all bubbles back to pool
     */
    public releaseAll(): void {
        for (const pool of this.pools.values()) {
            for (const bubble of pool) {
                if (this.activeMap.get(bubble)) {
                    this.release(bubble);
                }
            }
        }
    }
    
    /**
     * Update hit rate metric
     */
    private updateHitRate(): void {
        if (this.metrics.created > 0) {
            this.metrics.hitRate = (this.metrics.reused / (this.metrics.created + this.metrics.reused)) * 100;
        }
    }
    
    /**
     * Get pool statistics
     */
    public getStats(): any {
        const stats: any = {
            ...this.metrics,
            pools: {}
        };
        
        for (const [color, pool] of this.pools.entries()) {
            const active = pool.filter(b => this.activeMap.get(b)).length;
            stats.pools[BubbleColor[color]] = {
                total: pool.length,
                active: active,
                available: pool.length - active
            };
        }
        
        return stats;
    }
    
    /**
     * Optimize pool sizes based on usage
     */
    public optimize(): void {
        for (const [color, pool] of this.pools.entries()) {
            const active = pool.filter(b => this.activeMap.get(b)).length;
            const usage = (active / pool.length) * 100;
            
            // Expand if usage is high
            if (usage > 80 && pool.length < this.MAX_SIZE) {
                const expansion = Math.min(this.EXPANSION_SIZE, this.MAX_SIZE - pool.length);
                this.preallocate(color, expansion);
                console.log(`BubblePool: Expanded ${BubbleColor[color]} pool by ${expansion}`);
            }
            
            // Shrink if usage is very low (optional)
            if (usage < 20 && pool.length > this.INITIAL_SIZE * 2) {
                // Remove excess inactive bubbles
                const toRemove = Math.floor((pool.length - active) / 2);
                for (let i = 0; i < toRemove; i++) {
                    const bubble = pool.find(b => !this.activeMap.get(b));
                    if (bubble) {
                        const index = pool.indexOf(bubble);
                        pool.splice(index, 1);
                        bubble.destroy();
                    }
                }
                console.log(`BubblePool: Shrunk ${BubbleColor[color]} pool by ${toRemove}`);
            }
        }
    }
    
    /**
     * Warm up the pool by creating bubbles in advance
     */
    public warmUp(): void {
        console.log('BubblePool: Warming up...');
        
        // Create and immediately release bubbles to warm up memory
        for (const color of this.pools.keys()) {
            const tempBubbles: Bubble[] = [];
            
            // Acquire half the pool
            for (let i = 0; i < this.INITIAL_SIZE / 2; i++) {
                tempBubbles.push(this.acquire(color, 0, 0));
            }
            
            // Release them back
            for (const bubble of tempBubbles) {
                this.release(bubble);
            }
        }
        
        console.log('BubblePool: Warm-up complete');
    }
    
    /**
     * Clean up the pool
     */
    public destroy(): void {
        for (const pool of this.pools.values()) {
            for (const bubble of pool) {
                bubble.destroy();
            }
        }
        
        this.pools.clear();
        this.activeMap = new WeakMap();
    }
}

// Singleton instance
let poolInstance: BubblePool | null = null;

export function getBubblePool(scene?: Scene): BubblePool {
    if (!poolInstance && scene) {
        poolInstance = new BubblePool(scene);
    }
    
    if (!poolInstance) {
        throw new Error('BubblePool not initialized. Provide a scene on first call.');
    }
    
    return poolInstance;
}

export function resetBubblePool(): void {
    if (poolInstance) {
        poolInstance.destroy();
        poolInstance = null;
    }
}