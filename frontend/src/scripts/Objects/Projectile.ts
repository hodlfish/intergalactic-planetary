import { UpdateState } from 'scripts/engine/Engine';
import GameObject from 'scripts/engine/GameObject';
import * as THREE from 'three';

class Projectile extends GameObject {
    static PROJECTILE_MESH = {
        beam: new THREE.BoxGeometry(0.01, 0.01, 0.05)
    }

    material: THREE.MeshBasicMaterial;
    mesh: THREE.Mesh;
    direction: THREE.Vector3;
    velocity: number;
    lifeSpan: number;
    _timeAlive: number;
    callback?: (object: any, intersection: THREE.Intersection) => void;
    raycaster: THREE.Raycaster;

    constructor(startPosition: THREE.Vector3, direction: THREE.Vector3, velocity: number, lifeSpan = 5.0, callback?: (object: any, intersection: THREE.Intersection) => void) {
        super();
        this.direction = direction;
        this.velocity = velocity;
        this.lifeSpan = lifeSpan;
        this._timeAlive = 0.0;
        this.callback = callback;
        this.raycaster = new THREE.Raycaster();
        this.material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(1.0, 0.0, 0.0),
            vertexColors: true
        })
        this.mesh = new THREE.Mesh(Projectile.PROJECTILE_MESH.beam, this.material);
        this.scene.add(this.mesh);
        this.scene.position.set(...startPosition.toArray());
        this.scene.lookAt(this.scene.position.clone().add(direction));
    }

    update(state: UpdateState) {
        const dPos = this.direction.clone().setLength(state.deltaTime * this.velocity);
        this.raycaster.set(this.scene.position, dPos);
        this.raycaster.far = state.deltaTime * this.velocity;
        const collisions = this.raycaster.intersectObjects(this.engine.getCollisionMeshes());
        if (collisions.length > 0) {
            if (this.callback) {
                const collision = collisions[0];
                const object = this.engine.getCollisionObject(collision.object as THREE.Mesh);
                this.callback(object, collision);
            }
            this.dispose();
        } else {
            this.scene.position.add(dPos);
            this._timeAlive += state.deltaTime;
            if (this._timeAlive >= this.lifeSpan) {
                this.dispose();
            }
        }
    }

    dispose() {
        this.material.dispose();
        this.scene.remove(this.mesh);
        super.dispose();
    }
}

export default Projectile;
