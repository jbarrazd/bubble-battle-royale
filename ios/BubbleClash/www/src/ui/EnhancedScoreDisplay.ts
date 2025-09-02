import Phaser from 'phaser';
import { HD_SCALE } from '@/config/GameConfig';

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
    private playerLeadIndicator: Phaser.GameObjects.Text;
    private opponentLeadIndicator: Phaser.GameObjects.Text;
    private currentLeader: 'player' | 'opponent' | 'tie' = 'tie';
    
    // Container backgrounds
    private playerContainer: Phaser.GameObjects.Container;
    private opponentContainer: Phaser.GameObjects.Container;
    
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
        // Clean positioning with HD scaling
        const padding = 15 * HD_SCALE;
        const bottomOffset = 30 * HD_SCALE;
        const containerWidth = 70 * HD_SCALE;  // Reduced from 90
        const containerHeight = 40 * HD_SCALE;  // Reduced from 50
        
        const x = padding;
        const y = this.scene.cameras.main.height - bottomOffset - containerHeight;
        
        this.playerContainer = this.scene.add.container(x, y);
        
        // Clean modern background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.9); // Dark blue-gray
        bg.fillRoundedRect(0, 0, containerWidth, containerHeight, 8 * HD_SCALE);
        bg.lineStyle(2 * HD_SCALE, 0x16C79A, 1); // Clean teal border
        bg.strokeRoundedRect(0, 0, containerWidth, containerHeight, 8 * HD_SCALE);
        
        // Player label
        this.playerNameText = this.scene.add.text(8 * HD_SCALE, 6 * HD_SCALE, 'PLAYER', {
            fontSize: `${7 * HD_SCALE}px`,  // Reduced from 9
            color: '#16C79A',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        
        // Score text
        this.playerScoreText = this.scene.add.text(8 * HD_SCALE, 18 * HD_SCALE, '0', {
            fontSize: `${12 * HD_SCALE}px`,  // Reduced from 16
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        });
        
        // Lead indicator (simple crown emoji)
        this.playerLeadIndicator = this.scene.add.text(containerWidth - 15 * HD_SCALE, containerHeight / 2, '👑', {
            fontSize: `${9 * HD_SCALE}px`,  // Reduced from 12
            fontFamily: 'Arial'
        });
        this.playerLeadIndicator.setOrigin(0.5);
        this.playerLeadIndicator.setVisible(false);
        
        this.playerContainer.add([bg, this.playerNameText, this.playerScoreText, this.playerLeadIndicator]);
        this.add(this.playerContainer);
    }
    
    private createOpponentDisplay(): void {
        // Clean positioning with HD scaling
        const padding = 15 * HD_SCALE;
        const topOffset = 35 * HD_SCALE;
        const containerWidth = 70 * HD_SCALE;  // Reduced from 90
        const containerHeight = 40 * HD_SCALE;  // Reduced from 50
        
        const x = this.scene.cameras.main.width - padding - containerWidth;
        const y = topOffset;
        
        this.opponentContainer = this.scene.add.container(x, y);
        
        // Clean modern background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1A1A2E, 0.9); // Dark blue-gray
        bg.fillRoundedRect(0, 0, containerWidth, containerHeight, 8 * HD_SCALE);
        bg.lineStyle(2 * HD_SCALE, 0xF45866, 1); // Clean red border
        bg.strokeRoundedRect(0, 0, containerWidth, containerHeight, 8 * HD_SCALE);
        
        // Opponent label
        this.opponentNameText = this.scene.add.text(containerWidth - 8 * HD_SCALE, 6 * HD_SCALE, 'OPPONENT', {
            fontSize: `${7 * HD_SCALE}px`,  // Reduced from 9
            color: '#F45866',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        });
        this.opponentNameText.setOrigin(1, 0);
        
        // Score text
        this.opponentScoreText = this.scene.add.text(containerWidth - 8 * HD_SCALE, 18 * HD_SCALE, '0', {
            fontSize: `${12 * HD_SCALE}px`,  // Reduced from 16
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold'
        });
        this.opponentScoreText.setOrigin(1, 0);
        
        // Lead indicator (simple crown emoji)
        this.opponentLeadIndicator = this.scene.add.text(15 * HD_SCALE, containerHeight / 2, '👑', {
            fontSize: `${9 * HD_SCALE}px`,  // Reduced from 12
            fontFamily: 'Arial'
        });
        this.opponentLeadIndicator.setOrigin(0.5);
        this.opponentLeadIndicator.setVisible(false);
        
        this.opponentContainer.add([bg, this.opponentNameText, this.opponentScoreText, this.opponentLeadIndicator]);
        this.add(this.opponentContainer);
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
            scale: 1.1,
            duration: 150,
            yoyo: true,
            ease: 'Power2'
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
            // Update leader indicators
            this.playerLeadIndicator.setVisible(newLeader === 'player');
            this.opponentLeadIndicator.setVisible(newLeader === 'opponent');
            
            // Simple glow effect for winner
            if (newLeader === 'player') {
                this.animateLeader(this.playerLeadIndicator);
                this.playerContainer.setScale(1.02);
                this.opponentContainer.setScale(1);
            } else if (newLeader === 'opponent') {
                this.animateLeader(this.opponentLeadIndicator);
                this.opponentContainer.setScale(1.02);
                this.playerContainer.setScale(1);
            } else {
                this.playerContainer.setScale(1);
                this.opponentContainer.setScale(1);
            }
            
            this.currentLeader = newLeader;
        }
    }
    
    private animateLeader(indicator: Phaser.GameObjects.Text): void {
        // Simple bounce animation for crown
        this.scene.tweens.add({
            targets: indicator,
            scale: { from: 0, to: 1 },
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Subtle rotation
        this.scene.tweens.add({
            targets: indicator,
            angle: { from: -10, to: 10 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
    }
    
    public destroy(): void {
        // Kill any active tweens
        if (this.scene && this.scene.tweens) {
            this.scene.tweens.killTweensOf(this);
            this.scene.tweens.killTweensOf(this.playerScoreText);
            this.scene.tweens.killTweensOf(this.opponentScoreText);
            this.scene.tweens.killTweensOf(this.playerLeadIndicator);
            this.scene.tweens.killTweensOf(this.opponentLeadIndicator);
            this.scene.tweens.killTweensOf(this.playerContainer);
            this.scene.tweens.killTweensOf(this.opponentContainer);
        }
        super.destroy();
    }
}