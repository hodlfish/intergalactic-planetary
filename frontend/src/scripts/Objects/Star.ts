import { LayerDefinitions } from 'scripts/engine/Engine';
import starShader from 'scripts/shaders/StarShader';
import atmosphereShader from 'scripts/shaders/geoPlanet/AtmosphereShader';
import * as THREE from 'three';
import GameObject from 'scripts/engine/GameObject';

export class Star extends GameObject {
    starMaterial: THREE.Material;
    starMesh: THREE.Mesh;
    atmosphereMaterial: THREE.Material;
    atmosphereMesh: THREE.Mesh;

    constructor(radius: number, color: THREE.Color) {
        super();

        // Star
        this.starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                starColor: {value: color},
                time: {value: 1.0}
            },
            vertexShader: starShader.vertex,
            fragmentShader: starShader.fragment
        });
        this.starMesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius, 40, 20),
            this.starMaterial
        );
        this.starMesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.starMesh);

        // Atmosphere
        this.atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                atmosphereColor: {value: color},
                density: {value: 0.5},
                size: {value: radius * 3.0}
            },
            vertexShader: atmosphereShader.vertex,
            fragmentShader: atmosphereShader.fragment,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        })
        this.atmosphereMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 1.0, 1, 1),
            this.atmosphereMaterial
        );
        this.atmosphereMesh.layers.set(LayerDefinitions.background);
        this.scene.add(this.atmosphereMesh);
        this.engine.registerCollisionMesh(this.starMesh, this);
    }

    update() {
        (this.starMaterial as any).uniforms.time.value = Date.now() / 750 % 1000;
    }

    dispose() {
        this.scene.remove(this.starMesh);
        this.scene.remove(this.atmosphereMesh);
        this.starMesh.geometry.dispose();
        this.starMaterial.dispose();
        this.atmosphereMesh.geometry.dispose();
        this.atmosphereMaterial.dispose();
        this.engine.unregisterCollisionMesh(this.starMesh);
        super.dispose();
    }
}

export default Star;
