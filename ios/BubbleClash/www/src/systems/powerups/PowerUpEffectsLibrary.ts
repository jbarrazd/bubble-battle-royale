import { Scene } from 'phaser';
import { PowerUpType } from './PowerUpManager';
import { AimingMode, AimingModeSystem } from './AimingModeSystem';
import { Launcher } from '@/gameObjects/Launcher';
import { Bubble } from '@/gameObjects/Bubble';
import { BubbleGrid } from '@/systems/gameplay/BubbleGrid';
import { Z_LAYERS } from '@/config/ArenaConfig';

export interface PowerUpContext {
    scene: Scene;
    launcher: Launcher;
    opponentLauncher?: Launcher;
    aimingMode: AimingModeSystem;
    bubbleGrid: BubbleGrid;
    targetMode?: 'bubbles' | 'castle';
    shotsRemaining?: number;
}

export interface IPowerUpEffect {
    type: PowerUpType;
    activate(context: PowerUpContext): void;
    deactivate?(context: PowerUpContext): void;
    update?(context: PowerUpContext, delta: number): void;
}

/**
 * Rainbow Power-Up: Next bubble matches any color
 */
export class RainbowEffect implements IPowerUpEffect {
    type = PowerUpType.RAINBOW;
    private rainbowBubble?: Bubble;
    private visualElements: any[] = [];
    
    activate(context: PowerUpContext): void {
        // Set aiming mode to rainbow
        context.aimingMode.setMode(AimingMode.RAINBOW, this.type);
        
        // Visual feedback
        const rainbowText = context.scene.add.text(
            context.scene.cameras.main.centerX,
            context.scene.cameras.main.centerY,
            '🌈 RAINBOW BUBBLE!',
            {
                fontSize: '28px',
                fontFamily: 'Arial Black',
                color: '#FF69B4',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        rainbowText.setOrigin(0.5);
        rainbowText.setDepth(1000);
        
        // Animate text
        context.scene.tweens.add({
            targets: rainbowText,
            scale: { from: 0, to: 1.2 },
            alpha: { from: 1, to: 0 },
            y: rainbowText.y - 50,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => rainbowText.destroy()
        });
        
        // Single shot power-up
        context.shotsRemaining = 1;
    }
    
    private applyRainbowEffect(bubble: Bubble): void {
        // Create rainbow shimmer
        const shimmer = bubble.scene.add.graphics();
        shimmer.setDepth(bubble.depth + 1);
        
        // Animated rainbow effect
        bubble.scene.time.addEvent({
            delay: 100,
            callback: () => {
                if (!bubble || !bubble.scene) return;
                
                shimmer.clear();
                const time = Date.now() * 0.001;
                const colors = [0xFF0000, 0xFFFF00, 0x00FF00, 0x00FFFF, 0x0000FF, 0xFF00FF];
                const segments = 6;
                
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    const nextAngle = ((i + 1) / segments) * Math.PI * 2;
                    const colorIndex = Math.floor((time + i) % colors.length);
                    
                    shimmer.lineStyle(2, colors[colorIndex], 0.8);
                    shimmer.beginPath();
                    shimmer.arc(bubble.x, bubble.y, 18, angle, nextAngle);
                    shimmer.strokePath();
                }
            },
            loop: true
        });
        
        // Store shimmer reference for cleanup
        // bubble.setData('rainbowShimmer', shimmer);
    }
    
    deactivate(context: PowerUpContext): void {
        // Clean up rainbow effect
        if (this.rainbowBubble) {
            const shimmer = this.rainbowBubble.getData('rainbowShimmer');
            if (shimmer) {
                shimmer.destroy();
            }
            // this.rainbowBubble.setData('isRainbow', false);
        }
        
        // Reset aiming mode
        context.aimingMode.setMode(AimingMode.NORMAL);
    }
}

/**
 * Laser Sight Power-Up: Extended trajectory preview
 */
export class LaserSightEffect implements IPowerUpEffect {
    type = PowerUpType.LASER;
    private remainingShots: number = 5;
    private visualElements: any[] = [];
    
