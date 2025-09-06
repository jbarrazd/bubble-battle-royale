import { Scene } from 'phaser';
import { SceneKeys, ISceneData, GameEvents } from '@/types/GameTypes';
import { SceneManager } from '@systems/core/SceneManager';
import { AssetLoader, ASSET_KEYS } from '@config/AssetManifest';
import { GAME_CONSTANTS } from '@config/GameConfig';
import { PerformanceMonitor } from '@utils/PerformanceMonitor';

export class PreloadScene extends Scene {
    private sceneManager!: SceneManager;
    private assetLoader!: AssetLoader;
    private performanceMonitor!: PerformanceMonitor;
    private loadingText!: Phaser.GameObjects.Text;
    private progressBar!: Phaser.GameObjects.Graphics;
    private progressBox!: Phaser.GameObjects.Graphics;
    private percentText!: Phaser.GameObjects.Text;
    private assetText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: SceneKeys.PRELOAD });
    }

    public init(_data: ISceneData): void {
        console.log('PreloadScene: Starting asset loading...');
        this.sceneManager = SceneManager.getInstance();
        this.performanceMonitor = new PerformanceMonitor();
        this.assetLoader = new AssetLoader(this);
    }

    public preload(): void {
        this.createLoadingUI();
        this.setupLoadingListeners();
        
        this.createPlaceholderAssets();
        
        // Load background music from AssetManifest
        this.load.audio('background-music', 'assets/audio/background_music.mp3');
        
        // Also load UFO sounds
        this.load.audio('ufo-arrives', 'assets/audio/ufo-arrives.mp3');
        this.load.audio('ufo-sound', 'assets/audio/ufo-sound.mp3');
        this.load.audio('chest-arrival', 'assets/audio/chest-arrival.mp3');
        this.load.audio('shine', 'assets/audio/shine.mp3');
        
        // Load victory and defeat sounds
        this.load.audio('victory', 'assets/sounds/victory.mp3');
        this.load.audio('defeat', 'assets/sounds/defeat.mp3');
        
        // Load star sprites for space arena
        this.load.image('star-small', 'assets/images/star_small.png');
        this.load.image('star-medium', 'assets/images/star_medium.png');
        this.load.image('star-large', 'assets/images/star_large.png');
        this.load.image('star3', 'assets/images/star3_small.png'); // Star with built-in sparkles (optimized size)
        this.load.image('star-bubble', 'assets/images/star_bubble_36.png'); // Optimized star for bubbles (36x36)
        
        this.assetLoader.loadAssets((progress: number) => {
            this.updateProgress(progress);
        });
    }

    public create(): void {
        console.log('PreloadScene: All assets loaded');
        
        this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY + 100,
            'Assets Loaded!',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: GAME_CONSTANTS.COLORS.UI_SUCCESS,
                align: 'center'
            }
        ).setOrigin(0.5);

        this.cleanupLoadingUI();

        // Wait a moment before transitioning
        this.time.delayedCall(500, () => {
            console.log('PreloadScene: Transitioning to MenuScene');
            this.game.events.emit(GameEvents.LOADING_COMPLETE);
            this.sceneManager.setCurrentScene(SceneKeys.PRELOAD);
            this.sceneManager.transitionTo(SceneKeys.MENU);
            console.log('PreloadScene: MenuScene transition initiated');
        });
    }

    public override update(time: number, _delta: number): void {
        this.performanceMonitor.update(time);
    }

    private createLoadingUI(): void {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        this.add.text(
            centerX,
            centerY - 100,
            'Bubble Battle Royale',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '32px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        this.loadingText = this.add.text(
            centerX,
            centerY - 40,
            'Loading...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '20px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        const progressBarWidth = 320;
        const progressBarHeight = 50;
        const progressBarX = centerX - progressBarWidth / 2;
        const progressBarY = centerY;

        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x222222, 0.8);
        this.progressBox.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

        this.progressBar = this.add.graphics();

        this.percentText = this.add.text(
            centerX,
            centerY + 25,
            '0%',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '18px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        this.assetText = this.add.text(
            centerX,
            centerY + 70,
            '',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        this.createLoadingAnimation();
    }

    private createLoadingAnimation(): void {
        const bubbleColors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        const bubbles: Phaser.GameObjects.Arc[] = [];
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY + 150;
        const spacing = 40;

        for (let i = 0; i < 5; i++) {
            const bubble = this.add.circle(
                centerX + (i - 2) * spacing,
                centerY,
                15,
                bubbleColors[i],
                1
            );
            bubbles.push(bubble);

            this.tweens.add({
                targets: bubble,
                y: centerY - 20,
                duration: 500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: i * 100
            });
        }
    }

    private setupLoadingListeners(): void {
        this.load.on('progress', (value: number) => {
            this.updateProgress(value);
        });

        this.load.on('fileprogress', (file: Phaser.Loader.File) => {
            this.assetText.setText(`Loading: ${file.key}`);
        });

        this.load.on('complete', () => {
            console.log('Asset loading complete');
            this.assetText.setText('Complete!');
        });

        this.load.on('loaderror', (file: Phaser.Loader.File) => {
            console.error(`Failed to load: ${file.key}`);
            this.assetText.setText(`Error loading: ${file.key}`);
        });
    }

    private updateProgress(value: number): void {
        const percent = Math.floor(value * 100);
        this.percentText.setText(`${percent}%`);

        this.progressBar.clear();
        this.progressBar.fillStyle(0xffffff, 1);
        
        const progressBarWidth = 320;
        const progressBarHeight = 50;
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        const progressBarX = centerX - progressBarWidth / 2;
        const progressBarY = centerY;
        
        this.progressBar.fillRect(
            progressBarX + 10,
            progressBarY + 10,
            (progressBarWidth - 20) * value,
            progressBarHeight - 20
        );

        if (value >= 0.5) {
            this.loadingText.setText('Loading Assets...');
        }
        if (value >= 0.8) {
            this.loadingText.setText('Almost Ready...');
        }
    }

    private createPlaceholderAssets(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        
        graphics.fillStyle(0x3498db, 1);
        graphics.fillCircle(32, 32, 32);
        graphics.generateTexture(ASSET_KEYS.IMAGES.LOGO, 64, 64);
        
        graphics.clear();
        graphics.fillStyle(0x2c3e50, 1);
        graphics.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
        graphics.generateTexture(ASSET_KEYS.IMAGES.BACKGROUND, this.cameras.main.width, this.cameras.main.height);
        
        // Create particle texture
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('particle', 16, 16);
        
        graphics.destroy();
    }

    private cleanupLoadingUI(): void {
        if (this.progressBar) {
            this.progressBar.destroy();
        }
        if (this.progressBox) {
            this.progressBox.destroy();
        }
        if (this.percentText) {
            this.percentText.destroy();
        }
        if (this.loadingText) {
            this.loadingText.setText('Ready!');
        }
    }
}