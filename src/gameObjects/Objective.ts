import { IObjectiveConfig } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class Objective extends Phaser.GameObjects.Container {
    private chestBody: Phaser.GameObjects.Rectangle;
    private chestLid: Phaser.GameObjects.Rectangle;
    private chestLock: Phaser.GameObjects.Arc;
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
        
        // Create treasure chest
        const chestSize = config.size * 0.7;
        
        // Chest body (main box)
        this.chestBody = scene.add.rectangle(0, 3, chestSize, chestSize * 0.8, 0x8B4513);
        this.chestBody.setStrokeStyle(2, 0x654321, 1);
        
        // Chest lid (top part)
        this.chestLid = scene.add.rectangle(0, -5, chestSize * 1.1, chestSize * 0.4, 0xA0522D);
        this.chestLid.setStrokeStyle(2, 0x654321, 1);
        
        // Chest lock (golden circle)
        this.chestLock = scene.add.circle(0, 3, chestSize * 0.15, 0xFFD700);
        this.chestLock.setStrokeStyle(1, 0xFFA500, 1);
        
        // Add golden details
        const detail1 = scene.add.rectangle(-chestSize * 0.3, 3, 2, chestSize * 0.6, 0xFFD700);
        const detail2 = scene.add.rectangle(chestSize * 0.3, 3, 2, chestSize * 0.6, 0xFFD700);
        const detail3 = scene.add.rectangle(0, 3, chestSize * 0.8, 2, 0xFFD700);
        
        this.add([this.glowEffect, this.shield, this.chestBody, detail1, detail2, detail3, this.chestLid, this.chestLock]);
        
        this.setSize(config.size, config.size);
        this.setDepth(Z_LAYERS.OBJECTIVE);
        
        // Add pulsing animation
        this.createPulseAnimation();
        
        // Add subtle floating animation for the chest
        scene.tweens.add({
            targets: this,
            y: config.y - 2,
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
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
        
        // Change chest color to indicate vulnerability
        this.chestBody.setFillStyle(0xff6b6b);
        this.chestLid.setFillStyle(0xff8888);
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
        // Victory animation - chest opens
        this.scene.tweens.add({
            targets: this.chestLid,
            y: -15,
            rotation: -0.3,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Chest disappears
        this.scene.tweens.add({
            targets: this,
            scale: 1.5,
            alpha: 0,
            duration: 1000,
            delay: 200,
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