    activate(context: PowerUpContext): void {
        // Set laser aiming mode
        context.aimingMode.setMode(AimingMode.LASER, this.type);
        
        // 5 shots with enhanced aiming
        this.remainingShots = 5;
        context.shotsRemaining = 5;
        
        // Add UI indicator for remaining shots
        this.createShotCounter(context);
    }
    
    private createShotCounter(context: PowerUpContext): void {
        const counter = context.scene.add.container(100, 100);
        counter.setDepth(Z_LAYERS.UI + 10);
        
        // Background
        const bg = context.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-40, -20, 80, 40, 10);
        counter.add(bg);
        
        // Text
        const text = context.scene.add.text(0, 0, `🎯 ${this.remainingShots}`, {
            fontSize: '20px',
            fontFamily: 'Arial Black',
            color: '#FF0000'
        });
        text.setOrigin(0.5);
        counter.add(text);
        
        // Store reference
        // context.launcher.setData('laserCounter', counter);
        // context.launcher.setData('laserCounterText', text);
    }
    
    update(context: PowerUpContext, delta: number): void {
        // Update shot counter
        const text = context.launcher.getData('laserCounterText') as Phaser.GameObjects.Text;
        if (text && context.shotsRemaining !== undefined) {
            text.setText(`🎯 ${context.shotsRemaining}`);
        }
    }
    
    deactivate(context: PowerUpContext): void {
        // Clean up UI
        const counter = context.launcher.getData('laserCounter');
        if (counter) {
            counter.destroy();
        }
        
        // Reset aiming
        context.aimingMode.setMode(AimingMode.NORMAL);
    }
}

/**
 * Bomb Power-Up: Explosion or castle attack
 */
export class BombEffect implements IPowerUpEffect {
    type = PowerUpType.BOMB;
    private targetMode: 'bubbles' | 'castle' = 'bubbles';
    private visualElements: any[] = [];
    
    activate(context: PowerUpContext): void {
        // Check target mode
        this.targetMode = context.targetMode || 'bubbles';
        
        if (this.targetMode === 'castle' && context.opponentLauncher) {
            // Ballistic mode for castle attack
            context.aimingMode.setMode(AimingMode.BOMB_BALLISTIC, this.type);
            this.prepareBallistic(context);
        } else {
            // Normal bomb mode
            context.aimingMode.setMode(AimingMode.BOMB_NORMAL, this.type);
            this.prepareNormalBomb(context);
        }
        
        context.shotsRemaining = 1;
    }
    
