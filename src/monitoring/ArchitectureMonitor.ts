import { eventBus } from '@/core/EventBus';
import { migrationConfig } from '@/config/MigrationConfig';

/**
 * Monitors and compares performance between old and new architecture
 * Provides metrics to validate the refactoring improvements
 */
export class ArchitectureMonitor {
    private static instance: ArchitectureMonitor;
    
    // Performance metrics
    private metrics = {
        old: {
            fps: [] as number[],
            updateTime: [] as number[],
            memoryUsage: [] as number[],
            eventLatency: [] as number[]
        },
        new: {
            fps: [] as number[],
            updateTime: [] as number[],
            memoryUsage: [] as number[],
            eventLatency: [] as number[]
        }
    };
    
    // Comparison data
    private comparisons = {
        fpsImprovement: 0,
        updateTimeReduction: 0,
        memoryReduction: 0,
        eventLatencyReduction: 0
    };
    
    private sampleCount = 0;
    private readonly MAX_SAMPLES = 1000;
    private isMonitoring = false;
    private currentMode: 'old' | 'new' = 'old';
    
    private constructor() {
        this.setupEventListeners();
    }
    
    public static getInstance(): ArchitectureMonitor {
        if (!ArchitectureMonitor.instance) {
            ArchitectureMonitor.instance = new ArchitectureMonitor();
        }
        return ArchitectureMonitor.instance;
    }
    
    private setupEventListeners(): void {
        // Listen for FPS updates
        eventBus.on('fps-warning', (data) => {
            this.recordFPS(data.fps);
        });
        
        // Listen for performance metrics
        eventBus.on('performance-metric', (data: any) => {
            this.recordMetric(data.type, data.value);
        });
    }
    
    /**
     * Start monitoring performance
     */
    public startMonitoring(mode: 'old' | 'new'): void {
        this.isMonitoring = true;
        this.currentMode = mode;
        this.sampleCount = 0;
        
        console.log(`📊 Architecture Monitor: Starting monitoring for ${mode.toUpperCase()} architecture`);
    }
    
    /**
     * Stop monitoring
     */
    public stopMonitoring(): void {
        this.isMonitoring = false;
        console.log('📊 Architecture Monitor: Stopped monitoring');
    }
    
    /**
     * Record FPS sample
     */
    public recordFPS(fps: number): void {
        if (!this.isMonitoring) return;
        
        const metrics = this.metrics[this.currentMode];
        metrics.fps.push(fps);
        
        // Trim old samples
        if (metrics.fps.length > this.MAX_SAMPLES) {
            metrics.fps.shift();
        }
        
        this.sampleCount++;
    }
    
    /**
     * Record update time
     */
    public recordUpdateTime(time: number): void {
        if (!this.isMonitoring) return;
        
        const metrics = this.metrics[this.currentMode];
        metrics.updateTime.push(time);
        
        if (metrics.updateTime.length > this.MAX_SAMPLES) {
            metrics.updateTime.shift();
        }
    }
    
