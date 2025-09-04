import { Scene } from 'phaser';

export enum ComboTier {
    NORMAL = '',         // 3 matches - no text
    COMBO_2 = 'COMBO x2', // 4 matches
    COMBO_3 = 'COMBO x3', // 5 matches
    COMBO_4 = 'COMBO x4', // 6 matches
    COMBO_5 = 'COMBO x5'  // 7+ matches
}

export interface ComboConfig {
    tier: ComboTier;
    multiplier: number;
    color: number;
    minBubbles: number;
}

export class ComboManager {
    private scene: Scene;
    private currentCombo: number = 0;
    private comboMultiplier: number = 1.0;
    private lastMatchTime: number = 0;
    private comboTimeout: number = 2000; // 2 seconds
    private comboContainers: Phaser.GameObjects.Container[] = [];
    
    // Scoring configuration - linear and balanced
    private readonly BASE_POINTS: { [key: number]: number } = {
        3: 10,    // Standard match
        4: 20,    // Good match  
        5: 30,    // Great match
        6: 40,    // Excellent match
        7: 50     // Perfect match
    };
    
    private readonly COMBO_CONFIGS: ComboConfig[] = [
        { tier: ComboTier.NORMAL, multiplier: 1.0, color: 0xFFD700, minBubbles: 3 },
        { tier: ComboTier.COMBO_2, multiplier: 1.2, color: 0x00FF00, minBubbles: 4 },
        { tier: ComboTier.COMBO_3, multiplier: 1.5, color: 0x00BFFF, minBubbles: 5 },
        { tier: ComboTier.COMBO_4, multiplier: 1.8, color: 0xFF4500, minBubbles: 6 },
        { tier: ComboTier.COMBO_5, multiplier: 2.0, color: 0xFF1493, minBubbles: 7 }
    ];
    
    private readonly CHAIN_BONUS: { [key: number]: number } = {
        2: 1.1,   // +10%
        3: 1.2,   // +20%
        4: 1.3    // +30%
    };
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    private createComboDisplay(x: number, y: number): Phaser.GameObjects.Container {
        const comboContainer = this.scene.add.container(x, y);
        comboContainer.setDepth(1200); // Higher depth for combo visibility
        
        // Create comic-style combo text for mobile
        const comboText = this.scene.add.text(0, 0, '', {
            fontSize: '24px',
            color: '#FFFFFF',
            fontFamily: 'Impact, Arial Black', // Comic style font
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        });
        comboText.setOrigin(0.5);
        comboText.setShadow(3, 3, '#000000', 5, true, true);
        
        comboContainer.add(comboText);
        this.comboContainers.push(comboContainer);
        
        return comboContainer;
    }
    
    public calculateScore(matchSize: number, x?: number, y?: number, bubbleColor?: number): number {
        // Get base points
        const basePoints = this.BASE_POINTS[Math.min(matchSize, 7)] || this.BASE_POINTS[7];
        
        // Check if this is a chain combo
        const now = Date.now();
        const isChain = (now - this.lastMatchTime) < this.comboTimeout;
        
        if (isChain) {
            this.currentCombo++;
        } else {
            this.currentCombo = 1;
        }
        
        this.lastMatchTime = now;
        
        // Get combo configuration
        const comboConfig = this.getComboConfig(matchSize);
        this.comboMultiplier = comboConfig.multiplier;
        
        // Get chain bonus
        const chainBonus = this.CHAIN_BONUS[Math.min(this.currentCombo, 4)] || this.CHAIN_BONUS[4];
        
        // Calculate final score
        const finalScore = Math.floor(basePoints * this.comboMultiplier * chainBonus);
        
        // Emit combo-complete event for gem spawning
        if (this.currentCombo >= 3 && x !== undefined && y !== undefined) {
            this.scene.events.emit('combo-complete', {
                combo: this.currentCombo,
                matchSize: matchSize,
                x: x,
                y: y
            });
        }
        
        // DISABLED: Visual effects now handled by UnifiedFeedbackSystem
        // if (x !== undefined && y !== undefined) {
        //     this.showCombo(comboConfig, finalScore, x, y, matchSize, bubbleColor);
        // }
        
        return finalScore;
    }
    
    public getComboConfig(matchSize: number): ComboConfig {
        // Find the appropriate combo tier based on match size
        for (let i = this.COMBO_CONFIGS.length - 1; i >= 0; i--) {
            if (matchSize >= this.COMBO_CONFIGS[i].minBubbles) {
                return this.COMBO_CONFIGS[i];
            }
        }
        return this.COMBO_CONFIGS[0];
    }
    
