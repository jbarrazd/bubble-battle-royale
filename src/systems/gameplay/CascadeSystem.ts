import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { Z_LAYERS } from '@/config/ArenaConfig';

export interface CascadeResult {
    bubblesFallen: Bubble[];
    cascadeLevel: number;
    bonusGems: number;
}

/**
 * System that handles cascade effects when bubbles fall after others are removed
 * Cascades give bonus gems based on the number of bubbles that fall
 */
export class CascadeSystem {
    private scene: Scene;
    private gridAttachmentSystem: GridAttachmentSystem;
    private cascadeInProgress: boolean = false;
    private cascadeChainLevel: number = 0;
    
    // Cascade bonus configuration from GDD
    private readonly CASCADE_BONUS = {
        small: { min: 4, max: 6, bonus: 1 },  // 4-6 fallen bubbles = +1 gem
        large: { min: 7, max: 999, bonus: 2 }  // 7+ fallen bubbles = +2 gems
    };
    
    constructor(scene: Scene, gridAttachmentSystem: GridAttachmentSystem) {
        this.scene = scene;
        this.gridAttachmentSystem = gridAttachmentSystem;
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for disconnected bubbles (bubbles that will fall)
        this.scene.events.on('bubbles-disconnected', this.handleCascade, this);
        
        // Cleanup
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    /**
     * Handle cascade when bubbles become disconnected and fall
     */
    private async handleCascade(data: { bubbles: Bubble[], isPlayerShot: boolean }): Promise<void> {
        if (this.cascadeInProgress || data.bubbles.length === 0) return;
        
        this.cascadeInProgress = true;
        this.cascadeChainLevel++;
        
        const fallenCount = data.bubbles.length;
        console.log(`🌊 CASCADE! ${fallenCount} bubbles falling (Chain level: ${this.cascadeChainLevel})`);
        
        // Calculate bonus gems based on cascade size
        let bonusGems = 0;
        if (fallenCount >= this.CASCADE_BONUS.large.min) {
            bonusGems = this.CASCADE_BONUS.large.bonus;
        } else if (fallenCount >= this.CASCADE_BONUS.small.min) {
            bonusGems = this.CASCADE_BONUS.small.bonus;
        }
        
        // Add chain bonus (each level adds 1 extra gem)
        if (this.cascadeChainLevel > 1) {
            bonusGems += this.cascadeChainLevel - 1;
        }
        
        // Animate the falling bubbles
        await this.animateCascade(data.bubbles, data.isPlayerShot);
        
        // Award bonus gems if any
        if (bonusGems > 0) {
            this.awardCascadeBonus(bonusGems, data.isPlayerShot, fallenCount);
        }
        
        // Emit cascade complete event
        this.scene.events.emit('cascade-complete', {
            bubblesFallen: data.bubbles,
            cascadeLevel: this.cascadeChainLevel,
            bonusGems: bonusGems,
            isPlayer: data.isPlayerShot
        });
        
        this.cascadeInProgress = false;
        
        // Reset chain level after a delay
        this.scene.time.delayedCall(1000, () => {
            if (!this.cascadeInProgress) {
                this.cascadeChainLevel = 0;
            }
        });
    }
    
    /**
     * Animate the cascade effect for falling bubbles
     */
    private async animateCascade(bubbles: Bubble[], isPlayerShot: boolean): Promise<void> {
        // Create cascade visual effect
        this.createCascadeEffect(bubbles);
        
        // Animate each bubble falling with gravity
        const promises = bubbles.map((bubble, index) => {
            return new Promise<void>(resolve => {
                // Add slight delay for staggered effect
                this.scene.time.delayedCall(index * 20, () => {
                    // Add physics-like fall
                    this.scene.tweens.add({
                        targets: bubble,
                        y: this.scene.cameras.main.height + 100,
                        duration: 600,
                        ease: 'Quad.easeIn',
                        onStart: () => {
                            // Add rotation while falling
                            this.scene.tweens.add({
                                targets: bubble,
                                rotation: Phaser.Math.Between(-2, 2) * Math.PI,
                                duration: 600
                            });
                        },
                        onComplete: () => {
                            // Create splash effect at bottom
                            this.createSplashEffect(bubble.x, this.scene.cameras.main.height);
                            
                            // Remove bubble from grid
                            this.gridAttachmentSystem.removeGridBubble(bubble);
                            bubble.destroy();
                            resolve();
                        }
                    });
                });
            });
        });
        
        await Promise.all(promises);
    }
    
    /**
     * Create visual effect for cascade
     */
    private createCascadeEffect(bubbles: Bubble[]): void {
        // Calculate center of cascade
        let centerX = 0;
        let centerY = 0;
        bubbles.forEach(bubble => {
            centerX += bubble.x;
            centerY += bubble.y;
        });
        centerX /= bubbles.length;
        centerY /= bubbles.length;
        
        // Create cascade text
        const cascadeText = this.scene.add.text(
            centerX,
            centerY,
            `CASCADE x${this.cascadeChainLevel}!`,
            {
                fontSize: '32px',
                fontStyle: 'bold',
                color: '#00FFFF',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        cascadeText.setOrigin(0.5);
        cascadeText.setDepth(Z_LAYERS.UI + 10);
        
        // Animate text
        this.scene.tweens.add({
            targets: cascadeText,
            y: cascadeText.y - 50,
            scale: { from: 0.5, to: 1.2 },
            alpha: { from: 1, to: 0 },
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => cascadeText.destroy()
        });
        
        // Add particle trail for each falling bubble
        bubbles.forEach(bubble => {
            const emitter = this.scene.add.particles(bubble.x, bubble.y, 'bubble_particle', {
                scale: { start: 0.4, end: 0 },
                speed: { min: 20, max: 60 },
                lifespan: 400,
                quantity: 1,
                frequency: 50,
                tint: bubble.getColor(),
                alpha: { start: 0.6, end: 0 }
            });
            emitter.setDepth(bubble.depth - 1);
            
            // Follow the bubble as it falls
            this.scene.tweens.add({
                targets: emitter,
                y: this.scene.cameras.main.height,
                duration: 600,
                ease: 'Quad.easeIn',
                onComplete: () => {
                    emitter.stop();
                    this.scene.time.delayedCall(400, () => emitter.destroy());
                }
            });
        });
    }
    
    /**
     * Create splash effect when bubble hits bottom
     */
    private createSplashEffect(x: number, y: number): void {
        // Create splash particles
        const splash = this.scene.add.particles(x, y, 'bubble_particle', {
            scale: { start: 0.5, end: 0 },
            speed: { min: 100, max: 200 },
            angle: { min: -120, max: -60 },
            lifespan: 500,
            quantity: 8,
            tint: 0x00CCFF,
            alpha: { start: 0.8, end: 0 }
        });
        splash.setDepth(Z_LAYERS.EFFECTS);
        
        // Destroy after animation
        this.scene.time.delayedCall(500, () => splash.destroy());
    }
    
    /**
     * Award bonus gems from cascade
     */
    private awardCascadeBonus(gems: number, isPlayer: boolean, bubbleCount: number): void {
        // Update gem count
        const arenaSystem = (this.scene as any).arenaSystem;
        if (arenaSystem) {
            if (isPlayer) {
                arenaSystem.playerGemCount += gems;
            } else {
                arenaSystem.opponentGemCount += gems;
            }
            
            // Emit gem update event
            this.scene.events.emit('gems-updated', {
                playerGems: arenaSystem.playerGemCount,
                opponentGems: arenaSystem.opponentGemCount,
                total: arenaSystem.playerGemCount + arenaSystem.opponentGemCount
            });
        }
        
        // Show bonus text
        const bonusText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY + 100,
            `+${gems} CASCADE GEMS!\n(${bubbleCount} bubbles)`,
            {
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        bonusText.setOrigin(0.5);
        bonusText.setDepth(Z_LAYERS.UI + 20);
        
        // Animate bonus text
        this.scene.tweens.add({
            targets: bonusText,
            y: bonusText.y - 30,
            scale: { from: 0, to: 1.2 },
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: bonusText,
                    alpha: 0,
                    duration: 500,
                    delay: 500,
                    onComplete: () => bonusText.destroy()
                });
            }
        });
        
        console.log(`🎁 CASCADE BONUS: +${gems} gems for ${bubbleCount} fallen bubbles!`);
    }
    
    /**
     * Check if cascade is currently in progress
     */
    public isCascadeInProgress(): boolean {
        return this.cascadeInProgress;
    }
    
    /**
     * Get current cascade chain level
     */
    public getCascadeLevel(): number {
        return this.cascadeChainLevel;
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        this.scene.events.off('bubbles-disconnected', this.handleCascade, this);
    }
}