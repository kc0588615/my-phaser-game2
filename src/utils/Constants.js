// utils/Constants.js
// This file centralizes all game configuration values and magic numbers
// Making them easy to tune and adjust during development

export const GRID_CONFIG = {
    DEFAULT_WIDTH: 7,
    DEFAULT_HEIGHT: 8,
    MIN_MATCH_LENGTH: 3,
    CELL_SIZE: 64,
    SWAP_THRESHOLD: 0.5,  // How far a drag needs to go to trigger a swap
    FALL_SPEED: 600,      // Pixels per second for falling gems
    MAX_FALL_SPEED: 1200  // Maximum falling speed
};

export const ANIMATION_TIMINGS = {
    SWAP: 200,           // Duration of gem swap animation
    MATCH_FLASH: 300,    // How long matched gems flash before disappearing
    FALL: 400,          // Base duration for falling animation
    POPUP: 500,         // Duration for popup animations
    COMBO_DISPLAY: 1000  // How long combo text stays on screen
};

export const SCORING = {
    // Base points for different match lengths
    MATCH_SCORES: {
        3: 100,   // 3 gems = 100 points
        4: 300,   // 4 gems = 300 points
        5: 1000,  // 5 gems = 1000 points
        6: 3000   // 6+ gems = 3000 points
    },
    
    // Multipliers for special patterns
    PATTERN_MULTIPLIERS: {
        L_SHAPE: 1.5,
        T_SHAPE: 1.5,
        CROSS: 2.0
    },
    
    // How much each combo level increases score
    COMBO_MULTIPLIER: 1.5
};

export const PARTICLES = {
    MATCH: {
        COUNT: 15,       // Particles per matched gem
        LIFETIME: 600,   // How long particles last
        MIN_SPEED: 50,
        MAX_SPEED: 150,
        START_SCALE: 0.6,
        END_SCALE: 0
    },
    COMBO: {
        BASE_COUNT: 20,  // Base number of particles per combo level
        LIFETIME: 1000,
        MIN_SPEED: 100,
        MAX_SPEED: 200,
        START_SCALE: 0.8,
        END_SCALE: 0
    }
};

// Gem types and their properties
export const GEM_TYPES = {
    BLUE: {
        id: 'blue',
        frame: 0,
        color: 0x4D9BE6
    },
    GREEN: {
        id: 'green',
        frame: 1,
        color: 0x1EBC73
    },
    RED: {
        id: 'red',
        frame: 2,
        color: 0xF04F78
    },
    YELLOW: {
        id: 'yellow',
        frame: 3,
        color: 0xF9C22B
    },
    PURPLE: {
        id: 'purple',
        frame: 4,
        color: 0x9F5BBA
    },
    WHITE: {
        id: 'white',
        frame: 5,
        color: 0xFFFFFF
    }
};

// Game states for state machine
export const GAME_STATES = {
    IDLE: 'IDLE',
    MOVING: 'MOVING',
    MATCHING: 'MATCHING',
    REFILLING: 'REFILLING'
};