# USER STORY BGC-003: Sistema de Gemas - Spawn y Visual

## Información de la Historia
- **ID**: BGC-003
- **Título**: Implementar spawn de gemas y feedback visual en burbujas
- **Prioridad**: CRÍTICA
- **Estimación**: 3 puntos
- **Sprint**: 1
- **Estado**: Por hacer
- **Dependencias**: Ninguna (base del sistema de gemas)

## Historia de Usuario
**Como** jugador  
**Quiero** ver gemas aparecer en algunas burbujas del campo  
**Para** tener objetivos claros que recolectar durante la partida  

## Contexto del GDD
Según el GDD Sección 4.2, las gemas son el objetivo principal del juego. Se necesitan 15 gemas para ganar. Las gemas se "incrustan" en burbujas existentes y son visualmente distintivas para que los jugadores puedan identificarlas fácilmente.

## Criterios de Aceptación

### Spawn de Gemas
- [ ] **AC1**: Primera gema aparece 3 segundos después de iniciar el juego
- [ ] **AC2**: Luego, 1 gema aparece cada 8 segundos (Fase 1: 0-60s)
- [ ] **AC3**: Las gemas se incrustan SOLO en burbujas existentes (no vacías)
- [ ] **AC4**: Prioridad de spawn en el tercio central del campo
- [ ] **AC5**: Solo 1 gema máximo por burbuja
- [ ] **AC6**: 85% probabilidad gema normal, 15% gema dorada

### Visual de Gemas
- [ ] **AC7**: Burbuja con gema tiene **brillo dorado pulsante**
- [ ] **AC8**: Efecto de partículas doradas sutiles alrededor
- [ ] **AC9**: Gema normal = 1 estrella dorada en el centro
- [ ] **AC10**: Gema dorada = 3 estrellas doradas en el centro
- [ ] **AC11**: Animación de aparición (scale 0→1 con bounce)
- [ ] **AC12**: Sonido distintivo al aparecer gema

### Integración con Sistema Existente
- [ ] **AC13**: Las gemas se mueven con las burbujas cuando hay spawn de filas
- [ ] **AC14**: Las gemas mantienen su posición relativa a la burbuja
- [ ] **AC15**: Compatible con ambas arenas (Ocean y Space)

## Implementación Técnica

