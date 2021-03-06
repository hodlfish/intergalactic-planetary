import * as THREE from 'three';
import axios from 'axios';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';

export interface Model {
    id: number,
    sort: string,
    name: string
}

export interface ModelPack {
    id: number,
    name: string,
    url: string,
    scale: number,
    models: Model[]
}

export const ModelPacks = [
    {
        id: 0,
        name: 'Default',
        url: '/assets/models.pack',
        scale: 0.25,
        models: [
            {id: 0, sort: 'A0', name: 'Birch'},
            {id: 1, sort: 'A1', name: 'Pine'},
            {id: 2, sort: 'A2', name: 'Willow'},
            {id: 3, sort: 'A3', name: 'Palm'},
            {id: 4, sort: 'A4', name: 'Mangrove'},
            {id: 5, sort: 'B0', name: 'Bush'},
            {id: 6, sort: 'A5', name: 'Alien Tree'},
            {id: 7, sort: 'A9', name: 'Bamboo'},
            {id: 8, sort: 'B1', name: 'Fern'},
            {id: 9, sort: 'D0', name: 'Small Rock'},
            {id: 10, sort: 'D1', name: 'Tall Rock'},
            {id: 11, sort: 'D2', name: 'Large Rock'},
            {id: 12, sort: 'D3', name: 'Flat Rock'},
            {id: 13, sort: 'C0', name: 'Cactus 1'},
            {id: 14, sort: 'C1', name: 'Cactus 2'},
            {id: 15, sort: 'C2', name: 'Cactus 3'},
            {id: 16, sort: 'D4', name: 'Medium Rock'},
            {id: 17, sort: 'E0', name: 'Crystal 1'},
            {id: 18, sort: 'E1', name: 'Crystal 2'},
            {id: 19, sort: 'A7', name: 'Mushroom'},
            {id: 20, sort: 'A6', name: 'Redwood'},
            {id: 21, sort: 'B2', name: 'Seaweed'},
            {id: 22, sort: 'B3', name: 'Grass'},
            {id: 23, sort: 'A8', name: 'Deadwood'},
            {id: 24, sort: 'D5', name: 'Monolith'},
            {id: 25, sort: 'B5', name: 'Flower'},
            {id: 26, sort: 'F0', name: 'Lighthouse'},
            {id: 27, sort: 'F1', name: 'Watch Tower'},
            {id: 28, sort: 'F2', name: 'Well'},
            {id: 29, sort: 'A9', name: 'Jungle Tree'},
            {id: 30, sort: 'A10', name: 'Apple Tree'},
            {id: 31, sort: 'A11', name: 'Savannah Tree'},
            {id: 32, sort: 'A12', name: 'Bonsai'},
            {id: 33, sort: 'A13', name: 'Baobab'},
            {id: 34, sort: 'E2', name: 'Gem'},
            {id: 35, sort: 'E4', name: 'Crystal'},
            {id: 36, sort: 'D6', name: 'Stone Head'},
            {id: 37, sort: 'D7', name: 'Stone Arch'},
            {id: 38, sort: 'F3', name: 'Sword'},
            {id: 39, sort: 'F4', name: 'Torri'},
            {id: 40, sort: 'F5', name: 'Crates'},
            {id: 41, sort: 'F5', name: 'Barrels'},
            {id: 42, sort: 'D8', name: 'Flat Rock 2'},
            {id: 43, sort: 'D9', name: 'Pebbles'},
            {id: 44, sort: 'D10', name: 'Pebble'},
            {id: 45, sort: 'D11', name: 'Slate Rock'},
            {id: 46, sort: 'D12', name: 'Rock Stack'},
            {id: 47, sort: 'F6', name: 'Beehive'},
            {id: 48, sort: 'F7', name: 'Windmill'},
            {id: 49, sort: 'F8', name: 'Cart'},
            {id: 50, sort: 'F9', name: 'House'},
            {id: 51, sort: 'F10', name: 'Hut'},
            {id: 52, sort: 'F11', name: 'Stilt House'},
            {id: 53, sort: 'F12', name: 'Tent'},
            {id: 54, sort: 'F13', name: 'Campfire'},
            {id: 55, sort: 'F14', name: 'Castle Tower'},
            {id: 56, sort: 'F15', name: 'Outhouse'},
            {id: 57, sort: 'F16', name: 'Cannon'},
            {id: 58, sort: 'F17', name: 'Row Boat'},
            {id: 59, sort: 'F18', name: 'Pavilion'},
            {id: 60, sort: 'F19', name: 'Pagoda'},
            {id: 61, sort: 'D13', name: 'Spikes'},
            {id: 62, sort: 'F20', name: 'Gate'},
            {id: 63, sort: 'F21', name: 'Obelisk'}
        ]
    }
] as ModelPack[];

const _modelCache = new Map() as Map<number, THREE.BufferGeometry[]>;

export function getModel(packId: number, modelId: number) {
    const modelGeometries = _modelCache.get(packId);
    if (modelGeometries) {
        return modelGeometries[modelId];
    } else {
        return new THREE.BoxGeometry(1, 1);
    }
}

export async function getModelPack(pack: ModelPack) {
    try {
        const response = await axios.get(pack.url, {responseType: 'arraybuffer'});
        const modelData = response.data as ArrayBuffer;
        const totalModels = new Uint32Array(modelData.slice(0, 4))[0];
        const modelByteSizes = new Uint32Array(modelData.slice(4, totalModels * 4 + 4));
        let byteOffset = totalModels * 4 + 4;
        const loader = new PLYLoader();
        const models = [] as THREE.BufferGeometry[];
        for(let i = 0; i < totalModels; i++) {
            const model = loader.parse(modelData.slice(byteOffset, byteOffset + modelByteSizes[i]));
            model.scale(pack.scale, pack.scale, pack.scale);
            models.push(model);
            byteOffset += modelByteSizes[i];
        }
        _modelCache.set(pack.id, models);
        return true;
    } catch (error) {
        return false;
    }
}
