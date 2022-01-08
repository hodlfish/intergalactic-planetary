// Deterministic logic to position, name, and color the galaxy.

import * as THREE from 'three';

class GalacticSpec {
    static ARMS = 4;
    static CYCLE_SIZE = 12;
    static SYSTEM_SIZES = [
        3, 4, 5
    ]
    static STAR_COLORS = [
        new THREE.Color(0.0, 0.5, 0.75), // Blue
        new THREE.Color(0.6, 0.6, 0.6), // White
        new THREE.Color(0.875, 0.300, 0.0), // Orange
        new THREE.Color(0.675, 0.1, 0.1), // Red
        new THREE.Color(0.675, 0.1, 1.0) // Purple
    ]
    static MAX_PLANETS = 5000;
    static MAX_SYSTEMS = GalacticSpec.getTotalSystems(GalacticSpec.MAX_PLANETS);
    static STAR_MIN_SIZE = 5.0;
    static STAR_MAX_SIZE = 15.0;

    static DEFAULT_PLANETS = [
        
    ]

    static SYSTEM_ADJECTIVES = [
        'Chunky',
        'Galactic',
        'Spicy',
        'Thick',
        'Raging',
        'Renegade',
        'Corrupted',
        'Holy',
        'Cosmic',
        'Delicious',
        'Crunchy',
        'Fantastic',
        'Superior',
        'Haunted',
        'Spooky',
        'Seductive',
        'Bullish',
        'Bearish',
        'Rekt',
        'Hot',
        'Cold',
        'Doughy',
        'Stable',
        'Sleepy',
        'Toxic',
        'Anonymous',
        'Poor',
        'Rich',
        'Gassy',
        'Minty',
        'Ergonomic',
        'Quick',
        'Mighty',
        'Meaty',
        'Awkward',
        'Electric'
    ]

    static SYSTEM_NAMES = [
        'Lunatic',
        'Apollo',
        'Spectrum',
        'Anchor',
        'Mirror',
        'Cosmos',
        'Pylon',
        'Hermes',
        'Valkyrie', 
        'Kwon',
        'Nexus',
        'Mars',
        'Talis',
        'Angel',
        'Whale',
        'Terran',
        'Ozone',
        'Alice',
        'Nebula',
        'Shin',
        'Nakomoto',
        'Buterin',
        'Turtle',
        'Doge',
        'Chai',
        'Candle',
        'Shill',
        'HODL',
        'Chain',
        'Pool',
        'Coin',
        'Rug',
        'Astrochad',
        'Exchange',
        'Prism',
        'Terrestrial'
    ]

    static noise(id: number) {
        return Math.abs(Math.sin(Math.pow(id + 999, 2) * 9999));
    }

    static getSystemName(systemId: string) {
        const parsedId = parseInt(systemId) - 1;
        const cycle = Math.floor(parsedId / GalacticSpec.SYSTEM_NAMES.length);
        const adjIndex = (cycle + parsedId) % GalacticSpec.SYSTEM_ADJECTIVES.length;
        const nounIndex = (cycle * 2 + parsedId) % GalacticSpec.SYSTEM_NAMES.length;
        return `${GalacticSpec.SYSTEM_ADJECTIVES[adjIndex]} ${GalacticSpec.SYSTEM_NAMES[nounIndex]} System`;
    }

