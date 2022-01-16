import GameObject from "scripts/engine/game-object";
import ColorPalette from "./color-palette";
import Scenery from "./voxel-planet/scenery";
import { COLOR_PALETTE_SIZE } from "./voxel-planet/settings";
import Terrain from "./voxel-planet/terrain";

class Planet extends GameObject {
    scenery: Scenery;
    colorPalette: ColorPalette;
    terrain: Terrain;

    constructor() {
        super();
        this.colorPalette = new ColorPalette(COLOR_PALETTE_SIZE);
        this.terrain = new Terrain(this.colorPalette);
        this.scenery = new Scenery(this.terrain, this.colorPalette)
        this.scene.add(this.terrain.mesh);
        this.scene.add(this.scenery.scene);
    }

    update() {
        this.scenery.animate();
    }

    serialize(): string {
        return 'VOX1=' + 
            this.terrain.serialize();
    }

    deserialize(vox1Data: string): boolean {
        console.log(vox1Data)
        return false;
    }

    dispose() {
        this.terrain.dispose();
        this.scenery.dispose();
        super.dispose();
    }
}

export default Planet;
