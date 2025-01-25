// core/GemGrid.js - Part 1: Core Setup and Initialization

import { GEM_TYPES } from '../utils/Constants';
import { Gem } from './Gem';

export class GemGrid {
    constructor(scene, config) {
        this.scene = scene;
        
        // Grid dimensions and properties
        this.width = config.width;
        this.height = config.height;
        this.cellSize = config.cellSize;
        
        // Calculate grid position to center it on screen
        this.position = {
            x: (scene.sys.game.config.width - (this.width * this.cellSize)) / 2,
            y: (scene.sys.game.config.height - (this.height * this.cellSize)) / 2
        };

        // Initialize the grid array and input tracking
        this.gems = [];           // 2D array to store gems
        this.selectedGem = null;  // Currently selected gem
        this.canInput = true;     // Whether input is currently accepted
        
        // Create the initial grid
        this.createGrid();
    }

    fillGrid() {
        this.createGrid();
    }

    createGrid() {
        // Initialize empty 2D array
        for (let x = 0; x < this.width; x++) {
            this.gems[x] = [];
            for (let y = 0; y < this.height; y++) {
                // Create gems ensuring no initial matches
                this.gems[x][y] = this.createGemAt(x, y);
            }
        }
    }

    createGemAt(x, y) {
        // Get available gem types (no matches at creation)
        const availableTypes = this.getAvailableGemTypes(x, y);
        const gemType = availableTypes[
            Math.floor(Math.random() * availableTypes.length)
        ];

        // Calculate pixel position for this grid position
        const pixelPos = this.gridToPixel(x, y);
        
        // Create new gem and set its grid position
        const gem = new Gem(
            this.scene,
            pixelPos.x,
            pixelPos.y,
            gemType
        );
        
        // Store grid coordinates on the gem for easy reference
        gem.gridX = x;
        gem.gridY = y;

        return gem;
    }

    getAvailableGemTypes(x, y) {
        // Get all possible gem types
        const allTypes = Object.keys(GEM_TYPES);
        
        // If this is one of the first positions, return all types
        if (x < 2 && y < 2) return allTypes;

        // Keep track of types we can't use
        const invalidTypes = new Set();

        // Check horizontal matches
        if (x >= 2) {
            if (this.gems[x-1][y]?.gemType === this.gems[x-2][y]?.gemType) {
                invalidTypes.add(this.gems[x-1][y].gemType);
            }
        }

        // Check vertical matches
        if (y >= 2) {
            if (this.gems[x][y-1]?.gemType === this.gems[x][y-2]?.gemType) {
                invalidTypes.add(this.gems[x][y-1].gemType);
            }
        }

        // Return only valid types
        return allTypes.filter(type => !invalidTypes.has(type));
    }

    // Convert grid coordinates to pixel position
    gridToPixel(gridX, gridY) {
        return {
            x: this.position.x + (gridX * this.cellSize) + (this.cellSize / 2),
            y: this.position.y + (gridY * this.cellSize) + (this.cellSize / 2)
        };
    }

    // Convert pixel position to grid coordinates
    pixelToGrid(pixelX, pixelY) {
        return {
            x: Math.floor((pixelX - this.position.x) / this.cellSize),
            y: Math.floor((pixelY - this.position.y) / this.cellSize)
        };
    }

    // Check if a grid position is valid
    isValidGridPosition(gridPos) {
        return gridPos.x >= 0 &&
               gridPos.x < this.width &&
               gridPos.y >= 0 &&
               gridPos.y < this.height;
    }

    // Get a gem at a specific grid position
    getGemAt(x, y) {
        if (this.isValidGridPosition({x, y})) {
            return this.gems[x][y];
        }
        return null;
    }

    // Get all gems in a specific row
    getRow(y) {
        if (y >= 0 && y < this.height) {
            return this.gems.map(column => column[y]).filter(gem => gem !== null);
        }
        return [];
    }

    // Get all gems in a specific column
    getColumn(x) {
        if (x >= 0 && x < this.width) {
            return this.gems[x].filter(gem => gem !== null);
        }
        return [];
    }

// core/GemGrid.js - Part 2: Input Handling and Gem Swapping

    // Handle when a gem is clicked or touched
    handleGemClick(gem) {
        // If input is disabled, do nothing
        if (!this.canInput) return;

        // If no gem is selected, select this one
        if (!this.selectedGem) {
            this.selectGem(gem);
            return;
        }

        // If this is the already selected gem, deselect it
        if (this.selectedGem === gem) {
            this.deselectGem();
            return;
        }

        // Check if the gems are adjacent
        if (this.areGemsAdjacent(this.selectedGem, gem)) {
            this.trySwapGems(this.selectedGem, gem);
        } else {
            // If not adjacent, select the new gem instead
            this.selectGem(gem);
        }
    }

