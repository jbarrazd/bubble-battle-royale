import { Scene } from 'phaser';

interface IPerformanceMetrics {
    fps: number;
    deltaTime: number;
    drawCalls: number;
    temperature: 'cool' | 'warm' | 'hot';
}

export class PerformanceOptimizer {
    private scene: Scene;
    private metrics: IPerformanceMetrics;
    private frameCount: number = 0;
    private lastCheck: number = 0;
    private lastDelta: number = 0;
    private optimizationLevel: number = 0; // 0 = none, 1 = light, 2 = medium, 3 = heavy
    private tweenReduction: boolean = false;
    private particleReduction: boolean = false;
    private effectReduction: boolean = false;
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.metrics = {
            fps: 60,
            deltaTime: 16.67,
            drawCalls: 0,
            temperature: 'cool'
        };
        
        // Start monitoring performance
        this.startMonitoring();
    }
    
    private startMonitoring(): void {
        // Check performance every second
        this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this.checkPerformance()
        });
    }
    
    private checkPerformance(): void {
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastCheck;
        this.lastCheck = currentTime;
        
        // Calculate FPS
        const fps = this.scene.game.loop.actualFps;
        this.metrics.fps = fps;
        
        // Determine temperature based on FPS and platform
        const isCapacitor = !!(window as any).Capacitor;
        if (isCapacitor) {
            if (fps < 30) {
                this.metrics.temperature = 'hot';
                this.applyOptimization(3);
            } else if (fps < 45) {
                this.metrics.temperature = 'warm';
                this.applyOptimization(2);
            } else if (fps < 55) {
                this.metrics.temperature = 'warm';
                this.applyOptimization(1);
            } else {
                this.metrics.temperature = 'cool';
                this.applyOptimization(0);
            }
        }
        
        // Log performance metrics in development
        if (fps < 50 && isCapacitor) {
            console.log(`Performance Warning: FPS=${fps.toFixed(1)}, Temp=${this.metrics.temperature}, OptLevel=${this.optimizationLevel}`);
        }
    }
    
    private applyOptimization(level: number): void {
        if (level === this.optimizationLevel) return;
        
        this.optimizationLevel = level;
        
        switch (level) {
            case 0: // No optimization
                this.disableAllOptimizations();
                break;
            case 1: // Light optimization
                this.applyLightOptimizations();
                break;
            case 2: // Medium optimization
                this.applyMediumOptimizations();
                break;
            case 3: // Heavy optimization
                this.applyHeavyOptimizations();
                break;
        }
        
        // Emit optimization event for other systems to react
        this.scene.events.emit('performance-optimization', {
            level,
            tweenReduction: this.tweenReduction,
            particleReduction: this.particleReduction,
            effectReduction: this.effectReduction
        });
    }
    
    private disableAllOptimizations(): void {
        this.tweenReduction = false;
        this.particleReduction = false;
        this.effectReduction = false;
        
        // Re-enable all visual features
        this.scene.tweens.timeScale = 1;
    }
    
    private applyLightOptimizations(): void {
        // Reduce particle count slightly
        this.particleReduction = true;
        this.effectReduction = false;
        this.tweenReduction = false;
        
        // Keep animations smooth
        this.scene.tweens.timeScale = 1;
    }
    
    private applyMediumOptimizations(): void {
        // Reduce particles and some effects
        this.particleReduction = true;
        this.effectReduction = true;
        this.tweenReduction = false;
        
        // Slightly speed up animations to reduce overhead
        this.scene.tweens.timeScale = 1.1;
    }
    
    private applyHeavyOptimizations(): void {
        // Maximum reduction
        this.particleReduction = true;
        this.effectReduction = true;
        this.tweenReduction = true;
        
        // Speed up animations significantly
        this.scene.tweens.timeScale = 1.5;
        
        // Kill non-essential infinite tweens
        this.killNonEssentialTweens();
    }
    
    private killNonEssentialTweens(): void {
        // Find and kill decorative infinite tweens
        const allTweens = this.scene.tweens.getTweens();
        allTweens.forEach((tween: any) => {
            const config = tween.data?.[0];
            if (config && config.repeat === -1) {
                // Check if it's a decorative tween (stars, sparkles, etc)
                const target = config.target;
                if (target && target.getData) {
                    const isDecorative = target.getData('isDecorative') || 
                                       target.getData('isSparkle') ||
                                       target.getData('isStar');
                    if (isDecorative) {
                        tween.stop();
                    }
                }
            }
        });
    }
    
    public shouldReduceParticles(): boolean {
        return this.particleReduction;
    }
    
    public shouldReduceEffects(): boolean {
        return this.effectReduction;
    }
    
    public shouldReduceTweens(): boolean {
        return this.tweenReduction;
    }
    
    public getOptimizationLevel(): number {
        return this.optimizationLevel;
    }
    
    public getMetrics(): IPerformanceMetrics {
        return { ...this.metrics };
    }
    
    public destroy(): void {
        // Cleanup
        this.scene.time.removeAllEvents();
    }
}