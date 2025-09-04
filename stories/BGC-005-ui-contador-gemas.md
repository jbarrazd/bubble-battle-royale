# USER STORY BGC-005: UI Contador de Gemas

## Información de la Historia
- **ID**: BGC-005  
- **Título**: Implementar UI de contador de gemas para ambos jugadores
- **Prioridad**: CRÍTICA
- **Estimación**: 2 puntos
- **Sprint**: 1
- **Estado**: Por hacer
- **Dependencias**: 
  - BGC-003 (Sistema de spawn de gemas)
  - BGC-004 (Sistema de recolección)

## Historia de Usuario
**Como** jugador  
**Quiero** ver claramente cuántas gemas tengo yo y mi oponente  
**Para** saber quién va ganando y cuánto me falta para la victoria  

## Contexto del GDD
Según el GDD, se necesitan 15 gemas para ganar. El contador debe ser prominente, claro y mostrar el progreso de ambos jugadores de forma simétrica. Es uno de los elementos UI más importantes del juego.

## Criterios de Aceptación

### Diseño Visual
- [ ] **AC1**: Contador centrado en la parte superior de la pantalla
- [ ] **AC2**: Formato: "TÚ: 8 💎 7 :RIVAL" (simétrico)
- [ ] **AC3**: Tamaño de fuente grande y legible (48px HD)
- [ ] **AC4**: Colores distintivos (Azul para jugador, Rojo para rival)
- [ ] **AC5**: Fondo semi-transparente para legibilidad

### Funcionalidad
- [ ] **AC6**: Actualización en tiempo real al recolectar gemas
- [ ] **AC7**: Animación de scale cuando cambia el número
- [ ] **AC8**: Flash de color cuando se acerca a 15 (12+)
- [ ] **AC9**: Indicador de meta "/ 15" visible
- [ ] **AC10**: Efecto especial al llegar a 15 (VICTORIA)

### Animaciones
- [ ] **AC11**: Pulse cuando recibe gemas (+scale 1.2)
- [ ] **AC12**: Shake cuando pierde gemas (reset parcial)
- [ ] **AC13**: Glow dorado cuando tiene ventaja
- [ ] **AC14**: Parpadeo de urgencia cuando rival está cerca de ganar

### Mobile/Responsive
- [ ] **AC15**: Escala correctamente en diferentes resoluciones
- [ ] **AC16**: No obstruye área de juego importante

## Implementación Técnica

