import { Scene } from 'phaser';
import { Bubble } from './Bubble';
import { PowerUpType } from '@/systems/powerups/PowerUpManager';
import { Z_LAYERS } from '@/config/ArenaConfig';

/**
 * Mystery Bubble that cycles through different power-ups
 * Shows the current power-up icon inside a semi-transparent bubble
 */
export class MysteryBubble extends Bubble {
    private powerUpIcon!: Phaser.GameObjects.Text;
    private currentPowerUp: PowerUpType;
    private powerUpCycleTimer?: Phaser.Time.TimerEvent;
    private glowEffect!: Phaser.GameObjects.Graphics;
    private iconBg!: Phaser.GameObjects.Graphics;
    
    // Power-up rotation sequence
    private powerUpSequence: PowerUpType[] = [
        PowerUpType.RAINBOW,
        PowerUpType.BOMB,
        PowerUpType.LIGHTNING,
        PowerUpType.FREEZE,
        PowerUpType.LASER,
        PowerUpType.MULTIPLIER
    ];
    private sequenceIndex: number = 0;
    
    // Power-up icons and colors
    private powerUpIcons: Record<PowerUpType, { icon: string; color: number }> = {
        [PowerUpType.RAINBOW]: { icon: '🌈', color: 0xFF69B4 },
        [PowerUpType.BOMB]: { icon: '💣', color: 0xFF4500 },
        [PowerUpType.LIGHTNING]: { icon: '⚡', color: 0xFFD700 },
        [PowerUpType.FREEZE]: { icon: '❄️', color: 0x00CED1 },
        [PowerUpType.LASER]: { icon: '🎯', color: 0x00FF00 },
        [PowerUpType.MULTIPLIER]: { icon: '✨', color: 0x9370DB },
        [PowerUpType.SHIELD]: { icon: '🛡️', color: 0x4169E1 },
        [PowerUpType.MAGNET]: { icon: '🧲', color: 0xDC143C }
    };
    
    constructor(scene: Scene, x: number, y: number) {
        // Use random color as base
        super(scene, x, y, Bubble.getRandomColor());
        
        // Start with a random power-up
        this.sequenceIndex = Math.floor(Math.random() * this.powerUpSequence.length);
        this.currentPowerUp = this.powerUpSequence[this.sequenceIndex];
        
        this.createMysteryVisuals();
        this.startPowerUpCycle();
    }
    
