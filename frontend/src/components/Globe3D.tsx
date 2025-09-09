"use client";

import React, { useEffect, useRef } from "react";

type Globe3DProps = {
  className?: string;
  backgroundColor?: string;
};

// Lightweight Three.js globe loaded at runtime from a CDN to avoid bundling deps.
// Renders a rotating sphere with subtle lighting. Cleans up on unmount.
export default function Globe3D({ className, backgroundColor = "transparent" }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let animationFrameId = 0;
    let renderer: any;
    let scene: any;
    let camera: any;
    let globeMesh: any;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const init = async () => {
      // Dynamically import Three.js in the browser only
      const THREE: any = await import("https://cdn.skypack.dev/three@0.161.0");

      if (!containerRef.current) return;

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        45,
        1,
        0.1,
        100
      );
      camera.position.z = 3.2;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(backgroundColor, backgroundColor === "transparent" ? 0 : 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      containerRef.current.appendChild(renderer.domElement);

      const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
      const sphereMaterial = new THREE.MeshStandardMaterial({
        color: 0x4263eb, // indigo-500-ish base
        metalness: 0.25,
        roughness: 0.6,
      });
      globeMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
      scene.add(globeMesh);

      // Soft ambient light and a directional key light for depth
      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      scene.add(ambient);

      const dirLight = new THREE.DirectionalLight(0x93c5fd, 1.1); // sky blue
      dirLight.position.set(5, 2, 4);
      scene.add(dirLight);

      const rimLight = new THREE.DirectionalLight(0xc084fc, 0.8); // purple
      rimLight.position.set(-3, -2, -2);
      scene.add(rimLight);

      const setSize = () => {
        if (!containerRef.current) return;
        const { clientWidth, clientHeight } = containerRef.current;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / Math.max(1, clientHeight);
        camera.updateProjectionMatrix();
      };

      setSize();

      // Observe container resizes to keep canvas crisp
      resizeObserver = new ResizeObserver(() => setSize());
      resizeObserver.observe(containerRef.current);

      const animate = () => {
        if (disposed) return;
        globeMesh.rotation.y += 0.0035;
        globeMesh.rotation.x = Math.sin(Date.now() * 0.00015) * 0.08;
        renderer.render(scene, camera);
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
    };

    init();

    return () => {
      disposed = true;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      try {
        if (resizeObserver) resizeObserver.disconnect();
        if (scene && globeMesh) scene.remove(globeMesh);
        if (globeMesh?.geometry) globeMesh.geometry.dispose();
        if (globeMesh?.material) globeMesh.material.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        }
      } catch {
        // best-effort cleanup
      }
    };
  }, [backgroundColor]);

  return (
    <div
      ref={containerRef}
      className={className || "h-full w-full"}
      aria-label="Animated rotating globe"
    />
  );
}


