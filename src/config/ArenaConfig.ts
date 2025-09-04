import { IArenaConfig } from '@/types/ArenaTypes';

const HD_SCALE = 2.2;  // Slightly larger for better visibility

export const ARENA_CONFIG: IArenaConfig = {
    width: 375 * HD_SCALE,  // 825 HD width
    height: 667 * HD_SCALE, // 1467 HD height
    playerZoneHeight: 267 * HD_SCALE,    // 587 HD
    opponentZoneHeight: 267 * HD_SCALE,  // 587 HD
    objectiveZoneHeight: 133 * HD_SCALE, // 293 HD
    bubbleSize: 26 * HD_SCALE,  // 57 HD (balanced size)
    objectiveSize: 26 * HD_SCALE, // 57 HD
    launcherOffset: 42 * HD_SCALE  // 92 HD
};

export const BUBBLE_CONFIG = {
    SIZE: 26 * HD_SCALE,  // 57 HD (balanced for visibility and space)
    GAP: 0,  // No gap - bubbles touch perfectly
    COLORS: 5,
    POOL_SIZE: 250, // Increased for row spawning system
    HEX_WIDTH: 26 * HD_SCALE,  // 57 HD
    HEX_HEIGHT: 22.5 * HD_SCALE, // 49.5 HD (SIZE * 0.866)
    ANIMATION_DURATION: 200,
    FALL_SPEED: 500 * HD_SCALE  // 1250 Ultra HD
};

export const GRID_CONFIG = {
    ROWS: 15,
    COLS: 11,
    CENTER_ROW: 7,
    CENTER_COL: 5,
    OBJECTIVE_RADIUS: 3 // Bubbles around objective in hex rings
};

export const DANGER_ZONE_CONFIG = {
    PLAYER_OFFSET: 120 * HD_SCALE,    // 300 Ultra HD
    OPPONENT_OFFSET: 120 * HD_SCALE,  // 300 Ultra HD
    LINE_COLOR: 0xFFFFFF,
    LINE_ALPHA: 0.08,
    LINE_WIDTH: 1 * HD_SCALE,  // 2.5 Ultra HD
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