### 1. Crear GemCounter.ts
```typescript
// src/ui/GemCounter.ts
import { GameScene } from '@/scenes/GameScene';
import { ARENA_CONFIG } from '@/config/ArenaConfig';

export class GemCounter extends Phaser.GameObjects.Container {
    private scene: GameScene;
    private playerGemsText: Phaser.GameObjects.Text;
    private opponentGemsText: Phaser.GameObjects.Text;
    private playerNameText: Phaser.GameObjects.Text;
    private opponentNameText: Phaser.GameObjects.Text;
    private gemIcon: Phaser.GameObjects.Image;
    private background: Phaser.GameObjects.Rectangle;
    private playerGems: number = 0;
    private opponentGems: number = 0;
    private readonly WIN_CONDITION = 15;
    
    constructor(scene: GameScene) {
        super(scene, ARENA_CONFIG.width / 2, 50);
        this.scene = scene;
        
        this.createBackground();
        this.createTexts();
        this.createGemIcon();
        this.createProgressBars();
        
        scene.add.existing(this);
        this.setDepth(1000); // Siempre visible
    }
    
    private createBackground(): void {
        // Fondo semi-transparente con gradiente
        this.background = this.scene.add.rectangle(
            0, 0,
            400, 80,
            0x000000, 0.7
        );
        this.background.setStrokeStyle(2, 0xffffff, 0.3);
        
        // Efecto de brillo sutil
        const glow = this.scene.add.rectangle(
            0, 0,
            400, 80,
            0xffffff, 0
        );
        glow.setStrokeStyle(4, 0xffd700, 0.2);
        
        this.add([this.background, glow]);
    }
    
    private createTexts(): void {
        // Nombre del jugador
        this.playerNameText = this.scene.add.text(
            -150, -20,
            'TÚ',
            {
                fontSize: '24px',
                fontFamily: 'Arial Black',
                color: '#4A90E2',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.playerNameText.setOrigin(0.5);
        
        // Contador del jugador
        this.playerGemsText = this.scene.add.text(
            -100, 10,
            '0',
            {
                fontSize: '48px',
                fontFamily: 'Arial Black',
                color: '#4A90E2',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.playerGemsText.setOrigin(0.5);
        
        // Meta del jugador
        const playerGoal = this.scene.add.text(
            -60, 15,
            '/15',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#888888',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        playerGoal.setOrigin(0, 0.5);
        
        // Separador central (gema)
        // Se crea en createGemIcon()
        
        // Nombre del rival
        this.opponentNameText = this.scene.add.text(
            150, -20,
            'RIVAL',
            {
                fontSize: '24px',
                fontFamily: 'Arial Black',
                color: '#E24A4A',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        this.opponentNameText.setOrigin(0.5);
        
        // Contador del rival
        this.opponentGemsText = this.scene.add.text(
            100, 10,
            '0',
            {
                fontSize: '48px',
                fontFamily: 'Arial Black',
                color: '#E24A4A',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.opponentGemsText.setOrigin(0.5);
        
        // Meta del rival
        const opponentGoal = this.scene.add.text(
            140, 15,
            '/15',
            {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#888888',
                stroke: '#000000',
                strokeThickness: 2
            }
        );
        opponentGoal.setOrigin(0, 0.5);
        
        this.add([
            this.playerNameText,
            this.playerGemsText,
            playerGoal,
            this.opponentNameText,
            this.opponentGemsText,
            opponentGoal
        ]);
    }
    
    private createGemIcon(): void {
        // Icono de gema central
        this.gemIcon = this.scene.add.image(0, 10, 'gem_star');
        this.gemIcon.setScale(0.8);
        this.gemIcon.setTint(0xffd700);
        
        // Animación de rotación constante
        this.scene.tweens.add({
            targets: this.gemIcon,
            rotation: Math.PI * 2,
            duration: 10000,
            repeat: -1
        });
        
        // Efecto de brillo
        this.scene.tweens.add({
            targets: this.gemIcon,
            scale: { from: 0.8, to: 1 },
            alpha: { from: 1, to: 0.7 },
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
        
        this.add(this.gemIcon);
    }
    
    private createProgressBars(): void {
        // Barra de progreso del jugador
        const playerBarBg = this.scene.add.rectangle(
            -100, 35,
            120, 8,
            0x000000, 0.5
        );
        playerBarBg.setStrokeStyle(1, 0x4A90E2, 0.5);
        
        const playerBar = this.scene.add.rectangle(
            -100, 35,
            0, 8,
            0x4A90E2, 1
        );
        playerBar.setOrigin(0, 0.5);
        playerBar.x = -160;
        
        // Barra de progreso del rival
        const opponentBarBg = this.scene.add.rectangle(
            100, 35,
            120, 8,
            0x000000, 0.5
        );
        opponentBarBg.setStrokeStyle(1, 0xE24A4A, 0.5);
        
        const opponentBar = this.scene.add.rectangle(
            100, 35,
            0, 8,
            0xE24A4A, 1
        );
        opponentBar.setOrigin(0, 0.5);
        opponentBar.x = 40;
        
        this.add([playerBarBg, playerBar, opponentBarBg, opponentBar]);
        
        // Guardar referencias para actualizar
        this.setData('playerBar', playerBar);
        this.setData('opponentBar', opponentBar);
    }
    
    updateGems(playerGems: number, opponentGems: number): void {
        const prevPlayerGems = this.playerGems;
        const prevOpponentGems = this.opponentGems;
        
        this.playerGems = playerGems;
        this.opponentGems = opponentGems;
        
        // Actualizar textos
        this.playerGemsText.setText(playerGems.toString());
        this.opponentGemsText.setText(opponentGems.toString());
        
        // Actualizar barras de progreso
        const playerBar = this.getData('playerBar') as Phaser.GameObjects.Rectangle;
        const opponentBar = this.getData('opponentBar') as Phaser.GameObjects.Rectangle;
        
        this.scene.tweens.add({
            targets: playerBar,
            width: (playerGems / this.WIN_CONDITION) * 120,
            duration: 300,
            ease: 'Power2.out'
        });
        
        this.scene.tweens.add({
            targets: opponentBar,
            width: (opponentGems / this.WIN_CONDITION) * 120,
            duration: 300,
            ease: 'Power2.out'
        });
        
        // Animaciones según cambios
        if (playerGems > prevPlayerGems) {
            this.playCollectAnimation(true);
        }
        
        if (opponentGems > prevOpponentGems) {
            this.playCollectAnimation(false);
        }
        
        // Efectos especiales según estado
        this.updateSpecialEffects();
    }
    
    playCollectAnimation(isPlayer: boolean = true): void {
        const target = isPlayer ? this.playerGemsText : this.opponentGemsText;
        
        // Pulse effect
        this.scene.tweens.add({
            targets: target,
            scale: { from: 1, to: 1.3 },
            duration: 200,
            yoyo: true,
            ease: 'Back.out'
        });
        
        // Color flash
        const originalColor = isPlayer ? '#4A90E2' : '#E24A4A';
        target.setColor('#FFD700');
        this.scene.time.delayedCall(200, () => {
            target.setColor(originalColor);
        });
    }
    
    playLossAnimation(): void {
        // Shake effect cuando pierde gemas (reset parcial)
        this.scene.tweens.add({
            targets: this.playerGemsText,
            x: { from: -100, to: -100 },
            duration: 50,
            repeat: 5,
            yoyo: true,
            ease: 'Linear',
            onUpdate: () => {
                this.playerGemsText.x = -100 + Phaser.Math.Between(-5, 5);
            },
            onComplete: () => {
                this.playerGemsText.x = -100;
            }
        });
        
        // Flash rojo
        this.playerGemsText.setTint(0xff0000);
        this.scene.time.delayedCall(500, () => {
            this.playerGemsText.clearTint();
        });
    }
    
    private updateSpecialEffects(): void {
        // Cerca de ganar (12+ gemas)
        if (this.playerGems >= 12) {
            this.playerGemsText.setColor('#FFD700'); // Dorado
            this.addGlowEffect(this.playerGemsText);
        }
        
        if (this.opponentGems >= 12) {
            this.opponentGemsText.setColor('#FF6600'); // Naranja peligro
            this.addWarningEffect();
        }
        
        // Victoria
        if (this.playerGems >= this.WIN_CONDITION) {
            this.showVictoryEffect();
        } else if (this.opponentGems >= this.WIN_CONDITION) {
            this.showDefeatEffect();
        }
    }
    
    private addGlowEffect(target: Phaser.GameObjects.Text): void {
        if (!target.getData('glowing')) {
            target.setData('glowing', true);
            
            this.scene.tweens.add({
                targets: target,
                alpha: { from: 1, to: 0.6 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }
    
    private addWarningEffect(): void {
        if (!this.getData('warning')) {
            this.setData('warning', true);
            
            // Parpadeo del fondo
            this.scene.tweens.add({
                targets: this.background,
                fillColor: { from: 0x000000, to: 0x660000 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }
    }
    
    private showVictoryEffect(): void {
        // Texto de victoria
        const victory = this.scene.add.text(
            0, 100,
            '¡VICTORIA!',
            {
                fontSize: '72px',
                fontFamily: 'Arial Black',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        victory.setOrigin(0.5);
        victory.setScale(0);
        
        this.add(victory);
        
        // Animación explosiva
        this.scene.tweens.add({
            targets: victory,
            scale: 1.5,
            rotation: { from: -0.1, to: 0.1 },
            duration: 500,
            ease: 'Back.out',
            yoyo: true,
            repeat: -1
        });
        
        // Fuegos artificiales
        this.createFireworks();
    }
    
    private showDefeatEffect(): void {
        // Oscurecer el contador
        this.scene.tweens.add({
            targets: this,
            alpha: 0.5,
            duration: 500
        });
    }
    
    private createFireworks(): void {
        // Efecto de fuegos artificiales para victoria
        const colors = [0xffd700, 0xffff00, 0xff00ff, 0x00ffff];
        
        for (let i = 0; i < 3; i++) {
            this.scene.time.delayedCall(i * 300, () => {
                const firework = this.scene.add.particles(
                    Phaser.Math.Between(-150, 150),
                    Phaser.Math.Between(-50, 50),
                    'gem_particle',
                    {
                        scale: { start: 1, end: 0 },
                        speed: { min: 100, max: 300 },
                        lifespan: 1000,
                        quantity: 20,
                        tint: colors
                    }
                );
                
                this.add(firework);
                this.scene.time.delayedCall(1000, () => firework.destroy());
            });
        }
    }
    
    // Métodos helper para el sistema de gemas
    getPlayerPosition(): { x: number, y: number } {
        return {
            x: this.x - 100,
            y: this.y + 10
        };
    }
    
    getOpponentPosition(): { x: number, y: number } {
        return {
            x: this.x + 100,
            y: this.y + 10
        };
    }
}
```

