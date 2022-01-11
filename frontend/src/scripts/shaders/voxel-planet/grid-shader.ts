const shader = {
    vertex: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec2 vUv;

        uniform float gridSize;
        uniform vec3 gridColor;
        uniform float strokeWidth;

        void main() {
            float limit = 0.5 - strokeWidth;
            vec2 gridUv = abs(mod(vUv * gridSize, 1.0) - 0.5);
            if (gridUv.x > limit || gridUv.y > limit){
                gl_FragColor = vec4(gridColor, 1.0);
            } else {
                discard;
            }
        }
    `
}

export default shader;
