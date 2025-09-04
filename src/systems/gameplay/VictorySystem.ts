import { Scene } from 'phaser';
import { Z_LAYERS } from '@/config/ArenaConfig';

export interface VictoryConditions {
    gemsToWin: number;
    maxGameTime: number;
    suddenDeathTime: number;
}

export class VictorySystem {
    private scene: Scene;
    private gameStartTime: number = 0;
    private gameEnded: boolean = false;
    private victoryConditions: VictoryConditions = {
        gemsToWin: 15,  // First to 15 gems wins
        maxGameTime: 180000,  // 3 minutes
        suddenDeathTime: 150000  // 2:30 minutes
    };
    
    // Victory UI elements
    private victoryOverlay?: Phaser.GameObjects.Container;
    private victoryText?: Phaser.GameObjects.Text;
    private victoryEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.gameStartTime = Date.now();
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for gem updates
        this.scene.events.on('gems-updated', this.checkGemVictory, this);
        
        // Listen for game over events (from reset system)
        this.scene.events.on('game-over', this.handleGameOver, this);
        
        // Cleanup
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    /**
     * Check if someone has won by collecting enough gems
     */
    private checkGemVictory(data: { playerGems: number, opponentGems: number }): void {
        if (this.gameEnded) return;
        
        // Check if player won
        if (data.playerGems >= this.victoryConditions.gemsToWin) {
            this.triggerVictory(true, 'gems');
        }
        // Check if opponent won
        else if (data.opponentGems >= this.victoryConditions.gemsToWin) {
            this.triggerVictory(false, 'gems');
        }
    }
    
    /**
     * Handle game over from other systems (field full, etc)
     */
    private handleGameOver(data: { reason: string, isPlayer: boolean }): void {
        if (this.gameEnded) return;
        
        // In field-full scenarios:
        // If it's the player's field that's full, player loses (opponent wins)
        // If it's the opponent's field that's full, player wins
        // data.isPlayer indicates WHOSE field is full
        const playerWins = !data.isPlayer;
        this.triggerVictory(playerWins, data.reason);
    }
    
    /**
     * Check time-based conditions
     */
    public update(time: number, delta: number): void {
        if (this.gameEnded) return;
        
        const elapsedTime = Date.now() - this.gameStartTime;
        
        // Store current game time for other systems
        this.scene.registry.set('gameTime', elapsedTime);
        
        // Check if we've hit sudden death
        if (elapsedTime >= this.victoryConditions.suddenDeathTime && 
            !this.scene.registry.get('inSuddenDeath')) {
            this.enterSuddenDeath();
        }
        
        // Check if max game time reached
        if (elapsedTime >= this.victoryConditions.maxGameTime) {
            this.handleTimeUp();
        }
    }
    
    /**
     * Enter sudden death mode
     */
    private enterSuddenDeath(): void {
        console.log('⚠️ ENTERING SUDDEN DEATH MODE!');
        this.scene.registry.set('inSuddenDeath', true);
        
        // Show sudden death notification
        const suddenDeathText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY - 100,
            'SUDDEN DEATH!',
            {
                fontSize: '48px',
                fontStyle: 'bold',
                color: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        suddenDeathText.setOrigin(0.5);
        suddenDeathText.setDepth(Z_LAYERS.UI + 100);
        
        // Animate the text
        this.scene.tweens.add({
            targets: suddenDeathText,
            scale: { from: 0, to: 1.2 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: suddenDeathText,
                    alpha: 0,
                    scale: 0.8,
                    duration: 1000,
                    delay: 1500,
                    onComplete: () => suddenDeathText.destroy()
                });
            }
        });
        
