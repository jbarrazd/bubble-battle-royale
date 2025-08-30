import { IObjectiveConfig } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class Objective extends Phaser.GameObjects.Container {
    private chestBody: Phaser.GameObjects.Rectangle;
    private chestLid: Phaser.GameObjects.Rectangle;
    private chestLock: Phaser.GameObjects.Arc;
    private shield: Phaser.GameObjects.Arc;
    private glowEffect: Phaser.GameObjects.Arc;
    private health: number;
    private maxHealth: number;
    private shielded: boolean = true;

    constructor(scene: Phaser.Scene, config: IObjectiveConfig) {
        super(scene, config.x, config.y);
        
        this.health = config.health;
        this.maxHealth = config.health;
        
        // Multi-layered glow system (game industry standard)
        // Outer glow - large and subtle
        const outerGlow = scene.add.circle(0, 0, config.size / 2 + 15, 0xFFD700, 0.15);
        this.add(outerGlow);
        
        // Middle glow - medium brightness
        const middleGlow = scene.add.circle(0, 0, config.size / 2 + 8, 0xFFD700, 0.3);
        this.add(middleGlow);
        
        // Inner glow - bright and focused
        this.glowEffect = scene.add.circle(0, 0, config.size / 2 + 4, 0xFFD700, 0.5);
        
        // "Breathing" animation - industry standard for important objects
        scene.tweens.add({
            targets: [this.glowEffect, middleGlow, outerGlow],
            scale: { from: 0.9, to: 1.15 },
            alpha: { from: 0.4, to: 0.8 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Secondary pulse for extra attention
        scene.tweens.add({
            targets: outerGlow,
            scale: { from: 1, to: 1.3 },
            alpha: { from: 0.15, to: 0.05 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Quad.easeInOut'
        });
        
        // Remove shield visual - chest is always the target!
        this.shield = scene.add.circle(0, 0, config.size / 2 + 2, 0x00ffff, 0);
        this.shield.setVisible(false);
        this.shielded = false; // Chest is always a valid target
        
        // Create treasure chest
        const chestSize = config.size * 0.7;
        
        // Chest body (main box) - no stroke
        this.chestBody = scene.add.rectangle(0, 3, chestSize, chestSize * 0.8, 0x8B4513);
        
        // Chest lid (top part) - no stroke
        this.chestLid = scene.add.rectangle(0, -5, chestSize * 1.1, chestSize * 0.4, 0xA0522D);
        
        // Chest lock (golden circle) - no stroke
        this.chestLock = scene.add.circle(0, 3, chestSize * 0.15, 0xFFD700);
        
        // Add golden details
        const detail1 = scene.add.rectangle(-chestSize * 0.3, 3, 2, chestSize * 0.6, 0xFFD700);
        const detail2 = scene.add.rectangle(chestSize * 0.3, 3, 2, chestSize * 0.6, 0xFFD700);
        const detail3 = scene.add.rectangle(0, 3, chestSize * 0.8, 2, 0xFFD700);
        
        this.add([this.glowEffect, this.shield, this.chestBody, detail1, detail2, detail3, this.chestLid, this.chestLock]);
        
        // Lock animation is now handled in the main animation section
        
        // Particle system - industry standard for objective highlighting
        
        // 1. Continuous upward sparkles (treasure chest magic)
        scene.time.addEvent({
            delay: 200,
            repeat: -1,
            callback: () => {
                const sparkleCount = Phaser.Math.Between(1, 3);
                for (let i = 0; i < sparkleCount; i++) {
                    const offsetX = Phaser.Math.Between(-config.size/2, config.size/2);
                    const particle = scene.add.circle(
                        offsetX,
                        Phaser.Math.Between(-3, 3),
                        Phaser.Math.Between(2, 4),
                        Phaser.Utils.Array.GetRandom([0xFFD700, 0xFFA500, 0xFFFFAA, 0xFFE135]),
                        1
                    );
                    this.add(particle);
                    
                    // Upward motion with slight drift
                    scene.tweens.add({
                        targets: particle,
                        y: -config.size * 1.2,
                        x: offsetX + Phaser.Math.Between(-8, 8),
                        alpha: { from: 1, to: 0 },
                        scale: { from: 1, to: 0.2 },
                        duration: 1800,
                        ease: 'Cubic.easeOut',
                        delay: i * 100,
                        onComplete: () => particle.destroy()
                    });
                }
            }
        });
        
        // 2. Orbital particles REMOVED - was causing floating particles issue
        // Commented out to fix visual clutter
        /*
        for (let i = 0; i < 3; i++) {
            const orbitRadius = config.size * 0.7;
            const orbiter = scene.add.circle(
                orbitRadius, 0, 3,
                Phaser.Utils.Array.GetRandom([0xFFD700, 0xFFFFFF]),
                0.8
            );
            this.add(orbiter);
            
            // Orbit animation
            scene.tweens.add({
                targets: orbiter,
                angle: 360,
                duration: 3000 + (i * 500),
                repeat: -1,
                ease: 'Linear'
            });
            
            // Vertical bobbing
            scene.tweens.add({
                targets: orbiter,
                y: Phaser.Math.Between(-5, 5),
                duration: 1500 + (i * 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 300
            });
        }
        */
        
        // 3. Shimmer waves (used in Zelda, God of War, etc.)
        scene.time.addEvent({
            delay: 1500,
            repeat: -1,
            callback: () => {
                // Create expanding ring of light
                const shimmer = scene.add.graphics();
                shimmer.lineStyle(2, 0xFFFFFF, 0.8);
                shimmer.strokeCircle(0, 0, config.size / 2);
                this.add(shimmer);
                
                scene.tweens.add({
                    targets: shimmer,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 800,
                    ease: 'Quad.easeOut',
                    onComplete: () => shimmer.destroy()
                });
            }
        });
        
        // 4. Screen-space particles for extra emphasis
        scene.time.addEvent({
            delay: 3000,
            repeat: -1,
            callback: () => {
                // Star burst every 3 seconds
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const distance = config.size * 0.4;
                    const star = scene.add.star(
                        Math.cos(angle) * distance,
                        Math.sin(angle) * distance,
                        4, 3, 6, 0xFFFFFF
                    );
                    star.setAlpha(0.9);
                    this.add(star);
                    
                    scene.tweens.add({
                        targets: star,
                        x: Math.cos(angle) * config.size * 1.5,
                        y: Math.sin(angle) * config.size * 1.5,
                        alpha: 0,
                        scale: 0,
                        rotation: Math.PI * 2,
                        duration: 1000,
                        ease: 'Cubic.easeOut',
                        delay: i * 50,
                        onComplete: () => star.destroy()
                    });
                }
            }
        });
        
        // No ring - just particles for clean look
        
        this.setSize(config.size, config.size);
        this.setDepth(Z_LAYERS.OBJECTIVE);
        
        // Enhanced chest animations (AAA game standards)
        
        // 1. "Breathing" animation - makes object feel alive
        scene.tweens.add({
            targets: this,
            scaleX: { from: 0.98, to: 1.02 },
            scaleY: { from: 0.98, to: 1.02 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // 2. Floating motion
        scene.tweens.add({
            targets: this,
            y: config.y - 4,
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // 3. Subtle rocking for life
        scene.tweens.add({
            targets: this,
            angle: { from: -1.5, to: 1.5 },
            duration: 3200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // 4. Lock highlight animation (focal point)
        scene.tweens.add({
            targets: this.chestLock,
            scale: { from: 0.8, to: 1.3 },
            alpha: { from: 0.7, to: 1 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // 5. Chest lid occasional "peek" animation
        scene.time.addEvent({
            delay: 8000,
            repeat: -1,
            callback: () => {
                scene.tweens.add({
                    targets: this.chestLid,
                    y: this.chestLid.y - 3,
                    angle: -5,
                    duration: 300,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
            }
        });
        
        // 6. Gold details shimmer
        const details = [detail1, detail2, detail3];
        details.forEach((detail, index) => {
            scene.tweens.add({
                targets: detail,
                alpha: { from: 0.6, to: 1 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                delay: index * 200,
                ease: 'Quad.easeInOut'
            });
        });
        
        scene.add.existing(this);
    }


    public setShielded(shielded: boolean): void {
        this.shielded = shielded;
        
        if (shielded) {
            this.shield.setVisible(true);
            this.scene.tweens.add({
                targets: this.shield,
                alpha: 0.5,
                duration: 300,
                ease: 'Power2'
            });
        } else {
            // Shield broken animation
            this.scene.tweens.add({
                targets: this.shield,
                alpha: 0,
                scale: 1.5,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this.shield.setVisible(false);
                    this.showVulnerable();
                }
            });
        }
    }

    private showVulnerable(): void {
        // Glow brighter when vulnerable
        this.scene.tweens.add({
            targets: this.glowEffect,
            scale: 1.3,
            alpha: 0.8,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        
        // Change chest color to indicate vulnerability
        this.chestBody.setFillStyle(0xff6b6b);
        this.chestLid.setFillStyle(0xff8888);
    }

    public hit(damage: number = 1): void {
        this.health -= damage;
        
        // Impact animation
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
        });
        
        // Flash effect
        const flash = this.scene.add.circle(this.x, this.y, 50, 0xffffff, 0.8);
        this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });
        
        if (this.health <= 0) {
            this.destroy();
        }
    }

    public override destroy(): void {
        // Victory animation - chest opens
        this.scene.tweens.add({
            targets: this.chestLid,
            y: -15,
            rotation: -0.3,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // Chest disappears
        this.scene.tweens.add({
            targets: this,
            scale: 1.5,
            alpha: 0,
            duration: 1000,
            delay: 200,
            ease: 'Power2',
            onComplete: () => {
                this.createVictoryParticles();
                super.destroy();
            }
        });
    }

    private createVictoryParticles(): void {
        // Create custom particles using circles instead of textures
        for (let i = 0; i < 20; i++) {
            const particle = this.scene.add.circle(
                this.x, 
                this.y, 
                Phaser.Math.Between(3, 6),
                Phaser.Utils.Array.GetRandom([0xffd700, 0xffa500, 0xff6347]),
                1
            );
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Phaser.Math.Between(100, 300);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            this.scene.tweens.add({
                targets: particle,
                x: particle.x + vx,
                y: particle.y + vy,
                alpha: 0,
                scale: 0,
                duration: 1000,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    public getHealth(): number {
        return this.health;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public isVulnerable(): boolean {
        return !this.shielded;
    }
    
    public isShielded(): boolean {
        return this.shielded;
    }
    
    public playVictoryAnimation(onComplete?: () => void): void {
        // Stop any existing animations
        this.scene.tweens.killTweensOf(this.chestLid);
        this.scene.tweens.killTweensOf(this.glowEffect);
        
        // Hide shield immediately
        this.shield.setVisible(false);
        
        // Glow bright gold (glowEffect is a circle, not graphics)
        if (this.glowEffect instanceof Phaser.GameObjects.Arc) {
            this.glowEffect.setFillStyle(0xFFD700, 1);
        }
        this.scene.tweens.add({
            targets: this.glowEffect,
            scale: 2,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
        
        // Open the chest lid
        this.scene.tweens.add({
            targets: this.chestLid,
            y: -20,
            angle: -45,
            duration: 500,
            ease: 'Back.easeOut',
            delay: 200
        });
        
        // Create treasure particles manually
        const particleTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: 20,
            callback: () => {
                for (let i = 0; i < 5; i++) {
                    const particle = this.scene.add.circle(
                        this.x + Phaser.Math.Between(-10, 10),
                        this.y,
                        Phaser.Math.Between(4, 8),
                        Phaser.Utils.Array.GetRandom([0xFFD700, 0xFFA500, 0xFFFF00]),
                        0.8
                    );
                    particle.setDepth(this.depth + 1);
                    
                    const angle = Phaser.Math.Between(-120, -60) * Math.PI / 180;
                    const speed = Phaser.Math.Between(100, 300);
                    const vx = Math.cos(angle) * speed;
                    const vy = Math.sin(angle) * speed;
                    
                    this.scene.tweens.add({
                        targets: particle,
                        x: particle.x + vx,
                        y: particle.y + vy - 200, // Simulate upward gravity
                        alpha: 0,
                        scale: 0,
                        duration: 1500,
                        ease: 'Power2',
                        onComplete: () => particle.destroy()
                    });
                }
            }
        });
        
        // Shake effect
        this.scene.cameras.main.shake(300, 0.01);
        
        // Scale pulse
        this.scene.tweens.add({
            targets: this,
            scale: 1.2,
            duration: 300,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                if (onComplete) onComplete();
                
                // Stop particle timer
                this.scene.time.delayedCall(1000, () => {
                    particleTimer.destroy();
                });
            }
        });
        
        // Flash effect
        this.scene.cameras.main.flash(500, 255, 215, 0);
    }
}