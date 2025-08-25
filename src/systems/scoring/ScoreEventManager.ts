import { Scene } from 'phaser';

// Event types for different scoring scenarios
export enum ScoreEventType {
    BUBBLE_MATCH = 'bubble_match',
    ORPHAN_DROP = 'orphan_drop',
    POWER_UP = 'power_up',
    CHAIN_COMBO = 'chain_combo',
    SPECIAL_BONUS = 'special_bonus',
    OBJECTIVE_HIT = 'objective_hit',
    TIME_BONUS = 'time_bonus',
    PERFECT_SHOT = 'perfect_shot'
}

// Context for scoring calculation
export interface ScoreContext {
    type: ScoreEventType;
    baseValue: number;
    position: { x: number; y: number };
    matchSize?: number;
    comboLevel?: number;
    isPlayer: boolean;
    bubbleColor?: number;
    metadata?: Record<string, any>;
}

// Result of score calculation
export interface ScoreResult {
    finalScore: number;
    displayText: string;
    visualEffectLevel: number; // 1-5 for effect intensity
    color: number;
    comboMultiplier?: number;
}

// Interface for scoring modules
export interface IScoringModule {
    type: ScoreEventType;
    calculateScore(context: ScoreContext): ScoreResult;
    canProcess(context: ScoreContext): boolean;
    priority: number; // Higher priority processes first
}

// Score event for queue processing
interface ScoreEvent {
    context: ScoreContext;
    timestamp: number;
    processed: boolean;
}

export class ScoreEventManager {
    private scene: Scene;
    private modules: Map<ScoreEventType, IScoringModule[]> = new Map();
    private eventQueue: ScoreEvent[] = [];
    private processing: boolean = false;
    private totalPlayerScore: number = 0;
    private totalOpponentScore: number = 0;
    
    // Performance optimization
    private readonly MAX_QUEUE_SIZE = 50;
    private readonly PROCESS_INTERVAL = 16; // ~60fps
    
    // Event callbacks
    private scoreUpdateCallbacks: ((score: number, isPlayer: boolean) => void)[] = [];
    private visualEffectCallbacks: ((result: ScoreResult, position: { x: number; y: number }) => void)[] = [];
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.initializeDefaultModules();
        this.startProcessing();
    }
    
    private initializeDefaultModules(): void {
        // Register default scoring modules
        this.registerModule(new BubbleMatchModule());
        this.registerModule(new OrphanDropModule());
        this.registerModule(new ChainComboModule());
    }
    
    public registerModule(module: IScoringModule): void {
        if (!this.modules.has(module.type)) {
            this.modules.set(module.type, []);
        }
        
        const modules = this.modules.get(module.type)!;
        modules.push(module);
        
        // Sort by priority
        modules.sort((a, b) => b.priority - a.priority);
    }
    
    public queueEvent(context: ScoreContext): void {
        // Add to queue
        this.eventQueue.push({
            context,
            timestamp: Date.now(),
            processed: false
        });
        
        // Limit queue size for performance
        if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
            this.eventQueue.shift();
        }
    }
    
    private startProcessing(): void {
        this.scene.time.addEvent({
            delay: this.PROCESS_INTERVAL,
            callback: this.processQueue,
            callbackScope: this,
            loop: true
        });
    }
    
    private processQueue(): void {
        if (this.processing || this.eventQueue.length === 0) return;
        
        this.processing = true;
        
        // Process up to 5 events per frame to maintain performance
        const eventsToProcess = Math.min(5, this.eventQueue.length);
        
        for (let i = 0; i < eventsToProcess; i++) {
            const event = this.eventQueue.shift();
            if (!event || event.processed) continue;
            
            this.processEvent(event);
        }
        
        this.processing = false;
    }
    
    private processEvent(event: ScoreEvent): void {
        const { context } = event;
        const modules = this.modules.get(context.type) || [];
        
        let finalResult: ScoreResult | null = null;
        
        // Process through all applicable modules
        for (const module of modules) {
            if (module.canProcess(context)) {
                const result = module.calculateScore(context);
                
                // Combine results if multiple modules apply
                if (finalResult) {
                    finalResult.finalScore += result.finalScore;
                    finalResult.visualEffectLevel = Math.max(
                        finalResult.visualEffectLevel,
                        result.visualEffectLevel
                    );
                } else {
                    finalResult = result;
                }
            }
        }
        
        if (finalResult) {
            // Update scores
            if (context.isPlayer) {
                this.totalPlayerScore += finalResult.finalScore;
                this.notifyScoreUpdate(this.totalPlayerScore, true);
            } else {
                this.totalOpponentScore += finalResult.finalScore;
                this.notifyScoreUpdate(this.totalOpponentScore, false);
            }
            
            // Trigger visual effects
            this.notifyVisualEffect(finalResult, context.position);
            
            // Emit scene event for other systems
            this.scene.events.emit('score-calculated', {
                context,
                result: finalResult
            });
        }
        
        event.processed = true;
    }
    
    public onScoreUpdate(callback: (score: number, isPlayer: boolean) => void): void {
        this.scoreUpdateCallbacks.push(callback);
    }
    
    public onVisualEffect(callback: (result: ScoreResult, position: { x: number; y: number }) => void): void {
        this.visualEffectCallbacks.push(callback);
    }
    
    private notifyScoreUpdate(score: number, isPlayer: boolean): void {
        this.scoreUpdateCallbacks.forEach(cb => cb(score, isPlayer));
    }
    
    private notifyVisualEffect(result: ScoreResult, position: { x: number; y: number }): void {
        this.visualEffectCallbacks.forEach(cb => cb(result, position));
    }
    
    public getPlayerScore(): number {
        return this.totalPlayerScore;
    }
    
    public getOpponentScore(): number {
        return this.totalOpponentScore;
    }
    
    public reset(): void {
        this.totalPlayerScore = 0;
        this.totalOpponentScore = 0;
        this.eventQueue = [];
        this.processing = false;
    }
    
    public destroy(): void {
        this.reset();
        this.modules.clear();
        this.scoreUpdateCallbacks = [];
        this.visualEffectCallbacks = [];
    }
}

