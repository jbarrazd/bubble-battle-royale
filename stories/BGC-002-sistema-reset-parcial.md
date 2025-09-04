# USER STORY BGC-002: Sistema de Reset Parcial por Campo Lleno

## Información de la Historia
- **ID**: BGC-002
- **Título**: Implementar sistema de reset parcial cuando el campo se llena
- **Prioridad**: CRÍTICA
- **Estimación**: 4 puntos
- **Sprint**: 1
- **Estado**: Por hacer
- **Dependencias**: 
  - BGC-001 (Spawn automático de filas)
  - BGC-003 (Sistema de gemas) - Para la pérdida de gemas

## Historia de Usuario
**Como** jugador  
**Quiero** tener una segunda oportunidad cuando mi campo se llena  
**Para** poder recuperarme de situaciones difíciles pero con penalización  

## Contexto del GDD
Según el GDD Sección 4.4, cuando el campo alcanza el límite NO es game over inmediato. En su lugar, se activa un sistema de reset parcial que:
- Limpia 4 filas superiores
- Penaliza al jugador con pérdida del 50% de sus gemas
- Da tiempo de recuperación pero con restricciones
- Las gemas perdidas se vuelven neutrales y cualquiera puede recogerlas

## Criterios de Aceptación

### Detección de Campo Lleno
- [ ] **AC1**: Campo lleno = burbujas alcanzan 2 filas del launcher (row 13 de 15)
- [ ] **AC2**: Verificación después de cada spawn de nueva fila
- [ ] **AC3**: Verificación después de cada disparo del jugador
- [ ] **AC4**: Solo se activa si NO estamos en muerte súbita

### Secuencia de Reset Parcial
- [ ] **AC5**: **FREEZE (0.5s)** - Todo el juego se pausa brevemente
- [ ] **AC6**: **PÉRDIDA DE GEMAS** - Jugador pierde 50% de sus gemas actuales (mínimo 2, máximo 7)
- [ ] **AC7**: **GEMAS NEUTRALES** - Las gemas perdidas aparecen como burbujas neutrales en el centro
- [ ] **AC8**: **LIMPIEZA** - Se eliminan las 4 filas superiores con animación de desvanecimiento
- [ ] **AC9**: **INMUNIDAD (3s)** - No se agregan nuevas filas durante este tiempo
- [ ] **AC10**: **PENALIZACIÓN (5s)** - Jugador no puede recoger gemas (solo limpiar)

### Feedback Visual Durante Reset
- [ ] **AC11**: Efecto de flash blanco cuando se activa el reset
- [ ] **AC12**: Las filas eliminadas se desvanecen con partículas
- [ ] **AC13**: Escudo visual semi-transparente durante inmunidad
- [ ] **AC14**: Icono de "No gemas" durante penalización
- [ ] **AC15**: Las gemas neutrales brillan en el centro para indicar que son recoletables

### Warnings Pre-Reset
- [ ] **AC16**: **3 filas para reset** → Bordes amarillos pulsantes
- [ ] **AC17**: **2 filas para reset** → Bordes naranjas + temblor suave
- [ ] **AC18**: **1 fila para reset** → Bordes rojos + alarma visual

### Muerte Súbita (después de 2:30)
- [ ] **AC19**: En muerte súbita, campo lleno = GAME OVER (sin reset)
- [ ] **AC20**: Mostrar indicador de "SUDDEN DEATH" cuando se activa

## Implementación Técnica

