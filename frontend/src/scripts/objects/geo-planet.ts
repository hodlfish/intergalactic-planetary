import * as THREE from 'three';
import { Terrain } from './geo-planet/terrain';
import ColorPalette from './color-palette';
import Scenery from './geo-planet/scenery';
import Atmosphere from './geo-planet/atmosphere';
import Water from './geo-planet/water';
import GameObject from 'scripts/engine/game-object';
import { UpdateState } from 'scripts/engine/engine';
import { verifyBase64 } from 'scripts/base-64';

class GeoPlanet extends GameObject {
    scenery: Scenery;
    atmosphere: Atmosphere;
    water: Water;
    terrain: Terrain;
    colorPalette: ColorPalette;
    rotationSpeed: number;

    constructor(rotationSpeed = 0.0) {
        super();
        this.rotationSpeed = rotationSpeed;
        this.colorPalette = new ColorPalette();
        this.terrain = new Terrain(this.colorPalette);
        this.scenery = new Scenery(this.terrain, this.colorPalette);
        this.atmosphere = new Atmosphere(new THREE.Color(0x32a2a8), 128, 64);
        this.water = new Water(new THREE.Color(0x32a2a8), 128, 128);
        this.scene.add(this.terrain.mesh);
        this.engine.registerCollisionMesh(this.terrain.mesh, this);
        this.scene.add(this.water.mesh);
        this.scene.add(this.atmosphere.mesh);
        this.scene.add(this.scenery.scene);
        this.engine.depthTextureCallbacks.addListener(this.water, this.water.setDepthTexture.bind(this.water));
    }

    update(state: UpdateState) {
        this.water.animate();
        this.scenery.animate();
        this.terrain.animate();
        if (this.rotationSpeed > 0.0) {
            this.scene.rotateY(state.deltaTime * this.rotationSpeed);
        }
    }

    dispose() {
        this.engine.unregisterCollisionMesh(this.terrain.mesh);
        this.engine.depthTextureCallbacks.removeListener(this.water);
        this.terrain.dispose();
        this.atmosphere.dispose();
        this.water.dispose();
        this.scenery.dispose();
        super.dispose();
    }

    serialize(): string {
        return 'GEO1=' + 
            this.terrain.serialize() + '=' +
            this.scenery.serialize() + '=' +
            this.colorPalette.serialize() + '=' +
            this.atmosphere.serialize() + '=' +
            this.water.serialize();
    }

    deserialize(ico1Data: string): boolean {
        try {
            if (!verifyBase64(ico1Data)) {
                throw Error(`Invalid base64 characters!`);
            }
            const [format, terrainData, sceneryData, colorData, skyData, waterData] = ico1Data.split('=');
            if (format !== 'GEO1') {
                throw Error(`Unexpected format ${format}!`);
            }
            if (!this.terrain.deserialize(terrainData)) throw new Error('Invalid terrain data!');
            if (!this.scenery.deserialize(sceneryData)) throw new Error('Invalid scenery data!');
            if (!this.colorPalette.deserialize(colorData)) throw new Error('Invalid color data!');
            if (!this.atmosphere.deserialize(skyData)) throw new Error('Invalid sky data!');
            if (!this.water.deserialize(waterData)) throw new Error('Invalid water data!');
            return true;
        } catch(ex) {
            console.log(ex);
            return false;
        }
    }

    export(name: string) {
        const blob = new Blob([this.serialize()], { type: 'text/plain' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `${name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export default GeoPlanet;
