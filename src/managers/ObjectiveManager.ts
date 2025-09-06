/**
 * ObjectiveManager - Manages the central objective and gem distribution
 * Handles objective behavior, gem spawning, and special effects
 */

import { Scene } from 'phaser';
import { BaseGameSystem } from '@/core/SystemRegistry';
import { GameEventBus } from '@/core/EventBus';
import { GameStateManager } from '@/core/GameStateManager';
import { Objective } from '@/gameObjects/Objective';
import { SpaceObjective } from '@/gameObjects/SpaceObjective';
import { SpaceArenaParticles } from '@/systems/visual/SpaceArenaParticles';
import { Z_LAYERS, ARENA_CONFIG } from '@/config/ArenaConfig';
import { BubbleColor } from '@/types/ArenaTypes';

interface GemThrowTarget {
    bubble: any;
    isPlayer: boolean;
    distance: number;
}

export class ObjectiveManager extends BaseGameSystem {
    public name = 'ObjectiveManager';
    public priority = 20; // Initialize after bubble manager
    
    private eventBus: GameEventBus;
    private gameState: GameStateManager;
    
    // Objective
    private objective: Objective;
    private objectiveShielded: boolean = false;
    private shieldHealth: number = 3;
    
    // Gem distribution system
    private gemThrowTimer?: Phaser.Time.TimerEvent;
    private gemThrowInterval: number = 8000; // 8 seconds
    private lastGemThrowTime: number = 0;
    private totalGemsThrown: number = 0;
    private playerGemsReceived: number = 0;
    private opponentGemsReceived: number = 0;
    private objectiveGemTimer?: Phaser.Time.TimerEvent;
    
    // Theme-specific behaviors
    private currentTheme: string;
    private themeConfig: any;
    
    // Animation state
    private rotationSpeed: number = 0.5;
    private pulseScale: number = 1;
    private isAnimating: boolean = false;
    
    // Space theme particles
    private spaceParticles: SpaceArenaParticles | null = null;
    
    public initialize(): void {
        // Check if already initialized (BaseGameSystem pattern)
        if (this.isInitialized()) {
            console.warn('  → ObjectiveManager already initialized, skipping');
            return;
        }
        
        console.log('  → Initializing ObjectiveManager...');
        
        this.eventBus = GameEventBus.getInstance();
        this.gameState = GameStateManager.getInstance();
        this.currentTheme = this.scene.registry.get('gameTheme') || 'ocean';
        
        this.createObjective();
        this.setupEventListeners();
        this.startGemDistribution();
        
        this.markInitialized();
    }
    
    private createObjective(): void {
        // Check if objective already exists
        if (this.objective) {
            console.error('[ObjectiveManager] ERROR: Objective already exists! This should not happen.');
            console.trace('Stack trace for duplicate objective creation:');
            return;
        }
        
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        // Use theme-specific delivery animation
        if (this.currentTheme === 'space') {
            // UFO delivery for space theme
            // The UFO delivery will create the objective itself
            this.createUFODelivery(centerX, centerY, () => {
                // Callback when UFO delivery completes - objective already created
                console.log('UFO delivery complete, objective created');
            });
        } else {
            // Direct creation for other themes (can add other animations later)
            const config = {
                x: centerX,
                y: centerY,
                size: 60,
                health: 10
            };
            this.objective = new Objective(this.scene, config);
            this.applyThemeToObjective();
            this.startIdleAnimation();
        }
        
        console.log(`    Created ${this.currentTheme} objective at center`);
    }
    
