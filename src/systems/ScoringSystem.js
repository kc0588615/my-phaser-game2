// systems/ScoringSystem.js

export class ScoringSystem extends Phaser.Events.EventEmitter {
    constructor(scene) {
        super();
        this.scene = scene;
        
        // Track current score and combo
        this.score = 0;
        this.comboCounter = 0;
        this.comboTimer = null;
        
        // Configure timing for score animations
        this.scoreDisplayConfig = {
            floatDuration: 1000,
            floatDistance: 100,
            comboTimeout: 2000  // Time before combo resets
        };
        
        // Create score display
        this.createScoreDisplay();
    }

    createScoreDisplay() {
        // Main score display at top of screen
        this.scoreText = this.scene.add.text(20, 20, 'Score: 0', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        });

        // Combo display that appears during chains
        this.comboText = this.scene.add.text(
            this.scene.sys.game.config.width / 2,
            100,
            '',
            {
                fontFamily: 'Arial',
                fontSize: '48px',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }
        );
        this.comboText.setOrigin(0.5);
        this.comboText.setVisible(false);
    }

    handleMatch(matchData) {
        // Calculate base score for this match
        const baseScore = this.calculateBaseScore(matchData);
        
        // Apply combo multiplier if active
        const comboMultiplier = this.getComboMultiplier();
        const finalScore = Math.floor(baseScore * comboMultiplier);
        
        // Update total score
        this.addScore(finalScore);
        
        // Show floating score text
        this.showFloatingScore(matchData.centerPosition, finalScore);
        
        // Update combo
        this.incrementCombo();
    }

    calculateBaseScore(matchData) {
        let score = SCORING.MATCH_SCORES[matchData.gems.length] || 
                   SCORING.MATCH_SCORES[6];
                   
        // Check for special patterns
        const patternType = GameHelpers.detectSpecialPatterns(matchData.gems);
        if (patternType !== 'NORMAL') {
            score *= SCORING.PATTERN_MULTIPLIERS[patternType];
        }
        
        return score;
    }

    getComboMultiplier() {
        if (this.comboCounter === 0) return 1;
        return 1 + (SCORING.COMBO_MULTIPLIER * this.comboCounter);
    }

    showFloatingScore(position, amount) {
        // Create floating score text
        const floatingText = this.scene.add.text(
            position.x,
            position.y,
            `+${GameHelpers.formatScore(amount)}`,
            {
                fontFamily: 'Arial',
                fontSize: '28px',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        floatingText.setOrigin(0.5);

        // Create float-up and fade-out animation
        this.scene.tweens.add({
            targets: floatingText,
            y: position.y - this.scoreDisplayConfig.floatDistance,
            alpha: 0,
            duration: this.scoreDisplayConfig.floatDuration,
            ease: 'Cubic.easeOut',
            onComplete: () => floatingText.destroy()
        });
    }

    incrementCombo() {
        // Clear existing combo timeout
        if (this.comboTimer) {
            this.comboTimer.remove();
        }

        this.comboCounter++;
        
        // Show combo text
        this.updateComboDisplay();
        
        // Set timeout to reset combo
        this.comboTimer = this.scene.time.delayedCall(
            this.scoreDisplayConfig.comboTimeout,
            () => this.resetCombo()
        );
    }

    updateComboDisplay() {
        if (this.comboCounter > 1) {
            this.comboText.setText(`${this.comboCounter}x COMBO!`);
            this.comboText.setVisible(true);
            
            // Pulse animation
            this.scene.tweens.add({
                targets: this.comboText,
                scale: { from: 1.5, to: 1 },
                duration: 200,
                ease: 'Back.easeOut'
            });
        }
    }

    resetCombo() {
        this.comboCounter = 0;
        this.comboText.setVisible(false);
    }

    addScore(amount) {
        const oldScore = this.score;
        this.score += amount;
        
        // Animate score counter
        this.scene.tweens.addCounter({
            from: oldScore,
            to: this.score,
            duration: 500,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const value = Math.floor(tween.getValue());
                this.scoreText.setText(`Score: ${GameHelpers.formatScore(value)}`);
            }
        });
        
        // Emit score change event
        this.emit('scoreChanged', this.score);
    }
}