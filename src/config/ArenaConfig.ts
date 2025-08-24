import { IArenaConfig } from '@/types/ArenaTypes';

export const ARENA_CONFIG: IArenaConfig = {
    width: 375,  // Base width for mobile
    height: 667, // Base height for mobile
    playerZoneHeight: 267,    // 40% of height
    opponentZoneHeight: 267,  // 40% of height
    objectiveZoneHeight: 133, // 20% of height
    bubbleSize: 32,
    objectiveSize: 48, // 1.5x bubble size
    launcherOffset: 50
};

export const BUBBLE_CONFIG = {
    SIZE: 32,
    GAP: 0,  // No gap - bubbles touch perfectly
    COLORS: 5,
    POOL_SIZE: 150, // For object pooling
    HEX_WIDTH: 32,  // Just the SIZE
    HEX_HEIGHT: 28, // SIZE * 0.866 for perfect hexagonal packing
    ANIMATION_DURATION: 200,
    FALL_SPEED: 500
};

export const GRID_CONFIG = {
    ROWS: 15,
    COLS: 11,
    CENTER_ROW: 7,
    CENTER_COL: 5,
    OBJECTIVE_RADIUS: 3 // Bubbles around objective in hex rings
};

export const ZONE_COLORS = {
    PLAYER: 0x3498db,
    OPPONENT: 0xe74c3c,
    OBJECTIVE: 0xf39c12,
    NEUTRAL: 0x95a5a6,
    DEBUG_ALPHA: 0.2
};

export const Z_LAYERS = {
    BACKGROUND: 0,
    ZONE_DEBUG: 1,
    GRID_DEBUG: 2,
    BUBBLES_BACK: 10,
    OBJECTIVE: 20,
    BUBBLES: 25,  // Main bubble layer for projectiles
    BUBBLES_FRONT: 30,
    LAUNCHERS: 40,
    UI: 50,
    DEBUG_OVERLAY: 100
};