    /**
     * Record memory usage
     */
    public recordMemoryUsage(): void {
        if (!this.isMonitoring) return;
        
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            const usedMB = memory.usedJSHeapSize / 1048576;
            
            const metrics = this.metrics[this.currentMode];
            metrics.memoryUsage.push(usedMB);
            
            if (metrics.memoryUsage.length > this.MAX_SAMPLES) {
                metrics.memoryUsage.shift();
            }
        }
    }
    
    /**
     * Record event latency
     */
    public recordEventLatency(latency: number): void {
        if (!this.isMonitoring) return;
        
        const metrics = this.metrics[this.currentMode];
        metrics.eventLatency.push(latency);
        
        if (metrics.eventLatency.length > this.MAX_SAMPLES) {
            metrics.eventLatency.shift();
        }
    }
    
    /**
     * Record generic metric
     */
    private recordMetric(type: string, value: number): void {
        switch (type) {
            case 'fps':
                this.recordFPS(value);
                break;
            case 'updateTime':
                this.recordUpdateTime(value);
                break;
            case 'memory':
                this.recordMemoryUsage();
                break;
            case 'eventLatency':
                this.recordEventLatency(value);
                break;
        }
    }
    
    /**
     * Calculate average of array
     */
    private getAverage(arr: number[]): number {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
    
    /**
     * Get percentile of array
     */
    private getPercentile(arr: number[], percentile: number): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.floor((percentile / 100) * sorted.length);
        return sorted[Math.min(index, sorted.length - 1)];
    }
    
    /**
     * Calculate comparisons between old and new
     */
    public calculateComparisons(): void {
        const oldMetrics = this.metrics.old;
        const newMetrics = this.metrics.new;
        
        // FPS improvement (higher is better)
        const oldAvgFPS = this.getAverage(oldMetrics.fps);
        const newAvgFPS = this.getAverage(newMetrics.fps);
        this.comparisons.fpsImprovement = oldAvgFPS > 0 
            ? ((newAvgFPS - oldAvgFPS) / oldAvgFPS) * 100 
            : 0;
        
        // Update time reduction (lower is better)
        const oldAvgUpdate = this.getAverage(oldMetrics.updateTime);
        const newAvgUpdate = this.getAverage(newMetrics.updateTime);
        this.comparisons.updateTimeReduction = oldAvgUpdate > 0
            ? ((oldAvgUpdate - newAvgUpdate) / oldAvgUpdate) * 100
            : 0;
        
        // Memory reduction (lower is better)
        const oldAvgMemory = this.getAverage(oldMetrics.memoryUsage);
        const newAvgMemory = this.getAverage(newMetrics.memoryUsage);
        this.comparisons.memoryReduction = oldAvgMemory > 0
            ? ((oldAvgMemory - newAvgMemory) / oldAvgMemory) * 100
            : 0;
        
        // Event latency reduction (lower is better)
        const oldAvgLatency = this.getAverage(oldMetrics.eventLatency);
        const newAvgLatency = this.getAverage(newMetrics.eventLatency);
        this.comparisons.eventLatencyReduction = oldAvgLatency > 0
            ? ((oldAvgLatency - newAvgLatency) / oldAvgLatency) * 100
            : 0;
    }
    
    /**
     * Get performance report
     */
    public getReport(): any {
        this.calculateComparisons();
        
        return {
            timestamp: new Date().toISOString(),
            migrationProgress: `${migrationConfig.getMigrationProgress().toFixed(1)}%`,
            sampleCount: this.sampleCount,
            
            metrics: {
                old: {
                    fps: {
                        avg: this.getAverage(this.metrics.old.fps).toFixed(1),
                        p95: this.getPercentile(this.metrics.old.fps, 95).toFixed(1),
                        p99: this.getPercentile(this.metrics.old.fps, 99).toFixed(1)
                    },
                    updateTime: {
                        avg: this.getAverage(this.metrics.old.updateTime).toFixed(2),
                        p95: this.getPercentile(this.metrics.old.updateTime, 95).toFixed(2),
                        p99: this.getPercentile(this.metrics.old.updateTime, 99).toFixed(2)
                    },
                    memory: {
                        avg: this.getAverage(this.metrics.old.memoryUsage).toFixed(1),
                        max: Math.max(...this.metrics.old.memoryUsage).toFixed(1)
                    },
                    eventLatency: {
                        avg: this.getAverage(this.metrics.old.eventLatency).toFixed(2),
                        p95: this.getPercentile(this.metrics.old.eventLatency, 95).toFixed(2)
                    }
                },
                
                new: {
                    fps: {
                        avg: this.getAverage(this.metrics.new.fps).toFixed(1),
                        p95: this.getPercentile(this.metrics.new.fps, 95).toFixed(1),
                        p99: this.getPercentile(this.metrics.new.fps, 99).toFixed(1)
                    },
                    updateTime: {
                        avg: this.getAverage(this.metrics.new.updateTime).toFixed(2),
                        p95: this.getPercentile(this.metrics.new.updateTime, 95).toFixed(2),
                        p99: this.getPercentile(this.metrics.new.updateTime, 99).toFixed(2)
                    },
                    memory: {
                        avg: this.getAverage(this.metrics.new.memoryUsage).toFixed(1),
                        max: Math.max(...this.metrics.new.memoryUsage).toFixed(1)
                    },
                    eventLatency: {
                        avg: this.getAverage(this.metrics.new.eventLatency).toFixed(2),
                        p95: this.getPercentile(this.metrics.new.eventLatency, 95).toFixed(2)
                    }
                }
            },
            
            improvements: {
                fps: `${this.comparisons.fpsImprovement > 0 ? '+' : ''}${this.comparisons.fpsImprovement.toFixed(1)}%`,
                updateTime: `${this.comparisons.updateTimeReduction > 0 ? '-' : '+'}${Math.abs(this.comparisons.updateTimeReduction).toFixed(1)}%`,
                memory: `${this.comparisons.memoryReduction > 0 ? '-' : '+'}${Math.abs(this.comparisons.memoryReduction).toFixed(1)}%`,
                eventLatency: `${this.comparisons.eventLatencyReduction > 0 ? '-' : '+'}${Math.abs(this.comparisons.eventLatencyReduction).toFixed(1)}%`
            },
            
            summary: this.generateSummary()
        };
    }
    
    /**
     * Generate performance summary
     */
    private generateSummary(): string {
        const improvements = [];
        
        if (this.comparisons.fpsImprovement > 5) {
            improvements.push(`FPS improved by ${this.comparisons.fpsImprovement.toFixed(1)}%`);
        }
        if (this.comparisons.updateTimeReduction > 10) {
            improvements.push(`Update time reduced by ${this.comparisons.updateTimeReduction.toFixed(1)}%`);
        }
        if (this.comparisons.memoryReduction > 10) {
            improvements.push(`Memory usage reduced by ${this.comparisons.memoryReduction.toFixed(1)}%`);
        }
        if (this.comparisons.eventLatencyReduction > 10) {
            improvements.push(`Event latency reduced by ${this.comparisons.eventLatencyReduction.toFixed(1)}%`);
        }
        
        if (improvements.length === 0) {
            return 'Performance metrics are still being collected...';
        }
        
        return `New architecture improvements: ${improvements.join(', ')}`;
    }
    
    /**
     * Log performance report to console
     */
    public logReport(): void {
        const report = this.getReport();
        
        console.log('=== Architecture Performance Report ===');
        console.log(`Migration Progress: ${report.migrationProgress}`);
        console.log(`Sample Count: ${report.sampleCount}`);
        console.log('');
        
        console.log('Performance Improvements:');
        console.log(`  FPS: ${report.improvements.fps}`);
        console.log(`  Update Time: ${report.improvements.updateTime}`);
        console.log(`  Memory: ${report.improvements.memory}`);
        console.log(`  Event Latency: ${report.improvements.eventLatency}`);
        console.log('');
        
        console.log('Summary:', report.summary);
        console.log('======================================');
    }
    
    /**
     * Export report to JSON file
     */
    public exportReport(): string {
        const report = this.getReport();
        return JSON.stringify(report, null, 2);
    }
    
    /**
     * Reset all metrics
     */
    public reset(): void {
        this.metrics = {
            old: {
                fps: [],
                updateTime: [],
                memoryUsage: [],
                eventLatency: []
            },
            new: {
                fps: [],
                updateTime: [],
                memoryUsage: [],
                eventLatency: []
            }
        };
        
        this.comparisons = {
            fpsImprovement: 0,
            updateTimeReduction: 0,
            memoryReduction: 0,
            eventLatencyReduction: 0
        };
        
        this.sampleCount = 0;
        console.log('📊 Architecture Monitor: Metrics reset');
    }
}

// Export singleton
export const architectureMonitor = ArchitectureMonitor.getInstance();