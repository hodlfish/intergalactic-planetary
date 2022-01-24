import { base64ToBinary, binaryToBase64 } from 'scripts/base-64';
import { CallbackSet } from 'scripts/engine/helpers';
import * as THREE from 'three';

export const SERIALIZED_COLOR_SIZE = 4;

class ColorPalette {
    _colors: THREE.Color[];
    onBeforeChange: CallbackSet;
    onAfterChange: CallbackSet;

    constructor(length: number) {
        this._colors = [];
        for(let i = 0; i < length; i++) {
            this._colors.push(new THREE.Color());
        }
        this.onBeforeChange = new CallbackSet();
        this.onAfterChange = new CallbackSet();
    }

    get colors(): THREE.Color[] {
        return this._colors;
    }

    set colors(value: THREE.Color[] | string[]) {
        this.onBeforeChange.call(this._colors);
        this._colors = value.map(c => new THREE.Color(c));
        this.onAfterChange.call(this._colors);
    }

    serialize(): string {
        return serializeColor(this.colors);
    }

    deserialize(base64: string) {
        if (base64.length % SERIALIZED_COLOR_SIZE !== 0) {
            return false;
        }
        this.colors = deserializeColor(base64);
        return true;
    }
}

export function serializeColor(color: THREE.Color | THREE.Color[]): string {
    if (Array.isArray(color)) {
        let base64 = '';
        color.forEach(c => base64 += serializeColor(c));
        return base64;
    } else {
        return binaryToBase64(
            Math.round(color.r * 255).toString(2).padStart(8, '0') +
            Math.round(color.g * 255).toString(2).padStart(8, '0') +
            Math.round(color.b * 255).toString(2).padStart(8, '0')
        );
    }
}

export function deserializeColor(base64: string) {
    const binary = base64ToBinary(base64);
    const colors = [];
    for(let i = 0; i < binary.length; i += 24) {
        colors.push(
            new THREE.Color(
                parseInt(binary.substring(i, i+8), 2) / 255.0,
                parseInt(binary.substring(i+8, i+16), 2) / 255.0,
                parseInt(binary.substring(i+16, i+24), 2) / 255.0
            )
        )
    }
    return colors;
}

export default ColorPalette;
