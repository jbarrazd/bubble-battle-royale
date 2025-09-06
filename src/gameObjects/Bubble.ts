import { BubbleColor, IHexPosition } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';
import { HD_SCALE } from '@/config/GameConfig';
import { BubbleTextureCache } from '@/systems/rendering/BubbleTextureCache';

export class Bubble extends Phaser.GameObjects.Container {
    private bubbleSprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Image;
    private innerGradient?: Phaser.GameObjects.Arc;
    private highlightSprite?: Phaser.GameObjects.Arc;
    private secondaryHighlight?: Phaser.GameObjects.Arc;
    private shadowSprite?: Phaser.GameObjects.Arc;
    private rimLight?: Phaser.GameObjects.Arc;
    private patternSprite?: Phaser.GameObjects.Graphics;
    private gridPosition: IHexPosition | null = null;
    private color: BubbleColor;
    private isSpecial: boolean = false;
    private pooled: boolean = false;
    private shooter: 'player' | 'ai' | 'none' = 'none';
    private idleAnimation?: Phaser.Tweens.Tween;
    private usingCachedTexture: boolean = false;
    private static textureCache: BubbleTextureCache | null = null;
    
    // Gem system
    private hasGem: boolean = false;
    private gemType: 'normal' | 'golden' = 'normal';
    private gemVisual?: Phaser.GameObjects.Container;
    
    // Force reinit the cache - useful for design updates
    public static resetTextureCache(): void {
        if (Bubble.textureCache) {
            Bubble.textureCache.destroy();
            Bubble.textureCache = null;
        }
    }

    constructor(scene: Phaser.Scene, x: number, y: number, color: BubbleColor, hasGem: boolean = false) {
        super(scene, x, y);
        
        this.color = color;
        this.hasGem = hasGem;
        
        // Add this container to the scene
        scene.add.existing(this);
        this.setDepth(Z_LAYERS.BUBBLES);
        
        // Initialize texture cache if not already done
        if (!Bubble.textureCache) {
            Bubble.textureCache = new BubbleTextureCache(scene);
            Bubble.textureCache.initialize();
        }
        
        // Check if we have a cached texture for this color
        const textureKey = Bubble.textureCache.getTextureKey(color);
        
        if (textureKey && scene.textures.exists(textureKey)) {
            // Use cached texture for performance
            this.usingCachedTexture = true;
            this.bubbleSprite = scene.add.image(0, 0, textureKey);
            this.add(this.bubbleSprite);
            
            // Pattern sprite for colorblind patterns (still created dynamically)
            this.patternSprite = scene.add.graphics();
            this.add(this.patternSprite);
        } else {
            // Fall back to creating graphics dynamically
            this.usingCachedTexture = false;
            const radius = BUBBLE_CONFIG.SIZE / 2;
            
            // Premium bubble design with multiple layers
            // 1. Simple shadow without blend mode
            this.shadowSprite = scene.add.circle(3, 5, radius, 0x000000, 0.2);
            // NO BLEND MODE for performance
            this.shadowSprite.setScale(0.95);
            
            // 2. Main bubble base
            this.bubbleSprite = scene.add.circle(0, 0, radius, color);
            
            // 3. HD inner gradient with better depth
            this.innerGradient = scene.add.circle(0, 2, radius - 4, this.getDarkerColor(color));
            this.innerGradient.setAlpha(0.5);
            this.innerGradient.setScale(0.9);
            
            // 4. HD rim lighting for 3D pop
            this.rimLight = scene.add.circle(0, 0, radius - 2, this.getLighterColor(color));
            this.rimLight.setAlpha(0.0); // Will be visible only at edges via stroke
            this.rimLight.setStrokeStyle(3, this.getLighterColor(color), 0.6);
            
            // 5. Simple highlight without blend mode
            this.highlightSprite = scene.add.circle(
                -radius * 0.35,
                -radius * 0.4,
                radius * 0.4,
                0xFFFFFF,
                0.3
            );
            // NO BLEND MODE for performance
            
            // 6. Simple secondary highlight
            this.secondaryHighlight = scene.add.circle(
                radius * 0.3,
                -radius * 0.35,
                radius * 0.25,
                0xFFFFFF,
                0.2
            );
            // NO BLEND MODE for performance
            
            // 7. Ultra HD border for crisp definition
            (this.bubbleSprite as Phaser.GameObjects.Arc).setStrokeStyle(3, this.getDarkerColor(color), 1);
            
            // 8. Pattern sprite for colorblind patterns
            this.patternSprite = scene.add.graphics();
            
            // Add all elements in proper order for best visual effect
            this.add([
                this.shadowSprite,
                this.bubbleSprite,
                this.innerGradient,
                this.rimLight,
                this.highlightSprite,
                this.secondaryHighlight,
                this.patternSprite
            ]);
        }
        
        this.setSize(BUBBLE_CONFIG.SIZE, BUBBLE_CONFIG.SIZE);
        this.setDepth(Z_LAYERS.BUBBLES);
        
        scene.add.existing(this);
        
        // Add gem visual if this bubble contains a gem
        if (hasGem) {
            this.addGemVisual();
        }
        
        // No idle animation - keep bubbles static
        // this.addIdleAnimation();
    }
    