    private createUFODelivery(targetX: number, targetY: number, onComplete: () => void): void {
        // Check if UFO asset exists
        if (!this.scene.textures.exists('ufo')) {
            onComplete();
            return;
        }
        
        const ufoScale = 0.35;
        const startX = -200;
        const startY = targetY - 100;
        
        // Create UFO
        const ufo = this.scene.add.image(startX, startY, 'ufo');
        ufo.setScale(ufoScale);
        ufo.setDepth(1000);
        
        // Play UFO arrival sound
        let ufoArrivalSound: Phaser.Sound.BaseSound | null = null;
        let ufoSound: Phaser.Sound.BaseSound | null = null;
        
        try {
            ufoArrivalSound = this.scene.sound.add('ufo-arrives', {
                volume: 0.2,
                rate: 1.0
            });
            ufoArrivalSound.play();
        } catch (e) {
            console.log('UFO arrival sound not loaded');
        }
        
        // Initialize particle system if not already done
        if (!this.spaceParticles) {
            this.spaceParticles = new SpaceArenaParticles(this.scene);
        }
        
        // Create UFO particles
        const trailParticles = this.spaceParticles.createUFOTrailParticles(ufo, 999);
        const engineGlow = this.spaceParticles.createUFOEngineParticles(ufo, 998);
        
        // UFO entry animation with bounce
        this.scene.tweens.add({
            targets: ufo,
            x: targetX,
            duration: 1200,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Stop trail and start engine
                trailParticles.stop();
                engineGlow.start();
                
                // Small bounce on arrival
                this.scene.tweens.add({
                    targets: ufo,
                    y: startY - 10,
                    duration: 200,
                    yoyo: true,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Show and animate tractor beam (this will create the objective)
                        this.animateTractorBeam(ufo, targetX, startY, targetY, () => {
                            if (onComplete) onComplete();
                            
                            // UFO departure
                            engineGlow.stop();
                            
                            // Play UFO departure sound after delay
                            this.scene.time.delayedCall(800, () => {
                                try {
                                    ufoSound = this.scene.sound.add('ufo-sound', {
                                        volume: 0.2,
                                        rate: 0.9
                                    });
                                    ufoSound.play();
                                } catch (e) {
                                    console.log('UFO sound not loaded');
                                }
                            });
                            
                            // Create departure particles
                            const departParticles = this.spaceParticles?.createDepartureParticles(targetX, startY, 999);
                            
                            // UFO flies up towards planet
                            this.scene.tweens.add({
                                targets: ufo,
                                x: this.scene.cameras.main.width * 0.85,
                                y: this.scene.cameras.main.height * 0.15,
                                scale: 0.05,
                                duration: 2000,
                                ease: 'Quad.easeIn',
                                delay: 300,
                                onStart: () => {
                                    // Fade out UFO sound
                                    if (ufoSound) {
                                        this.scene.tweens.add({
                                            targets: ufoSound,
                                            volume: 0,
                                            duration: 1500,
                                            onComplete: () => {
                                                ufoSound?.stop();
                                            }
                                        });
                                    }
                                },
                                onComplete: () => {
                                    // Play shine sound at final position
                                    try {
                                        const shineSound = this.scene.sound.add('shine', {
                                            volume: 0.15,
                                            rate: 1.0
                                        });
                                        shineSound.play();
                                    } catch (e) {
                                        console.log('Shine sound not loaded');
                                    }
                                    
                                    // Create flash/destello effect when UFO disappears
                                    this.createUFODisappearFlash(ufo.x, ufo.y);
                                    
                                    // Clean up
                                    ufo.destroy();
                                    departParticles?.stop();
                                }
                            });
                        });
                    }
                });
            }
        });
    }
    
    /**
     * Create flash effect when UFO disappears (EXACT from original ArenaSystem)
     */
    private createUFODisappearFlash(x: number, y: number): void {
        // Create star graphics for the classic 4-point star twinkle
        const starGraphics = this.scene.add.graphics();
        starGraphics.setDepth(1001);
        
        // Animate star twinkle
        let starScale = 0;
        let starAlpha = 1;
        
        const starTween = this.scene.tweens.add({
            targets: { scale: 0, alpha: 1 },
            scale: { from: 0, to: 1 },
            alpha: { from: 1, to: 0 },
            duration: 400,
            ease: 'Back.easeOut',
            onUpdate: (tween) => {
                starScale = tween.getValue();
                starAlpha = 1 - tween.progress;
                
                starGraphics.clear();
                starGraphics.lineStyle(2, 0xffffff, starAlpha);
                
                // Draw horizontal line
                const lineLength = 20 * starScale;
                starGraphics.beginPath();
                starGraphics.moveTo(x - lineLength, y);
                starGraphics.lineTo(x + lineLength, y);
                starGraphics.strokePath();
                
                // Draw vertical line
                starGraphics.beginPath();
                starGraphics.moveTo(x, y - lineLength);
                starGraphics.lineTo(x, y + lineLength);
                starGraphics.strokePath();
                
                // Add thin diagonal lines for extra sparkle
                starGraphics.lineStyle(1, 0xffffff, starAlpha * 0.7);
                const diagLength = lineLength * 0.7;
                
                // Diagonal 1
                starGraphics.beginPath();
                starGraphics.moveTo(x - diagLength, y - diagLength);
                starGraphics.lineTo(x + diagLength, y + diagLength);
                starGraphics.strokePath();
                
                // Diagonal 2
                starGraphics.beginPath();
                starGraphics.moveTo(x - diagLength, y + diagLength);
                starGraphics.lineTo(x + diagLength, y - diagLength);
                starGraphics.strokePath();
                
                // Central bright dot
                starGraphics.fillStyle(0xffffff, starAlpha);
                starGraphics.fillCircle(x, y, 2 * starScale);
            },
            onComplete: () => {
                starGraphics.destroy();
            }
        });
    }
    
    private animateTractorBeam(ufo: Phaser.GameObjects.Image, x: number, y: number, targetY: number, onComplete: () => void): void {
        // Calculate beam position
        const beamStartY = ufo.y + 30;
        const beamHeight = targetY - beamStartY;
        
        // Create beam container
        const beamContainer = this.scene.add.container(x, beamStartY);
        beamContainer.setDepth(999);
        
        // Create beam graphics
        const beamBase = this.scene.add.graphics();
        beamContainer.add(beamBase);
        
        // Create particle emitters for beam effect
        const beamParticles = this.scene.add.particles(0, 0, 'particle', {
            x: 0,
            y: { min: 0, max: beamHeight },
            scale: { start: 0.6, end: 0.1 },
            alpha: { start: 0.7, end: 0 },
            tint: [0xffffff, 0x00ffff, 0x66ddff],
            blendMode: 'ADD',
            lifespan: 800,
            speedX: { min: -20, max: 20 },
            speedY: 0,
            quantity: 3,
            frequency: 50,
            emitting: false
        });
        beamContainer.add(beamParticles);
        
        // Create spiraling energy particles
        const spiralParticles = this.scene.add.particles(0, 0, 'particle', {
            x: 0,
            y: 0,
            scale: { start: 0.4, end: 0.05 },
            alpha: { start: 1, end: 0 },
            tint: 0xffffff,
            blendMode: 'ADD',
            lifespan: 1200,
            quantity: 2,
            frequency: 80,
            emitting: false
        });
        beamContainer.add(spiralParticles);
        
        // Animate beam
        beamContainer.setScale(0, 0);
        beamContainer.setAlpha(0);
        
        this.scene.tweens.add({
            targets: beamContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 400,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Start particle emissions
                beamParticles.start();
                spiralParticles.start();
                
                // Play chest arrival sound
                try {
                    const chestSound = this.scene.sound.add('chest-arrival', {
                        volume: 0.25,
                        rate: 1.0
                    });
                    chestSound.play();
                } catch (e) {
                    console.log('Chest arrival sound not loaded');
                }
                
                // Animate beam with real-time updates (EXACT from original)
                let time = 0;
                const beamPulse = this.scene.time.addEvent({
                    delay: 16,
                    callback: () => {
                        time += 0.03;
                        beamBase.clear();
                        
                        // Enhanced tractor beam effect
                        const pulse = Math.sin(time * 3) * 0.3 + 0.7;
                        const wave = Math.sin(time * 2) * 0.2;
                        
                        // Draw cone shape with gradient effect
                        const topWidth = 20;
                        const bottomWidth = 60;
                        
                        // Main beam cone with gradient
                        beamBase.fillStyle(0x00ffff, 0.05 * pulse);
                        beamBase.beginPath();
                        beamBase.moveTo(-topWidth, 0);
                        beamBase.lineTo(topWidth, 0);
                        beamBase.lineTo(bottomWidth, beamHeight);
                        beamBase.lineTo(-bottomWidth, beamHeight);
                        beamBase.closePath();
                        beamBase.fillPath();
                        
                        // Inner bright cone
                        beamBase.fillStyle(0xffffff, 0.03 * pulse);
                        beamBase.beginPath();
                        beamBase.moveTo(-topWidth * 0.5, 0);
                        beamBase.lineTo(topWidth * 0.5, 0);
                        beamBase.lineTo(bottomWidth * 0.7, beamHeight);
                        beamBase.lineTo(-bottomWidth * 0.7, beamHeight);
                        beamBase.closePath();
                        beamBase.fillPath();
                        
                        // Draw energy rings moving down
                        for (let i = 0; i < 8; i++) {
                            const ringY = ((time * 50 + i * beamHeight / 8) % beamHeight);
                            const ringRadius = topWidth + (bottomWidth - topWidth) * (ringY / beamHeight);
                            const ringAlpha = (1 - ringY / beamHeight) * 0.3 * pulse;
                            
                            beamBase.lineStyle(2, 0x00ffff, ringAlpha);
                            beamBase.strokeCircle(0, ringY, ringRadius);
                            beamBase.lineStyle(1, 0xffffff, ringAlpha * 0.5);
                            beamBase.strokeCircle(0, ringY, ringRadius * 0.8);
                        }
                        
                        // Spiraling energy lines
                        for (let i = 0; i < 3; i++) {
                            const angle = (time * 2 + i * Math.PI * 2 / 3);
                            const startX = Math.cos(angle) * topWidth * 0.8;
                            const endX = Math.cos(angle + wave) * bottomWidth * 0.9;
                            
                            beamBase.lineStyle(2, 0x66ddff, 0.4 * pulse);
                            beamBase.beginPath();
                            beamBase.moveTo(startX, 0);
                            beamBase.lineTo(endX, beamHeight);
                            beamBase.strokePath();
                        }
                        
                        // Bottom impact glow with ripples
                        const ripple = Math.sin(time * 5) * 0.1 + 0.9;
                        beamBase.fillStyle(0x00ffff, 0.15 * pulse);
                        beamBase.fillCircle(0, beamHeight, 70 * ripple);
                        beamBase.fillStyle(0xffffff, 0.25 * pulse);
                        beamBase.fillCircle(0, beamHeight, 45 * ripple);
                        beamBase.fillStyle(0x00ffff, 0.1 * pulse);
                        beamBase.fillCircle(0, beamHeight, 90 * ripple);
                        
                        // Update spiral particle positions
                        const spiralAngle = time * 4;
                        spiralParticles.setParticleSpeed(
                            Math.cos(spiralAngle) * 30,
                            beamHeight / 1.2
                        );
                    },
                    loop: true
                });
                
                // Create objective after beam starts
                this.scene.time.delayedCall(600, () => {
                    this.createSpaceObjectiveWithMaterialization(x, targetY);
                });
                
                // Clean up beam after animation
                this.scene.time.delayedCall(1800, () => {
                    beamPulse.destroy();
                    beamParticles.stop();
                    spiralParticles.stop();
                    
                    // Create final flash effect
                    const finalGlow = this.scene.add.graphics();
                    finalGlow.fillStyle(0x00ffff, 0);
                    finalGlow.fillCircle(x, targetY, 40);
                    finalGlow.setDepth(1000);
                    
                    // Final materialization flash
                    this.scene.tweens.add({
                        targets: finalGlow,
                        alpha: { from: 0.8, to: 0 },
                        scale: { from: 0.5, to: 2 },
                        duration: 400,
                        ease: 'Power2.easeOut',
                        onComplete: () => {
                            finalGlow.destroy();
                        }
                    });
                    
                    // Fade out beam
                    this.scene.tweens.add({
                        targets: beamContainer,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => {
                            beamContainer.destroy();
                            if (onComplete) onComplete();
                        }
                    });
                });
            }
        });
    }
    
    private createSpaceObjectiveWithMaterialization(x: number, y: number): void {
        
        // Clean up any existing particle system
        if (this.spaceParticles) {
            this.spaceParticles.destroy();
        }
        
        // Initialize new particle system
        this.spaceParticles = new SpaceArenaParticles(this.scene);
        
        console.log('Creating space objective with materialization at', x, y);
        
        // Create container first
        const objectiveContainer = this.scene.add.container(x, y);
        objectiveContainer.setSize(ARENA_CONFIG.objectiveSize, ARENA_CONFIG.objectiveSize);
        objectiveContainer.setDepth(Z_LAYERS.OBJECTIVE);
        
        // Start with container invisible for materialization
        objectiveContainer.setAlpha(0);
        objectiveContainer.setScale(0.1);
        
        // Create the space tech orb at 0,0 relative to container
        const spaceObjective = this.scene.add.image(0, 0, 'space_objective');
        spaceObjective.setScale(0.22);
        objectiveContainer.add(spaceObjective);
        
        // Gradual materialization animation
        this.scene.tweens.add({
            targets: objectiveContainer,
            alpha: 1,
            scale: 1,
            duration: 1200,
            ease: 'Power2.easeOut',
            onComplete: () => {
                // Add slow rotation animation for the tech orb
                this.scene.tweens.add({
                    targets: spaceObjective,
                    angle: 360,
                    duration: 15000,
                    repeat: -1,
                    ease: 'Linear'
                });
                
                // Add subtle floating animation to the container
                this.scene.tweens.add({
                    targets: objectiveContainer,
                    y: y - 3,
                    duration: 3000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                
                // Add pulsing scale effect
                this.scene.tweens.add({
                    targets: spaceObjective,
                    scale: { from: 0.22, to: 0.24 },
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Create glow effect graphics
        const glowGraphics = this.scene.add.graphics();
        objectiveContainer.add(glowGraphics);
        objectiveContainer.sendToBack(glowGraphics);
        
        // Animate glow during materialization
        let glowAlpha = 0;
        const glowAnimation = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
                glowAlpha = Math.min(1, glowAlpha + 0.02);
                glowGraphics.clear();
                
                // Outer glow
                glowGraphics.fillStyle(0x00ffff, 0.05 * glowAlpha);
                glowGraphics.fillCircle(0, 0, 60);
                glowGraphics.fillStyle(0x00ffff, 0.1 * glowAlpha);
                glowGraphics.fillCircle(0, 0, 45);
                glowGraphics.fillStyle(0xffffff, 0.15 * glowAlpha);
                glowGraphics.fillCircle(0, 0, 30);
            },
            loop: true
        });
        
        // Stop glow animation after materialization
        this.scene.time.delayedCall(1200, () => {
            glowAnimation.destroy();
            
            // Animate glow effect with pulsing
            this.scene.time.addEvent({
                delay: 16,
                callback: () => {
                    const time = this.scene.time.now / 1000;
                    const pulse = Math.sin(time * 2) * 0.3 + 0.7;
                    
                    glowGraphics.clear();
                    
                    // Outer glow
                    glowGraphics.fillStyle(0x00ffff, 0.05 * pulse);
                    glowGraphics.fillCircle(0, 0, 60);
                    glowGraphics.fillStyle(0x00ffff, 0.1 * pulse);
                    glowGraphics.fillCircle(0, 0, 45);
                    glowGraphics.fillStyle(0xffffff, 0.15 * pulse);
                    glowGraphics.fillCircle(0, 0, 30);
                },
                loop: true
            });
        });
        
        // Create energy particles that materialize with the objective
        const energyParticles = this.spaceParticles.createEnergyParticles(x, y, Z_LAYERS.OBJECTIVE - 1);
        
        // Start emitting particles after initial materialization
        this.scene.time.delayedCall(600, () => {
            energyParticles.start();
        });
        
        // Create orbiting particles
        const orbitParticles = this.spaceParticles.createOrbitingParticles(x, y, Z_LAYERS.OBJECTIVE - 1);
        
        // Animate orbiting particles after materialization
        this.scene.time.delayedCall(800, () => {
            this.spaceParticles?.startOrbitAnimation(orbitParticles, x, y);
        });
        
        // Store objective reference (using container as the objective)
        this.objective = objectiveContainer as any;
    }
    
    private applyThemeToObjective(): void {
        // Theme-specific configurations
        const themes = {
            ocean: {
                color: 0x0088FF,
                glowColor: 0x00AAFF,
                particleColor: 0x00FFFF,
                rotationSpeed: 0.5,
                pulseSpeed: 1000,
                specialEffect: 'bubbles'
            },
            space: {
                color: 0x8800FF,
                glowColor: 0xFF00FF,
                particleColor: 0xFFFFFF,
                rotationSpeed: 1,
                pulseSpeed: 800,
                specialEffect: 'stars'
            },
            forest: {
                color: 0x00AA00,
                glowColor: 0x00FF00,
                particleColor: 0xAAFF00,
                rotationSpeed: 0.3,
                pulseSpeed: 1200,
                specialEffect: 'leaves'
            },
            volcanic: {
                color: 0xFF4400,
                glowColor: 0xFFAA00,
                particleColor: 0xFF0000,
                rotationSpeed: 0.8,
                pulseSpeed: 600,
                specialEffect: 'embers'
            },
            crystal: {
                color: 0xAA00FF,
                glowColor: 0xFF00AA,
                particleColor: 0xFFAAFF,
                rotationSpeed: 0.4,
                pulseSpeed: 1500,
                specialEffect: 'shards'
            }
        };
        
        this.themeConfig = themes[this.currentTheme] || themes.ocean;
        this.rotationSpeed = this.themeConfig.rotationSpeed;
        
        // Apply visual theme to objective
        if (this.objective) {
            // TODO: Implement proper theming for Container-based Objective
            // The Objective is a Container, so setTint is not available
            // Could apply tint to individual child objects if needed
        }
    }
    
    private setupEventListeners(): void {
        // Objective interactions
        this.eventBus.on('bubble-hit-objective', (data) => this.handleObjectiveHit(data));
        this.eventBus.on('powerup-hit-objective', (data) => this.handlePowerupHit(data));
        
        // Shield events
        this.eventBus.on('objective-shield-activate', () => this.activateShield());
        this.eventBus.on('objective-shield-deactivate', () => this.deactivateShield());
        
        // Gem events
        this.eventBus.on('request-gem-throw', () => this.throwGemToRandomBubble());
        
        // Game state events
        this.eventBus.on('sudden-death', () => this.enterSuddenDeathMode());
        this.eventBus.on('game-pause', () => this.pauseGemDistribution());
        this.eventBus.on('game-resume', () => this.resumeGemDistribution());
    }
    
    private startIdleAnimation(): void {
        // Rotation animation
        this.scene.tweens.add({
            targets: this.objective,
            angle: 360,
            duration: 10000 / this.rotationSpeed,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Pulse animation
        this.scene.tweens.add({
            targets: this,
            pulseScale: 1.1,
            duration: this.themeConfig.pulseSpeed,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            onUpdate: () => {
                if (this.objective) {
                    this.objective.setScale(this.pulseScale);
                }
            }
        });
        
        // Create ambient particles
        this.createAmbientEffect();
    }
    
    private createAmbientEffect(): void {
        const { specialEffect, particleColor } = this.themeConfig;
        
        switch (specialEffect) {
            case 'bubbles':
                this.createBubbleEffect();
                break;
            case 'stars':
                this.createStarEffect();
                break;
            case 'leaves':
                this.createLeafEffect();
                break;
            case 'embers':
                this.createEmberEffect();
                break;
            case 'shards':
                this.createCrystalShardEffect();
                break;
        }
    }
    
    private createBubbleEffect(): void {
        // Create floating bubbles around objective
        this.scene.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                if (!this.objective || !this.objective.active) return;
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 50 + Math.random() * 30;
                const x = this.objective.x + Math.cos(angle) * distance;
                const y = this.objective.y + Math.sin(angle) * distance;
                
                const bubble = this.scene.add.circle(x, y, 5, this.themeConfig.particleColor, 0.6);
                bubble.setDepth(Z_LAYERS.EFFECTS || 500);
                
                this.scene.tweens.add({
                    targets: bubble,
                    y: y - 50,
                    alpha: 0,
                    scale: 2,
                    duration: 2000,
                    ease: 'Power2',
                    onComplete: () => bubble.destroy()
                });
            }
        });
    }
    
    private createStarEffect(): void {
        // Create twinkling stars
        this.scene.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                if (!this.objective || !this.objective.active) return;
                
                const angle = Math.random() * Math.PI * 2;
                const distance = 40 + Math.random() * 40;
                const x = this.objective.x + Math.cos(angle) * distance;
                const y = this.objective.y + Math.sin(angle) * distance;
                
                const star = this.scene.add.star(x, y, 4, 3, 6, this.themeConfig.particleColor);
                star.setDepth(Z_LAYERS.EFFECTS || 500);
                star.setAlpha(0);
                
                this.scene.tweens.add({
                    targets: star,
                    alpha: { from: 0, to: 1 },
                    scale: { from: 0.5, to: 1.5 },
                    angle: 360,
                    duration: 1500,
                    yoyo: true,
                    onComplete: () => star.destroy()
                });
            }
        });
    }
    
    private createLeafEffect(): void {
        // Falling leaves effect
        // Implementation similar to bubble effect but with leaf-like motion
    }
    
    private createEmberEffect(): void {
        // Rising embers effect
        // Implementation similar to star effect but moving upward
    }
    
    private createCrystalShardEffect(): void {
        // Floating crystal shards
        // Implementation with angular, crystalline shapes
    }
    
    /**
     * Start automatic gem distribution
     */
    private startGemDistribution(): void {
        console.log('    Starting gem distribution system');
        
        this.gemThrowTimer = this.scene.time.addEvent({
            delay: this.gemThrowInterval,
            callback: () => this.throwGemToRandomBubble(),
            loop: true
        });
        
        // Throw first gem after 3 seconds
        this.scene.time.delayedCall(3000, () => this.throwGemToRandomBubble());
    }
    
    /**
     * Throw a gem to a random bubble
     */
    private throwGemToRandomBubble(): void {
        // Get all eligible bubbles
        const eligibleBubbles = this.findEligibleBubbles();
        
        if (eligibleBubbles.length === 0) {
            return;
        }
        
        // Ensure fair distribution
        const target = this.selectFairTarget(eligibleBubbles);
        
        if (!target) return;
        
        // Animate gem throw
        this.animateGemThrow(target);
        
        // Update stats
        this.totalGemsThrown++;
        if (target.isPlayer) {
            this.playerGemsReceived++;
        } else {
            this.opponentGemsReceived++;
        }
        
        // Log for balance checking
        console.log(`Gem thrown to ${target.isPlayer ? 'PLAYER' : 'OPPONENT'} side. ` +
                   `Distribution: P${this.playerGemsReceived}/O${this.opponentGemsReceived}`);
    }
    
    /**
     * Find bubbles eligible for gem placement
     */
    private findEligibleBubbles(): GemThrowTarget[] {
        const bubbles = this.eventBus.emit('get-all-bubbles');
        const eligibleTargets: GemThrowTarget[] = [];
        
        // Process bubbles - implementation depends on bubble system
        // For now, return empty array
        return eligibleTargets;
    }
    
    /**
     * Select target ensuring fair distribution
     */
    private selectFairTarget(targets: GemThrowTarget[]): GemThrowTarget | null {
        if (targets.length === 0) return null;
        
        // Separate player and opponent targets
        const playerTargets = targets.filter(t => t.isPlayer);
        const opponentTargets = targets.filter(t => !t.isPlayer);
        
        // Determine which side should get the gem for fairness
        const playerRatio = this.playerGemsReceived / Math.max(1, this.totalGemsThrown);
        const shouldGiveToPlayer = playerRatio < 0.45; // Ensure at least 45% go to each side
        
        // Select from appropriate side
        const selectedTargets = shouldGiveToPlayer && playerTargets.length > 0 
            ? playerTargets 
            : opponentTargets.length > 0 
                ? opponentTargets 
                : targets;
        
        // Random selection from filtered targets
        return selectedTargets[Math.floor(Math.random() * selectedTargets.length)];
    }
    
    /**
     * Animate gem being thrown from objective to bubble
     */
    private animateGemThrow(target: GemThrowTarget): void {
        // Create star sprite at objective (space arena theme)
        const star = this.scene.add.image(
            this.objective.x,
            this.objective.y,
            'star-small'
        );
        star.setScale(1.2); // Make it visible during animation
        star.setDepth(Z_LAYERS.FLOATING_UI || 1000);
        
        // Objective throw animation
        this.playThrowAnimation();
        
        // Star flight path
        const duration = 800 + target.distance * 0.5;
        
        this.scene.tweens.add({
            targets: star,
            x: target.bubble.x,
            y: target.bubble.y,
            scale: { from:1.2, to: 0.5 },
            rotation: Math.PI * 2,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                star.destroy();
                
                // Add star to bubble
                if (target.bubble && target.bubble.addGem) {
                    target.bubble.addGem();
                }
                
                // Emit star placed event
                this.eventBus.emit('gem-placed', {
                    bubble: target.bubble,
                    isPlayer: target.isPlayer
                });
            }
        });
        
        // Trail effect
        this.createStarTrail(star, duration);
    }
    
    /**
     * Play objective throw animation
     */
    private playThrowAnimation(): void {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        // Quick expand and contract
        this.scene.tweens.add({
            targets: this.objective,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 200,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                this.isAnimating = false;
            }
        });
        
        // Flash effect
        const flash = this.scene.add.circle(
            this.objective.x,
            this.objective.y,
            40,
            0xFFD700,
            0.8
        );
        flash.setDepth(this.objective.depth - 1);
        
        this.scene.tweens.add({
            targets: flash,
            scale: 3,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => flash.destroy()
        });
        
        // Sound effect
        this.eventBus.emit('play-sound', { key: 'gem-throw' });
    }
    
    /**
     * Create trail effect for flying star
     */
    private createStarTrail(star: Phaser.GameObjects.Image, duration: number): void {
        // Create sparkle trail effect without texture  
        const trailTimer = this.scene.time.addEvent({
            delay: 50,
            repeat: duration / 50,
            callback: () => {
                const sparkle = this.scene.add.circle(
                    star.x + Phaser.Math.Between(-5, 5),
                    star.y + Phaser.Math.Between(-5, 5),
                    2, 0x00ccff  // Space blue color
                );
                sparkle.setAlpha(0.7);
                sparkle.setDepth(star.depth - 1);
                
                this.scene.tweens.add({
                    targets: sparkle,
                    scale: { from: 1, to: 0 },
                    alpha: { from: 0.6, to: 0 },
                    duration: 300,
                    onComplete: () => sparkle.destroy()
                });
            }
        });
        
        // Clean up timer when gem animation completes
        this.scene.time.delayedCall(duration + 300, () => {
            trailTimer.destroy();
        });
    }
    
    /**
     * Handle bubble hitting objective
     */
    private handleObjectiveHit(data: { bubble: any, damage: number }): void {
        if (this.objectiveShielded) {
            this.shieldHealth -= data.damage || 1;
            
            // Shield hit effect
            this.playShieldHitEffect();
            
            if (this.shieldHealth <= 0) {
                this.deactivateShield();
            }
        } else {
            // Direct hit effect
            this.playDirectHitEffect();
            
            // Knock back animation
            const knockbackX = data.bubble.x > this.objective.x ? -10 : 10;
            const knockbackY = data.bubble.y > this.objective.y ? -10 : 10;
            
            this.scene.tweens.add({
                targets: this.objective,
                x: this.objective.x + knockbackX,
                y: this.objective.y + knockbackY,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }
        
        // Bounce bubble back
        if (data.bubble && data.bubble.active) {
            data.bubble.destroy();
        }
    }
    
    /**
     * Handle power-up hitting objective
     */
    private handlePowerupHit(data: { type: string, damage: number }): void {
        // Special effects based on power-up type
        switch (data.type) {
            case 'bomb':
                this.scene.cameras.main.shake(300, 0.02);
                break;
            case 'laser':
                this.playLaserHitEffect();
                break;
            case 'freeze':
                this.freezeObjective();
                break;
        }
        
        // Apply damage if shielded
        if (this.objectiveShielded) {
            this.shieldHealth -= data.damage;
            if (this.shieldHealth <= 0) {
                this.deactivateShield();
            }
        }
    }
    
    /**
     * Activate objective shield
     */
    private activateShield(): void {
        if (this.objectiveShielded) return;
        
        this.objectiveShielded = true;
        this.shieldHealth = 3;
        
        // Create shield visual
        const shield = this.scene.add.circle(
            this.objective.x,
            this.objective.y,
            60,
            0x0088FF,
            0.3
        );
        shield.setStrokeStyle(2, 0x00FFFF);
        shield.setDepth(this.objective.depth + 1);
        
        // Animate shield
        this.scene.tweens.add({
            targets: shield,
            alpha: { from: 0, to: 0.3 },
            scale: { from: 0.8, to: 1 },
            duration: 300,
            ease: 'Power2'
        });
        
        // Store reference for removal
        this.objective.setData('shield', shield);
        
        console.log('Objective shield activated');
    }
    
    /**
     * Deactivate objective shield
     */
    private deactivateShield(): void {
        if (!this.objectiveShielded) return;
        
        this.objectiveShielded = false;
        
        // Remove shield visual
        const shield = this.objective.getData('shield');
        if (shield) {
            this.scene.tweens.add({
                targets: shield,
                alpha: 0,
                scale: 0.8,
                duration: 300,
                onComplete: () => shield.destroy()
            });
        }
        
        console.log('Objective shield deactivated');
    }
    
    /**
     * Enter sudden death mode
     */
    private enterSuddenDeathMode(): void {
        // Increase gem throw frequency
        this.gemThrowInterval = 4000; // Twice as fast
        
        // Update timer
        if (this.gemThrowTimer) {
            this.gemThrowTimer.destroy();
        }
        
        this.gemThrowTimer = this.scene.time.addEvent({
            delay: this.gemThrowInterval,
            callback: () => this.throwGemToRandomBubble(),
            loop: true
        });
        
        // Change objective appearance - tint all components since it's a container
        if (this.objective) {
            // Iterate through all children and tint them
            this.objective.each((child: any) => {
                if (child.setTint) {
                    child.setTint(0xFFD700); // Golden tint
                }
            });
        }
        
        // Increase animation speed
        this.rotationSpeed = 2;
        
        console.log('Objective entering sudden death mode');
    }
    
    /**
     * Pause gem distribution
     */
    private pauseGemDistribution(): void {
        if (this.gemThrowTimer) {
            this.gemThrowTimer.paused = true;
        }
    }
    
    /**
     * Resume gem distribution
     */
    private resumeGemDistribution(): void {
        if (this.gemThrowTimer) {
            this.gemThrowTimer.paused = false;
        }
    }
    
    // Visual effect methods
    
    private playShieldHitEffect(): void {
        const shield = this.objective.getData('shield');
        if (!shield) return;
        
        // Flash shield
        this.scene.tweens.add({
            targets: shield,
            alpha: { from: 0.8, to: 0.3 },
            duration: 100,
            yoyo: true
        });
    }
    
    private playDirectHitEffect(): void {
        // Flash objective red - iterate through children since it's a container
        if (this.objective) {
            this.objective.each((child: any) => {
                if (child.setTint) {
                    child.setTint(0xFF0000);
                }
            });
            this.scene.time.delayedCall(100, () => {
                this.objective.each((child: any) => {
                    if (child.setTint) {
                        child.setTint(this.themeConfig.color);
                    }
                });
            });
        }
    }
    
    private playLaserHitEffect(): void {
        // Create laser burn effect
        const burn = this.scene.add.circle(
            this.objective.x,
            this.objective.y,
            50,
            0xFF0000,
            0.6
        );
        burn.setDepth(this.objective.depth + 1);
        
        this.scene.tweens.add({
            targets: burn,
            scale: 1.5,
            alpha: 0,
            duration: 500,
            onComplete: () => burn.destroy()
        });
    }
    
    private freezeObjective(): void {
        // Only freeze the objective's own tweens, not all scene tweens
        if (this.objective) {
            // Store the frozen tint
            this.objective.each((child: any) => {
                if (child.setTint) {
                    child.setTint(0x88CCFF);
                }
                // Pause only this object's tweens
                if (this.scene.tweens.getTweensOf(child).length > 0) {
                    this.scene.tweens.getTweensOf(child).forEach((tween: any) => {
                        tween.pause();
                    });
                }
            });
        }
        
        // Unfreeze after 2 seconds
        this.scene.time.delayedCall(2000, () => {
            if (this.objective) {
                this.objective.each((child: any) => {
                    if (child.setTint) {
                        child.setTint(this.themeConfig.color);
                    }
                    // Resume only this object's tweens
                    if (this.scene.tweens.getTweensOf(child).length > 0) {
                        this.scene.tweens.getTweensOf(child).forEach((tween: any) => {
                            tween.resume();
                        });
                    }
                });
            }
        });
    }
    
    public update(time: number, delta: number): void {
        // Update objective state if needed
    }
    
    public destroy(): void {
        // Stop gem distribution
        if (this.gemThrowTimer) {
            this.gemThrowTimer.destroy();
            this.gemThrowTimer = undefined;
        }
        
        // Destroy objective
        if (this.objective) {
            this.objective.destroy();
            this.objective = undefined as any; // Clear reference
        }
        
        // Clear particle system
        if (this.spaceParticles) {
            this.spaceParticles.destroy();
            this.spaceParticles = undefined;
        }
        
        // Remove event listeners
        this.eventBus.removeAllListeners();
        
        super.destroy();
    }
    
    // Public getters
    public getObjective(): Objective {
        return this.objective;
    }
    
    public isShielded(): boolean {
        return this.objectiveShielded;
    }
    
    public getGemDistributionStats(): any {
        return {
            total: this.totalGemsThrown,
            player: this.playerGemsReceived,
            opponent: this.opponentGemsReceived,
            fairness: Math.abs(0.5 - (this.playerGemsReceived / Math.max(1, this.totalGemsThrown)))
        };
    }
}