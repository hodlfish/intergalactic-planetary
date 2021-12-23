import * as THREE from 'three';
import { CursorTypes, UpdateState } from 'scripts/engine/Engine';
import GameObject from 'scripts/engine/GameObject';

interface CameraTransition {
    startPosition: THREE.Vector3,
    startRotation: THREE.Quaternion,
    endPosition: THREE.Vector3,
    endRotation: THREE.Quaternion,
    startTime: number,
    duration: number
}

class TargetCamera extends GameObject {
    // Static Settings
    static MOUSE_ZOOM_ACCELERATION = 60.0;
    static MOUSE_PAN_ACCELERATION = 200.0;
    static KEYBOARD_PAN_ACCELERATION = 4.0;
    static KEYBOARD_ZOOM_ACCELERATION = 10.0;
    static TOUCH_ZOOM_ACCELERATION = 1000.0;
    static TOUCH_PAN_ACCELERATION = 200.0;
    static PHI_RANGE_MIN = Math.PI / 12;
    static PHI_RANGE_MAX = Math.PI - TargetCamera.PHI_RANGE_MIN;

    // Camera Settings
    maxDistance = 20.0;
    minDistance = 1.0;
    drag = 3.0;

    // Camera State
    camera: THREE.PerspectiveCamera;
    target: THREE.Vector3;
    distance: number;
    theta: number;
    phi: number;
    dragging: boolean;
    enabled: boolean;
    transition?: CameraTransition;
    velocity = new THREE.Vector3();
    startCoords?: THREE.Vector2;

    constructor() {
        super();
        this.camera = this.engine.camera;
        this.target = new THREE.Vector3();
        this.distance = 5.0;
        this.theta = 0;
        this.phi = Math.PI / 4;
        this.dragging = false;
        this.enabled = true;
    }

    update(state: UpdateState) {
        if (this.transition) {
            const dTime = (Date.now() - this.transition.startTime) / this.transition.duration;
            const dTimeSin = (Math.sin((-Math.PI / 2) + (Math.PI * dTime)) + 1.0) / 2.0;
            const dPosition = this.transition.startPosition.clone().lerp(this.transition.endPosition, dTimeSin);
            this.engine.camera.position.set(...dPosition.toArray());
            this.engine.camera.rotation.setFromQuaternion(
                this.transition.startRotation.clone().slerp(this.transition.endRotation, dTimeSin)
            )
            if (dTime >= 1.0) {
                this.transition = undefined;
                this.calculateCoords();
                this.velocity = new THREE.Vector3();
            }
        } else if (this.enabled) {
            this.handleKeyboardMouse(state);
            this.handleTouch(state);
            const dragMultiplier = 1.0 - this.drag * state.deltaTime;
            this.velocity.multiplyScalar(dragMultiplier);
            this.theta = (this.theta - this.velocity.x * state.deltaTime);
            this.phi = Math.min(Math.max(this.phi + this.velocity.y * state.deltaTime, TargetCamera.PHI_RANGE_MIN), TargetCamera.PHI_RANGE_MAX);
            this.distance = Math.min(Math.max(this.distance + this.velocity.z * state.deltaTime, this.minDistance), this.maxDistance);
            this._setCameraPosition();
        }
    }

    handleKeyboardMouse(state: UpdateState) {
        // Mouse
        if(state.keyboardMouse.scrollDelta) {
            this.velocity.z += state.keyboardMouse.scrollDelta * state.deltaTime * this.zoomDistanceAcceleration * TargetCamera.MOUSE_ZOOM_ACCELERATION;
        }
        if (state.keyboardMouse.inputStates.get('left-click')) {
            if (!this.dragging) {
                this.dragging = true;
            }
            if (this.dragging) {
                const deltaCoords = state.keyboardMouse.position.deltaScreen(state.keyboardMouse.prevPosition);
                this.velocity.x -= deltaCoords.x * TargetCamera.MOUSE_PAN_ACCELERATION * state.deltaTime;
                this.velocity.y += deltaCoords.y * TargetCamera.MOUSE_PAN_ACCELERATION * state.deltaTime;
            }
        }
        if(state.keyboardMouse.inputEvents.includes('left-click-up')) {
            this.dragging = false;
        }

        // Keyboard
        if(state.keyboardMouse.inputStates.get('w')) {
            this.velocity.y -= TargetCamera.KEYBOARD_PAN_ACCELERATION * state.deltaTime;
        } else if(state.keyboardMouse.inputStates.get('s')) {
            this.velocity.y += TargetCamera.KEYBOARD_PAN_ACCELERATION * state.deltaTime;
        }

        if(state.keyboardMouse.inputStates.get('a')) {
            this.velocity.x -= TargetCamera.KEYBOARD_PAN_ACCELERATION * state.deltaTime;
        } else if(state.keyboardMouse.inputStates.get('d')) {
            this.velocity.x += TargetCamera.KEYBOARD_PAN_ACCELERATION * state.deltaTime;
        }

        if(state.keyboardMouse.inputStates.get('q')) {
            this.velocity.z -= TargetCamera.KEYBOARD_ZOOM_ACCELERATION * state.deltaTime;
        } else if(state.keyboardMouse.inputStates.get('e')) {
            this.velocity.z += TargetCamera.KEYBOARD_ZOOM_ACCELERATION * state.deltaTime;
        }
    }

