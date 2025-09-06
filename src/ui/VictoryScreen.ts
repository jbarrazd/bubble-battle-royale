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
        
        // Fade in container
        scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // Scale up panel
        scene.tweens.add({
            targets: panelBg,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
            delay: 100
        });
        
        // Scale up banner
        scene.tweens.add({
            targets: [banner],
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            ease: 'Back.easeOut',
            delay: 200
        });
        
        // Scale up victory text with bounce
        scene.tweens.add({
            targets: [victoryText, victoryGlow],
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            ease: 'Elastic.easeOut',
            delay: 400
        });
        
        // Star rotation for all stars
        scene.tweens.add({
            targets: [star1, star2, star3],
            angle: 360,
            duration: 5000,
            repeat: -1,
            ease: 'Linear',
            delay: 600
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
        
        // Set proper depth for UI overlay
        this.setDepth(2000); // UI layer depth
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
            
            // Emit UI click event for sound system
            scene.events.emit('ui-click');
            
            // Execute callback IMMEDIATELY without waiting for tween
            
            try {
                if (callback && typeof callback === 'function') {
                    callback();
                } else {
                }
            } catch (error) {
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
        
        // Initial animation - start mostly visible
        button.setScale(0.9);
        button.setAlpha(1);
        scene.tweens.add({
            targets: button,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut',
            delay: 200 + (y > 150 ? 100 : 0)
        });
        
        return button;
    }
    
    private createConfetti(scene: Phaser.Scene): void {
        const colors = [0xFFD700, 0xFFA500, 0xFF69B4, 0x00CED1, 0x98FB98, 0xFF6347];
        
        // Create confetti effect
        const confettiTimer = scene.time.addEvent({
            delay: 100,
            repeat: 20,
            callback: () => {
                for (let i = 0; i < 5; i++) {
                    const x = Phaser.Math.Between(-100, 100);
                    const y = -250;
                    
                    // Simple circles only to reduce complexity
                    const shape = scene.add.circle(x, y, Phaser.Math.Between(4, 6), 
                        Phaser.Utils.Array.GetRandom(colors), 0.9);
                    
                    this.add(shape);
                    
                    const angle = Phaser.Math.Between(-110, -70) * Math.PI / 180;
                    const speed = Phaser.Math.Between(150, 250);
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;
                    
                    // Simpler tween
                    scene.tweens.add({
                        targets: shape,
                        x: shape.x + vx,
                        y: shape.y + vy + 400,
                        alpha: 0,
                        duration: 2000,
                        ease: 'Quad.easeOut',
                        onComplete: () => shape.destroy()
                    });
                }
            }
        });
        
        // Stop confetti after 2 seconds
        scene.time.delayedCall(2000, () => {
            confettiTimer.destroy();
        });
    }
    
    public destroy(): void {
        this.scene.tweens.killTweensOf(this);
        super.destroy();
    }
}