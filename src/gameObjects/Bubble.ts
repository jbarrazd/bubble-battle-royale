import { BubbleColor, IHexPosition } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';
import { HD_SCALE } from '@/config/GameConfig';

export class Bubble extends Phaser.GameObjects.Container {
    private bubbleSprite: Phaser.GameObjects.Arc;
    private gridPosition: IHexPosition | null = null;
    private color: BubbleColor;
    private isSpecial: boolean = false;
    private pooled: boolean = false;
    private shooter: 'player' | 'ai' | 'none' = 'none';

    constructor(scene: Phaser.Scene, x: number, y: number, color: BubbleColor) {
        super(scene, x, y);
        
        this.color = color;
        
        // ULTRA SIMPLE: Just one circle for maximum performance
        this.bubbleSprite = scene.add.circle(0, 0, BUBBLE_CONFIG.SIZE / 2, color);
        // NO BORDER for absolute maximum performance
        // this.bubbleSprite.setStrokeStyle(1, this.getDarkerColor(color), 0.6);
        
        // Only add the main sprite - no shadows, no highlights
        this.add([this.bubbleSprite]);
        
        this.setSize(BUBBLE_CONFIG.SIZE, BUBBLE_CONFIG.SIZE);
        this.setDepth(Z_LAYERS.BUBBLES);  // Use regular bubble layer, not front
        
        scene.add.existing(this);
    }

    public setGridPosition(hex: IHexPosition | null): void {
        this.gridPosition = hex;
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
        this.color = color;
        // Update visual sprite to match
        this.bubbleSprite.setFillStyle(color);
        // Simple thin border
        this.bubbleSprite.setStrokeStyle(1, this.getDarkerColor(color), 0.6);
    }

    public setTint(tint: number): void {
        this.bubbleSprite.setFillStyle(tint);
    }

    public clearTint(): void {
        this.bubbleSprite.setFillStyle(this.color);
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
        this.scene.tweens.add({
            targets: this.bubbleSprite,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Add pulsing glow effect
        const glow = this.scene.add.circle(0, 0, BUBBLE_CONFIG.SIZE / 2 + (2 * HD_SCALE), this.color, 0.3);
        this.addAt(glow, 0);
    }

    private removeGlow(): void {
        this.scene.tweens.killTweensOf(this.bubbleSprite);
        this.bubbleSprite.setScale(1);
        if (this.length > 2) {
            this.removeAt(0);
        }
    }

    private getDarkerColor(color: BubbleColor): number {
        // Create darker shade for border
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        
        return (Math.floor(r * 0.7) << 16) | 
               (Math.floor(g * 0.7) << 8) | 
               Math.floor(b * 0.7);
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
        // Pop animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: BUBBLE_CONFIG.ANIMATION_DURATION,
            ease: 'Power2',
            onComplete: () => {
                this.setVisible(false);
                this.returnToPool();
            }
        });
        
        // Create particle effect
        this.createPopParticles();
    }

    private createPopParticles(): void {
        // Create simple circle particles since we don't have a particle texture
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(
                this.x, 
                this.y, 
                4,
                this.color,
                1
            );
            
            const angle = (Math.PI * 2 * i) / 5;
            const speed = Phaser.Math.Between(50, 150);
            
            this.scene.tweens.add({
                targets: particle,
                x: this.x + Math.cos(angle) * speed,
                y: this.y + Math.sin(angle) * speed,
                scale: 0,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }

    public reset(x: number, y: number, color?: BubbleColor): void {
        this.setPosition(x, y);
        this.setAlpha(1);
        this.setScale(1);
        this.setVisible(true);
        this.gridPosition = null;
        this.isSpecial = false;
        this.pooled = false;
        
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