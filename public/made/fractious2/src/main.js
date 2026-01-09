import init, { calculate_reference, add_coord, init_hooks, find_best_anchor, sub_coord } from '../wasm/pkg/wasm.js';
import shaderCode from './renderer/shader.wgsl?raw';

async function run() {
  await init();
  init_hooks();
  console.log("Wasm initialized");

  const canvas = document.getElementById('fractal');
  if (!navigator.gpu) {
    console.error("WebGPU not supported");
    document.body.innerHTML = "WebGPU not supported in this browser.";
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.error("No WebGPU adapter found");
    return;
  }
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });

  // State
  let refX = "-0.75";
  let refY = "0.0";
  let centerX = refX;
  let centerY = refY;

  let zoom = 1.0;
  let targetZoom = 1.0;
  let iter = 200;
  let renderIter = 200;

  let needUpdateRef = true;

  let offsetX = 0.0;
  let offsetY = 0.0;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;

  const uniformBufferSize = 32;
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  let referenceOrbitSize = iter * 2 * 4;
  let referenceOrbitBuffer = device.createBuffer({
    size: Math.max(referenceOrbitSize, 16),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const module = device.createShaderModule({ code: shaderCode });

  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module,
      entryPoint: 'vs_main',
    },
    fragment: {
      module,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  let bindGroup;

  const elDouble = {
    c_re: document.getElementById('c_re'),
    c_im: document.getElementById('c_im'),
    zoom: document.getElementById('zoom'),
    iterOverride: document.getElementById('iterOverride'),
    iterCount: document.getElementById('iterCount'),
  };

  function updateUI() {
    elDouble.c_re.textContent = centerX.substring(0, 15);
    elDouble.c_im.textContent = centerY.substring(0, 15);
    elDouble.zoom.textContent = zoom.toExponential(2);
    if (!elDouble.iterOverride.checked) {
      elDouble.iterCount.value = iter;
    }
  }

  function createBindGroup() {
    bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: { buffer: referenceOrbitBuffer } },
      ],
    });
  }

  function debounce(func, wait) {
    let timeout;
    let cancel = () => clearTimeout(timeout);
    let wrapped = function (...args) {
      cancel();
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
    wrapped.cancel = cancel;
    return wrapped;
  }

  // Update Reference Orbit with Auto-Commit
  const commitAndRecalc = debounce(() => {
    // Current logical center
    // Note: centerX/Y are already updated in interact()

    // Auto-Iteration or Manual Override
    if (elDouble.iterOverride.checked) {
      iter = parseInt(elDouble.iterCount.value);
    } else {
      const logZoom = Math.log10(zoom);
      iter = Math.floor(5000 + 1500 * Math.abs(logZoom));
    }

    updateReference();
  }, 500);

  let isCalculating = false;

  function updateReference() {
    if (isCalculating) return;
    isCalculating = true;

    console.log("Optimize reference...", centerX, centerY, iter);
    elDouble.c_re.textContent = "Optimizing...";

    setTimeout(() => {
      try {
        // Find best anchor near the center (scan grid)
        // Pass approximate scale (1/zoom)
        const scale = 1.0 / zoom;
        const aspect = canvas.width / canvas.height;
        const bestAnchor = find_best_anchor(centerX, centerY, scale, aspect, iter);
        refX = bestAnchor[0];
        refY = bestAnchor[1];

        console.log("Calculating reference orbit for", refX, refY);
        const orbit = calculate_reference(refX, refY, iter);

        offsetX = sub_coord(centerX, refX);
        offsetY = sub_coord(centerY, refY);

        const orbitF32 = new Float32Array(orbit);

        const requiredSize = orbitF32.byteLength;
        if (requiredSize > referenceOrbitSize) {
          referenceOrbitBuffer.destroy();
          referenceOrbitSize = requiredSize;
          referenceOrbitBuffer = device.createBuffer({
            size: referenceOrbitSize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
          });
        }

        device.queue.writeBuffer(referenceOrbitBuffer, 0, orbitF32);
        createBindGroup();

        renderIter = iter;
        updateUI();
      } catch (e) {
        console.error("Error calculating reference:", e);
      } finally {
        isCalculating = false;
        needUpdateRef = false;
      }
    }, 10);
  }

  function interact() {
    commitAndRecalc();
  }

  function frame() {
    if (needUpdateRef) {
      updateReference();
    }

    // Smooth zoom
    zoom += (targetZoom - zoom) * 0.1;
    updateUI();


    const aspect = canvas.width / canvas.height;
    const uniformData = new ArrayBuffer(uniformBufferSize);
    const dv = new DataView(uniformData);

    dv.setFloat32(0, offsetX, true);
    dv.setFloat32(4, offsetY, true);
    dv.setFloat32(8, zoom, true);
    dv.setFloat32(12, aspect, true);
    dv.setUint32(16, renderIter, true);

    device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    passEncoder.setPipeline(pipeline);
    if (bindGroup) {
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(6);
    }
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  }

  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.min(width * dpr, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height * dpr, device.limits.maxTextureDimension2D));
    }
  });
  observer.observe(canvas);

  const crosshair = document.getElementById('crosshair');

  canvas.addEventListener('pointerdown', e => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    crosshair.style.opacity = '1';
  });

  canvas.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    const aspect = canvas.width / canvas.height;
    const widthComplex = 2.0 * zoom * aspect;
    const heightComplex = 2.0 * zoom;

    const scaleX = widthComplex / canvas.width;
    const scaleY = heightComplex / canvas.height;

    offsetX -= dx * scaleX;
    offsetY += dy * scaleY;

    centerX = add_coord(refX, offsetX);
    centerY = add_coord(refY, offsetY);
    updateUI();
    interact();
  });

  canvas.addEventListener('pointerup', e => {
    isDragging = false;
    crosshair.style.opacity = '0';
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 1.0 / 1.1;
    targetZoom *= factor;
    interact();
  }, { passive: false });

  document.getElementById('zoomIn').onclick = () => { targetZoom /= 1.5; interact(); };
  document.getElementById('zoomOut').onclick = () => { targetZoom *= 1.5; interact(); };

  document.getElementById('reset').onclick = () => {
    refX = "-0.75"; refY = "0.0";
    centerX = refX; centerY = refY;
    offsetX = 0; offsetY = 0;
    zoom = 1.0;
    targetZoom = 1.0;
    commitAndRecalc.cancel();
    iter = 200;
    elDouble.iterOverride.checked = false; // Reset override
    updateReference();
  };

  elDouble.iterCount.addEventListener('change', () => {
    if (elDouble.iterOverride.checked) {
      commitAndRecalc();
    }
  });

  elDouble.iterOverride.addEventListener('change', () => {
    if (elDouble.iterOverride.checked) {
      // Immediately apply manual value
      iter = parseInt(elDouble.iterCount.value);
      updateReference();
    } else {
      // Revert to auto behavior (will happen on next interact or we can force it)
      commitAndRecalc();
    }
  });

  updateUI();
  updateReference();
  requestAnimationFrame(frame);
}

run();
