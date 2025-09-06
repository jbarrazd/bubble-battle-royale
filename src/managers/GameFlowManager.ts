import { Scene } from 'phaser';
import { BaseGameSystem } from '@/core/SystemRegistry';
import { gameState, GameStateManager } from '@/core/GameStateManager';
import { eventBus } from '@/core/EventBus';
import { registry } from '@/core/SystemRegistry';

/**
 * Manages game flow, states, and victory conditions
 * Coordinates high-level game logic
 */
export class GameFlowManager extends BaseGameSystem {
    public name = 'GameFlowManager';
    public priority = 5; // Initialize very early
    
    private gameTimer?: Phaser.Time.TimerEvent;
    private startTime: number = 0;
    private pausedTime: number = 0;
    private isUpdatingTime: boolean = false;
    
    // Victory check throttling
    private lastVictoryCheck: number = 0;
    private readonly VICTORY_CHECK_INTERVAL = 500; // Check every 500ms
    
    public initialize(): void {
        console.log('  → Initializing GameFlowManager...');
        
        this.setupEventListeners();
        this.markInitialized();
    }
    
    private setupEventListeners(): void {
        // Listen for game state changes
        // Don't listen for game-started here to avoid infinite loop
        // eventBus.on('game-started', () => this.startGame());
        eventBus.on('game-paused', () => this.pauseGame());
        eventBus.on('game-resumed', () => this.resumeGame());
        
        // Listen for victory conditions
        eventBus.on('victory-condition-met', (data) => {
            this.handleVictory(data.winner, data.reason);
        });
        
        // Listen for field full events
        eventBus.on('field-danger-updated', (data) => {
            if (data.level >= 10) {
                this.checkFieldFullCondition(data.isPlayer);
            }
        });
        
        // Listen for gem updates
        eventBus.on('gems-updated', (data) => {
            this.checkGemVictory(data);
        });
    }
    
    /**
     * Start the game
     */
    public startGame(): void {
        console.log('🎮 Starting game...');
        
        // Reset game state
        gameState().resetGame();
        gameState().setGameState('playing');
        
        // Initialize timer
        this.startTime = Date.now();
        this.pausedTime = 0;
        this.isUpdatingTime = true;
        
        // Create game timer
        this.gameTimer = this.scene.time.addEvent({
            delay: 100, // Update every 100ms
            callback: () => this.updateGameTime(),
            loop: true
        });
        
        // Don't emit game-started here to avoid infinite loop
        // The ArenaCoordinator or whoever calls startGame() should handle this
        
        console.log('✅ Game started successfully');
    }
    
    /**
     * Pause the game
     */
    public pauseGame(): void {
        if (gameState().getState().gameFlow.state !== 'playing') return;
        
        console.log('⏸️ Pausing game...');
        
        gameState().setGameState('paused');
        this.pausedTime = Date.now();
        this.isUpdatingTime = false;
        
        // DO NOT pause physics - we want animations to continue
        // Only stop game progression
        
        // Only pause specific time events, not all
        if (this.gameTimer) {
            this.gameTimer.paused = true;
        }
        
        eventBus.emit('game-paused');
    }
    
    /**
     * Resume the game
     */
    public resumeGame(): void {
        if (gameState().getState().gameFlow.state !== 'paused') return;
        
        console.log('▶️ Resuming game...');
        
        gameState().setGameState('playing');
        
        // Adjust start time for pause duration
        if (this.pausedTime > 0) {
            const pauseDuration = Date.now() - this.pausedTime;
            this.startTime += pauseDuration;
            this.pausedTime = 0;
        }
        
        this.isUpdatingTime = true;
        
        // Resume physics
        this.scene.physics.resume();
        
        // Resume timer
        if (this.gameTimer) {
            this.gameTimer.paused = false;
        }
        
        eventBus.emit('game-resumed');
    }
    
    /**
     * Update game time
     */
    private updateGameTime(): void {
        if (!this.isUpdatingTime) return;
        
        const elapsed = Date.now() - this.startTime;
        gameState().updateGameTime(elapsed);
        
        // Check for time-based events
        const state = gameState().getState();
        
        // Check sudden death
        if (!state.gameFlow.isInSuddenDeath && elapsed >= GameStateManager.getInstance().SUDDEN_DEATH_TIME) {
            this.enterSuddenDeath();
        }
        
        // Check time up
        if (state.gameFlow.timeRemaining === 0) {
            this.handleTimeUp();
        }
    }
    
