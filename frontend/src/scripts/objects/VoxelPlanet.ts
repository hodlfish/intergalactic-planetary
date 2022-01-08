import GameObject from "scripts/engine/GameObject";
import * as THREE from 'three';
import ColorPalette from "./ColorPalette";
import Terrain from "./voxelPlanet/Terrain";

class Planet extends GameObject {
    planetScene: THREE.Scene;
    colorPalette: ColorPalette;
    terrain: Terrain;

    constructor() {
        super();
        this.planetScene = new THREE.Scene();
        this.colorPalette = new ColorPalette(6);
        this.terrain = new Terrain(this.colorPalette);
        this.planetScene.add(this.terrain.mesh);
        this.scene.add(this.planetScene);
    }

    serialize(): string {
        return 'VOX1=' + 
            this.terrain.serialize();
    }

    deserialize(vox1Data: string): boolean {
        // console.log(vox1Data)
        return false;
    }

    dispose() {
        this.scene.remove(this.planetScene);
        this.terrain.dispose();
        super.dispose();
    }
}

export default Planet;
