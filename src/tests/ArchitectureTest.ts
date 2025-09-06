import { Scene } from 'phaser';
import { migrationConfig } from '@/config/MigrationConfig';
import { architectureMonitor } from '@/monitoring/ArchitectureMonitor';
import { gameState } from '@/core/GameStateManager';
import { eventBus } from '@/core/EventBus';

/**
 * Test suite for validating the new architecture
 * Run these tests to ensure the migration is working correctly
 */
export class ArchitectureTest {
    private scene: Scene;
    private testResults: { [key: string]: boolean } = {};
    
    constructor(scene: Scene) {
        this.scene = scene;
    }
    
    /**
     * Run all architecture tests
     */
    public async runAllTests(): Promise<void> {
        console.log('🧪 Starting Architecture Tests...');
        console.log('================================');
        
        // Test 1: Migration Config
        await this.testMigrationConfig();
        
        // Test 2: Event Bus
        await this.testEventBus();
        
        // Test 3: Game State Manager
        await this.testGameStateManager();
        
        // Test 4: Performance Monitoring
        await this.testPerformanceMonitoring();
        
        // Test 5: System Integration
        await this.testSystemIntegration();
        
        // Print results
        this.printResults();
    }
    
    /**
     * Test migration configuration
     */
    private async testMigrationConfig(): Promise<void> {
        console.log('\n📋 Testing Migration Config...');
        
        try {
            // Test mode switching
            const originalMode = migrationConfig.getMigrationMode();
            
            migrationConfig.setMigrationMode('legacy');
            const isLegacy = migrationConfig.getMigrationMode() === 'legacy';
            
            migrationConfig.setMigrationMode('hybrid');
            const isHybrid = migrationConfig.getMigrationMode() === 'hybrid';
            
            migrationConfig.setMigrationMode('new');
            const isNew = migrationConfig.getMigrationMode() === 'new';
            
            // Restore original
            migrationConfig.setMigrationMode(originalMode);
            
            // Test feature flags
            const canEnableFeature = () => {
                migrationConfig.enableFeature('useEventBus');
                return migrationConfig.isEnabled('useEventBus');
            };
            
            const canDisableFeature = () => {
                migrationConfig.disableFeature('useEventBus');
                return !migrationConfig.isEnabled('useEventBus');
            };
            
            // Test progress calculation
            const progress = migrationConfig.getMigrationProgress();
            const hasProgress = progress >= 0 && progress <= 100;
            
            this.testResults['Migration Config'] = 
                isLegacy && isHybrid && isNew && 
                canEnableFeature() && canDisableFeature() && 
                hasProgress;
                
            console.log(`  ✅ Migration Config: ${this.testResults['Migration Config'] ? 'PASSED' : 'FAILED'}`);
            
        } catch (error) {
            console.error('  ❌ Migration Config test failed:', error);
            this.testResults['Migration Config'] = false;
        }
    }
    
    /**
     * Test event bus functionality
     */
    private async testEventBus(): Promise<void> {
        console.log('\n📢 Testing Event Bus...');
        
        try {
            let eventReceived = false;
            let dataCorrect = false;
            
            // Test event emission and listening
            const testData = { playerGems: 5, opponentGems: 3, total: 8 };
            
            const handler = (data: any) => {
                eventReceived = true;
                dataCorrect = 
                    data.playerGems === testData.playerGems &&
                    data.opponentGems === testData.opponentGems &&
                    data.total === testData.total;
            };
            
            eventBus.on('gems-updated', handler);
            eventBus.emit('gems-updated', testData);
            
            // Wait a tick
            await new Promise(resolve => setTimeout(resolve, 10));
            
            eventBus.off('gems-updated', handler);
            
            // Test event history
            const history = eventBus.getEventHistory();
            const hasHistory = history.length > 0;
            
            // Test waitFor
            let waitForWorked = false;
            const waitPromise = eventBus.waitFor('game-started', 100);
            eventBus.emit('game-started');
            
            try {
                await waitPromise;
                waitForWorked = true;
            } catch (e) {
                // Timeout is okay for test
            }
            
            this.testResults['Event Bus'] = 
                eventReceived && dataCorrect && hasHistory && waitForWorked;
                
            console.log(`  ✅ Event Bus: ${this.testResults['Event Bus'] ? 'PASSED' : 'FAILED'}`);
            
        } catch (error) {
            console.error('  ❌ Event Bus test failed:', error);
            this.testResults['Event Bus'] = false;
        }
    }
    
