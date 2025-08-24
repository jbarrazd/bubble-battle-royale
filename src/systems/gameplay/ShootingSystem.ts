import Phaser from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { Launcher } from '@/gameObjects/Launcher';
import { BubbleColor } from '@/types/ArenaTypes';
import { InputManager } from '@/systems/input/InputManager';
import { TrajectoryPreview } from './TrajectoryPreview';
import { BubbleQueue } from './BubbleQueue';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { BubbleGrid } from './BubbleGrid';
import { ARENA_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';

export interface IProjectile {
    bubble: Bubble;
    velocity: Phaser.Math.Vector2;
    isActive: boolean;
}

export class ShootingSystem {
    private scene: Phaser.Scene;
    private inputManager: InputManager;
    private playerLauncher: Launcher;
    
    // Shooting mechanics
    private projectiles: IProjectile[] = [];
    private currentBubble: Bubble | null = null;
    private bubbleQueue: BubbleQueue;
    private canShoot: boolean = true;
    private cooldownTime: number = 1000; // 1 second in milliseconds
    private shootSpeed: number = 600; // pixels per second
    
    // Arena boundaries for bouncing
    private bounds: Phaser.Geom.Rectangle;
    
    // Cooldown indicator
    private cooldownBar?: Phaser.GameObjects.Graphics;
    private cooldownBarBg?: Phaser.GameObjects.Rectangle;
    
    // Trajectory preview
    private trajectoryPreview: TrajectoryPreview;
    
    // Grid attachment
    private gridAttachmentSystem?: GridAttachmentSystem;
    private bubbleGrid?: BubbleGrid;
    
    constructor(
        scene: Phaser.Scene,
        inputManager: InputManager,
        playerLauncher: Launcher,
        gridAttachmentSystem?: GridAttachmentSystem,
        bubbleGrid?: BubbleGrid
    ) {
        this.scene = scene;
        this.inputManager = inputManager;
        this.playerLauncher = playerLauncher;
        this.gridAttachmentSystem = gridAttachmentSystem;
        this.bubbleGrid = bubbleGrid;
        
        // Set arena bounds for wall bouncing
        this.bounds = new Phaser.Geom.Rectangle(
            0,
            0,
            scene.cameras.main.width,
            scene.cameras.main.height
        );
        
        // Initialize trajectory preview
        this.trajectoryPreview = new TrajectoryPreview(scene, playerLauncher);
        
        // Initialize bubble queue
        this.bubbleQueue = new BubbleQueue(scene, playerLauncher.x, playerLauncher.y);
        
        this.setupShooting();
    }
    
    private setupShooting(): void {
        // Listen for pointer events
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointerup', this.onShoot, this);
        
        // Create cooldown indicator
        this.createCooldownIndicator();
        
        // Initialize bubble queue
        this.loadNextBubble();
    }
    
    private onPointerDown(): void {
        if (this.canShoot) {
            // Show trajectory preview when aiming
            const angle = this.playerLauncher.getAimAngle();
            this.trajectoryPreview.show(angle);
        }
    }
    
    private createCooldownIndicator(): void {
        const launcherY = this.playerLauncher.y + 40;
        
        // Background bar
        this.cooldownBarBg = this.scene.add.rectangle(
            this.playerLauncher.x,
            launcherY,
            80,
            6,
            0x2c3e50
        );
        this.cooldownBarBg.setStrokeStyle(1, 0x34495e);
        this.cooldownBarBg.setDepth(Z_LAYERS.UI);
        this.cooldownBarBg.setVisible(false);
        
        // Progress bar
        this.cooldownBar = this.scene.add.graphics();
        this.cooldownBar.setDepth(Z_LAYERS.UI);
    }
    
    private startCooldownAnimation(): void {
        this.cooldownBarBg?.setVisible(true);
        
        if (!this.cooldownBar) return;
        
        const barX = this.playerLauncher.x - 40;
        const barY = this.playerLauncher.y + 37;
        const barWidth = 80;
        const barHeight = 6;
        
        // Animate cooldown bar
        this.scene.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: this.cooldownTime,
            ease: 'Linear',
            onUpdate: (tween) => {
                const progress = tween.getValue();
                this.cooldownBar?.clear();
                this.cooldownBar?.fillStyle(0x27ae60, 1);
                this.cooldownBar?.fillRect(
                    barX,
                    barY,
                    barWidth * progress,
                    barHeight
                );
            },
            onComplete: () => {
                this.cooldownBar?.clear();
            }
        });
    }
    
    private loadNextBubble(): void {
        // Get next bubble from queue
        this.currentBubble = this.bubbleQueue.getNextBubble();
        
        if (this.currentBubble) {
            // Position bubble in launcher
            this.currentBubble.setPosition(
                this.playerLauncher.x,
                this.playerLauncher.y - 30
            );
            this.currentBubble.setDepth(Z_LAYERS.BUBBLES);
            this.currentBubble.setScale(0.8); // Slightly smaller when in launcher
        }
    }
    
    private onShoot(): void {
        // Hide trajectory preview
        this.trajectoryPreview.hide();
        
        if (!this.canShoot || !this.currentBubble) return;
        
        // Get launcher angle and direction
        const angle = this.playerLauncher.getAimAngle();
        const direction = this.playerLauncher.getAimDirection();
        
        // Create velocity vector
        const velocity = new Phaser.Math.Vector2(
            direction.x * this.shootSpeed,
            direction.y * this.shootSpeed
        );
        
        // Set bubble to normal size
        this.currentBubble.setScale(1);
        
        // Add to active projectiles
        this.projectiles.push({
            bubble: this.currentBubble,
            velocity: velocity,
            isActive: true
        });
        
        // Play launcher animation
        this.playerLauncher.animateShoot();
        
        // Start cooldown with visual indicator
        this.canShoot = false;
        this.startCooldownAnimation();
        
        this.scene.time.delayedCall(this.cooldownTime, () => {
            this.canShoot = true;
            this.playerLauncher.setHighlight(false);
            this.cooldownBarBg?.setVisible(false);
        });
        
        // Visual feedback during cooldown
        this.playerLauncher.setHighlight(true);
        
        // Load next bubble after a short delay
        this.currentBubble = null;
        this.scene.time.delayedCall(100, () => {
            this.loadNextBubble();
        });
    }
    
    public update(delta: number): void {
        // Update trajectory preview if aiming
        if (this.canShoot && this.inputManager.isPointerActive()) {
            const angle = this.playerLauncher.getAimAngle();
            this.trajectoryPreview.update(angle, delta);
        }
        
        // Update all active projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            
            if (!projectile.isActive) {
                // Remove inactive projectiles
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Update bubble position
            projectile.bubble.x += projectile.velocity.x * (delta / 1000);
            projectile.bubble.y += projectile.velocity.y * (delta / 1000);
            
            // Check for grid collision if attachment system is available
            if (this.gridAttachmentSystem) {
                const hitBubble = this.gridAttachmentSystem.checkCollision(projectile.bubble);
                if (hitBubble) {
                    // Find attachment position
                    const attachPos = this.gridAttachmentSystem.findAttachmentPosition(
                        projectile.bubble, 
                        hitBubble
                    );
                    
                    if (attachPos) {
                        // Attach to grid
                        projectile.isActive = false;
                        this.gridAttachmentSystem.attachToGrid(projectile.bubble, attachPos);
                        continue;
                    }
                }
            }
            
            // Check for wall collisions
            this.checkWallCollision(projectile);
            
            // Check if bubble went out of bounds
            if (projectile.bubble.y < -50 || projectile.bubble.y > this.bounds.height + 50) {
                projectile.isActive = false;
                projectile.bubble.destroy();
            }
        }
    }
    
    private checkWallCollision(projectile: IProjectile): void {
        const bubble = projectile.bubble;
        const radius = 16; // Bubble radius
        
        // Left wall
        if (bubble.x - radius <= this.bounds.left) {
            bubble.x = this.bounds.left + radius;
            projectile.velocity.x = Math.abs(projectile.velocity.x); // Bounce right
        }
        
        // Right wall
        if (bubble.x + radius >= this.bounds.right) {
            bubble.x = this.bounds.right - radius;
            projectile.velocity.x = -Math.abs(projectile.velocity.x); // Bounce left
        }
        
        // Top wall - bubble explodes when reaching opponent side
        if (bubble.y - radius <= this.bounds.top) {
            // Bubble reached the top (opponent zone), explode it
            projectile.isActive = false;
            bubble.pop();
            
            // TODO: Future feature - if bubble passes near opponent launcher, apply slow debuff
        }
    }
    
    public isReady(): boolean {
        return this.canShoot;
    }
    
    public getProjectileCount(): number {
        return this.projectiles.length;
    }
    
    public destroy(): void {
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointerup', this.onShoot, this);
        
        // Clean up trajectory preview
        this.trajectoryPreview?.destroy();
        
        // Clean up projectiles
        this.projectiles.forEach(p => {
            if (p.bubble) p.bubble.destroy();
        });
        this.projectiles = [];
        
        // Clean up current bubble
        if (this.currentBubble) {
            this.currentBubble.destroy();
        }
        
        // Clean up bubble queue
        this.bubbleQueue?.destroy();
        
        // Clean up cooldown indicator
        this.cooldownBar?.destroy();
        this.cooldownBarBg?.destroy();
    }
}