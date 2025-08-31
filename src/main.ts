import Phaser from 'phaser';
import { createGameConfig } from '@config/GameConfig';
import { BootScene } from '@scenes/BootScene';
import { PreloadScene } from '@scenes/PreloadScene';
import { MenuScene } from '@scenes/MenuScene';
import { GameScene } from '@scenes/GameScene';
import { CapacitorOptimizations } from '@utils/capacitorOptimizations';
import { Capacitor } from '@capacitor/core';

class BubbleBattleRoyale {
    private game: Phaser.Game | null = null;

    constructor() {
        this.initialize();
    }

    private async initialize(): Promise<void> {
        console.log('Bubble Battle Royale - Initializing...');
        
        // Apply iOS/Capacitor optimizations
        if (Capacitor.isNativePlatform()) {
            console.log('Running on native platform - applying optimizations');
            const optimizer = CapacitorOptimizations.getInstance();
            await optimizer.initialize();
        }
        
        this.setupErrorHandling();
        this.waitForDOM(() => {
            this.createGame();
            this.hideLoadingScreen();
        });
    }

    private setupErrorHandling(): void {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
    }

    private waitForDOM(callback: () => void): void {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    private createGame(): void {
        console.log('createGame called - preparing scenes');
        const scenes = [
            BootScene,
            PreloadScene,
            MenuScene,
            GameScene
        ];
        console.log('Scenes prepared:', scenes.map(s => s.name));

        const config = createGameConfig(scenes);
        console.log('Game config created:', config);
        
        try {
            console.log('Creating Phaser.Game instance...');
            this.game = new Phaser.Game(config as Phaser.Types.Core.GameConfig);
            console.log('Game created successfully');
            
            this.setupGameEventListeners();
            
        } catch (error) {
            console.error('Failed to create game:', error);
            this.showErrorMessage('Failed to initialize game. Please refresh the page.');
        }
    }

    private setupGameEventListeners(): void {
        if (!this.game) return;

        this.game.events.on('ready', () => {
            console.log('Game is ready');
        });

        this.game.events.on('destroy', () => {
            console.log('Game destroyed');
        });

        window.addEventListener('beforeunload', () => {
            if (this.game) {
                this.game.destroy(true, false);
            }
        });
    }

    private hideLoadingScreen(): void {
        setTimeout(() => {
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.transition = 'opacity 0.5s';
                loadingElement.style.opacity = '0';
                setTimeout(() => {
                    loadingElement.style.display = 'none';
                }, 500);
            }
        }, 1000);
    }

    private showErrorMessage(message: string): void {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div style="color: #e74c3c; font-size: 20px;">${message}</div>
                <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
                    Check the console for more details
                </div>
            `;
        }
    }

    public getGame(): Phaser.Game | null {
        return this.game;
    }
}

console.log('Creating BubbleBattleRoyale instance...');
const app = new BubbleBattleRoyale();
console.log('BubbleBattleRoyale instance created');

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        console.log('HMR: Module updated');
    });
}

export default app;