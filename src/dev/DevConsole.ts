import { migrationConfig } from '@/config/MigrationConfig';
import { architectureMonitor } from '@/monitoring/ArchitectureMonitor';
import { gameState } from '@/core/GameStateManager';
import { eventBus } from '@/core/EventBus';
import { ArchitectureTest } from '@/tests/ArchitectureTest';

/**
 * Developer console utilities for testing and debugging the new architecture
 * Access these in browser console via window.dev
 */
export class DevConsole {
    private static instance: DevConsole;
    
    private constructor() {
        this.setupGlobalCommands();
    }
    
    public static initialize(): void {
        if (!DevConsole.instance) {
            DevConsole.instance = new DevConsole();
            console.log('🛠️ Developer Console initialized. Type "dev.help()" for commands.');
        }
    }
    
    private setupGlobalCommands(): void {
        const dev = {
            // Help command
            help: () => {
                console.log(`
🛠️ Developer Console Commands:
================================

📋 Migration Commands:
  dev.migration.status()        - Show current migration status
  dev.migration.setMode(mode)   - Set mode: 'legacy', 'hybrid', or 'new'
  dev.migration.enable(feature) - Enable a specific feature
  dev.migration.disable(feature)- Disable a specific feature
  dev.migration.progress()      - Show migration progress

📊 Performance Commands:
  dev.perf.start(mode)         - Start monitoring ('old' or 'new')
  dev.perf.stop()              - Stop monitoring
  dev.perf.report()            - Show performance report
  dev.perf.reset()             - Reset all metrics

🎮 Game State Commands:
  dev.state.get()              - Get current game state
  dev.state.addGems(p, o)      - Add gems (player, opponent)
  dev.state.reset()            - Reset game state
  dev.state.setPhase(phase)    - Set game phase

📢 Event Bus Commands:
  dev.events.history()         - Show event history
  dev.events.listeners()       - Show active listeners
  dev.events.debug(on)         - Toggle debug mode
  dev.events.emit(name, data)  - Emit an event

🧪 Testing Commands:
  dev.test.all()              - Run all architecture tests
  dev.test.benchmark()        - Run performance benchmark
  dev.test.integration()      - Test system integration

🔧 Utility Commands:
  dev.clear()                 - Clear console
  dev.export()                - Export all data to JSON
  dev.reload()                - Reload the game
                `);
            },
            
            // Migration controls
            migration: {
                status: () => {
                    migrationConfig.logStatus();
                    return migrationConfig.getFeatureStates();
                },
                setMode: (mode: 'legacy' | 'hybrid' | 'new') => {
                    migrationConfig.setMigrationMode(mode);
                    console.log(`Migration mode set to: ${mode}`);
                    console.log('⚠️ Reload the game to apply changes');
                },
                enable: (feature: string) => {
                    migrationConfig.enableFeature(feature as any);
                },
                disable: (feature: string) => {
                    migrationConfig.disableFeature(feature as any);
                },
                progress: () => {
                    const progress = migrationConfig.getMigrationProgress();
                    console.log(`Migration Progress: ${progress.toFixed(1)}%`);
                    
                    // Visual progress bar
                    const filled = Math.floor(progress / 5);
                    const empty = 20 - filled;
                    const bar = '█'.repeat(filled) + '░'.repeat(empty);
                    console.log(`[${bar}]`);
                    
                    return progress;
                }
            },
            
            // Performance monitoring
            perf: {
                start: (mode: 'old' | 'new' = 'new') => {
                    architectureMonitor.startMonitoring(mode);
                    console.log(`Started monitoring ${mode} architecture`);
                },
                stop: () => {
                    architectureMonitor.stopMonitoring();
                    console.log('Stopped monitoring');
                },
                report: () => {
                    architectureMonitor.logReport();
                    return architectureMonitor.getReport();
                },
                reset: () => {
                    architectureMonitor.reset();
                    console.log('Performance metrics reset');
                }
            },
            
            // Game state
            state: {
                get: () => {
                    const state = gameState().getState();
                    console.log('Current Game State:', state);
                    return state;
                },
                addGems: (player: number, opponent: number) => {
                    gameState().addPlayerGems(player);
                    gameState().addOpponentGems(opponent);
                    console.log(`Added ${player} gems to player, ${opponent} to opponent`);
                },
                reset: () => {
                    gameState().resetGame();
                    console.log('Game state reset');
                },
                setPhase: (phase: 'menu' | 'playing' | 'paused' | 'victory' | 'defeat') => {
                    gameState().setGameState(phase);
                    console.log(`Game phase set to: ${phase}`);
                }
            },
            
            // Event bus
            events: {
                history: () => {
                    const history = eventBus.getEventHistory();
                    console.log('Event History (last 10):');
                    history.slice(-10).forEach((e, i) => {
                        const time = new Date(e.timestamp).toLocaleTimeString();
                        console.log(`  ${i + 1}. [${time}] ${e.event}`, e.data);
                    });
                    return history;
                },
                listeners: () => {
                    const listeners = eventBus.getActiveListeners();
                    console.log('Active Event Listeners:');
                    listeners.forEach((count, event) => {
                        console.log(`  ${event}: ${count} listeners`);
                    });
                    return listeners;
                },
                debug: (enabled: boolean) => {
                    eventBus.setDebugMode(enabled);
                },
                emit: (event: string, data?: any) => {
                    eventBus.emit(event as any, data);
                    console.log(`Emitted event: ${event}`, data);
                }
            },
            
            // Testing
            test: {
                all: async () => {
                    const scene = (window as any).game?.scene?.scenes?.[0];
                    if (!scene) {
                        console.error('No active scene found');
                        return;
                    }
                    const test = new ArchitectureTest(scene);
                    await test.runAllTests();
                },
                benchmark: async () => {
                    const scene = (window as any).game?.scene?.scenes?.[0];
                    if (!scene) {
                        console.error('No active scene found');
                        return;
                    }
                    const test = new ArchitectureTest(scene);
                    await test.runPerformanceBenchmark();
                },
                integration: async () => {
                    console.log('Testing system integration...');
                    
                    // Test event flow
                    let received = false;
                    const handler = () => { received = true; };
                    eventBus.on('test-event' as any, handler);
                    eventBus.emit('test-event' as any);
                    
                    await new Promise(r => setTimeout(r, 100));
                    
                    eventBus.off('test-event' as any, handler);
                    
                    console.log(`Event system: ${received ? '✅' : '❌'}`);
                    
                    // Test state management
                    gameState().resetGame();
                    gameState().addPlayerGems(5);
                    const gems = gameState().getState().player.gems;
                    console.log(`State management: ${gems === 5 ? '✅' : '❌'}`);
                    
                    // Test migration config
                    const mode = migrationConfig.getMigrationMode();
                    console.log(`Migration config: ${mode ? '✅' : '❌'}`);
                    
                    console.log('Integration test complete');
                }
            },
            
            // Utilities
            clear: () => {
                console.clear();
                console.log('🛠️ Developer Console cleared. Type "dev.help()" for commands.');
            },
            
            export: () => {
                const data = {
                    timestamp: new Date().toISOString(),
                    migration: {
                        config: migrationConfig.getFeatureStates(),
                        progress: migrationConfig.getMigrationProgress(),
                        report: migrationConfig.createReport()
                    },
                    performance: architectureMonitor.exportReport(),
                    gameState: gameState().getState(),
                    eventHistory: eventBus.getEventHistory()
                };
                
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `architecture-data-${Date.now()}.json`;
                a.click();
                
                console.log('Data exported to file');
                return data;
            },
            
            reload: () => {
                console.log('Reloading game...');
                window.location.reload();
            }
        };
        
        // Attach to window
        (window as any).dev = dev;
        
        // Also attach shortcuts
        (window as any).migration = dev.migration;
        (window as any).perf = dev.perf;
        (window as any).gameState = dev.state;
        (window as any).events = dev.events;
    }
}

// Auto-initialize in development
if (import.meta.env.DEV) {
    DevConsole.initialize();
}