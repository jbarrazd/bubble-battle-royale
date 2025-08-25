import Phaser from 'phaser';

export interface ScoreDisplayConfig {
    player: {
        position: 'bottom-left';
        color: number;
    };
    opponent: {
        position: 'top-right';
        color: number;
    };
}

export class EnhancedScoreDisplay extends Phaser.GameObjects.Container {
    private playerScore: number = 0;
    private opponentScore: number = 0;
    private playerScoreText: Phaser.GameObjects.Text;
    private opponentScoreText: Phaser.GameObjects.Text;
    private playerNameText: Phaser.GameObjects.Text;
    private opponentNameText: Phaser.GameObjects.Text;
    
    // Score animation tracking
    private playerDisplayScore: number = 0;
    private opponentDisplayScore: number = 0;
    private playerTargetScore: number = 0;
    private opponentTargetScore: number = 0;
    
    // Winning indicators
    private playerWinIndicator: Phaser.GameObjects.Container;
    private opponentWinIndicator: Phaser.GameObjects.Container;
    private currentLeader: 'player' | 'opponent' | 'tie' = 'tie';
    
    constructor(scene: Phaser.Scene) {
        super(scene, 0, 0);
        
        // Create player score display (bottom-left)
        this.createPlayerDisplay();
        
        // Create opponent score display (top-right)
        this.createOpponentDisplay();
        
        this.setDepth(1000);
        scene.add.existing(this);
    }
    
    private createPlayerDisplay(): void {
        const padding = 10;
        const x = padding;
        const y = this.scene.cameras.main.height - padding - 40; // Bottom left corner
        
        // Compact mobile-friendly design
        const playerBg = this.scene.add.graphics();
        playerBg.fillStyle(0x000000, 0.4);
        playerBg.fillRoundedRect(x, y - 20, 100, 40, 10);
        
        // Small player indicator
        const playerDot = this.scene.add.circle(x + 15, y, 3, 0x4CAF50);
        
        // Player label - very small
        this.playerNameText = this.scene.add.text(x + 28, y - 8, 'YOU', {
            fontSize: '9px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            alpha: 0.6
        });
        
        // Player score - compact
        this.playerScoreText = this.scene.add.text(x + 28, y + 2, '0', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        
        // Create winning indicator (hidden initially)
        this.playerWinIndicator = this.createWinningIndicator(x + 50, y - 35, 0x4CAF50);
        this.playerWinIndicator.setVisible(false);
        
        this.add([playerBg, playerDot, this.playerNameText, this.playerScoreText, this.playerWinIndicator]);
    }
    
    private createOpponentDisplay(): void {
        const padding = 10;
        const x = this.scene.cameras.main.width - padding - 100; // Top right corner
        const y = padding + 30;
        
        // Compact mobile-friendly design
        const opponentBg = this.scene.add.graphics();
        opponentBg.fillStyle(0x000000, 0.4);
        opponentBg.fillRoundedRect(x, y - 20, 100, 40, 10);
        
        // Small opponent indicator
        const opponentDot = this.scene.add.circle(x + 85, y, 3, 0xF44336);
        
        // Opponent label - very small
        this.opponentNameText = this.scene.add.text(x + 72, y - 8, 'AI', {
            fontSize: '9px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            alpha: 0.6
        });
        this.opponentNameText.setOrigin(1, 0);
        
        // Opponent score - compact
        this.opponentScoreText = this.scene.add.text(x + 72, y + 2, '0', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.opponentScoreText.setOrigin(1, 0);
        
        // Create winning indicator (hidden initially)
        this.opponentWinIndicator = this.createWinningIndicator(x + 50, y - 35, 0xF44336);
        this.opponentWinIndicator.setVisible(false);
        
        this.add([opponentBg, opponentDot, this.opponentNameText, this.opponentScoreText, this.opponentWinIndicator]);
    }
    
    public updatePlayerScore(newScore: number, instant: boolean = false): void {
        this.playerTargetScore = newScore;
        
        if (instant) {
            this.playerDisplayScore = newScore;
            this.playerScoreText.setText(this.formatScore(newScore));
            return;
        }
        
        // Animate score with rolling effect
        this.scene.tweens.add({
            targets: this,
            playerDisplayScore: newScore,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                this.playerScoreText.setText(this.formatScore(Math.floor(this.playerDisplayScore)));
            },
            onComplete: () => {
                // Pulse effect on completion
                this.pulseScore(this.playerScoreText);
                // Check who's winning
                this.updateLeaderIndicator();
            }
        });
    }
    
    public updateOpponentScore(newScore: number, instant: boolean = false): void {
        this.opponentTargetScore = newScore;
        
        if (instant) {
            this.opponentDisplayScore = newScore;
            this.opponentScoreText.setText(this.formatScore(newScore));
            return;
        }
        
        // Animate score with rolling effect
        this.scene.tweens.add({
            targets: this,
            opponentDisplayScore: newScore,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                this.opponentScoreText.setText(this.formatScore(Math.floor(this.opponentDisplayScore)));
            },
            onComplete: () => {
                // Pulse effect on completion
                this.pulseScore(this.opponentScoreText);
                // Check who's winning
                this.updateLeaderIndicator();
            }
        });
    }
    
