import { Scene } from 'phaser';
import { Gem, GemType } from '@/gameObjects/Gem';
import { BubbleColor } from '@/types/ArenaTypes';

export class GemSpawnSystem {
    private scene: Scene;
    private gems: Gem[] = [];
    private spawnChance: number = 0.15; // 15% chance to spawn a gem
    private specialSpawnChance: number = 0.05; // 5% chance for special gems (diamond)
    
    // Map bubble colors to gem types for themed spawns
    private colorToGemMap: Map<BubbleColor, GemType> = new Map([
        [BubbleColor.RED, GemType.RUBY],
        [BubbleColor.BLUE, GemType.SAPPHIRE],
        [BubbleColor.GREEN, GemType.EMERALD],
        [BubbleColor.YELLOW, GemType.TOPAZ],
        [BubbleColor.PURPLE, GemType.DIAMOND] // Purple gets diamond (rarest)
    ]);
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for bubble pop events
        this.scene.events.on('bubble-popped', this.handleBubblePop, this);
        
        // Listen for combo completions for bonus gems
        this.scene.events.on('combo-complete', this.handleComboComplete, this);
        
        // Listen for special events that spawn guaranteed gems
        this.scene.events.on('mystery-bubble-destroyed', this.handleMysteryBubbleDestroyed, this);
        
        // Cleanup on scene shutdown
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private handleBubblePop(data: { x: number; y: number; color: BubbleColor; isCombo?: boolean }): void {
        // Increase chance if it's part of a combo
        const chance = data.isCombo ? this.spawnChance * 2 : this.spawnChance;
        
        if (Math.random() < chance) {
            this.spawnGem(data.x, data.y, data.color);
        }
    }
    
    private handleComboComplete(data: { combo: number; x: number; y: number }): void {
        // Spawn bonus gems based on combo size
        if (data.combo >= 5) {
            // Big combo = guaranteed diamond
            this.spawnGem(data.x, data.y, null, GemType.DIAMOND);
        } else if (data.combo >= 3) {
            // Medium combo = random gem
            this.spawnGem(data.x, data.y);
        }
    }
    
    private handleMysteryBubbleDestroyed(data: { x: number; y: number }): void {
        // Mystery bubbles always spawn a gem
        const isSpecial = Math.random() < 0.3; // 30% chance for diamond
        this.spawnGem(data.x, data.y, null, isSpecial ? GemType.DIAMOND : undefined);
    }
    
    public spawnGem(x: number, y: number, bubbleColor?: BubbleColor | null, forceType?: GemType): void {
        let gemType: GemType | undefined = forceType;
        
        if (!gemType) {
            if (bubbleColor && this.colorToGemMap.has(bubbleColor)) {
                // Use color-themed gem most of the time
                if (Math.random() > this.specialSpawnChance) {
                    gemType = this.colorToGemMap.get(bubbleColor);
                }
            }
        }
        
        const gem = new Gem(this.scene, x, y, gemType);
        this.gems.push(gem);
        
        // Add slight random movement for variety
        this.scene.tweens.add({
            targets: gem,
            x: x + Phaser.Math.Between(-20, 20),
            y: y + Phaser.Math.Between(-10, 10),
            duration: 500,
            ease: 'Sine.easeOut'
        });
        
        // Auto-collect gems after a delay (so they don't clutter the screen)
        this.scene.time.delayedCall(8000, () => {
            if (gem && !gem.scene) return; // Already destroyed
            this.autoCollectGem(gem);
        });
    }
    
    private autoCollectGem(gem: Gem): void {
        if (!gem.isCollectable()) return;
        
        // Animate gem flying to score area before disappearing
        const targetY = 50; // Top of screen
        const targetX = this.scene.cameras.main.width / 2;
        
        this.scene.tweens.add({
            targets: gem,
            x: targetX,
            y: targetY,
            scale: 0.5,
            duration: 1000,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                gem.collect();
            }
        });
    }
    
    public spawnGemsInArea(x: number, y: number, radius: number, count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const distance = Phaser.Math.Between(radius * 0.3, radius);
            const gemX = x + Math.cos(angle) * distance;
            const gemY = y + Math.sin(angle) * distance;
            
            // Stagger spawn times for cascade effect
            this.scene.time.delayedCall(i * 100, () => {
                this.spawnGem(gemX, gemY);
            });
        }
    }
    
    public collectAllGems(): number {
        let totalValue = 0;
        
        this.gems.forEach(gem => {
            if (gem.isCollectable()) {
                totalValue += gem.getValue();
                gem.collect();
            }
        });
        
        // Clean up collected gems from array
        this.gems = this.gems.filter(gem => gem.isCollectable());
        
        return totalValue;
    }
    
    public getGemAt(x: number, y: number, threshold: number = 30): Gem | null {
        for (const gem of this.gems) {
            if (!gem.isCollectable()) continue;
            
            const distance = Phaser.Math.Distance.Between(gem.x, gem.y, x, y);
            if (distance <= threshold) {
                return gem;
            }
        }
        
        return null;
    }
    
    public update(time: number, delta: number): void {
        // Check for gem collection by bubbles
        this.scene.events.emit('check-gem-collection', { gems: this.gems });
    }
    
    public destroy(): void {
        // Clean up all gems
        this.gems.forEach(gem => gem.destroy());
        this.gems = [];
        
        // Remove event listeners
        this.scene.events.off('bubble-popped', this.handleBubblePop, this);
        this.scene.events.off('combo-complete', this.handleComboComplete, this);
        this.scene.events.off('mystery-bubble-destroyed', this.handleMysteryBubbleDestroyed, this);
        this.scene.events.off('shutdown', this.destroy, this);
    }
}