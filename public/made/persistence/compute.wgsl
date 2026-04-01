struct Uniforms {
    gravity: vec2f,
    angles: vec4f, // x: hour, y: minute, z: second. (vec4f for alignment)
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

@group(0) @binding(1) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(3)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let hand_idx = global_id.x;
    if (hand_idx >= 3u) { return; }
    
    let NUM_PARTICLES = 20u;
    let start_idx = hand_idx * NUM_PARTICLES;
    let end_idx = start_idx + NUM_PARTICLES;
    
    let target_angle = uniforms.angles[hand_idx];
    let target_dir = vec2f(sin(target_angle), -cos(target_angle));
    let center = vec2f(500.0, 500.0);
    
    // 1. Verlet integration & apply forces
    for (var i = start_idx; i < end_idx; i++) {
        var p = particles[i];
        
        if (p.is_pinned > 0.0) {
            p.pos = center + target_dir * p.dist_from_center;
            p.prev_pos = p.pos;
        } else {
            let vel = (p.pos - p.prev_pos) * 0.98; // damping
            let target_pos = center + target_dir * p.dist_from_center;
            
            // Shape preservation force (weak spring to target position)
            let restore_accel = (target_pos - p.pos) * 15.0; 
            
            p.prev_pos = p.pos;
            
            // Gravity is scaled to match the visual feel of the canvas version
            let grav_accel = uniforms.gravity * 2000.0;
            
            p.pos = p.pos + vel + (grav_accel + restore_accel) * uniforms.dt * uniforms.dt;
        }
        particles[i] = p;
    }
    
    // 2. Constraint Projection (PBD) - ensures the hand acts like a rope/jelly
    for (var iter = 0u; iter < 15u; iter++) {
        for (var i = start_idx; i < end_idx - 1u; i++) {
            var p1 = particles[i];
            var p2 = particles[i + 1u];
            
            let diff = p1.pos - p2.pos;
            let dist = length(diff);
            if (dist > 0.0) {
                let rest_dist = abs(p2.dist_from_center - p1.dist_from_center);
                let err = dist - rest_dist;
                let dir = diff / dist;
                
                let inv_m1 = 1.0 - p1.is_pinned;
                let inv_m2 = 1.0 - p2.is_pinned;
                let total_inv_m = inv_m1 + inv_m2;
                
                if (total_inv_m > 0.0) {
                    let correction = (dir * err) / total_inv_m;
                    // multiply by 0.5 for jelly-like springiness instead of rigid rope
                    let stiffness = 0.8; 
                    p1.pos -= correction * inv_m1 * stiffness;
                    p2.pos += correction * inv_m2 * stiffness;
                }
                
                particles[i] = p1;
                particles[i + 1u] = p2;
            }
        }
    }
}
