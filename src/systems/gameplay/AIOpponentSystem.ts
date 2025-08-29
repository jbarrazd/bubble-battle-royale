import Phaser from 'phaser';
import { Launcher } from '@/gameObjects/Launcher';
// BubbleQueue removed - integrated into Launcher
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, ARENA_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';

export enum AIDifficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD'
}

interface IShootTarget {
    angle: number;
    useWallBounce: 'none' | 'left' | 'right';
    targetBubble?: Bubble;
    score: number;
    reasoning: string;
    potentialFalls?: number; // Number of bubbles that would fall
    totalValue?: number; // Total value including falls
}

export class AIOpponentSystem {
    private scene: Phaser.Scene;
    private launcher: Launcher;
    private currentBubble: Bubble | null = null; // Track loaded bubble
    private nextBubbleColors: BubbleColor[] = []; // Store next 2-3 colors for launcher rings
    private availableColors: BubbleColor[] = [
        BubbleColor.RED,
        BubbleColor.BLUE, 
        BubbleColor.GREEN,
        BubbleColor.YELLOW,
        BubbleColor.PURPLE
    ];
    private isActive: boolean = false;
    private shootTimer?: Phaser.Time.TimerEvent;
    private difficulty: AIDifficulty = AIDifficulty.HARD;
    private isOnCooldown: boolean = false;
    private readonly COOLDOWN_TIME: number = 1000; // Same as player - 1 second
    private readonly SHOOT_SPEED: number = 600; // Same as player
    
    constructor(scene: Phaser.Scene, launcher: Launcher) {
        this.scene = scene;
        this.launcher = launcher;
        
        // Initialize next bubble colors for integrated queue
        this.generateNextBubbleColors();
        
        // Listen for shooting complete to know when we can shoot again
        this.scene.events.on('shooting-complete', this.onShootingComplete, this);
    }
    
    public setDifficulty(difficulty: AIDifficulty): void {
        this.difficulty = difficulty;
    }
    
    public start(): void {
        this.isActive = true;
        console.log('AI: Starting with difficulty', this.difficulty);
        
        // Set initial downward angle for opponent
        this.launcher.setAimAngle(90); // 90 degrees = straight down for opponent
        
        // Load first bubble
        this.loadNextBubble();
        // Start thinking about first shot
        this.scheduleNextShot();
    }
    
    public stop(): void {
        this.isActive = false;
        if (this.shootTimer) {
            this.shootTimer.destroy();
            this.shootTimer = undefined;
        }
        
        // Clean up current bubble when stopping
        if (this.currentBubble) {
            this.currentBubble.destroy();
            this.currentBubble = null;
        }
    }
    
    /**
     * Generates next bubble colors for the integrated queue system
     */
    private generateNextBubbleColors(): void {
        // Generate 3 colors: current + next 2
        this.nextBubbleColors = [];
        for (let i = 0; i < 3; i++) {
            const randomColor = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
            this.nextBubbleColors.push(randomColor);
        }
        
        console.log('AI: Generated next bubble colors:', this.nextBubbleColors);
    }
    
    /**
     * Loads next bubble using integrated queue system
     */
    private loadNextBubble(): void {
        // Get current color (first in queue)
        const currentColor = this.nextBubbleColors[0] || BubbleColor.BLUE;
        
        console.log(`AI loadNextBubble: Loading bubble color ${currentColor} hex=0x${currentColor.toString(16)}`);
        
        // Load bubble into launcher
        this.launcher.loadBubble(currentColor);
        
        // Get the loaded bubble from the launcher
        this.currentBubble = this.launcher.getLoadedBubble();
        
        // Shift queue and add new color
        this.nextBubbleColors.shift(); // Remove current color
        const newColor = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
        this.nextBubbleColors.push(newColor); // Add new color at end
        
        // Update launcher queue rings with new colors
        this.launcher.updateQueueColors(this.nextBubbleColors);
        
        console.log('AI: Updated queue colors:', this.nextBubbleColors);
    }
    
