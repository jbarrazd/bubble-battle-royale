/**
 * ThemeSelectScene - Beautiful theme selection screen
 * Allows players to choose their preferred visual theme before starting the game
 */

import { Scene } from 'phaser';
import { SceneKeys } from '@/types/GameTypes';
import { BackgroundSystem } from '@/systems/visual/BackgroundSystem';
import { HD_SCALE } from '@/config/GameConfig';

export type ThemeType = 'ocean' | 'ocean_depths' | 'sunset' | 'forest' | 'space' | 'aurora';

interface ThemeOption {
    key: ThemeType;
    name: string;
    description: string;
    colors: number[];
    icon: string;
}

export class ThemeSelectScene extends Scene {
    private backgroundSystem!: BackgroundSystem;
    private selectedTheme: ThemeType = 'ocean_depths';
    private themeContainers: Phaser.GameObjects.Container[] = [];
    private titleText!: Phaser.GameObjects.Text;
    private confirmButton!: Phaser.GameObjects.Container;
    private previewBackground!: BackgroundSystem;
    
    private themes: ThemeOption[] = [
        {
            key: 'ocean',
            name: 'Ocean Classic',
            description: 'Classic ocean theme',
            colors: [0x001a33, 0x003366, 0x004d99, 0x0066cc],
            icon: '💧'
        },
        {
            key: 'ocean_depths',
            name: 'Ocean Depths',
            description: 'Dive into deep blue waters',
            colors: [0x001a33, 0x003366, 0x004d99, 0x0066cc],
            icon: '🌊'
        },
        {
            key: 'sunset',
            name: 'Twilight Dream',
            description: 'Purple and orange sunset vibes',
            colors: [0x1a0033, 0x330066, 0x660099, 0xff6600],
            icon: '🌅'
        },
        {
            key: 'forest',
            name: 'Mystic Forest',
            description: 'Natural green serenity',
            colors: [0x001a00, 0x003300, 0x004d00, 0x006600],
            icon: '🌲'
        },
        {
            key: 'space',
            name: 'Deep Space',
            description: 'Journey through the cosmos',
            colors: [0x000011, 0x000022, 0x000033, 0x9966ff],
            icon: '🚀'
        },
        {
            key: 'aurora',
            name: 'Northern Lights',
            description: 'Magical aurora borealis',
            colors: [0x001122, 0x002244, 0x003366, 0x00ff99],
            icon: '🌌'
        }
    ];

    constructor() {
        super({ key: SceneKeys.THEME_SELECT });
    }

    create(): void {
        const { width, height } = this.cameras.main;
        
        // Create preview background (starts with ocean_depths)
        this.previewBackground = new BackgroundSystem(this, {
            theme: 'ocean_depths',
            quality: 'high',
            enableParticles: true,
            enableAnimation: true
        });
        
        // Add dark overlay for better text visibility
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.3);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(100);
        