### 1. Crear ResetSystem.ts
```typescript
// src/systems/gameplay/ResetSystem.ts
import { GameScene } from '@/scenes/GameScene';
import { BubbleGrid } from './BubbleGrid';
import { GemSystem } from './GemSystem';
import { ARENA_CONFIG, GRID_CONFIG } from '@/config/ArenaConfig';

export interface ResetState {
    isResetting: boolean;
    immunityActive: boolean;
    penaltyActive: boolean;
    immunityEndTime: number;
    penaltyEndTime: number;
}

export class ResetSystem {
    private scene: GameScene;
    private grid: BubbleGrid;
    private gemSystem: GemSystem;
    private resetState: ResetState = {
        isResetting: false,
        immunityActive: false,
        penaltyActive: false,
        immunityEndTime: 0,
        penaltyEndTime: 0
    };
    
    private readonly DEATH_ROW = 13; // De 15 total
    private readonly ROWS_TO_CLEAR = 4;
    private readonly GEM_LOSS_PERCENTAGE = 0.5;
    private readonly IMMUNITY_DURATION = 3000; // 3 segundos
    private readonly PENALTY_DURATION = 5000; // 5 segundos
    
    constructor(scene: GameScene, grid: BubbleGrid, gemSystem: GemSystem) {
        this.scene = scene;
        this.grid = grid;
        this.gemSystem = gemSystem;
    }
    
    checkResetCondition(): boolean {
        // No reset en muerte súbita
        if (this.scene.isInSuddenDeath()) {
            return false;
        }
        
        // Verificar si hay burbujas en la línea de muerte
        for (let col = 0; col < this.grid.cols; col++) {
            if (this.grid.getBubbleAt(this.DEATH_ROW, col)) {
                return true;
            }
        }
        
        return false;
    }
    
    async executeReset(): Promise<void> {
        if (this.resetState.isResetting) return;
        
        this.resetState.isResetting = true;
        
        // 1. FREEZE - Pausar todo
        await this.freezeGame(500);
        
        // 2. Calcular y quitar gemas
        const gemsLost = this.calculateGemLoss();
        await this.removePlayerGems(gemsLost);
        
        // 3. Crear gemas neutrales
        await this.createNeutralGems(gemsLost);
        
        // 4. Limpiar filas superiores
        await this.clearTopRows();
        
        // 5. Activar inmunidad
        this.activateImmunity();
        
        // 6. Activar penalización
        this.activatePenalty();
        
        this.resetState.isResetting = false;
    }
    
    private async freezeGame(duration: number): Promise<void> {
        // Mostrar flash blanco
        const flash = this.scene.add.rectangle(
            ARENA_CONFIG.width / 2,
            ARENA_CONFIG.height / 2,
            ARENA_CONFIG.width,
            ARENA_CONFIG.height,
            0xffffff,
            0.8
        );
        
        // Pausar física y sistemas
        this.scene.physics.pause();
        this.scene.rowSpawnSystem?.pause();
        
        await this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            duration: duration,
            onComplete: () => flash.destroy()
        });
        
        // Reanudar física
        this.scene.physics.resume();
    }
    
    private calculateGemLoss(): number {
        const currentGems = this.gemSystem.getPlayerGems();
        const gemsToLose = Math.floor(currentGems * this.GEM_LOSS_PERCENTAGE);
        
        // Límites según el GDD
        return Math.max(Math.min(gemsToLose, 7), currentGems > 0 ? 2 : 0);
    }
    
    private async removePlayerGems(amount: number): Promise<void> {
        const currentGems = this.gemSystem.getPlayerGems();
        const newGemCount = Math.max(0, currentGems - amount);
        
        // Animación de pérdida de gemas
        const gemCounter = this.scene.ui.gemCounter;
        
        await this.scene.tweens.add({
            targets: gemCounter,
            scaleX: 1.2,
            scaleY: 1.2,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            onComplete: () => {
                this.gemSystem.setPlayerGems(newGemCount);
                gemCounter.clearTint();
            }
        });
    }
    
    private async createNeutralGems(count: number): Promise<void> {
        // Las gemas neutrales aparecen en el centro del campo
        const centerX = ARENA_CONFIG.width / 2;
        const centerY = ARENA_CONFIG.height / 2;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const radius = 50 + (i * 10);
            
            const gem = this.gemSystem.createNeutralGem({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
            
            // Animación de aparición
            gem.setScale(0);
            this.scene.tweens.add({
                targets: gem,
                scale: 1,
                duration: 500,
                delay: i * 50,
                ease: 'Back.out'
            });
        }
    }
    
    private async clearTopRows(): Promise<void> {
        const bubblesToClear = [];
        
        // Recolectar burbujas a eliminar
        for (let row = 0; row < this.ROWS_TO_CLEAR; row++) {
            for (let col = 0; col < this.grid.cols; col++) {
                const bubble = this.grid.getBubbleAt(row, col);
                if (bubble) {
                    bubblesToClear.push(bubble);
                    this.grid.removeBubble(row, col);
                }
            }
        }
        
        // Animar desvanecimiento
        await this.scene.tweens.add({
            targets: bubblesToClear,
            alpha: 0,
            scale: 0.5,
            duration: 500,
            onComplete: () => {
                bubblesToClear.forEach(b => b.destroy());
            }
        });
        
        // Crear partículas de desintegración
        bubblesToClear.forEach(bubble => {
            this.createDisintegrationParticles(bubble.x, bubble.y);
        });
    }
    
    private createDisintegrationParticles(x: number, y: number): void {
        const particles = this.scene.add.particles(x, y, 'bubble_particle', {
            scale: { start: 0.5, end: 0 },
            speed: { min: 100, max: 200 },
            quantity: 5,
            lifespan: 500,
            alpha: { start: 1, end: 0 }
        });
        
        this.scene.time.delayedCall(500, () => particles.destroy());
    }
    
    private activateImmunity(): void {
        this.resetState.immunityActive = true;
        this.resetState.immunityEndTime = this.scene.time.now + this.IMMUNITY_DURATION;
        
        // Visual de escudo
        const shield = this.scene.add.image(
            ARENA_CONFIG.width / 2,
            ARENA_CONFIG.height - 100,
            'shield_icon'
        );
        shield.setAlpha(0.5);
        shield.setScale(2);
        
        this.scene.tweens.add({
            targets: shield,
            alpha: { from: 0.5, to: 0.2 },
            scale: { from: 2, to: 2.2 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                shield.destroy();
                this.resetState.immunityActive = false;
                this.scene.rowSpawnSystem?.resume();
            }
        });
    }
    
    private activatePenalty(): void {
        this.resetState.penaltyActive = true;
        this.resetState.penaltyEndTime = this.scene.time.now + this.PENALTY_DURATION;
        
        // Visual de penalización (icono de no gemas)
        const penaltyIcon = this.scene.add.image(
            ARENA_CONFIG.width - 50,
            50,
            'no_gems_icon'
        );
        penaltyIcon.setAlpha(0.8);
        
        // Parpadeo del icono
        this.scene.tweens.add({
            targets: penaltyIcon,
            alpha: { from: 0.8, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                penaltyIcon.destroy();
                this.resetState.penaltyActive = false;
            }
        });
    }
    
    canCollectGems(): boolean {
        return !this.resetState.penaltyActive;
    }
    
    isImmune(): boolean {
        return this.resetState.immunityActive;
    }
    
    getWarningLevel(): 'safe' | 'warning' | 'critical' | 'danger' {
        const lowestRow = this.findLowestBubbleRow();
        
        if (lowestRow >= this.DEATH_ROW - 1) return 'danger';
        if (lowestRow >= this.DEATH_ROW - 2) return 'critical';
        if (lowestRow >= this.DEATH_ROW - 3) return 'warning';
        return 'safe';
    }
    
    private findLowestBubbleRow(): number {
        for (let row = this.grid.rows - 1; row >= 0; row--) {
            for (let col = 0; col < this.grid.cols; col++) {
                if (this.grid.getBubbleAt(row, col)) {
                    return row;
                }
            }
        }
        return -1;
    }
    
    update(time: number, delta: number): void {
        // Actualizar estados temporales
        if (this.resetState.immunityActive && time > this.resetState.immunityEndTime) {
            this.resetState.immunityActive = false;
            this.scene.rowSpawnSystem?.resume();
        }
        
        if (this.resetState.penaltyActive && time > this.resetState.penaltyEndTime) {
            this.resetState.penaltyActive = false;
        }
    }
}
```

