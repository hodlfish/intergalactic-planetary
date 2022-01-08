import { LayerDefinitions } from 'scripts/engine/engine';
import orbitPathShader from 'scripts/shaders/orbit-path-shader';
import * as THREE from 'three';
import GameObject from 'scripts/engine/game-object';

export class OrbitPath extends GameObject {
    material: THREE.Material;
    mesh: THREE.Mesh;

    constructor(radius: number) {
        super();
        this.material = new THREE.ShaderMaterial({
            vertexShader: orbitPathShader.vertex,
            fragmentShader: orbitPathShader.fragment,
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: false
        });
        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 1, 1),
            this.material
        );
        this.mesh.layers.set(LayerDefinitions.default);
        this.mesh.rotation.set(0.5 * Math.PI, 0, 0);
        const offsetRadius = radius * 1.01;
        this.mesh.scale.set(offsetRadius, offsetRadius, offsetRadius);
        this.scene.add(this.mesh);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
        super.dispose();
    }
}

export default OrbitPath;