    handleTouch(state: UpdateState) {
        if(state.touch.touchCount === 2) {
            this.dragging = false;
            this.velocity.z += state.touch.zoomDelta * state.deltaTime * TargetCamera.TOUCH_ZOOM_ACCELERATION * this.zoomDistanceAcceleration;
        }
        else if (state.touch.touchCount === 1 && state.touch.position && state.touch.prevPosition) {
            this.dragging = true;
            const deltaCoords = state.touch.position.deltaScreen(state.touch.prevPosition)
            this.velocity.x -= deltaCoords.x * TargetCamera.TOUCH_PAN_ACCELERATION * state.deltaTime;
            this.velocity.y += deltaCoords.y * TargetCamera.TOUCH_PAN_ACCELERATION * state.deltaTime;
        }
        if(state.touch.inputEvents.includes('touch-up')) {
            this.dragging = false;
        }
    }

    setCursor(state: UpdateState) {
        if (state.keyboardMouse.inputStates.get('left-click')) {
            this.engine.setCursor(CursorTypes.grabbing);
        } else {
            this.engine.setCursor(CursorTypes.default);
        }
    }

    get zoomDistanceAcceleration(): number {
        const percent = (this.camera.position.distanceTo(this.target) - this.minDistance) / (this.maxDistance - this.minDistance);
        return 1.0 + Math.pow(percent, 2) * (this.maxDistance - this.minDistance) * 0.33;
    }

    calculateCoords() {
        const [x, y, z] = this.camera.position.clone().sub(this.target).toArray();
        const d = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2));
        const p = new THREE.Vector3(x, y, z).angleTo(new THREE.Vector3(0, 1, 0));
        let t = Math.atan2(z, x);
        t += t < 0 ? Math.PI * 2 : 0;
        this.distance = d;
        this.theta = t;
        this.phi = p;
    }

    _setCameraPosition() {
        const position = new THREE.Vector3(
            this.distance * Math.sin(this.phi) * Math.cos(this.theta),
            this.distance * Math.cos(this.phi),
            this.distance * Math.sin(this.theta) * Math.sin(this.phi),
        ).add(this.target);
        this.camera.position.set(...position.toArray());
        this.camera.lookAt(this.target);
    }

    setTarget(position: THREE.Vector3) {
        this.target = position;
    }

    transitionToTarget(target: THREE.Vector3, duration: number, offset: number) {
        const startTime = Date.now();
        const zoomTarget = target.clone().sub(this.engine.camera.position).setLength(-offset).add(target);
        const rotationMatrix = this.engine.camera.matrix.clone().lookAt(
            this.engine.camera.position,
            target,
            new THREE.Vector3(0, 1, 0)
        )
        this.transition = {
            startPosition: this.engine.camera.position.clone(),
            startRotation: new THREE.Quaternion().setFromEuler(this.engine.camera.rotation),
            endPosition: zoomTarget,
            endRotation: new THREE.Quaternion().setFromRotationMatrix(rotationMatrix),
            startTime: startTime,
            duration: duration * 1000
        }
        this.setTarget(target);
    }

    transitionToPosition(target: THREE.Vector3, position: THREE.Vector3, duration: number) {
        const startTime = Date.now();
        const rotationMatrix = this.engine.camera.matrix.clone().setPosition(position).lookAt(
            position,
            target,
            new THREE.Vector3(0, 1, 0)
        )
        this.transition = {
            startPosition: this.engine.camera.position.clone(),
            startRotation: new THREE.Quaternion().setFromEuler(this.engine.camera.rotation),
            endPosition: position,
            endRotation: new THREE.Quaternion().setFromRotationMatrix(rotationMatrix),
            startTime: startTime,
            duration: duration * 1000
        }
        this.setTarget(target);
    }

    setEnabled(state: boolean) {
        if (!state) {
            this.velocity = new THREE.Vector3();
            this.transition = undefined;
        }
        this.enabled = state;
    }

    clear() {
        this.transition = undefined;
    }
}

export default TargetCamera;
