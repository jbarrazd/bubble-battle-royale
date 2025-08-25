import { Scene } from 'phaser';
import { PowerUpType } from '@/systems/powerups/PowerUpManager';
import { Z_LAYERS } from '@/config/ArenaConfig';

interface InventorySlot {
    container: Phaser.GameObjects.Container;
    background: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Text;
    countText: Phaser.GameObjects.Text;
    keyHint: Phaser.GameObjects.Text;
    powerUpType?: PowerUpType;
    count: number;
}

export class PowerUpInventoryUI {
    private scene: Scene;
    private container: Phaser.GameObjects.Container;
    private slots: InventorySlot[] = [];
    private maxSlots: number = 3;
    private slotSize: number = 45;
    private padding: number = 10;
    private isOpponent: boolean;
    private backgroundPanel?: Phaser.GameObjects.Graphics;
    
    // Power-up icons
    private powerUpIcons: Record<PowerUpType, string> = {
        [PowerUpType.RAINBOW]: '🌈',
        [PowerUpType.BOMB]: '💣',
        [PowerUpType.LIGHTNING]: '⚡',
        [PowerUpType.FREEZE]: '❄️',
        [PowerUpType.LASER]: '🎯',
        [PowerUpType.MULTIPLIER]: '✨',
        [PowerUpType.SHIELD]: '🛡️',
        [PowerUpType.MAGNET]: '🧲'
    };
    
    constructor(scene: Scene, isOpponent: boolean = false) {
        this.scene = scene;
        this.isOpponent = isOpponent;
        this.createUI();
        if (!isOpponent) {
            this.setupEventListeners();
        }
    }
    
