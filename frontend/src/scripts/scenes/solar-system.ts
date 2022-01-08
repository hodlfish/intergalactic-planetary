import * as THREE from 'three';
import GameObject from 'scripts/engine/game-object';
import Background from 'scripts/objects/background';
import GalacticSpec from 'scripts/galactic-spec';
import { getPlanets } from 'scripts/api';
import { CursorTypes, UpdateState } from 'scripts/engine/engine';
import TargetCamera from 'scripts/cameras/target-camera';
import SolarSystem from 'scripts/objects/solar-system';

class SolarSystemScene extends GameObject {
    static SYSTEM_RADIUS = 30.0;

    cameraController: TargetCamera;
    solarSystem!: SolarSystem;
    background: Background;
    systemId: string;
    initialized: boolean;
    onLoadEvent?: (success: boolean) => void;
    onObjectClickEvent?: (planetId: string | null) => void;

    constructor(systemId: string) {
        super();
        this.initialized = false;
        this.systemId = systemId;
        this.cameraController = new TargetCamera();
        this.cameraController.maxDistance = 100.0;
        this.background = new Background(500, 50, 200);
    }

    initialize() {
        const planetIds = GalacticSpec.getSystemPlanets(this.systemId);
        getPlanets(planetIds).then(planetInfos => {
            this.solarSystem = new SolarSystem(this.systemId, planetInfos)
            if (this.onLoadEvent) {
                this.onLoadEvent(true);
            }
            this.initialized = true;
        }).catch(error => {
            console.log(error)
            if (this.onLoadEvent) {
                this.onLoadEvent(false);
            }
        });
    }

    update(state: UpdateState) {
        if (!this.initialized) {
            return;
        }
        const intersects = this.engine.raycastObjects((state.touch.position || state.keyboardMouse.position).screenCoordinates.toArray(), this.solarSystem.collisionMeshes);
        if (intersects.length > 0) {
            this.engine.setCursor(CursorTypes.pointer);
            if (state.keyboardMouse.inputEvents.includes('left-tap') || state.touch.inputEvents.includes('touch-tap')) {
                const center = new THREE.Vector3();
                intersects[0].object.getWorldPosition(center);
                const selectedPlanet = Array.from(this.solarSystem.planetObjects.entries())
                    .find(([, planetData]) => intersects[0].object === planetData.planet.terrain.mesh);
                if (this.onObjectClickEvent) {
                    this.onObjectClickEvent(
                        (selectedPlanet) ? selectedPlanet[0] : null
                    );
                }
            }
        } else {
            this.cameraController.setCursor(state);
        }
    }

    dispose() {
        this.background.dispose();
        this.solarSystem.dispose();
        this.cameraController.dispose();
        super.dispose();
    }

    zoomInSolarSystem() {
        this.engine.camera.position.set(100, 50, 100);
        this.engine.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.cameraController.transitionToTarget(
            new THREE.Vector3(0, 0, 0),
            1.0,
            40.0
        );
    }

    zoomInStar() {
        this.cameraController.transitionToTarget(
            new THREE.Vector3(),
            1.0,
            this.solarSystem.starSize * 2.0 + SolarSystem.SYSTEM_RADIUS
        );
    }

    zoomInPlanet(planetId: string, distance: number) {
        const planet = this.solarSystem.planetObjects.get(planetId);
        if (planet) {
            this.cameraController.transitionToTarget(
                this.solarSystem.getPlanetPosition(planetId),
                1.0,
                distance
            );
        }
    }

    zoomOutPlanet(planetId: string) {
        const targetPos = this.solarSystem.getPlanetPosition(planetId);
        const posNormalized = targetPos.clone().normalize();
        const startPosition = targetPos.clone().add(posNormalized.clone().setLength(4));
        const endPosition = targetPos.clone().add(posNormalized.clone().setLength(6));
        endPosition.y = 1.0;
        this.cameraController.clear();
        this.engine.camera.position.set(...startPosition.toArray());
        this.engine.camera.lookAt(targetPos);
        this.cameraController.transitionToPosition(targetPos, endPosition, 1.0);
    }
}

export default SolarSystemScene;
