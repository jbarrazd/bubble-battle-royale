import Phaser from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class BubbleQueue {
    private scene: Phaser.Scene;
    private queue: Bubble[] = [];
    private visualBubbles: Phaser.GameObjects.Container[] = []; // Visual representations
    private container: Phaser.GameObjects.Container;
    private isOpponent: boolean = false;
    
    // Queue settings
    private readonly QUEUE_SIZE = 3; // Current + next 2
    private readonly BUBBLE_SPACING = 35; // Horizontal spacing between bubbles
    private readonly QUEUE_X_OFFSET = 0; // Center horizontally
    private readonly QUEUE_Y_OFFSET = 45; // Position below launcher, above cooldown bar
    
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
        // Position horizontally - below player launcher, above opponent launcher
        const xOffset = this.QUEUE_X_OFFSET;
        const yOffset = isOpponent ? -this.QUEUE_Y_OFFSET : this.QUEUE_Y_OFFSET;
        this.container = scene.add.container(x + xOffset, y + yOffset);
        // Always behind UI elements for both player and opponent
        this.container.setDepth(Z_LAYERS.UI - 2); // Well behind cooldown bar and other UI
        
        // Rotate 180 degrees for opponent so it faces the right way
        if (isOpponent) {
            this.container.setRotation(Math.PI); // 180 degrees
        }
        
        // Create sleek integrated background panel
        const bgGraphics = scene.add.graphics();
        
        // Hexagonal-inspired background to match launcher
        bgGraphics.fillGradientStyle(
            0x1a1a2e, // Dark blue top
            0x16213e, // Medium blue
            0x0f3460, // Darker blue
            0x0f3460  // Dark blue bottom
        );
        bgGraphics.fillRoundedRect(-55, -20, 110, 40, 10);
        
        // Add border with glow effect
        bgGraphics.lineStyle(2, 0x00CCFF, 0.5);
        bgGraphics.strokeRoundedRect(-55, -20, 110, 40, 10);
        
        this.container.add(bgGraphics);
        
        // Add stylized "NEXT" label with better font
        const label = this.scene.add.text(0, -30, 'NEXT', {
            fontFamily: 'Arial Black',
            fontSize: '10px',
            fontStyle: 'bold',
            color: '#00CCFF'
        }).setOrigin(0.5);
        label.setAlpha(0.8);
        label.setShadow(0, 1, '#000000', 2);
        this.container.add(label);
        
        // Initialize queue
        this.fillQueue();
        this.updateDisplay();
    }
    
    private fillQueue(): void {
        while (this.queue.length < this.QUEUE_SIZE) {
            const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
            if (!randomColor) continue; // Safety check
            
            const bubble = new Bubble(this.scene, 0, 0, randomColor);
            bubble.setScale(0.6); // Smaller for queue display
            bubble.setVisible(false);
            bubble.setData('queueIndex', this.queue.length); // Track position in queue
            // Add unique ID for tracking
            const id = `${this.isOpponent ? 'AI' : 'Player'}_${Date.now()}_${Math.random()}`;
            bubble.setData('bubbleId', id);
            
            // Force color update to ensure visual matches data
            bubble.setColor(randomColor);
            
            this.queue.push(bubble);
            
            const owner = this.isOpponent ? 'AI' : 'Player';
            console.log(`BubbleQueue (${owner}): Created bubble ID=${id} color=${randomColor} hex=0x${randomColor.toString(16)}`);
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
            
            // Horizontal layout - center the two bubbles
            const totalWidth = this.BUBBLE_SPACING;
            const startX = -totalWidth / 2;
            const xPos = startX + (index * this.BUBBLE_SPACING);
            const yPos = 0; // All bubbles on same horizontal line
            
            // Create a container for this visual bubble
            const visualContainer = this.scene.add.container(xPos, yPos);
            
            // Create main bubble circle (slightly smaller for horizontal layout)
            const visualBubble = this.scene.add.circle(0, 0, 14, color);
            visualBubble.setStrokeStyle(2, this.getDarkerColor(color), 1);
            
            // Add highlight for 3D effect
            const highlight = this.scene.add.circle(-4, -4, 5, 0xffffff, 0.4);
            
            // Add to visual container
            visualContainer.add([visualBubble, highlight]);
            
            // Set alpha based on position
            const alpha = index === 0 ? 1 : 0.7;
            visualContainer.setAlpha(alpha);
            
            // No arrow indicator - keep it clean and simple
            
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
        const owner = this.isOpponent ? 'AI' : 'Player';
        const bubbleId = bubble.getData('bubbleId');
        console.log(`BubbleQueue (${owner}): Giving bubble ID=${bubbleId} color:`, bubble.getColor(), 'hex:', bubble.getColor().toString(16));
        console.log(`BubbleQueue (${owner}): Next 2 colors in queue:`, this.queue.slice(0, 2).map(b => `${b.getColor()} (0x${b.getColor().toString(16)})`));
        
        // Reset bubble properties for gameplay
        bubble.setScale(1);
        bubble.setAlpha(1);
        bubble.setVisible(true);
        
        // Remove from container (it was never added, just the visual representation)
        // No need to remove from container
        
        // Add ONE new bubble to end of queue to maintain size
        if (this.queue.length < this.QUEUE_SIZE) {
            const randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];
            if (randomColor) { // Safety check
                const newBubble = new Bubble(this.scene, 0, 0, randomColor);
                newBubble.setScale(0.6);
                newBubble.setVisible(false);
                newBubble.setData('queueIndex', this.queue.length);
                // Add unique ID for tracking
                const id = `${this.isOpponent ? 'AI' : 'Player'}_${Date.now()}_${Math.random()}`;
                newBubble.setData('bubbleId', id);
                
                // Force color update to ensure visual matches data
                newBubble.setColor(randomColor);
                
                this.queue.push(newBubble);
                
                const owner = this.isOpponent ? 'AI' : 'Player';
                console.log(`BubbleQueue (${owner}): Added new bubble ID=${id} color:`, randomColor, 'hex:', randomColor.toString(16));
            }
        }
        
        // Update display immediately to show the new queue state
        this.updateDisplay();
        
        // No animation - just update instantly
        // this.animateQueueShift(); // Commented out to remove transition
        
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