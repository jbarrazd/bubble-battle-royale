/**
 * VisualManager - Manages all visual effects and animations
 * Centralizes particle effects, animations, and visual feedback
 */

import { Scene } from 'phaser';
import { BaseGameSystem } from '@/core/SystemRegistry';
import { GameEventBus } from '@/core/EventBus';
import { getParticlePool } from '@/optimization';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class VisualManager extends BaseGameSystem {
    public name = 'VisualManager';
    public priority = 30; // Lower priority, visual updates can happen after gameplay
    
    private eventBus: GameEventBus;
    private particlePool: any;
    
    // Theme-specific effects
    private currentTheme: string;
    private themeEffects: Map<string, any> = new Map();
    
    // Active effects tracking
    private activeEffects: Set<Phaser.GameObjects.GameObject> = new Set();
    private activeTweens: Set<Phaser.Tweens.Tween> = new Set();
    
    public initialize(): void {
        console.log('  → Initializing VisualManager...');
        
        this.eventBus = GameEventBus.getInstance();
        this.currentTheme = this.scene.registry.get('gameTheme') || 'ocean';
        
        // Initialize particle pool if optimization is enabled
        try {
            this.particlePool = getParticlePool(this.scene);
        } catch (e) {
            console.log('    Particle pool not available, using default particles');
        }
        
        this.setupEventListeners();
        this.markInitialized();
    }
    
    private setupEventListeners(): void {
        // Bubble effects
        this.eventBus.on('bubble-pop', (data) => this.showBubblePopEffect(data));
        this.eventBus.on('bubble-attach', (data) => this.showAttachEffect(data));
        
        // Match and combo effects
        this.eventBus.on('match-cleared', (data) => this.showMatchEffect(data));
        this.eventBus.on('combo-triggered', (data) => this.showComboEffect(data));
        this.eventBus.on('cascade-triggered', (data) => this.showCascadeEffect(data));
        
        // Special effects
        this.eventBus.on('gem-collected', (data) => this.showGemCollectEffect(data));
        this.eventBus.on('powerup-activated', (data) => this.showPowerUpEffect(data));
        this.eventBus.on('danger-warning', (data) => this.showDangerWarning(data));
        
        // Theme changes
        this.eventBus.on('theme-changed', (data) => this.handleThemeChange(data));
    }
    
    /**
     * Show bubble pop effect
     */
    private showBubblePopEffect(data: { x: number, y: number, color: number }): void {
        if (this.particlePool) {
            // Use optimized particle pool
            this.particlePool.createBurstEffect(
                data.x,
                data.y,
                data.color,
                20, // particle count
                300 // duration
            );
        } else {
            // Fallback to simple effect
            this.createSimplePopEffect(data.x, data.y, data.color);
        }
        
        // Add screen shake for big pops
        if (data.color === 0xFFFFFF) { // Mystery bubble
            this.scene.cameras.main.shake(100, 0.005);
        }
    }
    
    /**
     * Show bubble attach effect
     */
    private showAttachEffect(data: { x: number, y: number }): void {
        // Create a simple scale animation
        const circle = this.scene.add.circle(data.x, data.y, 20, 0xFFFFFF, 0.5);
        circle.setDepth(Z_LAYERS.EFFECTS || 500);
        this.activeEffects.add(circle);
        
        const tween = this.scene.tweens.add({
            targets: circle,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                circle.destroy();
                this.activeEffects.delete(circle);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
    }
    
    /**
     * Show match cleared effect
     */
    private showMatchEffect(data: { positions: any[], color: number, matchSize: number }): void {
        const { positions, color, matchSize } = data;
        
        // Create effect at center of match
        const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
        const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;
        
        // Size based on match size
        const effectScale = Math.min(1 + matchSize * 0.2, 3);
        
        // Create expanding ring
        const ring = this.scene.add.circle(centerX, centerY, 30, color, 0);
        ring.setStrokeStyle(4, color);
        ring.setDepth(Z_LAYERS.EFFECTS || 500);
        this.activeEffects.add(ring);
        
        const tween = this.scene.tweens.add({
            targets: ring,
            scaleX: effectScale,
            scaleY: effectScale,
            alpha: { from: 1, to: 0 },
            duration: 600,
            ease: 'Power2',
            onComplete: () => {
                ring.destroy();
                this.activeEffects.delete(ring);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
        
        // Individual bubble pop effects
        positions.forEach((pos, index) => {
            this.scene.time.delayedCall(index * 50, () => {
                this.showBubblePopEffect({ x: pos.x, y: pos.y, color });
            });
        });
    }
    
    /**
     * Show combo effect
     */
    private showComboEffect(data: { comboLevel: number, x: number, y: number }): void {
        const { comboLevel, x, y } = data;
        
        // Create combo text
        const comboText = this.scene.add.text(x, y, `${comboLevel}x COMBO!`, {
            fontSize: '32px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 6
        });
        comboText.setOrigin(0.5);
        comboText.setDepth(Z_LAYERS.FLOATING_UI || 1000);
        this.activeEffects.add(comboText);
        
        // Animate text
        const tween = this.scene.tweens.add({
            targets: comboText,
            y: y - 50,
            scaleX: { from: 0.5, to: 1.5 },
            scaleY: { from: 0.5, to: 1.5 },
            alpha: { from: 1, to: 0 },
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                comboText.destroy();
                this.activeEffects.delete(comboText);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
        
        // Screen shake based on combo level
        if (comboLevel >= 3) {
            this.scene.cameras.main.shake(200, 0.01 * comboLevel);
        }
    }
    
    /**
     * Show cascade effect
     */
    private showCascadeEffect(data: { count: number, positions: any[] }): void {
        const { count, positions } = data;
        
        // Create cascade text
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY - 100;
        
        const cascadeText = this.scene.add.text(centerX, centerY, `CASCADE x${count}!`, {
            fontSize: '40px',
            fontFamily: 'Arial Black',
            color: '#00FFFF',
            stroke: '#000044',
            strokeThickness: 8
        });
        cascadeText.setOrigin(0.5);
        cascadeText.setDepth(Z_LAYERS.FLOATING_UI || 1000);
        this.activeEffects.add(cascadeText);
        
        // Animate with bounce
        const tween = this.scene.tweens.add({
            targets: cascadeText,
            scaleX: { from: 0, to: 1.2 },
            scaleY: { from: 0, to: 1.2 },
            duration: 500,
            ease: 'Back.easeOut',
            yoyo: true,
            hold: 500,
            onComplete: () => {
                cascadeText.destroy();
                this.activeEffects.delete(cascadeText);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
        
        // Falling star effects for each bubble
        positions.forEach((pos, index) => {
            this.scene.time.delayedCall(index * 100, () => {
                this.createFallingStarEffect(pos.x, pos.y);
            });
        });
    }
    
    /**
     * Show gem collection effect
     */
    private showGemCollectEffect(data: { x: number, y: number, targetX?: number, targetY?: number, isPlayer?: boolean, delta?: number }): void {
        // Create gem sprite with appropriate color (cyan for player, pink-red for opponent)
        const gemColor = data.isPlayer ? 0x00ffff : 0xff0066;  // Match UI colors
        const gem = this.scene.add.circle(data.x, data.y, 10, gemColor);
        gem.setDepth(Z_LAYERS.FLOATING_UI || 1000);
        this.activeEffects.add(gem);
        
        // Create trail effect - using simple particles without texture
        // Creating sparkle effects instead of particle trail to avoid texture issues
        for (let i = 0; i < 3; i++) {
            const sparkle = this.scene.add.circle(
                data.x + Phaser.Math.Between(-5, 5),
                data.y + Phaser.Math.Between(-5, 5),
                3, gemColor
            );
            sparkle.setAlpha(0.7);
            this.scene.tweens.add({
                targets: sparkle,
                scale: { from: 1, to: 0 },
                alpha: { from: 0.7, to: 0 },
                duration: 300,
                delay: i * 50,
                onComplete: () => sparkle.destroy()
            });
        }
        
        // Create a simple glow effect instead
        const trail = this.scene.add.circle(data.x, data.y, 15, gemColor, 0.3);
        trail.setDepth(Z_LAYERS.EFFECTS || 500);
        this.activeEffects.add(trail);
        
        // All gems go to the same counter at bottom left
        const targetX = data.targetX ?? 110;  // Gem counter X position
        const targetY = data.targetY ?? (this.scene.cameras.main.height - 110);  // Gem counter Y position
        
        // Animate to target
        const tween = this.scene.tweens.add({
            targets: gem,
            x: targetX,
            y: targetY,
            duration: 800,
            ease: 'Power2',
            onUpdate: () => {
                trail.setPosition(gem.x, gem.y);
            },
            onComplete: () => {
                gem.destroy();
                trail.destroy();
                this.activeEffects.delete(gem);
                this.activeEffects.delete(trail);
                this.activeTweens.delete(tween);
                
                // Flash effect at target with appropriate color
                this.createFlashEffect(targetX, targetY, gemColor);
            }
        });
        
        this.activeTweens.add(tween);
    }
    
    /**
     * Show power-up activation effect
     */
    private showPowerUpEffect(data: { type: string, x: number, y: number }): void {
        // Different effects based on power-up type
        switch (data.type) {
            case 'bomb':
                this.createExplosionEffect(data.x, data.y);
                break;
            case 'laser':
                this.createLaserEffect(data.x, data.y);
                break;
            case 'rainbow':
                this.createRainbowEffect(data.x, data.y);
                break;
            default:
                this.createFlashEffect(data.x, data.y, 0xFFFFFF);
        }
    }
    
    /**
     * Show danger warning
     */
    private showDangerWarning(data: { level: number }): void {
        const { level } = data;
        
        // Create warning border
        const graphics = this.scene.add.graphics();
        graphics.setDepth(Z_LAYERS.UI - 1 || 899);
        this.activeEffects.add(graphics);
        
        // Color based on danger level
        const colors = [0xFFFF00, 0xFF8800, 0xFF0000]; // yellow, orange, red
        const color = colors[Math.min(level - 1, 2)];
        
        // Draw border
        const { width, height } = this.scene.cameras.main;
        graphics.lineStyle(8, color, 1);
        graphics.strokeRect(4, 4, width - 8, height - 8);
        
        // Flash animation
        const tween = this.scene.tweens.add({
            targets: graphics,
            alpha: { from: 1, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                graphics.destroy();
                this.activeEffects.delete(graphics);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
    }
    
    /**
     * Handle theme change
     */
    private handleThemeChange(data: { theme: string }): void {
        this.currentTheme = data.theme;
        this.cleanupThemeEffects();
        this.initializeThemeEffects();
    }
    
    /**
     * Initialize theme-specific effects
     */
    private initializeThemeEffects(): void {
        // Theme-specific initialization
        switch (this.currentTheme) {
            case 'space':
                // Space theme: stars, nebulas, etc.
                break;
            case 'ocean':
                // Ocean theme: bubbles, fish, etc.
                break;
            case 'forest':
                // Forest theme: leaves, fireflies, etc.
                break;
        }
    }
    
    /**
     * Clean up theme effects
     */
    private cleanupThemeEffects(): void {
        this.themeEffects.forEach(effect => {
            if (effect && effect.destroy) {
                effect.destroy();
            }
        });
        this.themeEffects.clear();
    }
    
    // Helper methods for specific effects
    
    private createSimplePopEffect(x: number, y: number, color: number): void {
        for (let i = 0; i < 8; i++) {
            const particle = this.scene.add.circle(x, y, 4, color);
            particle.setDepth(Z_LAYERS.EFFECTS || 500);
            this.activeEffects.add(particle);
            
            const angle = (i / 8) * Math.PI * 2;
            const speed = 100 + Math.random() * 50;
            
            const tween = this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.5,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                    this.activeEffects.delete(particle);
                    this.activeTweens.delete(tween);
                }
            });
            
            this.activeTweens.add(tween);
        }
    }
    
    private createFallingStarEffect(x: number, y: number): void {
        const star = this.scene.add.star(x, y, 5, 8, 16, 0xFFFF00);
        star.setDepth(Z_LAYERS.EFFECTS || 500);
        this.activeEffects.add(star);
        
        const tween = this.scene.tweens.add({
            targets: star,
            y: y + 100,
            alpha: 0,
            angle: 360,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                star.destroy();
                this.activeEffects.delete(star);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
    }
    
    private createFlashEffect(x: number, y: number, color: number): void {
        const flash = this.scene.add.circle(x, y, 50, color, 0.8);
        flash.setDepth(Z_LAYERS.EFFECTS || 500);
        this.activeEffects.add(flash);
        
        const tween = this.scene.tweens.add({
            targets: flash,
            scaleX: 0.1,
            scaleY: 0.1,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                flash.destroy();
                this.activeEffects.delete(flash);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
    }
    
    private createExplosionEffect(x: number, y: number): void {
        // Create expanding shockwave
        const shockwave = this.scene.add.circle(x, y, 10, 0xFFFFFF, 0);
        shockwave.setStrokeStyle(8, 0xFFAA00);
        shockwave.setDepth(Z_LAYERS.EFFECTS || 500);
        this.activeEffects.add(shockwave);
        
        const tween = this.scene.tweens.add({
            targets: shockwave,
            scaleX: 10,
            scaleY: 10,
            alpha: { from: 1, to: 0 },
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                shockwave.destroy();
                this.activeEffects.delete(shockwave);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
        
        // Screen shake
        this.scene.cameras.main.shake(300, 0.02);
    }
    
    private createLaserEffect(x: number, y: number): void {
        // Vertical laser beam
        const laser = this.scene.add.rectangle(x, this.scene.cameras.main.centerY, 4, this.scene.cameras.main.height, 0xFF0000);
        laser.setDepth(Z_LAYERS.EFFECTS || 500);
        laser.setAlpha(0.8);
        this.activeEffects.add(laser);
        
        const tween = this.scene.tweens.add({
            targets: laser,
            scaleX: { from: 1, to: 20 },
            alpha: { from: 0.8, to: 0 },
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                laser.destroy();
                this.activeEffects.delete(laser);
                this.activeTweens.delete(tween);
            }
        });
        
        this.activeTweens.add(tween);
    }
    
    private createRainbowEffect(x: number, y: number): void {
        const colors = [0xFF0000, 0xFF8800, 0xFFFF00, 0x00FF00, 0x0088FF, 0x8800FF];
        
        colors.forEach((color, index) => {
            this.scene.time.delayedCall(index * 100, () => {
                const ring = this.scene.add.circle(x, y, 20, color, 0);
                ring.setStrokeStyle(4, color);
                ring.setDepth(Z_LAYERS.EFFECTS || 500);
                this.activeEffects.add(ring);
                
                const tween = this.scene.tweens.add({
                    targets: ring,
                    scaleX: 5,
                    scaleY: 5,
                    alpha: { from: 1, to: 0 },
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        ring.destroy();
                        this.activeEffects.delete(ring);
                        this.activeTweens.delete(tween);
                    }
                });
                
                this.activeTweens.add(tween);
            });
        });
    }
    
    public update(time: number, delta: number): void {
        // Update particle pool if available
        if (this.particlePool) {
            this.particlePool.update();
        }
    }
    
    public destroy(): void {
        // Clean up all active effects
        this.activeEffects.forEach(effect => {
            if (effect && !effect.scene) return;
            effect.destroy();
        });
        this.activeEffects.clear();
        
        // Stop all tweens
        this.activeTweens.forEach(tween => {
            if (tween && tween.isPlaying()) {
                tween.stop();
            }
        });
        this.activeTweens.clear();
        
        // Clean up theme effects
        this.cleanupThemeEffects();
        
        // Remove event listeners
        this.eventBus.removeAllListeners();
        
        super.destroy();
    }
}