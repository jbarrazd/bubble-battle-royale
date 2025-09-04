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

        // Create temporary container at render texture center
        const tempContainer = this.scene.add.container(centerX, centerY);
        
        // 1. Shadow - exact same as original Bubble
        const shadow = this.scene.add.circle(3, 5, radius, 0x000000, 0.2);
        shadow.setScale(0.95);
        
        // 2. Main bubble - exact same as original
        const mainBubble = this.scene.add.circle(0, 0, radius, color);
        mainBubble.setStrokeStyle(3, this.getDarkerColor(color), 1);
        
        // 3. Inner gradient - exact same as original
        const innerGradient = this.scene.add.circle(0, 2, radius - 4, this.getDarkerColor(color));
        innerGradient.setAlpha(0.5);
        innerGradient.setScale(0.9);
        
        // 4. Rim light - exact same as original
        const rimLight = this.scene.add.circle(0, 0, radius - 2, this.getLighterColor(color));
        rimLight.setAlpha(0.0);
        rimLight.setStrokeStyle(3, this.getLighterColor(color), 0.6);
        
        // 5. Primary highlight - exact same as original
        const highlight1 = this.scene.add.circle(
            -radius * 0.35,
            -radius * 0.4,
            radius * 0.4,
            0xFFFFFF,
            0.3
        );
        
        // 6. Secondary highlight - exact same as original
        const highlight2 = this.scene.add.circle(
            radius * 0.3,
            -radius * 0.35,
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
        // Exact same formula as Bubble class
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        // Much darker for inner gradient - same as Bubble
        return (Math.floor(r * 0.5) << 16) | 
               (Math.floor(g * 0.5) << 8) | 
               Math.floor(b * 0.5);
    }

    /**
     * Get a lighter shade of a color
     */
    private getLighterColor(color: number): number {
        // Exact same formula as Bubble class
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        // Lighter version for rim - same as Bubble
        const lr = Math.min(255, Math.floor(r * 1.3 + 50));
        const lg = Math.min(255, Math.floor(g * 1.3 + 50));
        const lb = Math.min(255, Math.floor(b * 1.3 + 50));
        
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