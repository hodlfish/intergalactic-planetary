import * as THREE from 'three';
import galaxyShader from '../shaders/GalaxyShader';
import GalacticSpec from 'scripts/GalacticSpec';
import GameObject from 'scripts/engine/GameObject';
import { CursorTypes, LayerDefinitions, UpdateState } from 'scripts/engine/Engine';
import Background from 'scripts/objects/Background';
import BlackHole from '../objects/BlackHole';
import GalaxyFog from '../objects/GalaxyFog';
import MapCamera from 'scripts/cameras/MapCamera';

class GalaxyScene extends GameObject {
    static RADIUS = 10.0;
    static GAP = 0.25;

    selectedSystem: string | undefined;
    hoveredSystem: string | undefined;
    galaxyShader: THREE.ShaderMaterial;
    galaxyMesh: THREE.InstancedMesh;
    mapCamera: MapCamera;
    blackHole: BlackHole;
    galaxyFog: GalaxyFog;
    background: Background;
    onSystemHoverEvent?: (systemId: string | undefined) => void;
    onSystemClickEvent?: (systemId: string | undefined) => void;

    constructor() {
        super();
        this.galaxyShader = new THREE.ShaderMaterial({
            uniforms: {
                colorPalette: {value: GalacticSpec.STAR_COLORS},
                time: {value: Date.now()}
            },
            vertexColors: true,
            vertexShader : galaxyShader.vertex,
            fragmentShader : galaxyShader.fragment,
            transparent: true
        });
        this.galaxyMesh = this.addGalaxy(GalacticSpec.getTotalSystems(GalacticSpec.MAX_PLANETS));
        this.galaxyMesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.galaxyMesh);

        this.blackHole = new BlackHole();
        this.galaxyFog = new GalaxyFog((GalaxyScene.RADIUS + GalaxyScene.GAP) * 2);
        this.background = new Background(500, 50, 200);
        this.mapCamera = new MapCamera();
    }

    dispose(): void {
        (this.galaxyMesh.material as THREE.Material).dispose();
        this.galaxyMesh.geometry.dispose();
        this.blackHole.dispose();
        this.galaxyFog.dispose();
        this.background.dispose();
        this.mapCamera.dispose();
        super.dispose();
    }

    update(state: UpdateState) {
        (this.galaxyShader as any).uniforms.time.value = Date.now() / 1000 % 100;
        const scale = Math.min(Math.max(this.engine.camera.position.y / 100.0, 0.02), 0.5);
        const oldMesh = this.galaxyMesh.geometry;
        this.galaxyMesh.geometry = new THREE.PlaneGeometry(scale, scale, 1, 1);
        oldMesh.dispose();
        const intersects = this.engine.raycastObjects((state.touch.position || state.keyboardMouse.position).screenCoordinates.toArray(), this.galaxyMesh);
        if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
            const instanceId = intersects[0].instanceId;
            const systemId = (instanceId + 1).toString();
            if (this.onSystemClickEvent && (state.keyboardMouse.inputEvents.includes('left-tap') || state.touch.inputEvents.includes('touch-tap'))) {
                this.onSystemClickEvent(systemId);
            } else {
                this.setHoveredSystem(systemId);
            }
            this.engine.setCursor(CursorTypes.pointer);
        } else {
            if (this.onSystemHoverEvent) {
                this.onSystemHoverEvent(undefined);
            }
            if (this.onSystemClickEvent && (state.keyboardMouse.inputStates.get('right-click') || state.touch.touchCount > 0))
                this.onSystemClickEvent(undefined);
            this.setHoveredSystem(undefined);
            this.mapCamera.setCursor(state);
        }
    }

    setHoveredSystem(systemId: string | undefined) {
        if (systemId !== this.hoveredSystem && this.hoveredSystem) {
            const parseId = parseInt(this.hoveredSystem) - 1;
            this.galaxyMesh.setColorAt(parseId, new THREE.Color(
                GalacticSpec.getSystemStarColorIndex(this.hoveredSystem) / GalacticSpec.STAR_COLORS.length, 
                0.0, 
                0.0
            ));
            this.hoveredSystem = systemId;
            if (this.galaxyMesh.instanceColor)
                this.galaxyMesh.instanceColor.needsUpdate = true;
        }
        if (systemId) {
            const parseId = parseInt(systemId) - 1;
            this.galaxyMesh.setColorAt(parseId, new THREE.Color(
                GalacticSpec.getSystemStarColorIndex(systemId) / GalacticSpec.STAR_COLORS.length, 
                1.0, 
                0.0
            ));
            this.hoveredSystem = systemId;
            if (this.galaxyMesh.instanceColor)
                this.galaxyMesh.instanceColor.needsUpdate = true;
        }
    }

    getSystemPosition(systemId: string) {
        const pos = GalacticSpec.getSystemPosition(systemId);
        return pos.multiplyScalar(GalaxyScene.RADIUS).add(pos.clone().setLength(GalaxyScene.GAP));
    }

    addGalaxy(count: number) {
        const geometry = new THREE.PlaneGeometry(0.01, 0.01, 1, 1);
        const objectMesh = new THREE.InstancedMesh(
            geometry,
            this.galaxyShader,
            count
        );

        const transform = new THREE.Object3D();
        transform.lookAt(MapCamera.DEFAULT_POSITION);
        for(let i = 0; i < count; i++) {
            const systemId = (i + 1).toString();
            const pos = this.getSystemPosition(systemId);
            transform.position.set(...pos.toArray());
            transform.updateMatrix();
            objectMesh.setMatrixAt(i, transform.matrix );
            objectMesh.setColorAt(i, new THREE.Color(
                GalacticSpec.getSystemStarColorIndex(systemId) / GalacticSpec.STAR_COLORS.length, 
                0.0,
                0.0
            ));
        }
        return objectMesh;
    }

    zoomInGalaxy() {
        this.mapCamera.transitionToTarget(
            new THREE.Vector3(0, 0, 0),
            1.0,
            10.0
        );
    }

    zoomInSystem(systemId: string) {
        const targetPos = this.getSystemPosition(systemId);
        this.mapCamera.transitionToTarget(
            targetPos,
            1.0,
            0.3
        )
    }

    zoomOutSystem(systemId: string) {
        const targetPos = this.getSystemPosition(systemId);
        const camDirection = new THREE.Vector3();
        this.mapCamera.camera.getWorldDirection(camDirection);
        const startPosition = targetPos.clone().add(camDirection.clone().setLength(-0.2));
        this.mapCamera.camera.position.set(...startPosition.toArray())
        this.mapCamera.transitionToTarget(
            targetPos,
            1.0,
            0.3
        )
    }
}

export default GalaxyScene;
