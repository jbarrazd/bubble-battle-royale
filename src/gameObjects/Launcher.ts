import { ArenaZone } from '@/types/ArenaTypes';
import { Z_LAYERS } from '@/config/ArenaConfig';

export class Launcher extends Phaser.GameObjects.Container {
    private base: Phaser.GameObjects.Rectangle;
    private cannon: Phaser.GameObjects.Rectangle;
    private arrow: Phaser.GameObjects.Triangle;
    private zone: ArenaZone;
    private currentAngle: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, zone: ArenaZone) {
        super(scene, x, y);
        
        this.zone = zone;
        
        // Create launcher base
        this.base = scene.add.rectangle(0, 0, 60, 30, 0x2c3e50);
        this.base.setStrokeStyle(2, 0x34495e);
        
        // Create cannon barrel
        this.cannon = scene.add.rectangle(0, -20, 20, 40, 0x7f8c8d);
        this.cannon.setStrokeStyle(2, 0x95a5a6);
        this.cannon.setOrigin(0.5, 1);
        
        // Create directional arrow
        this.arrow = scene.add.triangle(0, -45, 0, 10, -7, -10, 7, -10, 0xecf0f1);
        this.arrow.setStrokeStyle(1, 0xbdc3c7);
        
        this.add([this.base, this.cannon, this.arrow]);
        
        // Flip if opponent launcher
        if (zone === ArenaZone.OPPONENT) {
            this.setScale(1, -1);
            this.currentAngle = 180;
        }
        
        this.setDepth(Z_LAYERS.LAUNCHERS);
        scene.add.existing(this);
    }

    public setAimAngle(angle: number): void {
        // Convert angle to launcher-relative angle
        // Input angle: 0° = right, 90° = down, 180° = left, 270° = up
        // Launcher angle: -90° = up, 0° = right, 90° = down
        
        if (this.zone === ArenaZone.PLAYER) {
            // For player, convert to -75° to 75° range (15° to 165° constraint)
            // Map 195° to -75° and 345° to 75°
            let launcherAngle = angle - 270; // Center on upward direction
            if (launcherAngle < -180) launcherAngle += 360;
            if (launcherAngle > 180) launcherAngle -= 360;
            
            // Clamp to allowed range
            launcherAngle = Phaser.Math.Clamp(launcherAngle, -75, 75);
            this.currentAngle = launcherAngle;
            
            // Apply rotation
            this.cannon.setRotation(Phaser.Math.DegToRad(launcherAngle));
            this.arrow.setRotation(Phaser.Math.DegToRad(launcherAngle));
        } else {
            // For opponent launcher (not used yet in STORY-003)
            angle = Phaser.Math.Clamp(angle, 120, 240);
            this.currentAngle = angle;
            this.cannon.setRotation(Phaser.Math.DegToRad(angle));
            this.arrow.setRotation(Phaser.Math.DegToRad(angle));
        }
    }

    public getAimAngle(): number {
        return this.currentAngle;
    }

    public getAimDirection(): Phaser.Math.Vector2 {
        const rad = Phaser.Math.DegToRad(this.currentAngle - 90);
        return new Phaser.Math.Vector2(Math.cos(rad), Math.sin(rad));
    }

    public showAiming(show: boolean): void {
        if (show) {
            this.scene.tweens.add({
                targets: [this.cannon, this.arrow],
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 200,
                ease: 'Power2'
            });
        } else {
            this.scene.tweens.add({
                targets: [this.cannon, this.arrow],
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                ease: 'Power2'
            });
        }
    }

    public animateShoot(): void {
        // Recoil animation
        this.scene.tweens.add({
            targets: this.cannon,
            y: -15,
            duration: 50,
            yoyo: true,
            ease: 'Power2'
        });
        
        // Flash effect
        const flash = this.scene.add.circle(
            this.x,
            this.y - 45,
            15,
            0xffffff,
            0.8
        );
        
        this.scene.tweens.add({
            targets: flash,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => flash.destroy()
        });
    }

    public setHighlight(enabled: boolean): void {
        if (enabled) {
            this.base.setFillStyle(0x3498db);
            this.cannon.setFillStyle(0x5dade2);
        } else {
            this.base.setFillStyle(0x2c3e50);
            this.cannon.setFillStyle(0x7f8c8d);
        }
    }
}