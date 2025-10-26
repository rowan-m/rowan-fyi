"use strict";

class WatchHand {
  constructor(config) {
    this.handL = config.handL;

    this.faceR = config.faceR;
    this.pointXR = config.pointXR;
    this.pointYR = config.pointYR;

    this.pivotOR = config.pivotOR;
    this.pivotIR = config.pivotIR;

    this.armW = config.armW;

    // the central pivot needs to centre on the watch centre
    // slightly fudged for where the arm joins the pivot
    this.armL = this.handL - this.pointYR * 2 - this.pivotOR * 0.9;

    this.points = {
      l1: { x: 0, y: this.armL * 0.5, orig: this.armL * 0.5 },
      l2: { x: 0, y: this.armL * 0.5, orig: this.armL * 0.5 },
      r3: { x: 0, y: -this.armL * 0.5, orig: -this.armL * 0.5 },
      r4: { x: 0, y: -this.armL * 0.5, orig: -this.armL * 0.5 },
    };

    this.offset = this.faceR - this.handL;

    // static path segments
    this.path = [
      // initial position
      `M ${this.faceR} ${this.faceR - this.handL}` +
        // upper left-side arm point
        `a${this.pointXR} ${this.pointYR} 1 0 1 ${-this.pointXR} ${
          this.pointYR
        }` +
        `a${this.pointXR - this.armW / 2} ${this.pointYR} 1 0 1 ${
          this.pointXR - this.armW / 2
        } ${this.pointYR}`,
      // central pivot
      `a${this.pivotOR} ${this.pivotOR} 0 1 0 ${this.armW} 0`,
      // upper right-side arm point
      `a${this.pointXR - this.armW / 2} ${this.pointYR} 1 0 1 ${
        this.pointXR - this.armW / 2
      } ${-this.pointYR}` +
        `a${this.pointXR} ${this.pointYR} 1 0 1 ${-this.pointXR} ${-this
          .pointYR}` +
        `z` +
        // central pivot hole
        `M${this.faceR} ${this.faceR + this.pivotIR}` +
        `a${this.pivotIR} ${this.pivotIR} 0 1 1 0 ${-this.pivotIR * 2}` +
        `a${this.pivotIR} ${this.pivotIR} 0 1 1 0 ${this.pivotIR * 2}` +
        `z`,
    ];

    this.melt = this.melt.bind(this);
    this.genPath = this.genPath.bind(this);
  }

  melt(angle, accel) {
    // rotate the gravity vector by the angle of the hand
    const aX = accel.x * Math.cos(-angle) - accel.y * Math.sin(-angle);
    const aY = accel.y * Math.cos(-angle) + accel.x * Math.sin(-angle);

    //
    const radG = Math.atan2(aX, aY);
    const sradG = Math.sin(radG);
    const cradG = Math.cos(radG);

    for (var i in this.points) {
      let xFactor = 1;

      if (
        (this.points[i].orig > 0 && aX < 0) ||
        (this.points[i].orig < 0 && aX > 0)
      ) {
        xFactor = 1.15;
      }

      this.points[i].x = sradG * this.armL * xFactor;
      this.points[i].y = this.points[i].orig + cradG * this.armL * 0.4;
    }
  }

  genPath() {
    // initial position + upper left-side arm point
    return (
      this.path[0] +
      // left-side arm segment
      "c" +
      this.points.l1.x +
      " " +
      this.points.l1.y +
      " " +
      this.points.l2.x +
      " " +
      this.points.l2.y +
      " 0 " +
      this.armL +
      // central pivot
      this.path[1] +
      // right-side arm segment
      "c" +
      this.points.r3.x +
      " " +
      this.points.r3.y +
      " " +
      this.points.r4.x +
      " " +
      this.points.r4.y +
      " 0 " +
      -this.armL +
      // upper right-side arm point + central pivot hole
      this.path[2]
    );
  }
}

