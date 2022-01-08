import * as THREE from 'three';
import GameObject from 'scripts/engine/GameObject';
import Planet from 'scripts/objects/VoxelPlanet';
import Background from 'scripts/objects/Background';
import { UpdateState } from 'scripts/engine/Engine';
import TargetCamera from 'scripts/cameras/TargetCamera';
import Grid from 'scripts/objects/voxelPlanet/Grid';
import Terrain from 'scripts/objects/voxelPlanet/Terrain';

export interface EditorTool {
    name: string,
    icon: string
}

export const EditorTools = {
    add: {
        name: 'Add',
        icon: 'raise'
    },
    remove: {
        name: 'Remove',
        icon: 'lower'
    },
    paint: {
        name: 'Paint',
        icon: 'brush'
    },
    settings: {
        name: 'Settings',
        icon: 'gear'
    }
}

class VoxelEditor extends GameObject {
    isDrawing: boolean;
    grid: Grid;
    planet: Planet;
    tool: EditorTool | undefined;
    background: Background;
    color: number;
    cameraController: TargetCamera;

    constructor() {
        super();
        this.grid = new Grid(Terrain.GRID_SIZE, Terrain.WIDTH);
        this.grid.visible = true;
        this.color = 0;
        this.isDrawing = false;
        this.scene.add(this.grid.scene);
        this.cameraController = new TargetCamera();
        this.engine.camera.position.set(10, 5, 10);
        this.engine.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.cameraController.transitionToTarget(new THREE.Vector3(), 1.0, 5.0);
        this.planet = new Planet();
        this.background = new Background(500, 20, 100);
        this.scene.add(this.background.mesh);
    }

    update(state: UpdateState) {
        // if(state.keyboardMouse.inputStates.has('Control') && state.keyboardMouse.inputEvents.includes('z-down')) {
        //     this.undo();
        // } else if(state.keyboardMouse.inputStates.has('Control') && state.keyboardMouse.inputEvents.includes('y-down')) {
        //     this.redo();
        // } else {
        //     this.handleKeyboardMouse(state);
        //     this.handleTouch(state);
        // }

        this.handleKeyboardMouse(state);
        this.handleTouch(state);
        this.cameraController.setCursor(state);
    }

    handleTouch(state: UpdateState) {
        if (state.touch.touchCount === 1 && state.touch.position) {
            const cursorPosition = state.touch.position.screenCoordinates.toArray();
            const intersects = this.engine.raycastObjects(cursorPosition, [this.planet.terrain.mesh, this.grid.mesh]);
            if (state.touch.inputEvents.includes('touch-down') && this.tool && intersects.length > 0) {
                this.cameraController.setEnabled(false);
                this.isDrawing = true;
                this.edit(intersects[0]);
            }
        }

        if (state.touch.inputEvents.includes('touch-up')) {
            this.cameraController.setEnabled(true);
            this.isDrawing = false;
        }
    }

    handleKeyboardMouse(state: UpdateState) {
        const cursorPosition = state.keyboardMouse.position.screenCoordinates.toArray();
        const intersects = this.engine.raycastObjects(cursorPosition, [this.planet.terrain.mesh, this.grid.mesh]);

        if (state.keyboardMouse.inputStates.get('left-click')) {
            if (state.keyboardMouse.inputEvents.includes('left-click-down') && this.tool && intersects.length > 0) {
                this.cameraController.setEnabled(false);
                this.isDrawing = true;
                this.edit(intersects[0]);
            }
        }

        if(state.keyboardMouse.inputEvents.includes('left-click-up')) {
            this.cameraController.setEnabled(true);
            this.isDrawing = false;
        }
    }

    edit(intersect: THREE.Intersection) {
        if (this.tool === EditorTools.add) {
            this.planet.terrain.attachVoxel(intersect.point, intersect.face!.normal, this.color);
        } else if (this.tool === EditorTools.remove) {
            this.planet.terrain.removeVoxel(intersect.point, intersect.face!.normal);
        } else if (this.tool === EditorTools.paint) {
            this.planet.terrain.paintVoxel(intersect.point, intersect.face!.normal, this.color);
        }
    }

    isUnsaved() {
        return false;
    }

    dispose() {
        this.background.dispose();
        this.planet.dispose();
        this.grid.dispose();
        this.cameraController.dispose();
        super.dispose();
    }
}

export default VoxelEditor;
