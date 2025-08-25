import { Scene } from 'phaser';

// Types of poolable effects
export enum EffectType {
    FLOATING_TEXT = 'floating_text',
    PARTICLE_BURST = 'particle_burst',
    RING_EXPLOSION = 'ring_explosion',
    STAR_BURST = 'star_burst',
    COMBO_DISPLAY = 'combo_display'
}

// Base interface for poolable effects
interface IPoolableEffect {
    type: EffectType;
    active: boolean;
    gameObject: Phaser.GameObjects.GameObject;
    reset(): void;
    activate(x: number, y: number, ...args: any[]): void;
    deactivate(): void;
    update?(delta: number): void;
}

// Floating text effect
class FloatingTextEffect implements IPoolableEffect {
    type = EffectType.FLOATING_TEXT;
    active = false;
    gameObject: Phaser.GameObjects.Container;
    private scene: Scene;
    private text: Phaser.GameObjects.Text;
    private tween?: Phaser.Tweens.Tween;
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Create container
        this.gameObject = scene.add.container(0, 0);
        this.gameObject.setDepth(1200);
        
        // Create text - optimized for mobile
        this.text = scene.add.text(0, 0, '', {
            fontSize: '20px',  // Balanced size for mobile
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3  // Clean stroke width
        });
        this.text.setOrigin(0.5);
        this.text.setShadow(2, 2, '#000000', 4, true, true);
        
        this.gameObject.add(this.text);
        this.deactivate();
    }
    
    reset(): void {
        if (this.tween) {
            this.tween.stop();
            this.tween = undefined;
        }
        this.gameObject.setScale(1);
        this.gameObject.setAlpha(1);
        this.gameObject.setPosition(0, 0);
    }
    
    activate(x: number, y: number, text: string, color: number, duration: number = 1000): void {
        this.reset();
        this.active = true;
        this.gameObject.setVisible(true);
        this.gameObject.setPosition(x, y);
        this.text.setText(text);
        this.text.setTint(color);
        
        // Adjust font size based on text content for better mobile UX
        if (text.includes('PERFECT') || text.includes('AMAZING')) {
            this.text.setFontSize('22px');  // +2px
        } else if (text.includes('GREAT') || text.includes('GOOD')) {
            this.text.setFontSize('21px');  // +2px
        } else if (text.includes('DROP')) {
            this.text.setFontSize('19px');  // +2px
        } else {
            this.text.setFontSize('18px'); // +2px for points
        }
        
        // Animate
        this.gameObject.setScale(0);
        
        // Pop in - slightly smaller for mobile
        this.scene.tweens.add({
            targets: this.gameObject,
            scale: { from: 0, to: 1.0 },  // Reduced from 1.2
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Settle
                this.scene.tweens.add({
                    targets: this.gameObject,
                    scale: 0.95,  // Slightly smaller final size
                    duration: 100,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Float up and fade
        this.tween = this.scene.tweens.add({
            targets: this.gameObject,
            y: y - 60,
            alpha: 0,
            duration: duration,
            delay: 300,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.deactivate();
            }
        });
    }
    
    deactivate(): void {
        this.active = false;
        this.gameObject.setVisible(false);
        this.reset();
    }
}

// Particle burst effect
class ParticleBurstEffect implements IPoolableEffect {
    type = EffectType.PARTICLE_BURST;
    active = false;
    gameObject: Phaser.GameObjects.Container;
    private scene: Scene;
    private particles: Phaser.GameObjects.Arc[] = [];
    private tweens: Phaser.Tweens.Tween[] = [];
    private readonly MAX_PARTICLES = 30;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.gameObject = scene.add.container(0, 0);
        this.gameObject.setDepth(1150);
        
        // Pre-create particles
        for (let i = 0; i < this.MAX_PARTICLES; i++) {
            const particle = scene.add.circle(0, 0, 3, 0xFFFFFF);
            particle.setVisible(false);
            this.particles.push(particle);
            this.gameObject.add(particle);
        }
        
        this.deactivate();
    }
    
    reset(): void {
        this.tweens.forEach(tween => tween.stop());
        this.tweens = [];
        this.particles.forEach(p => {
            p.setVisible(false);
            p.setPosition(0, 0);
            p.setScale(1);
            p.setAlpha(1);
        });
    }
    
    activate(x: number, y: number, color: number, particleCount: number = 20, intensity: number = 1): void {
        this.reset();
        this.active = true;
        this.gameObject.setVisible(true);
        this.gameObject.setPosition(x, y);
        
        const count = Math.min(particleCount, this.MAX_PARTICLES);
        const speedBase = 100 * intensity;
        
        for (let i = 0; i < count; i++) {
            const particle = this.particles[i];
            particle.setVisible(true);
            particle.setFillStyle(color);
            particle.setRadius(Phaser.Math.Between(2, 4));
            
            const angle = (Math.PI * 2 * i) / count;
            const speed = Phaser.Math.Between(speedBase * 0.5, speedBase * 1.5);
            
            const tween = this.scene.tweens.add({
                targets: particle,
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(400, 800),
                ease: 'Power2.easeOut',
                delay: i * 5,
                onComplete: () => {
                    particle.setVisible(false);
                    if (i === count - 1) {
                        this.deactivate();
                    }
                }
            });
            
            this.tweens.push(tween);
        }
    }
    
    deactivate(): void {
        this.active = false;
        this.gameObject.setVisible(false);
        this.reset();
    }
}

// Ring explosion effect
class RingExplosionEffect implements IPoolableEffect {
    type = EffectType.RING_EXPLOSION;
    active = false;
    gameObject: Phaser.GameObjects.Graphics;
    private scene: Scene;
    private tween?: Phaser.Tweens.Tween;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.gameObject = scene.add.graphics();
        this.gameObject.setDepth(1049);
        this.deactivate();
    }
    
    reset(): void {
        if (this.tween) {
            this.tween.stop();
            this.tween = undefined;
        }
        this.gameObject.clear();
        this.gameObject.setScale(1);
        this.gameObject.setAlpha(1);
    }
    
    activate(x: number, y: number, color: number, size: number = 30): void {
        this.reset();
        this.active = true;
        this.gameObject.setVisible(true);
        this.gameObject.setPosition(x, y);
        
        this.gameObject.lineStyle(4, color, 1);
        this.gameObject.strokeCircle(0, 0, size);
        this.gameObject.setScale(0);
        
        this.tween = this.scene.tweens.add({
            targets: this.gameObject,
            scale: 3,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.deactivate();
            }
        });
    }
    
    deactivate(): void {
        this.active = false;
        this.gameObject.setVisible(false);
        this.reset();
    }
}

