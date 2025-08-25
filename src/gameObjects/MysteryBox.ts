import { Scene } from 'phaser';
import { PowerUpType } from '@/systems/powerups/PowerUpManager';
import { Z_LAYERS } from '@/config/ArenaConfig';

/**
 * Mystery Box that drops from destroyed Mystery Bubbles
 * Floats for 3 seconds before expiring
 */
export class MysteryBox extends Phaser.GameObjects.Container {
    private powerUpType: PowerUpType;
    private remainingTime: number = 3000; // 3 seconds
    private timerBar!: Phaser.GameObjects.Graphics;
    private timerBarBg!: Phaser.GameObjects.Graphics;
    private boxSprite!: Phaser.GameObjects.Sprite;
    private questionMark!: Phaser.GameObjects.Text;
    private collected: boolean = false;
    private floatTween?: Phaser.Tweens.Tween;
    private glowEffect!: Phaser.GameObjects.Graphics;
    private particleTimer?: Phaser.Time.TimerEvent;
    
    constructor(scene: Scene, x: number, y: number, powerUpType: PowerUpType) {
        super(scene, x, y);
        
        this.powerUpType = powerUpType;
        this.scene.add.existing(this);
        this.setDepth(Z_LAYERS.FLOATING_UI);
        
        this.createVisuals();
        this.startFloating();
        this.startTimer();
    }
    
