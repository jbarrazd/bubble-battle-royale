import { Scene } from 'phaser';

export interface IGameConfig {
    width: number;
    height: number;
    type: number;
    parent: string;
    backgroundColor: string;
    scale: {
        mode: Phaser.Scale.ScaleModes;
        autoCenter: Phaser.Scale.Center;
        width: number;
        height: number;
    };
    physics: {
        default: string;
        arcade: {
            gravity: { x: number; y: number };
            debug: boolean;
        };
    };
    fps?: {
        target: number;
        forceSetTimeOut: boolean;
    };
    render?: any;
    input?: any;
    scene: Scene[];
}

export interface ISceneData {
    transitionFrom?: string;
    transitionDuration?: number;
    data?: Record<string, unknown>;
}

export interface IDeviceCapabilities {
    isTouch: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    isLandscape: boolean;
    isPortrait: boolean;
    hasWebGL: boolean;
    maxTextureSize: number;
    audioSupport: {
        webAudio: boolean;
        audioTag: boolean;
    };
}

export interface IPerformanceMetrics {
    fps: number;
    frameTime: number;
    deltaTime: number;
    drawCalls: number;
    memoryUsage: number | undefined;
}

export interface IAssetManifestItem {
    key: string;
    url: string;
    type: 'image' | 'audio' | 'json' | 'atlas' | 'spritesheet' | 'tilemapJSON';
    data?: Record<string, unknown>;
}

export interface IAssetManifest {
    images: IAssetManifestItem[];
    audio: IAssetManifestItem[];
    atlases: IAssetManifestItem[];
    json: IAssetManifestItem[];
}

export enum SceneKeys {
    BOOT = 'BootScene',
    PRELOAD = 'PreloadScene',
    MENU = 'MenuScene',
    THEME_SELECT = 'ThemeSelectScene',
    GAME = 'GameScene',
    VICTORY = 'VictoryScene',
    SHOP = 'ShopScene'
}

export enum GameEvents {
    SCENE_READY = 'scene-ready',
    SCENE_TRANSITION = 'scene-transition',
    PERFORMANCE_WARNING = 'performance-warning',
    ASSET_LOADED = 'asset-loaded',
    LOADING_COMPLETE = 'loading-complete',
    QUALITY_CHANGED = 'quality-changed'
}

export interface IGameSettings {
    soundEnabled: boolean;
    musicEnabled: boolean;
    vibrationEnabled: boolean;
    quality: 'low' | 'medium' | 'high' | 'auto';
    language: string;
}

export interface IGameState {
    currentScene: string;
    previousScene: string;
    isTransitioning: boolean;
    settings: IGameSettings;
    performance: IPerformanceMetrics;
}