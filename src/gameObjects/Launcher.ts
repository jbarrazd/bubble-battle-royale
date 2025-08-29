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
        
        // Initialize with beautiful theme
        this.updateTheme(BubbleColor.BLUE);
        this.startIdleAnimations();
    }

    /**
     * Creates the premium launcher experience with unified design
     */
    private createExceptionalLauncher(): void {
        // Create in perfect hierarchy order
        this.createLauncherPlatform();
        this.createBubbleChamber();
        this.createQueuePanel();  // NEW: Professional queue background
        this.createEffectsLayer();
        
        // Add all components with perfect layering
        this.add([
            this.launcherPlatform!,
            this.bubbleChamber!,
            this.queuePanel!,
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
     * NEW: Creates professional queue panel with elegant background
     */
    private createQueuePanel(): void {
        this.queuePanel = this.scene.add.container(0, this.QUEUE_POSITION_Y);
        
        // Professional background panel
        this.queueBackground = this.scene.add.graphics();
        
        // No text label - design should be intuitive
        this.queuePanel.add(this.queueBackground);
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
        this.renderQueuePanel();
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
     * NEW: Renders professional queue panel background
     */
    private renderQueuePanel(): void {
        if (!this.queueBackground || !this.currentTheme) return;
        
        this.queueBackground.clear();
        
        // Queue is now integrated into the launcher body
        // No separate background needed - bubbles sit in the magazine slots
        
        // Render queue bubbles in the integrated magazine
        this.renderQueueBubbles();
    }

    /**
     * Renders queue bubbles with crystal clarity and professional polish
     */
    private renderQueueBubbles(): void {
        if (!this.queueBackground) return;
        
        // Show only 1 next bubble for clean design
        if (this.nextBubbleColors.length > 0) {
            const color = this.nextBubbleColors[0];
            
            // Single bubble positioned in the magazine - same for both
            const x = 0; // Centered
            const y = 5; // Same position for both (flip handles the difference)
            const radius = 11; // Good visible size
            const alpha = 1.0; // Full opacity for clarity
            
            this.renderPremiumQueueBubble(x, y, radius, alpha, color, 0);
        }
    }

    /**
     * Renders a single queue bubble with premium quality
     */
    private renderPremiumQueueBubble(x: number, y: number, radius: number, alpha: number, color: BubbleColor, index: number): void {
        if (!this.queueBackground) return;
        
        const bubbleTheme = this.getBubbleColors(color);
        
        // Solid bubble base with full visibility
        this.queueBackground.fillStyle(bubbleTheme.primary, alpha);
        this.queueBackground.fillCircle(x, y, radius);
        
        // Strong border for clear definition
        this.queueBackground.lineStyle(2, bubbleTheme.dark, alpha);
        this.queueBackground.strokeCircle(x, y, radius);
        
        // Clear 3D highlight - same for both (flip handles it)
        this.queueBackground.fillStyle(bubbleTheme.light, alpha * 0.6);
        this.queueBackground.fillCircle(x - 2, y - 2, radius * 0.3);
        
        // Inner shadow for depth
        this.queueBackground.fillStyle(bubbleTheme.dark, alpha * 0.3);
        this.queueBackground.fillCircle(x + 2, y + 2, radius * 0.25);
        
        // "NEXT" indicator - subtle pulsing glow
        this.queueBackground.lineStyle(1.5, bubbleTheme.accent, alpha * 0.4);
        this.queueBackground.strokeCircle(x, y, radius + 3);
        
        // Small arrow pointing to chamber - same for both (flip handles it)
        const arrowY = y - radius - 5;
        this.queueBackground.fillStyle(0xffffff, alpha * 0.4);
        this.queueBackground.fillTriangle(
            x - 3, arrowY + 2,
            x + 3, arrowY + 2,
            x, arrowY - 3
        );
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
            case BubbleColor.PURPLE:
                return {
                    primary: 0xA55EEA,
                    secondary: 0x8E44AD,
                    accent: 0xBB7EED,
                    dark: 0x6B3A87,
                    light: 0xD39BF0
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
     * Starts subtle idle animations for premium feel
     */
    private startIdleAnimations(): void {
        // Subtle breathing effect on chamber
        this.idleAnimation = this.scene.tweens.add({
            targets: this.bubbleChamber,
            scaleX: { from: 1, to: 1.02 },
            scaleY: { from: 1, to: 1.02 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Queue panel subtle pulse
        if (this.queuePanel) {
            this.scene.tweens.add({
                targets: this.queuePanel,
                alpha: { from: 0.95, to: 1 },
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }
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
        
        // Premium aiming feedback
        if (show) {
            // Charging animation
            this.chargingTween = this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 200,
                ease: 'Power2.Out'
            });
        } else {
            // Return to normal
            if (this.chargingTween) {
                this.chargingTween.stop();
            }
            
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: 1,
                scaleY: 1,
                duration: 300,
                ease: 'Elastic.Out'
            });
        }
        
        // Update glow effects
        this.renderGlowEffects();
    }

    public animateShoot(bubbleColor?: BubbleColor): void {
        this.createExceptionalLaunchEffects(bubbleColor);
        this.animatePremiumLaunch();
    }

    public setHighlight(enabled: boolean): void {
        const scale = enabled ? 1.05 : 1.0;
        const alpha = enabled ? 1.0 : 0.95;
        
        // Don't animate scale for the entire container - it breaks the flip
        this.scene.tweens.add({
            targets: this,
            alpha,
            duration: 200,
            ease: 'Power2.Out'
        });
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
        
        // Double-check flip is maintained for opponent after all updates
        if (this.isOpponent && this.scaleY !== -1) {
            this.setScale(1, -1);
        }
        
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
        
        // Premium queue update animation
        this.scene.tweens.add({
            targets: this.queuePanel,
            scaleX: { from: 1, to: 1.05, to: 1 },
            scaleY: { from: 1, to: 1.05, to: 1 },
            duration: 300,
            ease: 'Back.Out',
            onComplete: () => {
                this.renderQueuePanel();
            }
        });
    }

    // === PRIVATE ANIMATION METHODS - ENHANCED ===

    private animatePremiumLaunch(): void {
        // Dramatic launch recoil
        if (this.bubbleChamber) {
            this.scene.tweens.add({
                targets: this.bubbleChamber,
                scaleX: { from: 1, to: 1.15, to: 0.95, to: 1 },
                scaleY: { from: 1, to: 1.15, to: 0.95, to: 1 },
                duration: 400,
                ease: 'Power3.Out'
            });
        }
        
        // Platform shake - NO SCALE ANIMATION for these (it breaks the flip)
        if (this.launcherPlatform) {
            // Use position shake instead of scale
            this.scene.tweens.add({
                targets: this.launcherPlatform,
                x: { from: 0, to: -2, to: 2, to: 0 },
                duration: 350,
                ease: 'Power2.Out'
            });
        }
        
        // Launcher recoil
        this.scene.tweens.add({
            targets: this,
            y: this.y - (this.isOpponent ? -3 : 3),
            duration: 100,
            yoyo: true,
            ease: 'Power2.Out'
        });
    }

    private createExceptionalLaunchEffects(bubbleColor?: BubbleColor): void {
        if (!bubbleColor) return;
        
        const colors = this.getBubbleColors(bubbleColor);
        const effectY = this.y + this.BUBBLE_POSITION_Y;
        
        // Dramatic muzzle flash
        const flash = this.scene.add.circle(this.x, effectY, 20, colors.light, 0.8);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: flash,
            scale: { from: 0.5, to: 2.5, to: 0 },
            alpha: { from: 0.8, to: 0.4, to: 0 },
            duration: 300,
            ease: 'Power2.Out',
            onComplete: () => flash.destroy()
        });
        
        // Premium sparkle burst
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const distance = 15 + Math.random() * 10;
            const sparkX = this.x + Math.cos(angle) * distance;
            const sparkY = effectY + Math.sin(angle) * distance;
            
            const sparkle = this.scene.add.circle(sparkX, sparkY, 3, colors.primary, 0.9);
            sparkle.setBlendMode(Phaser.BlendModes.ADD);
            
            this.scene.tweens.add({
                targets: sparkle,
                scale: { from: 1, to: 0.3, to: 0 },
                alpha: { from: 0.9, to: 0.5, to: 0 },
                x: sparkX + Math.cos(angle) * 20,
                y: sparkY + Math.sin(angle) * 20,
                duration: 400,
                delay: i * 25,
                ease: 'Power2.Out',
                onComplete: () => sparkle.destroy()
            });
        }
        
        // Energy ring expansion
        const ring = this.scene.add.circle(this.x, effectY, 15, colors.primary, 0);
        ring.setStrokeStyle(3, colors.accent, 0.8);
        ring.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: ring,
            scale: { from: 0.8, to: 2.2 },
            alpha: { from: 0.8, to: 0 },
            duration: 350,
            ease: 'Power2.Out',
            onComplete: () => ring.destroy()
        });
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