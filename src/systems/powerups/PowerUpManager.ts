import { Scene } from 'phaser';
import { ScoreEventManager, ScoreEventType } from '../scoring/ScoreEventManager';

// Power-up types
export enum PowerUpType {
    BOMB = 'bomb',           // Explodes in area
    LASER = 'laser',         // Destroys entire line
    RAINBOW = 'rainbow',     // Matches any color
    MULTIPLIER = 'multiplier', // Score multiplier
    FREEZE = 'freeze',       // Slows down time
    LIGHTNING = 'lightning', // Chain reaction
    MAGNET = 'magnet',      // Attracts bubbles
    SHIELD = 'shield'       // Protection from danger
}

// Power-up configuration
export interface PowerUpConfig {
    type: PowerUpType;
    name: string;
    description: string;
    icon: string;
    color: number;
    rarity: number; // 1-5 (common to legendary)
    duration?: number; // For time-based power-ups
    radius?: number; // For area effects
    power?: number; // Effect strength
}

// Power-up instance
export interface PowerUp {
    id: string;
    type: PowerUpType;
    config: PowerUpConfig;
    active: boolean;
    position?: { x: number; y: number };
    owner: 'player' | 'opponent';
    activatedAt?: number;
    expiresAt?: number;
}

// Power-up effect handler
export interface IPowerUpEffect {
    type: PowerUpType;
    canActivate(powerUp: PowerUp, target?: any): boolean;
    activate(powerUp: PowerUp, target?: any): void;
    update?(powerUp: PowerUp, delta: number): void;
    deactivate(powerUp: PowerUp): void;
}

export class PowerUpManager {
    private scene: Scene;
    private scoreEventManager?: ScoreEventManager;
    private powerUps: Map<string, PowerUp> = new Map();
    private effects: Map<PowerUpType, IPowerUpEffect> = new Map();
    private activePowerUps: PowerUp[] = [];
    
    // Power-up configurations
    private readonly POWER_UP_CONFIGS: Map<PowerUpType, PowerUpConfig> = new Map([
        [PowerUpType.BOMB, {
            type: PowerUpType.BOMB,
            name: 'Bomb',
            description: 'Explodes bubbles in area',
            icon: '💣',
            color: 0xFF4500,
            rarity: 2,
            radius: 100,
            power: 3
        }],
        [PowerUpType.LASER, {
            type: PowerUpType.LASER,
            name: 'Laser',
            description: 'Destroys entire line',
            icon: '⚡',
            color: 0x00FFFF,
            rarity: 3,
            power: 5
        }],
        [PowerUpType.RAINBOW, {
            type: PowerUpType.RAINBOW,
            name: 'Rainbow',
            description: 'Matches any color',
            icon: '🌈',
            color: 0xFF69B4,
            rarity: 4,
            duration: 10000
        }],
        [PowerUpType.MULTIPLIER, {
            type: PowerUpType.MULTIPLIER,
            name: 'Score x2',
            description: 'Doubles score for 30 seconds',
            icon: '✨',
            color: 0xFFD700,
            rarity: 3,
            duration: 30000,
            power: 2
        }],
        [PowerUpType.FREEZE, {
            type: PowerUpType.FREEZE,
            name: 'Freeze',
            description: 'Slows down time',
            icon: '❄️',
            color: 0x87CEEB,
            rarity: 2,
            duration: 15000,
            power: 0.5
        }],
        [PowerUpType.LIGHTNING, {
            type: PowerUpType.LIGHTNING,
            name: 'Lightning',
            description: 'Chain reaction destruction',
            icon: '⚡',
            color: 0xFFFF00,
            rarity: 5,
            power: 7
        }],
        [PowerUpType.MAGNET, {
            type: PowerUpType.MAGNET,
            name: 'Magnet',
            description: 'Attracts matching bubbles',
            icon: '🧲',
            color: 0x808080,
            rarity: 3,
            duration: 20000,
            radius: 150
        }],
        [PowerUpType.SHIELD, {
            type: PowerUpType.SHIELD,
            name: 'Shield',
            description: 'Protection from danger',
            icon: '🛡️',
            color: 0x4169E1,
            rarity: 4,
            duration: 45000
        }]
    ]);
    