### 1. Crear GemSystem.ts
```typescript
// src/systems/gameplay/GemSystem.ts
import { GameScene } from '@/scenes/GameScene';
import { BubbleGrid } from './BubbleGrid';
import { Bubble } from '@/gameObjects/Bubble';

export enum GemType {
    NORMAL = 'normal',
    GOLDEN = 'golden'
}

export interface Gem {
    id: string;
    type: GemType;
    value: number;
    bubble: Bubble | null;
    sprite: Phaser.GameObjects.Container | null;
}

export class GemSystem {
    private scene: GameScene;
    private grid: BubbleGrid;
    private gems: Map<string, Gem> = new Map();
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private spawnInterval: number = 8000; // 8 segundos base
    private currentPhase: number = 0;
    private gameStartTime: number = 0;
    
    // Configuración de spawn por fase
    private readonly SPAWN_CONFIG = {
        phase1: { duration: 60000, interval: 8000 },  // 0-60s
        phase2: { duration: 60000, interval: 5000 },  // 60-120s
        phase3: { duration: null, interval: 5000 }    // 120s+
    };
    
    private readonly GOLDEN_GEM_CHANCE = 0.15;
    
    constructor(scene: GameScene, grid: BubbleGrid) {
        this.scene = scene;
        this.grid = grid;
    }
    
    startGemSpawning(): void {
        this.gameStartTime = this.scene.time.now;
        
        // Primera gema después de 3 segundos
        this.scene.time.delayedCall(3000, () => {
            this.spawnGem();
            this.setupSpawnTimer();
        });
    }
    
    private setupSpawnTimer(): void {
        this.spawnTimer = this.scene.time.addEvent({
            delay: this.spawnInterval,
            callback: () => {
                this.updatePhase();
                this.spawnGem();
            },
            callbackScope: this,
            loop: true
        });
    }
    
    private updatePhase(): void {
        const elapsed = this.scene.time.now - this.gameStartTime;
        
        if (elapsed < 60000) {
            this.currentPhase = 0;
            this.spawnInterval = this.SPAWN_CONFIG.phase1.interval;
        } else if (elapsed < 120000) {
            this.currentPhase = 1;
            this.spawnInterval = this.SPAWN_CONFIG.phase2.interval;
        } else {
            this.currentPhase = 2;
            this.spawnInterval = this.SPAWN_CONFIG.phase3.interval;
        }
        
        // Actualizar timer si cambió el intervalo
        if (this.spawnTimer) {
            this.spawnTimer.delay = this.spawnInterval;
        }
    }
    
    private spawnGem(): void {
        // Encontrar burbuja candidata
        const targetBubble = this.findTargetBubble();
        if (!targetBubble) {
            console.warn('No se encontró burbuja válida para gema');
            return;
        }
        
        // Determinar tipo de gema
        const gemType = Math.random() < this.GOLDEN_GEM_CHANCE 
            ? GemType.GOLDEN 
            : GemType.NORMAL;
        
        // Crear gema
        const gem: Gem = {
            id: `gem_${Date.now()}_${Math.random()}`,
            type: gemType,
            value: gemType === GemType.GOLDEN ? 3 : 1,
            bubble: targetBubble,
            sprite: null
        };
        
        // Crear visual
        this.createGemVisual(gem);
        
        // Registrar gema
        this.gems.set(gem.id, gem);
        targetBubble.setGem(gem);
        
        // Sonido de aparición
        this.scene.sound.play('gem_appear', { volume: 0.5 });
    }
    
    private findTargetBubble(): Bubble | null {
        const candidates: Bubble[] = [];
        
        // Priorizar tercio central (rows 5-10)
        const minRow = 5;
        const maxRow = 10;
        
        // Primero buscar en zona prioritaria
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = 0; col < this.grid.cols; col++) {
                const bubble = this.grid.getBubbleAt(row, col);
                if (bubble && !bubble.hasGem()) {
                    candidates.push(bubble);
                }
            }
        }
        
        // Si no hay en zona central, buscar en todo el campo
        if (candidates.length === 0) {
            for (let row = 0; row < this.grid.rows; row++) {
                for (let col = 0; col < this.grid.cols; col++) {
                    const bubble = this.grid.getBubbleAt(row, col);
                    if (bubble && !bubble.hasGem()) {
                        candidates.push(bubble);
                    }
                }
            }
        }
        
        // Seleccionar aleatoriamente
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        
        return null;
    }
    
    private createGemVisual(gem: Gem): void {
        if (!gem.bubble) return;
        
        const container = this.scene.add.container(gem.bubble.x, gem.bubble.y);
        
        // Brillo de fondo
        const glow = this.scene.add.sprite(0, 0, 'gem_glow');
        glow.setScale(0.8);
        glow.setAlpha(0.6);
        glow.setTint(0xffd700); // Dorado
        
        // Animación de pulso del brillo
        this.scene.tweens.add({
            targets: glow,
            scale: { from: 0.8, to: 1.1 },
            alpha: { from: 0.6, to: 0.3 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Icono de gema (estrella)
        const starCount = gem.type === GemType.GOLDEN ? 3 : 1;
        const stars: Phaser.GameObjects.Image[] = [];
        
        for (let i = 0; i < starCount; i++) {
            const star = this.scene.add.image(
                (i - 1) * 15, // Distribuir horizontalmente si hay múltiples
                0,
                'gem_star'
            );
            star.setScale(0.3);
            star.setTint(gem.type === GemType.GOLDEN ? 0xffd700 : 0xffffcc);
            stars.push(star);
            container.add(star);
        }
        
        // Partículas sutiles
        const particles = this.scene.add.particles(0, 0, 'gem_particle', {
            scale: { start: 0.2, end: 0 },
            alpha: { start: 0.8, end: 0 },
            speed: { min: 20, max: 40 },
            lifespan: 1500,
            frequency: 500,
            quantity: 1,
            tint: 0xffd700
        });
        
        container.add([glow, ...stars, particles]);
        
        // Animación de aparición
        container.setScale(0);
        container.setAlpha(0);
        
        this.scene.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.out'
        });
        
        // Rotación suave continua para las estrellas
        stars.forEach(star => {
            this.scene.tweens.add({
                targets: star,
                rotation: Math.PI * 2,
                duration: 10000,
                repeat: -1
            });
        });
        
        gem.sprite = container;
        
        // Vincular visual a la burbuja
        gem.bubble.setData('gemVisual', container);
    }
    
    // Mover gema con burbuja
    updateGemPosition(bubble: Bubble): void {
        const gemVisual = bubble.getData('gemVisual') as Phaser.GameObjects.Container;
        if (gemVisual) {
            gemVisual.x = bubble.x;
            gemVisual.y = bubble.y;
        }
    }
    
    // Limpiar gema cuando la burbuja se destruye
    removeGem(bubble: Bubble): void {
        const gem = bubble.getGem();
        if (gem) {
            if (gem.sprite) {
                // Animación de recolección (para BGC-004)
                gem.sprite.destroy();
            }
            this.gems.delete(gem.id);
            bubble.clearGem();
        }
    }
    
    getGemsCount(): number {
        return this.gems.size;
    }
    
    getAllGems(): Gem[] {
        return Array.from(this.gems.values());
    }
    
    pause(): void {
        if (this.spawnTimer) {
            this.spawnTimer.paused = true;
        }
    }
    
    resume(): void {
        if (this.spawnTimer) {
            this.spawnTimer.paused = false;
        }
    }
    
    destroy(): void {
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
        }
        
        // Limpiar todas las gemas
        this.gems.forEach(gem => {
            if (gem.sprite) {
                gem.sprite.destroy();
            }
        });
        
        this.gems.clear();
    }
}
```

