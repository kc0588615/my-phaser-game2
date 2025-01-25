// systems/ParticleSystem.js

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.initializeParticleEmitters();
    }

    initializeParticleEmitters() {
        // Match explosion emitter
        this.matchEmitter = this.scene.add.particles(0, 0, 'particles', {
            frame: 'sparkle',
            lifespan: 600,
            speed: { min: 50, max: 150 },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });

        // Combo effect emitter
        this.comboEmitter = this.scene.add.particles(0, 0, 'particles', {
            frame: 'star',
            lifespan: 1000,
            speed: { min: 100, max: 200 },
            scale: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            emitting: false
        });
    }

    createMatchEffect(matchData) {
        const centerPoint = this.calculateMatchCenter(matchData.gems);
        
        this.matchEmitter.setPosition(centerPoint.x, centerPoint.y);
        this.matchEmitter.explode(matchData.gems.length * 5);
        
        // Create shockwave effect
        this.createShockwave(centerPoint);
    }

    createComboEffect(comboData) {
        // Create spiraling particles for combos
        const duration = 500;
        const particles = 20 * comboData.level;
        
        this.comboEmitter.setPosition(comboData.position.x, comboData.position.y);
        this.comboEmitter.flow(duration, particles);
    }

    createShockwave(position) {
        const shockwave = this.scene.add.sprite(position.x, position.y, 'shockwave');
        shockwave.setScale(0.1);
        shockwave.alpha = 0.7;

        this.scene.tweens.add({
            targets: shockwave,
            scale: 2,
            alpha: 0,
            duration: 300,
            ease: 'Quad.easeOut',
            onComplete: () => shockwave.destroy()
        });
    }
}