    // Select a gem and show visual feedback
    selectGem(gem) {
        this.selectedGem = gem;
        gem.setSelected(true);
        
        // Play selection sound
        if (this.scene.audioManager) {
            this.scene.audioManager.playGemSelect();
        }
    }

    // Deselect the currently selected gem
    deselectGem() {
        if (this.selectedGem) {
            this.selectedGem.setSelected(false);
            this.selectedGem = null;
        }
    }

    // Check if two gems are adjacent in the grid
    areGemsAdjacent(gem1, gem2) {
        const xDiff = Math.abs(gem1.gridX - gem2.gridX);
        const yDiff = Math.abs(gem1.gridY - gem2.gridY);
        
        // Gems are adjacent if they differ by 1 in exactly one dimension
        return (xDiff === 1 && yDiff === 0) || (xDiff === 0 && yDiff === 1);
    }

    // Attempt to swap two gems
    async trySwapGems(gem1, gem2) {
        // Disable input during swap
        this.canInput = false;
        
        // First, swap the gems
        await this.swapGems(gem1, gem2);
        
        // Check if this creates any matches
        const matches = this.findMatches();
        
        if (matches.length > 0) {
            // Valid move - process the matches
            this.deselectGem();
            await this.processMatches(matches);
        } else {
            // Invalid move - swap back
            await this.swapGems(gem2, gem1);
            this.deselectGem();
        }
        
        // Re-enable input
        this.canInput = true;
    }

    // Perform the actual gem swap with animation
    async swapGems(gem1, gem2) {
        // Store original positions
        const pos1 = { x: gem1.x, y: gem1.y };
        const pos2 = { x: gem2.x, y: gem2.y };
        
        // Update grid positions
        const tempX = gem1.gridX;
        const tempY = gem1.gridY;
        gem1.gridX = gem2.gridX;
        gem1.gridY = gem2.gridY;
        gem2.gridX = tempX;
        gem2.gridY = tempY;
        
        // Update grid array
        this.gems[gem1.gridX][gem1.gridY] = gem1;
        this.gems[gem2.gridX][gem2.gridY] = gem2;

        // Animate both gems simultaneously
        await Promise.all([
            gem1.moveTo(pos2.x, pos2.y),
            gem2.moveTo(pos1.x, pos1.y)
        ]);

        // Play swap sound
        if (this.scene.audioManager) {
            this.scene.audioManager.playGemSwap();
        }
    }

    // Check if a potential swap would create a match
    wouldCreateMatch(gem1, gem2) {
        // Temporarily swap gems
        const tempX = gem1.gridX;
        const tempY = gem1.gridY;
        gem1.gridX = gem2.gridX;
        gem1.gridY = gem2.gridY;
        gem2.gridX = tempX;
        gem2.gridY = tempY;

        // Check for matches
        const matches = this.findMatches();

        // Swap back
        gem1.gridX = tempX;
        gem1.gridY = tempY;
        gem2.gridX = gem1.gridX;
        gem2.gridY = gem1.gridY;

        return matches.length > 0;
    }
// core/GemGrid.js - Part 3: Match Detection and Processing

    /**
     * Searches the entire grid for matching gems.
     * A match is 3 or more gems of the same type in a row or column.
     * Returns an array of match objects, each containing the matching gems.
     */
    findMatches() {
        const matches = [];
        
        // First check horizontal matches
        for (let y = 0; y < this.height; y++) {
            let matchingGems = [];
            let currentType = null;
            
            for (let x = 0; x < this.width; x++) {
                const gem = this.gems[x][y];
                
                if (gem && currentType === gem.gemType) {
                    // Add to current matching sequence
                    matchingGems.push(gem);
                } else {
                    // Check if we completed a match
                    if (matchingGems.length >= 3) {
                        matches.push({
                            gems: [...matchingGems],
                            type: 'horizontal'
                        });
                    }
                    // Start new potential match
                    matchingGems = [gem];
                    currentType = gem?.gemType;
                }
            }
            // Don't forget to check the last sequence in the row
            if (matchingGems.length >= 3) {
                matches.push({
                    gems: [...matchingGems],
                    type: 'horizontal'
                });
            }
        }

        // Then check vertical matches
        for (let x = 0; x < this.width; x++) {
            let matchingGems = [];
            let currentType = null;
            
            for (let y = 0; y < this.height; y++) {
                const gem = this.gems[x][y];
                
                if (gem && currentType === gem.gemType) {
                    matchingGems.push(gem);
                } else {
                    if (matchingGems.length >= 3) {
                        matches.push({
                            gems: [...matchingGems],
                            type: 'vertical'
                        });
                    }
                    matchingGems = [gem];
                    currentType = gem?.gemType;
                }
            }
            if (matchingGems.length >= 3) {
                matches.push({
                    gems: [...matchingGems],
                    type: 'vertical'
                });
            }
        }

        return this.consolidateMatches(matches);
    }

