import { Scene } from 'phaser';
import { BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

/**
 * Configuration interface for paint splatter system
 */
interface IPaintSplatterConfig {
    // Droplet settings
    minDropletSize: number;
    maxDropletSize: number;
    minDroplets: number;
    maxDroplets: number;
    minSpread: number;
    maxSpread: number;
    
    // Timing
    fadeStartDelay: number;
    fadeDuration: number;
    
    // Visual
    initialAlpha: number;
    colorVariation: number;
    
    // Performance
    maxSplatters: number;
    cleanupBatchSize: number;
    
    // Scaling
    scaleWithCombo: boolean;
    comboScaleFactor: number;
    maxComboScale: number;
}

/**
 * Professional paint splatter visual effect system
 * Creates realistic paint splatters when bubbles explode
 * Fully scalable and configurable
 */
export class PaintSplatterSystem {
    private scene: Scene;
    private splatters: Phaser.GameObjects.Graphics[] = [];
    private config: IPaintSplatterConfig;
    
    // Default configuration - easily adjustable
    private static readonly DEFAULT_CONFIG: IPaintSplatterConfig = {
        // Balanced, natural splatters
        minDropletSize: 1.5,
        maxDropletSize: 4,
        minDroplets: 3,
        maxDroplets: 7,
        minSpread: 10,
        maxSpread: 28,
        
        // Quick persistence (1.5 seconds before fade, 1 second fade)
        fadeStartDelay: 1500,
        fadeDuration: 1000,
        
        // Balanced visual settings
        initialAlpha: 0.45,  // Balanced transparency
        colorVariation: 0.12,  // Slight color variation
        
        // Performance limits
        maxSplatters: 120,
        cleanupBatchSize: 20,
        
        // Balanced scaling with combo
        scaleWithCombo: true,
        comboScaleFactor: 0.2, // 20% more droplets per combo level
        maxComboScale: 1.8 // Max 1.8x droplets at high combos
    };
    
    constructor(scene: Scene, config?: Partial<IPaintSplatterConfig>) {
        this.scene = scene;
        this.config = { ...PaintSplatterSystem.DEFAULT_CONFIG, ...config };
        this.setupEventListeners();
    }
    
    /**
     * Update configuration at runtime
     */
    public updateConfig(config: Partial<IPaintSplatterConfig>): void {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * Get current configuration
     */
    public getConfig(): IPaintSplatterConfig {
        return { ...this.config };
    }
    
    private setupEventListeners(): void {
        // Listen for the actual bubble explosion event
        this.scene.events.on('bubble-exploded', this.handleBubbleExplosion, this);
    }
    
    private handleBubbleExplosion(data: {
        x: number;
        y: number;
        positions?: { x: number, y: number }[];
        color: BubbleColor;
        comboMultiplier?: number;
    }): void {
        // If we have individual positions, create splatters at each bubble
        if (data.positions && data.positions.length > 0) {
            // Calculate droplets per bubble based on total match size
            const dropletsPerBubble = this.calculateDropletsPerBubble(data.comboMultiplier || 1, data.positions.length);
            
            // Create splatters at each bubble position
            data.positions.forEach(pos => {
                this.createSplatterAtPosition(pos.x, pos.y, data.color, dropletsPerBubble);
            });
        } else {
            // Fallback to center position for compatibility
            this.createSplatter(data.x, data.y, data.color, data.comboMultiplier || 1);
        }
    }
    
    private calculateDropletsPerBubble(matchSize: number, bubbleCount: number): number {
        // Calculate total droplets for the match size
        let totalDroplets: number;
        
        if (matchSize <= 3) {
            totalDroplets = Phaser.Math.Between(5, 6);
        } else if (matchSize === 4) {
            totalDroplets = Phaser.Math.Between(8, 10);
        } else if (matchSize === 5) {
            totalDroplets = Phaser.Math.Between(12, 14);
        } else if (matchSize === 6) {
            totalDroplets = Phaser.Math.Between(16, 18);
        } else {
            totalDroplets = Phaser.Math.Between(20, 24);
        }
        
        // Distribute droplets across all bubbles
        // Each bubble gets at least 1-2 droplets, with some getting more
        const baseDroplets = Math.max(1, Math.floor(totalDroplets / bubbleCount));
        const extraDroplets = totalDroplets % bubbleCount;
        
        // Return base amount plus possible extra
        return baseDroplets + (Math.random() < extraDroplets / bubbleCount ? 1 : 0);
    }
    
    private createSplatterAtPosition(x: number, y: number, color: BubbleColor, dropletCount: number): void {
        // Validate position
        if (!this.isValidPosition(x, y)) {
            return;
        }
        
        // Create specified number of droplets at this position
        for (let i = 0; i < dropletCount; i++) {
            this.createDroplet(x, y, color, 1);
        }
    }
    
    private createSplatter(x: number, y: number, color: BubbleColor, multiplier: number): void {
        // Validate position
        if (!this.isValidPosition(x, y)) {
            return;
        }
        
        // Clean up old splatters if we have too many
        if (this.splatters.length > this.config.maxSplatters) {
            const toRemove = this.splatters.splice(0, this.config.cleanupBatchSize);
            toRemove.forEach(g => {
                this.scene.tweens.killTweensOf(g);
                g.destroy();
            });
        }
        
        // Calculate droplet count based on match size (multiplier)
        // Ensure larger matches ALWAYS create more droplets
        let dropletCount: number;
        
        if (multiplier <= 3) {
            // Small match (3): 5-6 droplets
            dropletCount = Phaser.Math.Between(5, 6);
        } else if (multiplier === 4) {
            // Medium match (4): 8-10 droplets
            dropletCount = Phaser.Math.Between(8, 10);
        } else if (multiplier === 5) {
            // Large match (5): 12-14 droplets
            dropletCount = Phaser.Math.Between(12, 14);
        } else if (multiplier === 6) {
            // Huge match (6): 16-18 droplets
            dropletCount = Phaser.Math.Between(16, 18);
        } else {
            // Epic match (7+): 20-24 droplets
            dropletCount = Phaser.Math.Between(20, 24);
        }
        
        // Apply configuration limits (allow up to 3x the config for epic combos)
        dropletCount = Math.min(dropletCount, this.config.maxDroplets * 3);
        
        // Create droplets
        for (let i = 0; i < dropletCount; i++) {
            this.createDroplet(x, y, color, multiplier);
        }
    }
    
    private createDroplet(centerX: number, centerY: number, color: BubbleColor, multiplier: number): void {
        // Random position around center
        const angle = Math.random() * Math.PI * 2;
        
        // Slightly larger spread for bigger combos
        const spreadMultiplier = this.config.scaleWithCombo ? 
            Math.min(1 + (multiplier - 1) * 0.1, 1.5) : 1;
            
        const distance = Phaser.Math.Between(
            this.config.minSpread * spreadMultiplier,
            this.config.maxSpread * spreadMultiplier
        );
        
        const dropletX = centerX + Math.cos(angle) * distance;
        const dropletY = centerY + Math.sin(angle) * distance;
        
        // Validate droplet position
        if (!this.isValidPosition(dropletX, dropletY)) {
            return;
        }
        
        // Create graphics object for this droplet
        const graphics = this.scene.add.graphics();
        
        // Random droplet size (slightly larger for big combos)
        const sizeMultiplier = this.config.scaleWithCombo && multiplier > 3 ? 
            1 + (multiplier - 3) * 0.05 : 1;
            
        const size = Phaser.Math.FloatBetween(
            this.config.minDropletSize * sizeMultiplier,
            this.config.maxDropletSize * sizeMultiplier
        );
        
        // Apply color with slight variation
        const variedColor = this.applyColorVariation(color);
        
        // Set depth behind bubbles
        graphics.setDepth(Z_LAYERS.BACKGROUND + 1);
        graphics.setAlpha(this.config.initialAlpha);
        
        // Draw the droplet at its position
        graphics.fillStyle(variedColor, 1);
        
        // Random shape with weighted probabilities
        const shapeType = Math.random();
        if (shapeType < 0.4) {
            // 40% - Simple circle (most common)
            graphics.fillCircle(dropletX, dropletY, size);
        } else if (shapeType < 0.7) {
            // 30% - Ellipse (stretched droplet)
            const rotation = Math.random() * Math.PI;
            graphics.save();
            graphics.translateCanvas(dropletX, dropletY);
            graphics.rotateCanvas(rotation);
            graphics.fillEllipse(0, 0, size * 1.5, size * 0.6);
            graphics.restore();
        } else if (shapeType < 0.9) {
            // 20% - Teardrop shape
            graphics.save();
            graphics.translateCanvas(dropletX, dropletY);
            graphics.rotateCanvas(angle); // Point away from center
            graphics.beginPath();
            graphics.arc(0, 0, size, 0, Math.PI * 2);
            graphics.lineTo(size * 1.5, 0);
            graphics.closePath();
            graphics.fillPath();
            graphics.restore();
        } else {
            // 10% - Irregular splat (rare, more complex)
            graphics.beginPath();
            graphics.moveTo(dropletX, dropletY);
            const points = Phaser.Math.Between(4, 7);
            for (let j = 0; j < points; j++) {
                const pointAngle = (j / points) * Math.PI * 2;
                const pointDist = size * (0.6 + Math.random() * 0.8);
                const px = dropletX + Math.cos(pointAngle) * pointDist;
                const py = dropletY + Math.sin(pointAngle) * pointDist;
                if (j === 0) {
                    graphics.moveTo(px, py);
                } else {
                    graphics.lineTo(px, py);
                }
            }
            graphics.closePath();
            graphics.fillPath();
        }
        
        // Remove animation for subtlety - splatters just appear naturally
        
        // Add to tracking array
        this.splatters.push(graphics);
        
        // PERFORMANCE: Aggressive cleanup to prevent memory issues
        // Start cleanup earlier when approaching limit
        if (this.splatters.length > this.config.maxSplatters * 0.7) {
            // Remove oldest splatters more aggressively
            const toRemove = Math.min(5, this.splatters.length - this.config.maxSplatters * 0.5);
            for (let i = 0; i < toRemove; i++) {
                const oldSplatter = this.splatters.shift();
                if (oldSplatter) {
                    this.scene.tweens.killTweensOf(oldSplatter);
                    oldSplatter.destroy();
                }
            }
        }
        
        // Schedule fade out with configured timing
        this.scene.time.delayedCall(
            this.config.fadeStartDelay,
            () => {
                this.scene.tweens.add({
                    targets: graphics,
                    alpha: 0,
                    duration: this.config.fadeDuration,
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
        
        const variation = this.config.colorVariation;
        
        // Apply subtle darker variation (paint tends to be darker when splattered)
        const darkness = 0.8 + Math.random() * 0.2; // 80-100% brightness for subtlety
        
        const newR = Math.min(255, Math.max(0, r * darkness + (Math.random() - 0.5) * 255 * variation));
        const newG = Math.min(255, Math.max(0, g * darkness + (Math.random() - 0.5) * 255 * variation));
        const newB = Math.min(255, Math.max(0, b * darkness + (Math.random() - 0.5) * 255 * variation));
        
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
    
    /**
     * Get current splatter count
     */
    public getSplatterCount(): number {
        return this.splatters.length;
    }
    
    /**
     * Clear all splatters immediately
     */
    public clear(): void {
        this.splatters.forEach(graphics => {
            this.scene.tweens.killTweensOf(graphics);
            graphics.destroy();
        });
        this.splatters = [];
    }
    
    /**
     * Set quality preset for performance optimization
     */
    public setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
        switch (preset) {
            case 'low':
                this.updateConfig({
                    minDroplets: 1,
                    maxDroplets: 2,
                    minDropletSize: 1,
                    maxDropletSize: 2,
                    maxSplatters: 30,
                    fadeStartDelay: 800,
                    fadeDuration: 500,
                    initialAlpha: 0.25
                });
                break;
            case 'medium':
                this.updateConfig({
                    minDroplets: 2,
                    maxDroplets: 4,
                    minDropletSize: 1,
                    maxDropletSize: 3,
                    maxSplatters: 60,
                    fadeStartDelay: 1200,
                    fadeDuration: 800,
                    initialAlpha: 0.3
                });
                break;
            case 'high':
                this.updateConfig({
                    minDroplets: 3,
                    maxDroplets: 8,
                    minDropletSize: 1.5,
                    maxDropletSize: 5,
                    maxSplatters: 120,
                    fadeStartDelay: 1500,
                    fadeDuration: 1000,
                    initialAlpha: 0.45
                });
                break;
            case 'ultra':
                this.updateConfig({
                    minDroplets: 3,
                    maxDroplets: 8,
                    minDropletSize: 1,
                    maxDropletSize: 5,
                    maxSplatters: 150,
                    fadeStartDelay: 2000,
                    fadeDuration: 1200,
                    initialAlpha: 0.4,
                    scaleWithCombo: true,
                    maxComboScale: 2
                });
                break;
        }
    }
    
    /**
     * Destroy system and clean up resources
     */
    public destroy(): void {
        this.scene.events.off('bubble-exploded', this.handleBubbleExplosion, this);
        this.clear();
    }
}