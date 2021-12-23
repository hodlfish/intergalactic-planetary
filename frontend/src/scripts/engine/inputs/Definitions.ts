import { lerp } from "three/src/math/MathUtils";
import * as THREE from 'three';

export class Coordinate {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    get screenCoordinates (): Coordinate {
        return new Coordinate(
            ( this.x / window.innerWidth ) * 2 - 1,
            -( this.y / window.innerHeight ) * 2 + 1
        );
    }

    delta(other: Coordinate) {
        return new Coordinate(this.x - other.x, this.y - other.y);
    }

    deltaScreen(other: Coordinate) {
        return this.screenCoordinates.delta(other.screenCoordinates);
    }

    toArray(): number[] {
        return [this.x, this.y];
    }

    toString(): string {
        return `${this.x}:${this.y}`;
    }

    lerp(other: Coordinate, t: number) {
        return new Coordinate(
            lerp(this.x, other.x, t),
            lerp(this.y, other.y, t),
        )
    }

    distance(other: Coordinate): number {
        return new THREE.Vector2(this.x, this.y).distanceTo(new THREE.Vector2(other.x, other.y));
    }
}