    /**
     * Combines overlapping matches and identifies special patterns.
     * For example, T-shapes or L-shapes are formed when horizontal
     * and vertical matches intersect.
     */
    consolidateMatches(matches) {
        // Create a map to track which gems are part of matches
        const matchMap = new Map();
        
        // Add all matched gems to the map
        matches.forEach(match => {
            match.gems.forEach(gem => {
                const key = `${gem.gridX},${gem.gridY}`;
                if (!matchMap.has(key)) {
                    matchMap.set(key, {
                        gem: gem,
                        matchTypes: []
                    });
                }
                matchMap.get(key).matchTypes.push(match.type);
            });
        });

        // Look for special patterns
        const consolidatedMatches = [];
        const processedGems = new Set();

        matches.forEach(match => {
            // Skip if these gems were already processed
            if (match.gems.some(gem => 
                processedGems.has(`${gem.gridX},${gem.gridY}`))) {
                return;
            }

            // Check for intersecting matches
            const intersectingGems = new Set();
            match.gems.forEach(gem => {
                const key = `${gem.gridX},${gem.gridY}`;
                const matchInfo = matchMap.get(key);
                
                if (matchInfo.matchTypes.length > 1) {
                    // This gem is part of multiple matches
                    this.findConnectedGems(gem, matchMap, intersectingGems);
                }
            });

            if (intersectingGems.size > 0) {
                // We found a special pattern
                const patternType = this.identifyPattern(intersectingGems);
                consolidatedMatches.push({
                    gems: Array.from(intersectingGems),
                    type: patternType
                });
                
                // Mark these gems as processed
                intersectingGems.forEach(gem => {
                    processedGems.add(`${gem.gridX},${gem.gridY}`);
                });
            } else {
                // Regular match
                consolidatedMatches.push(match);
                match.gems.forEach(gem => {
                    processedGems.add(`${gem.gridX},${gem.gridY}`);
                });
            }
        });

        return consolidatedMatches;
    }

    /**
     * Recursively finds all connected gems that are part of a match pattern.
     */
    findConnectedGems(gem, matchMap, connectedGems) {
        const key = `${gem.gridX},${gem.gridY}`;
        if (!connectedGems.has(gem)) {
            connectedGems.add(gem);
            
            // Check adjacent gems
            this.getAdjacentGems(gem.gridX, gem.gridY).forEach(adjGem => {
                if (adjGem && matchMap.has(`${adjGem.gridX},${adjGem.gridY}`)) {
                    this.findConnectedGems(adjGem, matchMap, connectedGems);
                }
            });
        }
    }

    /**
     * Identifies the type of pattern formed by a set of matching gems.
     */
    identifyPattern(gems) {
        const gemArray = Array.from(gems);
        const minX = Math.min(...gemArray.map(g => g.gridX));
        const maxX = Math.max(...gemArray.map(g => g.gridX));
        const minY = Math.min(...gemArray.map(g => g.gridY));
        const maxY = Math.max(...gemArray.map(g => g.gridY));
        
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        
        if (width === 3 && height === 3) {
            return 'L_shape';
        } else if ((width === 3 && height === 2) || (width === 2 && height === 3)) {
            return 'T_shape';
        } else if (width === 3 && height === 3) {
            return 'cross';
        }
        
        return 'special';
    }

    /**
     * Processes all matches found on the board.
     * This includes removing matched gems, calculating scores,
     * and triggering gem falling and refilling.
     */
    async processMatches(matches) {
        // First mark all matching gems
        matches.forEach(match => {
            match.gems.forEach(gem => gem.setMatched(true));
        });

        // Update score in the game scene
        if (this.scene.updateScore) {
            this.scene.updateScore(matches);
        }

        // Animate and remove matched gems
        await this.removeMatches(matches);

        // Handle gems falling to fill empty spaces
        await this.handleFalling();

        // Check for new matches after falling
        const newMatches = this.findMatches();
        if (newMatches.length > 0) {
            // Recursively process new matches (creating chains)
            await this.processMatches(newMatches);
        }
    }

