import { EventEmitter } from 'eventemitter3';

/**
 * Strongly typed game events
 * All inter-system communication should use these events
 */
export interface GameEvents {
    // Gem Events
    'gem-collected': {
        isPlayer: boolean;
        amount: number;
        x: number;
        y: number;
        gemType: 'normal' | 'golden';
    };
    
    'gems-updated': {
        playerGems: number;
        opponentGems: number;
        total: number;
    };
    
    // Match Events
    'match-found': {
        bubbles: number;
        color: number;
        isPlayerShot: boolean;
        position: { x: number; y: number };
    };
    
    'match-completed': {
        count: number;
        score: number;
        combo: number;
        isPlayer: boolean;
    };
    
    'combo-updated': {
        level: number;
        multiplier: number;
    };
    
    // Cascade Events
    'cascade-started': {
        bubbleCount: number;
        level: number;
    };
    
    'cascade-completed': {
        bubblesFallen: number;
        cascadeLevel: number;
        bonusGems: number;
        isPlayer: boolean;
    };
    
    // Shot Events
    'shot-fired': {
        isPlayer: boolean;
        angle: number;
        color: number;
        position: { x: number; y: number };
    };
    
    'bubble-attached': {
        bubble: any; // Bubble object
        position: { q: number; r: number };
        isPlayer: boolean;
    };
    
    // Reset Events
    'reset-triggered': {
        isPlayer: boolean;
        dangerLevel: number;
    };
    
    'reset-started': {
        isPlayer: boolean;
    };
    
    'reset-completed': {
        isPlayer: boolean;
        gemsLost: number;
        rowsCleared: number;
    };
    
    // Field Events
    'row-spawned': {
        isTop: boolean;
        bubbleCount: number;
    };
    
    'field-danger-updated': {
        isPlayer: boolean;
        level: number; // 0-10
    };
    
    // Game State Events
    'game-started': void;
    'game-paused': void;
    'game-resumed': void;
    'game-over': {
        winner: 'player' | 'opponent';
        reason: string;
    };
    
    'sudden-death-started': void;
    'sudden-death-warning': {
        secondsRemaining: number;
    };
    
    // Victory Events
    'victory-condition-met': {
        winner: 'player' | 'opponent';
        reason: 'gems' | 'field-full' | 'time' | 'sudden-death';
    };
    
    // Bubble Events
    'bubble-destroyed': {
        bubble: any; // Bubble instance
        position: { x: number; y: number };
    };
    
    // Power-up Events
    'powerup-collected': {
        type: string;
        isPlayer: boolean;
    };
    
    'powerup-activated': {
        type: string;
        isPlayer: boolean;
    };
    
    'powerup-expired': {
        type: string;
        isPlayer: boolean;
    };
    
    // UI Events
    'ui-button-clicked': {
        button: string;
    };
    
    'settings-changed': {
        setting: string;
        value: any;
    };
    
    // System Events
    'system-initialized': {
        name: string;
    };
    
    'system-error': {
        system: string;
        error: Error;
    };
    
    // Performance Events
    'fps-warning': {
        fps: number;
        target: number;
    };
    
    'memory-warning': {
        used: number;
        threshold: number;
    };
    
    'performance-metric': {
        type: string;
        value: number;
    };
    
    // Ready Events
    'systems-ready': void;
}

/**
 * Typed event bus for game-wide communication
 */
export class GameEventBus extends EventEmitter {
    private static instance: GameEventBus;
    private eventHistory: { event: string; data: any; timestamp: number }[] = [];
    private readonly MAX_HISTORY = 100;
    private debugMode: boolean = false;
    
    private constructor() {
        super();
        // EventEmitter3 doesn't have setMaxListeners
    }
    
    public static getInstance(): GameEventBus {
        if (!GameEventBus.instance) {
            GameEventBus.instance = new GameEventBus();
        }
        return GameEventBus.instance;
    }
    
    /**
     * Type-safe emit wrapper
     */
    public emitTyped<K extends keyof GameEvents>(
        event: K,
        ...args: GameEvents[K] extends void ? [] : [GameEvents[K]]
    ): boolean {
        if (this.debugMode) {
            console.log(`📢 Event: ${event}`, args[0]);
        }
        
        // Record in history
        this.recordEvent(event as string, args[0]);
        
        return this.emit(event as string, ...args);
    }
    
    /**
     * Type-safe on wrapper
     */
    public onTyped<K extends keyof GameEvents>(
        event: K,
        listener: GameEvents[K] extends void 
            ? () => void 
            : (data: GameEvents[K]) => void
    ): this {
        return this.on(event as string, listener as any);
    }
    
    /**
     * Type-safe once wrapper
     */
    public onceTyped<K extends keyof GameEvents>(
        event: K,
        listener: GameEvents[K] extends void 
            ? () => void 
            : (data: GameEvents[K]) => void
    ): this {
        return this.once(event as string, listener as any);
    }
    
    /**
     * Type-safe off wrapper
     */
    public offTyped<K extends keyof GameEvents>(
        event: K,
        listener?: GameEvents[K] extends void 
            ? () => void 
            : (data: GameEvents[K]) => void
    ): this {
        return this.off(event as string, listener as any);
    }
    
    /**
     * Record event in history for debugging
     */
    private recordEvent(event: string, data: any): void {
        this.eventHistory.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        // Trim history
        if (this.eventHistory.length > this.MAX_HISTORY) {
            this.eventHistory.shift();
        }
    }
    
    /**
     * Get event history for debugging
     */
    public getEventHistory(): typeof this.eventHistory {
        return [...this.eventHistory];
    }
    
    /**
     * Clear event history
     */
    public clearHistory(): void {
        this.eventHistory = [];
    }
    
    /**
     * Enable/disable debug mode
     */
    public setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
        console.log(`Event bus debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
    
    /**
     * Get all active listeners (for debugging)
     */
    public getActiveListeners(): Map<string, number> {
        const listeners = new Map<string, number>();
        for (const event of this.eventNames()) {
            listeners.set(event.toString(), this.listenerCount(event));
        }
        return listeners;
    }
    
    /**
     * Batch emit multiple events
     */
    public batchEmit(events: Array<{ event: keyof GameEvents; data?: any }>): void {
        for (const { event, data } of events) {
            this.emit(event as any, data);
        }
    }
    
    /**
     * Wait for an event (returns promise)
     */
    public waitFor<K extends keyof GameEvents>(
        event: K,
        timeout?: number
    ): Promise<GameEvents[K] extends void ? void : GameEvents[K]> {
        return new Promise((resolve, reject) => {
            const timer = timeout ? setTimeout(() => {
                this.off(event, handler);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeout) : null;
            
            const handler = (data: any) => {
                if (timer) clearTimeout(timer);
                resolve(data);
            };
            
            this.once(event as string, handler);
        });
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        this.removeAllListeners();
        this.eventHistory = [];
    }
}

// Global event bus instance
export const eventBus = GameEventBus.getInstance();