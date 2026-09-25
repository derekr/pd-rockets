// Decorative, deliberately independent of the server-rendered Kanban DOM.
export {};
const stage = document.querySelector<HTMLElement>(".signal-stage");
const canvas = stage?.querySelector<HTMLCanvasElement>("canvas.signal-atmosphere");
if (stage && canvas) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, powerPreference: "low-power" });
  if (gl) {
    const vertexSource = `#version 300 es
    void main() {
      vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
    }`;
    const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float time;
    out vec4 color;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
      float wave = sin(p.x * 5.0 + time * 0.28 + sin(p.y * 5.0 - time * 0.18)) * 0.5 + 0.5;
      float ribbon = exp(-30.0 * pow(p.y - 0.16 * sin(p.x * 3.0 + time * 0.22), 2.0));
      float halo = exp(-6.0 * length(uv - pointer));
      float grain = fract(sin(dot(floor(gl_FragCoord.xy / 3.0), vec2(12.9898, 78.233))) * 43758.5453);
      vec3 violet = vec3(0.38, 0.31, 0.78);
      vec3 mint = vec3(0.60, 0.94, 0.65);
      vec3 rgb = mix(violet, mint, wave) * (ribbon * 0.65 + halo * 0.17 + grain * 0.035);
      color = vec4(rgb, 0.72);
    }`;
    const shader = (type: number, source: string) => {
      const compiled = gl.createShader(type);
      if (!compiled) return null;
      gl.shaderSource(compiled, source);
      gl.compileShader(compiled);
      if (gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) return compiled;
      gl.deleteShader(compiled);
      return null;
    };
    const vertex = shader(gl.VERTEX_SHADER, vertexSource);
    const fragment = shader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = vertex && fragment && gl.createProgram();
    if (program && vertex && fragment) {
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.useProgram(program);
        const size = gl.getUniformLocation(program, "resolution");
        const position = gl.getUniformLocation(program, "pointer");
        const clock = gl.getUniformLocation(program, "time");
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        let visible = false;
        let frame = 0;
        let pointer = { x: 0.5, y: 0.5 };
        const draw = (time: number) => {
          frame = 0;
          if (!visible || document.hidden) return;
          const ratio = Math.min(devicePixelRatio || 1, 1.5);
          const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
          const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
          }
          gl.uniform2f(size, width, height);
          gl.uniform2f(position, pointer.x, pointer.y);
          gl.uniform1f(clock, reduced.matches ? 0 : time / 1000);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          if (!reduced.matches) frame = requestAnimationFrame(draw);
        };
        const schedule = () => {
          if (visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
        };
        new IntersectionObserver(([entry]) => {
          visible = !!entry?.isIntersecting;
          if (!visible && frame) cancelAnimationFrame(frame);
          if (!visible) frame = 0;
          schedule();
        }).observe(stage);
        stage.addEventListener("pointermove", (event) => {
          const rect = stage.getBoundingClientRect();
          pointer = { x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height };
          if (reduced.matches) schedule();
        });
        reduced.addEventListener("change", schedule);
        document.addEventListener("visibilitychange", schedule);
      }
    }
  }
}
