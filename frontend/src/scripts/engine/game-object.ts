import * as THREE from 'three';
import Engine, { UpdateState } from './engine';

interface LifeCycleHooks {
    update?: (state: UpdateState) => void
}

abstract class GameObject {
    engine: Engine;
    scene: THREE.Scene;

    constructor() {
        this.engine = Engine.instance;
        this.scene = new THREE.Scene();
        this.engine.scene.add(this.scene);
        const lifeCycleObject = (this as LifeCycleHooks);
        if (lifeCycleObject.update) {
            this.engine.updateCallbacks.addListener(this, lifeCycleObject.update.bind(this));
        }
    }

    dispose() {
        this.engine.scene.remove(this.scene);
        this.scene.children.forEach(c => this.scene.remove(c));
        const lifeCycleObject = (this as LifeCycleHooks);
        if (lifeCycleObject.update) {
            this.engine.updateCallbacks.removeListener(this);
        }
    }
}

export default GameObject;
