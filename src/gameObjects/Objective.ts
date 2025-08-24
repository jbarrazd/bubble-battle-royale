import { IObjectiveConfig } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class Objective extends Phaser.GameObjects.Container {
    private sprite: Phaser.GameObjects.Star;
    private shield: Phaser.GameObjects.Arc;
    private glowEffect: Phaser.GameObjects.Arc;
    private health: number;
    private maxHealth: number;
    private isShielded: boolean = true;

    constructor(scene: Phaser.Scene, config: IObjectiveConfig) {
        super(scene, config.x, config.y);
        
        this.health = config.health;
        this.maxHealth = config.health;
        
        // Create subtle glow effect
        this.glowEffect = scene.add.circle(0, 0, config.size / 2 + 4, 0xffd700, 0.3);
        
        // Create shield visual - same size as bubble
        this.shield = scene.add.circle(0, 0, config.size / 2 + 2, 0x00ffff, 0.3);
        this.shield.setStrokeStyle(2, 0x00aaff, 0.8);
        
        // Create main objective - a simple star the size of a bubble
        this.sprite = scene.add.star(0, 0, 6, config.size / 4, config.size / 2, 0xffd700);
        this.sprite.setStrokeStyle(2, 0xff8800, 1);
        
        this.add([this.glowEffect, this.shield, this.sprite]);
        
        this.setSize(config.size, config.size);
        this.setDepth(Z_LAYERS.OBJECTIVE);
        
        // Add pulsing animation
        this.createPulseAnimation();
        
        // Add rotation animation
        scene.tweens.add({
            targets: this.sprite,
            rotation: Math.PI * 2,
            duration: 10000,
            repeat: -1,
            ease: 'Linear'
        });
        
        scene.add.existing(this);
    }

    private createPulseAnimation(): void {
        this.scene.tweens.add({
            targets: this.glowEffect,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.5,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public setShielded(shielded: boolean): void {
        this.isShielded = shielded;
        
        if (shielded) {
            this.shield.setVisible(true);
            this.scene.tweens.add({
                targets: this.shield,
                alpha: 0.5,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            // Shield broken animation
            this.scene.tweens.add({
                targets: this.shield,
                alpha: 0,
                scale: 1.5,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this.shield.setVisible(false);
                    this.showVulnerable();
                }
            });
        }
    }

    private showVulnerable(): void {
        // Glow brighter when vulnerable
        this.scene.tweens.add({
            targets: this.glowEffect,
            scale: 1.3,
            alpha: 0.8,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Change star color to indicate vulnerability
        this.sprite.setFillStyle(0xff6b6b);
    }

    public hit(damage: number = 1): void {
        this.health -= damage;
        
        // Impact animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
        
        // Flash effect
        const flash = this.scene.add.circle(this.x, this.y, 50, 0xffffff, 0.8);
        this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });
        
        if (this.health <= 0) {
            this.destroy();
        }
    }

    public override destroy(): void {
        // Victory animation
        this.scene.tweens.add({
            targets: this.sprite,
            scale: 2,
            alpha: 0,
            rotation: Math.PI * 4,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.createVictoryParticles();
                super.destroy();
            }
        });
    }

    private createVictoryParticles(): void {
        const particles = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: 100, max: 300 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            quantity: 20,
            tint: [0xffd700, 0xffa500, 0xff6347]
        });
        
        this.scene.time.delayedCall(1000, () => {
            particles.destroy();
        });
    }

    public getHealth(): number {
        return this.health;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public isVulnerable(): boolean {
        return !this.isShielded;
    }
}