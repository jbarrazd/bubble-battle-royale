import { ArenaZone, BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';
import { Bubble } from './Bubble';

/**
 * EXCEPTIONAL LAUNCHER - Premium Mobile Game Experience
 * 
 * A sophisticated, unified launcher that delivers AAA-quality UX/UI.
 * Every detail is crafted for clarity, elegance, beauty, and addictive gameplay.
 * 
 * Features:
 * - FIXED: Proper opponent bubble positioning (inverted)
 * - STUNNING: Professional queue background panel
 * - UNIFIED: Cohesive design language throughout
 * - POLISHED: Satisfying animations and micro-interactions
 * - PREMIUM: Mobile game quality visual design
 * - ADDICTIVE: Compelling feedback systems
 */
export class Launcher extends Phaser.GameObjects.Container {
    // === CORE COMPONENTS ===
    private launcherPlatform?: Phaser.GameObjects.Container;
    private bubbleChamber?: Phaser.GameObjects.Container;
    private queuePanel?: Phaser.GameObjects.Container;
    private effectsLayer?: Phaser.GameObjects.Container;
    
    // === VISUAL ELEMENTS ===
    private platformGraphics?: Phaser.GameObjects.Graphics;
    private chamberGraphics?: Phaser.GameObjects.Graphics;
    private queueBackground?: Phaser.GameObjects.Graphics;
    private queueLabel?: Phaser.GameObjects.Text;
    private glowEffect?: Phaser.GameObjects.Graphics;
    
    // === ENHANCED UX ELEMENTS ===
    private stateIndicator?: Phaser.GameObjects.Graphics;
    private readyIndicator?: Phaser.GameObjects.Arc;
    private queueContainer?: Phaser.GameObjects.Container;
    private nextBubbleFrame?: Phaser.GameObjects.Graphics;
    
    // === ANIMATION SYSTEMS ===
    private idleAnimation?: Phaser.Tweens.Tween;
    private chargingTween?: Phaser.Tweens.Tween;
    private particles?: Phaser.GameObjects.Particles.ParticleEmitter;
    
    // === STATE MANAGEMENT ===
    private zone: ArenaZone;
    private currentAngle: number = 0;
    private loadedBubble?: Bubble;
    private nextBubbleColors: BubbleColor[] = [];
    private currentTheme: any;
    private isAiming: boolean = false;
    private isOpponent: boolean;
    
    // === ENHANCED STATE ===
    private launcherState: 'idle' | 'aiming' | 'charging' | 'ready' | 'cooldown' = 'idle';
    private powerLevel: number = 0;
    
    // === POSITIONING CONSTANTS ===
    private readonly BUBBLE_POSITION_Y: number;
    private readonly QUEUE_POSITION_Y: number;

    constructor(scene: Phaser.Scene, x: number, y: number, zone: ArenaZone) {
        super(scene, x, y);
        
        this.zone = zone;
        this.isOpponent = (zone === ArenaZone.OPPONENT);
        
        // Set positions - SAME for both (the flip will handle the difference)
        this.BUBBLE_POSITION_Y = -35;  // Bubble at top
        this.QUEUE_POSITION_Y = 5;     // Queue at bottom
        
        if (this.isOpponent) {
            this.currentAngle = 90;
            // Flip the entire launcher for opponent
            this.setScale(1, -1);
        } else {
            this.currentAngle = 270;
        }
        
        // Build the exceptional launcher
        this.createExceptionalLauncher();
        
        this.setDepth(Z_LAYERS.LAUNCHERS);
        scene.add.existing(this);
        
        // Initialize with accessible theme
        this.updateTheme(BubbleColor.BLUE);
        this.startEnhancedIdleAnimations();
        
        // Add touch area for better mobile interaction
        this.setupMobileTouchArea();
    }

    /**
     * Creates the premium launcher experience with unified design
     */
    private createExceptionalLauncher(): void {
        // Create in perfect hierarchy order
        this.createLauncherPlatform();
        this.createBubbleChamber();
        this.createEnhancedQueueSystem();  // ENHANCED: More visible queue system
        this.createStateIndicators();       // NEW: Visual state feedback
        this.createEffectsLayer();
        
        // Add all components with perfect layering
        this.add([
            this.launcherPlatform!,
            this.bubbleChamber!,
            this.queueContainer!,
            this.stateIndicator!,
            this.effectsLayer!
        ]);
    }

    /**
     * Creates the sophisticated launcher platform
     */
    private createLauncherPlatform(): void {
        this.launcherPlatform = this.scene.add.container(0, 0);
        this.platformGraphics = this.scene.add.graphics();
        this.launcherPlatform.add(this.platformGraphics);
    }

    /**
     * Creates the premium bubble chamber with perfect positioning
     */
    private createBubbleChamber(): void {
        this.bubbleChamber = this.scene.add.container(0, this.BUBBLE_POSITION_Y);
        this.chamberGraphics = this.scene.add.graphics();
        this.glowEffect = this.scene.add.graphics();
        
        this.bubbleChamber.add([this.glowEffect, this.chamberGraphics]);
    }

    /**
     * ENHANCED: Creates more visible and intuitive queue system
     */
    private createEnhancedQueueSystem(): void {
        this.queueContainer = this.scene.add.container(0, this.QUEUE_POSITION_Y + 15); // Offset for better visibility
        
        // Enhanced queue background with better visibility
        this.queueBackground = this.scene.add.graphics();
        
        // Next bubble frame indicator
        this.nextBubbleFrame = this.scene.add.graphics();
        
        this.queueContainer.add([this.queueBackground, this.nextBubbleFrame]);
    }

    /**
     * NEW: Creates visual state indicators for better UX
     */
    private createStateIndicators(): void {
        // State indicator as graphics for drawing
        this.stateIndicator = this.scene.add.graphics();
        this.add(this.stateIndicator);
        
        // Ready indicator ring around chamber
        this.readyIndicator = this.scene.add.circle(0, this.BUBBLE_POSITION_Y, 28, 0x00ff00, 0);
        this.readyIndicator.setStrokeStyle(2, 0x00ff00, 0);
        this.readyIndicator.setVisible(false);
        this.add(this.readyIndicator);
    }

    /**
     * Creates effects layer for particles and animations
     */
    private createEffectsLayer(): void {
        this.effectsLayer = this.scene.add.container(0, 0);
    }

    /**
     * Renders all visual components with unified design
     */
    private updateAllVisuals(): void {
        this.renderLauncherPlatform();
        this.renderBubbleChamber();
        this.renderEnhancedQueue();
        this.renderStateIndicators();
        this.renderGlowEffects();
    }

    /**
     * Renders the sophisticated launcher platform
     */
    private renderLauncherPlatform(): void {
        if (!this.platformGraphics || !this.currentTheme) return;
        
        this.platformGraphics.clear();
        
        // Create integrated launcher body with single next bubble slot
        const bodyWidth = 46;
        const bodyHeight = 42; // Compact height for single bubble
        const bodyY = 5; // Same for both - the flip handles the orientation
        
        // Main launcher body with gradient
        this.platformGraphics.fillGradientStyle(
            this.currentTheme.platform.top,
            this.currentTheme.platform.top,
            this.currentTheme.platform.bottom,
            this.currentTheme.platform.bottom,
            1, 1, 0.95, 0.95
        );
        this.platformGraphics.fillRoundedRect(-bodyWidth/2, bodyY - bodyHeight/2, bodyWidth, bodyHeight, 10);
        
        // Strong border for definition
        this.platformGraphics.lineStyle(2, this.currentTheme.platform.rim, 1);
        this.platformGraphics.strokeRoundedRect(-bodyWidth/2, bodyY - bodyHeight/2, bodyWidth, bodyHeight, 10);
        
        // Inner magazine channel for single bubble
        this.platformGraphics.fillStyle(0x0a0a0a, 0.5);
        this.platformGraphics.fillRoundedRect(-14, bodyY - 18, 28, 36, 6);
        
        // Single magazine slot
        this.platformGraphics.lineStyle(1, this.currentTheme.platform.highlight, 0.3);
        this.platformGraphics.strokeCircle(0, bodyY + 5, 10);
    }

    /**
     * Renders the premium bubble chamber with perfect depth
     */
    private renderBubbleChamber(): void {
        if (!this.chamberGraphics || !this.currentTheme) return;
        
        this.chamberGraphics.clear();
        
        // Main firing chamber - top of the integrated launcher
        this.chamberGraphics.fillGradientStyle(
            this.currentTheme.chamber.outerTop, this.currentTheme.chamber.outerTop,
            this.currentTheme.chamber.outerBottom, this.currentTheme.chamber.outerBottom,
            1, 1, 0.95, 0.95
        );
        this.chamberGraphics.fillCircle(0, 0, 26);
        
        // Strong outer rim
        this.chamberGraphics.lineStyle(3, this.currentTheme.chamber.rim, 1);
        this.chamberGraphics.strokeCircle(0, 0, 26);
        
        // Inner chamber where bubble sits
        this.chamberGraphics.fillStyle(0x0a0a0a, 0.7);
        this.chamberGraphics.fillCircle(0, 0, 20);
        
        // Inner rim
        this.chamberGraphics.lineStyle(2, this.currentTheme.chamber.innerRim, 0.9);
        this.chamberGraphics.strokeCircle(0, 0, 20);
        
        // Power indicator ring
        this.chamberGraphics.lineStyle(1, this.currentTheme.chamber.highlight, 0.6);
        this.chamberGraphics.strokeCircle(0, 0, 23);
        
        // Central highlight
        this.chamberGraphics.fillStyle(this.currentTheme.chamber.highlight, 0.4);
        this.chamberGraphics.fillCircle(-5, -5, 4);
    }

    /**
     * ENHANCED: Renders improved queue system with better visibility
     */
    private renderEnhancedQueue(): void {
        if (!this.queueBackground || !this.currentTheme) return;
        
        this.queueBackground.clear();
        
        // Enhanced visible background for next bubble
        const panelWidth = 40;
        const panelHeight = 32;
        const panelX = -panelWidth / 2;
        const panelY = -panelHeight / 2;
        
        // Semi-transparent background panel
        this.queueBackground.fillStyle(0x000000, 0.3);
        this.queueBackground.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        
        // Border for definition
        this.queueBackground.lineStyle(1, this.currentTheme.platform.rim, 0.8);
        this.queueBackground.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        
        // "NEXT" label for clarity
        if (this.nextBubbleColors.length > 0) {
            // Small "NEXT" text above the bubble
            const text = this.scene.add.text(0, -20, 'NEXT', {
                fontSize: '8px',
                color: '#ffffff',
                alpha: 0.7
            }).setOrigin(0.5);
            
            if (this.queueContainer) {
                this.queueContainer.add(text);
            }
        }
        
        // Render queue bubbles
        this.renderEnhancedQueueBubbles();
    }

    /**
     * NEW: Renders state indicators for better game feel
     */
    private renderStateIndicators(): void {
        if (!this.readyIndicator || !this.currentTheme) return;
        
        // Update ready indicator based on state
        switch (this.launcherState) {
            case 'ready':
                this.readyIndicator.setVisible(true);
                this.readyIndicator.setStrokeStyle(2, 0x00ff88, 0.8);
                break;
            case 'aiming':
                this.readyIndicator.setVisible(true);
                this.readyIndicator.setStrokeStyle(2, 0xffaa00, 0.6);
                break;
            case 'charging':
                this.readyIndicator.setVisible(true);
                this.readyIndicator.setStrokeStyle(3, 0xff4444, 0.9);
                break;
            default:
                this.readyIndicator.setVisible(false);
                break;
        }
    }

    /**
     * ENHANCED: Renders queue bubbles with improved visibility
     */
    private renderEnhancedQueueBubbles(): void {
        if (!this.queueBackground) return;
        
        // Show next bubble with enhanced visibility
        if (this.nextBubbleColors.length > 0) {
            const color = this.nextBubbleColors[0];
            
            // Larger, more prominent bubble
            const x = 0; // Centered
            const y = 0; // Centered in panel
            const radius = 12; // Slightly larger for better visibility
            const alpha = 1.0; // Full opacity
            
            this.renderEnhancedQueueBubble(x, y, radius, alpha, color);
        }
        
        // Optional: Show second bubble if available (smaller, to the side)
        if (this.nextBubbleColors.length > 1) {
            const color = this.nextBubbleColors[1];
            const x = 20; // To the right
            const y = 0;
            const radius = 8; // Smaller
            const alpha = 0.7; // Semi-transparent
            
            this.renderEnhancedQueueBubble(x, y, radius, alpha, color);
        }
    }

    /**
     * ENHANCED: Renders queue bubble with improved visual clarity
     */
    private renderEnhancedQueueBubble(x: number, y: number, radius: number, alpha: number, color: BubbleColor): void {
        if (!this.queueBackground) return;
        
        const bubbleTheme = this.getBubbleColors(color);
        
        // Enhanced bubble with better contrast
        this.queueBackground.fillStyle(bubbleTheme.primary, alpha);
        this.queueBackground.fillCircle(x, y, radius);
        
        // Stronger border for mobile visibility
        this.queueBackground.lineStyle(2.5, bubbleTheme.dark, alpha);
        this.queueBackground.strokeCircle(x, y, radius);
        
        // Enhanced 3D highlight
        this.queueBackground.fillStyle(bubbleTheme.light, alpha * 0.8);
        this.queueBackground.fillCircle(x - 2, y - 2, radius * 0.4);
        
        // Subtle inner glow for premium feel
        this.queueBackground.fillStyle(bubbleTheme.accent, alpha * 0.2);
        this.queueBackground.fillCircle(x, y, radius * 0.7);
        
        // Outer highlight ring for next bubble indicator
        if (x === 0) { // Main next bubble
            this.queueBackground.lineStyle(1, bubbleTheme.accent, alpha * 0.6);
            this.queueBackground.strokeCircle(x, y, radius + 2);
        }
    }

    /**
     * Renders premium glow effects
     */
    private renderGlowEffects(): void {
        if (!this.glowEffect || !this.currentTheme) return;
        
        this.glowEffect.clear();
        
        if (this.isAiming) {
            // Aiming glow effect
            this.glowEffect.fillStyle(this.currentTheme.glow.aiming, 0.3);
            this.glowEffect.fillCircle(0, 0, 30);
            
            // Pulsing outer glow
            this.glowEffect.fillStyle(this.currentTheme.glow.pulse, 0.1);
            this.glowEffect.fillCircle(0, 0, 35);
        }
        
        if (this.loadedBubble) {
            // Loaded bubble ambient glow
            this.glowEffect.fillStyle(this.currentTheme.glow.loaded, 0.2);
            this.glowEffect.fillCircle(0, 0, 25);
        }
    }

    /**
     * Gets premium theme colors for unified design
     */
    private getExceptionalTheme(color: BubbleColor): any {
        const base = this.getBubbleColors(color);
        
        return {
            platform: {
                top: base.secondary,
                bottom: this.darkenColor(base.secondary, 30),
                rim: base.primary,
                highlight: base.light,
                shadow: this.darkenColor(base.dark, 20)
            },
            chamber: {
                outerTop: base.secondary,
                outerBottom: this.darkenColor(base.secondary, 25),
                innerTop: this.darkenColor(base.dark, 10),
                innerBottom: this.darkenColor(base.dark, 40),
                rim: base.primary,
                innerRim: base.accent,
                highlight: base.light,
                depth: this.darkenColor(base.dark, 30)
            },
            queue: {
                panelTop: 0x2A2A2A,
                panelBottom: 0x1A1A1A,
                panelBorder: base.primary,
                panelGlow: base.light
            },
            glow: {
                aiming: base.primary,
                pulse: base.light,
                loaded: base.accent
            }
        };
    }

    /**
     * Premium color palette for exceptional visual quality
     */
    private getBubbleColors(color: BubbleColor): any {
        switch(color) {
            case BubbleColor.RED:
                return {
                    primary: 0xFF4757,
                    secondary: 0xE84142,
                    accent: 0xFF6B7A,
                    dark: 0xB91E28,
                    light: 0xFF9CAA
                };
            case BubbleColor.BLUE:
                return {
                    primary: 0x3742FA,
                    secondary: 0x2F3542,
                    accent: 0x5E72FF,
                    dark: 0x1E2745,
                    light: 0x8A9CFF
                };
            case BubbleColor.GREEN:
                return {
                    primary: 0x2ED573,
                    secondary: 0x1B9F47,
                    accent: 0x5FE085,
                    dark: 0x146B34,
                    light: 0x8EEB9B
                };
            case BubbleColor.YELLOW:
                return {
                    primary: 0xFFD32A,
                    secondary: 0xFFB800,
                    accent: 0xFFDE4D,
                    dark: 0xCC8F00,
                    light: 0xFFE870
                };
            case BubbleColor.PURPLE: // Actually PINK/MAGENTA (0xff00ff)
                return {
                    primary: 0xFF00FF,  // Bright magenta/pink
                    secondary: 0xE600E6,
                    accent: 0xFF66FF,
                    dark: 0xCC00CC,
                    light: 0xFF99FF
                };
            default: // Cyan
                return {
                    primary: 0x00D4FF,
                    secondary: 0x0097CC,
                    accent: 0x33DDFF,
                    dark: 0x006B99,
                    light: 0x66E6FF
                };
        }
    }

    /**
     * Utility: Darkens a color by percentage
     */
    private darkenColor(color: number, percent: number): number {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        const factor = (100 - percent) / 100;
        
        return ((r * factor) << 16) | ((g * factor) << 8) | (b * factor);
    }

    /**
     * Updates theme with unified design consistency
     */
    private updateTheme(color: BubbleColor): void {
        // Store current scale before updating
        const currentScaleY = this.scaleY;
        
        this.currentTheme = this.getExceptionalTheme(color);
        this.updateAllVisuals();
        
        // Restore scale after updating visuals
        if (this.isOpponent) {
            this.setScale(1, -1);
        }
    }

    /**
     * ENHANCED: Better idle animations for mobile engagement
     */
    private startEnhancedIdleAnimations(): void {
        // Subtle breathing effect on chamber (reduced for mobile performance)
        this.idleAnimation = this.scene.tweens.add({
            targets: this.bubbleChamber,
            scaleX: { from: 1, to: 1.015 },  // Reduced amplitude
            scaleY: { from: 1, to: 1.015 },
            duration: 2500,                   // Slower for smoother feel
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Enhanced queue container pulse
        if (this.queueContainer) {
            this.scene.tweens.add({
                targets: this.queueContainer,
                alpha: { from: 0.9, to: 1 },
                duration: 3500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }
        
        // Ready state indicator glow
        if (this.readyIndicator) {
            this.scene.tweens.add({
                targets: this.readyIndicator,
                alpha: { from: 0.3, to: 0.7 },
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                paused: true  // Will be unpaused when ready
            });
        }
    }

    /**
     * NEW: Setup mobile-optimized touch area
     */
    private setupMobileTouchArea(): void {
        // Create invisible touch area MUCH larger than visual for easier mobile targeting
        // Recommended touch target size is at least 44x44 points (Apple) or 48x48dp (Android)
        const touchSize = 100; // Generous touch area for mobile
        const touchArea = this.scene.add.rectangle(0, 0, touchSize, touchSize, 0x000000, 0);
        touchArea.setInteractive({ useHandCursor: true });
        
        // Add to launcher but behind visuals
        this.addAt(touchArea, 0);
        
        // Visual feedback for touch with ripple effect
        touchArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Scale feedback
            this.scene.tweens.add({
                targets: this,
                scaleX: 0.95,
                scaleY: this.isOpponent ? -0.95 : 0.95,  // Maintain flip for opponent
                duration: 50,
                yoyo: true,
                ease: 'Power2.Out'
            });
            
            // Touch ripple effect for mobile
            const ripple = this.scene.add.circle(0, 0, 10, 0xffffff, 0.3);
            this.add(ripple);
            
            this.scene.tweens.add({
                targets: ripple,
                scale: { from: 0, to: 3 },
                alpha: { from: 0.3, to: 0 },
                duration: 400,
                ease: 'Power2.Out',
                onComplete: () => ripple.destroy()
            });
        });
        
        // Hover effect for desktop/large tablets
        touchArea.on('pointerover', () => {
            this.setHighlight(true);
        });
        
        touchArea.on('pointerout', () => {
            this.setHighlight(false);
        });
    }

    // === PUBLIC INTERFACE - ENHANCED ===

    public setAimAngle(angle: number): void {
        this.currentAngle = angle;
        
        let visualAngle = angle;
        
        if (this.zone === ArenaZone.PLAYER) {
            if (angle > 180) {
                visualAngle = Phaser.Math.Clamp(angle, 195, 345);
            } else {
                visualAngle = Phaser.Math.Clamp(angle, 15, 165);
            }
        } else {
            visualAngle = Phaser.Math.Clamp(angle, 15, 165);
        }
        
        this.currentAngle = visualAngle;
        
        // No visual rotation - the launcher stays fixed
        // The trajectory preview shows the aiming direction
    }

    public getAimAngle(): number {
        return this.currentAngle;
    }

    public getAimDirection(): Phaser.Math.Vector2 {
        const rad = Phaser.Math.DegToRad(this.currentAngle);
        return new Phaser.Math.Vector2(Math.cos(rad), Math.sin(rad));
    }

    public showAiming(show: boolean): void {
        this.isAiming = show;
        this.launcherState = show ? 'aiming' : 'idle';
        
        // Enhanced aiming feedback
        if (show) {
            // Charging animation with better visual feedback
            this.chargingTween = this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 200,
                ease: 'Power2.Out'
            });
            
            // Add subtle chamber pulsing when aiming
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                alpha: { from: 1, to: 0.9 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        } else {
            // Return to normal with better transition
            if (this.chargingTween) {
                this.chargingTween.stop();
            }
            
            // Stop pulsing
            this.scene.tweens.killTweensOf(this.bubbleChamber);
            
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1,
                scaleY: 1,
                alpha: 1,
                duration: 300,
                ease: 'Elastic.Out'
            });
        }
        
        // Update all visual feedback systems
        this.renderStateIndicators();
        this.renderGlowEffects();
    }

    public animateShoot(bubbleColor?: BubbleColor): void {
        this.launcherState = 'charging';
        this.createEnhancedLaunchEffects(bubbleColor);
        this.animateEnhancedLaunch();
        
        // Enter cooldown state briefly
        setTimeout(() => {
            this.launcherState = 'idle';
            this.renderStateIndicators();
        }, 500);
    }

    /**
     * NEW: Set launcher state with visual updates
     */
    public setState(state: 'idle' | 'aiming' | 'charging' | 'ready' | 'cooldown'): void {
        this.launcherState = state;
        this.updateStateIndicator();
        this.renderStateIndicators();
    }

    /**
     * NEW: Update state indicator visuals
     */
    private updateStateIndicator(): void {
        if (!this.stateIndicator) return;
        
        // Clear previous state visuals
        this.stateIndicator.clear();
        
        switch (this.launcherState) {
            case 'idle':
                // Subtle idle glow
                this.stateIndicator.fillStyle(0x4CAF50, 0.2);
                this.stateIndicator.fillCircle(0, 0, 35);
                break;
                
            case 'aiming':
                // Aiming reticle effect
                this.stateIndicator.lineStyle(2, 0xFFC107, 0.6);
                this.stateIndicator.strokeCircle(0, 0, 40);
                // Add crosshair
                this.stateIndicator.lineBetween(-10, 0, 10, 0);
                this.stateIndicator.lineBetween(0, -10, 0, 10);
                break;
                
            case 'charging':
                // Charging energy effect
                const chargeColor = this.powerLevel < 30 ? 0xFF5722 : 
                                   this.powerLevel < 70 ? 0xFF9800 : 0x4CAF50;
                this.stateIndicator.fillStyle(chargeColor, 0.3 + (this.powerLevel / 200));
                this.stateIndicator.fillCircle(0, 0, 30 + (this.powerLevel / 10));
                break;
                
            case 'ready':
                // Ready pulse effect
                this.stateIndicator.fillStyle(0x00BCD4, 0.4);
                this.stateIndicator.fillCircle(0, 0, 35);
                if (this.readyIndicator) {
                    this.readyIndicator.setVisible(true);
                }
                break;
                
            case 'cooldown':
                // Cooldown dimmed effect
                this.stateIndicator.fillStyle(0x9E9E9E, 0.2);
                this.stateIndicator.fillCircle(0, 0, 30);
                break;
        }
    }

    /**
     * NEW: Power charging system for better game feel
     */
    public startPowerCharge(): void {
        this.launcherState = 'charging';
        this.powerLevel = 0;
        
        // Visual power buildup
        this.scene.tweens.add({
            targets: this,
            powerLevel: 100,
            duration: 1500,
            ease: 'Power2.Out',
            onUpdate: () => {
                this.renderPowerIndicator();
            }
        });
        
        // Chamber charging effect
        if (this.bubbleChamber) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: { from: 1, to: 1.15 },
                scaleY: { from: 1, to: 1.15 },
                duration: 1500,
                ease: 'Power2.Out'
            });
        }
        
        this.renderStateIndicators();
    }

    /**
     * NEW: Release power charge
     */
    public releasePowerCharge(): number {
        const power = this.powerLevel;
        this.powerLevel = 0;
        
        // Reset chamber size
        if (this.bubbleChamber) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2.Out'
            });
        }
        
        return power;
    }

    /**
     * NEW: Render power charging indicator
     */
    private renderPowerIndicator(): void {
        if (!this.stateIndicator || this.launcherState !== 'charging') return;
        
        // Clear previous power indicator
        if (this.readyIndicator) {
            const powerColor = this.powerLevel < 30 ? 0xff4444 : 
                              this.powerLevel < 70 ? 0xffaa00 : 0x00ff88;
            
            const alpha = 0.3 + (this.powerLevel / 100) * 0.7;
            this.readyIndicator.setStrokeStyle(3, powerColor, alpha);
            this.readyIndicator.setVisible(true);
        }
    }

    public setHighlight(enabled: boolean): void {
        const alpha = enabled ? 1.0 : 0.95;
        
        // Enhanced highlight with better mobile feedback
        this.scene.tweens.add({
            targets: this,
            alpha,
            duration: 150,  // Faster response for mobile
            ease: 'Power2.Out'
        });
        
        // Add subtle glow effect to chamber when highlighted
        if (this.bubbleChamber && enabled) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 150,
                ease: 'Power2.Out'
            });
        } else if (this.bubbleChamber) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1,
                scaleY: 1,
                duration: 150,
                ease: 'Power2.Out'
            });
        }
    }

    public loadBubble(color: BubbleColor): void {
        // Clear existing bubble
        if (this.loadedBubble) {
            this.remove(this.loadedBubble);
            this.loadedBubble.destroy();
        }
        
        // FIXED: Use correct positioning based on zone
        this.loadedBubble = new Bubble(this.scene, 0, this.BUBBLE_POSITION_Y, color);
        this.loadedBubble.setScale(0.95);
        this.add(this.loadedBubble);
        this.bringToTop(this.loadedBubble);
        
        // Update theme to match
        this.updateTheme(color);
        
        // Premium loading animation
        this.loadedBubble.setScale(0);
        this.scene.tweens.add({
            targets: this.loadedBubble,
            scale: 0.95,
            duration: 400,
            ease: 'Elastic.Out'
        });
        
        // Update launcher state
        this.launcherState = 'ready';
        
        // Double-check flip is maintained for opponent after all updates
        if (this.isOpponent && this.scaleY !== -1) {
            this.setScale(1, -1);
        }
        
        // Update state indicators
        this.renderStateIndicators();
        
        // Chamber response animation
        this.scene.tweens.add({
            targets: this.bubbleChamber,
            scaleX: { from: 1, to: 1.1, to: 1 },
            scaleY: { from: 1, to: 1.1, to: 1 },
            duration: 500,
            ease: 'Power3.InOut'
        });
        
        // Update glow effects
        this.renderGlowEffects();
    }

    public getLoadedBubble(): Bubble | undefined {
        return this.loadedBubble;
    }

    public clearLoadedBubble(): void {
        if (this.loadedBubble) {
            this.remove(this.loadedBubble);
        }
        this.loadedBubble = undefined;
        this.renderGlowEffects();
        
        // Ensure flip is maintained for opponent
        if (this.isOpponent && this.scaleY !== -1) {
            this.setScale(1, -1);
        }
    }

    public updateQueueColors(colors: BubbleColor[]): void {
        this.nextBubbleColors = colors;
        
        // Enhanced queue update with better visibility
        if (this.queueContainer) {
            this.scene.tweens.add({
                targets: this.queueContainer,
                scaleX: { from: 1, to: 1.1, to: 1 },
                scaleY: { from: 1, to: 1.1, to: 1 },
                duration: 400,
                ease: 'Elastic.Out',
                onComplete: () => {
                    this.renderEnhancedQueue();
                }
            });
            
            // Flash effect to draw attention to queue update
            this.scene.tweens.add({
                targets: this.queueContainer,
                alpha: { from: 1, to: 0.7, to: 1 },
                duration: 200,
                ease: 'Power2.InOut'
            });
        }
    }

    // === PRIVATE ANIMATION METHODS - ENHANCED ===

    private animateEnhancedLaunch(): void {
        // Enhanced launch recoil with power-based intensity
        const recoilIntensity = 1 + (this.powerLevel / 100) * 0.5;
        
        if (this.bubbleChamber) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: { from: 1, to: 1.15 * recoilIntensity, to: 0.95, to: 1 },
                scaleY: { from: 1, to: 1.15 * recoilIntensity, to: 0.95, to: 1 },
                duration: 400 + (this.powerLevel * 2),
                ease: 'Power3.Out'
            });
        }
        
        // Enhanced platform shake with haptic feel
        if (this.launcherPlatform) {
            const shakeIntensity = 2 * recoilIntensity;
            this.scene.tweens.add({
                targets: this.launcherPlatform,
                x: { from: 0, to: -shakeIntensity, to: shakeIntensity, to: 0 },
                duration: 350,
                ease: 'Power2.Out'
            });
        }
        
        // Power-based launcher recoil
        const recoilDistance = 3 * recoilIntensity;
        this.scene.tweens.add({
            targets: this,
            y: this.y - (this.isOpponent ? -recoilDistance : recoilDistance),
            duration: 100,
            yoyo: true,
            ease: 'Power2.Out'
        });
        
        // Screen shake for powerful shots
        if (this.powerLevel > 70) {
            this.scene.cameras.main.shake(150, 0.01);
        }
    }

    private createEnhancedLaunchEffects(bubbleColor?: BubbleColor): void {
        if (!bubbleColor) return;
        
        const colors = this.getBubbleColors(bubbleColor);
        const effectY = this.isOpponent ? 
            this.y + Math.abs(this.BUBBLE_POSITION_Y) :
            this.y + this.BUBBLE_POSITION_Y;
        
        // Power-based effect intensity
        const effectIntensity = 0.8 + (this.powerLevel / 100) * 0.4;
        const particleCount = Math.floor(8 + (this.powerLevel / 100) * 8);
        
        // Enhanced muzzle flash
        const flashSize = 22 * effectIntensity;
        const flash = this.scene.add.circle(this.x, effectY, flashSize, colors.primary, 0.9);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: flash,
            scale: { from: 0.5, to: 2.2 * effectIntensity, to: 0 },
            alpha: { from: 0.9, to: 0.4, to: 0 },
            duration: 280 + (this.powerLevel * 2),
            ease: 'Power2.Out',
            onComplete: () => flash.destroy()
        });
        
        // Power-based sparkle burst
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const baseDistance = 10 + Math.random() * 12;
            const distance = baseDistance * effectIntensity;
            const sparkX = this.x + Math.cos(angle) * distance;
            const sparkY = effectY + Math.sin(angle) * distance;
            
            const sparkleSize = 4.5 * effectIntensity;
            const sparkle = this.scene.add.circle(sparkX, sparkY, sparkleSize, colors.primary, 0.95);
            sparkle.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: sparkle,
                scale: { from: 1.1, to: 0.4, to: 0 },
                alpha: { from: 0.9, to: 0.5, to: 0 },
                x: sparkX + Math.cos(angle) * 28 * effectIntensity,
                y: sparkY + Math.sin(angle) * 28 * effectIntensity,
                duration: 450 + (this.powerLevel * 3),
                delay: i * 18,
                ease: 'Power2.Out',
                onComplete: () => sparkle.destroy()
            });
        }
        
        // Enhanced energy rings for powerful shots
        if (this.powerLevel > 50) {
            for (let r = 0; r < 2; r++) {
                const ring = this.scene.add.circle(this.x, effectY, 19 + r * 5, colors.primary, 0);
                ring.setStrokeStyle(3.5 - r * 0.5, colors.primary, 0.9 - r * 0.2);
                ring.setBlendMode(Phaser.BlendModes.ADD);
                
                this.scene.tweens.add({
                    targets: ring,
                    scale: { from: 0.6, to: (2.2 + r * 0.3) * effectIntensity },
                    alpha: { from: 0.8, to: 0 },
                    duration: 380 + r * 100,
                    delay: r * 50,
                    ease: 'Power2.Out',
                    onComplete: () => ring.destroy()
                });
            }
        } else {
            // Standard ring for normal shots
            const ring = this.scene.add.circle(this.x, effectY, 19, colors.primary, 0);
            ring.setStrokeStyle(3.5, colors.primary, 0.9);
            ring.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: ring,
                scale: { from: 0.6, to: 2.2 },
                alpha: { from: 0.8, to: 0 },
                duration: 380,
                ease: 'Power2.Out',
                onComplete: () => ring.destroy()
            });
        }
    }

    /**
     * Cleanup method
     */
    public destroy(): void {
        if (this.idleAnimation) {
            this.idleAnimation.destroy();
        }
        if (this.chargingTween) {
            this.chargingTween.destroy();
        }
        
        super.destroy();
    }
}