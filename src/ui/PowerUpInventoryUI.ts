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
    private slotSize: number = 40;
    private padding: number = 8;
    private isOpponent: boolean;
    
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
        
        // Position on right side, vertically centered
        const x = screenWidth - 60;
        const startY = this.isOpponent ? 100 : screenHeight / 2 + 50;
        
        this.container = this.scene.add.container(x, 0);
        this.container.setDepth(Z_LAYERS.UI + 10);
        
        // Add label
        const label = this.scene.add.text(
            0,
            startY - 30,
            this.isOpponent ? 'OPPONENT' : 'POWER-UPS',
            {
                fontSize: '12px',
                fontFamily: 'Arial Black',
                color: this.isOpponent ? '#FF6B6B' : '#4ECDC4',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        label.setOrigin(0.5);
        this.container.add(label);
        
        // Create slots vertically
        for (let i = 0; i < this.maxSlots; i++) {
            const y = startY + i * (this.slotSize + this.padding);
            
            const slotContainer = this.scene.add.container(0, y);
            
            // Slot background with team color
            const bg = this.scene.add.graphics();
            bg.fillStyle(0x000000, 0.7);
            bg.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
            bg.lineStyle(2, this.isOpponent ? 0xFF6B6B : 0x4ECDC4, 0.6);
            bg.strokeRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
            
            // Icon placeholder
            const icon = this.scene.add.text(0, -2, '', {
                fontSize: '24px',
                fontFamily: 'Arial'
            });
            icon.setOrigin(0.5);
            
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
            
            // Key hint (1, 2, 3) - only for player
            const keyHint = this.scene.add.text(
                -this.slotSize/2 + 4,
                -this.slotSize/2 + 2,
                this.isOpponent ? '' : `${i + 1}`,
                {
                    fontSize: '10px',
                    fontFamily: 'Arial Black',
                    color: '#FFD700',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            );
            keyHint.setOrigin(0, 0);
            
            slotContainer.add([bg, icon, countText, keyHint]);
            this.container.add(slotContainer);
            
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
                
                // Glow effect
                slot.background.clear();
                slot.background.fillStyle(0x000000, 0.5);
                slot.background.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
                slot.background.lineStyle(2, 0xFFD700, 1);
                slot.background.strokeRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
                
                // Fade glow
                this.scene.time.delayedCall(500, () => {
                    slot!.background.clear();
                    slot!.background.fillStyle(0x000000, 0.5);
                    slot!.background.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
                    slot!.background.lineStyle(2, 0x666666, 0.8);
                    slot!.background.strokeRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 8);
                });
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
    
    public destroy(): void {
        this.container.destroy();
    }
}