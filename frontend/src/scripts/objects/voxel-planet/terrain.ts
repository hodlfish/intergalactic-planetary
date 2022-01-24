import { base64ToBinary, binaryToBase64 } from 'scripts/base-64';
import { CallbackSet } from 'scripts/engine/helpers';
import planetShader from 'scripts/shaders/voxel-planet/planet-shader';
import * as THREE from 'three';
import ColorPalette from "../color-palette";
import { COLOR_PALETTE_SIZE, GRID_SIZE, WIDTH } from './settings';

class Terrain {
    static BLOCK_SIZE = WIDTH / GRID_SIZE;
    static EMPTY_ID = 15;
    static MIN_GRID = new THREE.Vector3(0, 0, 0);
    static MAX_GRID = new THREE.Vector3(GRID_SIZE - 1, GRID_SIZE - 1, GRID_SIZE - 1);
    static BLOCK_BIT_SIZE = 4;
    static MAX_BITS = GRID_SIZE * GRID_SIZE * GRID_SIZE * Terrain.BLOCK_BIT_SIZE + 2;

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
        this.depthField = this._generateDepthField(GRID_SIZE);
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

    _generateDepthField(size: number) {
        const depthField = [] as number[][][];
        for(let i = 0; i < size; i++) {
            depthField.push([]);
            for(let j = 0; j < size; j++) {
                depthField[i].push([]);
                for(let k = 0; k < size; k++) {
                    depthField[i][j].push(Terrain.EMPTY_ID);
                }
            }
        }
        return depthField;
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
        this._performBlockAction(Terrain.MIN_GRID, Terrain.MAX_GRID, (i, j, k) => {
            if (this.depthField[i][j][k] === Terrain.EMPTY_ID) {
                return;
            }
            const colorId = this.depthField[i][j][k];
            const vertColor = colorId / COLOR_PALETTE_SIZE;
            const faces = [];
            if (i - 1 < 0 || this.depthField[i-1][j][k] === Terrain.EMPTY_ID) {
                faces.push(3);
            }
            if (i + 1 >= GRID_SIZE || this.depthField[i+1][j][k] === Terrain.EMPTY_ID) {
                faces.push(1);
            }
            if (j - 1 < 0 || this.depthField[i][j-1][k] === Terrain.EMPTY_ID) {
                faces.push(5);
            }
            if (j + 1 >= GRID_SIZE || this.depthField[i][j+1][k] === Terrain.EMPTY_ID) {
                faces.push(4);
            }
            if (k - 1 < 0 || this.depthField[i][j][k-1] === Terrain.EMPTY_ID) {
                faces.push(2);
            }
            if (k + 1 >= GRID_SIZE || this.depthField[i][j][k+1] === Terrain.EMPTY_ID) {
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
        })
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
        for(let i = Math.max(Math.min(startCoord.x, endCoord.x), 0); i <= Math.min(Math.max(startCoord.x, endCoord.x), GRID_SIZE - 1); i++) {
            for(let j = Math.max(Math.min(startCoord.y, endCoord.y), 0); j <= Math.min(Math.max(startCoord.y, endCoord.y), GRID_SIZE - 1); j++) {
                for(let k = Math.max(Math.min(startCoord.z, endCoord.z), 0); k <= Math.min(Math.max(startCoord.z, endCoord.z), GRID_SIZE - 1); k++) {
                    callback(i, j, k);
                }
            }
        }
    }

    attachVoxel(startCoord: THREE.Vector3, endCoord: THREE.Vector3, colorId: number) {
        if (startCoord && endCoord) {
            this.emitBeforeUpdate();
            this._performBlockAction(startCoord, endCoord, (x, y, z) => {
                this.depthField[x][y][z] = colorId;
            });
            this.generate();
            this.emitAfterUpdate();
        }
    }

    removeVoxel(startCoord: THREE.Vector3, endCoord: THREE.Vector3) {
        if (startCoord && endCoord) {
            this.emitBeforeUpdate();
            this._performBlockAction(startCoord, endCoord, (x, y, z) => {
                this.depthField[x][y][z] = Terrain.EMPTY_ID;
            });
            this.generate();
            this.emitAfterUpdate();
        }
    }

    paintVoxel(startCoord: THREE.Vector3, endCoord: THREE.Vector3, colorId: number) {
        if (startCoord && endCoord) {
            this.emitBeforeUpdate();
            this._performBlockAction(startCoord, endCoord, (x, y, z) => {
                if (this.depthField[x][y][z] !== Terrain.EMPTY_ID) {
                    this.depthField[x][y][z] = colorId;
                }
            });
            this.generate();
            this.emitAfterUpdate();
        }
    }

    clear() {
        this.emitBeforeUpdate();
        this._performBlockAction(Terrain.MIN_GRID, Terrain.MAX_GRID, (x,y,z) => {
            this.depthField[x][y][z] = Terrain.EMPTY_ID;
        });
        this.generate();
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
        return Math.floor(coord.x + coord.z * GRID_SIZE + (coord.y * GRID_SIZE * GRID_SIZE)) * 6;
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
        const y = Math.floor(blockId / (GRID_SIZE * GRID_SIZE));
        const rem = blockId % (GRID_SIZE * GRID_SIZE)
        const z = Math.floor(rem / GRID_SIZE);
        const x = rem % GRID_SIZE;
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
        } else if (this.depthField[neighbor.x][neighbor.y][neighbor.z] !== Terrain.EMPTY_ID) {
            return false;
        }
        return true;
    }

    coordinateToPosition(x: number, y: number, z: number) {
        return new THREE.Vector3(x, y, z)
            .addScalar(-GRID_SIZE / 2 + 0.5)
            .multiplyScalar(Terrain.BLOCK_SIZE);
    }

    positionToCoordinate(point: THREE.Vector3): THREE.Vector3 {
        const indexPoint = point.clone().multiplyScalar(1/Terrain.BLOCK_SIZE).addScalar(-0.5 + GRID_SIZE / 2);
        indexPoint.x = +Math.round(indexPoint.x);
        indexPoint.y = +Math.round(indexPoint.y);
        indexPoint.z = +Math.round(indexPoint.z);
        return indexPoint.round().clamp(Terrain.MIN_GRID, Terrain.MAX_GRID);
    }

    serialize() {
        let binaryString = '';
        this._performBlockAction(Terrain.MIN_GRID, Terrain.MAX_GRID, (x,y,z) => {
            binaryString += this.depthField[x][y][z].toString(2).padStart(4, '0');
        })
        return binaryToBase64(binaryString);
    }

    deserialize(base64Data: string) {
        const binaryString = base64ToBinary(base64Data);
        if (binaryString.length !== Terrain.MAX_BITS) {
            return false;
        }
        let index = 0;
        this._performBlockAction(Terrain.MIN_GRID, Terrain.MAX_GRID, (x,y,z) => {
            const startIndex = index * 4;
            this.depthField[x][y][z] = parseInt(binaryString.substring(startIndex, startIndex + 4), 2);
            index++;
        });
        this.generate();
        return true;
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
