import Phaser from 'phaser';

export class ScoreDisplay extends Phaser.GameObjects.Container {
    private scoreText: Phaser.GameObjects.Text;
    private currentScore: number = 0;
    private targetScore: number = 0;
    private comboText?: Phaser.GameObjects.Text;
    private comboMultiplier: number = 1;
    
    constructor(scene: Phaser.Scene) {
        super(scene, scene.cameras.main.centerX, 50);
        
        // Background panel for visibility
        const bg = scene.add.rectangle(0, 0, 200, 60, 0x000000, 0.7);
        bg.setStrokeStyle(2, 0xFFD700);
        
        // Score label
        const label = scene.add.text(0, -15, 'SCORE', {
            fontSize: '16px',
            color: '#FFD700',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Score value
        this.scoreText = scene.add.text(0, 10, '0', {
            fontSize: '28px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Combo text (hidden by default)
        this.comboText = scene.add.text(0, 40, '', {
            fontSize: '14px',
            color: '#FFA500',
            fontFamily: 'Arial',
            fontStyle: 'bold'
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