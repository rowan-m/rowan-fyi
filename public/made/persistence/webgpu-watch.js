"use strict";

async function initWebGPU() {
  if (!navigator.gpu) {
    console.error("WebGPU not supported on this browser.");
    document.body.innerHTML = "<h1>WebGPU not supported on this browser.</h1>";
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("No WebGPU adapter found.");
    return;
  }
  const device = await adapter.requestDevice();

  const canvas = document.querySelector("canvas.watch-hands");
  const context = canvas.getContext("webgpu");
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  // Load shaders
  const [computeWGSL, renderWGSL] = await Promise.all([
    fetch("compute.wgsl").then((r) => r.text()),
    fetch("render.wgsl").then((r) => r.text()),
  ]);

  const computeModule = device.createShaderModule({ code: computeWGSL });
  const renderModule = device.createShaderModule({ code: renderWGSL });

  // Uniform buffer: gravity (vec2f), padding(vec2f), angles (vec4f), dt (f32), theme (u32), canvasSize(vec2f)
  // Sizes: gravity=8, pad=8, angles=16, dt=4, theme=4, canvasSize=8 -> 48 bytes. Let's make it 64 to be safe.
  const uniformBufferSize = 64;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Particle buffer setup. 3 hands * 20 particles = 60 particles.
  // Struct: pos(vec2), prev_pos(vec2), dist(f32), radius(f32), pinned(f32), pad(vec3) -> 8+8+4+4+4+12 = 40 bytes per particle
  // Wait, vec2 is 8 bytes. vec3 is 12 bytes.
  // Let's explicitly define offsets.
  // pos (2xf32 = 8 bytes)
  // prev_pos (2xf32 = 8 bytes)
  // dist_from_center (1xf32 = 4 bytes)
  // radius (1xf32 = 4 bytes)
  // is_pinned (1xf32 = 4 bytes)
  // padding (3xf32 = 12 bytes)
  // Total = 40 bytes? Wait, align(16) for array elements. 40 is not a multiple of 16.
  // Let's use 4xf32 for padding to make it 16 bytes. Total = 8+8+4+4+4+16 = 44 bytes...
  // In WGSL:
  // pos: vec2f (align 8, size 8) -> offset 0
  // prev_pos: vec2f (align 8, size 8) -> offset 8
  // dist_from_center: f32 (align 4, size 4) -> offset 16
  // radius: f32 (align 4, size 4) -> offset 20
  // is_pinned: f32 (align 4, size 4) -> offset 24
  // padding: vec3f (align 16, size 12) -> offset 32.
  // Total size = 32 + 16 (because vec3 align is 16) = 48 bytes.
  // Yes, 48 bytes per particle.
  const particleSize = 48;
  const numParticles = 60;
  const initialParticleData = new ArrayBuffer(numParticles * particleSize);
  const particleView = new DataView(initialParticleData);

  const initHand = (handIdx, length, counterweight, radius) => {
    const numSegments = 20;
    const totalLen = length + counterweight;
    const segLen = totalLen / (numSegments - 1);

    for (let i = 0; i < numSegments; i++) {
      const pIdx = handIdx * numSegments + i;
      const offset = pIdx * particleSize;
      const dist = i * segLen - counterweight;

      // Start them pointing UP (angle = 0)
      particleView.setFloat32(offset + 0, 500, true); // pos.x
      particleView.setFloat32(offset + 4, 500 - dist, true); // pos.y
      particleView.setFloat32(offset + 8, 500, true); // prev_pos.x
      particleView.setFloat32(offset + 12, 500 - dist, true); // prev_pos.y
      particleView.setFloat32(offset + 16, dist, true); // dist_from_center

      // Taper the radius slightly at the tip
      let r = radius;
      if (i > numSegments - 5) r *= 1.0 - ((i - (numSegments - 5)) / 5) * 0.8;

      particleView.setFloat32(offset + 20, r, true); // radius

      // Pin the particle closest to the pivot (dist near 0) AND the tip (last particle)
      const isPinned =
        Math.abs(dist) < segLen || i === numSegments - 1 ? 1.0 : 0.0;
      particleView.setFloat32(offset + 24, isPinned, true); // is_pinned
    }
  };

  // hands: hour (len 310, cw 50, rad 16), minute (len 410, cw 50, rad 16), second (len 390, cw 50, rad 5)
  initHand(0, 310, 50, 16); // Hour
  initHand(1, 410, 50, 16); // Minute
  initHand(2, 390, 50, 5); // Second

  const particleBuffer = device.createBuffer({
    size: numParticles * particleSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint8Array(particleBuffer.getMappedRange()).set(
    new Uint8Array(initialParticleData),
  );
  particleBuffer.unmap();

  // Pipelines
  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  });

  const renderBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: particleBuffer } },
    ],
  });

  const renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: particleBuffer } },
    ],
  });

  const computePipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [computeBindGroupLayout],
  });
  const computePipeline = device.createComputePipeline({
    layout: computePipelineLayout,
    compute: { module: computeModule, entryPoint: "main" },
  });

  const renderPipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [renderBindGroupLayout],
  });
  const renderPipeline = device.createRenderPipeline({
    layout: renderPipelineLayout,
    vertex: { module: renderModule, entryPoint: "vs_main" },
    fragment: {
      module: renderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });

  // Watch setup
  let theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? 1 : 0;
  document.addEventListener("colorschemechange", (e) => {
    theme = e.detail.colorScheme === "dark" ? 1 : 0;
  });

  const _2PI = Math.PI * 2;
  const uniformData = new ArrayBuffer(uniformBufferSize);
  const uniformView = new DataView(uniformData);

  let currentAccel = { x: 0, y: 9.8, z: 0 };

  // Fake watch implementation to receive Acceleration updates
  const fakeWatch = { setAccel: (a) => (currentAccel = a) };
  const startButt = document.querySelector(".start");
  const accel = new Acceleration(startButt);
  accel.setWatch(fakeWatch);
  accel.start();

  let lastTime = performance.now();

  function frame(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // max 50ms to prevent explosion
    lastTime = timestamp;

    const time = new Date();
    const hour = time.getHours() % 12;
    const minute = time.getMinutes();
    const second = time.getSeconds();
    const millis = time.getMilliseconds();

    const secondAngle = (_2PI / 60) * second + (_2PI / 60 / 1000) * millis;
    const minuteAngle =
      (_2PI / 60) * minute +
      (_2PI / 60 / 60) * second +
      (_2PI / 60 / 60 / 1000) * millis;
    const hourAngle =
      (_2PI / 12) * hour +
      (_2PI / 12 / 60) * minute +
      (_2PI / 12 / 60 / 60) * second +
      (_2PI / 12 / 60 / 60 / 1000) * millis;

    // Update Uniforms: gravity: vec2f, padding: vec2f, angles: vec4f, dt: f32, theme: u32, canvasSize: vec2f
    uniformView.setFloat32(0, currentAccel.x, true);
    uniformView.setFloat32(4, currentAccel.y, true); // Actually wait, device orientation y is inverted compared to canvas? Canvas y is down.

    uniformView.setFloat32(16, hourAngle, true);
    uniformView.setFloat32(20, minuteAngle, true);
    uniformView.setFloat32(24, secondAngle, true);
    uniformView.setFloat32(28, 0.0, true); // angle padding

    uniformView.setFloat32(32, dt, true);
    uniformView.setUint32(36, theme, true);
    uniformView.setFloat32(40, canvas.width, true);
    uniformView.setFloat32(44, canvas.height, true);

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const commandEncoder = device.createCommandEncoder();

    // Compute pass
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(3); // 3 hands
    computePass.end();

    // Render pass
    const textureView = context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    renderPass.setPipeline(renderPipeline);
    renderPass.setBindGroup(0, renderBindGroup);
    renderPass.draw(6, 57); // 6 vertices per quad, 57 instances (3 hands * 19 segments)
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Rotate numbers like SVG version
  const _HANG = _2PI / 12;
  const numberEls = document.querySelectorAll(".hour-num>span");

  function rotateNumbers() {
    let gRot =
      (Math.atan2(currentAccel.y, currentAccel.x) * 180) / Math.PI - 90;
    numberEls.forEach((num) => {
      num.style.transform = `rotate(${num.textContent * -30 + gRot}deg)`;
    });
    requestAnimationFrame(rotateNumbers);
  }
  requestAnimationFrame(rotateNumbers);
}

initWebGPU();