    /**
     * Removes matched gems from the board with appropriate animations.
     * Returns a promise that resolves when all animations are complete.
     */
    async removeMatches(matches) {
        const removalPromises = [];

        matches.forEach(match => {
            match.gems.forEach(gem => {
                // Remove from grid array
                this.gems[gem.gridX][gem.gridY] = null;
                
                // Play removal animation
                removalPromises.push(gem.playDestroyAnimation());
            });
        });

        // Wait for all removal animations to complete
        await Promise.all(removalPromises);
    }
// core/GemGrid.js - Part 4: Gem Falling and Board Refilling

    /**
     * Handles the process of gems falling to fill empty spaces.
     * This creates the cascading effect after matches are removed.
     * Returns a promise that resolves when all falling animations complete.
     */
    async handleFalling() {
        // We process columns independently, from bottom to top
        const fallingPromises = [];
        
        for (let x = 0; x < this.width; x++) {
            // First, calculate how far each gem needs to fall
            let fallDistance = 0;
            
            // Start from the bottom of the grid
            for (let y = this.height - 1; y >= 0; y--) {
                if (!this.gems[x][y]) {
                    // Found an empty space, increase fall distance
                    fallDistance++;
                } else if (fallDistance > 0) {
                    // This gem needs to fall by the accumulated distance
                    const gem = this.gems[x][y];
                    
                    // Update grid array
                    this.gems[x][y] = null;
                    this.gems[x][y + fallDistance] = gem;
                    
                    // Update gem's grid position
                    gem.gridY += fallDistance;
                    
                    // Calculate new pixel position
                    const targetPos = this.gridToPixel(x, gem.gridY);
                    
                    // Create falling animation with acceleration
                    fallingPromises.push(this.animateGemFall(gem, targetPos, fallDistance));
                }
            }
        }

        // Wait for all falling animations to complete
        await Promise.all(fallingPromises);
        
        // Now refill empty spaces at the top
        await this.refillBoard();
    }

    /**
     * Creates a natural-looking falling animation for a gem.
     * The animation accelerates to simulate gravity.
     */
    animateGemFall(gem, targetPos, fallDistance) {
        return new Promise(resolve => {
            // Calculate duration based on fall distance
            // Longer falls take more time, but not linearly
            const duration = Math.min(
                500, // Maximum duration
                200 + (fallDistance * 100) // Base duration plus distance factor
            );

            // Create the falling tween with acceleration
            this.scene.tweens.add({
                targets: gem,
                x: targetPos.x,
                y: targetPos.y,
                duration: duration,
                ease: 'Bounce.easeOut', // Give a slight bounce at the end
                onComplete: () => {
                    // Play landing sound with volume based on fall distance
                    const volume = Math.min(1.0, fallDistance / 5);
                    if (this.scene.audioManager) {
                        this.scene.audioManager.playGemLand(volume);
                    }
                    resolve();
                }
            });
        });
    }

    /**
     * Refills empty spaces at the top of the board with new gems.
     * Creates a flowing animation as new gems appear and fall into place.
     */
    async refillBoard() {
        const refillPromises = [];

        for (let x = 0; x < this.width; x++) {
            let emptySpaces = 0;
            
            // Count empty spaces in this column
            for (let y = 0; y < this.height; y++) {
                if (!this.gems[x][y]) {
                    emptySpaces++;
                    
                    // Create new gem above the board
                    const startPos = this.gridToPixel(x, -emptySpaces);
                    const gem = this.createGemAt(x, y);
                    
                    // Position gem above the board initially
                    gem.x = startPos.x;
                    gem.y = startPos.y;
                    gem.alpha = 0; // Start invisible
                    
                    // Store in grid array
                    this.gems[x][y] = gem;
                    
                    // Create animation for new gem entry
                    refillPromises.push(this.animateNewGem(gem, x, y, emptySpaces));
                }
            }
        }

        // Wait for all new gems to finish falling
        await Promise.all(refillPromises);
    }

    /**
     * Creates a smooth animation for new gems entering the board.
     * Gems fade in as they fall to create a natural appearance.
     */
    animateNewGem(gem, x, y, delayFactor) {
        return new Promise(resolve => {
            // Calculate final position
            const targetPos = this.gridToPixel(x, y);
            
            // Create a sequence of animations
            const timeline = this.scene.tweens.createTimeline();

            // First fade the gem in
            timeline.add({
                targets: gem,
                alpha: 1,
                duration: 200,
                delay: delayFactor * 50, // Stagger the appearances
                ease: 'Linear'
            });

            // Then make it fall into place
            timeline.add({
                targets: gem,
                y: targetPos.y,
                duration: 500,
                ease: 'Bounce.easeOut',
                onComplete: resolve
            });

            timeline.play();
        });
    }
// core/GemGrid.js - Part 5: State Management and Utilities

