import { Scene } from 'phaser';

/**
 * Optimized texture caching system
 * Reduces texture switching and improves rendering performance
 */
export class TextureCache {
    private scene: Scene;
    private cache: Map<string, Phaser.Textures.Texture> = new Map();
    private renderTextures: Map<string, Phaser.GameObjects.RenderTexture> = new Map();
    private textureUsage: Map<string, number> = new Map();
    
    // Cache configuration
    private readonly MAX_CACHE_SIZE = 100;
    private readonly RENDER_TEXTURE_SIZE = 128; // Size for bubble textures
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeCache();
    }
    
    /**
     * Initialize texture cache
     */
    private initializeCache(): void {
        // Preload common textures
        this.createBubbleTextures();
        this.createEffectTextures();
        
        console.log(`🖼️ TextureCache: Initialized with ${this.cache.size} textures`);
    }
    
    /**
     * Create optimized bubble textures
     */
    private createBubbleTextures(): void {
        const colors = [
            { name: 'red', color: 0xff0000 },
            { name: 'blue', color: 0x0000ff },
            { name: 'yellow', color: 0xffff00 },
            { name: 'green', color: 0x00ff00 },
            { name: 'purple', color: 0xff00ff },
            { name: 'orange', color: 0xffa500 }
        ];
        
        for (const { name, color } of colors) {
            const key = `bubble_${name}_cached`;
            
            // Create render texture for bubble
            const rt = this.scene.add.renderTexture(
                -1000, -1000,
                this.RENDER_TEXTURE_SIZE,
                this.RENDER_TEXTURE_SIZE
            );
            rt.setVisible(false);
            
            // Draw bubble on render texture
            const graphics = this.scene.add.graphics();
            
            // Main bubble with simple fill
            graphics.fillStyle(color, 1);
            graphics.fillCircle(
                this.RENDER_TEXTURE_SIZE / 2,
                this.RENDER_TEXTURE_SIZE / 2,
                this.RENDER_TEXTURE_SIZE / 2 - 2
            );
            
            // Add highlight
            graphics.fillStyle(0xffffff, 0.4);
            graphics.fillEllipse(
                this.RENDER_TEXTURE_SIZE / 2 - 10,
                this.RENDER_TEXTURE_SIZE / 2 - 15,
                25, 20
            );
            
            // Draw to render texture
            rt.draw(graphics);
            graphics.destroy();
            
            // Save to cache
            this.renderTextures.set(key, rt);
            
            // Create texture from render texture
            rt.saveTexture(key);
        }
    }
    
    /**
     * Create effect textures (explosions, particles, etc.)
     */
    private createEffectTextures(): void {
        // Create glow texture
        this.createGlowTexture('glow_cached', 64, 0xffffff);
        
        // Create particle textures
        this.createParticleTexture('particle_star_cached', 32);
        this.createParticleTexture('particle_circle_cached', 16);
        
        // Create spark texture
        this.createSparkTexture('spark_cached', 32);
    }
    
    /**
     * Create a glow texture
     */
    private createGlowTexture(key: string, size: number, color: number): void {
        const rt = this.scene.add.renderTexture(-1000, -1000, size, size);
        rt.setVisible(false);
        
        const graphics = this.scene.add.graphics();
        
        // Create simple glow effect with multiple circles
        graphics.fillStyle(color, 0.1);
        graphics.fillCircle(size / 2, size / 2, size / 2);
        graphics.fillStyle(color, 0.3);
        graphics.fillCircle(size / 2, size / 2, size / 2 * 0.7);
        graphics.fillStyle(color, 0.5);
        graphics.fillCircle(size / 2, size / 2, size / 2);
        
        rt.draw(graphics);
        graphics.destroy();
        
        rt.saveTexture(key);
        this.renderTextures.set(key, rt);
    }
    
    /**
     * Create a particle texture
     */
    private createParticleTexture(key: string, size: number): void {
        const rt = this.scene.add.renderTexture(-1000, -1000, size, size);
        rt.setVisible(false);
        
        const graphics = this.scene.add.graphics();
        
        if (key.includes('star')) {
            // Draw star
            const points: number[] = [];
            const spikes = 5;
            const outerRadius = size / 2;
            const innerRadius = size / 4;
            
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes;
                points.push(
                    size / 2 + Math.cos(angle) * radius,
                    size / 2 + Math.sin(angle) * radius
                );
            }
            
            graphics.fillStyle(0xffffff);
            graphics.fillPoints(points, true);
        } else {
            // Draw circle
            graphics.fillStyle(0xffffff);
            graphics.fillCircle(size / 2, size / 2, size / 2);
        }
        
        rt.draw(graphics);
        graphics.destroy();
        
        rt.saveTexture(key);
        this.renderTextures.set(key, rt);
    }
    
    /**
     * Create a spark texture
     */
    private createSparkTexture(key: string, size: number): void {
        const rt = this.scene.add.renderTexture(-1000, -1000, size, size);
        rt.setVisible(false);
        
        const graphics = this.scene.add.graphics();
        
        // Draw spark lines
        graphics.lineStyle(2, 0xffffff, 1);
        
        const centerX = size / 2;
        const centerY = size / 2;
        const sparkLength = size / 2 - 2;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            graphics.beginPath();
            graphics.moveTo(centerX, centerY);
            graphics.lineTo(
                centerX + Math.cos(angle) * sparkLength,
                centerY + Math.sin(angle) * sparkLength
            );
            graphics.strokePath();
        }
        
        // Add center glow
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillCircle(centerX, centerY, 3);
        
        rt.draw(graphics);
        graphics.destroy();
        
        rt.saveTexture(key);
        this.renderTextures.set(key, rt);
    }
    
    /**
     * Get a cached texture
     */
    public getTexture(key: string): string {
        // Track usage
        this.textureUsage.set(key, (this.textureUsage.get(key) || 0) + 1);
        
        // Check if texture exists in cache
        if (this.scene.textures.exists(key)) {
            return key;
        }
        
        // Return default texture if not found
        return 'bubble'; // Fallback to default
    }
    
    /**
     * Preload textures based on usage patterns
     */
    public optimizeCache(): void {
        // Sort textures by usage
        const sorted = Array.from(this.textureUsage.entries())
            .sort((a, b) => b[1] - a[1]);
        
        // Keep most used textures, remove least used if over limit
        if (sorted.length > this.MAX_CACHE_SIZE) {
            const toRemove = sorted.slice(this.MAX_CACHE_SIZE);
            
            for (const [key] of toRemove) {
                const rt = this.renderTextures.get(key);
                if (rt) {
                    rt.destroy();
                    this.renderTextures.delete(key);
                }
                
                if (this.scene.textures.exists(key)) {
                    this.scene.textures.remove(key);
                }
                
                this.textureUsage.delete(key);
            }
            
            console.log(`TextureCache: Removed ${toRemove.length} unused textures`);
        }
    }
    
    /**
     * Create a batch renderer for similar objects
     */
    public createBatch(textureKey: string, maxSize: number = 1000): Phaser.GameObjects.Blitter {
        const blitter = this.scene.add.blitter(0, 0, textureKey);
        blitter.setSize(this.scene.cameras.main.width, this.scene.cameras.main.height);
        return blitter;
    }
    
    /**
     * Get cache statistics
     */
    public getStats(): any {
        return {
            totalTextures: this.renderTextures.size,
            cacheSize: this.cache.size,
            mostUsed: Array.from(this.textureUsage.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key, count]) => ({ key, count }))
        };
    }
    
    /**
     * Clear all cached textures
     */
    public clear(): void {
        for (const rt of this.renderTextures.values()) {
            rt.destroy();
        }
        
        this.cache.clear();
        this.renderTextures.clear();
        this.textureUsage.clear();
    }
    
    /**
     * Destroy the cache
     */
    public destroy(): void {
        this.clear();
    }
}

// Singleton instance
let cacheInstance: TextureCache | null = null;

export function getTextureCache(scene?: Scene): TextureCache {
    if (!cacheInstance && scene) {
        cacheInstance = new TextureCache(scene);
    }
    
    if (!cacheInstance) {
        throw new Error('TextureCache not initialized. Provide a scene on first call.');
    }
    
    return cacheInstance;
}

export function resetTextureCache(): void {
    if (cacheInstance) {
        cacheInstance.destroy();
        cacheInstance = null;
    }
}