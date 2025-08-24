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
    private thinkingIndicator?: Phaser.GameObjects.Container;
    private thinkingText?: Phaser.GameObjects.Text;
    private thinkingDots?: Phaser.GameObjects.Text;
    private difficultyBadge?: Phaser.GameObjects.Container;
    private aimPreview?: Phaser.GameObjects.Graphics;
    private shootTimer?: Phaser.Time.TimerEvent;
    private isActive: boolean = false;
    private shotCount: number = 0; // Track shot count for variety
    
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
        this.createDifficultyBadge();
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
        
        // Show activation effect
        this.showActivationEffect();
        
        // Start shooting loop
        this.scheduleNextShot();
    }
    
    private showActivationEffect(): void {
        // Create activation announcement
        const announcement = this.scene.add.container(
            this.scene.cameras.main.centerX,
            150
        );
        
        // Background
        const bg = this.scene.add.rectangle(0, 0, 250, 40, 0x000000, 0.9);
        const borderColor = this.getDifficultyColor();
        bg.setStrokeStyle(3, borderColor);
        
        // Text
        const text = this.scene.add.text(0, 0, 
            `AI ${this.config.difficulty} ACTIVATED`, 
            {
                fontSize: '20px',
                color: '#FFFFFF',
                fontStyle: 'bold'
            }
        );
        text.setOrigin(0.5);
        
        announcement.add([bg, text]);
        announcement.setDepth(1002);
        announcement.setScale(0);
        
        // Animate in
        this.scene.tweens.add({
            targets: announcement,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Hold for a moment
                this.scene.time.delayedCall(1500, () => {
                    // Animate out
                    this.scene.tweens.add({
                        targets: announcement,
                        scale: 0,
                        alpha: 0,
                        duration: 300,
                        ease: 'Back.easeIn',
                        onComplete: () => announcement.destroy()
                    });
                });
            }
        });
        
        // Pulse the launcher
        this.scene.tweens.add({
            targets: this.launcher,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 200,
            yoyo: true,
            repeat: 2,
            ease: 'Power2'
        });
    }
    
    public stop(): void {
        this.isActive = false;
        if (this.shootTimer) {
            this.shootTimer.destroy();
            this.shootTimer = undefined;
        }
        this.hideThinking();
        
        // Clear any pending animations
        if (this.thinkingIndicator) {
            this.scene.tweens.killTweensOf(this.thinkingIndicator);
            this.thinkingIndicator.setVisible(false);
        }
    }
    
    private scheduleNextShot(): void {
        if (!this.isActive) return;
        
        // Schedule next shot based on difficulty with more variation
        const baseDelay = this.config.decisionDelay;
        const randomDelay = Math.floor(Math.random() * 1000) + 500; // 500-1500ms
        const delay = baseDelay + randomDelay;
        
        console.log(`AI: Next shot scheduled in ${delay}ms`);
        
        this.shootTimer = this.scene.time.delayedCall(delay, () => {
            if (this.isActive) {
                this.handleShoot();
            }
        });
    }
    
    private createThinkingIndicator(): void {
        const centerX = this.scene.cameras.main.centerX;
        
        // Create container for thinking indicator
        this.thinkingIndicator = this.scene.add.container(centerX, 100);
        
        // Background panel
        const bg = this.scene.add.rectangle(0, 0, 150, 30, 0x000000, 0.8);
        bg.setStrokeStyle(2, 0xFFD700);
        
        // Icon (brain emoji or thinking icon)
        const icon = this.scene.add.text(-60, 0, '🤔', {
            fontSize: '20px'
        });
        icon.setOrigin(0.5);
        
        // Text
        this.thinkingText = this.scene.add.text(-20, 0, 'AI Thinking', {
            fontSize: '14px',
            color: '#FFD700'
        });
        this.thinkingText.setOrigin(0, 0.5);
        
        // Animated dots
        this.thinkingDots = this.scene.add.text(50, 0, '', {
            fontSize: '14px',
            color: '#FFD700'
        });
        this.thinkingDots.setOrigin(0, 0.5);
        
        this.thinkingIndicator.add([bg, icon, this.thinkingText, this.thinkingDots]);
        this.thinkingIndicator.setVisible(false);
        this.thinkingIndicator.setDepth(1000);
    }
    
    private createDifficultyBadge(): void {
        // Create difficulty indicator badge
        this.difficultyBadge = this.scene.add.container(
            this.launcher.x,
            this.launcher.y + 40
        );
        
        // Badge background
        const bgColor = this.getDifficultyColor();
        const bg = this.scene.add.rectangle(0, 0, 80, 20, bgColor, 0.9);
        bg.setStrokeStyle(1, 0xFFFFFF);
        
        // Difficulty text
        const text = this.scene.add.text(0, 0, this.config.difficulty, {
            fontSize: '12px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        
        this.difficultyBadge.add([bg, text]);
        this.difficultyBadge.setDepth(999);
        
        // Pulse animation
        this.scene.tweens.add({
            targets: this.difficultyBadge,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private getDifficultyColor(): number {
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                return 0x4CAF50; // Green
            case AIDifficulty.MEDIUM:
                return 0xFFC107; // Amber
            case AIDifficulty.HARD:
                return 0xF44336; // Red
        }
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
        
        // Select target based on difficulty - ensure fresh selection each time
        const target = this.selectTarget();
        
        if (target) {
            console.log(`AI: Selected target at (${target.position.x.toFixed(0)}, ${target.position.y.toFixed(0)}) - ${target.reasoning}`);
            this.shoot(target);
        } else {
            console.log('AI: No valid target found, shooting randomly');
            // Force a completely new random shot
            const randomTarget = this.getRandomTarget();
            this.shoot(randomTarget);
        }
        
        this.hideThinking();
        this.isThinking = false;
        
        // Schedule next shot
        this.scheduleNextShot();
    }
    
    private selectTarget(): ITargetOption | null {
        // Force fresh selection each time
        let result: ITargetOption | null = null;
        
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                result = this.selectEasyTarget();
                break;
            case AIDifficulty.MEDIUM:
                result = this.selectMediumTarget();
                break;
            case AIDifficulty.HARD:
                result = this.selectHardTarget();
                break;
            default:
                result = this.selectEasyTarget();
                break;
        }
        
        // Ensure we always return a target
        if (!result) {
            console.log('AI: No target selected, forcing random');
            result = this.getRandomTarget();
        }
        
        return result;
    }
    
    private selectEasyTarget(): ITargetOption | null {
        // Easy: 70% random, 30% try to match
        const random = Math.random();
        console.log(`AI Easy: Random roll = ${random.toFixed(2)} (< 0.7 = random shot)`);
        
        if (random < 0.7) {
            // Random shot - ensure we get a fresh random target
            const target = this.getRandomTarget();
            console.log(`AI Easy: Using random shot`);
            return target;
        } else {
            // Try to find a simple match
            const matches = this.analyzeGrid();
            console.log(`AI Easy: Found ${matches.length} match opportunities`);
            
            if (matches.length > 0) {
                // Pick a random match opportunity
                const matchIndex = Math.floor(Math.random() * matches.length);
                console.log(`AI Easy: Picking match option ${matchIndex}`);
                return matches[matchIndex];
            }
            
            console.log(`AI Easy: No matches found, falling back to random`);
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
        // Increment shot counter for variety
        this.shotCount++;
        
        const screenWidth = this.scene.cameras.main.width;
        const centerY = this.scene.cameras.main.centerY;
        
        // Force different X positions using shot count
        // Cycle through left, center, right
        const positions = [
            screenWidth * 0.2,  // Left
            screenWidth * 0.5,  // Center
            screenWidth * 0.8,  // Right
            screenWidth * 0.35, // Left-center
            screenWidth * 0.65  // Right-center
        ];
        
        // Use shot count to pick position
        const posIndex = this.shotCount % positions.length;
        const baseX = positions[posIndex];
        
        // Add some random variation
        const targetX = baseX + (Math.random() - 0.5) * 60;
        
        // Y position with variation
        const targetY = centerY + 50 + (Math.random() * 150);
        
        // Colors that definitely exist in the game
        const colors = [
            0xFF6B6B, // Red
            0x4ECDC4, // Cyan  
            0xFFD93D, // Yellow
            0x95E77E, // Green
            0xA8E6CF, // Light green
            0xDDA0DD  // Purple
        ];
        
        // Cycle through colors
        const colorIndex = this.shotCount % colors.length;
        const randomColor = colors[colorIndex];
        
        console.log(`🎲 Shot #${this.shotCount}: pos=${posIndex} x=${targetX.toFixed(0)} y=${targetY.toFixed(0)} color=${colorIndex}`);
        
        return {
            position: { 
                x: targetX, 
                y: targetY 
            },
            score: 0,
            color: randomColor,
            reasoning: `Random shot #${this.shotCount}`
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
        
        // Show target marker for debugging
        this.showTargetMarker(target.position);
        
        // SIMPLIFIED: Just calculate direct angle to target
        const angleRad = Math.atan2(
            target.position.y - this.launcher.y,
            target.position.x - this.launcher.x
        );
        
        // Convert to degrees (0° = right, 90° = down)
        let degrees = angleRad * (180 / Math.PI);
        
        // Add 90 because launcher expects 90° = down
        degrees = degrees + 90;
        
        // Normalize to 0-360
        while (degrees < 0) degrees += 360;
        while (degrees >= 360) degrees -= 360;
        
        // Add variation based on difficulty
        let angleVariation = 0;
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                angleVariation = (Math.random() - 0.5) * 20; // ±10 degrees
                break;
            case AIDifficulty.MEDIUM:
                angleVariation = (Math.random() - 0.5) * 10; // ±5 degrees
                break;
            case AIDifficulty.HARD:
                angleVariation = (Math.random() - 0.5) * 4; // ±2 degrees
                break;
        }
        
        const finalAngle = degrees + angleVariation;
        
        console.log(`🎯 AI Shooting: target=(${target.position.x.toFixed(0)},${target.position.y.toFixed(0)}) angle=${finalAngle.toFixed(1)}° color=0x${target.color.toString(16)}`);
        
        // Set launcher aim
        this.launcher.setAimAngle(finalAngle);
        
        // Load bubble with selected color
        this.launcher.loadBubble(target.color);
        
        // Visual feedback - show aim line based on difficulty
        this.showAimLine(finalAngle, false);
        
        // Shoot using the shooting system
        this.scene.events.emit('ai-shoot', {
            angle: finalAngle,
            color: target.color,
            launcher: this.launcher
        });
        
        // Play launcher animation
        this.launcher.animateShoot();
        
        // Add visual effects based on difficulty
        this.addShootEffects(target);
    }
    
    private calculateTrajectory(target: { x: number; y: number }): { angle: number; bounces: number } {
        // Direct shot angle - AI shoots from top, so needs to aim downward
        const directAngle = Phaser.Math.Angle.Between(
            this.launcher.x,
            this.launcher.y,
            target.x,
            target.y
        );
        
        // Convert to degrees (0 = right, 90 = down, 180 = left, 270 = up)
        let directDegrees = Phaser.Math.RadToDeg(directAngle) + 90;
        
        // Normalize angle to 0-360 range
        while (directDegrees < 0) directDegrees += 360;
        while (directDegrees >= 360) directDegrees -= 360;
        
        // For opponent shooting downward, valid angles are roughly 30-150 degrees
        // This allows shooting diagonally left and right
        const minAngle = 30;
        const maxAngle = 150;
        
        // Check if we need to use wall bounce
        let needsBounce = false;
        let finalAngle = directDegrees;
        
        // If target is too far to the sides, calculate bounce
        const screenWidth = this.scene.cameras.main.width;
        const xDiff = Math.abs(target.x - this.launcher.x);
        const yDiff = target.y - this.launcher.y;
        
        // Only bounce if target is significantly to the side and we can't reach it directly
        if (xDiff > screenWidth * 0.4 && yDiff < 100) {
            needsBounce = true;
            
            // Determine which wall to bounce off
            if (target.x < this.launcher.x) {
                // Bounce off left wall
                finalAngle = 180 - directDegrees; // Aim left
                finalAngle = Math.max(minAngle, Math.min(maxAngle, finalAngle));
            } else {
                // Bounce off right wall
                finalAngle = directDegrees; // Aim right
                finalAngle = Math.max(minAngle, Math.min(maxAngle, finalAngle));
            }
        } else {
            // Direct shot - just clamp to valid range
            finalAngle = Math.max(minAngle, Math.min(maxAngle, directDegrees));
        }
        
        console.log(`AI Trajectory: target=(${target.x.toFixed(0)},${target.y.toFixed(0)}) angle=${finalAngle.toFixed(1)}° bounce=${needsBounce}`);
        
        return { angle: finalAngle, bounces: needsBounce ? 1 : 0 };
    }
    
    private showAimLine(angle: number, hasBounce: boolean): void {
        // Show aim preview based on difficulty
        let showPreview = false;
        let previewDuration = 0;
        let lineColor = 0xFF0000;
        let lineAlpha = 0.3;
        
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                // Always show preview for easy (helping the player understand AI's intent)
                showPreview = true;
                previewDuration = 600;
                lineColor = 0x4CAF50;
                lineAlpha = 0.5;
                break;
            case AIDifficulty.MEDIUM:
                // Sometimes show preview for medium
                showPreview = Math.random() < 0.5; // 50% chance
                previewDuration = 300;
                lineColor = 0xFFC107;
                lineAlpha = 0.3;
                break;
            case AIDifficulty.HARD:
                // No preview for hard (more challenging)
                showPreview = Math.random() < 0.1; // 10% chance only
                previewDuration = 150;
                lineColor = 0xFF0000;
                lineAlpha = 0.2;
                break;
        }
        
        if (!showPreview) return;
        
        // Create aim preview
        if (this.aimPreview) {
            this.aimPreview.destroy();
        }
        
        this.aimPreview = this.scene.add.graphics();
        this.aimPreview.setDepth(998);
        
        const radians = Phaser.Math.DegToRad(angle - 90);
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        // Draw trajectory
        this.aimPreview.lineStyle(2, lineColor, lineAlpha);
        
        let currentX = this.launcher.x;
        let currentY = this.launcher.y;
        let currentAngle = radians;
        let distance = 400;
        
        // Draw main trajectory
        let endX = currentX + Math.cos(currentAngle) * distance;
        let endY = currentY + Math.sin(currentAngle) * distance;
        
        // Check for wall bounce
        if (hasBounce) {
            // Calculate bounce point
            if (endX < 0) {
                const t = -currentX / Math.cos(currentAngle);
                const bounceY = currentY + Math.sin(currentAngle) * t;
                
                // Draw to bounce point
                this.aimPreview.lineBetween(currentX, currentY, 0, bounceY);
                
                // Draw bounced trajectory
                this.aimPreview.lineStyle(2, lineColor, lineAlpha * 0.5);
                this.aimPreview.lineBetween(0, bounceY, 100, bounceY + 50);
            } else if (endX > screenWidth) {
                const t = (screenWidth - currentX) / Math.cos(currentAngle);
                const bounceY = currentY + Math.sin(currentAngle) * t;
                
                // Draw to bounce point
                this.aimPreview.lineBetween(currentX, currentY, screenWidth, bounceY);
                
                // Draw bounced trajectory
                this.aimPreview.lineStyle(2, lineColor, lineAlpha * 0.5);
                this.aimPreview.lineBetween(screenWidth, bounceY, screenWidth - 100, bounceY + 50);
            }
        } else {
            // Simple straight line
            this.aimPreview.lineBetween(currentX, currentY, endX, endY);
        }
        
        // Draw dots along the line
        const dotCount = 5;
        for (let i = 1; i <= dotCount; i++) {
            const t = i / (dotCount + 1);
            const dotX = currentX + (endX - currentX) * t;
            const dotY = currentY + (endY - currentY) * t;
            this.aimPreview.fillStyle(lineColor, lineAlpha * (1 - t * 0.5));
            this.aimPreview.fillCircle(dotX, dotY, 2);
        }
        
        // Fade out and destroy
        this.scene.tweens.add({
            targets: this.aimPreview,
            alpha: 0,
            duration: previewDuration,
            onComplete: () => {
                if (this.aimPreview) {
                    this.aimPreview.destroy();
                    this.aimPreview = undefined;
                }
            }
        });
    }
    
    private shootRandom(): void {
        const target = this.getRandomTarget();
        this.shoot(target);
    }
    
    private showThinking(): void {
        if (this.thinkingIndicator) {
            this.thinkingIndicator.setVisible(true);
            
            // Animate dots
            let dotCount = 0;
            const dotTimer = this.scene.time.addEvent({
                delay: 300,
                callback: () => {
                    dotCount = (dotCount + 1) % 4;
                    if (this.thinkingDots) {
                        this.thinkingDots.setText('.'.repeat(dotCount));
                    }
                },
                loop: true
            });
            
            // Store timer reference for cleanup
            (this.thinkingIndicator as any).dotTimer = dotTimer;
            
            // Slide in animation
            this.thinkingIndicator.setScale(0, 1);
            this.scene.tweens.add({
                targets: this.thinkingIndicator,
                scaleX: 1,
                duration: 200,
                ease: 'Back.easeOut'
            });
            
            // Subtle pulse
            this.scene.tweens.add({
                targets: this.thinkingIndicator,
                y: 105,
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    private hideThinking(): void {
        if (this.thinkingIndicator) {
            // Clean up dot timer
            const dotTimer = (this.thinkingIndicator as any).dotTimer;
            if (dotTimer) {
                dotTimer.destroy();
            }
            
            // Slide out animation
            this.scene.tweens.add({
                targets: this.thinkingIndicator,
                scaleX: 0,
                duration: 150,
                ease: 'Back.easeIn',
                onComplete: () => {
                    if (this.thinkingIndicator) {
                        this.thinkingIndicator.setVisible(false);
                        this.thinkingIndicator.y = 100; // Reset position
                    }
                }
            });
            
            this.scene.tweens.killTweensOf(this.thinkingIndicator);
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
        
        // Update difficulty badge
        if (this.difficultyBadge) {
            this.difficultyBadge.destroy();
            this.createDifficultyBadge();
        }
    }
    
    private addShootEffects(target: ITargetOption): void {
        // Screen flash for hard difficulty perfect shots
        if (this.config.difficulty === AIDifficulty.HARD && target.score >= 40) {
            // Flash effect
            const flash = this.scene.add.rectangle(
                this.scene.cameras.main.centerX,
                this.scene.cameras.main.centerY,
                this.scene.cameras.main.width,
                this.scene.cameras.main.height,
                0xFF0000,
                0.1
            );
            flash.setDepth(2000);
            
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                duration: 200,
                onComplete: () => flash.destroy()
            });
            
            // Camera shake for powerful shots
            this.scene.cameras.main.shake(100, 0.003);
        }
        
        // Particle effect at launcher
        const particleColor = this.getDifficultyColor();
        for (let i = 0; i < 5; i++) {
            const particle = this.scene.add.circle(
                this.launcher.x,
                this.launcher.y,
                3,
                particleColor,
                0.8
            );
            
            const angle = (Math.PI * 2 / 5) * i;
            const distance = 30;
            
            this.scene.tweens.add({
                targets: particle,
                x: this.launcher.x + Math.cos(angle) * distance,
                y: this.launcher.y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0.5,
                duration: 400,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
        
        // Score popup for good shots
        if (target.score >= 25) {
            const scoreText = this.scene.add.text(
                this.launcher.x,
                this.launcher.y - 50,
                `+${target.score}`,
                {
                    fontSize: '18px',
                    color: '#FFD700',
                    fontStyle: 'bold',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            );
            scoreText.setOrigin(0.5);
            scoreText.setDepth(1001);
            
            this.scene.tweens.add({
                targets: scoreText,
                y: scoreText.y - 30,
                alpha: 0,
                scale: 1.5,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => scoreText.destroy()
            });
        }
    }
    
    private showTargetMarker(position: { x: number; y: number }): void {
        // Create a visual marker where the AI is aiming
        const marker = this.scene.add.graphics();
        marker.setDepth(999);
        
        // Draw crosshair
        const color = this.getDifficultyColor();
        marker.lineStyle(2, color, 0.8);
        
        // Circle
        marker.strokeCircle(position.x, position.y, 15);
        
        // Cross
        marker.lineBetween(position.x - 10, position.y, position.x + 10, position.y);
        marker.lineBetween(position.x, position.y - 10, position.x, position.y + 10);
        
        // Pulse animation
        this.scene.tweens.add({
            targets: marker,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => marker.destroy()
        });
        
        // Also log for debugging
        console.log(`🎯 AI Target Marker at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
    }
    
    public destroy(): void {
        this.stop();
        if (this.thinkingIndicator) {
            const dotTimer = (this.thinkingIndicator as any).dotTimer;
            if (dotTimer) {
                dotTimer.destroy();
            }
            this.thinkingIndicator.destroy();
        }
        if (this.difficultyBadge) {
            this.difficultyBadge.destroy();
        }
        if (this.aimPreview) {
            this.aimPreview.destroy();
        }
    }
}