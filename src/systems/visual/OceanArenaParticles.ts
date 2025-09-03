import { Scene } from 'phaser';

/**
 * Manages all particle effects for the ocean depths arena theme
 * Handles water effects, bubbles, and vortex particles
 */
export class OceanArenaParticles {
    private scene: Scene;
    private activeParticles: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
    private activeTimers: Phaser.Time.TimerEvent[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Creates bubble particles rising from the chest
     */
    public createBubbleParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const bubbles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.3, end: 0.6 },
            alpha: { start: 0.4, end: 0.1 },
            tint: [0x4dd0e1, 0x81d4fa, 0xb3e5fc], // Light blue tones for bubbles
            blendMode: 'ADD',
            lifespan: 3000,
            speedY: { min: -60, max: -30 },
            speedX: { min: -10, max: 10 },
            quantity: 2,
            frequency: 200,
            emitting: false
        });
        bubbles.setDepth(depth);
        this.activeParticles.set('bubbles', bubbles);
        return bubbles;
    }

    /**
     * Creates vortex spiral particles
     */
    public createVortexParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const vortexParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.5, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            tint: [0x006064, 0x00838f, 0x0097a7], // Deep ocean colors
            blendMode: 'ADD',
            lifespan: 1500,
            quantity: 4,
            frequency: 30,
            emitting: false
        });
        vortexParticles.setDepth(depth);
        this.activeParticles.set('vortex', vortexParticles);
        return vortexParticles;
    }

    /**
     * Creates water splash particles for vortex formation
     */
    public createSplashParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const splashParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.4, end: 0.05 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xffffff, 0xe0f7fa, 0xb2ebf2], // White to light cyan for water
            blendMode: 'ADD',
            lifespan: 800,
            speed: { min: 100, max: 200 },
            quantity: 20,
            emitting: false
        });
        splashParticles.setDepth(depth);
        this.activeParticles.set('splash', splashParticles);
        return splashParticles;
    }

    /**
     * Creates mystical water energy particles
     */
    public createWaterEnergyParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const energyParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.3, end: 0.05 },
            alpha: { start: 0, end: 0.6 },
            tint: [0x00bcd4, 0x00acc1, 0x0097a7],
            blendMode: 'ADD',
            lifespan: 2000,
            speedY: { min: -20, max: -10 },
            speedX: { min: -5, max: 5 },
            quantity: 1,
            frequency: 100,
            emitting: false
        });
        energyParticles.setDepth(depth);
        this.activeParticles.set('water-energy', energyParticles);
        return energyParticles;
    }

    /**
     * Creates foam particles around the vortex
     */
    public createFoamParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const foamParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.2, end: 0.4 },
            alpha: { start: 0.5, end: 0 },
            tint: 0xffffff,
            blendMode: 'SCREEN',
            lifespan: 1000,
            quantity: 3,
            frequency: 50,
            emitting: false
        });
        foamParticles.setDepth(depth);
        this.activeParticles.set('foam', foamParticles);
        return foamParticles;
    }

    /**
     * Animates particles in a vortex spiral pattern
     */
    public startVortexAnimation(particles: Phaser.GameObjects.Particles.ParticleEmitter, 
                                centerX: number, centerY: number, 
                                startRadius: number, endRadius: number): Phaser.Time.TimerEvent {
        let vortexAngle = 0;
        let radius = startRadius;
        let radiusChange = (endRadius - startRadius) / 100; // Gradual radius change
        
        const timer = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                vortexAngle += 0.15; // Fast rotation for vortex effect
                radius += radiusChange;
                
                // Clamp radius
                if (radiusChange > 0 && radius > endRadius) radius = endRadius;
                if (radiusChange < 0 && radius < endRadius) radius = endRadius;
                
                if (particles && particles.active) {
                    const x = centerX + Math.cos(vortexAngle) * radius;
                    const y = centerY + Math.sin(vortexAngle) * radius;
                    particles.setPosition(x, y);
                    
                    // Emit particles continuously during vortex
                    if (vortexAngle > Math.PI / 4) {
                        particles.emitParticle();
                        vortexAngle = 0;
                    }
                }
            },
            loop: true
        });
        this.activeTimers.push(timer);
        return timer;
    }

    /**
     * Creates treasure emergence particles
     */
    public createTreasureEmergenceParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const emergenceParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xffd700, 0xffeb3b, 0xffffff], // Gold and white sparkles
            blendMode: 'ADD',
            lifespan: 1000,
            speed: { min: 150, max: 250 },
            quantity: 30,
            emitting: false
        });
        emergenceParticles.setDepth(depth);
        emergenceParticles.explode(30);
        this.activeParticles.set('emergence', emergenceParticles);
        return emergenceParticles;
    }

    /**
     * Safely destroys a specific particle emitter
     */
    public destroyParticle(key: string): void {
        const particle = this.activeParticles.get(key);
        if (particle && particle.active) {
            particle.stop();
            particle.destroy();
            this.activeParticles.delete(key);
        }
    }

    /**
     * Cleans up all active particles and timers
     */
    public destroy(): void {
        // Stop and destroy all particles
        this.activeParticles.forEach((particle, key) => {
            if (particle && particle.active) {
                particle.stop();
                particle.destroy();
            }
        });
        this.activeParticles.clear();

        // Remove all timers
        this.activeTimers.forEach(timer => {
            if (timer) {
                timer.remove();
            }
        });
        this.activeTimers = [];
    }

    /**
     * Gets an active particle by key
     */
    public getParticle(key: string): Phaser.GameObjects.Particles.ParticleEmitter | undefined {
        return this.activeParticles.get(key);
    }
}