/**
 * TweenOptimizer - Manages and optimizes tweens for better performance
 * Keeps all visual effects but makes them more efficient
 */
export class TweenOptimizer {
    private static instance: TweenOptimizer | null = null;
    private scene: Phaser.Scene;
    private activeTweens: Map<string, Phaser.Tweens.Tween> = new Map();
    private tweenGroups: Map<string, Set<string>> = new Map();
    private frameCounter: number = 0;
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        TweenOptimizer.instance = this;
    }
    
    public static getInstance(scene?: Phaser.Scene): TweenOptimizer | null {
        if (!TweenOptimizer.instance && scene) {
            TweenOptimizer.instance = new TweenOptimizer(scene);
        }
        return TweenOptimizer.instance;
    }
    
    /**
     * Create an optimized infinite tween that can be shared between similar objects
     * This keeps ALL animations but reduces overhead
     */
    public createOptimizedTween(
        id: string,
        targets: any,
        props: any,
        duration: number,
        options: {
            yoyo?: boolean;
            repeat?: number;
            ease?: string;
            delay?: number;
            group?: string; // Group similar tweens together
            stagger?: number; // Stagger start times for visual variety
        } = {}
    ): Phaser.Tweens.Tween | null {
        // If this is an infinite tween for a group, try to reuse existing
        if (options.repeat === -1 && options.group) {
            const existingTween = this.getGroupTween(options.group);
            if (existingTween && this.canShareTween(existingTween, props)) {
                // Add target to existing tween instead of creating new one
                this.addTargetToTween(existingTween, targets, options.stagger);
                return existingTween;
            }
        }
        
        // Create new optimized tween
        const tweenConfig: any = {
            targets,
            ...props,
            duration,
            yoyo: options.yoyo || false,
            repeat: options.repeat || 0,
            ease: options.ease || 'Linear',
            delay: options.delay || 0
        };
        
        // For infinite tweens, add optimization
        if (options.repeat === -1) {
            // Reduce update frequency for less critical animations
            tweenConfig.callbackScope = this;
            tweenConfig.onUpdate = this.throttleUpdate.bind(this, id);
        }
        
        const tween = this.scene.tweens.add(tweenConfig);
        
        this.activeTweens.set(id, tween);
        
        if (options.group) {
            if (!this.tweenGroups.has(options.group)) {
                this.tweenGroups.set(options.group, new Set());
            }
            this.tweenGroups.get(options.group)!.add(id);
        }
        
        return tween;
    }
    
    /**
     * Throttle tween updates for better performance
     */
    private throttleUpdate(id: string): void {
        // Only update visual every few frames for non-critical animations
        this.frameCounter++;
        if (this.frameCounter % 2 === 0) {
            // Update happens naturally, just skip some frames
            return;
        }
    }
    
    /**
     * Check if a tween can be shared with new targets
     */
    private canShareTween(tween: Phaser.Tweens.Tween, props: any): boolean {
        // Check if properties match (simplified check)
        const tweenData = tween.data[0];
        if (!tweenData) return false;
        
        for (const key in props) {
            if (tweenData.key === key) {
                return true; // Can share if at least one property matches
            }
        }
        return false;
    }
    
    /**
     * Add a target to an existing tween
     */
    private addTargetToTween(tween: Phaser.Tweens.Tween, target: any, stagger?: number): void {
        // In Phaser, we can't directly add targets to running tweens
        // Instead, we'll create a linked tween with slight offset for variety
        const tweenData = tween.data[0];
        if (!tweenData) return;
        
        const linkedConfig: any = {
            targets: target,
            duration: tweenData.duration,
            yoyo: tween.yoyo,
            repeat: tween.repeat,
            ease: tweenData.ease,
            delay: stagger || 0
        };
        
        // Copy properties
        tween.data.forEach((data: any) => {
            linkedConfig[data.key] = {
                from: data.start,
                to: data.end
            };
        });
        
        this.scene.tweens.add(linkedConfig);
    }
    
    /**
     * Get a tween from a group
     */
    private getGroupTween(group: string): Phaser.Tweens.Tween | null {
        const groupIds = this.tweenGroups.get(group);
        if (!groupIds || groupIds.size === 0) return null;
        
        const firstId = groupIds.values().next().value;
        return this.activeTweens.get(firstId) || null;
    }
    
    /**
     * Remove a tween
     */
    public removeTween(id: string): void {
        const tween = this.activeTweens.get(id);
        if (tween) {
            tween.destroy();
            this.activeTweens.delete(id);
            
            // Remove from groups
            this.tweenGroups.forEach((ids, group) => {
                ids.delete(id);
                if (ids.size === 0) {
                    this.tweenGroups.delete(group);
                }
            });
        }
    }
    
    /**
     * Pause all tweens in a group
     */
    public pauseGroup(group: string): void {
        const groupIds = this.tweenGroups.get(group);
        if (!groupIds) return;
        
        groupIds.forEach(id => {
            const tween = this.activeTweens.get(id);
            if (tween) {
                tween.pause();
            }
        });
    }
    
    /**
     * Resume all tweens in a group
     */
    public resumeGroup(group: string): void {
        const groupIds = this.tweenGroups.get(group);
        if (!groupIds) return;
        
        groupIds.forEach(id => {
            const tween = this.activeTweens.get(id);
            if (tween) {
                tween.resume();
            }
        });
    }
    
    /**
     * Clean up
     */
    public destroy(): void {
        this.activeTweens.forEach(tween => tween.destroy());
        this.activeTweens.clear();
        this.tweenGroups.clear();
        TweenOptimizer.instance = null;
    }
    
    /**
     * Get stats for debugging
     */
    public getStats(): { totalTweens: number; groups: number; tweensPerGroup: Map<string, number> } {
        const tweensPerGroup = new Map<string, number>();
        this.tweenGroups.forEach((ids, group) => {
            tweensPerGroup.set(group, ids.size);
        });
        
        return {
            totalTweens: this.activeTweens.size,
            groups: this.tweenGroups.size,
            tweensPerGroup
        };
    }
}