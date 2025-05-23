'use strict';

class Acceleration {
  constructor(startButt) {
    this.watch = null;
    this.worker = null;
    this.startButt = startButt;
    this.updated = Date.now();
    this.smoothing = 800;
    this.sensorDirection = 1;
    this.x = 0;
    this.y = 9.8;
    this.z = 0;

    this.start = this.start.bind(this);
    this.request = this.request.bind(this);
    this.handle = this.handle.bind(this);
  }

  setWatch(watch) {
    this.watch = watch;
  }

  setWorker(worker) {
    this.worker = worker;
  }

  start() {
    if (window.DeviceMotionEvent) {
      if (DeviceMotionEvent.requestPermission) {
        this.startButt.addEventListener('click', this.request);
        this.startButt.style.display = 'block';
      } else {
        window.addEventListener('deviceorientation', this.handle);
      }
    }
  }

  request() {
    DeviceMotionEvent.requestPermission().then(response => {
      if (response == 'granted') {
        this.startButt.style.display = 'none';
        this.sensorDirection = -1;
        window.addEventListener('deviceorientation', this.handle);
      }
    });
  }

  handle(e) {

    const now = Date.now();
    const elapsedTime = now - this.updated;

    this.x +=
      (elapsedTime *
        (e.gamma * this.sensorDirection -
          this.x)) /
      this.smoothing;
    this.y +=
      (elapsedTime *
        (e.beta * this.sensorDirection -
          this.y)) /
      this.smoothing;
    this.z +=
      (elapsedTime *
        (e.alpha * this.sensorDirection -
          this.z)) /
      this.smoothing;
    this.updated = now;

    if (this.worker !== null ) {
      this.worker.postMessage({
        cmd: 'accel',
        accel: this.x + ',' + this.y + ',' + this.z
      });
    } else if (this.watch !== null) {
      this.watch.setAccel({ x: this.x, y: this.y, z: this.z });
    }
  }
}
