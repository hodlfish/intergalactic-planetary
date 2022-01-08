import * as THREE from 'three';
import Curtain from './curtain';
import { CallbackSet } from './helpers';
import { Coordinate } from './inputs/definitions';
import { KeyboardMouseInputs } from './inputs/keyboard-mouse-inputs';
import { TouchInputs } from './inputs/touch-inputs';

export const LayerDefinitions = {
    default: 0,
    background: 1,
    transparent: 2
}

export const CursorTypes = {
    default: 'default',
    pointer: 'pointer',
    grabbing: 'grabbing'
}

export interface UpdateState {
    deltaTime: number,
    keyboardMouse: {
        position: Coordinate,
        prevPosition: Coordinate,
        scrollDelta: number,
        inputStates: Map<any, boolean>,
        inputEvents: string[]
    },
    touch: {
        position: Coordinate | undefined,
        prevPosition: Coordinate | undefined,
        zoomPosition: Coordinate | undefined,
        zoomDelta: number,
        touchCount: number,
        inputEvents: string[]
    }
}

export interface RegisteredCollisionMesh {
    mesh: THREE.Mesh,
    object: any
}

export class Engine {
    canvas: HTMLCanvasElement;
    curtain: Curtain;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    cameraDirection: THREE.Vector3;
    renderer: THREE.WebGLRenderer;
    raycaster: THREE.Raycaster;
    interval: number;
    lastTime: number;
    currentTime: number;
    delta: number;
    isRunning: boolean;
    keyboardMouseInputs: KeyboardMouseInputs;
    touchInputs: TouchInputs;
    renderTarget: THREE.WebGLRenderTarget;
    depthTextureCallbacks = new CallbackSet();
    updateCallbacks = new CallbackSet();
    _collisionMeshes = new Map<number, RegisteredCollisionMesh>();
    static _instance: Engine;

    static get instance() {
        return Engine._instance;
    }

    constructor(targetFPS = 60) {
        Engine._instance = this;

        // Render Canvas
        this.canvas = document.createElement("canvas") as HTMLCanvasElement;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0px';
        this.canvas.style.right = '0px';
        this.canvas.style.top = '0px';
        this.canvas.style.bottom = '0px';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.touchAction = 'none';
        document.body.appendChild(this.canvas);
        
        // Renderer and misc.
        this.renderer = new THREE.WebGLRenderer({antialias: true, canvas: this.canvas});
        this.renderer.autoClear = false;
        this.renderer.setClearColor('#1b181b');
        this.raycaster = new THREE.Raycaster();
        this.scene = new THREE.Scene();
        this.curtain = new Curtain(this);
        this.camera = new THREE.PerspectiveCamera(85, window.innerWidth/window.innerHeight, 0.1, 200);
        this.cameraDirection = new THREE.Vector3();

        // Depth Texture
        this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
        this.renderTarget.texture.minFilter = THREE.NearestFilter;
        this.renderTarget.texture.magFilter = THREE.NearestFilter;
        this.renderTarget.texture.generateMipmaps = false;
        this.renderTarget.stencilBuffer = false;
        this.renderTarget.depthBuffer = true;
        this.renderTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
        this.renderTarget.depthTexture.format = THREE.DepthFormat;
        this.renderTarget.depthTexture.type = THREE.UnsignedIntType;

        // Events
        window.addEventListener('resize', this._onWindowResize.bind(this));
        document.addEventListener('contextmenu', event => event.preventDefault());
        this.keyboardMouseInputs = new KeyboardMouseInputs(this.canvas);
        this.touchInputs = new TouchInputs(this.canvas);

        // Start game loop
        this.interval = 1000 / targetFPS;
        this.lastTime = (new Date()).getTime();
        this.currentTime = this.lastTime;
        this.delta = 0;
        this.isRunning = true;
        this._onWindowResize();
        this.gameLoop();
    }

    onContextMenu(event: any) {
        event.preventDefault();
    }

    gameLoop() {
        if (this.isRunning) {
            window.requestAnimationFrame(this.gameLoop.bind(this));
        }
        this.currentTime = (new Date()).getTime();
        this.delta = (this.currentTime - this.lastTime);

        if(this.delta > this.interval) {
            this.lastTime = this.currentTime - (this.delta % this.interval);
            this.camera.getWorldDirection(this.cameraDirection);

            // Update
            const state = {
                deltaTime: this.delta / 1000,
                keyboardMouse: {
                    position: this.keyboardMouseInputs.mousePosition,
                    prevPosition: this.keyboardMouseInputs.prevMousePosition,
                    scrollDelta: this.keyboardMouseInputs.scrollDelta,
                    inputStates: this.keyboardMouseInputs.inputStates,
                    inputEvents: this.keyboardMouseInputs.inputEvents
                },
                touch: {
                    position: this.touchInputs.position,
                    prevPosition: this.touchInputs.prevPosition,
                    zoomPosition: this.touchInputs.zoomPosition,
                    zoomDelta: this.touchInputs.zoom,
                    touchCount: this.touchInputs.touchCount,
                    inputEvents: this.touchInputs.inputEvents
                }
            }
            this.keyboardMouseInputs.tick();
            this.touchInputs.tick();
            this.updateCallbacks.call(state);

            // Render depth texture
            this.camera.layers.disableAll();
            this.camera.layers.set(LayerDefinitions.default);
            this.renderer.setRenderTarget( this.renderTarget );
            this.renderer.clear();
            this.renderer.render( this.scene, this.camera );
            this.depthTextureCallbacks.call(this.renderTarget.depthTexture);

            // Render game world
            this.renderer.setRenderTarget( null );
            this.renderer.clear();
            this.camera.layers.disableAll();
            this.camera.layers.set(LayerDefinitions.background);
            this.renderer.render( this.scene, this.camera );
            this.renderer.clearDepth();
            this.camera.layers.disableAll();
            this.camera.layers.enable(LayerDefinitions.default);
            this.camera.layers.enable(LayerDefinitions.transparent);
            this.renderer.render( this.scene, this.camera );
        }
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('resize', this._onWindowResize.bind(this));
        this.keyboardMouseInputs.dispose();
        this.touchInputs.dispose();
        this.renderer.dispose();
        document.body.removeChild(this.canvas);
    }

    raycastObjects(mousePosition: any, objects: any | any[]) {
        this.raycaster.setFromCamera({x:mousePosition[0], y:mousePosition[1]}, this.camera);
        if (Array.isArray(objects)) {
            return this.raycaster.intersectObjects(objects);
        } else {
            return this.raycaster.intersectObject(objects);
        }
    }

    registerCollisionMesh(mesh: THREE.Mesh, object: any) {
        this._collisionMeshes.set(mesh.id, {mesh: mesh, object: object});
    }

    unregisterCollisionMesh(mesh: THREE.Mesh) {
        this._collisionMeshes.delete(mesh.id);
    }

    getCollisionObject(mesh: THREE.Mesh) {
        const registered = this._collisionMeshes.get(mesh.id);
        if (registered) {
            return registered.object;
        }
        return undefined;
    }

    getCollisionMeshes() {
        return Array.from(this._collisionMeshes.values()).map(registered => registered.mesh);
    }

    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderTarget.setSize( window.innerWidth, window.innerHeight );
    }

    setCursor(cursor: string) {
        document.body.style.cursor = cursor;
    }
}

export default Engine;
