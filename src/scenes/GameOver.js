import Phaser from 'phaser';

export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create(data) {
        // Show final score
        this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 - 100,
            'Game Over',
            {
                fontSize: '64px',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5);

        this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2,
            `Final Score: ${data.score}`,
            {
                fontSize: '32px',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5);

        this.add.text(
            this.sys.game.config.width / 2,
            this.sys.game.config.height / 2 + 100,
            'Click to Play Again',
            {
                fontSize: '32px',
                color: '#FFFFFF'
            }
        ).setOrigin(0.5);

        // Return to menu on click
        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
