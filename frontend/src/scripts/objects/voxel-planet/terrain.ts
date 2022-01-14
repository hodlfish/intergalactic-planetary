import { CallbackSet } from 'scripts/engine/helpers';
import planetShader from 'scripts/shaders/voxel-planet/planet-shader';
import * as THREE from 'three';
import ColorPalette from "../color-palette";
import { COLOR_PALETTE_SIZE } from './settings';

class Terrain {
    static GRID_SIZE = 16;
    static WIDTH = 5.0;
    static BLOCK_SIZE = Terrain.WIDTH / Terrain.GRID_SIZE;
    static WATER_ID = 6;
    static EMPTY_ID = 7;
    static MIN_GRID = new THREE.Vector3(0, 0, 0);
    static MAX_GRID = new THREE.Vector3(Terrain.GRID_SIZE - 1, Terrain.GRID_SIZE - 1, Terrain.GRID_SIZE - 1);

    colorPalette: ColorPalette;
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    material: THREE.ShaderMaterial;
    depthField: number[][][];
    onBeforeChange: CallbackSet;
    onAfterChange: CallbackSet;

    constructor(colorPalette: ColorPalette) {
        this.onBeforeChange = new CallbackSet();
        this.onAfterChange = new CallbackSet();

        // Color Palette
        this.colorPalette = colorPalette;
        this.colorPalette.onAfterChange.addListener(this, (colors: THREE.Color[]) => {
            this.onColorPaletteChange(colors);
        })

        // Planet Mesh
        this.depthField = [];
        this.generateSphere();
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.ShaderMaterial(
            {
                uniforms: {
                    ambientLight: {value: new THREE.Color(0x222222)},
                    colorPalette: {value: this.colorPalette.colors},
                },
                vertexColors: true,
                vertexShader : planetShader.vertex,
                fragmentShader : planetShader.fragment,
            }
        )
        this.generate();
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.onColorPaletteChange(this.colorPalette.colors);
    }

    generateSphere() {
        const center = new THREE.Vector3(
            Terrain.GRID_SIZE / 2.0,
            Terrain.GRID_SIZE / 2.0,
            Terrain.GRID_SIZE / 2.0
        );
        for(let i = 0; i < Terrain.GRID_SIZE; i++) {
            this.depthField.push([]);
            for(let j = 0; j < Terrain.GRID_SIZE; j++) {
                this.depthField[i].push([]);
                for(let k = 0; k < Terrain.GRID_SIZE; k++) {
                    const position = new THREE.Vector3(i + 0.5, j + 0.5, k + 0.5);
                    this.depthField[i][j].push(position.distanceTo(center) < Math.round(Terrain.GRID_SIZE / 2) ? 0 : Terrain.EMPTY_ID);
                }
            }
        }
    }

    onColorPaletteChange(colors: THREE.Color[]) {
        const paletteArr = [] as number[];
        colors.forEach(c => {
            paletteArr.push(...c.toArray());
        });
        this.material.uniforms.colorPalette.value = paletteArr;
    }

