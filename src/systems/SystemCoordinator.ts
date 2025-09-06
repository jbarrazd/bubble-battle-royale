import { Scene } from 'phaser';
import { SystemRegistry, registry } from '@/core/SystemRegistry';
import { GameStateManager, gameState } from '@/core/GameStateManager';
import { GameEventBus, eventBus } from '@/core/EventBus';
import { BubbleManager } from '@/managers/BubbleManager';
import { GameFlowManager } from '@/managers/GameFlowManager';

// Import existing systems (we'll refactor these gradually)
import { BubbleGrid } from './gameplay/BubbleGrid';
import { GridAttachmentSystem } from './gameplay/GridAttachmentSystem';
import { MatchDetectionSystem } from './gameplay/MatchDetectionSystem';
import { ShootingSystem } from './gameplay/ShootingSystem';
import { RowSpawnSystem } from './gameplay/RowSpawnSystem';
import { AIOpponentSystem } from './gameplay/AIOpponentSystem';
import { ResetSystem } from './gameplay/ResetSystem';
import { VictorySystem } from './gameplay/VictorySystem';
import { CascadeSystem } from './gameplay/CascadeSystem';

// Import UI systems
import { GameTimerUI } from '@/ui/GameTimerUI';
import { GemCounterUI } from '@/ui/GemCounterUI';

/**
 * Lightweight coordinator that manages system initialization and updates
 * Replaces the monolithic ArenaSystem with a cleaner architecture
 */
export class SystemCoordinator {
    private scene: Scene;
    private registry: SystemRegistry;
    private initialized: boolean = false;
    
    // Core grid (still needed by many systems)
    public bubbleGrid: BubbleGrid;
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Create registry
        this.registry = SystemRegistry.create(scene);
        