// Main Effect Pool Manager
export class EffectPool {
    private scene: Scene;
    private pools: Map<EffectType, IPoolableEffect[]> = new Map();
    private activeEffects: IPoolableEffect[] = [];
    
    // Pool sizes
    private readonly POOL_SIZES = {
        [EffectType.FLOATING_TEXT]: 20,
        [EffectType.PARTICLE_BURST]: 10,
        [EffectType.RING_EXPLOSION]: 8,
        [EffectType.STAR_BURST]: 6,
        [EffectType.COMBO_DISPLAY]: 10
    };
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializePools();
    }
    
    private initializePools(): void {
        // Initialize floating text pool
        this.createPool(EffectType.FLOATING_TEXT, () => new FloatingTextEffect(this.scene));
        
        // Initialize particle burst pool
        this.createPool(EffectType.PARTICLE_BURST, () => new ParticleBurstEffect(this.scene));
        
        // Initialize ring explosion pool
        this.createPool(EffectType.RING_EXPLOSION, () => new RingExplosionEffect(this.scene));
    }
    
    private createPool(type: EffectType, factory: () => IPoolableEffect): void {
        const pool: IPoolableEffect[] = [];
        const size = this.POOL_SIZES[type] || 10;
        
        for (let i = 0; i < size; i++) {
            pool.push(factory());
        }
        
        this.pools.set(type, pool);
    }
    
    public getEffect(type: EffectType): IPoolableEffect | null {
        const pool = this.pools.get(type);
        if (!pool) return null;
        
        // Find inactive effect
        for (const effect of pool) {
            if (!effect.active) {
                this.activeEffects.push(effect);
                return effect;
            }
        }
        
        // All effects in use, reuse the oldest one
        const oldest = pool[0];
        oldest.deactivate();
        this.activeEffects.push(oldest);
        return oldest;
    }
    
    public showFloatingText(x: number, y: number, text: string, color: number = 0xFFD700, duration: number = 1000): void {
        const effect = this.getEffect(EffectType.FLOATING_TEXT) as FloatingTextEffect;
        if (effect) {
            effect.activate(x, y, text, color, duration);
        }
    }
    
    public showParticleBurst(x: number, y: number, color: number, particleCount: number = 20, intensity: number = 1): void {
        const effect = this.getEffect(EffectType.PARTICLE_BURST) as ParticleBurstEffect;
        if (effect) {
            effect.activate(x, y, color, particleCount, intensity);
        }
    }
    
    public showRingExplosion(x: number, y: number, color: number, size: number = 30): void {
        const effect = this.getEffect(EffectType.RING_EXPLOSION) as RingExplosionEffect;
        if (effect) {
            effect.activate(x, y, color, size);
        }
    }
    
    public showComboEffect(x: number, y: number, comboLevel: number, score: number, color: number): void {
        // Show multiple effects based on combo level
        this.showFloatingText(x, y - 20, `+${score}`, color);
        
        if (comboLevel >= 2) {
            this.showParticleBurst(x, y, color, 10 * comboLevel, comboLevel * 0.5);
        }
        
        if (comboLevel >= 4) {
            this.showRingExplosion(x, y, color, 20 + comboLevel * 5);
        }
    }
    
    public update(delta: number): void {
        // Update active effects that need per-frame updates
        this.activeEffects = this.activeEffects.filter(effect => {
            if (effect.active && effect.update) {
                effect.update(delta);
            }
            return effect.active;
        });
    }
    
    public reset(): void {
        // Deactivate all effects
        this.pools.forEach(pool => {
            pool.forEach(effect => effect.deactivate());
        });
        this.activeEffects = [];
    }
    
    public destroy(): void {
        this.reset();
        
        // Destroy all game objects
        this.pools.forEach(pool => {
            pool.forEach(effect => {
                if (effect.gameObject) {
                    effect.gameObject.destroy();
                }
            });
        });
        
        this.pools.clear();
    }
}