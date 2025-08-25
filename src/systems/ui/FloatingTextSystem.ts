import { Scene } from 'phaser';

export interface FloatingTextConfig {
    text: string;
    x: number;
    y: number;
    color?: string;
    fontSize?: string;
    duration?: number;
    distance?: number;
    easeType?: string;
}

export class FloatingTextSystem {
    private scene: Scene;
    private textPool: Phaser.GameObjects.Text[] = [];
    private activeTexts: Set<Phaser.GameObjects.Text> = new Set();
    
    constructor(scene: Scene) {
        this.scene = scene;
        this.createTextPool();
    }
    
    private createTextPool(): void {
        // Pre-create text objects for performance
        for (let i = 0; i < 20; i++) {
            const text = this.scene.add.text(0, 0, '', {
                fontSize: '20px', // Smaller for mobile
                color: '#FFFFFF',
                fontFamily: 'Arial Black',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            });
            text.setOrigin(0.5);
            text.setVisible(false);
            text.setDepth(1200);
            text.setShadow(1, 1, '#000000', 2, true, true);
            this.textPool.push(text);
        }
    }
    
    public showFloatingText(config: FloatingTextConfig): void {
        const {
            text,
            x,
            y,
            color = '#FFD700',
            fontSize = '20px', // Smaller default for mobile
            duration = 1200,
            distance = 40, // Less movement for mobile
            easeType = 'Power2'
        } = config;
        
        // Get text from pool
        const floatingText = this.getFromPool();
        if (!floatingText) return;
        
        // Configure text
        floatingText.setText(text);
        floatingText.setPosition(x, y);
        floatingText.setColor(color);
        floatingText.setFontSize(parseInt(fontSize));
        floatingText.setVisible(true);
        floatingText.setAlpha(1);
        floatingText.setScale(0);
        
        this.activeTexts.add(floatingText);
        
        // Entrance animation
        this.scene.tweens.add({
            targets: floatingText,
            scale: { from: 0, to: 1.2 },
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Settle
                this.scene.tweens.add({
                    targets: floatingText,
                    scale: 1,
                    duration: 100,
                    ease: 'Sine.easeInOut'
                });
            }
        });
        
        // Float up and fade animation
        this.scene.tweens.add({
            targets: floatingText,
            y: y - distance,
            alpha: 0,
            duration: duration,
            ease: easeType,
            delay: 300,
            onComplete: () => {
                this.returnToPool(floatingText);
            }
        });
    }
    
    public showDamageNumber(x: number, y: number, points: number, isCombo: boolean = false): void {
        const config: FloatingTextConfig = {
            text: `+${points}`,
            x,
            y,
            color: isCombo ? '#FF4500' : '#FFD700',
            fontSize: isCombo ? '24px' : '20px', // Smaller for mobile
            duration: isCombo ? 1500 : 1200,
            distance: isCombo ? 50 : 40
        };
        
        this.showFloatingText(config);
        
        // Add extra effects for big numbers
        if (points >= 500) {
            this.createBurstEffect(x, y);
        }
    }
    
    private createBurstEffect(x: number, y: number): void {
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 100;
            
            const particle = this.scene.add.circle(x, y, 3, 0xFFD700, 1);
            particle.setDepth(1150);
            
            this.scene.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0,
                duration: 600,
                ease: 'Power2',
                onComplete: () => {
                    particle.destroy();
                }
            });
        }
    }
    
    private getFromPool(): Phaser.GameObjects.Text | null {
        for (const text of this.textPool) {
            if (!this.activeTexts.has(text)) {
                return text;
            }
        }
        
        // If pool is exhausted, create new one
        const text = this.scene.add.text(0, 0, '', {
            fontSize: '20px', // Smaller for mobile
            color: '#FFFFFF',
            fontFamily: 'Arial Black',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        });
        text.setOrigin(0.5);
        text.setDepth(1200);
        text.setShadow(1, 1, '#000000', 2, true, true);
        this.textPool.push(text);
        
        return text;
    }
    
    private returnToPool(text: Phaser.GameObjects.Text): void {
        text.setVisible(false);
        this.activeTexts.delete(text);
    }
    
    public reset(): void {
        this.activeTexts.forEach(text => {
            text.setVisible(false);
        });
        this.activeTexts.clear();
        
        // Kill all tweens on text objects
        this.textPool.forEach(text => {
            if (this.scene && this.scene.tweens) {
                this.scene.tweens.killTweensOf(text);
            }
        });
    }
    
    public destroy(): void {
        this.reset();
        this.textPool.forEach(text => text.destroy());
        this.textPool = [];
    }
}