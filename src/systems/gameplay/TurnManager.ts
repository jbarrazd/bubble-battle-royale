import { Scene } from 'phaser';

export enum Turn {
    PLAYER = 'PLAYER',
    OPPONENT = 'OPPONENT'
}

export enum TurnState {
    WAITING = 'WAITING',
    AIMING = 'AIMING',
    SHOOTING = 'SHOOTING',
    RESOLVING = 'RESOLVING'
}

export interface ITurnManagerConfig {
    startingTurn?: Turn;
    turnTimeout?: number;
}

export class TurnManager {
    private scene: Scene;
    private currentTurn: Turn;
    private turnState: TurnState;
    private turnCount: number = 0;
    private config: ITurnManagerConfig;
    private isProcessing: boolean = false;
    private events: Phaser.Events.EventEmitter;
    
    constructor(scene: Scene, config: ITurnManagerConfig = {}) {
        this.scene = scene;
        this.events = new Phaser.Events.EventEmitter();
        this.config = {
            startingTurn: Turn.PLAYER,
            turnTimeout: 30000, // 30 seconds default
            ...config
        };
        
        this.currentTurn = this.config.startingTurn!;
        this.turnState = TurnState.WAITING;
        
        this.setupEventListeners();
    }
    
    private setupEventListeners(): void {
        // Listen for shooting system events
        this.scene.events.on('shooting-started', () => {
            this.turnState = TurnState.SHOOTING;
        });
        
        this.scene.events.on('shooting-complete', () => {
            this.turnState = TurnState.RESOLVING;
        });
        
        // Listen for match resolution
        this.scene.events.on('matches-resolved', () => {
            this.handleTurnComplete();
        });
        
        // Listen for attachment without matches
        this.scene.events.on('bubble-attached', () => {
            console.log('TurnManager: Bubble attached event received, state:', this.turnState);
            if (this.turnState === TurnState.SHOOTING) {
                // Small delay to allow for match detection
                this.scene.time.delayedCall(500, () => {
                    if (this.turnState === TurnState.SHOOTING) {
                        console.log('TurnManager: No matches after attachment, completing turn');
                        this.handleTurnComplete();
                    }
                });
            }
        });
    }
    
    public startGame(): void {
        console.log('TurnManager: Starting game');
        this.turnCount = 0;
        this.currentTurn = this.config.startingTurn!;
        this.turnState = TurnState.WAITING;
        
        this.events.emit('game-started', { firstTurn: this.currentTurn });
        this.startTurn();
    }
    
    private startTurn(): void {
        if (this.isProcessing) return;
        
        this.turnCount++;
        this.turnState = TurnState.AIMING;
        
        console.log(`TurnManager: Starting turn ${this.turnCount} for ${this.currentTurn}`);
        
        // Emit turn start event
        this.events.emit('turn-started', {
            turn: this.currentTurn,
            turnNumber: this.turnCount,
            state: this.turnState
        });
        
        // Emit specific player/opponent events
        if (this.currentTurn === Turn.PLAYER) {
            this.events.emit('player-turn', { turnNumber: this.turnCount });
        } else {
            this.events.emit('opponent-turn', { turnNumber: this.turnCount });
        }
    }
    
    private handleTurnComplete(): void {
        if (this.isProcessing) {
            console.log('TurnManager: Already processing turn complete, skipping');
            return;
        }
        this.isProcessing = true;
        
        console.log(`TurnManager: Turn ${this.turnCount} complete for ${this.currentTurn}`);
        
        this.turnState = TurnState.WAITING;
        
        // Emit turn complete event
        this.events.emit('turn-complete', {
            turn: this.currentTurn,
            turnNumber: this.turnCount
        });
        
        // Switch turns
        this.currentTurn = this.currentTurn === Turn.PLAYER ? Turn.OPPONENT : Turn.PLAYER;
        
        // Small delay before next turn
        this.scene.time.delayedCall(300, () => {
            this.isProcessing = false;
            this.startTurn();
        });
    }
    
    public getCurrentTurn(): Turn {
        return this.currentTurn;
    }
    
    public getTurnState(): TurnState {
        return this.turnState;
    }
    
    public getTurnCount(): number {
        return this.turnCount;
    }
    
    public isPlayerTurn(): boolean {
        return this.currentTurn === Turn.PLAYER;
    }
    
    public isOpponentTurn(): boolean {
        return this.currentTurn === Turn.OPPONENT;
    }
    
    public canShoot(): boolean {
        return this.turnState === TurnState.AIMING && !this.isProcessing;
    }
    
    public forceEndTurn(): void {
        if (this.turnState !== TurnState.WAITING) {
            console.log('TurnManager: Force ending turn');
            this.handleTurnComplete();
        }
    }
    
    public pause(): void {
        this.events.emit('turn-paused', { 
            turn: this.currentTurn,
            state: this.turnState 
        });
    }
    
    public resume(): void {
        this.events.emit('turn-resumed', { 
            turn: this.currentTurn,
            state: this.turnState 
        });
    }
    
    // Add event listener methods
    public on(event: string, fn: Function, context?: any): void {
        this.events.on(event, fn, context);
    }
    
    public off(event: string, fn?: Function, context?: any): void {
        this.events.off(event, fn, context);
    }
    
    public destroy(): void {
        this.events.removeAllListeners();
        this.scene.events.off('shooting-started');
        this.scene.events.off('shooting-complete');
        this.scene.events.off('matches-resolved');
        this.scene.events.off('bubble-attached');
    }
}