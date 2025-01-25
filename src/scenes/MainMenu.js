import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        // Add title text
        this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 - 100,
            'Match-3 Game',
            {
                fontSize: '64px',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5);

        // Add start game text
        const startText = this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 + 100,
            'Click to Start',
            {
                fontSize: '32px',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5);

        // Make text pulse to draw attention
        this.tweens.add({
            targets: startText,
            alpha: 0.5,
            duration: 1000,
            ease: 'Power1',
            yoyo: true,
            repeat: -1
        });

        // Start game on click
        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
