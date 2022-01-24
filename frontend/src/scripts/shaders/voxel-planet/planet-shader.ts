const shader = {
    vertex: `
        varying vec3 vertexNormal;
        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying vec3 vertexColor;
        
        void main() {
            vertexNormal = normal;
            vertexNormalW = vec3(modelMatrix * vec4(normal, 0.0));
            vertexPositionW = vec3(modelMatrix * vec4(position, 1.0));
            vertexColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 vertexNormal;
        varying vec3 vertexNormalW;
        varying vec3 vertexPositionW;
        varying vec3 vertexColor;
        
        uniform vec3 ambientLight;
        uniform vec3 colorPalette[15];
        
        // This looks stupid af, but it is more performant on some devices.
        vec3 findColor(float value) {
            int i = int(floor(value * 15.0 + 0.5));
            if(i==0) return colorPalette[0];
            else if(i==1) return colorPalette[1];
            else if(i==2) return colorPalette[2];
            else if(i==3) return colorPalette[3];
            else if(i==4) return colorPalette[4];
            else if(i==5) return colorPalette[5];
            else if(i==6) return colorPalette[6];
            else if(i==7) return colorPalette[7];
            else if(i==8) return colorPalette[8];
            else if(i==9) return colorPalette[9];
            else if(i==10) return colorPalette[10];
            else if(i==11) return colorPalette[11];
            else if(i==12) return colorPalette[12];
            else if(i==13) return colorPalette[13];
            else return colorPalette[14];
        }

        float getLightStrength(vec3 normal) {
            if (normal.x > 0.1) {
                return 1.0;
            } else if (normal.x < -0.1) {
                return 1.0;
            } else if (normal.y > 0.1) {
                return 0.8;
            } else if (normal.y < -0.1) {
                return 0.8;
            } else if (normal.z > 0.1) {
                return 0.9;
            } else {
                return 0.9;
            }
        }
        
        void main() {
            vec3 lightingRamp = mix(ambientLight, findColor(vertexColor.r), getLightStrength(vertexNormal));
            gl_FragColor = vec4(lightingRamp, 1.0);
        }
    `
}

export default shader;