    constructor(scene: Scene, scoreEventManager?: ScoreEventManager) {
        this.scene = scene;
        this.scoreEventManager = scoreEventManager;
        this.initializeEffects();
    }
    
    private initializeEffects(): void {
        // Register default power-up effects
        this.registerEffect(new BombEffect(this.scene));
        this.registerEffect(new MultiplierEffect(this.scene));
        // Add more effects as needed
    }
    
    public registerEffect(effect: IPowerUpEffect): void {
        this.effects.set(effect.type, effect);
    }
    
    public createPowerUp(type: PowerUpType, owner: 'player' | 'opponent', position?: { x: number; y: number }): PowerUp | null {
        const config = this.POWER_UP_CONFIGS.get(type);
        if (!config) return null;
        
        const powerUp: PowerUp = {
            id: `${type}_${Date.now()}_${Math.random()}`,
            type,
            config,
            active: false,
            owner,
            position
        };
        
        this.powerUps.set(powerUp.id, powerUp);
        return powerUp;
    }
    
    public activatePowerUp(powerUpId: string, target?: any): boolean {
        const powerUp = this.powerUps.get(powerUpId);
        if (!powerUp || powerUp.active) return false;
        
        const effect = this.effects.get(powerUp.type);
        if (!effect || !effect.canActivate(powerUp, target)) return false;
        
        // Mark as active
        powerUp.active = true;
        powerUp.activatedAt = Date.now();
        
        // Set expiration if duration-based
        if (powerUp.config.duration) {
            powerUp.expiresAt = Date.now() + powerUp.config.duration;
        }
        
        // Add to active list
        this.activePowerUps.push(powerUp);
        
        // Activate effect
        effect.activate(powerUp, target);
        
        // Emit event for scoring
        if (this.scoreEventManager) {
            this.scoreEventManager.queueEvent({
                type: ScoreEventType.POWER_UP,
                baseValue: 100, // Base points for using power-up
                position: powerUp.position || { x: 0, y: 0 },
                isPlayer: powerUp.owner === 'player',
                metadata: {
                    powerUpType: powerUp.type,
                    rarity: powerUp.config.rarity
                }
            });
        }
        
        // Show activation feedback
        this.showActivationFeedback(powerUp);
        
        return true;
    }
    
