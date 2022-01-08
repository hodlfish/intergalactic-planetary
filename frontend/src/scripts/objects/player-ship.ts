import Engine, { LayerDefinitions, UpdateState } from 'scripts/engine/engine';
import * as THREE from 'three';
import spaceAssetShader from 'scripts/shaders/space-asset-shader';
import GameObject from 'scripts/engine/game-object';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader';
import IcoPlanet from './geo-planet';
import Projectile from './projectile';
import ExplosionEffect from './explosion-effect';
import Crosshair from './crosshair';
import ShipMap from './ship-map';

export class PlayerShip extends GameObject {
    static MOVEMENT_SPEED = 0.5;
    static ROTATE_SPEED = 0.1;
    static ROLL_SPEED = 5.0;
    static DRAG = 3.0;
    static COLLISION_MIN = new THREE.Vector3(-0.1, -0.025, -0.075);
    static COLLISION_MAX = new THREE.Vector3(0.1, 0.025, 0.075);
    static COLLISION_VERTS = [
        PlayerShip.COLLISION_MAX.clone(),
        new THREE.Vector3(PlayerShip.COLLISION_MIN.x, PlayerShip.COLLISION_MAX.y, PlayerShip.COLLISION_MAX.z),
        new THREE.Vector3(PlayerShip.COLLISION_MAX.x, PlayerShip.COLLISION_MIN.y, PlayerShip.COLLISION_MAX.z),
        new THREE.Vector3(PlayerShip.COLLISION_MAX.x, PlayerShip.COLLISION_MAX.y, PlayerShip.COLLISION_MIN.z),
        new THREE.Vector3(PlayerShip.COLLISION_MIN.x, PlayerShip.COLLISION_MIN.y, PlayerShip.COLLISION_MAX.z),
        new THREE.Vector3(PlayerShip.COLLISION_MAX.x, PlayerShip.COLLISION_MIN.y, PlayerShip.COLLISION_MIN.z),
        new THREE.Vector3(PlayerShip.COLLISION_MIN.x, PlayerShip.COLLISION_MAX.y, PlayerShip.COLLISION_MIN.z),
        PlayerShip.COLLISION_MIN.clone()
    ]

    shipMaterial: THREE.Material;
    shipMesh: THREE.Mesh;
    velocity: number;
    pitch: number;
    yaw: number;
    roll: number;
    crosshair: Crosshair;
    isAlive: boolean;
    map: ShipMap;
    raycaster: THREE.Raycaster;

    constructor() {
        super();
        this.isAlive = true;
        this.velocity = 0.0;
        this.pitch = 0.0;
        this.yaw = 0.0;
        this.roll = 0.0;
        this.crosshair = new Crosshair(32);
        this.map = new ShipMap();
        this.raycaster = new THREE.Raycaster();

        // Ship
        this.shipMaterial = new THREE.ShaderMaterial({
            uniforms: {
                cameraDirection: {value: new THREE.Vector3()},
                ambientLight: {value: 0.5}
            },
            vertexColors: true,
            vertexShader : spaceAssetShader.vertex,
            fragmentShader : spaceAssetShader.fragment,
        });
        this.shipMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            this.shipMaterial
        );
        this.shipMesh.layers.set(LayerDefinitions.default);
        this.scene.add(this.shipMesh);

        // load ship model
        const loader = new PLYLoader();
        const shipScale = 0.05;
        loader.load(
            '/assets/Ship.ply',
            (geometry) => {
                geometry.scale(shipScale, shipScale, shipScale);
                geometry.computeVertexNormals();
                this.shipMesh.geometry = geometry;
            }
        )