        // Initialize core grid at center
        const centerX = scene.cameras.main.centerX;
        const centerY = scene.cameras.main.centerY;
        this.bubbleGrid = new BubbleGrid(centerX, centerY);
    }
    
    /**
     * Initialize all game systems in proper order
     */
    public async initialize(): Promise<void> {
        console.log('🚀 System Coordinator initializing...');
        
        try {
            // Register core managers
            this.registerCoreManagers();
            
            // Register gameplay systems
            this.registerGameplaySystems();
            
            // Register UI systems
            this.registerUISystems();
            
            // Initialize all systems
            await this.registry.initializeAll();
            
            // Setup cross-system connections
            this.connectSystems();
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            this.initialized = true;
            
            console.log('✅ System Coordinator initialized successfully');
            
            // Emit ready event
            eventBus.emit('systems-ready');
            
        } catch (error) {
            console.error('❌ Failed to initialize systems:', error);
            throw error;
        }
    }
    
    /**
     * Register core manager systems
     */
    private registerCoreManagers(): void {
        // Game state manager is a singleton, just ensure it's created
        GameStateManager.getInstance();
        
        // Register managers
        this.registry.register(new BubbleManager(this.scene));
        this.registry.register(new GameFlowManager(this.scene));
    }
    
    /**
     * Register gameplay systems
     */
    private registerGameplaySystems(): void {
        // Create systems with dependencies properly declared
        const gridAttachment = new GridAttachmentSystem(this.scene, this.bubbleGrid);
        const matchDetection = new MatchDetectionSystem(this.scene, gridAttachment);
        
        // Register in registry (these will be initialized in dependency order)
        this.registry.register(gridAttachment as any);
        this.registry.register(matchDetection as any);
        
        // Continue with other systems...
        // We'll gradually refactor these to use the new architecture
    }
    
    /**
     * Register UI systems
     */
    private registerUISystems(): void {
        // UI systems can be registered but might not follow BaseGameSystem yet
        // We'll refactor them gradually
    }
    
    /**
     * Connect systems that need direct references
     * (Gradually we'll eliminate these in favor of events)
     */
    private connectSystems(): void {
        // Example: Connect match detection to grid attachment
        const gridAttachment = this.registry.getSystem<GridAttachmentSystem>('GridAttachmentSystem');
        const matchDetection = this.registry.getSystem<MatchDetectionSystem>('MatchDetectionSystem');
        
        if (gridAttachment && matchDetection) {
            (gridAttachment as any).setMatchDetectionSystem(matchDetection);
        }
    }
    
    /**
     * Setup global event handlers
     */
    private setupGlobalEventHandlers(): void {
        // Handle system errors
        eventBus.on('system-error', (data) => {
            console.error(`System error in ${data.system}:`, data.error);
            // Could trigger error recovery or game pause
        });
        
        // Handle performance warnings
        eventBus.on('fps-warning', (data) => {
            console.warn(`FPS dropped to ${data.fps} (target: ${data.target})`);
            // Could reduce particle effects or other optimizations
        });
        
        // Handle memory warnings
        eventBus.on('memory-warning', (data) => {
            console.warn(`Memory usage high: ${data.used}MB (threshold: ${data.threshold}MB)`);
            // Could trigger garbage collection or resource cleanup
        });
    }
    
    /**
     * Update all systems
     */
    public update(time: number, delta: number): void {
        if (!this.initialized) return;
        
        // Update all systems via registry
        this.registry.updateAll(time, delta);
        
        // Check performance
        this.checkPerformance();
    }
    
    /**
     * Monitor performance
     */
    private lastFPSCheck: number = 0;
    private frameCount: number = 0;
    
    private checkPerformance(): void {
        this.frameCount++;
        
        const now = Date.now();
        if (now - this.lastFPSCheck >= 1000) {
            const fps = this.frameCount;
            this.frameCount = 0;
            this.lastFPSCheck = now;
            
            // Warn if FPS drops below target
            if (fps < 55) {
                eventBus.emit('fps-warning', { fps, target: 60 });
            }
            
            // Check memory usage (if available)
            if ('memory' in performance) {
                const memory = (performance as any).memory;
                const usedMB = memory.usedJSHeapSize / 1048576;
                const limitMB = memory.jsHeapSizeLimit / 1048576;
                
                if (usedMB > limitMB * 0.9) {
                    eventBus.emit('memory-warning', {
                        used: usedMB,
                        threshold: limitMB * 0.9
                    });
                }
            }
        }
    }
    
    /**
     * Start a new game
     */
    public startGame(): void {
        const flowManager = this.registry.getSystem<GameFlowManager>('GameFlowManager');
        if (flowManager) {
            flowManager.startGame();
        } else {
            // Fallback to event
            eventBus.emit('game-started');
        }
    }
    
    /**
     * Pause the game
     */
    public pauseGame(): void {
        const flowManager = this.registry.getSystem<GameFlowManager>('GameFlowManager');
        if (flowManager) {
            flowManager.pauseGame();
        } else {
            eventBus.emit('game-paused');
        }
    }
    
    /**
     * Resume the game
     */
    public resumeGame(): void {
        const flowManager = this.registry.getSystem<GameFlowManager>('GameFlowManager');
        if (flowManager) {
            flowManager.resumeGame();
        } else {
            eventBus.emit('game-resumed');
        }
    }
    
    /**
     * Get a system by name
     */
    public getSystem<T>(name: string): T | undefined {
        return this.registry.getSystem<T>(name);
    }
    
    /**
     * Clean up all systems
     */
    public destroy(): void {
        console.log('🔥 System Coordinator shutting down...');
        
        // Destroy all systems
        this.registry.destroyAll();
        
        // Clean up singletons
        gameState().destroy();
        eventBus.destroy();
        
        // Clean up grid
        if (this.bubbleGrid) {
            // Add cleanup if needed
        }
        
        this.initialized = false;
        
        console.log('✅ System Coordinator shutdown complete');
    }
    
    /**
     * Get debug information
     */
    public getDebugInfo(): any {
        return {
            initialized: this.initialized,
            systems: this.registry.getSystemNames(),
            initOrder: this.registry.getInitializationOrder(),
            gameState: gameState().getState(),
            eventHistory: eventBus.getEventHistory().slice(-10),
            activeListeners: Array.from(eventBus.getActiveListeners().entries())
        };
    }
}