    private showActivationFeedback(powerUp: PowerUp): void {
        if (!powerUp.position) return;
        
        // Create activation visual
        const flash = this.scene.add.graphics();
        flash.fillStyle(powerUp.config.color, 0.5);
        flash.fillCircle(0, 0, 50);
        flash.setPosition(powerUp.position.x, powerUp.position.y);
        flash.setDepth(1500);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        // Animate
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 3,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Show power-up name
        const text = this.scene.add.text(
            powerUp.position.x,
            powerUp.position.y - 30,
            powerUp.config.name.toUpperCase(),
            {
                fontSize: '28px',
                color: '#FFFFFF',
                fontFamily: 'Arial Black',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        text.setOrigin(0.5);
        text.setDepth(1501);
        
        this.scene.tweens.add({
            targets: text,
            y: text.y - 50,
            alpha: 0,
            scale: 1.5,
            duration: 1000,
            ease: 'Power2.easeOut',
            onComplete: () => {
                text.destroy();
            }
        });
    }
    
    public update(delta: number): void {
        const now = Date.now();
        
        // Update active power-ups
        this.activePowerUps = this.activePowerUps.filter(powerUp => {
            // Check expiration
            if (powerUp.expiresAt && now >= powerUp.expiresAt) {
                this.deactivatePowerUp(powerUp);
                return false;
            }
            
            // Update effect
            const effect = this.effects.get(powerUp.type);
            if (effect && effect.update) {
                effect.update(powerUp, delta);
            }
            
            return powerUp.active;
        });
    }
    
    private deactivatePowerUp(powerUp: PowerUp): void {
        powerUp.active = false;
        
        const effect = this.effects.get(powerUp.type);
        if (effect) {
            effect.deactivate(powerUp);
        }
        
        // Remove from active list
        const index = this.activePowerUps.indexOf(powerUp);
        if (index > -1) {
            this.activePowerUps.splice(index, 1);
        }
    }
    
    public getActivePowerUps(owner?: 'player' | 'opponent'): PowerUp[] {
        if (owner) {
            return this.activePowerUps.filter(p => p.owner === owner);
        }
        return [...this.activePowerUps];
    }
    
    public hasActivePowerUp(type: PowerUpType, owner?: 'player' | 'opponent'): boolean {
        return this.activePowerUps.some(p => 
            p.type === type && (!owner || p.owner === owner)
        );
    }
    
    public reset(): void {
        // Deactivate all power-ups
        this.activePowerUps.forEach(powerUp => {
            this.deactivatePowerUp(powerUp);
        });
        
        this.powerUps.clear();
        this.activePowerUps = [];
    }
    
    public destroy(): void {
        this.reset();
        this.effects.clear();
    }
}

// Example Power-Up Effects

class BombEffect implements IPowerUpEffect {
    type = PowerUpType.BOMB;
    private scene: Scene;
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    canActivate(powerUp: PowerUp, target?: any): boolean {
        return powerUp.position !== undefined;
    }
    
    activate(powerUp: PowerUp, target?: any): void {
        if (!powerUp.position) return;
        
        const radius = powerUp.config.radius || 100;
        
        // Create explosion visual
        const explosion = this.scene.add.circle(
            powerUp.position.x,
            powerUp.position.y,
            radius,
            0xFF4500,
            0.3
        );
        explosion.setDepth(1000);
        
        this.scene.tweens.add({
            targets: explosion,
            scale: { from: 0, to: 1 },
            alpha: { from: 0.8, to: 0 },
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                explosion.destroy();
            }
        });
        
        // Emit event to destroy bubbles in radius
        this.scene.events.emit('bomb-exploded', {
            position: powerUp.position,
            radius,
            owner: powerUp.owner
        });
    }
    
    deactivate(powerUp: PowerUp): void {
        // Bomb is instant, no deactivation needed
    }
}

class MultiplierEffect implements IPowerUpEffect {
    type = PowerUpType.MULTIPLIER;
    private scene: Scene;
    private originalMultiplier: number = 1;
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    canActivate(powerUp: PowerUp): boolean {
        return true;
    }
    
    activate(powerUp: PowerUp): void {
        // Store original multiplier and apply new one
        const multiplier = powerUp.config.power || 2;
        
        // Emit event to apply multiplier
        this.scene.events.emit('score-multiplier-changed', {
            multiplier,
            owner: powerUp.owner
        });
        
        // Show multiplier indicator
        if (powerUp.owner === 'player') {
            this.showMultiplierIndicator(multiplier);
        }
    }
    
    update(powerUp: PowerUp, delta: number): void {
        // Could show remaining time
        if (powerUp.expiresAt) {
            const remaining = Math.max(0, powerUp.expiresAt - Date.now());
            // Update UI with remaining time
        }
    }
    
    deactivate(powerUp: PowerUp): void {
        // Reset multiplier
        this.scene.events.emit('score-multiplier-changed', {
            multiplier: 1,
            owner: powerUp.owner
        });
    }
    
    private showMultiplierIndicator(multiplier: number): void {
        const indicator = this.scene.add.text(
            this.scene.cameras.main.centerX,
            100,
            `SCORE x${multiplier}`,
            {
                fontSize: '32px',
                color: '#FFD700',
                fontFamily: 'Arial Black',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        indicator.setOrigin(0.5);
        indicator.setDepth(1500);
        
        this.scene.tweens.add({
            targets: indicator,
            scale: { from: 0, to: 1.2 },
            duration: 500,
            ease: 'Back.easeOut',
            yoyo: true,
            hold: 1000,
            onComplete: () => {
                indicator.destroy();
            }
        });
    }
}