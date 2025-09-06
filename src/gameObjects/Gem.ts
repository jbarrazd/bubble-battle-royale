import { Scene } from 'phaser';
import { Z_LAYERS } from '@/config/ArenaConfig';

export enum GemType {
    DIAMOND = 'diamond',
    RUBY = 'ruby', 
    EMERALD = 'emerald',
    SAPPHIRE = 'sapphire',
    TOPAZ = 'topaz'
}

export class Gem extends Phaser.GameObjects.Container {
    private gemSprite: Phaser.GameObjects.Polygon;
    private glowEffect: Phaser.GameObjects.Arc;
    private sparkleEffect: Phaser.GameObjects.Graphics;
    private collectEffect?: Phaser.GameObjects.Particles.ParticleEmitter;
    private gemType: GemType;
    private value: number;
    private isCollected: boolean = false;
    private floatTween?: Phaser.Tweens.Tween;
    private rotateTween?: Phaser.Tweens.Tween;
    
    // Gem colors and values
    private static readonly GEM_CONFIG = {
        [GemType.DIAMOND]: { color: 0xE0E0E0, value: 100, sides: 4 },
        [GemType.RUBY]: { color: 0xFF0033, value: 50, sides: 6 },
        [GemType.EMERALD]: { color: 0x00FF44, value: 30, sides: 8 },
        [GemType.SAPPHIRE]: { color: 0x0066FF, value: 40, sides: 6 },
        [GemType.TOPAZ]: { color: 0xFFAA00, value: 20, sides: 5 }
    };
    
    constructor(scene: Scene, x: number, y: number, type?: GemType) {
        super(scene, x, y);
        
        // Random type if not specified
        this.gemType = type || this.getRandomType();
        const config = Gem.GEM_CONFIG[this.gemType];
        this.value = config.value;
        
        // Create glow effect (behind gem)
        this.glowEffect = scene.add.arc(0, 0, 20, 0, 360, false, config.color, 0.2);
        this.add(this.glowEffect);
        
        // Create gem shape (polygon for crystal look)
        const points = this.createGemPoints(config.sides, 15);
        this.gemSprite = scene.add.polygon(0, 0, points, config.color);
        this.gemSprite.setStrokeStyle(2, this.getLighterColor(config.color), 1);
        this.add(this.gemSprite);
        
        // Add sparkle effect
        this.sparkleEffect = scene.add.graphics();
        this.addSparkles();
        this.add(this.sparkleEffect);
        
        // Set depth
        this.setDepth(Z_LAYERS.BUBBLES_FRONT);
        
        // Add floating animation
        this.addFloatingAnimation();
        
        // Add rotation animation
        this.addRotationAnimation();
        
        // Add pulsing glow
        this.addGlowAnimation();
        
        scene.add.existing(this);
    }
    
    private createGemPoints(sides: number, radius: number): number[] {
        const points: number[] = [];
        const angleStep = (Math.PI * 2) / sides;
        
        for (let i = 0; i < sides; i++) {
            const angle = angleStep * i - Math.PI / 2; // Start from top
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            points.push(x, y);
        }
        
        return points;
    }
    
    private addSparkles(): void {
        this.sparkleEffect.clear();
        const config = Gem.GEM_CONFIG[this.gemType];
        
        // Add small white sparkles
        this.sparkleEffect.fillStyle(0xFFFFFF, 0.8);
        
        // Top sparkle
        this.sparkleEffect.fillCircle(-5, -8, 2);
        
        // Side sparkles
        this.sparkleEffect.fillCircle(7, -3, 1.5);
        this.sparkleEffect.fillCircle(-6, 4, 1);
    }
    
    private addFloatingAnimation(): void {
        this.floatTween = this.scene.tweens.add({
            targets: this,
            y: this.y - 5,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private addRotationAnimation(): void {
        this.rotateTween = this.scene.tweens.add({
            targets: this.gemSprite,
            angle: 360,
            duration: 8000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    private addGlowAnimation(): void {
        this.scene.tweens.add({
            targets: this.glowEffect,
            scale: { from: 0.9, to: 1.2 },
            alpha: { from: 0.2, to: 0.4 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    public collect(): void {
        if (this.isCollected) return;
        this.isCollected = true;
        
        // Stop animations
        if (this.floatTween) this.floatTween.stop();
        if (this.rotateTween) this.rotateTween.stop();
        
        // Create collection effect
        this.createCollectEffect();
        
        // Animate gem collection
        this.scene.tweens.add({
            targets: this,
            scale: 1.5,
            alpha: 0,
            y: this.y - 30,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.destroy();
            }
        });
        
        // Emit collection event
        this.scene.events.emit('gem-collected', {
            type: this.gemType,
            value: this.value,
            x: this.x,
            y: this.y
        });
    }
    
    private createCollectEffect(): void {
        const config = Gem.GEM_CONFIG[this.gemType];
        
        // Create particle burst
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 100;
            const particle = this.scene.add.circle(
                this.x,
                this.y,
                3,
                config.color,
                1
            );
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 600,
                ease: 'Expo.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Create flash effect
        const flash = this.scene.add.circle(this.x, this.y, 25, 0xFFFFFF, 0.6);
        this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    private getLighterColor(color: number): number {
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        const lr = Math.min(255, Math.floor(r * 1.3 + 50));
        const lg = Math.min(255, Math.floor(g * 1.3 + 50));
        const lb = Math.min(255, Math.floor(b * 1.3 + 50));
        
        return (lr << 16) | (lg << 8) | lb;
    }
    
    private getRandomType(): GemType {
        const types = Object.values(GemType);
        return types[Math.floor(Math.random() * types.length)];
    }
    
    public getType(): GemType {
        return this.gemType;
    }
    
    public getValue(): number {
        return this.value;
    }
    
    public isCollectable(): boolean {
        return !this.isCollected;
    }
}