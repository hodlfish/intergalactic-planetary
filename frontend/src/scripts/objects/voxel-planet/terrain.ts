import planetShader from 'scripts/shaders/voxel-planet/planet-shader';
import * as THREE from 'three';
import ColorPalette from "../color-palette";

class Terrain {
    static GRID_SIZE = 16;
    static WIDTH = 5.0;
    static BLOCK_SIZE = Terrain.WIDTH / Terrain.GRID_SIZE;
    static WATER_ID = 8;
    static EMPTY_ID = 9;

    colorPalette: ColorPalette;
    mesh: THREE.Mesh;
    geometry: THREE.BufferGeometry;
    material: THREE.ShaderMaterial;
    depthField: number[][][];

    constructor(colorPalette: ColorPalette) {
        this.colorPalette = colorPalette;
        this.colorPalette.onAfterChange.addListener(this, (colors: THREE.Color[]) => {
            this.onColorPaletteChange(colors);
        })
        this.depthField = [];
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
                    const vertColor = colorId / 8.0;
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
                    const voxelCenter = this._indexToVoxelCenter(i, j, k);
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

    attachVoxel(point: THREE.Vector3, normal: THREE.Vector3, colorId: number) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(Terrain.BLOCK_SIZE / 2));
        const index = this._voxelCenterToIndex(offsetPoint);
        if (index) {
            this.depthField[index.x][index.y][index.z] = colorId;
            this.generate();
        }
    }

    removeVoxel(point: THREE.Vector3, normal: THREE.Vector3) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(-Terrain.BLOCK_SIZE / 2));
        const index = this._voxelCenterToIndex(offsetPoint);
        if (index) {
            this.depthField[index.x][index.y][index.z] = Terrain.EMPTY_ID;
            this.generate();
        }
    }

    paintVoxel(point: THREE.Vector3, normal: THREE.Vector3, colorId: number) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(-Terrain.BLOCK_SIZE / 2));
        const index = this._voxelCenterToIndex(offsetPoint);
        if (index) {
            this.depthField[index.x][index.y][index.z] = colorId;
            this.generate();
        }
    }

    getLocationId(point: THREE.Vector3, normal: THREE.Vector3) {
        const offsetPoint = point.clone().add(normal.clone().multiplyScalar(-Terrain.BLOCK_SIZE / 2));
        const index = this._voxelCenterToIndex(offsetPoint);
        console.log(index)
        if (index) {
            return Math.floor(index.x + index.z * Terrain.GRID_SIZE + (index.y * Terrain.GRID_SIZE * Terrain.GRID_SIZE)) * 6;
        } else {
            return -1;
        }
    }

    locationIdToPoint(locationId: number) {
        const blockId = locationId / 6;
        const face = locationId % 6;
        const y = Math.floor(blockId / (Terrain.GRID_SIZE * Terrain.GRID_SIZE));
        const rem = blockId % (Terrain.GRID_SIZE * Terrain.GRID_SIZE)
        const z = Math.floor(rem / Terrain.GRID_SIZE);
        const x = rem % Terrain.GRID_SIZE;
        const voxelCenter = this._indexToVoxelCenter(x, y, z);
        return voxelCenter;
    }

    serialize() {
        return false;
    }

    deserialize(data: string) {
        console.log(data);
        return false;
    }

    _indexToVoxelCenter(x: number, y: number, z: number) {
        return new THREE.Vector3(
            x + 0.5 - Terrain.GRID_SIZE / 2,
            y + 0.5 - Terrain.GRID_SIZE / 2,
            z + 0.5 - Terrain.GRID_SIZE / 2
        ).multiplyScalar(Terrain.BLOCK_SIZE);
    }

    _voxelCenterToIndex(point: THREE.Vector3): THREE.Vector3 | undefined {
        const indexPoint = point.clone().multiplyScalar(1/Terrain.BLOCK_SIZE).addScalar(-0.5 + Terrain.GRID_SIZE / 2);
        indexPoint.x = +Math.round(indexPoint.x);
        indexPoint.y = +Math.round(indexPoint.y);
        indexPoint.z = +Math.round(indexPoint.z);
        const values = indexPoint.toArray();
        for(let i = 0; i < values.length; i++) {
            const value = values[i];
            if (value < 0 || value > Terrain.GRID_SIZE - 1) {
                return undefined;
            }
        }
        return indexPoint;
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
