import { Scene } from 'phaser';
import { ShootingSystem } from './ShootingSystem';
import { BubbleGrid } from './BubbleGrid';
import { Launcher } from '@/gameObjects/Launcher';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleColor, IHexPosition } from '@/types/ArenaTypes';

export enum AIDifficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD'
}

interface IAIConfig {
    difficulty: AIDifficulty;
    decisionDelay: number;
}

interface ITargetOption {
    position: { x: number; y: number };
    hexPosition?: IHexPosition;
    score: number;
    color: BubbleColor;
    reasoning: string;
    matchCount?: number;
}

export class AIOpponentSystem {
    private scene: Scene;
    private shootingSystem?: ShootingSystem;
    private bubbleGrid: BubbleGrid;
    private launcher: Launcher;
    private config: IAIConfig;
    private isThinking: boolean = false;
    private thinkingIndicator?: Phaser.GameObjects.Text;
    private shootTimer?: Phaser.Time.TimerEvent;
    private isActive: boolean = false;
    
    constructor(
        scene: Scene,
        bubbleGrid: BubbleGrid,
        launcher: Launcher,
        difficulty: AIDifficulty = AIDifficulty.EASY
    ) {
        this.scene = scene;
        this.bubbleGrid = bubbleGrid;
        this.launcher = launcher;
        
        // Set config based on difficulty
        this.config = this.getDifficultyConfig(difficulty);
        
        this.createThinkingIndicator();
    }
    
    private getDifficultyConfig(difficulty: AIDifficulty): IAIConfig {
        switch (difficulty) {
            case AIDifficulty.EASY:
                return {
                    difficulty: AIDifficulty.EASY,
                    decisionDelay: 3000 // 3 seconds
                };
            case AIDifficulty.MEDIUM:
                return {
                    difficulty: AIDifficulty.MEDIUM,
                    decisionDelay: 2000 // 2 seconds
                };
            case AIDifficulty.HARD:
                return {
                    difficulty: AIDifficulty.HARD,
                    decisionDelay: 1000 // 1 second
                };
        }
    }
    
    public start(): void {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('AI: Starting autonomous shooting with', this.config.difficulty, 'difficulty');
        
        // Start shooting loop
        this.scheduleNextShot();
    }
    
    public stop(): void {
        this.isActive = false;
        if (this.shootTimer) {
            this.shootTimer.destroy();
            this.shootTimer = undefined;
        }
        this.hideThinking();
    }
    
    private scheduleNextShot(): void {
        if (!this.isActive) return;
        
        // Schedule next shot based on difficulty
        const delay = this.config.decisionDelay + Phaser.Math.Between(500, 1500);
        
        this.shootTimer = this.scene.time.delayedCall(delay, () => {
            if (this.isActive) {
                this.handleShoot();
            }
        });
    }
    
    private createThinkingIndicator(): void {
        this.thinkingIndicator = this.scene.add.text(
            this.scene.cameras.main.centerX,
            100,
            'AI Thinking...',
            {
                fontSize: '16px',
                color: '#FFD700',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        );
        this.thinkingIndicator.setOrigin(0.5);
        this.thinkingIndicator.setVisible(false);
        this.thinkingIndicator.setDepth(1000);
    }
    
    public setShootingSystem(shootingSystem: ShootingSystem): void {
        this.shootingSystem = shootingSystem;
    }
    
    private async handleShoot(): Promise<void> {
        if (this.isThinking || !this.shootingSystem || !this.isActive) return;
        
        this.isThinking = true;
        this.showThinking();
        
        console.log(`AI: Preparing shot with ${this.config.difficulty} difficulty`);
        
        // Brief thinking animation
        await this.delay(500);
        
        // Select target based on difficulty
        const target = this.selectTarget();
        
        if (target) {
            console.log(`AI: Selected target at (${target.position.x}, ${target.position.y}) - ${target.reasoning}`);
            this.shoot(target);
        } else {
            console.log('AI: No valid target found, shooting randomly');
            this.shootRandom();
        }
        
        this.hideThinking();
        this.isThinking = false;
        
        // Schedule next shot
        this.scheduleNextShot();
    }
    
    private selectTarget(): ITargetOption | null {
        const options: ITargetOption[] = [];
        
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                return this.selectEasyTarget();
            case AIDifficulty.MEDIUM:
                return this.selectMediumTarget();
            case AIDifficulty.HARD:
                return this.selectHardTarget();
            default:
                return this.selectEasyTarget();
        }
    }
    
