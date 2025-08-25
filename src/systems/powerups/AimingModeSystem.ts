import { Scene } from 'phaser';
import { PowerUpType } from './PowerUpManager';
import { Z_LAYERS } from '@/config/ArenaConfig';

export enum AimingMode {
    NORMAL = 'crosshair',
    RAINBOW = 'rainbow_sphere',
    LASER = 'extended_line',
    BOMB_NORMAL = 'explosion_radius',
    BOMB_BALLISTIC = 'ballistic_arc',
    LIGHTNING = 'selection_cursor',
    FREEZE = 'snowflake_area',
    MULTI = 'triple_arrow'
}

export interface TargetingInfo {
    mode: AimingMode;
    position: { x: number; y: number };
    angle?: number;
    radius?: number;
    trajectory?: Phaser.Geom.Point[];
}

/**
 * Manages different aiming modes for power-ups
 */
export class AimingModeSystem {
    private scene: Scene;
    private currentMode: AimingMode = AimingMode.NORMAL;
    private aimingGraphics: Phaser.GameObjects.Graphics;
    private trajectoryLine?: Phaser.GameObjects.Graphics;
    private cursorSprite?: Phaser.GameObjects.Image;
    private modeIndicator?: Phaser.GameObjects.Container;
    private activePowerUp?: PowerUpType;
    
    // Trajectory calculation
    private trajectoryPoints: Phaser.Geom.Point[] = [];
    private readonly MAX_BOUNCES = 3;
    private readonly TRAJECTORY_STEPS = 50;
    
    constructor(scene: Scene) {
        this.scene = scene;
        
        // Create graphics layers but keep them hidden by default
        this.aimingGraphics = scene.add.graphics();
        this.aimingGraphics.setDepth(Z_LAYERS.UI);
        this.aimingGraphics.setVisible(false); // Hidden by default
        
        this.trajectoryLine = scene.add.graphics();
        this.trajectoryLine.setDepth(Z_LAYERS.UI - 1);
        this.trajectoryLine.setVisible(false); // Hidden by default
    }
    
    /**
     * Set the aiming mode based on power-up type
     */
    public setMode(mode: AimingMode, powerUp?: PowerUpType): void {
        this.currentMode = mode;
        this.activePowerUp = powerUp;
        
        // Clear previous graphics
        this.clearGraphics();
        
        // Show/hide graphics based on mode
        if (mode !== AimingMode.NORMAL) {
            this.aimingGraphics.setVisible(true);
            this.trajectoryLine?.setVisible(true);
        } else {
            this.aimingGraphics.setVisible(false);
            this.trajectoryLine?.setVisible(false);
        }
        
        // Create mode-specific indicator
        this.createModeIndicator();
        
        // Update cursor style
        this.updateCursorStyle();
    }
    
    /**
     * Update aiming graphics based on pointer position
     */
    public updateAiming(pointerX: number, pointerY: number, launcherX: number, launcherY: number): void {
        this.clearGraphics();
        
        switch (this.currentMode) {
            case AimingMode.NORMAL:
                this.drawNormalCrosshair(pointerX, pointerY);
                this.drawBasicTrajectory(launcherX, launcherY, pointerX, pointerY);
                break;
                
            case AimingMode.RAINBOW:
                this.drawRainbowCrosshair(pointerX, pointerY);
                this.drawBasicTrajectory(launcherX, launcherY, pointerX, pointerY);
                break;
                
            case AimingMode.LASER:
                this.drawLaserSight(launcherX, launcherY, pointerX, pointerY);
                break;
                
            case AimingMode.BOMB_NORMAL:
                this.drawBombRadius(pointerX, pointerY);
                this.drawBasicTrajectory(launcherX, launcherY, pointerX, pointerY);
                break;
                
            case AimingMode.BOMB_BALLISTIC:
                this.drawBallisticArc(launcherX, launcherY, pointerX, pointerY);
                break;
                
            case AimingMode.LIGHTNING:
                this.drawSelectionCursor(pointerX, pointerY);
                break;
                
            case AimingMode.FREEZE:
                this.drawFreezeArea(pointerX, pointerY);
                break;
                
            case AimingMode.MULTI:
                this.drawTripleArrow(launcherX, launcherY, pointerX, pointerY);
                break;
        }
    }
    
