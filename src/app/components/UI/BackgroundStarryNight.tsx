// src/app/components/Background.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const Background: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    const scene = new THREE.Scene();
    let dotMatrix: THREE.Points;
    let frameId: number;
    
    // Star animation parameters
    const MAX_ACTIVE_STARS = 8;  // Maximum number of stars shining at once
    const MIN_STAR_DURATION = 800;  // Min duration of star animation in ms
    const MAX_STAR_DURATION = 2000;  // Max duration of star animation in ms
    const activeStars = new Map();  // Track currently active stars
    
    function init() {
      scene.background = new THREE.Color(0x111111);
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const left = -width / 2;
      const right = width / 2;
      const top = height / 2;
      const bottom = -height / 2;
      camera = new THREE.OrthographicCamera(left, right, top, bottom, -1000, 1000);
      camera.position.z = 1;
      
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      
      // Clear any previous renderers
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(renderer.domElement);
      }
      
      createDotMatrix();
      
      window.addEventListener('resize', onWindowResize);
    }
    
    function createDotMatrix() {
      const columns = 40;
      const rows = 30;
      const totalDots = columns * rows;
      const positions = new Float32Array(totalDots * 3);
      const sizes = new Float32Array(totalDots);
      const colors = new Float32Array(totalDots * 3);
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      const xSpacing = width / (columns - 1);
      const ySpacing = height / (rows - 1);
      
      let index = 0;
      let colorIndex = 0;
      const xStart = -width / 2;
      const yStart = -height / 2;
      
      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
          const x = xStart + i * xSpacing;
          const y = yStart + j * ySpacing;
          positions[index] = x;
          positions[index + 1] = y;
          positions[index + 2] = 0;
          sizes[index / 3] = 2;
          
          // Default to light gray color
          colors[colorIndex] = 0.5;     // R
          colors[colorIndex + 1] = 0.5; // G
          colors[colorIndex + 2] = 0.5; // B
          
          index += 3;
          colorIndex += 3;
        }
      }
      
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: `
          attribute float size;
          attribute vec3 color;
          varying vec3 vColor;
          void main() {
            vColor = color;
            gl_PointSize = size;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            // Create circular point with soft edge
            float r = distance(gl_PointCoord, vec2(0.5, 0.5));
            
            // Softer edge transition (from 0.3 to 0.5 instead of 0.4 to 0.5)
            float a = 1.0 - smoothstep(0.3, 0.5, r);
            
            // Enhanced glow effect with wider spread
            float glow = exp(-r*2.5) * 1.2;
            
            // Add outer halo with even wider spread
            float outerHalo = exp(-r*1.0) * 0.6;
            
            vec3 glowColor = vec3(1.0, 1.0, 1.0); // White glow
            
            // Mix base color with glow and outer halo
            vec3 finalColor = mix(vColor, glowColor, glow + outerHalo);
            
            // Boost brightness in center
            if (r < 0.2) {
              finalColor += (0.2 - r) * 2.0;
            }
            
            gl_FragColor = vec4(finalColor, a);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      
      dotMatrix = new THREE.Points(geometry, material);
      scene.add(dotMatrix);
      
      // Start the animation loop for stars
      setTimeout(activateRandomStar, 1000);
    }
    
    function activateRandomStar() {
      if (!dotMatrix) return;
      
      const sizes = dotMatrix.geometry.attributes.size.array;
      const totalDots = sizes.length;
      
      // Only activate a new star if we're under the maximum
      if (activeStars.size < MAX_ACTIVE_STARS) {
        let randomIndex;
        // Find a dot that isn't already activated
        do {
          randomIndex = Math.floor(Math.random() * totalDots);
        } while (activeStars.has(randomIndex));
        
        // Random duration between min and max
        const duration = MIN_STAR_DURATION + Math.random() * (MAX_STAR_DURATION - MIN_STAR_DURATION);
        
        // Start time
        const startTime = Date.now();
        
        // Add to active stars
        activeStars.set(randomIndex, { startTime, duration });
      }
      
      // Schedule the next star activation
      const nextActivationDelay = 200 + Math.random() * 800; // Random delay between 0.2-1 seconds
      setTimeout(activateRandomStar, nextActivationDelay);
    }
    
    function updateStars() {
      if (dotMatrix) {
        const sizesAttr = dotMatrix.geometry.attributes.size;
        const colorsAttr = dotMatrix.geometry.attributes.color;
        const sizes = sizesAttr.array;
        const colors = colorsAttr.array;
        const now = Date.now();
        let needsUpdate = false;
        
        // Process each active star
        for (const [index, starData] of activeStars.entries()) {
          const { startTime, duration } = starData as { startTime: number; duration: number };
          const elapsed = now - startTime;
          
          if (elapsed >= duration) {
            // Animation completed, reset this star
            sizes[index] = 2;
            colors[index * 3] = 0.5;     // R
            colors[index * 3 + 1] = 0.5; // G
            colors[index * 3 + 2] = 0.5; // B
            activeStars.delete(index);
            needsUpdate = true;
          } else {
            // Animation in progress
            // Create a pulse effect using sin wave
            const progress = elapsed / duration;
            
            // First half of animation: grow and brighten
            // Second half: shrink and dim
            const pulseProgress = (progress < 0.5) 
                ? progress * 2  // 0 to 1 in first half
                : (1 - (progress - 0.5) * 2); // 1 to 0 in second half
            
            // Increased maximum size for more visual impact
            const size = 2 + pulseProgress * 8; // Size between 2 and 10
            sizes[index] = size;
            
            // Brighter colors with slight yellow tint
            colors[index * 3] = 0.5 + pulseProgress * 0.5;     // R (to 1.0)
            colors[index * 3 + 1] = 0.5 + pulseProgress * 0.5; // G (to 1.0)
            colors[index * 3 + 2] = 0.5 + pulseProgress * 0.4; // B (to 0.9)
            
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          sizesAttr.needsUpdate = true;
          colorsAttr.needsUpdate = true;
        }
      }
    }
    
    function onWindowResize() {
      if (!renderer || !camera) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      
      // Re-create dot matrix for new size
      if (dotMatrix) {
        scene.remove(dotMatrix);
        createDotMatrix();
      }
    }
    
    function animate() {
      frameId = requestAnimationFrame(animate);
      updateStars();
      renderer.render(scene, camera);
    }
    
    init();
    animate();
    
    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
      }
      if (dotMatrix) {
        dotMatrix.geometry.dispose();
        (dotMatrix.material as THREE.Material).dispose();
      }
    };
  }, []);
  
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default Background;