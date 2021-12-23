import { LayerDefinitions } from 'scripts/engine/Engine';
import blackHoleShader from 'scripts/shaders/BlackHoleShader';
import atmosphereShader from 'scripts/shaders/geoPlanet/AtmosphereShader';
import * as THREE from 'three';
import GameObject from 'scripts/engine/GameObject';

export class BlackHole extends GameObject {
    blackHoleMaterial: THREE.Material;
    blackHoleMesh: THREE.Mesh;
    atmosphereMaterial: THREE.Material;
    atmosphereMesh: THREE.Mesh;

    constructor() {
        super();

        // Black Hole
        this.blackHoleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                rimColor: {value: new THREE.Color(0.8, 0.8, 1.0)},
                mainColor: {value: new THREE.Color(0.0, 0.0, 0.0)}
            },
            vertexShader: blackHoleShader.vertex,
            fragmentShader: blackHoleShader.fragment
        });
        this.blackHoleMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 40, 40),
            this.blackHoleMaterial
        );
        this.blackHoleMesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.blackHoleMesh)

        // Atmosphere
        this.atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: {
                atmosphereColor: {value: new THREE.Color(0.8, 0.8, 1.0)},
                density: {value: 1.0},
                size: {value: 0.35}
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
        this.scene.add(this.atmosphereMesh)
    }

    dispose() {
        this.scene.remove(this.blackHoleMesh);
        this.scene.remove(this.atmosphereMesh);
        this.blackHoleMesh.geometry.dispose();
        this.blackHoleMaterial.dispose();
        this.atmosphereMaterial.dispose();
        this.atmosphereMesh.geometry.dispose();
        super.dispose();
    }
}

export default BlackHole;
