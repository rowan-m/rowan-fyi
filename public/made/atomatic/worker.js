"use strict";

self.importScripts("shared.js");
self.importScripts("three.js");

let atom = null;
let renderer = null;

self.onmessage = function (e) {
  switch (e.data.cmd) {
    case "start":
      renderer = new ThreeRenderer(e.data.canvas);
      atom = new AtomModel(e.data.structure, renderer);
      self.requestAnimationFrame(atom.tick);
      break;
  }
};
