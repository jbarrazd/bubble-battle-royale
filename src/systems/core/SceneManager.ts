import { Scene } from 'phaser';
import { GameEvents, ISceneData } from '@/types/GameTypes';

export class SceneManager {
    private static instance: SceneManager;
    private game: Phaser.Game;
    private currentScene: string = '';
    private previousScene: string = '';
    private transitionInProgress: boolean = false;
    private eventEmitter: Phaser.Events.EventEmitter;

    private constructor(game: Phaser.Game) {
        this.game = game;
        this.eventEmitter = new Phaser.Events.EventEmitter();
    }

    public static getInstance(game?: Phaser.Game): SceneManager {
        if (!SceneManager.instance) {
            if (!game) {
                throw new Error('SceneManager must be initialized with a game instance');
            }
            SceneManager.instance = new SceneManager(game);
        }
        return SceneManager.instance;
    }

    public transitionTo(sceneName: string, data?: ISceneData): void {
        if (this.transitionInProgress) {
            console.warn('Scene transition already in progress');
            return;
        }

        if (!this.game.scene.getScene(sceneName)) {
            console.error(`Scene "${sceneName}" not found`);
            return;
        }

        console.log(`SceneManager: Starting transition from ${this.currentScene} to ${sceneName}`);
        this.transitionInProgress = true;
        this.previousScene = this.currentScene;
        
        const currentSceneInstance = this.game.scene.getScene(this.currentScene);
        
        if (currentSceneInstance && currentSceneInstance.scene.isActive()) {
            this.fadeOutScene(currentSceneInstance as Scene, () => {
                this.switchScene(sceneName, data);
            });
        } else {
            this.switchScene(sceneName, data);
        }
    }

    private fadeOutScene(scene: Scene, callback: () => void): void {
        const duration = 300;
        
        if (scene.cameras && scene.cameras.main) {
            scene.cameras.main.fadeOut(duration, 0, 0, 0);
            scene.cameras.main.once('camerafadeoutcomplete', callback);
        } else {
            callback();
        }
    }

    private switchScene(sceneName: string, data?: ISceneData): void {
        console.log(`SceneManager: Switching from ${this.currentScene} to ${sceneName}`);
        
        if (this.currentScene && this.currentScene !== '') {
            console.log(`SceneManager: Stopping scene ${this.currentScene}`);
            // First stop the scene
            this.game.scene.stop(this.currentScene);
        }

        const sceneData = {
            ...data,
            transitionFrom: this.previousScene
        };

        console.log(`SceneManager: Starting ${sceneName}`);
        this.game.scene.start(sceneName, sceneData);
        
        // Ensure new scene is on top
        this.game.scene.bringToTop(sceneName);
        
        this.currentScene = sceneName;
        
        const newScene = this.game.scene.getScene(sceneName) as Scene;
        if (newScene && newScene.cameras && newScene.cameras.main) {
            newScene.cameras.main.fadeIn(300, 0, 0, 0);
            newScene.cameras.main.once('camerafadeincomplete', () => {
                console.log(`SceneManager: Transition to ${sceneName} complete`);
                this.transitionInProgress = false;
                this.eventEmitter.emit(GameEvents.SCENE_READY, {
                    scene: sceneName,
                    previousScene: this.previousScene
                });
            });
        } else {
            console.log(`SceneManager: Transition to ${sceneName} complete (no fade)`);
            this.transitionInProgress = false;
            this.eventEmitter.emit(GameEvents.SCENE_READY, {
                scene: sceneName,
                previousScene: this.previousScene
            });
        }
    }

    public getCurrentScene(): string {
        return this.currentScene;
    }

    public getPreviousScene(): string {
        return this.previousScene;
    }

    public isTransitioning(): boolean {
        return this.transitionInProgress;
    }

    public restartCurrentScene(data?: ISceneData): void {
        if (this.currentScene) {
            const scene = this.game.scene.getScene(this.currentScene);
            if (scene) {
                this.game.scene.stop(this.currentScene);
                this.game.scene.start(this.currentScene, data);
            }
        }
    }

    public pauseCurrentScene(): void {
        if (this.currentScene) {
            this.game.scene.pause(this.currentScene);
        }
    }

    public resumeCurrentScene(): void {
        if (this.currentScene) {
            this.game.scene.resume(this.currentScene);
        }
    }

    public launchParallelScene(sceneName: string, data?: ISceneData): void {
        if (!this.game.scene.getScene(sceneName)) {
            console.error(`Scene "${sceneName}" not found`);
            return;
        }

        this.game.scene.run(sceneName, data);
    }

    public stopParallelScene(sceneName: string): void {
        if (this.game.scene.isActive(sceneName)) {
            this.game.scene.stop(sceneName);
        }
    }

    public on(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.on(event, callback);
    }

    public off(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.off(event, callback);
    }

    public once(event: string, callback: (...args: any[]) => void): void {
        this.eventEmitter.once(event, callback);
    }

    public setCurrentScene(sceneName: string): void {
        this.currentScene = sceneName;
    }
}