const shader = {
    vertex: `
        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying vec3 vertexColor;
        
        void main() {
            vertexNormalW = vec3(modelMatrix * vec4(normal, 0.0));
            vertexPositionW = vec3(modelMatrix * vec4(position, 1.0));
            vertexColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying vec3 vertexColor;
        
        uniform vec3 ambientLight;
        uniform vec3 colorPalette[6];
        
        vec3 findColor(float value) {
            int index = int(floor((value / 0.166) + 0.5));
            for (int i=0; i<6; i++) {
                if (i == index) return colorPalette[i];
            }
            return colorPalette[0];
        }
        
        void main() {
            vec3 toCamera = normalize(cameraPosition - vertexPositionW);
            float lightStrength = pow(dot(toCamera, vertexNormalW), 1.0) * 0.5 + 0.5;
            vec3 lightingRamp = mix(ambientLight, findColor(vertexColor.r), lightStrength);
            gl_FragColor = vec4(lightingRamp, 1.0);
        }
    `
}

export default shader;
