---
title: Fractious fractals
location: https://fractious-deep.web.app/
image: preview.jpg
description: Deep zooms and peak performance rendering the Mandelbrot set with Wasm and WebGPU.
pubDate: 2026-03-24
---

One of my side projects, since way back in lockdown, has been building an app to explore and render the Mandelbrot set. My first complete version sat on top of a pretty heavy WebGL shader with its own double precision float implementation. However, I was still hitting the maximum zoom depth quicker than I wanted. The solution and the next version was an entire rewrite using a Wasm and WebGPU to implement perturbation theory for rendering. 