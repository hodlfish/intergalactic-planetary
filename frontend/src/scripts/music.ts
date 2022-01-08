class Music {
    filename: string;
    canPlay: boolean;
    audio: HTMLAudioElement;
    buffer: any;
    static _instance: Music;

    static get instance() {
        return Music._instance;
    }

    constructor(filename: string) {
        this.filename = filename;
        this.canPlay = false;
        this.audio = new Audio(`${window.location.protocol}/${this.filename}`);
        this.audio.oncanplay = this._canPlay;
        this.audio.loop = true;
        this.audio.pause();
        this.audio.muted = true;
        this.audio.volume = 0.0;
        Music._instance = this;
    }

    setVolume(volume: number) {
        const newVolume = Math.min(Math.max(volume, 0.0), 1.0);
        if (newVolume === 0.0) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
        this.audio.volume = Math.min(Math.max(volume, 0.0), 1.0);
    }

    enable() {
        this.audio.muted = false;
    }

    _canPlay() {
        this.canPlay = true;
    }
}

export default Music;