    private prepareNormalBomb(context: PowerUpContext): void {
        // Create AAA bomb ready effect with particles
        const x = context.launcher.x;
        const y = context.launcher.y;
        
        // Create glowing orb effect
        const bombGlow = context.scene.add.graphics();
        bombGlow.setDepth(999);
        this.visualElements.push(bombGlow);
        
        // Animated glow rings
        let glowRadius = 0;
        const glowTimer = context.scene.time.addEvent({
            delay: 50,
            callback: () => {
                bombGlow.clear();
                
                // Multiple rings for depth
                for (let i = 0; i < 3; i++) {
                    const radius = (glowRadius + i * 15) % 60;
                    const alpha = Math.max(0, 1 - radius / 60);
                    bombGlow.lineStyle(3, 0xFF4500, alpha * 0.5);
                    bombGlow.strokeCircle(x, y - 30, radius);
                }
                
                glowRadius = (glowRadius + 2) % 60;
            },
            loop: true
        });
        
        // Create spark particles using circles instead of textures
        const sparkContainer = context.scene.add.container(x, y - 30);
        sparkContainer.setDepth(1000);
        this.visualElements.push(sparkContainer);
        
        // Animated sparks
        const sparkTimer = context.scene.time.addEvent({
            delay: 100,
            callback: () => {
                for (let i = 0; i < 2; i++) {
                    const spark = context.scene.add.circle(
                        0, 0, 
                        Phaser.Math.Between(2, 4),
                        Phaser.Math.RND.pick([0xFF4500, 0xFF6500, 0xFFAA00])
                    );
                    spark.setBlendMode(Phaser.BlendModes.ADD);
                    sparkContainer.add(spark);
                    
                    const angle = Phaser.Math.Between(-110, -70) * Math.PI / 180;
                    const speed = Phaser.Math.Between(100, 200);
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;
                    
                    context.scene.tweens.add({
                        targets: spark,
                        x: spark.x + vx * 0.6,
                        y: spark.y + vy * 0.6,
                        scale: { from: 1, to: 0 },
                        alpha: { from: 1, to: 0 },
                        duration: 600,
                        ease: 'Sine.easeOut',
                        onComplete: () => spark.destroy()
                    });
                }
            },
            loop: true
        });
        (this as any).sparkTimer = sparkTimer;
        
        // Explosive core visualization
        const bombCore = context.scene.add.circle(x, y - 30, 8, 0xFF4500);
        bombCore.setDepth(1001);
        this.visualElements.push(bombCore);
        
        // Pulsing core
        context.scene.tweens.add({
            targets: bombCore,
            scale: { from: 0.8, to: 1.3 },
            alpha: { from: 1, to: 0.6 },
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Text with better styling
        const bombText = context.scene.add.text(x, y - 60, 'BOMB ARMED', {
            fontSize: '14px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF',
            stroke: '#FF4500',
            strokeThickness: 4,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true
            }
        });
        bombText.setOrigin(0.5);
        bombText.setDepth(1002);
        this.visualElements.push(bombText);
        
        // Flash effect
        context.scene.tweens.add({
            targets: bombText,
            alpha: { from: 0, to: 1 },
            scale: { from: 1.5, to: 1 },
            duration: 300,
            ease: 'Back.easeOut'
        });
        
        // Store timer for cleanup
        (this as any).glowTimer = glowTimer;
    }
    
    private prepareBallistic(context: PowerUpContext): void {
        // Set launcher to ballistic mode
        // context.launcher.setData('ballisticMode', true);
        
        if (context.opponentLauncher) {
            // context.launcher.setData('ballisticTarget', {
            //     x: context.opponentLauncher.x,
            //     y: context.opponentLauncher.y
            // });
        }
    }
    
    // Removed unused method - visual feedback handled differently
    
    private explodeAt(x: number, y: number, context: PowerUpContext): void {
        const radius = 120;
        
        // AAA Explosion Effects
        // 1. Shockwave ring
        const shockwave = context.scene.add.graphics();
        shockwave.setDepth(Z_LAYERS.BUBBLES_FRONT - 1);
        
        let shockRadius = 0;
        const shockTimer = context.scene.time.addEvent({
            delay: 20,
            callback: () => {
                shockwave.clear();
                if (shockRadius < radius * 2) {
                    const alpha = Math.max(0, 1 - shockRadius / (radius * 2));
                    shockwave.lineStyle(4, 0xFFFFFF, alpha);
                    shockwave.strokeCircle(x, y, shockRadius);
                    shockwave.lineStyle(8, 0xFF4500, alpha * 0.5);
                    shockwave.strokeCircle(x, y, shockRadius * 0.9);
                    shockRadius += 8;
                } else {
                    shockTimer.destroy();
                    shockwave.destroy();
                }
            },
            loop: true
        });
        
        // 2. Core flash
        const flash = context.scene.add.circle(x, y, radius * 0.3, 0xFFFFFF, 1);
        flash.setDepth(Z_LAYERS.BUBBLES_FRONT);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        context.scene.tweens.add({
            targets: flash,
            scale: { from: 0, to: 4 },
            alpha: { from: 1, to: 0 },
            duration: 300,
            ease: 'Expo.easeOut',
            onComplete: () => flash.destroy()
        });
        
        // 3. Fire burst effect with circles
        const explosionContainer = context.scene.add.container(x, y);
        explosionContainer.setDepth(Z_LAYERS.BUBBLES_FRONT + 1);
        
        // Create explosion particles
        for (let i = 0; i < 30; i++) {
            const particle = context.scene.add.circle(
                0, 0,
                Phaser.Math.Between(3, 6),
                Phaser.Math.RND.pick([0xFFFFFF, 0xFF4500, 0xFF6500, 0xFFAA00])
            );
            particle.setBlendMode(Phaser.BlendModes.ADD);
            explosionContainer.add(particle);
            
            const angle = Phaser.Math.Between(0, 360) * Math.PI / 180;
            const speed = Phaser.Math.Between(200, 400);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            context.scene.tweens.add({
                targets: particle,
                x: vx * 0.8,
                y: vy * 0.8,
                scale: { from: 1, to: 0 },
                alpha: { from: 1, to: 0 },
                duration: 800,
                ease: 'Power3',
                onComplete: () => particle.destroy()
            });
        }
        
        // 4. Debris effect
        const debrisContainer = context.scene.add.container(x, y);
        debrisContainer.setDepth(Z_LAYERS.BUBBLES_FRONT);
        
        for (let i = 0; i < 15; i++) {
            const debris = context.scene.add.rectangle(
                0, 0,
                Phaser.Math.Between(4, 8),
                Phaser.Math.Between(4, 8),
                Phaser.Math.RND.pick([0xFF4500, 0xFF6500, 0xFFAA00])
            );
            debrisContainer.add(debris);
            
            const angle = Phaser.Math.Between(-120, -60) * Math.PI / 180;
            const speed = Phaser.Math.Between(100, 300);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            context.scene.tweens.add({
                targets: debris,
                x: debris.x + vx,
                y: debris.y + vy + 400, // Gravity effect
                scale: { from: 0.3, to: 0.1 },
                angle: Phaser.Math.Between(0, 360),
                duration: 1200,
                ease: 'Quad.easeIn',
                onComplete: () => debris.destroy()
            });
        }
        
        // 5. Smoke effect
        const smokeContainer = context.scene.add.container(x, y);
        smokeContainer.setDepth(Z_LAYERS.BUBBLES_FRONT - 2);
        
        for (let i = 0; i < 8; i++) {
            const smoke = context.scene.add.circle(
                Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(20, 30),
                0x666666
            );
            smoke.setAlpha(0.4);
            smokeContainer.add(smoke);
            
            context.scene.tweens.add({
                targets: smoke,
                scale: { from: 1, to: 2 },
                alpha: 0,
                y: smoke.y - Phaser.Math.Between(20, 50),
                duration: 1500,
                ease: 'Sine.easeOut',
                onComplete: () => smoke.destroy()
            });
        }
        
        // Enhanced camera effects
        context.scene.cameras.main.shake(300, 0.02);
        context.scene.cameras.main.flash(100, 255, 100, 0, true);
        
        // Clean up containers
        context.scene.time.delayedCall(2000, () => {
            explosionContainer.destroy();
            debrisContainer.destroy();
            smokeContainer.destroy();
        });
        
        // Destroy bubbles with chain reaction
        const bubbles = context.bubbleGrid.getBubblesInRadius(x, y, radius);
        bubbles.forEach((bubble, index) => {
            const dist = Phaser.Math.Distance.Between(x, y, bubble.x, bubble.y);
            const delay = (dist / radius) * 200;
            
            context.scene.time.delayedCall(delay, () => {
                if (bubble && bubble.visible) {
                    // Mini explosion per bubble
                    const miniFlash = context.scene.add.circle(bubble.x, bubble.y, 15, 0xFF6500, 0.8);
                    miniFlash.setDepth(Z_LAYERS.BUBBLES_FRONT);
                    context.scene.tweens.add({
                        targets: miniFlash,
                        scale: { from: 0, to: 1.5 },
                        alpha: 0,
                        duration: 200,
                        ease: 'Cubic.easeOut',
                        onComplete: () => miniFlash.destroy()
                    });
                    
                    bubble.destroy();
                }
            });
        });
    }
    
    deactivate(context: PowerUpContext): void {
        // Clean up timers if they exist
        if ((this as any).glowTimer) {
            (this as any).glowTimer.destroy();
            (this as any).glowTimer = null;
        }
        if ((this as any).sparkTimer) {
            (this as any).sparkTimer.destroy();
            (this as any).sparkTimer = null;
        }
        
        // Clean up visual elements
        this.visualElements.forEach(element => {
            if (element && element.destroy) {
                element.destroy();
            }
        });
        this.visualElements = [];
        
        // Reset aiming mode
        context.aimingMode.setMode(AimingMode.NORMAL);
    }
}

/**
 * Lightning Power-Up: Click to destroy bubble
 */
export class LightningEffect implements IPowerUpEffect {
    type = PowerUpType.LIGHTNING;
    private selectionHandler?: Function;
    private visualElements: any[] = [];
    
