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
        // Use bubble radius plus small spacing
        this.hexSize = (BUBBLE_CONFIG.SIZE / 2) + 1;
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
        // Simple offset grid for bubble shooters
        // Odd rows are offset by half a bubble width
        const rowHeight = this.hexSize * Math.sqrt(3);
        const colWidth = this.hexSize * 2;
        
        // Calculate position with offset for odd rows
        const isOddRow = Math.abs(hex.r) % 2 === 1;
        const xOffset = isOddRow ? this.hexSize : 0;
        
        const x = hex.q * colWidth + xOffset;
        const y = hex.r * rowHeight;
        
        return {
            x: this.centerX + x,
            y: this.centerY + y
        };
    }

    public pixelToHex(pixel: IPixelPosition): IHexPosition {
        const x = pixel.x - this.centerX;
        const y = pixel.y - this.centerY;
        
        const rowHeight = this.hexSize * Math.sqrt(3);
        const colWidth = this.hexSize * 2;
        
        // Estimate row
        const r = Math.round(y / rowHeight);
        
        // Adjust x for odd row offset
        const isOddRow = Math.abs(r) % 2 === 1;
        const adjustedX = isOddRow ? x - this.hexSize : x;
        
        // Estimate column
        const q = Math.round(adjustedX / colWidth);
        
        return { q, r, s: -q - r };
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
        // For offset grid, neighbors depend on whether we're in an odd or even row
        const isOddRow = Math.abs(hex.r) % 2 === 1;
        
        let directions: Array<{q: number, r: number}> = [];
        
        if (!isOddRow) {
            // Even row neighbors
            directions = [
                { q: 0, r: -1 },   // Top
                { q: 1, r: 0 },    // Right
                { q: 0, r: 1 },    // Bottom
                { q: -1, r: 1 },   // Bottom-left
                { q: -1, r: 0 },   // Left
                { q: -1, r: -1 }   // Top-left
            ];
        } else {
            // Odd row neighbors (offset by half)
            directions = [
                { q: 0, r: -1 },   // Top
                { q: 1, r: -1 },   // Top-right
                { q: 1, r: 0 },    // Right
                { q: 1, r: 1 },    // Bottom-right
                { q: 0, r: 1 },    // Bottom
                { q: -1, r: 0 }    // Left
            ];
        }
        
        return directions.map(dir => ({
            q: hex.q + dir.q,
            r: hex.r + dir.r,
            s: 0 // Not used in offset grid
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
    
    /**
     * Get all bubbles currently in the grid
     */
    public getAllBubbles(): any[] {
        // This would need to be implemented with actual bubble tracking
        return [];
    }
    
    /**
     * Get bubble at specific world position
     */
    public getBubbleAt(x: number, y: number): any | null {
        // Convert world position to hex position
        const hex = this.pixelToHex({ x, y });
        const key = this.getKey(hex.q, hex.r);
        
        // This would need actual bubble tracking
        return null;
    }
    
    /**
     * Get bubbles within radius of a point
     */
    public getBubblesInRadius(x: number, y: number, radius: number): any[] {
        // This would need actual implementation with bubble tracking
        return [];
    }
}