import { LayerDefinitions } from 'scripts/engine/engine';
import GameObject from 'scripts/engine/game-object';
import gridShader from 'scripts/shaders/voxel-planet/grid-shader';
import * as THREE from 'three';

class SelectionBox extends GameObject {
    size: number;
    width: number;
    mesh: THREE.Mesh;
    _visible: boolean;

    constructor(size: number, width: number) {
        super();
        this.size = size;
        this.width = width;
        this._visible = false;
        
        this.mesh = new THREE.Mesh(
            new THREE.BoxGeometry(),
            new THREE.ShaderMaterial(
                {
                    uniforms: {
                        gridColor: {value: new THREE.Color(0xAAAAAA)},
                        gridSize: {value: this.size},
                        strokeWidth: {value: 0.02}
                    },
                    vertexShader : gridShader.vertex,
                    fragmentShader : gridShader.fragment,
                    transparent: true,
                    polygonOffset: true,
                    polygonOffsetUnits: -1,
                    polygonOffsetFactor: -1
                }
            )
        );
        this.mesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.mesh);
    }

    setSelection(position: THREE.Vector3, scale: THREE.Vector3) {
        this.mesh.position.set(...position.toArray());
        this.mesh.scale.set(...scale.toArray());
    }

    get visible() {
        return this._visible;
    }

    set visible(value: boolean) {
        this.mesh.visible = value;
        this._visible = value;
    }

    dispose() {
        (this.mesh.material as THREE.ShaderMaterial).dispose();
        this.mesh.geometry.dispose();
        this.scene.remove(this.mesh);
    }
}

export default SelectionBox;
