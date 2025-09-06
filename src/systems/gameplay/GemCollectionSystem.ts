import { Scene } from 'phaser';
import { Gem } from '@/gameObjects/Gem';
import { Bubble } from '@/gameObjects/Bubble';

export class GemCollectionSystem {
    private scene: Scene;
    private playerGems: number = 0;
    private opponentGems: number = 0;
    private totalGemsCollected: number = 0;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for gem collection events
        this.scene.events.on('gem-collected', this.handleGemCollected, this);
        
        // Listen for bubble shot events to check collisions
        this.scene.events.on('bubble-shot', this.trackBubble, this);
        
        // Listen for check-gem-collection events from GemSpawnSystem
        this.scene.events.on('check-gem-collection', this.checkAllGemCollisions, this);
        
        // Cleanup on scene shutdown
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private handleGemCollected(data: { type: string; value: number; x: number; y: number }): void {
        // For now, gems go to the player who collected them
        // Later we can determine based on which bubble collected it
        this.playerGems += data.value;
        this.totalGemsCollected++;
        
        // Emit UI update event
        this.scene.events.emit('gems-updated', {
            playerGems: this.playerGems,
            opponentGems: this.opponentGems,
            total: this.totalGemsCollected
        });
        
        // Play collection sound
        this.playCollectionSound();
        
        // Show collection feedback
        this.showCollectionFeedback(data.x, data.y, data.value);
    }
    
    private trackBubble(data: { bubble: Bubble; isPlayer: boolean }): void {
        // Track flying bubble for gem collection
        const bubble = data.bubble;
        const isPlayer = data.isPlayer;
        
        // Create an update listener for this specific bubble
        const checkCollision = () => {
            // Check if bubble still exists and is visible
            if (!bubble || !bubble.visible) {
                this.scene.events.off('update', checkCollision);
                return;
            }
            
            // Check collision with all gems
            this.scene.events.emit('check-gem-collision', {
                x: bubble.x,
                y: bubble.y,
                bubble: bubble,
                isPlayer: isPlayer
            });
        };
        
        // Listen to update events
        this.scene.events.on('update', checkCollision);
        
        // Remove listener when bubble attaches or is destroyed
        this.scene.time.delayedCall(3000, () => {
            this.scene.events.off('update', checkCollision);
        });
    }
    
    private checkAllGemCollisions(data: { gems: Gem[] }): void {
        if (!data.gems || data.gems.length === 0) return;
        
        // Get all active bubbles in the scene
        const bubbles = this.scene.children.list.filter(child => 
            child instanceof Bubble && child.visible
        ) as Bubble[];
        
        // Check each bubble against each gem
        bubbles.forEach(bubble => {
            data.gems.forEach(gem => {
                if (!gem.isCollectable()) return;
                
                const distance = Phaser.Math.Distance.Between(
                    bubble.x, bubble.y,
                    gem.x, gem.y
                );
                
                // Collection radius
                if (distance <= 40) {
                    // Determine who gets the gem based on bubble shooter
                    const isPlayerGem = bubble.getShooter() === 'player';
                    this.collectGem(gem, isPlayerGem);
                }
            });
        });
    }
    
    private collectGem(gem: Gem, isPlayer: boolean): void {
        const value = gem.getValue();
        
        if (isPlayer) {
            this.playerGems += value;
        } else {
            this.opponentGems += value;
        }
        
        this.totalGemsCollected++;
        
        // Trigger gem collection
        gem.collect();
        
        // Update UI
        this.scene.events.emit('gems-updated', {
            playerGems: this.playerGems,
            opponentGems: this.opponentGems,
            total: this.totalGemsCollected
        });
    }
    
    private showCollectionFeedback(x: number, y: number, value: number): void {
        // Create floating text
        const text = this.scene.add.text(x, y, `+${value}`, {
            fontSize: '20px',
            fontFamily: 'Arial Black',
            color: '#00FFFF',  // Cyan color matching the star
            stroke: '#000000',
            strokeThickness: 3
        });
        text.setOrigin(0.5);
        text.setDepth(2000);
        
        // Animate floating up
        this.scene.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
        
        // Create sparkle effect
        for (let i = 0; i < 4; i++) {
            const sparkle = this.scene.add.circle(
                x + Phaser.Math.Between(-20, 20),
                y + Phaser.Math.Between(-20, 20),
                2,
                0x00FFFF,  // Cyan color matching the star
                1
            );
            sparkle.setDepth(1999);
            
            this.scene.tweens.add({
                targets: sparkle,
                scale: { from: 1, to: 0 },
                alpha: { from: 1, to: 0 },
                duration: 500,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    sparkle.destroy();
                }
            });
        }
    }
    
    private playCollectionSound(): void {
        // Play a pleasant collection sound
        // this.scene.sound.play('gem-collect', { volume: 0.5 });
    }
    
    public getPlayerGems(): number {
        return this.playerGems;
    }
    
    public getOpponentGems(): number {
        return this.opponentGems;
    }
    
    public getTotalGems(): number {
        return this.totalGemsCollected;
    }
    
    public reset(): void {
        this.playerGems = 0;
        this.opponentGems = 0;
        this.totalGemsCollected = 0;
        
        // Update UI
        this.scene.events.emit('gems-updated', {
            playerGems: this.playerGems,
            opponentGems: this.opponentGems,
            total: this.totalGemsCollected
        });
    }
    
    public destroy(): void {
        this.scene.events.off('gem-collected', this.handleGemCollected, this);
        this.scene.events.off('bubble-shot', this.trackBubble, this);
        this.scene.events.off('check-gem-collection', this.checkAllGemCollisions, this);
        this.scene.events.off('shutdown', this.destroy, this);
    }
}