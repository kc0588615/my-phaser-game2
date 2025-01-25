// systems/AudioManager.js

export class AudioManager {
    constructor(scene) {
        this.scene = scene;
        
        // Track currently playing sounds
        this.activeSounds = new Map();
        
        // Initialize sound configurations
        this.setupSoundConfigs();
        
        // Load all required audio assets
        this.preloadSounds();
    }

    setupSoundConfigs() {
        // Each sound type has its own configuration for volume, overlap rules, etc.
        this.soundConfigs = {
            gemSelect: {
                volume: 0.3,
                allowOverlap: false,
                variations: 3    // We have three variations of select sound
            },
            gemMatch: {
                volume: 0.4,
                allowOverlap: true,
                volumeScale: {   // Volume scales with match length
                    3: 0.4,
                    4: 0.5,
                    5: 0.6,
                    6: 0.7
                }
            },
            gemLand: {
                volume: 0.2,
                allowOverlap: true,
                // Volume scales with fall distance
                getVolume: (fallDistance) => 
                    Math.min(0.4, 0.2 + (fallDistance * 0.05))
            },
            combo: {
                volume: 0.5,
                allowOverlap: false,
                // Different sounds for different combo levels
                variations: 8
            }
        };
    }

    preloadSounds() {
        // Load all sound variations
        for (let i = 1; i <= 3; i++) {
            this.scene.load.audio(`select_${i}`, `assets/audio/gem_select_${i}.mp3`);
        }

        for (let i = 1; i <= 8; i++) {
            this.scene.load.audio(`combo_${i}`, `assets/audio/combo_${i}.mp3`);
        }

        this.scene.load.audio('match', 'assets/audio/gem_match.mp3');
        this.scene.load.audio('land', 'assets/audio/gem_land.mp3');
    }

    playGemSelect() {
        // Randomly select one of the variation sounds
        const variation = Phaser.Math.Between(1, 3);
        this.playSound(`select_${variation}`, this.soundConfigs.gemSelect);
    }

    playMatchSound(matchLength) {
        const config = this.soundConfigs.gemMatch;
        // Adjust volume based on match length
        const volume = config.volumeScale[matchLength] || config.volumeScale[6];
        
        this.playSound('match', {
            ...config,
            volume: volume
        });
    }

    playComboSound(comboLevel) {
        // Cap combo level to available variations
        const level = Math.min(comboLevel, this.soundConfigs.combo.variations);
        this.playSound(`combo_${level}`, this.soundConfigs.combo);
    }

    playGemLand(fallDistance) {
        const config = this.soundConfigs.gemLand;
        this.playSound('land', {
            ...config,
            volume: config.getVolume(fallDistance)
        });
    }

    playSound(key, config) {
        // If sound doesn't allow overlap and is already playing, stop it
        if (!config.allowOverlap && this.activeSounds.has(key)) {
            this.activeSounds.get(key).stop();
        }

        // Play the sound with configured settings
        const sound = this.scene.sound.add(key, {
            volume: config.volume,
            rate: config.rate || 1
        });

        sound.play();

        // Track active sounds for overlap management
        if (!config.allowOverlap) {
            this.activeSounds.set(key, sound);
            
            // Remove from tracking when complete
            sound.once('complete', () => {
                this.activeSounds.delete(key);
            });
        }
    }

    // Clean up any playing sounds
    destroy() {
        this.activeSounds.forEach(sound => sound.stop());
        this.activeSounds.clear();
    }
}