import * as THREE from 'three';
import atmosphereShader from 'scripts/shaders/geoPlanet/AtmosphereShader';
import { base64ToBinary, binaryToBase64 } from 'scripts/Base64';
import {
    deserializeColor, serializeColor,
    ATMOSPHERE_MIN_HEIGHT, ATMOSPHERE_HEIGHT_RANGE
} from './Settings';
import { LayerDefinitions } from 'scripts/engine/Engine';
import { CallbackSet } from 'scripts/engine/Helpers';

export class Atmosphere {
    static SERIALIZED_SIZE = 7;

    _color: THREE.Color;
    _height: number;
    _density: number;
    material: THREE.Material;
    mesh: THREE.Mesh;
    onBeforeChange: CallbackSet;
    onAfterChange: CallbackSet;

    constructor(color: THREE.Color, height: number, density: number) {
        this._color = color;
        this._height = height;
        this._density = density;
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                atmosphereColor: {value: this._color},
                density: {value: this.displayDensity},
                size: {value: this.displayHeight}
            },
            vertexShader: atmosphereShader.vertex,
            fragmentShader: atmosphereShader.fragment,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.0, 1.0, 1, 1),
            this.material
        );
        this.mesh.layers.set(LayerDefinitions.background);
        this.onBeforeChange = new CallbackSet();
        this.onAfterChange = new CallbackSet();
    }

    emitBeforeUpdate() {
        this.onBeforeChange.call(this._height, this._density, this._color);
    }

    emitAfterUpdate() {
        this.onAfterChange.call(this._height, this._density, this._color);
    }

    get density(): number {
        return this._density;
    }

    set density(value: number) {
        this.emitBeforeUpdate();
        this._density = value;
        (this.mesh.material as any).uniforms.density.value = this.displayDensity;
        this.emitAfterUpdate();
    }

    get displayDensity(): number {
        return this._density / 255;
    }

    get height() {
        return this._height;
    }

    set height(value: number) {
        this.emitBeforeUpdate();
        this._height = value;
        if (this._height === 0) {
            this.mesh.visible = false;
        } else {
            this.mesh.visible = true;
            (this.mesh.material as any).uniforms.size.value = this.displayHeight;
        }
        this.emitAfterUpdate();
    }

    get displayHeight(): number {
        return ATMOSPHERE_MIN_HEIGHT * 2 + (this._height / 255) * ATMOSPHERE_HEIGHT_RANGE * 2;
    }

    get color(): THREE.Color {
        return this._color;
    }

    set color(value: string | THREE.Color) {
        this.emitBeforeUpdate();
        this._color = new THREE.Color(value);
        (this.mesh.material as any).uniforms.atmosphereColor.value = this._color;
        this.emitAfterUpdate();
    }

    serialize(): string {
        let base64 = serializeColor(this._color);
        base64 += binaryToBase64(
            this.height.toString(2).padStart(8, '0') +
            this.density.toString(2).padStart(8, '0') + '00'
        )
        return base64;
    }

    deserialize(base64: string) {
        if (base64.length !== Atmosphere.SERIALIZED_SIZE) {
            return false;
        }
        const binary = base64ToBinary(base64);
        this.color = deserializeColor(base64.substring(0,4))[0];
        this.height = parseInt(binary.substring(24, 32), 2);
        this.density = parseInt(binary.substring(32, 40), 2);
        return true;
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}

export default Atmosphere;
