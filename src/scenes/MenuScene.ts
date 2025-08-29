import { Scene } from 'phaser';
import { SceneKeys, ISceneData } from '@/types/GameTypes';
import { SceneManager } from '@systems/core/SceneManager';
import { GAME_CONSTANTS } from '@config/GameConfig';
import { ASSET_KEYS } from '@config/AssetManifest';
import { PerformanceMonitor } from '@utils/PerformanceMonitor';

export class MenuScene extends Scene {
    private sceneManager!: SceneManager;
    private performanceMonitor!: PerformanceMonitor;
    private buttons: Phaser.GameObjects.Container[] = [];
    private titleText!: Phaser.GameObjects.Text;
    private versionText!: Phaser.GameObjects.Text;
    private fpsText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: SceneKeys.MENU });
    }

    public init(_data: ISceneData): void {
        console.log('MenuScene: Initializing main menu...');
        this.sceneManager = SceneManager.getInstance();
        this.sceneManager.setCurrentScene(SceneKeys.MENU);
        this.performanceMonitor = new PerformanceMonitor();
        if (this.game && this.game.events) {
            this.performanceMonitor.setEventEmitter(this.game.events);
        }
    }

    public create(): void {
        // Debug: Check actual game FPS settings
        console.log('MenuScene: create() called');
        console.log('Game FPS Target:', this.game.config.fps);
        console.log('Game Loop Type:', this.game.loop?.type);
        console.log('Game Loop Target FPS:', this.game.loop?.targetFps);
        console.log('Game Loop Actual FPS:', this.game.loop?.actualFps);
        
        this.createBackground();
        this.createTitle();
        this.createMenuButtons();
        this.createVersionInfo();
        this.createFPSDisplay();
        this.addAnimations();
    }

    public override update(_time: number, _delta: number): void {
        // Update FPS display once per second instead of every frame
        // Check that time exists before accessing it
        if (this.fpsText && this.time && this.time.now % 1000 < 16) {
            const fps = Math.round(this.game.loop.actualFps);
            this.fpsText.setText(`FPS: ${fps}`);
            
            // Simple color update
            if (fps < 30) {
                this.fpsText.setTint(0xff0000);
            } else if (fps < 50) {
                this.fpsText.setTint(0xffff00);
            } else {
                this.fpsText.setTint(0x00ff00);
            }
        }
    }

    private createBackground(): void {
        const bg = this.add.image(0, 0, ASSET_KEYS.IMAGES.BACKGROUND);
        bg.setOrigin(0, 0);
        bg.setDisplaySize(this.cameras.main.width, this.cameras.main.height);
        bg.setTint(0x1a1a2e);

        for (let i = 0; i < 20; i++) {
            const bubble = this.add.circle(
                Phaser.Math.Between(0, this.cameras.main.width),
                Phaser.Math.Between(0, this.cameras.main.height),
                Phaser.Math.Between(10, 30),
                Phaser.Math.Between(0x3498db, 0x9b59b6),
                0.2
            );

            this.tweens.add({
                targets: bubble,
                y: bubble.y - Phaser.Math.Between(50, 150),
                x: bubble.x + Phaser.Math.Between(-30, 30),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                ease: 'Sine.easeOut',
                repeat: -1,
                delay: Phaser.Math.Between(0, 3000)
            });
        }
    }

    private createTitle(): void {
        this.titleText = this.add.text(
            this.cameras.main.centerX,
            100,
            'Bubble Battle\nRoyale',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '42px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: this.titleText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });
    }

    private createMenuButtons(): void {
        const buttonData = [
            { text: 'PLAY', action: () => this.startGame() },
            { text: 'PRACTICE', action: () => this.startPractice() },
            { text: 'SETTINGS', action: () => this.openSettings() },
            { text: 'ABOUT', action: () => this.showAbout() }
        ];

        const startY = 250;
        const spacing = 70;

        buttonData.forEach((data, index) => {
            const button = this.createButton(
                this.cameras.main.centerX,
                startY + (index * spacing),
                data.text,
                data.action
            );
            this.buttons.push(button);

            button.setAlpha(0);
            button.setScale(0.8);
            
            this.tweens.add({
                targets: button,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 500,
                ease: 'Back.easeOut',
                delay: 100 + (index * 100)
            });
        });
    }

    private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 250, 50, 0x3498db, 1);
        bg.setStrokeStyle(2, 0xffffff, 1);
        bg.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(0, 0, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: GAME_CONSTANTS.COLORS.UI_TEXT,
            align: 'center'
        }).setOrigin(0.5);

        container.add([bg, buttonText]);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x5dade2);
            this.tweens.add({
                targets: container,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                ease: 'Power2'
            });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x3498db);
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power2'
            });
        });

        bg.on('pointerdown', () => {
            container.setScale(0.95);
        });

        bg.on('pointerup', () => {
            container.setScale(1);
            callback();
        });

        return container;
    }

    private createVersionInfo(): void {
        this.versionText = this.add.text(
            10,
            this.cameras.main.height - 30,
            'v1.0.0 - Development Build',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT
            }
        ).setOrigin(0, 0.5).setAlpha(0.5);
    }

    private createFPSDisplay(): void {
        this.fpsText = this.add.text(
            this.cameras.main.width - 10,
            10,
            'FPS: 60',
            {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#00ff00'
            }
        ).setOrigin(1, 0);
    }

    private addAnimations(): void {
        this.add.particles(0, 0, ASSET_KEYS.IMAGES.LOGO, {
            x: { min: 0, max: this.cameras.main.width },
            y: this.cameras.main.height + 50,
            lifespan: 8000,
            speedY: { min: -100, max: -50 },
            scale: { start: 0.1, end: 0 },
            quantity: 1,
            frequency: 2000,
            alpha: { start: 0.3, end: 0 },
            tint: [0x3498db, 0x9b59b6, 0xe74c3c, 0xf39c12]
        });
    }

    private startGame(): void {
        console.log('Starting game...');
        this.tweens.add({
            targets: this.buttons,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.sceneManager.transitionTo(SceneKeys.GAME);
            }
        });
    }

    private startPractice(): void {
        console.log('Starting practice mode...');
        this.showMessage('Practice Mode Coming Soon!');
    }

    private openSettings(): void {
        console.log('Opening settings...');
        this.showMessage('Settings Coming Soon!');
    }

    private showAbout(): void {
        console.log('Showing about...');
        this.showMessage('Bubble Battle Royale\nBuilt with Phaser 3 & TypeScript\n\nA competitive bubble shooter game!');
    }

    private showMessage(text: string): void {
        const overlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );

        const messageBox = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            400,
            200,
            0x2c3e50,
            1
        );
        messageBox.setStrokeStyle(2, 0xffffff);

        const messageText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 30,
            text,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center',
                wordWrap: { width: 350 }
            }
        ).setOrigin(0.5);

        const closeButton = this.createButton(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 60,
            'CLOSE',
            () => {
                overlay.destroy();
                messageBox.destroy();
                messageText.destroy();
                closeButton.destroy();
            }
        );

        overlay.setInteractive();
        overlay.on('pointerdown', () => {
            overlay.destroy();
            messageBox.destroy();
            messageText.destroy();
            closeButton.destroy();
        });
    }
}