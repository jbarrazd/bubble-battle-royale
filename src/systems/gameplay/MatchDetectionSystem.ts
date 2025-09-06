import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleGrid } from './BubbleGrid';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { BubbleColor, IHexPosition, ArenaZone } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';
import { MysteryBubble } from '@/gameObjects/MysteryBubble';
import { GameEventBus } from '@/core/EventBus';
// import { getParticlePool } from '@/optimization'; // Temporarily disabled

export class MatchDetectionSystem {
    private scene: Scene;
    private bubbleGrid: BubbleGrid;
    private gridAttachmentSystem: GridAttachmentSystem;
    private eventBus: GameEventBus;
    
    // System state
    public enabled: boolean = true;
    
    // Match settings
    private minimumMatchSize: number = 3;
    private isProcessing: boolean = false;
    private matchQueue: Array<{bubble: Bubble, isAIMatch: boolean}> = [];
    
    // Scoring
    private totalScore: number = 0;
    private combo: number = 0;
    private lastMatchTime: number = 0;
    private comboTimeout: number = 2000; // 2 seconds
    
    private comboManager: any; // ComboManager reference
    
    constructor(
        scene: Scene,
        bubbleGrid: BubbleGrid,
        gridAttachmentSystem: GridAttachmentSystem
    ) {
        this.scene = scene;
        this.bubbleGrid = bubbleGrid;
        this.gridAttachmentSystem = gridAttachmentSystem;
        this.eventBus = GameEventBus.getInstance();
    }
    
    /**
     * Set combo manager reference
     */
    public setComboManager(comboManager: any): void {
        this.comboManager = comboManager;
    }
    
    /**
     * Check for matches after a bubble attaches
     */
    public async checkForMatches(attachedBubble: Bubble): Promise<void> {
        // Don't check if system is disabled
        if (!this.enabled) return;
        
        // If processing, add to queue instead of ignoring
        if (this.isProcessing) {
            this.matchQueue.push({bubble: attachedBubble, isAIMatch: false});
            return;
        }
        
        if (!attachedBubble.visible) {
            return;
        }
        
        const color = attachedBubble.getColor();
        if (color === undefined || color === null) {
            return;
        }
        
        // Mark as processing
        this.isProcessing = true;
        
        // Find connected bubbles of same color
        const matches = this.findColorMatches(attachedBubble, color);
        
        if (matches.size >= this.minimumMatchSize) {
            
            // Calculate center position BEFORE any animations or removal
            // Use world positions to account for any container transformations
            let avgX = 0, avgY = 0;
            let bubbleColor: BubbleColor | undefined;
            matches.forEach(bubble => {
                // Get world position of each bubble
                const worldPos = bubble.getWorldTransformMatrix();
                avgX += worldPos.tx;
                avgY += worldPos.ty;
                if (!bubbleColor) {
                    bubbleColor = bubble.getColor();
                }
            });
            avgX /= matches.size;
            avgY /= matches.size;
            
            // Determine if this was an AI or player match based on the attached bubble
            const isAIMatch = attachedBubble.getShooter() === 'ai';
            
            // Highlight matches briefly before removing
            this.highlightMatches(Array.from(matches));
            
            // Wait a moment to show the highlight
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Calculate score using ComboManager if available
            let score = 0;
            if (this.comboManager) {
                // Use ComboManager for proper combo calculation and display
                score = this.comboManager.calculateScore(matches.size, avgX, avgY, bubbleColor);
                this.totalScore += score;
            } else {
                // Fallback to internal calculation
                this.updateCombo();
                score = this.calculateScore(matches);
                this.totalScore += score;
            }
            
            // Emit match found event to GameEventBus for proper handling
            this.eventBus.emit('match-found', {
                matchedBubbles: Array.from(matches),
                matchSize: matches.size,
                combo: this.combo,
                isAI: isAIMatch,
                isPlayer: !isAIMatch,
                x: avgX,
                y: avgY,
                bubbleColor: bubbleColor,
                color: bubbleColor
            });
            
            // Also emit to scene for backward compatibility
            this.scene.events.emit('match-found', {
                matchSize: matches.size,
                combo: this.combo,
                isAI: isAIMatch,
                x: avgX,
                y: avgY,
                bubbleColor: bubbleColor
            });
            
            // Emit score update event BEFORE removal animations
            this.scene.events.emit('score-update', {
                score: this.totalScore,
                delta: score,
                combo: this.combo,
                isAI: isAIMatch,
                matchSize: matches.size,
                x: avgX,
                y: avgY,
                bubbleColor: bubbleColor
            });
            
            // Emit bubble explosion event for visual effects
            // Create splatters at each bubble position for more realistic effect
            if (bubbleColor !== undefined) {
                // Collect all bubble positions
                const positions: { x: number, y: number }[] = [];
                matches.forEach(bubble => {
                    const worldPos = bubble.getWorldTransformMatrix();
                    positions.push({ x: worldPos.tx, y: worldPos.ty });
                });
                
                // Emit event with all positions
                this.scene.events.emit('bubble-exploded', {
                    x: avgX,  // Keep center for compatibility
                    y: avgY,
                    positions: positions,  // All individual positions
                    color: bubbleColor,
                    comboMultiplier: matches.size
                });
                
                // Emit audio event for pleasant pop sounds
                this.scene.events.emit('bubbles-popped', {
                    color: bubbleColor,
                    count: matches.size
                });
            }
            
            // Remove matched bubbles (Mystery bubbles will activate their power-ups when destroyed)
            // Pass !isAIMatch to indicate if it was a player shot
            await this.removeMatches(Array.from(matches), !isAIMatch);
            
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
        
        // Reset processing flag
        this.isProcessing = false;
        
        // Process next match in queue if any
        if (this.matchQueue.length > 0) {
            const next = this.matchQueue.shift();
            if (next && next.bubble && next.bubble.visible) {
                // Small delay to avoid stack overflow
                this.scene.time.delayedCall(10, () => {
                    this.checkForMatches(next.bubble);
                });
            }
        }
    }
    
    /**
     * Find all connected bubbles of the same color (Mystery bubbles match any color)
     */
    private findColorMatches(startBubble: Bubble, targetColor: BubbleColor): Set<Bubble> {
        const matches = new Set<Bubble>();
        const visited = new Set<Bubble>();
        const queue: Bubble[] = [startBubble];
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            
            // Skip if already visited
            if (visited.has(current)) continue;
            visited.add(current);
            
            // Check if bubble color matches target color
            const currentColor = current.getColor();
            
            // Skip if bubble has no color, is not visible, or color doesn't match
            if (!current.visible || currentColor === undefined || currentColor === null) {
                continue;
            }
            
            // Mystery Bubbles must ALSO match the color, they're not wildcards
            if (currentColor !== targetColor) {
                continue;
            }
            
            // Add to matches
            matches.add(current);
            
            // Get neighbors
            const neighbors = this.getNeighborBubbles(current);
            
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }
        
        return matches;
    }
    
