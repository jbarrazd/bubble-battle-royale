import { SceneManager } from '@systems/core/SceneManager';
import { SceneKeys, GameEvents } from '@/types/GameTypes';

describe('SceneManager', () => {
    let sceneManager: SceneManager;
    let mockGame: any;
    let mockScene: any;

    beforeEach(() => {
        mockScene = {
            scene: {
                isActive: jest.fn().mockReturnValue(true)
            },
            cameras: {
                main: {
                    fadeOut: jest.fn(),
                    fadeIn: jest.fn(),
                    once: jest.fn((event, callback) => {
                        if (event === 'camerafadeoutcomplete' || event === 'camerafadeincomplete') {
                            setTimeout(callback, 0);
                        }
                    })
                }
            }
        };

        mockGame = {
            scene: {
                getScene: jest.fn().mockReturnValue(mockScene),
                start: jest.fn(),
                stop: jest.fn(),
                pause: jest.fn(),
                resume: jest.fn(),
                restart: jest.fn(),
                launch: jest.fn(),
                isActive: jest.fn().mockReturnValue(false)
            },
            events: {
                on: jest.fn(),
                off: jest.fn(),
                emit: jest.fn()
            }
        };

        sceneManager = SceneManager.getInstance(mockGame);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should create a singleton instance', () => {
            const instance1 = SceneManager.getInstance(mockGame);
            const instance2 = SceneManager.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should throw error if getInstance called without game on first call', () => {
            // Reset the instance
            (SceneManager as any).instance = null;
            expect(() => SceneManager.getInstance()).toThrow('SceneManager must be initialized with a game instance');
        });
    });

    describe('transitionTo', () => {
        it('should transition to a new scene', async () => {
            sceneManager.setCurrentScene(SceneKeys.MENU);
            sceneManager.transitionTo(SceneKeys.GAME);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockGame.scene.stop).toHaveBeenCalledWith(SceneKeys.MENU);
            expect(mockGame.scene.start).toHaveBeenCalledWith(SceneKeys.GAME, expect.any(Object));
        });

        it('should not transition if already transitioning', () => {
            sceneManager.transitionTo(SceneKeys.GAME);
            sceneManager.transitionTo(SceneKeys.MENU);

            expect(mockGame.scene.start).toHaveBeenCalledTimes(1);
        });

        it('should handle non-existent scene', () => {
            mockGame.scene.getScene.mockReturnValue(null);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            sceneManager.transitionTo('NonExistentScene');
            
            expect(consoleSpy).toHaveBeenCalledWith('Scene "NonExistentScene" not found');
            consoleSpy.mockRestore();
        });

        it('should pass data to the new scene', async () => {
            const testData = { test: 'data' };
            sceneManager.transitionTo(SceneKeys.GAME, { data: testData });

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockGame.scene.start).toHaveBeenCalledWith(
                SceneKeys.GAME,
                expect.objectContaining(testData)
            );
        });
    });

    describe('Scene State Management', () => {
        it('should get current scene', () => {
            sceneManager.setCurrentScene(SceneKeys.MENU);
            expect(sceneManager.getCurrentScene()).toBe(SceneKeys.MENU);
        });

        it('should get previous scene', () => {
            sceneManager.setCurrentScene(SceneKeys.BOOT);
            sceneManager.transitionTo(SceneKeys.MENU);
            expect(sceneManager.getPreviousScene()).toBe(SceneKeys.BOOT);
        });

        it('should check if transitioning', () => {
            expect(sceneManager.isTransitioning()).toBe(false);
            sceneManager.transitionTo(SceneKeys.GAME);
            expect(sceneManager.isTransitioning()).toBe(true);
        });
    });

    describe('Scene Control', () => {
        beforeEach(() => {
            sceneManager.setCurrentScene(SceneKeys.GAME);
        });

        it('should restart current scene', () => {
            const data = { restart: true };
            sceneManager.restartCurrentScene({ data });
            expect(mockGame.scene.restart).toHaveBeenCalledWith(SceneKeys.GAME, data);
        });

        it('should pause current scene', () => {
            sceneManager.pauseCurrentScene();
            expect(mockGame.scene.pause).toHaveBeenCalledWith(SceneKeys.GAME);
        });

        it('should resume current scene', () => {
            sceneManager.resumeCurrentScene();
            expect(mockGame.scene.resume).toHaveBeenCalledWith(SceneKeys.GAME);
        });
    });

    describe('Parallel Scenes', () => {
        it('should launch parallel scene', () => {
            const data = { parallel: true };
            sceneManager.launchParallelScene(SceneKeys.SHOP, { data });
            expect(mockGame.scene.launch).toHaveBeenCalledWith(SceneKeys.SHOP, data);
        });

        it('should stop parallel scene if active', () => {
            mockGame.scene.isActive.mockReturnValue(true);
            sceneManager.stopParallelScene(SceneKeys.SHOP);
            expect(mockGame.scene.stop).toHaveBeenCalledWith(SceneKeys.SHOP);
        });

        it('should not stop parallel scene if not active', () => {
            mockGame.scene.isActive.mockReturnValue(false);
            sceneManager.stopParallelScene(SceneKeys.SHOP);
            expect(mockGame.scene.stop).not.toHaveBeenCalled();
        });
    });

    describe('Event System', () => {
        it('should register event listeners', () => {
            const callback = jest.fn();
            sceneManager.on(GameEvents.SCENE_READY, callback);
            
            const eventEmitter = (sceneManager as any).eventEmitter;
            eventEmitter.emit(GameEvents.SCENE_READY, { test: 'data' });
            
            expect(callback).toHaveBeenCalledWith({ test: 'data' });
        });

        it('should unregister event listeners', () => {
            const callback = jest.fn();
            sceneManager.on(GameEvents.SCENE_READY, callback);
            sceneManager.off(GameEvents.SCENE_READY, callback);
            
            const eventEmitter = (sceneManager as any).eventEmitter;
            eventEmitter.emit(GameEvents.SCENE_READY, { test: 'data' });
            
            expect(callback).not.toHaveBeenCalled();
        });

        it('should register one-time event listeners', () => {
            const callback = jest.fn();
            sceneManager.once(GameEvents.SCENE_READY, callback);
            
            const eventEmitter = (sceneManager as any).eventEmitter;
            eventEmitter.emit(GameEvents.SCENE_READY, { test: 'data' });
            eventEmitter.emit(GameEvents.SCENE_READY, { test: 'data2' });
            
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith({ test: 'data' });
        });
    });
});