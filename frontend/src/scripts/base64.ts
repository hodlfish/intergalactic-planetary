const CHARACTER_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const PADDING_CHARACTER = '=';

const letterToIndex = new Map<string, number>();
for(let i = 0; i < CHARACTER_TABLE.length; i++) {
    letterToIndex.set(CHARACTER_TABLE.charAt(i), i);
}

export function base64ToBinary(base64: string) {
    let binary = '';
    for(let i = 0; i < base64.length; i++) {
        const character = base64.charAt(i);
        if (character === PADDING_CHARACTER) {
            continue;
        }
        const letter = letterToIndex.get(character);
        if (letter !== undefined) {
            binary += letter.toString(2).padStart(6, '0').substring(0, 6);
        } else {
            throw Error('Non base64 character detected');
        }
    }
    return binary
}

export function binaryToBase64(binary: string) {
    while (binary.length % 6 !== 0) {
        binary += '0';
    }
    let base64 = '';
    for(let i = 0; i < binary.length; i+=6) {
        base64 += CHARACTER_TABLE.charAt(parseInt(binary.substring(i, i + 6), 2));
    }
    return base64;
}

export function verifyBase64(base64: string) {
    return !/[^a-zA-Z0-9+/=]/.test(base64);
}
