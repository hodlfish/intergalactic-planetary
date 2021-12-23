import { CursorTypes, UpdateState } from 'scripts/engine/Engine';
import GameObject from 'scripts/engine/GameObject';
import { CallbackSet } from 'scripts/engine/Helpers';
import GalacticSpec from 'scripts/GalacticSpec';
import starMapShader from 'scripts/shaders/StarMapShader';
import * as THREE from 'three';

class ShipMap extends GameObject {
    currentSystemId!: string;
    mesh?: THREE.InstancedMesh;
    systemIds: string[];
    geometry: THREE.PlaneGeometry;
    onSystemHover: CallbackSet;
    onSystemClicked: CallbackSet;
    sectorMap: Map<string, string[]>;
    _visible: boolean;

    constructor() {
        super();
        this.onSystemHover = new CallbackSet();
        this.onSystemClicked = new CallbackSet();
        this.systemIds = [];
        this.geometry = new THREE.PlaneGeometry(1.0, 1.0, 1, 1);
        this.sectorMap = this.generateSectorMap();
        this._visible = false;
    }

    generateSectorMap() {
        const map = new Map<string, string[]>();
        for(let i = 0; i < GalacticSpec.MAX_SYSTEMS; i++) {
            const systemId = (i+1).toString();
            const sectorKey = this.getSystemSector(systemId);
            map.set(sectorKey, [...(map.get(sectorKey) || []) as string[], systemId]);
        }
        return map;
    }

    getSystemSector(systemId: string) {
        const position = GalacticSpec.getSystemPosition(systemId);
        return `${Math.floor((position.x + 1.0) / 0.05)}-${Math.floor((position.z + 1.0) / 0.05)}`;
    }

    getNeighborSystems(systemId: string) {
        const sectorKey = this.getSystemSector(systemId);
        const [x, y] = sectorKey.split('-').map(coord => parseInt(coord));
        const neighbors = [];
        for(let i = x - 1; i < x + 2; i++) {
            for(let j = y - 1; j < y + 2; j++) {
                const neighborSectorKey = `${i}-${j}`;
                neighbors.push(...(this.sectorMap.get(neighborSectorKey) || []));
            }
        }
        return neighbors.filter(n => n !== systemId);
    }

    update(state: UpdateState) {
        if (this.visible) {
            const cursorPosition = state.keyboardMouse.position.screenCoordinates.toArray();
            const intersects = this.engine.raycastObjects(cursorPosition, this.mesh);
            if (intersects.length > 0) {
                const intersection = intersects[0];
                const instanceId = intersection.instanceId!;
                const systemId = this.systemIds[instanceId];
                if (systemId) {
                    this.engine.setCursor(CursorTypes.pointer);
                    if (state.keyboardMouse.inputEvents.includes('left-click-down')) {
                        this.onSystemClicked.call(systemId);
                        this.visible = false;
                    } else {
                        this.onSystemHover.call(systemId);
                    }
                }
            } else {
                this.engine.setCursor(CursorTypes.default);
                this.onSystemHover.call(undefined);
            }
        } else {
            this.engine.setCursor(CursorTypes.default);
            this.onSystemHover.call(undefined);
        }
    }

    setMap(currentSystem: string) {
        this.currentSystemId = currentSystem;
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.dispose();
        }
        this.systemIds = this.getNeighborSystems(currentSystem);
        const mesh = new THREE.InstancedMesh(
            this.geometry,
            new THREE.ShaderMaterial({
                vertexShader: starMapShader.vertex,
                fragmentShader: starMapShader.fragment,
                vertexColors: true
            }),
            this.systemIds.length
        );

        const transform = new THREE.Object3D();
        const center = new THREE.Vector3();
        const currentPosition = GalacticSpec.getSystemPosition(currentSystem);
        for(let i = 0; i < this.systemIds.length; i++) {
            const systemId = this.systemIds[i];
            const noise = GalacticSpec.noise(parseInt(systemId));
            const position = GalacticSpec.getSystemPosition(systemId).sub(currentPosition);
            position.setLength(100.0 + position.length() * 4.0);
            position.y = noise * 0.5;
            transform.position.set(...position.toArray());
            transform.lookAt(center);
            transform.updateMatrix();
            mesh.setMatrixAt(i, transform.matrix);
            mesh.setColorAt(i, GalacticSpec.getSystemStarColor(systemId));
        }
        mesh.visible = this._visible;
        this.mesh = mesh;
        this.scene.add(mesh);
    }

    set visible(state: boolean) {
        if (this.mesh) {
            this.mesh.visible = state;
        } 
        this._visible = state;
        this.onSystemHover.call(undefined);
    }

    get visible(): boolean {
        return this._visible;
    }

    dispose() {
        if (this.mesh) {
            this.mesh.dispose();
        }
        super.dispose();
    }
}

export default ShipMap;
