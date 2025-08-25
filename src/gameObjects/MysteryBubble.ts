import { Scene } from 'phaser';
import { Bubble } from './Bubble';
import { BubbleColor } from '@/types/ArenaTypes';
import { PowerUpType } from '@/systems/powerups/PowerUpManager';

/**
 * Mystery Bubble containing random power-ups
 * Visual: Rainbow shimmer with rotating "?" symbol
 */
export class MysteryBubble extends Bubble {
    private questionMark!: Phaser.GameObjects.Text;
    private shimmerGraphics!: Phaser.GameObjects.Graphics;
    private glowEffect!: Phaser.GameObjects.Graphics;
    private rotationTween?: Phaser.Tweens.Tween;
    private shimmerColors: number[] = [
        0xFF0000, // Red
        0xFF7F00, // Orange
        0xFFFF00, // Yellow
        0x00FF00, // Green
        0x0000FF, // Blue
        0x4B0082, // Indigo
        0x9400D3  // Violet
    ];
    private currentShimmerIndex: number = 0;
    
    constructor(scene: Scene, x: number, y: number) {
        // Use a special color identifier for mystery bubbles
        super(scene, x, y, BubbleColor.RED); // Use existing color, will be overridden visually
        this.createMysteryVisuals();
    }
    
    private createMysteryVisuals(): void {
        // Create glow effect background
        this.glowEffect = this.scene.add.graphics();
        this.glowEffect.fillStyle(0xFFD700, 0.3);
        this.glowEffect.fillCircle(0, 0, 35);
        this.add(this.glowEffect);
        
        // Create shimmer effect
        this.shimmerGraphics = this.scene.add.graphics();
        this.add(this.shimmerGraphics);
        this.updateShimmer();
        
        // Create question mark
        this.questionMark = this.scene.add.text(0, 0, '?', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.questionMark.setOrigin(0.5);
        this.questionMark.setShadow(2, 2, '#000000', 2, true, true);
        this.add(this.questionMark);
        
        // Add rotation animation
        this.rotationTween = this.scene.tweens.add({
            targets: this,
            angle: 360,
            duration: 8000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Add shimmer animation
        this.scene.time.addEvent({
            delay: 200,
            callback: this.updateShimmer,
            callbackScope: this,
            loop: true
        });
        
        // Add pulsing glow
        this.scene.tweens.add({
            targets: this.glowEffect,
            alpha: { from: 0.3, to: 0.6 },
            scale: { from: 1, to: 1.1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private updateShimmer(): void {
        if (!this.shimmerGraphics || !this.visible) return;
        
        this.shimmerGraphics.clear();
        
        // Draw rainbow ring
        const segments = 12;
        const radius = 25;
        const thickness = 3;
        
        for (let i = 0; i < segments; i++) {
            const startAngle = (i / segments) * Math.PI * 2;
            const endAngle = ((i + 1) / segments) * Math.PI * 2;
            
            const colorIndex = (this.currentShimmerIndex + i) % this.shimmerColors.length;
            const color = this.shimmerColors[colorIndex];
            
            this.shimmerGraphics.lineStyle(thickness, color ?? 0xFFFFFF, 0.8);
            this.shimmerGraphics.beginPath();
            this.shimmerGraphics.arc(0, 0, radius, startAngle, endAngle);
            this.shimmerGraphics.strokePath();
        }
        
        this.currentShimmerIndex = (this.currentShimmerIndex + 1) % this.shimmerColors.length;
    }
    
    /**
     * Get weighted random power-up type based on distribution
     */
    public getRandomPowerUpType(): PowerUpType {
        const weights = [
            { type: PowerUpType.RAINBOW, weight: 25 },
            { type: PowerUpType.LASER, weight: 15 },
            { type: PowerUpType.BOMB, weight: 20 },
            { type: PowerUpType.LIGHTNING, weight: 20 },
            { type: PowerUpType.FREEZE, weight: 10 },
            { type: PowerUpType.MULTIPLIER, weight: 10 } // Using MULTIPLIER as MULTI_SHOT placeholder
        ];
        
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weights) {
            random -= item.weight;
            if (random <= 0) {
                return item.type;
            }
        }
        
        return PowerUpType.RAINBOW; // Fallback
    }
    
    /**
     * Override to identify as mystery bubble
     */
    public isMysteryBubble(): boolean {
        return true;
    }
    
    public override destroy(): void {
        if (this.rotationTween) {
            this.rotationTween.stop();
        }
        super.destroy();
    }
}