    activate(context: PowerUpContext): void {
        // Set selection cursor mode
        context.aimingMode.setMode(AimingMode.LIGHTNING, this.type);
        
        // Visual feedback
        const lightningText = context.scene.add.text(
            context.scene.cameras.main.centerX,
            context.scene.cameras.main.centerY,
            '⚡ LIGHTNING STRIKE!',
            {
                fontSize: '28px',
                fontFamily: 'Arial Black',
                color: '#FFFF00',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        lightningText.setOrigin(0.5);
        lightningText.setDepth(1000);
        
        // Animate text
        context.scene.tweens.add({
            targets: lightningText,
            scale: { from: 0, to: 1.2 },
            alpha: { from: 1, to: 0 },
            y: lightningText.y - 50,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => lightningText.destroy()
        });
        
        // For now, just show the effect, actual bubble selection will be implemented later
        context.shotsRemaining = 1;
    }
    
    private destroyWithLightning(bubble: Bubble, context: PowerUpContext): void {
        // Lightning strike visual
        const lightning = context.scene.add.graphics();
        lightning.setDepth(Z_LAYERS.BUBBLES_FRONT + 10);
        
        // Draw lightning bolt from top
        lightning.lineStyle(4, 0xFFFF00, 1);
        lightning.beginPath();
        
        const startY = 0;
        const segments = 5;
        let currentX = bubble.x;
        let currentY = startY;
        
        for (let i = 0; i < segments; i++) {
            const nextX = bubble.x + Phaser.Math.Between(-30, 30);
            const nextY = startY + ((bubble.y - startY) / segments) * (i + 1);
            
            lightning.moveTo(currentX, currentY);
            lightning.lineTo(nextX, nextY);
            
            currentX = nextX;
            currentY = nextY;
        }
        
        lightning.lineTo(bubble.x, bubble.y);
        lightning.strokePath();
        
        // Flash effect
        context.scene.cameras.main.flash(100, 255, 255, 0);
        
        // Destroy bubble
        bubble.destroy();
        
        // Clean up lightning after animation
        context.scene.tweens.add({
            targets: lightning,
            alpha: 0,
            duration: 200,
            onComplete: () => lightning.destroy()
        });
    }
    
    deactivate(context: PowerUpContext): void {
        if (this.selectionHandler) {
            context.scene.input.off('pointerdown', this.selectionHandler as any);
        }
        context.aimingMode.setMode(AimingMode.NORMAL);
    }
}

/**
 * Freeze Power-Up: Stop bubble physics
 */
export class FreezeEffect implements IPowerUpEffect {
    type = PowerUpType.FREEZE;
    private frozenBubbles: Bubble[] = [];
    private frostOverlay?: Phaser.GameObjects.Graphics;
    private visualElements: any[] = [];
    
    activate(context: PowerUpContext): void {
        // Set freeze aiming mode
        context.aimingMode.setMode(AimingMode.FREEZE, this.type);
        
        // Freeze all physics (if physics exists)
        if (context.scene.physics && context.scene.physics.pause) {
            context.scene.physics.pause();
        }
        
        // Create frost overlay
        this.createFrostOverlay(context);
        
        // Store frozen bubbles (empty for now, will be implemented later)
        this.frozenBubbles = [];
        
        // Visual feedback for freeze effect
        const freezeText = context.scene.add.text(
            context.scene.cameras.main.centerX,
            context.scene.cameras.main.centerY,
            'TIME FROZEN!',
            {
                fontSize: '32px',
                fontFamily: 'Arial Black',
                color: '#00FFFF',
                stroke: '#003366',
                strokeThickness: 4
            }
        );
        freezeText.setOrigin(0.5);
        freezeText.setDepth(1000);
        
        // Animate and remove text
        context.scene.tweens.add({
            targets: freezeText,
            scale: { from: 0, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 2000,
            ease: 'Power2',
            onComplete: () => freezeText.destroy()
        });
        
        // Auto-deactivate after 5 seconds
        context.scene.time.delayedCall(5000, () => {
            this.deactivate(context);
        });
    }
    
    private createFrostOverlay(context: PowerUpContext): void {
        this.frostOverlay = context.scene.add.graphics();
        this.frostOverlay.setDepth(Z_LAYERS.UI - 1);
        
        // Semi-transparent blue overlay
        this.frostOverlay.fillStyle(0x87CEEB, 0.2);
        this.frostOverlay.fillRect(
            0, 0,
            context.scene.cameras.main.width,
            context.scene.cameras.main.height
        );
        
        // Add snowflake particles
        for (let i = 0; i < 20; i++) {
            const snowflake = context.scene.add.text(
                Phaser.Math.Between(0, context.scene.cameras.main.width),
                Phaser.Math.Between(0, context.scene.cameras.main.height),
                '❄️',
                { fontSize: '20px' }
            );
            snowflake.setDepth(Z_LAYERS.UI);
            
            context.scene.tweens.add({
                targets: snowflake,
                y: snowflake.y + 100,
                alpha: { from: 1, to: 0 },
                duration: 3000,
                repeat: -1,
                delay: i * 150
            });
            
            // Store for cleanup
            // this.frostOverlay.setData(`snowflake_${i}`, snowflake);
        }
    }
    
    deactivate(context: PowerUpContext): void {
        // Resume physics
        if (context.scene.physics && context.scene.physics.resume) {
            context.scene.physics.resume();
        }
        
        // Remove tint from bubbles
        this.frozenBubbles.forEach(bubble => {
            if (bubble && bubble.scene) {
                bubble.clearTint();
            }
        });
        
        // Clean up overlay
        if (this.frostOverlay) {
            // Clean up snowflakes
            for (let i = 0; i < 20; i++) {
                const snowflake = this.frostOverlay.getData(`snowflake_${i}`);
                if (snowflake) {
                    snowflake.destroy();
                }
            }
            this.frostOverlay.destroy();
        }
        
        // Reset aiming
        context.aimingMode.setMode(AimingMode.NORMAL);
    }
}

/**
 * Multi-Shot Power-Up: Shoot 3 bubbles in spread
 */
export class MultiShotEffect implements IPowerUpEffect {
    type = PowerUpType.MULTIPLIER; // Using as placeholder for MULTI_SHOT
    private visualElements: any[] = [];
    
    activate(context: PowerUpContext): void {
        // Set multi-shot aiming mode
        context.aimingMode.setMode(AimingMode.MULTI, this.type);
        
        // Visual feedback
        const multiText = context.scene.add.text(
            context.scene.cameras.main.centerX,
            context.scene.cameras.main.centerY,
            '✨ MULTI-SHOT!',
            {
                fontSize: '28px',
                fontFamily: 'Arial Black',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 3
            }
        );
        multiText.setOrigin(0.5);
        multiText.setDepth(1000);
        
        // Animate text
        context.scene.tweens.add({
            targets: multiText,
            scale: { from: 0, to: 1.2 },
            alpha: { from: 1, to: 0 },
            y: multiText.y - 50,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => multiText.destroy()
        });
        
        context.shotsRemaining = 1;
    }
    
    deactivate?(context: PowerUpContext): void {
        // Reset aiming mode
        if (context.aimingMode) {
            context.aimingMode.setMode(AimingMode.NORMAL);
        }
    }
}

/**
 * Factory for creating power-up effects
 */
export class PowerUpEffectFactory {
    private effects: Map<PowerUpType, IPowerUpEffect> = new Map();
    
    constructor() {
        // Register all effects
        this.registerEffect(new RainbowEffect());
        this.registerEffect(new LaserSightEffect());
        this.registerEffect(new BombEffect());
        this.registerEffect(new LightningEffect());
        this.registerEffect(new FreezeEffect());
        this.registerEffect(new MultiShotEffect());
    }
    
    private registerEffect(effect: IPowerUpEffect): void {
        this.effects.set(effect.type, effect);
    }
    
    public getEffect(type: PowerUpType): IPowerUpEffect | undefined {
        return this.effects.get(type);
    }
    
    public getAllEffects(): IPowerUpEffect[] {
        return Array.from(this.effects.values());
    }
}