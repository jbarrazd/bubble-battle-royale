import { ArenaZone, BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';
import { HD_SCALE } from '@/config/GameConfig';
import { Bubble } from './Bubble';
import { PowerUpType } from '@/systems/powerups/PowerUpManager';

// Arsenal slot interface for integrated weapon system
interface ArsenalSlot {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Text;
    countText: Phaser.GameObjects.Text;
    energyConduit?: Phaser.GameObjects.Graphics;
    position: { x: number, y: number };
    powerUpType: PowerUpType | undefined;
    count: number;
    isActive: boolean;
    cooldownOverlay?: Phaser.GameObjects.Graphics;
    progressArc?: Phaser.GameObjects.Graphics;
}

/**
 * EXCEPTIONAL LAUNCHER - Premium Mobile-First Game Experience
 * 
 * A sophisticated, unified launcher optimized for mobile devices (375x667px).
 * Every detail is crafted for mobile clarity, accessibility, and engaging gameplay.
 * 
 * MOBILE-FIRST DESIGN PRINCIPLES:
 * - INTEGRATED: Uses existing BUBBLE_POSITION_Y (-35) for loaded bubble
 * - UNIFIED: Uses existing QUEUE_POSITION_Y (5) for next bubble preview
 * - ACCESSIBLE: 120px touch areas exceed Apple/Android minimums (44px/48dp)
 * - CLEAR: Visual hierarchy clearly distinguishes loaded vs next bubble
 * - OPTIMIZED: Larger text, thicker borders, enhanced contrast for mobile
 * - ENGAGING: Premium animations and feedback designed for mobile sessions
 * 
 * VISUAL HIERARCHY:
 * - TOP (-35px): Main firing chamber with loaded bubble (ready to shoot)
 * - BOTTOM (5px): Integrated queue chamber with next bubble (preview)
 * - UNIFIED DESIGN: Single cohesive launcher body connects both chambers
 * 
 * MOBILE UX FEATURES:
 * - 120px touch areas for excellent mobile accessibility
 * - Enhanced visual feedback with satisfying animations
 * - Clear state indicators (idle, aiming, charging, ready, cooldown)
 * - Premium mobile interactions with haptic-like feedback
 * - Optimized performance for mobile devices
 */
export class Launcher extends Phaser.GameObjects.Container {
    // === CORE COMPONENTS ===
    private launcherPlatform?: Phaser.GameObjects.Container;
    private bubbleChamber?: Phaser.GameObjects.Container;
    private queuePanel?: Phaser.GameObjects.Container;
    private effectsLayer?: Phaser.GameObjects.Container;
    
    // === VISUAL ELEMENTS ===
    private platformGraphics: Phaser.GameObjects.Graphics | undefined;
    private chamberGraphics: Phaser.GameObjects.Graphics | undefined;
    private queueBackground: Phaser.GameObjects.Graphics | undefined;
    private queueLabel?: Phaser.GameObjects.Text;
    private glowEffect: Phaser.GameObjects.Graphics | undefined;
    
    // === ENHANCED UX ELEMENTS ===
    private stateIndicator: Phaser.GameObjects.Graphics | undefined;
    private readyIndicator: Phaser.GameObjects.Arc | undefined;
    private queueContainer?: Phaser.GameObjects.Container;
    private nextBubbleFrame: Phaser.GameObjects.Graphics | undefined;
    private nextBubbleGraphics: Phaser.GameObjects.Graphics | undefined;
    private secondBubbleGraphics: Phaser.GameObjects.Graphics | undefined;
    
    // === ARSENAL INTEGRATION ===
    private arsenalSlots: ArsenalSlot[] = [];
    private weaponRing?: Phaser.GameObjects.Container;
    private energyConduits: Phaser.GameObjects.Graphics | undefined;
    private activePowerUp?: PowerUpType;
    private arsenalContainer?: Phaser.GameObjects.Container;
    
    // === ANIMATION SYSTEMS ===
    private idleAnimation?: Phaser.Tweens.Tween;
    private chargingTween?: Phaser.Tweens.Tween;
    private particles?: Phaser.GameObjects.Particles.ParticleEmitter;
    
    // === STATE MANAGEMENT ===
    private zone: ArenaZone;
    private currentAngle: number = 0;
    private loadedBubble: Bubble | undefined;
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
    
    // === ARSENAL POSITIONING ===
    // Better spacing: more separation between slots
    private readonly ARSENAL_POSITIONS_PLAYER = [
        { x: 53 * HD_SCALE, y: -20 * HD_SCALE },     // Lower position
        { x: 88 * HD_SCALE, y: -20 * HD_SCALE },     // 35 unit spacing between slots
        { x: 123 * HD_SCALE, y: -20 * HD_SCALE }     // Max 123 to stay within bounds
    ];
    private readonly ARSENAL_POSITIONS_OPPONENT = [
        { x: -53 * HD_SCALE, y: -20 * HD_SCALE },    // Mirror positions for opponent
        { x: -88 * HD_SCALE, y: -20 * HD_SCALE },
        { x: -123 * HD_SCALE, y: -20 * HD_SCALE }
    ];
    private readonly SLOT_SIZE = 25 * HD_SCALE;  // Further reduced for better spacing
    
    // Power-up icons
    private powerUpIcons: Record<PowerUpType, string> = {
        [PowerUpType.RAINBOW]: '🌈',
        [PowerUpType.BOMB]: '💣',
        [PowerUpType.LIGHTNING]: '⚡',
        [PowerUpType.FREEZE]: '❄️',
        [PowerUpType.LASER]: '🎯',
        [PowerUpType.MULTIPLIER]: '✨',
        [PowerUpType.SHIELD]: '🛡️',
        [PowerUpType.MAGNET]: '🧲'
    };

    constructor(scene: Phaser.Scene, x: number, y: number, zone: ArenaZone) {
        super(scene, x, y);
        
        this.zone = zone;
        this.isOpponent = (zone === ArenaZone.OPPONENT);
        
        // MOBILE-FIRST POSITIONING: Optimized for 375x667px mobile screens
        this.BUBBLE_POSITION_Y = -28 * HD_SCALE;  // Main chamber position
        this.QUEUE_POSITION_Y = 25 * HD_SCALE;     // Queue loading chamber position
        
        if (this.isOpponent) {
            this.currentAngle = 90;
            // Flip the entire launcher for opponent
            this.setScale(1, -1);
        } else {
            this.currentAngle = 270;
        }
        
        // Build the exceptional launcher
        this.createExceptionalLauncher();
        
        // Create integrated arsenal for both player and opponent
        this.createIntegratedArsenal();
        
        this.setDepth(Z_LAYERS.LAUNCHERS);
        scene.add.existing(this);
        
        // Initialize with accessible theme
        this.updateTheme(BubbleColor.BLUE);
        this.startEnhancedIdleAnimations();
        
        // Setup arsenal event listeners
        this.setupArsenalListeners();
        
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
     * ENHANCED: Mobile-first integrated queue system using proper positioning
     */
    private createEnhancedQueueSystem(): void {
        // Use the defined QUEUE_POSITION_Y properly - no arbitrary offset
        this.queueContainer = this.scene.add.container(0, this.QUEUE_POSITION_Y);
        
        // Enhanced queue background with mobile-optimized design
        this.queueBackground = this.scene.add.graphics();
        
        // Next bubble frame indicator with better mobile visibility
        this.nextBubbleFrame = this.scene.add.graphics();
        
        this.queueContainer.add([this.queueBackground, this.nextBubbleFrame]);
        
        // No rotation on the whole container - bubbles will have their own animations
    }

    /**
     * NEW: Creates visual state indicators for better UX
     */
    private createStateIndicators(): void {
        // State indicator as graphics for drawing
        this.stateIndicator = this.scene.add.graphics();
        this.add(this.stateIndicator);
        
        // Ready indicator ring around chamber - no default color
        this.readyIndicator = this.scene.add.circle(0, this.BUBBLE_POSITION_Y, 28 * HD_SCALE, 0x000000, 0);
        this.readyIndicator.setStrokeStyle(2 * HD_SCALE, 0x000000, 0);
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
        
        // Create a compact integrated launcher design
        const topY = this.BUBBLE_POSITION_Y;
        const bottomY = this.QUEUE_POSITION_Y;
        const height = Math.abs(bottomY - topY);
        
        // Energy flow tube connecting chambers
        const columnWidth = 24 * HD_SCALE;
        
        // Draw energy conduit
        this.platformGraphics.fillGradientStyle(
            this.currentTheme.platform.top,
            this.currentTheme.platform.top,
            this.currentTheme.platform.bottom,
            this.currentTheme.platform.bottom,
            1, 1, 0.7, 0.7
        );
        this.platformGraphics.fillRoundedRect(
            -columnWidth/2, 
            topY + (14 * HD_SCALE), 
            columnWidth, 
            height - (22 * HD_SCALE), 
            8 * HD_SCALE
        );
        
        // Energy flow lines
        this.platformGraphics.lineStyle(1 * HD_SCALE, this.currentTheme.chamber.highlight, 0.3);
        this.platformGraphics.lineBetween(-columnWidth/3, topY + 20 * HD_SCALE, -columnWidth/3, bottomY - 10 * HD_SCALE);
        this.platformGraphics.lineBetween(columnWidth/3, topY + 20 * HD_SCALE, columnWidth/3, bottomY - 10 * HD_SCALE);
        
        // Subtle border
        this.platformGraphics.lineStyle(1 * HD_SCALE, this.currentTheme.platform.rim, 0.3);
        this.platformGraphics.strokeRoundedRect(
            -columnWidth/2, 
            topY + (14 * HD_SCALE), 
            columnWidth, 
            height - (22 * HD_SCALE), 
            8 * HD_SCALE
        );
    }

    /**
     * Renders the premium bubble chamber with perfect depth
     */
    private renderBubbleChamber(): void {
        if (!this.chamberGraphics || !this.currentTheme) return;
        
        this.chamberGraphics.clear();
        
        // Chamber - more prominent than queue
        const chamberRadius = 24 * HD_SCALE;
        const innerRadius = 16 * HD_SCALE;
        
        // Gradient background
        this.chamberGraphics.fillGradientStyle(
            this.currentTheme.chamber.outerTop,
            this.currentTheme.chamber.outerTop,
            this.currentTheme.chamber.outerBottom,
            this.currentTheme.chamber.outerBottom,
            1, 1, 0.9, 0.9
        );
        this.chamberGraphics.fillCircle(0, 0, chamberRadius);
        
        // Strong rim for the chamber
        this.chamberGraphics.lineStyle(3 * HD_SCALE, this.currentTheme.chamber.rim, 1);
        this.chamberGraphics.strokeCircle(0, 0, chamberRadius);
        
        // Inner chamber where bubble sits
        this.chamberGraphics.fillStyle(0x0a0a0a, 0.9);
        this.chamberGraphics.fillCircle(0, 0, innerRadius);
        
        // Inner rim accent
        this.chamberGraphics.lineStyle(2 * HD_SCALE, this.currentTheme.chamber.innerRim, 0.8);
        this.chamberGraphics.strokeCircle(0, 0, innerRadius);
        
        // Power indicator ring
        this.chamberGraphics.lineStyle(1 * HD_SCALE, this.currentTheme.chamber.highlight, 0.5);
        this.chamberGraphics.strokeCircle(0, 0, innerRadius + (3 * HD_SCALE));
        
        // Highlight dot
        this.chamberGraphics.fillStyle(this.currentTheme.chamber.highlight, 0.4);
        this.chamberGraphics.fillCircle(-5 * HD_SCALE, -5 * HD_SCALE, 3 * HD_SCALE);
    }

    /**
     * MOBILE-FIRST: Renders integrated queue with optimal mobile visibility
     */
    private renderEnhancedQueue(): void {
        if (!this.queueBackground || !this.currentTheme) return;
        
        this.queueBackground.clear();
        
        // Create a circular loading chamber similar to main chamber
        const queueRadius = 20 * HD_SCALE;
        const innerRadius = 14 * HD_SCALE;
        
        // Gradient background matching launcher style
        this.queueBackground.fillGradientStyle(
            this.currentTheme.chamber.outerTop,
            this.currentTheme.chamber.outerTop,
            this.currentTheme.chamber.outerBottom,
            this.currentTheme.chamber.outerBottom,
            0.8, 0.8, 0.6, 0.6
        );
        this.queueBackground.fillCircle(0, 0, queueRadius);
        
        // Rim matching launcher theme
        this.queueBackground.lineStyle(2.5 * HD_SCALE, this.currentTheme.chamber.rim, 0.8);
        this.queueBackground.strokeCircle(0, 0, queueRadius);
        
        // Inner chamber where bubbles queue
        this.queueBackground.fillStyle(0x0a0a0a, 0.7);
        this.queueBackground.fillCircle(0, 0, innerRadius);
        
        // Inner rim accent
        this.queueBackground.lineStyle(1.5 * HD_SCALE, this.currentTheme.chamber.innerRim, 0.6);
        this.queueBackground.strokeCircle(0, 0, innerRadius);
        
        // Loading indicator arc (animated)
        this.queueBackground.lineStyle(1 * HD_SCALE, this.currentTheme.chamber.highlight, 0.4);
        this.queueBackground.strokeCircle(0, 0, innerRadius + (2 * HD_SCALE));
        
        // Small highlight dots for depth
        this.queueBackground.fillStyle(this.currentTheme.chamber.highlight, 0.3);
        this.queueBackground.fillCircle(-4 * HD_SCALE, -4 * HD_SCALE, 2 * HD_SCALE);
        
        // Render queue bubbles
        this.renderEnhancedQueueBubbles();
    }

    /**
     * NEW: Renders state indicators for better game feel
     */
    private renderStateIndicators(): void {
        if (!this.readyIndicator) return;
        
        // Don't show indicator if we don't have a theme yet
        if (!this.currentTheme) {
            this.readyIndicator.setVisible(false);
            return;
        }
        
        // Update ready indicator based on state - using theme colors
        switch (this.launcherState) {
            case 'ready':
                this.readyIndicator.setVisible(true);
                // Use the current bubble's theme color instead of hardcoded green
                this.readyIndicator.setStrokeStyle(2, this.currentTheme.platform.rim, 0.8);
                break;
            case 'aiming':
                this.readyIndicator.setVisible(true);
                // Use accent color for aiming
                this.readyIndicator.setStrokeStyle(2, this.currentTheme.glow.aiming, 0.6);
                break;
            case 'charging':
                this.readyIndicator.setVisible(true);
                // Use pulse color for charging
                this.readyIndicator.setStrokeStyle(3, this.currentTheme.glow.pulse, 0.9);
                break;
            default:
                this.readyIndicator.setVisible(false);
                break;
        }
    }

    /**
     * MOBILE-OPTIMIZED: Renders queue bubbles side by side
     */
    private renderEnhancedQueueBubbles(): void {
        if (!this.queueBackground || !this.queueContainer) return;
        
        // Render bubbles side by side horizontally
        if (this.nextBubbleColors.length > 0 && this.nextBubbleColors[0]) {
            this.createNextBubble(this.nextBubbleColors[0]);
        }
        
        if (this.nextBubbleColors.length > 1 && this.nextBubbleColors[1]) {
            this.createSecondBubble(this.nextBubbleColors[1]);
        }
    }
    
    /**
     * Create the main next bubble
     */
    private createNextBubble(color: BubbleColor): void {
        if (!this.queueContainer) return;
        
        // Clear any existing graphics first
        if (this.nextBubbleGraphics) {
            this.nextBubbleGraphics.destroy();
            this.nextBubbleGraphics = undefined;
        }
        
        const bubbleGraphics = this.scene.add.graphics();
        this.queueContainer.add(bubbleGraphics);
        this.nextBubbleGraphics = bubbleGraphics;
        
        // Center position for main queue bubble
        bubbleGraphics.x = 0;
        bubbleGraphics.y = 0;
        
        // Draw the next bubble - larger, ready to move up
        const radius = 11 * HD_SCALE;  // Good size for next bubble
        this.drawQueueBubble(bubbleGraphics, 0, 0, radius, 1, color);
        
        // Set initial scale to 0 for animation
        bubbleGraphics.setScale(0);
        
        // Animate appearance with rotation for loading effect
        this.scene.tweens.add({
            targets: bubbleGraphics,
            scale: 1,
            rotation: Math.PI * 2,
            duration: 400,
            ease: 'Back.easeOut'
        });
        
        // Add pulsing effect to show it's ready
        this.scene.tweens.add({
            targets: bubbleGraphics,
            scale: { from: 1, to: 1.08 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
            delay: 400
        });
    }
    
    /**
     * Create the small second bubble
     */
    private createSecondBubble(color: BubbleColor): void {
        if (!this.queueContainer) return;
        
        // Clear any existing graphics first
        if (this.secondBubbleGraphics) {
            this.secondBubbleGraphics.destroy();
            this.secondBubbleGraphics = undefined;
        }
        
        const bubbleGraphics = this.scene.add.graphics();
        // Add behind the main bubble
        this.queueContainer.addAt(bubbleGraphics, 0);
        this.secondBubbleGraphics = bubbleGraphics;
        
        // Position offset to the side - visible but smaller
        bubbleGraphics.x = 9 * HD_SCALE;
        bubbleGraphics.y = 7 * HD_SCALE;
        
        // Draw the small bubble - smaller, waiting its turn
        const radius = 7 * HD_SCALE;  // Smaller bubble but visible
        this.drawQueueBubble(bubbleGraphics, 0, 0, radius, 0.7, color);
        
        // Set initial scale to 0 for animation
        bubbleGraphics.setScale(0);
        
        // Animate appearance
        this.scene.tweens.add({
            targets: bubbleGraphics,
            scale: 0.65,  // Keep it smaller
            duration: 400,
            ease: 'Back.easeOut'
        });
        
        // Gentle floating motion for dynamic feel
        this.scene.tweens.add({
            targets: bubbleGraphics,
            y: bubbleGraphics.y - 1.5 * HD_SCALE,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut',
            delay: 200
        });
    }
    
    /**
     * Reset all queue bubbles
     */
    private resetQueueBubbles(): void {
        if (this.nextBubbleGraphics) {
            this.scene.tweens.add({
                targets: this.nextBubbleGraphics,
                alpha: 0,
                scale: 0.5,
                duration: 150,
                ease: 'Power2.In',
                onComplete: () => {
                    this.nextBubbleGraphics?.destroy();
                    this.nextBubbleGraphics = undefined;
                }
            });
        }
        
        if (this.secondBubbleGraphics) {
            this.scene.tweens.add({
                targets: this.secondBubbleGraphics,
                alpha: 0,
                scale: 0.5,
                duration: 150,
                ease: 'Power2.In',
                onComplete: () => {
                    this.secondBubbleGraphics?.destroy();
                    this.secondBubbleGraphics = undefined;
                }
            });
        }
    }
    
    /**
     * Draw queue bubble on graphics object
     */
    private drawQueueBubble(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, alpha: number, color: BubbleColor): void {
        const bubbleTheme = this.getBubbleColors(color);
        
        // Main bubble fill with correct color
        graphics.fillStyle(bubbleTheme.primary);
        graphics.fillCircle(x, y, radius);
        
        // Strong border
        graphics.lineStyle(2 * HD_SCALE, bubbleTheme.dark, 0.9);
        graphics.strokeCircle(x, y, radius);
        
        // Highlight spot
        graphics.fillStyle(bubbleTheme.light);
        graphics.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.35);
        
        // Inner glow
        graphics.fillStyle(bubbleTheme.accent, 0.4);
        graphics.fillCircle(x, y, radius * 0.6);
        
        // Set overall alpha
        graphics.setAlpha(alpha);
    }
    
    /**
     * Draw small queue bubble on graphics object
     */
    private drawSmallQueueBubble(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, alpha: number, color: BubbleColor): void {
        // Just use the same method as the main bubble for consistency
        this.drawQueueBubble(graphics, x, y, radius, alpha, color);
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
            this.glowEffect.fillCircle(0, 0, 30 * HD_SCALE);
            
            // Pulsing outer glow
            this.glowEffect.fillStyle(this.currentTheme.glow.pulse, 0.1);
            this.glowEffect.fillCircle(0, 0, 35 * HD_SCALE);
        }
        
        if (this.loadedBubble) {
            // Loaded bubble ambient glow
            this.glowEffect.fillStyle(this.currentTheme.glow.loaded, 0.2);
            this.glowEffect.fillCircle(0, 0, 25 * HD_SCALE);
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
     * MOBILE-OPTIMIZED: Enhanced idle animations with clear visual hierarchy
     */
    private startEnhancedIdleAnimations(): void {
        // Optimized breathing effect - more visible on mobile without performance impact
        this.idleAnimation = this.scene.tweens.add({
            targets: this.bubbleChamber,
            scaleX: { from: 1, to: 1.02 },   // Slightly more visible
            scaleY: { from: 1, to: 1.02 },
            duration: 2200,                   // Optimized timing for mobile attention
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Mobile-friendly queue indicator - helps users understand the system
        if (this.queueContainer) {
            // Subtle pulsing to indicate "next bubble"
            this.scene.tweens.add({
                targets: this.queueContainer,
                alpha: { from: 0.85, to: 1 },
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
            
            // Gentle scale animation to draw attention without being distracting
            this.scene.tweens.add({
                targets: this.queueContainer,
                scaleX: { from: 1, to: 1.01 },
                scaleY: { from: 1, to: 1.01 },
                duration: 2000,
                repeat: -1,
                yoyo: true,
                ease: 'Sine.InOut'
            });
        }
        
        // Mobile-optimized ready state indicator
        if (this.readyIndicator) {
            this.scene.tweens.add({
                targets: this.readyIndicator,
                alpha: { from: 0.4, to: 0.8 },
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut',
                paused: true  // Activated when launcher is ready
            });
        }
    }

    /**
     * MOBILE-FIRST: Setup optimized touch interaction with proper accessibility
     */
    private setupMobileTouchArea(): void {
        // Create touch area following mobile accessibility guidelines
        // iOS: 44x44pt minimum, Android: 48x48dp minimum - we use generous 120px
        const touchSize = 120; // Premium touch area for excellent mobile UX
        const touchArea = this.scene.add.rectangle(0, 0, touchSize, touchSize, 0x000000, 0);
        touchArea.setInteractive({ useHandCursor: true });
        
        // Position behind all visual elements for clean design
        this.addAt(touchArea, 0);
        
        // Enhanced mobile feedback system
        touchArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Satisfying mobile scale feedback - more pronounced
            this.scene.tweens.add({
                targets: this,
                scaleX: 0.92,
                scaleY: this.isOpponent ? -0.92 : 0.92,  // Maintain flip for opponent
                duration: 60,
                yoyo: true,
                ease: 'Power3.Out'
            });
            
            // Premium mobile ripple effect with better visibility
            const ripple = this.scene.add.circle(0, 0, 12 * HD_SCALE, 0xffffff, 0.4);
            this.add(ripple);
            
            this.scene.tweens.add({
                targets: ripple,
                scale: { from: 0, to: 4 },
                alpha: { from: 0.4, to: 0 },
                duration: 500,
                ease: 'Power2.Out',
                onComplete: () => ripple.destroy()
            });
            
            // Visual hierarchy pulse for clarity
            if (this.queueContainer) {
                this.scene.tweens.add({
                    targets: this.queueContainer,
                    scaleX: { from: 1, to: 1.05 },
                    scaleY: { from: 1, to: 1.05 },
                    duration: 100,
                    yoyo: true,
                    ease: 'Power2.Out'
                });
            }
        });
        
        // Subtle hover effect for desktop/tablet hybrid devices
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
            if (this.bubbleChamber) {
                this.scene.tweens.killTweensOf(this.bubbleChamber);
            }
            
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
    public override setState(state: 'idle' | 'aiming' | 'charging' | 'ready' | 'cooldown'): this {
        this.launcherState = state;
        this.updateStateIndicator();
        this.renderStateIndicators();
        return this;
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
                this.stateIndicator.fillCircle(0, 0, 35 * HD_SCALE);
                break;
                
            case 'aiming':
                // Aiming reticle effect
                this.stateIndicator.lineStyle(4 * HD_SCALE, 0xFFC107, 0.6);  // HD line width
                this.stateIndicator.strokeCircle(0, 0, 40 * HD_SCALE);
                // Add crosshair
                this.stateIndicator.lineBetween(-10 * HD_SCALE, 0, 10 * HD_SCALE, 0);
                this.stateIndicator.lineBetween(0, -10 * HD_SCALE, 0, 10 * HD_SCALE);
                break;
                
            case 'charging':
                // Charging energy effect
                const chargeColor = this.powerLevel < 30 ? 0xFF5722 : 
                                   this.powerLevel < 70 ? 0xFF9800 : 0x4CAF50;
                this.stateIndicator.fillStyle(chargeColor, 0.3 + (this.powerLevel / 200));
                this.stateIndicator.fillCircle(0, 0, (30 * HD_SCALE) + (this.powerLevel / 10));
                break;
                
            case 'ready':
                // Ready pulse effect
                this.stateIndicator.fillStyle(0x00BCD4, 0.4);
                this.stateIndicator.fillCircle(0, 0, 35 * HD_SCALE);
                if (this.readyIndicator) {
                    this.readyIndicator.setVisible(true);
                }
                break;
                
            case 'cooldown':
                // Cooldown dimmed effect
                this.stateIndicator.fillStyle(0x9E9E9E, 0.2);
                this.stateIndicator.fillCircle(0, 0, 30 * HD_SCALE);
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
        
        // Mobile-optimized bubble positioning and sizing
        this.loadedBubble = new Bubble(this.scene, 0, this.BUBBLE_POSITION_Y, color);
        this.loadedBubble.setScale(1.0); // Slightly larger for mobile clarity (was 0.95)
        this.add(this.loadedBubble);
        this.bringToTop(this.loadedBubble);
        
        // Update theme to match loaded bubble
        this.updateTheme(color);
        
        // Update ready indicator color to match bubble - no alpha initially
        if (this.readyIndicator && this.currentTheme) {
            // Don't set visibility here, let renderStateIndicators handle it
            // Just prepare the color for when it becomes visible
            this.readyIndicator.setStrokeStyle(2, this.currentTheme.platform.rim, 0);
        }
        
        // Update arsenal slot colors to match launcher theme
        this.updateArsenalTheme();
        
        // Enhanced mobile loading animation with better visual feedback
        this.loadedBubble.setScale(0);
        this.scene.tweens.add({
            targets: this.loadedBubble,
            scale: 1.0,
            duration: 450,
            ease: 'Back.Out'
        });
        
        // Mobile visual hierarchy: emphasize the loaded bubble is READY TO SHOOT
        this.scene.tweens.add({
            targets: this.loadedBubble,
            alpha: { from: 0.7, to: 1 },
            duration: 600,
            ease: 'Power2.InOut',
            delay: 200
        });
        
        // Update launcher state
        this.launcherState = 'ready';
        
        // Maintain opponent flip consistency
        if (this.isOpponent && this.scaleY !== -1) {
            this.setScale(1, -1);
        }
        
        // Update all visual indicators
        this.renderStateIndicators();
        
        // Mobile-friendly chamber response with clearer feedback
        this.scene.tweens.add({
            targets: this.bubbleChamber,
            scaleX: { from: 1, to: 1.12 },
            scaleY: { from: 1, to: 1.12 },
            duration: 300,
            yoyo: true,
            ease: 'Back.Out'
        });
        
        // Update visual effects
        this.renderGlowEffects();
        
        // Mobile UX: Subtle visual indicator that this is the ACTIVE bubble
        if (this.bubbleChamber) {
            this.scene.time.delayedCall(500, () => {
                this.scene.tweens.add({
                    targets: this.bubbleChamber,
                    alpha: { from: 1, to: 0.95 },
                    duration: 300,
                    ease: 'Sine.InOut'
                });
            });
        }
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
        
        if (!this.queueContainer) return;
        
        // console.log('Launcher: Updating queue colors:', colors);
        
        // Clear existing bubbles with animation
        if (this.nextBubbleGraphics) {
            this.scene.tweens.add({
                targets: this.nextBubbleGraphics,
                alpha: 0,
                scale: 0,
                duration: 150,
                onComplete: () => {
                    this.nextBubbleGraphics?.destroy();
                    this.nextBubbleGraphics = undefined;
                }
            });
        }
        
        if (this.secondBubbleGraphics) {
            this.scene.tweens.add({
                targets: this.secondBubbleGraphics,
                alpha: 0,
                scale: 0,
                duration: 150,
                onComplete: () => {
                    this.secondBubbleGraphics?.destroy();
                    this.secondBubbleGraphics = undefined;
                }
            });
        }
        
        // Create new bubbles with correct colors after a brief delay
        this.scene.time.delayedCall(200, () => {
            if (colors.length > 0 && colors[0]) {
                // console.log('Creating next bubble with color:', colors[0]);
                this.createNextBubble(colors[0]);
            }
            if (colors.length > 1 && colors[1]) {
                this.scene.time.delayedCall(150, () => {
                    // console.log('Creating second bubble with color:', colors[1]!);
                    this.createSecondBubble(colors[1]!);
                });
            }
        });
    }

    // === PRIVATE ANIMATION METHODS - ENHANCED ===

    private animateEnhancedLaunch(): void {
        // Enhanced launch recoil with power-based intensity
        const recoilIntensity = 1 + (this.powerLevel / 100) * 0.5;
        
        if (this.bubbleChamber) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1.15 * recoilIntensity,
                scaleY: 1.15 * recoilIntensity,
                duration: 200 + this.powerLevel,
                yoyo: true,
                ease: 'Power3.Out'
            });
        }
        
        // Enhanced platform shake with haptic feel
        if (this.launcherPlatform) {
            const shakeIntensity = 2 * recoilIntensity;
            this.scene.tweens.add({
                targets: this.launcherPlatform,
                x: -shakeIntensity,
                duration: 175,
                yoyo: true,
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
            scale: { from: 0.5, to: 2.2 * effectIntensity },
            alpha: { from: 0.9, to: 0 },
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
                scale: { from: 1.1, to: 0 },
                alpha: { from: 0.9, to: 0 },
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

    private updateArsenalTheme(): void {
        if (!this.arsenalSlots || !this.currentTheme) return;
        
        // Update all arsenal slot backgrounds with new theme
        this.arsenalSlots.forEach(slot => {
            if (slot.background) {
                this.drawArsenalSlotBackground(slot.background, slot.isActive);
            }
        });
    }
    
    // === ARSENAL INTEGRATION METHODS ===
    
    private createIntegratedArsenal(): void {
        // Create container for arsenal system
        this.arsenalContainer = this.scene.add.container(0, 0);
        this.add(this.arsenalContainer);
        
        // Create the horizontal chamber design first
        this.createArsenalChamber();
        
        // Use appropriate positions based on player/opponent
        const positions = this.isOpponent ? 
            this.ARSENAL_POSITIONS_OPPONENT : 
            this.ARSENAL_POSITIONS_PLAYER;
        
        // Create arsenal slots in horizontal formation
        positions.forEach((pos, index) => {
            const slot = this.createArsenalSlot(pos, index);
            this.arsenalSlots.push(slot);
            if (this.arsenalContainer) {
                this.arsenalContainer.add(slot.container);
            }
        });
        
        // Position arsenal at higher depth to ensure visibility
        this.arsenalContainer.setDepth(100);
    }
    
    private createArsenalChamber(): void {
        if (!this.arsenalContainer || !this.currentTheme) return;
        
        const chamberGraphics = this.scene.add.graphics();
        
        // Calculate bounds for horizontal chamber
        const startX = this.isOpponent ? -70 * HD_SCALE : 70 * HD_SCALE;
        const endX = this.isOpponent ? -150 * HD_SCALE : 150 * HD_SCALE;
        const chamberY = -35 * HD_SCALE;
        const chamberHeight = 40 * HD_SCALE;
        const chamberWidth = Math.abs(endX - startX) + 40 * HD_SCALE;
        const chamberX = Math.min(startX, endX) - 18 * HD_SCALE;
        
        // === LAYER 1: Base Platform (like launcher) ===
        // Outer shadow/glow
        chamberGraphics.fillStyle(0x000000, 0.5);
        chamberGraphics.fillRoundedRect(
            chamberX - 3,
            chamberY - chamberHeight/2 - 3,
            chamberWidth + 6,
            chamberHeight + 6,
            15 * HD_SCALE
        );
        
        // Main platform base
        const gradient = chamberGraphics.fillGradientStyle(
            this.currentTheme.platform.base,
            this.currentTheme.platform.base,
            this.currentTheme.secondary,
            this.currentTheme.secondary,
            0.7
        );
        chamberGraphics.fillRoundedRect(
            chamberX,
            chamberY - chamberHeight/2,
            chamberWidth,
            chamberHeight,
            12 * HD_SCALE
        );
        
        // === LAYER 2: Inner Chamber Details ===
        // Inner recessed area
        chamberGraphics.fillStyle(this.currentTheme.chamber.inner, 0.4);
        chamberGraphics.fillRoundedRect(
            chamberX + 4 * HD_SCALE,
            chamberY - chamberHeight/2 + 4 * HD_SCALE,
            chamberWidth - 8 * HD_SCALE,
            chamberHeight - 8 * HD_SCALE,
            10 * HD_SCALE
        );
        
        // === LAYER 3: Tech Details ===
        // Tech panels between slots
        const slotSpacing = 40 * HD_SCALE;
        for (let i = 0; i < 2; i++) {
            const panelX = startX + (i + 0.5) * slotSpacing * (this.isOpponent ? -1 : 1);
            
            // Panel background
            chamberGraphics.fillStyle(this.currentTheme.platform.detail, 0.3);
            chamberGraphics.fillRect(
                panelX - 8 * HD_SCALE,
                chamberY - 10 * HD_SCALE,
                16 * HD_SCALE,
                20 * HD_SCALE
            );
            
            // Panel lines
            chamberGraphics.lineStyle(1 * HD_SCALE, this.currentTheme.glow.pulse, 0.4);
            chamberGraphics.lineBetween(
                panelX - 6 * HD_SCALE,
                chamberY,
                panelX + 6 * HD_SCALE,
                chamberY
            );
        }
        
        // === LAYER 4: Premium Borders & Rims ===
        // Outer rim
        chamberGraphics.lineStyle(3 * HD_SCALE, this.currentTheme.platform.rim, 1);
        chamberGraphics.strokeRoundedRect(
            chamberX,
            chamberY - chamberHeight/2,
            chamberWidth,
            chamberHeight,
            12 * HD_SCALE
        );
        
        // Inner rim detail
        chamberGraphics.lineStyle(1 * HD_SCALE, this.currentTheme.chamber.detail, 0.6);
        chamberGraphics.strokeRoundedRect(
            chamberX + 4 * HD_SCALE,
            chamberY - chamberHeight/2 + 4 * HD_SCALE,
            chamberWidth - 8 * HD_SCALE,
            chamberHeight - 8 * HD_SCALE,
            10 * HD_SCALE
        );
        
        // === CONNECTING TUBE (Premium Design) ===
        const tubeStartX = this.isOpponent ? -35 * HD_SCALE : 35 * HD_SCALE;
        const tubeEndX = startX - (this.isOpponent ? -18 : 18) * HD_SCALE;
        const tubeY = chamberY;
        const tubeHeight = 24 * HD_SCALE;
        
        // Tube shadow
        chamberGraphics.fillStyle(0x000000, 0.3);
        chamberGraphics.fillRect(
            Math.min(tubeStartX, tubeEndX) - 1,
            tubeY - tubeHeight/2 - 1,
            Math.abs(tubeEndX - tubeStartX) + 2,
            tubeHeight + 2
        );
        
        // Tube main body
        chamberGraphics.fillStyle(this.currentTheme.platform.base, 0.6);
        chamberGraphics.fillRect(
            Math.min(tubeStartX, tubeEndX),
            tubeY - tubeHeight/2,
            Math.abs(tubeEndX - tubeStartX),
            tubeHeight
        );
        
        // Tube inner detail
        chamberGraphics.fillStyle(this.currentTheme.chamber.inner, 0.3);
        chamberGraphics.fillRect(
            Math.min(tubeStartX, tubeEndX) + 2,
            tubeY - tubeHeight/2 + 2,
            Math.abs(tubeEndX - tubeStartX) - 4,
            tubeHeight - 4
        );
        
        // Tube borders
        chamberGraphics.lineStyle(2 * HD_SCALE, this.currentTheme.platform.rim, 0.9);
        chamberGraphics.lineBetween(tubeStartX, tubeY - tubeHeight/2, tubeEndX, tubeY - tubeHeight/2);
        chamberGraphics.lineBetween(tubeStartX, tubeY + tubeHeight/2, tubeEndX, tubeY + tubeHeight/2);
        
        // Energy flow lines in tube
        chamberGraphics.lineStyle(1 * HD_SCALE, this.currentTheme.glow.pulse, 0.5);
        for (let i = 0; i < 3; i++) {
            const lineY = tubeY - tubeHeight/2 + (i + 1) * (tubeHeight / 4);
            chamberGraphics.setLineDash([5 * HD_SCALE, 5 * HD_SCALE]);
            chamberGraphics.lineBetween(tubeStartX, lineY, tubeEndX, lineY);
        }
        chamberGraphics.setLineDash([]);
        
        // === DECORATIVE ELEMENTS ===
        // Corner accents
        chamberGraphics.lineStyle(2 * HD_SCALE, this.currentTheme.glow.loaded, 0.4);
        // Top left
        chamberGraphics.lineBetween(
            chamberX,
            chamberY - chamberHeight/2 + 10 * HD_SCALE,
            chamberX + 10 * HD_SCALE,
            chamberY - chamberHeight/2
        );
        // Top right
        chamberGraphics.lineBetween(
            chamberX + chamberWidth - 10 * HD_SCALE,
            chamberY - chamberHeight/2,
            chamberX + chamberWidth,
            chamberY - chamberHeight/2 + 10 * HD_SCALE
        );
        
        this.arsenalContainer.add(chamberGraphics);
        chamberGraphics.setDepth(-1); // Behind slots
    }
    
    private createArsenalSlot(position: { x: number, y: number }, index: number): ArsenalSlot {
        const container = this.scene.add.container(position.x, position.y);
        
        // Counter-rotate the container for opponent to keep content readable
        if (this.isOpponent) {
            container.setScale(1, -1);
        }
        
        // Create slot background with weapon mount design
        const background = this.scene.add.graphics();
        this.drawArsenalSlotBackground(background, false);
        
        // Create power-up icon
        const icon = this.scene.add.text(0, 0, '', {
            fontSize: `${14 * HD_SCALE}px`,  // Further reduced for smaller slots
            fontFamily: 'Arial'
        });
        icon.setOrigin(0.5);
        icon.setShadow(2, 2, '#000000', 2, true, true);
        
        // Create count text
        const countText = this.scene.add.text(
            this.SLOT_SIZE/2 - 2,
            this.SLOT_SIZE/2 - 2,
            '',
            {
                fontSize: `${6 * HD_SCALE}px`,  // Further reduced for smaller slots
                fontFamily: 'Arial Black',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 2 * HD_SCALE
            }
        );
        countText.setOrigin(1, 1);
        
        // Add key hint for slots 1-3 (only on desktop)
        const isMobile = this.scene.game.device.input.touch;
        if (!isMobile) {
            const keyHint = this.createKeyHintBadge(index + 1);
            keyHint.setPosition(-this.SLOT_SIZE/2 + 6, -this.SLOT_SIZE/2 + 6);
            container.add(keyHint);
        }
        
        container.add([background, icon, countText]);
        
        // Make interactive only for player
        if (!this.isOpponent) {
            const touchPadding = 6;
            container.setInteractive(
                new Phaser.Geom.Rectangle(
                    -this.SLOT_SIZE/2 - touchPadding,
                    -this.SLOT_SIZE/2 - touchPadding,
                    this.SLOT_SIZE + touchPadding * 2,
                    this.SLOT_SIZE + touchPadding * 2
                ),
                Phaser.Geom.Rectangle.Contains
            );
            
            // Add hover/press effects
            container.on('pointerdown', () => {
                this.activateArsenalSlot(index);
            });
            
            container.on('pointerover', () => {
                const baseScale = this.isOpponent ? -1 : 1;
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1.1,
                    scaleY: 1.1 * baseScale,
                    duration: 200,
                    ease: 'Power2'
                });
            });
            
            container.on('pointerout', () => {
                const baseScale = this.isOpponent ? -1 : 1;
                this.scene.tweens.add({
                    targets: container,
                    scaleX: 1.0,
                    scaleY: 1.0 * baseScale,
                    duration: 200,
                    ease: 'Power2'
                });
            });
        }
        
        return {
            container,
            background,
            icon,
            countText,
            position,
            powerUpType: undefined,
            count: 0,
            isActive: false
        };
    }
    
    private drawArsenalSlotBackground(graphics: Phaser.GameObjects.Graphics, isActive: boolean): void {
        graphics.clear();
        
        const size = this.SLOT_SIZE;
        const halfSize = size / 2;
        
        if (!this.currentTheme) return;
        
        const colors = {
            primary: this.currentTheme.primary,
            secondary: this.currentTheme.secondary,
            glow: this.currentTheme.glow.pulse,
            rim: this.currentTheme.platform.rim,
            detail: this.currentTheme.chamber.detail
        };
        
        // === LAYER 1: Shadow/Depth ===
        graphics.fillStyle(0x000000, 0.4);
        graphics.fillCircle(2, 3, halfSize + 2);
        
        // === LAYER 2: Outer Ring (Mechanical) ===
        graphics.fillStyle(this.currentTheme.platform.base, 0.7);
        graphics.fillCircle(0, 0, halfSize + 1);
        
        // === LAYER 3: Main Chamber ===
        graphics.fillStyle(this.currentTheme.chamber.inner, 0.8);
        graphics.fillCircle(0, 0, halfSize - 2);
        
        // === LAYER 4: Inner Core ===
        graphics.fillStyle(colors.secondary, 0.2);
        graphics.fillCircle(0, 0, halfSize - 5 * HD_SCALE);
        
        // === LAYER 5: Tech Details ===
        // Radial lines (like launcher queue)
        graphics.lineStyle(0.5 * HD_SCALE, colors.detail, 0.3);
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const innerR = halfSize - 8 * HD_SCALE;
            const outerR = halfSize - 3 * HD_SCALE;
            graphics.lineBetween(
                Math.cos(angle) * innerR,
                Math.sin(angle) * innerR,
                Math.cos(angle) * outerR,
                Math.sin(angle) * outerR
            );
        }
        
        // === LAYER 6: Premium Rims ===
        // Outer rim
        graphics.lineStyle(2 * HD_SCALE, isActive ? 0xFFD700 : colors.rim, isActive ? 1 : 0.8);
        graphics.strokeCircle(0, 0, halfSize);
        
        // Middle rim
        graphics.lineStyle(1 * HD_SCALE, colors.detail, 0.5);
        graphics.strokeCircle(0, 0, halfSize - 3 * HD_SCALE);
        
        // Inner rim
        graphics.lineStyle(1 * HD_SCALE, colors.rim, 0.3);
        graphics.strokeCircle(0, 0, halfSize - 6 * HD_SCALE);
        
        // === LAYER 7: Active State Premium Effects ===
        if (isActive) {
            // Outer glow ring
            graphics.lineStyle(4 * HD_SCALE, 0xFFD700, 0.2);
            graphics.strokeCircle(0, 0, halfSize + 3 * HD_SCALE);
            
            // Middle glow
            graphics.lineStyle(2 * HD_SCALE, 0xFFD700, 0.4);
            graphics.strokeCircle(0, 0, halfSize + 1 * HD_SCALE);
            
            // Inner bright core
            graphics.fillStyle(0xFFFFFF, 0.1);
            graphics.fillCircle(0, 0, halfSize - 7 * HD_SCALE);
            
            // Highlight arc (like launcher)
            graphics.lineStyle(1 * HD_SCALE, 0xFFFFFF, 0.6);
            graphics.arc(0, 0, halfSize - 4 * HD_SCALE, -Math.PI * 0.7, -Math.PI * 0.3, false);
            graphics.strokePath();
        }
        
        // === LAYER 8: Glossy Highlight ===
        graphics.fillStyle(0xFFFFFF, 0.15);
        graphics.fillEllipse(
            -halfSize * 0.3,
            -halfSize * 0.4,
            halfSize * 0.6,
            halfSize * 0.4
        );
    }
    
    private createKeyHintBadge(key: number): Phaser.GameObjects.Container {
        const badge = this.scene.add.container(0, 0);
        
        // Use theme color for badge
        const badgeColor = this.currentTheme?.glow?.pulse || 0xFFD700;
        
        const bg = this.scene.add.circle(0, 0, 7 * HD_SCALE, badgeColor, 0.9);
        bg.setStrokeStyle(1 * HD_SCALE, 0x000000, 1);
        
        const text = this.scene.add.text(0, 0, `${key}`, {
            fontSize: `${6 * HD_SCALE}px`,  // Further reduced for smaller slots
            fontFamily: 'Arial Black',
            color: '#000000'
        });
        text.setOrigin(0.5);
        
        badge.add([bg, text]);
        return badge;
    }
    
    private setupArsenalListeners(): void {
        // Listen for power-up collection
        this.scene.events.on('power-up-collected', (data: any) => {
            const shouldAdd = this.isOpponent ? 
                (data.owner === 'opponent') : 
                (data.owner === 'player');
            
            if (shouldAdd) {
                this.addPowerUpToArsenal(data.type);
            }
        });
        
        // Keyboard controls only for player (only on desktop)
        if (!this.isOpponent && !this.scene.game.device.input.touch) {
            this.scene.input.keyboard?.on('keydown-ONE', () => this.activateArsenalSlot(0));
            this.scene.input.keyboard?.on('keydown-TWO', () => this.activateArsenalSlot(1));
            this.scene.input.keyboard?.on('keydown-THREE', () => this.activateArsenalSlot(2));
        }
    }
    
    private addPowerUpToArsenal(type: PowerUpType): void {
        // Check if we already have this power-up
        let slot = this.arsenalSlots.find(s => s.powerUpType === type);
        
        if (slot) {
            // Increment count
            slot.count++;
            slot.countText.setText(slot.count > 1 ? `x${slot.count}` : '');
        } else {
            // Find empty slot
            slot = this.arsenalSlots.find(s => !s.powerUpType);
            
            if (slot) {
                slot.powerUpType = type;
                slot.count = 1;
                slot.icon.setText(this.powerUpIcons[type]);
                
                // Collection animation
                this.showPowerUpCollectionEffect(slot);
            }
        }
    }
    
    private activateArsenalSlot(index: number): void {
        const slot = this.arsenalSlots[index];
        
        if (!slot || !slot.powerUpType || slot.count <= 0) {
            // Empty slot feedback
            if (slot) {
                this.showEmptySlotFeedback(slot);
            }
            return;
        }
        
        // Activate power-up
        this.activatePowerUp(slot);
    }
    
    private activatePowerUp(slot: ArsenalSlot): void {
        if (!slot.powerUpType) return;
        
        // Visual activation sequence
        this.showPowerUpActivation(slot);
        
        // Set active power-up
        this.activePowerUp = slot.powerUpType;
        
        // Emit activation event
        this.scene.events.emit('activate-power-up', {
            type: slot.powerUpType
        });
        
        // Decrease count
        slot.count--;
        
        if (slot.count <= 0) {
            // Clear slot
            slot.powerUpType = undefined;
            slot.icon.setText('');
            slot.countText.setText('');
            slot.isActive = false;
        } else {
            slot.countText.setText(slot.count > 1 ? `x${slot.count}` : '');
        }
        
        // Start cooldown
        this.startSlotCooldown(slot, 2000);
    }
    
    private showPowerUpActivation(slot: ArsenalSlot): void {
        // Create energy beam from slot to launcher
        this.renderEnergyConduit(slot);
        
        // Chamber enhancement effect - maintain orientation
        if (this.bubbleChamber) {
            const baseScale = this.isOpponent ? -1 : 1;
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: { from: 1, to: 1.2, end: 1 },
                scaleY: { from: baseScale, to: 1.2 * baseScale, end: baseScale },
                duration: 300,
                ease: 'Power2'
            });
        }
        
        // Slot activation burst
        const burst = this.scene.add.graphics();
        burst.fillStyle(0xFFD700, 0.6);
        burst.fillCircle(slot.position.x, slot.position.y, this.SLOT_SIZE/2);
        this.arsenalContainer?.add(burst);
        
        this.scene.tweens.add({
            targets: burst,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => burst.destroy()
        });
    }
    
    private renderEnergyConduit(slot: ArsenalSlot): void {
        if (!this.energyConduits) return;
        
        // Clear previous conduits
        this.energyConduits.clear();
        
        // Draw energy beam
        const startX = slot.position.x;
        const startY = slot.position.y;
        const endX = 0;
        const endY = this.BUBBLE_POSITION_Y;
        
        // Animated energy beam
        this.energyConduits.lineStyle(6 * HD_SCALE, 0xFFD700, 0.8);  // HD line width
        this.energyConduits.lineBetween(startX, startY, endX, endY);
        
        // Create energy particles along the beam
        for (let i = 0; i < 5; i++) {
            const t = i / 4;
            const px = startX + (endX - startX) * t;
            const py = startY + (endY - startY) * t;
            
            const particle = this.scene.add.circle(px, py, 2 * HD_SCALE, 0xFFD700);
            this.arsenalContainer?.add(particle);
            
            this.scene.tweens.add({
                targets: particle,
                x: endX,
                y: endY,
                scale: 0,
                duration: 500,
                delay: i * 50,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Fade out conduit
        this.scene.time.delayedCall(600, () => {
            this.scene.tweens.add({
                targets: this.energyConduits,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    this.energyConduits?.clear();
                    this.energyConduits?.setAlpha(1);
                }
            });
        });
    }
    
    private showPowerUpCollectionEffect(slot: ArsenalSlot): void {
        // Scale animation - maintain correct orientation for opponent
        const baseScale = this.isOpponent ? -1 : 1;
        this.scene.tweens.add({
            targets: slot.container,
            scaleX: { from: 1.3, to: 1 },
            scaleY: { from: 1.3 * baseScale, to: baseScale },
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Glow effect
        const collectFlash = this.scene.add.graphics();
        collectFlash.fillStyle(0xFFD700, 0.5);
        collectFlash.fillCircle(slot.position.x, slot.position.y, this.SLOT_SIZE);
        this.arsenalContainer?.add(collectFlash);
        
        this.scene.tweens.add({
            targets: collectFlash,
            alpha: 0,
            scale: 2,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => collectFlash.destroy()
        });
    }
    
    private showEmptySlotFeedback(slot: ArsenalSlot): void {
        // Red flash for empty slot
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xFF0000, 0.3);
        flash.fillCircle(0, 0, this.SLOT_SIZE/2);
        slot.container.add(flash);
        
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });
    }
    
    private startSlotCooldown(slot: ArsenalSlot, duration: number): void {
        // Create cooldown overlay
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillCircle(0, 0, this.SLOT_SIZE/2);
        slot.container.add(overlay);
        
        // Progress arc
        const progressArc = this.scene.add.graphics();
        slot.container.add(progressArc);
        
        this.scene.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: duration,
            onUpdate: (tween) => {
                const progress = tween.getValue();
                progressArc.clear();
                progressArc.lineStyle(6 * HD_SCALE, 0x4ECDC4, 0.8);  // HD line width
                progressArc.beginPath();
                progressArc.arc(0, 0, this.SLOT_SIZE/2 - (2 * HD_SCALE), -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress), false);
                progressArc.strokePath();
            },
            onComplete: () => {
                overlay.destroy();
                progressArc.destroy();
                this.drawArsenalSlotBackground(slot.background, false);
            }
        });
    }
    
    /**
     * Cleanup method
     */
    public override destroy(): void {
        // Clean up arsenal
        this.arsenalSlots.forEach(slot => {
            this.scene.tweens.killTweensOf(slot.container);
        });
        
        // Clean up animations
        if (this.idleAnimation) {
            this.idleAnimation.destroy();
        }
        if (this.chargingTween) {
            this.chargingTween.destroy();
        }
        
        // Remove event listeners
        this.scene.events.off('power-up-collected');
        this.scene.events.off('activate-power-up');
        
        super.destroy();
    }
}