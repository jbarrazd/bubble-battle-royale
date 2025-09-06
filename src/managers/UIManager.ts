/**
 * UIManager - Manages all UI elements and displays
 * Centralizes score, gems, timer, and notification management
 */

import { Scene } from 'phaser';
import { BaseGameSystem } from '@/core/SystemRegistry';
import { GameEventBus } from '@/core/EventBus';
import { GameStateManager } from '@/core/GameStateManager';
import { Z_LAYERS } from '@/config/ArenaConfig';

interface UIConfig {
    showScore: boolean;
    showGems: boolean;
    showTimer: boolean;
    showPowerUps: boolean;
    showCombo: boolean;
}

export class UIManager extends BaseGameSystem {
    public name = 'UIManager';
    public priority = 40; // UI updates after gameplay
    
    private eventBus: GameEventBus;
    private gameState: GameStateManager;
    private config: UIConfig;
    
    // UI Elements
    private scoreDisplay?: Phaser.GameObjects.Container;
    private playerScoreText?: Phaser.GameObjects.Text;
    private opponentScoreText?: Phaser.GameObjects.Text;
    
    private gemCounter?: Phaser.GameObjects.Container;
    private playerGemText?: Phaser.GameObjects.Text;
    private opponentGemText?: Phaser.GameObjects.Text;
    
    private timerDisplay?: Phaser.GameObjects.Container;
    private timerText?: Phaser.GameObjects.Text;
    private timerBar?: Phaser.GameObjects.Graphics;
    
    private comboDisplay?: Phaser.GameObjects.Container;
    private comboText?: Phaser.GameObjects.Text;
    private comboMultiplier?: Phaser.GameObjects.Text;
    
    private notificationQueue: Array<{text: string, type: string}> = [];
    private activeNotifications: Set<Phaser.GameObjects.Container> = new Set();
    
    // UI State
    private playerScore: number = 0;
    private opponentScore: number = 0;
    private playerGems: number = 0;
    private opponentGems: number = 0;
    private currentCombo: number = 0;
    private gameTime: number = 0;
    private maxGameTime: number = 180000; // 3 minutes
    private suddenDeathTime: number = 150000; // 2:30
    
    constructor(scene: Scene, config?: Partial<UIConfig>) {
        super(scene);
        this.config = {
            showScore: true,
            showGems: true,
            showTimer: true,
            showPowerUps: true,
            showCombo: true,
            ...config
        };
    }
    
    public initialize(): void {
        console.log('  → Initializing UIManager...');
        
        this.eventBus = GameEventBus.getInstance();
        this.gameState = GameStateManager.getInstance();
        
        this.createUIElements();
        this.setupEventListeners();
        
        this.markInitialized();
    }
    
    private createUIElements(): void {
        const { width, height } = this.scene.cameras.main;
        
        // Create score display
        if (this.config.showScore) {
            this.createScoreDisplay(width, height);
        }
        
        // Create gem counter
        if (this.config.showGems) {
            this.createGemCounter(width, height);
        }
        
        // Create timer
        if (this.config.showTimer) {
            this.createTimerDisplay(width, height);
        }
        
        // Create combo display
        if (this.config.showCombo) {
            this.createComboDisplay(width, height);
        }
    }
    
    private createScoreDisplay(width: number, height: number): void {
        this.scoreDisplay = this.scene.add.container(width / 2, 50);
        this.scoreDisplay.setDepth(Z_LAYERS.UI);
        
        // Background panel
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-150, -30, 300, 60, 10);
        this.scoreDisplay.add(bg);
        
