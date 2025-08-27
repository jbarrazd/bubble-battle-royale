import Phaser from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class BubbleQueue {
    private scene: Phaser.Scene;
    private queue: Bubble[] = [];
    private visualBubbles: Phaser.GameObjects.Container[] = []; // Visual representations
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
        
        // Create background panel - make it slightly larger and more visible
        this.background = scene.add.rectangle(
            0, 0,
            55,
            130,
            0x2c3e50,
            0.9
        );
        this.background.setStrokeStyle(3, 0x34495e);
        this.container.add(this.background);
        
        // Add "NEXT" label - make it more visible
        const label = this.scene.add.text(0, -55, 'NEXT', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
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
            bubble.setData('queueIndex', this.queue.length); // Track position in queue
            this.queue.push(bubble);
        }
    }
    
    private updateDisplay(): void {
        // Clear old visual representations
        this.visualBubbles.forEach(visual => {
            this.container.remove(visual);
            visual.destroy();
        });
        this.visualBubbles = [];
        
        // Create visual representations for the first 2 bubbles
        // Show index 0 (next to shoot) and 1 (following)
        for (let index = 0; index < Math.min(2, this.queue.length); index++) {
            const bubble = this.queue[index];
            const color = bubble.getColor();
            
            const spacing = this.isOpponent ? -this.BUBBLE_SPACING : this.BUBBLE_SPACING;
            const baseY = this.isOpponent ? 20 : -20;
            const yPos = baseY + index * spacing;
            
            // Create a container for this visual bubble
            const visualContainer = this.scene.add.container(0, yPos);
            
            // Create main bubble circle
            const visualBubble = this.scene.add.circle(0, 0, 16, color);
            visualBubble.setStrokeStyle(2, this.getDarkerColor(color), 1);
            
            // Add highlight for 3D effect
            const highlight = this.scene.add.circle(-5, -5, 6, 0xffffff, 0.4);
            
            // Add to visual container
            visualContainer.add([visualBubble, highlight]);
            
            // Set alpha based on position
            const alpha = index === 0 ? 1 : 0.7;
            visualContainer.setAlpha(alpha);
            
            // Add "CURRENT" indicator ring for first bubble
            if (index === 0) {
                const ring = this.scene.add.circle(0, 0, 20, 0xffffff, 0);
                ring.setStrokeStyle(2, 0xffffff, 0.3);
                visualContainer.add(ring);
            }
            
            // Add to main container
            this.container.add(visualContainer);
            this.visualBubbles.push(visualContainer);
        }
    }
    
    private getDarkerColor(color: BubbleColor): number {
        // Return a darker version of the color for the border
        switch(color) {
            case BubbleColor.RED: return 0x8B0000;
            case BubbleColor.BLUE: return 0x00008B;
            case BubbleColor.GREEN: return 0x006400;
            case BubbleColor.YELLOW: return 0xDAA520;
            case BubbleColor.PURPLE: return 0x4B0082;
            default: return 0x333333;
        }
    }
    
    public getNextBubble(): Bubble | null {
        if (this.queue.length === 0) {
            this.fillQueue();
        }
        
        const bubble = this.queue.shift();
        if (!bubble) return null;
        
        // Debug: log what color we're giving
        console.log('BubbleQueue: Giving bubble color:', bubble.getColor());
        console.log('BubbleQueue: Next 2 colors in queue:', this.queue.slice(0, 2).map(b => b.getColor()));
        
        // Reset bubble properties for gameplay
        bubble.setScale(1);
        bubble.setAlpha(1);
        bubble.setVisible(true);
        
        // Remove from container (it was never added, just the visual representation)
        // No need to remove from container
        
        // Add ONE new bubble to end of queue to maintain size
        if (this.queue.length < this.QUEUE_SIZE) {
            const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
            const newBubble = new Bubble(this.scene, 0, 0, randomColor);
            newBubble.setScale(0.6);
            newBubble.setVisible(false);
            newBubble.setData('queueIndex', this.queue.length);
            this.queue.push(newBubble);
            
            console.log('BubbleQueue: Added new bubble to queue, color:', randomColor);
        }
        
        // Update display immediately to show the new queue state
        this.updateDisplay();
        
        // Then animate the shift for smooth transition
        this.animateQueueShift();
        
        return bubble;
    }
    
    private animateQueueShift(): void {
        // Animate the visual bubbles with a smooth transition
        this.visualBubbles.forEach((visual, index) => {
            if (visual && !visual.scene) return; // Skip if destroyed
            
            // Fade in effect
            const fromAlpha = 0.3;
            const toAlpha = index === 0 ? 1 : 0.7;
            
            visual.setAlpha(fromAlpha);
            
            this.scene.tweens.add({
                targets: visual,
                alpha: toAlpha,
                duration: 200,
                ease: 'Power2'
            });
        });
    }
    
    public getCurrentColor(): BubbleColor {
        if (this.queue.length > 0) {
            return this.queue[0].getColor();
        }
        return BubbleColor.RED;
    }
    
    public getNextColors(): BubbleColor[] {
        // Return the colors of the next 2 bubbles for preview
        const nextColors: BubbleColor[] = [];
        for (let i = 1; i < Math.min(3, this.queue.length); i++) {
            nextColors.push(this.queue[i].getColor());
        }
        return nextColors;
    }
    
    public destroy(): void {
        this.queue.forEach(bubble => bubble.destroy());
        this.queue = [];
        this.visualBubbles.forEach(visual => visual.destroy());
        this.visualBubbles = [];
        this.container.destroy();
    }
}