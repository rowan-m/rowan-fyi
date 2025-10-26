"use strict";

self.importScripts("/shared.js");

let atom = null;
let renderer = null;

self.onmessage = function (e) {
  switch (e.data.cmd) {
    case "start":
      renderer = new CanvasRenderer(
        e.data.nucleus,
        e.data.orbits,
        e.data.electrons,
      );
      atom = new AtomModel(e.data.structure, renderer);
      self.requestAnimationFrame(atom.tick);
      break;
  }
};
