import GameObject from 'scripts/engine/GameObject';
import sphereBoundsShader from 'scripts/shaders/SphereBoundsShader';
import * as THREE from 'three';

class SphereBounds extends GameObject {
    radius: number;
    boundsRadius: number;
    geometry: THREE.IcosahedronGeometry;
    edges: THREE.EdgesGeometry;
    material: THREE.ShaderMaterial;
    mesh: THREE.LineSegments;

    constructor(radius: number, renderDistance: number, boundBuffer = 2.0) {
        super();
        this.radius = radius;
        this.boundsRadius = radius - boundBuffer;
        this.geometry = new THREE.IcosahedronGeometry(this.radius, 20);
        this.edges = new THREE.EdgesGeometry(this.geometry);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                renderDistance: {value: renderDistance}
            },
            vertexShader: sphereBoundsShader.vertex,
            fragmentShader: sphereBoundsShader.fragment,
            transparent: true,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.LineSegments(
            this.edges,
            this.material
        );
        this.scene.add(this.mesh);
    }

    bound(position: THREE.Vector3): THREE.Vector3 {
        if (position.length() > this.boundsRadius) {
            return position.clone().setLength(this.boundsRadius);
        }
        return position;
    }

    dispose() {
        this.geometry.dispose();
        this.edges.dispose();
        this.material.dispose();
        this.scene.remove(this.mesh);
        super.dispose();
    }
}

export default SphereBounds;
