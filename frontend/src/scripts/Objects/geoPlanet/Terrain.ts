import * as THREE from 'three';
import terrainShader from 'scripts/shaders/geoPlanet/TerrainShader';
import { HEIGHT_RANGE, MIN_HEIGHT, UNIQUE_VERTICES, COLOR_PALETTE_SIZE } from './Settings';
import { lerp } from 'three/src/math/MathUtils';
import ColorPalette from '../ColorPalette';
import { base64ToBinary, binaryToBase64 } from 'scripts/Base64';
import Engine, { LayerDefinitions } from 'scripts/engine/Engine';
import { CallbackSet } from 'scripts/engine/Helpers';

export class Vertex {
    static HEIGHT_PRECISION = 256;
    static SERIALIZED_SIZE_BITS = 11;

    key: number;
    normalized: THREE.Vector3;
    height: number;
    clampedHeight: number;
    displayHeight: number;
    color: number;
    neighbors: Vertex[];
    faces: Face[];

    constructor(index: number, normalized: THREE.Vector3, height = Vertex.HEIGHT_PRECISION / 2) {
        this.key = index;
        this.normalized = normalized;
        this.height = 0.0;
        this.clampedHeight = 0.0;
        this.displayHeight = 0.0;
        this.setHeight(height);
        this.color = 0;
        this.neighbors = [];
        this.faces = [];
    }

    setHeight(newHeight: number) {
        this.height = Math.min(Math.max(newHeight, 0), Vertex.HEIGHT_PRECISION - 1);
        this.clampedHeight = Math.round(this.height);
        this.displayHeight = MIN_HEIGHT + (this.clampedHeight / Vertex.HEIGHT_PRECISION * HEIGHT_RANGE);
    }

    addNeighbor(other: Vertex) {
        if (this.key !== other.key) {
            if (!this.neighbors.includes(other)) {
                this.neighbors.push(other);
            }
            if(!other.neighbors.includes(this)) {
                other.neighbors.push(this);
            }
        }
    }

    getLocationId() {
        return this.key;
    }

    serialize(): string {
        return this.clampedHeight.toString(2).padStart(8, '0') + this.color.toString(2).padStart(3, '0');
    }

    deserialize(binary: string) {
        this.setHeight(parseInt(binary.substring(0, 8), 2));
        this.color = parseInt(binary.substring(8, 11), 2);
    }
}

export class Face {
    key: number;
    vertices: Vertex[];
    normalizedCenter: THREE.Vector3;

    constructor(key: number, vertices: Vertex[]) {
        this.key = key;
        this.vertices = vertices;
        this.vertices.forEach(v => {
            v.faces.push(this);
        });
        this.vertices[0].addNeighbor(this.vertices[1]);
        this.vertices[1].addNeighbor(this.vertices[2]);
        this.vertices[2].addNeighbor(this.vertices[0]);
        this.normalizedCenter = this.vertices[0].normalized.clone().add(this.vertices[1].normalized).add(this.vertices[2].normalized).normalize();
    }

    getCenter(normalized = false): THREE.Vector3 {
        const a = this.vertices[0];
        const b = this.vertices[1];
        const c = this.vertices[2];
        if (normalized) {
            return a.normalized.clone().add(b.normalized).add(c.normalized).normalize();
        } else {
            return new THREE.Vector3(
                (a.normalized.x * a.displayHeight + b.normalized.x * b.displayHeight + c.normalized.x * c.displayHeight) / 3.0,
                (a.normalized.y * a.displayHeight + b.normalized.y * b.displayHeight + c.normalized.y * c.displayHeight) / 3.0,
                (a.normalized.z * a.displayHeight + b.normalized.z * b.displayHeight + c.normalized.z * c.displayHeight) / 3.0,
            );
        }
    }

    getLocationId() {
        return UNIQUE_VERTICES + this.key;
    }
}

const TERRAIN_UV_TEXTURE = new THREE.TextureLoader().load('/assets/geo_terrain_uv.png');
TERRAIN_UV_TEXTURE.generateMipmaps = false;

export class Terrain {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    mesh: THREE.Mesh;
    colorPalette: ColorPalette;
    vertices: Vertex[];
    faces: Face[];
    raiseLowerSpeed = 50.0;
    smoothSpeed = 2.5;
    onBeforeChange: CallbackSet;
    onAfterChange: CallbackSet;

