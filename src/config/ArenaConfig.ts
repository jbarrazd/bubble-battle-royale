import { IArenaConfig } from '@/types/ArenaTypes';

const HD_SCALE = 2;  // HD scaling factor - restored for visual quality

export const ARENA_CONFIG: IArenaConfig = {
    width: 375 * HD_SCALE,  // 750 HD width
    height: 667 * HD_SCALE, // 1334 HD height
    playerZoneHeight: 267 * HD_SCALE,    // 534 HD
    opponentZoneHeight: 267 * HD_SCALE,  // 534 HD
    objectiveZoneHeight: 133 * HD_SCALE, // 266 HD
    bubbleSize: 32 * HD_SCALE,  // 64 HD
    objectiveSize: 32 * HD_SCALE, // 64 HD
    launcherOffset: 50 * HD_SCALE  // 100 HD
};

export const BUBBLE_CONFIG = {
    SIZE: 32 * HD_SCALE,  // 64 HD
    GAP: 0,  // No gap - bubbles touch perfectly
    COLORS: 5,
    POOL_SIZE: 50, // OPTIMIZED: Reduced pool size for better iOS performance
    HEX_WIDTH: 32 * HD_SCALE,  // 64 HD
    HEX_HEIGHT: 28 * HD_SCALE, // 56 HD (SIZE * 0.866)
    ANIMATION_DURATION: 200,
    FALL_SPEED: 500 * HD_SCALE  // 1000 HD
};

export const GRID_CONFIG = {
    ROWS: 15,
    COLS: 11,
    CENTER_ROW: 7,
    CENTER_COL: 5,
    OBJECTIVE_RADIUS: 3 // Bubbles around objective in hex rings
};

export const DANGER_ZONE_CONFIG = {
    PLAYER_OFFSET: 120 * HD_SCALE,    // 240 HD
    OPPONENT_OFFSET: 120 * HD_SCALE,  // 240 HD
    LINE_COLOR: 0xFFFFFF,
    LINE_ALPHA: 0.08,
    LINE_WIDTH: 1 * HD_SCALE,  // 2 HD
    PULSE_DURATION: 1000
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
    BUBBLES: 15,  // Grid bubbles
    BUBBLES_FRONT: 20,  // Projectile bubbles
    OBJECTIVE: 25,  // Objective should be above bubbles
    LAUNCHERS: 40,
    UI: 50,
    FLOATING_UI: 60,  // For floating power-ups
    DEBUG_OVERLAY: 100
};