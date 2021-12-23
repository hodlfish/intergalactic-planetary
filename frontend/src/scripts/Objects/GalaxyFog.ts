import { LayerDefinitions } from 'scripts/engine/Engine';
import galaxyFogShader from 'scripts/shaders/GalaxyFogShader';
import * as THREE from 'three';
import GameObject from 'scripts/engine/GameObject';

export class GalaxyFog extends GameObject {
    material: THREE.Material;
    mesh: THREE.Mesh;

    constructor(size: number) {
        super();
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                time: {value: 1.0}
            },
            vertexShader: galaxyFogShader.vertex,
            fragmentShader: galaxyFogShader.fragment,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false
        })
        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size, 1, 1),
            this.material
        );
        this.mesh.layers.set(LayerDefinitions.background);
        this.mesh.rotation.set(0.5 * Math.PI, 0, 0.4);
        this.scene.add(this.mesh);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
        super.dispose();
    }
}

export default GalaxyFog;
