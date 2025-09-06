import { EventEmitter } from 'eventemitter3';

/**
 * Centralized game state management
 * Single source of truth for all game data
 */
export interface IGameState {
    // Player States
    player: {
        gems: number;
        score: number;
        powerUps: string[];
        resetCount: number;
    };
    
    // Opponent States
    opponent: {
        gems: number;
        score: number;
        powerUps: string[];
        resetCount: number;
        difficulty: 'easy' | 'medium' | 'hard' | 'expert';
    };
    
    // Game Flow
    gameFlow: {
        state: 'menu' | 'playing' | 'paused' | 'victory' | 'defeat';
        timeElapsed: number;
        timeRemaining: number;
        isInSuddenDeath: boolean;
        isPaused: boolean;
    };
    
    // Match State
    match: {
        currentCombo: number;
        totalMatches: number;
        cascadeLevel: number;
        lastMatchTime: number;
    };
    
    // Field State
    field: {
        playerFieldDanger: number; // 0-10 scale
        opponentFieldDanger: number;
        playerImmunityActive: boolean;
        opponentImmunityActive: boolean;
        playerPenaltyActive: boolean;
        opponentPenaltyActive: boolean;
    };
    
    // Settings
    settings: {
        theme: 'ocean' | 'space' | 'candy' | 'classic' | 'neon';
        soundEnabled: boolean;
        musicEnabled: boolean;
        particlesEnabled: boolean;
    };
}

export class GameStateManager extends EventEmitter {
    private static instance: GameStateManager;
    private state: IGameState;
    private stateHistory: Partial<IGameState>[] = [];
    private readonly MAX_HISTORY = 10;
    
    // Constants from GDD
    public readonly GEMS_TO_WIN = 15;
    public readonly GAME_DURATION = 180000; // 3 minutes
    public readonly SUDDEN_DEATH_TIME = 150000; // 2:30
    public readonly RESET_GEM_LOSS = 0.5; // 50%
    public readonly MIN_GEM_LOSS = 2;
    public readonly MAX_GEM_LOSS = 7;
    