    private showCombo(config: ComboConfig, points: number, x: number, y: number, matchSize: number, bubbleColor?: number): void {
        // Create combo display at the match location
        const comboContainer = this.createComboDisplay(x, y);
        
        // Get the text object before adding background
        const comboText = comboContainer.list[0] as Phaser.GameObjects.Text;
        
        // Add background effect based on combo size
        if (matchSize >= 4) {
            this.addComboBackground(comboContainer, matchSize, bubbleColor || config.color);
        }
        
        // Use bubble color if provided, otherwise use config color
        const displayColor = bubbleColor || config.color;
        
        // For normal matches (3), just show points
        // For combos (4+), show combo text and points
        if (matchSize === 3) {
            // Just show points for basic matches
            comboText.setText(`+${points}`);
            comboText.setTint(displayColor);
            comboText.setFontSize(20);
        } else {
            // Show combo text with comic styling and bubble color
            comboText.setText(config.tier);
            comboText.setTint(displayColor);
            comboText.setFontSize(28);
            comboText.setStyle({
                fontSize: '28px',
                fontFamily: 'Impact, Arial Black',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 5
            });
            
            // Add points below combo text with comic style
            const pointsText = this.scene.add.text(0, 26, `+${points}`, {
                fontSize: '20px',
                color: '#FFD700',
                fontFamily: 'Impact, Arial Black',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            });
            pointsText.setOrigin(0.5);
            pointsText.setShadow(2, 2, '#FF6600', 3, true, true);
            comboContainer.add(pointsText);
        }
        
        // Show and animate (smaller scale for mobile)
        comboContainer.setVisible(true);
        comboContainer.setScale(0);
        comboContainer.setAlpha(1);
        
        // Elegant entrance animation
        this.scene.tweens.add({
            targets: comboContainer,
            scale: { from: 0, to: 1.1 },
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Subtle settle
                this.scene.tweens.add({
                    targets: comboContainer,
                    scale: 1,
                    duration: 100,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Float up animation - more pronounced to separate from drop bonus
        this.scene.tweens.add({
            targets: comboContainer,
            y: comboContainer.y - 60, // Float higher from current position
            duration: 1000,
            ease: 'Cubic.easeOut'
        });
        
        // Fade out after delay
        this.scene.time.delayedCall(800, () => {
            this.scene.tweens.add({
                targets: comboContainer,
                alpha: 0,
                y: comboContainer.y - 20, // Continue floating up from current position
                scale: 0.9,
                duration: 400,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    // Clean up
                    const index = this.comboContainers.indexOf(comboContainer);
                    if (index > -1) {
                        this.comboContainers.splice(index, 1);
                    }
                    comboContainer.destroy(true);
                }
            });
        });
        
        // Delay particle effects to appear after combo text
        this.scene.time.delayedCall(300, () => {
            // Create particles with bubble color
            this.createParticleEffect(x, y, config, bubbleColor);
            
            // Add impact flash for big combos
            if (matchSize >= 6) {
                this.createImpactFlash(x, y, config);
            }
        });
        
        // Add effects based on combo tier
        if (matchSize >= 5) {
            this.addComboStars(config, comboContainer, matchSize, bubbleColor);
        }
        
        // Screen shake intensity based on combo
        if (matchSize >= 7) {
            this.scene.cameras.main.shake(200, 0.008);
            this.scene.cameras.main.flash(100, 255, 255, 255, false);
        } else if (matchSize >= 6) {
            this.scene.cameras.main.shake(150, 0.005);
            this.scene.cameras.main.flash(50, 255, 200, 100, false);
        } else if (matchSize >= 5) {
            this.scene.cameras.main.shake(100, 0.003);
        }
    }
    
    private addComboStars(config: ComboConfig, container: Phaser.GameObjects.Container, matchSize: number, bubbleColor?: number): void {
        const starCount = Math.min(matchSize - 4, 3); // 1-3 stars based on combo size
        const starY = -20; // Closer to text
        
        for (let i = 0; i < starCount; i++) {
            const starX = (i - (starCount - 1) / 2) * 20; // Smaller spacing
            const star = this.scene.add.star(starX, starY, 5, 4, 8, bubbleColor || config.color); // Smaller stars
            star.setAlpha(0.8);
            
            container.add(star);
            
            // Rotate stars
            this.scene.tweens.add({
                targets: star,
                angle: 360,
                duration: 1000,
                ease: 'Linear'
            });
            
            // Pulse stars
            this.scene.tweens.add({
                targets: star,
                scale: { from: 0.5, to: 0.8 },
                alpha: { from: 0.8, to: 1 },
                duration: 300,
                yoyo: true,
                repeat: 1,
                ease: 'Sine.easeInOut'
            });
        }
    }
    
    public createParticleEffect(x: number, y: number, config: ComboConfig, bubbleColor?: number): void {
        // Progressive particle count based on combo size
        let particleCount;
        if (config.minBubbles === 3) {
            particleCount = 8; // Very subtle for 3
        } else if (config.minBubbles === 4) {
            particleCount = 16; // Small burst for 4
        } else if (config.minBubbles === 5) {
            particleCount = 30; // Medium burst for 5
        } else if (config.minBubbles === 6) {
            particleCount = 50; // Large burst for 6
        } else {
            particleCount = 80; // Massive for 7+
        }
        
        // Create different effects based on combo tier
        if (config.minBubbles >= 7) {
            // MEGA COMBO - Fire explosion!
            this.createFireExplosion(x, y, config, bubbleColor);
        } else if (config.minBubbles >= 6) {
            // Big combos get special effects
            this.createExplosionEffect(x, y, config, bubbleColor);
        } else if (config.minBubbles >= 5) {
            // Medium combos get burst
            this.createColorBurst(x, y, config, bubbleColor);
        }
        
        // Particle size and speed based on combo
        const particleSize = config.minBubbles === 3 ? [1, 2] : 
                           config.minBubbles === 4 ? [2, 3] :
                           config.minBubbles === 5 ? [2, 4] :
                           [3, 6];
        
        const speedRange = config.minBubbles === 3 ? [30, 60] :
                          config.minBubbles === 4 ? [40, 100] :
                          config.minBubbles === 5 ? [60, 150] :
                          [80, 250];
        
        // Standard particle burst with bubble colors
        for (let i = 0; i < particleCount; i++) {
            // Always use bubble color as primary
            const baseColor = bubbleColor || config.color;
            // Mix with lighter/darker shades for variety
            const shadeVariation = Phaser.Math.Between(-0.2, 0.2);
            const particleColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(baseColor),
                Phaser.Display.Color.ValueToColor(0xFFFFFF),
                100,
                Math.abs(shadeVariation) * 100
            );
            const finalColor = Phaser.Display.Color.GetColor(particleColor.r, particleColor.g, particleColor.b);
            
            const particle = this.scene.add.circle(
                x, y, 
                Phaser.Math.Between(particleSize[0], particleSize[1]),
                finalColor,
                config.minBubbles === 3 ? 0.6 : 1
            );
            particle.setDepth(1150); // Higher depth for particles
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Phaser.Math.Between(speedRange[0], speedRange[1]);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: { from: 1, to: 0 },
                duration: config.minBubbles === 3 ? 400 : Phaser.Math.Between(600, 1000),
                ease: 'Power2.easeOut',
                delay: i * (config.minBubbles === 3 ? 2 : 5),
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
        
        // Add glow effect only for combos 5+
        if (config.minBubbles >= 5) {
            this.createGlowEffect(x, y, config);
        }
    }
    
    private createExplosionEffect(x: number, y: number, config: ComboConfig, bubbleColor?: number): void {
        const explosionColor = bubbleColor || config.color;
        
        // Create expanding ring with bubble color
        const ring = this.scene.add.graphics();
        ring.lineStyle(3, explosionColor, 1);
        ring.strokeCircle(0, 0, 20);
        ring.setPosition(x, y);
        ring.setDepth(1049);
        ring.setScale(0);
        
        // Animate ring expansion
        this.scene.tweens.add({
            targets: ring,
            scale: 3,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                ring.destroy();
            }
        });
        
        // Create star burst for perfect combos
        if (config.minBubbles >= 7) {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                const star = this.scene.add.star(
                    x + Math.cos(angle) * 20,
                    y + Math.sin(angle) * 20,
                    5, 3, 6,
                    bubbleColor || config.color
                );
                star.setDepth(1051);
                star.setScale(0);
                
                this.scene.tweens.add({
                    targets: star,
                    x: x + Math.cos(angle) * 100,
                    y: y + Math.sin(angle) * 100,
                    scale: { from: 0, to: 1 },
                    alpha: { from: 1, to: 0 },
                    angle: 360,
                    duration: 800,
                    delay: i * 50,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        star.destroy();
                    }
                });
            }
        }
    }
    
