/**
 * BackgroundSystem - Premium Visual Background with Best UX/UI Practices
 * Features:
 * - Dynamic gradient backgrounds with smooth transitions
 * - Parallax layers for depth
 * - Ambient particle effects
 * - Performance optimized for mobile
 * - Non-intrusive design that enhances gameplay
 */

import { Scene } from 'phaser';
import { HD_SCALE } from '@/config/GameConfig';

interface IBackgroundConfig {
    theme?: 'ocean' | 'sunset' | 'forest' | 'space' | 'aurora';
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    enableParticles?: boolean;
    enableAnimation?: boolean;
}

export class BackgroundSystem {
    private scene: Scene;
    private config: IBackgroundConfig;
    
    // Gradient layers
    private gradientGraphics!: Phaser.GameObjects.Graphics;
    private gradientTexture?: Phaser.Textures.CanvasTexture;
    
    // Parallax elements
    private parallaxLayers: Phaser.GameObjects.Container[] = [];
    
    // Particle effects
    private particleEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
    
    // Ambient elements
    private ambientElements: Phaser.GameObjects.GameObject[] = [];
    
    // Animation timers
    private animationTimers: Phaser.Time.TimerEvent[] = [];
    
    // Color schemes for different themes with unique particle types
    private readonly themes = {
        ocean: {
            colors: [0x001a33, 0x003366, 0x004d99, 0x0066cc],
            accent: 0x00ccff,
            particles: 0x66ddff,
            name: 'Ocean Depths',
            particleType: 'bubbles' as const,
            secondaryParticles: 0x99eeff
        },
        sunset: {
            colors: [0x1a0033, 0x330066, 0x660099, 0x9900cc],
            accent: 0xff6600,
            particles: 0xffaa00,
            name: 'Twilight',
            particleType: 'fireflies' as const,
            secondaryParticles: 0xffcc66
        },
        forest: {
            colors: [0x001a00, 0x003300, 0x004d00, 0x006600],
            accent: 0x00ff00,
            particles: 0x44aa44, // More visible green
            name: 'Mystic Forest',
            particleType: 'leaves' as const,
            secondaryParticles: 0x66dd66 // Brighter leaves
        },
        space: {
            colors: [0x000011, 0x000022, 0x000033, 0x000044],
            accent: 0x9966ff,
            particles: 0xffffff,
            name: 'Deep Space',
            particleType: 'stars' as const,
            secondaryParticles: 0xaabbff
        },
        aurora: {
            colors: [0x001122, 0x002244, 0x003366, 0x004488],
            accent: 0x00ff99,
            particles: 0x00ffaa, // Bright aurora green
            name: 'Northern Lights',
            particleType: 'aurora' as const,
            secondaryParticles: 0xaaffff // Bright cyan
        }
    };
    
    private currentTheme: typeof this.themes.ocean;
    private width: number;
    private height: number;

    constructor(scene: Scene, config: IBackgroundConfig = {}) {
        this.scene = scene;
        this.config = {
            theme: config.theme || 'ocean',
            quality: config.quality || 'high',
            enableParticles: config.enableParticles !== false,
            enableAnimation: config.enableAnimation !== false
        };
        
        this.currentTheme = this.themes[this.config.theme!];
        this.width = scene.cameras.main.width;
        this.height = scene.cameras.main.height;
        
        this.create();
    }

    private create(): void {
        // Create gradient background
        this.createGradientBackground();
        
        // Add parallax layers based on quality
        if (this.config.quality !== 'low') {
            this.createParallaxLayers();
        }
        
        // Add ambient particles
        if (this.config.enableParticles && this.config.quality !== 'low') {
            this.createAmbientParticles();
        }
        
        // Add animated elements for high quality, or always for space theme
        if ((this.config.quality === 'high' || this.config.quality === 'ultra') || 
            this.currentTheme.particleType === 'stars') {
            this.createAnimatedElements();
        }
        
        // Start animations if enabled
        if (this.config.enableAnimation) {
            this.startAnimations();
        }
    }

