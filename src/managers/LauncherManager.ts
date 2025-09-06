/**
 * LauncherManager - Manages player and opponent launchers
 * Handles launcher state, aiming, next bubble, and shooting mechanics
 */

import { Scene } from 'phaser';
import { BaseGameSystem } from '@/core/SystemRegistry';
import { GameEventBus } from '@/core/EventBus';
import { GameStateManager } from '@/core/GameStateManager';
import { Launcher } from '@/gameObjects/Launcher';
import { BubbleColor } from '@/types/ArenaTypes';
import { ARENA_CONFIG } from '@/config/ArenaConfig';
import { ArenaZone } from '@/types/ArenaTypes';

export enum LauncherState {
    IDLE = 'idle',
    AIMING = 'aiming',
    CHARGING = 'charging',
    FIRING = 'firing',
    RELOADING = 'reloading',
    DISABLED = 'disabled'
}

interface LauncherConfig {
    position: { x: number, y: number };
    isPlayer: boolean;
    minAngle: number;
    maxAngle: number;
    reloadTime: number;
}

export class LauncherManager extends BaseGameSystem {
    public name = 'LauncherManager';
    public priority = 15; // Initialize early, needed by other systems
    
    private eventBus: GameEventBus;
    private gameState: GameStateManager;
    
    // Launchers
    private playerLauncher: Launcher;
    private opponentLauncher: Launcher;
    
    // Launcher states
    private playerState: LauncherState = LauncherState.IDLE;
    private opponentState: LauncherState = LauncherState.IDLE;
    
    // Aiming
    private playerAimAngle: number = -90;
    private opponentAimAngle: number = 90;
    private aimingLauncher: 'player' | 'opponent' | null = null;
    
    // Next bubbles queue
    private playerNextBubbles: BubbleColor[] = [];
    private opponentNextBubbles: BubbleColor[] = [];
    private readonly NEXT_QUEUE_SIZE = 3;
    
    // Shooting power
    private playerPower: number = 0;
    private opponentPower: number = 0;
    private readonly MAX_POWER = 1200;
    private readonly MIN_POWER = 800;
    
    // Theme
    private currentTheme: string;
    
    public initialize(): void {
        console.log('  → Initializing LauncherManager...');
        
        this.eventBus = GameEventBus.getInstance();
        this.gameState = GameStateManager.getInstance();
        this.currentTheme = this.scene.registry.get('gameTheme') || 'ocean';
        
        this.createLaunchers();
        this.initializeNextQueues();
        this.setupEventListeners();
        
        this.markInitialized();
    }
    
    private createLaunchers(): void {
        const { width, height } = this.scene.cameras.main;
        const centerX = width / 2;
        
        // Use ARENA_CONFIG for proper zone positioning
        const playerY = height - ARENA_CONFIG.launcherOffset;
        const opponentY = ARENA_CONFIG.launcherOffset;
        
        // Create player launcher at bottom
        this.playerLauncher = new Launcher(
            this.scene,
            centerX,
            playerY,
            ArenaZone.PLAYER
        );
        
        // Create opponent launcher at top
        this.opponentLauncher = new Launcher(
            this.scene,
            centerX,
            opponentY,
            ArenaZone.OPPONENT
        );
        
        console.log('    Created player and opponent launchers');
    }
    
    private initializeNextQueues(): void {
        // Fill player queue
        for (let i = 0; i < this.NEXT_QUEUE_SIZE; i++) {
            this.playerNextBubbles.push(this.getRandomColor());
        }
        
        // Fill opponent queue
        for (let i = 0; i < this.NEXT_QUEUE_SIZE; i++) {
            this.opponentNextBubbles.push(this.getRandomColor());
        }
        
        // Update launcher displays
        this.updateLauncherBubbles();
    }
    