    private selectEasyTarget(): ITargetOption | null {
        // Easy: 70% random, 30% try to match
        const random = Math.random();
        
        if (random < 0.7) {
            // Random shot
            return this.getRandomTarget();
        } else {
            // Try to find a simple match
            const matches = this.analyzeGrid();
            if (matches.length > 0) {
                // Pick a random match opportunity
                return matches[Math.floor(Math.random() * matches.length)];
            }
            return this.getRandomTarget();
        }
    }
    
    private selectMediumTarget(): ITargetOption | null {
        // Medium: More strategic, looks for best matches
        const matches = this.analyzeGrid();
        
        if (matches.length > 0) {
            // Sort by score and pick top 3
            matches.sort((a, b) => b.score - a.score);
            const topMatches = matches.slice(0, 3);
            
            // Pick randomly from top matches with bias towards best
            const weights = [0.5, 0.3, 0.2];
            const random = Math.random();
            let accumulator = 0;
            
            for (let i = 0; i < topMatches.length; i++) {
                accumulator += weights[i];
                if (random < accumulator) {
                    return topMatches[i];
                }
            }
        }
        
        return this.getRandomTarget();
    }
    
    private selectHardTarget(): ITargetOption | null {
        // Hard: Always picks the best possible shot
        const matches = this.analyzeGrid();
        
        if (matches.length > 0) {
            // Always pick the best scoring option
            matches.sort((a, b) => b.score - a.score);
            return matches[0];
        }
        
        // If no good matches, try to set up future matches
        return this.findSetupShot() || this.getRandomTarget();
    }
    
    private getRandomTarget(): ITargetOption {
        // Get a random position in the lower half of the screen (opponent shoots down)
        const centerX = this.scene.cameras.main.centerX;
        const targetY = this.scene.cameras.main.centerY + Phaser.Math.Between(50, 150);
        const offsetX = Phaser.Math.Between(-100, 100);
        
        return {
            position: { 
                x: centerX + offsetX, 
                y: targetY 
            },
            score: 0,
            color: Bubble.getRandomColor(),
            reasoning: 'Random shot'
        };
    }
    
