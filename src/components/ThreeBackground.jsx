import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useApp } from '../context/AppContext';

export default function ThreeBackground() {
  const canvasRef = useRef(null);
  const materialRef = useRef(null);
  const fogRef = useRef(null);
  const { theme } = useApp();

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);
    fogRef.current = scene.fog;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.PlaneGeometry(150, 150, 60, 60);
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime() * 0.5;
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = Math.sin(x * 0.1 + time) * 2.5 + Math.cos(z * 0.1 + time) * 2.5 + Math.sin((x + z) * 0.05 - time) * 1.5;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      renderer.render(scene, camera);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onResize);
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  useEffect(() => {
    if (!materialRef.current || !fogRef.current) return;
    if (theme === 'dark') {
      fogRef.current.color.setHex(0x0f172a);
      materialRef.current.color.setHex(0x00ffff);
      materialRef.current.opacity = 0.3;
    } else {
      fogRef.current.color.setHex(0xe0e7ff);
      materialRef.current.color.setHex(0x3b82f6);
      materialRef.current.opacity = 0.2;
    }
  }, [theme]);

  return <canvas id="bg-canvas" ref={canvasRef} />;
}
