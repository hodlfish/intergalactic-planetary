import { UpdateState } from 'scripts/engine/Engine';
import GameObject from 'scripts/engine/GameObject';
import * as THREE from 'three';

const EXPLOSION_COLORS = [
    new THREE.Color('#d84a16'),
    new THREE.Color('#fefd8b'),
    new THREE.Color('#580f0a'),
    new THREE.Color('#f55813')
]

class ExplosionEffect extends GameObject {
    material: THREE.PointsMaterial;
    geometry: THREE.BufferGeometry;
    points: THREE.Points;
    size: number;
    lifeSpan: number;
    _timeAlive: number;

    constructor(startPosition: THREE.Vector3, lifeSpan = 5.0, count = 10, size = 1.0) {
        super();
        this.size = size;
        this.lifeSpan = lifeSpan;
        this._timeAlive = 0.0;
        this.scene.position.set(...startPosition.toArray());

        // Spawn particles
        const positionArr = [];
        const colorArr = [] as number[];
        for ( let i = 0; i < count; i ++ ) {
            positionArr.push(
                THREE.MathUtils.randFloatSpread( 0.5 ),
                THREE.MathUtils.randFloatSpread( 0.5 ),
                THREE.MathUtils.randFloatSpread( 0.5 )
            );
            const col = THREE.MathUtils.randInt(0, EXPLOSION_COLORS.length - 1);
            colorArr.push(...EXPLOSION_COLORS[col].toArray());
        }
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positionArr, 3 ) );
        this.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colorArr), 3));
        this.material = new THREE.PointsMaterial({
            vertexColors: true,
            size: 0.0
        });
        this.points = new THREE.Points( this.geometry, this.material );
        this.scene.add( this.points );
    }

    update(state: UpdateState) {
        this._timeAlive += state.deltaTime;
        this.material.size = Math.sin(this._timeAlive / this.lifeSpan * Math.PI) * this.size;
        if (this._timeAlive >= this.lifeSpan) {
            this.dispose();
        }
    }

    dispose() {
        this.material.dispose();
        this.geometry.dispose();
        this.scene.remove( this.points );
        super.dispose();
    }
}

export default ExplosionEffect;