    constructor(colorPalette: ColorPalette, iterations=3) {
        this.onBeforeChange = new CallbackSet();
        this.onAfterChange = new CallbackSet();

        // Color Palette
        this.colorPalette = colorPalette;
        this.colorPalette.onAfterChange.addListener(this, (colors: THREE.Color[]) => {
            this.onColorPaletteChange(colors);
        })

        // Planet Mesh
        this.geometry = new THREE.BufferGeometry();
        this.material = new THREE.ShaderMaterial(
            {
                uniforms: {
                    colorPalette: {value: this.colorPalette.colors},
                    showCursor: {value: false},
                    cursorPosition: {value: new THREE.Vector3(0, 0, 0)},
                    brushSize: {value: 0.95},
                    uvTexture: {value: TERRAIN_UV_TEXTURE},
                    cameraDirection: {value: new THREE.Vector3()},
                    ambientLight: {value: 0.5}
                },
                vertexColors: true,
                vertexShader : terrainShader.vertex,
                fragmentShader : terrainShader.fragment,
            }
        );
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.layers.set(LayerDefinitions.default);
        this.vertices = [];
        this.faces = [];
        this.generateIcosphere(iterations)
    }

    generateIcosphere(iterations = 2): any {
        // Generate normalized triangles and vertices, and cache.
        for (let i = 0; i < Terrain.initialTriangles.length; i+=3) {
            this._iterateFace([
                Terrain.initialVertices[Terrain.initialTriangles[i]],
                Terrain.initialVertices[Terrain.initialTriangles[i + 1]],
                Terrain.initialVertices[Terrain.initialTriangles[i + 2]]],
                iterations
            );
        }
        const uvs = [] as number[];
        for(let i = 0; i < this.faces.length; i++) {
            uvs.push(1.0, 0.0, 0.0, 0.0, 0.5, 0.866025);
        }
        this.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        this.setMesh();
    }

