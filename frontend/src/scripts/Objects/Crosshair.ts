class Crosshair {
    crosshair: any;
    size: number;
    _visible: boolean;

    constructor(size: number) {
        this.size = size;
        this._visible = true;
        this.crosshair = document.createElementNS('http://www.w3.org/2000/svg', "svg");
        this.crosshair.setAttribute('width', '32');
        this.crosshair.setAttribute('height', '32');
        this.crosshair.setAttribute('viewBox', '0 0 32 32');
        this.crosshair.setAttribute('fill', 'none');
        this.crosshair.style.position = 'absolute';
        this.crosshair.style.zIndex = '2';
        this.crosshair.style.width = `${size}px`;
        this.crosshair.style.height = `${size}px`;
        this.crosshair.style.pointerEvents = 'none';
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M19 13H13V19H19V13Z M16 5V27M5 16H27');
        path.setAttribute('stroke', 'red');
        this.crosshair.appendChild(path);
        this.setPosition(0.5, 0.5);
        document.body.appendChild(this.crosshair);
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(state: boolean) {
        this._visible = state;
        this.crosshair.style.display = this._visible ? 'block' : 'none';
    }

    setPosition(x: number, y: number) {
        this.crosshair.style.left = `calc(${(x * 100).toFixed(2)}% - ${this.size / 2}px)`;
        this.crosshair.style.top = `calc(${(y * 100).toFixed(2)}% - ${this.size / 2}px)`;
    }

    dispose() {
        document.body.removeChild(this.crosshair);
    }
}


export default Crosshair
