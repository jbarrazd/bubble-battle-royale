/**
 * HapticManager - Mobile Haptic Feedback System
 * Provides vibration feedback for mobile devices
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export type HapticIntensity = 'light' | 'medium' | 'strong';

export interface IHapticPattern {
    pattern: number | number[];
    description: string;
}

export class HapticManager {
    private canVibrate: boolean = false;
    private enabled: boolean = true;
    
    // Pattern cache for performance
    private patternCache: Map<string, number | number[]> = new Map();
    
    // Usage tracking
    private hapticCount: number = 0;
    private lastHapticTime: number = 0;
    private minHapticInterval: number = 50; // Minimum 50ms between haptics

    constructor() {
        this.detectHapticCapabilities();
        this.initializePatternCache();
        
        // Check if running on native platform
        const isNative = Capacitor.isNativePlatform();
        console.log(`HapticManager: Initialized - Native: ${isNative}, Vibration API: ${this.canVibrate}`);
    }

    /**
     * Detect device haptic capabilities
     */
    private detectHapticCapabilities(): void {
        // Check for Vibration API
        this.canVibrate = 'vibrate' in navigator;
        
        if (this.canVibrate) {
            
            // Test if vibration actually works (some browsers lie)
            try {
                const testResult = navigator.vibrate(0);
                if (testResult === false) {
                    this.canVibrate = false;
                    console.warn('HapticManager: Device reports vibration support but test failed');
                }
            } catch (error) {
                this.canVibrate = false;
                console.warn('HapticManager: Vibration API test failed:', error);
            }
        }
        
        // Check for GamepadHapticActuator (future enhancement)
        if ('getGamepads' in navigator) {
            // Future: Support for controller haptics
        }
    }

    /**
     * Initialize pattern cache for performance
     */
    private initializePatternCache(): void {
        const patterns = AUDIO_CONFIG.HAPTICS;
        
        this.patternCache.set('light', patterns.LIGHT.pattern);
        this.patternCache.set('medium', patterns.MEDIUM.pattern);
        this.patternCache.set('strong', patterns.STRONG.pattern);
        this.patternCache.set('doubleTap', patterns.DOUBLE_TAP.pattern);
        this.patternCache.set('victory', patterns.VICTORY.pattern);
        this.patternCache.set('defeat', patterns.DEFEAT.pattern);
        this.patternCache.set('powerUp', patterns.POWER_UP.pattern);
    }

    /**
     * Basic vibration with pattern
     */
    public vibrate(pattern: number | number[]): boolean {
        if (!this.enabled || !this.shouldAllowHaptic()) {
            return false;
        }

        // Use Capacitor Haptics for native platforms
        if (Capacitor.isNativePlatform()) {
            this.vibrateNative(pattern);
            return true;
        }
        
        // Fallback to Web Vibration API
        if (!this.canVibrate) {
            return false;
        }

        try {
            const result = navigator.vibrate(pattern);
            if (result) {
                this.hapticCount++;
                this.lastHapticTime = Date.now();
            }
            return result;
        } catch (error) {
            console.warn('HapticManager: Vibration failed:', error);
            return false;
        }
    }
    
    /**
     * Native haptic feedback using Capacitor
     */
    private async vibrateNative(pattern: number | number[]): Promise<void> {
        try {
            const duration = Array.isArray(pattern) ? pattern[0] : pattern;
            
            // Map duration to impact style
            let style: ImpactStyle;
            if (duration <= 10) {
                style = ImpactStyle.Light;
            } else if (duration <= 30) {
                style = ImpactStyle.Medium;
            } else {
                style = ImpactStyle.Heavy;
            }
            
            await Haptics.impact({ style });
            this.hapticCount++;
            this.lastHapticTime = Date.now();
        } catch (error) {
            console.warn('HapticManager: Native haptic failed:', error);
        }
    }

    /**
     * Check if haptic feedback should be allowed (rate limiting)
     */
    private shouldAllowHaptic(): boolean {
        const now = Date.now();
        return (now - this.lastHapticTime) >= this.minHapticInterval;
    }

    // === GAME-SPECIFIC HAPTIC METHODS ===

    /**
     * Bubble shoot haptic - Light tap
     */
    public async bubbleShoot(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.impact({ style: ImpactStyle.Light });
                this.hapticCount++;
                this.lastHapticTime = Date.now();
                return true;
            } catch (error) {
                console.warn('Bubble shoot haptic failed:', error);
                return false;
            }
        }
        const pattern = this.patternCache.get('light');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Bubble attach haptic - Medium pulse
     */
    public async bubbleAttach(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.impact({ style: ImpactStyle.Medium });
                this.hapticCount++;
                this.lastHapticTime = Date.now();
                return true;
            } catch (error) {
                console.warn('Bubble attach haptic failed:', error);
                return false;
            }
        }
        const pattern = this.patternCache.get('medium');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * UI click haptic - Light tap
     */
    public uiClick(): boolean {
        const pattern = this.patternCache.get('light');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Match found haptic - Scales with combo size
     */
    public async matchFound(comboSize: number): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            try {
                const style = comboSize >= 5 ? ImpactStyle.Heavy : 
                             comboSize >= 4 ? ImpactStyle.Medium : 
                             ImpactStyle.Light;
                await Haptics.impact({ style });
                this.hapticCount++;
                this.lastHapticTime = Date.now();
                return true;
            } catch (error) {
                console.warn('Match found haptic failed:', error);
                return false;
            }
        }
        const baseIntensity = AUDIO_CONFIG.HAPTICS.COMBO_BASE;
        const multiplier = AUDIO_CONFIG.HAPTICS.COMBO_MULTIPLIER;
        const intensity = Math.min(baseIntensity + (comboSize * multiplier), 100);
        
        return this.vibrate(intensity);
    }

    /**
     * Power-up activation haptic - Triple pulse pattern
     */
    public powerUpActivated(): boolean {
        const pattern = this.patternCache.get('powerUp');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Victory haptic - Ascending pulse sequence
     */
    public async victory(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.notification({ type: NotificationType.Success });
                this.hapticCount++;
                this.lastHapticTime = Date.now();
                return true;
            } catch (error) {
                console.warn('Victory haptic failed:', error);
                return false;
            }
        }
        const pattern = this.patternCache.get('victory');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Defeat haptic - Descending pulse sequence
     */
    public async defeat(): Promise<boolean> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.notification({ type: NotificationType.Error });
                this.hapticCount++;
                this.lastHapticTime = Date.now();
                return true;
            } catch (error) {
                console.warn('Defeat haptic failed:', error);
                return false;
            }
        }
        const pattern = this.patternCache.get('defeat');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Danger warning haptic - Strong pulse
     */
    public dangerWarning(): boolean {
        const pattern = this.patternCache.get('strong');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Combo chain haptic - Progressive intensity
     */
    public comboChain(chainLength: number): boolean {
        // Create dynamic pattern based on chain length
        const pattern: number[] = [];
        for (let i = 0; i < Math.min(chainLength, 5); i++) {
            const intensity = 20 + (i * 10);
            pattern.push(intensity);
            if (i < chainLength - 1) {
                pattern.push(10); // Short pause between pulses
            }
        }
        
        return this.vibrate(pattern);
    }

    /**
     * Floating bubbles drop haptic - Subtle pulse
     */
    public floatingBubblesDrop(count: number): boolean {
        if (count <= 0) return false;
        
        // Scale intensity with drop count
        const intensity = Math.min(15 + (count * 5), 50);
        return this.vibrate(intensity);
    }

    /**
     * Wall bounce haptic - Quick tap
     */
    public wallBounce(): boolean {
        return this.vibrate(8); // Very light for wall bounces
    }

    /**
     * Projectile collision haptic - Medium pulse
     */
    public projectileCollision(): boolean {
        return this.vibrate(20);
    }

    /**
     * Game over haptic - Strong final pulse
     */
    public gameOver(isVictory: boolean): boolean {
        if (isVictory) {
            return this.victory();
        } else {
            return this.defeat();
        }
    }

    // === INTENSITY-BASED METHODS ===

    /**
     * Simple intensity-based haptic
     */
    public hapticByIntensity(intensity: HapticIntensity): boolean {
        const pattern = this.patternCache.get(intensity);
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Custom pattern haptic
     */
    public customPattern(pattern: number | number[], description?: string): boolean {
        if (description) {
            // console.log(`HapticManager: Custom haptic - ${description}`);
        }
        return this.vibrate(pattern);
    }

    // === SETTINGS AND CONTROL ===

    /**
     * Enable/disable haptic feedback
     */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        
        if (!enabled) {
            // Stop any ongoing vibration
            this.stopVibration();
        }
        
        console.log(`HapticManager: Haptic feedback ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get enabled state
     */
    public isEnabled(): boolean {
        return this.enabled && this.canVibrate;
    }

    /**
     * Check if device supports haptics
     */
    public isSupported(): boolean {
        return this.canVibrate;
    }

    /**
     * Stop any ongoing vibration
     */
    public stopVibration(): void {
        if (this.canVibrate) {
            try {
                navigator.vibrate(0);
            } catch (error) {
                console.warn('HapticManager: Failed to stop vibration:', error);
            }
        }
    }

    /**
     * Set minimum interval between haptics (rate limiting)
     */
    public setMinInterval(milliseconds: number): void {
        this.minHapticInterval = Math.max(0, milliseconds);
    }

    /**
     * Test haptic functionality
     */
    public testHaptic(): boolean {
        console.log('HapticManager: Testing haptic functionality...');
        const testPattern = [50, 50, 50];
        const result = this.vibrate(testPattern);
        
        setTimeout(() => {
            console.log(`HapticManager: Test ${result ? 'successful' : 'failed'}`);
        }, 200);
        
        return result;
    }

    // === PERFORMANCE AND STATS ===

    /**
     * Get haptic usage statistics
     */
    public getStats(): {
        supported: boolean;
        enabled: boolean;
        totalHaptics: number;
        lastHapticTime: number;
        minInterval: number;
    } {
        return {
            supported: this.canVibrate,
            enabled: this.enabled,
            totalHaptics: this.hapticCount,
            lastHapticTime: this.lastHapticTime,
            minInterval: this.minHapticInterval
        };
    }

    /**
     * Reset haptic statistics
     */
    public resetStats(): void {
        this.hapticCount = 0;
        this.lastHapticTime = 0;
    }

    /**
     * Get device haptic capabilities info
     */
    public getCapabilities(): {
        vibrationAPI: boolean;
        gamepadHaptics: boolean;
        platform: string;
    } {
        return {
            vibrationAPI: 'vibrate' in navigator,
            gamepadHaptics: 'getGamepads' in navigator,
            platform: navigator.platform || 'unknown'
        };
    }

    /**
     * Clean up resources
     */
    public destroy(): void {
        this.stopVibration();
        this.patternCache.clear();
        this.enabled = false;
        
        console.log('HapticManager: Destroyed');
    }
}