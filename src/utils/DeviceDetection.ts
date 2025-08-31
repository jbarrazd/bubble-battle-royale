import { IDeviceCapabilities } from '@/types/GameTypes';

export class DeviceDetection {
    private static instance: DeviceDetection;
    private capabilities: IDeviceCapabilities;

    private constructor() {
        this.capabilities = this.detectCapabilities();
    }

    public static getInstance(): DeviceDetection {
        if (!DeviceDetection.instance) {
            DeviceDetection.instance = new DeviceDetection();
        }
        return DeviceDetection.instance;
    }

    private detectCapabilities(): IDeviceCapabilities {
        const ua = navigator.userAgent.toLowerCase();
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
        const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
        const isDesktop = !isMobile && !isTablet;
        
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isLandscape = screenWidth > screenHeight;
        const isPortrait = !isLandscape;
        
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const hasWebGL = !!gl;
        
        let maxTextureSize = 2048;
        if (gl && hasWebGL) {
            maxTextureSize = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE);
        }
        
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const hasWebAudio = !!AudioContext;
        const hasAudioTag = !!document.createElement('audio').canPlayType;
        
        return {
            isTouch,
            isMobile,
            isTablet,
            isDesktop,
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth,
            screenHeight,
            isLandscape,
            isPortrait,
            hasWebGL,
            maxTextureSize,
            audioSupport: {
                webAudio: hasWebAudio,
                audioTag: hasAudioTag
            }
        };
    }

    public getCapabilities(): IDeviceCapabilities {
        return { ...this.capabilities };
    }

    public updateOrientation(): void {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        this.capabilities.screenWidth = screenWidth;
        this.capabilities.screenHeight = screenHeight;
        this.capabilities.isLandscape = screenWidth > screenHeight;
        this.capabilities.isPortrait = !this.capabilities.isLandscape;
    }

    public getQualityPreset(): 'low' | 'medium' | 'high' {
        const { isMobile, pixelRatio, maxTextureSize } = this.capabilities;
        
        if (isMobile && pixelRatio > 2 && maxTextureSize >= 4096) {
            return 'high';
        } else if (isMobile || maxTextureSize < 2048) {
            return 'low';
        } else {
            return 'medium';
        }
    }

    public shouldReduceMotion(): boolean {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    public getOptimalResolution(): { width: number; height: number } {
        const HD_SCALE = 2;  // Keep HD quality
        const baseWidth = 375 * HD_SCALE;  // 750 HD
        const baseHeight = 667 * HD_SCALE;  // 1334 HD
        const maxWidth = 414 * HD_SCALE;    // 828 HD
        const maxHeight = 896 * HD_SCALE;   // 1792 HD
        
        const { screenWidth, screenHeight, pixelRatio } = this.capabilities;
        
        let width = Math.min(screenWidth, maxWidth);
        let height = Math.min(screenHeight, maxHeight);
        
        // Use HD resolution for all devices
        width = Math.min(width * HD_SCALE, maxWidth);
        height = Math.min(height * HD_SCALE, maxHeight);
        
        return { width: Math.floor(width), height: Math.floor(height) };
    }
}