    /**
     * Test game state manager
     */
    private async testGameStateManager(): Promise<void> {
        console.log('\n🎮 Testing Game State Manager...');
        
        try {
            const gsm = gameState();
            
            // Test singleton
            const isSingleton = gsm === gameState();
            
            // Test state updates
            gsm.addPlayerGems(5);
            const playerGems = gsm.getState().player.gems;
            
            gsm.addOpponentGems(3);
            const opponentGems = gsm.getState().opponent.gems;
            
            // Test game state transitions
            gsm.setGameState('playing');
            const isPlaying = gsm.getState().gameFlow.state === 'playing';
            
            gsm.setGameState('paused');
            const isPaused = gsm.getState().gameFlow.state === 'paused';
            
            // Test reset
            gsm.resetGame();
            const isReset = 
                gsm.getState().player.gems === 0 &&
                gsm.getState().opponent.gems === 0;
            
            this.testResults['Game State Manager'] = 
                isSingleton && playerGems === 5 && opponentGems === 3 &&
                isPlaying && isPaused && isReset;
                
            console.log(`  ✅ Game State Manager: ${this.testResults['Game State Manager'] ? 'PASSED' : 'FAILED'}`);
            
        } catch (error) {
            console.error('  ❌ Game State Manager test failed:', error);
            this.testResults['Game State Manager'] = false;
        }
    }
    
    /**
     * Test performance monitoring
     */
    private async testPerformanceMonitoring(): Promise<void> {
        console.log('\n📊 Testing Performance Monitoring...');
        
        try {
            // Start monitoring
            architectureMonitor.startMonitoring('new');
            
            // Record some sample data
            for (let i = 0; i < 10; i++) {
                architectureMonitor.recordFPS(60 + Math.random() * 10);
                architectureMonitor.recordUpdateTime(16 + Math.random() * 4);
                architectureMonitor.recordMemoryUsage();
                architectureMonitor.recordEventLatency(Math.random() * 5);
            }
            
            // Switch to old architecture
            architectureMonitor.startMonitoring('old');
            
            // Record comparison data
            for (let i = 0; i < 10; i++) {
                architectureMonitor.recordFPS(50 + Math.random() * 10);
                architectureMonitor.recordUpdateTime(20 + Math.random() * 5);
                architectureMonitor.recordMemoryUsage();
                architectureMonitor.recordEventLatency(Math.random() * 10);
            }
            
            architectureMonitor.stopMonitoring();
            
            // Get report
            const report = architectureMonitor.getReport();
            const hasReport = 
                report && 
                report.metrics && 
                report.improvements &&
                report.summary;
            
            this.testResults['Performance Monitoring'] = hasReport;
            
            console.log(`  ✅ Performance Monitoring: ${this.testResults['Performance Monitoring'] ? 'PASSED' : 'FAILED'}`);
            
            // Log the report for review
            if (hasReport) {
                console.log('\n  Performance Report Summary:');
                console.log(`    ${report.summary}`);
            }
            
        } catch (error) {
            console.error('  ❌ Performance Monitoring test failed:', error);
            this.testResults['Performance Monitoring'] = false;
        }
    }
    
