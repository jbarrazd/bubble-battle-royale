import { Scene } from 'phaser';
import { ArenaSystem } from '@/systems/gameplay/ArenaSystem';
import { SystemCoordinator } from '@/systems/SystemCoordinator';
import { gameState } from '@/core/GameStateManager';
import { eventBus } from '@/core/EventBus';

/**
 * Adapter that makes the new architecture compatible with existing code
 * Allows gradual migration from ArenaSystem to the new architecture
 * 
 * TEMPORARY: Remove this file once migration is complete
 */
export class ArenaSystemAdapter extends ArenaSystem {
    // Expose scene from parent
    protected get arenaScene(): Scene {
        return (this as any).scene;
    }
    
    private coordinator: SystemCoordinator;
    private migrationMode: 'legacy' | 'hybrid' | 'new' = 'new'; // ALWAYS NEW
    
    constructor(scene: Scene) {
        super(scene);
        
        // Create new coordinator
        this.coordinator = new SystemCoordinator(scene);
        
        // Override some properties to use new systems
        this.overrideLegacyBehavior();
    }
    
    /**
     * Override legacy initialization - OPTIMIZED VERSION
     */
    public async initialize(): Promise<void> {
        console.log('🚀 Optimized Architecture: Initializing...');
        
        // ALWAYS use new optimized system
        await this.coordinator.initialize();
        this.syncFromNewSystems();
        this.setupEventBridges();
        
        console.log('✅ Optimized Architecture: Ready');
    }
    
    /**
     * Initialize only the legacy components we still need
     */
    private async initializeLegacyComponents(): Promise<void> {
        // Skip the parts already handled by new systems
        // For now, we still need launchers, objective, etc.
        
        // These are private methods in ArenaSystem - we need to work around this
        // For now, call the full setup but skip what we don't need
        // TODO: Refactor ArenaSystem to have protected methods instead
        
        // Skip these - handled by new systems:
        // - Gem counting (GameStateManager)
        // - Victory conditions (GameFlowManager)
        // - Bubble pooling (BubbleManager)
    }
    
    /**
     * Sync data from new systems to legacy properties
     */
    private syncFromNewSystems(): void {
        // Sync gem counts
        const state = gameState().getState();
        this.playerGemCount = state.player.gems;
        this.opponentGemCount = state.opponent.gems;
        // These are private properties - need to use public setters or reflection
        // For now, skip score sync as it's handled elsewhere
        
        // Sync bubble grid
        this.bubbleGrid = this.coordinator.bubbleGrid;
    }
    
    /**
     * Setup event bridges between old and new systems
     */
    private setupEventBridges(): void {
        // Bridge old events to new event bus
        this.arenaScene.events.on('gem-collected-from-bubble', (data: any) => {
            eventBus.emit('gem-collected', {
                isPlayer: data.isPlayer,
                amount: 1,
                x: data.x,
                y: data.y,
                gemType: data.gemType
            });
        });
        
        // Bridge new events to old handlers
        eventBus.on('gems-updated', (data) => {
            this.playerGemCount = data.playerGems;
            this.opponentGemCount = data.opponentGems;
            
            // Update old UI if it exists
            this.arenaScene.events.emit('gems-updated', data);
        });
        
        eventBus.on('game-over', (data) => {
            // Trigger old victory screens using events
            this.arenaScene.events.emit(data.winner === 'player' ? 'victory' : 'defeat');
        });
    }
    
    /**
     * Override legacy methods to use new systems
     */
    private overrideLegacyBehavior(): void {
        // Since handleBubbleGemCollected is private, we'll intercept at event level
        // The event bridging in setupEventBridges handles this
    }
    
    /**
     * Override update - OPTIMIZED VERSION
     */
    public update(time: number, delta: number): void {
        // ALWAYS use optimized coordinator
        this.coordinator.update(time, delta);
    }
    
    /**
     * Update only the legacy components we still need
     */
    private updateLegacyComponents(time: number, delta: number): void {
        // These are private members - need workaround
        // For now, let the parent class handle these in super.update()
        // We'll refactor ArenaSystem to have protected members later
        
        // Skip these - handled by new systems:
        // - Victory checking
        // - Timer updates
        // - State management
    }
    
    /**
     * Set migration mode for testing
     */
    public setMigrationMode(mode: 'legacy' | 'hybrid' | 'new'): void {
        this.migrationMode = mode;
        console.log(`Migration mode set to: ${mode}`);
    }
    
    /**
     * Get migration statistics
     */
    public getMigrationStats(): any {
        return {
            mode: this.migrationMode,
            legacySystems: {
                launchers: !!(this as any).playerLauncher,
                shooting: !!(this as any).shootingSystem,
                ai: !!(this as any).aiSystem
            },
            newSystems: this.coordinator.getDebugInfo().systems,
            performance: {
                fps: this.arenaScene.game.loop.actualFps,
                delta: this.arenaScene.game.loop.delta
            }
        };
    }
    
    /**
     * Override destroy
     */
    public destroy(): void {
        // Destroy new systems
        this.coordinator.destroy();
        
        // Destroy legacy systems
        super.destroy();
    }
}