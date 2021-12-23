const shader = {
    vertex: `
        varying vec3 centerW;
        varying vec3 vertexNormalW;
        varying vec3 vertexPosition;
        varying vec3 vertexPositionW;
        varying vec3 vertexColor;
        varying vec2 vUv;
        
        void main() {
            centerW = vec3(modelMatrix * vec4(0.0, 0.0, 0.0, 1.0));
            vertexNormalW = normalize(vec3(modelMatrix * vec4(normal, 0.0)));
            vertexPosition = position;
            vertexPositionW = vec3(modelMatrix * vec4(position, 1.0));
            vertexColor = color;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 centerW;
        varying vec3 vertexNormalW;
        varying vec3 vertexPosition;
        varying vec3 vertexPositionW;
        varying vec3 vertexColor;
        varying vec2 vUv;
        
        uniform bool showCursor;
        uniform vec3 cursorPosition;
        uniform float brushSize;
        uniform vec3 colorPalette[8];
        uniform sampler2D uvTexture;
        uniform vec3 cameraDirection;
        uniform float ambientLight;
        
        // This looks stupid af, but it is more performant on some devices.
        vec3 findColor(float value) {
            int i = int(floor(value * 8.0 + 0.5));
            if(i==0) return colorPalette[0];
            else if(i==1) return colorPalette[1];
            else if(i==2) return colorPalette[2];
            else if(i==3) return colorPalette[3];
            else if(i==4) return colorPalette[4];
            else if(i==5) return colorPalette[5];
            else if(i==6) return colorPalette[6];
            else return colorPalette[7];
        }
        
        vec3 findMapLocation() { 
            vec4 tex = texture2D(uvTexture, vUv);
            if (tex.r > 0.0) {
                return findColor(vertexColor.r);
            } else if (tex.g > 0.0) {
                return findColor(vertexColor.g);
            } else {
                return findColor(vertexColor.b);
            }
        }
        
        void main() {
            float lightStrength = ambientLight + dot(-cameraDirection, vertexNormalW) * (1.0 - ambientLight);
            vec3 mappedColor = findMapLocation();
        
            float cursorIntensity = 0.0;
            if (showCursor) {
                float angle = dot(normalize(cursorPosition - centerW), normalize(vertexPositionW - centerW));
                if (angle >= brushSize) {
                    cursorIntensity = 0.2;
                }
            }
        
            gl_FragColor = vec4(mappedColor * lightStrength, 1.0) 
                + vec4(cursorIntensity, cursorIntensity, cursorIntensity, 1.0);
        }
    `
}

export default shader;