    private addGemVisual(): void {
        if (!this.scene) return;
        
        this.gemVisual = this.scene.add.container(0, 0);
        
        // Gem glow inside bubble
        const gemGlow = this.scene.add.circle(0, 0, 12, 0xFFD700, 0.4);
        
        // Gem shape (small diamond)
        const gemPoints = [
            0, -8,   // top
            6, 0,    // right
            0, 8,    // bottom
            -6, 0    // left
        ];
        const gem = this.scene.add.polygon(0, 0, gemPoints, 0xFFD700);
        gem.setStrokeStyle(1, 0xFFFFFF, 1);
        
        // Small sparkle effect
        const sparkle = this.scene.add.star(0, -3, 4, 2, 4, 0xFFFFFF, 0.8);
        sparkle.setScale(0.5);
        
        this.gemVisual.add([gemGlow, gem, sparkle]);
        this.add(this.gemVisual);
        
        // Animate gem floating inside bubble
        this.scene.tweens.add({
            targets: this.gemVisual,
            y: { from: -3, to: 3 },
            angle: { from: -10, to: 10 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Sparkle pulse
        this.scene.tweens.add({
            targets: sparkle,
            scale: { from: 0.5, to: 0.8 },
            alpha: { from: 0.8, to: 1 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    public setGem(hasGem: boolean, type: 'normal' | 'golden' = 'normal'): void {
        if (this.hasGem === hasGem) return;
        
        this.hasGem = hasGem;
        this.gemType = type;
        
        if (hasGem && !this.gemVisual) {
            this.addGemVisual();
        } else if (!hasGem && this.gemVisual) {
            this.gemVisual.destroy();
            this.gemVisual = undefined;
        }
    }
    
    public getHasGem(): boolean {
        return this.hasGem;
    }
    
    public getGemType(): 'normal' | 'golden' {
        return this.gemType;
    }
    
    private addIdleAnimation(): void {
        // DISABLED - No idle animations to keep bubbles static
        // Only animate highlight shimmer if needed
        return; // Early return to disable
        /* Disabled animation code
        if (this.highlightSprite) {
            this.scene.tweens.add({
                targets: this.highlightSprite,
                alpha: { from: 0.4, to: 0.6 },
                duration: 3000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Math.random() * 1000
            });
        }
        */
    }

    public setGridPosition(hex: IHexPosition | null): void;
    public setGridPosition(row: number, col: number): void;
    public setGridPosition(hexOrRow: IHexPosition | number | null, col?: number): void {
        if (typeof hexOrRow === 'number' && col !== undefined) {
            // Row/column format - convert to hex
            this.gridPosition = {
                q: col,
                r: hexOrRow,
                s: -col - hexOrRow
            };
        } else if (hexOrRow && typeof hexOrRow === 'object') {
            // Hex position format
            this.gridPosition = hexOrRow;
        } else {
            this.gridPosition = null;
        }
    }

    public getGridPosition(): IHexPosition | null {
        return this.gridPosition;
    }
    
    public setShooter(shooter: 'player' | 'ai'): void {
        this.shooter = shooter;
    }
    
    public getShooter(): 'player' | 'ai' | 'none' {
        return this.shooter;
    }

    public getColor(): BubbleColor {
        return this.color;
    }
    
    public setColor(color: BubbleColor): void {
        if (this.color === color) return; // No change needed
        
        this.color = color;
        
        if (this.usingCachedTexture && Bubble.textureCache) {
            // Try to use cached texture for the new color
            const textureKey = Bubble.textureCache.getTextureKey(color);
            if (textureKey && this.scene && this.scene.textures && this.scene.textures.exists(textureKey)) {
                (this.bubbleSprite as Phaser.GameObjects.Image).setTexture(textureKey);
            } else {
                // Need to recreate as dynamic graphics
                this.recreateAsDynamicGraphics(color);
            }
        } else {
            // Update dynamic graphics colors
            (this.bubbleSprite as Phaser.GameObjects.Arc).setFillStyle(color);
            (this.bubbleSprite as Phaser.GameObjects.Arc).setStrokeStyle(2, this.getDarkerColor(color), 1);
            
            if (this.innerGradient) {
                this.innerGradient.setFillStyle(this.getDarkerColor(color));
            }
            
            if (this.rimLight) {
                this.rimLight.setStrokeStyle(2, this.getLighterColor(color), 0.5);
            }
        }
    }
    
    private recreateAsDynamicGraphics(color: BubbleColor): void {
        // Remove cached texture sprite
        this.removeAll(true);
        this.usingCachedTexture = false;
        
        const radius = BUBBLE_CONFIG.SIZE / 2;
        
        // Recreate as dynamic graphics
        this.shadowSprite = this.scene.add.circle(3, 5, radius, 0x000000, 0.2);
        this.shadowSprite.setScale(0.95);
        
        this.bubbleSprite = this.scene.add.circle(0, 0, radius, color);
        
        this.innerGradient = this.scene.add.circle(0, 2, radius - 4, this.getDarkerColor(color));
        this.innerGradient.setAlpha(0.5);
        this.innerGradient.setScale(0.9);
        
        this.rimLight = this.scene.add.circle(0, 0, radius - 2, this.getLighterColor(color));
        this.rimLight.setAlpha(0.0);
        this.rimLight.setStrokeStyle(3, this.getLighterColor(color), 0.6);
        
        this.highlightSprite = this.scene.add.circle(
            -radius * 0.35,
            -radius * 0.4,
            radius * 0.4,
            0xFFFFFF,
            0.3
        );
        
        this.secondaryHighlight = this.scene.add.circle(
            radius * 0.3,
            -radius * 0.35,
            radius * 0.25,
            0xFFFFFF,
            0.2
        );
        
        (this.bubbleSprite as Phaser.GameObjects.Arc).setStrokeStyle(3, this.getDarkerColor(color), 1);
        
        this.patternSprite = this.scene.add.graphics();
        
        this.add([
            this.shadowSprite,
            this.bubbleSprite,
            this.innerGradient,
            this.rimLight,
            this.highlightSprite,
            this.secondaryHighlight,
            this.patternSprite
        ]);
    }

    public setTint(tint: number): void {
        if (this.usingCachedTexture) {
            (this.bubbleSprite as Phaser.GameObjects.Image).setTint(tint);
        } else {
            (this.bubbleSprite as Phaser.GameObjects.Arc).setFillStyle(tint);
        }
    }

    public clearTint(): void {
        if (this.usingCachedTexture) {
            (this.bubbleSprite as Phaser.GameObjects.Image).clearTint();
        } else {
            (this.bubbleSprite as Phaser.GameObjects.Arc).setFillStyle(this.color);
        }
    }

    public setSpecial(special: boolean): void {
        this.isSpecial = special;
        if (special) {
            this.addGlow();
        } else {
            this.removeGlow();
        }
    }

    public getIsSpecial(): boolean {
        return this.isSpecial;
    }

    private addGlow(): void {
        // No scale animation - just visual glow
        // Add pulsing glow ring behind bubble
        const glow = this.scene.add.circle(0, 0, BUBBLE_CONFIG.SIZE / 2 + (3 * HD_SCALE), this.color, 0.4);
        glow.setStrokeStyle(2, this.getLighterColor(this.color), 0.6);
        this.addAt(glow, 0);
        
        // Animate only the glow opacity, not the bubble scale
        this.scene.tweens.add({
            targets: glow,
            alpha: { from: 0.2, to: 0.5 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private removeGlow(): void {
        // Remove the glow element if it exists
        const baseElementCount = this.usingCachedTexture ? 2 : 7; // 2 for cached (sprite + pattern), 7 for dynamic
        if (this.length > baseElementCount) {
            const glowElement = this.getAt(0);
            this.scene.tweens.killTweensOf(glowElement);
            this.removeAt(0);
            glowElement.destroy();
        }
    }

    private getDarkerColor(color: BubbleColor): number {
        // Create darker shade for depth
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        // Much darker for inner gradient
        return (Math.floor(r * 0.5) << 16) | 
               (Math.floor(g * 0.5) << 8) | 
               Math.floor(b * 0.5);
    }
    
    private getLighterColor(color: BubbleColor): number {
        // Create lighter shade for rim lighting
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        // Lighter version for rim
        const lr = Math.min(255, Math.floor(r * 1.3 + 50));
        const lg = Math.min(255, Math.floor(g * 1.3 + 50));
        const lb = Math.min(255, Math.floor(b * 1.3 + 50));
        
        return (lr << 16) | (lg << 8) | lb;
    }

    /**
     * Adds colorblind-friendly patterns to bubbles
     * Each color gets a unique pattern for accessibility
     */
    private addColorblindPattern(color: BubbleColor): void {
        if (!this.patternSprite) return;
        
        this.patternSprite.clear();
        this.patternSprite.lineStyle(1 * HD_SCALE, 0xffffff, 0.4);
        
        const radius = BUBBLE_CONFIG.SIZE / 2;
        
        switch (color) {
            case BubbleColor.RED:
                // Horizontal lines pattern
                for (let y = -radius + (2 * HD_SCALE); y < radius; y += (3 * HD_SCALE)) {
                    const x = Math.sqrt(radius * radius - y * y) * 0.8;
                    this.patternSprite.lineBetween(-x, y, x, y);
                }
                break;
                
            case BubbleColor.BLUE:
                // Vertical lines pattern
                for (let x = -radius + (2 * HD_SCALE); x < radius; x += (3 * HD_SCALE)) {
                    const y = Math.sqrt(radius * radius - x * x) * 0.8;
                    this.patternSprite.lineBetween(x, -y, x, y);
                }
                break;
                
            case BubbleColor.GREEN:
                // Diagonal lines (top-left to bottom-right)
                for (let offset = -radius; offset < radius; offset += (3 * HD_SCALE)) {
                    const startX = Math.max(-radius * 0.7, offset - radius * 0.7);
                    const startY = Math.max(-radius * 0.7, -offset - radius * 0.7);
                    const endX = Math.min(radius * 0.7, offset + radius * 0.7);
                    const endY = Math.min(radius * 0.7, -offset + radius * 0.7);
                    this.patternSprite.lineBetween(startX, startY, endX, endY);
                }
                break;
                
            case BubbleColor.YELLOW:
                // Dots pattern
                for (let x = -radius + (3 * HD_SCALE); x < radius; x += (4 * HD_SCALE)) {
                    for (let y = -radius + (3 * HD_SCALE); y < radius; y += (4 * HD_SCALE)) {
                        if (x * x + y * y < radius * radius * 0.7) {
                            this.patternSprite.fillStyle(0xffffff, 0.5);
                            this.patternSprite.fillCircle(x, y, 1 * HD_SCALE);
                        }
                    }
                }
                break;
                
            case BubbleColor.PURPLE:
                // Cross-hatch pattern (X pattern)
                for (let offset = -radius; offset < radius; offset += (3 * HD_SCALE)) {
                    // Diagonal 1
                    const x1 = Math.max(-radius * 0.7, offset - radius * 0.7);
                    const y1 = Math.max(-radius * 0.7, -offset - radius * 0.7);
                    const x2 = Math.min(radius * 0.7, offset + radius * 0.7);
                    const y2 = Math.min(radius * 0.7, -offset + radius * 0.7);
                    this.patternSprite.lineBetween(x1, y1, x2, y2);
                    
                    // Diagonal 2 (opposite)
                    this.patternSprite.lineBetween(x1, -y1, x2, -y2);
                }
                break;
        }
    }

    public pop(): void {
        // Stop idle animation
        if (this.idleAnimation) {
            this.idleAnimation.stop();
        }
        
        // Dynamic pop animation
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
        
        // Create enhanced particle effect
        this.createPopParticles();
    }

    private createPopParticles(): void {
        // Premium particle explosion
        const particleCount = 8;
        const colors = [this.color, this.getLighterColor(this.color), 0xFFFFFF];
        
        for (let i = 0; i < particleCount; i++) {
            const size = Phaser.Math.Between(2, 6);
            const colorIndex = i % colors.length;
            const particle = this.scene.add.circle(
                this.x, 
                this.y, 
                size,
                colors[colorIndex],
                1
            );
            // NO BLEND MODE for performance
            
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
            const speed = Phaser.Math.Between(50, 150);
            const rotationSpeed = Phaser.Math.Between(-360, 360);
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed + Phaser.Math.Between(-10, 30),
                scale: 0,
                alpha: 0,
                angle: rotationSpeed,
                duration: 400 + Math.random() * 100,
                ease: 'Expo.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Simple flash effect for impact
        const flash1 = this.scene.add.circle(this.x, this.y, BUBBLE_CONFIG.SIZE / 2, 0xFFFFFF, 0.4);
        // NO BLEND MODE for performance
        
        this.scene.tweens.add({
            targets: flash1,
            scale: 2,
            alpha: 0,
            duration: 250,
            ease: 'Power2',
            onComplete: () => {
                flash1.destroy();
            }
        });
        
        // Ring burst effect
        const ring = this.scene.add.circle(this.x, this.y, BUBBLE_CONFIG.SIZE / 2, this.color, 0);
        ring.setStrokeStyle(3, this.color, 0.8);
        
        this.scene.tweens.add({
            targets: ring,
            scale: 2.5,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
            }
        });
    }

    public reset(x: number, y: number, color?: BubbleColor, hasGem: boolean = false): void {
        // Ensure we still have a valid scene reference
        if (!this.scene) {
            console.error('Bubble.reset: Scene reference lost! Cannot reset bubble.');
            return;
        }
        
        this.setPosition(x, y);
        this.setAlpha(1);
        this.setScale(1);
        this.setVisible(true);
        this.gridPosition = null;
        this.isSpecial = false;
        this.pooled = false;
        
        // Reset gem state
        this.setGem(hasGem);
        
        // Update color if provided
        if (color !== undefined) {
            this.setColor(color);
        }
    }

    public returnToPool(): void {
        this.pooled = true;
        this.setVisible(false);
        this.gridPosition = null;
        // Reset position to avoid positioning bugs when reused
        this.setPosition(0, 0);
        this.setScale(1);
        this.setAlpha(1);
        this.setAngle(0);
        this.clearTint();
    }

    public isPooled(): boolean {
        return this.pooled;
    }

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