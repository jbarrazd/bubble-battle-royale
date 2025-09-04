import Phaser from 'phaser';
import { IGameConfig } from '@/types/GameTypes';
// import { DeviceDetection } from '@utils/DeviceDetection';

// HD_SCALE: Factor to scale everything for HD quality
export const HD_SCALE = 2.2; // Balanced for visibility and space

// FIXED GAME DIMENSIONS FOR FAIR ONLINE PLAY
// All players will see exactly the same game area
// Using iPhone 11 Pro as base (375x812) with scale for visibility
const SCALE = 2.0;

// Fixed dimensions for consistent gameplay
export const FIXED_GAME_WIDTH = 375 * SCALE;  // 750 units
export const FIXED_GAME_HEIGHT = 812 * SCALE; // 1624 units

// Safe zone matches full game area for now
export const SAFE_ZONE_WIDTH = FIXED_GAME_WIDTH;
export const SAFE_ZONE_HEIGHT = FIXED_GAME_HEIGHT;

export function createGameConfig(scenes: any[]): IGameConfig {
    
    // Detect if running on iOS/Capacitor (kept for reference)
    // const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    // const isCapacitor = (window as any).Capacitor !== undefined;
    
    // Keep these for potential future use
    // const pixelRatio = (isCapacitor && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    // const isMobile = device.getCapabilities().isMobile || isIOS || isCapacitor;
    
    return {
        // Force WebGL for consistent rendering across all platforms
        type: Phaser.WEBGL,
        parent: 'game',
        backgroundColor: '#000000', // Black for letterboxing
        width: FIXED_GAME_WIDTH,
        height: FIXED_GAME_HEIGHT,
        scale: {
            mode: Phaser.Scale.FIT,  // Scale to fit with letterboxing
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: FIXED_GAME_WIDTH,
            height: FIXED_GAME_HEIGHT
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
            // Optimized resolution for performance
            // Lower resolution since bubbles are shown small
            resolution: Math.min(window.devicePixelRatio || 1, 1.5),
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
        input: {
            activePointers: 2,  // Support multi-touch
            smoothFactor: 0,
            windowEvents: false  // Prevent window event conflicts
        }
    };
}

export const GAME_CONSTANTS = {
    BASE_WIDTH: FIXED_GAME_WIDTH,  // Fixed for all devices
    BASE_HEIGHT: FIXED_GAME_HEIGHT,  // Fixed for all devices
    MAX_WIDTH: FIXED_GAME_WIDTH,    // No variation allowed
    MAX_HEIGHT: FIXED_GAME_HEIGHT,   // No variation allowed
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