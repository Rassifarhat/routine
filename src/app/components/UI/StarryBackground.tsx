// src/app/components/StarryBackground.tsx
"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface StarryBackgroundProps {
  children: React.ReactNode;
}

const StarryBackground: React.FC<StarryBackgroundProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene | null;
    camera: THREE.OrthographicCamera | null;
    renderer: THREE.WebGLRenderer | null;
    dotMatrix: THREE.Points | null;
    animationFrameId: number | null;
    activeStars: Map<number, { startTime: number; duration: number }>;
  }>({
    scene: null,
    camera: null,
    renderer: null,
    dotMatrix: null,
    animationFrameId: null,
    activeStars: new Map()
  });

  useEffect(() => {
    if (!containerRef.current) return;

    // Create canvas container if it doesn't exist
    if (!canvasContainerRef.current) {
      const canvasContainer = document.createElement('div');
      canvasContainer.style.position = 'absolute';
      canvasContainer.style.top = '0';
      canvasContainer.style.left = '0';
      canvasContainer.style.width = '100%';
      canvasContainer.style.height = '100%';
      canvasContainer.style.zIndex = '0';
      canvasContainer.style.pointerEvents = 'none';
      canvasContainerRef.current = canvasContainer;
      containerRef.current.appendChild(canvasContainer);
    }

    // Star animation parameters
    const MAX_ACTIVE_STARS = 3;
    const MIN_STAR_DURATION = 100;
    const MAX_STAR_DURATION = 300;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    sceneRef.current.scene = scene;

    // Setup camera
    const width = window.innerWidth;
    const height = window.innerHeight;
    const left = -width / 2;
    const right = width / 2;
    const top = height / 2;
    const bottom = -height / 2;
    const camera = new THREE.OrthographicCamera(left, right, top, bottom, -1000, 1000);
    camera.position.z = 1;
    sceneRef.current.camera = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    canvasContainerRef.current.appendChild(renderer.domElement);
    sceneRef.current.renderer = renderer;

    // Create dot matrix
    const createDotMatrix = () => {
      const columns = 40;
      const rows = 30;
      const totalDots = columns * rows;
      const positions = new Float32Array(totalDots * 3);
      const sizes = new Float32Array(totalDots);
      const colors = new Float32Array(totalDots * 3);

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
          sizes[index / 3] = 1;

          // Default to light gray color
          colors[colorIndex] = 0.2;     // R
          colors[colorIndex + 1] = 0.2; // G
          colors[colorIndex + 2] = 0.2; // B

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
          // Create circular point with very soft edge
          float r = distance(gl_PointCoord, vec2(0.4, 0.4));
          
          // More aggressive circular masking - cut off anything outside radius 0.5
          if (r > 0.4) {
            discard; // This forces a hard circular edge
          }
          
          // Extremely soft edge transition but only within the circle
          float edgeSoftness = smoothstep(0.45, 0.5, r);
          float a = 1.0 - edgeSoftness;
          
          // Primary inner glow - intense and focused
          float innerGlow = exp(-r*1.5) * 2.0;
          
          // Middle glow layer - provides the main diffusion
          float midGlow = exp(-r*0.8) * 1.2;
          
          // Outer halo - wide spread but still contained
          float outerHalo = exp(-r*0.4) * 0.9;
          
          // Extended halo that stays within bounds
          float extendedHalo = max(0.0, 1.0 - r*2.0) * 0.4;
          
          // Combine all glow layers
          float totalGlow = innerGlow + midGlow + outerHalo + extendedHalo;
          
          // Slightly warmer glow color for more visual appeal
          vec3 glowColor = vec3(1.0, 0.98, 0.95); // Slightly warm white
          
          // Mix base color with enhanced multi-layer glow
          vec3 finalColor = mix(vColor, glowColor, min(1.0, totalGlow));
          
          // Smooth central brightness boost with more intensity
          finalColor += max(0.0, 0.6 - r*2.0) * 2.5 * vec3(1.0, 0.97, 0.90);
          
          // Add subtle color variation based on distance from center
          finalColor += vec3(0.02, 0.01, 0.0) * (1.0 - min(1.0, r*2.0));
          
          gl_FragColor = vec4(finalColor, a);
        }
      `,
        transparent: true,
        blending: THREE.AdditiveBlending
      });

      // Clean up existing dot matrix if it exists
      if (sceneRef.current.dotMatrix) {
        scene.remove(sceneRef.current.dotMatrix);
        sceneRef.current.dotMatrix.geometry.dispose();
        (sceneRef.current.dotMatrix.material as THREE.Material).dispose();
      }

      const dotMatrix = new THREE.Points(geometry, material);
      scene.add(dotMatrix);
      sceneRef.current.dotMatrix = dotMatrix;

      // Start the star activation cycle
      setTimeout(activateRandomStar, 1000);
    };

    const activateRandomStar = () => {
      if (!sceneRef.current.dotMatrix) return;

      const dotMatrix = sceneRef.current.dotMatrix;
      const activeStars = sceneRef.current.activeStars;
      const totalDots = dotMatrix.geometry.attributes.size.array.length;

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
      const nextActivationDelay = 100 + Math.random() * 10; // Random delay between 0.2-1 seconds
      setTimeout(activateRandomStar, nextActivationDelay);
    };

    const updateStars = () => {
      if (!sceneRef.current.dotMatrix) return;

      const dotMatrix = sceneRef.current.dotMatrix;
      const activeStars = sceneRef.current.activeStars;
      
      const sizesAttr = dotMatrix.geometry.attributes.size;
      const colorsAttr = dotMatrix.geometry.attributes.color;
      const sizes = sizesAttr.array;
      const colors = colorsAttr.array;
      const now = Date.now();
      let needsUpdate = false;

      // Process each active star
      for (const [index, starData] of activeStars.entries()) {
        const { startTime, duration } = starData;
        const elapsed = now - startTime;

        if (elapsed >= duration) {
          // Animation completed, reset this star
          sizes[index] = 1;
          colors[index * 3] = 0.2;     // R
          colors[index * 3 + 1] = 0.2; // G
          colors[index * 3 + 2] = 0.2; // B
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
    };

    const onWindowResize = () => {
      if (!sceneRef.current.camera || !sceneRef.current.renderer) return;

      const width = window.innerWidth;
      const height = window.innerHeight;

      const camera = sceneRef.current.camera;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();

      const renderer = sceneRef.current.renderer;
      renderer.setSize(width, height);

      // Recreate dot matrix for new size
      createDotMatrix();
    };

    const animate = () => {
      if (!sceneRef.current.scene || !sceneRef.current.camera || !sceneRef.current.renderer) return;

      sceneRef.current.animationFrameId = requestAnimationFrame(animate);
      updateStars();
      
      const renderer = sceneRef.current.renderer;
      const scene = sceneRef.current.scene;
      const camera = sceneRef.current.camera;
      
      renderer.render(scene, camera);
    };

    // Initialize the scene
    createDotMatrix();
    window.addEventListener('resize', onWindowResize);
    animate();

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', onWindowResize);
      
      if (sceneRef.current.animationFrameId) {
        cancelAnimationFrame(sceneRef.current.animationFrameId);
      }
      
      if (sceneRef.current.dotMatrix) {
        sceneRef.current.dotMatrix.geometry.dispose();
        (sceneRef.current.dotMatrix.material as THREE.Material).dispose();
      }
      
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose();
      }
      
      if (canvasContainerRef.current && canvasContainerRef.current.parentNode) {
        canvasContainerRef.current.parentNode.removeChild(canvasContainerRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full"
      style={{ backgroundColor: '#111111' }} // Fallback background color
    >
      {/* Children container with content on top of the background */}
      <div className="relative z-10" style={{ inset: '10px', height: 'calc(100% - 20px)', width: 'calc(100% - 20px)' }}>
        {children}
      </div>
    </div>
  );
};

export default StarryBackground;