class Watch {
  constructor(hands, renderer) {
    this._2PI = Math.PI * 2;

    this.hands = hands;
    this.renderer = renderer;

    this.accel = { x: 0, y: 9.8, z: 0 };

    this.tick = this.tick.bind(this);
    this.setAccel = this.setAccel.bind(this);

    this.updating = false;
  }

  setAccel(accel) {
    this.accel = accel;
  }

  tick() {
    if (!this.updating) {
      this.updating = true;
      const time = new Date();
      const hour = time.getHours() % 12;
      const minute = time.getMinutes();
      const second = time.getSeconds();
      const millis = time.getMilliseconds();

      const secondAngle =
        (this._2PI / 60) * second + (this._2PI / 60 / 1000) * millis;
      const minuteAngle =
        (this._2PI / 60) * minute +
        (this._2PI / 60 / 60) * second +
        (this._2PI / 60 / 60 / 1000) * millis;
      const hourAngle =
        (this._2PI / 12) * hour +
        (this._2PI / 12 / 60) * minute +
        (this._2PI / 12 / 60 / 60) * second +
        (this._2PI / 12 / 60 / 60 / 1000) * millis;

      this.hands.second.melt(secondAngle, this.accel);
      this.hands.minute.melt(minuteAngle, this.accel);
      this.hands.hour.melt(hourAngle, this.accel);

      this.renderer.render(this, hourAngle, minuteAngle, secondAngle);

      this.updating = false;
      self.requestAnimationFrame(this.tick);
    }
  }
}

class CanvasRenderer {
  constructor(canvas, scale, theme) {
    this._2PI = Math.PI * 2;
    this._HANG = this._2PI / 12;

    this.theme = theme ? theme : "day";
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");

    this.hmCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
    this.hmCtx = this.hmCanvas.getContext("2d");
    this.resize(scale);
    this.initCtx();
    this.initHmCtx();
  }

  resize(scale) {
    this.scale = scale;
    this.canvas.width = 1000 * this.scale;
    this.canvas.height = 1000 * this.scale;
    this.hmCanvas.width = 1000 * this.scale;
    this.hmCanvas.height = 1000 * this.scale;

    this.ctx.scale(this.scale, this.scale);
    this.hmCtx.scale(this.scale, this.scale);

    this.initCtx();
    this.initHmCtx();
    this.initNumbers();
  }

  initCtx() {
    this.ctx.lineJoin = "round";
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = 20;
    // this.ctx.imageSmoothingEnabled = false;

    if (this.theme === "night") {
      this.ctx.fillStyle = "hsl(156,90%,55%)";
      this.ctx.strokeStyle = "hsl(156,90%,35%)";
      this.ctx.shadowColor = "hsl(156,90%,50%,0.8)";
      this.ctx.shadowBlur = 40;
    } else {
      this.ctx.fillStyle = "#e99";
      this.ctx.strokeStyle = "#e66";
      this.ctx.shadowColor = 0;
      this.ctx.shadowBlur = 0;
    }
  }

  initHmCtx() {
    this.hmCtx.lineJoin = "round";
    this.hmCtx.lineCap = "round";
    this.hmCtx.lineWidth = 20;
    this.hmCtx.imageSmoothingEnabled = false;

    if (this.theme === "night") {
      this.hmCtx.strokeStyle = "hsl(156,90%,35%)";
      this.hmCtx.fillStyle = "hsl(156,90%,75%)";
      this.hmCtx.shadowColor = "hsl(156,90%,50%,0.8)";
      this.hmCtx.shadowBlur = 40;
    } else {
      this.hmCtx.strokeStyle = "#666";
      this.hmCtx.fillStyle = "#999";
      this.hmCtx.shadowColor = 0;
      this.hmCtx.shadowBlur = 0;
    }
  }

