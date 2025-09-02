import Phaser from 'phaser';

export interface IInputPosition {
    x: number;
    y: number;
    isActive: boolean;
}

export class InputManager {
    private scene: Phaser.Scene;
    private pointer: Phaser.Input.Pointer;
    private currentPosition: IInputPosition;
    private sensitivity: number = 0.5; // Low sensitivity as per requirements
    private isEnabled: boolean = true;
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.currentPosition = { x: 0, y: 0, isActive: false };
        this.setupInput();
    }
    
    private setupInput(): void {
        // Get the main pointer (works for both mouse and touch)
        this.pointer = this.scene.input.activePointer;
        
        // Enable input events
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
    }
    
    private onPointerMove(pointer: Phaser.Input.Pointer): void {
        if (!this.isEnabled) return;
        
        // For initial setup, set position directly
        if (this.currentPosition.x === 0 && this.currentPosition.y === 0) {
            this.currentPosition.x = pointer.x;
            this.currentPosition.y = pointer.y;
        } else {
            // Apply sensitivity to smooth out movement
            const targetX = pointer.x;
            const targetY = pointer.y;
            
            // Smooth interpolation with sensitivity
            this.currentPosition.x += (targetX - this.currentPosition.x) * this.sensitivity;
            this.currentPosition.y += (targetY - this.currentPosition.y) * this.sensitivity;
        }
    }
    
    private onPointerDown(_pointer: Phaser.Input.Pointer): void {
        if (!this.isEnabled) return;
        this.currentPosition.isActive = true;
    }
    
    private onPointerUp(_pointer: Phaser.Input.Pointer): void {
        this.currentPosition.isActive = false;
    }
    
    public getPosition(): IInputPosition {
        return this.currentPosition;
    }
    
    public getPointerPosition(): { x: number; y: number } {
        return {
            x: this.currentPosition.x,
            y: this.currentPosition.y
        };
    }
    
    public getAngleFrom(fromX: number, fromY: number): number {
        const dx = this.currentPosition.x - fromX;
        const dy = this.currentPosition.y - fromY;
        
        // Calculate angle in radians
        let angle = Math.atan2(dy, dx);
        
        // Convert to degrees
        let degrees = Phaser.Math.RadToDeg(angle);
        
        // Normalize to 0-360 range
        if (degrees < 0) degrees += 360;
        
        return degrees;
    }
    
    public getAngleFromWithConstraints(fromX: number, fromY: number, minAngle: number = 15, maxAngle: number = 165): number {
        let angle = this.getAngleFrom(fromX, fromY);
        
        // Apply constraints (assuming 0° is right, 90° is down, 180° is left, 270° is up)
        // For shooting upward, we want to constrain between 195° (15° from left) and 345° (15° from right)
        // Adjusting for upward shooting from bottom
        const constrainedMin = 180 + minAngle; // 195°
        const constrainedMax = 360 - minAngle;  // 345°
        
        // Handle the constraint across the 0° boundary
        if (angle >= 0 && angle <= 180) {
            // Left side constraint
            if (angle < 90) {
                angle = constrainedMax;
            } else {
                angle = constrainedMin;
            }
        } else {
            // Apply normal constraints
            angle = Phaser.Math.Clamp(angle, constrainedMin, constrainedMax);
        }
        
        return angle;
    }
    
    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }
    
    public isPointerActive(): boolean {
        return this.currentPosition.isActive;
    }
    
    public setSensitivity(sensitivity: number): void {
        this.sensitivity = Phaser.Math.Clamp(sensitivity, 0.1, 1.0);
    }
    
    public update(): void {
        // Update current position if pointer is not active (for mouse hover)
        if (!this.currentPosition.isActive && this.pointer) {
            this.currentPosition.x = this.pointer.x;
            this.currentPosition.y = this.pointer.y;
        }
    }
    
    public destroy(): void {
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerdown', this.onPointerDown, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
    }
}