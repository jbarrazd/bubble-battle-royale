import Phaser from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class BubbleQueue {
    private scene: Phaser.Scene;
    private queue: Bubble[] = [];
    private container: Phaser.GameObjects.Container;
    private background: Phaser.GameObjects.Rectangle;
    private isOpponent: boolean = false;
    
    // Queue settings
    private readonly QUEUE_SIZE = 3; // Current + next 2
    private readonly BUBBLE_SPACING = 40;
    private readonly QUEUE_X_OFFSET = -60;
    private readonly QUEUE_Y_OFFSET = 10;
    
    // Available colors
    private colors = [
        BubbleColor.RED,
        BubbleColor.BLUE,
        BubbleColor.GREEN,
        BubbleColor.YELLOW,
        BubbleColor.PURPLE
    ];
    
    constructor(scene: Phaser.Scene, x: number, y: number, isOpponent: boolean = false) {
        this.scene = scene;
        this.isOpponent = isOpponent;
        
        // Create container for queue UI
        // For opponent, mirror the X offset to show on the right side
        const xOffset = isOpponent ? Math.abs(this.QUEUE_X_OFFSET) : this.QUEUE_X_OFFSET;
        const yOffset = isOpponent ? -this.QUEUE_Y_OFFSET : this.QUEUE_Y_OFFSET;
        this.container = scene.add.container(x + xOffset, y + yOffset);
        this.container.setDepth(Z_LAYERS.UI);
        
        // Create background panel
        this.background = scene.add.rectangle(
            0, 0,
            50,
            120,
            0x2c3e50,
            0.8
        );
        this.background.setStrokeStyle(2, 0x34495e);
        this.container.add(this.background);
        
        // Add "NEXT" label
        const label = scene.add.text(0, -50, 'NEXT', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ecf0f1'
        }).setOrigin(0.5);
        this.container.add(label);
        
        // Initialize queue
        this.fillQueue();
        this.updateDisplay();
    }
    
    private fillQueue(): void {
        while (this.queue.length < this.QUEUE_SIZE) {
            const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
            const bubble = new Bubble(this.scene, 0, 0, randomColor);
            bubble.setScale(0.6); // Smaller for queue display
            bubble.setVisible(false);
            this.queue.push(bubble);
        }
    }
    
    private updateDisplay(): void {
        this.queue.forEach((bubble, index) => {
            if (index === 0) {
                // Current bubble (hidden, will be shown in launcher)
                bubble.setVisible(false);
            } else {
                // Next bubbles
                // For opponent, invert the Y direction
                const spacing = this.isOpponent ? -this.BUBBLE_SPACING : this.BUBBLE_SPACING;
                const baseY = this.isOpponent ? 20 : -20;
                const yPos = baseY + (index - 1) * spacing;
                bubble.setPosition(0, yPos);
                bubble.setVisible(true);
                this.container.add(bubble);
                
                // Fade effect for distant bubbles
                const alpha = 1 - (index - 1) * 0.3;
                bubble.setAlpha(alpha);
            }
        });
    }
    
    public getNextBubble(): Bubble | null {
        if (this.queue.length === 0) {
            this.fillQueue();
        }
        
        const bubble = this.queue.shift();
        if (!bubble) return null;
        
        // Reset bubble properties
        bubble.setScale(1);
        bubble.setAlpha(1);
        bubble.setVisible(true);
        
        // Remove from container
        this.container.remove(bubble);
        
        // Add new bubble to end of queue
        this.fillQueue();
        
        // Animate queue movement
        this.animateQueueShift();
        
        return bubble;
    }
    
    private animateQueueShift(): void {
        // Update display with animation
        this.queue.forEach((bubble, index) => {
            if (index > 0) {
                // For opponent, invert the Y direction
                const spacing = this.isOpponent ? -this.BUBBLE_SPACING : this.BUBBLE_SPACING;
                const baseY = this.isOpponent ? 20 : -20;
                const targetY = baseY + (index - 1) * spacing;
                
                this.scene.tweens.add({
                    targets: bubble,
                    y: targetY,
                    alpha: 1 - (index - 1) * 0.3,
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });
        
        // Fade in the new bubble at the end
        const lastBubble = this.queue[this.queue.length - 1];
        if (lastBubble && this.queue.length > 1) {
            const spacing = this.isOpponent ? -this.BUBBLE_SPACING : this.BUBBLE_SPACING;
            const baseY = this.isOpponent ? 20 : -20;
            lastBubble.setAlpha(0);
            lastBubble.setPosition(0, baseY + (this.queue.length - 2) * spacing);
            lastBubble.setVisible(true);
            this.container.add(lastBubble);
            
            this.scene.tweens.add({
                targets: lastBubble,
                alpha: 1 - (this.queue.length - 2) * 0.3,
                duration: 300,
                ease: 'Power2'
            });
        }
        
        this.updateDisplay();
    }
    
    public getCurrentColor(): BubbleColor {
        if (this.queue.length > 0) {
            return this.queue[0].getData('color') as BubbleColor;
        }
        return BubbleColor.RED;
    }
    
    public destroy(): void {
        this.queue.forEach(bubble => bubble.destroy());
        this.queue = [];
        this.container.destroy();
    }
}