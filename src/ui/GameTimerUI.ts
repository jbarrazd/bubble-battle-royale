import { Scene } from 'phaser';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class GameTimerUI {
    private scene: Scene;
    private container!: Phaser.GameObjects.Container;
    private timerText!: Phaser.GameObjects.Text;
    private suddenDeathText?: Phaser.GameObjects.Text;
    private background!: Phaser.GameObjects.Graphics;
    
    private readonly GAME_DURATION = 180000; // 3 minutes
    private readonly SUDDEN_DEATH_TIME = 150000; // 2:30
    private startTime: number;
    private isInSuddenDeath: boolean = false;
    private pulseTimer?: Phaser.Tweens.Tween;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.startTime = Date.now();
        this.create();
        this.setupEventListeners();
    }
    
    private create(): void {
        // Container at top center of screen
        this.container = this.scene.add.container(
            this.scene.cameras.main.centerX,
            40
        );
        this.container.setDepth(Z_LAYERS.UI + 1);
        
        // Background for timer
        this.background = this.scene.add.graphics();
        this.background.fillStyle(0x000000, 0.7);
        this.background.fillRoundedRect(-80, -20, 160, 40, 10);
        this.container.add(this.background);
        
        // Timer text
        this.timerText = this.scene.add.text(0, 0, '3:00', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.timerText.setOrigin(0.5);
        this.container.add(this.timerText);
    }
    
    private setupEventListeners(): void {
        // Listen for sudden death event
        this.scene.events.on('sudden-death-started', this.enterSuddenDeath, this);
        
        // Cleanup
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    public update(): void {
        const elapsed = Date.now() - this.startTime;
        const remaining = Math.max(0, this.GAME_DURATION - elapsed);
        
        // Format time as MM:SS
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.timerText.setText(timeString);
        
        // Change color based on time remaining
        if (!this.isInSuddenDeath) {
            if (remaining <= 30000) {
                // Last 30 seconds - red and pulsing
                this.timerText.setColor('#FF0000');
                if (!this.pulseTimer) {
                    this.startPulsing();
                }
            } else if (remaining <= 60000) {
                // Last minute - orange
                this.timerText.setColor('#FFA500');
            } else if (elapsed >= this.SUDDEN_DEATH_TIME - 10000) {
                // 10 seconds before sudden death - yellow warning
                this.timerText.setColor('#FFFF00');
                this.showSuddenDeathWarning();
            } else {
                // Normal - white
                this.timerText.setColor('#FFFFFF');
            }
        }
    }
    
    private showSuddenDeathWarning(): void {
        if (this.suddenDeathText || this.isInSuddenDeath) return;
        
        const elapsed = Date.now() - this.startTime;
        const timeToSuddenDeath = Math.max(0, this.SUDDEN_DEATH_TIME - elapsed);
        
        if (timeToSuddenDeath <= 10000 && timeToSuddenDeath > 0) {
            // Show countdown to sudden death
            const seconds = Math.ceil(timeToSuddenDeath / 1000);
            
            this.suddenDeathText = this.scene.add.text(
                0, 30,
                `Sudden Death in ${seconds}...`,
                {
                    fontSize: '18px',
                    fontStyle: 'bold',
                    color: '#FFFF00',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            );
            this.suddenDeathText.setOrigin(0.5);
            this.container.add(this.suddenDeathText);
            
            // Remove after 1 second to update
            this.scene.time.delayedCall(1000, () => {
                if (this.suddenDeathText && !this.isInSuddenDeath) {
                    this.suddenDeathText.destroy();
                    this.suddenDeathText = undefined;
                }
            });
        }
    }
    
    private enterSuddenDeath(): void {
        this.isInSuddenDeath = true;
        
        // Change timer appearance for sudden death
        this.timerText.setColor('#FF0000');
        this.background.clear();
        this.background.fillStyle(0xFF0000, 0.3);
        this.background.fillRoundedRect(-80, -20, 160, 40, 10);
        
        // Add sudden death label
        if (this.suddenDeathText) {
            this.suddenDeathText.destroy();
        }
        
        this.suddenDeathText = this.scene.add.text(
            0, -35,
            'SUDDEN DEATH',
            {
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#FF0000',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.suddenDeathText.setOrigin(0.5);
        this.container.add(this.suddenDeathText);
        
        // Make the whole container pulse
        this.scene.tweens.add({
            targets: this.container,
            scale: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    private startPulsing(): void {
        this.pulseTimer = this.scene.tweens.add({
            targets: this.timerText,
            scale: { from: 1, to: 1.2 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    public destroy(): void {
        this.scene.events.off('sudden-death-started', this.enterSuddenDeath, this);
        
        if (this.pulseTimer) {
            this.pulseTimer.stop();
        }
        
        if (this.container) {
            this.container.destroy();
        }
    }
}