    private createGradientBackground(): void {
        this.gradientGraphics = this.scene.add.graphics();
        
        // Create smooth vertical gradient
        const colors = this.currentTheme.colors;
        const gradientHeight = this.height / (colors.length - 1);
        
        for (let i = 0; i < colors.length - 1; i++) {
            const color1 = colors[i];
            const color2 = colors[i + 1];
            
            // Create gradient between two colors
            for (let y = 0; y < gradientHeight; y++) {
                const ratio = y / gradientHeight;
                const blendedColor = this.blendColors(color1, color2, ratio);
                
                this.gradientGraphics.fillStyle(blendedColor, 1);
                this.gradientGraphics.fillRect(
                    0,
                    i * gradientHeight + y,
                    this.width,
                    1
                );
            }
        }
        
        // Add subtle noise texture for depth (ultra quality)
        if (this.config.quality === 'ultra') {
            this.addNoiseTexture();
        }
        
        // Set as background (behind everything)
        this.gradientGraphics.setDepth(-1000);
    }

    private createParallaxLayers(): void {
        // Create theme-specific background elements instead of geometric shapes
        const layerCount = this.config.quality === 'ultra' ? 3 : 2;
        
        for (let i = 0; i < layerCount; i++) {
            const layer = this.scene.add.container(0, 0);
            layer.setDepth(-900 + i * 10);
            
            // Add theme-specific elements
            const elementCount = this.config.quality === 'ultra' ? 6 : 3;
            for (let j = 0; j < elementCount; j++) {
                const element = this.createThemeElement(i);
                if (element) {
                    element.x = Phaser.Math.Between(0, this.width);
                    element.y = Phaser.Math.Between(0, this.height);
                    layer.add(element);
                }
            }
            
            this.parallaxLayers.push(layer);
        }
    }

