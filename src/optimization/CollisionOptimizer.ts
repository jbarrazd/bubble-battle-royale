import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';

/**
 * Optimized collision detection system
 * Uses spatial hashing and broad-phase detection to improve performance
 */
export class CollisionOptimizer {
    private scene: Scene;
    private spatialHash: Map<string, Set<Bubble>> = new Map();
    private cellSize: number = 64; // Size of spatial hash cells
    
    // Collision groups
    private groups: Map<string, Set<Phaser.GameObjects.GameObject>> = new Map();
    
    // Performance settings
    private readonly MAX_CHECKS_PER_FRAME = 100;
    private checksThisFrame = 0;
    
    // Optimization flags
    private useSpatialHash = true;
    private useBroadPhase = true;
    
    // Performance metrics
    private metrics = {
        totalChecks: 0,
        actualCollisions: 0,
        hashHits: 0,
        broadPhaseRejects: 0,
        efficiency: 0
    };
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.setupOptimizations();
    }
    
    /**
     * Setup collision optimizations
     */
    private setupOptimizations(): void {
        // Configure physics settings for better performance
        if (this.scene.physics && this.scene.physics.world) {
            const world = this.scene.physics.world as any;
            
            // Reduce physics iterations for better performance
            world.forceX = false;
            world.isPaused = false;
            world.OVERLAP_BIAS = 4;
            
            // Set bounds to optimize spatial queries
            world.setBounds(0, 0, 
                this.scene.cameras.main.width,
                this.scene.cameras.main.height
            );
            
            // Use quadtree for better collision detection
            world.useTree = true;
        }
        
        console.log('⚡ CollisionOptimizer: Optimizations enabled');
    }
    
    /**
     * Add object to spatial hash
     */
    public addToSpatialHash(obj: Bubble): void {
        if (!this.useSpatialHash) return;
        
        const cells = this.getCellsForObject(obj);
        
        cells.forEach(cell => {
            if (!this.spatialHash.has(cell)) {
                this.spatialHash.set(cell, new Set());
            }
            this.spatialHash.get(cell)!.add(obj);
        });
    }
    
    /**
     * Remove object from spatial hash
     */
    public removeFromSpatialHash(obj: Bubble): void {
        if (!this.useSpatialHash) return;
        
        const cells = this.getCellsForObject(obj);
        
        cells.forEach(cell => {
            const set = this.spatialHash.get(cell);
            if (set) {
                set.delete(obj);
                if (set.size === 0) {
                    this.spatialHash.delete(cell);
                }
            }
        });
    }
    
    /**
     * Update object position in spatial hash
     */
    public updateSpatialHash(obj: Bubble): void {
        if (!this.useSpatialHash) return;
        
        // Remove from old position
        this.removeFromSpatialHash(obj);
        
        // Add to new position
        this.addToSpatialHash(obj);
    }
    
    /**
     * Get cells that object occupies
     */
    private getCellsForObject(obj: Bubble): string[] {
        const cells: string[] = [];
        const radius = 32; // Approximate bubble radius
        
        const minX = Math.floor((obj.x - radius) / this.cellSize);
        const maxX = Math.floor((obj.x + radius) / this.cellSize);
        const minY = Math.floor((obj.y - radius) / this.cellSize);
        const maxY = Math.floor((obj.y + radius) / this.cellSize);
        
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                cells.push(`${x},${y}`);
            }
        }
        
        return cells;
    }
    
    /**
     * Get potential collisions using spatial hash
     */
    public getPotentialCollisions(obj: Bubble): Bubble[] {
        if (!this.useSpatialHash) {
            return []; // Return empty if not using spatial hash
        }
        
        const potential = new Set<Bubble>();
        const cells = this.getCellsForObject(obj);
        
        cells.forEach(cell => {
            const objects = this.spatialHash.get(cell);
            if (objects) {
                objects.forEach(other => {
                    if (other !== obj) {
                        potential.add(other);
                    }
                });
            }
        });
        
        this.metrics.hashHits += potential.size;
        return Array.from(potential);
    }
    
    /**
     * Broad phase collision check
     */
    private broadPhaseCheck(a: Bubble, b: Bubble): boolean {
        if (!this.useBroadPhase) return true;
        
        const radius = 64; // Broad check radius
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius * radius;
        
        if (distSq > radiusSq) {
            this.metrics.broadPhaseRejects++;
            return false;
        }
        
        return true;
    }
    
    /**
     * Optimized circle collision check
     */
    public checkCircleCollision(
        a: Bubble,
        b: Bubble,
        radiusA: number = 32,
        radiusB: number = 32
    ): boolean {
        // Check frame limit
        if (this.checksThisFrame >= this.MAX_CHECKS_PER_FRAME) {
            return false;
        }
        
        this.checksThisFrame++;
        this.metrics.totalChecks++;
        
        // Broad phase check
        if (!this.broadPhaseCheck(a, b)) {
            return false;
        }
        
        // Precise collision check
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = radiusA + radiusB;
        const radiusSumSq = radiusSum * radiusSum;
        
        const collides = distSq <= radiusSumSq;
        
        if (collides) {
            this.metrics.actualCollisions++;
        }
        
        return collides;
    }
    
    /**
     * Check collision with line
     */
    public checkLineCollision(
        bubble: Bubble,
        x1: number, y1: number,
        x2: number, y2: number,
        radius: number = 32
    ): boolean {
        // Vector from line start to bubble
        const dx = bubble.x - x1;
        const dy = bubble.y - y1;
        
        // Line vector
        const lineDx = x2 - x1;
        const lineDy = y2 - y1;
        
        // Line length squared
        const lineLengthSq = lineDx * lineDx + lineDy * lineDy;
        
        if (lineLengthSq === 0) {
            // Line is a point
            const distSq = dx * dx + dy * dy;
            return distSq <= radius * radius;
        }
        
        // Project bubble onto line
        const t = Math.max(0, Math.min(1, (dx * lineDx + dy * lineDy) / lineLengthSq));
        
        // Closest point on line
        const closestX = x1 + t * lineDx;
        const closestY = y1 + t * lineDy;
        
        // Distance from bubble to closest point
        const distX = bubble.x - closestX;
        const distY = bubble.y - closestY;
        const distSq = distX * distX + distY * distY;
        
        return distSq <= radius * radius;
    }
    
    /**
     * Create collision group
     */
    public createGroup(name: string): void {
        if (!this.groups.has(name)) {
            this.groups.set(name, new Set());
        }
    }
    
    /**
     * Add object to collision group
     */
    public addToGroup(name: string, obj: Phaser.GameObjects.GameObject): void {
        const group = this.groups.get(name);
        if (group) {
            group.add(obj);
        }
    }
    
    /**
     * Remove object from collision group
     */
    public removeFromGroup(name: string, obj: Phaser.GameObjects.GameObject): void {
        const group = this.groups.get(name);
        if (group) {
            group.delete(obj);
        }
    }
    
    /**
     * Check collisions between groups
     */
    public checkGroupCollision(
        group1: string,
        group2: string,
        callback: (a: any, b: any) => void
    ): void {
        const g1 = this.groups.get(group1);
        const g2 = this.groups.get(group2);
        
        if (!g1 || !g2) return;
        
        // Use spatial hash for optimization
        if (this.useSpatialHash) {
            g1.forEach(obj1 => {
                if (obj1 instanceof Bubble) {
                    const potential = this.getPotentialCollisions(obj1);
                    
                    potential.forEach(obj2 => {
                        if (g2.has(obj2)) {
                            if (this.checkCircleCollision(obj1, obj2)) {
                                callback(obj1, obj2);
                            }
                        }
                    });
                }
            });
        } else {
            // Fallback to brute force
            g1.forEach(obj1 => {
                g2.forEach(obj2 => {
                    if (obj1 !== obj2 && obj1 instanceof Bubble && obj2 instanceof Bubble) {
                        if (this.checkCircleCollision(obj1, obj2)) {
                            callback(obj1, obj2);
                        }
                    }
                });
            });
        }
    }
    
    /**
     * Update collision system (called each frame)
     */
    public update(): void {
        // Reset frame counter
        this.checksThisFrame = 0;
        
        // Update efficiency metric
        if (this.metrics.totalChecks > 0) {
            this.metrics.efficiency = 
                (this.metrics.actualCollisions / this.metrics.totalChecks) * 100;
        }
        
        // Optimize spatial hash if needed
        if (this.spatialHash.size > 1000) {
            this.optimizeSpatialHash();
        }
    }
    
    /**
     * Optimize spatial hash
     */
    private optimizeSpatialHash(): void {
        // Remove empty cells
        const emptyCells: string[] = [];
        
        this.spatialHash.forEach((set, key) => {
            if (set.size === 0) {
                emptyCells.push(key);
            }
        });
        
        emptyCells.forEach(key => {
            this.spatialHash.delete(key);
        });
        
        // Adjust cell size based on object density
        const totalObjects = Array.from(this.spatialHash.values())
            .reduce((sum, set) => sum + set.size, 0);
        const avgPerCell = totalObjects / this.spatialHash.size;
        
        if (avgPerCell > 10) {
            // Too many objects per cell, decrease cell size
            this.cellSize = Math.max(32, this.cellSize - 8);
            this.rebuildSpatialHash();
        } else if (avgPerCell < 2 && this.cellSize < 128) {
            // Too few objects per cell, increase cell size
            this.cellSize = Math.min(128, this.cellSize + 8);
            this.rebuildSpatialHash();
        }
    }
    
    /**
     * Rebuild spatial hash with new cell size
     */
    private rebuildSpatialHash(): void {
        const allObjects: Bubble[] = [];
        
        // Collect all objects
        this.spatialHash.forEach(set => {
            set.forEach(obj => allObjects.push(obj));
        });
        
        // Clear hash
        this.spatialHash.clear();
        
        // Re-add all objects
        allObjects.forEach(obj => {
            this.addToSpatialHash(obj);
        });
        
        console.log(`CollisionOptimizer: Rebuilt spatial hash with cell size ${this.cellSize}`);
    }
    
    /**
     * Enable/disable optimizations
     */
    public setOptimizations(spatial: boolean, broadPhase: boolean): void {
        this.useSpatialHash = spatial;
        this.useBroadPhase = broadPhase;
        
        if (!spatial) {
            this.spatialHash.clear();
        }
    }
    
    /**
     * Get collision statistics
     */
    public getStats(): any {
        return {
            ...this.metrics,
            spatialHashCells: this.spatialHash.size,
            cellSize: this.cellSize,
            optimizationsEnabled: {
                spatialHash: this.useSpatialHash,
                broadPhase: this.useBroadPhase
            }
        };
    }
    
    /**
     * Reset metrics
     */
    public resetMetrics(): void {
        this.metrics = {
            totalChecks: 0,
            actualCollisions: 0,
            hashHits: 0,
            broadPhaseRejects: 0,
            efficiency: 0
        };
    }
    
    /**
     * Clear all data
     */
    public clear(): void {
        this.spatialHash.clear();
        this.groups.clear();
        this.resetMetrics();
    }
    
    /**
     * Destroy the optimizer
     */
    public destroy(): void {
        this.clear();
    }
}

// Singleton instance
let optimizerInstance: CollisionOptimizer | null = null;

export function getCollisionOptimizer(scene?: Scene): CollisionOptimizer {
    if (!optimizerInstance && scene) {
        optimizerInstance = new CollisionOptimizer(scene);
    }
    
    if (!optimizerInstance) {
        throw new Error('CollisionOptimizer not initialized. Provide a scene on first call.');
    }
    
    return optimizerInstance;
}

export function resetCollisionOptimizer(): void {
    if (optimizerInstance) {
        optimizerInstance.destroy();
        optimizerInstance = null;
    }
}