    private createMysteryVisuals(): void {
        // Make base bubble semi-transparent so we can see the power-up inside
        const bubbleSprite = this.list[0] as Phaser.GameObjects.Arc;
        if (bubbleSprite) {
            bubbleSprite.setAlpha(0.4); // Semi-transparent
        }
        
        // Create a subtle glow effect
        this.glowEffect = this.scene.add.graphics();
        this.updateGlowEffect();
        this.addAt(this.glowEffect, 0); // Add behind bubble
        
        // Create icon background circle for better visibility
        this.iconBg = this.scene.add.graphics();
        this.iconBg.fillStyle(0x000000, 0.3);
        this.iconBg.fillCircle(0, 0, 12);
        this.add(this.iconBg);
        
        // Create power-up icon
        this.powerUpIcon = this.scene.add.text(0, 0, '', {
            fontSize: '18px',
            fontFamily: 'Arial'
        });
        this.powerUpIcon.setOrigin(0.5);
        this.add(this.powerUpIcon);
        
        // Update to show current power-up
        this.updatePowerUpDisplay();
        
        // Add subtle pulse animation
        this.scene.tweens.add({
            targets: [this.powerUpIcon, this.iconBg],
            scale: { from: 0.9, to: 1.1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private updateGlowEffect(): void {
        if (!this.glowEffect) return;
        
        this.glowEffect.clear();
        const config = this.powerUpIcons[this.currentPowerUp];
        
        // Create gradient glow
        this.glowEffect.fillStyle(config.color, 0.2);
        this.glowEffect.fillCircle(0, 0, 20);
        this.glowEffect.fillStyle(config.color, 0.1);
        this.glowEffect.fillCircle(0, 0, 25);
    }
    
    private updatePowerUpDisplay(): void {
        const config = this.powerUpIcons[this.currentPowerUp];
        this.powerUpIcon.setText(config.icon);
        
        // Update glow color
        this.updateGlowEffect();
        
        // Add a small pop animation when changing
        this.scene.tweens.add({
            targets: this.powerUpIcon,
            scale: { from: 1.3, to: 1 },
            duration: 300,
            ease: 'Back.easeOut'
        });
    }
    
    private startPowerUpCycle(): void {
        // Change power-up every 2-3 seconds
        const cycleFunction = () => {
            this.cyclePowerUp();
            // Schedule next cycle
            this.powerUpCycleTimer = this.scene.time.delayedCall(
                Phaser.Math.Between(2000, 3000),
                cycleFunction
            );
        };
        
        // Start the first cycle
        this.powerUpCycleTimer = this.scene.time.delayedCall(
            Phaser.Math.Between(2000, 3000),
            cycleFunction
        );
    }
    
    private cyclePowerUp(): void {
        // Move to next power-up in sequence
        this.sequenceIndex = (this.sequenceIndex + 1) % this.powerUpSequence.length;
        this.currentPowerUp = this.powerUpSequence[this.sequenceIndex] || PowerUpType.RAINBOW;
        this.updatePowerUpDisplay();
    }
    
    /**
     * Get the current power-up type
     */
    public getCurrentPowerUp(): PowerUpType {
        return this.currentPowerUp;
    }
    
    /**
     * Override to identify as mystery bubble
     */
    public isMysteryBubble(): boolean {
        return true;
    }
    
    /**
     * Collect power-up when bubble is destroyed
     */
    public collectPowerUp(isPlayerShot: boolean = true): void {
        console.log(`Collecting power-up: ${this.currentPowerUp} at position (${this.x}, ${this.y}) for ${isPlayerShot ? 'player' : 'opponent'}`);
        
        // Create visual feedback at bubble position
        const config = this.powerUpIcons[this.currentPowerUp];
        
        // Create large icon that floats up and fades
        const floatingIcon = this.scene.add.text(this.x, this.y, config.icon, {
            fontSize: '32px',
            fontFamily: 'Arial'
        });
        floatingIcon.setOrigin(0.5);
        floatingIcon.setDepth(Z_LAYERS.FLOATING_UI);
        
        // Add "POWER-UP!" text
        const powerUpText = this.scene.add.text(this.x, this.y + 20, 'POWER-UP!', {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        });
        powerUpText.setOrigin(0.5);
        powerUpText.setDepth(Z_LAYERS.FLOATING_UI);
        
        // Animate both elements
        this.scene.tweens.add({
            targets: [floatingIcon, powerUpText],
            y: this.y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                floatingIcon.destroy();
                powerUpText.destroy();
            }
        });
        
        // Flash effect
        const flash = this.scene.add.circle(this.x, this.y, 30, config.color, 0.5);
        flash.setDepth(Z_LAYERS.FLOATING_UI - 1);
        
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
        
        // Emit event to add power-up to inventory
        // Owner is determined by who shot the bubble that caused the match
        const owner = isPlayerShot ? 'player' : 'opponent';
        console.log(`Emitting power-up-collected event: type=${this.currentPowerUp}, owner=${owner}`);
        
        this.scene.events.emit('power-up-collected', {
            type: this.currentPowerUp,
            x: this.x,
            y: this.y,
            owner: owner
        });
    }
    
    public override destroy(): void {
        console.log('MysteryBubble destroy called, visible:', this.visible);
        
        if (this.powerUpCycleTimer) {
            this.powerUpCycleTimer.destroy();
        }
        
        // Note: Power-ups are collected through MatchDetectionSystem now
        // This destroy method is called when returning to pool, not when collecting
        
        super.destroy();
    }
}