const shader = {
    vertex: `
        varying vec3 vertexColor;
        varying vec3 vertexNormalW;

        void main() {
            vertexNormalW = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
            vertexColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 vertexColor;
        varying vec3 vertexNormalW;
        uniform vec3 cameraDirection;
        uniform float ambientLight;
        
        void main() {
            float lightStrength = ambientLight + dot(-cameraDirection, vertexNormalW) * (1.0 - ambientLight);
            gl_FragColor = vec4(vertexColor * lightStrength, 1.0);
        }
    `
}

export default shader;