        // Configure camera
        const forward = this.scene.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.4);
        const localUp = new THREE.Vector3(0, 0.25, 0);
        this.engine.camera.position.set(...this.scene.position.clone().sub(forward).add(localUp).toArray());
        this.engine.camera.lookAt(this.scene.position.clone().add(localUp))
        this.scene.add(this.engine.camera);
    }

    update(state: UpdateState) {
        if (this.isAlive) {
            this.move(state);
        }
    }

    move(state: UpdateState) {
        (this.shipMaterial as any).uniforms.cameraDirection.value = Engine.instance.cameraDirection;
        const forward = this.scene.getWorldDirection(new THREE.Vector3());
        const shipForward = this.shipMesh.getWorldDirection(new THREE.Vector3());

        // Handle input
        if(state.keyboardMouse.inputStates.get(' ')) {
            this.velocity += PlayerShip.MOVEMENT_SPEED * state.deltaTime;
        }
        if (state.keyboardMouse.inputStates.get('z')) {
            this.velocity -= PlayerShip.MOVEMENT_SPEED * state.deltaTime;
        }
        if(state.keyboardMouse.inputStates.get('w')) {
            this.pitch -= PlayerShip.ROTATE_SPEED * state.deltaTime;
        }
        if(state.keyboardMouse.inputStates.get('s')) {
            this.pitch += PlayerShip.ROTATE_SPEED * state.deltaTime;
        }
        if(state.keyboardMouse.inputStates.get('a')) {
            this.yaw += PlayerShip.ROTATE_SPEED * state.deltaTime;
        }
        if(state.keyboardMouse.inputStates.get('d')) {
            this.yaw -= PlayerShip.ROTATE_SPEED * state.deltaTime;
        }
        if(state.keyboardMouse.inputStates.get('q')) {
            this.roll += PlayerShip.ROTATE_SPEED * state.deltaTime;
        }
        if(state.keyboardMouse.inputStates.get('e')) {
            this.roll -= PlayerShip.ROTATE_SPEED * state.deltaTime;
        }

        if(state.keyboardMouse.inputEvents.includes('m-down')) {
            this.map.visible = !this.map.visible;
            this.crosshair.visible = !this.map.visible;
        }

        // Apply drag
        const dragMultiplier = 1.0 - PlayerShip.DRAG * state.deltaTime;
        this.velocity *= dragMultiplier;
        this.pitch *= dragMultiplier;
        this.yaw *= dragMultiplier;
        this.roll *= dragMultiplier;

        // Rotate ship
        this.scene.rotateOnAxis(new THREE.Vector3(1, 0, 0), this.pitch);
        this.scene.rotateOnAxis(new THREE.Vector3(0, 1, 0), this.yaw);
        this.scene.rotateOnAxis(new THREE.Vector3(0, 0, -1), this.roll);
        this.shipMesh.rotation.set(this.pitch * 10.0, this.yaw * 10.0, this.roll * -10.0);

        // Detect ship collisions
        const dPos = forward.clone().multiplyScalar(this.velocity);
        const shipCollision = this._checkShipCollision(dPos);
        if (shipCollision) {
            const collisionObject = this.engine.getCollisionObject(shipCollision.object as THREE.Mesh);
            if (collisionObject instanceof IcoPlanet) {
                this.onHitPlanet(collisionObject as IcoPlanet, shipCollision);
            }
            this.death();
            this.engine.curtain.fadeOut(1.0, () => {
                this.respawn();
                this.engine.curtain.fadeIn(1.0);
            })
            return;
        }

        // Position ship
        this.scene.position.set(...this.scene.position.clone().add(dPos).toArray());

        //Position crosshair
        this.raycaster.set(this.scene.position, shipForward);
        const intersections = this.raycaster.intersectObjects(this.engine.getCollisionMeshes());
        const point = (intersections.length > 0) ? intersections[0].point : this.scene.position.clone().add(shipForward.clone().normalize().setLength(40));
        const result = point.clone().project(this.engine.camera).multiplyScalar(0.5);
        this.crosshair.setPosition(0.5 + result.x, 0.5 - result.y);

        // Shoot!
        if(state.keyboardMouse.inputEvents.includes('Enter-down') && this.crosshair.visible) {
            new Projectile(
                this.shipMesh.getWorldPosition(new THREE.Vector3()).add(shipForward.clone().multiplyScalar(0.15)),
                shipForward.clone(),
                50.0 + this.velocity,
                5.0,
                (object: any, intersection: THREE.Intersection) => this.onProjectileHit(object, intersection)
            );
        }
    }

    onProjectileHit(object: any, intersection: THREE.Intersection) {
        if (object instanceof IcoPlanet) {
            this.onHitPlanet(object as IcoPlanet, intersection)
        }
        new ExplosionEffect(intersection.point, 0.33, 10, 0.25);
    }

    onHitPlanet(planet: IcoPlanet, intersection: THREE.Intersection) {
        const localPosition = planet.scene.worldToLocal(intersection.point.clone());
        planet.terrain.raiseTerrain(localPosition, intersection.faceIndex!, false, .97, 1.0);
        const locationIds = planet.terrain.getLocationsInNormalizedRadius(localPosition, intersection.faceIndex!, .90);
        planet.scenery.removeScenery(locationIds);
    }

    _checkShipCollision(dPosition: THREE.Vector3): THREE.Intersection | undefined {
        const collisionMesh = this.engine.getCollisionMeshes();
        for(let i = 0; i < PlayerShip.COLLISION_VERTS.length; i++) {
            const direction = PlayerShip.COLLISION_VERTS[i].clone().applyQuaternion(this.scene.quaternion);
            this.raycaster.set(this.scene.position, direction.add(dPosition));
            const intersections = this.raycaster.intersectObjects(collisionMesh);
            if (intersections.length > 0) {
                return intersections[0];
            }
        }
        return undefined;
    }

    death() {
        this.isAlive = false;
        this.shipMesh.visible = false;
        new ExplosionEffect(this.scene.position, 0.33, 10, 0.25);
    }

    respawn(location?: THREE.Vector3) {
        this.map.visible = false;
        this.crosshair.visible = true;
        this.pitch = 0.0;
        this.yaw = 0.0;
        this.roll = 0.0;
        this.isAlive = true;
        this.shipMesh.visible = true;
        if (location) {
            this.scene.position.set(...location.toArray());
        } else {
            this.scene.position.set(50, 10, 0);
        }
        
        this.scene.lookAt(new THREE.Vector3());
    }

    dispose() {
        this.scene.remove(this.shipMesh);
        this.crosshair.dispose();
        this.map.dispose();
        this.engine.scene.add(this.engine.camera);
        this.shipMaterial.dispose();
        this.shipMesh.geometry.dispose();
        super.dispose();
    }
}

export default PlayerShip;
