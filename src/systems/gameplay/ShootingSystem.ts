import Phaser from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { Launcher } from '@/gameObjects/Launcher';
import { BubbleColor } from '@/types/ArenaTypes';
import { InputManager } from '@/systems/input/InputManager';
import { TrajectoryPreview } from './TrajectoryPreview';
// BubbleQueue removed - integrated into Launcher
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { BubbleGrid } from './BubbleGrid';
import { ARENA_CONFIG, Z_LAYERS, BUBBLE_CONFIG } from '@/config/ArenaConfig';

export interface IProjectile {
    bubble: Bubble;
    velocity: Phaser.Math.Vector2;
    isActive: boolean;
}

export class ShootingSystem {
    private scene: Phaser.Scene;
    private inputManager: InputManager;
    private playerLauncher: Launcher;
    private opponentLauncher?: Launcher;
    
    // Shooting mechanics
    private projectiles: IProjectile[] = [];
    private currentBubble: Bubble | null = null;
    private nextBubbleColors: BubbleColor[] = []; // Store next 2-3 colors for launcher rings
    private availableColors: BubbleColor[] = [
        BubbleColor.RED,
        BubbleColor.BLUE, 
        BubbleColor.GREEN,
        BubbleColor.YELLOW,
        BubbleColor.PURPLE
    ];
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
        
        // Initialize next bubble colors for integrated queue
        this.generateNextBubbleColors();
        
