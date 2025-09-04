import { Scene } from 'phaser';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class GemCounterUI {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    
    // Player gem display
    private playerGemIcon: Phaser.GameObjects.Polygon;
    private playerGemText: Phaser.GameObjects.Text;
    private playerGemGlow: Phaser.GameObjects.Circle;
    
    // Opponent gem display
    private opponentGemIcon: Phaser.GameObjects.Polygon;
    private opponentGemText: Phaser.GameObjects.Text;
    private opponentGemGlow: Phaser.GameObjects.Circle;
    
    // Animation tweens
    private playerPulseTween?: Phaser.Tweens.Tween;
    private opponentPulseTween?: Phaser.Tweens.Tween;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.container = scene.add.container(0, 0);
        this.container.setDepth(Z_LAYERS.UI + 10);
        
        this.createPlayerGemDisplay();
        this.createOpponentGemDisplay();
        this.setupEventListeners();
    }
    
    private createPlayerGemDisplay(): void {
        const x = 100;
        const y = this.scene.cameras.main.height - 50;
        
        // Background panel
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-60, -25, 120, 50, 10);
        
        // Glow effect
        this.playerGemGlow = this.scene.add.circle(0, 0, 20, 0xFFD700, 0.3);
        
        // Gem icon (diamond shape)
        const points = this.createGemPoints(4, 15);
        this.playerGemIcon = this.scene.add.polygon(0, 0, points, 0xFFD700);
        this.playerGemIcon.setStrokeStyle(2, 0xFFFFFF, 1);
        
        // Gem count text
        this.playerGemText = this.scene.add.text(30, 0, '0', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.playerGemText.setOrigin(0, 0.5);
        
        // Add all to container
        const playerContainer = this.scene.add.container(x, y, [
            bg,
            this.playerGemGlow,
            this.playerGemIcon,
            this.playerGemText
        ]);
        this.container.add(playerContainer);
        
        // Add floating animation
        this.scene.tweens.add({
            targets: this.playerGemIcon,
            angle: 360,
            duration: 10000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    private createOpponentGemDisplay(): void {
        const x = this.scene.cameras.main.width - 100;
        const y = 50;
        
        // Background panel
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-60, -25, 120, 50, 10);
        
        // Glow effect
        this.opponentGemGlow = this.scene.add.circle(0, 0, 20, 0xFFD700, 0.3);
        
        // Gem icon (diamond shape)
        const points = this.createGemPoints(4, 15);
        this.opponentGemIcon = this.scene.add.polygon(0, 0, points, 0xFF0033);
        this.opponentGemIcon.setStrokeStyle(2, 0xFFFFFF, 1);
        
        // Gem count text
        this.opponentGemText = this.scene.add.text(30, 0, '0', {
            fontSize: '24px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        });
        this.opponentGemText.setOrigin(0, 0.5);
        
        // Add all to container
        const opponentContainer = this.scene.add.container(x, y, [
            bg,
            this.opponentGemGlow,
            this.opponentGemIcon,
            this.opponentGemText
        ]);
        this.container.add(opponentContainer);
        
        // Add floating animation
        this.scene.tweens.add({
            targets: this.opponentGemIcon,
            angle: -360,
            duration: 10000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    private createGemPoints(sides: number, radius: number): number[] {
        const points: number[] = [];
        const angleStep = (Math.PI * 2) / sides;
        
        for (let i = 0; i < sides; i++) {
            const angle = angleStep * i - Math.PI / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            points.push(x, y);
        }
        
        return points;
    }
    
    private setupEventListeners(): void {
        // Listen for gem updates
        this.scene.events.on('gems-updated', this.handleGemsUpdated, this);
        
        // Cleanup on scene shutdown
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private handleGemsUpdated(data: { playerGems: number; opponentGems: number; total: number }): void {
        // Update player gems
        const prevPlayerGems = parseInt(this.playerGemText.text);
        this.playerGemText.setText(data.playerGems.toString());
        
        if (data.playerGems > prevPlayerGems) {
            this.animateGemIncrease(true);
        }
        
        // Update opponent gems
        const prevOpponentGems = parseInt(this.opponentGemText.text);
        this.opponentGemText.setText(data.opponentGems.toString());
        
        if (data.opponentGems > prevOpponentGems) {
            this.animateGemIncrease(false);
        }
    }
    
    private animateGemIncrease(isPlayer: boolean): void {
        const icon = isPlayer ? this.playerGemIcon : this.opponentGemIcon;
        const glow = isPlayer ? this.playerGemGlow : this.opponentGemGlow;
        const text = isPlayer ? this.playerGemText : this.opponentGemText;
        
        // Stop existing pulse if any
        if (isPlayer && this.playerPulseTween) {
            this.playerPulseTween.stop();
        } else if (!isPlayer && this.opponentPulseTween) {
            this.opponentPulseTween.stop();
        }
        
        // Pulse effect
        const pulseTween = this.scene.tweens.add({
            targets: [icon, glow],
            scale: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                icon.setScale(1);
                glow.setScale(1);
            }
        });
        
        if (isPlayer) {
            this.playerPulseTween = pulseTween;
        } else {
            this.opponentPulseTween = pulseTween;
        }
        
        // Text pop
        this.scene.tweens.add({
            targets: text,
            scale: 1.5,
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut'
        });
        
        // Flash effect
        const flash = this.scene.add.circle(
            icon.x,
            icon.y,
            20,
            0xFFD700,
            0.5
        );
        flash.setDepth(icon.depth - 1);
        
        this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
    }
    
    public reset(): void {
        this.playerGemText.setText('0');
        this.opponentGemText.setText('0');
    }
    
    public show(): void {
        this.container.setVisible(true);
    }
    
    public hide(): void {
        this.container.setVisible(false);
    }
    
    public destroy(): void {
        if (this.playerPulseTween) {
            this.playerPulseTween.stop();
        }
        if (this.opponentPulseTween) {
            this.opponentPulseTween.stop();
        }
        
        this.scene.events.off('gems-updated', this.handleGemsUpdated, this);
        this.scene.events.off('shutdown', this.destroy, this);
        
        this.container.destroy();
    }
}