### 2. Integración con GameScene
```typescript
// En GameScene.ts
import { ResetSystem } from '@/systems/gameplay/ResetSystem';

export class GameScene extends Scene {
    private resetSystem: ResetSystem;
    private suddenDeathTime = 150000; // 2:30 minutos
    
    create(): void {
        // ... código existente ...
        
        // Sistema de reset requiere sistema de gemas
        this.resetSystem = new ResetSystem(this, this.bubbleGrid, this.gemSystem);
    }
    
    update(time: number, delta: number): void {
        // Actualizar sistema de reset
        this.resetSystem.update(time, delta);
        
        // Verificar condición de reset
        if (this.resetSystem.checkResetCondition()) {
            // En muerte súbita es game over directo
            if (this.isInSuddenDeath()) {
                this.triggerGameOver();
            } else {
                // Reset parcial
                this.resetSystem.executeReset();
            }
        }
        
        // Actualizar warnings visuales
        this.updateFieldWarnings();
    }
    
    isInSuddenDeath(): boolean {
        return this.time.now > this.suddenDeathTime;
    }
    
    onRowSpawned(): void {
        // No spawn durante inmunidad
        if (this.resetSystem.isImmune()) {
            return;
        }
        
        // Verificar si necesita reset
        if (this.resetSystem.checkResetCondition()) {
            if (this.isInSuddenDeath()) {
                this.triggerGameOver();
            } else {
                this.resetSystem.executeReset();
            }
        }
    }
    
    // Modificar recolección de gemas
    collectGem(gem: Gem): void {
        if (!this.resetSystem.canCollectGems()) {
            // Mostrar feedback de "no puedes recoger"
            this.showPenaltyFeedback();
            return;
        }
        
        // Recolección normal
        this.gemSystem.collectGem(gem);
    }
}
```

## Definition of Done
- [ ] Sistema detecta cuando el campo está lleno
- [ ] Reset parcial ejecuta todas las fases en orden
- [ ] Se eliminan correctamente 4 filas superiores
- [ ] Pérdida del 50% de gemas (mín 2, máx 7)
- [ ] Gemas neutrales aparecen en el centro
- [ ] Inmunidad de 3 segundos funciona
- [ ] Penalización de 5 segundos impide recoger gemas
- [ ] Warnings visuales en 3 niveles
- [ ] En muerte súbita = game over directo
- [ ] Animaciones fluidas sin drops de FPS
- [ ] Sin memory leaks

## Notas para QA
- El reset solo ocurre en juego normal, NO en muerte súbita
- Las gemas neutrales deben ser recolectables por ambos jugadores
- La inmunidad debe prevenir SOLO el spawn de filas, no otras mecánicas
- La penalización solo afecta recolección de gemas, no eliminar burbujas
- Verificar que no se puede abusar del reset intencionalmente

## Dependencias
- BGC-003: Sistema de gemas (para la pérdida y gemas neutrales)
- BGC-001: Spawn de filas (para pausar durante inmunidad)

## Riesgos
- Sincronización en multiplayer de las gemas neutrales
- Balance: ¿Es muy generoso o muy punitivo?
- Performance de las animaciones en móviles