        this.setupShooting();
    }
    
    private setupShooting(): void {
        // Listen for pointer events
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointerup', this.onShoot, this);
        
        // Listen for AI shoot events
        this.scene.events.on('ai-shoot', this.onAIShoot, this);
        
        // Create cooldown indicator
        this.createCooldownIndicator();
        
        // Initialize bubble queue
        this.loadNextBubble();
        
        // Initialize launcher rings with queue colors
        this.playerLauncher.updateQueueColors(this.nextBubbleColors);
    }
    
    public setOpponentLauncher(launcher: Launcher): void {
        this.opponentLauncher = launcher;
    }
    
    private onPointerDown(): void {
        if (this.canShoot && this.currentBubble) {
            // Show trajectory preview when aiming with current bubble color
            const angle = this.playerLauncher.getAimAngle();
            const bubbleColor = this.currentBubble.getColor();
            this.trajectoryPreview.show(angle, bubbleColor);
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
    
    /**
     * Generates next bubble colors for the integrated queue system
     */
    private generateNextBubbleColors(): void {
        // Generate 3 colors: current + next 2
        this.nextBubbleColors = [];
        for (let i = 0; i < 3; i++) {
            const randomColor = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
            this.nextBubbleColors.push(randomColor);
        }
        
        console.log('ShootingSystem: Generated next bubble colors:', this.nextBubbleColors);
    }
    
    /**
     * Loads next bubble using integrated queue system
     */
    private loadNextBubble(): void {
        // Get current color (first in queue)
        const currentColor = this.nextBubbleColors[0] || BubbleColor.BLUE;
        
        console.log('ShootingSystem: Loading bubble color:', currentColor);
        
        // Load bubble into launcher
        this.playerLauncher.loadBubble(currentColor);
        
        // Get the loaded bubble from the launcher
        this.currentBubble = this.playerLauncher.getLoadedBubble();
        
        // Shift queue and add new color
        this.nextBubbleColors.shift(); // Remove current color
        const newColor = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
        this.nextBubbleColors.push(newColor); // Add new color at end
        
        // Update launcher queue rings with new colors
        this.playerLauncher.updateQueueColors(this.nextBubbleColors);
        
        console.log('ShootingSystem: Updated queue colors:', this.nextBubbleColors);
    }
    
    private onShoot(): void {
        // Hide trajectory preview
        this.trajectoryPreview.hide();
        
        if (!this.canShoot || !this.currentBubble) return;
        
        // No turn checking - allow simultaneous shooting
        
        // Get launcher angle and direction
        const angle = this.playerLauncher.getAimAngle();
        const direction = this.playerLauncher.getAimDirection();
        
        // Create velocity vector
        const velocity = new Phaser.Math.Vector2(
            direction.x * this.shootSpeed,
            direction.y * this.shootSpeed
        );
        
        // Remove bubble from launcher before shooting
        this.playerLauncher.clearLoadedBubble();
        
        // Position bubble at launcher's world position for shooting
        this.currentBubble.setPosition(
            this.playerLauncher.x,
            this.playerLauncher.y - 35 // Match bubble position in launcher
        );
        
        // Set bubble to normal size and mark as player shot
        this.currentBubble.setScale(1);
        this.currentBubble.setShooter('player');
        // Return depth to projectile layer
        this.currentBubble.setDepth(Z_LAYERS.BUBBLES_FRONT);
        
        // Add to active projectiles
        this.projectiles.push({
            bubble: this.currentBubble,
            velocity: velocity,
            isActive: true
        });
        
        // Emit shooting started event
        this.scene.events.emit('shooting-started');
        
        // Emit bubble shoot event for sound system
        this.scene.events.emit('bubble-shoot');
        
        // Play launcher animation with the color of the bubble being shot
        const shotBubbleColor = this.currentBubble.getColor();
        this.playerLauncher.animateShoot(shotBubbleColor);
        
        // Start cooldown with visual indicator
        this.canShoot = false;
        this.startCooldownAnimation();
        
        this.scene.time.delayedCall(this.cooldownTime, () => {
            this.canShoot = true;
            this.playerLauncher.setHighlight(false);
            this.cooldownBarBg?.setVisible(false);
            // Load next bubble after cooldown completes (like opponent)
            this.loadNextBubble();
        });
        
        // Visual feedback during cooldown
        this.playerLauncher.setHighlight(true);
        
        // Clear current bubble immediately
        this.currentBubble = null;
    }
    
    private onAIShoot = (data: any): void => {
        if (!this.opponentLauncher) return;
        
        console.log('ShootingSystem: AI shooting angle=' + data.angle + ' color=0x' + data.color.toString(16));
        
        // Use the bubble that AI already has loaded (if provided)
        let aiBubble: Bubble;
        if (data.bubble) {
            // Use the existing bubble from AI
            aiBubble = data.bubble;
            aiBubble.setShooter('ai');
            aiBubble.setDepth(Z_LAYERS.BUBBLES_FRONT);
        } else {
            // Fallback: create new bubble (shouldn't happen)
            console.warn('ShootingSystem: AI bubble not provided, creating new one');
            aiBubble = new Bubble(
                this.scene,
                this.opponentLauncher.x,
                this.opponentLauncher.y + 35, // Match bubble position (inverted for opponent)
                data.color
            );
            aiBubble.setShooter('ai');
            aiBubble.setDepth(Z_LAYERS.BUBBLES_FRONT);
        }
        
        // Calculate velocity based on angle
        // AI uses standard math angles where:
        // 0° = right, 90° = down, 180° = left, 270° = up
        // No conversion needed!
        const radians = Phaser.Math.DegToRad(data.angle);
        const velocity = new Phaser.Math.Vector2(
            Math.cos(radians) * this.shootSpeed,
            Math.sin(radians) * this.shootSpeed
        );
        
        console.log(`ShootingSystem: Velocity x=${velocity.x.toFixed(1)} y=${velocity.y.toFixed(1)}`);
        
        // Create projectile
        const projectile: IProjectile = {
            bubble: aiBubble,
            velocity: velocity,
            isActive: true
        };
        
        this.projectiles.push(projectile);
        
        // Emit shooting started event
        this.scene.events.emit('shooting-started', { isAI: true });
        
        // Emit AI bubble shoot event for sound system
        this.scene.events.emit('bubble-shoot', { isAI: true });
        
        // Visual feedback on opponent launcher
        this.opponentLauncher.setHighlight(true);
        this.scene.time.delayedCall(200, () => {
            this.opponentLauncher.setHighlight(false);
        });
    }
    
    public update(delta: number): void {
        // Update trajectory preview if aiming
        if (this.canShoot && this.inputManager.isPointerActive() && this.currentBubble) {
            const angle = this.playerLauncher.getAimAngle();
            const bubbleColor = this.currentBubble.getColor();
            this.trajectoryPreview.update(angle, delta, bubbleColor);
        }
        
        // Check for projectile-to-projectile collisions
        this.checkProjectileCollisions();
        
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
            
            // Emit position update for chest collision detection
            this.scene.events.emit('bubble-position-update', projectile.bubble);
            
            // Check if this bubble was marked as hit (chest collision)
            if (!projectile.bubble.visible) {
                projectile.isActive = false;
                continue;
            }
            
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
                        // Validate that the position is reasonable (not too far from hit point)
                        const pixelPos = this.bubbleGrid?.hexToPixel(attachPos);
                        if (pixelPos) {
                            const distance = Phaser.Math.Distance.Between(
                                projectile.bubble.x, projectile.bubble.y,
                                pixelPos.x, pixelPos.y
                            );
                            
                            // Only attach if distance is reasonable (within 2 bubble diameters)
                            if (distance < BUBBLE_CONFIG.SIZE * 2) {
                                projectile.isActive = false;
                                
                                // Stop the bubble's movement immediately
                                projectile.velocity.x = 0;
                                projectile.velocity.y = 0;
                                
                                // Attach to grid with callback
                                this.gridAttachmentSystem.attachToGrid(projectile.bubble, attachPos, () => {
                                    // Emit shooting complete event after attachment
                                    this.scene.events.emit('shooting-complete');
                                });
                                
                                continue;
                            }
                        }
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
    
    private checkProjectileCollisions(): void {
        const radius = BUBBLE_CONFIG.SIZE / 2;
        
        // Check each projectile against all others
        for (let i = 0; i < this.projectiles.length; i++) {
            const proj1 = this.projectiles[i];
            if (!proj1.isActive) continue;
            
            for (let j = i + 1; j < this.projectiles.length; j++) {
                const proj2 = this.projectiles[j];
                if (!proj2.isActive) continue;
                
                // Calculate distance between projectiles
                const distance = Phaser.Math.Distance.Between(
                    proj1.bubble.x, proj1.bubble.y,
                    proj2.bubble.x, proj2.bubble.y
                );
                
                // Check if collision occurred
                if (distance < radius * 2) {
                    // Calculate collision normal
                    const dx = proj2.bubble.x - proj1.bubble.x;
                    const dy = proj2.bubble.y - proj1.bubble.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    
                    if (len > 0) {
                        // Normalize
                        const nx = dx / len;
                        const ny = dy / len;
                        
                        // Separate bubbles
                        const overlap = (radius * 2) - distance;
                        proj1.bubble.x -= nx * overlap * 0.5;
                        proj1.bubble.y -= ny * overlap * 0.5;
                        proj2.bubble.x += nx * overlap * 0.5;
                        proj2.bubble.y += ny * overlap * 0.5;
                        
                        // Calculate relative velocity
                        const relVelX = proj2.velocity.x - proj1.velocity.x;
                        const relVelY = proj2.velocity.y - proj1.velocity.y;
                        const speed = relVelX * nx + relVelY * ny;
                        
                        // Don't resolve if velocities are separating
                        if (speed < 0) continue;
                        
                        // Apply elastic collision with some damping
                        const impulse = speed * 0.8; // 0.8 = restitution coefficient
                        
                        proj1.velocity.x += impulse * nx;
                        proj1.velocity.y += impulse * ny;
                        proj2.velocity.x -= impulse * nx;
                        proj2.velocity.y -= impulse * ny;
                        
                        // Add small random deviation to prevent stuck bubbles
                        proj1.velocity.x += (Math.random() - 0.5) * 20;
                        proj1.velocity.y += (Math.random() - 0.5) * 20;
                        proj2.velocity.x += (Math.random() - 0.5) * 20;
                        proj2.velocity.y += (Math.random() - 0.5) * 20;
                        
                        // Emit projectile collision event for sound/haptics
                        this.scene.events.emit('projectile-collision');
                    }
                }
            }
        }
    }
    
    private checkWallCollision(projectile: IProjectile): void {
        const bubble = projectile.bubble;
        const radius = BUBBLE_CONFIG.SIZE / 2;
        
        // Left wall
        if (bubble.x - radius <= this.bounds.left) {
            bubble.x = this.bounds.left + radius;
            projectile.velocity.x = Math.abs(projectile.velocity.x); // Bounce right
            this.scene.events.emit('wall-bounce');
        }
        
        // Right wall
        if (bubble.x + radius >= this.bounds.right) {
            bubble.x = this.bounds.right - radius;
            projectile.velocity.x = -Math.abs(projectile.velocity.x); // Bounce left
            this.scene.events.emit('wall-bounce');
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
        
        // Queue is now integrated into launcher - no separate cleanup needed
        
        // Clean up cooldown indicator
        this.cooldownBar?.destroy();
        this.cooldownBarBg?.destroy();
    }
}