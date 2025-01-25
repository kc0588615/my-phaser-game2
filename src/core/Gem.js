// core/Gem.js
// This class represents a single gem in our match-3 game

export class Gem extends Phaser.GameObjects.Container {
    constructor(scene, x, y, gemType) {
        super(scene, x, y);
        
        // Store gem properties
        this.gemType = gemType;
        this.isMatched = false;
        this.isSelected = false;
        
        // Create the gem sprite
        this.sprite = scene.add.sprite(0, 0, `gem_${gemType}_0`);
        this.sprite.setOrigin(0.5);
        
        // Add sprite to the container
        this.add(this.sprite);
        
        // Enable input interaction
        this.setSize(this.sprite.width, this.sprite.height);
        this.setInteractive();
        
        // Start idle animation
        this.playIdle();
        
        // Add to scene
        scene.add.existing(this);
    }

    playIdle() {
        // Play the idle animation for this gem type
        this.sprite.play(`gem_${this.gemType}_idle`);
    }

    setSelected(selected) {
        this.isSelected = selected;
        if (selected) {
            // Visual feedback for selection
            this.sprite.setTint(0xFFFFFF);
            this.scene.tweens.add({
                targets: this.sprite,
                scale: 1.2,
                duration: 200,
                ease: 'Back.easeOut'
            });
        } else {
            // Reset to normal state
            this.sprite.clearTint();
            this.scene.tweens.add({
                targets: this.sprite,
                scale: 1,
                duration: 200,
                ease: 'Back.easeOut'
            });
        }
    }

    setMatched(matched) {
        this.isMatched = matched;
        if (matched) {
            // Visual feedback for matches
            this.sprite.setTint(0xFFFFFF);
        }
    }

    moveTo(x, y, duration = 200) {
        // Return a promise that resolves when movement is complete
        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: this,
                x: x,
                y: y,
                duration: duration,
                ease: 'Back.easeOut',
                onComplete: resolve
            });
        });
    }

    playDestroyAnimation() {
        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: this,
                scale: 0,
                alpha: 0,
                duration: 300,
                ease: 'Back.easeIn',
                onComplete: () => {
                    this.destroy();
                    resolve();
                }
            });
        });
    }
}