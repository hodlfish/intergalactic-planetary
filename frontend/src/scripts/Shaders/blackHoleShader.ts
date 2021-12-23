const shader = {
    vertex: `
        varying vec3 vertexPositionW;

        void main() {
            vertexPositionW = vec3(modelMatrix * vec4(position, 1.0));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 vertexPositionW;
        uniform vec3 rimColor;
        uniform vec3 mainColor;
        
        void main() {
            vec3 vertexToCamera = normalize(cameraPosition - vertexPositionW);
            float intensity =  pow(1.0 - dot(vertexToCamera, normalize(vertexPositionW)), 1.0);
            gl_FragColor = vec4(mainColor, 1.0) + vec4(rimColor, 1.0) * intensity;
        }
    `
}

export default shader;
