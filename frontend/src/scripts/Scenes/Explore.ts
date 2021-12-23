import GameObject from 'scripts/engine/GameObject';
import Background from 'scripts/objects/Background';
import PlayerShip from 'scripts/objects/PlayerShip';
import GalacticSpec from 'scripts/GalacticSpec';
import { getPlanets } from 'scripts/Api';
import SolarSystem from 'scripts/objects/SolarSystem';
import SphereBounds from 'scripts/objects/SphereBounds';

class ExploreScene extends GameObject {
    background: Background;
    playerShip: PlayerShip;
    systemId: string;
    solarSystem!: SolarSystem;
    sphereBounds: SphereBounds;

    constructor(systemId: string) {
        super();
        this.systemId = systemId;
        this.background = new Background(500, 50, 200);
        this.playerShip = new PlayerShip();
        this.sphereBounds = new SphereBounds(
            SolarSystem.SYSTEM_RADIUS + 50.0,
            40.0
        );
        this.scene.add(this.background.mesh);
        this.initialize(this.systemId);
    }

    initialize(newSystemId: string) {
        this.systemId = newSystemId;
        const planetIds = GalacticSpec.getSystemPlanets(this.systemId);
        getPlanets(planetIds).then(planetInfos => {
            if (this.solarSystem) {
                this.solarSystem.dispose();
            }
            this.playerShip.respawn();
            this.playerShip.map.setMap(this.systemId);
            this.solarSystem = new SolarSystem(this.systemId, planetInfos);
            this.engine.curtain.fadeIn(1.0);
        }).catch(error => {
            alert('Failed to load system!  Please try again later.')
            console.log(error)
        });
    }

    dispose(): void {
        this.background.dispose();
        this.solarSystem.dispose();
        this.sphereBounds.dispose();
        this.playerShip.dispose();
        super.dispose();
    }

    update() {
        this.playerShip.scene.position.set(...this.sphereBounds.bound(this.playerShip.scene.position).toArray());
    }
}

export default ExploreScene;
