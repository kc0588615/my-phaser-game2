import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    create() {
        // Set up any game scaling or settings
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;

        // Move directly to the preloader scene
        this.scene.start('Preloader');
    }
}