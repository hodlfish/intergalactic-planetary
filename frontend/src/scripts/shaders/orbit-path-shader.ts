const shader = {
    vertex: `
        varying vec2 uvCoord;

        void main() {
            uvCoord = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec2 uvCoord;
        float ringSize = 0.01;
        float brightness = 0.1;
        
        void main() {
            float distance = length((uvCoord - vec2(0.5, 0.5)) * 2.0);
            if (distance > 1.0 || distance < 1.0 - ringSize) {
                discard;
            }
            float normalizedRing = (distance - (1.0 - ringSize)) * (1.0 / ringSize);
            float strength = -pow(((normalizedRing - 0.5) * 2.0), 2.0) + 1.0;
            gl_FragColor = vec4(1.0, 1.0, 1.0, strength * brightness);
        }
    `
}

export default shader;
