import { Scene } from 'phaser';
import { Bubble } from '@/gameObjects/Bubble';
import { GridAttachmentSystem } from './GridAttachmentSystem';
import { BUBBLE_CONFIG, Z_LAYERS } from '@/config/ArenaConfig';

export interface ResetState {
    isResetting: boolean;
    immunityActive: boolean;
    penaltyActive: boolean;
    immunityEndTime: number;
    penaltyEndTime: number;
    resetCount: number; // Track how many resets have happened
}

export class ResetSystem {
    private scene: Scene;
    private gridAttachmentSystem: GridAttachmentSystem;
    private resetState: ResetState = {
        isResetting: false,
        immunityActive: false,
        penaltyActive: false,
        immunityEndTime: 0,
        penaltyEndTime: 0,
        resetCount: 0
    };
    
    // Constants from GDD
    private readonly DEATH_ROW_THRESHOLD = 10; // When bubbles reach this row from top
    private readonly ROWS_TO_CLEAR = 4;
    private readonly GEM_LOSS_PERCENTAGE = 0.5;
    private readonly MIN_GEM_LOSS = 2;
    private readonly MAX_GEM_LOSS = 7;
    private readonly FREEZE_DURATION = 500; // 0.5 seconds
    private readonly IMMUNITY_DURATION = 3000; // 3 seconds
    private readonly PENALTY_DURATION = 5000; // 5 seconds
    
    // Visual warning thresholds
    private warningLevel: number = 0; // 0 = safe, 1 = yellow, 2 = orange, 3 = red
    private warningGraphics?: Phaser.GameObjects.Graphics;
    private warningTween?: Phaser.Tweens.Tween;
    
    constructor(scene: Scene, gridAttachmentSystem: GridAttachmentSystem) {
        this.scene = scene;
        this.gridAttachmentSystem = gridAttachmentSystem;
        this.createWarningGraphics();
        this.setupEventListeners();
    }
    
    private createWarningGraphics(): void {
        this.warningGraphics = this.scene.add.graphics();
        this.warningGraphics.setDepth(Z_LAYERS.UI - 1);
    }
    
    private setupEventListeners(): void {
        // Listen for events that should trigger reset check
        this.scene.events.on('row-spawned', () => {
            console.log('Row spawned event received in ResetSystem');
            this.checkResetCondition();
        });
        this.scene.events.on('bubble-attached', () => {
            console.log('Bubble attached event received in ResetSystem');
            this.checkResetCondition();
        });
        
        // Cleanup
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    /**
     * Check if reset condition is met (field is too full)
     */
    public checkResetCondition(): boolean {
        // Don't check during reset
        if (this.resetState.isResetting) return false;
        
        // Check if in sudden death (after 2:30)
        const gameTime = this.scene.registry.get('gameTime') || 0;
        const isInSuddenDeath = gameTime >= 150000; // 2:30 in ms
        
        // Check both player and opponent fields
        const { playerRow, opponentRow } = this.getBothSidesRows();
        
        console.log(`Reset System Check: Player row = ${playerRow}, Opponent row = ${opponentRow}, threshold = ${this.DEATH_ROW_THRESHOLD}`);
        
        // Check OPPONENT side (negative values, so we check absolute value)
        if (Math.abs(opponentRow) >= this.DEATH_ROW_THRESHOLD) {
            if (isInSuddenDeath) {
                // In sudden death, it's game over for opponent
                this.scene.events.emit('game-over', { 
                    reason: 'field-full-sudden-death',
                    isPlayer: false 
                });
                return true;
            } else {
                // Not in sudden death, trigger reset for opponent
                console.log('⚠️ Triggering reset for OPPONENT');
                this.executeReset(false); // isPlayer = false for opponent
                return true;
            }
        }
        
        // Check PLAYER side
        if (playerRow >= this.DEATH_ROW_THRESHOLD) {
            if (isInSuddenDeath) {
                // In sudden death, it's game over for player
                this.scene.events.emit('game-over', { 
                    reason: 'field-full-sudden-death',
                    isPlayer: true 
                });
                return true;
            } else {
                // Not in sudden death, trigger reset for player
                console.log('⚠️ Triggering reset for PLAYER');
                this.executeReset(true); // isPlayer = true for player
                return true;
            }
        }
        
        // Update warning level for player
        this.updateWarningLevel(playerRow);
        
        return false;
    }
    
    /**
     * Get the extreme rows for both player and opponent
     */
    private getBothSidesRows(): { playerRow: number, opponentRow: number } {
        const bubbles = this.gridAttachmentSystem.getGridBubbles();
        let maxPlayerRow = 0;  // Most positive r value (closest to player launcher)
        let minOpponentRow = 0; // Most negative r value (closest to opponent launcher)
        
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            
            const gridPos = bubble.getGridPosition();
            if (!gridPos) return;
            
            // Check player side (positive r values)
            if (gridPos.r > 0 && gridPos.r > maxPlayerRow) {
                maxPlayerRow = gridPos.r;
            }
            
            // Check opponent side (negative r values)
            if (gridPos.r < 0 && gridPos.r < minOpponentRow) {
                minOpponentRow = gridPos.r;
            }
        });
        
