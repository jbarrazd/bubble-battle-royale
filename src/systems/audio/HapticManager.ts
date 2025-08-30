/**
 * HapticManager - Professional Mobile Haptic Feedback System
 * Provides contextual vibration patterns for enhanced mobile UX
 */

import { AUDIO_CONFIG, HapticIntensity } from '@/config/AudioConfig';

export interface IHapticPattern {
    pattern: number | number[];
    description: string;
}

export class HapticManager {
    private canVibrate: boolean;
    private enabled: boolean = true;
    private vibrateFunction?: (pattern: number | number[]) => boolean;
    
    // Pattern cache for performance
    private patternCache: Map<string, number | number[]> = new Map();
    
    // Usage tracking
    private hapticCount: number = 0;
    private lastHapticTime: number = 0;
    private minHapticInterval: number = 50; // Minimum 50ms between haptics

    constructor() {
        this.detectHapticCapabilities();
        this.initializePatternCache();
        
        console.log(`HapticManager: Initialized with vibration support: ${this.canVibrate}`);
    }

    /**
     * Detect device haptic capabilities
     */
    private detectHapticCapabilities(): void {
        // Check for Vibration API
        this.canVibrate = 'vibrate' in navigator;
        
        if (this.canVibrate) {
            this.vibrateFunction = navigator.vibrate.bind(navigator);
            
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
        if (!this.canVibrate || !this.enabled || !this.shouldAllowHaptic()) {
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
    public bubbleShoot(): boolean {
        const pattern = this.patternCache.get('light');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Bubble attach haptic - Medium pulse
     */
    public bubbleAttach(): boolean {
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
    public matchFound(comboSize: number): boolean {
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
    public victory(): boolean {
        const pattern = this.patternCache.get('victory');
        return pattern ? this.vibrate(pattern) : false;
    }

    /**
     * Defeat haptic - Descending pulse sequence
     */
    public defeat(): boolean {
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
            console.log(`HapticManager: Custom haptic - ${description}`);
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