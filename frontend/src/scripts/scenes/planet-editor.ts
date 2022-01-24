import * as THREE from 'three';
import GameObject from 'scripts/engine/game-object';
import Planet from 'scripts/objects/geo-planet';
import Background from 'scripts/objects/background';
import Axes from 'scripts/objects/axes';
import { UpdateState } from 'scripts/engine/engine';
import { Model } from 'scripts/model-loader';
import TargetCamera from 'scripts/cameras/target-camera';
import { CallbackSet } from 'scripts/engine/helpers';

export interface EditorTool {
    name: string,
    icon: string,
    brushChannel: BrushChannel,
    description: string
}

export enum BrushChannel {
    None, Terrain, Scenery
}

export const EditorTools = {
    raise: {
        name: 'Raise',
        icon: 'raise',
        brushChannel: BrushChannel.Terrain,
        description: 'Raise terrain'
    },
    lower: {
        name: 'Lower',
        icon: 'lower',
        brushChannel: BrushChannel.Terrain,
        description: 'Lower terrain'
    },
    smooth: {
        name: 'Smooth',
        icon: 'smooth',
        brushChannel: BrushChannel.Terrain,
        description: 'Smooth terrain'
    },
    level: {
        name: 'Level',
        icon: 'level',
        brushChannel: BrushChannel.Terrain,
        description: 'Level terrain'
    },
    paint: {
        name: 'Paint',
        icon: 'brush',
        brushChannel: BrushChannel.Terrain,
        description: 'Paint terrain'
    },
    items: {
        name: 'Items',
        icon: 'tree',
        brushChannel: BrushChannel.Scenery,
        description: 'Add scenery'
    },
    clear: {
        name: 'Clear',
        icon: 'trash',
        brushChannel: BrushChannel.Scenery,
        description: 'Clear scenery'
    },
    water: {
        name: 'Water',
        icon: 'water',
        brushChannel: BrushChannel.None,
        description: 'Water settings'
    },
    atmosphere: {
        name: 'Atmosphere',
        icon: 'cloud',
        brushChannel: BrushChannel.None,
        description: 'Atmosphere settings'
    },
    settings: {
        name: 'Settings',
        icon: 'gear',
        brushChannel: BrushChannel.None,
        description: 'Settings'
    }
}

class PlanetEditorScene extends GameObject {
    static MAX_STATE_STACK = 50;

    axes: Axes;
    planet: Planet;
    background: Background;
    tool: EditorTool | undefined;
    color: number;
    model: Model | undefined;
    flattenHeight: number | undefined;
    cameraController: TargetCamera;
    onUpdateCallback: CallbackSet;
    isDrawing: boolean;
    lastSaveState: string;
    _brushSize: number;
    _undoStack: string[];
    _redoStack: string[];
    _preventChangeStack: boolean;
    _saveStateTimeout: any;
    onLoadEvent?: (success: boolean, message?: string) => void;

    constructor() {
        super();
        this.axes = new Axes(100);
        this.axes.visible = false;
        this.lastSaveState = '';
        this.cameraController = new TargetCamera();
        this.engine.camera.position.set(10, 5, 10);
        this.engine.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.cameraController.transitionToTarget(new THREE.Vector3(), 1.0, 5.0);
        this.planet = new Planet();
        this.planet.terrain.onBeforeChange.addListener(this, () => {
            this.setSaveStateTimeout();
        });
        this.planet.scenery.onBeforeChange.addListener(this, () => {
            this.setSaveStateTimeout();
        });
        this.planet.colorPalette.onBeforeChange.addListener(this, () => {
            this.setSaveStateTimeout();
        });
        this.planet.atmosphere.onBeforeChange.addListener(this, () => {
            this.setSaveStateTimeout();
        });
        this.planet.water.onBeforeChange.addListener(this, () => {
            this.setSaveStateTimeout();
        });
        this.background = new Background(500, 20, 100);
        this.color = 0;
        this.onUpdateCallback = new CallbackSet();
        this.isDrawing = false;
        this._brushSize = 1.0;
        this._undoStack = [];
        this._redoStack = [];
        this._preventChangeStack = false;
        this._saveStateTimeout = undefined;
    }

    setSaveStateTimeout() {
        if (this._preventChangeStack) {
            return;
        }
        if (this._saveStateTimeout === undefined) {
            this._undoStack.push(this.planet.serialize());
            this._redoStack = [];
            this._saveStateTimeout = setTimeout(() => {
                this._saveStateTimeout = undefined;
            }, 500);
        } else {
            clearTimeout(this._saveStateTimeout);
            this._saveStateTimeout = setTimeout(() => {
                this._saveStateTimeout = undefined;
            }, 500);
        }
    }

    update(state: UpdateState) {
        if(state.keyboardMouse.inputStates.has('Control') && state.keyboardMouse.inputEvents.includes('z-down')) {
            this.undo();
        } else if(state.keyboardMouse.inputStates.has('Control') && state.keyboardMouse.inputEvents.includes('y-down')) {
            this.redo();
        } else {
            this.handleKeyboardMouse(state);
            this.handleTouch(state);
        }
        this.cameraController.setCursor(state);
    }