    private scheduleNextShot(): void {
        if (!this.isActive || this.isOnCooldown) return;
        
        // Decision time based on difficulty (thinking time, not shooting speed)
        let thinkingTime: number;
        switch (this.difficulty) {
            case AIDifficulty.EASY:
                thinkingTime = 3000 + Math.random() * 2000; // 3-5 seconds to think
                break;
            case AIDifficulty.MEDIUM:
                thinkingTime = 2000 + Math.random() * 1000; // 2-3 seconds to think
                break;
            case AIDifficulty.HARD:
                thinkingTime = 1000 + Math.random() * 500; // 1-1.5 seconds (still quick but more thoughtful)
                break;
        }
        
        this.shootTimer = this.scene.time.delayedCall(thinkingTime, () => {
            if (this.isActive && !this.isOnCooldown) {
                this.performShot();
            }
        });
    }
    
    private performShot(): void {
        if (this.isOnCooldown || !this.currentBubble) return;
        
        const color = this.currentBubble.getColor();
        const bubbleId = this.currentBubble.getData('bubbleId');
        
        // Find best shot based on difficulty
        const target = this.calculateBestShot(color);
        
        console.log(`🎯 AI shooting: ID=${bubbleId} ${this.getColorName(color)} at ${target.angle.toFixed(1)}° (${target.reasoning}) score=${target.score}`);
        
        // Update launcher aim
        this.launcher.setAimAngle(target.angle);
        
        // Store the bubble for shooting (don't destroy it yet!)
        const bubbleToShoot = this.currentBubble;
        this.currentBubble = null;
        
        // Remove bubble from launcher before shooting
        this.launcher.clearLoadedBubble();
        
        // Position bubble at launcher's world position for shooting
        bubbleToShoot.setPosition(
            this.launcher.x,
            this.launcher.y + 30  // Opponent shoots from below
        );
        
        // Reset bubble for shooting
        bubbleToShoot.setScale(1);
        bubbleToShoot.setDepth(Z_LAYERS.BUBBLES_FRONT);
        
        // Emit shoot event WITH THE BUBBLE
        this.scene.events.emit('ai-shoot', {
            angle: target.angle,
            color: color,
            bubble: bubbleToShoot  // Pass the actual bubble!
        });
        
        // Start cooldown (same as player!)
        this.isOnCooldown = true;
        this.scene.time.delayedCall(this.COOLDOWN_TIME, () => {
            this.isOnCooldown = false;
            // Load next bubble after cooldown
            this.loadNextBubble();
            // Schedule next shot after cooldown
            this.scheduleNextShot();
        });
    }
    
