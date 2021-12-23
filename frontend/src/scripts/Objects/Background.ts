import { LayerDefinitions } from 'scripts/engine/Engine';
import backgroundShader from 'scripts/Shaders/backgroundShader';
import * as THREE from 'three';
import GameObject from 'scripts/engine/GameObject';

export class Background extends GameObject {
    material: THREE.Material;
    mesh: THREE.InstancedMesh;

    constructor(count: number, minDistance: number, maxDistance: number) {
        super();
        this.material = new THREE.ShaderMaterial({
            vertexColors: true,
            vertexShader : backgroundShader.vertex,
            fragmentShader : backgroundShader.fragment,
            transparent: false
        });
        const geometry = new THREE.PlaneGeometry(0.1, 0.1, 1, 1);
        this.mesh = new THREE.InstancedMesh(
            geometry,
            this.material,
            count
        );
        const transform = new THREE.Object3D();
        for(let i = 0; i < count; i++) {
            const pos = new THREE.Vector3().random().sub(new THREE.Vector3(0.5, 0.5, 0.5)).normalize().multiplyScalar(
                Math.random() * (maxDistance - minDistance) + minDistance
            )
            transform.position.set(...pos.toArray());
            transform.updateMatrix();
            this.mesh.setMatrixAt(i, transform.matrix );
            this.mesh.setColorAt(i, new THREE.Color(1.0, 1.0, 1.0));
        }
        this.mesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.mesh);
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
        super.dispose();
    }
}

export default Background;
