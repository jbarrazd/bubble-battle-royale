import { Scene } from 'phaser';
import { BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

/**
 * Professional paint splatter visual effect system
 * Creates realistic paint splatters when bubbles explode
 * Uses individual sprites for accurate positioning
 */
export class PaintSplatterSystem {
    private scene: Scene;
    private splatters: Phaser.GameObjects.Graphics[] = [];
    private readonly MAX_SPLATTERS = 100;
    
    private readonly SPLATTER_CONFIG = {
        // Small, natural splatters
        MIN_DROPLET_SIZE: 2,
        MAX_DROPLET_SIZE: 5,
        MIN_DROPLETS: 4,
        MAX_DROPLETS: 8,
        MIN_SPREAD: 15,
        MAX_SPREAD: 35,
        
        // Fade timing
        FADE_START_DELAY: 1500,
        FADE_DURATION: 1000,
        
        // Visual settings
        INITIAL_ALPHA: 0.7,
        COLOR_VARIATION: 0.1
    };
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for the actual bubble explosion event
        this.scene.events.on('bubble-exploded', this.handleBubbleExplosion, this);
    }
    
    private handleBubbleExplosion(data: {
        x: number;
        y: number;
        color: BubbleColor;
        comboMultiplier?: number;
    }): void {
        // Create splatter immediately at the explosion position
        this.createSplatter(data.x, data.y, data.color, data.comboMultiplier || 1);
    }
    
    private createSplatter(x: number, y: number, color: BubbleColor, multiplier: number): void {
        // Validate position
        if (!this.isValidPosition(x, y)) {
            return;
        }
        
        // Clean up old splatters if we have too many
        if (this.splatters.length > this.MAX_SPLATTERS) {
            const toRemove = this.splatters.splice(0, 20);
            toRemove.forEach(g => {
                this.scene.tweens.killTweensOf(g);
                g.destroy();
            });
        }
        
        // Calculate droplet count based on combo
        const dropletCount = Phaser.Math.Between(
            this.SPLATTER_CONFIG.MIN_DROPLETS,
            Math.min(this.SPLATTER_CONFIG.MAX_DROPLETS, this.SPLATTER_CONFIG.MIN_DROPLETS + Math.floor(multiplier / 2))
        );
        
        // Create droplets
        for (let i = 0; i < dropletCount; i++) {
            this.createDroplet(x, y, color);
        }
    }
    
    private createDroplet(centerX: number, centerY: number, color: BubbleColor): void {
        // Random position around center
        const angle = Math.random() * Math.PI * 2;
        const distance = Phaser.Math.Between(
            this.SPLATTER_CONFIG.MIN_SPREAD,
            this.SPLATTER_CONFIG.MAX_SPREAD
        );
        
        const dropletX = centerX + Math.cos(angle) * distance;
        const dropletY = centerY + Math.sin(angle) * distance;
        
        // Validate droplet position
        if (!this.isValidPosition(dropletX, dropletY)) {
            return;
        }
        
        // Create graphics object for this droplet
        const graphics = this.scene.add.graphics();
        
        // Random droplet size
        const size = Phaser.Math.FloatBetween(
            this.SPLATTER_CONFIG.MIN_DROPLET_SIZE,
            this.SPLATTER_CONFIG.MAX_DROPLET_SIZE
        );
        
        // Apply color with slight variation
        const variedColor = this.applyColorVariation(color);
        
        // Set depth behind bubbles
        graphics.setDepth(Z_LAYERS.BACKGROUND + 1);
        graphics.setAlpha(this.SPLATTER_CONFIG.INITIAL_ALPHA);
        
        // Draw the droplet at its position
        graphics.fillStyle(variedColor, 1);
        
        // Random shape
        const shapeType = Math.random();
        if (shapeType < 0.5) {
            // Circle
            graphics.fillCircle(dropletX, dropletY, size);
        } else if (shapeType < 0.8) {
            // Ellipse
            const rotation = Math.random() * Math.PI;
            graphics.save();
            graphics.translateCanvas(dropletX, dropletY);
            graphics.rotateCanvas(rotation);
            graphics.fillEllipse(0, 0, size * 1.4, size * 0.7);
            graphics.restore();
        } else {
            // Irregular splat
            graphics.beginPath();
            graphics.moveTo(dropletX, dropletY);
            const points = 5;
            for (let j = 0; j < points; j++) {
                const pointAngle = (j / points) * Math.PI * 2;
                const pointDist = size * (0.8 + Math.random() * 0.4);
                const px = dropletX + Math.cos(pointAngle) * pointDist;
                const py = dropletY + Math.sin(pointAngle) * pointDist;
                graphics.lineTo(px, py);
            }
            graphics.closePath();
            graphics.fillPath();
        }
        
        // Add to tracking array
        this.splatters.push(graphics);
        
        // Schedule fade out
        this.scene.time.delayedCall(
            this.SPLATTER_CONFIG.FADE_START_DELAY,
            () => {
                this.scene.tweens.add({
                    targets: graphics,
                    alpha: 0,
                    duration: this.SPLATTER_CONFIG.FADE_DURATION,
                    ease: 'Power2',
                    onComplete: () => {
                        const index = this.splatters.indexOf(graphics);
                        if (index > -1) {
                            this.splatters.splice(index, 1);
                        }
                        graphics.destroy();
                    }
                });
            }
        );
    }
    
    private applyColorVariation(color: BubbleColor): number {
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        const variation = this.SPLATTER_CONFIG.COLOR_VARIATION;
        
        const newR = Math.min(255, Math.max(0, r + (Math.random() - 0.5) * 255 * variation));
        const newG = Math.min(255, Math.max(0, g + (Math.random() - 0.5) * 255 * variation));
        const newB = Math.min(255, Math.max(0, b + (Math.random() - 0.5) * 255 * variation));
        
        return (Math.floor(newR) << 16) | (Math.floor(newG) << 8) | Math.floor(newB);
    }
    
    private isValidPosition(x: number, y: number): boolean {
        const cam = this.scene.cameras.main;
        const buffer = 50;
        return x >= -buffer && 
               x <= cam.width + buffer && 
               y >= -buffer && 
               y <= cam.height + buffer &&
               !isNaN(x) && !isNaN(y) &&
               isFinite(x) && isFinite(y);
    }
    
    public clear(): void {
        this.splatters.forEach(graphics => {
            this.scene.tweens.killTweensOf(graphics);
            graphics.destroy();
        });
        this.splatters = [];
    }
    
    public destroy(): void {
        this.scene.events.off('bubble-exploded', this.handleBubbleExplosion, this);
        this.clear();
    }
}