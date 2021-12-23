import { CallbackSet } from 'scripts/engine/Helpers';
import * as THREE from 'three';
import { COLOR_PALETTE_SIZE, SERIALIZED_COLOR_SIZE, deserializeColor, serializeColor } from './geoPlanet/Settings';

class ColorPalette {
    _colors: THREE.Color[];
    onBeforeChange: CallbackSet;
    onAfterChange: CallbackSet;

    constructor() {
        this._colors = [];
        for(let i = 0; i < COLOR_PALETTE_SIZE; i++) {
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
        if (base64.length !== COLOR_PALETTE_SIZE * SERIALIZED_COLOR_SIZE) {
            return false;
        }
        this.colors = deserializeColor(base64);
        return true;
    }
}

export default ColorPalette;