    generate() {
        const positionArr = [] as number[];
        const colorArr = [] as number[];
        const normalArr = [] as number[];
        for(let i = 0; i < Terrain.GRID_SIZE; i++) {
            for(let j = 0; j < Terrain.GRID_SIZE; j++) {
                for(let k = 0; k < Terrain.GRID_SIZE; k++) {
                    if (this.depthField[i][j][k] === Terrain.EMPTY_ID) {
                        continue;
                    }
                    const colorId = this.depthField[i][j][k];
                    const vertColor = colorId / COLOR_PALETTE_SIZE;
                    const faces = [];
                    if (i - 1 < 0 || this.depthField[i-1][j][k] === Terrain.EMPTY_ID) {
                        faces.push(3);
                    }
                    if (i + 1 >= Terrain.GRID_SIZE || this.depthField[i+1][j][k] === Terrain.EMPTY_ID) {
                        faces.push(1);
                    }
                    if (j - 1 < 0 || this.depthField[i][j-1][k] === Terrain.EMPTY_ID) {
                        faces.push(5);
                    }
                    if (j + 1 >= Terrain.GRID_SIZE || this.depthField[i][j+1][k] === Terrain.EMPTY_ID) {
                        faces.push(4);
                    }
                    if (k - 1 < 0 || this.depthField[i][j][k-1] === Terrain.EMPTY_ID) {
                        faces.push(2);
                    }
                    if (k + 1 >= Terrain.GRID_SIZE || this.depthField[i][j][k+1] === Terrain.EMPTY_ID) {
                        faces.push(0);
                    }
                    const voxelCenter = this.coordinateToPosition(i, j, k);
                    faces.forEach(face => {
                        const vertexIndices = this._faces[face];
                        vertexIndices.forEach(vertexIndex => {
                            const vertex = this._vertices[vertexIndex].clone().multiplyScalar(Terrain.BLOCK_SIZE / 2).add(voxelCenter);
                            positionArr.push(...vertex.toArray());
                            normalArr.push(...this._normals[face].toArray())
                            colorArr.push(vertColor, vertColor, vertColor)
                        });
                    })
                }
            }
        }
        this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionArr), 3));
        this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normalArr), 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorArr), 3));
        this.geometry.computeBoundingSphere();
    }

    emitBeforeUpdate() {
        this.onBeforeChange.call();
    }

    emitAfterUpdate() {
        this.onAfterChange.call();
    }

    _performBlockAction(startCoord: THREE.Vector3, endCoord: THREE.Vector3, callback: (x: number, y: number, z: number) => any) {
        for(let i = Math.min(startCoord.x, endCoord.x); i <= Math.max(startCoord.x, endCoord.x); i++) {
            for(let j = Math.min(startCoord.y, endCoord.y); j <= Math.max(startCoord.y, endCoord.y); j++) {
                for(let k = Math.min(startCoord.z, endCoord.z); k <= Math.max(startCoord.z, endCoord.z); k++) {
                    callback(i, j, k);
                }
            }
        }
    }

    attachVoxel(startCoord: THREE.Vector3, endCoord: THREE.Vector3, colorId: number) {
        if (startCoord && endCoord) {
            this._performBlockAction(startCoord, endCoord, (x, y, z) => {
                this.depthField[x][y][z] = colorId;
            });
            this.generate();
        }
        this.emitAfterUpdate();
    }

    removeVoxel(startCoord: THREE.Vector3, endCoord: THREE.Vector3) {
        if (startCoord && endCoord) {
            this._performBlockAction(startCoord, endCoord, (x, y, z) => {
                this.depthField[x][y][z] = Terrain.EMPTY_ID;
            });
            this.generate();
        }
        this.emitAfterUpdate();
    }

    paintVoxel(point: THREE.Vector3, normal: THREE.Vector3, colorId: number) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(-Terrain.BLOCK_SIZE / 2));
        const coord = this.positionToCoordinate(offsetPoint);
        if (coord) {
            this.depthField[coord.x][coord.y][coord.z] = colorId;
            this.generate();
        }
        this.emitAfterUpdate();
    }

    pointToCoord(point: THREE.Vector3, normal: THREE.Vector3, reverse = false) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(Terrain.BLOCK_SIZE / 2 * (reverse ? -1 : 1)));
        return this.positionToCoordinate(offsetPoint);
    }

    pointToLocationId(point: THREE.Vector3, normal: THREE.Vector3) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(-Terrain.BLOCK_SIZE / 2));
        const coord = this.positionToCoordinate(offsetPoint);
        const normalIndex = this._normals.findIndex(norm => norm.equals(normal));
        if (coord) {
            return this.coordinateToLocationId(coord) + normalIndex;
        } else {
            return -1;
        }
    }

    coordinateToLocationId(coord: THREE.Vector3) {
        return Math.floor(coord.x + coord.z * Terrain.GRID_SIZE + (coord.y * Terrain.GRID_SIZE * Terrain.GRID_SIZE)) * 6;
    }

    locationIdToPosition(locationId: number) {
        const coord = this.locationIdToCoord(locationId);
        const voxelCenter = this.coordinateToPosition(coord.x, coord.y, coord.z);
        voxelCenter.add(coord.normal.clone().multiplyScalar(Terrain.BLOCK_SIZE / 2))
        return {
            point: voxelCenter,
            normal: coord.normal
        };
    }

    locationIdToCoord(locationId: number) {
        const blockId = Math.floor(locationId / 6);
        const face = locationId % 6;
        const normal = this._normals[face];
        const y = Math.floor(blockId / (Terrain.GRID_SIZE * Terrain.GRID_SIZE));
        const rem = blockId % (Terrain.GRID_SIZE * Terrain.GRID_SIZE)
        const z = Math.floor(rem / Terrain.GRID_SIZE);
        const x = rem % Terrain.GRID_SIZE;
        return {
            x:x, y:y, z:z, face:face, normal:normal
        }
    }

    isValidLocationId(locationId: number) {
        const coord = this.locationIdToCoord(locationId);
        if(this.depthField[coord.x][coord.y][coord.z] === Terrain.EMPTY_ID) {
            return false;
        }
        const current = new THREE.Vector3(coord.x, coord.y, coord.z);
        const neighbor = new THREE.Vector3(coord.x, coord.y, coord.z).add(coord.normal).clamp(
            Terrain.MIN_GRID, Terrain.MAX_GRID
        )
        if (current.equals(neighbor)) {
            return true;
        } else if (![Terrain.EMPTY_ID, Terrain.WATER_ID].includes(this.depthField[neighbor.x][neighbor.y][neighbor.z])) {
            return false;
        }
        return true;
    }

    coordinateToPosition(x: number, y: number, z: number) {
        return new THREE.Vector3(x, y, z)
            .addScalar(-Terrain.GRID_SIZE / 2 + 0.5)
            .multiplyScalar(Terrain.BLOCK_SIZE);
    }

    positionToCoordinate(point: THREE.Vector3): THREE.Vector3 | undefined {
        const indexPoint = point.clone().multiplyScalar(1/Terrain.BLOCK_SIZE).addScalar(-0.5 + Terrain.GRID_SIZE / 2);
        indexPoint.x = +Math.round(indexPoint.x);
        indexPoint.y = +Math.round(indexPoint.y);
        indexPoint.z = +Math.round(indexPoint.z);
        return indexPoint.round().clamp(Terrain.MIN_GRID, Terrain.MAX_GRID);
    }

    serialize() {
        return false;
    }

    deserialize(data: string) {
        console.log(data);
        return false;
    }

    dispose() {
        this.material.dispose();
        this.geometry.dispose();
    }

    _vertices = [
        new THREE.Vector3(-1, 1, 1),
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(1, -1, 1),
        new THREE.Vector3(-1, -1, 1),
        new THREE.Vector3(-1, 1, -1),
        new THREE.Vector3(1, 1, -1),
        new THREE.Vector3(1, -1, -1),
        new THREE.Vector3(-1, -1, -1)
    ]

    _normals = [
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0)
    ]

    _faces = [
        [0,3,1,3,2,1],
        [1,2,5,2,6,5],
        [5,6,4,6,7,4],
        [4,7,0,7,3,0],
        [4,0,5,0,1,5],
        [7,6,2,7,2,3]
    ]
}

export default Terrain;