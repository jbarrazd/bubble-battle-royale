import Phaser from 'phaser';
import { HD_SCALE } from '@/config/GameConfig';

export class ScoreDisplay extends Phaser.GameObjects.Container {
    private scoreText: Phaser.GameObjects.Text;
    private currentScore: number = 0;
    private targetScore: number = 0;
    private comboText?: Phaser.GameObjects.Text;
    private comboMultiplier: number = 1;
    private isOpponent: boolean;
    
    constructor(scene: Phaser.Scene, isOpponent: boolean = false) {
        // Position based on player/opponent
        const screenWidth = scene.cameras.main.width;
        const screenHeight = scene.cameras.main.height;
        
        // Player: bottom-left, Opponent: top-right (mirrored) - adjusted for extra large size
        const x = isOpponent ? 
            screenWidth - (120 * HD_SCALE) : // More space for giant panel
            120 * HD_SCALE; // Scaled position
        const y = isOpponent ? 70 * HD_SCALE : screenHeight - (70 * HD_SCALE);  // More space from edges
        
        super(scene, x, y);
        this.isOpponent = isOpponent;
        
        // Compact background panel - EXTRA LARGE for maximum visibility
        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(-100 * HD_SCALE, -60 * HD_SCALE, 200 * HD_SCALE, 120 * HD_SCALE, 15 * HD_SCALE);
        bg.lineStyle(4 * HD_SCALE, this.isOpponent ? 0xFF6B6B : 0x4ECDC4, 0.8);
        bg.strokeRoundedRect(-100 * HD_SCALE, -60 * HD_SCALE, 200 * HD_SCALE, 120 * HD_SCALE, 15 * HD_SCALE);
        
        // Score label - MASSIVE text size
        const label = scene.add.text(0, -35 * HD_SCALE, this.isOpponent ? 'ENEMY' : 'SCORE', {
            fontSize: `${24 * HD_SCALE}px`,
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            stroke: this.isOpponent ? '#8B0000' : '#00008B',
            strokeThickness: 4 * HD_SCALE
        }).setOrigin(0.5);
        
        // Score value - GIGANTIC for maximum visibility
        this.scoreText = scene.add.text(0, 10 * HD_SCALE, '0', {
            fontSize: `${48 * HD_SCALE}px`,
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            stroke: '#000000',
            strokeThickness: 3 * HD_SCALE
        }).setOrigin(0.5);
        
        // Combo text (hidden by default) - positioned outside the box
        this.comboText = scene.add.text(0, 65 * HD_SCALE, '', {
            fontSize: `${20 * HD_SCALE}px`,
            color: '#FFA500',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3 * HD_SCALE
        }).setOrigin(0.5);
        this.comboText.setVisible(false);
        
        this.add([bg, label, this.scoreText, this.comboText]);
        this.setDepth(1000);
        scene.add.existing(this);
        
        // Entrance animation
        this.setScale(0);
        scene.tweens.add({
            targets: this,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
    }
    
    public updateScore(newScore: number, instant: boolean = false): void {
        this.targetScore = newScore;
        
        if (instant) {
            this.currentScore = this.targetScore;
            this.scoreText.setText(Math.floor(this.currentScore).toString());
            return;
        }
        
        // Tween the score number
        this.scene.tweens.add({
            targets: this,
            currentScore: this.targetScore,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                this.scoreText.setText(Math.floor(this.currentScore).toString());
            }
        });
        
        // Flash effect
        this.flashScore();
        
        // Pulse animation
        this.scene.tweens.add({
            targets: this.scoreText,
            scale: 1.2,
            duration: 200,
            yoyo: true,
            ease: 'Power2'
        });
    }
    
    public setCombo(multiplier: number): void {
        this.comboMultiplier = multiplier;
        
        if (multiplier > 1) {
            this.comboText?.setText(`COMBO x${multiplier}`);
            this.comboText?.setVisible(true);
            
            // Animate combo text
            this.scene.tweens.add({
                targets: this.comboText,
                scale: 1.3,
                duration: 300,
                yoyo: true,
                ease: 'Power2'
            });
        } else {
            this.comboText?.setVisible(false);
        }
    }
    
    private flashScore(): void {
        this.scoreText.setTint(0x00FF00);
        this.scene.time.delayedCall(200, () => {
            this.scoreText.clearTint();
        });
    }
    
    public getScore(): number {
        return Math.floor(this.currentScore);
    }
    
    public destroy(): void {
        // Check if scene is still available before accessing tweens
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(this);
            if (this.scoreText) {
                this.scene.tweens.killTweensOf(this.scoreText);
            }
            if (this.comboText) {
                this.scene.tweens.killTweensOf(this.comboText);
            }
        }
        super.destroy();
    }
}