    static getSystemPosition(systemId: string) {
        const parsedId = parseInt(systemId) - 1;
        const armSpiral = 2 * Math.PI;
        const armId = parsedId % GalacticSpec.ARMS;
        const armOffset = Math.PI * 2 * (armId / GalacticSpec.ARMS);
        const armSize = 2 * Math.PI / GalacticSpec.ARMS;
        const armTotal = Math.ceil(GalacticSpec.MAX_SYSTEMS / GalacticSpec.ARMS);
        const armIndex = Math.floor(parsedId / GalacticSpec.ARMS);
        const distance = (armIndex + 1) / (armTotal + 1);
        const rand = (GalacticSpec.noise(parsedId) + GalacticSpec.noise(parsedId + 1) + GalacticSpec.noise(parsedId + 2)) / 3;
        const angle = armOffset + (armSpiral * distance) + (rand * armSize);
        
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            0.0,
            Math.sin(angle) * distance
        )
    }

    static getSystemStarSize(system: string) {
        const parsedId = parseInt(system) - 1;
        return (GalacticSpec.STAR_MAX_SIZE - GalacticSpec.STAR_MIN_SIZE) * GalacticSpec.noise(parsedId) + GalacticSpec.STAR_MIN_SIZE;
    }

    static positionInCycle(planetId: string) {
        const parsedId = (parseInt(planetId) - 1) % GalacticSpec.CYCLE_SIZE;
        let sum = 0;
        for(let i = 0; i < GalacticSpec.SYSTEM_SIZES.length; i++) {
            sum += GalacticSpec.SYSTEM_SIZES[i];
            if (sum > parsedId) {
                return i;
            }
        }
        return -1;
    }

    static getSystemStarColorIndex(systemId: string) {
        const parsedId = parseInt(systemId) - 1;
        const armIndex = Math.floor(parsedId / GalacticSpec.ARMS);
        return armIndex % GalacticSpec.STAR_COLORS.length;
    }

    static getSystemStarColor(systemId: string) {
        return GalacticSpec.STAR_COLORS[GalacticSpec.getSystemStarColorIndex(systemId)];
    }

    static getSystemPlanets(systemId: string): string[] {
        const parsedId = parseInt(systemId) - 1;
        const sizeIndex = parsedId % GalacticSpec.SYSTEM_SIZES.length;
        let total = Math.floor(parsedId / GalacticSpec.SYSTEM_SIZES.length) * GalacticSpec.CYCLE_SIZE;
        for(let i = 0; i < sizeIndex; i++) {
            total += GalacticSpec.SYSTEM_SIZES[i];
        }
        const result = [] as string[];
        for(let i = 0; i < GalacticSpec.SYSTEM_SIZES[sizeIndex]; i++) {
            const pId = total + i + 1;
            if (pId > GalacticSpec.MAX_PLANETS) {
                break;
            }
            result.push(pId.toString());
        }
        return result;
    }

    static getTotalSystems(planetCount: number) {
        let total = Math.floor(planetCount / GalacticSpec.CYCLE_SIZE) * GalacticSpec.SYSTEM_SIZES.length;
        let remaining = planetCount % GalacticSpec.CYCLE_SIZE;
        for(let i = 0; remaining > 0; i++) {
            total += 1;
            remaining -= GalacticSpec.SYSTEM_SIZES[i];
        }
        return total;
    }

    static planetIdToSystemId(planetId: string) {
        const systemId = Math.floor((parseInt(planetId) - 1) / GalacticSpec.CYCLE_SIZE) * GalacticSpec.SYSTEM_SIZES.length;
        return (systemId + GalacticSpec.positionInCycle(planetId) + 1).toString();
    }

    static isMinted(planetId: string, mintTotal: number) {
        return parseInt(planetId) <= mintTotal;
    }

    static isValidSystemId(systemId: string | number | undefined | null): boolean {
        if (systemId === undefined || systemId == null) {
            return false;
        }
        const maxSystems = GalacticSpec.getTotalSystems(GalacticSpec.MAX_PLANETS);
        let parsedSystemId = systemId;
        if (typeof systemId === 'string' || systemId as any instanceof String) {
            parsedSystemId = parseInt(systemId as string);
        }
        return !isNaN(parsedSystemId as number) && parsedSystemId <= maxSystems && parsedSystemId >= 1;
    }

    static isValidPlanetId(planetId: string | number | undefined | null): boolean {
        if (planetId === undefined || planetId == null) {
            return false;
        }
        let parsedPlanetId = planetId;
        if (typeof planetId === 'string' || planetId as any instanceof String) {
            parsedPlanetId = parseInt(planetId as string);
        }
        return !isNaN(parsedPlanetId as any) && parsedPlanetId <= GalacticSpec.MAX_PLANETS && parsedPlanetId >= 0;
    }
}

export default GalacticSpec;
