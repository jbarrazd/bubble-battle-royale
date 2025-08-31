import { Scene } from 'phaser';
import { SceneKeys, ISceneData } from '@/types/GameTypes';
import { SceneManager } from '@systems/core/SceneManager';
import { DeviceDetection } from '@utils/DeviceDetection';
import { PerformanceMonitor } from '@utils/PerformanceMonitor';
import { GAME_CONSTANTS, HD_SCALE } from '@config/GameConfig';

export class BootScene extends Scene {
    private sceneManager!: SceneManager;
    private deviceDetection!: DeviceDetection;
    private performanceMonitor!: PerformanceMonitor;

    constructor() {
        super({ key: SceneKeys.BOOT });
    }

    public init(_data: ISceneData): void {
        console.log('BootScene: Initializing game systems...');
        
        this.deviceDetection = DeviceDetection.getInstance();
        this.performanceMonitor = new PerformanceMonitor();
        this.sceneManager = SceneManager.getInstance(this.game);
        
        this.performanceMonitor.setEventEmitter(this.game.events);
        
        this.setupDeviceListeners();
        this.checkDeviceCapabilities();
    }

    public preload(): void {
        const loadingText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            'Initializing...',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${12 * HD_SCALE}px`,
                color: GAME_CONSTANTS.COLORS.UI_TEXT,
                align: 'center'
            }
        ).setOrigin(0.5);

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        const width = 160 * HD_SCALE;
        const height = 25 * HD_SCALE;
        const x = this.cameras.main.centerX - width / 2;
        const y = this.cameras.main.centerY + (20 * HD_SCALE);

        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(x, y, width, height);

        this.load.on('progress', (value: number) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(x + (5 * HD_SCALE), y + (5 * HD_SCALE), (width - (10 * HD_SCALE)) * value, height - (10 * HD_SCALE));
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });
    }

    public create(): void {
        console.log('BootScene: System initialization complete');
        
        const capabilities = this.deviceDetection.getCapabilities();
        console.log('Device Capabilities:', capabilities);
        
        const qualityPreset = this.deviceDetection.getQualityPreset();
        console.log(`Quality Preset: ${qualityPreset}`);
        
        this.setupGlobalEventListeners();
        
        // Set current scene first
        this.sceneManager.setCurrentScene(SceneKeys.BOOT);
        
        // Then transition to PreloadScene
        console.log('BootScene: About to transition to PRELOAD');
        console.log('BootScene: SceneManager instance exists:', !!this.sceneManager);
        console.log('BootScene: Available scenes:', this.game.scene.keys);
        
        try {
            this.sceneManager.transitionTo(SceneKeys.PRELOAD);
            console.log('BootScene: Transition to PRELOAD initiated successfully');
        } catch (error) {
            console.error('BootScene: Error transitioning to PRELOAD:', error);
            // Fallback to direct scene start
            this.scene.start(SceneKeys.PRELOAD);
        }
    }

    public override update(time: number, _delta: number): void {
        this.performanceMonitor.update(time);
    }

    private setupDeviceListeners(): void {
        window.addEventListener('resize', () => {
            this.deviceDetection.updateOrientation();
            this.handleOrientationChange();
        });

        window.addEventListener('orientationchange', () => {
            this.deviceDetection.updateOrientation();
            this.handleOrientationChange();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handleGamePause();
            } else {
                this.handleGameResume();
            }
        });
    }

    private checkDeviceCapabilities(): void {
        const capabilities = this.deviceDetection.getCapabilities();
        
        if (!capabilities.hasWebGL) {
            console.error('WebGL not supported on this device');
            this.showErrorMessage('WebGL is required to play this game');
            return;
        }

        if (capabilities.isLandscape && capabilities.isMobile) {
            console.warn('Device is in landscape mode');
        }

        if (capabilities.maxTextureSize < 2048) {
            console.warn('Device has limited texture size support');
        }
    }

    private handleOrientationChange(): void {
        const capabilities = this.deviceDetection.getCapabilities();
        
        if (capabilities.isMobile && capabilities.isLandscape) {
            console.log('Please rotate device to portrait mode');
        }
        
        const width = Math.min(capabilities.screenWidth, GAME_CONSTANTS.MAX_WIDTH);
        const height = Math.min(capabilities.screenHeight, GAME_CONSTANTS.MAX_HEIGHT);
        
        this.scale.resize(width, height);
    }

    private handleGamePause(): void {
        console.log('Game paused (tab inactive)');
        this.sceneManager.pauseCurrentScene();
        this.sound.pauseAll();
    }

    private handleGameResume(): void {
        console.log('Game resumed (tab active)');
        this.sceneManager.resumeCurrentScene();
        this.sound.resumeAll();
    }

    private setupGlobalEventListeners(): void {
        this.game.events.on('performance-warning', (data: { fps: number; severity: string }) => {
            console.warn(`Performance warning: FPS ${data.fps} (${data.severity})`);
            
            if (data.severity === 'critical') {
                this.handleCriticalPerformance();
            }
        });

        this.game.events.on('scene-ready', (data: { scene: string; previousScene: string }) => {
            console.log(`Scene ready: ${data.scene} (from ${data.previousScene})`);
        });
    }

    private handleCriticalPerformance(): void {
        console.error('Critical performance issue detected');
    }

    private showErrorMessage(message: string): void {
        const errorText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            message,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: `${10 * HD_SCALE}px`,
                color: '#ff0000',
                align: 'center',
                wordWrap: { width: 150 * HD_SCALE }
            }
        ).setOrigin(0.5);

        this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            errorText.width + (20 * HD_SCALE),
            errorText.height + (20 * HD_SCALE),
            0x000000,
            0.8
        ).setOrigin(0.5);

        errorText.setDepth(1);
    }
}