    /**
     * Updates the game grid's state each frame.
     * Handles continuous effects and animations.
     */
    update(delta) {
        // Update any active gem animations
        this.updateGemAnimations(delta);

        // Check for automatic matches if we're in an idle state
        if (this.canInput && !this.isProcessing) {
            const automaticMatches = this.findMatches();
            if (automaticMatches.length > 0) {
                this.processMatches(automaticMatches);
            }
        }
    }

    /**
     * Updates any gems that have active animations.
     * This keeps idle animations and special effects running smoothly.
     */
    updateGemAnimations(delta) {
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const gem = this.gems[x][y];
                if (gem && gem.hasActiveAnimations) {
                    gem.updateAnimations(delta);
                }
            }
        }
    }

    /**
     * Checks if the grid is currently stable or if animations/processing
     * are still in progress.
     */
    isGridStable() {
        // Check if any gems are still animating
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const gem = this.gems[x][y];
                if (gem && gem.isAnimating) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Returns an array of all adjacent gems to a given position.
     * Useful for checking possible moves and special effects.
     */
    getAdjacentGems(x, y) {
        const adjacent = [];
        
        // Check all four directions
        const directions = [
            {dx: 0, dy: -1}, // up
            {dx: 1, dy: 0},  // right
            {dx: 0, dy: 1},  // down
            {dx: -1, dy: 0}  // left
        ];

        for (const dir of directions) {
            const newX = x + dir.dx;
            const newY = y + dir.dy;
            
            if (this.isValidGridPosition({x: newX, y: newY})) {
                adjacent.push(this.gems[newX][newY]);
            }
        }

        return adjacent;
    }

    /**
     * Checks if there are any possible moves available on the board.
     * If not, we might need to reshuffle.
     */
    hasValidMoves() {
        // Check each position on the board
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                // Get adjacent gems
                const adjacent = this.getAdjacentGems(x, y);
                
                // Try swapping with each adjacent gem
                for (const adjGem of adjacent) {
                    if (this.wouldCreateMatch(
                        this.gems[x][y],
                        adjGem
                    )) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Reshuffles the board when no moves are available.
     * Ensures the new configuration has valid moves.
     */
    async reshuffleBoard() {
        // Disable input during reshuffle
        this.canInput = false;

        // Create fade out animation for all gems
        const fadePromises = [];
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                const gem = this.gems[x][y];
                fadePromises.push(
                    this.scene.tweens.add({
                        targets: gem,
                        alpha: 0,
                        duration: 300,
                        ease: 'Linear'
                    })
                );
            }
        }

        // Wait for fade out to complete
        await Promise.all(fadePromises);

        // Shuffle gems until we have a valid board
        do {
            this.shuffleGems();
        } while (!this.hasValidMoves() || this.findMatches().length > 0);

        // Fade gems back in with a cascade effect
        const fadeInPromises = [];
        for (let y = this.height - 1; y >= 0; y--) {
            for (let x = 0; x < this.width; x++) {
                const gem = this.gems[x][y];
                fadeInPromises.push(
                    this.scene.tweens.add({
                        targets: gem,
                        alpha: 1,
                        duration: 300,
                        delay: (this.height - y) * 50,
                        ease: 'Linear'
                    })
                );
            }
        }

        // Wait for fade in to complete
        await Promise.all(fadeInPromises);

        // Re-enable input
        this.canInput = true;
    }

    /**
     * Helper method to shuffle gems on the board.
     * Used during reshuffling when no moves are available.
     */
    shuffleGems() {
        // Create array of all gems
        const allGems = this.gems.flat();
        
        // Fisher-Yates shuffle
        for (let i = allGems.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            
            // Swap grid positions
            const tempX = allGems[i].gridX;
            const tempY = allGems[i].gridY;
            
            allGems[i].gridX = allGems[j].gridX;
            allGems[i].gridY = allGems[j].gridY;
            
            allGems[j].gridX = tempX;
            allGems[j].gridY = tempY;
            
            // Update grid array
            this.gems[allGems[i].gridX][allGems[i].gridY] = allGems[i];
            this.gems[allGems[j].gridX][allGems[j].gridY] = allGems[j];
        }
    }

    /**
     * Clean up the grid and remove any references.
     * Called when transitioning away from the game.
     */
    destroy() {
        // Destroy all gems
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.gems[x][y]) {
                    this.gems[x][y].destroy();
                }
            }
        }

        // Clear arrays and references
        this.gems = [];
        this.selectedGem = null;
    }
}