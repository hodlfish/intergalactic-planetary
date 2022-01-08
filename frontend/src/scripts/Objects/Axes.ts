import { LayerDefinitions } from 'scripts/engine/engine';
import GameObject from 'scripts/engine/game-object';
import * as THREE from 'three';

class Axes extends GameObject {
    axes: THREE.Line[];
    _visible: boolean;

    constructor(length: number) {
        super();
        this._visible = true;
        this.axes = [];
        this.axes.push(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(length, 0, 0), 0xF26A66, false));
        this.axes.push(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-length, 0, 0), 0xF26A66, true));
        this.axes.push(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, length, 0), 0x00D346, false));
        this.axes.push(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -length, 0), 0x00D346, true));
        this.axes.push(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, length), 0x3bb0ff, false));
        this.axes.push(this.buildAxis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -length), 0x3bb0ff, true));
        this.axes.forEach(axis => {
            this.scene.add(axis);
            axis.layers.set(LayerDefinitions.default);
        });
    }

    buildAxis(src: any, dst: any, colorHex: any, dashed: any) {
        let material = null;
        if(dashed) {
            material = new THREE.LineDashedMaterial({
                linewidth: 1,
                color: colorHex,
                dashSize: 1,
                gapSize: 1,
            });
        } else {
            material = new THREE.LineBasicMaterial({
                linewidth: 1,
                color: colorHex,
            });
        }
        const points = [src.clone(), dst.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const axis = new THREE.Line(geometry, material);
        axis.computeLineDistances();
        return axis;
    }

    get visible() {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
        this.axes.forEach(axis => axis.visible = this._visible);
    }

    dispose() {
        this.axes.forEach(axis => {
            this.scene.remove(axis);
            axis.geometry.dispose();
            (axis.material as THREE.Material).dispose();
        });
        super.dispose();
    }
}

export default Axes;