        return { playerRow: maxPlayerRow, opponentRow: minOpponentRow };
    }
    
    /**
     * Get the row of the lowest bubble (highest row number)
     */
    private getLowestBubbleRow(): number {
        const bubbles = this.gridAttachmentSystem.getGridBubbles();
        let maxPlayerRow = -Infinity;  // Most positive r value (closest to player launcher)
        let minOpponentRow = Infinity; // Most negative r value (closest to opponent launcher)
        let playerDanger = false;
        let opponentDanger = false;
        
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            
            const gridPos = bubble.getGridPosition();
            if (!gridPos) return;
            
            // Check player side (positive r values)
            if (gridPos.r > 0 && gridPos.r > maxPlayerRow) {
                maxPlayerRow = gridPos.r;
            }
            
            // Check opponent side (negative r values)
            if (gridPos.r < 0 && gridPos.r < minOpponentRow) {
                minOpponentRow = gridPos.r;
            }
        });
        
        // Check if player is in danger (r >= 10 means row 10 from center)
        if (maxPlayerRow >= this.DEATH_ROW_THRESHOLD) {
            playerDanger = true;
        }
        
        // Check if opponent is in danger (r <= -10)
        if (minOpponentRow <= -this.DEATH_ROW_THRESHOLD) {
            opponentDanger = true;
        }
        
        // Log for debugging
        console.log(`Reset System: Player max row = ${maxPlayerRow}, Opponent min row = ${minOpponentRow}`);
        if (playerDanger) console.log(`⚠️ PLAYER IN DANGER! Row ${maxPlayerRow} >= ${this.DEATH_ROW_THRESHOLD}`);
        if (opponentDanger) console.log(`⚠️ OPPONENT IN DANGER! Row ${minOpponentRow} <= ${-this.DEATH_ROW_THRESHOLD}`);
        
        // For now, return the player's row since we're focusing on player reset
        // Return 0 if no bubbles on player side
        return maxPlayerRow === -Infinity ? 0 : maxPlayerRow;
    }
    
    /**
     * Update visual warning level based on how close to reset
     */
    private updateWarningLevel(lowestRow: number): void {
        const previousLevel = this.warningLevel;
        
        // Calculate warning level
        const rowsToReset = this.DEATH_ROW_THRESHOLD - lowestRow;
        if (rowsToReset <= 1) {
            this.warningLevel = 3; // Red - Critical!
        } else if (rowsToReset <= 2) {
            this.warningLevel = 2; // Orange - Danger
        } else if (rowsToReset <= 3) {
            this.warningLevel = 1; // Yellow - Warning
        } else {
            this.warningLevel = 0; // Safe
        }
        
        // Update visuals if level changed
        if (this.warningLevel !== previousLevel) {
            this.updateWarningVisuals();
        }
    }
    
    /**
     * Update the visual warning indicators
     */
    private updateWarningVisuals(): void {
        if (!this.warningGraphics) return;
        
        // Stop previous tween if exists
        if (this.warningTween) {
            this.warningTween.stop();
            this.warningTween = undefined;
        }
        
        // Clear previous graphics
        this.warningGraphics.clear();
        this.warningGraphics.setAlpha(1);
        
        // If safe, no visuals needed
        if (this.warningLevel === 0) {
            return;
        }
        
        const color = this.warningLevel === 3 ? 0xff0000 : 
                     this.warningLevel === 2 ? 0xffa500 : 0xffff00;
        const strokeWidth = this.warningLevel === 3 ? 8 : 
                          this.warningLevel === 2 ? 6 : 4;
        
        // Draw warning border flash effect
        this.warningGraphics.lineStyle(strokeWidth, color, 1);
        this.warningGraphics.strokeRect(
            5, 5, 
            this.scene.cameras.main.width - 10,
            this.scene.cameras.main.height - 10
        );
        
        // Animate the warning - flash then fade
        this.warningTween = this.scene.tweens.add({
            targets: this.warningGraphics,
            alpha: 0,
            duration: this.warningLevel === 3 ? 300 : 500,
            delay: this.warningLevel === 3 ? 100 : 200,
            onComplete: () => {
                this.warningGraphics?.clear();
                this.warningTween = undefined;
            }
        });
        
        // Add screen shake for critical level
        if (this.warningLevel === 3) {
            this.scene.cameras.main.shake(200, 0.01);
        } else if (this.warningLevel === 2) {
            this.scene.cameras.main.shake(100, 0.005);
        }
    }
    
    /**
     * Check and execute reset if needed
     */
    public checkAndExecuteReset(isPlayer: boolean): void {
        // Just check the condition, it will handle both sides
        this.checkResetCondition();
    }
    
    /**
     * Execute the reset sequence
     */
    public async executeReset(isPlayer: boolean): Promise<void> {
        if (this.resetState.isResetting) return;
        
        console.log(`Executing reset for ${isPlayer ? 'player' : 'opponent'}`);
        
        this.resetState.isResetting = true;
        this.resetState.resetCount++;
        
        // Emit reset started event
        this.scene.events.emit('reset-started', { isPlayer });
        
        // Phase 1: FREEZE
        await this.freezePhase();
        
        // Phase 2: Gem Loss
        const gemsLost = await this.gemLossPhase(isPlayer);
        
        // Phase 3: Create Neutral Gems
        await this.createNeutralGems(gemsLost);
        
        // Phase 4: Clear Top Rows
        await this.clearTopRows(isPlayer);
        
        // Phase 5: Activate Immunity
        this.activateImmunity();
        
        // Phase 6: Activate Penalty
        this.activatePenalty(isPlayer);
        
        this.resetState.isResetting = false;
        
        // Emit reset completed event
        this.scene.events.emit('reset-completed', { isPlayer });
    }
    
    /**
     * Phase 1: Freeze the game briefly with white flash
     */
    private async freezePhase(): Promise<void> {
        // Create white flash
        const flash = this.scene.add.rectangle(
            this.scene.cameras.main.centerX,
            this.scene.cameras.main.centerY,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0xffffff,
            0
        );
        flash.setDepth(Z_LAYERS.UI + 100);
        
        // Flash animation
        await new Promise<void>(resolve => {
            this.scene.tweens.add({
                targets: flash,
                alpha: { from: 0, to: 0.8 },
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    flash.destroy();
                    resolve();
                }
            });
        });
        
        // Pause gameplay briefly
        this.scene.time.delayedCall(this.FREEZE_DURATION, () => {});
    }
    
    /**
     * Phase 2: Remove gems from player
     */
    private async gemLossPhase(isPlayer: boolean): Promise<number> {
        // Get current gems from ArenaSystem
        const arenaSystem = (this.scene as any).arenaSystem;
        if (!arenaSystem) return 0;
        
        const currentGems = isPlayer ? arenaSystem.playerGemCount : arenaSystem.opponentGemCount;
        const gemsToLose = Math.floor(currentGems * this.GEM_LOSS_PERCENTAGE);
        
        // Apply min/max limits
        const finalLoss = Math.min(
            Math.max(gemsToLose, currentGems > 0 ? this.MIN_GEM_LOSS : 0),
            this.MAX_GEM_LOSS
        );
        
        // Update gem count
        if (isPlayer) {
            arenaSystem.playerGemCount = Math.max(0, currentGems - finalLoss);
        } else {
            arenaSystem.opponentGemCount = Math.max(0, currentGems - finalLoss);
        }
        
        // Update UI
        this.scene.events.emit('gems-updated', {
            playerGems: arenaSystem.playerGemCount,
            opponentGems: arenaSystem.opponentGemCount,
            total: arenaSystem.playerGemCount + arenaSystem.opponentGemCount
        });
        
        // Visual feedback - shake gem counter
        this.scene.events.emit('gem-counter-shake', { isPlayer });
        
        return finalLoss;
    }
    
    /**
     * Phase 3: Create neutral gems in center
     */
    private async createNeutralGems(count: number): Promise<void> {
        if (count <= 0) return;
        
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;
        
        // Create visual gems that float in center
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 30;
            
            const gem = this.scene.add.star(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius,
                6, 8, 12, 0xFFD700
            );
            gem.setDepth(Z_LAYERS.UI);
            
            // Make them float and glow
            this.scene.tweens.add({
                targets: gem,
                y: gem.y - 5,
                scale: 1.1,
                alpha: { from: 0.8, to: 1 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Make them collectable (simplified for now)
            this.scene.time.delayedCall(this.PENALTY_DURATION, () => {
                // After penalty, gems can be collected
                gem.setInteractive();
                // In a real implementation, add collision detection
            });
            
            // Auto-destroy after 10 seconds if not collected
            this.scene.time.delayedCall(10000, () => {
                this.scene.tweens.add({
                    targets: gem,
                    scale: 0,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => gem.destroy()
                });
            });
        }
    }
    
    /**
     * Phase 4: Clear top rows with animation
     */
    private async clearTopRows(isPlayer: boolean): Promise<void> {
        const bubbles = this.gridAttachmentSystem.getGridBubbles();
        const bubblesToRemove: Bubble[] = [];
        
        // Find the extreme row values to determine what to clear
        let maxPlayerRow = -Infinity;
        let minOpponentRow = Infinity;
        
        // First pass: find the extreme rows
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            const gridPos = bubble.getGridPosition();
            if (!gridPos) return;
            
            if (gridPos.r > 0 && gridPos.r > maxPlayerRow) {
                maxPlayerRow = gridPos.r;
            }
            if (gridPos.r < 0 && gridPos.r < minOpponentRow) {
                minOpponentRow = gridPos.r;
            }
        });
        
        // Second pass: collect bubbles to remove
        bubbles.forEach(bubble => {
            if (!bubble.visible) return;
            const gridPos = bubble.getGridPosition();
            if (!gridPos) return;
            
            if (isPlayer) {
                // For player, clear the 4 rows closest to launcher (highest r values)
                if (gridPos.r > 0 && gridPos.r >= (maxPlayerRow - this.ROWS_TO_CLEAR + 1)) {
                    bubblesToRemove.push(bubble);
                }
            } else {
                // For opponent, clear the 4 rows closest to their launcher (lowest r values)
                if (gridPos.r < 0 && gridPos.r <= (minOpponentRow + this.ROWS_TO_CLEAR - 1)) {
                    bubblesToRemove.push(bubble);
                }
            }
        });
        
        console.log(`Clearing ${bubblesToRemove.length} bubbles from ${isPlayer ? 'player' : 'opponent'} field`);
        
        // Animate removal
        const promises = bubblesToRemove.map(bubble => {
            return new Promise<void>(resolve => {
                // Create particle effect
                for (let i = 0; i < 5; i++) {
                    const particle = this.scene.add.circle(
                        bubble.x + Phaser.Math.Between(-10, 10),
                        bubble.y + Phaser.Math.Between(-10, 10),
                        3,
                        bubble.getColor(),
                        0.8
                    );
                    particle.setDepth(bubble.depth);
                    
                    this.scene.tweens.add({
                        targets: particle,
                        x: particle.x + Phaser.Math.Between(-30, 30),
                        y: particle.y + Phaser.Math.Between(-30, 30),
                        scale: 0,
                        alpha: 0,
                        duration: 500,
                        onComplete: () => particle.destroy()
                    });
                }
                
                // Fade out bubble
                this.scene.tweens.add({
                    targets: bubble,
                    scale: 0.5,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                        this.gridAttachmentSystem.removeGridBubble(bubble);
                        bubble.destroy();
                        resolve();
                    }
                });
            });
        });
        
        await Promise.all(promises);
        
        console.log(`Cleared ${bubblesToRemove.length} bubbles from ${isPlayer ? 'player' : 'opponent'} field`);
    }
    
    /**
     * Phase 5: Activate immunity period (no new rows)
     */
    private activateImmunity(): void {
        this.resetState.immunityActive = true;
        this.resetState.immunityEndTime = Date.now() + this.IMMUNITY_DURATION;
        
        // Visual shield effect
        const shield = this.scene.add.graphics();
        shield.fillStyle(0x00ffff, 0.1);
        shield.fillRect(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height);
        shield.setDepth(Z_LAYERS.UI - 2);
        
        // Pulse animation
        this.scene.tweens.add({
            targets: shield,
            alpha: { from: 0.1, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                shield.destroy();
                this.resetState.immunityActive = false;
            }
        });
        
        // Emit immunity event
        this.scene.events.emit('immunity-activated', { duration: this.IMMUNITY_DURATION });
        
        // Schedule immunity end
        this.scene.time.delayedCall(this.IMMUNITY_DURATION, () => {
            this.resetState.immunityActive = false;
            this.scene.events.emit('immunity-ended');
        });
    }
    
    /**
     * Phase 6: Activate penalty period (no gem collection)
     */
    private activatePenalty(isPlayer: boolean): void {
        this.resetState.penaltyActive = true;
        this.resetState.penaltyEndTime = Date.now() + this.PENALTY_DURATION;
        
        // Visual indicator - "No Gems" icon
        const icon = this.scene.add.container(
            isPlayer ? 100 : this.scene.cameras.main.width - 100,
            isPlayer ? this.scene.cameras.main.height - 100 : 100
        );
        
        const bg = this.scene.add.circle(0, 0, 30, 0x000000, 0.7);
        const gemIcon = this.scene.add.star(0, 0, 6, 10, 15, 0xff0000);
        const cross = this.scene.add.text(0, 0, '✗', {
            fontSize: '32px',
            color: '#ff0000'
        });
        cross.setOrigin(0.5);
        
        icon.add([bg, gemIcon, cross]);
        icon.setDepth(Z_LAYERS.UI + 1);
        
        // Fade in/out
        this.scene.tweens.add({
            targets: icon,
            alpha: { from: 0, to: 1 },
            duration: 500,
            yoyo: true,
            hold: this.PENALTY_DURATION - 1000,
            onComplete: () => {
                icon.destroy();
                this.resetState.penaltyActive = false;
            }
        });
        
        // Emit penalty event
        this.scene.events.emit('penalty-activated', { isPlayer, duration: this.PENALTY_DURATION });
        
        // Schedule penalty end
        this.scene.time.delayedCall(this.PENALTY_DURATION, () => {
            this.resetState.penaltyActive = false;
            this.scene.events.emit('penalty-ended', { isPlayer });
        });
    }
    
    /**
     * Check if immunity is active (no new rows)
     */
    public isImmunityActive(): boolean {
        return this.resetState.immunityActive;
    }
    
    /**
     * Check if penalty is active (no gem collection)
     */
    public isPenaltyActive(): boolean {
        return this.resetState.penaltyActive;
    }
    
    /**
     * Get current reset state
     */
    public getResetState(): ResetState {
        return { ...this.resetState };
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        this.scene.events.off('row-spawned');
        this.scene.events.off('bubble-attached');
        this.scene.events.off('shutdown', this.destroy, this);
        
        if (this.warningTween) {
            this.warningTween.stop();
        }
        
        if (this.warningGraphics) {
            this.warningGraphics.destroy();
        }
    }
}