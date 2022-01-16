import { LayerDefinitions } from 'scripts/engine/engine';
import gridShader from 'scripts/shaders/voxel-planet/grid-shader';
import * as THREE from 'three';

class Grid {
    size: number;
    width: number;
    mesh: THREE.Mesh;

    scene: THREE.Scene;
    _visible: boolean;

    constructor(size: number, width: number) {
        this.size = size;
        this.width = width;
        this.scene = new THREE.Scene();
        this._visible = true;
        const geometry = new THREE.BoxGeometry(width, width, width, 1, 1);
        const positions = geometry.getAttribute('position');
        const inversePositions = Array.from(positions.array).map(norm => -norm);
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(inversePositions), 3));
        

        this.mesh = new THREE.Mesh(
            geometry,
            new THREE.ShaderMaterial(
                {
                    uniforms: {
                        gridColor: {value: new THREE.Color(0xAAAAAA)},
                        gridSize: {value: this.size},
                        strokeWidth: {value: 0.02}
                    },
                    vertexShader : gridShader.vertex,
                    fragmentShader : gridShader.fragment,
                    transparent: true
                }
            )
        );
        this.mesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.mesh);
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
    }
}

export default Grid;
