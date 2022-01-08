const shader = {
    vertex: `
        varying vec3 vertexNormalW;
        varying vec4 vertexPosition;
        varying vec3 vertexPositionW;
        varying float noise;
        
        uniform float time;
        uniform float speed;
        uniform float waveDensity;
        
        void main() {
            vertexNormalW = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
            vertexPositionW = vec3(modelMatrix * vec4(position, 1.0));
            noise = (
                sin(position.x * waveDensity + time * speed) + 
                cos(position.y * waveDensity + time * speed) + 
                sin(position.z * waveDensity + time * speed)
            ) / 3.0;
            vertexPosition = projectionMatrix * modelViewMatrix * vec4(position * (1.0 + noise * 0.01), 1.0);
            gl_Position = vertexPosition;
        }
    `,
    fragment: `
        #include <packing>

        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying vec4 vertexPosition;
        varying float noise;
        
        uniform vec3 waterColor;
        uniform sampler2D tDepth;
        uniform float density;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float foamDepth;
        uniform vec3 cameraDirection;
        uniform float ambientLight;
        
        float getDepth() {
            vec2 vCoords = vertexPosition.xy / vertexPosition.w * 0.5 + 0.5;
            float depth = texture2D( tDepth, vCoords ).x;
            float worldDepth = perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
            float waterDepth = perspectiveDepthToViewZ(gl_FragCoord.z, cameraNear, cameraFar);
            return waterDepth - worldDepth;
        }
        
        void main() {
            // Lighting
            vec3 toCamera = normalize(cameraPosition - vertexPositionW);
            float fresnelIntensity = pow(1.0 - dot(toCamera, normalize(vertexNormalW)), 10.0);
            if (noise > 0.8) {
                fresnelIntensity = 0.8;
            }
            float lightStrength = ambientLight + dot(-cameraDirection, vertexNormalW) * (1.0 - ambientLight);
        
            // Get Depth
            float depth = getDepth();
        
            // Calculate foam
            float foamDensity = 0.0;
            if (depth < foamDepth && depth > 0.0) {
                foamDensity = floor((1.0 - depth / foamDepth) / 0.25) * 0.25 * 0.6;
            }
        
            // Calculate opacity
            float opacity = 1.0;
            if (density > 0.0) {
                opacity = mix(0.5, 1.0, depth / density);
            }
        
            // Fade shore lines at distance
            foamDensity = foamDensity * max(0.0, (30.0 - distance(cameraPosition, vertexPositionW)) / 30.0);
        
            gl_FragColor = vec4(waterColor * lightStrength, opacity) + 
                vec4(fresnelIntensity, fresnelIntensity, fresnelIntensity, 0.0) +
                vec4(foamDensity, foamDensity, foamDensity, foamDensity);
        }
    `
}

export default shader;