    private drawNormalCrosshair(x: number, y: number): void {
        this.aimingGraphics.lineStyle(2, 0xFFFFFF, 0.8);
        
        // Draw crosshair
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x - 10, y);
        this.aimingGraphics.lineTo(x + 10, y);
        this.aimingGraphics.moveTo(x, y - 10);
        this.aimingGraphics.lineTo(x, y + 10);
        this.aimingGraphics.strokePath();
        
        // Draw circle
        this.aimingGraphics.strokeCircle(x, y, 15);
    }
    
    private drawRainbowCrosshair(x: number, y: number): void {
        // Draw rainbow-colored crosshair
        const colors = [0xFF0000, 0xFFFF00, 0x00FF00, 0x00FFFF, 0x0000FF, 0xFF00FF];
        const segments = 6;
        
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const nextAngle = ((i + 1) / segments) * Math.PI * 2;
            
            this.aimingGraphics.lineStyle(3, colors[i], 0.8);
            this.aimingGraphics.beginPath();
            this.aimingGraphics.arc(x, y, 20, angle, nextAngle);
            this.aimingGraphics.strokePath();
        }
        
        // Center dot
        this.aimingGraphics.fillStyle(0xFFFFFF, 1);
        this.aimingGraphics.fillCircle(x, y, 3);
    }
    
    private drawLaserSight(launcherX: number, launcherY: number, targetX: number, targetY: number): void {
        // Calculate extended trajectory with bounces
        this.calculateTrajectory(launcherX, launcherY, targetX, targetY, true);
        
        // Draw extended laser line
        this.trajectoryLine!.lineStyle(3, 0xFF0000, 1);
        this.trajectoryLine!.lineBetween(
            this.trajectoryPoints[0].x,
            this.trajectoryPoints[0].y,
            this.trajectoryPoints[0].x,
            this.trajectoryPoints[0].y
        );
        
        // Animated laser effect
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < this.trajectoryPoints.length - 1; i++) {
            const alpha = 1 - (i / this.trajectoryPoints.length) * 0.5;
            const width = 3 - (i / this.trajectoryPoints.length) * 2;
            
            // Pulsing effect
            const pulse = Math.sin(time * 3 + i * 0.2) * 0.3 + 0.7;
            
            this.trajectoryLine!.lineStyle(width, 0xFF0000, alpha * pulse);
            this.trajectoryLine!.lineBetween(
                this.trajectoryPoints[i].x,
                this.trajectoryPoints[i].y,
                this.trajectoryPoints[i + 1].x,
                this.trajectoryPoints[i + 1].y
            );
        }
        
        // Draw laser dot at end
        const lastPoint = this.trajectoryPoints[this.trajectoryPoints.length - 1];
        this.aimingGraphics.fillStyle(0xFF0000, 1);
        this.aimingGraphics.fillCircle(lastPoint.x, lastPoint.y, 5);
    }
    
    private drawBombRadius(x: number, y: number): void {
        // Draw explosion radius preview
        const radius = 100; // 7-bubble radius approximation
        
        // Outer ring
        this.aimingGraphics.lineStyle(2, 0xFF4500, 0.3);
        this.aimingGraphics.fillStyle(0xFF4500, 0.1);
        this.aimingGraphics.fillCircle(x, y, radius);
        this.aimingGraphics.strokeCircle(x, y, radius);
        
        // Inner rings for impact visualization
        this.aimingGraphics.lineStyle(1, 0xFF6347, 0.5);
        this.aimingGraphics.strokeCircle(x, y, radius * 0.66);
        this.aimingGraphics.strokeCircle(x, y, radius * 0.33);
        
        // Center explosion point
        this.aimingGraphics.fillStyle(0xFF0000, 1);
        this.aimingGraphics.fillCircle(x, y, 5);
        
        // Draw bomb icon
        const bomb = '💣';
        if (!this.cursorSprite) {
            const text = this.scene.add.text(x, y - radius - 20, bomb, {
                fontSize: '24px'
            });
            text.setOrigin(0.5);
            text.setDepth(Z_LAYERS.UI + 1);
            
            // Clean up after frame
            this.scene.time.delayedCall(50, () => text.destroy());
        }
    }
    
    private drawBallisticArc(launcherX: number, launcherY: number, targetX: number, targetY: number): void {
        // Calculate parabolic trajectory to castle
        const points: Phaser.Geom.Point[] = [];
        const steps = 30;
        const maxHeight = Math.min(launcherY, targetY) - 100; // Peak height
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            
            // Parabolic interpolation
            const x = Phaser.Math.Linear(launcherX, targetX, t);
            const baseY = Phaser.Math.Linear(launcherY, targetY, t);
            
            // Add parabolic arc
            const arc = Math.sin(t * Math.PI) * (launcherY - maxHeight);
            const y = baseY - arc;
            
            points.push(new Phaser.Geom.Point(x, y));
        }
        
        // Draw ballistic path
        this.trajectoryLine!.lineStyle(3, 0xFF0000, 0.5);
        
        for (let i = 0; i < points.length - 1; i++) {
            const alpha = 0.5 + (i / points.length) * 0.5;
            this.trajectoryLine!.lineStyle(2, 0xFF4500, alpha);
            this.trajectoryLine!.lineBetween(
                points[i].x, points[i].y,
                points[i + 1].x, points[i + 1].y
            );
        }
        
        // Draw impact zone at target
        this.aimingGraphics.fillStyle(0xFF0000, 0.3);
        this.aimingGraphics.fillCircle(targetX, targetY, 30);
        
        // Draw castle target indicator
        this.aimingGraphics.lineStyle(3, 0xFF0000, 1);
        this.aimingGraphics.strokeCircle(targetX, targetY, 30);
    }
    
    private drawSelectionCursor(x: number, y: number): void {
        // Draw selection cursor for lightning
        const size = 20;
        
        // Animated rotation
        const angle = Date.now() * 0.002;
        
        // Draw rotating brackets
        this.aimingGraphics.lineStyle(3, 0xFFFF00, 1);
        
        // Top-left bracket
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x - size, y - size + 5);
        this.aimingGraphics.lineTo(x - size, y - size);
        this.aimingGraphics.lineTo(x - size + 5, y - size);
        this.aimingGraphics.strokePath();
        
        // Top-right bracket
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x + size - 5, y - size);
        this.aimingGraphics.lineTo(x + size, y - size);
        this.aimingGraphics.lineTo(x + size, y - size + 5);
        this.aimingGraphics.strokePath();
        
        // Bottom-left bracket
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x - size, y + size - 5);
        this.aimingGraphics.lineTo(x - size, y + size);
        this.aimingGraphics.lineTo(x - size + 5, y + size);
        this.aimingGraphics.strokePath();
        
        // Bottom-right bracket
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x + size - 5, y + size);
        this.aimingGraphics.lineTo(x + size, y + size);
        this.aimingGraphics.lineTo(x + size, y + size - 5);
        this.aimingGraphics.strokePath();
        
        // Center lightning bolt
        this.aimingGraphics.lineStyle(2, 0xFFFF00, 1);
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x - 5, y - 10);
        this.aimingGraphics.lineTo(x + 2, y);
        this.aimingGraphics.lineTo(x - 2, y);
        this.aimingGraphics.lineTo(x + 5, y + 10);
        this.aimingGraphics.strokePath();
    }
    
    private drawFreezeArea(x: number, y: number): void {
        // Draw freeze area indicator
        const radius = 150;
        
        // Frost effect
        this.aimingGraphics.fillStyle(0x87CEEB, 0.2);
        this.aimingGraphics.fillCircle(x, y, radius);
        
        // Snowflake patterns
        const snowflakeCount = 6;
        for (let i = 0; i < snowflakeCount; i++) {
            const angle = (i / snowflakeCount) * Math.PI * 2;
            const sx = x + Math.cos(angle) * radius * 0.7;
            const sy = y + Math.sin(angle) * radius * 0.7;
            
            // Draw simple snowflake
            this.aimingGraphics.lineStyle(2, 0xFFFFFF, 0.8);
            this.aimingGraphics.beginPath();
            
            // Six-pointed snowflake
            for (let j = 0; j < 6; j++) {
                const a = (j / 6) * Math.PI * 2;
                this.aimingGraphics.moveTo(sx, sy);
                this.aimingGraphics.lineTo(
                    sx + Math.cos(a) * 10,
                    sy + Math.sin(a) * 10
                );
            }
            this.aimingGraphics.strokePath();
        }
    }
    
    private drawTripleArrow(launcherX: number, launcherY: number, targetX: number, targetY: number): void {
        // Draw three trajectory lines for multi-shot
        const baseAngle = Math.atan2(targetY - launcherY, targetX - launcherX);
        const angles = [-15, 0, 15]; // Degrees
        
        angles.forEach((angleDiff, index) => {
            const angle = baseAngle + Phaser.Math.DegToRad(angleDiff);
            const distance = 200;
            const endX = launcherX + Math.cos(angle) * distance;
            const endY = launcherY + Math.sin(angle) * distance;
            
            // Different colors for each trajectory
            const colors = [0xFF6B6B, 0xFFFFFF, 0x6B6BFF];
            this.trajectoryLine!.lineStyle(2, colors[index], 0.6);
            this.trajectoryLine!.lineBetween(launcherX, launcherY, endX, endY);
            
            // Arrow heads
            this.drawArrowHead(endX, endY, angle, colors[index]);
        });
    }
    
    private drawArrowHead(x: number, y: number, angle: number, color: number): void {
        const size = 10;
        const angleLeft = angle - Phaser.Math.DegToRad(150);
        const angleRight = angle + Phaser.Math.DegToRad(150);
        
        this.aimingGraphics.lineStyle(2, color, 0.8);
        this.aimingGraphics.beginPath();
        this.aimingGraphics.moveTo(x, y);
        this.aimingGraphics.lineTo(x + Math.cos(angleLeft) * size, y + Math.sin(angleLeft) * size);
        this.aimingGraphics.moveTo(x, y);
        this.aimingGraphics.lineTo(x + Math.cos(angleRight) * size, y + Math.sin(angleRight) * size);
        this.aimingGraphics.strokePath();
    }
    
    private drawBasicTrajectory(launcherX: number, launcherY: number, targetX: number, targetY: number): void {
        // Basic dotted line trajectory
        this.trajectoryLine!.lineStyle(1, 0xFFFFFF, 0.5);
        
        const distance = Phaser.Math.Distance.Between(launcherX, launcherY, targetX, targetY);
        const steps = Math.floor(distance / 20);
        
        for (let i = 0; i < steps; i += 2) {
            const t1 = i / steps;
            const t2 = Math.min((i + 1) / steps, 1);
            
            const x1 = Phaser.Math.Linear(launcherX, targetX, t1);
            const y1 = Phaser.Math.Linear(launcherY, targetY, t1);
            const x2 = Phaser.Math.Linear(launcherX, targetX, t2);
            const y2 = Phaser.Math.Linear(launcherY, targetY, t2);
            
            this.trajectoryLine!.lineBetween(x1, y1, x2, y2);
        }
    }
    
    private calculateTrajectory(startX: number, startY: number, targetX: number, targetY: number, extended: boolean = false): void {
        this.trajectoryPoints = [];
        
        // Calculate initial direction
        const angle = Math.atan2(targetY - startY, targetX - startX);
        const speed = 10;
        let x = startX;
        let y = startY;
        let vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let bounces = 0;
        
        const maxSteps = extended ? 200 : 100;
        const screenWidth = this.scene.cameras.main.width;
        
        for (let i = 0; i < maxSteps; i++) {
            this.trajectoryPoints.push(new Phaser.Geom.Point(x, y));
            
            x += vx;
            y += vy;
            
            // Check for wall bounces
            if ((x <= 10 || x >= screenWidth - 10) && bounces < this.MAX_BOUNCES) {
                vx = -vx;
                bounces++;
            }
            
            // Stop at screen boundaries
            if (y <= 0 || y >= this.scene.cameras.main.height) {
                break;
            }
        }
    }
    
    private createModeIndicator(): void {
        // Clean up previous indicator
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
        }
        
        // Create mode-specific visual indicator at top of screen
        const x = this.scene.cameras.main.centerX;
        const y = 50;
        
        this.modeIndicator = this.scene.add.container(x, y);
        this.modeIndicator.setDepth(Z_LAYERS.UI + 10);
        
        // Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-60, -20, 120, 40, 10);
        this.modeIndicator.add(bg);
        
        // Mode text
        const modeNames: Record<AimingMode, string> = {
            [AimingMode.NORMAL]: 'NORMAL',
            [AimingMode.RAINBOW]: '🌈 RAINBOW',
            [AimingMode.LASER]: '🎯 LASER',
            [AimingMode.BOMB_NORMAL]: '💣 BOMB',
            [AimingMode.BOMB_BALLISTIC]: '💣 BALLISTIC',
            [AimingMode.LIGHTNING]: '⚡ LIGHTNING',
            [AimingMode.FREEZE]: '❄️ FREEZE',
            [AimingMode.MULTI]: '🎱 MULTI'
        };
        
        const text = this.scene.add.text(0, 0, modeNames[this.currentMode], {
            fontSize: '16px',
            fontFamily: 'Arial Black',
            color: '#FFFFFF'
        });
        text.setOrigin(0.5);
        this.modeIndicator.add(text);
        
        // Fade in animation
        this.modeIndicator.setAlpha(0);
        this.scene.tweens.add({
            targets: this.modeIndicator,
            alpha: 1,
            duration: 300,
            ease: 'Cubic.easeOut'
        });
    }
    
    private updateCursorStyle(): void {
        // Update HTML cursor style based on mode
        const canvas = this.scene.game.canvas;
        
        switch (this.currentMode) {
            case AimingMode.LIGHTNING:
                canvas.style.cursor = 'crosshair';
                break;
            case AimingMode.BOMB_BALLISTIC:
                canvas.style.cursor = 'crosshair';
                break;
            default:
                canvas.style.cursor = 'default';
                break;
        }
    }
    
    private clearGraphics(): void {
        this.aimingGraphics.clear();
        if (this.trajectoryLine) {
            this.trajectoryLine.clear();
        }
    }
    
    public getTargetingInfo(): TargetingInfo {
        return {
            mode: this.currentMode,
            position: { x: 0, y: 0 }, // Will be updated with actual pointer position
            trajectory: this.trajectoryPoints
        };
    }
    
    public reset(): void {
        this.setMode(AimingMode.NORMAL);
        this.clearGraphics();
        
        if (this.modeIndicator) {
            this.modeIndicator.destroy();
            this.modeIndicator = undefined;
        }
    }
    
    public destroy(): void {
        this.reset();
        this.aimingGraphics.destroy();
        
        if (this.trajectoryLine) {
            this.trajectoryLine.destroy();
        }
        
        if (this.cursorSprite) {
            this.cursorSprite.destroy();
        }
    }
}