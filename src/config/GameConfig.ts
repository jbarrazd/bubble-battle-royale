import Phaser from 'phaser';
import { IGameConfig } from '@/types/GameTypes';
import { DeviceDetection } from '@utils/DeviceDetection';

export function createGameConfig(scenes: any[]): IGameConfig {
    const device = DeviceDetection.getInstance();
    const resolution = device.getOptimalResolution();
    
    // Detect if running on iOS/Capacitor
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isCapacitor = (window as any).Capacitor !== undefined;
    const isMobile = device.getCapabilities().isMobile || isIOS || isCapacitor;
    
    // PERFORMANCE: Use device pixel ratio for better performance on Capacitor
    // This renders at native resolution instead of forcing 2x
    const pixelRatio = (isCapacitor && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    
    return {
        // Force WebGL for consistent rendering across all platforms
        type: Phaser.WEBGL,
        parent: 'game',
        backgroundColor: '#1a1a2e',
        width: resolution.width,
        height: resolution.height,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: resolution.width,
            height: resolution.height
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false,
                // iOS-optimized physics with interpolation
            }
        },
        fps: {
            target: 120,  // Target 120 FPS on all platforms
            forceSetTimeOut: false  // Use RAF for better performance
        },
        render: {
            // PERFORMANCE: Optimize for iOS
            antialias: false,  // Disable for better performance
            pixelArt: false,
            roundPixels: false,  // Better performance
            transparent: false,
            clearBeforeRender: true,
            preserveDrawingBuffer: false,
            premultipliedAlpha: true,
            failIfMajorPerformanceCaveat: false,
            powerPreference: 'high-performance',  // Request high-performance GPU
            batchSize: 4096,  // Increased for 120 FPS target
            // Ultra HD resolution for premium quality
            // Using higher resolution for sharper graphics
            resolution: Math.min(window.devicePixelRatio || 1, 3),
            maxLights: 1,  // Minimum required for shader compilation
            maxTextures: -1,
            mipmapFilter: 'LINEAR',
            // CRITICAL iOS PERFORMANCE
            desynchronized: true,  // Better performance for 120 FPS
            autoMobilePipeline: false,  // Disable auto pipeline for consistency
            multiTexture: true,  // Enable for better batching at 120 FPS
            // WebGL specific settings
            antialiasSamples: 0,  // No MSAA for performance
            depth: false,  // We don't need depth buffer
            stencil: false,  // We don't need stencil buffer
            // iOS specific WebGL optimizations
            webGLTimeout: 0,  // Disable WebGL timeout
            forceWebGL1: false  // Use WebGL2 if available
        },
        scene: scenes,
        // iOS-specific optimizations
        audio: {
            disableWebAudio: false,
            noAudio: false
        },
        input: {
            activePointers: 2,  // Support multi-touch
            smoothFactor: 0,
            windowEvents: false  // Prevent window event conflicts
        },
        // Disable features that impact performance
        disableVisibilityChange: false,
        banner: false
    };
}

// HD_SCALE: Factor to scale everything for Ultra HD quality
export const HD_SCALE = 2.5; // Ultra HD quality restored

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