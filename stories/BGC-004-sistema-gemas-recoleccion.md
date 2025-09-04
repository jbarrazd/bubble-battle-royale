# USER STORY BGC-004: Sistema de Gemas - Recolección

## Información de la Historia
- **ID**: BGC-004
- **Título**: Implementar recolección de gemas al romper burbujas
- **Prioridad**: CRÍTICA
- **Estimación**: 4 puntos
- **Sprint**: 1
- **Estado**: Por hacer
- **Dependencias**: BGC-003 (Spawn y visual de gemas)

## Historia de Usuario
**Como** jugador  
**Quiero** recolectar gemas cuando rompo burbujas que las contienen  
**Para** avanzar hacia mi objetivo de conseguir 15 gemas y ganar  

## Contexto del GDD
Según el GDD Sección 4.3, la recolección de gemas tiene multiplicadores basados en el tamaño del combo. Combos más grandes dan más gemas por cada gema recolectada. Además, las cascadas dan bonuses adicionales.

## Criterios de Aceptación

### Recolección Básica
- [ ] **AC1**: Al romper una burbuja con gema, se recolecta automáticamente
- [ ] **AC2**: La gema vuela visualmente hacia el contador del jugador
- [ ] **AC3**: Sonido de recolección distintivo y satisfactorio
- [ ] **AC4**: El contador de gemas se actualiza después de la animación

### Multiplicadores por Combo
- [ ] **AC5**: Combo de 3-4 burbujas = 1 gema por cada gema en el combo
- [ ] **AC6**: Combo de 5-6 burbujas = 2 gemas por cada gema en el combo
- [ ] **AC7**: Combo de 7+ burbujas = 3 gemas por cada gema en el combo
- [ ] **AC8**: Mostrar multiplicador visual cuando aplica (x2, x3)

### Bonus por Cascada
- [ ] **AC9**: Gemas en burbujas que caen por cascada = 1 gema cada una
- [ ] **AC10**: Si caen 4-6 burbujas = +1 gema bonus
- [ ] **AC11**: Si caen 7+ burbujas = +2 gemas bonus
- [ ] **AC12**: Visual diferente para gemas obtenidas por cascada

### Feedback al Jugador
- [ ] **AC13**: Texto flotante mostrando "+1", "+2", etc al recolectar
- [ ] **AC14**: Efecto de partículas doradas al recolectar
- [ ] **AC15**: Combo grande con gemas = efecto especial "JACKPOT"

## Implementación Técnica

