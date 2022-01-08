import * as THREE from 'three';
import waterShader from 'scripts/shaders/geoPlanet/water-shader';
import { base64ToBinary, binaryToBase64 } from 'scripts/base-64';
import {
    MIN_HEIGHT, HEIGHT_RANGE, deserializeColor, serializeColor
} from './settings';
import Engine, { LayerDefinitions } from 'scripts/engine/engine';
import { CallbackSet } from 'scripts/engine/helpers';


class Water {
    static SERIALIZED_SIZE = 7;
    static waterGeometry = new THREE.IcosahedronGeometry(1, 15);

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
                waterColor: {value: this._color},
                time: {value: 0.0},
                speed: {value: 0.5},
                waveDensity: {value: 50.0},
                tDepth: {value: null},
                density: {value: this.normalizedDensity},
                cameraNear: {value: Engine.instance.camera.near},
                cameraFar: {value: Engine.instance.camera.far},
                foamDepth: {value: 0.02},
                cameraDirection: {value: new THREE.Vector3()},
                ambientLight: {value: 0.33}
            },
            vertexShader: waterShader.vertex,
            fragmentShader: waterShader.fragment,
            transparent: true,
            depthWrite: false
        });
        this.mesh = new THREE.Mesh(
            Water.waterGeometry,
            this.material
        );
        this.mesh.layers.set(LayerDefinitions.transparent);
        this.onBeforeChange = new CallbackSet();
        this.onAfterChange = new CallbackSet();
    }

    emitBeforeUpdate() {
        this.onBeforeChange.call(this._height, this._density, this._color);
    }

    emitAfterUpdate() {
        this.onAfterChange.call(this._height, this._density, this._color);
    }

    get height(): number {
        return this._height;
    }

    set height(value: number) {
        this.emitBeforeUpdate();
        this._height = value;
        if (this._height === 0) {
            this.mesh.visible = false;
        } else {
            this.mesh.visible = true;
            const scale = this.displayHeight;
            this.mesh.scale.set(scale, scale, scale);
        }
        this.emitAfterUpdate();
    }

    get displayHeight(): number {
        return MIN_HEIGHT + (this._height / 255 * HEIGHT_RANGE) - (HEIGHT_RANGE / 510);
    }

    get density(): number {
        return this._density;
    }

    set density(value: number) {
        this.emitBeforeUpdate();
        this._density = value;
        (this.mesh.material as any).uniforms.density.value = this.normalizedDensity;
        this.emitAfterUpdate();
    }

    get normalizedDensity(): number {
        return (1.0 - (this.density / 255));
    }

    get color(): THREE.Color {
        return this._color;
    }

    // Works with hex string or THREE color.
    set color(value: string | THREE.Color) {
        this.emitBeforeUpdate();
        this._color = new THREE.Color(value);
        (this.mesh.material as any).uniforms.waterColor.value = this._color;
        this.emitAfterUpdate();
    }

    setDepthTexture(texture: THREE.DepthTexture) {
        (this.mesh.material as any).uniforms.tDepth.value = texture;
    }

    animate() {
        (this.mesh.material as any).uniforms.time.value = Date.now() / 1000 % 1000;
        (this.material as any).uniforms.cameraDirection.value = Engine.instance.cameraDirection;
    }

    serialize(): string {
        let base64 = serializeColor(this.color);
        base64 += binaryToBase64(
            this.height.toString(2).padStart(8, '0') +
            this.density.toString(2).padStart(8, '0') + '00'
        )
        return base64;
    }

    deserialize(base64: string) {
        if (base64.length !== Water.SERIALIZED_SIZE) {
            return false;
        }
        const binary = base64ToBinary(base64);
        this.color = deserializeColor(base64.substring(0,4))[0];
        this.height = parseInt(binary.substring(24, 32), 2);
        this.density = parseInt(binary.substring(32, 40), 2);
        return true;
    }

    dispose() {
        this.material.dispose();
    }
}

export default Water;
