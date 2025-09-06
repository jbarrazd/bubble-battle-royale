import { Objective } from './Objective';
import { IObjectiveConfig } from '@/types/ArenaTypes';
import { Scene } from 'phaser';

/**
 * Space-themed objective that gives gems when hit
 * Visual: A space crystal/asteroid that contains gems
 */
export class SpaceObjective extends Objective {
    private crystalCore: Phaser.GameObjects.Polygon;
    private energyRings: Phaser.GameObjects.Arc[] = [];
    private particleTimer?: Phaser.Time.TimerEvent;
    private isRecharging: boolean = false;
    private rechargeTime: number = 5000; // 5 seconds to recharge
    
    constructor(scene: Scene, config: IObjectiveConfig) {
        super(scene, config);
        
        // Replace chest visual with space crystal
        this.removeChestVisual();
        this.createSpaceCrystalVisual(config.size);
    }
    
    private removeChestVisual(): void {
        // Remove chest elements from parent
        this.list.forEach(child => {
            if (child && child !== this) {
                child.destroy();
            }
        });
        this.removeAll();
    }
    
    private createSpaceCrystalVisual(size: number): void {
        // Outer energy field
        const outerField = this.scene.add.circle(0, 0, size / 2 + 20, 0x00FFFF, 0.1);
        this.add(outerField);
        
        // Pulsing energy rings
        for (let i = 0; i < 3; i++) {
            const ring = this.scene.add.circle(0, 0, size / 2 + (i * 10), 0x00FFFF, 0);
            ring.setStrokeStyle(2, 0x00FFFF, 0.3 - i * 0.1);
            this.energyRings.push(ring);
            this.add(ring);
            
            // Animate rings expanding
            this.scene.tweens.add({
                targets: ring,
                scale: { from: 0.8, to: 1.2 + i * 0.1 },
                alpha: { from: 0.3 - i * 0.1, to: 0 },
                duration: 2000 + i * 500,
                repeat: -1,
                ease: 'Sine.easeOut'
            });
        }
        
        // Crystal core (octagon shape)
        const crystalPoints: number[] = [];
        const sides = 8;
        const radius = size / 2;
        
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            crystalPoints.push(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            );
        }
        
        this.crystalCore = this.scene.add.polygon(0, 0, crystalPoints, 0x4A90E2);
        this.crystalCore.setStrokeStyle(3, 0x00FFFF, 1);
        this.add(this.crystalCore);
        
        // Inner glow with space theme
        const innerGlow = this.scene.add.circle(0, 0, radius * 0.7, 0x00ccff, 0.4);
        this.add(innerGlow);
        
        // Star icon in center using sprite
        const starIcon = this.scene.add.image(0, 0, 'star-medium');
        starIcon.setScale(0.8);
        this.add(starIcon);
        
        // Floating animation
        this.scene.tweens.add({
            targets: [this.crystalCore, innerGlow, starIcon],
            y: { from: -5, to: 5 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Rotation animation
        this.scene.tweens.add({
            targets: this.crystalCore,
            angle: 360,
            duration: 20000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Gem icon pulse
        this.scene.tweens.add({
            targets: starIcon,
            scale: { from: 0.9, to: 1.1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Particle effects
        this.createSpaceParticles();
    }
    
    private createSpaceParticles(): void {
        this.particleTimer = this.scene.time.addEvent({
            delay: 500,
            repeat: -1,
            callback: () => {
                const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
                const distance = Phaser.Math.Between(30, 50);
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                
                const particle = this.scene.add.circle(
                    this.x + x,
                    this.y + y,
                    Phaser.Math.Between(1, 3),
                    Phaser.Utils.Array.GetRandom([0x00FFFF, 0xFFD700, 0xFFFFFF]),
                    1
                );
                
                this.scene.tweens.add({
                    targets: particle,
                    x: this.x,
                    y: this.y,
                    scale: 0,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Sine.easeIn',
                    onComplete: () => {
                        particle.destroy();
                    }
                });
            }
        });
    }
    
    /**
     * Override hit method to give gems instead of ending game
     */
    public onHit(isPlayer: boolean): void {
        if (this.isRecharging) {
            // Show recharge visual feedback
            this.showRechargeFeedback();
            return;
        }
        
        // Give gem to the player who hit it
        this.scene.events.emit('objective-gem-collected', {
            isPlayer: isPlayer,
            x: this.x,
            y: this.y
        });
        
        // Visual feedback
        this.playHitAnimation();
        
        // Start recharge period
        this.startRecharge();
    }
    
    private playHitAnimation(): void {
        // Flash effect
        const flash = this.scene.add.circle(this.x, this.y, 40, 0xFFD700, 0.8);
        this.scene.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Shake effect
        this.scene.tweens.add({
            targets: this,
            x: this.x + Phaser.Math.Between(-5, 5),
            y: this.y + Phaser.Math.Between(-5, 5),
            duration: 50,
            repeat: 5,
            yoyo: true,
            onComplete: () => {
                this.setPosition(this.x, this.y);
            }
        });
        
        // Spawn star particles using sprite asset
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const star = this.scene.add.image(
                this.x,
                this.y,
                'star-small'
            );
            star.setScale(0.6);
            
            this.scene.tweens.add({
                targets: star,
                x: this.x + Math.cos(angle) * 80,
                y: this.y + Math.sin(angle) * 80,
                scale: 0,
                alpha: 0,
                rotation: Math.PI * 2,
                duration: 800,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    star.destroy();
                }
            });
        }
    }
    
    private startRecharge(): void {
        this.isRecharging = true;
        
        // Visual indication of recharge
        this.crystalCore.setAlpha(0.3);
        this.energyRings.forEach(ring => ring.setAlpha(0.1));
        
        // Recharge timer
        this.scene.time.delayedCall(this.rechargeTime, () => {
            this.isRecharging = false;
            this.playRechargeCompleteAnimation();
        });
        
        // Recharge progress animation
        const rechargeBar = this.scene.add.graphics();
        rechargeBar.lineStyle(3, 0x00FFFF, 1);
        rechargeBar.strokeCircle(this.x, this.y, 35);
        rechargeBar.setAlpha(0.5);
        
        this.scene.tweens.add({
            targets: rechargeBar,
            alpha: { from: 0.5, to: 1 },
            duration: this.rechargeTime,
            onComplete: () => {
                rechargeBar.destroy();
            }
        });
    }
    
    private playRechargeCompleteAnimation(): void {
        // Restore alpha
        this.crystalCore.setAlpha(1);
        this.energyRings.forEach(ring => ring.setAlpha(0.3));
        
        // Burst effect
        const burst = this.scene.add.circle(this.x, this.y, 30, 0x00FFFF, 0.5);
        this.scene.tweens.add({
            targets: burst,
            scale: 2,
            alpha: 0,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                burst.destroy();
            }
        });
        
        // Ready pulse
        this.scene.tweens.add({
            targets: this.crystalCore,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
    
    private showRechargeFeedback(): void {
        // Show "recharging" feedback
        const text = this.scene.add.text(this.x, this.y - 50, 'RECHARGING', {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            color: '#00FFFF',
            stroke: '#000000',
            strokeThickness: 3
        });
        text.setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: text,
            y: this.y - 70,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }
    
    public destroy(): void {
        if (this.particleTimer) {
            this.particleTimer.destroy();
        }
        super.destroy();
    }
}