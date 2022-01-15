const shader = {
    vertex: `
        varying vec3 customColor;
        varying vec3 vertexColor;
        varying vec3 normalWorld;
        
        void main() {
            customColor = instanceColor;
            vertexColor = color;
            normalWorld = normalize(vec3(modelMatrix * instanceMatrix * vec4(normal, 0.0)));
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec3 customColor;
        varying vec3 vertexColor;
        varying vec3 normalWorld;
        
        uniform vec3 colorPalette[15];
        uniform vec3 cameraDirection;
        uniform float ambientLight;
        
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
        
        void main() {
            vec3 objColor = vertexColor;
            if (vertexColor.x == vertexColor.z && vertexColor.y == 0.0) {
                objColor = mix(vec3(0.0), findColor(customColor.x), vertexColor.x);
            }
            float lightStrength = ambientLight + dot(-cameraDirection, normalWorld) * (1.0 - ambientLight);
            gl_FragColor = vec4(objColor * lightStrength, 1.0);
        }
    `
}

export default shader;
