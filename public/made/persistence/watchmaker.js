"use strict";

self.importScripts("shared.js");

let watch = null;
let renderer = null;

self.onmessage = function (e) {
  switch (e.data.cmd) {
    case "start":
      renderer = new CanvasRenderer(e.data.canvas, e.data.scale, e.data.theme);
      watch = new Watch(hands, renderer);
      self.requestAnimationFrame(watch.tick);
      break;
    case "accel":
      const a = e.data.accel.split(",");
      watch.setAccel({ x: a[0], y: a[1], z: a[2] });
      break;
    case "theme":
      renderer.setTheme(e.data.theme);
      break;
    case "resize":
      renderer.resize(e.data.scale);
      break;
  }
};
