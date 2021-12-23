const shader = {
    vertex: `
        varying vec3 iColor;
        varying vec2 vUv;
        varying vec3 localPosition;
        
        void main() {
            iColor = instanceColor;
            vUv = uv;
            float scale = 1.0 + iColor.y;
            localPosition = vec3(instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0));
            gl_Position = projectionMatrix * (viewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(position.x * scale, position.y * scale, 0.0, 0.0));
        }
    `,
    fragment: `
        varying vec3 iColor;
        varying vec2 vUv;
        varying vec3 localPosition;
        uniform vec3 colorPalette[5];
        uniform float time;
        
        vec3 findColor(float value) {
            int i = int(floor(value * 5.0 + 0.5));
            if(i==0) return colorPalette[0];
            else if(i==1) return colorPalette[1];
            else if(i==2) return colorPalette[2];
            else if(i==3) return colorPalette[3];
            else return colorPalette[4];
        }
        
        float PHI = 1.61803398874989484820459;
        float seed = 1010.0;
        
        float noise(in vec2 xy){
            return fract(tan(distance(xy*PHI, xy)*seed)*xy.x);
        }
        
        void main() {
            vec2 offsetUv = vUv - vec2(0.5, 0.5);
            float distance = length(offsetUv) * 2.0;
            if (distance > 1.0) {
                discard;
            }
            float intensity = pow(1.0 - distance, 0.5) + 0.5;
            vec3 mappedColor = findColor(iColor.r) * 2.0;
            vec3 dulledColor = mix(mappedColor, vec3(1.0), 0.6);
            vec3 displayColor = mix(
                mappedColor, 
                dulledColor, 
                clamp(cameraPosition.y / 25.0, 0.0, 1.0)
            );
            intensity += sin(time + noise(localPosition.xy)) / 4.0;
            gl_FragColor = vec4(displayColor * intensity, 1.0);
        }
    `
}

export default shader;
