const shader = {
    vertex: `
        varying vec2 vUv;
        varying vec3 iColor;
        
        void main() {
            vUv = uv;
            iColor = instanceColor;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec2 vUv;
        varying vec3 iColor;
        
        void main() {
            vec2 offsetUv = vUv - vec2(0.5, 0.5);
            float distance = length(offsetUv) * 2.0;
            if (distance > 1.0) {
                discard;
            }

            float brightness = 1.2;
            if (distance > 0.9) {
                brightness = 1.5;
            }

            gl_FragColor = vec4(iColor * brightness, 1.0);
        }
    `
}

export default shader;
