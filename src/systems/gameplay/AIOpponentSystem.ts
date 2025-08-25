import Phaser from 'phaser';
import { Launcher } from '@/gameObjects/Launcher';
import { BubbleQueue } from './BubbleQueue';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, ARENA_CONFIG } from '@/config/ArenaConfig';

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
}

export class AIOpponentSystem {
    private scene: Phaser.Scene;
    private launcher: Launcher;
    private bubbleQueue: BubbleQueue;
    private isActive: boolean = false;
    private shootTimer?: Phaser.Time.TimerEvent;
    private difficulty: AIDifficulty = AIDifficulty.HARD;
    private isOnCooldown: boolean = false;
    private readonly COOLDOWN_TIME: number = 1000; // Same as player - 1 second
    private readonly SHOOT_SPEED: number = 600; // Same as player
    
    constructor(scene: Phaser.Scene, launcher: Launcher) {
        this.scene = scene;
        this.launcher = launcher;
        
        // Create bubble queue at opponent position
        this.bubbleQueue = new BubbleQueue(scene, launcher.x, launcher.y + 30);
        
        // Listen for shooting complete to know when we can shoot again
        this.scene.events.on('shooting-complete', this.onShootingComplete, this);
    }
    
    public setDifficulty(difficulty: AIDifficulty): void {
        this.difficulty = difficulty;
    }
    
    public start(): void {
        this.isActive = true;
        console.log('AI: Starting with difficulty', this.difficulty);
        // Start thinking about first shot
        this.scheduleNextShot();
    }
    