    /**
     * Test system integration
     */
    private async testSystemIntegration(): Promise<void> {
        console.log('\n🔧 Testing System Integration...');
        
        try {
            let integrationWorking = true;
            
            // Test event flow from state manager to event bus
            let eventFired = false;
            const handler = () => { eventFired = true; };
            
            eventBus.on('gems-updated', handler);
            gameState().addPlayerGems(1);
            
            await new Promise(resolve => setTimeout(resolve, 10));
            
            eventBus.off('gems-updated', handler);
            
            integrationWorking = integrationWorking && eventFired;
            
            // Test migration config affects systems
            const originalMode = migrationConfig.getMigrationMode();
            migrationConfig.setMigrationMode('new');
            const usingNew = migrationConfig.isEnabled('useNewArchitecture');
            migrationConfig.setMigrationMode(originalMode);
            
            integrationWorking = integrationWorking && usingNew;
            
            this.testResults['System Integration'] = integrationWorking;
            
            console.log(`  ✅ System Integration: ${this.testResults['System Integration'] ? 'PASSED' : 'FAILED'}`);
            
        } catch (error) {
            console.error('  ❌ System Integration test failed:', error);
            this.testResults['System Integration'] = false;
        }
    }
    
    /**
     * Print test results
     */
    private printResults(): void {
        console.log('\n================================');
        console.log('📊 Test Results Summary:');
        console.log('================================');
        
        let passed = 0;
        let failed = 0;
        
        Object.entries(this.testResults).forEach(([test, result]) => {
            console.log(`  ${result ? '✅' : '❌'} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
            if (result) passed++;
            else failed++;
        });
        
        const total = passed + failed;
        const percentage = total > 0 ? (passed / total) * 100 : 0;
        
        console.log('\n--------------------------------');
        console.log(`Total: ${passed}/${total} passed (${percentage.toFixed(1)}%)`);
        console.log('================================');
        
        if (percentage === 100) {
            console.log('🎉 All tests passed! Architecture migration is working correctly.');
        } else if (percentage >= 80) {
            console.log('⚠️ Most tests passed, but some issues need attention.');
        } else {
            console.log('❌ Several tests failed. Please review the architecture implementation.');
        }
    }
    
    /**
     * Run performance benchmark
     */
    public async runPerformanceBenchmark(): Promise<void> {
        console.log('\n⚡ Running Performance Benchmark...');
        console.log('This will test both architectures and compare results.');
        
        // Test old architecture
        console.log('\nTesting LEGACY architecture...');
        migrationConfig.setMigrationMode('legacy');
        architectureMonitor.reset();
        architectureMonitor.startMonitoring('old');
        
        // Simulate load for 5 seconds
        const oldStartTime = Date.now();
        while (Date.now() - oldStartTime < 5000) {
            // Simulate frame update
            architectureMonitor.recordFPS(this.scene.game.loop.actualFps);
            architectureMonitor.recordUpdateTime(this.scene.game.loop.delta);
            architectureMonitor.recordMemoryUsage();
            
            // Simulate events
            for (let i = 0; i < 10; i++) {
                const start = performance.now();
                eventBus.emit('gem-collected', {
                    isPlayer: true,
                    amount: 1,
                    x: 100,
                    y: 100,
                    gemType: 'normal'
                });
                architectureMonitor.recordEventLatency(performance.now() - start);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        architectureMonitor.stopMonitoring();
        
        // Test new architecture
        console.log('\nTesting NEW architecture...');
        migrationConfig.setMigrationMode('hybrid');
        architectureMonitor.startMonitoring('new');
        
        // Simulate load for 5 seconds
        const newStartTime = Date.now();
        while (Date.now() - newStartTime < 5000) {
            // Simulate frame update
            architectureMonitor.recordFPS(this.scene.game.loop.actualFps);
            architectureMonitor.recordUpdateTime(this.scene.game.loop.delta);
            architectureMonitor.recordMemoryUsage();
            
            // Simulate events
            for (let i = 0; i < 10; i++) {
                const start = performance.now();
                eventBus.emit('gem-collected', {
                    isPlayer: true,
                    amount: 1,
                    x: 100,
                    y: 100,
                    gemType: 'normal'
                });
                architectureMonitor.recordEventLatency(performance.now() - start);
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        architectureMonitor.stopMonitoring();
        
        // Display results
        console.log('\n📈 Benchmark Results:');
        architectureMonitor.logReport();
    }
}

// Export for use in dev console
(window as any).ArchitectureTest = ArchitectureTest;
(window as any).runArchitectureTests = async (scene: Scene) => {
    const test = new ArchitectureTest(scene);
    await test.runAllTests();
    await test.runPerformanceBenchmark();
};