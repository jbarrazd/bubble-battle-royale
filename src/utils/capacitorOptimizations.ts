/**
 * Capacitor-specific optimizations for iOS performance
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import Performance from './performancePlugin';

export class CapacitorOptimizations {
    private static instance: CapacitorOptimizations;
    
    private constructor() {}
    
    public static getInstance(): CapacitorOptimizations {
        if (!CapacitorOptimizations.instance) {
            CapacitorOptimizations.instance = new CapacitorOptimizations();
        }
        return CapacitorOptimizations.instance;
    }
    
    /**
     * Initialize all iOS optimizations
     */
    public async initialize(): Promise<void> {
        if (!Capacitor.isNativePlatform()) {
            console.log('Not running on native platform, skipping optimizations');
            return;
        }
        
        console.log('Initializing Capacitor optimizations for iOS...');
        
        try {
            // Performance optimizations disabled - let iOS handle naturally
            // await this.maximizeDevicePerformance();
            
            // Hide status bar for full screen experience
            await this.hideStatusBar();
            
            // Configure keyboard behavior
            await this.configureKeyboard();
            
            // Handle app state changes
            this.handleAppStateChanges();
            
            // Disable overscroll/bounce effect
            this.disableOverscroll();
            
            // Optimize WebView settings
            this.optimizeWebView();
            
            // Request high performance mode
            this.requestHighPerformance();
            
            console.log('Capacitor optimizations initialized successfully');
        } catch (error) {
            console.error('Error initializing Capacitor optimizations:', error);
        }
    }
    
    /**
     * Maximize device performance using native plugin
     */
    private async maximizeDevicePerformance(): Promise<void> {
        try {
            console.log('Attempting to maximize iOS performance...');
            
            // Get device capabilities first
            const capabilities = await Performance.getDeviceCapabilities();
            console.log('Device capabilities:', capabilities);
            
            // Request maximum performance mode
            const result = await Performance.maximizePerformance();
            console.log('Performance maximization result:', result);
            
            // Log performance status
            if (capabilities.supportsProMotion) {
                console.log('✅ ProMotion 120Hz display enabled');
            }
            if (!capabilities.lowPowerMode) {
                console.log('✅ Low Power Mode is OFF - Full performance available');
            }
            console.log(`✅ CPU Cores: ${capabilities.processorCount}`);
            console.log(`✅ RAM: ${(capabilities.physicalMemory / 1024 / 1024 / 1024).toFixed(1)} GB`);
            
        } catch (error) {
            console.warn('Could not maximize performance:', error);
        }
    }
    
    /**
     * Hide the status bar for immersive experience
     */
    private async hideStatusBar(): Promise<void> {
        try {
            await StatusBar.hide();
            console.log('Status bar hidden');
        } catch (error) {
            console.warn('Could not hide status bar:', error);
        }
    }
    
    /**
     * Configure keyboard behavior
     */
    private async configureKeyboard(): Promise<void> {
        try {
            // Set keyboard to not resize the WebView
            await Keyboard.setResizeMode({ mode: 'none' });
            
            // Hide keyboard accessory bar
            await Keyboard.setAccessoryBarVisible({ isVisible: false });
            
            console.log('Keyboard configured');
        } catch (error) {
            console.warn('Could not configure keyboard:', error);
        }
    }
    
    /**
     * Handle app state changes for performance
     */
    private handleAppStateChanges(): void {
        App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
                console.log('App resumed - resuming game');
                // Resume game logic
                this.onAppResume();
            } else {
                console.log('App paused - pausing game');
                // Pause game logic
                this.onAppPause();
            }
        });
    }
    
    /**
     * Disable overscroll/bounce effect on iOS
     */
    private disableOverscroll(): void {
        if (Capacitor.getPlatform() === 'ios') {
            // Disable bounce effect
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.height = '100%';
            
            // Prevent pull-to-refresh
            document.body.addEventListener('touchmove', (e) => {
                if (e.touches.length > 1) return; // Allow multi-touch
                e.preventDefault();
            }, { passive: false });
            
            console.log('Overscroll disabled');
        }
    }
    
    /**
     * Optimize WebView settings
     */
    private optimizeWebView(): void {
        // Disable text selection
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Disable tap highlight
        document.body.style.webkitTapHighlightColor = 'transparent';
        
        // Enable hardware acceleration
        document.body.style.transform = 'translateZ(0)';
        document.body.style.webkitTransform = 'translateZ(0)';
        
        // Disable touch callouts
        document.body.style.webkitTouchCallout = 'none';
        
        // Set viewport for optimal rendering
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 
                'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
            );
        }
        
        console.log('WebView optimized');
    }
    
    /**
     * Request high performance mode
     */
    private requestHighPerformance(): void {
        // Request wake lock to prevent screen dimming during gameplay
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen').then(() => {
                console.log('Wake lock activated');
            }).catch((err: Error) => {
                console.warn('Wake lock failed:', err);
            });
        }
        
        // REMOVED: Empty RAF loop was consuming resources
        // Phaser already handles its own render loop efficiently
        
        console.log('High performance mode requested');
    }
    
    /**
     * Called when app resumes
     */
    private onAppResume(): void {
        // Resume audio context if needed
        const audioContext = (window as any).audioContext;
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Re-enable wake lock
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.request('screen').catch(() => {});
        }
    }
    
    /**
     * Called when app pauses
     */
    private onAppPause(): void {
        // Pause audio context if needed
        const audioContext = (window as any).audioContext;
        if (audioContext && audioContext.state === 'running') {
            audioContext.suspend();
        }
    }
    
    /**
     * Clean up optimizations
     */
    public destroy(): void {
        // Remove event listeners
        App.removeAllListeners();
        
        // Release wake lock
        if ('wakeLock' in navigator) {
            (navigator as any).wakeLock.release().catch(() => {});
        }
    }
}