    private createGlowEffect(x: number, y: number, config: ComboConfig): void {
        // Create multiple glow layers for depth
        for (let i = 0; i < 3; i++) {
            const glow = this.scene.add.circle(x, y, 20 + i * 10, config.color, 0.4 - i * 0.1);
            glow.setDepth(1048 - i);
            glow.setScale(0);
            
            // Pulse and fade with delay
            this.scene.tweens.add({
                targets: glow,
                scale: 2 + i * 0.5,
                alpha: 0,
                duration: 600 + i * 100,
                delay: i * 50,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    glow.destroy();
                }
            });
        }
    }
    
    private createColorBurst(x: number, y: number, config: ComboConfig): void {
        // Create rainbow burst for medium combos
        const colors = [0xFF0000, 0xFF7F00, 0xFFFF00, 0x00FF00, 0x0000FF, 0x9400D3];
        const burstCount = 12;
        
        for (let i = 0; i < burstCount; i++) {
            const angle = (Math.PI * 2 * i) / burstCount;
            const color = colors[i % colors.length];
            
            // Create streak
            const streak = this.scene.add.rectangle(
                x, y, 40, 4, color
            );
            streak.setOrigin(0, 0.5);
            streak.setRotation(angle);
            streak.setDepth(1049);
            streak.setScale(0, 1);
            
            // Animate streak
            this.scene.tweens.add({
                targets: streak,
                scaleX: 2,
                alpha: { from: 1, to: 0 },
                duration: 500,
                ease: 'Power2.easeOut',
                onComplete: () => {
                    streak.destroy();
                }
            });
        }
    }
    
    private addComboBackground(container: Phaser.GameObjects.Container, matchSize: number, color: number): void {
        if (matchSize >= 7) {
            // Fire/explosion background for mega combos
            const fireGradient = this.scene.add.graphics();
            fireGradient.fillStyle(0xFF6B00, 0.3);
            fireGradient.fillCircle(0, 0, 40);
            fireGradient.fillStyle(0xFF0000, 0.2);
            fireGradient.fillCircle(0, 0, 50);
            fireGradient.setDepth(-1);
            
            // Pulsing animation
            this.scene.tweens.add({
                targets: fireGradient,
                scale: { from: 0.8, to: 1.2 },
                alpha: { from: 0.3, to: 0.6 },
                duration: 300,
                yoyo: true,
                repeat: 2,
                ease: 'Sine.easeInOut'
            });
            
            container.addAt(fireGradient, 0);
            
            // Add fire particles around text
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 * i) / 6;
                const dist = 25;
                const fireParticle = this.scene.add.circle(
                    Math.cos(angle) * dist,
                    Math.sin(angle) * dist,
                    3,
                    0xFF4500,
                    0.8
                );
                container.add(fireParticle);
                
                this.scene.tweens.add({
                    targets: fireParticle,
                    scale: { from: 0.5, to: 1.5 },
                    alpha: { from: 0.8, to: 0 },
                    duration: 600,
                    delay: i * 50,
                    ease: 'Power2.easeOut'
                });
            }
        } else if (matchSize >= 6) {
            // Electric burst background
            const burst = this.scene.add.graphics();
            burst.fillStyle(color, 0.2);
            burst.fillCircle(0, 0, 35);
            burst.lineStyle(2, color, 0.5);
            burst.strokeCircle(0, 0, 35);
            burst.setDepth(-1);
            
            this.scene.tweens.add({
                targets: burst,
                scale: { from: 0, to: 1.1 },
                alpha: { from: 0.5, to: 0.2 },
                duration: 400,
                ease: 'Back.easeOut'
            });
            
            container.addAt(burst, 0);
        } else if (matchSize >= 5) {
            // Star burst background
            const starBurst = this.scene.add.star(0, 0, 8, 15, 30, color);
            starBurst.setAlpha(0.25);
            starBurst.setDepth(-1);
            
            this.scene.tweens.add({
                targets: starBurst,
                angle: 360,
                scale: { from: 0, to: 1.2 },
                alpha: { from: 0.4, to: 0.1 },
                duration: 800,
                ease: 'Power2.easeOut'
            });
            
            container.addAt(starBurst, 0);
        } else {
            // Simple glow for 4-match
            const glow = this.scene.add.circle(0, 0, 25, color, 0.15);
            glow.setDepth(-1);
            
            this.scene.tweens.add({
                targets: glow,
                scale: { from: 0, to: 1 },
                alpha: { from: 0.3, to: 0.1 },
                duration: 500,
                ease: 'Sine.easeOut'
            });
            
            container.addAt(glow, 0);
        }
    }
    
    
    private createFireExplosion(x: number, y: number, config: ComboConfig, bubbleColor?: number): void {
        // Create epic fire effect for mega combos
        const baseColor = bubbleColor || config.color;
        // Create fire-tinted variations of the bubble color
        const fireColors = [
            baseColor,
            Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(baseColor),
                Phaser.Display.Color.ValueToColor(0xFF0000),
                100, 30
            ),
            Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(baseColor),
                Phaser.Display.Color.ValueToColor(0xFFD700),
                100, 50
            )
        ].map(c => c.color !== undefined ? c.color : Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        const particleCount = 50;
        
        // Create fire shockwave with bubble color
        const shockwave = this.scene.add.graphics();
        shockwave.lineStyle(5, baseColor, 1);
        shockwave.strokeCircle(0, 0, 30);
        shockwave.setPosition(x, y);
        shockwave.setDepth(1048);
        shockwave.setScale(0);
        
        // Animate shockwave
        this.scene.tweens.add({
            targets: shockwave,
            scale: 4,
            alpha: 0,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                shockwave.destroy();
            }
        });
        
        // Create fire particles
        for (let i = 0; i < particleCount; i++) {
            const fireColor = fireColors[Math.floor(Math.random() * fireColors.length)];
            const size = Phaser.Math.Between(3, 8);
            
            const flame = this.scene.add.circle(
                x + Phaser.Math.Between(-20, 20),
                y + Phaser.Math.Between(-20, 20),
                size,
                fireColor
            );
            flame.setDepth(1051);
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(100, 300);
            const targetX = x + Math.cos(angle) * speed;
            const targetY = y + Math.sin(angle) * speed - Phaser.Math.Between(50, 150); // Fire rises
            
            // Animate flame
            this.scene.tweens.add({
                targets: flame,
                x: targetX,
                y: targetY,
                alpha: { from: 1, to: 0 },
                scale: { from: 1.5, to: 0 },
                duration: Phaser.Math.Between(600, 1000),
                delay: i * 10,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    flame.destroy();
                }
            });
            
            // Add glow to each flame
            const glow = this.scene.add.circle(flame.x, flame.y, size * 2, fireColor, 0.3);
            glow.setDepth(1050);
            
            this.scene.tweens.add({
                targets: glow,
                x: targetX,
                y: targetY,
                alpha: 0,
                scale: 2,
                duration: Phaser.Math.Between(600, 1000),
                delay: i * 10,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    glow.destroy();
                }
            });
        }
        
        // Add fire text effect
        if (config.minBubbles >= 7) {
            const fireText = this.scene.add.text(x, y - 50, '🔥', {
                fontSize: '48px'
            });
            fireText.setOrigin(0.5);
            fireText.setDepth(1052);
            fireText.setScale(0);
            
            this.scene.tweens.add({
                targets: fireText,
                scale: { from: 0, to: 2 },
                alpha: { from: 1, to: 0 },
                y: y - 100,
                duration: 800,
                ease: 'Back.easeOut',
                onComplete: () => {
                    fireText.destroy();
                }
            });
        }
    }
    
    private createImpactFlash(x: number, y: number, config: ComboConfig): void {
        // Create a bright white flash at impact point
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xFFFFFF, 0.8);
        flash.fillCircle(0, 0, 50);
        flash.setPosition(x, y);
        flash.setDepth(1047);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        
        // Quick flash animation
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 3,
            duration: 200,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                flash.destroy();
            }
        });
        
        // Create secondary colored flash
        const colorFlash = this.scene.add.graphics();
        colorFlash.fillStyle(config.color, 0.5);
        colorFlash.fillCircle(0, 0, 80);
        colorFlash.setPosition(x, y);
        colorFlash.setDepth(1046);
        colorFlash.setBlendMode(Phaser.BlendModes.ADD);
        
        this.scene.tweens.add({
            targets: colorFlash,
            alpha: 0,
            scale: 2,
            duration: 400,
            ease: 'Sine.easeOut',
            onComplete: () => {
                colorFlash.destroy();
            }
        });
    }
    
    public reset(): void {
        this.currentCombo = 0;
        this.comboMultiplier = 1.0;
        this.lastMatchTime = 0;
        // Clean up all combo containers
        this.comboContainers.forEach(container => container.destroy(true));
        this.comboContainers = [];
    }
    
    public getCurrentCombo(): number {
        return this.currentCombo;
    }
    
    public getMultiplier(): number {
        return this.comboMultiplier;
    }
}