import { Scene } from 'phaser';
import { EffectPool } from './EffectPool';
import { ScoreResult } from './ScoreEventManager';

interface FeedbackQueueItem {
    result: ScoreResult;
    position: { x: number; y: number };
    timestamp: number;
}

interface ActiveFeedback {
    position: { x: number; y: number };
    endTime: number;
}

export class UnifiedFeedbackSystem {
    private scene: Scene;
    private effectPool: EffectPool;
    private feedbackQueue: FeedbackQueueItem[] = [];
    private activeFeedbacks: ActiveFeedback[] = [];
    private processing: boolean = false;
    
    // Spacing configuration - tighter for mobile screens
    private readonly MIN_VERTICAL_SPACING = 35;
    private readonly MIN_HORIZONTAL_SPACING = 50;
    private readonly FEEDBACK_DURATION = 1500;
    private readonly MAX_QUEUE_SIZE = 30;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.effectPool = new EffectPool(scene);
        
        // Start processing queue
        this.startProcessing();
    }
    
    private startProcessing(): void {
        this.scene.time.addEvent({
            delay: 16, // ~60fps
            callback: this.processQueue,
            callbackScope: this,
            loop: true
        });
    }
    
    public queueFeedback(result: ScoreResult, position: { x: number; y: number }): void {
        // Add to queue
        this.feedbackQueue.push({
            result,
            position,
            timestamp: Date.now()
        });
        
        // Limit queue size
        if (this.feedbackQueue.length > this.MAX_QUEUE_SIZE) {
            this.feedbackQueue.shift();
        }
    }
    
    private processQueue(): void {
        if (this.processing || this.feedbackQueue.length === 0) return;
        
        this.processing = true;
        
        // Clean up expired active feedbacks
        const now = Date.now();
        this.activeFeedbacks = this.activeFeedbacks.filter(f => f.endTime > now);
        
        // Process up to 3 feedbacks per frame
        const itemsToProcess = Math.min(3, this.feedbackQueue.length);
        
        for (let i = 0; i < itemsToProcess; i++) {
            const item = this.feedbackQueue.shift();
            if (!item) continue;
            
            this.showFeedback(item);
        }
        
        this.processing = false;
    }
    
    private showFeedback(item: FeedbackQueueItem): void {
        const { result, position } = item;
        
        // Calculate offset to prevent overlapping
        const offset = this.calculateOffset(position);
        const finalPosition = {
            x: position.x + offset.x,
            y: position.y + offset.y
        };
        
        // Add to active feedbacks
        this.activeFeedbacks.push({
            position: finalPosition,
            endTime: Date.now() + this.FEEDBACK_DURATION
        });
        
        // Show effects based on visual effect level
        this.showEffectsForLevel(result, finalPosition);
    }
    
    private calculateOffset(position: { x: number; y: number }): { x: number; y: number } {
        let offsetX = 0;
        let offsetY = 0;
        let conflictCount = 0;
        
        // Check for nearby active feedbacks
        for (const active of this.activeFeedbacks) {
            const dx = Math.abs(position.x - active.position.x);
            const dy = Math.abs(position.y - active.position.y);
            
            // If too close, calculate offset
            if (dx < this.MIN_HORIZONTAL_SPACING && dy < this.MIN_VERTICAL_SPACING) {
                conflictCount++;
                
                // Alternate between up and down offsets for better distribution
                if (conflictCount % 2 === 0) {
                    offsetY -= this.MIN_VERTICAL_SPACING;
                } else {
                    offsetY += this.MIN_VERTICAL_SPACING;
                }
                
                // Add slight horizontal offset for visual variety
                offsetX = (conflictCount % 3 - 1) * 20;
            }
        }
        
        return { x: offsetX, y: offsetY };
    }
    
    private showEffectsForLevel(result: ScoreResult, position: { x: number; y: number }): void {
        const { visualEffectLevel, displayText, color, finalScore } = result;
        
        // Always show score text - optimized duration for mobile
        this.effectPool.showFloatingText(
            position.x,
            position.y,
            displayText,
            color,
            800 + (visualEffectLevel * 150) // Shorter duration for mobile readability
        );
        
        // Add effects based on level
        switch (visualEffectLevel) {
            case 1: // Basic match (3 bubbles)
                // Enhanced subtle effect with small pop and sparkle
                this.effectPool.showParticleBurst(position.x, position.y, color, 6, 0.4);
                this.createSparkleEffect(position.x, position.y, color, 3);
                this.createPopEffect(position.x, position.y, color, 0.8);
                break;
                
            case 2: // Small combo (4 bubbles) - "GOOD!"
                this.effectPool.showParticleBurst(position.x, position.y, color, 12, 0.6);
                this.createSparkleEffect(position.x, position.y, color, 5);
                this.createPopEffect(position.x, position.y, color, 1.0);
                this.addScreenShake(30, 0.001);
                break;
                
            case 3: // Medium combo (5 bubbles) - "GREAT!"
                this.effectPool.showParticleBurst(position.x, position.y, color, 25, 0.9);
                this.effectPool.showRingExplosion(position.x, position.y, color, 20);
                this.createSparkleEffect(position.x, position.y, color, 8);
                this.addScreenShake(80, 0.002);
                break;
                
            case 4: // Large combo (6 bubbles) - "AMAZING!"
                this.effectPool.showParticleBurst(position.x, position.y, color, 40, 1.2);
                this.effectPool.showRingExplosion(position.x, position.y, color, 30);
                this.createSparkleEffect(position.x, position.y, color, 12);
                this.addScreenShake(120, 0.004);
                this.addCameraFlash(40, color);
                break;
                
            case 5: // Mega combo (7+ bubbles) - "PERFECT!"
                // Epic effects
                this.effectPool.showParticleBurst(position.x, position.y, color, 60, 1.4);
                this.effectPool.showRingExplosion(position.x, position.y, color, 40);
                this.createFireEffect(position.x, position.y, color);
                this.createSparkleEffect(position.x, position.y, color, 20);
                this.addScreenShake(180, 0.006);
                this.addCameraFlash(80, color);
                break;
        }
        
        // Don't show multiplier text separately - it's now part of the main text
    }
    
    private createSparkleEffect(x: number, y: number, color: number, count: number): void {
        // Create sparkle/star effects for polish
        for (let i = 0; i < count; i++) {
            const star = this.scene.add.star(
                x + Phaser.Math.Between(-20, 20),
                y + Phaser.Math.Between(-20, 20),
                4, 2, 4,
                color
            );
            star.setDepth(1150);
            star.setScale(0);
            star.setAlpha(0.8);
            
            // Animate sparkle
            this.scene.tweens.add({
                targets: star,
                scale: { from: 0, to: Phaser.Math.FloatBetween(0.3, 0.6) },
                alpha: { from: 0.8, to: 0 },
                angle: 360,
                duration: Phaser.Math.Between(600, 900),
                delay: i * 50,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    star.destroy();
                }
            });
        }
    }
    
    private createPopEffect(x: number, y: number, color: number, scale: number): void {
        // Create a subtle pop effect
        const pop = this.scene.add.circle(x, y, 15, color, 0.3);
        pop.setDepth(1140);
        pop.setScale(0);
        pop.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: pop,
            scale: scale,
            alpha: 0,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                pop.destroy();
            }
        });
    }
    
    private createFireEffect(x: number, y: number, color: number): void {
        // Create dramatic fire effect for mega combos
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Phaser.Math.Between(50, 150);
            
            const flame = this.scene.add.circle(
                x + Math.cos(angle) * 10,
                y + Math.sin(angle) * 10,
                Phaser.Math.Between(3, 6),
                color
            );
            flame.setDepth(1051);
            flame.setBlendMode(Phaser.BlendModes.ADD);
            
            const targetX = x + Math.cos(angle) * speed;
            const targetY = y + Math.sin(angle) * speed - Phaser.Math.Between(20, 60);
            
            this.scene.tweens.add({
                targets: flame,
                x: targetX,
                y: targetY,
                alpha: { from: 1, to: 0 },
                scale: { from: 1.5, to: 0 },
                duration: Phaser.Math.Between(600, 1000),
                delay: i * 10,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    flame.destroy();
                }
            });
        }
    }
    
    private addScreenShake(duration: number, intensity: number): void {
        this.scene.cameras.main.shake(duration, intensity);
    }
    
    private addCameraFlash(duration: number, color: number): void {
        // Convert color to RGB
        const colorObj = Phaser.Display.Color.IntegerToColor(color);
        this.scene.cameras.main.flash(
            duration,
            colorObj.red,
            colorObj.green,
            colorObj.blue,
            false
        );
    }
    
    public update(delta: number): void {
        this.effectPool.update(delta);
    }
    
    public reset(): void {
        this.feedbackQueue = [];
        this.activeFeedbacks = [];
        this.effectPool.reset();
    }
    
    public destroy(): void {
        this.reset();
        this.effectPool.destroy();
    }
}