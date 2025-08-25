import Phaser from 'phaser';

export class VictoryScreen extends Phaser.GameObjects.Container {
    private particles?: Phaser.GameObjects.Particles.ParticleEmitter;
    
    constructor(
        scene: Phaser.Scene, 
        finalScore: number, 
        onReplay: () => void, 
        onMenu: () => void
    ) {
        super(scene, scene.cameras.main.centerX, scene.cameras.main.centerY);
        
        // Semi-transparent backdrop
        const backdrop = scene.add.rectangle(
            0, 0,
            scene.cameras.main.width * 2,
            scene.cameras.main.height * 2,
            0x000000, 0.75
        );
        backdrop.setInteractive(); // Block clicks
        
        // Victory panel background
        const panelBg = scene.add.rectangle(0, 0, 400, 500, 0x1a1a2e, 0.95);
        panelBg.setStrokeStyle(4, 0xFFD700);
        
        // Victory banner
        const banner = scene.add.rectangle(0, -150, 350, 100, 0xFFD700);
        banner.setStrokeStyle(3, 0xFFA500);
        
        // Victory text with glow effect
        const victoryGlow = scene.add.text(0, -150, 'VICTORY!', {
            fontSize: '52px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        victoryGlow.setShadow(0, 0, '#FFD700', 10);
        
        const victoryText = scene.add.text(0, -150, 'VICTORY!', {
            fontSize: '48px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            stroke: '#FF6600',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Stars decoration
        const star1 = this.createStar(scene, -120, -150, 20, 0xFFD700);
        const star2 = this.createStar(scene, 120, -150, 20, 0xFFD700);
        const star3 = this.createStar(scene, 0, -200, 15, 0xFFA500);
        
        // Score section
        const scoreBg = scene.add.rectangle(0, -20, 300, 80, 0x2c3e50, 0.8);
        scoreBg.setStrokeStyle(2, 0xFFD700);
        
        const scoreLabel = scene.add.text(0, -40, 'FINAL SCORE', {
            fontSize: '20px',
            color: '#FFD700',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const scoreValue = scene.add.text(0, -5, '0', {
            fontSize: '42px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Stats
        const statsText = scene.add.text(0, 50, 'Great job!', {
            fontSize: '18px',
            color: '#FFD700',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Buttons
        const playAgainBtn = this.createButton(scene, 0, 130, 'PLAY AGAIN', 0x00AA00, 0x00FF00, onReplay);
        const menuBtn = this.createButton(scene, 0, 200, 'MAIN MENU', 0x0066CC, 0x0099FF, onMenu);
        
        // Add all elements
        this.add([
            backdrop, panelBg, banner, 
            star1, star2, star3,
            victoryGlow, victoryText,
            scoreBg, scoreLabel, scoreValue,
            statsText, playAgainBtn, menuBtn
        ]);
        
        // Initial state for animations
        this.setAlpha(0);
        panelBg.setScale(0);
        banner.setScale(0);
        victoryText.setScale(0);
        victoryGlow.setScale(0);
        
        // Entrance animations
        scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        scene.tweens.add({
            targets: panelBg,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Back.easeOut',
            delay: 100
        });
        
        scene.tweens.add({
            targets: [banner, victoryText, victoryGlow],
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
            delay: 300
        });
        
        // Star rotation
        scene.tweens.add({
            targets: [star1, star2, star3],
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Score count up
        const scoreCounter = { value: 0 };
        scene.tweens.add({
            targets: scoreCounter,
            value: finalScore,
            duration: 1500,
            ease: 'Cubic.easeOut',
            delay: 800,
            onUpdate: () => {
                scoreValue.setText(Math.floor(scoreCounter.value).toString());
            },
            onComplete: () => {
                // Pulse the score
                scene.tweens.add({
                    targets: scoreValue,
                    scale: 1.1,
                    duration: 300,
                    yoyo: true,
                    ease: 'Power2'
                });
            }
        });
        
        // Create particle effects
        this.createConfetti(scene);
        
        // Camera shake for impact
        scene.cameras.main.shake(300, 0.005);
        
        this.setDepth(2000);
        scene.add.existing(this);
    }
    
    private createStar(scene: Phaser.Scene, x: number, y: number, size: number, color: number): Phaser.GameObjects.Star {
        const star = scene.add.star(x, y, 5, size * 0.5, size, color);
        star.setStrokeStyle(2, 0xFFFFFF);
        return star;
    }
    
    private createButton(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        text: string, 
        bgColor: number,
        hoverColor: number,
        callback: () => void
    ): Phaser.GameObjects.Container {
        const button = scene.add.container(x, y);
        
        const bg = scene.add.rectangle(0, 0, 220, 55, bgColor);
        bg.setInteractive({ useHandCursor: true });
        bg.setStrokeStyle(3, 0xFFFFFF);
        
        const shadow = scene.add.rectangle(0, 3, 220, 55, 0x000000, 0.3);
        shadow.setDepth(-1);
        
        const label = scene.add.text(0, 0, text, {
            fontSize: '22px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        button.add([shadow, bg, label]);
        
        // Button interactions
        bg.on('pointerover', () => {
            bg.setFillStyle(hoverColor);
            scene.tweens.add({
                targets: [bg, label],
                scale: 1.05,
                duration: 100,
                ease: 'Power2'
            });
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
            scene.tweens.add({
                targets: [bg, label],
                scale: 1,
                duration: 100,
                ease: 'Power2'
            });
        });
        
        bg.on('pointerdown', () => {
            console.log(`💆 VictoryScreen button clicked: ${text}`);
            
            // Execute callback IMMEDIATELY without waiting for tween
            console.log(`🚀 Executing callback for: ${text}`);
            
            try {
                if (callback && typeof callback === 'function') {
                    console.log(`💫 Callback type check passed, executing...`);
                    callback();
                    console.log(`✅ Callback executed successfully!`);
                } else {
                    console.error('❌ Callback is not a function:', callback, 'Type:', typeof callback);
                }
            } catch (error) {
                console.error('❌ Error executing callback:', error);
            }
            
            // Visual feedback AFTER callback
            scene.tweens.add({
                targets: button,
                scale: 0.9,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        });
        
        // Initial animation
        button.setScale(0);
        scene.tweens.add({
            targets: button,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut',
            delay: 1000 + (y > 150 ? 200 : 0)
        });
        
        return button;
    }
    
    private createConfetti(scene: Phaser.Scene): void {
        const colors = [0xFFD700, 0xFFA500, 0xFF69B4, 0x00CED1, 0x98FB98, 0xFF6347];
        
        // Create confetti manually using shapes
        const confettiTimer = scene.time.addEvent({
            delay: 100,
            repeat: 30,
            callback: () => {
                for (let i = 0; i < 6; i++) {
                    const x = Phaser.Math.Between(-100, 100);
                    const y = -250;
                    
                    // Random shape (circle or rectangle)
                    const shape = Math.random() > 0.5 ?
                        scene.add.circle(x, y, Phaser.Math.Between(3, 6), Phaser.Utils.Array.GetRandom(colors), 0.9) :
                        scene.add.rectangle(x, y, Phaser.Math.Between(8, 12), Phaser.Math.Between(4, 6), Phaser.Utils.Array.GetRandom(colors), 0.9);
                    
                    shape.setRotation(Math.random() * Math.PI * 2);
                    this.add(shape);
                    
                    const angle = Phaser.Math.Between(-110, -70) * Math.PI / 180;
                    const speed = Phaser.Math.Between(100, 350);
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;
                    
                    scene.tweens.add({
                        targets: shape,
                        x: shape.x + vx,
                        y: shape.y + vy + 600, // Gravity effect
                        rotation: shape.rotation + Phaser.Math.Between(-6, 6),
                        alpha: 0,
                        scale: 0,
                        duration: 3000,
                        ease: 'Power2',
                        onComplete: () => shape.destroy()
                    });
                }
            }
        });
        
        // Stop confetti after 3 seconds
        scene.time.delayedCall(3000, () => {
            confettiTimer.destroy();
        });
    }
    
    public destroy(): void {
        this.scene.tweens.killTweensOf(this);
        super.destroy();
    }
}