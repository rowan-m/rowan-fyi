"use strict";

const _2PI = Math.PI * 2;

class CanvasRenderer {
  constructor(nucleus, orbits, electrons) {
    this.nCvs = nucleus;
    this.nCtx = nucleus.getContext("2d");
    this.oCvs = orbits;
    this.oCtx = orbits.getContext("2d");
    this.eCvs = electrons;
    this.eCtx = electrons.getContext("2d");
    this.initCanvas();
  }

  initCanvas() {
    this.cen = { x: this.nCvs.width / 2, y: this.nCvs.height / 2 };
    this.dim = { w: this.nCvs.width, h: this.nCvs.height };

    // nucleus
    this.nNeedsRedraw = true;
    this.nCtx.lineWidth = 3;
    this.nCtx.save();

    // electron orbits
    this.oCtx.strokeStyle = "rgba(64, 64, 64, .2)";
    this.oCtx.lineWidth = 3;
    this.oCtx.setLineDash([3, 18]);
    this.oCtx.save();

    // electrons
    this.eCtx.strokeStyle = "darkgreen";
    this.eCtx.fillStyle = "olivedrab";
    this.eCtx.lineWidth = 3;
    this.eCtx.beginPath();
    this.eCtx.arc(
      this.eCvs.width / 2,
      this.eCvs.height / 2,
      (this.eCvs.width - 3) / 2,
      0,
      _2PI,
    );
    this.eCtx.fill();
    this.eCtx.stroke();
  }

  render(atom) {
    if (this.nNeedsRedraw) {
      this.nCtx.clearRect(0, 0, this.nCvs.width, this.nCvs.height);
      const nTotal = atom.protons + atom.neutrons;
      let drewProton = false;
      let protonsDrawn = 0;
      const scaleFactor = this.dim.w * 0.002;

      for (let n = nTotal; n >= 1; n--) {
        if (!drewProton && protonsDrawn < atom.protons) {
          // protons
          this.nCtx.strokeStyle = "darkred";
          this.nCtx.fillStyle = "firebrick";

          protonsDrawn++;
          drewProton = true;
        } else {
          // neutrons
          this.nCtx.strokeStyle = "mediumblue";
          this.nCtx.fillStyle = "royalblue";

          drewProton = false;
        }

        this.nCtx.beginPath();

        const theta = 2.39998131 * n;
        const radius = scaleFactor * Math.sqrt(theta);
        const nx = Math.cos(theta) * radius;
        const ny = Math.sin(theta) * radius;

        this.nCtx.arc(
          Math.floor(this.cen.x + nx),
          Math.floor(this.cen.y + ny),
          Math.floor(this.dim.w * 0.01),
          0,
          _2PI,
        );
        this.nCtx.fill();
        this.nCtx.stroke();
      }

      this.nNeedsRedraw = false;
    }

    // electrons and orbits
    this.oCtx.clearRect(0, 0, this.oCvs.width, this.oCvs.height);
    // this.eCtx.clearRect(0, 0, this.eCvs.width, this.eCvs.height);

    atom.electrons.forEach((e) => {
      // orbits
      this.oCtx.translate(this.cen.x, this.cen.y);
      this.oCtx.rotate(e.oa);
      this.oCtx.translate(-this.cen.x, -this.cen.y);

      this.oCtx.beginPath();
      this.oCtx.ellipse(
        this.cen.x,
        this.cen.y,
        Math.floor(this.dim.w * e.w),
        Math.floor(this.dim.h * e.h),
        0,
        0,
        _2PI,
      );
      this.oCtx.stroke();

      const ex = this.cen.x + this.dim.w * e.w * Math.cos(e.ea);
      const ey = this.cen.y - this.dim.w * e.h * Math.sin(e.ea);
      this.oCtx.drawImage(this.eCvs, ex - 12, ey - 12);

      this.oCtx.resetTransform();
    });
  }
}

class AtomModel {
  constructor(structure, renderer) {
    this.initStructure(structure);

    this.updating = false;
    this.renderer = renderer;
    this.tick = this.tick.bind(this);
  }

  initStructure(structure) {
    this.name = structure.name;
    this.symbol = structure.symbol;
    this.number = structure.number;
    this.mass = structure.mass;
    // https://en.wikipedia.org/wiki/Electron_shell#List_of_elements_with_electrons_per_shell
    this.shells = structure.shells;
    // min 25, max 265 - empirical radius from https://en.wikipedia.org/wiki/Atomic_radii_of_the_elements_(data_page)
    this.radius = structure.radius;

    this.protons = this.number;
    this.neutrons = Math.ceil(this.mass) - this.number;

    this.electrons = [];
    const numShells = this.shells.length;
    const orbitUnits = 0.49 / 265;

    for (let curShell = 1; curShell <= numShells; curShell++) {
      const ePerShell = this.shells[curShell - 1];
      const orbitGap = (this.radius / numShells) * orbitUnits;

      for (let e = 1; e <= ePerShell; e++) {
        this.electrons.push({
          // orbit width
          w: orbitGap * curShell,
          // orbit height
          h: orbitGap * (curShell * 0.8),
          // orbit angle
          oa: (Math.PI / ePerShell) * e,
          // electron angle around orbit
          ea: (Math.PI / ePerShell) * -e,
          // orbit rotation direction
          or: 1,
          // electron direction around orbit
          er: -1,
          // rotation period for orbit
          op: 265 / ((this.radius / numShells) * curShell),
          // rotation period for electron around orbit
          ep: 265 / ((this.radius / numShells) * curShell),
        });
      }
    }
  }

  tick() {
    if (!this.updating) {
      this.updating = true;

      this.electrons.forEach((e) => {
        e.ea += e.er * e.ep * 0.005;

        if (e.ea >= _2PI) {
          e.ea = 0;
        }

        e.oa += e.or * e.op * 0.005;

        if (e.oa >= _2PI) {
          e.oa = 0;
        }
      });

      this.renderer.render(this);
      this.updating = false;
      self.requestAnimationFrame(this.tick);
    }
  }
}