    private createThemeElement(layerIndex: number): Phaser.GameObjects.GameObject | null {
        const alpha = 0.02 + layerIndex * 0.015; // Very subtle
        const scale = 0.5 + layerIndex * 0.3;
        
        switch (this.currentTheme.particleType) {
            case 'bubbles':
                // Ocean theme - create subtle water bubbles
                const bubble = this.scene.add.circle(
                    0, 0,
                    Phaser.Math.Between(20, 40) * HD_SCALE * scale,
                    this.currentTheme.secondaryParticles,
                    alpha
                );
                bubble.setStrokeStyle(1, this.currentTheme.particles, alpha * 2);
                return bubble;
                
            case 'fireflies':
                // Sunset theme - create glowing orbs
                const firefly = this.scene.add.circle(
                    0, 0,
                    Phaser.Math.Between(3, 8) * HD_SCALE * scale,
                    this.currentTheme.particles,
                    alpha * 3
                );
                // Add glow effect
                this.scene.tweens.add({
                    targets: firefly,
                    alpha: { from: alpha * 2, to: alpha * 4 },
                    duration: Phaser.Math.Between(2000, 4000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                return firefly;
                
            case 'leaves':
                // Forest theme - simple ellipse leaves that actually work
                const bgLeaf = this.scene.add.ellipse(
                    0, 0,
                    18 * HD_SCALE * scale,
                    25 * HD_SCALE * scale,
                    Phaser.Math.RND.pick([0x5ca05c, 0x6cae6c, 0x4c904c]), // Natural greens
                    0.12 // Subtle background opacity
                );
                bgLeaf.setAngle(Phaser.Math.Between(0, 360));
                // Gentle rotation
                this.scene.tweens.add({
                    targets: bgLeaf,
                    angle: `+=${Phaser.Math.Between(-30, 30)}`,
                    duration: Phaser.Math.Between(8000, 12000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                return bgLeaf;
                
            case 'stars':
                // Space theme - no geometric shapes, let the planets be the focus
                return null;
                
            case 'aurora':
                // Aurora theme - ethereal light pillars
                const pillar = this.scene.add.rectangle(
                    0, 0,
                    Phaser.Math.Between(80, 120) * HD_SCALE * scale,
                    500 * HD_SCALE * scale,
                    Phaser.Math.RND.pick([0x00ffcc, 0x99ffee, 0xccffff]),
                    0.06 + layerIndex * 0.02 // Layer depth
                );
                pillar.setBlendMode(Phaser.BlendModes.ADD);
                pillar.setAngle(Phaser.Math.Between(-15, 15));
                // Ethereal shimmering
                this.scene.tweens.add({
                    targets: pillar,
                    alpha: { from: 0.04, to: 0.08 },
                    scaleX: { from: 0.8, to: 1.2 },
                    angle: pillar.angle + Phaser.Math.Between(-5, 5),
                    duration: Phaser.Math.Between(12000, 18000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                return pillar;
                
            default:
                return null;
        }
    }

    private drawLeaf(graphics: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
        // Draw a simple diamond/leaf shape using fillPoints
        const points = [
            x, y - size * 1.5,     // Top
            x - size * 0.7, y,     // Left
            x, y + size * 1.5,     // Bottom
            x + size * 0.7, y      // Right
        ];
        graphics.fillPoints(points, true);
    }

    private createAmbientParticles(): void {
        // Adjusted particles for better visuals without hurting FPS
        let particleCount = this.config.quality === 'ultra' ? 8 : 4;
        let delay = 500; // Slower creation
        
        // More stars for space theme, positioned on left side
        if (this.currentTheme.particleType === 'stars') {
            particleCount = this.config.quality === 'ultra' ? 20 : 12; // More stars for ambiance
            delay = 200; // Faster star creation
        }
        
        for (let i = 0; i < particleCount; i++) {
            this.scene.time.delayedCall(i * delay, () => {
                this.createThemeParticle();
            });
        }
        
        // Secondary effects disabled for performance
        // if (this.config.quality === 'ultra') {
        //     this.createSecondaryEffect();
        // }
    }

    private createThemeParticle(): void {
        let particle: Phaser.GameObjects.GameObject;
        const startX = Phaser.Math.Between(0, this.width);
        const startY = this.currentTheme.particleType === 'leaves' ? -20 : this.height + 20;
        
        switch (this.currentTheme.particleType) {
            case 'bubbles':
                // Ocean bubbles rising up
                particle = this.scene.add.circle(
                    startX,
                    this.height + 20,
                    Phaser.Math.Between(3, 8) * HD_SCALE,
                    this.currentTheme.particles,
                    Phaser.Math.FloatBetween(0.1, 0.2)
                );
                // Add shimmer effect
                (particle as Phaser.GameObjects.Arc).setStrokeStyle(
                    1,
                    this.currentTheme.secondaryParticles,
                    0.3
                );
                // Float up with wobble
                this.scene.tweens.add({
                    targets: particle,
                    y: -20,
                    x: startX + Math.sin(Date.now() * 0.001) * 30,
                    duration: Phaser.Math.Between(12000, 18000),
                    ease: 'Linear',
                    onComplete: () => this.recycleParticle(particle)
                });
                // Wobble horizontally
                this.scene.tweens.add({
                    targets: particle,
                    x: `+=${Phaser.Math.Between(-30, 30)}`,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                break;
                
            case 'fireflies':
                // Glowing fireflies with erratic movement
                particle = this.scene.add.circle(
                    startX,
                    Phaser.Math.Between(this.height * 0.3, this.height * 0.7),
                    Phaser.Math.Between(2, 4) * HD_SCALE,
                    this.currentTheme.particles,
                    0.8
                );
                // Glow pulsing
                this.scene.tweens.add({
                    targets: particle,
                    scale: { from: 0.8, to: 1.3 },
                    alpha: { from: 0.4, to: 1 },
                    duration: Phaser.Math.Between(1000, 2000),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                // Erratic floating movement
                this.createFireflyPath(particle);
                // Auto-recycle after some time
                this.scene.time.delayedCall(Phaser.Math.Between(15000, 20000), () => {
                    this.recycleParticle(particle);
                });
                break;
                
            case 'leaves':
                // Falling leaves - using simple shapes that work
                const leafSize = Phaser.Math.Between(10, 18) * HD_SCALE;
                particle = this.scene.add.ellipse(
                    startX,
                    startY,
                    leafSize * 0.8,
                    leafSize * 1.3,
                    Phaser.Math.RND.pick([0x5ca05c, 0x7cb87c, 0x4c904c, 0x6cae6c]), // Various green tones
                    0.6
                );
                (particle as Phaser.GameObjects.Ellipse).setStrokeStyle(1, 0x3a7a3a, 0.8);
                (particle as Phaser.GameObjects.Ellipse).setAngle(Phaser.Math.Between(0, 360));
                // Fall with realistic leaf motion
                const fallDuration = Phaser.Math.Between(10000, 15000);
                this.scene.tweens.add({
                    targets: particle,
                    y: this.height + 20,
                    angle: `+=${Phaser.Math.Between(90, 270)}`,
                    duration: fallDuration,
                    ease: 'Linear',
                    onComplete: () => this.recycleParticle(particle)
                });
                // Gentle sway side to side
                this.scene.tweens.add({
                    targets: particle,
                    x: `+=${Phaser.Math.Between(-60, 60)}`,
                    duration: 2500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                // Subtle scale pulsing for depth
                this.scene.tweens.add({
                    targets: particle,
                    scaleX: { from: 1, to: 0.85 },
                    scaleY: { from: 1, to: 1.1 },
                    duration: 3000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                break;
                
            case 'stars':
                // Deep space - realistic stars everywhere except planet area (top-right)
                const starSize = Phaser.Math.FloatBetween(0.5, 2) * HD_SCALE;
                let starX = Phaser.Math.Between(0, this.width);
                let starY = Phaser.Math.Between(0, this.height);
                
                // Avoid the planet area (top-right)
                if (starX > this.width * 0.7 && starY < this.height * 0.3) {
                    // If in planet area, move it elsewhere
                    if (Phaser.Math.Between(0, 1) === 0) {
                        starX = Phaser.Math.Between(0, this.width * 0.7); // Move left
                    } else {
                        starY = Phaser.Math.Between(this.height * 0.3, this.height); // Move down
                    }
                }
                
                particle = this.scene.add.circle(
                    starX,
                    starY,
                    starSize,
                    0xffffff,
                    Phaser.Math.FloatBetween(0.5, 0.9) // Start visible
                );
                
                // Some stars just stay static, others twinkle
                if (Phaser.Math.Between(0, 10) > 7) {
                    // 30% twinkle
                    this.scene.tweens.add({
                        targets: particle,
                        alpha: { from: particle.alpha, to: particle.alpha * 0.3 },
                        duration: Phaser.Math.Between(2000, 4000),
                        yoyo: true,
                        repeat: Phaser.Math.Between(1, 3),
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            // Fade out and recycle
                            this.scene.tweens.add({
                                targets: particle,
                                alpha: 0,
                                duration: 1000,
                                onComplete: () => this.recycleParticle(particle)
                            });
                        }
                    });
                } else {
                    // 70% stay static for a while then fade
                    this.scene.time.delayedCall(Phaser.Math.Between(10000, 20000), () => {
                        if (particle && particle.active) {
                            this.scene.tweens.add({
                                targets: particle,
                                alpha: 0,
                                duration: 2000,
                                onComplete: () => this.recycleParticle(particle)
                            });
                        }
                    });
                }
                break;
                
            case 'aurora':
                // Beautiful flowing aurora curtains
                const curtainX = Phaser.Math.Between(50, this.width - 50);
                const curtainWidth = Phaser.Math.Between(100, 180) * HD_SCALE;
                const curtainColor = Phaser.Math.RND.pick([
                    0x00ffaa, // Green aurora
                    0x00ddff, // Cyan aurora  
                    0x99ffdd, // Mint aurora
                    0xffaaff, // Pink aurora
                    0xaaccff  // Blue aurora
                ]);
                
                // Create tall vertical curtain
                particle = this.scene.add.rectangle(
                    curtainX,
                    this.height / 2,
                    curtainWidth,
                    this.height * 1.5,
                    curtainColor,
                    0.12 // Visible but subtle
                );
                
                // Set blend mode for glow effect
                (particle as Phaser.GameObjects.Rectangle).setBlendMode(Phaser.BlendModes.ADD);
                
                // Slight initial angle for natural look
                particle.setAngle(Phaser.Math.Between(-10, 10));
                
                // Beautiful flowing animation
                this.scene.tweens.add({
                    targets: particle,
                    // Opacity pulse
                    alpha: { 
                        from: 0.08, 
                        to: 0.18
                    },
                    // Width breathing
                    scaleX: { 
                        from: 0.7, 
                        to: 1.2
                    },
                    // Gentle sway
                    x: curtainX + Phaser.Math.Between(-40, 40),
                    // Subtle rotation
                    angle: particle.angle + Phaser.Math.Between(-5, 5),
                    duration: Phaser.Math.Between(10000, 15000),
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => this.recycleParticle(particle)
                });
                
                // Add shimmer effect - color shift
                let colorPhase = 0;
                const shimmerTimer = this.scene.time.addEvent({
                    delay: 3000,
                    callback: () => {
                        if (particle && particle.active) {
                            const colors = [curtainColor, 0x00ffcc, 0xaaffff];
                            colorPhase = (colorPhase + 1) % colors.length;
                            this.scene.tweens.add({
                                targets: particle,
                                duration: 2000,
                                onUpdate: (tween) => {
                                    const progress = tween.progress;
                                    const fromColor = colors[colorPhase];
                                    const toColor = colors[(colorPhase + 1) % colors.length];
                                    const blended = Phaser.Display.Color.Interpolate.ColorWithColor(
                                        Phaser.Display.Color.IntegerToColor(fromColor),
                                        Phaser.Display.Color.IntegerToColor(toColor),
                                        1,
                                        progress
                                    );
                                    (particle as Phaser.GameObjects.Rectangle).setFillStyle(
                                        Phaser.Display.Color.GetColor(blended.r, blended.g, blended.b),
                                        particle.alpha
                                    );
                                }
                            });
                        } else {
                            shimmerTimer.destroy();
                        }
                    },
                    loop: true
                });
                break;
                
            default:
                return;
        }
        
        particle.setDepth(-850);
        this.ambientElements.push(particle);
    }
    
    private createFireflyPath(firefly: Phaser.GameObjects.GameObject): void {
        // Create random floating movement for firefly
        const moveFirefly = () => {
            const newX = firefly.x + Phaser.Math.Between(-100, 100);
            const newY = firefly.y + Phaser.Math.Between(-50, 50);
            
            // Keep within screen bounds
            const boundedX = Phaser.Math.Clamp(newX, 50, this.width - 50);
            const boundedY = Phaser.Math.Clamp(newY, this.height * 0.2, this.height * 0.8);
            
            this.scene.tweens.add({
                targets: firefly,
                x: boundedX,
                y: boundedY,
                duration: Phaser.Math.Between(2000, 3000),
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    // Continue moving if firefly still exists
                    if (firefly && firefly.active) {
                        moveFirefly();
                    }
                }
            });
        };
        
        // Start the movement
        moveFirefly();
    }
    
    private recycleParticle(particle: Phaser.GameObjects.GameObject): void {
        particle.destroy();
        this.ambientElements = this.ambientElements.filter(e => e !== particle);
        // Create a new particle to maintain the effect
        this.createThemeParticle();
    }

    private createSecondaryEffect(): void {
        const sparkleTimer = this.scene.time.addEvent({
            delay: 500,
            callback: () => {
                // Create secondary effects based on theme
                switch (this.currentTheme.particleType) {
                    case 'bubbles':
                        // Small bubble clusters
                        const clusterX = Phaser.Math.Between(0, this.width);
                        for (let i = 0; i < 3; i++) {
                            const smallBubble = this.scene.add.circle(
                                clusterX + Phaser.Math.Between(-20, 20),
                                this.height + 10,
                                Phaser.Math.Between(1, 3) * HD_SCALE,
                                this.currentTheme.secondaryParticles,
                                0.2
                            );
                            smallBubble.setDepth(-840);
                            this.ambientElements.push(smallBubble);
                            this.scene.tweens.add({
                                targets: smallBubble,
                                y: -10,
                                duration: Phaser.Math.Between(8000, 10000),
                                delay: i * 100,
                                ease: 'Linear',
                                onComplete: () => {
                                    smallBubble.destroy();
                                    this.ambientElements = this.ambientElements.filter(e => e !== smallBubble);
                                }
                            });
                        }
                        break;
                        
                    case 'fireflies':
                        // Spark trails
                        const spark = this.scene.add.circle(
                            Phaser.Math.Between(0, this.width),
                            Phaser.Math.Between(this.height * 0.2, this.height * 0.8),
                            1 * HD_SCALE,
                            this.currentTheme.secondaryParticles,
                            1
                        );
                        spark.setDepth(-840);
                        this.ambientElements.push(spark);
                        this.scene.tweens.add({
                            targets: spark,
                            alpha: { from: 1, to: 0 },
                            scale: { from: 1, to: 0 },
                            duration: 1000,
                            ease: 'Power2',
                            onComplete: () => {
                                spark.destroy();
                                this.ambientElements = this.ambientElements.filter(e => e !== spark);
                            }
                        });
                        break;
                        
                    case 'stars':
                        // Minimal space dust - very subtle
                        const dust = this.scene.add.circle(
                            Phaser.Math.Between(0, this.width),
                            Phaser.Math.Between(0, this.height),
                            0.5 * HD_SCALE, // Tiny
                            0xccddff,
                            Phaser.Math.FloatBetween(0.3, 0.5)
                        );
                        dust.setDepth(-840);
                        this.ambientElements.push(dust);
                        
                        // Very slow drift
                        this.scene.tweens.add({
                            targets: dust,
                            x: dust.x + Phaser.Math.Between(-10, 10),
                            y: dust.y + Phaser.Math.Between(-10, 10),
                            alpha: 0,
                            duration: Phaser.Math.Between(5000, 8000),
                            ease: 'Linear',
                            onComplete: () => {
                                dust.destroy();
                                this.ambientElements = this.ambientElements.filter(e => e !== dust);
                            }
                        });
                        break;
                        
                    default:
                        // Generic sparkle for other themes
                        const sparkle = this.scene.add.star(
                            Phaser.Math.Between(0, this.width),
                            Phaser.Math.Between(0, this.height),
                            4, 2 * HD_SCALE, 4 * HD_SCALE,
                            this.currentTheme.particles
                        );
                        sparkle.setAlpha(0);
                        sparkle.setDepth(-840);
                        this.ambientElements.push(sparkle);
                        this.scene.tweens.add({
                            targets: sparkle,
                            alpha: { from: 0, to: 0.3, yoyo: true },
                            scale: { from: 0, to: 1, yoyo: true },
                            angle: 180,
                            duration: 1500,
                            ease: 'Cubic.easeOut',
                            onComplete: () => {
                                sparkle.destroy();
                                this.ambientElements = this.ambientElements.filter(e => e !== sparkle);
                            }
                        });
                        break;
                }
            },
            loop: true
        });
        
        this.animationTimers.push(sparkleTimer);
    }

    private createAnimatedElements(): void {
        // Add special elements for specific themes
        if (this.currentTheme.particleType === 'stars') {
            // Always add planet and shooting stars for space theme
            console.log('Space theme detected, creating planet and shooting stars');
            this.createBackgroundPlanet();
            this.createShootingStarTimer();
        }
    }
    
    private createBackgroundPlanet(): void {
        // Earth planet with slow approach effect - like traveling towards it
        
        if (this.scene.textures.exists('planet')) {
            const earthX = this.width * 0.85; // Slightly more to the right
            const earthY = this.height * 0.15;
            const startScale = 0.3; // Start small - far away
            const endScale = 1.8; // Grow much larger - very close to Earth
            
            const earth = this.scene.add.image(earthX, earthY, 'planet');
            earth.setScale(startScale);
            earth.setAlpha(0.25); // Start less visible when far
            earth.setDepth(-998); // Far back
            
            // Approaching Earth effect - like traveling towards it
            this.scene.tweens.add({
                targets: earth,
                scale: { from: startScale, to: endScale }, // From small to large
                alpha: { from: 0.25, to: 0.45 }, // More visible as we approach
                duration: 120000, // 2 minutes to reach maximum size
                ease: 'Linear', // Linear for now to ensure it's working
                repeat: -1, // Loop forever
                yoyo: true, // Go back and forth
                onComplete: () => {
                    // After reaching Earth, slowly drift away again
                    this.scene.tweens.add({
                        targets: earth,
                        scale: startScale,
                        alpha: 0.3,
                        duration: 240000, // 4 minutes to go back
                        ease: 'Cubic.easeOut',
                        onComplete: () => {
                            // Restart the approach
                            this.createBackgroundPlanet();
                            earth.destroy();
                        }
                    });
                }
            });
            
            // Subtle floating motion throughout
            this.scene.tweens.add({
                targets: earth,
                y: earthY + (10 * HD_SCALE),
                x: earthX - (5 * HD_SCALE), // Also drift slightly horizontally
                duration: 50000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Very slow rotation to add realism
            this.scene.tweens.add({
                targets: earth,
                angle: 360,
                duration: 900000, // 15 minutes for one rotation
                repeat: -1,
                ease: 'Linear'
            });
            
            this.ambientElements.push(earth);
            console.log('Earth planet loaded with approach effect');
        }
    }
    
    private createFloatingBubblesBetweenPlanets(): void {
        // Removed for performance - no floating bubbles between planets
    }
    
    private createShootingStarTimer(): void {
        // First shooting star after 3 seconds
        this.scene.time.delayedCall(3000, () => {
            this.createShootingStar();
            console.log('Creating first shooting star');
        });
        
        // Create well-spaced shooting stars
        const createNextStar = () => {
            const delay = Phaser.Math.Between(8000, 15000); // Good spacing between stars
            this.scene.time.delayedCall(delay, () => {
                if (this.scene && this.scene.scene.isActive()) {
                    this.createShootingStar();
                    console.log('Creating shooting star');
                    createNextStar(); // Schedule next one
                }
            });
        };
        
        createNextStar();
    }
    
    private createShootingStar(): void {
        // Create shooting stars across the screen
        const startX = Phaser.Math.Between(0, this.width * 0.6);
        const startY = Phaser.Math.Between(0, this.height * 0.4);
        
        // Create shooting star container
        const shootingContainer = this.scene.add.container(startX, startY);
        
        // Create gradient trail using multiple segments
        const trailLength = 8;
        for (let i = trailLength; i > 0; i--) {
            const segment = this.scene.add.circle(
                -i * 8, 0,
                (trailLength - i) * 0.3 + 0.5, // Taper from thin to thick
                0xffffff,
                (1 - i / trailLength) * 0.5 // Fade from transparent to bright
            );
            segment.setBlendMode(Phaser.BlendModes.ADD);
            shootingContainer.add(segment);
        }
        
        // Bright head
        const head = this.scene.add.circle(0, 0, 1.5 * HD_SCALE, 0xffffff, 1);
        head.setBlendMode(Phaser.BlendModes.ADD);
        shootingContainer.add(head);
        
        shootingContainer.add(head);
        shootingContainer.setDepth(-800); // Behind most things
        shootingContainer.setAngle(35); // Natural angle
        this.ambientElements.push(shootingContainer);
        
        // Normal shooting star animation
        const endX = startX + Phaser.Math.Between(300, 450);
        const endY = startY + Phaser.Math.Between(150, 250);
        
        this.scene.tweens.add({
            targets: shootingContainer,
            x: endX,
            y: endY,
            duration: 600,
            ease: 'Power2.easeIn',
            onUpdate: (tween) => {
                // Fade out naturally
                const progress = tween.progress;
                shootingContainer.alpha = 1 - progress * 0.7;
            },
            onComplete: () => {
                shootingContainer.destroy();
                this.ambientElements = this.ambientElements.filter(e => e !== shootingContainer);
            }
        });
    }

    private startAnimations(): void {
        // Parallax movement on scene update
        if (this.parallaxLayers.length > 0) {
            const updateEvent = this.scene.time.addEvent({
                delay: 50,
                callback: this.updateParallax.bind(this),
                loop: true
            });
            this.animationTimers.push(updateEvent);
        }
        
        // Gradient color shifting for ultra quality
        if (this.config.quality === 'ultra') {
            this.startGradientAnimation();
        }
    }

    private updateParallax(): void {
        this.parallaxLayers.forEach((layer, index) => {
            const speed = (index + 1) * 0.1;
            layer.x -= speed;
            
            // Wrap around
            if (layer.x < -100) {
                layer.x = 0;
            }
        });
    }

    private startGradientAnimation(): void {
        // Subtle color shift over time
        let hueShift = 0;
        
        const gradientTimer = this.scene.time.addEvent({
            delay: 100,
            callback: () => {
                hueShift += 0.5;
                if (hueShift > 360) hueShift = 0;
                
                // Apply subtle hue shift to accent elements
                this.ambientElements.forEach(element => {
                    if ('setTint' in element) {
                        const shifted = this.shiftHue(this.currentTheme.accent, hueShift);
                        (element as any).setTint(shifted);
                    }
                });
            },
            loop: true
        });
        
        this.animationTimers.push(gradientTimer);
    }

    private addNoiseTexture(): void {
        // Add subtle noise for texture
        const noiseGraphics = this.scene.add.graphics();
        noiseGraphics.setAlpha(0.02); // Very subtle
        
        for (let i = 0; i < 1000; i++) {
            const x = Phaser.Math.Between(0, this.width);
            const y = Phaser.Math.Between(0, this.height);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
            
            noiseGraphics.fillStyle(0xffffff, alpha);
            noiseGraphics.fillRect(x, y, 1, 1);
        }
        
        noiseGraphics.setDepth(-999);
    }

    private blendColors(color1: number, color2: number, ratio: number): number {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        
        const r = Math.floor(r1 + (r2 - r1) * ratio);
        const g = Math.floor(g1 + (g2 - g1) * ratio);
        const b = Math.floor(b1 + (b2 - b1) * ratio);
        
        return (r << 16) | (g << 8) | b;
    }

    private shiftHue(color: number, degrees: number): number {
        // Convert to HSL, shift hue, convert back
        const r = ((color >> 16) & 0xff) / 255;
        const g = ((color >> 8) & 0xff) / 255;
        const b = (color & 0xff) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        
        if (max === min) {
            return color; // Gray, no hue to shift
        }
        
        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        let h;
        if (max === r) {
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
            h = ((b - r) / d + 2) / 6;
        } else {
            h = ((r - g) / d + 4) / 6;
        }
        
        h = (h + degrees / 360) % 1;
        
        // Convert back to RGB
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        
        const newR = Math.floor(hue2rgb(p, q, h + 1/3) * 255);
        const newG = Math.floor(hue2rgb(p, q, h) * 255);
        const newB = Math.floor(hue2rgb(p, q, h - 1/3) * 255);
        
        return (newR << 16) | (newG << 8) | newB;
    }

    public setTheme(theme: 'ocean' | 'sunset' | 'forest' | 'space' | 'aurora'): void {
        this.config.theme = theme;
        this.currentTheme = this.themes[theme];
        
        // Recreate background with new theme
        this.destroy();
        this.create();
    }

    public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
        this.config.quality = quality;
        
        // Recreate with new quality settings
        this.destroy();
        this.create();
    }

    public destroy(): void {
        // Clean up graphics
        this.gradientGraphics?.destroy();
        
        // Clean up parallax layers
        this.parallaxLayers.forEach(layer => layer.destroy());
        this.parallaxLayers = [];
        
        // Clean up particles
        this.particleEmitters.forEach(emitter => emitter.destroy());
        this.particleEmitters = [];
        
        // Clean up ambient elements
        this.ambientElements.forEach(element => element.destroy());
        this.ambientElements = [];
        
        // Clean up timers
        this.animationTimers.forEach(timer => timer.destroy());
        this.animationTimers = [];
    }
}