import Phaser from 'phaser';
import { Launcher } from '@/gameObjects/Launcher';
import { Z_LAYERS } from '@/config/ArenaConfig';
import { BubbleColor } from '@/types/ArenaTypes';

interface ITrajectoryDot {
    dot: Phaser.GameObjects.Arc;
    targetAlpha: number;
}

export class TrajectoryPreview {
    private scene: Phaser.Scene;
    private launcher: Launcher;
    private dots: ITrajectoryDot[] = [];
    private dotPool: Phaser.GameObjects.Arc[] = [];
    private currentBubbleColor: number = 0xFFFFFF;
    
    // Preview settings
    private readonly DOT_COUNT = 20;
    private readonly DOT_SIZE = 4; // Thinner dots for cleaner look
    private readonly DOT_SPACING = 25;
    private readonly PREVIEW_PERCENTAGE = 0.5; // Show 50% for better preview
    private readonly MAX_PREVIEW_DISTANCE = 500; // Extended preview distance
    private readonly SHOOT_SPEED = 600;
    
    // Animation
    private animationTime: number = 0;
    private isVisible: boolean = false;
    
    // Bounds for wall collision
    private bounds: Phaser.Geom.Rectangle;
    
    constructor(scene: Phaser.Scene, launcher: Launcher) {
        this.scene = scene;
        this.launcher = launcher;
        
        this.bounds = new Phaser.Geom.Rectangle(
            0,
            0,
            scene.cameras.main.width,
            scene.cameras.main.height
        );
        
        this.createDotPool();
    }
    
    private createDotPool(): void {
        for (let i = 0; i < this.DOT_COUNT; i++) {
            const dot = this.scene.add.circle(
                0, 0,
                this.DOT_SIZE,
                0xffffff,
                0
            );
            dot.setDepth(Z_LAYERS.UI - 1);
            dot.setVisible(false);
            this.dotPool.push(dot);
        }
    }
    
    public show(angle: number, bubbleColor?: number): void {
        if (!this.isVisible) {
            this.isVisible = true;
            if (bubbleColor !== undefined) {
                this.currentBubbleColor = bubbleColor;
            }
            this.calculateTrajectory(angle);
        }
    }
    
    public hide(): void {
        this.isVisible = false;
        this.dots.forEach(({ dot }) => {
            dot.setVisible(false);
            dot.setAlpha(0);
        });
        this.dots = [];
    }
    
    private calculateTrajectory(angle: number): void {
        // Clear previous dots
        this.hide();
        this.isVisible = true;
        
        // Starting position
        let x = this.launcher.x;
        let y = this.launcher.y - 35; // Match bubble position in launcher
        
        // Calculate velocity from angle
        // The launcher's getAimDirection uses the angle directly
        // In world coordinates: 0° = right, 90° = down, 180° = left, 270° = up
        const radians = Phaser.Math.DegToRad(angle);
        let vx = Math.cos(radians) * this.SHOOT_SPEED;
        let vy = Math.sin(radians) * this.SHOOT_SPEED;
        
        // Normalize to unit vector for stepping
        const magnitude = Math.sqrt(vx * vx + vy * vy);
        vx = (vx / magnitude) * this.DOT_SPACING;
        vy = (vy / magnitude) * this.DOT_SPACING;
        
        // Calculate trajectory points
        const maxDots = Math.floor(this.DOT_COUNT * this.PREVIEW_PERCENTAGE);
        let dotIndex = 0;
        let totalDistance = 0;
        
        while (dotIndex < maxDots && totalDistance < this.MAX_PREVIEW_DISTANCE) {
            // Move to next position
            x += vx;
            y += vy;
            totalDistance += this.DOT_SPACING;
            
            // Check for wall collisions
            const radius = 16; // Bubble radius
            
            // Left wall bounce
            if (x - radius <= this.bounds.left) {
                x = this.bounds.left + radius;
                vx = Math.abs(vx);
            }
            
            // Right wall bounce
            if (x + radius >= this.bounds.right) {
                x = this.bounds.right - radius;
                vx = -Math.abs(vx);
            }
            
            // Top wall (stop preview here)
            if (y - radius <= this.bounds.top) {
                break;
            }
            
            // Place dot
            if (dotIndex < this.dotPool.length) {
                const dot = this.dotPool[dotIndex];
                dot.setPosition(x, y);
                dot.setVisible(true);
                // Calculate fade based on distance
                const fadeStart = 0.3; // Start more visible
                const fadeEnd = 0.8; // End still visible
                const fadeProgress = dotIndex / maxDots;
                const fadeFactor = fadeStart + (fadeEnd - fadeStart) * fadeProgress;
                const targetAlpha = 0.9 * (1 - fadeFactor); // Higher base alpha
                
                this.dots.push({ dot, targetAlpha });
                dotIndex++;
            }
        }
    }
    
    public update(angle: number, delta: number, bubbleColor?: number): void {
        if (!this.isVisible) return;
        
        if (bubbleColor !== undefined) {
            this.currentBubbleColor = bubbleColor;
        }
        
        // Recalculate trajectory
        this.calculateTrajectory(angle);
        
        // Animate dots
        this.animationTime += delta;
        const animSpeed = 0.003;
        
        this.dots.forEach(({ dot, targetAlpha }, index) => {
            // Create moving wave effect
            const waveOffset = index * 0.15;
            const wave = Math.sin(this.animationTime * animSpeed + waveOffset);
            const animatedAlpha = targetAlpha * (0.7 + wave * 0.3); // Less variation, higher base
            
            // Pulsing size effect - subtle for thinner dots
            const sizeWave = 1 + wave * 0.2;
            dot.setScale(sizeWave);
            
            // Apply alpha
            dot.setAlpha(animatedAlpha);
            
            // Create gradient based on bubble color
            const colorProgress = index / this.dots.length;
            
            // Get RGB components from bubble color
            const baseColor = Phaser.Display.Color.IntegerToColor(this.currentBubbleColor);
            
            // Create gradient by darkening the color progressively
            const red = Math.floor(baseColor.red * (1 - colorProgress * 0.4)); // Darken red
            const green = Math.floor(baseColor.green * (1 - colorProgress * 0.4)); // Darken green  
            const blue = Math.floor(baseColor.blue * (1 - colorProgress * 0.4)); // Darken blue
            
            const color = Phaser.Display.Color.GetColor(red, green, blue);
            dot.setFillStyle(color);
            
            // Add stroke with bubble color for extra visibility
            dot.setStrokeStyle(1, this.currentBubbleColor, 0.3);
        });
    }
    
    public destroy(): void {
        this.hide();
        this.dotPool.forEach(dot => dot.destroy());
        this.dotPool = [];
    }
}