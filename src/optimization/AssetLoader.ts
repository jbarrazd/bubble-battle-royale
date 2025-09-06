import { Scene } from 'phaser';

/**
 * Optimized asset loading system with lazy loading
 * Loads assets on-demand to reduce initial load time
 */
export class AssetLoader {
    private scene: Scene;
    private loadQueue: Map<string, LoadRequest> = new Map();
    private loadedAssets: Set<string> = new Set();
    private loadingAssets: Set<string> = new Set();
    private callbacks: Map<string, Array<() => void>> = new Map();
    
    // Loading configuration
    private readonly BATCH_SIZE = 5;
    private readonly TIMEOUT = 10000; // 10 seconds
    
    // Asset priorities
    private priorities: Map<string, number> = new Map();
    
    // Performance metrics
    private metrics = {
        totalLoaded: 0,
        totalSize: 0,
        loadTime: 0,
        cacheHits: 0,
        cacheMisses: 0
    };
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.setupLoadEvents();
    }
    
    /**
     * Setup load event handlers
     */
    private setupLoadEvents(): void {
        this.scene.load.on('complete', () => {
            this.onLoadComplete();
        });
        
        this.scene.load.on('loaderror', (file: any) => {
            console.error('AssetLoader: Failed to load', file.key);
            this.loadingAssets.delete(file.key);
        });
    }
    
    /**
     * Preload critical assets
     */
    public preloadCritical(): Promise<void> {
        return new Promise((resolve) => {
            const criticalAssets: LoadRequest[] = [
                { type: 'image', key: 'bubble', url: 'assets/sprites/bubble.png' },
                { type: 'audio', key: 'pop', url: 'assets/audio/pop.mp3' },
                { type: 'audio', key: 'shoot', url: 'assets/audio/shoot.mp3' }
            ];
            
            // Set high priority for critical assets
            criticalAssets.forEach(asset => {
                this.priorities.set(asset.key, 10);
            });
            
            // Load critical assets immediately
            this.loadBatch(criticalAssets).then(resolve);
        });
    }
    
    /**
     * Load asset on demand
     */
    public async loadAsset(
        type: 'image' | 'audio' | 'json' | 'atlas',
        key: string,
        url: string | string[],
        priority: number = 5
    ): Promise<void> {
        // Check if already loaded
        if (this.loadedAssets.has(key)) {
            this.metrics.cacheHits++;
            return Promise.resolve();
        }
        
        this.metrics.cacheMisses++;
        
        // Check if currently loading
        if (this.loadingAssets.has(key)) {
            return this.waitForAsset(key);
        }
        
        // Add to queue with priority
        this.priorities.set(key, priority);
        this.loadQueue.set(key, { type, key, url, priority });
        
        // Process queue
        return this.processQueue();
    }
    
    /**
     * Load multiple assets
     */
    public async loadAssets(assets: LoadRequest[]): Promise<void> {
        const promises = assets.map(asset => 
            this.loadAsset(asset.type, asset.key, asset.url, asset.priority || 5)
        );
        
        await Promise.all(promises);
    }
    
    /**
     * Process load queue
     */
    private async processQueue(): Promise<void> {
        if (this.loadQueue.size === 0) return;
        
        // Sort by priority
        const sorted = Array.from(this.loadQueue.values())
            .sort((a, b) => (b.priority || 5) - (a.priority || 5));
        
        // Take batch
        const batch = sorted.slice(0, this.BATCH_SIZE);
        
        // Remove from queue
        batch.forEach(item => {
            this.loadQueue.delete(item.key);
            this.loadingAssets.add(item.key);
        });
        
        // Load batch
        await this.loadBatch(batch);
    }
    
    /**
     * Load a batch of assets
     */
    private loadBatch(batch: LoadRequest[]): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // Add timeout
            const timeout = setTimeout(() => {
                reject(new Error('Load timeout'));
            }, this.TIMEOUT);
            
            // Setup completion handler
            const completeHandler = () => {
                clearTimeout(timeout);
                this.scene.load.off('complete', completeHandler);
                
                // Update metrics
                this.metrics.loadTime += Date.now() - startTime;
                this.metrics.totalLoaded += batch.length;
                
                // Mark as loaded
                batch.forEach(item => {
                    this.loadedAssets.add(item.key);
                    this.loadingAssets.delete(item.key);
                    
                    // Trigger callbacks
                    this.triggerCallbacks(item.key);
                });
                
                resolve();
                
                // Process remaining queue
                if (this.loadQueue.size > 0) {
                    this.processQueue();
                }
            };
            
            this.scene.load.once('complete', completeHandler);
            
            // Start loading
            batch.forEach(item => {
                switch (item.type) {
                    case 'image':
                        this.scene.load.image(item.key, item.url as string);
                        break;
                    case 'audio':
                        this.scene.load.audio(item.key, item.url);
                        break;
                    case 'json':
                        this.scene.load.json(item.key, item.url as string);
                        break;
                    case 'atlas':
                        const urls = item.url as string[];
                        this.scene.load.atlas(item.key, urls[0], urls[1]);
                        break;
                }
            });
            
            this.scene.load.start();
        });
    }
    
    /**
     * Wait for asset to load
     */
    private waitForAsset(key: string): Promise<void> {
        return new Promise((resolve) => {
            if (!this.callbacks.has(key)) {
                this.callbacks.set(key, []);
            }
            
            this.callbacks.get(key)!.push(resolve);
        });
    }
    
    /**
     * Trigger callbacks for loaded asset
     */
    private triggerCallbacks(key: string): void {
        const callbacks = this.callbacks.get(key);
        if (callbacks) {
            callbacks.forEach(callback => callback());
            this.callbacks.delete(key);
        }
    }
    
    /**
     * Handle load completion
     */
    private onLoadComplete(): void {
        // Process any remaining queue items
        if (this.loadQueue.size > 0) {
            this.processQueue();
        }
    }
    
    /**
     * Preload assets based on game state
     */
    public async preloadForState(state: string): Promise<void> {
        let assets: LoadRequest[] = [];
        
        switch (state) {
            case 'menu':
                assets = [
                    { type: 'image', key: 'menu_bg', url: 'assets/ui/menu_bg.png', priority: 8 },
                    { type: 'audio', key: 'menu_music', url: 'assets/audio/menu_music.mp3', priority: 7 }
                ];
                break;
                
            case 'game':
                assets = [
                    { type: 'image', key: 'game_bg', url: 'assets/backgrounds/game_bg.png', priority: 9 },
                    { type: 'atlas', key: 'bubbles', url: ['assets/sprites/bubbles.png', 'assets/sprites/bubbles.json'], priority: 10 },
                    { type: 'audio', key: 'game_music', url: 'assets/audio/game_music.mp3', priority: 6 }
                ];
                break;
                
            case 'victory':
                assets = [
                    { type: 'image', key: 'victory_bg', url: 'assets/ui/victory_bg.png', priority: 5 },
                    { type: 'audio', key: 'victory_sound', url: 'assets/audio/victory.mp3', priority: 8 }
                ];
                break;
        }
        
        await this.loadAssets(assets);
    }
    
    /**
     * Unload unused assets
     */
    public unloadUnused(keepKeys: string[] = []): void {
        const keepSet = new Set(keepKeys);
        let unloaded = 0;
        
        // Check all loaded textures
        this.loadedAssets.forEach(key => {
            if (!keepSet.has(key)) {
                // Remove texture
                if (this.scene.textures.exists(key)) {
                    this.scene.textures.remove(key);
                }
                
                // Remove audio
                if (this.scene.cache.audio.exists(key)) {
                    this.scene.cache.audio.remove(key);
                }
                
                // Remove from loaded set
                this.loadedAssets.delete(key);
                unloaded++;
            }
        });
        
        if (unloaded > 0) {
            console.log(`AssetLoader: Unloaded ${unloaded} unused assets`);
        }
    }
    
    /**
     * Get loading progress
     */
    public getProgress(): number {
        const total = this.loadQueue.size + this.loadingAssets.size + this.loadedAssets.size;
        if (total === 0) return 100;
        
        return (this.loadedAssets.size / total) * 100;
    }
    
    /**
     * Get loader statistics
     */
    public getStats(): any {
        return {
            ...this.metrics,
            queueSize: this.loadQueue.size,
            loadedCount: this.loadedAssets.size,
            loadingCount: this.loadingAssets.size,
            cacheHitRate: this.metrics.cacheHits > 0 
                ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
                : 0
        };
    }
    
    /**
     * Clear all loaded assets
     */
    public clearAll(): void {
        this.loadedAssets.clear();
        this.loadingAssets.clear();
        this.loadQueue.clear();
        this.callbacks.clear();
        this.priorities.clear();
    }
    
    /**
     * Destroy the loader
     */
    public destroy(): void {
        this.clearAll();
    }
}

// Types
interface LoadRequest {
    type: 'image' | 'audio' | 'json' | 'atlas';
    key: string;
    url: string | string[];
    priority?: number;
}

// Singleton instance
let loaderInstance: AssetLoader | null = null;

export function getAssetLoader(scene?: Scene): AssetLoader {
    if (!loaderInstance && scene) {
        loaderInstance = new AssetLoader(scene);
    }
    
    if (!loaderInstance) {
        throw new Error('AssetLoader not initialized. Provide a scene on first call.');
    }
    
    return loaderInstance;
}

export function resetAssetLoader(): void {
    if (loaderInstance) {
        loaderInstance.destroy();
        loaderInstance = null;
    }
}