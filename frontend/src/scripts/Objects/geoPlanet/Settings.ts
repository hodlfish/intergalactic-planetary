import * as THREE from 'three';
import { base64ToBinary, binaryToBase64 } from 'scripts/Base64';

export const MIN_HEIGHT = 1.0;
export const MAX_HEIGHT = 3.0;
export const HEIGHT_RANGE = MAX_HEIGHT - MIN_HEIGHT;
export const ATMOSPHERE_MIN_HEIGHT = 1.0;
export const ATMOSPHERE_MAX_HEIGHT = 5.0;
export const ATMOSPHERE_HEIGHT_RANGE = ATMOSPHERE_MAX_HEIGHT - ATMOSPHERE_MIN_HEIGHT;
export const UNIQUE_VERTICES = 642;
export const UNIQUE_FACES = 1280;
export const COLOR_PALETTE_SIZE = 8;
export const SERIALIZED_COLOR_SIZE = 4;

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