    private analyzeGrid(): ITargetOption[] {
        const options: ITargetOption[] = [];
        const gridBubbles = this.getGridBubbles();
        
        if (gridBubbles.length === 0) {
            return options;
        }
        
        // Group bubbles by color
        const colorGroups = new Map<BubbleColor, Bubble[]>();
        gridBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color) {
                if (!colorGroups.has(color)) {
                    colorGroups.set(color, []);
                }
                colorGroups.get(color)!.push(bubble);
            }
        });
        
        // For each color group, find potential match positions
        colorGroups.forEach((bubbles, color) => {
            if (bubbles.length >= 2) {
                // Find pairs and potential third positions
                for (let i = 0; i < bubbles.length - 1; i++) {
                    for (let j = i + 1; j < bubbles.length; j++) {
                        const bubble1 = bubbles[i];
                        const bubble2 = bubbles[j];
                        
                        // Check if bubbles are neighbors
                        const pos1 = bubble1.getGridPosition();
                        const pos2 = bubble2.getGridPosition();
                        
                        if (pos1 && pos2) {
                            const distance = Math.abs(pos1.q - pos2.q) + Math.abs(pos1.r - pos2.r);
                            
                            if (distance <= 2) {
                                // Find common neighbors for match completion
                                const neighbors1 = this.bubbleGrid.getNeighbors(pos1);
                                const neighbors2 = this.bubbleGrid.getNeighbors(pos2);
                                
                                const commonNeighbors = neighbors1.filter(n1 => 
                                    neighbors2.some(n2 => n1.q === n2.q && n1.r === n2.r)
                                );
                                
                                commonNeighbors.forEach(targetHex => {
                                    if (!this.isPositionOccupied(targetHex)) {
                                        const pixelPos = this.bubbleGrid.hexToPixel(targetHex);
                                        const score = this.calculateShotScore(targetHex, color, bubbles.length);
                                        
                                        options.push({
                                            position: pixelPos,
                                            hexPosition: targetHex,
                                            score: score,
                                            color: color,
                                            reasoning: `Match ${bubbles.length} ${this.getColorName(color)} bubbles`,
                                            matchCount: bubbles.length
                                        });
                                    }
                                });
                            }
                        }
                    }
                }
            }
        });
        
        return options;
    }
    
    private calculateShotScore(targetHex: IHexPosition, color: BubbleColor, groupSize: number): number {
        let score = groupSize * 10; // Base score from group size
        
        // Bonus for positions closer to objective
        const distance = Math.abs(targetHex.q) + Math.abs(targetHex.r);
        score += Math.max(0, 20 - distance * 2);
        
        // Bonus for creating larger groups
        if (groupSize >= 4) score += 15;
        if (groupSize >= 6) score += 25;
        
        return score;
    }
    
    private findSetupShot(): ITargetOption | null {
        // Try to position bubbles for future matches
        const gridBubbles = this.getGridBubbles();
        if (gridBubbles.length === 0) return null;
        
        // Find the most common color
        const colorCounts = new Map<BubbleColor, number>();
        gridBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color) {
                colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
            }
        });
        
        let mostCommonColor: BubbleColor | null = null;
        let maxCount = 0;
        colorCounts.forEach((count, color) => {
            if (count > maxCount) {
                maxCount = count;
                mostCommonColor = color;
            }
        });
        
        if (mostCommonColor) {
            // Find a good position near existing bubbles of this color
            const sameBubbles = gridBubbles.filter(b => b.getColor() === mostCommonColor);
            if (sameBubbles.length > 0) {
                const randomBubble = sameBubbles[Math.floor(Math.random() * sameBubbles.length)];
                const pos = randomBubble.getGridPosition();
                
                if (pos) {
                    const neighbors = this.bubbleGrid.getNeighbors(pos);
                    for (const neighbor of neighbors) {
                        if (!this.isPositionOccupied(neighbor)) {
                            const pixelPos = this.bubbleGrid.hexToPixel(neighbor);
                            return {
                                position: pixelPos,
                                hexPosition: neighbor,
                                score: 10,
                                color: mostCommonColor,
                                reasoning: 'Setting up future match'
                            };
                        }
                    }
                }
            }
        }
        
        return null;
    }
    
    private getGridBubbles(): Bubble[] {
        // Get bubbles from the game scene
        const gameScene = this.scene as any;
        if (gameScene.arenaSystem) {
            return gameScene.arenaSystem.getBubbles();
        }
        return [];
    }
    
    private isPositionOccupied(hexPos: IHexPosition): boolean {
        const bubbles = this.getGridBubbles();
        return bubbles.some(bubble => {
            const pos = bubble.getGridPosition();
            return pos && pos.q === hexPos.q && pos.r === hexPos.r;
        });
    }
    
    private getColorName(color: BubbleColor): string {
        const colorNames: { [key: number]: string } = {
            0xFF6B6B: 'red',
            0x4ECDC4: 'cyan',
            0xFFD93D: 'yellow',
            0x95E77E: 'green',
            0xA8E6CF: 'mint',
            0xDDA0DD: 'purple'
        };
        return colorNames[color] || 'unknown';
    }
    
    private shoot(target: ITargetOption): void {
        if (!this.shootingSystem) return;
        
        // Calculate trajectory considering wall bounces if needed
        const trajectory = this.calculateTrajectory(target.position);
        
        // Use the initial angle from trajectory
        const degrees = trajectory.angle;
        
        // Add small random variation based on difficulty
        let angleVariation = 0;
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                angleVariation = Phaser.Math.Between(-10, 10); // ±10 degrees
                break;
            case AIDifficulty.MEDIUM:
                angleVariation = Phaser.Math.Between(-5, 5); // ±5 degrees
                break;
            case AIDifficulty.HARD:
                angleVariation = Phaser.Math.Between(-2, 2); // ±2 degrees
                break;
        }
        
        const finalAngle = degrees + angleVariation;
        
        // Set launcher aim
        this.launcher.setAimAngle(finalAngle);
        
        // Load bubble with selected color
        this.launcher.loadBubble(target.color);
        
        // Visual feedback - show aim line briefly
        if (this.config.difficulty === AIDifficulty.HARD) {
            this.showAimLine(finalAngle);
        }
        
        // Shoot using the shooting system
        this.scene.events.emit('ai-shoot', {
            angle: finalAngle,
            color: target.color,
            launcher: this.launcher
        });
        
        // Play launcher animation
        this.launcher.animateShoot();
    }
    
    private calculateTrajectory(target: { x: number; y: number }): { angle: number; bounces: number } {
        // Direct shot angle
        const directAngle = Phaser.Math.Angle.Between(
            this.launcher.x,
            this.launcher.y,
            target.x,
            target.y
        );
        
        const directDegrees = Phaser.Math.RadToDeg(directAngle) + 90;
        
        // Check if direct shot is within launcher constraints (shooting downward)
        // AI shoots down, so angle should be between 60 and 120 degrees approximately
        if (directDegrees >= 45 && directDegrees <= 135) {
            return { angle: directDegrees, bounces: 0 };
        }
        
        // Calculate wall bounce shot if direct shot is not possible
        const screenWidth = this.scene.cameras.main.width;
        
        // Try left wall bounce
        const leftBounceX = 0;
        const leftBounceAngle = Phaser.Math.Angle.Between(
            this.launcher.x,
            this.launcher.y,
            leftBounceX,
            target.y - 100 // Aim higher for bounce
        );
        
        // Try right wall bounce
        const rightBounceX = screenWidth;
        const rightBounceAngle = Phaser.Math.Angle.Between(
            this.launcher.x,
            this.launcher.y,
            rightBounceX,
            target.y - 100
        );
        
        // Choose the better bounce angle
        const leftDegrees = Phaser.Math.RadToDeg(leftBounceAngle) + 90;
        const rightDegrees = Phaser.Math.RadToDeg(rightBounceAngle) + 90;
        
        if (Math.abs(leftDegrees - 90) < Math.abs(rightDegrees - 90)) {
            return { angle: leftDegrees, bounces: 1 };
        } else {
            return { angle: rightDegrees, bounces: 1 };
        }
    }
    
    private showAimLine(angle: number): void {
        // Create temporary aim line for visual feedback
        const graphics = this.scene.add.graphics();
        graphics.lineStyle(2, 0xFF0000, 0.5);
        
        const radians = Phaser.Math.DegToRad(angle - 90);
        const distance = 200;
        const endX = this.launcher.x + Math.cos(radians) * distance;
        const endY = this.launcher.y + Math.sin(radians) * distance;
        
        graphics.lineBetween(this.launcher.x, this.launcher.y, endX, endY);
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 500,
            onComplete: () => graphics.destroy()
        });
    }
    
    private shootRandom(): void {
        const target = this.getRandomTarget();
        this.shoot(target);
    }
    
    private showThinking(): void {
        if (this.thinkingIndicator) {
            this.thinkingIndicator.setVisible(true);
            
            // Add pulsing animation
            this.scene.tweens.add({
                targets: this.thinkingIndicator,
                alpha: 0.5,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }
    
    private hideThinking(): void {
        if (this.thinkingIndicator) {
            this.scene.tweens.killTweensOf(this.thinkingIndicator);
            this.thinkingIndicator.setVisible(false);
            this.thinkingIndicator.setAlpha(1);
        }
    }
    
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.scene.time.delayedCall(ms, resolve);
        });
    }
    
    public setDifficulty(difficulty: AIDifficulty): void {
        this.config = this.getDifficultyConfig(difficulty);
        console.log(`AI: Difficulty set to ${difficulty}`);
    }
    
    public destroy(): void {
        this.stop();
        if (this.thinkingIndicator) {
            this.thinkingIndicator.destroy();
        }
    }
}