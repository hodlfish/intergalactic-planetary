const shader = {
    vertex: `
        varying vec2 vUV;

        void main() {
            vUV = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragment: `
        varying vec2 vUV;
        uniform float time;
        
        const float PI = 3.14159;
        
        void main() {
            vec2 offsetUV = (vUV - vec2(0.5)) * 2.0;
            float d = distance(offsetUV, vec2(0.0));
            float offset = 2.0 * PI * d;
        
            float alpha = mod(atan(offsetUV.y / offsetUV.x) - offset, (PI / 2.0));
            alpha = sin(alpha * PI) * 0.5 * max(1.0 - d, 0.0);
            alpha = max(alpha, (0.33 - d) * 2.0);
        
            gl_FragColor = vec4(0.8, 0.8, 1.0, alpha);
        }
    `
}

export default shader;