    private calculateBestShot(color: BubbleColor): IShootTarget {
        const gridBubbles = this.getGridBubbles();
        const sameColorBubbles = gridBubbles.filter(b => b.getColor() === color);
        
        console.log(`🔍 AI analyzing: Found ${gridBubbles.length} total bubbles, ${sameColorBubbles.length} ${this.getColorName(color)} bubbles`);
        
        let bestTarget: IShootTarget | null = null;
        
        if (this.difficulty === AIDifficulty.HARD) {
            // PRIORITY 1: Check if we can hit the objective directly!
            const objectiveShot = this.checkObjectiveShot();
            if (objectiveShot) {
                console.log(`  🎯 WINNING SHOT AVAILABLE! Direct path to objective!`);
                return objectiveShot;
            }
            // PRIORITY 2: Smart targeting for strategic eliminations
            let allTargets: IShootTarget[] = [];
            
            // First, check if we should prioritize clearing path to objective
            const objectiveExposed = this.isObjectiveExposed();
            if (!objectiveExposed) {
                console.log(`  🏯 Objective is protected - need to clear path`);
                // Prioritize bubbles near the objective
                const centerX = this.scene.cameras.main.centerX;
                const centerY = this.scene.cameras.main.centerY;
                
                // Find bubbles blocking the objective
                const blockingBubbles = sameColorBubbles.filter(b => {
                    const dist = Phaser.Math.Distance.Between(b.x, b.y, centerX, centerY);
                    return dist < BUBBLE_CONFIG.SIZE * 4; // Near objective
                });
                
                if (blockingBubbles.length > 0) {
                    console.log(`  🎯 Found ${blockingBubbles.length} same-color bubbles near objective`);
                    sameColorBubbles.unshift(...blockingBubbles); // Prioritize these
                }
            }
            
            if (sameColorBubbles.length > 0) {
                // Analyze ALL possible shots, not just the first one found
                for (const targetBubble of sameColorBubbles) {
                    // Try different attachment points
                    const angles = [
                        this.calculateAngleToTarget(targetBubble.x, targetBubble.y - BUBBLE_CONFIG.SIZE),
                        this.calculateAngleToTarget(targetBubble.x - BUBBLE_CONFIG.SIZE * 0.5, targetBubble.y),
                        this.calculateAngleToTarget(targetBubble.x + BUBBLE_CONFIG.SIZE * 0.5, targetBubble.y),
                        this.calculateAngleToTarget(targetBubble.x, targetBubble.y)
                    ];
                    
                    for (const angle of angles) {
                        if (angle >= 15 && angle <= 165) {
                            const targetPos = { x: targetBubble.x, y: targetBubble.y };
                            if (this.isTrajectoryClear(angle, targetPos)) {
                                const potentialFalls = this.predictFallsFromShot(targetBubble, color);
                                const matchSize = this.countPotentialMatch(targetBubble, color);
                                
                                // Check distance to objective for priority
                                const centerX = this.scene.cameras.main.centerX;
                                const centerY = this.scene.cameras.main.centerY;
                                const distToObjective = Phaser.Math.Distance.Between(targetBubble.x, targetBubble.y, centerX, centerY);
                                const nearObjective = distToObjective < BUBBLE_CONFIG.SIZE * 4;
                                
                                // Higher base score if near objective
                                const baseScore = nearObjective ? 200 + (matchSize * 30) : 100 + (matchSize * 20);
                                const fallBonus = potentialFalls * 300;
                                
                                allTargets.push({
                                    angle: angle,
                                    useWallBounce: 'none',
                                    targetBubble: targetBubble,
                                    score: baseScore + fallBonus,
                                    totalValue: baseScore + fallBonus,
                                    potentialFalls: potentialFalls,
                                    reasoning: `match-${matchSize}${potentialFalls > 0 ? ` causing ${potentialFalls} falls` : ''}${nearObjective ? ' NEAR OBJECTIVE' : ''}`
                                });
                                
                                // Found a good shot, but keep looking for better ones
                                break; // But still check other bubbles
                            }
                        }
                    }
                }
            }
            
            // Also consider strategic wall bounce shots
            console.log(`  🎾 Checking wall bounce options...`);
            const bounceTargets = this.findWallBounceTargets(color, sameColorBubbles);
            allTargets.push(...bounceTargets);
            
            // Pick the best target from all analyzed
            if (allTargets.length > 0) {
                allTargets.sort((a, b) => (b.totalValue || b.score) - (a.totalValue || a.score));
                bestTarget = allTargets[0];
                console.log(`  📊 Analyzed ${allTargets.length} possible shots`);
                console.log(`  🎯 Best shot: ${bestTarget.reasoning} (score: ${bestTarget.totalValue || bestTarget.score})`);
            }
        }
        
        // If no strategic shot found (or easier difficulty), find ANY valid shot
        if (!bestTarget) {
            bestTarget = this.findStraightShotTarget(sameColorBubbles);
        }
        
        // Absolutely last resort - shoot randomly
        if (!bestTarget) {
            console.log('  🎲 No good shot found, shooting randomly');
            const angle = 90; // Shoot straight down
            bestTarget = {
                angle: angle,
                useWallBounce: 'none',
                score: 0,
                reasoning: 'random (no targets)'
            };
        }
        
        return bestTarget;
    }
    
    private findStraightShotTarget(sameColorBubbles: Bubble[]): IShootTarget | null {
        // Find any bubble we can hit directly
        const gridBubbles = this.getGridBubbles();
        const allTargets = sameColorBubbles.length > 0 ? sameColorBubbles : gridBubbles;
        
        for (const bubble of allTargets) {
            const angle = this.calculateAngleToTarget(bubble.x, bubble.y);
            
            // Check if angle is within launcher constraints
            if (angle >= 15 && angle <= 165) {
                const targetPos = { x: bubble.x, y: bubble.y };
                if (this.isTrajectoryClear(angle, targetPos)) {
                    return {
                        angle: angle,
                        useWallBounce: 'none',
                        targetBubble: bubble,
                        score: 50,
                        reasoning: `direct shot to ${this.getColorName(bubble.getColor())}`
                    };
                }
            }
        }
        
        return null;
    }
    
