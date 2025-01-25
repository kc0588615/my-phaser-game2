// core/GameState.js

export class GameState {
    constructor(scene) {
        this.scene = scene;
        
        // Define possible states
        this.states = {
            IDLE: {
                enter: () => this.onEnterIdle(),
                update: (delta) => this.updateIdle(delta)
            },
            MOVING: {
                enter: () => this.onEnterMoving(),
                update: (delta) => this.updateMoving(delta)
            },
            MATCHING: {
                enter: () => this.onEnterMatching(),
                update: (delta) => this.updateMatching(delta)
            },
            REFILLING: {
                enter: () => this.onEnterRefilling(),
                update: (delta) => this.updateRefilling(delta)
            }
        };

        // Start in IDLE state
        this.currentState = 'IDLE';
        
        // Track timing for state transitions
        this.stateTime = 0;
        
        // Allow states to store transition data
        this.transitionData = null;
    }

    update(delta) {
        // Update state timing
        this.stateTime += delta;
        
        // Call current state's update method
        const state = this.states[this.currentState];
        if (state.update) {
            state.update(delta);
        }
    }

    changeState(newState, transitionData = null) {
        // Don't change to same state
        if (newState === this.currentState) {
            return;
        }

        console.log(`State changing from ${this.currentState} to ${newState}`);

        // Exit current state
        const oldState = this.states[this.currentState];
        if (oldState.exit) {
            oldState.exit();
        }

        // Store transition data if provided
        this.transitionData = transitionData;
        
        // Change state and reset timer
        this.currentState = newState;
        this.stateTime = 0;

        // Enter new state
        const state = this.states[newState];
        if (state.enter) {
            state.enter();
        }

        // Emit state change event for other systems
        this.scene.events.emit('gameStateChanged', {
            from: oldState,
            to: newState,
            data: transitionData
        });
    }

    // State Enter Methods
    onEnterIdle() {
        // Enable input
        this.scene.input.enabled = true;
    }

    onEnterMoving() {
        // Disable input during moves
        this.scene.input.enabled = false;
    }

    onEnterMatching() {
        // Start match animations
        this.scene.startMatchAnimations(this.transitionData.matches);
    }

    onEnterRefilling() {
        // Begin refill process
        this.scene.startRefill();
    }

    // State Update Methods
    updateIdle(delta) {
        // Check for automatic matches
        if (this.scene.hasAutomaticMatches()) {
            this.changeState('MATCHING', {
                matches: this.scene.findMatches()
            });
        }
    }

    updateMoving(delta) {
        // Check if move animations are complete
        if (this.scene.areMoveAnimationsComplete()) {
            this.changeState('MATCHING', {
                matches: this.scene.findMatches()
            });
        }
    }

    updateMatching(delta) {
        // Check if match animations are complete
        if (this.scene.areMatchAnimationsComplete()) {
            this.changeState('REFILLING');
        }
    }

    updateRefilling(delta) {
        // Check if refill is complete
        if (this.scene.isRefillComplete()) {
            // Check for new matches
            const newMatches = this.scene.findMatches();
            if (newMatches.length > 0) {
                this.changeState('MATCHING', { matches: newMatches });
            } else {
                this.changeState('IDLE');
            }
        }
    }

    // Utility methods for state queries
    isInteractive() {
        return this.currentState === 'IDLE';
    }

    isProcessing() {
        return this.currentState !== 'IDLE';
    }
}