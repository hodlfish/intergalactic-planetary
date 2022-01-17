import { verifyBase64 } from "scripts/base-64";
import { UpdateState } from "scripts/engine/engine";
import GameObject from "scripts/engine/game-object";
import ColorPalette from "./color-palette";
import Scenery from "./voxel-planet/scenery";
import { COLOR_PALETTE_SIZE } from "./voxel-planet/settings";
import Terrain from "./voxel-planet/terrain";

class VoxelPlanet extends GameObject {
    scenery: Scenery;
    colorPalette: ColorPalette;
    terrain: Terrain;
    rotationSpeed: number;

    constructor(rotationSpeed = 0.0) {
        super();
        this.rotationSpeed = rotationSpeed;
        this.colorPalette = new ColorPalette(COLOR_PALETTE_SIZE);
        this.terrain = new Terrain(this.colorPalette);
        this.scenery = new Scenery(this.terrain, this.colorPalette)
        this.scene.add(this.terrain.mesh);
        this.scene.add(this.scenery.scene);
    }

    update(state: UpdateState) {
        this.scenery.animate();
        if (this.rotationSpeed > 0.0) {
            this.scene.rotateY(state.deltaTime * this.rotationSpeed);
        }
    }

    serialize(): string {
        return 'VOX1=' + 
            this.terrain.serialize() + '=' +
            this.scenery.serialize() + '=' +
            this.colorPalette.serialize();
    }

    deserialize(vox1Data: string): boolean {
        try {
            if (!verifyBase64(vox1Data)) {
                throw Error(`Invalid base64 characters!`);
            }
            const [format, terrainData, sceneryData, colorData] = vox1Data.split('=');
            if (format !== 'VOX1') {
                throw Error(`Unexpected format ${format}!`);
            }
            if (!this.terrain.deserialize(terrainData)) throw new Error('Invalid terrain data!');
            if (!this.scenery.deserialize(sceneryData)) throw new Error('Invalid scenery data!');
            if (!this.colorPalette.deserialize(colorData)) throw new Error('Invalid color data!');
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

    dispose() {
        this.terrain.dispose();
        this.scenery.dispose();
        super.dispose();
    }
}

export default VoxelPlanet;