    setMesh() {
        const positionArr = [] as number[];
        const colorArr = [] as number[];

        this.faces.forEach(face => {
            const a = face.vertices[0];
            const b = face.vertices[1];
            const c = face.vertices[2];
            positionArr.push(
                a.normalized.x * a.displayHeight, a.normalized.y * a.displayHeight, a.normalized.z * a.displayHeight,
                b.normalized.x * b.displayHeight, b.normalized.y * b.displayHeight, b.normalized.z * b.displayHeight, 
                c.normalized.x * c.displayHeight, c.normalized.y * c.displayHeight, c.normalized.z * c.displayHeight
            );
            const cr = a.color / COLOR_PALETTE_SIZE;
            const cg = b.color / COLOR_PALETTE_SIZE;
            const cb = c.color / COLOR_PALETTE_SIZE;
            colorArr.push(cr, cg, cb, cr, cg, cb, cr, cg, cb);
        });
        this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positionArr), 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorArr), 3));
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingSphere();
    }

    emitBeforeUpdate() {
        this.onBeforeChange.call();
    }

    emitAfterUpdate() {
        this.onAfterChange.call();
    }

    animate() {
        (this.material as any).uniforms.cameraDirection.value = Engine.instance.cameraDirection;
    }

    onColorPaletteChange(colors: THREE.Color[]) {
        const paletteArr = [] as number[];
        colors.forEach(c => {
            paletteArr.push(...c.toArray());
        });
        (this.mesh.material as any).uniforms.colorPalette.value = paletteArr;
    }

    disableCursor() {
        (this.mesh.material as any).uniforms.showCursor.value = false;
    }

    setCursor(position: THREE.Vector3, brushSize: number) {
        (this.mesh.material as any).uniforms.showCursor.value = true;
        (this.mesh.material as any).uniforms.cursorPosition.value = position;
        (this.mesh.material as any).uniforms.brushSize.value = brushSize;
    }

    getLocationsInNormalizedRadius(position: THREE.Vector3, faceIndex: number, brushSize: number) {
        const cachedFace = this.faces[faceIndex];
        const normalizedPosition = position.clone().normalize();
        const openFaces = [cachedFace];
        const closedFaces = new Set<number>();
        const closedLocations = new Set<number>();
        const locationsInRange = new Set<number>();
        while(openFaces.length > 0) {
            const face = openFaces.pop();
            if (face) {
                closedFaces.add(face.key);
                closedLocations.add(face.getLocationId());
                const angle = face.normalizedCenter.dot(normalizedPosition);
                if (angle >= brushSize) {
                    locationsInRange.add(face.getLocationId())
                }
                face.vertices.forEach(v => {
                    if (!closedLocations.has(v.getLocationId())) {
                        const angle = v.normalized.dot(normalizedPosition);
                        if (angle >= brushSize) {
                            locationsInRange.add(v.getLocationId());
                            v.faces.forEach(f => {
                                if (!closedFaces.has(f.key)) {
                                    openFaces.push(f);
                                }
                            });
                        }
                    }
                });
            }
        }
        return Array.from(locationsInRange);
    }

    getVerticesInNormalizedRadius(position: THREE.Vector3, faceIndex: number, brushSize: number) {
        const cachedFace = this.faces[faceIndex];
        const normalizedPosition = position.clone().normalize();
        const openVerts = [...cachedFace.vertices];
        const closedVerts = new Set<number>();
        const vertsInRange = new Map() as Map<Vertex, number>;
        while(openVerts.length > 0) {
            const vert = openVerts.pop();
            if (vert) {
                closedVerts.add(vert.key);
                const angle = vert.normalized.dot(normalizedPosition);
                if (angle >= brushSize) {
                    const distance = Math.max(1.0 - (angle - brushSize) * (1.0 / (1.0 - brushSize)), 0.0);
                    vertsInRange.set(vert, distance);
                    vert.neighbors.forEach(neighbor => {
                        if (!closedVerts.has(neighbor.key)) {
                            openVerts.push(neighbor);
                        }
                    })
                }
            }
        }
        return Array.from(vertsInRange.entries()).sort(([, aDis], [, bDis]) => (aDis < bDis) ? -1 : 1 );
    }

    paintTerrain(position: THREE.Vector3, faceIndex: number, size: number, color: number) {
        this.emitBeforeUpdate();
        const vertices = this.getVerticesInNormalizedRadius(position, faceIndex, size);
        vertices.forEach(([vertex,]) => {
            vertex.color = color;
        });
        this.setMesh();
        this.emitAfterUpdate();
    }

    getFaceHeight(faceIndex: number) {
        const cachedFace = this.faces[faceIndex];
        let avgHeight = 0;
        cachedFace.vertices.forEach((vert) => {
            avgHeight += vert.height;
        });
        avgHeight /= 3;
        return avgHeight;
    }

    flattenTerrain(position: THREE.Vector3, faceIndex: number, height: number, size: number) {
        this.emitBeforeUpdate();
        const verts = this.getVerticesInNormalizedRadius(position, faceIndex, size);
        verts.forEach(([vert,]) => {
            vert.setHeight(height);
        });
        this.setMesh();
        this.emitAfterUpdate();
    }

    smoothTerrain(position: THREE.Vector3, faceIndex: number, size: number, delta: number) {
        this.emitBeforeUpdate();
        const verts = this.getVerticesInNormalizedRadius(position, faceIndex, size);
        verts.forEach(([vert,]) => {
            let targetHeight = 0.0;
            vert.neighbors.forEach(neighbor => targetHeight += neighbor.height);
            targetHeight /= vert.neighbors.length;
            vert.setHeight(lerp(vert.height, targetHeight, delta * this.smoothSpeed));
        });
        this.setMesh();
        this.emitAfterUpdate();
    }

    raiseTerrain(position: THREE.Vector3, faceIndex: number, up: boolean, size: number, delta: number) {
        this.emitBeforeUpdate();
        const verts = this.getVerticesInNormalizedRadius(position, faceIndex, size);
        verts.forEach(([vert, distance]) => {
            vert.setHeight(vert.height + (up ? delta : -delta) * this.raiseLowerSpeed * ((size - distance) / size));
        });
        this.setMesh();
        this.emitAfterUpdate();
    }

    getNearestObjectLocationId(position: THREE.Vector3, faceIndex: number) {
        const cachedFace = this.faces[faceIndex];
        const normalizedPosition = position.clone().normalize();
        let nearestVert = cachedFace.vertices[0];
        let nearestDistance = normalizedPosition.distanceTo(cachedFace.vertices[0].normalized);
        for (let i = 1; i < cachedFace.vertices.length; i++) {
            const distance = normalizedPosition.distanceTo(cachedFace.vertices[i].normalized);
            if (distance < nearestDistance) {
                nearestVert = cachedFace.vertices[i];
                nearestDistance = distance;
            }
        }
        if (normalizedPosition.distanceTo(cachedFace.normalizedCenter) < nearestDistance) {
            return cachedFace.getLocationId();
        }
        return nearestVert?.getLocationId();
    }

    locationIdToPoint(locationId: number) {
        if (locationId < 642) {
            return this.vertices[locationId].normalized.clone().multiplyScalar(this.vertices[locationId].displayHeight);
        } else {
            return this.faces[locationId - 642].getCenter();
        }
    }

    serialize(): string {
        return binaryToBase64(Array.from(this.vertices.values()).map(v => v.serialize()).join(''))
    }

    deserialize(base64: string) {
        if(base64.length !== this.vertices.length * Vertex.SERIALIZED_SIZE_BITS / 6) {
            return false;
        }
        const binary = base64ToBinary(base64);
        for(let i = 0; i < this.vertices.length; i++) {
            this.vertices[i].deserialize(binary.substring(i * 11, (i+1) * 11));
        }
        this.setMesh();
        return true;
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
    }

    // ----------------------------------
    // Private - Construction Functions
    // ----------------------------------
    _keyDecimals = 2;
    _vertices = new Map<string, Vertex>();

    _getCacheKey(vector: THREE.Vector3) {
        const normalized = vector.clone().normalize();
        return `${normalized.x.toFixed(this._keyDecimals)}-${normalized.y.toFixed(this._keyDecimals)}-${normalized.z.toFixed(this._keyDecimals)}`;
    }

    _checkCache(vector: THREE.Vector3): Vertex {
        const normalized = vector.clone().normalize();
        const vectorKey = this._getCacheKey(normalized);
        const cachedVertex = this._vertices.get(vectorKey);
        if (cachedVertex) {
            return cachedVertex;
        } else {
            const newCachedVector = new Vertex(this.vertices.length, normalized);
            this._vertices.set(vectorKey, newCachedVector);
            this.vertices.push(newCachedVector);
            return newCachedVector;
        }
    }

    _cacheFace(a: Vertex, b: Vertex, c: Vertex): Face {
        const newFace = new Face(this.faces.length, [a,b,c]);
        this.faces.push(newFace);
        return newFace;
    }

    _iterateFace(points: THREE.Vector3[], iterations: number) {
        if (iterations <= 0) {
            const a = this._checkCache(points[0]);
            const b = this._checkCache(points[1]);
            const c = this._checkCache(points[2]);
            this._cacheFace(a, b, c);
        } else {
            const a = points[0];
            const b = points[1];
            const c = points[2];
            const ab = a.clone().add(b).normalize();
            const bc = b.clone().add(c).normalize();
            const ca = c.clone().add(a).normalize();
            this._iterateFace([a, ab, ca], iterations - 1);
            this._iterateFace([ab, b, bc], iterations - 1);
            this._iterateFace([bc, ca, ab], iterations - 1);
            this._iterateFace([ca, bc, c], iterations - 1);
        }
    }

    static initialVertices = [
        new THREE.Vector3(0.0, 1.0, 0.0).normalize(),
        new THREE.Vector3(0.276385, 0.447215, -0.85064).normalize(),
        new THREE.Vector3(0.894425, 0.447215, 0.0).normalize(),
        new THREE.Vector3(0.276385, 0.447215, 0.85064).normalize(),
        new THREE.Vector3(-0.7236, 0.447215, 0.52572).normalize(),
        new THREE.Vector3(-0.7236, 0.447215, -0.52572).normalize(),
        new THREE.Vector3(-0.276385, -0.447215, -0.85064).normalize(),
        new THREE.Vector3(0.7236, -0.447215, -0.52572).normalize(),
        new THREE.Vector3(0.7236, -0.447215, 0.52572).normalize(),
        new THREE.Vector3(-0.276385, -0.447215, 0.85064).normalize(),
        new THREE.Vector3(-0.894425, -0.447215, 0.0).normalize(),
        new THREE.Vector3(0.0, -1.0, 0.0).normalize(),
    ]

    static initialTriangles = [
        2,1,0,
        3,2,0,
        4,3,0,
        5,4,0,
        1,5,0,
        5,1,6,
        7,6,1,
        1,2,7,
        8,7,2,
        2,3,8,
        9,8,3,
        3,4,9,
        10,9,4,
        4,5,10,
        6,10,5,
        6,7,11,
        7,8,11,
        8,9,11,
        9,10,11,
        10,6,11
    ]
}