### 2. Integración en GameScene
```typescript
// En GameScene.ts
import { GemCounter } from '@/ui/GemCounter';

export class GameScene extends Scene {
    private gemCounter: GemCounter;
    
    create(): void {
        // ... código existente ...
        
        // Crear contador de gemas
        this.gemCounter = new GemCounter(this);
        
        // Conectar con sistema de gemas
        this.gemSystem.setGemCounter(this.gemCounter);
    }
}
```

### 3. Configuración Responsive
```typescript
// En GameConfig.ts añadir
export const UI_CONFIG = {
    gemCounter: {
        y: 50,  // Desde el top
        width: 400,
        height: 80,
        fontSize: {
            title: 24,
            gems: 48,
            goal: 24
        },
        colors: {
            player: 0x4A90E2,
            opponent: 0xE24A4A,
            warning: 0xFF6600,
            victory: 0xFFD700
        }
    }
};
```

## Definition of Done
- [ ] Contador visible y centrado en la parte superior
- [ ] Muestra gemas de ambos jugadores
- [ ] Actualización en tiempo real funciona
- [ ] Animaciones de recolección suaves
- [ ] Animación de pérdida (shake) funciona
- [ ] Efectos de casi-victoria (12+ gemas)
- [ ] Efecto de victoria completo
- [ ] Barras de progreso funcionales
- [ ] Responsive en diferentes resoluciones
- [ ] Sin memory leaks en animaciones

## Notas para QA
- Verificar legibilidad en ambas arenas (Ocean y Space)
- Confirmar animaciones no causan lag
- Validar que el contador no obstruye jugabilidad
- Probar efectos especiales cerca de victoria
- Verificar en dispositivos móviles

## Notas de Diseño
- El contador debe ser el elemento UI más prominente
- Los colores deben contrastar bien con cualquier fondo
- Las animaciones deben ser satisfactorias pero no distractoras

## Riesgos
- El contador puede obstruir burbujas superiores
- Muchas animaciones pueden afectar performance
- Los efectos de victoria pueden ser muy llamativos