    private findTargetsViaWallBounce(color: BubbleColor): IShootTarget[] {
        const targets: IShootTarget[] = [];
        const gridBubbles = this.getGridBubbles();
        const sameColorBubbles = gridBubbles.filter(b => b.getColor() === color);
        
        // Check each same-color bubble for possible wall bounces
        for (const bubble of sameColorBubbles) {
            // Check possible attachment points around the bubble
            const attachPoints = this.getAttachmentPoints(bubble);
            
            for (const point of attachPoints) {
                // Check how many same-color bubbles would be connected from this point
                const wouldConnect = this.countConnectedBubbles(point, color, sameColorBubbles);
                
                if (wouldConnect >= 2) { // Would make at least match-3
                    const angle = this.calculateAngleToTarget(point.x, point.y);
                    
                    // Check if angle is valid and trajectory is clear
                    if (angle >= 15 && angle <= 165 && this.isTrajectoryClear(angle, point)) {
                        targets.push({
                            angle: angle,
                            useWallBounce: 'none',
                            targetBubble: bubble,
                            score: 100 + wouldConnect * 50,
                            reasoning: `match-${wouldConnect + 1}`
                        });
                    }
                }
            }
        }
        
        // Sort by score (best first)
        return targets.sort((a, b) => b.score - a.score);
    }
    
    private findWallBounceTargets(color: BubbleColor, sameColorBubbles: Bubble[]): IShootTarget[] {
        const targets: IShootTarget[] = [];
        const screenWidth = this.scene.cameras.main.width;
        
        for (const bubble of sameColorBubbles) {
            // Left wall bounce
            const mirrorX = -bubble.x; // Mirror across left wall
            const leftBounceAngle = this.calculateAngleToTarget(mirrorX, bubble.y);
            if (leftBounceAngle >= 100 && leftBounceAngle <= 165) { // Must aim left
                targets.push({
                    angle: leftBounceAngle,
                    useWallBounce: 'left',
                    targetBubble: bubble,
                    score: 80,
                    reasoning: 'left wall bounce'
                });
            }
            
            // Right wall bounce
            const mirrorX2 = screenWidth + (screenWidth - bubble.x); // Mirror across right wall
            const rightBounceAngle = this.calculateAngleToTarget(mirrorX2, bubble.y);
            if (rightBounceAngle >= 15 && rightBounceAngle <= 80) { // Must aim right
                targets.push({
                    angle: rightBounceAngle,
                    useWallBounce: 'right',
                    targetBubble: bubble,
                    score: 80,
                    reasoning: 'right wall bounce'
                });
            }
        }
        
        return targets.sort((a, b) => b.score - a.score);
    }
    
    private findBestWallBounce(color: BubbleColor, targets: Bubble[]): IShootTarget | null {
        for (const bubble of targets) {
            // Try left wall bounce
            const leftMirrorX = -bubble.x;
            const leftAngle = this.calculateAngleToTarget(leftMirrorX, bubble.y);
            if (leftAngle >= 100 && leftAngle <= 165) {
                // Verify the bounce path is clear
                const bouncePoint = { x: 0, y: this.launcher.y + Math.tan(leftAngle * Math.PI / 180) * this.launcher.x };
                if (this.isTrajectoryClear(leftAngle, bouncePoint)) {
                    return {
                        angle: leftAngle,
                        useWallBounce: 'left',
                        score: 100,
                        reasoning: `left bounce to ${this.getColorName(color)}`
                    };
                }
            }
            
            // Try right wall bounce
            const screenWidth = this.scene.cameras.main.width;
            const rightMirrorX = screenWidth + (screenWidth - bubble.x);
            const rightAngle = this.calculateAngleToTarget(rightMirrorX, bubble.y);
            if (rightAngle >= 15 && rightAngle <= 80) {
                // Verify the bounce path is clear
                const bouncePoint = { x: screenWidth, y: this.launcher.y + Math.tan(rightAngle * Math.PI / 180) * (screenWidth - this.launcher.x) };
                if (this.isTrajectoryClear(rightAngle, bouncePoint)) {
                    return {
                        angle: rightAngle,
                        useWallBounce: 'right',
                        score: 100,
                        reasoning: `right bounce to ${this.getColorName(color)}`
                    };
                }
            }
        }
        return null;
    }
    