    /**
     * Enter sudden death mode
     */
    private enterSuddenDeath(): void {
        console.log('💀 SUDDEN DEATH MODE ACTIVATED!');
        eventBus.emit('sudden-death-started');
    }
    
    /**
     * Handle time up
     */
    private handleTimeUp(): void {
        console.log('⏰ Time\'s up!');
        
        const state = gameState().getState();
        
        // Determine winner by gems, then score
        let winner: 'player' | 'opponent';
        let reason: string;
        
        if (state.player.gems > state.opponent.gems) {
            winner = 'player';
            reason = 'time-gems';
        } else if (state.opponent.gems > state.player.gems) {
            winner = 'opponent';
            reason = 'time-gems';
        } else if (state.player.score > state.opponent.score) {
            winner = 'player';
            reason = 'time-score';
        } else if (state.opponent.score > state.player.score) {
            winner = 'opponent';
            reason = 'time-score';
        } else {
            winner = 'player'; // Tie goes to player
            reason = 'time-tie';
        }
        
        this.handleVictory(winner, reason);
    }
    
    /**
     * Check gem victory condition
     */
    private checkGemVictory(data: { playerGems: number; opponentGems: number }): void {
        const gemsToWin = GameStateManager.getInstance().GEMS_TO_WIN;
        
        if (data.playerGems >= gemsToWin) {
            this.handleVictory('player', 'gems');
        } else if (data.opponentGems >= gemsToWin) {
            this.handleVictory('opponent', 'gems');
        }
    }
    
    /**
     * Check field full condition
     */
    private checkFieldFullCondition(isPlayerFieldFull: boolean): void {
        const state = gameState().getState();
        
        if (state.gameFlow.isInSuddenDeath) {
            // In sudden death, field full = instant loss
            const winner = isPlayerFieldFull ? 'opponent' : 'player';
            this.handleVictory(winner, 'sudden-death');
        } else {
            // Normal mode - trigger reset
            eventBus.emit('reset-triggered', {
                isPlayer: isPlayerFieldFull,
                dangerLevel: 10
            });
        }
    }
    
    /**
     * Handle victory
     */
    private handleVictory(winner: 'player' | 'opponent', reason: string): void {
        // Prevent multiple victory triggers
        if (gameState().getState().gameFlow.state === 'victory' || 
            gameState().getState().gameFlow.state === 'defeat') {
            return;
        }
        
        
        // Update state
        gameState().setGameState(winner === 'player' ? 'victory' : 'defeat');
        
        // Stop game timer
        if (this.gameTimer) {
            this.gameTimer.destroy();
            this.gameTimer = undefined;
        }
        this.isUpdatingTime = false;
        
        // DO NOT pause physics - we want animations to continue
        // Only stop game progression
        
        // Emit game over event
        eventBus.emit('game-over', {
            winner,
            reason
        });
    }
    
    /**
     * Reset game for new match
     */
    public resetGame(): void {
        console.log('🔄 Resetting game...');
        
        // Stop any active timers
        if (this.gameTimer) {
            this.gameTimer.destroy();
            this.gameTimer = undefined;
        }
        
        // Reset game state
        gameState().resetGame();
        
        // Clear all systems
        const systems = [
            'BubbleManager',
            'MatchSystem',
            'CascadeManager',
            'PowerUpManager'
        ];
        
        for (const systemName of systems) {
            const system = registry().getSystem(systemName);
            if (system && 'reset' in system) {
                (system as any).reset();
            }
        }
        
        console.log('✅ Game reset complete');
    }
    
    public update(time: number, delta: number): void {
        // Throttled victory condition checks
        if (time - this.lastVictoryCheck > this.VICTORY_CHECK_INTERVAL) {
            this.lastVictoryCheck = time;
            
            const state = gameState().getState();
            if (state.gameFlow.state === 'playing') {
                // Re-check victory conditions periodically
                this.checkGemVictory({
                    playerGems: state.player.gems,
                    opponentGems: state.opponent.gems
                });
            }
        }
    }
    
    public destroy(): void {
        if (this.gameTimer) {
            this.gameTimer.destroy();
        }
        
        super.destroy();
    }
}