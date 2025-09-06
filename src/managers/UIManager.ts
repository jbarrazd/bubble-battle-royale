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
    showScore: boolean; // Hidden from UI but tracked internally
    showGems: boolean;
    showTimer: boolean;
    showPowerUps: boolean;
    showCombo: boolean;
    playerName?: string;  // Player's display name
    opponentName?: string;  // Opponent's display name
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
    private playerNameText?: Phaser.GameObjects.Text;
    private opponentNameText?: Phaser.GameObjects.Text;
    
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
    private playerName: string = 'Player';
    private opponentName: string = 'Opponent';
    private gameTime: number = 0;
    private maxGameTime: number = 180000; // 3 minutes
    private suddenDeathTime: number = 150000; // 2:30
    
    constructor(scene: Scene, config?: Partial<UIConfig>) {
        super(scene);
        this.config = {
            showScore: false, // Keep internal tracking but hide from UI
            showGems: true,
            showTimer: true,
            showPowerUps: true,
            showCombo: true,
            ...config
        };
        
        // Set player names from config or use defaults
        this.playerName = config?.playerName || 'Player';
        this.opponentName = config?.opponentName || 'Opponent';
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
        
        // Score display removed from UI - still track internally for end-game stats
        // if (this.config.showScore) {
        //     this.createScoreDisplay(width, height);
        // }
        
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
        // Score display - positioned at top right with premium frame design
        this.scoreDisplay = this.scene.add.container(width - 130, 45);
        this.scoreDisplay.setDepth(Z_LAYERS.UI + 5);
        
        // Premium layered frame design
        const bg = this.scene.add.graphics();
        
        // Outer glow shadow
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-115, -28, 230, 56, 28);
        
        // Main premium frame with gradient effect
        bg.fillGradientStyle(0x1a1a2e, 0x16213e, 0x0f3460, 0x16213e, 1);
        bg.fillRoundedRect(-110, -25, 220, 50, 25);
        
        // Inner glow layer
        bg.fillStyle(0x4facfe, 0.2);
        bg.fillRoundedRect(-105, -22, 210, 44, 22);
        
        // Highlight strip
        bg.fillStyle(0xffffff, 0.15);
        bg.fillRoundedRect(-105, -22, 210, 12, 22);
        
        // Premium border with glow
        bg.lineStyle(2, 0x4facfe, 1);
        bg.strokeRoundedRect(-110, -25, 220, 50, 25);
        
        // Inner border accent
        bg.lineStyle(1, 0xffffff, 0.6);
        bg.strokeRoundedRect(-107, -22, 214, 44, 22);
        
        // Corner gems decoration
        for (let i = 0; i < 4; i++) {
            const x = i < 2 ? -105 : 105;
            const y = i % 2 === 0 ? -22 : 22;
            bg.fillStyle(0x4facfe, 0.8);
            bg.fillCircle(x, y, 3);
            bg.fillStyle(0xffffff, 0.6);
            bg.fillCircle(x, y, 1);
        }
        
        this.scoreDisplay.add(bg);
        
        // Player score section with premium styling
        const playerSection = this.scene.add.container(-70, 0);
        
        // Player score background
        const playerBg = this.scene.add.graphics();
        playerBg.fillStyle(0x4facfe, 0.2);
        playerBg.fillRoundedRect(-25, -15, 50, 30, 15);
        playerSection.add(playerBg);
        
        this.playerScoreText = this.scene.add.text(0, 0, '0', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            color: '#4facfe',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
        });
        this.playerScoreText.setOrigin(0.5);
        playerSection.add(this.playerScoreText);
        this.scoreDisplay.add(playerSection);
        
        // VS section with premium design
        const vsSection = this.scene.add.container(0, 0);
        
        // VS background with diamond shape
        const vsBg = this.scene.add.graphics();
        vsBg.fillStyle(0xffd700, 0.9);
        vsBg.fillRoundedRect(-18, -12, 36, 24, 12);
        vsBg.lineStyle(2, 0xffffff, 0.8);
        vsBg.strokeRoundedRect(-18, -12, 36, 24, 12);
        vsSection.add(vsBg);
        
        const vsText = this.scene.add.text(0, 0, 'VS', {
            fontSize: '14px',
            fontFamily: 'Arial Black',
            color: '#1a1a2e',
            stroke: '#ffd700',
            strokeThickness: 1
        });
        vsText.setOrigin(0.5);
        vsSection.add(vsText);
        
        // Enhanced VS animation with glow effect
        this.scene.tweens.add({
            targets: vsSection,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        this.scoreDisplay.add(vsSection);
        
        // Opponent score section
        const opponentSection = this.scene.add.container(70, 0);
        
        // Opponent score background
        const opponentBg = this.scene.add.graphics();
        opponentBg.fillStyle(0xf43f5e, 0.2);
        opponentBg.fillRoundedRect(-25, -15, 50, 30, 15);
        opponentSection.add(opponentBg);
        
        this.opponentScoreText = this.scene.add.text(0, 0, '0', {
            fontSize: '28px',
            fontFamily: 'Arial Black',
            color: '#f43f5e',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true }
        });
        this.opponentScoreText.setOrigin(0.5);
        opponentSection.add(this.opponentScoreText);
        this.scoreDisplay.add(opponentSection);
    }
    
    private createGemCounter(width: number, height: number): void {
        // Premium compact star counter - more vertical space efficient
        this.gemCounter = this.scene.add.container(130, height - 115);
        this.gemCounter.setDepth(Z_LAYERS.UI + 8);
        
        // More compact modern space panel design
        const bg = this.scene.add.graphics();
        
        // Outer shadow for depth
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-92, -52, 184, 104, 20);
        
        // Main background - dark space blue with subtle gradient
        bg.fillGradientStyle(0x0a0e27, 0x1a1a2e, 0x16213e, 0x0a0e27, 0.95);
        bg.fillRoundedRect(-90, -50, 180, 100, 18);
        
        // Gradient overlay - cyan to purple space effect
        bg.fillStyle(0x00ccff, 0.12);
        bg.fillRoundedRect(-88, -48, 176, 96, 17);
        
        // Top section highlight - purple accent
        bg.fillStyle(0x9966ff, 0.18);
        bg.fillRoundedRect(-88, -48, 176, 28, 17);
        
        // Premium outer glow effect
        bg.lineStyle(4, 0x00ffff, 0.3);
        bg.strokeRoundedRect(-92, -52, 184, 104, 20);
        
        // Clean modern border - cyan
        bg.lineStyle(2.5, 0x00ffff, 0.9);
        bg.strokeRoundedRect(-90, -50, 180, 100, 18);
        
        // Inner white glow
        bg.lineStyle(1.5, 0xffffff, 0.6);
        bg.strokeRoundedRect(-88, -48, 176, 96, 17);
        
        this.gemCounter.add(bg);
        
        // Add floating star particles around the container
        // this.createFloatingParticles(); // Disabled - distracting animation
        
        // Corner star decorations - DISABLED - doesn't make sense visually
        // const starPositions = [
        //     {x: -70, y: -30, size: 0.4},
        //     {x: 70, y: -30, size: 0.4},
        //     {x: -70, y: 30, size: 0.35},
        //     {x: 70, y: 30, size: 0.35}
        // ];
        
        // starPositions.forEach(pos => {
        //     const star = this.scene.add.star(pos.x, pos.y, 5, 3, 6, 0x00ffff, 0.7);
        //     star.setScale(pos.size);
        //     this.gemCounter.add(star);
            
        //     // Enhanced twinkle animation
        //     this.scene.tweens.add({
        //         targets: star,
        //         alpha: { from: 0.4, to: 0.9 },
        //         scale: { from: pos.size * 0.8, to: pos.size * 1.2 },
        //         duration: 1200 + Math.random() * 800,
        //         yoyo: true,
        //         repeat: -1,
        //         ease: 'Sine.easeInOut',
        //         delay: Math.random() * 1000
        //     });
        // });
        
        // Premium gem counter display - more horizontally spaced
        const scoreContainer = this.scene.add.container(0, -5);
        
        // Star as background behind the scores - more subtle and beautiful
        const starBg = this.scene.add.container(0, 0);
        
        // Multi-layered star glow effect
        const outerGlow = this.scene.add.circle(0, 0, 50, 0x00ccff, 0.08);
        const midGlow = this.scene.add.circle(0, 0, 40, 0x9966ff, 0.12);
        const innerGlow = this.scene.add.circle(0, 0, 32, 0x00ccff, 0.18);
        
        starBg.add([outerGlow, midGlow, innerGlow]);
        
        // Main star icon - more visible background element
        const starIcon = this.scene.add.image(0, 0, 'star-bubble');
        starIcon.setScale(2.0);
        starIcon.setAlpha(0.85); // More visible as main element
        starIcon.setTint(0x66ccff); // Subtle cyan tint
        starBg.add(starIcon);
        
        scoreContainer.add(starBg);
        
        // Elegant multi-layer glow pulse
        this.scene.tweens.add({
            targets: [outerGlow, midGlow, innerGlow],
            alpha: { from: 0.05, to: 0.25 },
            scale: { from: 0.9, to: 1.1 },
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            stagger: 200
        });
        
        // No rotation - keep star completely static for cleaner look
        
        // Player gem section - moved further left for more spacing
        const playerGemBg = this.scene.add.graphics();
        playerGemBg.fillStyle(0x4facfe, 0.25);
        playerGemBg.fillRoundedRect(-75, -20, 45, 40, 20);
        playerGemBg.lineStyle(2, 0x4facfe, 0.8);
        playerGemBg.strokeRoundedRect(-75, -20, 45, 40, 20);
        
        // Add subtle inner glow to player section
        playerGemBg.fillStyle(0xffffff, 0.1);
        playerGemBg.fillRoundedRect(-73, -18, 41, 36, 18);
        
        scoreContainer.add(playerGemBg);
        
        this.playerGemText = this.scene.add.text(-53, 0, '0', {
            fontSize: '30px',
            fontFamily: 'Arial Black',
            color: '#4facfe',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        });
        this.playerGemText.setOrigin(0.5);
        scoreContainer.add(this.playerGemText);
        
        // VS divider with subtle glow effect
        const divider = this.scene.add.text(0, 0, 'VS', {
            fontSize: '14px',  // Smaller to show more of the star
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#000033',
            strokeThickness: 3,
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
        });
        divider.setOrigin(0.5);
        scoreContainer.add(divider);
        
        // Add subtle pulsing to VS text
        this.scene.tweens.add({
            targets: divider,
            alpha: { from: 0.8, to: 1.0 },
            scale: { from: 0.95, to: 1.05 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Opponent gem section - moved further right for more spacing
        const opponentGemBg = this.scene.add.graphics();
        opponentGemBg.fillStyle(0xf43f5e, 0.25);
        opponentGemBg.fillRoundedRect(30, -20, 45, 40, 20);
        opponentGemBg.lineStyle(2, 0xf43f5e, 0.8);
        opponentGemBg.strokeRoundedRect(30, -20, 45, 40, 20);
        
        // Add subtle inner glow to opponent section
        opponentGemBg.fillStyle(0xffffff, 0.1);
        opponentGemBg.fillRoundedRect(32, -18, 41, 36, 18);
        
        scoreContainer.add(opponentGemBg);
        
        this.opponentGemText = this.scene.add.text(53, 0, '0', {
            fontSize: '30px',
            fontFamily: 'Arial Black',
            color: '#f43f5e',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        });
        this.opponentGemText.setOrigin(0.5);
        scoreContainer.add(this.opponentGemText);
        
        this.gemCounter.add(scoreContainer);
        
        // Add player names below the scores
        const nameContainer = this.scene.add.container(0, 20);
        
        // Player name
        this.playerNameText = this.scene.add.text(-53, 0, this.playerName, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#4facfe',
            stroke: '#000022',
            strokeThickness: 2
        });
        this.playerNameText.setOrigin(0.5);
        nameContainer.add(this.playerNameText);
        
        // Opponent name  
        this.opponentNameText = this.scene.add.text(53, 0, this.opponentName, {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#f43f5e',
            stroke: '#000022',
            strokeThickness: 2
        });
        this.opponentNameText.setOrigin(0.5);
        nameContainer.add(this.opponentNameText);
        
        this.gemCounter.add(nameContainer);
        
        // Enhanced "RACE TO 15" banner - more compact and premium
        const raceBanner = this.scene.add.graphics();
        
        // Premium dark space background with gradient
        raceBanner.fillGradientStyle(0x000022, 0x001133, 0x002244, 0x000022, 0.9);
        raceBanner.fillRoundedRect(-95, 35, 190, 28, 12);
        
        // Cyan gradient glow with energy effect
        raceBanner.fillStyle(0x00ccff, 0.15);
        raceBanner.fillRoundedRect(-93, 37, 186, 24, 11);
        
        // Purple accent highlight - more vibrant
        raceBanner.fillStyle(0x9966ff, 0.2);
        raceBanner.fillRoundedRect(-93, 37, 186, 10, 11);
        
        // Premium outer glow
        raceBanner.lineStyle(3, 0x00ffff, 0.4);
        raceBanner.strokeRoundedRect(-96, 34, 192, 30, 13);
        
        // Bright cyan border with energy
        raceBanner.lineStyle(2, 0x00ffff, 0.9);
        raceBanner.strokeRoundedRect(-95, 35, 190, 28, 12);
        
        // Inner white shine with sparkle
        raceBanner.lineStyle(1, 0xffffff, 0.6);
        raceBanner.strokeRoundedRect(-93, 37, 186, 24, 11);
        
        this.gemCounter.add(raceBanner);
        
        const raceText = this.scene.add.text(0, 49, 'RACE TO 15 STARS', {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#000022',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        });
        raceText.setOrigin(0.5);
        this.gemCounter.add(raceText);
        
        // Enhanced pulsing effect with color cycling
        this.scene.tweens.add({
            targets: raceText,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Simple pulsing animation for the text
        this.scene.tweens.add({
            targets: raceText,
            alpha: { from: 0.85, to: 1.0 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    /**
     * Create floating star particles around the gem counter
     */
    private createFloatingParticles(): void {
        const particleCount = 8;
        const radius = 110;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            // Create small star particle
            const particle = this.scene.add.star(x, y, 4, 2, 4, 0x00ffff, 0.6);
            particle.setScale(0.3 + Math.random() * 0.2);
            this.gemCounter.add(particle);
            
            // Floating animation with random variation
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle + Math.PI) * 15,
                y: y + Math.sin(angle + Math.PI) * 15,
                alpha: { from: 0.3, to: 0.8 },
                scale: { from: particle.scale * 0.8, to: particle.scale * 1.4 },
                rotation: Math.PI * 2,
                duration: 4000 + Math.random() * 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 500 + Math.random() * 1000
            });
            
            // Additional sparkle effect
            const sparkle = this.scene.add.circle(x, y, 1, 0xffffff, 0.8);
            this.gemCounter.add(sparkle);
            
            this.scene.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.5, to: 1.5 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 2000
            });
        }
        
        // Add energy waves that pulse from center
        for (let i = 0; i < 3; i++) {
            const wave = this.scene.add.circle(0, 0, 30 + i * 15, 0x00ccff, 0.1);
            this.gemCounter.add(wave);
            
            this.scene.tweens.add({
                targets: wave,
                scale: { from: 1, to: 2.5 },
                alpha: { from: 0.15, to: 0 },
                duration: 3000,
                repeat: -1,
                ease: 'Power2',
                delay: i * 1000
            });
        }
    }
    
    private createTimerDisplay(width: number, height: number): void {
        // Premium circular timer design - moved to top-right with better margin
        this.timerDisplay = this.scene.add.container(width - 130, 70);
        this.timerDisplay.setDepth(Z_LAYERS.UI + 10);
        
        // Circular timer background with premium styling - larger and more prominent
        const timerBg = this.scene.add.graphics();
        
        // Outer glow - larger
        timerBg.fillStyle(0x000000, 0.4);
        timerBg.fillCircle(0, 0, 50);
        
        // Main circular frame with gradient - larger
        timerBg.fillGradientStyle(0x1a1a2e, 0x16213e, 0x0f3460, 0x16213e, 1);
        timerBg.fillCircle(0, 0, 45);
        
        // Inner circle for progress track - larger
        timerBg.fillStyle(0x000000, 0.4);
        timerBg.fillCircle(0, 0, 40);
        
        // Highlight ring - more prominent
        timerBg.lineStyle(3, 0xffd700, 0.9);
        timerBg.strokeCircle(0, 0, 45);
        
        // Inner detail ring
        timerBg.lineStyle(1, 0xffffff, 0.4);
        timerBg.strokeCircle(0, 0, 42);
        
        // Clock decorations (hour markers) - adjusted for larger size
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 37;
            const y = Math.sin(angle) * 37;
            const size = i % 3 === 0 ? 3 : 1.5; // Bigger markers at 12, 3, 6, 9
            timerBg.fillStyle(0xffd700, 0.7);
            timerBg.fillCircle(x, y, size);
        }
        
        this.timerDisplay.add(timerBg);
        
        // Progress arc (will be updated dynamically)
        this.timerBar = this.scene.add.graphics();
        this.timerDisplay.add(this.timerBar);
        
        // Timer text with premium styling - larger for better visibility
        this.timerText = this.scene.add.text(0, 0, '3:00', {
            fontSize: '22px',
            fontFamily: 'Arial Black',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 3, fill: true }
        });
        this.timerText.setOrigin(0.5);
        this.timerDisplay.add(this.timerText);
    }
    
    private createComboDisplay(width: number, height: number): void {
        // Position combo display on the right side, below timer (adjusted for larger timer)
        this.comboDisplay = this.scene.add.container(width - 120, 120);
        this.comboDisplay.setDepth(Z_LAYERS.UI + 2);
        this.comboDisplay.setVisible(false);
        
        // High contrast combo background
        const bg = this.scene.add.graphics();
        
        // Strong shadow
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(-62, -28, 124, 64, 17);
        
        // Bright red combo background
        bg.fillStyle(0xff0000, 0.95);
        bg.fillRoundedRect(-60, -30, 120, 60, 15);
        
        // Yellow accent layer
        bg.fillStyle(0xffff00, 0.3);
        bg.fillRoundedRect(-58, -28, 116, 56, 14);
        
        // White highlight
        bg.fillStyle(0xffffff, 0.25);
        bg.fillRoundedRect(-58, -28, 116, 20, 14);
        
        // Bright yellow border
        bg.lineStyle(3, 0xffff00, 1);
        bg.strokeRoundedRect(-60, -30, 120, 60, 15);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(-58, -28, 116, 56, 14);
        
        this.comboDisplay.add(bg);
        
        // Combo text with high contrast
        this.comboText = this.scene.add.text(0, -8, 'COMBO', {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.comboText.setOrigin(0.5);
        this.comboDisplay.add(this.comboText);
        
        // Multiplier with bright colors
        this.comboMultiplier = this.scene.add.text(0, 10, 'x2', {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#ffff00',  // Bright yellow
            stroke: '#000000',
            strokeThickness: 3,
            shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 0, fill: true }
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
        // Score events - still track internally for end-game stats
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
                this.playerGemText.setColor('#ef4444');
                this.scene.time.delayedCall(500, () => {
                    this.playerGemText?.setColor('#4facfe'); // Player cyan
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
                this.opponentGemText.setColor('#ef4444');
                this.scene.time.delayedCall(500, () => {
                    this.opponentGemText?.setColor('#f43f5e'); // Opponent bright red
                });
            }
        }
    }
    
    private updateGems(data: { isPlayer: boolean, total?: number, delta?: number }): void {
        if (data.isPlayer) {
            this.playerGems = data.total ?? (this.playerGems + (data.delta ?? 1));
            if (this.playerGemText) {
                this.playerGemText.setText(this.playerGems.toString());
                
                // Check win condition with enhanced visual feedback
                if (this.playerGems >= 15) {
                    this.playerGemText.setColor('#10b981');
                    this.showNotification({ 
                        text: '🎉 15 STARS! YOU WIN! 🎉', 
                        type: 'success' 
                    });
                } else if (this.playerGems >= 13) {
                    // Visual milestone at 13 stars (2 away from victory)
                    this.playerGemText.setColor('#f59e0b'); // Golden warning
                    this.showNotification({ 
                        text: '⚡ 2 MORE STARS TO WIN! ⚡', 
                        type: 'warning' 
                    });
                } else if (this.playerGems >= 10) {
                    // Visual milestone at 10 stars
                    this.playerGemText.setColor('#06b6d4'); // Bright cyan
                } else if (this.playerGems >= 5) {
                    // Visual milestone at 5 stars
                    this.playerGemText.setColor('#8b5cf6'); // Purple milestone
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
                            { r: 79, g: 172, b: 254 },  // Modern cyan
                            { r: 255, g: 255, b: 255 },
                            1,
                            value
                        );
                        this.playerGemText?.setColor(
                            `#${Phaser.Display.Color.ComponentToHex(color.r)}${Phaser.Display.Color.ComponentToHex(color.g)}${Phaser.Display.Color.ComponentToHex(color.b)}`
                        );
                    },
                    onComplete: () => {
                        // Return to player cyan unless at 15 gems
                        if (this.playerGems >= 15) {
                            this.playerGemText?.setColor('#10b981'); // Modern green
                        } else {
                            this.playerGemText?.setColor('#4facfe'); // Modern cyan
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
                
                // Check danger with enhanced warnings
                if (this.opponentGems >= 15) {
                    this.opponentGemText.setColor('#ef4444');
                    this.showNotification({ 
                        text: '💀 OPPONENT HAS 15 STARS! 💀', 
                        type: 'danger' 
                    });
                } else if (this.opponentGems >= 13) {
                    // Critical warning at 13 stars
                    this.opponentGemText.setColor('#dc2626'); // Dark red danger
                    this.showNotification({ 
                        text: '🚨 OPPONENT NEEDS 2 MORE! 🚨', 
                        type: 'danger' 
                    });
                } else if (this.opponentGems >= 10) {
                    // Warning at 10 stars
                    this.opponentGemText.setColor('#f97316'); // Orange warning
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
                            { r: 244, g: 63, b: 94 },  // Modern red
                            { r: 255, g: 255, b: 255 },
                            1,
                            value
                        );
                        this.opponentGemText?.setColor(
                            `#${Phaser.Display.Color.ComponentToHex(color.r)}${Phaser.Display.Color.ComponentToHex(color.g)}${Phaser.Display.Color.ComponentToHex(color.b)}`
                        );
                    },
                    onComplete: () => {
                        // Return to opponent bright red unless at 15 gems
                        if (this.opponentGems >= 15) {
                            this.opponentGemText?.setColor('#ef4444'); // Danger red
                        } else {
                            this.opponentGemText?.setColor('#f43f5e'); // Modern red
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
                this.timerText.setColor('#ef4444');
                // Pulse effect for urgency
                if (!this.timerText.getData('pulsing')) {
                    this.timerText.setData('pulsing', true);
                    this.scene.tweens.add({
                        targets: this.timerText,
                        scaleX: 1.15,
                        scaleY: 1.15,
                        duration: 400,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            } else if (this.gameTime >= this.suddenDeathTime) { // Sudden death - golden
                this.timerText.setColor('#ffd700');
            } else {
                this.timerText.setColor('#ffd700');
                this.timerText.setData('pulsing', false);
            }
        }
        
        // Update circular timer progress
        if (this.timerBar) {
            this.timerBar.clear();
            
            const progress = Math.min(1, this.gameTime / this.maxGameTime);
            const remainingProgress = 1 - progress;
            
            // Choose color based on game phase with smooth transitions
            let barColor = 0x4ade80; // Green
            let glowColor = 0x4ade80;
            
            if (this.gameTime >= this.suddenDeathTime) {
                barColor = 0xffd700; // Gold for sudden death
                glowColor = 0xffd700;
            } else if (this.gameTime >= this.maxGameTime - 30000) {
                barColor = 0xef4444; // Red for final 30 seconds
                glowColor = 0xef4444;
            } else if (this.gameTime >= this.maxGameTime - 60000) {
                barColor = 0xf59e0b; // Orange for final minute
                glowColor = 0xf59e0b;
            }
            
            // Draw circular progress arc - adjusted for larger timer
            if (remainingProgress > 0) {
                const startAngle = -Math.PI / 2; // Start at top
                const endAngle = startAngle + (remainingProgress * Math.PI * 2);
                
                // Outer glow effect - larger
                this.timerBar.lineStyle(8, glowColor, 0.4);
                this.timerBar.beginPath();
                this.timerBar.arc(0, 0, 35, startAngle, endAngle, false);
                this.timerBar.strokePath();
                
                // Main progress arc - larger
                this.timerBar.lineStyle(5, barColor, 0.9);
                this.timerBar.beginPath();
                this.timerBar.arc(0, 0, 35, startAngle, endAngle, false);
                this.timerBar.strokePath();
                
                // Inner bright core - larger
                this.timerBar.lineStyle(3, 0xffffff, 0.7);
                this.timerBar.beginPath();
                this.timerBar.arc(0, 0, 35, startAngle, endAngle, false);
                this.timerBar.strokePath();
            }
        }
    }
    
    private showSuddenDeath(): void {
        // Create sudden death banner with bubble burst effect
        const banner = this.scene.add.container(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY - 50
        );
        banner.setDepth(Z_LAYERS.FLOATING_UI);
        
        // High contrast sudden death background
        const bg = this.scene.add.graphics();
        
        // Strong black shadow
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-220, -52, 440, 104, 25);
        
        // Bright red danger background
        bg.fillStyle(0xff0000, 0.95);
        bg.fillRoundedRect(-200, -50, 400, 100, 20);
        
        // Yellow warning accent
        bg.fillStyle(0xffff00, 0.3);
        bg.fillRoundedRect(-195, -45, 390, 90, 18);
        
        // White highlight
        bg.fillStyle(0xffffff, 0.25);
        bg.fillRoundedRect(-195, -45, 390, 30, 18);
        
        // Bright yellow border
        bg.lineStyle(4, 0xffff00, 1);
        bg.strokeRoundedRect(-200, -50, 400, 100, 20);
        bg.lineStyle(2, 0xffffff, 0.8);
        bg.strokeRoundedRect(-195, -45, 390, 90, 18);
        
        banner.add(bg);
        
        // Text with high contrast
        const text = this.scene.add.text(0, 0, '⚠️ SUDDEN DEATH ⚠️', {
            fontSize: '42px',
            fontFamily: 'Arial Black',
            color: '#ffffff',  // White text
            stroke: '#000000',
            strokeThickness: 5,
            shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 0, fill: true }
        });
        text.setOrigin(0.5);
        banner.add(text);
        
        // Add bright warning bubbles floating around
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 150;
            const bubble = this.scene.add.circle(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                10,
                0xffff00,  // Bright yellow
                0.9
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
        if (this.timerText) this.timerText.setText('3:00').setColor('#ffd700');
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
        const particleCount = 12;
        const primaryColor = isPlayer ? 0x4facfe : 0xf43f5e;
        const secondaryColor = isPlayer ? 0x93c5fd : 0xfda4af;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const distance = 35 + Math.random() * 15;
            const size = 2 + Math.random() * 3;
            const color = i % 2 === 0 ? primaryColor : secondaryColor;
            
            const particle = this.scene.add.circle(x, y, size, color);
            particle.setDepth(Z_LAYERS.UI + 9);
            
            // Add sparkle effect
            const sparkle = this.scene.add.circle(x, y, 1, 0xffffff);
            sparkle.setDepth(Z_LAYERS.UI + 10);
            
            // Animate particles outward with premium feel
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance,
                alpha: { from: 1, to: 0 },
                scale: { from: 1, to: 0.2 },
                duration: 800,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
            
            // Animate sparkles
            this.scene.tweens.add({
                targets: sparkle,
                x: x + Math.cos(angle) * (distance * 0.7),
                y: y + Math.sin(angle) * (distance * 0.7),
                alpha: { from: 1, to: 0 },
                scale: { from: 1, to: 0 },
                duration: 500,
                ease: 'Power2',
                onComplete: () => sparkle.destroy()
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
    
    /**
     * Updates player names dynamically during gameplay
     * Useful for online multiplayer when player names are received from server
     */
    public updatePlayerNames(playerName?: string, opponentName?: string): void {
        if (playerName !== undefined) {
            this.playerName = playerName;
            if (this.playerNameText) {
                this.playerNameText.setText(playerName);
            }
        }
        
        if (opponentName !== undefined) {
            this.opponentName = opponentName;
            if (this.opponentNameText) {
                this.opponentNameText.setText(opponentName);
            }
        }
    }
    
    /**
     * Get current player names
     */
    public getPlayerNames(): { player: string; opponent: string } {
        return {
            player: this.playerName,
            opponent: this.opponentName
        };
    }
}