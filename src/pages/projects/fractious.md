---
layout: /src/layouts/MarkdownProjectLayout.astro
title: Fractious
location: https://fractious.glitch.me/
image: ./images/fractious.png
description: A WebGL-based viewer for the Mandelbrot set.
---
A WebGL-based viewer for the Mandelbrot set. This is cobbled together from a variety of sources

The core shader implementation comes from:
<http://blog.hvidtfeldts.net/index.php/2012/07/double-precision-in-opengl-and-webgl/>
by <https://twitter.com/syntopiadk>

With an updated version from:
<https://gist.github.com/LMLB/4242936fe79fb9de803c20d1196db8f3>
by <https://github.com/LMLB>

In turn, these are based on a Fortran-based implementation for arbitrary floating point numbers:
<https://www.davidhbailey.com/dhbsoftware/>
by <https://twitter.com/math_scholar>

Rendered to a simple `webgl2` context from:
<https://gist.github.com/strangerintheq/27b8fc4e53432d8b9284364713ce8608>
by <https://twitter.com/stranger_intheq>

Buried in the shader is a version of this colouring method:
by <https://twitter.com/iquilezles>