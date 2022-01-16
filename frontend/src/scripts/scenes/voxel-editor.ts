import * as THREE from 'three';
import GameObject from 'scripts/engine/game-object';
import Planet from 'scripts/objects/voxel-planet';
import Background from 'scripts/objects/background';
import { UpdateState } from 'scripts/engine/engine';
import TargetCamera from 'scripts/cameras/target-camera';
import Grid from 'scripts/objects/voxel-planet/grid';
import Terrain from 'scripts/objects/voxel-planet/terrain';
import { Model } from 'scripts/model-loader';
import { Intersection } from 'three';
import SelectionBox from 'scripts/objects/voxel-planet/selection-box';

export interface EditorTool {
    name: string,
    icon: string
}

export const EditorTools = {
    add: {
        name: 'Add',
        icon: 'add-voxel'
    },
    remove: {
        name: 'Remove',
        icon: 'remove-voxel'
    },
    paint: {
        name: 'Paint',
        icon: 'brush'
    },
    items: {
        name: 'Items',
        icon: 'tree',
        description: 'Add scenery'
    },
    settings: {
        name: 'Settings',
        icon: 'gear'
    }
}

class VoxelEditor extends GameObject {
    isDrawing: boolean;
    grid: Grid;
    selectionBox: SelectionBox;
    planet: Planet;
    tool: EditorTool | undefined;
    background: Background;
    color: number;
    cameraController: TargetCamera;
    model: Model | undefined;
    pressDownIntersect: Intersection | undefined;

    constructor() {
        super();
        this.grid = new Grid(Terrain.GRID_SIZE, Terrain.WIDTH);
        this.selectionBox = new SelectionBox(1, Terrain.WIDTH);
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
        this.model = undefined;
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

        if (intersects.length > 0) {
            this.selectionBox.visible = true;
            this.select(intersects[0]);
        } else {
            this.selectionBox.visible = false;
        }

        if (state.keyboardMouse.inputEvents.includes('left-click-down')) {
            if (intersects.length > 0) {
                this.pressDownIntersect = intersects[0];
                this.isDrawing = true;
                this.cameraController.setEnabled(false);
            } else {
                this.pressDownIntersect = undefined;
            }
        }

        if(state.keyboardMouse.inputEvents.includes('left-click-up')) {
            if (intersects.length > 0 && this.pressDownIntersect) {
                this.edit(intersects[0]);
            }
            this.cameraController.setEnabled(true);
            this.isDrawing = false;
            this.pressDownIntersect = undefined;
        }
    }

    select(intersect: THREE.Intersection) {
        let startPosition = undefined;
        let curPosition = undefined;
        if (this.tool === EditorTools.add) {
            const curCoord = this.planet.terrain.pointToCoord(intersect.point, intersect.face!.normal);
            curPosition = this.planet.terrain.coordinateToPosition(...curCoord.toArray());
            this.selectionBox.setColor(new THREE.Color(0, 1, 0));
            if (this.pressDownIntersect) {
                const startCoord = this.planet.terrain.pointToCoord(this.pressDownIntersect.point, this.pressDownIntersect.face!.normal);
                startPosition = this.planet.terrain.coordinateToPosition(...startCoord.toArray());
            }
        } else {
            const end = this.planet.terrain.pointToCoord(intersect.point, intersect.face!.normal, true);
            curPosition = this.planet.terrain.coordinateToPosition(end.x, end.y, end.z);
            this.selectionBox.setColor(new THREE.Color(1, 0, 0));
            if (this.pressDownIntersect) {
                const startCoord = this.planet.terrain.pointToCoord(this.pressDownIntersect.point, this.pressDownIntersect.face!.normal, true);
                startPosition = this.planet.terrain.coordinateToPosition(...startCoord.toArray());
            }
        }
        if (startPosition) {
            const midPoint = startPosition.clone().add(curPosition).multiplyScalar(0.5);
            const scale = startPosition.clone().sub(curPosition);
            scale.x = Math.abs(scale.x) + Terrain.BLOCK_SIZE;
            scale.y = Math.abs(scale.y) + Terrain.BLOCK_SIZE;
            scale.z = Math.abs(scale.z) + Terrain.BLOCK_SIZE;
            this.selectionBox.setSelection(midPoint, scale);
        } else {
            this.selectionBox.setSelection(curPosition, new THREE.Vector3(Terrain.BLOCK_SIZE, Terrain.BLOCK_SIZE, Terrain.BLOCK_SIZE));
        }
    }

    edit(intersect: THREE.Intersection) {
        if (this.tool === EditorTools.add) {
            const start = this.planet.terrain.pointToCoord(this.pressDownIntersect!.point, this.pressDownIntersect!.face!.normal);
            const end = this.planet.terrain.pointToCoord(intersect.point, intersect.face!.normal);
            if (start && end) {
                this.planet.terrain.attachVoxel(start, end, this.color);
            }
        } else if (this.tool === EditorTools.remove) {
            const start = this.planet.terrain.pointToCoord(this.pressDownIntersect!.point, this.pressDownIntersect!.face!.normal, true);
            const end = this.planet.terrain.pointToCoord(intersect.point, intersect.face!.normal, true);
            if (start && end) {
                this.planet.terrain.removeVoxel(start, end);
            }
        } else if (this.tool === EditorTools.paint) {
            const start = this.planet.terrain.pointToCoord(this.pressDownIntersect!.point, this.pressDownIntersect!.face!.normal, true);
            const end = this.planet.terrain.pointToCoord(intersect.point, intersect.face!.normal, true);
            this.planet.terrain.paintVoxel(start, end, this.color);
        } else if (this.tool === EditorTools.items && this.model) {
            const locationId = this.planet.terrain.pointToLocationId(intersect.point, intersect.face!.normal);
            if (locationId > -1) {
                this.planet.scenery.addScenery(this.model.id, this.color, locationId);
            }
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
