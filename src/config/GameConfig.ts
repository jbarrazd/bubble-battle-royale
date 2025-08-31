import Phaser from 'phaser';
import { IGameConfig } from '@/types/GameTypes';
import { DeviceDetection } from '@utils/DeviceDetection';

export function createGameConfig(scenes: any[]): IGameConfig {
    const device = DeviceDetection.getInstance();
    const resolution = device.getOptimalResolution();
    
    return {
        type: Phaser.WEBGL,  // Force WebGL instead of AUTO
        parent: 'game',
        backgroundColor: '#1a1a2e',
        width: resolution.width,
        height: resolution.height,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: resolution.width,
            height: resolution.height,
            resolution: window.devicePixelRatio || 1  // Use device pixel ratio for HD
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false
            }
        },
        fps: {
            target: 120,  // -1 means unlimited FPS
            forceSetTimeOut: false  // Use RAF for better performance
        },
        render: {
            antialias: true,  // Enable for better quality
            pixelArt: false,
            roundPixels: true,  // Better pixel alignment
            transparent: false,
            clearBeforeRender: true,
            preserveDrawingBuffer: false,
            premultipliedAlpha: true,
            failIfMajorPerformanceCaveat: false,
            powerPreference: 'high-performance',  // Request high-performance GPU
            batchSize: 4096,
            resolution: window.devicePixelRatio || 1,  // High DPI support
            maxLights: 10,
            maxTextures: -1,
            mipmapFilter: 'LINEAR',
            desynchronized: false
        },
        scene: scenes
    };
}

// HD_SCALE: Factor to scale everything for HD quality
export const HD_SCALE = 2;

export const GAME_CONSTANTS = {
    BASE_WIDTH: 375 * HD_SCALE,  // 750 for HD
    BASE_HEIGHT: 667 * HD_SCALE,  // 1334 for HD
    MAX_WIDTH: 414 * HD_SCALE,    // 828 for HD
    MAX_HEIGHT: 896 * HD_SCALE,   // 1792 for HD
    TARGET_FPS: 120,
    HD_SCALE: HD_SCALE,  // Export scale factor
    
    BUBBLE_SIZE: 32 * HD_SCALE,  // 64 for HD
    BUBBLE_SPEED: 800 * HD_SCALE,  // 1600 for HD
    GRID_ROWS: 12,
    GRID_COLS: 11,
    
    COLORS: {
        BACKGROUND: '#1a1a2e',
        UI_PRIMARY: '#f39c12',
        UI_SECONDARY: '#3498db',
        UI_SUCCESS: '#2ecc71',
        UI_DANGER: '#e74c3c',
        UI_TEXT: '#ffffff',
        UI_TEXT_DARK: '#2c3e50'
    },
    
    ANIMATIONS: {
        BUBBLE_POP_DURATION: 200,
        SCENE_TRANSITION_DURATION: 300,
        UI_TRANSITION_DURATION: 200,
        COMBO_DISPLAY_DURATION: 1000
    },
    
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.8,
        MUSIC_VOLUME: 0.5
    },
    
    NETWORKING: {
        SYNC_RATE: 100,
        TIMEOUT: 10000,
        RECONNECT_ATTEMPTS: 3
    }
};

export const QUALITY_PRESETS = {
    low: {
        particleCount: 10,
        particleScale: 0.5,
        shadowsEnabled: false,
        postProcessing: false,
        textureQuality: 0.5,
        maxDrawCalls: 50
    },
    medium: {
        particleCount: 25,
        particleScale: 0.75,
        shadowsEnabled: false,
        postProcessing: false,
        textureQuality: 0.75,
        maxDrawCalls: 100
    },
    high: {
        particleCount: 50,
        particleScale: 1,
        shadowsEnabled: true,
        postProcessing: true,
        textureQuality: 1,
        maxDrawCalls: 200
    }
};