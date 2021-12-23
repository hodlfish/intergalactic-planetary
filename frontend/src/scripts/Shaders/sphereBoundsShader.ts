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
        uniform float renderDistance;
        
        void main() {
            float distance = length(vertexPositionW - cameraPosition);
            float alpha = 0.0;
            if (distance < renderDistance) {
                alpha = (renderDistance - distance) / renderDistance;
            }
            gl_FragColor = vec4(alpha);
        }
    `
}

export default shader;
