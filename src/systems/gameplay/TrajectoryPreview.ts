import Phaser from 'phaser';
import { Launcher } from '@/gameObjects/Launcher';
import { Z_LAYERS } from '@/config/ArenaConfig';

interface ITrajectoryDot {
    dot: Phaser.GameObjects.Arc;
    targetAlpha: number;
}

export class TrajectoryPreview {
    private scene: Phaser.Scene;
    private launcher: Launcher;
    private dots: ITrajectoryDot[] = [];
    private dotPool: Phaser.GameObjects.Arc[] = [];
    
    // Preview settings
    private readonly DOT_COUNT = 20;
    private readonly DOT_SIZE = 4;
    private readonly DOT_SPACING = 25;
    private readonly PREVIEW_PERCENTAGE = 0.4; // 40% of trajectory
    private readonly MAX_PREVIEW_DISTANCE = 400;
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
    
    public show(angle: number): void {
        if (!this.isVisible) {
            this.isVisible = true;
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
        let y = this.launcher.y - 30;
        
        // Calculate velocity from angle
        const radians = Phaser.Math.DegToRad(angle - 90);
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
                const fadeStart = 0.7;
                const fadeEnd = 1.0;
                const fadeProgress = dotIndex / maxDots;
                const fadeFactor = fadeStart + (fadeEnd - fadeStart) * fadeProgress;
                const targetAlpha = 0.6 * (1 - fadeFactor);
                
                this.dots.push({ dot, targetAlpha });
                dotIndex++;
            }
        }
    }
    
    public update(angle: number, delta: number): void {
        if (!this.isVisible) return;
        
        // Recalculate trajectory
        this.calculateTrajectory(angle);
        
        // Animate dots
        this.animationTime += delta;
        const animSpeed = 0.003;
        
        this.dots.forEach(({ dot, targetAlpha }, index) => {
            // Create moving wave effect
            const waveOffset = index * 0.2;
            const wave = Math.sin(this.animationTime * animSpeed + waveOffset);
            const animatedAlpha = targetAlpha * (0.5 + wave * 0.5);
            
            // Pulsing size effect
            const sizeWave = 1 + wave * 0.2;
            dot.setScale(sizeWave);
            
            // Apply alpha
            dot.setAlpha(animatedAlpha);
            
            // Color gradient (white to green)
            const colorProgress = index / this.dots.length;
            const green = Math.floor(255 * (1 - colorProgress * 0.3));
            const color = Phaser.Display.Color.GetColor(green, 255, green);
            dot.setFillStyle(color);
        });
    }
    
    public destroy(): void {
        this.hide();
        this.dotPool.forEach(dot => dot.destroy());
        this.dotPool = [];
    }
}