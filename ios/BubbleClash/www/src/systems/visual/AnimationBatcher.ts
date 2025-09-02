/**
 * AnimationBatcher - Optimizes multiple animations by batching updates
 * Maintains all visual effects while improving performance
 */
export class AnimationBatcher {
    private scene: Phaser.Scene;
    private animations: Map<string, AnimationData> = new Map();
    private frameCounter: number = 0;
    private isActive: boolean = true;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Register an animation to be batched
     * ALL animations are preserved, just optimized
     */
    public addAnimation(
        id: string,
        targets: any,
        properties: any,
        duration: number,
        options: {
            yoyo?: boolean;
            repeat?: number;
            ease?: string;
            delay?: number;
            updateFrequency?: number; // How often to update (1 = every frame, 2 = every 2 frames, etc.)
        } = {}
    ): void {
        const animData: AnimationData = {
            targets,
            properties,
            duration,
            elapsed: 0,
            yoyo: options.yoyo || false,
            repeat: options.repeat || 0,
            ease: options.ease || 'Linear',
            delay: options.delay || 0,
            updateFrequency: options.updateFrequency || 1,
            currentRepeat: 0,
            direction: 1,
            startValues: {},
            active: true
        };

        // Store start values
        if (Array.isArray(targets)) {
            animData.startValues = targets.map(target => this.getPropertyValues(target, properties));
        } else {
            animData.startValues = this.getPropertyValues(targets, properties);
        }

        this.animations.set(id, animData);
    }

    /**
     * Batch update all animations - called once per frame
     * This replaces multiple individual tween updates with a single optimized loop
     */
    public update(delta: number): void {
        if (!this.isActive) return;

        this.frameCounter++;

        this.animations.forEach((anim, id) => {
            if (!anim.active) return;

            // Only update based on frequency setting
            if (this.frameCounter % anim.updateFrequency !== 0) return;

            // Handle delay
            if (anim.delay > 0) {
                anim.delay -= delta;
                return;
            }

            anim.elapsed += delta * anim.direction;

            // Calculate progress
            let progress = Math.min(anim.elapsed / anim.duration, 1);
            if (progress < 0) progress = 0;

            // Apply easing
            const easedProgress = this.applyEasing(progress, anim.ease);

            // Update properties
            this.updateTargetProperties(anim, easedProgress);

            // Handle completion
            if (progress >= 1 || progress <= 0) {
                if (anim.yoyo && anim.direction === 1) {
                    anim.direction = -1;
                } else if (anim.yoyo && anim.direction === -1) {
                    anim.direction = 1;
                    anim.currentRepeat++;
                } else {
                    anim.currentRepeat++;
                }

                if (anim.repeat === -1 || anim.currentRepeat < anim.repeat) {
                    anim.elapsed = anim.direction === 1 ? 0 : anim.duration;
                } else {
                    anim.active = false;
                    this.animations.delete(id);
                }
            }
        });
    }

    private getPropertyValues(target: any, properties: any): any {
        const values: any = {};
        for (const key in properties) {
            if (typeof properties[key] === 'object' && 'from' in properties[key]) {
                values[key] = properties[key].from;
                target[key] = properties[key].from;
            } else {
                values[key] = target[key];
            }
        }
        return values;
    }

    private updateTargetProperties(anim: AnimationData, progress: number): void {
        const updateTarget = (target: any, startVals: any) => {
            for (const key in anim.properties) {
                const prop = anim.properties[key];
                if (typeof prop === 'object' && 'from' in prop && 'to' in prop) {
                    const from = prop.from;
                    const to = prop.to;
                    target[key] = from + (to - from) * progress;
                } else if (typeof prop === 'number') {
                    const from = startVals[key];
                    const to = prop;
                    target[key] = from + (to - from) * progress;
                }
            }
        };

        if (Array.isArray(anim.targets)) {
            anim.targets.forEach((target, i) => {
                updateTarget(target, anim.startValues[i]);
            });
        } else {
            updateTarget(anim.targets, anim.startValues);
        }
    }

    private applyEasing(t: number, ease: string): number {
        // Simple easing functions
        switch (ease) {
            case 'Sine.easeInOut':
                return 0.5 * (1 - Math.cos(Math.PI * t));
            case 'Quad.easeInOut':
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            case 'Quad.easeOut':
                return 1 - (1 - t) * (1 - t);
            case 'Back.easeOut':
                const c1 = 1.70158;
                const c3 = c1 + 1;
                return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            default:
                return t; // Linear
        }
    }

    public pause(): void {
        this.isActive = false;
    }

    public resume(): void {
        this.isActive = true;
    }

    public destroy(): void {
        this.animations.clear();
        this.isActive = false;
    }
}

interface AnimationData {
    targets: any;
    properties: any;
    duration: number;
    elapsed: number;
    yoyo: boolean;
    repeat: number;
    ease: string;
    delay: number;
    updateFrequency: number;
    currentRepeat: number;
    direction: number;
    startValues: any;
    active: boolean;
}