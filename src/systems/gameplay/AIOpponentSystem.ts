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
    private lastColor: BubbleColor | null = null; // Track last color to avoid repetition
    private lastShotPosition: { x: number; y: number } | null = null; // Track last shot position
    private recentColors: BubbleColor[] = []; // Track recent colors to ensure variety
    private recentPositions: { x: number; y: number }[] = []; // Track recent positions
    
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
                    decisionDelay: 1500 // 1.5 seconds
                };
            case AIDifficulty.HARD:
                return {
                    difficulty: AIDifficulty.HARD,
                    decisionDelay: 500 // 0.5 seconds - VERY FAST
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
        
        // Schedule next shot based on difficulty with appropriate variation
        const baseDelay = this.config.decisionDelay;
        let randomDelay: number;
        
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                randomDelay = Math.floor(Math.random() * 1500) + 500; // 500-2000ms extra
                break;
            case AIDifficulty.MEDIUM:
                randomDelay = Math.floor(Math.random() * 800) + 300; // 300-1100ms extra
                break;
            case AIDifficulty.HARD:
                randomDelay = Math.floor(Math.random() * 300) + 100; // 100-400ms extra - VERY FAST
                break;
            default:
                randomDelay = 1000;
        }
        
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
        
        // Get difficulty info
        const diffInfo = this.getDifficultyInfo();
        const bgColor = this.getDifficultyColor();
        
        // Create layered badge with glow effect
        // Outer glow
        const glow = this.scene.add.rectangle(0, 0, 130, 35, bgColor, 0.3);
        glow.setStrokeStyle(2, bgColor, 0.5);
        
        // Badge background (wider for description)
        const bg = this.scene.add.rectangle(0, 0, 120, 30, bgColor, 0.9);
        bg.setStrokeStyle(1, 0xFFFFFF);
        
        // Add icon based on difficulty
        let icon = '';
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                icon = '🎯';
                break;
            case AIDifficulty.MEDIUM:
                icon = '⚡';
                break;
            case AIDifficulty.HARD:
                icon = '🔥';
                break;
        }
        
        const iconText = this.scene.add.text(-45, 0, icon, {
            fontSize: '16px'
        });
        iconText.setOrigin(0.5);
        
        // Difficulty text
        const text = this.scene.add.text(0, -7, this.config.difficulty, {
            fontSize: '12px',
            color: '#FFFFFF',
            fontStyle: 'bold'
        });
        text.setOrigin(0.5);
        
        // Description text
        const desc = this.scene.add.text(0, 6, diffInfo.description, {
            fontSize: '9px',
            color: '#FFFFFF'
        });
        desc.setOrigin(0.5);
        
        this.difficultyBadge.add([glow, bg, iconText, text, desc]);
        this.difficultyBadge.setDepth(999);
        
        // Different animations based on difficulty
        if (this.config.difficulty === AIDifficulty.HARD) {
            // Intense pulsing for hard mode
            this.scene.tweens.add({
                targets: glow,
                scaleX: 1.3,
                scaleY: 1.3,
                alpha: 0.6,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Power2'
            });
            
            // Rotate icon
            this.scene.tweens.add({
                targets: iconText,
                angle: 360,
                duration: 3000,
                repeat: -1,
                ease: 'Linear'
            });
        } else if (this.config.difficulty === AIDifficulty.MEDIUM) {
            // Moderate pulsing
            this.scene.tweens.add({
                targets: this.difficultyBadge,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else {
            // Gentle pulsing for easy
            this.scene.tweens.add({
                targets: this.difficultyBadge,
                y: this.launcher.y + 42,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
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
    
    private getDifficultyInfo(): { description: string; accuracy: string } {
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                return {
                    description: '50% Random • Slow',
                    accuracy: '50% Smart'
                };
            case AIDifficulty.MEDIUM:
                return {
                    description: '75% Smart • Normal',
                    accuracy: '25% Random'
                };
            case AIDifficulty.HARD:
                return {
                    description: '95% PERFECT • FAST',
                    accuracy: '5% Random'
                };
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
        // INCREMENT SHOT COUNTER HERE - ONCE PER SHOT
        this.shotCount++;
        console.log(`🎯 AI: Selecting target for shot #${this.shotCount}`);
        
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
        
        // Log what we're returning
        console.log(`AI: Target selected - x=${result.position.x.toFixed(0)} y=${result.position.y.toFixed(0)} color=${this.getColorName(result.color)}`);
        
        return result;
    }
    
    private selectEasyTarget(): ITargetOption | null {
        // Easy: 40% random, 60% strategic (but inaccurate)
        const random = Math.random();
        console.log(`AI Easy: Strategy roll = ${random.toFixed(2)} for shot #${this.shotCount}`);
        
        // 20% chance to try clearing objective area (even easy mode should try to win)
        if (random < 0.2) {
            const objectiveShot = this.findObjectiveClearingShot();
            if (objectiveShot) {
                // Add significant error to make it less accurate
                objectiveShot.position.x += (Math.random() - 0.5) * 50;
                objectiveShot.position.y += (Math.random() - 0.5) * 30;
                objectiveShot.color = this.getVariedColor(); // Sometimes wrong color
                console.log(`AI Easy: Trying to clear objective (inaccurate)`);
                this.updateRecentHistory(objectiveShot);
                return objectiveShot;
            }
        }
        
        if (random < 0.4) {
            // 40% - Random shot with variety
            console.log(`AI Easy: Random shot`);
            const target = this.getRandomTarget();
            this.updateRecentHistory(target);
            return target;
        }
        
        // 60% - Try to match but with poor accuracy
        const matches = this.analyzeGrid();
        
        if (matches.length > 0) {
            // Filter for variety
            const variedMatches = matches.filter(m => {
                if (this.lastColor && m.color === this.lastColor) {
                    return Math.random() < 0.3; // 30% chance to repeat color
                }
                return true;
            });
            
            const availableMatches = variedMatches.length > 0 ? variedMatches : matches;
            
            // Pick from lower tier matches
            const lowerTierMatches = availableMatches.slice(Math.floor(availableMatches.length / 2));
            const selected = lowerTierMatches.length > 0 ? 
                lowerTierMatches[Math.floor(Math.random() * lowerTierMatches.length)] :
                availableMatches[availableMatches.length - 1];
            
            // Add significant inaccuracy
            const inaccuracy = 25;
            selected.position.x += (Math.random() - 0.5) * inaccuracy * 2;
            selected.position.y += (Math.random() - 0.5) * inaccuracy;
            
            // 20% chance to use wrong color (mistake)
            if (Math.random() < 0.2) {
                selected.color = this.getVariedColor();
                console.log(`AI Easy: Wrong color mistake!`);
            }
            
            console.log(`AI Easy: Inaccurate match attempt`);
            this.updateRecentHistory(selected);
            return selected;
        }
        
        const fallback = this.getRandomTarget();
        this.updateRecentHistory(fallback);
        return fallback;
    }
    
    private selectMediumTarget(): ITargetOption | null {
        // Medium: 20% random, 80% strategic
        const random = Math.random();
        console.log(`AI Medium: Strategy roll = ${random.toFixed(2)} for shot #${this.shotCount}`);
        
        // 40% chance to prioritize objective clearing
        if (random < 0.4) {
            const objectiveShot = this.findObjectiveClearingShot();
            if (objectiveShot) {
                // Add moderate error
                objectiveShot.position.x += (Math.random() - 0.5) * 15;
                objectiveShot.position.y += (Math.random() - 0.5) * 10;
                console.log(`AI Medium: Clearing objective area`);
                this.updateRecentHistory(objectiveShot);
                return objectiveShot;
            }
        }
        
        if (random < 0.2) {
            // 20% - Random for unpredictability
            console.log(`AI Medium: Random shot`);
            const target = this.getRandomTarget();
            this.updateRecentHistory(target);
            return target;
        }
        
        // 80% - Strategic play
        const matches = this.analyzeGrid();
        
        if (matches.length > 0) {
            // Filter for variety
            const variedMatches = matches.filter(m => {
                // Avoid repeating same color too much
                if (this.recentColors.filter(c => c === m.color).length >= 2) {
                    return Math.random() < 0.4; // 40% chance if color repeated
                }
                
                // Avoid repeating positions
                for (const recentPos of this.recentPositions) {
                    const distance = Math.sqrt(
                        Math.pow(m.position.x - recentPos.x, 2) +
                        Math.pow(m.position.y - recentPos.y, 2)
                    );
                    if (distance < 70) return false;
                }
                
                return true;
            });
            
            const availableMatches = variedMatches.length > 0 ? variedMatches : matches;
            
            // Pick from top 40% of matches
            const cutoff = Math.max(1, Math.ceil(availableMatches.length * 0.4));
            const goodMatches = availableMatches.slice(0, cutoff);
            
            // Select with bias toward better matches
            const selectedIndex = Math.floor(Math.random() * Math.random() * goodMatches.length);
            let selected = goodMatches[selectedIndex];
            
            // 40% chance to try a bounce shot
            if (Math.random() < 0.4) {
                const bounceOptions = this.calculateBounceShots(selected.position, selected.color);
                if (bounceOptions.length > 0) {
                    console.log(`AI Medium: Using bounce shot!`);
                    selected = bounceOptions[0];
                }
            }
            
            // Add moderate inaccuracy
            const inaccuracy = 8;
            selected.position.x += (Math.random() - 0.5) * inaccuracy;
            selected.position.y += (Math.random() - 0.5) * inaccuracy * 0.5;
            
            console.log(`AI Medium: Strategic shot - ${selected.reasoning}`);
            this.updateRecentHistory(selected);
            return selected;
        }
        
        // No matches - look for setups
        if (Math.random() < 0.5) {
            const complexSetup = this.findComplexSetup();
            if (complexSetup) {
                complexSetup.color = this.getVariedColor();
                console.log(`AI Medium: Complex setup`);
                this.updateRecentHistory(complexSetup);
                return complexSetup;
            }
        }
        
        // Standard setup with variety
        const setup = this.findSetupShot();
        if (setup) {
            setup.color = this.getVariedColor();
            this.updateRecentHistory(setup);
            return setup;
        }
        
        const fallback = this.getRandomTarget();
        this.updateRecentHistory(fallback);
        return fallback;
    }
    
    private selectHardTarget(): ITargetOption | null {
        // Hard: 15% random, 85% perfect play (increased randomness for variety)
        const random = Math.random();
        console.log(`AI Hard: Strategy roll = ${random.toFixed(2)} for shot #${this.shotCount}`);
        
        // Force variety every few shots
        if (this.shotCount % 5 === 0 || random < 0.15) {
            // 15% - Tactical randomness for unpredictability
            console.log(`AI Hard: Tactical random for variety`);
            const randomTarget = this.getRandomTarget();
            this.updateRecentHistory(randomTarget);
            return randomTarget;
        }
        
        // First priority: Clear path to objective
        const objectiveShot = this.findObjectiveClearingShot();
        if (objectiveShot && objectiveShot.score >= 200) {
            console.log(`AI Hard: OBJECTIVE CLEARING - ${objectiveShot.reasoning}`);
            this.updateRecentHistory(objectiveShot);
            return objectiveShot;
        }
        
        // 90% - Perfect optimal play
        const matches = this.analyzeGrid();
        
        if (matches.length > 0) {
            // Filter out shots that would repeat recent patterns
            const freshMatches = matches.filter(m => {
                // Check color variety
                if (this.recentColors.length >= 2 && 
                    this.recentColors[this.recentColors.length - 1] === m.color &&
                    this.recentColors[this.recentColors.length - 2] === m.color) {
                    return false; // Skip if same color 3 times in a row
                }
                
                // Check position variety
                for (const recentPos of this.recentPositions) {
                    const distance = Math.sqrt(
                        Math.pow(m.position.x - recentPos.x, 2) +
                        Math.pow(m.position.y - recentPos.y, 2)
                    );
                    if (distance < 60) return false; // Too close to recent shot
                }
                
                return true;
            });
            
            const availableMatches = freshMatches.length > 0 ? freshMatches : matches;
            
            // Find the BEST possible shot including wall bounces
            let bestOption = availableMatches[0];
            
            // Check bounce shots for top matches
            for (const match of availableMatches.slice(0, 3)) {
                const bounceOptions = this.calculateBounceShots(match.position, match.color);
                for (const bounceOption of bounceOptions) {
                    if (bounceOption.score > bestOption.score + 50) { // Only use bounce if significantly better
                        bestOption = bounceOption;
                    }
                }
            }
            
            // Perfect accuracy - minimal error
            const inaccuracy = 3;
            bestOption.position.x += (Math.random() - 0.5) * inaccuracy;
            bestOption.position.y += (Math.random() - 0.5) * inaccuracy;
            
            this.updateRecentHistory(bestOption);
            console.log(`AI Hard: OPTIMAL shot - ${bestOption.reasoning} (score: ${bestOption.score})`);
            return bestOption;
        }
        
        // No direct matches - look for complex setups
        const complexSetup = this.findComplexSetup();
        if (complexSetup) {
            console.log(`AI Hard: Complex strategic setup`);
            this.updateRecentHistory(complexSetup);
            return complexSetup;
        }
        
        // Try to clear objective area
        if (objectiveShot) {
            console.log(`AI Hard: Objective area shot`);
            this.updateRecentHistory(objectiveShot);
            return objectiveShot;
        }
        
        // Strategic placement
        const setupShot = this.findSetupShot();
        if (setupShot) {
            // Ensure variety in setup shots
            setupShot.color = this.getVariedColor();
            console.log(`AI Hard: Strategic setup`);
            this.updateRecentHistory(setupShot);
            return setupShot;
        }
        
        // Emergency fallback with forced variety
        console.log(`AI Hard: Emergency fallback`);
        const randomTarget = this.getStrategicRandomTarget();
        randomTarget.color = this.getVariedColor();
        this.updateRecentHistory(randomTarget);
        return randomTarget;
    }
    
    private getRandomTarget(): ITargetOption {
        const screenWidth = this.scene.cameras.main.width;
        const centerY = this.scene.cameras.main.centerY;
        
        // TARGET THE OBJECTIVE AREA - prioritize center top where chest is
        const objectiveY = 100; // Near the chest
        
        // Generate position that aims toward objective
        let targetX: number;
        let targetY: number;
        
        // Mix of strategies for variety
        const strategy = Math.random();
        
        if (strategy < 0.4) {
            // 40% - Aim for objective area
            targetX = screenWidth * 0.5 + (Math.random() - 0.5) * 250;
            targetY = objectiveY + Math.random() * 180;
        } else if (strategy < 0.7) {
            // 30% - Side attacks
            if (Math.random() < 0.5) {
                targetX = screenWidth * 0.2 + Math.random() * 100;
            } else {
                targetX = screenWidth * 0.8 - Math.random() * 100;
            }
            targetY = centerY + (Math.random() - 0.5) * 200;
        } else {
            // 30% - Random position for unpredictability
            const minX = screenWidth * 0.1;
            const maxX = screenWidth * 0.9;
            targetX = minX + (Math.random() * (maxX - minX));
            targetY = centerY - 50 + (Math.random() * 300);
        }
        
        // Force position variety
        if (this.recentPositions.length > 0) {
            const lastPos = this.recentPositions[this.recentPositions.length - 1];
            const distance = Math.sqrt(
                Math.pow(targetX - lastPos.x, 2) +
                Math.pow(targetY - lastPos.y, 2)
            );
            
            if (distance < 100) {
                // Force a different position
                const angle = Math.random() * Math.PI * 2;
                const radius = 100 + Math.random() * 100;
                targetX = lastPos.x + Math.cos(angle) * radius;
                targetY = lastPos.y + Math.sin(angle) * radius;
                
                // Keep in bounds
                targetX = Math.max(60, Math.min(screenWidth - 60, targetX));
                targetY = Math.max(50, Math.min(centerY + 300, targetY));
            }
        }
        
        // Get a varied color
        const randomColor = this.getVariedColor();
        
        console.log(`🎲 Random: x=${targetX.toFixed(0)} y=${targetY.toFixed(0)} color=${this.getColorName(randomColor)}`);
        
        return {
            position: { 
                x: targetX, 
                y: targetY 
            },
            score: 0,
            color: randomColor,
            reasoning: `Random shot toward objective`
        };
    }
    
    private getStrategicRandomTarget(): ITargetOption {
        // Strategic but with forced variety
        const screenWidth = this.scene.cameras.main.width;
        const centerY = this.scene.cameras.main.centerY;
        
        // More zones for better variety
        const zones = [
            { x: screenWidth * 0.2, y: centerY - 50, label: 'left-high' },
            { x: screenWidth * 0.5, y: centerY - 30, label: 'center-high' },
            { x: screenWidth * 0.8, y: centerY - 50, label: 'right-high' },
            { x: screenWidth * 0.3, y: centerY + 50, label: 'left-mid' },
            { x: screenWidth * 0.7, y: centerY + 50, label: 'right-mid' },
            { x: screenWidth * 0.4, y: centerY + 120, label: 'left-low' },
            { x: screenWidth * 0.6, y: centerY + 120, label: 'right-low' }
        ];
        
        // Pick a zone different from last position
        let validZones = zones;
        if (this.lastShotPosition) {
            validZones = zones.filter(z => {
                const dist = Math.sqrt(
                    Math.pow(z.x - this.lastShotPosition!.x, 2) +
                    Math.pow(z.y - this.lastShotPosition!.y, 2)
                );
                return dist > 100; // Must be far from last shot
            });
        }
        
        if (validZones.length === 0) validZones = zones;
        const zone = validZones[Math.floor(Math.random() * validZones.length)];
        
        // Position with variation from zone center
        const targetX = zone.x + (Math.random() - 0.5) * 80;
        const targetY = zone.y + (Math.random() - 0.5) * 60;
        
        // Ensure we're not shooting at the same spot
        let finalX = targetX;
        let finalY = targetY;
        
        if (this.lastShotPosition) {
            const distance = Math.sqrt(
                Math.pow(targetX - this.lastShotPosition.x, 2) +
                Math.pow(targetY - this.lastShotPosition.y, 2)
            );
            
            // If too close to last shot, offset it
            if (distance < 60) {
                finalX += (Math.random() < 0.5 ? -1 : 1) * 80;
                finalY += (Math.random() - 0.5) * 60;
                
                // Keep within bounds
                finalX = Math.max(60, Math.min(screenWidth - 60, finalX));
                finalY = Math.max(centerY, Math.min(centerY + 250, finalY));
            }
        }
        
        // Use varied color system
        const strategicColor = this.getVariedColor();
        
        console.log(`🎯 Strategic: zone=${zone.label} x=${finalX.toFixed(0)} y=${finalY.toFixed(0)}`);
        
        return {
            position: { x: finalX, y: finalY },
            score: 10,
            color: strategicColor,
            reasoning: `Strategic ${zone.label}`
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
            if (color !== null && color !== undefined) {
                if (!colorGroups.has(color)) {
                    colorGroups.set(color, []);
                }
                colorGroups.get(color)!.push(bubble);
            }
        });
        
        // For each color, find opportunities to create matches
        colorGroups.forEach((bubbles, color) => {
            // Need at least 2 bubbles to make a match of 3
            if (bubbles.length >= 2) {
                // Check all pairs of same-colored bubbles
                for (let i = 0; i < bubbles.length - 1; i++) {
                    for (let j = i + 1; j < bubbles.length; j++) {
                        const bubble1 = bubbles[i];
                        const bubble2 = bubbles[j];
                        const pos1 = bubble1.getGridPosition();
                        const pos2 = bubble2.getGridPosition();
                        
                        if (pos1 && pos2) {
                            // Check if bubbles are close enough to form a match
                            const hexDistance = this.getHexDistance(pos1, pos2);
                            
                            // If bubbles are adjacent (distance 1)
                            if (hexDistance === 1) {
                                // Find the third position to complete the line
                                const matchPositions = this.findMatchCompletionPositions(pos1, pos2);
                                
                                matchPositions.forEach(targetHex => {
                                    if (!this.isPositionOccupied(targetHex)) {
                                        const pixelPos = this.bubbleGrid.hexToPixel(targetHex);
                                        
                                        // Validate trajectory for all modes
                                        const testTarget: ITargetOption = {
                                            position: pixelPos,
                                            score: 0,
                                            color: color,
                                            reasoning: 'test'
                                        };
                                        
                                        if (!this.isTrajectoryValid(testTarget)) {
                                            return; // Skip if path is blocked
                                        }
                                        
                                        // Calculate chain reaction potential
                                        const chainScore = this.predictChainReaction(targetHex, color);
                                        
                                        // High score for adjacent pairs (easy match) + chain bonus
                                        // Prioritize match-3 completions even more
                                        const baseScore = 200; // Increased from 100
                                        const score = baseScore + bubbles.length * 15 + chainScore;
                                        
                                        options.push({
                                            position: pixelPos,
                                            hexPosition: targetHex,
                                            score: score,
                                            color: color,
                                            reasoning: chainScore > 0 ? 
                                                `Chain combo! ${this.getColorName(color)} (${chainScore} pts)` :
                                                `Complete line of ${this.getColorName(color)}`,
                                            matchCount: 3
                                        });
                                    }
                                });
                            }
                            // If bubbles are separated by 1 space (distance 2)
                            else if (hexDistance === 2) {
                                // Find the middle position
                                const middlePos = this.findMiddlePosition(pos1, pos2);
                                if (middlePos && !this.isPositionOccupied(middlePos)) {
                                    const pixelPos = this.bubbleGrid.hexToPixel(middlePos);
                                    
                                    // Validate trajectory for all modes
                                    const testTarget: ITargetOption = {
                                        position: pixelPos,
                                        score: 0,
                                        color: color,
                                        reasoning: 'test'
                                    };
                                    
                                    if (!this.isTrajectoryValid(testTarget)) {
                                        continue; // Skip if path is blocked
                                    }
                                    
                                    // Calculate chain reaction potential
                                    const chainScore = this.predictChainReaction(middlePos, color);
                                    
                                    // Good score for filling gaps + chain bonus
                                    // Prioritize bridge completions
                                    const baseScore = 150; // Increased from 80
                                    const score = baseScore + bubbles.length * 12 + chainScore;
                                    
                                    options.push({
                                        position: pixelPos,
                                        hexPosition: middlePos,
                                        score: score,
                                        color: color,
                                        reasoning: chainScore > 0 ?
                                            `Chain bridge ${this.getColorName(color)} (${chainScore} pts)` :
                                            `Bridge ${this.getColorName(color)} bubbles`,
                                        matchCount: 3
                                    });
                                }
                            }
                        }
                    }
                }
                
                // Also look for positions that would connect to single bubbles
                bubbles.forEach(bubble => {
                    const pos = bubble.getGridPosition();
                    if (pos) {
                        const neighbors = this.bubbleGrid.getNeighbors(pos);
                        
                        neighbors.forEach(neighbor => {
                            if (!this.isPositionOccupied(neighbor)) {
                                // Count how many same-color bubbles are adjacent to this position
                                const adjacentCount = this.countAdjacentSameColor(neighbor, color);
                                
                                if (adjacentCount >= 2) {
                                    const pixelPos = this.bubbleGrid.hexToPixel(neighbor);
                                    
                                    // Validate trajectory for all modes
                                    const testTarget: ITargetOption = {
                                        position: pixelPos,
                                        score: 0,
                                        color: color,
                                        reasoning: 'test'
                                    };
                                    
                                    if (!this.isTrajectoryValid(testTarget)) {
                                        return; // Skip if path is blocked
                                    }
                                    
                                    // Predict chain reactions
                                    const chainScore = this.predictChainReaction(neighbor, color);
                                    const baseScore = 60 + adjacentCount * 20 + chainScore;
                                    
                                    // Add position variety bonus to avoid clustering
                                    let varietyBonus = 0;
                                    if (this.lastShotPosition) {
                                        const distance = Math.sqrt(
                                            Math.pow(pixelPos.x - this.lastShotPosition.x, 2) +
                                            Math.pow(pixelPos.y - this.lastShotPosition.y, 2)
                                        );
                                        // Bonus for shots further from last position
                                        varietyBonus = Math.min(30, distance / 5);
                                    }
                                    
                                    const score = baseScore + varietyBonus;
                                    
                                    options.push({
                                        position: pixelPos,
                                        hexPosition: neighbor,
                                        score: score,
                                        color: color,
                                        reasoning: chainScore > 0 ?
                                            `Chain group ${adjacentCount + 1} ${this.getColorName(color)} (${chainScore} pts)` :
                                            `Group ${adjacentCount + 1} ${this.getColorName(color)}`,
                                        matchCount: adjacentCount + 1
                                    });
                                }
                            }
                        });
                    }
                });
            }
        });
        
        // Add defensive options
        const defensiveOptions = this.findDefensiveShots();
        options.push(...defensiveOptions);
        
        // Sort by score
        options.sort((a, b) => b.score - a.score);
        
        console.log(`AI: Found ${options.length} match opportunities`);
        if (options.length > 0 && options[0]) {
            console.log(`AI: Best option - ${options[0].reasoning} (score: ${options[0].score})`);
        }
        
        return options;
    }
    
    private getHexDistance(pos1: IHexPosition, pos2: IHexPosition): number {
        return Math.abs(pos1.q - pos2.q) + Math.abs(pos1.r - pos2.r) + Math.abs(pos1.s - pos2.s);
    }
    
    private findMatchCompletionPositions(pos1: IHexPosition, pos2: IHexPosition): IHexPosition[] {
        const positions: IHexPosition[] = [];
        
        // Calculate direction vector
        const dq = pos2.q - pos1.q;
        const dr = pos2.r - pos1.r;
        const ds = pos2.s - pos1.s;
        
        // Extend the line in both directions
        positions.push({
            q: pos1.q - dq,
            r: pos1.r - dr,
            s: pos1.s - ds
        });
        
        positions.push({
            q: pos2.q + dq,
            r: pos2.r + dr,
            s: pos2.s + ds
        });
        
        return positions;
    }
    
    private findMiddlePosition(pos1: IHexPosition, pos2: IHexPosition): IHexPosition | null {
        // Check if positions are aligned and have a middle
        const dq = pos2.q - pos1.q;
        const dr = pos2.r - pos1.r;
        const ds = pos2.s - pos1.s;
        
        // Must be even differences to have a middle
        if (dq % 2 === 0 && dr % 2 === 0 && ds % 2 === 0) {
            return {
                q: pos1.q + dq / 2,
                r: pos1.r + dr / 2,
                s: pos1.s + ds / 2
            };
        }
        
        return null;
    }
    
    private countAdjacentSameColor(pos: IHexPosition, color: BubbleColor): number {
        let count = 0;
        const neighbors = this.bubbleGrid.getNeighbors(pos);
        
        neighbors.forEach(neighbor => {
            const bubble = this.getBubbleAtPosition(neighbor);
            if (bubble && bubble.getColor() === color) {
                count++;
            }
        });
        
        return count;
    }
    
    private calculateShotScore(targetHex: IHexPosition, color: BubbleColor, groupSize: number): number {
        let score = 0;
        
        // Base score from potential match size
        if (groupSize >= 2) {
            score = 30; // Would complete a match of 3
        }
        if (groupSize >= 3) {
            score = 50; // Would create a match of 4+
        }
        if (groupSize >= 5) {
            score = 100; // Large match bonus
        }
        
        // Bonus for positions closer to objective (center)
        const distance = Math.abs(targetHex.q) + Math.abs(targetHex.r);
        if (distance <= 1) {
            score += 20; // Adjacent to center
        } else if (distance <= 3) {
            score += 10; // Close to center
        }
        
        // Check how many bubbles this would connect to
        const neighbors = this.bubbleGrid.getNeighbors(targetHex);
        let sameColorNeighbors = 0;
        
        neighbors.forEach(neighbor => {
            const bubble = this.getBubbleAtPosition(neighbor);
            if (bubble && bubble.getColor() === color) {
                sameColorNeighbors++;
            }
        });
        
        // More neighbors = better shot
        score += sameColorNeighbors * 15;
        
        return score;
    }
    
    private getBubbleAtPosition(hexPos: IHexPosition): Bubble | null {
        const bubbles = this.getGridBubbles();
        return bubbles.find(bubble => {
            const pos = bubble.getGridPosition();
            return pos && pos.q === hexPos.q && pos.r === hexPos.r;
        }) || null;
    }
    
    private findSetupShot(): ITargetOption | null {
        // Try to position bubbles for future matches
        const gridBubbles = this.getGridBubbles();
        if (gridBubbles.length === 0) return null;
        
        // Find the most common color
        const colorCounts = new Map<BubbleColor, number>();
        gridBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color !== null && color !== undefined) {
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
        
        // If we keep using the same color, force variety
        if (mostCommonColor && this.recentColors.filter(c => c === mostCommonColor).length >= 2) {
            // Pick a different color
            const otherColors = Array.from(colorCounts.keys()).filter(c => c !== mostCommonColor);
            if (otherColors.length > 0) {
                mostCommonColor = otherColors[Math.floor(Math.random() * otherColors.length)];
            }
        }
        
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
    
    private predictChainReaction(position: IHexPosition, color: BubbleColor): number {
        let chainScore = 0;
        const visited = new Set<string>();
        const toCheck: IHexPosition[] = [position];
        
        // Simulate placing the bubble and check what would pop
        while (toCheck.length > 0) {
            const current = toCheck.pop()!;
            const key = `${current.q},${current.r}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Get neighbors and check for potential chains
            const neighbors = this.bubbleGrid.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const bubble = this.getBubbleAtPosition(neighbor);
                if (bubble) {
                    // Check if placing our bubble would cause this to pop
                    const wouldPop = this.wouldCauseMatch(neighbor, color);
                    if (wouldPop) {
                        chainScore += 50; // Bonus for each additional pop
                        
                        // Check for further chains
                        const furtherNeighbors = this.bubbleGrid.getNeighbors(neighbor);
                        furtherNeighbors.forEach(fn => {
                            if (!visited.has(`${fn.q},${fn.r}`)) {
                                toCheck.push(fn);
                            }
                        });
                    }
                }
            }
        }
        
        return chainScore;
    }
    
    private wouldCauseMatch(position: IHexPosition, placedColor: BubbleColor): boolean {
        const bubble = this.getBubbleAtPosition(position);
        if (!bubble) return false;
        
        const bubbleColor = bubble.getColor();
        if (bubbleColor === null || bubbleColor === undefined) return false;
        
        // Check if this bubble would be part of a match after placing the new bubble
        const neighbors = this.bubbleGrid.getNeighbors(position);
        let sameColorCount = 0;
        
        for (const neighbor of neighbors) {
            const neighborBubble = this.getBubbleAtPosition(neighbor);
            if (neighborBubble && neighborBubble.getColor() === bubbleColor) {
                sameColorCount++;
            }
            // Check if the position we're placing at would connect
            if (neighbor.q === position.q && neighbor.r === position.r && placedColor === bubbleColor) {
                sameColorCount++;
            }
        }
        
        return sameColorCount >= 2; // Would form a match of 3+
    }
    
    private findDefensiveShots(): ITargetOption[] {
        const defensiveOptions: ITargetOption[] = [];
        // Look for positions that would block player's potential matches
        // Focus on the lower part of the grid where player shoots
        const gridBubbles = this.getGridBubbles();
        const centerY = this.scene.cameras.main.centerY;
        
        // Find bubbles in player's zone (lower half)
        const playerZoneBubbles = gridBubbles.filter(b => b.y > centerY);
        
        if (playerZoneBubbles.length === 0) return defensiveOptions;
        
        // Group by color in player zone
        const colorGroups = new Map<BubbleColor, Bubble[]>();
        playerZoneBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color !== null && color !== undefined) {
                if (!colorGroups.has(color)) {
                    colorGroups.set(color, []);
                }
                colorGroups.get(color)!.push(bubble);
            }
        });
        
        // Find large groups that player might complete
        let bestDefensive: ITargetOption | null = null;
        let bestScore = 0;
        
        colorGroups.forEach((bubbles, color) => {
            if (bubbles.length >= 2) {
                // This color group could be dangerous
                // Find a position to disrupt it
                const centerBubble = bubbles[Math.floor(bubbles.length / 2)];
                const pos = centerBubble.getGridPosition();
                
                if (pos) {
                    const neighbors = this.bubbleGrid.getNeighbors(pos);
                    for (const neighbor of neighbors) {
                        if (!this.isPositionOccupied(neighbor)) {
                            const pixelPos = this.bubbleGrid.hexToPixel(neighbor);
                            const score = 20 + bubbles.length * 5;
                            
                            // Create defensive option
                            defensiveOptions.push({
                                position: pixelPos,
                                hexPosition: neighbor,
                                score: score,
                                color: Bubble.getRandomColor(), // Different color to block
                                reasoning: `Blocking ${this.getColorName(color)} group`
                            });
                        }
                    }
                }
            }
        });
        
        // Also check for critical defensive positions (near objective)
        const objectiveY = 100; // Near top where objective would be
        const criticalBubbles = gridBubbles.filter(b => b.y < objectiveY + 100);
        
        if (criticalBubbles.length > 3) {
            // Find positions that would prevent bubbles from reaching objective
            criticalBubbles.forEach(bubble => {
                const pos = bubble.getGridPosition();
                if (pos) {
                    const neighbors = this.bubbleGrid.getNeighbors(pos);
                    neighbors.forEach(neighbor => {
                        if (!this.isPositionOccupied(neighbor)) {
                            const pixelPos = this.bubbleGrid.hexToPixel(neighbor);
                            defensiveOptions.push({
                                position: pixelPos,
                                hexPosition: neighbor,
                                score: 150, // High priority for critical defense
                                color: Bubble.getRandomColor(),
                                reasoning: 'Critical defense near objective'
                            });
                        }
                    });
                }
            });
        }
        
        return defensiveOptions;
    }
    
    private getSmartRandomTarget(): ITargetOption {
        // Smart random - targets areas with more bubbles
        const gridBubbles = this.getGridBubbles();
        const screenWidth = this.scene.cameras.main.width;
        const centerY = this.scene.cameras.main.centerY;
        
        // Divide screen into zones and count bubbles
        const zones = [
            { x: screenWidth * 0.2, count: 0 },
            { x: screenWidth * 0.5, count: 0 },
            { x: screenWidth * 0.8, count: 0 }
        ];
        
        // Count bubbles in each zone
        gridBubbles.forEach(bubble => {
            const closestZone = zones.reduce((prev, curr) => 
                Math.abs(curr.x - bubble.x) < Math.abs(prev.x - bubble.x) ? curr : prev
            );
            closestZone.count++;
        });
        
        // Pick zone with most bubbles
        const targetZone = zones.reduce((prev, curr) => 
            curr.count > prev.count ? curr : prev
        );
        
        // Add variation
        const targetX = targetZone.x + (Math.random() - 0.5) * 60;
        const targetY = centerY + 50 + Math.random() * 150;
        
        // Pick most common color
        const colorCounts = new Map<BubbleColor, number>();
        gridBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color !== null && color !== undefined) {
                colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
            }
        });
        
        let smartColor = Bubble.getRandomColor();
        let maxCount = 0;
        colorCounts.forEach((count, color) => {
            if (count > maxCount) {
                maxCount = count;
                smartColor = color;
            }
        });
        
        return {
            position: { x: targetX, y: targetY },
            score: 5,
            color: smartColor,
            reasoning: 'Smart random targeting dense area'
        };
    }
    
    private getColorName(color: BubbleColor): string {
        // Use the actual enum values
        switch (color) {
            case BubbleColor.RED:
                return 'red';
            case BubbleColor.BLUE:
                return 'blue';
            case BubbleColor.GREEN:
                return 'green';
            case BubbleColor.YELLOW:
                return 'yellow';
            case BubbleColor.PURPLE:
                return 'purple';
            default:
                return 'unknown';
        }
    }
    
    private shoot(target: ITargetOption): void {
        if (!this.shootingSystem) return;
        
        // Validate trajectory for all difficulties to ensure realistic play
        const shouldValidate = (target as any).bounceAngle === undefined;
        
        if (shouldValidate && !this.isTrajectoryValid(target)) {
            console.log(`AI: Path might be blocked, checking alternatives...`);
            // Try to find an alternative shot
            const alternative = this.findAlternativeShot(target.color);
            if (alternative) {
                console.log(`AI: Found better alternative`);
                // Only use alternative if it's significantly better
                if (alternative.score > target.score - 50) {
                    target = alternative;
                }
            }
        }
        
        // Show target marker for debugging
        this.showTargetMarker(target.position);
        
        // Check if we need to use a bounce shot
        let finalAngle: number;
        
        if ((target as any).bounceAngle !== undefined) {
            // Use pre-calculated bounce angle
            finalAngle = (target as any).bounceAngle;
            console.log(`🎯 AI Using BOUNCE shot: angle=${finalAngle.toFixed(1)}°`);
        } else {
            // Calculate direct angle to target
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
                    angleVariation = (Math.random() - 0.5) * 15; // ±7.5 degrees
                    break;
                case AIDifficulty.MEDIUM:
                    angleVariation = (Math.random() - 0.5) * 6; // ±3 degrees
                    break;
                case AIDifficulty.HARD:
                    angleVariation = (Math.random() - 0.5) * 2; // ±1 degree - VERY PRECISE
                    break;
            }
            
            finalAngle = degrees + angleVariation;
        }
        
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
        const difficultyColor = this.getDifficultyColor();
        
        // Simple particle effect at launcher
        const particleColor = this.getDifficultyColor();
        for (let i = 0; i < 3; i++) {
            const particle = this.scene.add.circle(
                this.launcher.x,
                this.launcher.y,
                2,
                particleColor,
                0.5
            );
            
            const angle = (Math.PI * 2 / 3) * i;
            const distance = 20;
            
            this.scene.tweens.add({
                targets: particle,
                x: this.launcher.x + Math.cos(angle) * distance,
                y: this.launcher.y + Math.sin(angle) * distance,
                alpha: 0,
                scale: 0.3,
                duration: 300,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }
    
    private showTargetMarker(position: { x: number; y: number }): void {
        // Only show target markers based on difficulty
        let showMarker = false;
        let markerDuration = 0;
        
        switch (this.config.difficulty) {
            case AIDifficulty.EASY:
                showMarker = true; // Always show for easy
                markerDuration = 800;
                break;
            case AIDifficulty.MEDIUM:
                showMarker = Math.random() < 0.3; // 30% chance
                markerDuration = 500;
                break;
            case AIDifficulty.HARD:
                showMarker = false; // Never show for hard
                break;
        }
        
        if (!showMarker) {
            console.log(`🎯 AI targeting (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
            return;
        }
        
        // Create a visual marker where the AI is aiming
        const marker = this.scene.add.graphics();
        marker.setDepth(999);
        
        // Draw crosshair
        const color = this.getDifficultyColor();
        marker.lineStyle(2, color, 0.8);
        
        // Animated rings
        for (let i = 0; i < 3; i++) {
            const ring = this.scene.add.graphics();
            ring.setDepth(998);
            ring.lineStyle(1, color, 0.4 - i * 0.1);
            ring.strokeCircle(position.x, position.y, 10 + i * 8);
            
            // Animate rings expanding
            this.scene.tweens.add({
                targets: ring,
                alpha: 0,
                scaleX: 1.5 + i * 0.2,
                scaleY: 1.5 + i * 0.2,
                duration: markerDuration,
                delay: i * 100,
                ease: 'Power2',
                onComplete: () => ring.destroy()
            });
        }
        
        // Circle
        marker.strokeCircle(position.x, position.y, 15);
        
        // Cross
        marker.lineBetween(position.x - 10, position.y, position.x + 10, position.y);
        marker.lineBetween(position.x, position.y - 10, position.x, position.y + 10);
        
        // Dot in center
        marker.fillStyle(color, 1);
        marker.fillCircle(position.x, position.y, 3);
        
        // Pulse animation
        this.scene.tweens.add({
            targets: marker,
            alpha: 0,
            scale: 1.5,
            duration: markerDuration,
            ease: 'Power2',
            onComplete: () => marker.destroy()
        });
        
        // Also log for debugging
        console.log(`🎯 AI Target Marker at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
    }
    
    private calculateBounceShots(targetPos: { x: number; y: number }, color: BubbleColor): ITargetOption[] {
        const bounceOptions: ITargetOption[] = [];
        const screenWidth = this.scene.cameras.main.width;
        
        // Check left wall bounce
        const leftBounceAngle = this.calculateBounceAngle(targetPos, 'left');
        if (leftBounceAngle !== null) {
            bounceOptions.push({
                position: targetPos,
                score: 150, // High score for bounce shots
                color: color,
                reasoning: 'Perfect bounce shot (left wall)',
                bounceAngle: leftBounceAngle
            } as any);
        }
        
        // Check right wall bounce
        const rightBounceAngle = this.calculateBounceAngle(targetPos, 'right');
        if (rightBounceAngle !== null) {
            bounceOptions.push({
                position: targetPos,
                score: 150, // High score for bounce shots
                color: color,
                reasoning: 'Perfect bounce shot (right wall)',
                bounceAngle: rightBounceAngle
            } as any);
        }
        
        return bounceOptions;
    }
    
    private calculateBounceAngle(targetPos: { x: number; y: number }, wall: 'left' | 'right'): number | null {
        const screenWidth = this.scene.cameras.main.width;
        const launcherX = this.launcher.x;
        const launcherY = this.launcher.y;
        
        // Calculate the wall position
        const wallX = wall === 'left' ? 0 : screenWidth;
        
        // Calculate the mirror position of the target relative to the wall
        const mirrorX = wall === 'left' ? -targetPos.x : 2 * screenWidth - targetPos.x;
        const mirrorY = targetPos.y;
        
        // Calculate angle to mirror position
        const angleRad = Math.atan2(mirrorY - launcherY, mirrorX - launcherX);
        let degrees = angleRad * (180 / Math.PI) + 90;
        
        // Normalize angle
        while (degrees < 0) degrees += 360;
        while (degrees >= 360) degrees -= 360;
        
        // Check if angle is valid for opponent (shooting downward)
        // Valid range is approximately 30-150 degrees
        if (degrees >= 30 && degrees <= 150) {
            // Verify the bounce actually hits the target
            const velocity = 600; // shoot speed
            const rad = (degrees - 90) * Math.PI / 180;
            const vx = Math.cos(rad) * velocity;
            const vy = Math.sin(rad) * velocity;
            
            // Simple check: will it hit the wall?
            if ((wall === 'left' && vx < 0) || (wall === 'right' && vx > 0)) {
                // Also check if the path to the wall is clear
                const wallTarget: ITargetOption = {
                    position: { x: wallX, y: launcherY + 100 },
                    score: 0,
                    color: BubbleColor.RED,
                    reasoning: 'wall check'
                };
                
                if (this.isTrajectoryValid(wallTarget)) {
                    return degrees;
                }
            }
        }
        
        return null;
    }
    
    private findComplexSetup(): ITargetOption | null {
        // Look for positions that would set up future chain reactions
        const gridBubbles = this.getGridBubbles();
        if (gridBubbles.length < 5) return null;
        
        // Analyze potential chain setups
        const colorGroups = new Map<BubbleColor, Bubble[]>();
        gridBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color !== null && color !== undefined) {
                if (!colorGroups.has(color)) {
                    colorGroups.set(color, []);
                }
                colorGroups.get(color)!.push(bubble);
            }
        });
        
        // Find colors that could create multiple matches with one shot
        let bestSetup: ITargetOption | null = null;
        let bestScore = 0;
        
        colorGroups.forEach((bubbles, color) => {
            if (bubbles.length >= 4) { // Need at least 4 for complex setup
                // Find positions that would connect multiple groups
                const positions = this.findBridgePositions(bubbles);
                
                for (const pos of positions) {
                    const score = this.evaluateComplexPosition(pos, color, bubbles);
                    if (score > bestScore) {
                        bestScore = score;
                        bestSetup = {
                            position: this.bubbleGrid.hexToPixel(pos),
                            hexPosition: pos,
                            score: score,
                            color: color,
                            reasoning: `Complex setup for ${this.getColorName(color)} chain`
                        };
                    }
                }
            }
        });
        
        return bestSetup;
    }
    
    private findBridgePositions(bubbles: Bubble[]): IHexPosition[] {
        const positions: IHexPosition[] = [];
        const visited = new Set<string>();
        
        // Find positions that connect multiple bubble groups
        for (let i = 0; i < bubbles.length - 1; i++) {
            for (let j = i + 1; j < bubbles.length; j++) {
                const pos1 = bubbles[i].getGridPosition();
                const pos2 = bubbles[j].getGridPosition();
                
                if (pos1 && pos2) {
                    const distance = this.getHexDistance(pos1, pos2);
                    
                    // Look for positions that bridge distant bubbles
                    if (distance >= 3 && distance <= 4) {
                        const bridgePositions = this.findPathBetween(pos1, pos2);
                        for (const bridge of bridgePositions) {
                            const key = `${bridge.q},${bridge.r}`;
                            if (!visited.has(key) && !this.isPositionOccupied(bridge)) {
                                visited.add(key);
                                positions.push(bridge);
                            }
                        }
                    }
                }
            }
        }
        
        return positions;
    }
    
    private findPathBetween(pos1: IHexPosition, pos2: IHexPosition): IHexPosition[] {
        const path: IHexPosition[] = [];
        
        // Linear interpolation between two hex positions
        const steps = 3; // Check 3 intermediate positions
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const q = Math.round(pos1.q + (pos2.q - pos1.q) * t);
            const r = Math.round(pos1.r + (pos2.r - pos1.r) * t);
            const s = -q - r;
            
            path.push({ q, r, s });
        }
        
        return path;
    }
    
    private evaluateComplexPosition(pos: IHexPosition, color: BubbleColor, sameBubbles: Bubble[]): number {
        let score = 0;
        
        // Check how many bubbles this position would connect
        const neighbors = this.bubbleGrid.getNeighbors(pos);
        let connections = 0;
        
        for (const neighbor of neighbors) {
            const bubble = this.getBubbleAtPosition(neighbor);
            if (bubble && bubble.getColor() === color) {
                connections++;
                
                // Check if this would complete a match
                const neighborNeighbors = this.bubbleGrid.getNeighbors(neighbor);
                let matchSize = 1; // The placed bubble
                
                for (const nn of neighborNeighbors) {
                    const nnBubble = this.getBubbleAtPosition(nn);
                    if (nnBubble && nnBubble.getColor() === color) {
                        matchSize++;
                    }
                }
                
                if (matchSize >= 2) {
                    score += 50 * matchSize; // Big bonus for creating matches
                }
            }
        }
        
        // Bonus for connecting multiple groups
        score += connections * 30;
        
        // Extra bonus if this creates a large cluster
        if (connections >= 3) {
            score += 100;
        }
        
        return score;
    }
    
    private getVariedColor(): BubbleColor {
        const colors = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.GREEN,
            BubbleColor.YELLOW,
            BubbleColor.PURPLE
        ];
        
        // Filter out recent colors if possible
        let availableColors = colors;
        if (this.recentColors.length > 0) {
            const filteredColors = colors.filter(c => 
                !this.recentColors.slice(-2).includes(c) // Avoid last 2 colors
            );
            if (filteredColors.length > 0) {
                availableColors = filteredColors;
            }
        }
        
        // Pick random from available
        return availableColors[Math.floor(Math.random() * availableColors.length)];
    }
    
    private updateRecentHistory(option: ITargetOption): void {
        // Update position history
        this.recentPositions.push({ ...option.position });
        if (this.recentPositions.length > 3) {
            this.recentPositions.shift(); // Keep only last 3 positions
        }
        
        // Update color history
        this.recentColors.push(option.color);
        if (this.recentColors.length > 3) {
            this.recentColors.shift(); // Keep only last 3 colors
        }
        
        // Update last shot info
        this.lastShotPosition = { ...option.position };
        this.lastColor = option.color;
    }
    
    private findObjectiveClearingShot(): ITargetOption | null {
        // Find shots that would clear bubbles near the objective/chest area
        const screenWidth = this.scene.cameras.main.width;
        const objectiveX = screenWidth / 2;
        const objectiveY = 100; // Top center where chest is
        
        const gridBubbles = this.getGridBubbles();
        const objectiveBubbles = gridBubbles.filter(b => {
            const distance = Math.sqrt(
                Math.pow(b.x - objectiveX, 2) +
                Math.pow(b.y - objectiveY, 2)
            );
            return distance < 150; // Bubbles near objective
        });
        
        if (objectiveBubbles.length === 0) {
            return null; // Path already clear
        }
        
        // Group objective bubbles by color
        const colorGroups = new Map<BubbleColor, Bubble[]>();
        objectiveBubbles.forEach(bubble => {
            const color = bubble.getColor();
            if (color !== null && color !== undefined) {
                if (!colorGroups.has(color)) {
                    colorGroups.set(color, []);
                }
                colorGroups.get(color)!.push(bubble);
            }
        });
        
        // Find best shot to clear objective area
        let bestShot: ITargetOption | null = null;
        let bestScore = 0;
        
        colorGroups.forEach((bubbles, color) => {
            if (bubbles.length >= 2) {
                // Look for positions that would complete matches
                bubbles.forEach(bubble => {
                    const pos = bubble.getGridPosition();
                    if (pos) {
                        const neighbors = this.bubbleGrid.getNeighbors(pos);
                        
                        for (const neighbor of neighbors) {
                            if (!this.isPositionOccupied(neighbor)) {
                                const adjacentCount = this.countAdjacentSameColor(neighbor, color);
                                
                                if (adjacentCount >= 2) {
                                    const pixelPos = this.bubbleGrid.hexToPixel(neighbor);
                                    const chainScore = this.predictChainReaction(neighbor, color);
                                    const score = 250 + adjacentCount * 30 + chainScore; // High priority
                                    
                                    if (score > bestScore) {
                                        bestScore = score;
                                        bestShot = {
                                            position: pixelPos,
                                            hexPosition: neighbor,
                                            score: score,
                                            color: color,
                                            reasoning: `Clear objective area - ${adjacentCount + 1} ${this.getColorName(color)}`,
                                            matchCount: adjacentCount + 1
                                        };
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
        
        return bestShot;
    }
    
    private isTrajectoryValid(target: ITargetOption): boolean {
        // Skip validation for bounce shots - they're pre-calculated
        if ((target as any).bounceAngle !== undefined) {
            return true;
        }
        
        // Check if there's a clear path from launcher to target
        const startX = this.launcher.x;
        const startY = this.launcher.y;
        const endX = target.position.x;
        const endY = target.position.y;
        
        // Get all bubbles in the grid
        const gridBubbles = this.getGridBubbles();
        
        // Always validate if there are bubbles
        if (gridBubbles.length === 0) {
            return true; // No obstacles
        }
        
        // PROPER collision detection along the path
        const bubbleRadius = 18; // Actual bubble radius from BUBBLE_CONFIG.SIZE / 2
        const safetyMargin = 5; // Small safety margin
        const collisionRadius = bubbleRadius + safetyMargin; // Total: 23 pixels
        
        // Check more points for better accuracy
        const steps = 20;
        const stepSize = 1.0 / steps;
        
        // Start from step 1 to avoid checking launcher position
        for (let i = 1; i <= steps; i++) {
            const t = i * stepSize;
            const checkX = startX + (endX - startX) * t;
            const checkY = startY + (endY - startY) * t;
            
            // Check collision with each bubble
            for (const bubble of gridBubbles) {
                const distance = Math.sqrt(
                    Math.pow(bubble.x - checkX, 2) +
                    Math.pow(bubble.y - checkY, 2)
                );
                
                // Check if trajectory passes through this bubble
                if (distance < collisionRadius * 2) { // Bubble diameter
                    // Check if this bubble is at/near the target (intended hit)
                    const targetDistance = Math.sqrt(
                        Math.pow(endX - bubble.x, 2) +
                        Math.pow(endY - bubble.y, 2)
                    );
                    
                    // If bubble is not the target, path is BLOCKED
                    if (targetDistance > bubbleRadius * 3) { // Not the target bubble
                        console.log(`AI: Path blocked by bubble at (${bubble.x.toFixed(0)}, ${bubble.y.toFixed(0)})`);
                        return false; // Path is blocked
                    }
                }
            }
        }
        
        return true; // Path is clear
    }
    
    private findAlternativeShot(preferredColor: BubbleColor): ITargetOption | null {
        // Quick alternative without full grid analysis for performance
        const screenWidth = this.scene.cameras.main.width;
        const centerY = this.scene.cameras.main.centerY;
        
        // Try a few quick alternatives
        const alternatives = [
            { x: screenWidth * 0.3, y: centerY - 50 },
            { x: screenWidth * 0.7, y: centerY - 50 },
            { x: screenWidth * 0.5, y: centerY },
            { x: screenWidth * 0.4, y: centerY + 100 },
            { x: screenWidth * 0.6, y: centerY + 100 }
        ];
        
        // Shuffle for variety
        alternatives.sort(() => Math.random() - 0.5);
        
        for (const alt of alternatives) {
            const target: ITargetOption = {
                position: { x: alt.x + (Math.random() - 0.5) * 40, y: alt.y + (Math.random() - 0.5) * 40 },
                score: 50,
                color: preferredColor,
                reasoning: 'Quick alternative'
            };
            
            if (this.isTrajectoryValid(target)) {
                return target;
            }
        }
        
        // Try bounce shots as alternative
        // (screenWidth and centerY already declared above)
        
        // Try left wall bounce
        const leftBounceTarget: ITargetOption = {
            position: { x: screenWidth * 0.7, y: centerY + 100 },
            score: 30,
            color: preferredColor,
            reasoning: 'Alternative bounce shot (left)',
            bounceAngle: 45 // Shoot toward left wall
        } as any;
        
        if (this.isTrajectoryValid(leftBounceTarget)) {
            return leftBounceTarget;
        }
        
        // Try right wall bounce
        const rightBounceTarget: ITargetOption = {
            position: { x: screenWidth * 0.3, y: centerY + 100 },
            score: 30,
            color: preferredColor,
            reasoning: 'Alternative bounce shot (right)',
            bounceAngle: 135 // Shoot toward right wall
        } as any;
        
        if (this.isTrajectoryValid(rightBounceTarget)) {
            return rightBounceTarget;
        }
        
        // Last resort: find any open area
        const openAreaTarget = this.findOpenArea();
        if (openAreaTarget) {
            openAreaTarget.color = preferredColor;
            return openAreaTarget;
        }
        
        return null;
    }
    
    private findOpenArea(): ITargetOption | null {
        // Find areas with fewer bubbles
        const screenWidth = this.scene.cameras.main.width;
        const centerY = this.scene.cameras.main.centerY;
        const gridBubbles = this.getGridBubbles();
        
        // Divide screen into more varied zones
        const zones = [
            { x: screenWidth * 0.2, y: centerY - 50, density: 0 },
            { x: screenWidth * 0.5, y: centerY, density: 0 },
            { x: screenWidth * 0.8, y: centerY - 50, density: 0 },
            { x: screenWidth * 0.35, y: centerY + 100, density: 0 },
            { x: screenWidth * 0.65, y: centerY + 100, density: 0 },
            { x: screenWidth * 0.3, y: centerY + 50, density: 0 },
            { x: screenWidth * 0.7, y: centerY + 50, density: 0 }
        ];
        
        // Count bubbles near each zone
        for (const zone of zones) {
            for (const bubble of gridBubbles) {
                const distance = Math.sqrt(
                    Math.pow(bubble.x - zone.x, 2) +
                    Math.pow(bubble.y - zone.y, 2)
                );
                if (distance < 100) {
                    zone.density++;
                }
            }
        }
        
        // Sort by lowest density
        zones.sort((a, b) => a.density - b.density);
        
        // Return least dense zone if path is clear
        for (const zone of zones) {
            const target: ITargetOption = {
                position: { x: zone.x, y: zone.y },
                score: 20,
                color: this.getVariedColor(),
                reasoning: 'Open area shot'
            };
            
            if (this.isTrajectoryValid(target)) {
                return target;
            }
        }
        
        return null;
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