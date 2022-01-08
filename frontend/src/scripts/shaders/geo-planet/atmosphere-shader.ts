const shader = {
    vertex: `
        uniform float size;
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(position.x * size, position.y * size, 0.0, 0.0));
        }
    `,
    fragment: `
        varying vec2 vUv;
        uniform vec3 atmosphereColor;
        uniform float density;

        void main() {
            vec2 offsetUv = vUv - 0.5;
            float distance = min(length(offsetUv) * 2.0, 1.0);
            float intensity = pow(1.0 - distance, 2.0 - density);
            gl_FragColor = vec4(atmosphereColor, intensity);
        }
    `
}

export default shader;