// Default Scoring Modules

class BubbleMatchModule implements IScoringModule {
    type = ScoreEventType.BUBBLE_MATCH;
    priority = 100;
    
    private readonly BASE_POINTS: { [key: number]: number } = {
        3: 10,
        4: 20,
        5: 30,
        6: 40,
        7: 50
    };
    
    canProcess(context: ScoreContext): boolean {
        return context.type === this.type && (context.matchSize ?? 0) >= 3;
    }
    
    calculateScore(context: ScoreContext): ScoreResult {
        const matchSize = context.matchSize ?? 3;
        const basePoints = this.BASE_POINTS[Math.min(matchSize, 7)] || this.BASE_POINTS[7];
        
        // Calculate multiplier and text based on match size
        let multiplier = 1.0;
        let displayText = `+${basePoints}`;
        let effectLevel = 1;
        
        if (matchSize >= 7) {
            multiplier = 2.0;
            const finalScore = Math.floor(basePoints * multiplier);
            displayText = `PERFECT!\n+${finalScore}`;
            effectLevel = 5;
        } else if (matchSize >= 6) {
            multiplier = 1.8;
            const finalScore = Math.floor(basePoints * multiplier);
            displayText = `AMAZING!\n+${finalScore}`;
            effectLevel = 4;
        } else if (matchSize >= 5) {
            multiplier = 1.5;
            const finalScore = Math.floor(basePoints * multiplier);
            displayText = `GREAT!\n+${finalScore}`;
            effectLevel = 3;
        } else if (matchSize >= 4) {
            multiplier = 1.2;
            const finalScore = Math.floor(basePoints * multiplier);
            displayText = `GOOD!\n+${finalScore}`;
            effectLevel = 2;
        }
        
        return {
            finalScore: Math.floor(basePoints * multiplier),
            displayText,
            visualEffectLevel: effectLevel,
            color: context.bubbleColor || 0xFFD700,
            comboMultiplier: multiplier
        };
    }
}

class OrphanDropModule implements IScoringModule {
    type = ScoreEventType.ORPHAN_DROP;
    priority = 90;
    
    canProcess(context: ScoreContext): boolean {
        return context.type === this.type;
    }
    
    calculateScore(context: ScoreContext): ScoreResult {
        const dropCount = context.metadata?.dropCount || 1;
        const pointsPerDrop = 5;
        const totalPoints = dropCount * pointsPerDrop;
        
        // Different text for different drop amounts
        let displayText = '';
        if (dropCount <= 3) {
            displayText = `DROP!\n+${totalPoints}`;
        } else if (dropCount <= 6) {
            displayText = `NICE DROP!\n+${totalPoints}`;
        } else {
            displayText = `MEGA DROP!\n+${totalPoints}`;
        }
        
        return {
            finalScore: totalPoints,
            displayText,
            visualEffectLevel: Math.min(Math.ceil(dropCount / 3), 3),
            color: 0x00BFFF,
            comboMultiplier: 1.0
        };
    }
}

class ChainComboModule implements IScoringModule {
    type = ScoreEventType.CHAIN_COMBO;
    priority = 80;
    
    private chainCount: number = 0;
    private lastChainTime: number = 0;
    private readonly CHAIN_TIMEOUT = 2000;
    
    canProcess(context: ScoreContext): boolean {
        if (context.type !== ScoreEventType.BUBBLE_MATCH) return false;
        
        const now = Date.now();
        const isChain = (now - this.lastChainTime) < this.CHAIN_TIMEOUT;
        
        if (isChain) {
            this.chainCount++;
        } else {
            this.chainCount = 0;
        }
        
        this.lastChainTime = now;
        return isChain && this.chainCount > 1;
    }
    
    calculateScore(context: ScoreContext): ScoreResult {
        const chainBonus = this.chainCount * 10;
        
        return {
            finalScore: chainBonus,
            displayText: `CHAIN x${this.chainCount}`,
            visualEffectLevel: Math.min(this.chainCount, 4),
            color: 0xFF69B4,
            comboMultiplier: 1.0 + (this.chainCount * 0.1)
        };
    }
}