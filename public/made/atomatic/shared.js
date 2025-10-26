"use strict";

const _2PI = Math.PI * 2;

class ThreeRenderer {
  constructor(canvas) {
    this.cvs = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.cvs });
    this.resizeRendererToDisplay();
    this.initScene();

    this.atomChanged = true;
  }

  resizeRendererToDisplay() {
    this.width = this.cvs.width;
    this.height = this.cvs.height;
    const needResize =
      this.cvs.width !== this.width || this.cvs.height !== this.height;

    if (needResize) {
      this.renderer.setSize(this.width, this.height, false);
    }

    return needResize;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xfdf5e6);
    const fSize = 0.2;
    this.camera = new THREE.OrthographicCamera(
      (fSize * this.width) / -2,
      (fSize * this.width) / 2,
      (fSize * this.height) / 2,
      (fSize * this.height) / -2,
      0.1,
      1000,
    );
    this.camera.position.z = 100;

    this.scene.add(new THREE.AmbientLight(0x555555));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(1, 1, 4).normalize();
    this.scene.add(directionalLight);

    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
  }

  buildAtom(atom) {
    const nTotal = atom.protons + atom.neutrons;
    let pBudget = atom.protons;
    let nBudget = atom.neutrons;

    this.center = new THREE.Object3D();

    const protonMat = new THREE.MeshStandardMaterial({ color: 0xb0c4de }); // lightsteelblue
    const neutronMat = new THREE.MeshStandardMaterial({ color: 0xb22222 }); // firebrick
    const particleGeo = new THREE.SphereGeometry(2.7, 9, 9);
    this.nucleusCenter = new THREE.Object3D();

    const turnFraction = 1.1618;
    const radius = Math.sqrt(nTotal) * 0.1 + 2;

    for (let n = 0; n < nTotal; n++) {
      const t = n / (nTotal - 1);
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = 2 * Math.PI * turnFraction * n;
      const x = radius * Math.sin(inclination) * Math.cos(azimuth);
      const y = radius * Math.sin(inclination) * Math.sin(azimuth);
      const z = radius * Math.cos(inclination);

      let particle = null;

      if ((Math.random() >= 0.5 && pBudget > 0) || nBudget <= 0) {
        // protons
        particle = new THREE.Mesh(particleGeo, protonMat);
        pBudget--;
      } else if (nBudget > 0) {
        // neutrons
        particle = new THREE.Mesh(particleGeo, neutronMat);
        nBudget--;
      }

      particle.position.x = x + (Math.random() - 0.5) * 0.2 * radius;
      particle.position.y = y + (Math.random() - 0.5) * 0.2 * radius;
      particle.position.z = z + (Math.random() - 0.5) * 0.2 * radius;

      this.nucleusCenter.add(particle);
    }

    this.center.add(this.nucleusCenter);

    this.electrons = [];
    const orbitMat = new THREE.MeshStandardMaterial({
      color: 0xaabbaa,
      transparent: true,
      opacity: 0.1,
    });
    const electronMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23 }); // olivedrab
    const electronGeo = new THREE.SphereGeometry(1.7, 8, 8);

    atom.electrons.forEach((e) => {
      // center pivot
      const ep = new THREE.Object3D();

      // orbits
      const orbitGeo = new THREE.TorusGeometry(e.w * 200, 0.1, 3, 180);
      const orbit = new THREE.Mesh(orbitGeo, orbitMat);
      ep.add(orbit);

      // electrons
      const ec = new THREE.Mesh(electronGeo, electronMat);

      ec.position.x = e.w * 200;

      orbit.add(ec);
      orbit.rotation.x = 0.45;
      orbit.rotation.z = e.oa;

      ep.add(orbit);
      ep.rotation.z = e.ea;
      this.center.add(ep);
      this.electrons.push(ep);
    });

    this.scene.add(this.center);

    this.atomChanged = false;
  }

  render(atom) {
    if (this.atomChanged) {
      this.buildAtom(atom);
    }

    this.electrons.forEach((e, idx) => {
      // e.rotation.x += atom.electrons[idx].ep * 0.001 * (-1 + (idx % 2) * 2);
      // e.rotation.y += atom.electrons[idx].ep * 0.006 * (-1 + (idx % 2) * 2);
      e.children[0].rotation.z -= atom.electrons[idx].ep * 0.008; // * (-1 + (idx % 2) * 2);
      e.rotation.z += atom.electrons[idx].ep * 0.002;
    });

    // this.nucleusCenter.rotation.x -= 0.01;
    this.nucleusCenter.rotation.y -= 0.01;
    this.nucleusCenter.rotation.z -= 0.02;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
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
          ea: (Math.PI / ePerShell) * e,
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
