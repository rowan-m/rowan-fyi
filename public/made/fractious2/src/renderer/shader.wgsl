struct Uniforms {
  center: vec2<f32>, // This is NOT the center of the fractal, but the offset relative to High Precision Center?
                     // Actually, 'center' here usually acts as the delta_0 (view offset).
                     // But we pass delta_0 via UVs.
                     // We probably only need scale/zoom and maybe aspect ratio.
                     // Wait, for perturbation, we render details relative to the reference point.
                     // The screen center maps to the Reference Point.
                     // So specific pixel (u,v) corresponds to Reference + (u,v)*scale.
                     // So delta_0 = (u,v)*scale.
  zoom: f32, // The scale factor.
  aspect_ratio: f32,
  iter: u32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> reference_orbit: array<vec2<f32>>; // Passed as interleaved f32 (Real, Imag)

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  
  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertex_index], 0.0, 1.0);
  output.uv = pos[vertex_index]; // [-1, 1]
  return output;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  // Correction for aspect ratio
  var c_delta = uv;
  c_delta.x = c_delta.x * uniforms.aspect_ratio;
  c_delta = c_delta * uniforms.zoom + uniforms.center; // This is delta_0
  
  var delta = vec2<f32>(0.0, 0.0);
  var z = vec2<f32>(0.0, 0.0); // We might track Z for escape check?
  // Actually we need Xn from buffer.
  
  var i: u32 = 0u;
  // We need to fetch from storage buffer.
  // Note: Storage buffer size must match max_iter.
  
  loop {
    if (i >= uniforms.iter) { break; }
    
    // Load Xn (Reference)
    // reference_orbit is array<vec2<f32>>.
    let xn = reference_orbit[i]; 
    
    // delta_{n+1} = 2 X_n delta_n + delta_n^2 + delta_0
    // Complex multiplication:
    // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
    
    // 2 X_n delta_n
    let two_xn_delta = 2.0 * vec2<f32>(
      xn.x * delta.x - xn.y * delta.y,
      xn.x * delta.y + xn.y * delta.x
    );
    
    // delta_n^2
    let delta_sq = vec2<f32>(
        delta.x * delta.x - delta.y * delta.y,
        2.0 * delta.x * delta.y
    );
    
    delta = two_xn_delta + delta_sq + c_delta;
    
    // Check escape: |X_{n+1} + delta_{n+1}|^2 > 4
    // We need X_{n+1}. We can look ahead? 
    // Or just use X_n and delta_n to check |Z_n| > 4 before update?
    // Usually check |Z_{n+1}|. So we need X_{n+1}.
    // But X_{n+1} is the next element in array.
    // Be careful with index bound.
    // If i+1 >= iter, likely didn't escape or we stop.
    // We can also compute X_{n+1} from X_n? No, X_n comes from high precision. Use buffer.
    
    let next_i = i + 1u;
    if (next_i < arrayLength(&reference_orbit)) {
       let xn_next = reference_orbit[next_i];
       let zn = xn_next + delta;
       if (dot(zn, zn) > 4.0) {
           i = next_i; // Use the iteration count
           break;
       }
    } else {
       // If we run out of reference orbit, we assume inside or breakdown?
       break;
    }
    
    i = i + 1u;
  }
  
  if (i >= uniforms.iter) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }
  
  // Smooth coloring could be added here (requires Z modulus), but integer steps + palette is a good start.
  // Using a cycling palette based on iteration count.
  // Period of roughly 50 iterations.
  let t = f32(i) * 0.05; 
  
  // Inigo Quilez Cosine Palette
  // a + b * cos( 2*pi * (c*t + d) )
  // Theme: Electric/Rainbowish
  let a = vec3<f32>(0.5, 0.5, 0.5);
  let b = vec3<f32>(0.5, 0.5, 0.5);
  let c = vec3<f32>(1.0, 1.0, 1.0);
  let d = vec3<f32>(0.00, 0.10, 0.20);
  
  let col = a + b * cos(6.28318 * (c * t + d));
  
  return vec4<f32>(col, 1.0);
}
