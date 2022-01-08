import { CallbackSet } from 'scripts/engine/helpers';
import * as THREE from 'three';
import { SERIALIZED_COLOR_SIZE, deserializeColor, serializeColor } from './geo-planet/settings';

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

export default ColorPalette;