    handleTouch(state: UpdateState) {
        if (state.touch.inputEvents.includes('touch-up')) {
            this.flattenHeight = undefined;
            this.showCursor();
        }
        if (state.touch.touchCount === 1 && state.touch.position) {
            const cursorPosition = state.touch.position.screenCoordinates.toArray();
            const intersects = this.engine.raycastObjects(cursorPosition, this.planet.terrain.mesh);
            if (state.touch.inputEvents.includes('touch-down') && this.tool && intersects.length > 0) {
                this.cameraController.setEnabled(false);
                this.isDrawing = true;
            }
            if (this.isDrawing && intersects.length > 0) {
                this.showCursor(intersects[0]);
                this.edit(intersects[0], state.deltaTime);
            }
        }

        if (state.touch.inputEvents.includes('touch-up')) {
            this.cameraController.setEnabled(true);
            this.isDrawing = false;
            this.showCursor();
        }
    }

    handleKeyboardMouse(state: UpdateState) {
        if (state.keyboardMouse.inputEvents.includes('left-click-up')) {
            this.flattenHeight = undefined;
        }
        const cursorPosition = state.keyboardMouse.position.screenCoordinates.toArray();
        const intersects = this.engine.raycastObjects(cursorPosition, this.planet.terrain.mesh);

        if (state.keyboardMouse.inputStates.get('left-click')) {
            if (state.keyboardMouse.inputEvents.includes('left-click-down') && this.tool && intersects.length > 0) {
                this.cameraController.setEnabled(false);
                this.isDrawing = true;
            }
            if (this.isDrawing && intersects.length > 0) {
                this.edit(intersects[0], state.deltaTime);
            }
        }
        
        if(intersects.length > 0 && !this.cameraController.dragging) {
            this.showCursor(intersects[0]);
        } else {
            this.showCursor();
        }

        if(state.keyboardMouse.inputEvents.includes('left-click-up')) {
            this.cameraController.setEnabled(true);
            this.isDrawing = false;
        }
    }

    showCursor(intersect?: THREE.Intersection) {
        if (intersect && this.tool && [EditorTools.raise, EditorTools.lower, EditorTools.paint, EditorTools.smooth, EditorTools.level, EditorTools.clear, EditorTools.items].includes(this.tool)) {
            this.planet.terrain.setCursor(intersect.point, this._brushSize);
        } else {
            this.planet.terrain.disableCursor();
        }
    }

    edit(intersect: THREE.Intersection, deltaTime: number) {
        const face = intersect.faceIndex!;
        this.showCursor(intersect);
        const localPoint = intersect.point.clone().applyMatrix4(this.planet.scene.matrix.clone().invert());
        let updatePerformed = true;
        if (this.tool === EditorTools.smooth) {
            this.planet.terrain.smoothTerrain(localPoint, face, this._brushSize, deltaTime);
        } else if (this.tool === EditorTools.level) {
            if (!this.flattenHeight) {
                this.flattenHeight = this.planet.terrain.getFaceHeight(face);
            }
            this.planet.terrain.flattenTerrain(localPoint, face, this.flattenHeight, this._brushSize);
        } else if (this.tool === EditorTools.paint) {
            this.planet.terrain.paintTerrain(localPoint, face, this._brushSize, this.color);
        } else if (this.tool === EditorTools.raise) {
            this.planet.terrain.raiseTerrain(localPoint, face, true, this._brushSize, deltaTime);
        } else if (this.tool === EditorTools.lower) {
            this.planet.terrain.raiseTerrain(localPoint, face, false, this._brushSize, deltaTime);
        } else if (this.tool === EditorTools.clear) {
            const locationIds = this.planet.terrain.getLocationsInNormalizedRadius(localPoint, face, this._brushSize);
            this.planet.scenery.removeScenery(locationIds);
        } else if (this.tool === EditorTools.items && this.model) {
            const locationIds = this.planet.terrain.getLocationsInNormalizedRadius(localPoint, face, this._brushSize)
            this.planet.scenery.addScenery(this.model.id, this.color, locationIds);
        } else {
            updatePerformed = false;
        }
        if (updatePerformed) {
            this.onUpdateCallback.call();
        }
    }

    undo() {
        if (this._undoStack.length > 0) {
            if (this._undoStack.length >= PlanetEditorScene.MAX_STATE_STACK) {
                this._undoStack.shift();
            }
            this._preventChangeStack = true;
            this._redoStack.push(this.planet.serialize());
            this.planet.deserialize(this._undoStack.pop()!);
            this.isDrawing = false;
            this._preventChangeStack = false;
        }
    }

    redo() {
        if (this._redoStack.length > 0) {
            this._preventChangeStack = true;
            this._undoStack.push(this.planet.serialize())
            this.planet.deserialize(this._redoStack.pop()!);
            this.isDrawing = false;
            this._preventChangeStack = false;
        }
    }

    clearHistory() {
        this._undoStack = [];
        this._redoStack = [];
        if (this._saveStateTimeout) {
            clearTimeout(this._saveStateTimeout);
            this._saveStateTimeout = undefined;
        }
    }

    // Brush size is based on dot product from raycast intersection.
    setBrushSize(size: number) {
        size = Math.min(Math.max(0.0, size), 1.0);
        this._brushSize = 1.0 - (size / 10.0);
    }

    isUnsaved() {
        return this.planet.serialize() !== this.lastSaveState;
    }

    markSaved() {
        this.lastSaveState = this.planet.serialize();
    }

    dispose() {
        this.background.dispose();
        this.planet.dispose();
        this.axes.dispose();
        this.cameraController.dispose();
        super.dispose();
    }
}

export default PlanetEditorScene;
