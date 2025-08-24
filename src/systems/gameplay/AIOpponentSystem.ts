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
    score: number;
    color: BubbleColor;
    reasoning: string;
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
            return this.findSimpleMatch() || this.getRandomTarget();
        }
    }
    
    private selectMediumTarget(): ITargetOption | null {
        // Medium: More strategic, looks for matches and occasionally blocks
        const random = Math.random();
        
        if (random < 0.3) {
            return this.getRandomTarget();
        } else if (random < 0.8) {
            return this.findBestMatch() || this.getRandomTarget();
        } else {
            return this.findBlockingShot() || this.findBestMatch() || this.getRandomTarget();
        }
    }
    
    private selectHardTarget(): ITargetOption | null {
        // Hard: Optimal play with minimax-style decisions
        const bestMatch = this.findBestMatch();
        const blockingShot = this.findBlockingShot();
        
        // Prioritize high-value matches
        if (bestMatch && bestMatch.score >= 30) {
            return bestMatch;
        }
        
        // Block opponent if critical
        if (blockingShot && blockingShot.score >= 25) {
            return blockingShot;
        }
        
        // Otherwise take best available option
        return bestMatch || blockingShot || this.getRandomTarget();
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
    
    private findSimpleMatch(): ITargetOption | null {
        // Look for groups of 2 same-colored bubbles to complete
        // This is a simplified version - you'd analyze the grid
        const centerX = this.scene.cameras.main.centerX;
        const targetY = this.scene.cameras.main.centerY + 100;
        
        return {
            position: { x: centerX, y: targetY },
            score: 15,
            color: Bubble.getRandomColor(),
            reasoning: 'Attempting simple match'
        };
    }
    
    private findBestMatch(): ITargetOption | null {
        // Analyze grid for best matching opportunity
        // This would involve checking color frequencies and positions
        const centerX = this.scene.cameras.main.centerX;
        const targetY = this.scene.cameras.main.centerY + 80;
        
        return {
            position: { x: centerX - 30, y: targetY },
            score: 25,
            color: Bubble.getRandomColor(),
            reasoning: 'Best match opportunity'
        };
    }
    
    private findBlockingShot(): ITargetOption | null {
        // Look for player's potential matches and block them
        // This would analyze the bottom half of the grid
        const centerX = this.scene.cameras.main.centerX;
        const targetY = this.scene.cameras.main.centerY + 120;
        
        return {
            position: { x: centerX + 40, y: targetY },
            score: 20,
            color: Bubble.getRandomColor(),
            reasoning: 'Blocking player match'
        };
    }
    
    private shoot(target: ITargetOption): void {
        if (!this.shootingSystem) return;
        
        // Calculate angle from launcher to target
        const angle = Phaser.Math.Angle.Between(
            this.launcher.x,
            this.launcher.y,
            target.position.x,
            target.position.y
        );
        
        // Convert to degrees and adjust for launcher orientation
        const degrees = Phaser.Math.RadToDeg(angle) + 90;
        
        // Set launcher aim
        this.launcher.setAimAngle(degrees);
        
        // Load bubble with selected color
        this.launcher.loadBubble(target.color);
        
        // Shoot using the shooting system
        this.scene.events.emit('ai-shoot', {
            angle: degrees,
            color: target.color,
            launcher: this.launcher
        });
        
        // Play launcher animation
        this.launcher.animateShoot();
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