        // Title - optimized for mobile
        this.titleText = this.add.text(width / 2, 40 * HD_SCALE, 'Choose Your Theme', {
            fontSize: `${24 * HD_SCALE}px`,
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.titleText.setOrigin(0.5);
        this.titleText.setDepth(101);
        
        // Add glow effect to title
        this.tweens.add({
            targets: this.titleText,
            scale: { from: 0.95, to: 1.05 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Create theme selection cards
        this.createThemeCards();
        
        // Create confirm button
        this.createConfirmButton();
        
        // Add keyboard shortcuts
        this.setupKeyboardControls();
        
        // Select first theme by default
        this.selectTheme(0);
    }

    private createThemeCards(): void {
        const { width, height } = this.cameras.main;
        
        // Mobile-first vertical layout - optimized for small screens
        const cardWidth = width * 0.85; // Use 85% of screen width for better mobile fit
        const cardHeight = 65 * HD_SCALE; // Slightly taller for better touch targets
        const spacing = 10 * HD_SCALE; // Proportional spacing
        const titleHeight = 80 * HD_SCALE; // Account for title
        const buttonHeight = 100 * HD_SCALE; // Account for button at bottom
        
        // Calculate available height and distribute cards evenly
        const availableHeight = height - titleHeight - buttonHeight;
        const totalCardHeight = (cardHeight * this.themes.length) + (spacing * (this.themes.length - 1));
        
        // Center cards vertically in available space
        const startY = titleHeight + (availableHeight - totalCardHeight) / 2;
        const centerX = width / 2;
        
        this.themes.forEach((theme, index) => {
            const y = startY + (index * (cardHeight + spacing));
            const container = this.createThemeCard(theme, centerX, y, cardWidth, cardHeight, index);
            this.themeContainers.push(container);
        });
    }

    private createThemeCard(theme: ThemeOption, x: number, y: number, width: number, height: number, index: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);
        container.setDepth(102);
        
        // Card background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        bg.lineStyle(2, 0xffffff, 0.3);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        container.add(bg);
        
        // Selection glow (hidden by default)
        const glow = this.add.graphics();
        glow.lineStyle(3, 0x00ff00, 1);
        glow.strokeRoundedRect(-width/2 - 3, -height/2 - 3, width + 6, height + 6, 12);
        glow.setVisible(false);
        container.add(glow);
        container.setData('glow', glow);
        
        // Optimized horizontal layout for mobile
        // Theme icon on the left
        const iconX = -width/2 + 30 * HD_SCALE;
        const icon = this.add.text(iconX, 0, theme.icon, {
            fontSize: `${28 * HD_SCALE}px`,
            fontFamily: 'Arial'
        });
        icon.setOrigin(0.5);
        container.add(icon);
        
        // Theme name - larger and better positioned
        const nameText = this.add.text(-20 * HD_SCALE, -10 * HD_SCALE, theme.name, {
            fontSize: `${16 * HD_SCALE}px`,
            fontFamily: 'Arial Black',
            color: '#ffffff',
            align: 'left'
        });
        nameText.setOrigin(0, 0.5);
        container.add(nameText);
        
        // Theme description below name
        const descText = this.add.text(-20 * HD_SCALE, 10 * HD_SCALE, theme.description, {
            fontSize: `${11 * HD_SCALE}px`,
            fontFamily: 'Arial',
            color: '#aaaaaa',
            align: 'left'
        });
        descText.setOrigin(0, 0.5);
        container.add(descText);
        
        // Color preview dots on the right - horizontal layout
        const dotSize = 8 * HD_SCALE;
        const dotSpacing = 12 * HD_SCALE;
        const dotsStartX = width/2 - (theme.colors.length * dotSpacing + 20 * HD_SCALE);
        
        theme.colors.forEach((color, i) => {
            const dot = this.add.circle(
                dotsStartX + (i * dotSpacing),
                0,
                dotSize / 2,
                color
            );
            dot.setStrokeStyle(1, 0xffffff, 0.3);
            container.add(dot);
        });
        
        // Make interactive
        container.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains);
        
        // Hover effects
        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 200,
                ease: 'Power2'
            });
            bg.clear();
            bg.fillStyle(0x000000, 0.9);
            bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
            bg.lineStyle(3, 0xffffff, 0.5);
            bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        });
        
        container.on('pointerout', () => {
            if (this.selectedTheme !== theme.key) {
                this.tweens.add({
                    targets: container,
                    scale: 1,
                    duration: 200,
                    ease: 'Power2'
                });
                bg.clear();
                bg.fillStyle(0x000000, 0.7);
                bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
                bg.lineStyle(3, 0xffffff, 0.3);
                bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
            }
        });
        
        // Click to select
        container.on('pointerdown', () => {
            this.selectTheme(index);
        });
        
        // Add entrance animation
        container.setScale(0);
        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 500,
            delay: index * 100,
            ease: 'Back.easeOut'
        });
        
        return container;
    }

    private createConfirmButton(): void {
        const { width, height } = this.cameras.main;
        const buttonY = height - 50 * HD_SCALE; // Very close to bottom for mobile
        
        this.confirmButton = this.add.container(width / 2, buttonY);
        this.confirmButton.setDepth(103);
        
        // Button background - optimized for mobile touch
        const bg = this.add.graphics();
        const buttonWidth = width * 0.65; // 65% of screen width
        const buttonHeight = 40 * HD_SCALE; // Good touch target size
        
        bg.fillStyle(0x00ff00, 0.8);
        bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
        this.confirmButton.add(bg);
        
        // Button text - optimized size for mobile
        const text = this.add.text(0, 0, 'START GAME', {
            fontSize: `${18 * HD_SCALE}px`,
            fontFamily: 'Arial Black',
            color: '#000000'
        });
        text.setOrigin(0.5);
        this.confirmButton.add(text);
        
        // Make interactive
        this.confirmButton.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
        
        // Hover effect
        this.confirmButton.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x00ff00, 1);
            bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
            this.tweens.add({
                targets: this.confirmButton,
                scale: 1.1,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        this.confirmButton.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x00ff00, 0.8);
            bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 10);
            this.tweens.add({
                targets: this.confirmButton,
                scale: 1,
                duration: 200,
                ease: 'Power2'
            });
        });
        
        // Click to start game
        this.confirmButton.on('pointerdown', () => {
            this.startGame();
        });
        
        // Pulsing animation
        this.tweens.add({
            targets: this.confirmButton,
            scale: { from: 0.95, to: 1.05 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private selectTheme(index: number): void {
        const theme = this.themes[index];
        this.selectedTheme = theme.key;
        
        // Update preview background
        this.previewBackground.setTheme(theme.key);
        
        // Update visual selection
        this.themeContainers.forEach((container, i) => {
            const glow = container.getData('glow') as Phaser.GameObjects.Graphics;
            if (i === index) {
                glow.setVisible(true);
                container.setScale(1.1);
                
                // Bounce animation
                this.tweens.add({
                    targets: container,
                    y: container.y - 10,
                    duration: 200,
                    yoyo: true,
                    ease: 'Power2'
                });
            } else {
                glow.setVisible(false);
                container.setScale(1);
            }
        });
        
        // Store selection
        this.registry.set('selectedTheme', theme.key);
    }

    private setupKeyboardControls(): void {
        // Number keys 1-5 for quick selection
        this.input.keyboard?.on('keydown-ONE', () => this.selectTheme(0));
        this.input.keyboard?.on('keydown-TWO', () => this.selectTheme(1));
        this.input.keyboard?.on('keydown-THREE', () => this.selectTheme(2));
        this.input.keyboard?.on('keydown-FOUR', () => this.selectTheme(3));
        this.input.keyboard?.on('keydown-FIVE', () => this.selectTheme(4));
        
        // Enter or Space to confirm
        this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
        this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
        
        // ESC to go back
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.start(SceneKeys.MENU);
        });
    }

    private startGame(): void {
        // Clean up
        this.previewBackground.destroy();
        
        // Transition effect
        const fadeOut = this.add.graphics();
        fadeOut.fillStyle(0x000000, 0);
        fadeOut.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        fadeOut.setDepth(1000);
        
        this.tweens.add({
            targets: fadeOut,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Start game with selected theme
                this.scene.start(SceneKeys.GAME, {
                    theme: this.selectedTheme
                });
            }
        });
    }

    shutdown(): void {
        this.previewBackground?.destroy();
    }
}