### 1. Extender GemSystem.ts
```typescript
// Añadir a src/systems/gameplay/GemSystem.ts

export interface CollectionResult {
    gemsCollected: number;
    multiplier: number;
    cascadeBonus: number;
    totalGems: number;
}

export class GemSystem {
    // ... código existente ...
    
    private playerGems: number = 0;
    private opponentGems: number = 0;
    private gemCounter: GemCounter; // UI component
    
    // Recolectar gemas de un combo
    collectGemsFromCombo(
        bubbles: Bubble[], 
        comboSize: number,
        isPlayer: boolean = true
    ): CollectionResult {
        let gemsInCombo = 0;
        const gemsToCollect: Gem[] = [];
        
        // Contar gemas en el combo
        bubbles.forEach(bubble => {
            const gem = bubble.getGem();
            if (gem) {
                gemsInCombo += gem.value; // 1 para normal, 3 para dorada
                gemsToCollect.push(gem);
                bubble.clearGem();
            }
        });
        
        // Calcular multiplicador según tamaño del combo
        const multiplier = this.getComboMultiplier(comboSize);
        const baseGems = gemsInCombo * multiplier;
        
        // Animar recolección
        gemsToCollect.forEach((gem, index) => {
            this.animateGemCollection(gem, isPlayer, index * 100);
        });
        
        // Actualizar contador
        const totalGems = baseGems;
        if (isPlayer) {
            this.playerGems += totalGems;
        } else {
            this.opponentGems += totalGems;
        }
        
        // Mostrar feedback
        if (totalGems > 0) {
            this.showCollectionFeedback(
                bubbles[0].x, 
                bubbles[0].y, 
                totalGems, 
                multiplier
            );
        }
        
        // Sonido según cantidad
        this.playCollectionSound(totalGems);
        
        return {
            gemsCollected: gemsInCombo,
            multiplier: multiplier,
            cascadeBonus: 0,
            totalGems: totalGems
        };
    }
    
    // Recolectar gemas de cascada
    collectGemsFromCascade(
        fallingBubbles: Bubble[],
        isPlayer: boolean = true
    ): CollectionResult {
        let gemsInCascade = 0;
        const gemsToCollect: Gem[] = [];
        
        // Contar gemas en la cascada
        fallingBubbles.forEach(bubble => {
            const gem = bubble.getGem();
            if (gem) {
                gemsInCascade += 1; // Cascada siempre da 1 por gema
                gemsToCollect.push(gem);
                bubble.clearGem();
            }
        });
        
        // Calcular bonus por tamaño de cascada
        const cascadeBonus = this.getCascadeBonus(fallingBubbles.length);
        const totalGems = gemsInCascade + cascadeBonus;
        
        // Animar recolección con efecto de cascada
        gemsToCollect.forEach((gem, index) => {
            this.animateGemCollection(gem, isPlayer, index * 50, true);
        });
        
        // Actualizar contador
        if (isPlayer) {
            this.playerGems += totalGems;
        } else {
            this.opponentGems += totalGems;
        }
        
        // Mostrar feedback de cascada
        if (totalGems > 0) {
            this.showCascadeFeedback(
                this.scene.cameras.main.centerX,
                this.scene.cameras.main.centerY,
                gemsInCascade,
                cascadeBonus
            );
        }
        
        return {
            gemsCollected: gemsInCascade,
            multiplier: 1,
            cascadeBonus: cascadeBonus,
            totalGems: totalGems
        };
    }
    
    private getComboMultiplier(comboSize: number): number {
        if (comboSize >= 7) return 3;
        if (comboSize >= 5) return 2;
        return 1; // 3-4 burbujas
    }
    
    private getCascadeBonus(cascadeSize: number): number {
        if (cascadeSize >= 7) return 2;
        if (cascadeSize >= 4) return 1;
        return 0;
    }
    
    private animateGemCollection(
        gem: Gem, 
        isPlayer: boolean, 
        delay: number = 0,
        isCascade: boolean = false
    ): void {
        if (!gem.sprite) return;
        
        // Destino (contador de gemas)
        const target = isPlayer 
            ? this.gemCounter.getPlayerPosition()
            : this.gemCounter.getOpponentPosition();
        
        // Crear copia visual para la animación
        const flyingGem = this.scene.add.image(
            gem.sprite.x,
            gem.sprite.y,
            'gem_star'
        );
        flyingGem.setScale(0.5);
        flyingGem.setTint(gem.type === GemType.GOLDEN ? 0xffd700 : 0xffffcc);
        
        // Trail de partículas
        const trail = this.scene.add.particles(flyingGem.x, flyingGem.y, 'gem_particle', {
            scale: { start: 0.3, end: 0 },
            alpha: { start: 1, end: 0 },
            speed: 0,
            lifespan: 500,
            frequency: 20,
            tint: 0xffd700,
            follow: flyingGem
        });
        
        // Eliminar visual original
        gem.sprite.destroy();
        this.gems.delete(gem.id);
        
        // Animar vuelo hacia contador
        this.scene.tweens.add({
            targets: flyingGem,
            x: target.x,
            y: target.y,
            scale: 0,
            duration: 800,
            delay: delay,
            ease: isCascade ? 'Sine.in' : 'Power2.in',
            onComplete: () => {
                flyingGem.destroy();
                trail.destroy();
                
                // Actualizar UI
                this.gemCounter.updateGems(this.playerGems, this.opponentGems);
                
                // Efecto en el contador
                this.gemCounter.playCollectAnimation();
            }
        });
        
        // Rotación durante el vuelo
        this.scene.tweens.add({
            targets: flyingGem,
            rotation: Math.PI * 4,
            duration: 800,
            delay: delay
        });
    }
    
    private showCollectionFeedback(
        x: number, 
        y: number, 
        gems: number, 
        multiplier: number
    ): void {
        // Texto principal
        const text = multiplier > 1 
            ? `+${gems} (x${multiplier}!)` 
            : `+${gems}`;
        
        const feedback = this.scene.add.text(x, y, text, {
            fontSize: multiplier > 2 ? '42px' : '32px',
            fontFamily: 'Arial Black',
            color: multiplier > 2 ? '#FFD700' : '#FFFF00',
            stroke: '#000000',
            strokeThickness: 4
        });
        feedback.setOrigin(0.5);
        
        // Animación
        this.scene.tweens.add({
            targets: feedback,
            y: y - 100,
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: multiplier > 1 ? 1.5 : 1.2 },
            duration: 1500,
            ease: 'Power2.out',
            onComplete: () => feedback.destroy()
        });
        
        // Efecto especial para combos grandes
        if (gems >= 5) {
            this.showJackpotEffect(x, y);
        }
    }
    
    private showCascadeFeedback(
        x: number, 
        y: number, 
        gems: number, 
        bonus: number
    ): void {
        const totalText = bonus > 0 
            ? `CASCADE!\n+${gems} +${bonus} bonus` 
            : `CASCADE!\n+${gems}`;
        
        const feedback = this.scene.add.text(x, y, totalText, {
            fontSize: '36px',
            fontFamily: 'Arial Black',
            color: '#00FFFF',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        });
        feedback.setOrigin(0.5);
        
        // Animación especial de cascada
        this.scene.tweens.add({
            targets: feedback,
            y: y + 50,
            alpha: { from: 1, to: 0 },
            scale: { from: 0.5, to: 1.5 },
            duration: 2000,
            ease: 'Bounce.out',
            onComplete: () => feedback.destroy()
        });
    }
    
    private showJackpotEffect(x: number, y: number): void {
        // Texto JACKPOT
        const jackpot = this.scene.add.text(x, y - 50, 'JACKPOT!', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            color: '#FFD700',
            stroke: '#FF0000',
            strokeThickness: 6
        });
        jackpot.setOrigin(0.5);
        jackpot.setScale(0);
        
        // Animación explosiva
        this.scene.tweens.add({
            targets: jackpot,
            scale: { from: 0, to: 1.5 },
            rotation: { from: -0.2, to: 0.2 },
            duration: 500,
            ease: 'Back.out',
            yoyo: true,
            onComplete: () => jackpot.destroy()
        });
        
        // Explosión de partículas
        const burst = this.scene.add.particles(x, y, 'gem_particle', {
            scale: { start: 1, end: 0 },
            alpha: { start: 1, end: 0 },
            speed: { min: 200, max: 400 },
            lifespan: 1000,
            quantity: 30,
            tint: [0xffd700, 0xffff00, 0xffffff]
        });
        
        this.scene.time.delayedCall(1000, () => burst.destroy());
    }
    
    private playCollectionSound(gems: number): void {
        if (gems === 0) return;
        
        if (gems >= 5) {
            this.scene.sound.play('gem_jackpot', { volume: 0.7 });
        } else if (gems >= 3) {
            this.scene.sound.play('gem_collect_big', { volume: 0.6 });
        } else {
            this.scene.sound.play('gem_collect', { volume: 0.5 });
        }
    }
    
    getPlayerGems(): number {
        return this.playerGems;
    }
    
    getOpponentGems(): number {
        return this.opponentGems;
    }
    
    setPlayerGems(amount: number): void {
        this.playerGems = Math.max(0, amount);
        this.gemCounter?.updateGems(this.playerGems, this.opponentGems);
    }
}
```

