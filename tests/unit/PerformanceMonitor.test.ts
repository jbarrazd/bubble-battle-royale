import { PerformanceMonitor } from '@utils/PerformanceMonitor';
import { GameEvents } from '@/types/GameTypes';

describe('PerformanceMonitor', () => {
    let performanceMonitor: PerformanceMonitor;
    let mockEventEmitter: any;

    beforeEach(() => {
        performanceMonitor = new PerformanceMonitor();
        mockEventEmitter = {
            emit: jest.fn()
        };
        
        jest.spyOn(global.performance, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Basic Functionality', () => {
        it('should initialize with default values', () => {
            expect(performanceMonitor.getFPS()).toBe(60);
            expect(performanceMonitor.getFrameTime()).toBe(0);
            expect(performanceMonitor.getDeltaTime()).toBe(0);
        });

        it('should update metrics on update call', () => {
            jest.spyOn(global.performance, 'now').mockReturnValue(1016.67);
            performanceMonitor.update(1016.67);
            
            expect(performanceMonitor.getDeltaTime()).toBeCloseTo(16.67);
            expect(performanceMonitor.getFrameTime()).toBeCloseTo(16.67);
        });

        it('should calculate FPS after update interval', () => {
            performanceMonitor.setEventEmitter(mockEventEmitter);
            
            // Simulate 60 FPS (16.67ms per frame)
            for (let i = 0; i < 100; i++) {
                const time = 1000 + (i * 16.67);
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            expect(performanceMonitor.getFPS()).toBeGreaterThan(55);
            expect(performanceMonitor.getFPS()).toBeLessThanOrEqual(60);
        });
    });

    describe('Performance Warnings', () => {
        it('should emit warning when FPS drops below threshold', () => {
            performanceMonitor.setEventEmitter(mockEventEmitter);
            
            // Simulate low FPS (50ms per frame = 20 FPS)
            for (let i = 0; i < 30; i++) {
                const time = 1000 + (i * 50);
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                GameEvents.PERFORMANCE_WARNING,
                expect.objectContaining({
                    fps: expect.any(Number),
                    severity: expect.stringMatching(/warning|critical/)
                })
            );
        });

        it('should emit critical warning when FPS is very low', () => {
            performanceMonitor.setEventEmitter(mockEventEmitter);
            
            // Simulate very low FPS (100ms per frame = 10 FPS)
            for (let i = 0; i < 30; i++) {
                const time = 1000 + (i * 100);
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
                GameEvents.PERFORMANCE_WARNING,
                expect.objectContaining({
                    severity: 'critical'
                })
            );
        });
    });

    describe('Quality Adjustment', () => {
        it('should recommend quality reduction when FPS is low', () => {
            // Simulate low FPS
            for (let i = 0; i < 60; i++) {
                const time = 1000 + (i * 40); // 25 FPS
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            expect(performanceMonitor.shouldReduceQuality()).toBe(true);
        });

        it('should recommend quality increase when FPS is high', () => {
            // Simulate high FPS
            for (let i = 0; i < 60; i++) {
                const time = 1000 + (i * 16.67); // 60 FPS
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            expect(performanceMonitor.shouldIncreaseQuality()).toBe(true);
        });

        it('should not recommend quality increase when FPS is unstable', () => {
            // Simulate varying FPS
            for (let i = 0; i < 60; i++) {
                const variation = i % 2 === 0 ? 16.67 : 33.33;
                const time = 1000 + (i * variation);
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            expect(performanceMonitor.shouldIncreaseQuality()).toBe(false);
        });
    });

    describe('Metrics Retrieval', () => {
        it('should return complete metrics object', () => {
            performanceMonitor.update(1016.67);
            
            const metrics = performanceMonitor.getMetrics();
            
            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('frameTime');
            expect(metrics).toHaveProperty('deltaTime');
            expect(metrics).toHaveProperty('drawCalls');
            expect(metrics).toHaveProperty('memoryUsage');
        });

        it('should calculate performance score', () => {
            // Perfect 60 FPS should give 100% score
            for (let i = 0; i < 60; i++) {
                const time = 1000 + (i * 16.67);
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            const score = performanceMonitor.getPerformanceScore();
            expect(score).toBeGreaterThan(90);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should calculate lower performance score for poor FPS', () => {
            // 30 FPS should give ~50% score
            for (let i = 0; i < 60; i++) {
                const time = 1000 + (i * 33.33);
                jest.spyOn(global.performance, 'now').mockReturnValue(time);
                performanceMonitor.update(time);
            }
            
            const score = performanceMonitor.getPerformanceScore();
            expect(score).toBeGreaterThan(40);
            expect(score).toBeLessThan(60);
        });
    });

    describe('Reset Functionality', () => {
        it('should reset all metrics to initial values', () => {
            // Update with some values
            performanceMonitor.update(1100);
            performanceMonitor.update(1200);
            
            // Reset
            performanceMonitor.reset();
            
            expect(performanceMonitor.getFPS()).toBe(60);
            expect(performanceMonitor.getFrameTime()).toBe(0);
            expect(performanceMonitor.getDeltaTime()).toBe(0);
            expect(performanceMonitor.getPerformanceScore()).toBe(100);
        });
    });

    describe('Logging', () => {
        it('should log metrics to console', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            performanceMonitor.update(1016.67);
            performanceMonitor.logMetrics();
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('FPS:')
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Memory Usage', () => {
        it('should return memory usage when available', () => {
            const mockMemory = {
                usedJSHeapSize: 10485760 // 10MB in bytes
            };
            
            Object.defineProperty(performance, 'memory', {
                value: mockMemory,
                configurable: true
            });
            
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.memoryUsage).toBe(10);
            
            delete (performance as any).memory;
        });

        it('should return undefined when memory API not available', () => {
            delete (performance as any).memory;
            
            const metrics = performanceMonitor.getMetrics();
            expect(metrics.memoryUsage).toBeUndefined();
        });
    });
});