import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleGrid } from './BubbleGrid';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { BubbleColor, IHexPosition, ArenaZone } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class MatchDetectionSystem {
    private scene: Scene;
    private bubbleGrid: BubbleGrid;
    private gridAttachmentSystem: GridAttachmentSystem;
    
    // Match settings
    private minimumMatchSize: number = 3;
    private isProcessing: boolean = false;
    
    // Scoring
    private totalScore: number = 0;
    private combo: number = 0;
    private lastMatchTime: number = 0;
    private comboTimeout: number = 2000; // 2 seconds
    
    constructor(
        scene: Scene,
        bubbleGrid: BubbleGrid,
        gridAttachmentSystem: GridAttachmentSystem
    ) {
        this.scene = scene;
        this.bubbleGrid = bubbleGrid;
        this.gridAttachmentSystem = gridAttachmentSystem;
    }
    
    /**
     * Check for matches after a bubble attaches
     */
    public async checkForMatches(attachedBubble: Bubble): Promise<void> {
        if (this.isProcessing || !attachedBubble.visible) return;
        
        const color = attachedBubble.getColor();
        if (color === undefined || color === null) {
            console.warn('Bubble has no color, skipping match detection');
            return;
        }
        
        this.isProcessing = true;
        
        // Find connected bubbles of same color
        const matches = this.findColorMatches(attachedBubble, color);
        
        console.log(`Found ${matches.size} connected ${color.toString(16)} bubbles`);
        
        if (matches.size >= this.minimumMatchSize) {
            console.log('Match detected! Removing bubbles...');
            
            // Highlight matches briefly before removing
            this.highlightMatches(Array.from(matches));
            
            // Wait a moment to show the highlight
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Update combo
            this.updateCombo();
            
            // Calculate score
            const score = this.calculateScore(matches);
            this.totalScore += score;
            
            // Remove matched bubbles
            await this.removeMatches(Array.from(matches));
            
            // Check for floating bubbles after removal
            this.checkFloatingBubbles();
            
            // Emit match event
            this.scene.events.emit('match-completed', {
                count: matches.size,
                score: score,
                totalScore: this.totalScore,
                combo: this.combo
            });
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Find all connected bubbles of the same color
     */
    private findColorMatches(startBubble: Bubble, targetColor: BubbleColor): Set<Bubble> {
        const matches = new Set<Bubble>();
        const visited = new Set<Bubble>();
        const queue: Bubble[] = [startBubble];
        
        console.log(`Starting match detection from bubble at (${startBubble.x}, ${startBubble.y}) with color ${targetColor.toString(16)}`);
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            
            // Skip if already visited
            if (visited.has(current)) continue;
            visited.add(current);
            
            // Skip if wrong color or not visible
            if (!current.visible || current.getColor() !== targetColor) {
                console.log(`Skipping bubble at (${current.x}, ${current.y}) - visible: ${current.visible}, color: ${current.getColor()?.toString(16)}`);
                continue;
            }
            
            // Add to matches
            matches.add(current);
            console.log(`Added bubble to matches at (${current.x}, ${current.y})`);
            
            // Get neighbors
            const neighbors = this.getNeighborBubbles(current);
            console.log(`Found ${neighbors.length} neighbors`);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }
        
        console.log(`Total matches found: ${matches.size}`);
        return matches;
    }
    
    /**
     * Get neighboring bubbles
     */
    private getNeighborBubbles(bubble: Bubble): Bubble[] {
        const neighbors: Bubble[] = [];
        const hexPos = bubble.getGridPosition();
        if (!hexPos) return neighbors;
        
        // Get hex neighbors
        const hexNeighbors = this.bubbleGrid.getNeighbors(hexPos);
        const gridBubbles = this.gridAttachmentSystem.getGridBubbles();
        
        for (const neighborHex of hexNeighbors) {
            const neighborBubble = gridBubbles.find(b => {
                const pos = b.getGridPosition();
                return pos && 
                       pos.q === neighborHex.q && 
                       pos.r === neighborHex.r &&
                       b.visible;
            });
            
            if (neighborBubble) {
                neighbors.push(neighborBubble);
            }
        }
        
        return neighbors;
    }
    
    /**
     * Highlight bubbles that are about to be matched
     */
    private highlightMatches(bubbles: Bubble[]): void {
        bubbles.forEach(bubble => {
            // Create a pulsing effect
            this.scene.tweens.add({
                targets: bubble,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true,
                repeat: 1,
                ease: 'Sine.easeInOut'
            });
            
            // Add a glow effect
            bubble.setTint(0xFFFFFF);
        });
    }
    
    /**
     * Remove matched bubbles with animation
     */
    private async removeMatches(bubbles: Bubble[]): Promise<void> {
        // Sort bubbles by distance from center for staggered animation
        const centerX = bubbles.reduce((sum, b) => sum + b.x, 0) / bubbles.length;
        const centerY = bubbles.reduce((sum, b) => sum + b.y, 0) / bubbles.length;
        
        bubbles.sort((a, b) => {
            const distA = Phaser.Math.Distance.Between(a.x, a.y, centerX, centerY);
            const distB = Phaser.Math.Distance.Between(b.x, b.y, centerX, centerY);
            return distA - distB;
        });
        
        // Show score popup
        this.showScorePopup(this.calculateScore(new Set(bubbles)), centerX, centerY);
        
        // Animate removal
        const promises: Promise<void>[] = [];
        
        bubbles.forEach((bubble, index) => {
            const promise = new Promise<void>((resolve) => {
                // Clear tint first
                bubble.clearTint();
                
                // Particle effect
                const bubbleColor = bubble.getColor();
                if (bubbleColor !== undefined && bubbleColor !== null) {
                    this.createParticles(bubble.x, bubble.y, bubbleColor);
                }
                
                // Pop animation
                this.scene.tweens.add({
                    targets: bubble,
                    scaleX: 1.3,
                    scaleY: 1.3,
                    alpha: 0,
                    duration: 200,
                    ease: 'Back.easeOut',
                    delay: index * 30, // Stagger
                    onComplete: () => {
                        // Remove from grid
                        this.gridAttachmentSystem.removeGridBubble(bubble);
                        bubble.setGridPosition(null);
                        bubble.returnToPool();
                        resolve();
                    }
                });
            });
            promises.push(promise);
        });
        
        // Screen shake for large matches
        if (bubbles.length >= 7) {
            this.scene.cameras.main.shake(200, 0.003);
        }
        
        await Promise.all(promises);
    }
    
    /**
     * Check for floating bubbles after removal
     */
    private checkFloatingBubbles(): void {
        const disconnected = this.gridAttachmentSystem.findDisconnectedGroups();
        
        disconnected.forEach((bubbles, zone) => {
            if (bubbles.length > 0) {
                // Add points for dropped bubbles
                if (zone === ArenaZone.OPPONENT) {
                    const dropScore = bubbles.length * 5;
                    this.totalScore += dropScore;
                }
                
                // Apply gravity
                this.gridAttachmentSystem.applyZoneGravity(bubbles, zone);
            }
        });
    }
    
    /**
     * Calculate score for matches
     */
    private calculateScore(matches: Set<Bubble>): number {
        let score = 0;
        
        // Base score (10 per bubble)
        score = matches.size * 10;
        
        // Size bonus
        if (matches.size > 3) {
            score += (matches.size - 3) * 5;
        }
        
        // Combo multiplier
        if (this.combo > 0) {
            score = Math.floor(score * (1 + this.combo * 0.2));
        }
        
        // Zone bonus
        let zoneMultiplier = 1;
        matches.forEach(bubble => {
            const zone = this.getZone(bubble);
            if (zone === ArenaZone.OPPONENT) {
                zoneMultiplier = Math.max(zoneMultiplier, 2);
            } else if (zone === ArenaZone.OBJECTIVE) {
                zoneMultiplier = Math.max(zoneMultiplier, 1.5);
            }
        });
        
        score = Math.floor(score * zoneMultiplier);
        
        return score;
    }
    
    /**
     * Update combo counter
     */
    private updateCombo(): void {
        const now = Date.now();
        
        if (now - this.lastMatchTime < this.comboTimeout) {
            this.combo++;
        } else {
            this.combo = 0;
        }
        
        this.lastMatchTime = now;
    }
    
    /**
     * Get zone for bubble
     */
    private getZone(bubble: Bubble): ArenaZone {
        const screenHeight = this.scene.cameras.main.height;
        const objectiveTop = screenHeight * 0.4;
        const objectiveBottom = screenHeight * 0.6;
        
        if (bubble.y < objectiveTop) {
            return ArenaZone.OPPONENT;
        } else if (bubble.y > objectiveBottom) {
            return ArenaZone.PLAYER;
        } else {
            return ArenaZone.OBJECTIVE;
        }
    }
    
    /**
     * Create particle effects
     */
    private createParticles(x: number, y: number, color: BubbleColor): void {
        const particleCount = 6;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(
                x, y, 4,
                color,
                1
            );
            particle.setDepth(Z_LAYERS.BUBBLES_FRONT);
            
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = Phaser.Math.Between(50, 150);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: 400,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    /**
     * Show score popup
     */
    private showScorePopup(score: number, x: number, y: number): void {
        const text = this.scene.add.text(
            x, y,
            `+${score}`,
            {
                fontSize: '28px',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        text.setOrigin(0.5);
        text.setDepth(Z_LAYERS.UI);
        
        this.scene.tweens.add({
            targets: text,
            y: y - 60,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            }
        });
    }
    
    /**
     * Get current score
     */
    public getScore(): number {
        return this.totalScore;
    }
    
    /**
     * Reset system
     */
    public reset(): void {
        this.totalScore = 0;
        this.combo = 0;
        this.lastMatchTime = 0;
        this.isProcessing = false;
    }
}