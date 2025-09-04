# USER STORY BGC-001: Sistema de Spawn Automático de Filas

## Información de la Historia
- **ID**: BGC-001
- **Título**: Implementar spawn automático de filas de burbujas
- **Prioridad**: CRÍTICA
- **Estimación**: 5 puntos
- **Sprint**: 1
- **Estado**: Por hacer

## Historia de Usuario
**Como** jugador  
**Quiero** que aparezcan nuevas filas de burbujas automáticamente desde arriba  
**Para** sentir presión constante y tener que gestionar mi campo activamente  

## Contexto Técnico
Según el GDD, las filas deben aparecer periódicamente para crear presión. Esta es la mecánica fundamental que hace que el juego sea desafiante, forzando al jugador a limpiar burbujas constantemente.

## Criterios de Aceptación

### Funcionalidad Core
- [ ] **AC1**: Nueva fila aparece cada 6 segundos (configurable)
- [ ] **AC2**: La fila se añade en la parte superior (row 0)
- [ ] **AC3**: Todas las burbujas existentes se desplazan 1 fila hacia abajo
- [ ] **AC4**: Patrón de la nueva fila es aleatorio usando colores disponibles
- [ ] **AC5**: Animación suave de 300ms al desplazar burbujas

### Configuración por Arena
- [ ] **AC6**: Ocean - spawn cada 6000ms
- [ ] **AC7**: Space - spawn cada 5500ms
- [ ] **AC8**: Timer se pausa durante animaciones de combo/cascada

### Integración
- [ ] **AC9**: Compatible con el sistema de grilla hexagonal existente
- [ ] **AC10**: No interfiere con burbujas en movimiento (proyectiles)

## Implementación Técnica

### 1. Crear RowSpawnSystem.ts
```typescript
// src/systems/gameplay/RowSpawnSystem.ts
import { GameScene } from '@/scenes/GameScene';
import { BubbleGrid } from './BubbleGrid';
import { BUBBLE_CONFIG } from '@/config/ArenaConfig';

export class RowSpawnSystem {
    private scene: GameScene;
    private grid: BubbleGrid;
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private spawnInterval: number = 6000;
    private isPaused: boolean = false;
    
    constructor(scene: GameScene, grid: BubbleGrid) {
        this.scene = scene;
        this.grid = grid;
    }
    
    startSpawning(interval: number = 6000): void {
        this.spawnInterval = interval;
        
        this.spawnTimer = this.scene.time.addEvent({
            delay: this.spawnInterval,
            callback: this.spawnNewRow,
            callbackScope: this,
            loop: true
        });
    }
    
    private spawnNewRow(): void {
        if (this.isPaused) return;
        
        // Generar patrón aleatorio
        const newRow = this.generateRandomRow();
        
        // Desplazar todas las burbujas hacia abajo
        this.grid.shiftAllBubblesDown();
        
        // Añadir nueva fila arriba
        this.grid.addRowAtTop(newRow);
        
        // Animar el desplazamiento
        this.animateShift();
    }
    
    private generateRandomRow(): number[] {
        const row: number[] = [];
        const colors = BUBBLE_CONFIG.COLORS;
        
        for (let col = 0; col < this.grid.cols; col++) {
            // 80% probabilidad de tener burbuja, 20% espacio vacío
            if (Math.random() < 0.8) {
                row.push(Math.floor(Math.random() * colors));
            } else {
                row.push(-1); // Espacio vacío
            }
        }
        
        return row;
    }
    
    private animateShift(): void {
        // Implementar animación suave
        this.scene.tweens.add({
            targets: this.grid.getAllBubbles(),
            y: '+=70', // BUBBLE_CONFIG.SIZE
            duration: 300,
            ease: 'Power2'
        });
    }
    
    pause(): void {
        this.isPaused = true;
    }
    
    resume(): void {
        this.isPaused = false;
    }
    
    destroy(): void {
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
        }
    }
}
```

### 2. Modificar BubbleGrid.ts
```typescript
// Añadir estos métodos a BubbleGrid.ts

shiftAllBubblesDown(): void {
    // Mover todas las burbujas una posición hacia abajo
    for (let row = this.rows - 1; row > 0; row--) {
        for (let col = 0; col < this.cols; col++) {
            this.grid[row][col] = this.grid[row - 1][col];
            
            // Actualizar posición visual
            if (this.grid[row][col]) {
                const newPos = this.gridToWorld(row, col);
                this.grid[row][col].gridPosition = { row, col };
            }
        }
    }
    
    // Limpiar la fila superior
    for (let col = 0; col < this.cols; col++) {
        this.grid[0][col] = null;
    }
}

addRowAtTop(pattern: number[]): void {
    for (let col = 0; col < Math.min(pattern.length, this.cols); col++) {
        if (pattern[col] >= 0) {
            // Crear nueva burbuja
            const bubble = this.createBubble(0, col, pattern[col]);
            this.grid[0][col] = bubble;
        }
    }
}

getAllBubbles(): Bubble[] {
    const bubbles: Bubble[] = [];
    for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
            if (this.grid[row][col]) {
                bubbles.push(this.grid[row][col]);
            }
        }
    }
    return bubbles;
}
```

### 3. Configuración en GameConfig.ts
```typescript
// src/config/GameConfig.ts
export const ROW_SPAWN_CONFIG = {
    ocean: {
        interval: 6000,
        pattern: 'random',
        colors: 5
    },
    space: {
        interval: 5500,
        pattern: 'random',
        colors: 5
    },
    volcanic: {
        interval: 5000,
        pattern: 'random',
        colors: 5
    },
    crystal: {
        interval: 4000,
        pattern: 'random',
        colors: 6
    }
};
```

### 4. Integración en GameScene
```typescript
// En GameScene.ts
private rowSpawnSystem: RowSpawnSystem;

create(): void {
    // ... existing code ...
    
    // Inicializar sistema de spawn
    this.rowSpawnSystem = new RowSpawnSystem(this, this.bubbleGrid);
    
    // Obtener configuración según arena
    const arenaConfig = ROW_SPAWN_CONFIG[this.currentArena];
    
    // Iniciar spawn automático
    this.rowSpawnSystem.startSpawning(arenaConfig.interval);
}

// Pausar durante combos
onComboStart(): void {
    this.rowSpawnSystem.pause();
}

onComboComplete(): void {
    this.rowSpawnSystem.resume();
}
```

## Definition of Done
- [ ] Código implementado y funcionando
- [ ] Sin errores en consola
- [ ] Animaciones fluidas a 60fps en desktop, 30fps en mobile
- [ ] Probado en Ocean y Space
- [ ] Timer pausable/resumible durante combos
- [ ] Integrado con GameScene existente
- [ ] No rompe mecánicas existentes
- [ ] Spawn configurable por arena

## Notas para QA
- Verificar que el timer se pausa durante las animaciones de combo
- Confirmar que las burbujas no se superponen al desplazarse
- Validar que los espacios vacíos se mantienen al desplazar
- Probar en dispositivos iOS y Android

## Dependencias
- Sistema de grilla hexagonal existente (BubbleGrid.ts)
- GameScene funcional
- Sistema de burbujas (Bubble.ts)

## Riesgos
- Performance en dispositivos móviles con muchas burbujas
- Sincronización con animaciones de combo
- Posibles colisiones con proyectiles en vuelo