    private getAttachmentPoints(bubble: Bubble): { x: number, y: number }[] {
        const points: { x: number, y: number }[] = [];
        const size = BUBBLE_CONFIG.SIZE;
        
        // Six hexagonal neighbor positions
        const offsets = [
            { x: size, y: 0 },        // Right
            { x: -size, y: 0 },       // Left
            { x: size/2, y: -size * 0.866 },   // Top-right
            { x: -size/2, y: -size * 0.866 },  // Top-left
            { x: size/2, y: size * 0.866 },    // Bottom-right
            { x: -size/2, y: size * 0.866 }    // Bottom-left
        ];
        
        for (const offset of offsets) {
            points.push({
                x: bubble.x + offset.x,
                y: bubble.y + offset.y
            });
        }
        
        return points;
    }
    
    private countConnectedBubbles(point: { x: number, y: number }, color: BubbleColor, bubbles: Bubble[]): number {
        let count = 0;
        const threshold = BUBBLE_CONFIG.SIZE * 1.1;
        
        for (const bubble of bubbles) {
            const dist = Phaser.Math.Distance.Between(point.x, point.y, bubble.x, bubble.y);
            if (dist < threshold) {
                count++;
            }
        }
        
        return count;
    }
    
    private calculateAngleToTarget(targetX: number, targetY: number): number {
        const dx = targetX - this.launcher.x;
        const dy = targetY - this.launcher.y;
        
        // Calculate angle in radians, then convert to degrees
        // Using Math.atan2 which gives angle from -PI to PI
        let angle = Math.atan2(dy, dx);
        
        // Convert to degrees
        angle = angle * (180 / Math.PI);
        
        // Normalize to 0-360 range
        if (angle < 0) angle += 360;
        
        return angle;
    }
    
    private isTrajectoryClear(angle: number, target: { x: number, y: number }): boolean {
        // Simulate trajectory and check for collisions
        const radians = angle * (Math.PI / 180);
        const velocity = {
            x: Math.cos(radians) * this.SHOOT_SPEED,
            y: Math.sin(radians) * this.SHOOT_SPEED
        };
        
        let testX = this.launcher.x;
        let testY = this.launcher.y;
        const targetDist = Phaser.Math.Distance.Between(this.launcher.x, this.launcher.y, target.x, target.y);
        
        // Check points along the trajectory
        const steps = 20;
        const stepDist = targetDist / steps;
        
        for (let i = 1; i < steps; i++) {
            const t = (stepDist * i) / this.SHOOT_SPEED;
            testX = this.launcher.x + velocity.x * t;
            testY = this.launcher.y + velocity.y * t;
            
            // Check if we hit any bubble before reaching target
            const gridBubbles = this.getGridBubbles();
            for (const bubble of gridBubbles) {
                const dist = Phaser.Math.Distance.Between(testX, testY, bubble.x, bubble.y);
                if (dist < BUBBLE_CONFIG.SIZE * 0.8) {
                    // Check if this is our target
                    const targetDist = Phaser.Math.Distance.Between(bubble.x, bubble.y, target.x, target.y);
                    if (targetDist > BUBBLE_CONFIG.SIZE) {
                        return false; // Hit something else first
                    }
                }
            }
        }
        
        return true;
    }
    
    private getGridBubbles(): Bubble[] {
        // Get all bubbles from the grid
        const bubbles: Bubble[] = [];
        this.scene.children.list.forEach(child => {
            if (child instanceof Bubble && child.visible && child.getGridPosition()) {
                bubbles.push(child);
            }
        });
        return bubbles;
    }
    
