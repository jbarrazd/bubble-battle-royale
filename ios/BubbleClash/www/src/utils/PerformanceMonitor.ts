import { IPerformanceMetrics, GameEvents } from '@/types/GameTypes';

export class PerformanceMonitor {
    private fps: number = 60;
    private frameTime: number = 0;
    private lastTime: number = 0;
    private deltaTime: number = 0;
    private frameCount: number = 0;
    private fpsUpdateInterval: number = 500;
    private lastFpsUpdate: number = 0;
    private frames: number[] = [];
    private maxFrameSamples: number = 60;
    private warningThreshold: number = 30;
    private criticalThreshold: number = 20;
    private consecutiveLowFrames: number = 0;
    private eventEmitter: Phaser.Events.EventEmitter | null = null;

    constructor() {
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
    }

    public setEventEmitter(emitter: Phaser.Events.EventEmitter): void {
        this.eventEmitter = emitter;
    }

    public update(time: number): void {
        const currentTime = time || performance.now();
        this.deltaTime = currentTime - this.lastTime;
        
        // Simple FPS calculation every 500ms
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round(1000 / Math.max(16.67, this.deltaTime));
            this.lastFpsUpdate = currentTime;
        }
        
        this.lastTime = currentTime;
    }

    public getFPS(): number {
        return this.fps;
    }

    public getFrameTime(): number {
        return this.frameTime;
    }

    public getDeltaTime(): number {
        return this.deltaTime;
    }

    public getMetrics(): IPerformanceMetrics {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            deltaTime: this.deltaTime,
            drawCalls: 0,
            memoryUsage: this.getMemoryUsage()
        };
    }

    public shouldReduceQuality(): boolean {
        const avgFps = this.getAverageFPS();
        return avgFps < this.warningThreshold && this.consecutiveLowFrames > 5;
    }

    public shouldIncreaseQuality(): boolean {
        const avgFps = this.getAverageFPS();
        return avgFps >= 58 && this.consecutiveLowFrames === 0;
    }

    private getAverageFPS(): number {
        if (this.frames.length === 0) return 60;
        const avgFrameTime = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        return Math.round(1000 / avgFrameTime);
    }

    private getMemoryUsage(): number | undefined {
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            if (memory && memory.usedJSHeapSize) {
                return Math.round(memory.usedJSHeapSize / 1048576);
            }
        }
        return undefined;
    }

    public reset(): void {
        this.fps = 60;
        this.frameTime = 0;
        this.lastTime = performance.now();
        this.deltaTime = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = this.lastTime;
        this.frames = [];
        this.consecutiveLowFrames = 0;
    }

    public getPerformanceScore(): number {
        const avgFps = this.getAverageFPS();
        const score = Math.min(100, (avgFps / 60) * 100);
        return Math.round(score);
    }

    public logMetrics(): void {
        const metrics = this.getMetrics();
        console.log(
            `FPS: ${metrics.fps} | ` +
            `Frame Time: ${metrics.frameTime.toFixed(2)}ms | ` +
            `Memory: ${metrics.memoryUsage || 'N/A'}MB | ` 
          // `Score: ${this.getPerformanceScore()}%`
        );
    }
}