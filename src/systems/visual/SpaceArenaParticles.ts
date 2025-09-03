import { Scene } from 'phaser';

/**
 * Manages all particle effects for the space arena theme
 * Handles creation, animation, and proper cleanup of particles
 */
export class SpaceArenaParticles {
    private scene: Scene;
    private activeParticles: Map<string, Phaser.GameObjects.Particles.ParticleEmitter> = new Map();
    private activeTimers: Phaser.Time.TimerEvent[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Creates energy particles for the space objective
     */
    public createEnergyParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const energyParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.4, end: 0.05 },
            alpha: { start: 0, end: 0.8 },
            tint: [0x00ffff, 0x0099ff, 0xffffff],
            blendMode: 'ADD',
            lifespan: 2000,
            speedY: { min: -15, max: -5 },
            speedX: { min: -5, max: 5 },
            quantity: 1,
            frequency: 150,
            emitting: false
        });
        energyParticles.setDepth(depth);
        this.activeParticles.set('energy', energyParticles);
        return energyParticles;
    }

    /**
     * Creates orbiting particles for the space objective
     */
    public createOrbitingParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const orbitParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.3, end: 0.1 },
            alpha: { start: 0, end: 0.6 },
            tint: 0x00ffff,
            blendMode: 'ADD',
            lifespan: 3000,
            quantity: 1,
            frequency: 500,
            emitting: false
        });
        orbitParticles.setDepth(depth);
        this.activeParticles.set('orbit', orbitParticles);
        return orbitParticles;
    }

    /**
     * Animates orbiting particles in a circular pattern
     */
    public startOrbitAnimation(particles: Phaser.GameObjects.Particles.ParticleEmitter, centerX: number, centerY: number): Phaser.Time.TimerEvent {
        let orbitAngle = 0;
        const timer = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                orbitAngle += 0.02;
                const radius = 50;
                if (particles && particles.active) {
                    particles.setPosition(
                        centerX + Math.cos(orbitAngle) * radius,
                        centerY + Math.sin(orbitAngle) * radius
                    );
                    if (orbitAngle > Math.PI * 2) {
                        particles.emitParticle();
                        orbitAngle = 0;
                    }
                }
            },
            loop: true
        });
        this.activeTimers.push(timer);
        return timer;
    }

    /**
     * Creates UFO trail particles
     */
    public createUFOTrailParticles(ufo: Phaser.GameObjects.Image, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const trailParticles = this.scene.add.particles(0, 0, 'particle', {
            follow: ufo,
            followOffset: { x: -30, y: 0 },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.6, end: 0 },
            tint: [0xffffff, 0x00ffff, 0xaaffff],
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 2,
            frequency: 50,
            emitting: true
        });
        trailParticles.setDepth(depth);
        this.activeParticles.set('ufo-trail', trailParticles);
        return trailParticles;
    }

    /**
     * Creates UFO engine glow particles
     */
    public createUFOEngineParticles(ufo: Phaser.GameObjects.Image, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const engineGlow = this.scene.add.particles(0, 0, 'particle', {
            follow: ufo,
            followOffset: { x: 0, y: 20 },
            scale: { start: 0.4, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            tint: 0x00ffff,
            blendMode: 'ADD',
            lifespan: 300,
            speedY: { min: 20, max: 40 },
            speedX: { min: -10, max: 10 },
            quantity: 3,
            frequency: 30,
            emitting: false
        });
        engineGlow.setDepth(depth);
        this.activeParticles.set('ufo-engine', engineGlow);
        return engineGlow;
    }

    /**
     * Creates UFO departure particles
     */
    public createDepartureParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const departParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xffffff, 0x00ffff],
            blendMode: 'ADD',
            lifespan: 1000,
            speedY: { min: 50, max: 100 },
            speedX: { min: -30, max: 30 },
            quantity: 10,
            emitting: false
        });
        departParticles.setDepth(depth);
        departParticles.explode(20);
        this.activeParticles.set('ufo-depart', departParticles);
        return departParticles;
    }

    /**
     * Creates victory explosion particles
     */
    public createVictoryParticles(x: number, y: number, depth: number): Phaser.GameObjects.Particles.ParticleEmitter {
        const victoryParticles = this.scene.add.particles(x, y, 'particle', {
            scale: { start: 0.5, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0x00ffff, 0x9966ff, 0xffffff, 0xffff00],
            blendMode: 'ADD',
            lifespan: 1000,
            speed: { min: 150, max: 300 },
            quantity: 50,
            emitting: false
        });
        victoryParticles.setDepth(depth);
        victoryParticles.explode(50);
        this.activeParticles.set('victory', victoryParticles);
        return victoryParticles;
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