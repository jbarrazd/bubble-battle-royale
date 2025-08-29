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
    private slotSize: number = 36; // Balanced size - still accessible but not huge
    private padding: number = 6; // Compact spacing
    private isOpponent: boolean;
    private backgroundPanel?: Phaser.GameObjects.Graphics;
    
    // Visual state constants
    private readonly SLOT_STATES = {
        EMPTY: { color: 0x2C2C54, alpha: 0.3 },
        AVAILABLE: { color: 0x4ECDC4, alpha: 0.8 },
        COOLDOWN: { color: 0x95A5A6, alpha: 0.5 },
        ACTIVATING: { color: 0xFFD700, alpha: 1.0 }
    };
    
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
        const safeAreaTop = 44; // Account for notch/status bar
        const safeAreaBottom = 34; // Account for home indicator
        
        // Position with safe areas
        // Player: bottom-right, Opponent: top-left (mirrored)
        const y = this.isOpponent ? 
            safeAreaTop + 30 : // Safe distance from top
            screenHeight - safeAreaBottom - 30; // Safe distance from bottom
        
        this.container = this.scene.add.container(0, y);
        this.container.setDepth(Z_LAYERS.UI + 5); // Above other UI but below popups
        
        // Calculate total width for horizontal layout
        const totalWidth = (this.slotSize * this.maxSlots) + (this.padding * (this.maxSlots - 1));
        
        // Position based on player/opponent
        // Right side for player, left for opponent
        const centerX = this.isOpponent ? 
            40 + totalWidth/2 : // Opponent: left side  
            screenWidth - 40 - totalWidth/2; // Player: right side
        
        // Create compact background for the inventory
        this.createCompactBackground(centerX, totalWidth);
        
        // Add compact label above slots
        const label = this.scene.add.text(
            centerX,
            this.isOpponent ? -22 : 22,
            this.isOpponent ? 'ENEMY' : 'ARSENAL',
            {
                fontSize: '9px',
                fontFamily: 'Arial Black',
                color: '#FFFFFF',
                stroke: this.isOpponent ? '#8B0000' : '#00008B',
                strokeThickness: 2
            }
        );
        label.setOrigin(0.5, 0.5);
        this.container.add(label);
        
        // Create slots horizontally
        for (let i = 0; i < this.maxSlots; i++) {
            // Calculate x position for each slot
            const xOffset = centerX - totalWidth/2 + (i * (this.slotSize + this.padding)) + this.slotSize/2;
            
            const slotContainer = this.scene.add.container(xOffset, 0);
            
            // Enhanced slot background
            const bg = this.scene.add.graphics();
            this.drawSlotBackground(bg, false);
            
            // Icon with balanced size
            const icon = this.scene.add.text(0, 0, '', {
                fontSize: '22px', // Balanced for visibility without being huge
                fontFamily: 'Arial'
            });
            icon.setOrigin(0.5);
            icon.setShadow(2, 2, '#000000', 2, true, true); // Good shadow
            
            // Count text with good visibility
            const countText = this.scene.add.text(
                this.slotSize/2 - 3, 
                this.slotSize/2 - 3, 
                '', 
                {
                    fontSize: '10px', // Compact but readable
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
                badge.setPosition(-this.slotSize/2 + 6, -this.slotSize/2 + 6);
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
    
    private createCompactBackground(centerX: number, totalWidth: number): void {
        this.backgroundPanel = this.scene.add.graphics();
        
        // Compact panel size
        const panelWidth = totalWidth + 16;
        const panelHeight = this.slotSize + 14;
        const panelX = centerX - panelWidth/2;
        const panelY = -panelHeight/2;
        
        // Semi-transparent background
        this.backgroundPanel.fillStyle(0x000000, 0.4);
        this.backgroundPanel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        
        // Team color border
        this.backgroundPanel.lineStyle(1.5, this.isOpponent ? 0xFF6B6B : 0x4ECDC4, 0.3);
        this.backgroundPanel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);
        
        // Subtle inner glow
        this.backgroundPanel.fillStyle(this.isOpponent ? 0x330000 : 0x000033, 0.15);
        this.backgroundPanel.fillRoundedRect(panelX + 1, panelY + 1, panelWidth - 2, panelHeight - 2, 7);
        
        this.container.add(this.backgroundPanel);
        this.backgroundPanel.setDepth(-1);
    }
    
    private createKeyHintBadge(key: number): Phaser.GameObjects.Container {
        const badge = this.scene.add.container(0, 0);
        
        // Compact badge
        const bg = this.scene.add.circle(0, 0, 8, 0xFFD700, 0.9);
        bg.setStrokeStyle(1.5, 0x000000, 1);
        
        // Key number
        const text = this.scene.add.text(0, 0, `${key}`, {
            fontSize: '10px', // Compact text
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
        
        // Mobile touch controls with accessible hit area
        this.slots.forEach((slot, index) => {
            // Add touch padding to reach 44px minimum
            const touchPadding = 6; // Makes total touch area ~48px
            slot.container.setInteractive(
                new Phaser.Geom.Rectangle(
                    -this.slotSize/2 - touchPadding, 
                    -this.slotSize/2 - touchPadding, 
                    this.slotSize + touchPadding * 2, 
                    this.slotSize + touchPadding * 2
                ),
                Phaser.Geom.Rectangle.Contains
            );
            
            slot.container.on('pointerdown', () => {
                // Haptic feedback for mobile
                if ('vibrate' in navigator) {
                    navigator.vibrate(30); // Light haptic feedback
                }
                this.activateSlot(index);
                
                // Visual press feedback
                this.scene.tweens.add({
                    targets: slot.container,
                    scale: 0.95,
                    duration: 100,
                    yoyo: true,
                    ease: 'Power2'
                });
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
            // Empty slot feedback
            if (slot) {
                this.showEmptySlotFeedback(slot);
            }
            return;
        }
        
        console.log(`Activating power-up: ${slot.powerUpType}`);
        
        // Enhanced activation feedback
        this.showActivationEffect(slot);
        
        // Start cooldown visual
        this.startCooldownEffect(slot, 2000); // 2 second cooldown
        
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
    
    private drawSlotBackground(bg: Phaser.GameObjects.Graphics, glowing: boolean = false, state: string = 'AVAILABLE'): void {
        bg.clear();
        
        // Get state colors
        const stateConfig = this.SLOT_STATES[state as keyof typeof this.SLOT_STATES] || this.SLOT_STATES.AVAILABLE;
        
        // Multi-layer background for depth
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-this.slotSize/2-2, -this.slotSize/2-2, this.slotSize+4, this.slotSize+4, 12);
        
        bg.fillStyle(this.isOpponent ? 0x330000 : 0x000033, stateConfig.alpha);
        bg.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 10);
        
        const borderColor = glowing ? 0xFFD700 : (state === 'COOLDOWN' ? 0x95A5A6 : (this.isOpponent ? 0xFF6B6B : 0x4ECDC4));
        bg.lineStyle(3, borderColor, glowing ? 1 : 0.8);
        bg.strokeRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 10);
        
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
    
    private showEmptySlotFeedback(slot: InventorySlot): void {
        // Red flash for empty slot
        const flash = this.scene.add.graphics();
        flash.fillStyle(0xFF0000, 0.3);
        flash.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 10);
        slot.container.add(flash);
        
        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });
    }
    
    private showActivationEffect(slot: InventorySlot): void {
        // Activation burst effect
        const burst = this.scene.add.graphics();
        burst.fillStyle(0xFFD700, 0.6);
        burst.fillCircle(0, 0, this.slotSize/2);
        slot.container.add(burst);
        
        this.scene.tweens.add({
            targets: burst,
            scale: 2,
            alpha: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => burst.destroy()
        });
        
        // Scale punch
        this.scene.tweens.add({
            targets: slot.container,
            scale: { from: 1.2, to: 1 },
            duration: 300,
            ease: 'Back.easeOut'
        });
    }
    
    private startCooldownEffect(slot: InventorySlot, duration: number): void {
        // Create cooldown overlay
        const overlay = this.scene.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRoundedRect(-this.slotSize/2, -this.slotSize/2, this.slotSize, this.slotSize, 10);
        slot.container.add(overlay);
        
        // Cooldown progress arc
        const progressArc = this.scene.add.graphics();
        slot.container.add(progressArc);
        
        this.scene.tweens.add({
            targets: { progress: 0 },
            progress: 1,
            duration: duration,
            onUpdate: (tween) => {
                const progress = tween.getValue();
                progressArc.clear();
                progressArc.lineStyle(4, 0x4ECDC4, 0.8);
                progressArc.beginPath();
                progressArc.arc(0, 0, this.slotSize/2 - 4, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress), false);
                progressArc.strokePath();
            },
            onComplete: () => {
                overlay.destroy();
                progressArc.destroy();
                // Refresh background to available state
                this.drawSlotBackground(slot.background, false, 'AVAILABLE');
            }
        });
    }
    
    public destroy(): void {
        // Clean up event listeners
        this.scene.events.off('power-up-collected');
        this.scene.events.off('activate-power-up');
        
        // Destroy all tweens
        this.slots.forEach(slot => {
            this.scene.tweens.killTweensOf(slot.container);
        });
        
        this.container.destroy();
    }
}