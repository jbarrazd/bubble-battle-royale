/**
 * Central export for all optimization systems
 */

export { BubblePool, getBubblePool, resetBubblePool } from './BubblePool';
export { TextureCache, getTextureCache, resetTextureCache } from './TextureCache';
export { ParticlePool, getParticlePool, resetParticlePool } from './ParticlePool';
export { AssetLoader, getAssetLoader, resetAssetLoader } from './AssetLoader';
export { CollisionOptimizer, getCollisionOptimizer, resetCollisionOptimizer } from './CollisionOptimizer';

import { Scene } from 'phaser';
import { getBubblePool, resetBubblePool } from './BubblePool';
import { getTextureCache, resetTextureCache } from './TextureCache';
import { getParticlePool, resetParticlePool } from './ParticlePool';
import { getAssetLoader, resetAssetLoader } from './AssetLoader';
import { getCollisionOptimizer, resetCollisionOptimizer } from './CollisionOptimizer';

/**
 * Initialize all optimization systems
 */
export function initializeOptimizations(scene: Scene): void {
    console.log('🚀 Initializing optimization systems...');
    
    // Initialize only the systems we want to use
    try {
        // Don't initialize BubblePool - we're using the original pool
        // getBubblePool(scene).warmUp();
    } catch (e) {
        console.log('Skipping BubblePool initialization');
    }
    
    try {
        getTextureCache(scene);
    } catch (e) {
        console.log('Skipping TextureCache initialization');
    }
    
    try {
        getParticlePool(scene);
        console.log('✅ ParticlePool initialized');
    } catch (e) {
        console.warn('Failed to initialize ParticlePool:', e);
    }
    
    try {
        // Don't preload critical assets - let the game handle it
        // getAssetLoader(scene).preloadCritical();
    } catch (e) {
        console.log('Skipping AssetLoader initialization');
    }
    
    try {
        getCollisionOptimizer(scene);
        console.log('✅ CollisionOptimizer initialized');
    } catch (e) {
        console.warn('Failed to initialize CollisionOptimizer:', e);
    }
    
    console.log('✅ Optimization systems ready');
}

/**
 * Update all optimization systems (called each frame)
 */
export function updateOptimizations(scene: Scene): void {
    try {
        getParticlePool(scene).update();
    } catch (e) {
        // ParticlePool not initialized
    }
    
    try {
        getCollisionOptimizer(scene).update();
    } catch (e) {
        // CollisionOptimizer not initialized
    }
    
    // Periodic optimizations (every second)
    if (scene.time.now % 1000 < 16) {
        try {
            // Don't optimize BubblePool if not initialized
            // getBubblePool(scene).optimize();
        } catch (e) {
            // BubblePool not initialized
        }
        
        try {
            getTextureCache(scene).optimizeCache();
        } catch (e) {
            // TextureCache not initialized
        }
    }
}

/**
 * Get optimization statistics
 */
export function getOptimizationStats(): any {
    const stats: any = {};
    
    // Only get stats for initialized systems
    try {
        stats.bubblePool = getBubblePool().getStats();
    } catch (e) {
        // BubblePool not initialized
    }
    
    try {
        stats.textureCache = getTextureCache().getStats();
    } catch (e) {
        // TextureCache not initialized
    }
    
    try {
        stats.particlePool = getParticlePool().getStats();
    } catch (e) {
        // ParticlePool not initialized
    }
    
    try {
        stats.assetLoader = getAssetLoader().getStats();
    } catch (e) {
        // AssetLoader not initialized
    }
    
    try {
        stats.collisionOptimizer = getCollisionOptimizer().getStats();
    } catch (e) {
        // CollisionOptimizer not initialized
    }
    
    return stats;
}

/**
 * Reset all optimization systems
 */
export function resetOptimizations(): void {
    resetBubblePool();
    resetTextureCache();
    resetParticlePool();
    resetAssetLoader();
    resetCollisionOptimizer();
}

/**
 * Performance monitor for optimization systems
 */
export class OptimizationMonitor {
    private scene: Scene;
    private metricsHistory: any[] = [];
    private readonly MAX_HISTORY = 60; // 60 frames of history
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    /**
     * Record current metrics
     */
    public recordMetrics(): void {
        const metrics = {
            timestamp: Date.now(),
            fps: this.scene.game.loop.actualFps,
            ...getOptimizationStats()
        };
        
        this.metricsHistory.push(metrics);
        
        // Trim history
        if (this.metricsHistory.length > this.MAX_HISTORY) {
            this.metricsHistory.shift();
        }
    }
    
    /**
     * Get performance summary
     */
    public getSummary(): any {
        if (this.metricsHistory.length === 0) {
            return { message: 'No metrics recorded yet' };
        }
        
        const latest = this.metricsHistory[this.metricsHistory.length - 1];
        const avgFps = this.metricsHistory.reduce((sum, m) => sum + m.fps, 0) / this.metricsHistory.length;
        
        return {
            currentFPS: latest.fps,
            averageFPS: avgFps,
            bubblePoolHitRate: latest.bubblePool?.hitRate || 0,
            particleUsage: latest.particlePool?.usage || 0,
            collisionEfficiency: latest.collisionOptimizer?.efficiency || 0,
            recommendation: this.getRecommendation(avgFps, latest)
        };
    }
    
    /**
     * Get optimization recommendation
     */
    private getRecommendation(avgFps: number, latest: any): string {
        if (avgFps < 30) {
            if (latest.particlePool?.usage > 80) {
                return 'Reduce particle effects';
            }
            if (latest.collisionOptimizer?.efficiency < 10) {
                return 'Too many collision checks';
            }
            return 'Consider reducing visual quality';
        } else if (avgFps < 50) {
            return 'Performance is acceptable';
        } else {
            return 'Performance is excellent';
        }
    }
    
    /**
     * Log performance report
     */
    public logReport(): void {
        const summary = this.getSummary();
        
        console.log('=== Optimization Performance Report ===');
        console.log(`Current FPS: ${summary.currentFPS?.toFixed(1) || 'N/A'}`);
        console.log(`Average FPS: ${summary.averageFPS?.toFixed(1) || 'N/A'}`);
        console.log(`Bubble Pool Hit Rate: ${summary.bubblePoolHitRate?.toFixed(1) || 0}%`);
        console.log(`Particle Usage: ${summary.particleUsage?.toFixed(1) || 0}%`);
        console.log(`Collision Efficiency: ${summary.collisionEfficiency?.toFixed(1) || 0}%`);
        console.log(`Recommendation: ${summary.recommendation}`);
        console.log('=====================================');
    }
}