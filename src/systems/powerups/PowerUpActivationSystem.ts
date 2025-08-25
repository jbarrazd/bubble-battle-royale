import { Scene } from 'phaser';
import { PowerUpType } from './PowerUpManager';
import { 
    PowerUpContext, 
    RainbowEffect, 
    LaserSightEffect, 
    BombEffect, 
    LightningEffect, 
    FreezeEffect, 
    MultiShotEffect,
    IPowerUpEffect 
} from './PowerUpEffectsLibrary';
import { AimingModeSystem, AimingMode } from './AimingModeSystem';
import { Launcher } from '@/gameObjects/Launcher';
import { BubbleGrid } from '@/systems/gameplay/BubbleGrid';

export class PowerUpActivationSystem {
    private scene: Scene;
    private effects: Map<PowerUpType, IPowerUpEffect>;
    private activeEffect?: IPowerUpEffect;
    private context: PowerUpContext;
    
    constructor(
        scene: Scene, 
        launcher: Launcher, 
        bubbleGrid: BubbleGrid,
        aimingModeSystem: AimingModeSystem
    ) {
        this.scene = scene;
        
        // Initialize context
        this.context = {
            scene,
            launcher,
            aimingMode: aimingModeSystem,
            bubbleGrid
        };
        
        // Initialize effects
        this.effects = new Map([
            [PowerUpType.RAINBOW, new RainbowEffect()],
            [PowerUpType.LASER, new LaserSightEffect()],
            [PowerUpType.BOMB, new BombEffect()],
            [PowerUpType.LIGHTNING, new LightningEffect()],
            [PowerUpType.FREEZE, new FreezeEffect()],
            [PowerUpType.MULTIPLIER, new MultiShotEffect()]
        ]);
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for power-up activation from inventory
        this.scene.events.on('activate-power-up', (data: { type: PowerUpType }) => {
            this.activatePowerUp(data.type);
        });
    }
    
    public activatePowerUp(type: PowerUpType): void {
        // Deactivate current effect if any
        if (this.activeEffect && this.activeEffect.deactivate) {
            this.activeEffect.deactivate(this.context);
        }
        
        // Reset aiming mode to normal first
        this.context.aimingMode.setMode(AimingMode.NORMAL);
        
        // Get the effect
        const effect = this.effects.get(type);
        if (!effect) {
            console.warn(`Power-up effect not found for type: ${type}`);
            return;
        }
        
        // Activate the new effect
        console.log(`Activating power-up effect: ${type}`);
        this.activeEffect = effect;
        effect.activate(this.context);
        
        // Visual feedback
        this.showActivationFeedback(type);
    }
    
    private showActivationFeedback(type: PowerUpType): void {
        // Create activation text
        const powerUpNames: Record<PowerUpType, string> = {
            [PowerUpType.RAINBOW]: 'RAINBOW MODE!',
            [PowerUpType.LASER]: 'LASER SIGHT!',
            [PowerUpType.BOMB]: 'BOMB READY!',
            [PowerUpType.LIGHTNING]: 'LIGHTNING STRIKE!',
            [PowerUpType.FREEZE]: 'FREEZE TIME!',
            [PowerUpType.MULTIPLIER]: 'MULTI-SHOT!',
            [PowerUpType.SHIELD]: 'SHIELD UP!',
            [PowerUpType.MAGNET]: 'MAGNET ON!'
        };
        
        const text = this.scene.add.text(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY - 100,
            powerUpNames[type] || 'POWER-UP!',
            {
                fontSize: '32px',
                fontFamily: 'Arial Black',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        text.setOrigin(0.5);
        text.setDepth(1000);
        
        // Animate
        this.scene.tweens.add({
            targets: text,
            scale: { from: 0, to: 1.2 },
            alpha: { from: 1, to: 0 },
            y: text.y - 50,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => {
                text.destroy();
            }
        });
        
        // Screen flash effect
        this.scene.cameras.main.flash(250, 255, 215, 0);
    }
    
    public update(delta: number): void {
        // Update active effect if it has an update method
        if (this.activeEffect && this.activeEffect.update) {
            this.activeEffect.update(this.context, delta);
        }
    }
    
    public destroy(): void {
        // Clean up
        if (this.activeEffect && this.activeEffect.deactivate) {
            this.activeEffect.deactivate(this.context);
        }
        this.effects.clear();
    }
}