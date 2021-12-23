export class CallbackSet {
    _callbacks: Map<any, any>;

    constructor() {
        this._callbacks = new Map();
    }

    addListener(object: any, callback: any) {
        if(!this._callbacks.has(object)) {
            this._callbacks.set(object, callback);
        }
    }

    removeListener(object: any) {
        this._callbacks.delete(object);
    }

    get callbacks(): any[] {
        return Array.from(this._callbacks.values());
    }

    call(...args: any[]) {
        Array.from(this._callbacks.values()).forEach(callback => callback(...args));
    }
}
