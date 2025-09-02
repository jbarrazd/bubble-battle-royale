import Phaser from 'phaser';

export class DefeatScreen extends Phaser.GameObjects.Container {
    constructor(
        scene: Phaser.Scene, 
        finalScore: number, 
        onRetry: () => void, 
        onMenu: () => void
    ) {
        super(scene, scene.cameras.main.centerX, scene.cameras.main.centerY);
        
        // Semi-transparent backdrop
        const backdrop = scene.add.rectangle(
            0, 0,
            scene.cameras.main.width * 2,
            scene.cameras.main.height * 2,
            0x000000, 0.85
        );
        backdrop.setInteractive(); // Block clicks
        
        // Defeat panel background with softer colors
        const panelBg = scene.add.rectangle(0, 0, 400, 450, 0x2c2c3e, 0.95);
        panelBg.setStrokeStyle(3, 0x7B68EE);
        
        // Defeat banner
        const banner = scene.add.rectangle(0, -140, 350, 90, 0x4B0082, 0.9);
        banner.setStrokeStyle(2, 0x7B68EE);
        
        // Defeat text
        const defeatText = scene.add.text(0, -140, 'GAME OVER', {
            fontSize: '42px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        defeatText.setShadow(2, 2, '#000000', 5);
        
        // Encouraging message
        const encourageText = scene.add.text(0, -80, "Don't give up!", {
            fontSize: '20px',
            color: '#FFD700',
            fontFamily: 'Arial',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        // Score section
        const scoreBg = scene.add.rectangle(0, -10, 280, 70, 0x1a1a2e, 0.8);
        scoreBg.setStrokeStyle(2, 0x7B68EE);
        
        const scoreLabel = scene.add.text(0, -28, 'YOUR SCORE', {
            fontSize: '18px',
            color: '#B8B8B8',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        const scoreValue = scene.add.text(0, 2, finalScore.toString(), {
            fontSize: '36px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Motivational text
        let motivationalMsg = "You can do better!";
        if (finalScore > 1000) motivationalMsg = "Great effort!";
        if (finalScore > 5000) motivationalMsg = "So close! Try again!";
        if (finalScore > 10000) motivationalMsg = "Amazing score! Almost there!";
        
        const motivationText = scene.add.text(0, 50, motivationalMsg, {
            fontSize: '18px',
            color: '#FFA500',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Buttons - Retry is more prominent
        const retryBtn = this.createButton(
            scene, 0, 120, 'TRY AGAIN', 
            0xFF6B6B, 0xFF8E8E, true, onRetry
        );
        
        const menuBtn = this.createButton(
            scene, 0, 185, 'Main Menu', 
            0x5C5C8A, 0x7C7CAA, false, onMenu
        );
        
        // Add all elements
        this.add([
            backdrop, panelBg, banner,
            defeatText, encourageText,
            scoreBg, scoreLabel, scoreValue,
            motivationText, retryBtn, menuBtn
        ]);
        
        // Initial state for animations
        this.setAlpha(0);
        panelBg.setScale(0.8);
        defeatText.setScale(0);
        
        // Gentle entrance animations
        scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 500,
            ease: 'Power2'
        });
        
        scene.tweens.add({
            targets: panelBg,
            scaleX: 1,
            scaleY: 1,
            duration: 600,
            ease: 'Quad.easeOut',
            delay: 100
        });
        
        scene.tweens.add({
            targets: defeatText,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Quad.easeOut',
            delay: 300
        });
        
        // Gentle pulsing on encourage text
        scene.tweens.add({
            targets: encourageText,
            scale: 1.05,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Score display (immediate, no count up for defeat)
        scoreValue.setScale(0);
        scene.tweens.add({
            targets: scoreValue,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut',
            delay: 500
        });
        
        // Add some floating bubbles for visual interest
        this.createFloatingBubbles(scene);
        
        this.setDepth(2000);
        scene.add.existing(this);
    }
    
    private createButton(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        text: string, 
        bgColor: number,
        hoverColor: number,
        isPrimary: boolean,
        callback: () => void
    ): Phaser.GameObjects.Container {
        const button = scene.add.container(x, y);
        
        const width = isPrimary ? 240 : 200;
        const height = isPrimary ? 60 : 50;
        const fontSize = isPrimary ? '24px' : '20px';
        
        const bg = scene.add.rectangle(0, 0, width, height, bgColor);
        bg.setInteractive({ useHandCursor: true });
        bg.setStrokeStyle(isPrimary ? 3 : 2, 0xFFFFFF);
        
        const shadow = scene.add.rectangle(0, 3, width, height, 0x000000, 0.3);
        shadow.setDepth(-1);
        
        const label = scene.add.text(0, 0, text, {
            fontSize: fontSize,
            color: '#FFFFFF',
            fontFamily: isPrimary ? 'Arial Black' : 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        button.add([shadow, bg, label]);
        
        // Primary button pulses
        if (isPrimary) {
            scene.tweens.add({
                targets: bg,
                scale: 1.05,
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        
        // Button interactions
        bg.on('pointerover', () => {
            bg.setFillStyle(hoverColor);
            scene.tweens.add({
                targets: [bg, label],
                scale: 1.1,
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
            console.log(`💆 DefeatScreen button clicked: ${text}`);
            
            // Emit UI click event for sound system
            scene.events.emit('ui-click');
            
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
        button.setAlpha(0);
        scene.tweens.add({
            targets: button,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            delay: 800 + (isPrimary ? 0 : 200)
        });
        
        return button;
    }
    
    private createFloatingBubbles(scene: Phaser.Scene): void {
        const colors = [0x7B68EE, 0x4B0082, 0x6A5ACD];
        
        for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Between(-150, 150);
            const y = Phaser.Math.Between(-200, 200);
            
            const bubble = scene.add.circle(x, y, 15, colors[i % colors.length], 0.2);
            this.add(bubble);
            
            // Floating animation
            scene.tweens.add({
                targets: bubble,
                y: y - 30,
                duration: 3000 + i * 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 200
            });
            
            scene.tweens.add({
                targets: bubble,
                x: x + Phaser.Math.Between(-20, 20),
                duration: 2000 + i * 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 150
            });
        }
    }
    
    public destroy(): void {
        this.scene.tweens.killTweensOf(this);
        super.destroy();
    }
}