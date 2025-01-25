// utils/Helpers.js
// Utility functions used throughout the game
// These functions handle common calculations and operations

export class GameHelpers {
    /**
     * Converts grid coordinates to pixel positions
     * Used for placing gems and calculating movements
     */
    static gridToPixel(gridX, gridY, config) {
        return {
            x: config.CELL_SIZE * gridX + config.CELL_SIZE / 2,
            y: config.CELL_SIZE * gridY + config.CELL_SIZE / 2
        };
    }

    /**
     * Converts pixel positions to grid coordinates
     * Used for handling input and determining gem positions
     */
    static pixelToGrid(pixelX, pixelY, config) {
        return {
            x: Math.floor(pixelX / config.CELL_SIZE),
            y: Math.floor(pixelY / config.CELL_SIZE)
        };
    }

    /**
     * Calculates the center point of a group of gems
     * Used for positioning effects and calculating match centers
     */
    static calculateCenter(gemPositions) {
        const sum = gemPositions.reduce((acc, pos) => ({
            x: acc.x + pos.x,
            y: acc.y + pos.y
        }), { x: 0, y: 0 });

        return {
            x: sum.x / gemPositions.length,
            y: sum.y / gemPositions.length
        };
    }

    /**
     * Detects if gems form special patterns like L-shapes or T-shapes
     * Used for awarding bonus points
     */
    static detectSpecialPatterns(matches) {
        // Convert matches to a grid for pattern detection
        const grid = this.createMatchGrid(matches);
        
        // Check for various patterns
        if (this.isLShape(grid)) return 'L_SHAPE';
        if (this.isTShape(grid)) return 'T_SHAPE';
        if (this.isCrossShape(grid)) return 'CROSS';
        
        return 'NORMAL';
    }

    /**
     * Creates a grid representation of matched gems
     * Helper function for pattern detection
     */
    static createMatchGrid(matches) {
        const grid = {};
        matches.forEach(pos => {
            const key = `${pos.x},${pos.y}`;
            grid[key] = true;
        });
        return grid;
    }

    /**
     * Checks if a set of positions forms an L-shape
     */
    static isLShape(grid) {
        // Get bounds of the matched area
        const positions = Object.keys(grid).map(key => {
            const [x, y] = key.split(',').map(Number);
            return { x, y };
        });

        const bounds = this.calculateBounds(positions);
        
        // L-shape must be 3x3 or larger
        if (bounds.width < 2 || bounds.height < 2) return false;
        
        // Check for L-shape pattern
        return this.checkLPattern(grid, bounds);
    }

    /**
     * Calculates the bounds of a group of positions
     * Helper function for pattern detection
     */
    static calculateBounds(positions) {
        const xs = positions.map(p => p.x);
        const ys = positions.map(p => p.y);
        
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
            width: Math.max(...xs) - Math.min(...xs) + 1,
            height: Math.max(...ys) - Math.min(...ys) + 1
        };
    }

    /**
     * Generates random gem type, ensuring no immediate matches
     * Used when creating new gems or refilling the board
     */
    static getRandomGemType(adjacentTypes) {
        const availableTypes = Object.keys(GEM_TYPES).filter(
            type => !adjacentTypes.includes(type)
        );
        
        return availableTypes[
            Math.floor(Math.random() * availableTypes.length)
        ];
    }

    /**
     * Formats score numbers for display
     * Adds commas and handles large numbers
     */
    static formatScore(score) {
        return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Calculates falling duration based on distance
     * Creates natural-feeling acceleration for falling gems
     */
    static calculateFallDuration(distance) {
        // Base duration plus additional time for distance
        const duration = ANIMATION_TIMINGS.FALL + 
            (distance * ANIMATION_TIMINGS.FALL / 8);
            
        // Cap at a maximum duration
        return Math.min(duration, ANIMATION_TIMINGS.FALL * 2);
    }
}