    public stop(): void {
        this.isActive = false;
        if (this.shootTimer) {
            this.shootTimer.destroy();
            this.shootTimer = undefined;
        }
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
        if (this.isOnCooldown) return;
        
        // Get next bubble from queue
        const nextBubble = this.bubbleQueue.getNextBubble();
        if (!nextBubble) return;
        
        const color = nextBubble.getColor();
        nextBubble.destroy();
        
        // Find best shot based on difficulty
        const target = this.calculateBestShot(color);
        
        console.log(`🎯 AI shooting: ${this.getColorName(color)} at ${target.angle.toFixed(1)}° (${target.reasoning}) score=${target.score}`);
        
        // Update launcher aim
        this.launcher.setAimAngle(target.angle);
        
        // Emit shoot event
        this.scene.events.emit('ai-shoot', {
            angle: target.angle,
            color: color
        });
        
        // Start cooldown (same as player!)
        this.isOnCooldown = true;
        this.scene.time.delayedCall(this.COOLDOWN_TIME, () => {
            this.isOnCooldown = false;
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
            // HARD: Find reachable same-color bubbles
            if (sameColorBubbles.length > 0) {
                // Sort by distance (prefer closer targets)
                const sortedBubbles = sameColorBubbles.sort((a, b) => {
                    const distA = Phaser.Math.Distance.Between(this.launcher.x, this.launcher.y, a.x, a.y);
                    const distB = Phaser.Math.Distance.Between(this.launcher.x, this.launcher.y, b.x, b.y);
                    return distA - distB;
                });
                
                // Try to find a clear shot to any same-color bubble
                for (const targetBubble of sortedBubbles) {
                    // Try different attachment points around the bubble
                    const angles = [
                        this.calculateAngleToTarget(targetBubble.x, targetBubble.y - BUBBLE_CONFIG.SIZE),
                        this.calculateAngleToTarget(targetBubble.x - BUBBLE_CONFIG.SIZE * 0.5, targetBubble.y),
                        this.calculateAngleToTarget(targetBubble.x + BUBBLE_CONFIG.SIZE * 0.5, targetBubble.y),
                        this.calculateAngleToTarget(targetBubble.x, targetBubble.y)
                    ];
                    
                    for (const angle of angles) {
                        if (angle >= 15 && angle <= 165) {
                            // Check if trajectory is clear
                            const targetPos = { x: targetBubble.x, y: targetBubble.y };
                            if (this.isTrajectoryClear(angle, targetPos)) {
                                bestTarget = {
                                    angle: angle,
                                    useWallBounce: 'none',
                                    score: 150,
                                    reasoning: `clear shot to ${this.getColorName(color)}`
                                };
                                console.log(`  ✅ Found clear path at ${angle.toFixed(1)}°`);
                                break;
                            }
                        }
                    }
                    
                    if (bestTarget) break;
                }
                
                // If no clear direct shot, try wall bounces
                if (!bestTarget) {
                    console.log(`  ⚠️ No clear direct shots, trying wall bounces...`);
                    bestTarget = this.findBestWallBounce(color, sameColorBubbles);
                }
            }
            
            // If still no good shot, place strategically in empty area
            if (!bestTarget) {
                console.log(`  📍 No matches possible, finding empty area...`);
                bestTarget = this.findBestEmptyArea(color);
            }
            
            return bestTarget;
            
        } else if (this.difficulty === AIDifficulty.MEDIUM) {
            // MEDIUM: Sometimes smart, sometimes random
            if (Math.random() < 0.6 && sameColorBubbles.length > 0) {
                // 60% chance to aim at same color
                const target = sameColorBubbles[Math.floor(Math.random() * sameColorBubbles.length)];
                const angle = this.calculateAngleToTarget(target.x, target.y);
                bestTarget = {
                    angle: angle + (Math.random() - 0.5) * 15, // Add some inaccuracy
                    useWallBounce: 'none',
                    score: 50,
                    reasoning: 'aiming at same color'
                };
            } else {
                // Random strategic angle
                bestTarget = this.getRandomStrategicAngle();
            }
            return bestTarget;
            
        } else {
            // EASY: Mostly random
            bestTarget = this.getRandomStrategicAngle();
            return bestTarget;
        }
        
        // Ensure we have a valid target
        if (!bestTarget) {
            bestTarget = this.getRandomStrategicAngle();
        }
        
        // Ensure angle is within valid range (15-165°)
        bestTarget.angle = Math.max(15, Math.min(165, bestTarget.angle));
        
        return bestTarget;
    }
    
    private findDirectMatchTargets(color: BubbleColor, sameColorBubbles: Bubble[]): IShootTarget[] {
        const targets: IShootTarget[] = [];
        
        // Look for groups of 2+ same color bubbles we can complete
        for (const bubble of sameColorBubbles) {
            // Check if this bubble has same-color neighbors
            const neighbors = this.getNeighborBubbles(bubble);
            const sameColorNeighbors = neighbors.filter(n => n.getColor() === color);
            
            if (sameColorNeighbors.length >= 1) {
                // This could make a match-3!
                // Find best attachment point
                const attachPoints = this.getEmptyNeighborPositions(bubble);
                
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
        }
        
        // Sort by score (best first)
        return targets.sort((a, b) => b.score - a.score);
    }
    
    private findWallBounceTargets(color: BubbleColor, sameColorBubbles: Bubble[]): IShootTarget[] {
        const targets: IShootTarget[] = [];
        const screenWidth = this.scene.cameras.main.width;
        
        for (const bubble of sameColorBubbles) {
            // Calculate if we can reach this bubble with a wall bounce
            
            // Left wall bounce
            const mirrorX = -bubble.x; // Mirror position across left wall
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
    
    private findBestEmptyArea(color: BubbleColor): IShootTarget {
        // Find the area with least bubbles to avoid accumulation
        const screenWidth = this.scene.cameras.main.width;
        const gridBubbles = this.getGridBubbles();
        
        // Divide screen into sectors and count bubbles
        const sectors = [
            { angle: 30, x: screenWidth * 0.75, y: 350, name: 'far-right' },
            { angle: 60, x: screenWidth * 0.6, y: 320, name: 'right' },
            { angle: 90, x: screenWidth * 0.5, y: 300, name: 'center' },
            { angle: 120, x: screenWidth * 0.4, y: 320, name: 'left' },
            { angle: 150, x: screenWidth * 0.25, y: 350, name: 'far-left' }
        ];
        
        let bestSector = sectors[0];
        let minBubbles = Infinity;
        
        for (const sector of sectors) {
            // Count bubbles in this sector
            let count = 0;
            for (const bubble of gridBubbles) {
                const dist = Phaser.Math.Distance.Between(sector.x, sector.y, bubble.x, bubble.y);
                if (dist < 100) count++;
            }
            
            // Prefer sectors with fewer bubbles (but avoid center)
            if (count < minBubbles && sector.name !== 'center') {
                minBubbles = count;
                bestSector = sector;
            }
        }
        
        // Verify path is clear
        if (!this.isTrajectoryClear(bestSector.angle, { x: bestSector.x, y: bestSector.y })) {
            // If best path is blocked, try alternating sides
            for (const sector of sectors) {
                if (sector.name !== 'center' && this.isTrajectoryClear(sector.angle, { x: sector.x, y: sector.y })) {
                    bestSector = sector;
                    break;
                }
            }
        }
        
        return {
            angle: bestSector.angle,
            useWallBounce: 'none',
            score: 30,
            reasoning: `empty area ${bestSector.name}`
        };
    }
    
    private getRandomStrategicAngle(): IShootTarget {
        // Random but avoiding straight down (90°)
        const avoidCenter = Math.random() < 0.7; // 70% chance to avoid center
        
        let angle: number;
        if (avoidCenter) {
            if (Math.random() < 0.5) {
                angle = 30 + Math.random() * 40; // 30-70° (right side)
            } else {
                angle = 110 + Math.random() * 40; // 110-150° (left side)
            }
        } else {
            angle = 60 + Math.random() * 60; // 60-120° (can include center)
        }
        
        return {
            angle: angle,
            useWallBounce: 'none',
            score: 10,
            reasoning: 'random placement'
        };
    }
    
    private calculateAngleToTarget(targetX: number, targetY: number): number {
        const dx = targetX - this.launcher.x;
        const dy = targetY - this.launcher.y;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // Normalize to 0-360
        if (angle < 0) angle += 360;
        
        return angle;
    }
    
    private isTrajectoryClear(angle: number, target: { x: number; y: number }): boolean {
        // Raycast to check if path is clear
        const startX = this.launcher.x;
        const startY = this.launcher.y;
        const distance = Phaser.Math.Distance.Between(startX, startY, target.x, target.y);
        
        // Check points along the trajectory
        const steps = Math.ceil(distance / 20); // Check every 20 pixels
        const rad = angle * Math.PI / 180;
        const dx = Math.cos(rad);
        const dy = Math.sin(rad);
        
        for (let i = 1; i < steps; i++) {
            const checkX = startX + (dx * i * 20);
            const checkY = startY + (dy * i * 20);
            
            // Check if there's a bubble at this position
            if (this.isBubbleAtPosition(checkX, checkY)) {
                // Path is blocked!
                return false;
            }
        }
        
        return true;
    }
    
    private getNeighborBubbles(bubble: Bubble): Bubble[] {
        const neighbors: Bubble[] = [];
        const gridBubbles = this.getGridBubbles();
        const checkRadius = BUBBLE_CONFIG.SIZE * 1.2; // Slightly larger than bubble size
        
        for (const other of gridBubbles) {
            if (other === bubble) continue;
            
            const distance = Phaser.Math.Distance.Between(
                bubble.x, bubble.y,
                other.x, other.y
            );
            
            if (distance <= checkRadius) {
                neighbors.push(other);
            }
        }
        
        return neighbors;
    }
    
    private getEmptyNeighborPositions(bubble: Bubble): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        const angleStep = 60; // Hexagonal arrangement
        
        for (let angle = 0; angle < 360; angle += angleStep) {
            const rad = angle * Math.PI / 180;
            const x = bubble.x + Math.cos(rad) * BUBBLE_CONFIG.SIZE;
            const y = bubble.y + Math.sin(rad) * BUBBLE_CONFIG.SIZE;
            
            // Check if position is empty
            if (!this.isBubbleAtPosition(x, y)) {
                positions.push({ x, y });
            }
        }
        
        return positions;
    }
    
    private isBubbleAtPosition(x: number, y: number): boolean {
        const gridBubbles = this.getGridBubbles();
        const checkRadius = BUBBLE_CONFIG.SIZE * 0.5;
        
        for (const bubble of gridBubbles) {
            const distance = Phaser.Math.Distance.Between(x, y, bubble.x, bubble.y);
            if (distance < checkRadius) {
                return true;
            }
        }
        
        return false;
    }
    
    private getGridBubbles(): Bubble[] {
        const bubbles: Bubble[] = [];
        this.scene.children.list.forEach(child => {
            if (child instanceof Bubble && child.active && child.visible) {
                // Only consider bubbles in play area (not projectiles)
                // Check if bubble has a grid position (means it's attached to grid)
                if (child.y > 0 && child.y < 500 && child.getGridPosition()) {
                    bubbles.push(child);
                }
            }
        });
        return bubbles;
    }
    
    private countConnectedBubbles(position: { x: number; y: number }, color: BubbleColor, sameColorBubbles: Bubble[]): number {
        let count = 0;
        const checkRadius = BUBBLE_CONFIG.SIZE * 1.1;
        
        for (const bubble of sameColorBubbles) {
            const distance = Phaser.Math.Distance.Between(
                position.x, position.y,
                bubble.x, bubble.y
            );
            
            // If this bubble would be adjacent to the new position
            if (distance <= checkRadius) {
                count++;
            }
        }
        
        return count;
    }
    
    private onShootingComplete = (): void => {
        // Don't immediately schedule - wait for cooldown
        // Cooldown is handled in performShot
    }
    
    private getColorName(color: BubbleColor): string {
        const colorMap: Record<BubbleColor, string> = {
            [0xFF0000]: 'RED',
            [0x00FF00]: 'GREEN',
            [0x0000FF]: 'BLUE',
            [0xFFFF00]: 'YELLOW',
            [0xFF00FF]: 'MAGENTA',
            [0x00FFFF]: 'CYAN',
            [0xFFA500]: 'ORANGE',
            [0x800080]: 'PURPLE'
        };
        return colorMap[color] || 'UNKNOWN';
    }
    
    public destroy(): void {
        this.stop();
        this.scene.events.off('shooting-complete', this.onShootingComplete);
        this.bubbleQueue?.destroy();
    }
}