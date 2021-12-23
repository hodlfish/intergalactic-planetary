import * as THREE from 'three';
import { base64ToBinary, binaryToBase64 } from 'scripts/base64';
import sceneryShader from 'scripts/Shaders/Planet/sceneryShader';
import ColorPalette from '../ColorPalette';
import { Terrain } from './Terrain';
import Engine, { LayerDefinitions } from 'scripts/engine/Engine';
import { getModel, ModelPacks } from 'scripts/ModelLoader';
import GalacticSpec from 'scripts/GalacticSpec';
import { CallbackSet } from 'scripts/engine/Helpers';

interface SceneryInstance {
    objectId: number;
    colorId: number;
    locationId: number;
}

export class Scenery {
    static SERIALIZED_INSTANCE_SIZE_BITS = 20;
    static MAX_INSTANCES = 512;
    static MAX_BITS = Scenery.MAX_INSTANCES * Scenery.SERIALIZED_INSTANCE_SIZE_BITS + 2; // +2 pads to the next base64 char.

    terrain: Terrain;
    colorPalette: ColorPalette;
    material: THREE.Material;
    scene: THREE.Scene;
    locationSceneryMap = new Map<number, SceneryInstance>();
    sceneryMeshMap = new Map<number, THREE.InstancedMesh>();
    modelPack = ModelPacks[0];
    onBeforeChange: CallbackSet;
    onAfterChange: CallbackSet;

