import { Scene } from 'phaser';

/**
 * Optimized particle system with object pooling
 * Handles all particle effects efficiently
 */
export class ParticlePool {
    private scene: Scene;
    private particles: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
    private pools: Map<string, Phaser.GameObjects.Image[]> = new Map();
    
    // Performance settings
    private readonly MAX_PARTICLES = 500;
    private readonly POOL_SIZE = 100;
    
    // Performance metrics
    private activeParticles = 0;
    private particleUpdates = 0;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeParticles();
    }
    
    /**
     * Initialize particle systems
     */
    private initializeParticles(): void {
        // Create particle emitters for different effects
        this.createBubblePopEffect();
        this.createGemCollectEffect();
        this.createComboEffect();
        this.createPowerUpEffect();
        
        console.log(`✨ ParticlePool: Initialized with ${this.particles.size} emitters`);
    }
    
    /**
     * Create bubble pop particle effect
     */
    private createBubblePopEffect(): void {
        const emitter = this.scene.add.particles(0, 0, 'particle_circle_cached', {
            speed: { min: 100, max: 300 },
            scale: { start: 0.5, end: 0 },
            lifespan: 600,
            quantity: 8,
            emitting: false
        });
        
        this.particles.set('bubble_pop', emitter);
    }
    
    /**
     * Create gem collection particle effect
     */
    private createGemCollectEffect(): void {
        const emitter = this.scene.add.particles(0, 0, 'particle_star_cached', {
            speed: { min: 200, max: 400 },
            scale: { start: 0.8, end: 0 },
            lifespan: 800,
            quantity: 12,
            rotate: { min: 0, max: 360 },
            emitting: false,
            tint: [0xffff00, 0xffd700, 0xffed4e]
        });
        
        this.particles.set('gem_collect', emitter);
    }
    
    /**
     * Create combo particle effect
     */
    private createComboEffect(): void {
        const emitter = this.scene.add.particles(0, 0, 'spark_cached', {
            speed: { min: 300, max: 500 },
            scale: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 20,
            angle: { min: 0, max: 360 },
            rotate: { min: -180, max: 180 },
            emitting: false,
            tint: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00]
        });
        
        this.particles.set('combo', emitter);
    }
    
    /**
     * Create power-up particle effect
     */
    private createPowerUpEffect(): void {
        const emitter = this.scene.add.particles(0, 0, 'glow_cached', {
            speed: 0,
            scale: { start: 0, end: 2 },
            alpha: { start: 1, end: 0 },
            lifespan: 1000,
            quantity: 1,
            emitting: false,
            blendMode: 'ADD'
        });
        
        this.particles.set('powerup', emitter);
    }
    
    /**
     * Play a particle effect
     */
    public playEffect(
        type: 'bubble_pop' | 'gem_collect' | 'combo' | 'powerup',
        x: number,
        y: number,
        config?: any
    ): void {
        // Check particle limit
        if (this.activeParticles >= this.MAX_PARTICLES) {
            return; // Skip effect if too many particles
        }
        
        const emitter = this.particles.get(type);
        if (!emitter) return;
        
        // Configure emitter for this effect
        emitter.setPosition(x, y);
        
        // Apply custom config if provided
        if (config) {
            if (config.tint) emitter.setParticleTint(config.tint);
            if (config.scale) emitter.setScale(config.scale);
            if (config.quantity) emitter.setQuantity(config.quantity);
        }
        
        // Emit particles
        emitter.explode();
        
        // Track active particles
        const quantity = typeof emitter.quantity === 'object' && 'propertyValue' in emitter.quantity 
            ? (emitter.quantity as any).propertyValue 
            : emitter.quantity as number;
        const lifespan = typeof emitter.lifespan === 'object' && 'propertyValue' in emitter.lifespan
            ? (emitter.lifespan as any).propertyValue
            : emitter.lifespan as number;
        
        this.activeParticles += quantity;
        
        // Auto cleanup after lifespan
        this.scene.time.delayedCall(lifespan, () => {
            this.activeParticles -= quantity;
        });
    }
    
    /**
     * Create a continuous particle effect
     */
    public createContinuousEffect(
        x: number,
        y: number,
        type: 'trail' | 'aura' | 'sparkle'
    ): Phaser.GameObjects.Particles.ParticleEmitter {
        let config: any = {};
        
        switch (type) {
            case 'trail':
                config = {
                    speed: 50,
                    scale: { start: 0.5, end: 0 },
                    lifespan: 500,
                    frequency: 50,
                    quantity: 1,
                    alpha: { start: 0.7, end: 0 }
                };
                break;
                
            case 'aura':
                config = {
                    speed: 0,
                    scale: { start: 1.5, end: 1.8 },
                    lifespan: 1000,
                    frequency: 100,
                    quantity: 1,
                    alpha: { start: 0.3, end: 0 },
                    blendMode: 'ADD'
                };
                break;
                
            case 'sparkle':
                config = {
                    speed: { min: 20, max: 50 },
                    scale: { start: 0.3, end: 0 },
                    lifespan: 800,
                    frequency: 200,
                    quantity: 1,
                    angle: { min: 0, max: 360 }
                };
                break;
        }
        
        const emitter = this.scene.add.particles(x, y, 'particle_star_cached', config);
        
        // Auto-destroy after 10 seconds to prevent memory leaks
        this.scene.time.delayedCall(10000, () => {
            emitter.destroy();
        });
        
        return emitter;
    }
    
    /**
     * Create optimized particle burst
     */
    public burst(
        x: number,
        y: number,
        count: number,
        color: number,
        speed: number = 200
    ): void {
        // Use pooled images for simple bursts
        const pool = this.getImagePool('burst');
        
        for (let i = 0; i < Math.min(count, 20); i++) {
            const particle = pool[i % pool.length];
            
            if (particle) {
                particle.setPosition(x, y);
                particle.setVisible(true);
                particle.setActive(true);
                particle.setTint(color);
                particle.setScale(1);
                particle.setAlpha(1);
                
                const angle = (Math.PI * 2 * i) / count;
                const vx = Math.cos(angle) * speed;
                const vy = Math.sin(angle) * speed;
                
                // Animate particle
                this.scene.tweens.add({
                    targets: particle,
                    x: x + vx,
                    y: y + vy,
                    scale: 0,
                    alpha: 0,
                    duration: 600,
                    ease: 'Power2',
                    onComplete: () => {
                        particle.setVisible(false);
                        particle.setActive(false);
                    }
                });
            }
        }
    }
    
    /**
     * Get or create image pool for effects
     */
    private getImagePool(type: string): Phaser.GameObjects.Image[] {
        if (!this.pools.has(type)) {
            const pool: Phaser.GameObjects.Image[] = [];
            
            for (let i = 0; i < this.POOL_SIZE; i++) {
                const image = this.scene.add.image(-1000, -1000, 'particle_circle_cached');
                image.setVisible(false);
                image.setActive(false);
                pool.push(image);
            }
            
            this.pools.set(type, pool);
        }
        
        return this.pools.get(type)!;
    }
    
    /**
     * Update particle systems (called each frame)
     */
    public update(): void {
        this.particleUpdates++;
        
        // Optimize particle systems every 60 frames
        if (this.particleUpdates % 60 === 0) {
            this.optimizeParticles();
        }
    }
    
    /**
     * Optimize particle systems
     */
    private optimizeParticles(): void {
        // Reduce particle count if FPS is low
        const fps = this.scene.game.loop.actualFps;
        
        if (fps < 30 && this.activeParticles > 100) {
            // Reduce particle quality
            for (const emitter of this.particles.values()) {
                if (!emitter || !emitter.active) continue; // Skip destroyed emitters
                try {
                    const currentQuantity = typeof emitter.quantity === 'object' && 'propertyValue' in emitter.quantity
                        ? (emitter.quantity as any).propertyValue
                        : emitter.quantity as number;
                    if (currentQuantity && currentQuantity > 0) {
                        emitter.setQuantity(Math.floor(currentQuantity * 0.5));
                    }
                } catch (e) {
                    // Emitter was destroyed, skip it
                    continue;
                }
            }
            console.warn('ParticlePool: Reduced quality due to low FPS');
        } else if (fps > 50 && this.activeParticles < 50) {
            // Restore particle quality
            for (const emitter of this.particles.values()) {
                if (!emitter || !emitter.active) continue; // Skip destroyed emitters
                try {
                    const currentQuantity = typeof emitter.quantity === 'object' && 'propertyValue' in emitter.quantity
                        ? (emitter.quantity as any).propertyValue
                        : emitter.quantity as number;
                    if (currentQuantity && currentQuantity > 0) {
                        emitter.setQuantity(Math.ceil(currentQuantity * 1.2));
                    }
                } catch (e) {
                    // Emitter was destroyed, skip it
                    continue;
                }
            }
        }
    }
    
    /**
     * Clear all active particles
     */
    public clearAll(): void {
        for (const emitter of this.particles.values()) {
            emitter.stop();
            emitter.killAll();
        }
        
        for (const pool of this.pools.values()) {
            for (const image of pool) {
                image.setVisible(false);
                image.setActive(false);
                this.scene.tweens.killTweensOf(image);
            }
        }
        
        this.activeParticles = 0;
    }
    
    /**
     * Get particle statistics
     */
    public getStats(): any {
        return {
            activeParticles: this.activeParticles,
            maxParticles: this.MAX_PARTICLES,
            emitterCount: this.particles.size,
            poolCount: this.pools.size,
            usage: (this.activeParticles / this.MAX_PARTICLES) * 100
        };
    }
    
    /**
     * Destroy particle systems
     */
    public destroy(): void {
        // Safely destroy all emitters
        for (const emitter of this.particles.values()) {
            try {
                if (emitter && emitter.active) {
                    emitter.stop();
                    emitter.killAll();
                }
                emitter.destroy();
            } catch (e) {
                // Emitter already destroyed
            }
        }
        
        // Clear the particles map
        this.particles.clear();
        
        // Destroy pooled images
        for (const pool of this.pools.values()) {
            for (const image of pool) {
                try {
                    image.destroy();
                } catch (e) {
                    // Image already destroyed
                }
            }
        }
        
        // Clear pools
        this.pools.clear();
        this.activeParticles = 0;
        
        this.particles.clear();
        this.pools.clear();
    }
}

// Singleton instance
let particleInstance: ParticlePool | null = null;

export function getParticlePool(scene?: Scene): ParticlePool {
    if (!particleInstance && scene) {
        particleInstance = new ParticlePool(scene);
    }
    
    if (!particleInstance) {
        throw new Error('ParticlePool not initialized. Provide a scene on first call.');
    }
    
    return particleInstance;
}

export function resetParticlePool(): void {
    if (particleInstance) {
        particleInstance.destroy();
        particleInstance = null;
    }
}