    private constructor() {
        super();
        this.state = this.getInitialState();
    }
    
    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }
    
    private getInitialState(): IGameState {
        return {
            player: {
                gems: 0,
                score: 0,
                powerUps: [],
                resetCount: 0
            },
            opponent: {
                gems: 0,
                score: 0,
                powerUps: [],
                resetCount: 0,
                difficulty: 'hard'
            },
            gameFlow: {
                state: 'menu',
                timeElapsed: 0,
                timeRemaining: this.GAME_DURATION,
                isInSuddenDeath: false,
                isPaused: false
            },
            match: {
                currentCombo: 0,
                totalMatches: 0,
                cascadeLevel: 0,
                lastMatchTime: 0
            },
            field: {
                playerFieldDanger: 0,
                opponentFieldDanger: 0,
                playerImmunityActive: false,
                opponentImmunityActive: false,
                playerPenaltyActive: false,
                opponentPenaltyActive: false
            },
            settings: {
                theme: 'ocean',
                soundEnabled: true,
                musicEnabled: true,
                particlesEnabled: true
            }
        };
    }
    
    // State Getters
    public getState(): Readonly<IGameState> {
        return Object.freeze(JSON.parse(JSON.stringify(this.state)));
    }
    
    public getPlayerGems(): number {
        return this.state.player.gems;
    }
    
    public getOpponentGems(): number {
        return this.state.opponent.gems;
    }
    
    public isGameActive(): boolean {
        return this.state.gameFlow.state === 'playing' && !this.state.gameFlow.isPaused;
    }
    
    public isInSuddenDeath(): boolean {
        return this.state.gameFlow.isInSuddenDeath;
    }
    
    // State Setters with Events
    public updatePlayerGems(gems: number): void {
        const oldValue = this.state.player.gems;
        this.state.player.gems = Math.max(0, gems);
        
        this.emit('state-changed', {
            path: 'player.gems',
            oldValue,
            newValue: this.state.player.gems
        });
        
        this.emit('gems-updated', {
            playerGems: this.state.player.gems,
            opponentGems: this.state.opponent.gems
        });
        
        // Check victory condition
        if (this.state.player.gems >= this.GEMS_TO_WIN) {
            this.emit('victory-condition-met', { 
                winner: 'player', 
                reason: 'gems' 
            });
        }
    }
    
    public updateOpponentGems(gems: number): void {
        const oldValue = this.state.opponent.gems;
        this.state.opponent.gems = Math.max(0, gems);
        
        this.emit('state-changed', {
            path: 'opponent.gems',
            oldValue,
            newValue: this.state.opponent.gems
        });
        
        this.emit('gems-updated', {
            playerGems: this.state.player.gems,
            opponentGems: this.state.opponent.gems
        });
        
        // Check victory condition
        if (this.state.opponent.gems >= this.GEMS_TO_WIN) {
            this.emit('victory-condition-met', { 
                winner: 'opponent', 
                reason: 'gems' 
            });
        }
    }
    
    public addPlayerGems(amount: number): void {
        console.log('[GameStateManager] addPlayerGems called with amount:', amount, 'current:', this.state.player.gems, 'new:', this.state.player.gems + amount);
        this.updatePlayerGems(this.state.player.gems + amount);
    }
    
    public addOpponentGems(amount: number): void {
        this.updateOpponentGems(this.state.opponent.gems + amount);
    }
    
    public updateGameTime(elapsed: number): void {
        this.state.gameFlow.timeElapsed = elapsed;
        this.state.gameFlow.timeRemaining = Math.max(0, this.GAME_DURATION - elapsed);
        
        // Check sudden death
        if (!this.state.gameFlow.isInSuddenDeath && elapsed >= this.SUDDEN_DEATH_TIME) {
            this.state.gameFlow.isInSuddenDeath = true;
            this.emit('sudden-death-started');
        }
        
        // Check time up
        if (this.state.gameFlow.timeRemaining === 0) {
            this.emit('time-up');
        }
    }
    
    public setGameState(state: IGameState['gameFlow']['state']): void {
        const oldState = this.state.gameFlow.state;
        this.state.gameFlow.state = state;
        
        this.emit('game-state-changed', {
            from: oldState,
            to: state
        });
    }
    
    public updateFieldDanger(isPlayer: boolean, dangerLevel: number): void {
        if (isPlayer) {
            this.state.field.playerFieldDanger = Math.max(0, Math.min(10, dangerLevel));
        } else {
            this.state.field.opponentFieldDanger = Math.max(0, Math.min(10, dangerLevel));
        }
        
        this.emit('field-danger-updated', {
            isPlayer,
            dangerLevel: isPlayer ? this.state.field.playerFieldDanger : this.state.field.opponentFieldDanger
        });
    }
    
    public setImmunity(isPlayer: boolean, active: boolean): void {
        if (isPlayer) {
            this.state.field.playerImmunityActive = active;
        } else {
            this.state.field.opponentImmunityActive = active;
        }
        
        this.emit('immunity-changed', { isPlayer, active });
    }
    
    public setPenalty(isPlayer: boolean, active: boolean): void {
        if (isPlayer) {
            this.state.field.playerPenaltyActive = active;
        } else {
            this.state.field.opponentPenaltyActive = active;
        }
        
        this.emit('penalty-changed', { isPlayer, active });
    }
    
    public incrementCombo(): void {
        this.state.match.currentCombo++;
        this.state.match.lastMatchTime = Date.now();
        this.emit('combo-updated', this.state.match.currentCombo);
    }
    
    public resetCombo(): void {
        if (this.state.match.currentCombo > 0) {
            this.state.match.currentCombo = 0;
            this.emit('combo-reset');
        }
    }
    
    public setCascadeLevel(level: number): void {
        this.state.match.cascadeLevel = level;
        this.emit('cascade-level-changed', level);
    }
    
    // Reset Management
    public executeReset(isPlayer: boolean): number {
        const currentGems = isPlayer ? this.state.player.gems : this.state.opponent.gems;
        const gemsToLose = Math.floor(currentGems * this.RESET_GEM_LOSS);
        const finalLoss = Math.min(
            Math.max(gemsToLose, currentGems > 0 ? this.MIN_GEM_LOSS : 0),
            this.MAX_GEM_LOSS
        );
        
        if (isPlayer) {
            this.state.player.resetCount++;
            this.updatePlayerGems(currentGems - finalLoss);
        } else {
            this.state.opponent.resetCount++;
            this.updateOpponentGems(currentGems - finalLoss);
        }
        
        this.emit('reset-executed', { isPlayer, gemsLost: finalLoss });
        return finalLoss;
    }
    
    // State History for Undo/Replay
    public saveStateSnapshot(): void {
        this.stateHistory.push(JSON.parse(JSON.stringify(this.state)));
        if (this.stateHistory.length > this.MAX_HISTORY) {
            this.stateHistory.shift();
        }
    }
    
    public restoreLastSnapshot(): boolean {
        const lastState = this.stateHistory.pop();
        if (lastState) {
            this.state = lastState as IGameState;
            this.emit('state-restored');
            return true;
        }
        return false;
    }
    
    // Reset for new game
    public resetGame(): void {
        this.state = this.getInitialState();
        this.stateHistory = [];
        this.emit('game-reset');
    }
    
    // Cleanup
    public destroy(): void {
        this.removeAllListeners();
        this.stateHistory = [];
    }
}

// Export singleton instance getter
export const gameState = () => GameStateManager.getInstance();