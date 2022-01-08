const shader = {
    vertex: `
        varying vec3 iColor;

        void main() {
            iColor = instanceColor;
            gl_Position = projectionMatrix * (viewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(position.x, position.y, 0.0, 0.0));
        }
    `,
    fragment: `
        varying vec3 iColor;

        void main() { 
            gl_FragColor = vec4(iColor, 1.0);
        }
    `
}

export default shader;
