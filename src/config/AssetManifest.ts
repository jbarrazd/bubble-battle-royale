import { IAssetManifest, IAssetManifestItem } from '@/types/GameTypes';

export const ASSET_KEYS = {
    IMAGES: {
        LOGO: 'logo',
        BUBBLE: 'bubble',
        BACKGROUND: 'background',
        BUTTON: 'button',
        PARTICLE: 'particle'
    },
    AUDIO: {
        BUBBLE_POP: 'bubble_pop',
        COMBO: 'combo',
        VICTORY: 'victory',
        DEFEAT: 'defeat',
        MENU_MUSIC: 'menu_music',
        GAME_MUSIC: 'game_music'
    },
    ATLASES: {
        UI: 'ui_atlas',
        BUBBLES: 'bubbles_atlas',
        EFFECTS: 'effects_atlas'
    },
    JSON: {
        LEVELS: 'levels',
        PARTICLE_CONFIGS: 'particle_configs',
        LOCALIZATION: 'localization'
    }
};

export function createAssetManifest(): IAssetManifest {
    const manifest: IAssetManifest = {
        images: [
            {
                key: ASSET_KEYS.IMAGES.LOGO,
                url: 'assets/images/logo-placeholder.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.BACKGROUND,
                url: 'assets/images/background-placeholder.png',
                type: 'image',
                data: {}
            }
        ],
        audio: [],
        atlases: [],
        json: []
    };

    return manifest;
}

export class AssetLoader {
    private scene: Phaser.Scene;
    private manifest: IAssetManifest;
    private loadedCount: number = 0;
    private totalCount: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.manifest = createAssetManifest();
        this.calculateTotalAssets();
    }

    private calculateTotalAssets(): void {
        this.totalCount = 
            this.manifest.images.length +
            this.manifest.audio.length +
            this.manifest.atlases.length +
            this.manifest.json.length;
    }

    public loadAssets(onProgress?: (progress: number) => void): void {
        if (onProgress) {
            this.scene.load.on('progress', (value: number) => {
                onProgress(value);
            });
        }

        this.scene.load.on('fileprogress', (file: Phaser.Loader.File) => {
            console.log(`Loading: ${file.key}`);
        });

        this.loadImages();
        this.loadAudio();
        this.loadAtlases();
        this.loadJSON();

        this.scene.load.on('complete', () => {
            console.log('All assets loaded');
        });
    }

    private loadImages(): void {
        this.manifest.images.forEach((item: IAssetManifestItem) => {
            if (this.scene.textures.exists(item.key)) {
                console.log(`Image ${item.key} already loaded`);
                return;
            }
            this.scene.load.image(item.key, item.url);
        });
    }

    private loadAudio(): void {
        this.manifest.audio.forEach((item: IAssetManifestItem) => {
            if (this.scene.cache.audio.exists(item.key)) {
                console.log(`Audio ${item.key} already loaded`);
                return;
            }
            this.scene.load.audio(item.key, item.url);
        });
    }

    private loadAtlases(): void {
        this.manifest.atlases.forEach((item: IAssetManifestItem) => {
            if (this.scene.textures.exists(item.key)) {
                console.log(`Atlas ${item.key} already loaded`);
                return;
            }
            const jsonUrl = item.url.replace('.png', '.json');
            this.scene.load.atlas(item.key, item.url, jsonUrl);
        });
    }

    private loadJSON(): void {
        this.manifest.json.forEach((item: IAssetManifestItem) => {
            if (this.scene.cache.json.exists(item.key)) {
                console.log(`JSON ${item.key} already loaded`);
                return;
            }
            this.scene.load.json(item.key, item.url);
        });
    }

    public getProgress(): number {
        return this.loadedCount / Math.max(1, this.totalCount);
    }

    public getTotalAssets(): number {
        return this.totalCount;
    }

    public getLoadedAssets(): number {
        return this.loadedCount;
    }
}