### 2. Modificar Bubble.ts
```typescript
// Añadir a src/gameObjects/Bubble.ts

export class Bubble extends Phaser.GameObjects.Container {
    private gem: Gem | null = null;
    
    // ... código existente ...
    
    setGem(gem: Gem): void {
        this.gem = gem;
        this.setData('hasGem', true);
    }
    
    getGem(): Gem | null {
        return this.gem;
    }
    
    hasGem(): boolean {
        return this.gem !== null;
    }
    
    clearGem(): void {
        this.gem = null;
        this.setData('hasGem', false);
        this.setData('gemVisual', null);
    }
    
    // Override del update para mover la gema con la burbuja
    update(): void {
        super.update();
        
        // Actualizar posición de la gema si existe
        const gemVisual = this.getData('gemVisual');
        if (gemVisual) {
            gemVisual.x = this.x;
            gemVisual.y = this.y;
        }
    }
}
```

### 3. Assets Necesarios
```typescript
// En AssetManifest.ts añadir:
{
    key: 'gem_glow',
    path: 'sprites/gems/glow.png'
},
{
    key: 'gem_star',
    path: 'sprites/gems/star.png'
},
{
    key: 'gem_particle',
    path: 'sprites/gems/particle.png'
},
{
    key: 'gem_appear',
    path: 'audio/gem_appear.mp3'
}
```

### 4. Integración en GameScene
```typescript
// En GameScene.ts
import { GemSystem } from '@/systems/gameplay/GemSystem';

export class GameScene extends Scene {
    private gemSystem: GemSystem;
    
    create(): void {
        // ... código existente ...
        
        // Inicializar sistema de gemas
        this.gemSystem = new GemSystem(this, this.bubbleGrid);
        
        // Comenzar spawn de gemas
        this.gemSystem.startGemSpawning();
    }
    
    // Pausar durante animaciones
    onComboStart(): void {
        this.rowSpawnSystem?.pause();
        this.gemSystem.pause();
    }
    
    onComboComplete(): void {
        this.rowSpawnSystem?.resume();
        this.gemSystem.resume();
    }
    
    // Cuando las burbujas se mueven (spawn de filas)
    onBubblesShifted(): void {
        // Actualizar posición de todas las gemas
        this.bubbleGrid.getAllBubbles().forEach(bubble => {
            if (bubble.hasGem()) {
                this.gemSystem.updateGemPosition(bubble);
            }
        });
    }
}
```

## Definition of Done
- [ ] Gemas aparecen según el timing especificado
- [ ] Visual de gemas claramente distinguible
- [ ] Animación de aparición suave
- [ ] Sonido al aparecer
- [ ] Gemas se mueven correctamente con las burbujas
- [ ] Sistema de fases funcionando (8s → 5s → 5s)
- [ ] 15% de probabilidad de gema dorada
- [ ] Sin memory leaks
- [ ] Probado en Ocean y Space

## Notas para QA
- Verificar que las gemas NUNCA aparecen en espacios vacíos
- Confirmar que máximo 1 gema por burbuja
- Validar que el visual es claro en ambas arenas
- Probar que las gemas se mueven correctamente cuando spawean filas
- Verificar timing: primera gema a los 3s, luego cada 8s

## Notas de Diseño
- El brillo dorado debe ser sutil para no distraer
- Las partículas deben ser mínimas en móvil
- El sonido de aparición debe ser satisfactorio pero no molesto

## Riesgos
- Performance con muchas partículas en móviles
- Claridad visual si hay muchas gemas en pantalla
- Sincronización futura en multiplayer