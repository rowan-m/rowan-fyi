struct Uniforms {
    gravity: vec2f,
    angles: vec4f,
    dt: f32,
    theme: u32,
    canvasSize: vec2f,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct Particle {
    pos: vec2f,
    prev_pos: vec2f,
    dist_from_center: f32,
    radius: f32,
    is_pinned: f32,
    padding: vec3f,
}
@group(0) @binding(1) var<storage, read> particles: array<Particle>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) color: vec3f,
}

// Draw a segment using a thick quad
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32, @builtin(instance_index) instance_index: u32) -> VertexOutput {
    var out: VertexOutput;
    
    // 3 hands * 19 segments = 57 instances
    let segments_per_hand = 19u;
    let hand_type = instance_index / segments_per_hand;
    let segment_idx = instance_index % segments_per_hand;
    let p_idx = hand_type * 20u + segment_idx;
    
    let p1 = particles[p_idx];
    let p2 = particles[p_idx + 1u];
    
    let dir = p2.pos - p1.pos;
    let len = length(dir);
    let n_dir = dir / (len + 0.0001);
    let normal = vec2f(-n_dir.y, n_dir.x);
    
    // We expand the segment slightly beyond p1 and p2 to overlap nicely
    let overlap = 1.0;
    
    var world_pos = vec2f(0.0);
    var uv = vec2f(0.0);
    
    if (vertex_index == 0u) { 
        world_pos = p1.pos - normal * p1.radius - n_dir * overlap; 
        uv = vec2f(-1.0, -1.0); 
    }
    else if (vertex_index == 1u) { 
        world_pos = p2.pos - normal * p2.radius + n_dir * overlap; 
        uv = vec2f(1.0, -1.0); 
    }
    else if (vertex_index == 2u) { 
        world_pos = p1.pos + normal * p1.radius - n_dir * overlap; 
        uv = vec2f(-1.0, 1.0); 
    }
    else if (vertex_index == 3u) { 
        world_pos = p1.pos + normal * p1.radius - n_dir * overlap; 
        uv = vec2f(-1.0, 1.0); 
    }
    else if (vertex_index == 4u) { 
        world_pos = p2.pos - normal * p2.radius + n_dir * overlap; 
        uv = vec2f(1.0, -1.0); 
    }
    else if (vertex_index == 5u) { 
        world_pos = p2.pos + normal * p2.radius + n_dir * overlap; 
        uv = vec2f(1.0, 1.0); 
    }

    let ndc_x = (world_pos.x / 500.0) - 1.0;
    let ndc_y = 1.0 - (world_pos.y / 500.0);
    out.position = vec4f(ndc_x, ndc_y, 0.0, 1.0);
    out.uv = uv;
    
    // Colors
    var col = vec3f(0.2);
    if (uniforms.theme == 1u) { // night
        if (hand_type == 2u) { col = vec3f(0.18, 0.74, 0.55); } // hsl(156,90%,55%) roughly
        else { col = vec3f(0.18, 0.74, 0.55); } 
    } else { // day
        if (hand_type == 2u) { col = vec3f(0.93, 0.4, 0.4); } // #e66
        else { col = vec3f(0.4, 0.4, 0.4); } // #666
    }
    out.color = col;
    
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
    // Round the ends of the segment if it's the tip
    let x_dist = abs(in.uv.x);
    let alpha = smoothstep(1.0, 0.95, x_dist); // antialiasing on sides
    return vec4f(in.color, alpha);
}
