import { lerp } from "three/src/math/MathUtils";
import { Engine } from "./Engine";

interface CurtainTransition {
    startTime: number,
    duration: number,
    startOpacity: number,
    endOpacity: number,
    callback?: any
}

class Curtain {
    engine: Engine;
    curtain: HTMLDivElement;
    transition?: CurtainTransition;

    constructor(engine: Engine) {
        this.engine = engine;
        this.engine.updateCallbacks.addListener(this, this.update.bind(this))
        this.curtain = document.createElement("div") as HTMLDivElement;
        this.curtain.id="engine-curtain";
        this.curtain.style.position = 'absolute';
        this.curtain.style.left = '0px';
        this.curtain.style.right = '0px';
        this.curtain.style.top = '0px';
        this.curtain.style.bottom = '0px';
        this.curtain.style.zIndex = '10';
        this.curtain.style.background = 'black';
        this.curtain.style.opacity = '1.0'; // Default to opaque.
        this.curtain.style.pointerEvents = 'none';
        document.body.appendChild(this.curtain);
    }

    dispose() {
        this.engine.updateCallbacks.removeListener(this);
        document.body.removeChild(this.curtain);
    }

    update() {
        if (this.transition) {
            this.curtain.style.pointerEvents = 'all';
            const dTime = (Date.now() - this.transition.startTime) / this.transition.duration;
            const dOpactiy = lerp(this.transition.startOpacity, this.transition.endOpacity, dTime);
            if (dTime >= 1.0) {
                this.curtain.style.opacity = this.transition.endOpacity.toString();
                const completeTransition = this.transition;
                this.transition = undefined;
                if (completeTransition.callback) {
                    completeTransition.callback();
                }
                this.curtain.style.pointerEvents = 'none';
            } else {
                this.curtain.style.opacity = dOpactiy.toString();
            }
        }
    }

    fadeIn(duration = 1.0, callback?: any, force = false) {
        if (this.curtain.style.opacity === '1' || force) {
            this.curtain.style.opacity = '1';
            this.transition = {
                startTime: Date.now(),
                duration: duration * 1000,
                startOpacity: 1.0,
                endOpacity: 0.0,
                callback: callback
            }
        }
    }

    fadeOut(duration = 1.0, callback?: any, force = false) {
        if (this.curtain.style.opacity === '0' || force) {
            this.curtain.style.opacity = '0';
            this.transition = {
                startTime: Date.now(),
                duration: duration * 1000,
                startOpacity: 0.0,
                endOpacity: 1.0,
                callback: callback
            }
        }
    }
}

export default Curtain;