        // Player score (left)
        this.playerScoreText = this.scene.add.text(-100, 0, '0', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            color: '#00AAFF'
        });
        this.playerScoreText.setOrigin(0.5);
        this.scoreDisplay.add(this.playerScoreText);
        
        // VS text
        const vsText = this.scene.add.text(0, 0, 'VS', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        });
        vsText.setOrigin(0.5);
        this.scoreDisplay.add(vsText);
        
        // Opponent score (right)
        this.opponentScoreText = this.scene.add.text(100, 0, '0', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            color: '#FF4444'
        });
        this.opponentScoreText.setOrigin(0.5);
        this.scoreDisplay.add(this.opponentScoreText);
    }
    
    private createGemCounter(width: number, height: number): void {
        this.gemCounter = this.scene.add.container(width - 120, 100);
        this.gemCounter.setDepth(Z_LAYERS.UI);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-60, -60, 120, 120, 10);
        this.gemCounter.add(bg);
        
        // Gem icon
        const gemIcon = this.scene.add.star(0, -20, 6, 15, 25, 0xFFD700);
        this.gemCounter.add(gemIcon);
        
        // Player gems
        this.playerGemText = this.scene.add.text(-25, 15, '0', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#00AAFF'
        });
        this.playerGemText.setOrigin(0.5);
        this.gemCounter.add(this.playerGemText);
        
        // Divider
        const divider = this.scene.add.text(0, 15, '/', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#FFFFFF'
        });
        divider.setOrigin(0.5);
        this.gemCounter.add(divider);
        
        // Opponent gems
        this.opponentGemText = this.scene.add.text(25, 15, '0', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FF4444'
        });
        this.opponentGemText.setOrigin(0.5);
        this.gemCounter.add(this.opponentGemText);
        
        // Win condition text
        const winText = this.scene.add.text(0, 40, 'First to 15', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#AAAAAA'
        });
        winText.setOrigin(0.5);
        this.gemCounter.add(winText);
    }
    
    private createTimerDisplay(width: number, height: number): void {
        this.timerDisplay = this.scene.add.container(width / 2, 100);
        this.timerDisplay.setDepth(Z_LAYERS.UI);
        
        // Background bar
        const bgBar = this.scene.add.graphics();
        bgBar.fillStyle(0x000000, 0.5);
        bgBar.fillRoundedRect(-100, -15, 200, 30, 5);
        this.timerDisplay.add(bgBar);
        
        // Progress bar
        this.timerBar = this.scene.add.graphics();
        this.timerDisplay.add(this.timerBar);
        
        // Timer text
        this.timerText = this.scene.add.text(0, 0, '3:00', {
            fontSize: '20px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.timerText.setOrigin(0.5);
        this.timerDisplay.add(this.timerText);
    }
    
    private createComboDisplay(width: number, height: number): void {
        this.comboDisplay = this.scene.add.container(120, height - 100);
        this.comboDisplay.setDepth(Z_LAYERS.UI);
        this.comboDisplay.setVisible(false);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-80, -40, 160, 80, 10);
        this.comboDisplay.add(bg);
        
        // Combo text
        this.comboText = this.scene.add.text(0, -10, 'COMBO!', {
            fontSize: '18px',
            fontFamily: 'Arial Black',
            color: '#FFD700'
        });
        this.comboText.setOrigin(0.5);
        this.comboDisplay.add(this.comboText);
        
        // Multiplier
        this.comboMultiplier = this.scene.add.text(0, 15, 'x2', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#FFFF00',
            stroke: '#FF8800',
            strokeThickness: 4
        });
        this.comboMultiplier.setOrigin(0.5);
        this.comboDisplay.add(this.comboMultiplier);
    }
    
    private setupEventListeners(): void {
        // Score events
        this.eventBus.on('score-update', (data) => this.updateScore(data));
        
        // Gem events
        this.eventBus.on('gem-collected', (data) => this.updateGems(data));
        this.eventBus.on('gems-updated', (data) => this.handleGemsUpdated(data));
        
        // Timer events
        this.eventBus.on('timer-update', (data) => this.updateTimer(data));
        this.eventBus.on('sudden-death', () => this.showSuddenDeath());
        
        // Combo events
        this.eventBus.on('combo-start', (data) => this.showCombo(data));
        this.eventBus.on('combo-end', () => this.hideCombo());
        
        // Notification events
        this.eventBus.on('show-notification', (data) => this.showNotification(data));
        
        // Game state events
        this.eventBus.on('game-over', (data) => this.handleGameOver(data));
        this.eventBus.on('game-restart', () => this.reset());
    }
    
    private updateScore(data: { player?: number, opponent?: number, delta?: boolean }): void {
        if (data.delta) {
            // Incremental update
            if (data.player !== undefined) {
                this.playerScore += data.player;
            }
            if (data.opponent !== undefined) {
                this.opponentScore += data.opponent;
            }
        } else {
            // Absolute update
            if (data.player !== undefined) {
                this.playerScore = data.player;
            }
            if (data.opponent !== undefined) {
                this.opponentScore = data.opponent;
            }
        }
        
        // Update display
        if (this.playerScoreText) {
            this.playerScoreText.setText(this.playerScore.toString());
            // Pulse animation
            this.scene.tweens.add({
                targets: this.playerScoreText,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true
            });
        }
        
        if (this.opponentScoreText) {
            this.opponentScoreText.setText(this.opponentScore.toString());
        }
        
        // Game state score updates are handled by ScoreEventManager
        // No need to update here as it would cause duplication
    }
    
    private handleGemsUpdated(data: { playerGems: number, opponentGems: number, isReset?: boolean }): void {
        // Direct update from reset or other systems
        this.playerGems = data.playerGems;
        this.opponentGems = data.opponentGems;
        
        // Update player display
        if (this.playerGemText) {
            this.playerGemText.setText(this.playerGems.toString());
            
            if (data.isReset) {
                // Flash red when gems are removed due to reset
                this.playerGemText.setColor('#FF0000');
                this.scene.time.delayedCall(500, () => {
                    this.playerGemText?.setColor('#FFD700');
                });
                
                // Shake animation
                this.scene.tweens.add({
                    targets: this.playerGemText,
                    x: this.playerGemText.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3
                });
            }
        }
        
        // Update opponent display
        if (this.opponentGemText) {
            this.opponentGemText.setText(this.opponentGems.toString());
            
            if (data.isReset) {
                // Flash red when gems are removed due to reset
                this.opponentGemText.setColor('#FF0000');
                this.scene.time.delayedCall(500, () => {
                    this.opponentGemText?.setColor('#FFD700');
                });
            }
        }
    }
    
    private updateGems(data: { isPlayer: boolean, total?: number, delta?: number }): void {
        if (data.isPlayer) {
            this.playerGems = data.total ?? (this.playerGems + (data.delta ?? 1));
            if (this.playerGemText) {
                this.playerGemText.setText(this.playerGems.toString());
                
                // Check win condition
                if (this.playerGems >= 15) {
                    this.playerGemText.setColor('#00FF00');
                    this.showNotification({ 
                        text: 'VICTORY IMMINENT!', 
                        type: 'success' 
                    });
                }
                
                // Pulse animation
                this.scene.tweens.add({
                    targets: this.playerGemText,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    duration: 200,
                    yoyo: true
                });
            }
        } else {
            this.opponentGems = data.total ?? (this.opponentGems + (data.delta ?? 1));
            if (this.opponentGemText) {
                this.opponentGemText.setText(this.opponentGems.toString());
                
                // Check danger
                if (this.opponentGems >= 15) {
                    this.opponentGemText.setColor('#FF0000');
                    this.showNotification({ 
                        text: 'DANGER! Opponent near victory!', 
                        type: 'danger' 
                    });
                }
            }
        }
        
        // Game state gem updates are handled by ArenaCoordinator
        // No need to update here as it would cause duplication
    }
    
    private updateTimer(data: { time: number, maxTime?: number }): void {
        this.gameTime = data.time;
        if (data.maxTime) {
            this.maxGameTime = data.maxTime;
        }
        
        // Update timer text
        if (this.timerText) {
            const remaining = Math.max(0, this.maxGameTime - this.gameTime);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            
            // Change color based on time
            if (remaining <= 30000) { // Last 30 seconds
                this.timerText.setColor('#FF0000');
            } else if (this.gameTime >= this.suddenDeathTime) { // Sudden death
                this.timerText.setColor('#FFD700');
            } else {
                this.timerText.setColor('#FFFFFF');
            }
        }
        
        // Update timer bar
        if (this.timerBar) {
            this.timerBar.clear();
            
            const progress = Math.min(1, this.gameTime / this.maxGameTime);
            const barWidth = 190 * (1 - progress);
            
            // Choose color based on game phase
            let barColor = 0x00FF00; // Green
            if (this.gameTime >= this.suddenDeathTime) {
                barColor = 0xFFD700; // Gold for sudden death
            } else if (this.gameTime >= this.maxGameTime - 30000) {
                barColor = 0xFF0000; // Red for final 30 seconds
            }
            
            this.timerBar.fillStyle(barColor, 0.8);
            this.timerBar.fillRoundedRect(-95, -10, barWidth, 20, 3);
        }
    }
    
    private showSuddenDeath(): void {
        // Create sudden death banner
        const banner = this.scene.add.container(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY
        );
        banner.setDepth(Z_LAYERS.FLOATING_UI);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.fillRect(-200, -50, 400, 100);
        banner.add(bg);
        
        // Text
        const text = this.scene.add.text(0, 0, 'SUDDEN DEATH!', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#FF0000',
            strokeThickness: 8
        });
        text.setOrigin(0.5);
        banner.add(text);
        
        // Animate
        banner.setScale(0);
        this.scene.tweens.add({
            targets: banner,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.time.delayedCall(2000, () => {
                    this.scene.tweens.add({
                        targets: banner,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => banner.destroy()
                    });
                });
            }
        });
        
        // Flash screen
        this.scene.cameras.main.flash(500, 255, 215, 0);
        
        // Game state update handled by ArenaCoordinator
        // No need to update here
    }
    
    private showCombo(data: { level: number }): void {
        this.currentCombo = data.level;
        
        if (this.comboDisplay && this.comboMultiplier) {
            this.comboMultiplier.setText(`x${this.currentCombo}`);
            this.comboDisplay.setVisible(true);
            
            // Animate in
            this.comboDisplay.setScale(0);
            this.scene.tweens.add({
                targets: this.comboDisplay,
                scaleX: 1,
                scaleY: 1,
                duration: 300,
                ease: 'Back.easeOut'
            });
            
            // Color based on combo level
            const colors = ['#FFFF00', '#FFAA00', '#FF5500', '#FF0000', '#FF00FF'];
            const color = colors[Math.min(this.currentCombo - 2, colors.length - 1)];
            this.comboMultiplier.setColor(color);
        }
    }
    
    private hideCombo(): void {
        if (this.comboDisplay) {
            this.scene.tweens.add({
                targets: this.comboDisplay,
                scaleX: 0,
                scaleY: 0,
                duration: 200,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.comboDisplay!.setVisible(false);
                }
            });
        }
        this.currentCombo = 0;
    }
    
    public showNotification(data: { text: string, type: string, duration?: number }): void {
        const notification = this.scene.add.container(
            this.scene.cameras.main.centerX,
            150
        );
        notification.setDepth(Z_LAYERS.FLOATING_UI);
        this.activeNotifications.add(notification);
        
        // Choose colors based on type
        const colors = {
            success: { bg: 0x00AA00, text: '#FFFFFF' },
            danger: { bg: 0xAA0000, text: '#FFFFFF' },
            warning: { bg: 0xAAAA00, text: '#000000' },
            info: { bg: 0x0000AA, text: '#FFFFFF' }
        };
        const color = colors[data.type as keyof typeof colors] || colors.info;
        
        // Background
        const textObj = this.scene.add.text(0, 0, data.text, {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: color.text
        });
        textObj.setOrigin(0.5);
        
        const padding = 20;
        const bg = this.scene.add.graphics();
        bg.fillStyle(color.bg, 0.9);
        bg.fillRoundedRect(
            -textObj.width / 2 - padding,
            -textObj.height / 2 - padding / 2,
            textObj.width + padding * 2,
            textObj.height + padding,
            10
        );
        
        notification.add([bg, textObj]);
        
        // Animate in
        notification.setAlpha(0);
        notification.y = 100;
        
        this.scene.tweens.add({
            targets: notification,
            alpha: 1,
            y: 150,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                // Auto-hide after duration
                this.scene.time.delayedCall(data.duration || 2000, () => {
                    this.scene.tweens.add({
                        targets: notification,
                        alpha: 0,
                        y: 100,
                        duration: 300,
                        onComplete: () => {
                            notification.destroy();
                            this.activeNotifications.delete(notification);
                        }
                    });
                });
            }
        });
    }
    
    private handleGameOver(data: { winner: string, reason: string }): void {
        // DO NOT pause all tweens - we want animations to continue
        // Only stop UI-specific animations if needed
        
        // Show final state
        const isPlayerWin = data.winner === 'player';
        this.showNotification({
            text: isPlayerWin ? 'VICTORY!' : 'DEFEAT!',
            type: isPlayerWin ? 'success' : 'danger',
            duration: 5000
        });
    }
    
    private reset(): void {
        // Reset all counters
        this.playerScore = 0;
        this.opponentScore = 0;
        this.playerGems = 0;
        this.opponentGems = 0;
        this.currentCombo = 0;
        this.gameTime = 0;
        
        // Update displays
        if (this.playerScoreText) this.playerScoreText.setText('0');
        if (this.opponentScoreText) this.opponentScoreText.setText('0');
        if (this.playerGemText) this.playerGemText.setText('0').setColor('#00AAFF');
        if (this.opponentGemText) this.opponentGemText.setText('0').setColor('#FF4444');
        if (this.timerText) this.timerText.setText('3:00').setColor('#FFFFFF');
        if (this.comboDisplay) this.comboDisplay.setVisible(false);
        
        // Clear notifications
        this.activeNotifications.forEach(n => n.destroy());
        this.activeNotifications.clear();
        
        // Resume tweens
        this.scene.tweens.resumeAll();
    }
    
    public update(time: number, delta: number): void {
        // Process notification queue if needed
        // Currently notifications are shown immediately
    }
    
    public destroy(): void {
        // Destroy all UI elements
        if (this.scoreDisplay) this.scoreDisplay.destroy();
        if (this.gemCounter) this.gemCounter.destroy();
        if (this.timerDisplay) this.timerDisplay.destroy();
        if (this.comboDisplay) this.comboDisplay.destroy();
        
        // Clear notifications
        this.activeNotifications.forEach(n => n.destroy());
        this.activeNotifications.clear();
        
        // Remove event listeners
        this.eventBus.removeAllListeners();
        
        super.destroy();
    }
    
    // Public getters for current state
    public getPlayerScore(): number { return this.playerScore; }
    public getOpponentScore(): number { return this.opponentScore; }
    public getPlayerGems(): number { return this.playerGems; }
    public getOpponentGems(): number { return this.opponentGems; }
    public getCurrentCombo(): number { return this.currentCombo; }
    public getGameTime(): number { return this.gameTime; }
}