    private pulseScore(scoreText: Phaser.GameObjects.Text): void {
        this.scene.tweens.add({
            targets: scoreText,
            scale: 1.2,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
        });
        
        // Flash color
        scoreText.setTint(0xFFD700);
        this.scene.time.delayedCall(200, () => {
            scoreText.clearTint();
        });
    }
    
    private formatScore(score: number): string {
        // Add thousand separators
        return score.toLocaleString();
    }
    
    public getPlayerScore(): number {
        return this.playerTargetScore;
    }
    
    public getOpponentScore(): number {
        return this.opponentTargetScore;
    }
    
    public reset(): void {
        this.playerScore = 0;
        this.opponentScore = 0;
        this.playerDisplayScore = 0;
        this.opponentDisplayScore = 0;
        this.playerTargetScore = 0;
        this.opponentTargetScore = 0;
        this.playerScoreText.setText('0');
        this.opponentScoreText.setText('0');
    }
    
    private createWinningIndicator(x: number, y: number, color: number): Phaser.GameObjects.Container {
        const container = this.scene.add.container(x, y);
        
        // Crown/star icon
        const crown = this.scene.add.star(0, 0, 5, 4, 8, color);
        crown.setScale(0.8);
        
        // "WINNING" text
        const winText = this.scene.add.text(0, 12, 'LEAD', {
            fontSize: '8px',
            color: '#FFD700',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        });
        winText.setOrigin(0.5);
        
        container.add([crown, winText]);
        
        // Continuous animation
        this.scene.tweens.add({
            targets: crown,
            angle: 360,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
        
        this.scene.tweens.add({
            targets: crown,
            scale: { from: 0.8, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        return container;
    }
    
    private updateLeaderIndicator(): void {
        const playerScore = this.playerTargetScore;
        const opponentScore = this.opponentTargetScore;
        
        let newLeader: 'player' | 'opponent' | 'tie' = 'tie';
        
        if (playerScore > opponentScore) {
            newLeader = 'player';
        } else if (opponentScore > playerScore) {
            newLeader = 'opponent';
        }
        
        if (newLeader !== this.currentLeader) {
            // Hide previous indicators
            this.playerWinIndicator.setVisible(false);
            this.opponentWinIndicator.setVisible(false);
            
            // Show new leader indicator with effects
            if (newLeader === 'player') {
                this.playerWinIndicator.setVisible(true);
                this.showLeaderEffect(this.playerWinIndicator, 0x4CAF50);
                // Make player score glow
                this.playerScoreText.setTint(0xFFD700);
                this.opponentScoreText.clearTint();
            } else if (newLeader === 'opponent') {
                this.opponentWinIndicator.setVisible(true);
                this.showLeaderEffect(this.opponentWinIndicator, 0xF44336);
                // Make opponent score glow
                this.opponentScoreText.setTint(0xFFD700);
                this.playerScoreText.clearTint();
            } else {
                // Tie - clear all effects
                this.playerScoreText.clearTint();
                this.opponentScoreText.clearTint();
            }
            
            this.currentLeader = newLeader;
        }
    }
    
    private showLeaderEffect(indicator: Phaser.GameObjects.Container, color: number): void {
        // Create particle burst
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const particle = this.scene.add.circle(
                indicator.x + Math.cos(angle) * 10,
                indicator.y + Math.sin(angle) * 10,
                2,
                color,
                0.8
            );
            
            this.add(particle);
            
            this.scene.tweens.add({
                targets: particle,
                x: indicator.x + Math.cos(angle) * 30,
                y: indicator.y + Math.sin(angle) * 30,
                alpha: 0,
                scale: 0,
                duration: 600,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Scale bounce effect
        this.scene.tweens.add({
            targets: indicator,
            scale: { from: 0, to: 1 },
            duration: 300,
            ease: 'Back.easeOut'
        });
    }
    
    public destroy(): void {
        // Kill any active tweens
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(this);
            this.scene.tweens.killTweensOf(this.playerScoreText);
            this.scene.tweens.killTweensOf(this.opponentScoreText);
            if (this.playerWinIndicator) {
                this.scene.tweens.killTweensOf(this.playerWinIndicator);
            }
            if (this.opponentWinIndicator) {
                this.scene.tweens.killTweensOf(this.opponentWinIndicator);
            }
        }
        super.destroy();
    }
}