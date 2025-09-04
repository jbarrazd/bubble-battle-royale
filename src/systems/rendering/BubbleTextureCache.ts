/**
 * BubbleTextureCache - Pre-renders bubble graphics to textures for performance
 * This system creates high-quality bubble textures once at startup
 * and reuses them throughout the game for optimal performance
 */

import { Scene } from 'phaser';
import { BubbleColor } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG } from '@/config/ArenaConfig';

export class BubbleTextureCache {
    private scene: Scene;
    private textureKeys: Map<BubbleColor, string> = new Map();
    private isInitialized: boolean = false;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    /**
     * Initialize the texture cache by pre-rendering all bubble colors
     */
    public initialize(): void {
        if (this.isInitialized) {
            console.log('BubbleTextureCache: Already initialized');
            return;
        }

        console.log('BubbleTextureCache: Starting pre-render of bubble textures...');
        
        // Pre-render each bubble color
        const colors = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.GREEN,
            BubbleColor.YELLOW,
            BubbleColor.PURPLE
        ];

        colors.forEach(color => {
            this.createBubbleTexture(color);
        });

        this.isInitialized = true;
        console.log('BubbleTextureCache: Pre-render complete! All textures cached.');
    }

    /**
     * Create a pre-rendered texture for a bubble color
     */
    private createBubbleTexture(color: BubbleColor): void {
        const textureKey = `bubble_texture_${color}`;
        
        // Check if texture already exists
        if (this.scene.textures.exists(textureKey)) {
            this.textureKeys.set(color, textureKey);
            return;
        }

        // Create a render texture
        const size = Math.ceil(BUBBLE_CONFIG.SIZE);
        const renderTexture = this.scene.add.renderTexture(0, 0, size + 10, size + 10);
        renderTexture.setVisible(false); // Hide from view
        
        const radius = BUBBLE_CONFIG.SIZE / 2;
        const centerX = radius + 5;
        const centerY = radius + 5;

        // Create temporary graphics for the bubble design
        const tempContainer = this.scene.add.container(0, 0);
        
        // 1. Shadow
        const shadow = this.scene.add.circle(
            centerX + 3, 
            centerY + 5, 
            radius, 
            0x000000, 
            0.2
        );
        shadow.setScale(0.95);
        
        // 2. Main bubble
        const mainBubble = this.scene.add.circle(
            centerX, 
            centerY, 
            radius, 
            color
        );
        mainBubble.setStrokeStyle(3, this.getDarkerColor(color), 1);
        
        // 3. Inner gradient
        const innerGradient = this.scene.add.circle(
            centerX, 
            centerY + 2, 
            radius - 4, 
            this.getDarkerColor(color)
        );
        innerGradient.setAlpha(0.5);
        innerGradient.setScale(0.9);
        
        // 4. Rim light
        const rimLight = this.scene.add.circle(
            centerX, 
            centerY, 
            radius - 2, 
            this.getLighterColor(color)
        );
        rimLight.setAlpha(0.0);
        rimLight.setStrokeStyle(3, this.getLighterColor(color), 0.6);
        
        // 5. Primary highlight
        const highlight1 = this.scene.add.circle(
            centerX - radius * 0.35,
            centerY - radius * 0.4,
            radius * 0.4,
            0xFFFFFF,
            0.3
        );
        
        // 6. Secondary highlight
        const highlight2 = this.scene.add.circle(
            centerX + radius * 0.3,
            centerY - radius * 0.35,
            radius * 0.25,
            0xFFFFFF,
            0.2
        );
        
        // Add all elements to container
        tempContainer.add([
            shadow,
            mainBubble,
            innerGradient,
            rimLight,
            highlight1,
            highlight2
        ]);
        
        // Draw the container to the render texture
        renderTexture.draw(tempContainer);
        
        // Save the render texture directly
        renderTexture.saveTexture(textureKey);
        this.textureKeys.set(color, textureKey);
        
        // Clean up temporary objects
        tempContainer.destroy(true);
        renderTexture.destroy();
        
        console.log(`BubbleTextureCache: Created texture for color ${color}`);
    }

    /**
     * Get the texture key for a bubble color
     */
    public getTextureKey(color: BubbleColor): string | undefined {
        return this.textureKeys.get(color);
    }

    /**
     * Check if a texture exists for a color
     */
    public hasTexture(color: BubbleColor): boolean {
        const key = this.textureKeys.get(color);
        return key !== undefined && this.scene.textures.exists(key);
    }

    /**
     * Get a darker shade of a color
     */
    private getDarkerColor(color: number): number {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        const dr = Math.max(0, r - 40);
        const dg = Math.max(0, g - 40);
        const db = Math.max(0, b - 40);
        
        return (dr << 16) | (dg << 8) | db;
    }

    /**
     * Get a lighter shade of a color
     */
    private getLighterColor(color: number): number {
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        
        const lr = Math.min(255, r + 60);
        const lg = Math.min(255, g + 60);
        const lb = Math.min(255, b + 60);
        
        return (lr << 16) | (lg << 8) | lb;
    }

    /**
     * Cleanup and destroy all cached textures
     */
    public destroy(): void {
        this.textureKeys.forEach((key) => {
            if (this.scene.textures.exists(key)) {
                this.scene.textures.remove(key);
            }
        });
        
        this.textureKeys.clear();
        this.isInitialized = false;
        
        console.log('BubbleTextureCache: Destroyed all cached textures');
    }
}