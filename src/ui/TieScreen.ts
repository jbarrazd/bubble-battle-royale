import Phaser from 'phaser';

export class TieScreen extends Phaser.GameObjects.Container {
    constructor(
        scene: Phaser.Scene, 
        playerScore: number,
        opponentScore: number,
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
        
        // Tie panel background
        const panelBg = scene.add.rectangle(0, 0, 400, 450, 0x2c3e50, 0.95);
        panelBg.setStrokeStyle(4, 0xFFD700);
        
        // Tie banner
        const banner = scene.add.rectangle(0, -140, 350, 90, 0xFFA500);
        banner.setStrokeStyle(3, 0xFF8C00);
        
        // Tie text
        const tieText = scene.add.text(0, -140, 'TIE GAME!', {
            fontSize: '42px',
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            stroke: '#FF6600',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Handshake emoji
        const handshakeEmoji = scene.add.text(0, -80, '🤝', {
            fontSize: '48px'
        }).setOrigin(0.5);
        
        // Score section
        const scoreBg = scene.add.rectangle(0, -10, 300, 80, 0x34495e, 0.8);
        scoreBg.setStrokeStyle(2, 0xFFD700);
        
        const scoreTitle = scene.add.text(0, -30, 'FINAL SCORES', {
            fontSize: '18px',
            color: '#FFD700',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const playerScoreText = scene.add.text(-60, 0, `You: ${playerScore}`, {
            fontSize: '20px',
            color: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        const opponentScoreText = scene.add.text(60, 0, `AI: ${opponentScore}`, {
            fontSize: '20px',
            color: '#FFFFFF',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
        
        // Message
        const messageText = scene.add.text(0, 50, 'Well matched!', {
            fontSize: '22px',
            color: '#FFD700',
            fontFamily: 'Arial',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        
        // Buttons
        const playAgainBtn = this.createButton(
            scene, 0, 120, 'REMATCH', 
            0x00AA00, 0x00FF00, onReplay
        );
        
        const menuBtn = this.createButton(
            scene, 0, 190, 'MAIN MENU', 
            0x0066CC, 0x0099FF, onMenu
        );
        
        // Add all elements
        this.add([
            backdrop, panelBg, banner,
            tieText, handshakeEmoji,
            scoreBg, scoreTitle, playerScoreText, opponentScoreText,
            messageText, playAgainBtn, menuBtn
        ]);
        
        // Initial state - start mostly visible to avoid animation issues
        this.setAlpha(0.95);
        panelBg.setScale(0.95);
        banner.setScale(0.95);
        tieText.setScale(0.95);
        
        // Subtle entrance animations
        scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });
        
        scene.tweens.add({
            targets: [panelBg, banner, tieText],
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Handshake animation
        scene.tweens.add({
            targets: handshakeEmoji,
            scale: { from: 1, to: 1.2 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Set proper depth for UI overlay
        this.setDepth(2000); // UI layer depth
        scene.add.existing(this);
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
            console.log(`🤝 TieScreen button clicked: ${text}`);
            
            // Emit UI click event for sound system
            scene.events.emit('ui-click');
            
            // Execute callback immediately
            
            try {
                if (callback && typeof callback === 'function') {
                    callback();
                } else {
                }
            } catch (error) {
            }
            
            // Visual feedback
            scene.tweens.add({
                targets: button,
                scale: 0.9,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        });
        
        // Initial visibility - start at full scale
        button.setScale(1);
        button.setAlpha(1);
        
        return button;
    }
    
    public destroy(): void {
        this.scene.tweens.killTweensOf(this);
        super.destroy();
    }
}