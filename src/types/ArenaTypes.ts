export interface IArenaConfig {
    width: number;
    height: number;
    playerZoneHeight: number;
    opponentZoneHeight: number;
    objectiveZoneHeight: number;
    bubbleSize: number;
    objectiveSize: number;
    launcherOffset: number;
}

export interface IBubbleData {
    gridX: number;
    gridY: number;
    color: BubbleColor;
    isSpecial: boolean;
}

export interface IHexPosition {
    q: number; // column
    r: number; // row
    s: number; // constraint: q + r + s = 0
}

export interface IPixelPosition {
    x: number;
    y: number;
}

export enum BubbleColor {
    RED = 0xff0000,
    BLUE = 0x0000ff,
    GREEN = 0x00ff00,
    YELLOW = 0xffff00,
    PURPLE = 0xff00ff
}

export enum ArenaZone {
    PLAYER = 'player',
    OPPONENT = 'opponent',
    OBJECTIVE = 'objective',
    NEUTRAL = 'neutral'
}

export interface IZoneBounds {
    x: number;
    y: number;
    width: number;
    height: number;
    zone: ArenaZone;
}

export interface ILauncherConfig {
    x: number;
    y: number;
    angle: number;
    zone: ArenaZone;
}

export interface IObjectiveConfig {
    x: number;
    y: number;
    size: number;
    health: number;
}