    /**
     * Get neighboring bubbles
     */
    private getNeighborBubbles(bubble: Bubble): Bubble[] {
        const neighbors: Bubble[] = [];
        const hexPos = bubble.getGridPosition();
        if (!hexPos) {
            return neighbors;
        }
        
        // Get hex neighbors
        const hexNeighbors = this.bubbleGrid.getNeighbors(hexPos);
        const gridBubbles = this.gridAttachmentSystem.getGridBubbles();
        
        for (const neighborHex of hexNeighbors) {
            const neighborBubble = gridBubbles.find(b => {
                const pos = b.getGridPosition();
                return pos && 
                       pos.q === neighborHex.q && 
                       pos.r === neighborHex.r &&
                       b.visible &&
                       b.active;  // Also check if bubble is active
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
            // Kill any existing tweens on this bubble to prevent conflicts
            this.scene.tweens.killTweensOf(bubble);
            
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
    private async removeMatches(bubbles: Bubble[], isPlayerShot: boolean): Promise<void> {
        // First, collect all gems from bubbles that have them
        let totalGemsCollected = 0;
        bubbles.forEach(bubble => {
            if (bubble.getHasGem()) {
                // Emit gem collection event
                this.scene.events.emit('gem-collected-from-bubble', {
                    x: bubble.x,
                    y: bubble.y,
                    gemType: bubble.getGemType(),
                    isPlayer: isPlayerShot
                });
                totalGemsCollected++;
            }
        });
        
        if (totalGemsCollected > 0) {
        }
        
        // Then, check for and handle Mystery Bubbles BEFORE removal
        bubbles.forEach(bubble => {
            if (bubble instanceof MysteryBubble) {
                // console.log('Found MysteryBubble in matches, collecting power-up for', isPlayerShot ? 'player' : 'opponent');
                (bubble as MysteryBubble).collectPowerUp(isPlayerShot);
                
                // DISABLED - We don't want floating gems anymore
                // this.scene.events.emit('mystery-bubble-destroyed', {
                //     x: bubble.x,
                //     y: bubble.y
                // });
            }
        });
        
        // Sort bubbles by distance from center for staggered animation
        const centerX = bubbles.reduce((sum, b) => sum + b.x, 0) / bubbles.length;
        const centerY = bubbles.reduce((sum, b) => sum + b.y, 0) / bubbles.length;
        
        bubbles.sort((a, b) => {
            const distA = Phaser.Math.Distance.Between(a.x, a.y, centerX, centerY);
            const distB = Phaser.Math.Distance.Between(b.x, b.y, centerX, centerY);
            return distA - distB;
        });
        
        // Score popup is handled by ComboManager now
        
        // Determine animation style based on match size
        const matchSize = bubbles.length;
        const animationStyle = this.getPopAnimationStyle(matchSize);
        
        // Animate removal
        const promises: Promise<void>[] = [];
        
        bubbles.forEach((bubble, index) => {
            const promise = new Promise<void>((resolve) => {
                // Kill any existing tweens to prevent conflicts
                this.scene.tweens.killTweensOf(bubble);
                
                // Clear tint and ensure bubble is in correct state
                bubble.clearTint();
                bubble.setVisible(true);
                bubble.setAlpha(1);
                bubble.setScale(1);
                
                // Particle effect only for 4+ matches
                if (matchSize >= 4) {
                    const bubbleColor = bubble.getColor();
                    if (bubbleColor !== undefined && bubbleColor !== null) {
                        this.createParticles(bubble.x, bubble.y, bubbleColor);
                    }
                }
                
                // Different animations based on combo size
                if (matchSize === 3) {
                    // Simple fade for 3-match
                    this.scene.tweens.add({
                        targets: bubble,
                        scale: 0.8,
                        alpha: 0,
                        duration: 150,
                        ease: 'Power2',
                        delay: index * 15,
                        onComplete: () => {
                            // Gems already collected at the beginning of removeMatches
                            
                            // Emit bubble popped event
                            this.scene.events.emit('bubble-popped', {
                                x: bubble.x,
                                y: bubble.y,
                                color: bubble.getColor(),
                                isCombo: true
                            });
                            
                            this.gridAttachmentSystem.removeGridBubble(bubble);
                            bubble.setGridPosition(null);
                            bubble.returnToPool();
                            resolve();
                        }
                    });
                } else if (matchSize === 4) {
                    // Gentle pop for 4-match
                    this.scene.tweens.add({
                        targets: bubble,
                        scale: 1.2,
                        alpha: 0,
                        duration: 200,
                        ease: 'Back.easeOut',
                        delay: index * 20,
                        onComplete: () => {
                            // Gems already collected at the beginning of removeMatches
                            
                            // Emit bubble popped event
                            this.scene.events.emit('bubble-popped', {
                                x: bubble.x,
                                y: bubble.y,
                                color: bubble.getColor(),
                                isCombo: true
                            });
                            
                            this.gridAttachmentSystem.removeGridBubble(bubble);
                            bubble.setGridPosition(null);
                            bubble.returnToPool();
                            resolve();
                        }
                    });
                } else if (matchSize === 5) {
                    // Bouncy pop for 5-match
                    this.scene.tweens.add({
                        targets: bubble,
                        scale: { from: 1, to: 1.4 },
                        alpha: 0,
                        y: bubble.y - 10,
                        duration: 250,
                        ease: 'Bounce.easeOut',
                        delay: index * 25,
                        onComplete: () => {
                            // Gems already collected at the beginning of removeMatches
                            
                            // Emit bubble popped event
                            this.scene.events.emit('bubble-popped', {
                                x: bubble.x,
                                y: bubble.y,
                                color: bubble.getColor(),
                                isCombo: true
                            });
                            
                            this.gridAttachmentSystem.removeGridBubble(bubble);
                            bubble.setGridPosition(null);
                            bubble.returnToPool();
                            resolve();
                        }
                    });
                } else if (matchSize === 6) {
                    // Spiral out for 6-match
                    const angle = (index / bubbles.length) * Math.PI * 2;
                    this.scene.tweens.add({
                        targets: bubble,
                        x: bubble.x + Math.cos(angle) * 30,
                        y: bubble.y + Math.sin(angle) * 30,
                        scale: 1.5,
                        alpha: 0,
                        angle: 180,
                        duration: 300,
                        ease: 'Cubic.easeOut',
                        delay: index * 20,
                        onComplete: () => {
                            // Gems already collected at the beginning of removeMatches
                            
                            this.gridAttachmentSystem.removeGridBubble(bubble);
                            bubble.setGridPosition(null);
                            bubble.returnToPool();
                            resolve();
                        }
                    });
                } else {
                    // Explosive scatter for 7+ match
                    const explosionAngle = Math.random() * Math.PI * 2;
                    const explosionDistance = Phaser.Math.Between(50, 100);
                    
                    // Ensure bubble is properly set up before animation
                    bubble.clearTint();
                    bubble.setVisible(true);
                    bubble.setAlpha(1);
                    
                    this.scene.tweens.add({
                        targets: bubble,
                        x: bubble.x + Math.cos(explosionAngle) * explosionDistance,
                        y: bubble.y + Math.sin(explosionAngle) * explosionDistance,
                        scale: 0,  // Simplified to just scale to 0
                        alpha: 0,
                        angle: 360,
                        duration: 400,
                        ease: 'Power3.easeOut',
                        delay: index * 10,
                        onComplete: () => {
                            // Make sure bubble is properly cleaned up
                            bubble.setVisible(false);
                            bubble.clearTint();
                            bubble.setScale(1);
                            bubble.setAlpha(1);
                            bubble.setAngle(0);
                            this.gridAttachmentSystem.removeGridBubble(bubble);
                            bubble.setGridPosition(null);
                            bubble.returnToPool();
                            resolve();
                        }
                    });
                }
            });
            promises.push(promise);
        });
        
        // Screen shake only for large matches
        if (bubbles.length >= 6) {
            this.scene.cameras.main.shake(150, 0.002);
        }
        
        await Promise.all(promises);
    }
    
    private getPopAnimationStyle(matchSize: number): string {
        if (matchSize === 3) return 'fade';
        if (matchSize === 4) return 'pop';
        if (matchSize === 5) return 'bounce';
        if (matchSize === 6) return 'spiral';
        return 'explode';
    }
    
    /**
     * Check for floating bubbles after removal
     */
    private checkFloatingBubbles(): void {
        // Safety check: if there are no grid bubbles left, skip
        const gridBubbles = this.gridAttachmentSystem.getGridBubbles();
        if (!gridBubbles || gridBubbles.length === 0) {
            return;
        }
        
        const disconnected = this.gridAttachmentSystem.findDisconnectedGroups();
        
        // Collect all disconnected bubbles
        const allDisconnected: Bubble[] = [];
        disconnected.forEach((bubbles) => {
            allDisconnected.push(...bubbles);
        });
        
        if (allDisconnected.length > 0) {
            // Calculate center position for bonus display
            let avgX = 0, avgY = 0;
            allDisconnected.forEach(bubble => {
                avgX += bubble.x;
                avgY += bubble.y;
            });
            avgX /= allDisconnected.length;
            avgY /= allDisconnected.length;
            
            // Count bubbles by direction
            const centerY = this.scene.cameras.main.centerY;
            const upwardBubbles = allDisconnected.filter(b => b.y < centerY).length;
            const downwardBubbles = allDisconnected.filter(b => b.y >= centerY).length;
            
            // Calculate bonus score (10 points per orphan bubble)
            const bonusPerBubble = 10;
            const totalOrphanBonus = allDisconnected.length * bonusPerBubble;
            
            if (totalOrphanBonus > 0) {
                this.totalScore += totalOrphanBonus;
                
                // DISABLED: Visual feedback now handled by UnifiedFeedbackSystem
                // this.showOrphanBonus(avgX, avgY, allDisconnected.length, totalOrphanBonus);
                
                // Emit floating bubbles drop event for sound system
                this.scene.events.emit('floating-bubbles-drop', {
                    count: allDisconnected.length,
                    x: avgX,
                    y: avgY
                });
                
                // Emit score update for orphan bonus with adjusted Y position
                // Determine shooter based on which side had more bubbles
                const isAIBonus = upwardBubbles > downwardBubbles;
                
                this.scene.events.emit('score-update', {
                    score: this.totalScore,
                    delta: totalOrphanBonus,
                    combo: 0,
                    isAI: isAIBonus,
                    matchSize: 0, // 0 indicates orphan bonus
                    x: avgX,
                    y: avgY + 40, // Offset down to avoid overlap with match score
                    isOrphanBonus: true,
                    metadata: {
                        dropCount: allDisconnected.length
                    }
                });
            }
            
            // Apply bidirectional gravity
            this.gridAttachmentSystem.applyBidirectionalGravity(allDisconnected);
        }
    }
    
    /**
     * Show orphan bonus visual feedback
     */
    private showOrphanBonus(x: number, y: number, count: number, bonus: number): void {
        // Offset y position to avoid overlapping with combo displays
        const adjustedY = y + 30; // Move down to avoid overlap
        
        // Create container for bonus display
        const bonusContainer = this.scene.add.container(x, adjustedY);
        bonusContainer.setDepth(Z_LAYERS.UI + 15); // Higher depth to ensure visibility
        
        // Create comic-style drop bonus text
        const dropText = this.scene.add.text(0, -8, 'DROP BONUS', {
            fontSize: '18px',
            color: '#00FFFF',
            fontFamily: 'Impact, Arial Black', // Comic style
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        dropText.setOrigin(0.5);
        dropText.setShadow(1, 1, '#0066CC', 2, true, true);
        
        // Create points text with comic style
        const pointsText = this.scene.add.text(0, 12, `+${bonus}`, {
            fontSize: '22px',
            color: '#FFD700',
            fontFamily: 'Impact, Arial Black', // Comic style
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        pointsText.setOrigin(0.5);
        
        bonusContainer.add([dropText, pointsText]);
        bonusContainer.setScale(0);
        
        // Elegant entrance animation
        this.scene.tweens.add({
            targets: bonusContainer,
            scale: { from: 0, to: 1.1 },
            duration: 250,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Subtle settle
                this.scene.tweens.add({
                    targets: bonusContainer,
                    scale: 1,
                    duration: 100,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Float down instead of up to differentiate from combo text
        this.scene.time.delayedCall(700, () => {
            this.scene.tweens.add({
                targets: bonusContainer,
                y: adjustedY + 40, // Float down
                alpha: 0,
                scale: 0.9,
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    bonusContainer.destroy(true);
                }
            });
        });
        
        // Create sparkle particles at adjusted position
        this.createDropParticles(x, adjustedY, count);
    }
    
    private createDropParticles(x: number, y: number, count: number): void {
        const particleCount = Math.min(count * 3, 15);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(
                x + Phaser.Math.Between(-20, 20),
                y + Phaser.Math.Between(-20, 20),
                3,
                0x00FFFF,
                0.8
            );
            particle.setDepth(Z_LAYERS.UI + 5);
            
            // Sparkle animation
            this.scene.tweens.add({
                targets: particle,
                y: particle.y - Phaser.Math.Between(30, 60),
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(500, 800),
                delay: i * 20,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
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
     * Create particle effects - Enhanced explosion system
     */
    private createParticles(x: number, y: number, color: BubbleColor): void {
        // Main explosion particles
        const particleCount = 12;
        const innerParticles = 8;
        
        // Create bright flash at center
        const flash = this.scene.add.circle(x, y, 25, 0xFFFFFF, 0.8);
        flash.setDepth(Z_LAYERS.EFFECTS);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: flash,
            scale: { from: 0, to: 2 },
            alpha: { from: 0.8, to: 0 },
            duration: 200,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
        
        // Main particles - outer burst
        for (let i = 0; i < particleCount; i++) {
            const particle = this.scene.add.circle(
                x, y, 
                Phaser.Math.Between(3, 6),
                color,
                1
            );
            particle.setDepth(Z_LAYERS.EFFECTS);
            particle.setBlendMode(Phaser.BlendModes.ADD);
            
            const angle = (i / particleCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
            const speed = Phaser.Math.Between(80, 200);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: { from: 1, to: 0 },
                scale: { from: 1, to: 0.3 },
                duration: Phaser.Math.Between(400, 600),
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Inner sparkles - smaller, faster
        for (let i = 0; i < innerParticles; i++) {
            const sparkle = this.scene.add.circle(
                x + Phaser.Math.Between(-5, 5), 
                y + Phaser.Math.Between(-5, 5),
                2,
                0xFFFFFF,
                0.9
            );
            sparkle.setDepth(Z_LAYERS.EFFECTS + 1);
            sparkle.setBlendMode(Phaser.BlendModes.ADD);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(30, 60);
            
            this.scene.tweens.add({
                targets: sparkle,
                x: sparkle.x + Math.cos(angle) * speed,
                y: sparkle.y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(200, 300),
                delay: Phaser.Math.Between(0, 50),
                ease: 'Cubic.easeOut',
                onComplete: () => sparkle.destroy()
            });
        }
        
        // Create expanding ring for extra impact
        const ring = this.scene.add.graphics();
        ring.lineStyle(3, color, 0.6);
        ring.strokeCircle(0, 0, 20);
        ring.setPosition(x, y);
        ring.setDepth(Z_LAYERS.EFFECTS);
        ring.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: ring,
            scale: { from: 0.5, to: 2.5 },
            alpha: { from: 0.6, to: 0 },
            duration: 350,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
    }
    
    // Score popup removed - handled by ComboManager
    
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