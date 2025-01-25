// Game.js - Part 1: Core Setup and Initialization

import Phaser from 'phaser';
import { GemGrid } from '../core/GemGrid';
import { AudioManager } from '../systems/AudioManager';
import { ParticleSystem } from '../systems/ParticleSystem';
import { Gem } from '../core/Gem';
import { GEM_TYPES } from '../utils/Constants';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');

        // Core game configuration
        this.config = {
            grid: {
                width: 7,
                height: 8,
                cellSize: 64,
                x: 400, // Center of game width (800/2)
                y: 100
            },
            animation: {
                gemSwapDuration: 200,
                gemFallDuration: 400,
                matchFlashDuration: 300
            }
        };

        // Game state
        this.isProcessing = false;

        // Score tracking
        this.score = 0;
        this.combo = 0;
    }

    preload() {
        // Load all required assets
        this.loadGemAssets();
        this.loadAudioAssets();
        this.loadParticleAssets();
    }
loadGemAssets() {
    // Load gem sprites for each color
    const gemColors = ['blue', 'green', 'red', 'orange', 'black', 'white'];
    gemColors.forEach(color => {
        // Each gem has 8 animation frames
        for (let i = 0; i < 8; i++) {
            this.load.image(
                `gem_${color}_${i}`,
                `assets/gems/${color}_gem_${i}.png`
            );
        }

        // Create animation for each gem type
        this.anims.create({
            key: `gem_${color}_idle`,
            frames: Array.from({ length: 8 }, (_, i) => ({ key: `gem_${color}_${i}` })),
            frameRate: 10,
            repeat: -1
        });
    });
}

    loadAudioAssets() {
        this.load.audio('gemSelect', 'assets/audio/gem_select.mp3');
        this.load.audio('gemMatch', 'assets/audio/gem_match.mp3');
        this.load.audio('gemLand', 'assets/audio/gem_land.mp3');
        this.load.audio('achievementUnlock', 'assets/audio/achievement.mp3');
        // ... (load other audio assets)
    }

    loadParticleAssets() {
        this.load.atlas(
            'gems',
            'assets/particles/gems.png',
            'assets/particles/gems.json'
        );
        // ... (load other particle assets)
    }

    create() {
        // Initialize core game components
        this.initializeGameComponents();
        this.setupEventListeners();
        this.createUI();

        // Start with a fresh grid
        this.gemGrid.fillGrid();
    }

    initializeGameComponents() {
        // Create main game systems
        this.gemGrid = new GemGrid(this, this.config.grid);
        this.audioManager = new AudioManager(this);
        this.particleSystem = new ParticleSystem(this);
        this.progressionManager = new this.ProgressionManager(this); // create instance of ProgressionManager in Game class


        // Setup input handling
        this.input.addPointer(2); // Enable multi-touch
        this.setupInputHandling();
    }

    setupInputHandling() {
        // Handle both mouse and touch input
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        // Prevent default touch behaviors on mobile
        this.game.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, false);
    }

    setupEventListeners() {
        // Example: Listen for game pause/resume events if needed
        // this.events.on('pause', this.gamePaused, this);
        // this.events.on('resume', this.gameResumed, this);
    }

    createUI() {
        // Create score display
        this.scoreText = this.add.text(16, 16, 'Score: 0', {
            fontSize: '32px',
            fill: '#fff',
            fontFamily: 'Arial'
        });

        // Create combo display
        this.comboText = this.add.text(16, 56, '', {
            fontSize: '24px',
            fill: '#ffff00',
            fontFamily: 'Arial'
        });
        this.comboText.setVisible(false);
    }

    // Game.js - Part 2: Input Handling and Drag Mechanics

    /**
     * Handles the initial pointer/touch down event.
     * This is where we start tracking potential gem movements.
     */
    handlePointerDown(pointer) {
        // Only process input when not processing other actions
        if (this.isProcessing) {
            return;
        }

        // Convert screen coordinates to grid position
        const gridPosition = this.gemGrid.pixelToGrid(pointer.x, pointer.y);

        // Validate that the click is within our grid boundaries
        if (!this.gemGrid.isValidGridPosition(gridPosition)) {
            return;
        }

        // Initialize drag tracking
        this.dragState = {
            startPosition: new Phaser.Math.Vector2(pointer.x, pointer.y),
            startGridPosition: gridPosition,
            isDragging: true,
            dragDirection: null,
            selectedGem: this.gemGrid.getGemAt(gridPosition.x, gridPosition.y)
        };

        // Provide visual feedback that the gem is selected
        if (this.dragState.selectedGem) { // Check if selectedGem exists before calling setSelected
            this.dragState.selectedGem.setSelected(true);
        }


        // Play selection sound
        this.audioManager.playGemSelect();
    }

    /**
     * Handles continuous pointer/touch movement.
     * This determines the drag direction and provides real-time visual feedback.
     */
    handlePointerMove(pointer) {
        if (!this.dragState?.isDragging) {
            return;
        }

        // Calculate the distance moved from the start position
        const dragDelta = new Phaser.Math.Vector2(
            pointer.x - this.dragState.startPosition.x,
            pointer.y - this.dragState.startPosition.y
        );

        // Don't start actual dragging until we've moved a minimum distance
        // This prevents accidental movements
        const MIN_DRAG_DISTANCE = 10;
        if (dragDelta.length() < MIN_DRAG_DISTANCE) {
            return;
        }

        // Determine drag direction if we haven't already
        if (!this.dragState.dragDirection) {
            // Compare x and y movement to determine if this is a row or column drag
            this.dragState.dragDirection = Math.abs(dragDelta.x) > Math.abs(dragDelta.y)
                ? 'row'
                : 'column';

            // Once we know the direction, we can setup the affected gems
            this.setupAffectedGems();
        }

        // Calculate how far to move the gems based on drag distance
        const dragAmount = this.calculateDragAmount(dragDelta);

        // Update the position of all affected gems
        this.updateGemPositions(dragAmount);

        // Show preview of potential matches
        this.showMatchPreview(dragAmount);
    }

    /**
     * Sets up the collection of gems that will be affected by this drag operation.
     * For row moves, this is all gems in the same row.
     * For column moves, this is all gems in the same column.
     */
    setupAffectedGems() {
        const { startGridPosition, dragDirection } = this.dragState;

        if (dragDirection === 'row') {
            // For row moves, collect all gems in this row
            this.dragState.affectedGems = this.gemGrid.getRow(startGridPosition.y);
        } else {
            // For column moves, collect all gems in this column
            this.dragState.affectedGems = this.gemGrid.getColumn(startGridPosition.x);
        }

        // Store original positions for smooth movement calculations
        this.dragState.originalPositions = this.dragState.affectedGems.map(gem => ({
            x: gem.x,
            y: gem.y
        }));
    }

    /**
     * Calculates how far gems should move based on the current drag distance.
     * Includes wrapping behavior when gems reach the edge of the grid.
     */
    calculateDragAmount(dragDelta) {
        const { dragDirection } = this.dragState;

        // Get the relevant drag distance based on direction
        const distance = dragDirection === 'row' ? dragDelta.x : dragDelta.y;

        // Calculate grid size in pixels for the relevant direction
        const gridSize = dragDirection === 'row'
            ? this.config.grid.width * this.config.grid.cellSize
            : this.config.grid.height * this.config.grid.cellSize;

        // Implement wrapping behavior
        let amount = distance;
        if (Math.abs(amount) > gridSize / 2) {
            // If we've dragged more than halfway across the grid,
            // wrap to the other side
            amount = amount > 0
                ? amount - gridSize
                : amount + gridSize;
        }

        return amount;
    }

    /**
     * Updates the visual position of all gems affected by the current drag operation.
     * Handles both row and column movements with wrapping.
     */
    updateGemPositions(dragAmount) {
        const { affectedGems, originalPositions, dragDirection } = this.dragState;

        affectedGems.forEach((gem, index) => {
            const origPos = originalPositions[index];

            if (dragDirection === 'row') {
                // Calculate new X position with wrapping
                let newX = origPos.x + dragAmount;
                const gridWidth = this.config.grid.width * this.config.grid.cellSize;

                if (newX < 0) newX += gridWidth;
                if (newX >= gridWidth) newX -= gridWidth;

                gem.x = newX;
            } else {
                // Calculate new Y position with wrapping
                let newY = origPos.y + dragAmount;
                const gridHeight = this.config.grid.height * this.config.grid.cellSize;

                if (newY < 0) newY += gridHeight;
                if (newY >= gridHeight) newY -= gridHeight;

                gem.y = newY;
            }
        });
    }

    // Game.js - Part 3: Match Detection and Processing

    /**
     * Handles the end of a drag operation, determining if the move creates
     * any matches and processing them if so.
     */
    handlePointerUp(pointer) {
        if (!this.dragState?.isDragging) {
            return;
        }

        // Calculate final movement amount to determine if this is a valid move
        const finalDragAmount = this.calculateFinalMove(pointer);

        if (this.isValidMove(finalDragAmount)) {
            // Convert drag amount to grid movement
            const moveAction = this.createMoveAction(finalDragAmount);

            // Check if this move creates any matches
            const potentialMatches = this.gemGrid.findPotentialMatches(moveAction);

            if (potentialMatches.length > 0) {
                // Valid move with matches - process it
                this.processValidMove(moveAction, potentialMatches);
            } else {
                // No matches - snap gems back to original positions
                this.snapGemsBack();
            }
        } else {
            // Not a large enough movement - snap back
            this.snapGemsBack();
        }

        // Clean up drag state
        this.cleanupDragOperation();
    }

    /**
     * Determines if a drag movement constitutes a valid move attempt.
     * A move is valid if it would result in at least one full grid cell
     * of movement.
     */
    isValidMove(dragAmount) {
        const cellSize = this.config.grid.cellSize;
        return Math.abs(dragAmount) >= cellSize / 2;
    }

    /**
     * Creates a formal move action from a drag amount.
     * This converts pixel movement into grid cell movement.
     */
    createMoveAction(dragAmount) {
        const { dragDirection, startGridPosition } = this.dragState;
        const cellSize = this.config.grid.cellSize;

        // Convert pixel movement to grid cells, rounding to nearest cell
        const cells = Math.round(dragAmount / cellSize);

        return {
            type: dragDirection,
            index: dragDirection === 'row'
                ? startGridPosition.y
                : startGridPosition.x,
            amount: cells
        };
    }

    /**
     * Processes a valid move that creates matches.
     * This initiates the chain of events that happens after a successful move.
     */
    async processValidMove(moveAction, initialMatches) {
        this.isProcessing = true;

        try {
            // Animate the move
            await this.animateMove(moveAction);

            // Process initial matches
            if (initialMatches.length > 0) {
                await this.processMatches(initialMatches);
                await this.processGemFalling();
                await this.fillEmptySpaces();
            }

        } catch (error) {
            console.error('Error processing move:', error);
        }

        this.isProcessing = false;
    }

    /**
     * Animates the movement of gems for a given move action.
     * Returns a promise that resolves when the animation is complete.
     */
    animateMove(moveAction) {
        return new Promise(resolve => {
            const affectedGems = this.gemGrid.getGemsForMove(moveAction);
            const targetPositions = this.gemGrid.calculateTargetPositions(moveAction);

            // Create a tween for each affected gem
            const tweens = affectedGems.map((gem, index) => {
                return this.tweens.add({
                    targets: gem,
                    x: targetPositions[index].x,
                    y: targetPositions[index].y,
                    duration: this.config.animation.gemSwapDuration,
                    ease: 'Quad.easeInOut'
                });
            });

            // Wait for all tweens to complete
            this.tweens.add({
                targets: {},
                duration: this.config.animation.gemSwapDuration,
                onComplete: resolve,
                onCompleteScope: this
            });
        });
    }

    /**
     * Processes a set of matches, removing matched gems and updating score.
     * Returns a promise that resolves when all match animations are complete.
     */
    async processMatches(matches) {
        // First highlight matching gems
        await this.highlightMatches(matches);

        // Calculate score for these matches
        this.updateScore(matches);

        // Play match sound effect
        this.audioManager.playMatchSound(this.combo);

        // Remove matched gems
        await this.removeMatchedGems(matches);
    }

    /**
     * Creates a visual highlight effect for matching gems before they disappear.
     */
    highlightMatches(matches) {
        return new Promise(resolve => {
            const highlightTweens = [];

            matches.forEach(match => {
                match.gems.forEach(gem => {
                    // Create a flash effect
                    highlightTweens.push(
                        this.tweens.add({
                            targets: gem,
                            scale: 1.2,
                            alpha: 0.8,
                            duration: this.config.animation.matchFlashDuration / 2,
                            yoyo: true,
                            repeat: 1
                        })
                    );
                });
            });

            // Wait for all highlight effects to complete
            this.tweens.add({
                targets: {},
                duration: this.config.animation.matchFlashDuration,
                onComplete: resolve
            });
        });
    }

    // Game.js - Part 4: Falling and Refilling Mechanics

    /**
     * Manages the process of gems falling to fill empty spaces.
     * This creates the cascading effect players expect in match-3 games.
     */
    async processGemFalling() {
        // First, calculate how far each gem needs to fall
        const fallingData = this.calculateFallingDistances();

        // No gems need to fall - we can skip the animation
        if (fallingData.length === 0) {
            return;
        }

        // Sort falling gems from bottom to top
        // This prevents gems from appearing to pass through each other
        fallingData.sort((a, b) => b.fromY - a.fromY);

        // Create and track all falling animations
        const fallPromises = fallingData.map(data =>
            this.animateGemFall(data.gem, data.toY)
        );

        // Wait for all falling animations to complete
        await Promise.all(fallPromises);

        // Update the internal grid structure to match new positions
        this.updateGridAfterFalling(fallingData);
    }

    /**
     * Calculates how far each gem needs to fall to fill empty spaces.
     * Returns an array of objects containing gems and their target positions.
     */
    calculateFallingDistances() {
        const fallingData = [];

        // Process each column independently
        for (let x = 0; x < this.config.grid.width; x++) {
            let emptySpaces = 0;

            // Start from the bottom of the grid
            for (let y = 0; y < this.config.grid.height; y++) {
                const currentGem = this.gemGrid.getGemAt(x, y);

                if (!currentGem) {
                    // Found an empty space - increment counter
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    // Found a gem that needs to fall
                    fallingData.push({
                        gem: currentGem,
                        fromY: y,
                        toY: y - emptySpaces,
                        column: x
                    });
                }
            }
        }

        return fallingData;
    }

    /**
     * Creates a smooth falling animation for a single gem.
     * The fall speed increases over time to simulate gravity.
     */
    animateGemFall(gem, targetY) {
        return new Promise(resolve => {
            // Calculate the distance this gem needs to fall
            const distance = targetY - gem.gridY;

            // Adjust duration based on fall distance
            // Longer falls take more time, but not linearly
            const duration = Math.min(
                this.config.animation.gemFallDuration,
                this.config.animation.gemFallDuration * Math.sqrt(Math.abs(distance))
            );

            // Create falling animation with easing
            this.tweens.add({
                targets: gem,
                y: this.gemGrid.gridToPixelY(targetY),
                duration: duration,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    // Play landing sound with volume based on fall distance
                    const volume = Math.min(1.0, distance / 5);
                    this.audioManager.playGemLand(volume);

                    resolve();
                }
            });
        });
    }

    /**
     * Fills empty spaces at the top of the grid with new gems.
     * Creates a flowing animation as new gems appear and fall into place.
     */
    async fillEmptySpaces() {
        const newGems = [];

        // Find all empty spaces that need new gems
        for (let x = 0; x < this.config.grid.width; x++) {
            let emptySpaces = 0;

            // Count empty spaces in this column
            for (let y = 0; y < this.config.grid.height; y++) {
                if (!this.gemGrid.getGemAt(x, y)) {
                    emptySpaces++;

                    // Create a new gem above the grid
                    const newGem = this.gemGrid.createGem( // Use gemGrid.createGem from GemGrid class
                        x,
                        -emptySpaces,  // Start above the grid
                        this.getRandomGemType()
                    );

                    // Track the new gem
                    newGems.push({
                        gem: newGem,
                        targetY: y
                    });
                }
            }
        }

        // Animate all new gems falling into place
        const fallPromises = newGems.map(data =>
            this.animateNewGemEntry(data.gem, data.targetY)
        );

        // Wait for all new gems to finish falling
        await Promise.all(fallPromises);

        // Update grid with new gems in their final positions
        this.updateGridWithNewGems(newGems);
    }

    /**
     * Creates a special animation for new gems entering the grid.
     * They fade in as they fall to create a smooth appearance.
     */
    animateNewGemEntry(gem, targetY) {
        return new Promise(resolve => {
            // Start gem as invisible
            gem.alpha = 0;

            // Create a sequence of animations
            const timeline = this.tweens.createTimeline();

            // First fade the gem in
            timeline.add({
                targets: gem,
                alpha: 1,
                duration: 200,
                ease: 'Linear'
            });

            // Then make it fall into place
            timeline.add({
                targets: gem,
                y: this.gemGrid.gridToPixelY(targetY),
                duration: this.config.animation.gemFallDuration,
                ease: 'Bounce.easeOut',
                onComplete: resolve
            });

            timeline.play();
        });
    }

    // Game.js - Part 5: Scoring and Combo System

    /**
     * Handles scoring for matches, applying multipliers and combo bonuses.
     * The scoring system rewards larger matches and chain reactions.
     */
    updateScore(matches) {
        let pointsEarned = 0;

        // Calculate base points for each match
        matches.forEach(match => {
            // Base points depend on match length
            const basePoints = this.calculateBasePoints(match);

            // Apply combo multiplier
            const comboMultiplier = this.calculateComboMultiplier();

            // Add special pattern bonuses
            const patternBonus = this.checkForSpecialPatterns(match);

            // Calculate total points for this match
            const matchPoints = Math.floor(
                basePoints * comboMultiplier * patternBonus
            );

            pointsEarned += matchPoints;

            // Show floating score text for this match
            this.showFloatingScore(match, matchPoints);
        });

        // Update total score
        this.score += pointsEarned;
        this.updateScoreDisplay();

        // Trigger any score milestone achievements
        this.checkScoreMilestones();
    }

    /**
     * Calculates base points for a match based on its length and shape.
     * Longer matches are worth exponentially more points.
     */
    calculateBasePoints(match) {
        // Start with base points for minimum match length (3)
        let points = 100;

        // Add bonus for each additional gem in the match
        const extraGems = match.gems.length - 3;
        if (extraGems > 0) {
            // Each extra gem doubles the points
            points *= Math.pow(2, extraGems);
        }

        return points;
    }

    /**
     * Calculates score multiplier based on current combo count.
     * Encourages players to create chain reactions.
     */
    calculateComboMultiplier() {
        if (this.combo === 0) {
            return 1.0;
        }

        // Multiplier increases with each combo, but has diminishing returns
        return 1.0 + (Math.log2(this.combo + 1) * 0.5);
    }

    /**
     * Checks for special match patterns that deserve bonus points.
     * Examples include L-shapes, T-shapes, and crosses.
     */
    checkForSpecialPatterns(match) {
        // Convert match to grid representation for pattern checking
        const matchGrid = this.convertMatchToGrid(match);
        let bonus = 1.0;

        // Check for L-shape (3x3 grid with 5 gems in L pattern)
        if (this.isLShape(matchGrid)) {
            bonus *= 1.5;
        }

        // Check for T-shape (3x3 grid with 5 gems in T pattern)
        if (this.isTShape(matchGrid)) {
            bonus *= 1.5;
        }

        // Check for cross shape (5x5 grid with gems in + pattern)
        if (this.isCrossShape(matchGrid)) {
            bonus *= 2.0;
        }

        return bonus;
    }

    /**
     * Shows floating score text that rises and fades out.
     * Provides immediate visual feedback for points earned.
     */
    showFloatingScore(match, points) {
        // Calculate center position of the match
        const center = this.calculateMatchCenter(match);

        // Create score text
        const scoreText = this.add.text(
            center.x,
            center.y,
            `+${points}`,
            {
                fontSize: '28px',
                fontFamily: 'Arial',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        scoreText.setOrigin(0.5);

        // Create floating animation
        this.tweens.add({
            targets: scoreText,
            y: center.y - 100,  // Float upward
            alpha: 0,           // Fade out
            duration: 1000,
            ease: 'Cubic.easeOut',
            onComplete: () => scoreText.destroy()
        });

        // If this is part of a combo, show combo counter
        if (this.combo > 0) {
            this.showComboIndicator();
        }
    }

    /**
     * Displays an animated combo counter when chains occur.
     * Creates excitement for consecutive matches.
     */
    showComboIndicator() {
        // Create or update combo text
        if (!this.activeComboText) {
            this.activeComboText = this.add.text(
                this.sys.game.config.width / 2,
                this.sys.game.config.height / 2,
                `${this.combo}x COMBO!`,
                {
                    fontSize: '48px',
                    fontFamily: 'Arial',
                    color: '#FFD700',
                    stroke: '#000000',
                    strokeThickness: 6
                }
            );
            this.activeComboText.setOrigin(0.5);
        } else {
            this.activeComboText.setText(`${this.combo}x COMBO!`);
        }

        // Scale up and down animation
        this.tweens.add({
            targets: this.activeComboText,
            scale: { from: 0.5, to: 1 },
            duration: 200,
            yoyo: true,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Start fade out after a delay
                this.time.delayedCall(500, () => {
                    this.tweens.add({
                        targets: this.activeComboText,
                        alpha: 0,
                        duration: 300,
                        onComplete: () => {
                            this.activeComboText.destroy();
                            this.activeComboText = null;
                        }
                    });
                });
            }
        });
    }

    /**
     * Updates the persistent score display.
     * Animates score counter rolling up to new value.
     */
    updateScoreDisplay() {
        // Animate score counter rolling up to new value
        const currentScore = parseInt(this.scoreText.text.replace('Score: ', ''));

        this.tweens.addCounter({
            from: currentScore,
            to: this.score,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const value = Math.floor(tween.getValue());
                this.scoreText.setText(`Score: ${value}`);
            }
        });
    }

    ProgressionManager = class  { // Removed export, and class keyword - moved inside Game class

        constructor(scene) {
            this.scene = scene;
            this.initializeAchievements();

            // Track player stats across sessions using localStorage
            this.playerStats = this.loadPlayerStats();

            // Milestone thresholds for different rewards
            this.scoreThresholds = [
                1000, 5000, 10000, 25000, 50000, 100000
            ];

            // Special gem unlocks at different levels
            this.gemUnlockLevels = {
                5: 'rainbow',    // Rainbow gem unlocks at level 5
                10: 'bomb',      // Bomb gem unlocks at level 10
                15: 'lightning'  // Lightning gem unlocks at level 15
            };
        }

        savePlayerStats() {
            try {
                localStorage.setItem('gemGameStats', JSON.stringify(this.playerStats));
            } catch (error) {
                console.error('Error saving player stats:', error);
            }
        }

        loadPlayerStats() {
            try {
                const savedStats = localStorage.getItem('gemGameStats');
                if (savedStats) {
                    return JSON.parse(savedStats);
                }
            } catch (error) {
                console.error('Error loading player stats:', error);
            }
            
            // Return default stats if nothing is saved or there's an error
            return {
                level: 1,
                experience: 0,
                highScore: 0,
                achievements: {}
            };
        }

        /**
         * Initializes the achievement system with various goals for players.
         * Different types of achievements encourage diverse play styles.
         */
        initializeAchievements() {
            this.achievements = {
                matchMaster: {
                    title: "Match Master",
                    tiers: [
                        { requirement: 100, reward: 1000, completed: false },
                        { requirement: 500, reward: 5000, completed: false },
                        { requirement: 1000, reward: 10000, completed: false }
                    ],
                    currentCount: 0,
                    description: "Make {0} matches"
                },
                comboKing: {
                    title: "Combo King",
                    tiers: [
                        { requirement: 5, reward: 2000, completed: false },
                        { requirement: 10, reward: 10000, completed: false },
                        { requirement: 15, reward: 20000, completed: false }
                    ],
                    currentCount: 0,
                    description: "Achieve a {0}x combo"
                },
                // More achievement definitions...
            };
        }

        /**
         * Checks for and handles achievement progress after each game action.
         * This provides regular feedback and rewards for player accomplishments.
         */
        checkAchievements(actionType, actionData) {
            switch (actionType) {
                case 'match':
                    this.updateMatchAchievements(actionData);
                    break;
                case 'combo':
                    this.updateComboAchievements(actionData);
                    break;
                case 'special':
                    this.updateSpecialPatternAchievements(actionData);
                    break;
            }

            // Save progress after each update
            this.savePlayerStats();
        }

        /**
         * Creates engaging visual and audio feedback when achievements are unlocked.
         * Makes reaching goals feel special and memorable.
         */
        displayAchievementUnlock(achievement, tier) {
            // Create achievement popup container
            const popup = this.scene.add.container(
                this.scene.sys.game.config.width / 2,
                -100  // Start above screen
            );

            // Add background with shine effect
            const bg = this.scene.add.sprite(0, 0, 'achievement-bg');
            bg.setScale(2);
            popup.add(bg);

            // Add achievement icon
            const icon = this.scene.add.sprite(-80, 0, 'achievements', achievement.iconFrame);
            popup.add(icon);

            // Add text elements
            const title = this.scene.add.text(
                -50, -20,
                achievement.title,
                { fontSize: '24px', color: '#FFD700', fontWeight: 'bold' }
            );
            const description = this.scene.add.text(
                -50, 10,
                achievement.description.replace('{0}', tier.requirement),
                { fontSize: '16px', color: '#FFFFFF' }
            );
            popup.add([title, description]);

            // Animate popup entry
            this.scene.tweens.add({
                targets: popup,
                y: 100,  // Final position
                duration: 1000,
                ease: 'Bounce.easeOut',
                onComplete: () => {
                    // Add sparkle effects
                    this.createAchievementSparkles(popup);

                    // Play achievement sound
                    this.scene.audioManager.playAchievementSound();

                    // Remove after display duration
                    this.scene.time.delayedCall(3000, () => {
                        this.scene.tweens.add({
                            targets: popup,
                            y: -100,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => popup.destroy()
                        });
                    });
                }
            });
        }

        /**
         * Updates player level based on experience points.
         * Higher levels unlock new features and increase difficulty.
         */
        updatePlayerLevel() {
            const oldLevel = this.playerStats.level;
            const newLevel = this.calculateLevel(this.playerStats.experience);

            if (newLevel > oldLevel) {
                this.playerStats.level = newLevel;
                this.handleLevelUp(newLevel);
            }
        }

        /**
         * Manages special events and rewards when a player levels up.
         * Makes progression feel meaningful and exciting.
         */
        async handleLevelUp(newLevel) {
            // Show level up celebration
            await this.showLevelUpAnimation(newLevel);

            // Check for new gem unlocks
            if (this.gemUnlockLevels[newLevel]) {
                const newGemType = this.gemUnlockLevels[newLevel];
                await this.showNewGemUnlock(newGemType);
                this.unlockNewGemType(newGemType);
            }

            // Update difficulty
            this.adjustDifficultyForLevel(newLevel);

            // Save updated stats
            this.savePlayerStats();
        }

        checkAchievementProgress(achievementKey) {
            const achievement = this.achievements[achievementKey];
            if (!achievement) return;

            achievement.tiers.forEach((tier, index) => {
                if (!tier.completed && achievement.currentCount >= tier.requirement) {
                    tier.completed = true;
                    this.displayAchievementUnlock(achievement, tier);
                    this.playerStats.experience += tier.reward;
                    this.updatePlayerLevel();
                    // Unlock reward (e.g., new item, boost, etc.)
                    console.log(`Achievement Tier ${index + 1} of '${achievement.title}' Unlocked! Reward: ${tier.reward} XP`);
                }
            });
        }

        createAchievementSparkles(popup) {
            const particles = this.scene.particleSystem.emitter.createEmitter({
                frame: ['flame01', 'flame02', 'flame03', 'flame04', 'flame05', 'flame06'],
                x: popup.x,
                y: popup.y,
                speed: { min: 50, max: 200 },
                angle: { min: -180, max: 180 },
                scale: { start: 1, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 1000,
                blendMode: 'ADD',
                frequency: 50,
                quantity: 5,
                emitting: false // Will be emitted briefly
            });

            particles.explode(100); // Emit a burst of particles
        }

        calculateLevel(experience) {
            // Simple level calculation - adjust as needed
            return Math.floor(experience / 1000) + 1;
        }

        unlockNewGemType(gemType) {
            // Placeholder for unlocking new gem types
            console.log(`Unlocked new gem type: ${gemType}`);
            // Implement actual gem unlocking logic if needed
        }

        adjustDifficultyForLevel(level) {
            // Placeholder for difficulty adjustment based on level
            console.log(`Difficulty adjusted for level: ${level}`);
            // Implement actual difficulty scaling logic if needed
        }

        showLevelUpAnimation(level) {
            return new Promise(resolve => {
                // Placeholder for level up animation
                console.log(`Level Up! Reached level: ${level}`);
                this.scene.time.delayedCall(1000, resolve); // Simulate animation duration
            });
        }

        showNewGemUnlock(gemType) {
            return new Promise(resolve => {
                // Placeholder for new gem unlock animation
                console.log(`New gem unlocked: ${gemType}`);
                this.scene.time.delayedCall(1000, resolve); // Simulate animation duration
            });
        }
    } // Closing brace for ProgressionManager class (moved outside updateScoreDisplay)


    cleanupDragOperation() {
        if (this.dragState?.selectedGem) {
            this.dragState.selectedGem.setSelected(false);
        }
        this.dragState = {}; // Reset drag state
    }

    snapGemsBack() {
        const { affectedGems, originalPositions } = this.dragState;

        affectedGems.forEach((gem, index) => {
            const origPos = originalPositions[index];
            this.tweens.add({
                targets: gem,
                x: origPos.x,
                y: origPos.y,
                duration: this.config.animation.gemSwapDuration,
                ease: 'Back.easeOut'
            });
        });
    }
    calculateFinalMove(pointer) {
        if (!this.dragState) return 0;

        const dragDelta = new Phaser.Math.Vector2(
            pointer.x - this.dragState.startPosition.x,
            pointer.y - this.dragState.startPosition.y
        );

        return this.dragState.dragDirection === 'row' ? dragDelta.x : dragDelta.y;
    }

    getRandomGemType() {
        const gemTypes = Object.values(GEM_TYPES);
        const randomIndex = Math.floor(Math.random() * gemTypes.length);
        return gemTypes[randomIndex].id;
    }
}