    private createUI(): void {
        const screenWidth = this.scene.cameras.main.width;
        const screenHeight = this.scene.cameras.main.height;
        
        // Position in corner of fort area
        // Player: bottom-right, Opponent: top-left (mirrored)
        const y = this.isOpponent ? 25 : screenHeight - 25;
        
        this.container = this.scene.add.container(0, y);
        this.container.setDepth(Z_LAYERS.UI + 5); // Above other UI but below popups
        
        // Create compact background for the inventory
        this.createCompactBackground();
        
        // Calculate position - right side for player, left for opponent
        const slotSpacing = this.slotSize + this.padding;
        const totalWidth = this.slotSize * this.maxSlots + this.padding * (this.maxSlots - 1);
        
        // Position based on player/opponent
        const baseX = this.isOpponent ? 
            60 : // Opponent: left side  
            screenWidth - 60; // Player: right side
        
        // Add compact label
        const label = this.scene.add.text(
            baseX,
            this.isOpponent ? -20 : 20,
            this.isOpponent ? 'ENEMY' : 'ARSENAL',
            {
                fontSize: '10px',
                fontFamily: 'Arial Black',
                color: '#FFFFFF',
                stroke: this.isOpponent ? '#8B0000' : '#00008B',
                strokeThickness: 2
            }
        );
        label.setOrigin(0.5, 0.5);
        this.container.add(label);
        
        // Create slots vertically (stacked)
        for (let i = 0; i < this.maxSlots; i++) {
            // Stack vertically with proper spacing
            const yOffset = (i - 1) * (this.slotSize + this.padding/2); // Center middle slot
            
            const slotContainer = this.scene.add.container(baseX, yOffset);
            
            // Enhanced slot background
            const bg = this.scene.add.graphics();
            this.drawSlotBackground(bg, false);
            
            // Icon with better positioning
            const icon = this.scene.add.text(0, 0, '', {
                fontSize: '28px',
                fontFamily: 'Arial'
            });
            icon.setOrigin(0.5);
            icon.setShadow(2, 2, '#000000', 2, true, true);
            
            // Count text
            const countText = this.scene.add.text(
                this.slotSize/2 - 4, 
                this.slotSize/2 - 4, 
                '', 
                {
                    fontSize: '12px',
                    fontFamily: 'Arial Black',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            );
            countText.setOrigin(1, 1);
            
            // Key hint badge - only for player
            let keyHint: Phaser.GameObjects.Text;
            if (!this.isOpponent) {
                const badge = this.createKeyHintBadge(i + 1);
                badge.setPosition(-this.slotSize/2 + 8, -this.slotSize/2 + 8);
                slotContainer.add(badge);
                keyHint = badge.getAt(1) as Phaser.GameObjects.Text;
            } else {
                keyHint = this.scene.add.text(0, 0, '');
            }
            
            slotContainer.add([bg, icon, countText]);
            this.container.add(slotContainer);
            
            // Add subtle idle animation
            this.scene.tweens.add({
                targets: slotContainer,
                y: slotContainer.y + (this.isOpponent ? 2 : -2),
                duration: 2000 + (i * 200),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            this.slots.push({
                container: slotContainer,
                background: bg,
                icon,
                countText,
                keyHint,
                count: 0
            });
        }
    }
    
    private createCompactBackground(): void {
        const screenWidth = this.scene.cameras.main.width;
        this.backgroundPanel = this.scene.add.graphics();
        
        // Compact background for side panel
        const panelWidth = 80;
        const panelHeight = 160;
        const panelX = this.isOpponent ? 20 : screenWidth - panelWidth - 20;
        const panelY = -panelHeight / 2;
        
        // Semi-transparent background
        this.backgroundPanel.fillStyle(0x000000, 0.5);
        this.backgroundPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        
        // Team color border
        this.backgroundPanel.lineStyle(2, this.isOpponent ? 0xFF6B6B : 0x4ECDC4, 0.4);
        this.backgroundPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
        
        // Inner glow
        this.backgroundPanel.fillStyle(this.isOpponent ? 0x330000 : 0x000033, 0.2);
        this.backgroundPanel.fillRoundedRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4, 8);
        
        this.container.add(this.backgroundPanel);
        this.backgroundPanel.setDepth(-1);
    }
    
    private createKeyHintBadge(key: number): Phaser.GameObjects.Container {
        const badge = this.scene.add.container(0, 0);
        
        // Badge background
        const bg = this.scene.add.circle(0, 0, 10, 0xFFD700, 0.9);
        bg.setStrokeStyle(2, 0x000000, 1);
        
        // Key number
        const text = this.scene.add.text(0, 0, `${key}`, {
            fontSize: '12px',
            fontFamily: 'Arial Black',
            color: '#000000'
        });
        text.setOrigin(0.5);
        
        badge.add([bg, text]);
        return badge;
    }
    
    private setupEventListeners(): void {
        // Listen for power-up collection
        this.scene.events.on('power-up-collected', (data: any) => {
            console.log('PowerUpInventoryUI received power-up-collected event:', data);
            const shouldAdd = this.isOpponent ? (data.owner === 'opponent') : (data.owner === 'player');
            if (shouldAdd) {
                this.addPowerUp(data.type);
            }
        });
        
        // Keyboard controls for activation
        this.scene.input.keyboard?.on('keydown-ONE', () => this.activateSlot(0));
        this.scene.input.keyboard?.on('keydown-TWO', () => this.activateSlot(1));
        this.scene.input.keyboard?.on('keydown-THREE', () => this.activateSlot(2));
        
        // Mobile touch controls
        this.slots.forEach((slot, index) => {
            slot.container.setInteractive(
                new Phaser.Geom.Rectangle(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize),
                Phaser.Geom.Rectangle.Contains
            );
            
            slot.container.on('pointerdown', () => {
                this.activateSlot(index);
            });
        });
    }
    
    private addPowerUp(type: PowerUpType): void {
        console.log(`Adding power-up to inventory: ${type}`);
        
        // Check if we already have this power-up
        let slot = this.slots.find(s => s.powerUpType === type);
        
        if (slot) {
            // Increment count
            slot.count++;
            slot.countText.setText(slot.count > 1 ? `x${slot.count}` : '');
            console.log(`Incremented count for ${type}, now: ${slot.count}`);
        } else {
            // Find empty slot
            slot = this.slots.find(s => !s.powerUpType);
            
            if (slot) {
                console.log(`Adding ${type} to empty slot`);
                slot.powerUpType = type;
                slot.count = 1;
                slot.icon.setText(this.powerUpIcons[type]);
                
                // Add collection animation
                this.scene.tweens.add({
                    targets: slot.container,
                    scale: { from: 1.3, to: 1 },
                    duration: 300,
                    ease: 'Back.easeOut'
                });
                
                // Enhanced collection effect
                const collectFlash = this.scene.add.graphics();
                collectFlash.fillStyle(0xFFD700, 0.5);
                collectFlash.fillCircle(slot.container.x, 0, this.slotSize);
                this.container.add(collectFlash);
                
                this.scene.tweens.add({
                    targets: collectFlash,
                    alpha: 0,
                    scale: 2,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: () => collectFlash.destroy()
                });
                
                // Refresh slot background with glow
                slot.background.clear();
                this.drawSlotBackground(slot.background, true);
            }
        }
    }
    
    private activateSlot(index: number): void {
        const slot = this.slots[index];
        
        if (!slot || !slot.powerUpType || slot.count <= 0) {
            // Empty slot or no power-ups
            return;
        }
        
        console.log(`Activating power-up: ${slot.powerUpType}`);
        
        // Visual feedback
        this.scene.tweens.add({
            targets: slot.container,
            scale: { from: 1, to: 0.8, end: 1 },
            duration: 200,
            ease: 'Quad.easeOut'
        });
        
        // Emit activation event
        this.scene.events.emit('activate-power-up', {
            type: slot.powerUpType
        });
        
        // Decrease count
        slot.count--;
        
        if (slot.count <= 0) {
            // Clear slot
            slot.powerUpType = undefined;
            slot.icon.setText('');
            slot.countText.setText('');
        } else {
            slot.countText.setText(slot.count > 1 ? `x${slot.count}` : '');
        }
    }
    
    private drawSlotBackground(bg: Phaser.GameObjects.Graphics, glowing: boolean = false): void {
        bg.clear();
        
        // Multi-layer background for depth
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-this.slotSize/2-2, -this.slotSize/2-2, this.slotSize+4, this.slotSize+4, 10);
        
        bg.fillStyle(this.isOpponent ? 0x330000 : 0x000033, 0.6);
        bg.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
        
        bg.lineStyle(3, glowing ? 0xFFD700 : (this.isOpponent ? 0xFF6B6B : 0x4ECDC4), glowing ? 1 : 0.8);
        bg.strokeRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
        
        // Inner glow
        bg.lineStyle(1, 0xFFFFFF, glowing ? 0.4 : 0.2);
        bg.strokeRoundedRect(-this.slotSize/2+2, -this.slotSize/2+2, this.slotSize-4, this.slotSize-4, 6);
        
        if (glowing) {
            // Fade the glow after a moment
            this.scene.time.delayedCall(500, () => {
                this.drawSlotBackground(bg, false);
            });
        }
    }
    
    public destroy(): void {
        this.container.destroy();
    }
}