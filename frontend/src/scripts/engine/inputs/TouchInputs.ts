import { Coordinate } from "./Definitions";

class TouchPointer {
    startEvent: PointerEvent;
    prevEvent: PointerEvent;
    curEvent: PointerEvent;
    garbage: boolean;

    constructor(event: PointerEvent) {
        this.startEvent = event;
        this.prevEvent = event;
        this.curEvent = event;
        this.garbage = false;
    }

    update(event: PointerEvent) {
        this.curEvent = event;
    }

    tick() {
        this.prevEvent = this.curEvent;
    }

    get coordinates(): Coordinate {
        return new Coordinate(this.curEvent.clientX, this.curEvent.clientY);
    }

    get prevCoordinates(): Coordinate {
        return new Coordinate(this.prevEvent.clientX, this.prevEvent.clientY);
    }

    get startCoordinates(): Coordinate {
        return new Coordinate(this.startEvent.clientX, this.startEvent.clientY);
    }

    delta() {
        const curCoords = new Coordinate(this.curEvent.clientX, this.curEvent.clientY);
        const prevCoords = new Coordinate(this.prevEvent.clientX, this.prevEvent.clientY);
        return curCoords.delta(prevCoords);
    }

    deltaScreen() {
        const curCoords = new Coordinate(this.curEvent.clientX, this.curEvent.clientY);
        const prevCoords = new Coordinate(this.prevEvent.clientX, this.prevEvent.clientY);
        return curCoords.deltaScreen(prevCoords);
    }
}

export class TouchInputs {
    static TAP_DELAY = 250;
    static TAP_DISTANCE = 5;

    element: any;
    touchPointers: Map<number, TouchPointer>;
    inputEvents: string[];

    constructor(element: any) {
        this.element = element;
        this.touchPointers = new Map();
        this.inputEvents = [];
        this.bind();
    }

    dispose() {
        this.unbind();
    }

    bind() {
        this.element.addEventListener('pointerdown', this.pointerDown.bind(this));
        this.element.addEventListener('pointerup', this.pointerUp.bind(this));
        this.element.addEventListener('pointermove', this.pointerMove.bind(this));
        this.element.addEventListener('pointercancel', this.pointerUp.bind(this));
    }

    unbind() {
        this.element.removeEventListener('pointerdown', this.pointerDown.bind(this));
        this.element.removeEventListener('pointerup', this.pointerUp.bind(this));
        this.element.removeEventListener('pointermove', this.pointerMove.bind(this));
        this.element.removeEventListener('pointercancel', this.pointerUp.bind(this));
    }

    tick() {
        Array.from(this.touchPointers.values()).forEach(touch => {
            if (touch.garbage) {
                this.touchPointers.delete(touch.startEvent.pointerId);
            } else {
                touch.tick();
            }
        });
        this.inputEvents = [];
    }

    get touchCount(): number {
        return this.touchPointers.size;
    }

    get zoom(): number {
        if (this.touchPointers.size === 2) {
            const [t1, t2] = Array.from(this.touchPointers.values());
            const prevDistance = t1.prevCoordinates.screenCoordinates.distance(t2.prevCoordinates.screenCoordinates);
            const curDistance = t1.coordinates.screenCoordinates.distance(t2.coordinates.screenCoordinates);
            return prevDistance - curDistance;
        }
        return 0.0;
    }

    get position(): Coordinate | undefined {
        if (this.touchPointers.size === 1) {
            const key = Array.from(this.touchPointers.keys())[0];
            return this.touchPointers.get(key)!.coordinates;
        }
        return undefined;
    }

    get prevPosition(): Coordinate | undefined {
        if (this.touchPointers.size === 1) {
            const key = Array.from(this.touchPointers.keys())[0];
            return this.touchPointers.get(key)!.prevCoordinates;
        }
        return undefined;
    }

    get zoomPosition(): Coordinate | undefined {
        if (this.touchPointers.size === 2) {
            const [t1, t2] = Array.from(this.touchPointers.values());
            return t1.startCoordinates.lerp(t2.startCoordinates, 0.5);
        }
        return undefined;
    }

    isTouchEvent(event: any) {
        return ['touch', 'pen'].includes(event.pointerType);
    }

    pointerUp(event: any) {
        if (!(this.isTouchEvent(event))) {
            return;
        }
        this.inputEvents.push('touch-up');
        const pointer = this.touchPointers.get(event.pointerId);
        if (pointer && 
            (event.timeStamp - pointer.startEvent.timeStamp) < TouchInputs.TAP_DELAY &&
            Math.abs(event.clientX - pointer.startEvent.clientX) < TouchInputs.TAP_DISTANCE &&
            Math.abs(event.clientY - pointer.startEvent.clientY) < TouchInputs.TAP_DISTANCE
        ) {
            this.inputEvents.push(`touch-tap`);
        }
        this.removePointer(event);
    }

    pointerDown(event: any) {
        if (!(this.isTouchEvent(event))) {
            return;
        }
        this.inputEvents.push('touch-down');
        this.addPointer(event);
    }

    pointerMove(event: any) {
        if (!(this.isTouchEvent(event))) {
            return;
        }
        this.updatePointer(event);
    }

    addPointer(event: PointerEvent) {
        const touchPointer = this.touchPointers.get(event.pointerId);
        if (touchPointer) {
            touchPointer.update(event);
        } else {
            this.touchPointers.set(event.pointerId, new TouchPointer(event));
        }
    }

    updatePointer(event: PointerEvent) {
        const touchPointer = this.touchPointers.get(event.pointerId);
        if (touchPointer) {
            touchPointer.update(event);
        }
    }

    removePointer(event: PointerEvent) {
        const touchPointer = this.touchPointers.get(event.pointerId);
        if (touchPointer) {
            touchPointer.garbage = true;
        }
    }
}