    private getRandomColor(): BubbleColor {
        const colors = [
            BubbleColor.RED,
            BubbleColor.BLUE,
            BubbleColor.GREEN,
            BubbleColor.YELLOW,
            BubbleColor.PURPLE
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    private updateLauncherBubbles(): void {
        // Update player launcher
        if (this.playerLauncher && this.playerNextBubbles.length > 0) {
            this.playerLauncher.loadBubble(this.playerNextBubbles[0]);
            this.playerLauncher.updateQueueColors(this.playerNextBubbles);
        }
        
        // Update opponent launcher
        if (this.opponentLauncher && this.opponentNextBubbles.length > 0) {
            this.opponentLauncher.loadBubble(this.opponentNextBubbles[0]);
            this.opponentLauncher.updateQueueColors(this.opponentNextBubbles);
        }
    }
    
    private setupEventListeners(): void {
        // Turn events
        this.eventBus.on('player-turn', () => this.enablePlayerLauncher());
        this.eventBus.on('opponent-turn', () => this.enableOpponentLauncher());
        
        // Aiming events
        this.eventBus.on('start-aiming', (data) => this.startAiming(data.isPlayer));
        this.eventBus.on('update-aim', (data) => this.updateAim(data));
        this.eventBus.on('stop-aiming', (data) => this.stopAiming(data.isPlayer));
        
        // Shooting events
        this.eventBus.on('start-charging', (data) => this.startCharging(data.isPlayer));
        this.eventBus.on('fire-launcher', (data) => this.fireLauncher(data));
        
        // Reload events
        this.eventBus.on('launcher-fired', (data) => this.handleLauncherFired(data));
        
        // Power-up events
        this.eventBus.on('powerup-activated', (data) => this.handlePowerUp(data));
        
        // Theme changes
        this.eventBus.on('theme-changed', (data) => this.updateTheme(data.theme));
    }
    
    /**
     * Enable player launcher for their turn
     */
    private enablePlayerLauncher(): void {
        this.playerState = LauncherState.IDLE;
        this.opponentState = LauncherState.DISABLED;
        
        if (this.playerLauncher) {
            this.playerLauncher.setActive(true);
            this.playerLauncher.showAimLine(true);
        }
        
        if (this.opponentLauncher) {
            this.opponentLauncher.setActive(false);
            this.opponentLauncher.showAimLine(false);
        }
        
        console.log('Player launcher enabled');
    }
    
    /**
     * Enable opponent launcher for their turn
     */
    private enableOpponentLauncher(): void {
        this.playerState = LauncherState.DISABLED;
        this.opponentState = LauncherState.IDLE;
        
        if (this.playerLauncher) {
            this.playerLauncher.setActive(false);
            this.playerLauncher.showAimLine(false);
        }
        
        if (this.opponentLauncher) {
            this.opponentLauncher.setActive(true);
            // AI doesn't show aim line to player
        }
        
        console.log('Opponent launcher enabled');
    }
    
    /**
     * Start aiming mode
     */
    private startAiming(isPlayer: boolean): void {
        if (isPlayer && this.playerState === LauncherState.IDLE) {
            this.playerState = LauncherState.AIMING;
            this.aimingLauncher = 'player';
            
            if (this.playerLauncher) {
                this.playerLauncher.startAiming();
            }
        } else if (!isPlayer && this.opponentState === LauncherState.IDLE) {
            this.opponentState = LauncherState.AIMING;
            this.aimingLauncher = 'opponent';
            
            if (this.opponentLauncher) {
                this.opponentLauncher.startAiming();
            }
        }
    }
    
    /**
     * Update aim angle
     */
    private updateAim(data: { isPlayer: boolean, angle?: number, x?: number, y?: number }): void {
        const launcher = data.isPlayer ? this.playerLauncher : this.opponentLauncher;
        const state = data.isPlayer ? this.playerState : this.opponentState;
        
        if (state !== LauncherState.AIMING || !launcher) return;
        
        let angle: number;
        
        if (data.angle !== undefined) {
            angle = data.angle;
        } else if (data.x !== undefined && data.y !== undefined) {
            // Calculate angle from position
            const dx = data.x - launcher.x;
            const dy = data.y - launcher.y;
            angle = Math.atan2(dy, dx) * (180 / Math.PI);
        } else {
            return;
        }
        
        // Clamp angle to launcher limits
        const minAngle = data.isPlayer ? -170 : 10;
        const maxAngle = data.isPlayer ? -10 : 170;
        angle = Phaser.Math.Clamp(angle, minAngle, maxAngle);
        
        // Update launcher aim
        launcher.setAngle(angle);
        launcher.updateAimLine(angle);
        
        // Store angle
        if (data.isPlayer) {
            this.playerAimAngle = angle;
        } else {
            this.opponentAimAngle = angle;
        }
    }
    
    /**
     * Stop aiming mode
     */
    private stopAiming(isPlayer: boolean): void {
        if (isPlayer && this.playerState === LauncherState.AIMING) {
            this.playerState = LauncherState.IDLE;
            this.aimingLauncher = null;
            
            if (this.playerLauncher) {
                this.playerLauncher.stopAiming();
            }
        } else if (!isPlayer && this.opponentState === LauncherState.AIMING) {
            this.opponentState = LauncherState.IDLE;
            this.aimingLauncher = null;
            
            if (this.opponentLauncher) {
                this.opponentLauncher.stopAiming();
            }
        }
    }
    
    /**
     * Start charging power
     */
    private startCharging(isPlayer: boolean): void {
        const state = isPlayer ? this.playerState : this.opponentState;
        
        if (state !== LauncherState.AIMING && state !== LauncherState.IDLE) return;
        
        if (isPlayer) {
            this.playerState = LauncherState.CHARGING;
            this.playerPower = this.MIN_POWER;
            
            // Start power charge animation
            if (this.playerLauncher) {
                this.playerLauncher.startCharging();
            }
            
            // Gradually increase power
            this.scene.time.addEvent({
                delay: 50,
                repeat: -1,
                callback: () => {
                    if (this.playerState === LauncherState.CHARGING) {
                        this.playerPower = Math.min(this.MAX_POWER, this.playerPower + 50);
                        if (this.playerLauncher) {
                            this.playerLauncher.updatePower(this.playerPower / this.MAX_POWER);
                        }
                    }
                }
            });
        } else {
            this.opponentState = LauncherState.CHARGING;
            this.opponentPower = this.MIN_POWER + Math.random() * 400; // AI random power
            
            if (this.opponentLauncher) {
                this.opponentLauncher.startCharging();
            }
        }
    }
    
    /**
     * Fire the launcher
     */
    private fireLauncher(data: { isPlayer: boolean, power?: number }): void {
        const launcher = data.isPlayer ? this.playerLauncher : this.opponentLauncher;
        const state = data.isPlayer ? this.playerState : this.opponentState;
        const angle = data.isPlayer ? this.playerAimAngle : this.opponentAimAngle;
        const queue = data.isPlayer ? this.playerNextBubbles : this.opponentNextBubbles;
        
        if (state !== LauncherState.CHARGING && state !== LauncherState.AIMING) return;
        if (!launcher || queue.length === 0) return;
        
        // Get power
        const power = data.power || (data.isPlayer ? this.playerPower : this.opponentPower);
        
        // Get bubble color
        const color = queue[0];
        
        // Update state
        if (data.isPlayer) {
            this.playerState = LauncherState.FIRING;
        } else {
            this.opponentState = LauncherState.FIRING;
        }
        
        // Fire animation
        launcher.fire();
        
        // Create projectile
        const radians = angle * (Math.PI / 180);
        const velocity = {
            x: Math.cos(radians) * power,
            y: Math.sin(radians) * power
        };
        
        // Emit shoot event
        this.eventBus.emit('bubble-shot', {
            x: launcher.x,
            y: launcher.y,
            color: color,
            velocity: velocity,
            isPlayer: data.isPlayer,
            angle: angle,
            power: power
        });
        
        // Start reload
        this.scene.time.delayedCall(100, () => {
            this.handleLauncherFired({ isPlayer: data.isPlayer });
        });
    }
    
    /**
     * Handle launcher fired - reload next bubble
     */
    private handleLauncherFired(data: { isPlayer: boolean }): void {
        const queue = data.isPlayer ? this.playerNextBubbles : this.opponentNextBubbles;
        const launcher = data.isPlayer ? this.playerLauncher : this.opponentLauncher;
        
        // Remove fired bubble from queue
        if (queue.length > 0) {
            queue.shift();
        }
        
        // Add new bubble to queue
        queue.push(this.getRandomColor());
        
        // Update state to reloading
        if (data.isPlayer) {
            this.playerState = LauncherState.RELOADING;
            this.playerPower = 0;
        } else {
            this.opponentState = LauncherState.RELOADING;
            this.opponentPower = 0;
        }
        
        // Reload animation
        if (launcher) {
            launcher.reload();
        }
        
        // Update display
        this.updateLauncherBubbles();
        
        // Complete reload after delay
        this.scene.time.delayedCall(500, () => {
            if (data.isPlayer) {
                this.playerState = LauncherState.IDLE;
            } else {
                this.opponentState = LauncherState.IDLE;
            }
            
            // Emit reload complete
            this.eventBus.emit('launcher-ready', { isPlayer: data.isPlayer });
        });
    }
    
    /**
     * Handle power-up activation
     */
    private handlePowerUp(data: { type: string, isPlayer: boolean }): void {
        const launcher = data.isPlayer ? this.playerLauncher : this.opponentLauncher;
        
        if (!launcher) return;
        
        switch (data.type) {
            case 'rapid-fire':
                // Reduce reload time temporarily
                break;
            case 'power-shot':
                // Increase power for next shot
                break;
            case 'multi-shot':
                // Fire multiple bubbles
                break;
            case 'laser-sight':
                // Show extended aim line
                launcher.showExtendedAim(true);
                this.scene.time.delayedCall(5000, () => {
                    launcher.showExtendedAim(false);
                });
                break;
        }
    }
    
    /**
     * Update theme for launchers
     */
    private updateTheme(theme: string): void {
        this.currentTheme = theme;
        
        if (this.playerLauncher) {
            this.playerLauncher.updateTheme(theme);
        }
        
        if (this.opponentLauncher) {
            this.opponentLauncher.updateTheme(theme);
        }
    }
    
    /**
     * Set specific bubble color for launcher (for special modes)
     */
    public setLauncherBubble(isPlayer: boolean, color: BubbleColor): void {
        const queue = isPlayer ? this.playerNextBubbles : this.opponentNextBubbles;
        
        if (queue.length > 0) {
            queue[0] = color;
            this.updateLauncherBubbles();
        }
    }
    
    /**
     * Get launcher state
     */
    public getLauncherState(isPlayer: boolean): LauncherState {
        return isPlayer ? this.playerState : this.opponentState;
    }
    
    /**
     * Check if launcher can shoot
     */
    public canShoot(isPlayer: boolean): boolean {
        const state = isPlayer ? this.playerState : this.opponentState;
        return state === LauncherState.IDLE || state === LauncherState.AIMING;
    }
    
    /**
     * Get next bubble colors
     */
    public getNextBubbles(isPlayer: boolean): BubbleColor[] {
        return isPlayer ? [...this.playerNextBubbles] : [...this.opponentNextBubbles];
    }
    
    /**
     * Force reload launcher (used by power-ups)
     */
    public forceReload(isPlayer: boolean): void {
        this.handleLauncherFired({ isPlayer });
    }
    
    public update(time: number, delta: number): void {
        // Update launcher animations
        if (this.playerLauncher) {
            this.playerLauncher.update(time, delta);
        }
        
        if (this.opponentLauncher) {
            this.opponentLauncher.update(time, delta);
        }
    }
    
    public destroy(): void {
        // Destroy launchers
        if (this.playerLauncher) {
            this.playerLauncher.destroy();
        }
        
        if (this.opponentLauncher) {
            this.opponentLauncher.destroy();
        }
        
        // Clear queues
        this.playerNextBubbles = [];
        this.opponentNextBubbles = [];
        
        // Remove event listeners
        this.eventBus.removeAllListeners();
        
        super.destroy();
    }
    
    // Public getters
    public getPlayerLauncher(): Launcher {
        return this.playerLauncher;
    }
    
    public getOpponentLauncher(): Launcher {
        return this.opponentLauncher;
    }
}