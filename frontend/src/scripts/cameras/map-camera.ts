import * as THREE from 'three';
import { CursorTypes, UpdateState } from 'scripts/engine/engine';
import GameObject from 'scripts/engine/game-object';

interface CameraTransition {
    startPosition: THREE.Vector3,
    endPosition: THREE.Vector3,
    startTime: number,
    duration: number
}

class MapCamera extends GameObject {
    static ZOOM_ACCELERATION = 8.0;
    static DEFAULT_POSITION = new THREE.Vector3(0, 10, 5);
    static MIN_BOUNDS = new THREE.Vector3(-11, 0.2, -11);
    static MAX_BOUNDS = new THREE.Vector3(11, 20, 11);
    static TOUCH_ZOOM_SPEED = 10.0;

    dragging: boolean;
    camera: THREE.PerspectiveCamera;
    transition?: CameraTransition;
    startCameraPosition?: THREE.Vector3;
    startGroundPosition?: THREE.Vector3

    constructor() {
        super();
        this.camera = this.engine.camera;
        this.dragging = false;
        this.camera.position.set(...MapCamera.DEFAULT_POSITION.toArray());
        this.camera.lookAt(new THREE.Vector3());
    }

    update(state: UpdateState) {
        if (this.transition) {
            const dTime = (Date.now() - this.transition.startTime) / this.transition.duration;
            const dTimeSin = (Math.sin((-Math.PI / 2) + (Math.PI * dTime)) + 1.0) / 2.0;
            const dPosition = this.transition.startPosition.clone().lerp(this.transition.endPosition, dTimeSin);
            this.engine.camera.position.set(...dPosition.toArray());
            if (dTime >= 1.0) {
                this.dragging = false;
                this.transition = undefined;
            }
        } else {
            this.handleMouseControls(state);
            this.handleTouchControls(state);
            if(state.touch.inputEvents.includes('touch-up') || state.keyboardMouse.inputEvents.includes('left-click-up')) {
                this.dragging = false;
            }
        }
    }

    setCursor(state: UpdateState) {
        if (state.keyboardMouse.inputStates.get('left-click')) {
            this.engine.setCursor(CursorTypes.grabbing);
        } else {
            this.engine.setCursor(CursorTypes.default);
        }
    }

    zoom(coords: THREE.Vector2, dZoom: number) {
        const path = new THREE.Vector3(coords.x, coords.y, 0.5)
            .unproject(this.camera)
            .sub(this.camera.position)
            .normalize();
        const camPosition = this.camera.position.clone()
            .add(path.multiplyScalar(dZoom))
            .clamp(MapCamera.MIN_BOUNDS, MapCamera.MAX_BOUNDS);
        this.camera.position.set(...camPosition.toArray());
    }

    pan(coords: THREE.Vector2) {
        if (!this.dragging) {
            this.startCameraPosition = this.camera.position.clone();
            this.startGroundPosition = this._getRelativeGroundPosition(coords);
            this.dragging = true;
        }
        if (this.dragging && this.startCameraPosition && this.startGroundPosition) {
            const curGroundPosition = this._getRelativeGroundPosition(coords);
            const dPosition = curGroundPosition.sub(this.startGroundPosition);
            const camPosition = this.startCameraPosition.clone()
                .sub(dPosition)
                .clamp(MapCamera.MIN_BOUNDS, MapCamera.MAX_BOUNDS);
            this.camera.position.set(...camPosition.toArray());
        }
    }

    _getRelativeGroundPosition(coords: THREE.Vector2) {
        const cursorDirection = new THREE.Vector3(coords.x, coords.y, 0.5).unproject(this.camera).sub( this.camera.position ).normalize();
        const target = this.intersectGround(
            new THREE.Line3(this.camera.position, this.camera.position.clone().add(cursorDirection.clone().multiplyScalar(100)))
        );

        const camDirection = this.camera.getWorldDirection(new THREE.Vector3());
        const camCenterTarget = this.intersectGround(
            new THREE.Line3(this.camera.position, this.camera.position.clone().add(camDirection.clone().multiplyScalar(100)))
        );
        return target.clone().sub(camCenterTarget);
    }

    handleTouchControls(state: UpdateState) {
        if(state.touch.touchCount === 2 && state.touch.zoomPosition) {
            this.dragging = false;
            this.zoom(
                new THREE.Vector2(...state.touch.zoomPosition.screenCoordinates.toArray()),
                -state.touch.zoomDelta * state.deltaTime * this.zoomAcceleration * MapCamera.TOUCH_ZOOM_SPEED
            )
        }
        else if (state.touch.touchCount === 1 && state.touch.position) {
            const coords = new THREE.Vector2(...state.touch.position.screenCoordinates.toArray());
            this.pan(coords);
        }
    }

    handleMouseControls(state: UpdateState) {
        if(state.keyboardMouse.scrollDelta !== 0) {
            this.zoom(
                new THREE.Vector2(...state.keyboardMouse.position.screenCoordinates.toArray()),
                -state.keyboardMouse.scrollDelta * state.deltaTime * this.zoomAcceleration
            )
        }
        else if (state.keyboardMouse.inputStates.get('left-click')) {
            const coords = new THREE.Vector2(...state.keyboardMouse.position.screenCoordinates.toArray());
            this.pan(coords);
        }
    }

    get zoomAcceleration(): number {
        return this.camera.position.y * MapCamera.ZOOM_ACCELERATION + 1;
    }

    intersectGround(line: THREE.Line3) {
        const plane = new THREE.Plane(new THREE.Vector3(0,1,0));
        const target = new THREE.Vector3();
        plane.intersectLine(line, target);
        return target;
    }

    transitionToTarget(target: THREE.Vector3, duration: number, offset: number) {
        const camDirection = new THREE.Vector3();
        this.camera.getWorldDirection(camDirection);
        const zoomTarget = target.clone().add(camDirection.clone().setLength(-offset));
        this.transition = {
            startPosition: this.engine.camera.position.clone(),
            endPosition: zoomTarget,
            startTime: Date.now(),
            duration: duration * 1000
        }
    }

    transitionToPosition(position: THREE.Vector3, duration: number) {
        const startTime = Date.now();
        this.transition = {
            startPosition: this.engine.camera.position.clone(),
            endPosition: position,
            startTime: startTime,
            duration: duration * 1000
        }
    }

    clear() {
        this.transition = undefined;
    }
}

export default MapCamera;
