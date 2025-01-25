import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Define our gem types
        const gemTypes = ['black', 'blue', 'green', 'orange', 'red', 'white'];
        
        // Load each gem's image
        gemTypes.forEach(type => {
            this.load.image(
                `${type}_gem_0`,  // Key we'll use to reference the image
                `assets/gems/${type}_gem_0.png`  // Path to the image file
            );
        });
    }

    create() {
        // Now that assets are loaded, go to main menu
        this.scene.start('MainMenu');
    }
}
