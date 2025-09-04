# 🎮 BUBBLE GEMS CLASH - Game Design Document Final v3.0

## **DOCUMENTO TÉCNICO DE PRODUCCIÓN**

---

## **TABLA DE CONTENIDOS**
1. [Información General](#1-información-general)
2. [Arquitectura Técnica](#2-arquitectura-técnica)
3. [Sistema de Autenticación](#3-sistema-de-autenticación)
4. [Mecánica Core: Sistema de Gemas](#4-mecánica-core-sistema-de-gemas)
5. [Sistema de Arsenal](#5-sistema-de-arsenal)
6. [Sistema Online y Matchmaking](#6-sistema-online-y-matchmaking)
7. [Progresión y Arenas](#7-progresión-y-arenas)
8. [Monetización](#8-monetización)
9. [Implementación por Fases](#9-implementación-por-fases)
10. [Especificaciones Técnicas](#10-especificaciones-técnicas)

---

## **1. INFORMACIÓN GENERAL**

### **1.1 Concepto del Juego**
Bubble shooter PvP competitivo en tiempo real donde dos jugadores compiten por recolectar 15 gemas eliminando burbujas estratégicamente, usando poderes de arsenal y progresando a través de arenas temáticas basadas en ELO.

### **1.2 Plataformas Target**
- iOS (iPhone 6s+)
- Android (API 21+)
- Web (Chrome, Safari, Firefox)

### **1.3 Stack Tecnológico Existente**
```
Frontend:    Phaser 3.70+ (TypeScript)
Build:       Vite 5.0
Mobile:      Capacitor 5.0
Backend:     Firebase (Realtime DB + Functions + Auth)
Assets:      /public/assets/ (optimizados)
```

### **1.4 Assets y Sistemas Existentes**
✅ Motor de bubble shooter funcional
✅ Sistema de físicas y colisiones
✅ 5 arenas temáticas con animaciones
✅ Sistema de partículas y efectos
✅ Backgrounds animados (peces, espacio, etc.)
✅ Build multiplataforma funcionando

---

## **2. ARQUITECTURA TÉCNICA**

### **2.1 Estructura del Proyecto**
```
/game
├── /src
│   ├── /scenes
│   │   ├── LoginScene.ts      [NUEVO]
│   │   ├── MenuScene.ts       [NUEVO]
│   │   ├── MatchmakingScene.ts[NUEVO]
│   │   ├── GameScene.ts       [EXISTENTE - Modificar]
│   │   └── ResultScene.ts     [NUEVO]
│   ├── /systems
│   │   ├── /network
│   │   │   ├── FirebaseService.ts [NUEVO]
│   │   │   ├── MatchmakingService.ts [NUEVO]
│   │   │   └── RealtimeSync.ts [NUEVO]
│   │   ├── /gameplay
│   │   │   ├── GemSystem.ts   [NUEVO]
│   │   │   ├── ArsenalSystem.ts [MODIFICAR]
│   │   │   └── ComboSystem.ts [NUEVO]
│   │   └── /visual
│   │       └── BackgroundSystem.ts [EXISTENTE]
│   └── /config
│       ├── GameConfig.ts      [MODIFICAR]
│       └── FirebaseConfig.ts  [NUEVO]
├── /public
│   └── /assets               [EXISTENTE]
└── /firebase
    └── /functions           [NUEVO]
```

### **2.2 Firebase Configuration**
```typescript
// src/config/FirebaseConfig.ts
export const FIREBASE_CONFIG = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "bubblegems.firebaseapp.com",
  databaseURL: "https://bubblegems.firebaseio.com",
  projectId: "bubblegems",
  storageBucket: "bubblegems.appspot.com",
  messagingSenderId: "xxx",
  appId: "xxx"
};
```

---

## **3. SISTEMA DE AUTENTICACIÓN**

### **3.1 Flujo de Autenticación**

```
APP START → Check Auth State
    ↓
Si NO autenticado → Login Screen
    ├─ Google Sign In
    ├─ Apple Sign In (iOS)
    └─ Guest Mode (limitado)
    
Si autenticado → Main Menu
    └─ Sync con Firebase
```

### **3.2 Modelo de Usuario**

```typescript
interface UserProfile {
  // Identificación
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  isGuest: boolean;
  
  // Progresión
  elo: number;              // 0-5000+
  arena: ArenaType;         // 'ocean'|'neon'|'volcanic'|'space'|'crystal'
  level: number;            // 1-100
  experience: number;
  
  // Estadísticas
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    winStreak: number;
    bestWinStreak: number;
    totalGems: number;
    totalCombos: number;
    biggestCombo: number;
  };
  
  // Economía
  currency: {
    coins: number;          // Moneda gratis
    gems: number;           // Moneda premium
  };
  
  // Cosméticos
  cosmetics: {
    owned: string[];        // IDs de items
    equipped: {
      bubbleTrail: string;
      explosionEffect: string;
      avatar: string;
      frame: string;
    };
  };
  
  // Metadata
  createdAt: number;
  lastLogin: number;
  lastMatch: number;
  device: 'ios'|'android'|'web';
}
```

### **3.3 Limitaciones Guest Mode**
- Máximo ELO: 1000 (solo Ocean Arena)
- No puede realizar compras
- Sin acceso a leaderboards globales
- Conversión a cuenta real preserva progreso

---

## **4. MECÁNICA CORE: SISTEMA DE GEMAS**

### **4.1 Reglas de Victoria**
- **Objetivo**: Primer jugador en recolectar 15 gemas
- **Victoria alternativa**: Oponente pierde por campo lleno
- **Tiempo límite**: 3 minutos → Muerte súbita

### **4.2 Sistema de Spawn de Gemas**

```typescript
interface GemSpawnConfig {
  ocean:    { rates: [8000, 5000, 5000] },    // ms por fase
  neon:     { rates: [7000, 5000, 4000] },
  volcanic: { rates: [6000, 4000, 3000] },
  space:    { rates: [6000, 4000, 3000] },
  crystal:  { rates: [5000, 3000, 3000] }
}

class GemSystem {
  private phase: number = 0; // 0-2
  
  spawnGem(): void {
    const position = this.getRandomBubblePosition();
    const type = Math.random() < 0.15 ? 'golden' : 'normal';
    
    const gem: Gem = {
      id: generateId(),
      position: position,
      type: type,
      value: type === 'golden' ? 3 : 1,
      sprite: null
    };
    
    // Sincronizar con ambos jugadores
    this.syncGemSpawn(gem);
  }
}
```

### **4.3 Sistema de Recolección**

```typescript
interface ComboRewards {
  directCombo: {
    '3-4': 1,   // 1 gema por cada gema en el combo
    '5-6': 2,   // 2 gemas por cada gema en el combo
    '7+': 3     // 3 gemas por cada gema en el combo
  },
  cascadeBonus: {
    '0-3': 0,   // Sin bonus
    '4-6': 1,   // +1 gema extra
    '7+': 2     // +2 gemas extra
  },
  stealing: {
    '8-9': 1,   // Roba 1 gema
    '10+': 2    // Roba 2 gemas
  }
}
```

### **4.4 Sistema de Reset (Muerte)**

```typescript
class DeathSystem {
  handlePlayerDeath(player: Player): void {
    // 1. Calcular pérdida
    const gemsLost = Math.floor(player.gems * 0.5);
    const gemsToKeep = player.gems - gemsLost;
    
    // 2. Crear gemas neutrales
    for(let i = 0; i < gemsLost; i++) {
      this.createNeutralGem();
    }
    
    // 3. Limpiar campo
    this.clearRows(player.field, 4); // Elimina 4 filas superiores
    
    // 4. Aplicar inmunidad
    player.immunity = true;
    setTimeout(() => player.immunity = false, 3000);
    
    // 5. Aplicar penalización
    player.canCollectGems = false;
    setTimeout(() => player.canCollectGems = true, 5000);
    
    // 6. Actualizar UI
    player.gems = gemsToKeep;
    this.updateUI();
  }
}
```

---

## **5. SISTEMA DE ARSENAL**

### **5.1 Mecánica de Burbujas Arsenal**

```typescript
interface ArsenalBubble {
  type: 'arsenal';
  power: ArsenalPowerType;
  position: { row: number, col: number };
  remainingTime: number;      // Tiempo hasta rotar
  sprite: Phaser.GameObjects.Sprite;
  powerIcon: Phaser.GameObjects.Sprite;
}
```

### **5.2 Catálogo de Poderes**

```typescript
enum ArsenalPowerType {
  // EFECTOS INSTANTÁNEOS
  LIGHTNING = 'lightning',    // Elimina columna completa
  BOMB = 'bomb',              // Explota área 3x3
  FREEZE = 'freeze',          // Congela spawn 8s
  
  // EFECTOS PRÓXIMO TIRO
  LASER = 'laser',            // Guía completa + atraviesa 1 fila
  RAINBOW = 'rainbow',        // Matchea cualquier color
  TRIPLE = 'triple',          // Dispara 3 burbujas
  
  // SABOTAJE
  CHAOS = 'chaos',            // Randomiza 7 burbujas enemigas
  BLOCK = 'block',            // Añade 3 grises al enemigo
  STEAL = 'steal'             // Intercambia gemas
}

const ARSENAL_POWERS = {
  [ArsenalPowerType.LIGHTNING]: {
    icon: '⚡',
    color: 0xFFFF00,
    instant: true,
    effect: (game, position) => {
      game.clearColumn(position.col);
      game.playEffect('lightning', position);
    }
  },
  [ArsenalPowerType.LASER]: {
    icon: '🎯',
    color: 0xFF0000,
    instant: false,
    duration: 1, // próximo tiro
    effect: (game, player) => {
      player.nextShotModifiers.push('pierce');
      player.nextShotModifiers.push('guideline');
    }
  }
  // ... resto de poderes
};
```

### **5.3 Sistema de Rotación**

```typescript
class ArsenalRotationSystem {
  private rotationPatterns = {
    ocean:    ['lightning', 'freeze', 'laser'],
    neon:     ['bomb', 'rainbow', 'steal'],
    volcanic: ['chaos', 'triple', 'block'],
    space:    ['steal', 'laser', 'chaos'],
    crystal:  ['chaos', 'steal', 'triple', 'bomb', 'lightning'] // Más opciones
  };
  
  private rotationSpeeds = {
    ocean:    15000,  // 15s
    neon:     12000,  // 12s
    volcanic: 10000,  // 10s
    space:    8000,   // 8s
    crystal:  6000    // 6s - Muy rápido
  };
  
  update(arsenalBubble: ArsenalBubble, deltaTime: number): void {
    arsenalBubble.remainingTime -= deltaTime;
    
    if(arsenalBubble.remainingTime <= 0) {
      this.rotatePower(arsenalBubble);
      arsenalBubble.remainingTime = this.rotationSpeeds[this.currentArena];
    }
    
    // Actualizar visual del timer
    this.updateTimerVisual(arsenalBubble);
  }
}
```

### **5.4 Spawn y Distribución**

```typescript
const ARSENAL_SPAWN_CONFIG = {
  ocean: {
    spawnInterval: 20000,    // cada 20s
    maxSimultaneous: 1
  },
  neon: {
    spawnInterval: 18000,
    maxSimultaneous: 1
  },
  volcanic: {
    spawnInterval: 15000,
    maxSimultaneous: 2
  },
  space: {
    spawnInterval: 12000,
    maxSimultaneous: 2
  },
  crystal: {
    spawnInterval: 10000,    // cada 10s
    maxSimultaneous: 3       // hasta 3 simultáneos!
  }
};
```

---

## **6. SISTEMA ONLINE Y MATCHMAKING**

### **6.1 Estructura Firebase Realtime Database**

```javascript
{
  "users": {
    "userId": {
      "profile": { /* UserProfile */ },
      "presence": {
        "online": true,
        "lastSeen": timestamp
      }
    }
  },
  
  "matchmaking": {
    "queues": {
      "ocean": {
        "userId": {
          "elo": 500,
          "timestamp": 1234567890,
          "region": "NA"
        }
      }
    }
  },
  
  "matches": {
    "matchId": {
      "metadata": {
        "arena": "volcanic",
        "startTime": timestamp,
        "status": "playing" // waiting|playing|finished
      },
      "players": {
        "player1": "userId1",
        "player2": "userId2"
      },
      "gameState": {
        "currentTurn": 0,
        "gems": {
          "gemId": { position: {}, type: "normal" }
        },
        "arsenals": {
          "arsenalId": { position: {}, power: "lightning" }
        },
        "player1State": {
          "gems": 5,
          "field": [ /* array 2D de burbujas */ ],
          "modifiers": []
        },
        "player2State": { /* igual */ }
      },
      "events": [
        {
          "type": "shot",
          "player": "player1",
          "data": { /* shot data */ },
          "timestamp": timestamp
        }
      ],
      "result": {
        "winner": null,
        "reason": null // "gems"|"elimination"|"timeout"|"disconnect"
      }
    }
  },
  
  "leaderboards": {
    "global": {
      "userId": {
        "displayName": "Player",
        "elo": 4500,
        "arena": "crystal",
        "wins": 500
      }
    },
    "byArena": {
      "crystal": { /* top 100 */ }
    },
    "weekly": { /* reset semanal */ }
  }
}
```

### **6.2 Servicio de Matchmaking**

```typescript
class MatchmakingService {
  private readonly ELO_RANGES = [200, 400, 600, 1000]; // Expansión progresiva
  private readonly TIMEOUT_BOT = 10000; // 10s para bot
  
  async findMatch(player: Player): Promise<Match> {
    const queue = `matchmaking/queues/${player.arena}`;
    
    // 1. Agregar a cola
    await firebase.database()
      .ref(`${queue}/${player.uid}`)
      .set({
        elo: player.elo,
        timestamp: Date.now(),
        region: player.region
      });
    
    // 2. Buscar oponente
    for(const range of this.ELO_RANGES) {
      const opponent = await this.searchInRange(player.elo, range);
      if(opponent) {
        return this.createMatch(player, opponent);
      }
      await this.wait(2000); // Esperar 2s antes de expandir
    }
    
    // 3. Crear bot si no hay oponentes
    return this.createBotMatch(player);
  }
  
  private async createMatch(p1: Player, p2: Player): Promise<Match> {
    const matchId = generateMatchId();
    
    // Crear estructura del match
    const matchData = {
      metadata: {
        arena: p1.arena,
        startTime: Date.now(),
        status: 'waiting'
      },
      players: {
        player1: p1.uid,
        player2: p2.uid
      },
      gameState: this.createInitialGameState()
    };
    
    // Guardar en Firebase
    await firebase.database()
      .ref(`matches/${matchId}`)
      .set(matchData);
    
    // Remover de cola
    await this.removeFromQueue(p1);
    await this.removeFromQueue(p2);
    
    return matchId;
  }
}
```

### **6.3 Sincronización en Tiempo Real**

```typescript
class RealtimeGameSync {
  private matchRef: DatabaseReference;
  private localEvents: GameEvent[] = [];
  private processedEvents: Set<string> = new Set();
  
  constructor(matchId: string) {
    this.matchRef = firebase.database().ref(`matches/${matchId}`);
    this.setupListeners();
  }
  
  // Enviar acción local
  async sendAction(action: GameAction): Promise<void> {
    const event: GameEvent = {
      id: generateEventId(),
      type: action.type,
      player: this.localPlayer.id,
      data: action.data,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    await this.matchRef.child('events').push(event);
  }
  
  // Escuchar eventos
  private setupListeners(): void {
    // Nuevos eventos
    this.matchRef.child('events').on('child_added', (snapshot) => {
      const event = snapshot.val();
      if(!this.processedEvents.has(event.id)) {
        this.processEvent(event);
        this.processedEvents.add(event.id);
      }
    });
    
    // Cambios de estado
    this.matchRef.child('gameState').on('value', (snapshot) => {
      const state = snapshot.val();
      this.syncGameState(state);
    });
  }
  
  // Procesar evento
  private processEvent(event: GameEvent): void {
    if(event.player === this.localPlayer.id) return; // Ignorar propios
    
    switch(event.type) {
      case 'shot':
        this.processOpponentShot(event.data);
        break;
      case 'arsenalUse':
        this.processArsenalPower(event.data);
        break;
      case 'gemCollected':
        this.updateGemCount(event.data);
        break;
    }
  }
}
```

---

## **7. PROGRESIÓN Y ARENAS**

### **7.1 Sistema de ELO y Ligas**

```typescript
interface ArenaConfig {
  name: string;
  eloRange: [number, number];
  theme: string;
  music: string;
  background: string;
  gemSpawnRate: number[];
  rowSpawnRate: number;
  arsenalConfig: ArsenalConfig;
  rewards: {
    firstTime: Reward;
    seasonal: Reward;
  };
}

const ARENAS: Record<ArenaType, ArenaConfig> = {
  ocean: {
    name: "Ocean Depths",
    eloRange: [0, 999],
    theme: "underwater",
    music: "ocean_calm.mp3",
    background: "ocean_bg",
    gemSpawnRate: [8000, 5000, 5000],
    rowSpawnRate: 6000,
    arsenalConfig: {
      spawnRate: 20000,
      rotationSpeed: 15000,
      powers: ['lightning', 'freeze', 'laser']
    },
    rewards: {
      firstTime: { type: 'avatar_frame', id: 'ocean_frame' },
      seasonal: { coins: 100 }
    }
  },
  neon: {
    name: "Neon City",
    eloRange: [1000, 1999],
    theme: "cyberpunk",
    music: "neon_beats.mp3",
    background: "neon_bg",
    gemSpawnRate: [7000, 5000, 4000],
    rowSpawnRate: 5500,
    arsenalConfig: {
      spawnRate: 18000,
      rotationSpeed: 12000,
      powers: ['bomb', 'rainbow', 'steal']
    },
    rewards: {
      firstTime: { type: 'trail', id: 'neon_trail' },
      seasonal: { coins: 250, skin: 'basic' }
    }
  },
  volcanic: {
    name: "Volcanic Forge",
    eloRange: [2000, 2999],
    theme: "lava",
    music: "volcanic_intense.mp3",
    background: "volcanic_bg",
    gemSpawnRate: [6000, 4000, 3000],
    rowSpawnRate: 5000,
    arsenalConfig: {
      spawnRate: 15000,
      rotationSpeed: 10000,
      powers: ['chaos', 'triple', 'block']
    },
    rewards: {
      firstTime: { type: 'explosion', id: 'lava_explosion' },
      seasonal: { coins: 500, skin: 'epic' }
    }
  },
  space: {
    name: "Space Station",
    eloRange: [3000, 3999],
    theme: "scifi",
    music: "space_ambient.mp3",
    background: "space_bg",
    gemSpawnRate: [6000, 4000, 3000],
    rowSpawnRate: 4500,
    arsenalConfig: {
      spawnRate: 12000,
      rotationSpeed: 8000,
      powers: ['steal', 'laser', 'chaos']
    },
    rewards: {
      firstTime: { type: 'avatar', id: 'astronaut' },
      seasonal: { coins: 1000, skin: 'legendary' }
    }
  },
  crystal: {
    name: "Crystal Palace",
    eloRange: [4000, 9999],
    theme: "mystical",
    music: "crystal_epic.mp3",
    background: "crystal_bg",
    gemSpawnRate: [5000, 3000, 3000],
    rowSpawnRate: 4000,
    arsenalConfig: {
      spawnRate: 10000,
      rotationSpeed: 6000,
      powers: ['chaos', 'steal', 'triple', 'bomb', 'lightning']
    },
    rewards: {
      firstTime: { type: 'crown', id: 'crystal_crown' },
      seasonal: { coins: 2000, skin: 'exclusive', title: 'Crystal Master' }
    }
  }
};
```

### **7.2 Cálculo de ELO**

```typescript
class ELOCalculator {
  private readonly K_FACTORS = {
    ocean: 50,      // Cambios rápidos para nuevos jugadores
    neon: 40,
    volcanic: 35,
    space: 30,
    crystal: 25     // Cambios lentos para top players
  };
  
  calculateELOChange(
    playerELO: number,
    opponentELO: number,
    won: boolean,
    arena: ArenaType
  ): number {
    // Fórmula ELO estándar
    const expectedScore = 1 / (1 + Math.pow(10, (opponentELO - playerELO) / 400));
    const actualScore = won ? 1 : 0;
    const kFactor = this.K_FACTORS[arena];
    
    let eloChange = Math.round(kFactor * (actualScore - expectedScore));
    
    // Bonus por racha
    if(won && this.currentStreak > 0) {
      eloChange += Math.min(this.currentStreak * 5, 25);
    }
    
    // Protección contra caída de arena
    if(!won && this.wouldDropArena(playerELO, eloChange)) {
      eloChange = Math.max(eloChange, -10); // Pérdida máxima en borde
    }
    
    return eloChange;
  }
}
```

### **7.3 Sistema de Temporadas**

```typescript
interface Season {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number; // días
  rewards: SeasonReward[];
  theme?: string;
}

class SeasonManager {
  private readonly SEASON_DURATION = 60; // días
  
  async endSeason(): Promise<void> {
    // 1. Calcular rewards
    const rewards = await this.calculateSeasonRewards();
    
    // 2. Distribuir rewards
    await this.distributeRewards(rewards);
    
    // 3. Reset ELO suave
    await this.softResetELO();
    
    // 4. Iniciar nueva temporada
    await this.startNewSeason();
  }
  
  private async softResetELO(): Promise<void> {
    // Reset por rangos
    const resets = {
      1000: 1000,   // Ocean no cambia
      2000: 1500,   // Neon → mitad Ocean/Neon
      3000: 2000,   // Volcanic → Neon
      4000: 2500,   // Space → mitad Neon/Volcanic
      5000: 3000    // Crystal → Volcanic
    };
    
    // Aplicar reset a todos los usuarios
    const users = await this.getAllUsers();
    for(const user of users) {
      const newELO = this.calculateNewELO(user.elo, resets);
      await this.updateUserELO(user.uid, newELO);
    }
  }
}
```

---

## **8. MONETIZACIÓN**

### **8.1 Modelo de Monetización**
- **Free to Play** con monetización cosmética
- **Sin Pay to Win** - Solo visual/cosmético
- **Battle Pass** opcional por temporada
- **Ads opcionales** para rewards extra

### **8.2 Economía del Juego**

```typescript
interface Currency {
  coins: number;    // Moneda gratis (ganas jugando)
  gems: number;     // Moneda premium (compras o BP)
}

interface PriceList {
  // Moneda Premium
  gems_100: { price: 0.99, gems: 100 },
  gems_550: { price: 4.99, gems: 550, bonus: "10%" },
  gems_1200: { price: 9.99, gems: 1200, bonus: "20%" },
  gems_2500: { price: 19.99, gems: 2500, bonus: "25%" },
  
  // Battle Pass
  battle_pass: { price: 4.99, duration: 60 },
  battle_pass_premium: { price: 9.99, duration: 60, skipLevels: 10 },
  
  // Ofertas especiales
  starter_pack: { price: 2.99, oneTime: true },
  arena_pack: { price: 7.99, perArena: true }
}
```

### **8.3 Tienda y Cosméticos**

```typescript
interface CosmeticItem {
  id: string;
  name: string;
  type: 'trail'|'explosion'|'avatar'|'frame'|'emote';
  rarity: 'common'|'rare'|'epic'|'legendary';
  price: {
    coins?: number;
    gems?: number;
  };
  requirements?: {
    arena?: ArenaType;
    level?: number;
    season?: string;
  };
  preview: string; // URL del asset
}

const SHOP_ROTATION = {
  daily: 6,        // 6 items diarios
  weekly: 3,       // 3 items especiales semanales
  featured: 1,     // 1 item destacado
  discounts: [10, 20, 30, 50] // % de descuento posibles
};
```

### **8.4 Battle Pass**

```typescript
interface BattlePass {
  season: string;
  tiers: 50;
  freeRewards: Reward[];
  premiumRewards: Reward[];
  experience: {
    perWin: 100,
    perLoss: 30,
    perGem: 5,
    dailyBonus: 500
  };
}

interface BattlePassTier {
  tier: number;
  requiredXP: number;
  freeReward?: Reward;
  premiumReward: Reward;
}
```

### **8.5 Sistema de Ads (Opcional)**

```typescript
interface AdRewards {
  doubleCoins: {
    cooldown: 3600,    // 1 hora
    duration: 1800     // 30 minutos
  },
  extraLife: {
    cooldown: 7200,    // 2 horas
    uses: 1            // Por partida
  },
  freeGems: {
    cooldown: 86400,   // 24 horas
    amount: 10
  }
}
```

---

## **9. IMPLEMENTACIÓN POR FASES**

### **FASE 1: Core Multiplayer (2 semanas)**

**Semana 1:**
- [ ] Firebase setup y configuración
- [ ] Sistema de autenticación (Google + Guest)
- [ ] Scene de Login y Menú principal
- [ ] Estructura de datos en Firebase

**Semana 2:**
- [ ] Matchmaking básico
- [ ] Sincronización de partidas
- [ ] Sistema de gemas funcional
- [ ] Victoria/Derrota condiciones

### **FASE 2: Gameplay Completo (1 semana)**
- [ ] Sistema de arsenal con poderes
- [ ] Reset y muerte
- [ ] Combos y cascadas
- [ ] Efectos visuales y feedback

### **FASE 3: Progresión (1 semana)**
- [ ] Sistema ELO completo
- [ ] 5 arenas con configs
- [ ] Leaderboards
- [ ] Perfil de jugador

### **FASE 4: Monetización (1 semana)**
- [ ] Tienda de cosméticos
- [ ] Sistema de monedas
- [ ] Battle Pass básico
- [ ] IAP integration

### **FASE 5: Polish (1 semana)**
- [ ] Tutoriales
- [ ] Mejoras UX/UI
- [ ] Optimización rendimiento
- [ ] Balance y ajustes
- [ ] Testing multiplataforma

### **FASE 6: Launch Prep (1 semana)**
- [ ] Backend escalabilidad
- [ ] Analytics
- [ ] Crash reporting
- [ ] Store listings
- [ ] Marketing assets

---

## **10. ESPECIFICACIONES TÉCNICAS**

### **10.1 Configuración de Juego**

```typescript
// src/config/GameConfig.ts
export const GAME_CONFIG = {
  // Gameplay
  gameplay: {
    gemsToWin: 15,
    maxGameTime: 180000,      // 3 minutos
    suddenDeathTime: 150000,  // 2:30
    rowSpawnBase: 6000,       // 6 segundos
    deathResetRows: 4,
    deathGemLoss: 0.5,        // 50%
    immunityTime: 3000,
    penaltyTime: 5000
  },
  
  // Combos
  combos: {
    small: { range: [3, 4], gemMultiplier: 1 },
    medium: { range: [5, 6], gemMultiplier: 2 },
    large: { range: [7, 999], gemMultiplier: 3 },
    cascade: {
      small: { range: [4, 6], bonus: 1 },
      large: { range: [7, 999], bonus: 2 }
    },
    steal: {
      threshold1: 8,
      threshold2: 10
    }
  },
  
  // Network
  network: {
    syncRate: 100,            // ms
    timeout: 30000,           // 30s desconexión
    reconnectAttempts: 3,
    pingInterval: 5000
  },
  
  // Performance
  performance: {
    targetFPS: 60,
    mobileTargetFPS: 30,
    particleLimit: 100,
    soundPoolSize: 10
  }
};
```

### **10.2 Firebase Security Rules**

```javascript
// Firebase Realtime Database Rules
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "matches": {
      "$matchId": {
        ".read": "auth != null && (data.child('players/player1').val() === auth.uid || data.child('players/player2').val() === auth.uid)",
        ".write": "auth != null && (data.child('players/player1').val() === auth.uid || data.child('players/player2').val() === auth.uid)"
      }
    },
    "matchmaking": {
      ".read": false,
      ".write": "auth != null"
    },
    "leaderboards": {
      ".read": true,
      ".write": false
    }
  }
}
```

### **10.3 Firebase Cloud Functions**

```javascript
// firebase/functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Matchmaking processor
exports.processMatchmaking = functions.database
  .ref('/matchmaking/queues/{arena}/{userId}')
  .onCreate(async (snapshot, context) => {
    const { arena, userId } = context.params;
    const playerData = snapshot.val();
    
    // Buscar oponente
    const opponent = await findOpponent(playerData.elo, arena);
    if (opponent) {
      await createMatch(userId, opponent.id, arena);
    }
  });

// Finalizar partida
exports.finishMatch = functions.https.onCall(async (data, context) => {
  const { matchId, winnerId, reason } = data;
  
  // Validar auth
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }
  
  // Obtener datos del match
  const match = await admin.database()
    .ref(`matches/${matchId}`)
    .once('value');
  
  if (!match.exists()) {
    throw new functions.https.HttpsError('not-found');
  }
  
  // Calcular ELO changes
  const eloChanges = await calculateELOChanges(match.val(), winnerId);
  
  // Actualizar jugadores
  await updatePlayerStats(match.val(), winnerId, eloChanges);
  
  // Marcar match como terminado
  await admin.database()
    .ref(`matches/${matchId}/result`)
    .set({
      winner: winnerId,
      reason: reason,
      timestamp: Date.now(),
      eloChanges: eloChanges
    });
  
  return { success: true, eloChanges };
});

// Reset diario
exports.dailyReset = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    // Reset daily quests
    // Rotate shop
    // Clear old replays
  });

// Limpieza de matchmaking
exports.cleanupMatchmaking = functions.pubsub
  .schedule('*/5 * * * *')
  .onRun(async (context) => {
    const cutoff = Date.now() - 30000; // 30s old
    // Remover entradas viejas de matchmaking
  });
```

### **10.4 Optimizaciones Mobile**

```typescript
class MobileOptimization {
  static configure(game: Phaser.Game): void {
    const isMobile = game.device.os.iOS || game.device.os.android;
    
    if (isMobile) {
      // Reducir calidad de partículas
      game.config.maxParticles = 50;
      
      // Reducir FPS target
      game.config.fps.target = 30;
      
      // Deshabilitar sombras
      game.config.render.shadows = false;
      
      // Simplificar efectos
      game.config.fx.quality = 'low';
      
      // Optimizar texturas
      game.textures.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
}
```

---

## **APÉNDICES**

### **A. Comandos de Desarrollo**

```bash
# Desarrollo local
npm run dev

# Build producción
npm run build

# Deploy a Firebase
npm run deploy:firebase

# Build iOS
npm run cap:sync:ios
npm run cap:open:ios

# Build Android
npm run cap:sync:android
npm run cap:open:android

# Firebase emulators
firebase emulators:start
```

### **B. Variables de Entorno**

```env
# .env.local
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_DATABASE_URL=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_FIREBASE_MEASUREMENT_ID=xxx

# Development
VITE_USE_EMULATORS=true
VITE_DEBUG_MODE=true
```

### **C. Estructura de Assets Necesarios**

```
/public/assets
├── /ui
│   ├── login_bg.png
│   ├── menu_bg.png
│   ├── button_play.png
│   ├── gem_icon.png
│   └── arsenal_icons.png (spritesheet)
├── /effects
│   ├── gem_collect.json (particle)
│   ├── arsenal_activate.json
│   └── death_explosion.json
├── /audio
│   ├── gem_collect.mp3
│   ├── combo_3.mp3
│   ├── combo_5.mp3
│   ├── combo_7.mp3
│   ├── arsenal_use.mp3
│   └── game_over.mp3
└── /animations
    └── gem_shine.json
```

---

## **DOCUMENTO COMPLETO**

Este GDD técnico contiene toda la información necesaria para implementar **Bubble Gems Clash** desde cero, aprovechando los sistemas existentes y creando una experiencia multiplayer competitiva y monetizable.

**Próximos pasos recomendados:**
1. Configurar Firebase y autenticación
2. Implementar el sistema de gemas básico
3. Añadir sincronización multiplayer
4. Testear con 2 dispositivos locales
5. Iterar y pulir

---

**Versión**: 3.0
**Fecha**: Diciembre 2024
**Estado**: Listo para producción