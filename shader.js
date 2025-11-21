const vertexShaderSource = `
attribute vec2 aVertexPosition;
void main(void) {
    gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
`;

// Utility prelude shared by several shaders
const commonPrelude = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
float hash(vec2 p){
    p = fract(p*vec2(123.34, 456.21));
    p += dot(p, p+45.32);
    return fract(p.x*p.y);
}
`;


// Style 4: Lava Blobs (metaballs)
// Style 4: Lava Blobs (metaballs) - Arctic Night Theme
const fragmentLava = commonPrelude + `
float mb(vec2 p, vec2 c){return 0.25/length(p-c);}
void main(){
    vec2 uv = gl_FragCoord.xy/uResolution.xy;
    uv = uv*2.0 - 1.0;
    uv.x *= uResolution.x/uResolution.y;
    float t=uTime*0.6;
    vec2 c1 = 0.5*vec2(sin(t*1.1), cos(t*1.3));
    vec2 c2 = 0.6*vec2(sin(t*0.9+2.0), cos(t*1.0+1.0));
    vec2 c3 = 0.7*vec2(sin(t*1.3+1.5), cos(t*0.8+2.5));
    float f = mb(uv,c1)+mb(uv,c2)+mb(uv,c3);
    float edge = smoothstep(0.9, 1.2, f);
    vec3 cColor1 = vec3(0.05, 0.1, 0.2);
    vec3 cColor2 = vec3(0.2, 0.4, 0.6);
    vec3 cColor3 = vec3(0.0, 0.0, 0.1);
    vec3 col = mix(cColor1, cColor2, clamp(f*0.7,0.0,1.0)) + cColor3*edge;
    gl_FragColor = vec4(col, 1.0);
}
`;


function main() {
    const canvas = document.getElementById('glCanvas');
    let gl = canvas.getContext('webgl');
    if (!gl) {
        console.log('WebGL not supported, falling back on experimental-webgl');
        gl = canvas.getContext('experimental-webgl');
    }
    if (!gl) {
        alert('Your browser does not support WebGL');
        return;
    }

    function resizeCanvas() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const displayWidth = Math.floor(window.innerWidth * dpr);
        const displayHeight = Math.floor(window.innerHeight * dpr);
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
        }
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentLava);
    const program = createProgram(gl, vertexShader, fragmentShader);
    const attrib = gl.getAttribLocation(program, 'aVertexPosition');
    const uRes = gl.getUniformLocation(program, 'uResolution');
    const uTime = gl.getUniformLocation(program, 'uTime');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, -1, -1, 2, 2);

    gl.clearColor(0, 0, 0, 0);
    gl.useProgram(program);

    function render(timeMs) {
        const t = timeMs * 0.001;
        resizeCanvas();
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(attrib);
        gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(uRes, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(uTime, t);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function setRectangle(gl, x, y, width, height) {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2,
    ]), gl.STATIC_DRAW);
}

main();