    constructor(terrain: Terrain, colorPalette: ColorPalette) {
        this.terrain = terrain;
        this.terrain.onAfterChange.addListener(this, () => {
            this.refresh();
        });
        this.colorPalette = colorPalette;
        this.colorPalette.onAfterChange.addListener(this, (colors: THREE.Color[]) => {
            this.onColorPaletteChange(colors);
        })
        this.scene = new THREE.Scene();
        this.locationSceneryMap = new Map<number, SceneryInstance>();
        this.sceneryMeshMap = new Map<number, THREE.InstancedMesh>();
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                colorPalette: {value: this.colorPalette.colors},
                cameraDirection: {value: new THREE.Vector3()},
                ambientLight: {value: 0.66}
            },
            vertexColors: true,
            vertexShader : sceneryShader.vertex,
            fragmentShader : sceneryShader.fragment
        });
        this.onBeforeChange = new CallbackSet();
        this.onAfterChange = new CallbackSet();
    }

    emitBeforeUpdate() {
        this.onBeforeChange.call();
    }

    emitAfterUpdate() {
        this.onAfterChange.call();
    }

    get count(): number {
        return this.locationSceneryMap.size;
    }

    onColorPaletteChange(colors: THREE.Color[]) {
        const paletteArr = [] as number[];
        colors.forEach(c => {
            paletteArr.push(...c.toArray());
        });
        (this.material as any).uniforms.colorPalette.value = paletteArr;
    }

    animate() {
        (this.material as any).uniforms.cameraDirection.value = Engine.instance.cameraDirection;
    }

    addScenery(objectId: number, colorId: number, locationIds: number | number[]) {
        this.emitBeforeUpdate();
        if (Array.isArray(locationIds)) {
            let needsRefresh = false;
            locationIds.forEach(locationId => {
                if (this._addScenery(objectId, colorId, locationId)) {
                    needsRefresh = true;
                }
            });
            if (needsRefresh) {
                this.refresh();
            }
        } else {
            if (this._addScenery(objectId, colorId, locationIds)) {
                this.refresh();
            }
        }
        this.emitAfterUpdate();
    }

    _addScenery(objectId: number, colorId: number, locationId: number) {
        let needsRefresh = false;
        if (this.count < Scenery.MAX_INSTANCES || this.locationSceneryMap.has(locationId)) {
            const current = this.locationSceneryMap.get(locationId);
            if (!current || (current.objectId !== objectId || current.colorId !== colorId || current.locationId !== locationId)) {
                needsRefresh = true;
            }
            this.locationSceneryMap.set(locationId, {
                objectId: objectId,
                colorId: colorId,
                locationId: locationId
            });
        }
        return needsRefresh;
    }

    removeScenery(locationIds: number | number[]) {
        this.emitBeforeUpdate();
        if (Array.isArray(locationIds)) {
            let needsRefresh = false;
            locationIds.forEach(locationId => {
                if(this.locationSceneryMap.delete(locationId)) {
                    needsRefresh = true;
                }
            });
            if (needsRefresh) {
                this.refresh();
            }
        } else {
            if(this.locationSceneryMap.delete(locationIds)) {
                this.refresh();
            }
        }
        this.emitAfterUpdate();
    }

    refresh() {
        this.modelPack.models.forEach(model => this.spawnInstancedObjects(model.id));
    }

    spawnInstancedObjects(objectId: number) {
        const model = this.modelPack.models.find(model => model.id === objectId);
        if (!model) {
            return;
        }
        const objectInstances = Array.from(this.locationSceneryMap.values()).filter(o => o.objectId === objectId);
        if (objectInstances.length === 0) {
            const oldInstancedMesh = this.sceneryMeshMap.get(objectId);
            if (oldInstancedMesh) {
                oldInstancedMesh.dispose();
                this.scene.remove(oldInstancedMesh);
            }
            return;
        }
        const geometry = getModel(this.modelPack.id, model.id);
        if (geometry) {
            geometry.computeVertexNormals();
            const objectMesh = new THREE.InstancedMesh(
                geometry,
                this.material,
                objectInstances.length
            );
            objectMesh.updateMatrixWorld();
            const quaternion = new THREE.Quaternion();
            const transform = new THREE.Object3D();
            objectInstances.forEach((objInstance, index) => {
                const objectPosition = this.terrain.locationIdToPoint(objInstance.locationId);
                const pos = new THREE.Vector3(objectPosition.x, objectPosition.y, objectPosition.z);
                transform.position.set(...pos.toArray());
                pos.normalize();
                transform.setRotationFromQuaternion(quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), pos));
                transform.rotateOnWorldAxis(pos, 2 * Math.PI * GalacticSpec.noise(objInstance.locationId));
                transform.updateMatrix();
                objectMesh.setMatrixAt( index, transform.matrix );
                const colFloat = objInstance.colorId / 8.0;
                objectMesh.setColorAt(index, new THREE.Color(colFloat, colFloat, colFloat));
            });

            const oldInstancedMesh = this.sceneryMeshMap.get(objectId);
            if (oldInstancedMesh) {
                oldInstancedMesh.dispose();
                this.scene.remove(oldInstancedMesh);
            }
            objectMesh.layers.set(LayerDefinitions.default);
            this.sceneryMeshMap.set(model.id, objectMesh);
            this.scene.add(objectMesh);
        }
    }

    serialize() {
        let binary = Array.from(this.locationSceneryMap.values()).map(scenery => {
            return scenery.objectId.toString(2).padStart(6, '0') +
                scenery.locationId.toString(2).padStart(11, '0') +
                scenery.colorId.toString(2).padStart(3, '0');
        }).join('');
        binary = (0).toString(2).padStart(6, '0') + binary; // Add model pack id
        return binaryToBase64(binary);
    }

    deserialize(base64: string) {
        const binary = base64ToBinary(base64);
        if (binary.length < 6) {
            return false;
        }
        // Model Pack ID not used yet.
        // const modelPackBinary = binary.substring(0, 6);
        const sceneryBinary = binary.substring(6, binary.length);
        this.locationSceneryMap.clear();
        if(sceneryBinary.length > Scenery.MAX_BITS) {
            return false;
        }
        const itemCount = Math.floor(sceneryBinary.length / Scenery.SERIALIZED_INSTANCE_SIZE_BITS);
        for(let i = 0; i < itemCount; i++) {
            const startIndex = i * Scenery.SERIALIZED_INSTANCE_SIZE_BITS;
            const endIndex = startIndex + Scenery.SERIALIZED_INSTANCE_SIZE_BITS;
            const itemBinary = sceneryBinary.substring(startIndex, endIndex);
            const item = {
                objectId: parseInt(itemBinary.substring(0, 6), 2),
                locationId: parseInt(itemBinary.substring(6, 17), 2),
                colorId: parseInt(itemBinary.substring(17, 20), 2)
            }
            this.locationSceneryMap.set(item.locationId, item);
        }
        this.refresh();
        return true;
    }

    dispose() {
        Array.from(this.sceneryMeshMap.values()).forEach(mesh => {
            this.scene.remove(mesh);
            mesh.dispose();
        });
        this.material.dispose();
    }
}

export default Scenery;
