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
    private trajectoryGraphics?: Phaser.GameObjects.Graphics;
    
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
        const aimingTargets = [this.aimingMechanism].filter(Boolean);
            
        if (show) {
            // Show aiming mechanism with subtle scale
            this.scene.tweens.add({
                targets: aimingTargets,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Power2'
            });
        } else {
            // Hide aiming mechanism
            this.scene.tweens.add({
                targets: aimingTargets,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        }
        // Trajectory preview is handled by TrajectoryPreview class
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
        
        // Enhanced queue rings with better visual hierarchy
        
        // Outer circle - bubble after next (largest, drawn first)
        if (this.nextBubbleColors[1]) {
            // Subtle glow effect
            this.decorativeRingGraphics.fillStyle(this.nextBubbleColors[1], 0.1);
            this.decorativeRingGraphics.fillCircle(0, 0, 44);
            
            // Main ring
            this.decorativeRingGraphics.fillStyle(this.nextBubbleColors[1], 0.3);
            this.decorativeRingGraphics.fillCircle(0, 0, 42);
            
            // Border
            this.decorativeRingGraphics.lineStyle(1.5, this.nextBubbleColors[1], 0.6);
            this.decorativeRingGraphics.strokeCircle(0, 0, 42);
        }
        
        // Middle circle - next bubble color
        if (this.nextBubbleColors[0]) {
            // Subtle glow
            this.decorativeRingGraphics.fillStyle(this.nextBubbleColors[0], 0.15);
            this.decorativeRingGraphics.fillCircle(0, 0, 34);
            
            // Main ring
            this.decorativeRingGraphics.fillStyle(this.nextBubbleColors[0], 0.4);
            this.decorativeRingGraphics.fillCircle(0, 0, 32);
            
            // Border
            this.decorativeRingGraphics.lineStyle(2, this.nextBubbleColors[0], 0.7);
            this.decorativeRingGraphics.strokeCircle(0, 0, 32);
        }
        
        // Inner circle - current bubble color (smallest, drawn last)
        if (this.loadedBubble) {
            const currentColor = this.loadedBubble.getColor();
            
            // Subtle glow
            this.decorativeRingGraphics.fillStyle(currentColor, 0.2);
            this.decorativeRingGraphics.fillCircle(0, 0, 26);
            
            // Main ring
            this.decorativeRingGraphics.fillStyle(currentColor, 0.35);
            this.decorativeRingGraphics.fillCircle(0, 0, 24);
            
            // Border
            this.decorativeRingGraphics.lineStyle(2.5, currentColor, 0.8);
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
        
        // Enhanced hexagonal base with better gradient and details
        const hexPoints = this.createHexagonPoints(35);
        
        // Shadow/depth layer
        this.basePlatformGraphics.fillStyle(0x000000, 0.2);
        const shadowHexPoints = this.createHexagonPoints(37);
        this.basePlatformGraphics.fillPoints(shadowHexPoints, true);
        
        // Main gradient base
        this.basePlatformGraphics.fillGradientStyle(
            palette.primary,
            palette.secondary,
            palette.dark,
            palette.accent
        );
        this.basePlatformGraphics.fillPoints(hexPoints, true);
        
        // Inner highlight
        this.basePlatformGraphics.fillStyle(palette.highlight, 0.3);
        const innerHexPoints = this.createHexagonPoints(30);
        this.basePlatformGraphics.fillPoints(innerHexPoints, true);
        
        // Border styling
        this.basePlatformGraphics.lineStyle(3, palette.highlight, 0.9);
        this.basePlatformGraphics.strokePoints(hexPoints, true);
        
        // Inner border for depth
        this.basePlatformGraphics.lineStyle(1, palette.accent, 0.6);
        this.basePlatformGraphics.strokePoints(innerHexPoints, true);
        
        this.launcherBase?.add(this.basePlatformGraphics);
        
        // Enhanced bubble platform design
        if (this.innerPlatformGraphics) {
            this.innerPlatformGraphics.destroy();
        }
        this.innerPlatformGraphics = this.scene.add.graphics();
        
        // Outer glow ring with soft falloff
        this.innerPlatformGraphics.fillStyle(palette.glow, 0.15);
        this.innerPlatformGraphics.fillCircle(0, -35, 28);
        this.innerPlatformGraphics.fillStyle(palette.glow, 0.25);
        this.innerPlatformGraphics.fillCircle(0, -35, 26);
        
        // Main platform with enhanced gradient
        this.innerPlatformGraphics.fillGradientStyle(
            palette.highlight,
            palette.accent,
            palette.primary,
            palette.secondary
        );
        this.innerPlatformGraphics.fillCircle(0, -35, 22);
        
        // Inner depression with subtle gradient
        this.innerPlatformGraphics.fillGradientStyle(
            palette.dark,
            palette.secondary,
            palette.primary,
            palette.accent
        );
        this.innerPlatformGraphics.fillCircle(0, -35, 18);
        
        // Enhanced rim system
        this.innerPlatformGraphics.lineStyle(3, palette.highlight, 0.9);
        this.innerPlatformGraphics.strokeCircle(0, -35, 22);
        
        this.innerPlatformGraphics.lineStyle(2, palette.glow, 0.7);
        this.innerPlatformGraphics.strokeCircle(0, -35, 19);
        
        this.innerPlatformGraphics.lineStyle(1, palette.accent, 0.5);
        this.innerPlatformGraphics.strokeCircle(0, -35, 16);
        
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
            // Removed the incorrect aiming line and arrow - trajectory preview handles aiming
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
        
        // Trajectory preview is handled by TrajectoryPreview class
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
        
        // Create targeting reticle
        this.targetingReticle = this.scene.add.container(0, 0);
        this.targetingGraphics = this.scene.add.graphics();
        
        // Trajectory preview is handled by TrajectoryPreview class
        // Don't create duplicate trajectory graphics here
        
        this.createAimingIndicator();
        
        this.targetingReticle.add(this.targetingGraphics);
        this.aimingMechanism.add(this.targetingReticle);
    }
    
    /**
     * Creates the aiming indicator with proper design
     */
    private createAimingIndicator(): void {
        if (!this.targetingGraphics) return;
        
        this.targetingGraphics.clear();
        // No static aiming indicators - trajectory preview handles all aiming visuals
    }
    
    /**
     * Rotates launcher components for aiming
     */
    private rotateLauncher(angle: number): void {
        // Convert angle to radians (add 90 to align with visual orientation)
        const rotation = Phaser.Math.DegToRad(angle - 90);
        
        // Rotate the aiming mechanism
        if (this.aimingMechanism) {
            this.aimingMechanism.setRotation(rotation);
        }
        
        // Trajectory preview is handled by TrajectoryPreview class in ShootingSystem
        // this.updateTrajectoryPreview(angle); // Disabled to avoid duplicate
    }
    
    /**
     * Updates trajectory preview dots
     * DISABLED: Using TrajectoryPreview class instead to avoid duplicates
     */
    private updateTrajectoryPreview(angle: number): void {
        // Disabled - handled by TrajectoryPreview class in ShootingSystem
        return;
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