    private createVisuals(): void {
        // Create glow effect
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.fillStyle(0xFFD700, 0.3);
        this.glowEffect.fillCircle(0, 0, 25);
        this.add(this.glowEffect);
        
        // Create box background
        this.boxSprite = this.scene.add.sprite(0, 0, 'bubble'); // Placeholder, should be box sprite
        this.boxSprite.setTint(0xFFD700);
        this.boxSprite.setScale(0.8);
        this.add(this.boxSprite);
        
        // Create question mark
        this.questionMark = this.scene.add.text(0, 0, '?', {
            fontSize: '20px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        });
        this.questionMark.setOrigin(0.5);
        this.add(this.questionMark);
        
        // Create timer bar background
        this.timerBarBg = this.scene.add.graphics();
        this.timerBarBg.fillStyle(0x000000, 0.5);
        this.timerBarBg.fillRect(-20, -35, 40, 4);
        this.add(this.timerBarBg);
        
        // Create timer bar
        this.timerBar = this.scene.add.graphics();
        this.timerBar.fillStyle(0x00FF00, 1);
        this.timerBar.fillRect(-20, -35, 40, 4);
        this.add(this.timerBar);
        
        // Add sparkle particles
        this.createSparkles();
        
        // Pulsing glow animation
        this.scene.tweens.add({
            targets: this.glowEffect,
            alpha: { from: 0.3, to: 0.6 },
            scale: { from: 1, to: 1.2 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private createSparkles(): void {
        this.particleTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                if (!this.visible || this.collected) return;
                
                const sparkle = this.scene.add.star(
                    this.x + Phaser.Math.Between(-15, 15),
                    this.y + Phaser.Math.Between(-15, 15),
                    4, 2, 4,
                    0xFFD700
                );
                sparkle.setDepth(this.depth - 1);
                sparkle.setScale(0.3);
                
                this.scene.tweens.add({
                    targets: sparkle,
                    scale: 0,
                    alpha: 0,
                    angle: 180,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: () => sparkle.destroy()
                });
            },
            callbackScope: this,
            loop: true
        });
    }
    
    private startFloating(): void {
        // Gentle floating animation
        this.floatTween = this.scene.tweens.add({
            targets: this,
            y: this.y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Slight rotation
        this.scene.tweens.add({
            targets: this.boxSprite,
            angle: { from: -5, to: 5 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private startTimer(): void {
        // Update timer every frame
        this.scene.time.addEvent({
            delay: 50,
            callback: this.updateTimer,
            callbackScope: this,
            loop: true
        });
    }
    
    private updateTimer(): void {
        if (this.collected) return;
        
        this.remainingTime -= 50;
        
        if (this.remainingTime <= 0) {
            this.expire();
            return;
        }
        
        // Update timer bar
        const percentage = this.remainingTime / 3000;
        this.timerBar.clear();
        
        // Change color based on time remaining
        let color = 0x00FF00; // Green
        if (percentage < 0.33) {
            color = 0xFF0000; // Red
        } else if (percentage < 0.66) {
            color = 0xFFFF00; // Yellow
        }
        
        this.timerBar.fillStyle(color, 1);
        this.timerBar.fillRect(-20, -35, 40 * percentage, 4);
        
        // Flash when low on time
        if (percentage < 0.33) {
            this.setAlpha(0.5 + Math.sin(Date.now() * 0.01) * 0.5);
        }
    }
    
    /**
     * Collect the mystery box
     */
    public collect(): PowerUpType {
        if (this.collected) return this.powerUpType;
        
        this.collected = true;
        
        // Stop animations
        if (this.floatTween) {
            this.floatTween.stop();
        }
        if (this.particleTimer) {
            this.particleTimer.destroy();
        }
        
        // Play collection animation
        this.playRevealAnimation();
        
        return this.powerUpType;
    }
    
    private playRevealAnimation(): void {
        // Create reveal text showing what was collected
        const powerUpNames: Record<PowerUpType, string> = {
            [PowerUpType.RAINBOW]: '🌈 RAINBOW!',
            [PowerUpType.LASER]: '🎯 LASER SIGHT!',
            [PowerUpType.BOMB]: '💣 BOMB!',
            [PowerUpType.LIGHTNING]: '⚡ LIGHTNING!',
            [PowerUpType.FREEZE]: '❄️ FREEZE!',
            [PowerUpType.MULTIPLIER]: '🎱 MULTI-SHOT!',
            [PowerUpType.SHIELD]: '🛡️ SHIELD!',
            [PowerUpType.MAGNET]: '🧲 MAGNET!'
        };
        
        const revealText = this.scene.add.text(this.x, this.y, powerUpNames[this.powerUpType] || 'POWER-UP!', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        });
        revealText.setOrigin(0.5);
        revealText.setDepth(Z_LAYERS.FLOATING_UI + 1);
        revealText.setScale(0);
        
        // Explosion of particles
        for (let i = 0; i < 20; i++) {
            const particle = this.scene.add.circle(
                this.x,
                this.y,
                3,
                0xFFD700
            );
            particle.setDepth(this.depth);
            
            const angle = (Math.PI * 2 * i) / 20;
            const speed = Phaser.Math.Between(100, 200);
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => particle.destroy()
            });
        }
        
        // Animate reveal text
        this.scene.tweens.add({
            targets: revealText,
            scale: { from: 0, to: 1.2 },
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: revealText,
                    y: revealText.y - 50,
                    alpha: 0,
                    duration: 1000,
                    ease: 'Cubic.easeOut',
                    onComplete: () => revealText.destroy()
                });
            }
        });
        
        // Hide the box
        this.scene.tweens.add({
            targets: this,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeIn',
            onComplete: () => this.destroy()
        });
    }
    
    /**
     * Expire the box (time ran out)
     */
    private expire(): void {
        if (this.collected) return;
        
        this.collected = true;
        
        // Stop animations
        if (this.floatTween) {
            this.floatTween.stop();
        }
        if (this.particleTimer) {
            this.particleTimer.destroy();
        }
        
        // Fade out
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: 0.5,
            duration: 300,
            ease: 'Cubic.easeIn',
            onComplete: () => this.destroy()
        });
    }
    
    /**
     * Check if box should auto-collect near launcher
     */
    public checkAutoCollect(launcherY: number): boolean {
        if (this.collected) return false;
        
        // Auto-collect if passing launcher area
        const collectThreshold = 50;
        if (Math.abs(this.y - launcherY) < collectThreshold) {
            this.collect();
            return true;
        }
        
        return false;
    }
    
    public getPowerUpType(): PowerUpType {
        return this.powerUpType;
    }
    
    public isCollected(): boolean {
        return this.collected;
    }
}