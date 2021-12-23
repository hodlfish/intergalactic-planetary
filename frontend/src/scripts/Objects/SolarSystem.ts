import * as THREE from 'three';
import GameObject from 'scripts/engine/GameObject';
import Planet from 'scripts/Objects/IcoPlanet';
import Templates from 'scripts/Objects/IcoPlanet/Templates';
import GalacticSpec from 'scripts/GalacticSpec';
import { PlanetInfo } from 'scripts/Api';
import OrbitPath from '../Objects/OrbitPath';
import Star from '../Objects/Star';

interface PlanetData {
    planet: Planet,
    info: PlanetInfo | undefined
}

class SolarSystem extends GameObject {
    static SYSTEM_RADIUS = 30.0;

    planetObjects: Map<string, PlanetData>;
    orbitPaths: OrbitPath[];
    star: Star;
    starSize: number;
    systemId: string;
    collisionMeshes: THREE.Mesh[];

    constructor(systemId: string, planetInfos: PlanetInfo[]) {
        super();
        this.systemId = systemId;
        this.planetObjects = new Map();
        this.orbitPaths = [];
        this.starSize = GalacticSpec.getSystemStarSize(this.systemId);
        this.star = new Star(GalacticSpec.getSystemStarSize(this.systemId), GalacticSpec.getSystemStarColor(this.systemId));
        this.collisionMeshes = [this.star.starMesh];
        const planetIds = GalacticSpec.getSystemPlanets(this.systemId);
        for(let i = 0; i < planetIds.length; i++) {
            const planetId = planetIds[i];
            const planetInfo = planetInfos.find(info => info.token_id === planetId);
            const planet = new Planet(Math.random() * 0.25);
            this.collisionMeshes.push(planet.terrain.mesh);
            if (!planetInfo || !planetInfo.data || !planet.deserialize(planetInfo.data)) {
                planet.deserialize(Templates.unminted);
            }
            const position = this.getPlanetPosition(planetId);
            planet.scene.position.set(...position.toArray());
            this.planetObjects.set(planetId, {planet: planet, info: planetInfo});
            const orbitPath = new OrbitPath(position.length());
            this.orbitPaths.push(orbitPath);
        }
    }

    dispose() {
        Array.from(this.planetObjects.values()).forEach(planetData => planetData.planet.dispose());
        this.orbitPaths.forEach(o => {
            this.scene.remove(o.mesh);
            o.dispose();
        });
        this.scene.remove(this.star.scene);
        this.star.dispose();
        super.dispose();
    }

    getPlanetPosition(planetId: string) {
        const planetIds = GalacticSpec.getSystemPlanets(this.systemId);
        const index = planetIds.findIndex(pId => pId === planetId)
        if (index > -1) {
            const angle = (index / planetIds.length) * 2 * Math.PI;
            const planetSteps = SolarSystem.SYSTEM_RADIUS / planetIds.length;
            const distance = planetSteps * index + this.starSize * 2.0;
            return new THREE.Vector3(
                Math.cos(angle) * distance, 0.0, Math.sin(angle) * distance
            );
        }
        return new THREE.Vector3();
    }
}

export default SolarSystem;
