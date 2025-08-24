import { IHexPosition, IPixelPosition } from '@/types/ArenaTypes';
import { BUBBLE_CONFIG, GRID_CONFIG } from '@/config/ArenaConfig';

export class BubbleGrid {
    private centerX: number;
    private centerY: number;
    private hexSize: number;
    private gridMap: Map<string, IHexPosition>;

    constructor(centerX: number, centerY: number) {
        this.centerX = centerX;
        this.centerY = centerY;
        // Add gap to hexSize for proper spacing
        this.hexSize = (BUBBLE_CONFIG.SIZE + BUBBLE_CONFIG.GAP) / 2;
        this.gridMap = new Map();
        this.initializeGrid();
    }

    private initializeGrid(): void {
        // Initialize hex grid positions
        for (let q = -GRID_CONFIG.CENTER_COL; q <= GRID_CONFIG.CENTER_COL; q++) {
            for (let r = -GRID_CONFIG.CENTER_ROW; r <= GRID_CONFIG.CENTER_ROW; r++) {
                const s = -q - r;
                const key = this.getKey(q, r);
                this.gridMap.set(key, { q, r, s });
            }
        }
    }

    public hexToPixel(hex: IHexPosition): IPixelPosition {
        const x = this.hexSize * 3/2 * hex.q;
        const y = this.hexSize * Math.sqrt(3) * (hex.r + hex.q/2);
        
        return {
            x: this.centerX + x,
            y: this.centerY + y
        };
    }

    public pixelToHex(pixel: IPixelPosition): IHexPosition {
        const x = pixel.x - this.centerX;
        const y = pixel.y - this.centerY;
        
        const q = (2/3 * x) / this.hexSize;
        const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.hexSize;
        
        return this.roundHex(q, r);
    }

    private roundHex(q: number, r: number): IHexPosition {
        const s = -q - r;
        
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);
        
        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - s);
        
        if (qDiff > rDiff && qDiff > sDiff) {
            rq = -rr - rs;
        } else if (rDiff > sDiff) {
            rr = -rq - rs;
        } else {
            rs = -rq - rr;
        }
        
        return { q: rq, r: rr, s: rs };
    }

    public getNeighbors(hex: IHexPosition): IHexPosition[] {
        const directions = [
            { q: 1, r: 0, s: -1 },
            { q: 1, r: -1, s: 0 },
            { q: 0, r: -1, s: 1 },
            { q: -1, r: 0, s: 1 },
            { q: -1, r: 1, s: 0 },
            { q: 0, r: 1, s: -1 }
        ];
        
        return directions.map(dir => ({
            q: hex.q + dir.q,
            r: hex.r + dir.r,
            s: hex.s + dir.s
        }));
    }

    public getDistance(a: IHexPosition, b: IHexPosition): number {
        return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
    }

    public getRing(center: IHexPosition, radius: number): IHexPosition[] {
        if (radius === 0) return [center];
        
        const results: IHexPosition[] = [];
        const directions = [
            { q: 1, r: 0, s: -1 },
            { q: 1, r: -1, s: 0 },
            { q: 0, r: -1, s: 1 },
            { q: -1, r: 0, s: 1 },
            { q: -1, r: 1, s: 0 },
            { q: 0, r: 1, s: -1 }
        ];
        
        let hex = {
            q: center.q + directions[4].q * radius,
            r: center.r + directions[4].r * radius,
            s: center.s + directions[4].s * radius
        };
        
        for (let i = 0; i < 6; i++) {
            for (let j = 0; j < radius; j++) {
                results.push({ ...hex });
                hex = {
                    q: hex.q + directions[i].q,
                    r: hex.r + directions[i].r,
                    s: hex.s + directions[i].s
                };
            }
        }
        
        return results;
    }

    public getSpiral(center: IHexPosition, maxRadius: number): IHexPosition[] {
        const results: IHexPosition[] = [];
        
        for (let radius = 0; radius <= maxRadius; radius++) {
            const ring = this.getRing(center, radius);
            results.push(...ring);
        }
        
        return results;
    }

    private getKey(q: number, r: number): string {
        return `${q},${r}`;
    }

    public isValidPosition(hex: IHexPosition): boolean {
        const key = this.getKey(hex.q, hex.r);
        return this.gridMap.has(key);
    }

    public getGridBounds(): { minQ: number; maxQ: number; minR: number; maxR: number } {
        return {
            minQ: -GRID_CONFIG.CENTER_COL,
            maxQ: GRID_CONFIG.CENTER_COL,
            minR: -GRID_CONFIG.CENTER_ROW,
            maxR: GRID_CONFIG.CENTER_ROW
        };
    }
}