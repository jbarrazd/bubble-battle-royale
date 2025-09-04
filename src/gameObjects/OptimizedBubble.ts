/**
 * OptimizedBubble - Performance-optimized bubble using pre-rendered textures
 * Instead of creating multiple graphic layers, uses a single cached texture
 */

import { BubbleColor, IHexPosition } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';
import { BubbleTextureCache } from '@/systems/rendering/BubbleTextureCache';

export class OptimizedBubble extends Phaser.GameObjects.Image {
    private gridPosition: IHexPosition | null = null;
    private color: BubbleColor;
    private isSpecial: boolean = false;
    private pooled: boolean = false;
    private shooter: 'player' | 'ai' | 'none' = 'none';
    private textureCache: BubbleTextureCache;

    constructor(
        scene: Phaser.Scene, 
        x: number, 
        y: number, 
        color: BubbleColor,
        textureCache: BubbleTextureCache
    ) {
        // Get texture key or use fallback
        const textureKey = textureCache.getTextureKey(color) || '__DEFAULT';
        super(scene, x, y, textureKey);
        
        this.color = color;
        this.textureCache = textureCache;
        
        // Wait for texture to be ready if not cached yet
        if (!textureCache.hasTexture(color)) {
            // Create a temporary texture
            console.warn(`Texture not ready for ${color}, creating fallback`);
            const graphics = scene.add.graphics();
            graphics.fillStyle(color, 1);
            graphics.fillCircle(BUBBLE_CONFIG.SIZE / 2, BUBBLE_CONFIG.SIZE / 2, BUBBLE_CONFIG.SIZE / 2);
            
            const rt = scene.add.renderTexture(0, 0, BUBBLE_CONFIG.SIZE, BUBBLE_CONFIG.SIZE);
            rt.draw(graphics, 0, 0);
            rt.setVisible(false);
            
            const fallbackKey = `bubble_fallback_${color}_${Date.now()}`;
            rt.saveTexture(fallbackKey);
            this.setTexture(fallbackKey);
            
            graphics.destroy();
            rt.destroy();
        }
        
        this.setDisplaySize(BUBBLE_CONFIG.SIZE, BUBBLE_CONFIG.SIZE);
        this.setDepth(Z_LAYERS.BUBBLES);
        
        scene.add.existing(this);
    }
    
    public setColor(color: BubbleColor): void {
        this.color = color;
        
        // Update texture
        const textureKey = this.textureCache.getTextureKey(color);
        if (textureKey && this.scene.textures.exists(textureKey)) {
            this.setTexture(textureKey);
        }
    }

    // setTint and clearTint are already inherited from Image

    public pop(): void {
        // Simple pop animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: BUBBLE_CONFIG.ANIMATION_DURATION,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.setVisible(false);
                this.returnToPool();
            }
        });
        
        // Rotate for dynamic effect
        this.scene.tweens.add({
            targets: this,
            angle: Phaser.Math.Between(-45, 45),
            duration: BUBBLE_CONFIG.ANIMATION_DURATION,
            ease: 'Power2'
        });
        
        // Simple particle effect
        this.createPopParticles();
    }

    private createPopParticles(): void {
        const particleCount = 6; // Reduced for performance
        
        for (let i = 0; i < particleCount; i++) {
            const size = Phaser.Math.Between(3, 5);
            const particle = this.scene.add.circle(
                this.x, 
                this.y, 
                size,
                this.color,
                1
            );
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Phaser.Math.Between(50, 100);
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 350,
                ease: 'Expo.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    public fall(): void {
        const fallY = this.scene.scale.height + 100;
        const fallDuration = 600;
        
        this.scene.tweens.add({
            targets: this,
            y: fallY,
            rotation: Phaser.Math.Between(-2, 2),
            duration: fallDuration,
            ease: 'Quad.easeIn',
            onComplete: () => {
                this.returnToPool();
            }
        });
        
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: fallDuration,
            ease: 'Linear'
        });
    }

    public flash(): void {
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 1, to: 0.3 },
            duration: 100,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
        });
    }

    public getColor(): BubbleColor {
        return this.color;
    }

    public setGridPosition(position: IHexPosition | null): void {
        this.gridPosition = position;
    }

    public getGridPosition(): IHexPosition | null {
        return this.gridPosition;
    }

    public setSpecial(special: boolean): void {
        this.isSpecial = special;
        if (special) {
            this.setScale(1.1);
        } else {
            this.setScale(1.0);
        }
    }

    public isSpecialBubble(): boolean {
        return this.isSpecial;
    }

    public returnToPool(): void {
        this.setVisible(false);
        this.setActive(false);
        this.clearTint();
        this.setAlpha(1);
        this.setScale(1);
        this.setRotation(0);
        this.gridPosition = null;
        this.isSpecial = false;
        this.pooled = true;
        this.shooter = 'none';
        
        if (this.parentContainer) {
            this.parentContainer.remove(this);
        }
    }

    public setFromPool(x: number, y: number, color: BubbleColor): void {
        this.setPosition(x, y);
        this.setColor(color);
        this.setVisible(true);
        this.setActive(true);
        this.setAlpha(1);
        this.setScale(1);
        this.pooled = false;
    }

    public isPooled(): boolean {
        return this.pooled;
    }

    public setShooter(shooter: 'player' | 'ai' | 'none'): void {
        this.shooter = shooter;
    }

    public getShooter(): 'player' | 'ai' | 'none' {
        return this.shooter;
    }
    
    /**
     * Reset bubble to a new state (for pool reuse)
     */
    public reset(x: number, y: number, color: BubbleColor): void {
        this.setFromPool(x, y, color);
    }
    
    /**
     * Static method to get random color
     */
    public static getRandomColor(): BubbleColor {
        const colors = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.GREEN,
            BubbleColor.YELLOW,
            BubbleColor.PURPLE
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
}