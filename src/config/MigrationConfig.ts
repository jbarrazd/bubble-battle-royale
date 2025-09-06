/**
 * Migration configuration for transitioning to new architecture
 * Controls which systems use the new architecture vs legacy
 */
export class MigrationConfig {
    private static instance: MigrationConfig;
    
    // Feature flags - ALL OPTIMIZATIONS ENABLED
    private features = {
        // Core systems
        useNewArchitecture: true,      // Master switch
        useSystemCoordinator: true,     // Use new system coordinator
        useEventBus: true,              // Use new event bus
        useGameStateManager: true,      // Use centralized state
        
        // Managers
        useBubbleManager: true,         // Use pooled bubble management
        useGameFlowManager: true,       // Use new game flow control
        
        // All systems using new architecture
        useNewMatchSystem: true,        // New optimized match system
        useNewShootingSystem: true,     // New optimized shooting
        useNewAISystem: true,           // New optimized AI
        useNewResetSystem: true,        // New optimized reset
        useNewVictorySystem: true,      // New optimized victory
        
        // Fixed to new mode only
        migrationMode: 'new' as 'legacy' | 'hybrid' | 'new',
        
        // Debug options
        debugMigration: false,          // Disabled for performance
        compareResults: false,          // No comparison needed
        performanceMetrics: true        // Keep tracking performance
    };
    
    private constructor() {}
    
    public static getInstance(): MigrationConfig {
        if (!MigrationConfig.instance) {
            MigrationConfig.instance = new MigrationConfig();
        }
        return MigrationConfig.instance;
    }
    
    /**
     * Check if a feature is enabled
     */
    public isEnabled(feature: keyof typeof this.features): boolean {
        return this.features[feature] as boolean;
    }
    
    /**
     * Get migration mode
     */
    public getMigrationMode(): 'legacy' | 'hybrid' | 'new' {
        return this.features.migrationMode;
    }
    
    /**
     * Set migration mode
     */
    public setMigrationMode(mode: 'legacy' | 'hybrid' | 'new'): void {
        this.features.migrationMode = mode;
        
        // Adjust feature flags based on mode
        if (mode === 'legacy') {
            this.features.useNewArchitecture = false;
            this.features.useSystemCoordinator = false;
            this.features.useEventBus = false;
            this.features.useGameStateManager = false;
            this.features.useBubbleManager = false;
            this.features.useGameFlowManager = false;
        } else if (mode === 'new') {
            this.features.useNewArchitecture = true;
            this.features.useSystemCoordinator = true;
            this.features.useEventBus = true;
            this.features.useGameStateManager = true;
            this.features.useBubbleManager = true;
            this.features.useGameFlowManager = true;
            this.features.useNewMatchSystem = true;
            this.features.useNewShootingSystem = true;
            this.features.useNewAISystem = true;
            this.features.useNewResetSystem = true;
            this.features.useNewVictorySystem = true;
        }
        // 'hybrid' mode keeps individual feature flags as is
        
        console.log(`🔄 Migration mode set to: ${mode}`);
    }
    
    /**
     * Enable a specific feature
     */
    public enableFeature(feature: keyof typeof this.features): void {
        (this.features[feature] as any) = true;
        console.log(`✅ Feature enabled: ${feature}`);
    }
    
    /**
     * Disable a specific feature
     */
    public disableFeature(feature: keyof typeof this.features): void {
        (this.features[feature] as any) = false;
        console.log(`❌ Feature disabled: ${feature}`);
    }
    
    /**
     * Get all feature states
     */
    public getFeatureStates(): typeof this.features {
        return { ...this.features };
    }
    
    /**
     * Get migration progress percentage
     */
    public getMigrationProgress(): number {
        const migratedFeatures = [
            'useSystemCoordinator',
            'useEventBus',
            'useGameStateManager',
            'useBubbleManager',
            'useGameFlowManager',
            'useNewMatchSystem',
            'useNewShootingSystem',
            'useNewAISystem',
            'useNewResetSystem',
            'useNewVictorySystem'
        ];
        
        const enabled = migratedFeatures.filter(f => 
            this.features[f as keyof typeof this.features]
        ).length;
        
        return (enabled / migratedFeatures.length) * 100;
    }
    
    /**
     * Log migration status
     */
    public logStatus(): void {
        console.log('=== Migration Status ===');
        console.log(`Mode: ${this.features.migrationMode}`);
        console.log(`Progress: ${this.getMigrationProgress().toFixed(1)}%`);
        console.log('Features:');
        
        Object.entries(this.features).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
                console.log(`  ${key}: ${value ? '✅' : '❌'}`);
            }
        });
        
        console.log('========================');
    }
    
    /**
     * Create a migration report
     */
    public createReport(): string {
        const report = {
            timestamp: new Date().toISOString(),
            mode: this.features.migrationMode,
            progress: `${this.getMigrationProgress().toFixed(1)}%`,
            features: this.features
        };
        
        return JSON.stringify(report, null, 2);
    }
}

// Export singleton instance
export const migrationConfig = MigrationConfig.getInstance();