    private getColorName(color: BubbleColor): string {
        switch(color) {
            case BubbleColor.RED: return 'RED';
            case BubbleColor.BLUE: return 'BLUE';
            case BubbleColor.GREEN: return 'GREEN';
            case BubbleColor.YELLOW: return 'YELLOW';
            case BubbleColor.PURPLE: return 'PURPLE';
            case BubbleColor.MYSTERY: return 'MYSTERY';
            default: return 'UNKNOWN';
        }
    }
    
    private countPotentialMatch(targetBubble: Bubble, shootColor: BubbleColor): number {
        const visited = new Set<Bubble>();
        const toCheck = [targetBubble];
        let matchCount = 1; // Count the shot bubble itself
        
        // Find all connected same-color bubbles
        while (toCheck.length > 0) {
            const current = toCheck.pop()!;
            if (visited.has(current)) continue;
            visited.add(current);
            
            // Only count if same color as what we're shooting
            if (current.getColor() === shootColor) {
                if (current !== targetBubble) matchCount++;
                
                // Check neighbors
                const neighbors = this.getNeighborBubbles(current);
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor) && neighbor.getColor() === shootColor) {
                        toCheck.push(neighbor);
                    }
                }
            }
        }
        
        return matchCount;
    }
    
    private predictFallsFromShot(targetBubble: Bubble, shootColor: BubbleColor): number {
        // Simulate what would happen if we made this match
        const matchSize = this.countPotentialMatch(targetBubble, shootColor);
        
        if (matchSize < 3) return 0; // No match, no falls
        
        // This is a simplified prediction - in reality we'd need to simulate the full match and fall
        // For now, estimate based on position
        const neighbors = this.getNeighborBubbles(targetBubble);
        let potentialFalls = 0;
        
        for (const neighbor of neighbors) {
            if (neighbor.getColor() !== shootColor) {
                // Check if this bubble would be disconnected
                const supportingNeighbors = this.getNeighborBubbles(neighbor);
                const wouldLoseSupport = supportingNeighbors.filter(n => 
                    n === targetBubble || n.getColor() === shootColor
                ).length >= supportingNeighbors.length - 1;
                
                if (wouldLoseSupport) {
                    potentialFalls++;
                }
            }
        }
        
        return potentialFalls;
    }
    
    private getNeighborBubbles(bubble: Bubble): Bubble[] {
        const neighbors: Bubble[] = [];
        const gridBubbles = this.getGridBubbles();
        const threshold = BUBBLE_CONFIG.SIZE * 1.1;
        
        for (const other of gridBubbles) {
            if (other === bubble) continue;
            const dist = Phaser.Math.Distance.Between(bubble.x, bubble.y, other.x, other.y);
            if (dist < threshold) {
                neighbors.push(other);
            }
        }
        
        return neighbors;
    }
    
    private checkObjectiveShot(): IShootTarget | null {
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        // Calculate angle to objective
        const angle = this.calculateAngleToTarget(centerX, centerY);
        
        // Check if angle is valid
        if (angle >= 15 && angle <= 165) {
            // Check if path is clear
            const target = { x: centerX, y: centerY };
            if (this.isTrajectoryClear(angle, target)) {
                return {
                    angle: angle,
                    useWallBounce: 'none',
                    score: 10000, // Winning shot!
                    reasoning: '🏆 DIRECT HIT ON OBJECTIVE!'
                };
            }
        }
        
        return null;
    }
    
    private isObjectiveExposed(): boolean {
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        const gridBubbles = this.getGridBubbles();
        
        // Check if any bubbles are very close to objective
        for (const bubble of gridBubbles) {
            const dist = Phaser.Math.Distance.Between(bubble.x, bubble.y, centerX, centerY);
            if (dist < BUBBLE_CONFIG.SIZE * 1.5) {
                return false; // Objective is protected
            }
        }
        
        return true; // Objective is exposed
    }
    
    private onShootingComplete = (): void => {
        // AI doesn't need to do anything special here
        // The cooldown is already handled in performShot
    }
    
    public destroy(): void {
        this.stop();
        // Queue is now integrated into launcher - no separate cleanup needed
        this.scene.events.off('shooting-complete', this.onShootingComplete);
    }
}