        // Add screen flash effect
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0xff0000,
            0
        );
        flash.setDepth(Z_LAYERS.UI + 99);
        
        this.scene.tweens.add({
            targets: flash,
            alpha: { from: 0, to: 0.3 },
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => flash.destroy()
        });
        
        // Emit event for other systems
        this.scene.events.emit('sudden-death-started');
    }
    
    /**
     * Handle when time runs out completely
     */
    private handleTimeUp(): void {
        if (this.gameEnded) return;
        
        // Get current scores to determine winner
        const arenaSystem = (this.scene as any).arenaSystem;
        if (!arenaSystem) return;
        
        const playerGems = arenaSystem.playerGemCount || 0;
        const opponentGems = arenaSystem.opponentGemCount || 0;
        const playerScore = arenaSystem.playerScore || 0;
        const opponentScore = arenaSystem.aiScore || 0;
        
        // Determine winner by gems first, then by score
        let winner: boolean;
        let reason: string;
        
        if (playerGems > opponentGems) {
            winner = true;
            reason = 'time-gems';
        } else if (opponentGems > playerGems) {
            winner = false;
            reason = 'time-gems';
        } else if (playerScore > opponentScore) {
            winner = true;
            reason = 'time-score';
        } else if (opponentScore > playerScore) {
            winner = false;
            reason = 'time-score';
        } else {
            // Tie - player wins by default (can be changed)
            winner = true;
            reason = 'time-tie';
        }
        
        this.triggerVictory(winner, reason);
    }
    
    /**
     * Trigger victory for a player
     */
    private triggerVictory(isPlayerVictory: boolean, reason: string): void {
        if (this.gameEnded) return;
        
        this.gameEnded = true;
        console.log(`🏆 GAME OVER! ${isPlayerVictory ? 'PLAYER' : 'OPPONENT'} WINS! Reason: ${reason}`);
        
        // Stop all game systems
        this.scene.physics.pause();
        this.scene.time.removeAllEvents();
        
        // Create victory overlay
        this.createVictoryOverlay(isPlayerVictory, reason);
        
        // Emit victory event
        this.scene.events.emit('victory', {
            isPlayer: isPlayerVictory,
            reason: reason,
            gameTime: Date.now() - this.gameStartTime
        });
        
        // Save stats
        this.saveGameStats(isPlayerVictory, reason);
    }
    
    /**
     * Create the victory overlay UI
     */
    private createVictoryOverlay(isPlayerVictory: boolean, reason: string): void {
        this.victoryOverlay = this.scene.add.container(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY
        );
        this.victoryOverlay.setDepth(Z_LAYERS.UI + 200);
        
        // Semi-transparent background
        const bg = this.scene.add.rectangle(
            0, 0,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000,
            0.7
        );
        this.victoryOverlay.add(bg);
        
        // Victory/Defeat text
        const mainText = isPlayerVictory ? 'VICTORY!' : 'DEFEAT';
        const textColor = isPlayerVictory ? '#FFD700' : '#FF4444';
        
        this.victoryText = this.scene.add.text(0, -50, mainText, {
            fontSize: '72px',
            fontStyle: 'bold',
            color: textColor,
            stroke: '#000000',
            strokeThickness: 8
        });
        this.victoryText.setOrigin(0.5);
        this.victoryOverlay.add(this.victoryText);
        
        // Reason text
        const reasonText = this.getReasonText(reason, isPlayerVictory);
        const subText = this.scene.add.text(0, 20, reasonText, {
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        });
        subText.setOrigin(0.5);
        this.victoryOverlay.add(subText);
        
        // Stats display
        const arenaSystem = (this.scene as any).arenaSystem;
        if (arenaSystem) {
            const statsText = this.scene.add.text(0, 80, 
                `Gems: ${arenaSystem.playerGemCount} - ${arenaSystem.opponentGemCount}\n` +
                `Score: ${arenaSystem.playerScore} - ${arenaSystem.aiScore}`,
                {
                    fontSize: '24px',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3,
                    align: 'center'
                }
            );
            statsText.setOrigin(0.5);
            this.victoryOverlay.add(statsText);
        }
        
        // Continue button
        const continueBtn = this.scene.add.text(0, 150, 'Click to Continue', {
            fontSize: '32px',
            color: '#00FF00',
            stroke: '#000000',
            strokeThickness: 4
        });
        continueBtn.setOrigin(0.5);
        continueBtn.setInteractive({ useHandCursor: true });
        continueBtn.on('pointerdown', () => this.returnToMenu());
        this.victoryOverlay.add(continueBtn);
        
        // Animate entrance
        this.victoryOverlay.setScale(0);
        this.scene.tweens.add({
            targets: this.victoryOverlay,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Add particle effects for victory
        if (isPlayerVictory) {
            this.createVictoryParticles();
        }
    }
    
    /**
     * Get human-readable reason text
     */
    private getReasonText(reason: string, isPlayerVictory: boolean): string {
        switch (reason) {
            case 'gems':
                return isPlayerVictory ? 'You collected 15 gems!' : 'Opponent collected 15 gems!';
            case 'field-full':
                return isPlayerVictory ? 'Opponent\'s field filled up!' : 'Your field filled up!';
            case 'field-full-sudden-death':
                return isPlayerVictory ? 'Opponent eliminated in sudden death!' : 'Eliminated in sudden death!';
            case 'time-gems':
                return 'Most gems when time ran out!';
            case 'time-score':
                return 'Highest score when time ran out!';
            case 'time-tie':
                return 'It was a tie!';
            default:
                return '';
        }
    }
    
    /**
     * Create victory particle effects
     */
    private createVictoryParticles(): void {
        // Create confetti-like particles
        const colors = [0xFFD700, 0xFF69B4, 0x00CED1, 0xFF4500, 0x9370DB];
        
        colors.forEach((color, index) => {
            const emitter = this.scene.add.particles(
                this.scene.cameras.main.centerX + (index - 2) * 100,
                -50,
                'bubble_particle',
                {
                    scale: { start: 0.8, end: 0 },
                    speed: { min: 200, max: 400 },
                    gravityY: 200,
                    lifespan: 3000,
                    quantity: 2,
                    tint: color,
                    angle: { min: -120, max: -60 }
                }
            );
            emitter.setDepth(Z_LAYERS.UI + 201);
            
            // Stop emitting after a while
            this.scene.time.delayedCall(2000, () => {
                emitter.stop();
                this.scene.time.delayedCall(3000, () => emitter.destroy());
            });
        });
    }
    
    /**
     * Save game statistics
     */
    private saveGameStats(isPlayerVictory: boolean, reason: string): void {
        const stats = {
            victory: isPlayerVictory,
            reason: reason,
            duration: Date.now() - this.gameStartTime,
            date: new Date().toISOString()
        };
        
        // Could save to local storage or send to server
        console.log('Game Stats:', stats);
    }
    
    /**
     * Return to main menu
     */
    private returnToMenu(): void {
        // Clean up and return to menu
        this.scene.scene.start('MenuScene');
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        this.scene.events.off('gems-updated', this.checkGemVictory, this);
        this.scene.events.off('game-over', this.handleGameOver, this);
        
        if (this.victoryOverlay) {
            this.victoryOverlay.destroy();
        }
    }
    
    /**
     * Check if game has ended
     */
    public isGameEnded(): boolean {
        return this.gameEnded;
    }
    
    /**
     * Get remaining time
     */
    public getRemainingTime(): number {
        const elapsed = Date.now() - this.gameStartTime;
        return Math.max(0, this.victoryConditions.maxGameTime - elapsed);
    }
    
    /**
     * Check if in sudden death
     */
    public isInSuddenDeath(): boolean {
        return (Date.now() - this.gameStartTime) >= this.victoryConditions.suddenDeathTime;
    }
}