### 2. Integración con MatchDetectionSystem
```typescript
// Modificar src/systems/gameplay/MatchDetectionSystem.ts

export class MatchDetectionSystem {
    private gemSystem: GemSystem;
    
    // ... código existente ...
    
    onMatchFound(matchedBubbles: Bubble[]): void {
        const comboSize = matchedBubbles.length;
        
        // Recolectar gemas del combo
        const gemResult = this.gemSystem.collectGemsFromCombo(
            matchedBubbles,
            comboSize,
            true // isPlayer
        );
        
        // Procesar eliminación de burbujas
        this.removeBubbles(matchedBubbles);
        
        // Detectar cascada
        const fallingBubbles = this.detectFallingBubbles();
        if (fallingBubbles.length > 0) {
            // Recolectar gemas de la cascada
            const cascadeResult = this.gemSystem.collectGemsFromCascade(
                fallingBubbles,
                true
            );
            
            // Procesar caída
            this.processCascade(fallingBubbles);
        }
        
        // Notificar eventos para sonidos/efectos adicionales
        this.scene.events.emit('combo-completed', {
            size: comboSize,
            gems: gemResult.totalGems
        });
    }
}
```

### 3. Assets Adicionales
```typescript
// Añadir a AssetManifest.ts:
{
    key: 'gem_collect',
    path: 'audio/gem_collect.mp3'
},
{
    key: 'gem_collect_big',
    path: 'audio/gem_collect_big.mp3'
},
{
    key: 'gem_jackpot',
    path: 'audio/gem_jackpot.mp3'
}
```

## Definition of Done
- [ ] Gemas se recolectan al romper burbujas
- [ ] Animación de vuelo hacia contador funciona
- [ ] Multiplicadores aplicados correctamente (x1, x2, x3)
- [ ] Bonus de cascada calculado correctamente
- [ ] Feedback visual claro (+1, x2, JACKPOT)
- [ ] Sonidos de recolección según cantidad
- [ ] Contador se actualiza después de la animación
- [ ] Sin memory leaks con las animaciones
- [ ] Probado con combos de todos los tamaños

## Notas para QA
- Verificar multiplicadores: 3-4=x1, 5-6=x2, 7+=x3
- Confirmar cascada: 4-6=+1, 7+=+2 bonus
- Validar que las gemas doradas dan 3 puntos base
- Probar combos con múltiples gemas
- Verificar sonidos no se superponen molestos

## Riesgos
- Muchas animaciones simultáneas pueden afectar performance
- Sincronización del contador con animaciones
- Balance de multiplicadores puede necesitar ajustes