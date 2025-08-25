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
    potentialFalls?: number; // Number of bubbles that would fall
    totalValue?: number; // Total value including falls
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
                                    score: baseScore,
                                    reasoning: `match ${this.getColorName(color)}${nearObjective ? ' (clearing path to objective!)' : ''}`,
                                    potentialFalls: potentialFalls,
                                    totalValue: baseScore + fallBonus
                                });
                            }
                        }
                    }
                }
                
                // Sort all targets by total value (prioritizing falls)
                allTargets.sort((a, b) => (b.totalValue || b.score) - (a.totalValue || a.score));
                
                if (allTargets.length > 0) {
                    bestTarget = allTargets[0];
                    
                    // Log strategic value
                    if (bestTarget.potentialFalls && bestTarget.potentialFalls > 0) {
                        console.log(`  🎆 STRATEGIC SHOT: ${bestTarget.reasoning} + ${bestTarget.potentialFalls} falling bubbles!`);
                        console.log(`  💰 Total value: ${bestTarget.totalValue} (base: ${bestTarget.score})`);
                    } else {
                        console.log(`  🎯 Direct match: ${bestTarget.reasoning} at ${bestTarget.angle.toFixed(1)}°`);
                    }
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
    
    private countPotentialMatch(targetBubble: Bubble, shootColor: BubbleColor): number {
        // Count how many bubbles would be in the match group
        const neighbors = this.getNeighborBubbles(targetBubble);
        const sameColorNeighbors = neighbors.filter(n => n.getColor() === shootColor);
        
        if (targetBubble.getColor() === shootColor) {
            return 1 + sameColorNeighbors.length; // Target + neighbors
        } else if (sameColorNeighbors.length >= 2) {
            return 1 + sameColorNeighbors.length; // New bubble + neighbors
        }
        
        return 0;
    }
    
    private predictFallsFromShot(targetBubble: Bubble, shootColor: BubbleColor): number {
        // Get bubbles that would form a match with the target
        const neighbors = this.getNeighborBubbles(targetBubble);
        const sameColorNeighbors = neighbors.filter(n => n.getColor() === shootColor);
        
        // Check if target itself is same color (would form group)
        const targetSameColor = targetBubble.getColor() === shootColor;
        
        // Build the group that would be removed
        let wouldRemove: Bubble[] = [];
        
        if (targetSameColor && sameColorNeighbors.length >= 1) {
            // Target + neighbors would form match-3+
            wouldRemove = [targetBubble, ...sameColorNeighbors];
        } else if (sameColorNeighbors.length >= 2) {
            // New bubble + 2+ neighbors would form match-3+
            wouldRemove = sameColorNeighbors;
        }
        
        if (wouldRemove.length >= 2) {
            return this.predictFallingBubbles(wouldRemove);
        }
        
        return 0;
    }
    
    private predictFallingBubbles(bubblesRemoved: Bubble[]): number {
        // This is a simplified prediction - checks which bubbles would lose support
        const gridBubbles = this.getGridBubbles();
        const remaining = gridBubbles.filter(b => !bubblesRemoved.includes(b));
        
        // Mark all bubbles as unvisited
        const visited = new Set<Bubble>();
        const connected = new Set<Bubble>();
        
        // Find bubbles connected to the center (objective)
        const centerY = this.scene.cameras.main.centerY;
        const objectiveBubbles = remaining.filter(b => 
            Math.abs(b.y - centerY) < BUBBLE_CONFIG.SIZE * 2
        );
        
        // BFS from objective bubbles to find all connected
        const queue = [...objectiveBubbles];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            
            visited.add(current);
            connected.add(current);
            
            // Find neighbors of current that are in remaining
            const neighbors = this.getNeighborBubbles(current);
            for (const neighbor of neighbors) {
                if (remaining.includes(neighbor) && !visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }
        
        // Count disconnected bubbles (would fall)
        let fallingCount = 0;
        for (const bubble of remaining) {
            if (!connected.has(bubble)) {
                fallingCount++;
            }
        }
        
        return fallingCount;
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
    
    private checkObjectiveShot(): IShootTarget | null {
        // Get objective position (center of screen)
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        // Check if there are any bubbles protecting the objective
        const protectingBubbles = this.getGridBubbles().filter(b => {
            const dist = Phaser.Math.Distance.Between(b.x, b.y, centerX, centerY);
            return dist < BUBBLE_CONFIG.SIZE * 2; // Bubbles very close to center
        });
        
        // If objective is protected, we can't hit it directly
        if (protectingBubbles.length > 0) {
            console.log(`  ⛔ Objective is shielded by ${protectingBubbles.length} bubbles`);
            return null;
        }
        
        // Calculate angle to objective
        const angle = this.calculateAngleToTarget(centerX, centerY);
        
        // Check if angle is valid
        if (angle < 15 || angle > 165) {
            console.log(`  ❌ Cannot reach objective - angle ${angle.toFixed(1)}° out of range`);
            return null;
        }
        
        // Check if path is clear
        if (!this.isTrajectoryClear(angle, { x: centerX, y: centerY })) {
            console.log(`  🚫 Path to objective blocked`);
            return null;
        }
        
        // We have a clear shot to the objective!
        return {
            angle: angle,
            useWallBounce: 'none',
            score: 10000, // Maximum priority!
            reasoning: 'DIRECT HIT ON OBJECTIVE - WINNING SHOT!',
            potentialFalls: 0,
            totalValue: 10000
        };
    }
    
    private isObjectiveExposed(): boolean {
        // Check if objective has any protecting bubbles
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        const nearbyBubbles = this.getGridBubbles().filter(b => {
            const dist = Phaser.Math.Distance.Between(b.x, b.y, centerX, centerY);
            return dist < BUBBLE_CONFIG.SIZE * 3; // Check wider area
        });
        
        return nearbyBubbles.length === 0;
    }
    
    public destroy(): void {
        this.stop();
        this.scene.events.off('shooting-complete', this.onShootingComplete);
        this.bubbleQueue?.destroy();
    }
}