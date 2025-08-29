import { ArenaZone, BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';
import { Bubble } from './Bubble';

export class Launcher extends Phaser.GameObjects.Container {
    // Bubble shooter launcher components
    private launcherBase?: Phaser.GameObjects.Container;
    private aimingMechanism?: Phaser.GameObjects.Container;
    private decorativeElements?: Phaser.GameObjects.Container;
    private targetingReticle?: Phaser.GameObjects.Container;
    private bubblePlatform?: Phaser.GameObjects.Container;
    
    // Graphics objects that need color updates (store references for recreation)
    private basePlatformGraphics?: Phaser.GameObjects.Graphics;
    private innerPlatformGraphics?: Phaser.GameObjects.Graphics;
    private decorativeRingGraphics?: Phaser.GameObjects.Graphics;
    private bubbleCradleGraphics?: Phaser.GameObjects.Graphics;
    private glowRingGraphics?: Phaser.GameObjects.Graphics;
    private targetingGraphics?: Phaser.GameObjects.Graphics;
    
    private zone: ArenaZone;
    private currentAngle: number = 0;
    private loadedBubble?: Bubble;
    private nextBubbleColors: BubbleColor[] = []; // For showing next colors in rings

    constructor(scene: Phaser.Scene, x: number, y: number, zone: ArenaZone) {
        super(scene, x, y);
        
        this.zone = zone;
        
        // Create simple compact launcher
        this.createCompactLauncher();
        
        // Set initial angle based on zone
        if (zone === ArenaZone.OPPONENT) {
            this.setScale(1, -1);
            this.currentAngle = 90; // Point downward for opponent
        } else {
            this.currentAngle = 270; // Point upward for player (270° in world coordinates)
        }
        
        this.setDepth(Z_LAYERS.LAUNCHERS);
        scene.add.existing(this);
    }

    public setAimAngle(angle: number): void {
        // Store the world angle directly
        this.currentAngle = angle;
        
        // Convert to visual rotation angle
        let visualAngle = angle;
        
        if (this.zone === ArenaZone.PLAYER) {
            // Clamp player angle to upward arc
            if (angle > 180) {
                visualAngle = Phaser.Math.Clamp(angle, 195, 345);
            } else {
                visualAngle = Phaser.Math.Clamp(angle, 15, 165);
            }
        } else {
            // Clamp opponent angle to downward arc
            visualAngle = Phaser.Math.Clamp(angle, 15, 165);
        }
        
        // Update stored angle with clamped value
        this.currentAngle = visualAngle;
        
        // Apply rotation to aiming components
        this.rotateLauncher(visualAngle);
    }

    public getAimAngle(): number {
        return this.currentAngle;
    }

    public getAimDirection(): Phaser.Math.Vector2 {
        // Convert world angle directly to direction vector
        const rad = Phaser.Math.DegToRad(this.currentAngle);
        return new Phaser.Math.Vector2(Math.cos(rad), Math.sin(rad));
    }

    public showAiming(show: boolean): void {
        const targets = [this.aimingMechanism].filter(Boolean);
            
        if (show) {
            this.scene.tweens.add({
                targets: targets,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Power2'
            });
        } else {
            this.scene.tweens.add({
                targets: targets,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        }
    }

    public animateShoot(bubbleColor?: BubbleColor): void {
        // Very subtle launch animation
        this.animateLaunch();
        
        // Only create a very small effect if color is provided
        if (bubbleColor !== undefined) {
            // Very subtle and small puff effect
            const puff = this.scene.add.circle(
                this.x,
                this.y - 35, // At bubble position
                5, // Very small
                bubbleColor,
                0.3 // Low opacity
            );
            
            // Quick fade out
            this.scene.tweens.add({
                targets: puff,
                scale: 1.2,
                alpha: 0,
                duration: 100, // Very quick
                ease: 'Power2.Out',
                onComplete: () => puff.destroy()
            });
        }
    }

    public setHighlight(enabled: boolean): void {
        // Simple highlight effect
        if (this.launcherBase) {
            this.launcherBase.setAlpha(enabled ? 1.1 : 1.0);
        }
    }
    
    public loadBubble(color: BubbleColor): void {
        // Remove existing loaded bubble
        if (this.loadedBubble) {
            this.remove(this.loadedBubble);
            this.loadedBubble.destroy();
        }
        
        // Create bubble at launcher center, not attached to rotating parts
        this.loadedBubble = new Bubble(
            this.scene,
            0, // Center of launcher
            -35, // More centered position for better integration
            color
        );
        this.loadedBubble.setScale(0.9);
        
        // Add bubble directly to launcher container (not to rotating parts)
        // This keeps it stationary while the aiming arm rotates
        this.add(this.loadedBubble);
        
        // Ensure bubble is on top of launcher components
        this.bringToTop(this.loadedBubble);
        
        // Update launcher colors based on bubble color
        this.updateLauncherColor(color);
        
        console.log('Launcher: Loaded bubble color', color, 'at center');
    }
    
    public getLoadedBubble(): Bubble | undefined {
        return this.loadedBubble;
    }
    
    public clearLoadedBubble(): void {
        if (this.loadedBubble) {
            this.remove(this.loadedBubble);
        }
        this.loadedBubble = undefined;
        
        // Restore original colors
        if (this.aimingMechanism) {
            this.aimingMechanism.list.forEach((child: any) => {
                if (child.clearTint) {
                    child.clearTint();
                }
            });
        }
    }
    
    /**
     * Updates queue colors for integrated ring display
     */
    public updateQueueColors(colors: BubbleColor[]): void {
        this.nextBubbleColors = colors;
        this.updateRingColors();
    }
    
    /**
     * Updates launcher colors based on the loaded bubble color
     */
    private updateLauncherColor(color: BubbleColor): void {
        // Get color palette based on bubble color
        const colorPalette = this.getColorPalette(color);
        
        // Recreate all colored graphics components
        this.recreateColoredGraphics(colorPalette);
    }
    
    /**
     * Update ring colors to show next bubbles
     */
    private updateRingColors(): void {
        if (!this.decorativeRingGraphics) return;
        
        // Clear and recreate rings with queue colors
        this.decorativeRingGraphics.clear();
        
        // Draw filled circles from largest to smallest (so they layer correctly)
        
        // Outer circle - bubble after next (largest, drawn first)
        if (this.nextBubbleColors[1]) {
            this.decorativeRingGraphics.fillStyle(this.nextBubbleColors[1], 0.25);
            this.decorativeRingGraphics.fillCircle(0, 0, 42);
            this.decorativeRingGraphics.lineStyle(1, this.nextBubbleColors[1], 0.4);
            this.decorativeRingGraphics.strokeCircle(0, 0, 42);
        }
        
        // Middle circle - next bubble color
        if (this.nextBubbleColors[0]) {
            this.decorativeRingGraphics.fillStyle(this.nextBubbleColors[0], 0.35);
            this.decorativeRingGraphics.fillCircle(0, 0, 32);
            this.decorativeRingGraphics.lineStyle(1.5, this.nextBubbleColors[0], 0.5);
            this.decorativeRingGraphics.strokeCircle(0, 0, 32);
        }
        
        // Inner circle - current bubble color (smallest, drawn last)
        if (this.loadedBubble) {
            const currentColor = this.loadedBubble.getColor();
            this.decorativeRingGraphics.fillStyle(currentColor, 0.2);
            this.decorativeRingGraphics.fillCircle(0, 0, 24);
            this.decorativeRingGraphics.lineStyle(2, currentColor, 0.6);
            this.decorativeRingGraphics.strokeCircle(0, 0, 24);
        }
    }
    
    /**
     * Gets color palette for a bubble color
     */
    private getColorPalette(color: BubbleColor): any {
        switch(color) {
            case BubbleColor.RED:
                return {
                    primary: 0xFF6B6B,
                    secondary: 0xFF4444,
                    accent: 0xFF8888,
                    dark: 0xCC3333,
                    highlight: 0xFFAAAA,
                    glow: 0xFF0000
                };
            case BubbleColor.BLUE:
                return {
                    primary: 0x6B9BFF,
                    secondary: 0x4477FF,
                    accent: 0x88AAFF,
                    dark: 0x3355CC,
                    highlight: 0xAABBFF,
                    glow: 0x0066FF
                };
            case BubbleColor.GREEN:
                return {
                    primary: 0x6BFF6B,
                    secondary: 0x44FF44,
                    accent: 0x88FF88,
                    dark: 0x33CC33,
                    highlight: 0xAAFFAA,
                    glow: 0x00FF00
                };
            case BubbleColor.YELLOW:
                return {
                    primary: 0xFFE135,
                    secondary: 0xFFD700,
                    accent: 0xFFEE55,
                    dark: 0xCCAA00,
                    highlight: 0xFFFF88,
                    glow: 0xFFD700
                };
            case BubbleColor.PURPLE:
                return {
                    primary: 0xD06BFF,
                    secondary: 0xB344FF,
                    accent: 0xDD88FF,
                    dark: 0x9933CC,
                    highlight: 0xEEAAFF,
                    glow: 0x9B59B6
                };
            default:
                return {
                    primary: 0x00CCFF,
                    secondary: 0x0099CC,
                    accent: 0x33DDFF,
                    dark: 0x006688,
                    highlight: 0x66EEFF,
                    glow: 0x00CCFF
                };
        }
    }
    
    /**
     * Recreates colored graphics with new palette
     */
    private recreateColoredGraphics(palette: any): void {
        // Recreate base platform with new colors
        if (this.basePlatformGraphics) {
            this.basePlatformGraphics.destroy();
        }
        this.basePlatformGraphics = this.scene.add.graphics();
        
        // Hexagonal base with color gradient
        const hexPoints = this.createHexagonPoints(35);
        this.basePlatformGraphics.fillGradientStyle(
            palette.primary,
            palette.secondary,
            palette.dark,
            palette.accent
        );
        this.basePlatformGraphics.fillPoints(hexPoints, true);
        
        this.basePlatformGraphics.lineStyle(3, palette.highlight, 0.9);
        this.basePlatformGraphics.strokePoints(hexPoints, true);
        
        this.launcherBase?.add(this.basePlatformGraphics);
        
        // Update bubble platform with better design
        if (this.innerPlatformGraphics) {
            this.innerPlatformGraphics.destroy();
        }
        this.innerPlatformGraphics = this.scene.add.graphics();
        
        // Outer glow ring
        this.innerPlatformGraphics.fillStyle(palette.glow, 0.2);
        this.innerPlatformGraphics.fillCircle(0, -35, 26);
        
        // Main platform with gradient effect
        this.innerPlatformGraphics.fillGradientStyle(
            palette.accent,
            palette.primary,
            palette.secondary,
            palette.dark
        );
        this.innerPlatformGraphics.fillCircle(0, -35, 22);
        
        // Inner depression for bubble to sit in
        this.innerPlatformGraphics.fillStyle(palette.dark, 0.4);
        this.innerPlatformGraphics.fillCircle(0, -35, 18);
        
        // Bright rim
        this.innerPlatformGraphics.lineStyle(2, palette.highlight, 0.9);
        this.innerPlatformGraphics.strokeCircle(0, -35, 22);
        
        // Inner rim
        this.innerPlatformGraphics.lineStyle(1, palette.glow, 0.6);
        this.innerPlatformGraphics.strokeCircle(0, -35, 18);
        
        this.launcherBase?.add(this.innerPlatformGraphics);
        
        // Add pulsing animation to bubble platform
        if (this.glowRingGraphics) {
            this.glowRingGraphics.destroy();
        }
        this.glowRingGraphics = this.scene.add.graphics();
        this.glowRingGraphics.lineStyle(3, palette.glow, 0.5);
        this.glowRingGraphics.strokeCircle(0, -35, 24);
        
        this.launcherBase?.add(this.glowRingGraphics);
        
        // Animate the glow
        this.scene.tweens.add({
            targets: this.glowRingGraphics,
            alpha: { from: 0.5, to: 0.1 },
            scale: { from: 1, to: 1.1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // Update decorative rings with queue colors
        this.updateRingColors();
        
        // Update targeting graphics if exists
        if (this.targetingGraphics && this.targetingReticle) {
            this.targetingGraphics.clear();
            this.targetingGraphics.lineStyle(2, palette.accent, 0.4);
            // Aiming line from bubble position
            this.targetingGraphics.moveTo(0, -35); // Start from bubble
            this.targetingGraphics.lineTo(0, -65); // Extend upward
            this.targetingGraphics.stroke();
        }
    }
    
    /**
     * Creates hexagon points for base
     */
    private createHexagonPoints(radius: number): number[] {
        const points: number[] = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            points.push(x, y);
        }
        return points;
    }
    
    /**
     * Creates compact launcher
     */
    private createCompactLauncher(): void {
        // Create all launcher components
        this.createBase();
        this.createAimingMechanism();
        this.createDecorations();
        
        // Add all components to container in proper order (back to front)
        this.add([
            this.launcherBase!,
            this.decorativeElements!,
            this.aimingMechanism!
        ]);
    }
    
    /**
     * Creates the launcher base platform (non-rotating)
     */
    private createBase(): void {
        this.launcherBase = this.scene.add.container(0, 0);
        
        // Will be populated by recreateColoredGraphics
        this.basePlatformGraphics = this.scene.add.graphics();
        this.innerPlatformGraphics = this.scene.add.graphics();
        
        // Create initial neutral colors
        const neutralPalette = this.getColorPalette(BubbleColor.BLUE);
        this.recreateColoredGraphics(neutralPalette);
    }
    
    /**
     * Creates the aiming mechanism (rotating)
     */
    private createAimingMechanism(): void {
        this.aimingMechanism = this.scene.add.container(0, 0);
        
        // Simple aiming line from bubble position
        this.targetingReticle = this.scene.add.container(0, 0);
        this.targetingGraphics = this.scene.add.graphics();
        this.targetingGraphics.lineStyle(2, 0x00CCFF, 0.4);
        
        // Line extending from bubble position
        this.targetingGraphics.moveTo(0, -35); // Start from bubble
        this.targetingGraphics.lineTo(0, -65); // Extend upward
        this.targetingGraphics.stroke();
        
        this.targetingReticle.add(this.targetingGraphics);
        this.aimingMechanism.add(this.targetingReticle);
    }
    
    /**
     * Rotates launcher components for aiming
     */
    private rotateLauncher(angle: number): void {
        // The aiming mechanism rotates around center, but visually extends from bubble
        const rotation = Phaser.Math.DegToRad(angle + 90);
        
        // Rotate the aiming mechanism
        if (this.aimingMechanism) {
            this.aimingMechanism.setRotation(rotation);
        }
    }
    
    /**
     * Launch animation
     */
    private animateLaunch(): void {
        // Very subtle aiming mechanism recoil
        if (this.aimingMechanism) {
            this.scene.tweens.add({
                targets: this.aimingMechanism,
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 80,
                yoyo: true,
                ease: 'Power3.Out'
            });
        }
        
        // Very subtle launcher movement
        this.scene.tweens.add({
            targets: this,
            y: this.y - 1,
            duration: 60,
            yoyo: true,
            ease: 'Power3.Out'
        });
    }
    
    /**
     * Creates decorative elements
     */
    private createDecorations(): void {
        this.decorativeElements = this.scene.add.container(0, 0);
        
        // Create ring graphics that will show queue colors
        this.decorativeRingGraphics = this.scene.add.graphics();
        this.decorativeElements.add(this.decorativeRingGraphics);
        
        // Initial rings will be drawn by updateRingColors
        this.decorativeElements.setAlpha(0.7);
    }
}