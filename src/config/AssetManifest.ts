import { IAssetManifest, IAssetManifestItem } from '@/types/GameTypes';

export const ASSET_KEYS = {
    IMAGES: {
        LOGO: 'logo',
        BUBBLE: 'bubble',
        BACKGROUND: 'background',
        BUTTON: 'button',
        PARTICLE: 'particle',
        PLANET: 'planet',
        BUBBLE_PLANET: 'bubble_planet',
        UFO: 'ufo',
        SPACE_OBJECTIVE: 'space_objective',
        OCEAN_DEPTHS_BG: 'ocean_depths_bg',
        OCEAN_DEPTHS_VORTEX: 'ocean_depths_vortex',
        // Space bubble sprites
        SPACE_BUBBLE_RED: 'space_bubble_red',
        SPACE_BUBBLE_BLUE: 'space_bubble_blue',
        SPACE_BUBBLE_GREEN: 'space_bubble_green',
        SPACE_BUBBLE_YELLOW: 'space_bubble_yellow',
        SPACE_BUBBLE_PURPLE: 'space_bubble_purple'
    },
    AUDIO: {
        BUBBLE_SHOOT: 'bubble-shoot',
        BUBBLE_ATTACH: 'bubble-attach',
        BUBBLES_DROP: 'bubbles-drop',
        COMBO_3: 'combo-3',
        COMBO_4: 'combo-4',
        COMBO_5_PLUS: 'combo-5-plus',
        COMBO_CELEBRATION: 'combo-celebration',
        ARSENAL_PICKUP: 'arsenal-pickup',
        SUCCESS_OBJECTIVE: 'success-objective',
        VICTORY: 'victory',
        UFO_SOUND: 'ufo-sound',
        UFO_ARRIVES: 'ufo-arrives',
        CHEST_ARRIVAL: 'chest-arrival',
        SHINE: 'shine',
        DEFEAT: 'defeat',
        BACKGROUND_MUSIC: 'background-music'
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
            },
            {
                key: ASSET_KEYS.IMAGES.PLANET,
                url: 'assets/sprites/planeta.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.UFO,
                url: 'assets/sprites/ufo.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.SPACE_OBJECTIVE,
                url: 'assets/sprites/space_objective.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.OCEAN_DEPTHS_BG,
                url: 'assets/backgrounds/ocean_depths.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.OCEAN_DEPTHS_VORTEX,
                url: 'assets/backgrounds/ocean_depths_vortex.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.BUBBLE_PLANET,
                url: 'assets/sprites/bubble_planet.png',
                type: 'image',
                data: {}
            },
            // Space bubble sprites
            {
                key: ASSET_KEYS.IMAGES.SPACE_BUBBLE_RED,
                url: 'assets/sprites/space-red-bubble-57.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.SPACE_BUBBLE_BLUE,
                url: 'assets/sprites/space-blue-bubble-57.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.SPACE_BUBBLE_GREEN,
                url: 'assets/sprites/space-green-bubble-57.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.SPACE_BUBBLE_YELLOW,
                url: 'assets/sprites/space-yellow-bubble-57.png',
                type: 'image',
                data: {}
            },
            {
                key: ASSET_KEYS.IMAGES.SPACE_BUBBLE_PURPLE,
                url: 'assets/sprites/space-purple-bubble-57.png',
                type: 'image',
                data: {}
            }
        ],
        audio: [
            {
                key: ASSET_KEYS.AUDIO.BUBBLE_SHOOT,
                url: 'assets/sounds/bubble-shoot.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.BUBBLE_ATTACH,
                url: 'assets/sounds/bubbles-attach.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.BUBBLES_DROP,
                url: 'assets/sounds/bubbles-drop.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.COMBO_3,
                url: 'assets/sounds/combo-3.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.COMBO_4,
                url: 'assets/sounds/combo-4.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.COMBO_5_PLUS,
                url: 'assets/sounds/combo-5-plus.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.COMBO_CELEBRATION,
                url: 'assets/sounds/combo-celebration.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.ARSENAL_PICKUP,
                url: 'assets/sounds/arsenal-pickup.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.SUCCESS_OBJECTIVE,
                url: 'assets/sounds/success-objective.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.VICTORY,
                url: 'assets/sounds/victory.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.UFO_SOUND,
                url: 'assets/audio/ufo-sound.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.UFO_ARRIVES,
                url: 'assets/audio/ufo-arrives.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.CHEST_ARRIVAL,
                url: 'assets/audio/chest-arrival.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.SHINE,
                url: 'assets/audio/shine.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.DEFEAT,
                url: 'assets/sounds/defeat.mp3',
                type: 'audio',
                data: {}
            },
            {
                key: ASSET_KEYS.AUDIO.BACKGROUND_MUSIC,
                url: 'assets/sounds/background-music.mp3',
                type: 'audio',
                data: {}
            }
        ],
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