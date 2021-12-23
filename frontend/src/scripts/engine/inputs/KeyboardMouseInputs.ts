import { Coordinate } from "./Definitions";

export class KeyboardMouseInputs {
    static TAP_DELAY = 250;
    static TAP_DISTANCE = 5;

    element: any;
    inputStates: Map<any, boolean>;
    inputEvents: any[];
    prevInputs: Map<any, any>;
    mousePosition: Coordinate; // Current mouse position.
    prevMousePosition: Coordinate; // Mouse position on previous frame.
    scrollDelta: number;

    constructor(element: any) {
        this.element = element;
        this.inputStates = new Map();
        this.prevInputs = new Map();
        this.inputEvents = [];
        this.mousePosition = new Coordinate(0, 0);
        this.prevMousePosition = new Coordinate(0, 0);
        this.scrollDelta = 0;
        this.bind();
    }

    dispose() {
        this.unbind();
    }

    bind() {
        window.addEventListener('keydown', this.keydown.bind(this));
        window.addEventListener('keyup', this.keyup.bind(this));
        this.element.addEventListener('pointerdown', this.pointerDown.bind(this));
        this.element.addEventListener('pointerup', this.pointerUp.bind(this));
        this.element.addEventListener('pointermove', this.pointerMove.bind(this));
        this.element.addEventListener('pointercancel', this.pointerUp.bind(this));
        this.element.addEventListener('pointerleave', this.pointerLeave.bind(this));
        this.element.addEventListener('wheel', this.onScroll.bind(this), {passive: true});
    }

    unbind() {
        window.removeEventListener('keydown', this.keydown.bind(this));
        window.removeEventListener('keyup', this.keyup.bind(this));
        this.element.removeEventListener('pointerdown', this.pointerDown.bind(this));
        this.element.removeEventListener('pointerup', this.pointerUp.bind(this));
        this.element.removeEventListener('pointermove', this.pointerMove.bind(this));
        this.element.removeEventListener('pointercancel', this.pointerUp.bind(this));
        this.element.removeEventListener('pointerleave', this.pointerLeave.bind(this));
        this.element.removeEventListener('wheel', this.onScroll.bind(this));
    }

    tick() {
        this.prevMousePosition = this.mousePosition;
        this.inputEvents = [];
        this.scrollDelta = 0;
    }

    keydown(event: KeyboardEvent) {
        this.inputStates.set(event.key, true);
        this.inputEvents.push(`${event.key}-down`);
    }

    keyup(event: KeyboardEvent) {
        this.inputStates.set(event.key, false);
        this.inputEvents.push(`${event.key}-up`);
    }

    onScroll(event: WheelEvent) {
        this.scrollDelta = Math.sign(event.deltaY);
    }

    deactivate() {
        const buttons = ['left', 'middle', 'right'];
        buttons.forEach(button => {
            const buttonName = `${button}-click`;
            if (this.inputStates.get(buttonName)) {
                this.inputEvents.push(`${buttonName}-up`);
                this.inputStates.set(buttonName, false);
            }
        });
    }

    pointerLeave() {
        this.deactivate();
    }

    pointerUp(event: any) {
        if (event.pointerType === 'mouse') {
            const button = ['left', 'middle', 'right'][event.button];
            this.inputStates.set(`${button}-click`, false);
            const prevInput = this.prevInputs.get(`${button}-click`);
            if (prevInput && 
                (event.timeStamp - prevInput.timeStamp) < KeyboardMouseInputs.TAP_DELAY &&
                Math.abs(event.clientX - prevInput.clientX) < KeyboardMouseInputs.TAP_DISTANCE &&
                Math.abs(event.clientY - prevInput.clientY) < KeyboardMouseInputs.TAP_DISTANCE
            ) {
                this.inputEvents.push(`${button}-tap`);
            }
            this.prevInputs.set(`${button}-click`, event);
            this.inputEvents.push(`${button}-click-up`);
            this.deactivate();
        }
    }

    pointerDown(event: any) {
        if (event.pointerType === 'mouse') {
            const button = ['left', 'middle', 'right'][event.button];
            this.inputStates.set(`${button}-click`, true);
            this.prevInputs.set(`${button}-click`, event);
            this.inputEvents.push(`${button}-click-down`);
            this.mousePosition = new Coordinate(event.clientX, event.clientY);
        }
    }

    pointerMove(event: any) {
        if (event.pointerType === 'mouse') {
            this.mousePosition = new Coordinate(event.clientX, event.clientY);
        }
    }
}