  initNumbers() {
    this.nums = [];

    for (let i = 1; i <= 12; i++) {
      const num = new OffscreenCanvas(200 * this.scale, 200 * this.scale);
      const ntx = num.getContext("2d");
      ntx.scale(this.scale, this.scale);
      ntx.textAlign = "center";
      ntx.textBaseline = "middle";
      ntx.font = `bold 100px serif`;
      ntx.imageSmoothingEnabled = false;

      if (this.theme === "night") {
        ntx.fillStyle = "hsl(156,90%,60%)";
        ntx.shadowColor = "hsl(156,100%,90%,1)";
        ntx.shadowBlur = 10;
      } else {
        ntx.fillStyle = "#333";
        ntx.shadowColor = 0;
        ntx.shadowBlur = 0;
      }

      ntx.fillText(i, 100, 100);
      this.nums.push(num);
    }
  }

  render(watch, hourAngle, minuteAngle, secondAngle) {
    this.ctx.clearRect(0, 0, 1000, 1000);
    this.hmCtx.clearRect(0, 0, 1000, 1000);

    this.drawNumbers(watch);

    this.drawHand(secondAngle, watch.hands.second.genPath(), this.ctx);

    this.drawHand(hourAngle, watch.hands.hour.genPath(), this.hmCtx);
    this.drawHand(minuteAngle, watch.hands.minute.genPath(), this.hmCtx);

    this.ctx.drawImage(this.hmCanvas, 0, 0, 1000, 1000);
  }

  setTheme(theme) {
    this.theme = theme ? theme : "day";

    this.initCtx();
    this.initHmCtx();
    this.initNumbers();
  }

  drawHand(angle, path, ctx) {
    ctx.save();
    ctx.translate(500, 500);
    ctx.rotate(angle);
    ctx.translate(-500, -500);

    const p = new Path2D(path);
    ctx.stroke(p);
    ctx.fill(p);

    ctx.restore();
  }

  drawNumbers(watch) {
    const angle = Math.atan2(watch.accel.x, watch.accel.y);

    this.ctx.save();

    for (let i = 1; i <= 12; i++) {
      this.ctx.translate(500, 500);
      this.ctx.rotate(this._HANG);
      this.ctx.translate(0, -400);
      this.ctx.rotate(i * -this._HANG - angle);
      this.ctx.drawImage(this.nums[i - 1], -100, -100, 200, 200);
      this.ctx.rotate(i * this._HANG + angle);
      this.ctx.translate(-500, -100);
    }

    this.ctx.restore();
  }
}

class SvgRenderer {
  constructor(hourHandEl, minuteHandEl, secondHandEl, numberEls) {
    this.hourHandEl = hourHandEl;
    this.minuteHandEl = minuteHandEl;
    this.secondHandEl = secondHandEl;
    this.numberEls = numberEls;
  }

  rotateNumbers(watch) {
    let gRot = (Math.atan2(watch.accel.y, watch.accel.x) * 180) / Math.PI - 90;

    this.numberEls.forEach((num) => {
      num.style.transform = `rotate(${num.textContent * -30 + gRot}deg)`;
    });
  }

  render(watch, hourAngle, minuteAngle, secondAngle) {
    this.secondHandEl.style.transform = `rotate(${secondAngle}rad)`;
    this.minuteHandEl.style.transform = `rotate(${minuteAngle}rad)`;
    this.hourHandEl.style.transform = `rotate(${hourAngle}rad)`;

    this.secondHandEl.setAttribute("d", watch.hands.second.genPath());
    this.minuteHandEl.setAttribute("d", watch.hands.minute.genPath());
    this.hourHandEl.setAttribute("d", watch.hands.hour.genPath());

    this.rotateNumbers(watch);
  }
}

const hands = {
  second: new WatchHand({
    handL: 390,
    faceR: 500,
    pointXR: 10,
    pointYR: 10,
    pivotOR: 30,
    pivotIR: 10,
    armW: 5,
  }),
  minute: new WatchHand({
    handL: 410,
    faceR: 500,
    pointXR: 35,
    pointYR: 55,
    pivotOR: 35,
    pivotIR: 10,
    armW: 33,
  }),
  hour: new WatchHand({
    handL: 310,
    faceR: 500,
    pointXR: 35,
    pointYR: 55,
    pivotOR: 35,
    pivotIR: 10,
    armW: 33,
  }),
};
