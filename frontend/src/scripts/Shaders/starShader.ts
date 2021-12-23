const shader = {
    vertex: `
        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying float noise;
        
        uniform vec3 starColor;
        uniform float time;
        
        void main() {
            vertexNormalW = vec3(modelMatrix * vec4(normal, 0.0));
            vertexPositionW = vec3(modelMatrix * vec4(position, 1.0));
            noise = (
                sin(position.x * 100.0 + time) + 
                cos(position.y * 100.0 + time) + 
                sin(position.z * 100.0 + time)
            ) / 3.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying float noise;
        
        uniform vec3 starColor;
        
        void main() {
            vec3 toCamera = normalize(cameraPosition - vertexPositionW);
            float lightStrength = dot(toCamera, vertexNormalW);
            vec3 lightingRamp = mix(starColor * 2.0, starColor, lightStrength);
            float heat = (step(0.2, noise) + step(0.5, noise)) * 0.1;
        
            gl_FragColor = vec4(lightingRamp, 1.0) + 
                vec4(heat, heat, heat, 1.0);
        }
    `
}

export default shader;
