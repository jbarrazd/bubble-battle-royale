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
        // Score display - positioned at top right
        this.scoreDisplay = this.scene.add.container(width - 120, 35);
        this.scoreDisplay.setDepth(Z_LAYERS.UI + 5);
        
        // Bubble-themed background with iridescent effect
        const bg = this.scene.add.graphics();
        
        // Outer bubble shadow
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(-102, -18, 204, 44, 20);
        
        // Main bubble body with deep blue
        bg.fillStyle(0x1e3a8a, 0.9);
        bg.fillRoundedRect(-100, -20, 200, 40, 18);
        
        // Inner bubble gradient layer
        bg.fillStyle(0x3b82f6, 0.3);
        bg.fillRoundedRect(-98, -18, 196, 36, 17);
        
        // Glossy bubble surface
        bg.fillStyle(0xffffff, 0.15);
        bg.fillRoundedRect(-95, -17, 190, 15, 15);
        bg.fillStyle(0xffffff, 0.1);
        bg.fillEllipse(-60, -10, 30, 8);
        bg.fillEllipse(60, -10, 30, 8);
        
        // Iridescent bubble border
        bg.lineStyle(2, 0x60a5fa, 0.8);
        bg.strokeRoundedRect(-100, -20, 200, 40, 18);
        bg.lineStyle(1, 0xffffff, 0.3);
        bg.strokeRoundedRect(-98, -18, 196, 36, 17);
        
        this.scoreDisplay.add(bg);
        
        // Player score with enhanced bubble theme
        this.playerScoreText = this.scene.add.text(-60, 0, '0', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#60a5fa',
            stroke: '#1e3a8a',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#60a5fa', blur: 8, fill: true }
        });
        this.playerScoreText.setOrigin(0.5);
        this.scoreDisplay.add(this.playerScoreText);
        
        // VS text with bubble pop style
        const vsText = this.scene.add.text(0, 0, '⚡VS⚡', {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            color: '#fbbf24',
            stroke: '#1e3a8a',
            strokeThickness: 3
        });
        vsText.setOrigin(0.5);
        this.scoreDisplay.add(vsText);
        
        // Animate VS text with subtle pulse
        this.scene.tweens.add({
            targets: vsText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Opponent score with enhanced bubble theme  
        this.opponentScoreText = this.scene.add.text(60, 0, '0', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#f87171',
            stroke: '#1e3a8a',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#f87171', blur: 8, fill: true }
        });
        this.opponentScoreText.setOrigin(0.5);
        this.scoreDisplay.add(this.opponentScoreText);
    }
    
    private createGemCounter(width: number, height: number): void {
        // Position gem counter bottom left where gems fly to - PROMINENT
        this.gemCounter = this.scene.add.container(110, height - 110);
        this.gemCounter.setDepth(Z_LAYERS.UI + 8); // Higher priority
        
        // Create magical bubble-themed gem container
        const bg = this.scene.add.graphics();
        
        // Outer shadow for depth
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-74, -55, 148, 118, 22);
        
        // Main bubble container with rich purple
        bg.fillStyle(0x4c1d95, 0.95);
        bg.fillRoundedRect(-72, -57, 144, 114, 20);
        
        // Inner magical glow layers
        bg.fillStyle(0x7c3aed, 0.3);
        bg.fillRoundedRect(-69, -54, 138, 108, 19);
        bg.fillStyle(0xa78bfa, 0.2);
        bg.fillRoundedRect(-66, -51, 132, 102, 18);
        
        // Bubble shine effect
        bg.fillStyle(0xffffff, 0.12);
        bg.fillRoundedRect(-69, -54, 138, 35, 19);
        bg.fillStyle(0xffffff, 0.08);
        bg.fillEllipse(0, -35, 60, 15);
        
        // Magical golden border
        bg.lineStyle(3, 0xfbbf24, 1);
        bg.strokeRoundedRect(-72, -57, 144, 114, 20);
        
        // Inner shimmer border
        bg.lineStyle(1.5, 0xfde68a, 0.6);
        bg.strokeRoundedRect(-69, -54, 138, 108, 19);
        
        // Add small bubble decorations
        for (let i = 0; i < 3; i++) {
            const x = -50 + i * 50;
            const y = -45;
            bg.fillStyle(0xffffff, 0.15);
            bg.fillCircle(x, y, 3);
        }
        
        this.gemCounter.add(bg);
        
        // Create a proper diamond/gem shape with graphics
        const gemGraphics = this.scene.add.graphics();
        
        // Diamond shape coordinates (3D effect)
        const diamondTop = -35;
        const diamondMiddle = -20;
        const diamondBottom = -5;
        const diamondWidth = 20;
        
        // Main diamond facets with gradient colors
        // Left facet (darker)
        gemGraphics.fillStyle(0x4facfe, 1);
        gemGraphics.fillTriangle(
            0, diamondTop,
            -diamondWidth, diamondMiddle,
            0, diamondMiddle
        );
        
        // Right facet (lighter)
        gemGraphics.fillStyle(0x00f2fe, 1);
        gemGraphics.fillTriangle(
            0, diamondTop,
            diamondWidth, diamondMiddle,
            0, diamondMiddle
        );
        
        // Bottom left facet
        gemGraphics.fillStyle(0x4f46e5, 1);
        gemGraphics.fillTriangle(
            0, diamondMiddle,
            -diamondWidth, diamondMiddle,
            -diamondWidth/2, diamondBottom
        );
        
        // Bottom right facet
        gemGraphics.fillStyle(0x7c3aed, 1);
        gemGraphics.fillTriangle(
            0, diamondMiddle,
            diamondWidth, diamondMiddle,
            diamondWidth/2, diamondBottom
        );
        
        // Bottom center facet
        gemGraphics.fillStyle(0x6366f1, 1);
        gemGraphics.fillTriangle(
            -diamondWidth/2, diamondBottom,
            diamondWidth/2, diamondBottom,
            0, diamondBottom + 5
        );
        
        // White shine on top for sparkle
        gemGraphics.fillStyle(0xffffff, 0.8);
        gemGraphics.fillTriangle(
            0, diamondTop,
            -5, diamondTop + 8,
            5, diamondTop + 8
        );
        
        // Add outline for definition
        gemGraphics.lineStyle(1, 0xffffff, 0.6);
        gemGraphics.strokeTriangle(
            0, diamondTop,
            -diamondWidth, diamondMiddle,
            0, diamondBottom + 5
        );
        gemGraphics.strokeTriangle(
            0, diamondTop,
            diamondWidth, diamondMiddle,
            0, diamondBottom + 5
        );
        
        this.gemCounter.add(gemGraphics);
        
        // Animated sparkle effect
        const sparkle = this.scene.add.graphics();
        sparkle.fillStyle(0xffffff, 0);
        this.gemCounter.add(sparkle);
        
        // Continuous sparkle animation
        this.scene.tweens.add({
            targets: sparkle,
            alpha: { from: 0, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            onUpdate: () => {
                sparkle.clear();
                sparkle.fillStyle(0xffffff, sparkle.alpha * 0.7);
                sparkle.fillCircle(
                    Phaser.Math.Between(-15, 15),
                    diamondTop + Phaser.Math.Between(0, 20),
                    2
                );
            }
        });
        
        // Player gems - LARGE with glow effect
        this.playerGemText = this.scene.add.text(-25, 15, '0', {
            fontSize: '40px',
            fontFamily: 'Arial Black',
            color: '#4facfe',
            stroke: '#ffffff',
            strokeThickness: 1,
            shadow: { offsetX: 0, offsetY: 0, color: '#4facfe', blur: 10, fill: true }
        });
        this.playerGemText.setOrigin(0.5);
        this.gemCounter.add(this.playerGemText);
        
        // Stylized divider
        const divider = this.scene.add.text(0, 15, '/', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            color: '#ffd700',
            stroke: '#6b21a8',
            strokeThickness: 2
        });
        divider.setOrigin(0.5);
        this.gemCounter.add(divider);
        
        // Opponent gems - LARGE with glow effect
        this.opponentGemText = this.scene.add.text(25, 15, '0', {
            fontSize: '40px',
            fontFamily: 'Arial Black',
            color: '#f43f5e',
            stroke: '#ffffff',
            strokeThickness: 1,
            shadow: { offsetX: 0, offsetY: 0, color: '#f43f5e', blur: 10, fill: true }
        });
        this.opponentGemText.setOrigin(0.5);
        this.gemCounter.add(this.opponentGemText);
        
        // Win condition text with bubble style
        const winText = this.scene.add.text(0, 45, '⭐ First to 15 Wins! ⭐', {
            fontSize: '12px',
            fontFamily: 'Arial Black',
            color: '#ffd700',
            stroke: '#6b21a8',
            strokeThickness: 2
        });
        winText.setOrigin(0.5);
        this.gemCounter.add(winText);
    }
    
    private createTimerDisplay(width: number, height: number): void {
        // Timer at the top right with enhanced bubble design
        this.timerDisplay = this.scene.add.container(width - 120, 80);
        this.timerDisplay.setDepth(Z_LAYERS.UI + 10);
        
        // Timer with magical bubble theme
        const bgBar = this.scene.add.graphics();
        
        // Shadow layer
        bgBar.fillStyle(0x000000, 0.3);
        bgBar.fillRoundedRect(-82, -13, 164, 34, 14);
        
        // Main timer bubble
        bgBar.fillStyle(0x581c87, 0.95);
        bgBar.fillRoundedRect(-80, -15, 160, 30, 12);
        
        // Inner glow
        bgBar.fillStyle(0x7c3aed, 0.3);
        bgBar.fillRoundedRect(-78, -13, 156, 26, 11);
        
        // Bubble shine
        bgBar.fillStyle(0xffffff, 0.1);
        bgBar.fillRoundedRect(-78, -13, 156, 10, 11);
        bgBar.fillStyle(0xffffff, 0.06);
        bgBar.fillEllipse(0, -8, 80, 6);
        
        // Animated golden timer border
        bgBar.lineStyle(2, 0xfbbf24, 1);
        bgBar.strokeRoundedRect(-80, -15, 160, 30, 12);
        bgBar.lineStyle(1, 0xfde68a, 0.4);
        bgBar.strokeRoundedRect(-78, -13, 156, 26, 11);
        
        this.timerDisplay.add(bgBar);
        
        // Progress bar
        this.timerBar = this.scene.add.graphics();
        this.timerDisplay.add(this.timerBar);
        
        // Timer text with glow effect
        this.timerText = this.scene.add.text(0, 0, '3:00', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#fbbf24',
            stroke: '#451a03',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#fbbf24', blur: 8, fill: true }
        });
        this.timerText.setOrigin(0.5);
        this.timerDisplay.add(this.timerText);
    }
    
    private createComboDisplay(width: number, height: number): void {
        // Position combo display on the right side, below timer
        this.comboDisplay = this.scene.add.container(width - 120, 135);
        this.comboDisplay.setDepth(Z_LAYERS.UI + 2);
        this.comboDisplay.setVisible(false);
        
        // Explosive bubble combo background
        const bg = this.scene.add.graphics();
        
        // Shadow for floating effect
        bg.fillStyle(0x000000, 0.3);
        bg.fillRoundedRect(-62, -28, 124, 64, 17);
        
        // Main combo bubble with energy gradient
        bg.fillStyle(0xdc2626, 0.95);
        bg.fillRoundedRect(-60, -30, 120, 60, 15);
        
        // Inner energy layers
        bg.fillStyle(0xf87171, 0.3);
        bg.fillRoundedRect(-58, -28, 116, 56, 14);
        bg.fillStyle(0xfca5a5, 0.2);
        bg.fillRoundedRect(-56, -26, 112, 52, 13);
        
        // Bubble shine
        bg.fillStyle(0xffffff, 0.15);
        bg.fillRoundedRect(-58, -28, 116, 20, 14);
        
        // Electric golden border
        bg.lineStyle(2.5, 0xfbbf24, 1);
        bg.strokeRoundedRect(-60, -30, 120, 60, 15);
        bg.lineStyle(1.5, 0xfef3c7, 0.6);
        bg.strokeRoundedRect(-58, -28, 116, 56, 14);
        
        this.comboDisplay.add(bg);
        
        // Combo text with bubble pop energy
        this.comboText = this.scene.add.text(0, -8, '✨ COMBO ✨', {
            fontSize: '14px',
            fontFamily: 'Arial Black',
            color: '#fde047',
            stroke: '#7f1d1d',
            strokeThickness: 2
        });
        this.comboText.setOrigin(0.5);
        this.comboDisplay.add(this.comboText);
        
        // Multiplier with explosive glow
        this.comboMultiplier = this.scene.add.text(0, 10, 'x2', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#fbbf24',
            stroke: '#dc2626',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 0, color: '#fbbf24', blur: 20, fill: true }
        });
        this.comboMultiplier.setOrigin(0.5);
        this.comboDisplay.add(this.comboMultiplier);
        
        // Add animated sparkles around combo
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const radius = 45;
            const sparkle = this.scene.add.graphics();
            sparkle.fillStyle(0xfbbf24, 0.8);
            sparkle.fillCircle(Math.cos(angle) * radius, Math.sin(angle) * radius, 2);
            this.comboDisplay.add(sparkle);
            
            this.scene.tweens.add({
                targets: sparkle,
                alpha: { from: 0.8, to: 0.2 },
                duration: 500 + i * 100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
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
                    this.playerGemText?.setColor('#4facfe'); // Player blue
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
                    this.opponentGemText?.setColor('#f43f5e'); // Opponent red
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
                
                // Epic collection animation
                this.scene.tweens.add({
                    targets: this.playerGemText,
                    scaleX: 2.0,
                    scaleY: 2.0,
                    duration: 300,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
                
                // Color flash effect
                this.scene.tweens.addCounter({
                    from: 0,
                    to: 1,
                    duration: 300,
                    onUpdate: (tween) => {
                        const value = tween.getValue();
                        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                            { r: 79, g: 172, b: 254 },
                            { r: 255, g: 255, b: 255 },
                            1,
                            value
                        );
                        this.playerGemText?.setColor(
                            `#${Phaser.Display.Color.ComponentToHex(color.r)}${Phaser.Display.Color.ComponentToHex(color.g)}${Phaser.Display.Color.ComponentToHex(color.b)}`
                        );
                    },
                    onComplete: () => {
                        // Return to player blue unless at 15 gems
                        if (this.playerGems >= 15) {
                            this.playerGemText?.setColor('#00FF00'); // Victory green
                        } else {
                            this.playerGemText?.setColor('#4facfe'); // Normal player blue
                        }
                    }
                });
                
                // Create particle burst at gem counter
                this.createGemBurst(this.gemCounter.x, this.gemCounter.y, true);
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
                
                // Pulse animation for opponent gems
                this.scene.tweens.add({
                    targets: this.opponentGemText,
                    scaleX: 1.8,
                    scaleY: 1.8,
                    duration: 250,
                    yoyo: true,
                    ease: 'Power2'
                });
                
                // Color flash effect for opponent
                this.scene.tweens.addCounter({
                    from: 0,
                    to: 1,
                    duration: 300,
                    onUpdate: (tween) => {
                        const value = tween.getValue();
                        const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                            { r: 244, g: 63, b: 94 },  // Opponent red
                            { r: 255, g: 255, b: 255 },
                            1,
                            value
                        );
                        this.opponentGemText?.setColor(
                            `#${Phaser.Display.Color.ComponentToHex(color.r)}${Phaser.Display.Color.ComponentToHex(color.g)}${Phaser.Display.Color.ComponentToHex(color.b)}`
                        );
                    },
                    onComplete: () => {
                        // Return to opponent red unless at 15 gems
                        if (this.opponentGems >= 15) {
                            this.opponentGemText?.setColor('#FF0000'); // Danger red
                        } else {
                            this.opponentGemText?.setColor('#f43f5e'); // Normal opponent red
                        }
                    }
                });
                
                // Create particle burst for opponent
                this.createGemBurst(this.gemCounter.x, this.gemCounter.y, false);
            }
        }
        
        // Game state gem updates are handled by ArenaCoordinator
        // No need to update here as it would cause duplication
    }
    
    private updateTimer(data: { time?: number, elapsed?: number, maxTime?: number }): void {
        // Handle elapsed time from ArenaCoordinator
        if (data.elapsed !== undefined) {
            this.gameTime = data.elapsed;
        } else if (data.time !== undefined) {
            this.gameTime = data.time;
        }
        
        if (data.maxTime) {
            this.maxGameTime = data.maxTime;
        }
        
        // Update timer text
        if (this.timerText) {
            const remaining = Math.max(0, this.maxGameTime - this.gameTime);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            
            // Change color based on time with smooth transitions
            if (remaining <= 30000) { // Last 30 seconds - urgent red
                this.timerText.setColor('#ff4444');
                // Pulse effect for urgency
                if (!this.timerText.getData('pulsing')) {
                    this.timerText.setData('pulsing', true);
                    this.scene.tweens.add({
                        targets: this.timerText,
                        scaleX: 1.1,
                        scaleY: 1.1,
                        duration: 500,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            } else if (this.gameTime >= this.suddenDeathTime) { // Sudden death - golden
                this.timerText.setColor('#ffd700');
            } else {
                this.timerText.setColor('#fbbf24');
                this.timerText.setData('pulsing', false);
            }
        }
        
        // Update timer bar
        if (this.timerBar) {
            this.timerBar.clear();
            
            const progress = Math.min(1, this.gameTime / this.maxGameTime);
            const barWidth = 140 * (1 - progress);
            
            // Choose color based on game phase
            let barColor = 0x00FF00; // Green
            if (this.gameTime >= this.suddenDeathTime) {
                barColor = 0xFFD700; // Gold for sudden death
            } else if (this.gameTime >= this.maxGameTime - 30000) {
                barColor = 0xFF0000; // Red for final 30 seconds
            }
            
            this.timerBar.fillStyle(barColor, 0.7);
            this.timerBar.fillRoundedRect(-70, -7, barWidth, 14, 3);
        }
    }
    
    private showSuddenDeath(): void {
        // Create sudden death banner with bubble burst effect
        const banner = this.scene.add.container(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY - 50
        );
        banner.setDepth(Z_LAYERS.FLOATING_UI);
        
        // Dramatic bubble background
        const bg = this.scene.add.graphics();
        
        // Shadow layer
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(-220, -52, 440, 104, 25);
        
        // Main bubble with danger gradient
        bg.fillStyle(0x7f1d1d, 0.95);
        bg.fillRoundedRect(-200, -50, 400, 100, 20);
        
        // Inner danger glow
        bg.fillStyle(0xdc2626, 0.4);
        bg.fillRoundedRect(-195, -45, 390, 90, 18);
        bg.fillStyle(0xef4444, 0.3);
        bg.fillRoundedRect(-190, -40, 380, 80, 16);
        
        // Bubble shine effect
        bg.fillStyle(0xffffff, 0.15);
        bg.fillRoundedRect(-195, -45, 390, 30, 18);
        
        // Electric border
        bg.lineStyle(3, 0xfbbf24, 1);
        bg.strokeRoundedRect(-200, -50, 400, 100, 20);
        bg.lineStyle(2, 0xfef3c7, 0.6);
        bg.strokeRoundedRect(-195, -45, 390, 90, 18);
        
        banner.add(bg);
        
        // Text with explosive style
        const text = this.scene.add.text(0, 0, '⚠️ SUDDEN DEATH ⚠️', {
            fontSize: '42px',
            fontFamily: 'Arial Black',
            color: '#fbbf24',
            stroke: '#7f1d1d',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#fbbf24', blur: 20, fill: true }
        });
        text.setOrigin(0.5);
        banner.add(text);
        
        // Add warning bubbles floating around
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 150;
            const bubble = this.scene.add.circle(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                8,
                0xfbbf24,
                0.6
            );
            banner.add(bubble);
            
            this.scene.tweens.add({
                targets: bubble,
                x: Math.cos(angle) * (radius + 20),
                y: Math.sin(angle) * (radius + 20),
                alpha: { from: 0.6, to: 0.1 },
                duration: 1000,
                repeat: -1,
                yoyo: true,
                ease: 'Sine.easeInOut',
                delay: i * 100
            });
        }
        
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
        if (this.playerGemText) this.playerGemText.setText('0').setColor('#4facfe');
        if (this.opponentGemText) this.opponentGemText.setText('0').setColor('#f43f5e');
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
    
    /**
     * Create particle burst effect when collecting gems
     */
    private createGemBurst(x: number, y: number, isPlayer: boolean): void {
        const particleCount = 8;
        const color = isPlayer ? 0x4facfe : 0xf43f5e;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100;
            
            const particle = this.scene.add.circle(
                x, y, 3, color
            );
            particle.setDepth(Z_LAYERS.UI + 9);
            
            // Animate outward
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * 30,
                y: y + Math.sin(angle) * 30,
                alpha: { from: 1, to: 0 },
                scale: { from: 1, to: 0 },
                duration: 600,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
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