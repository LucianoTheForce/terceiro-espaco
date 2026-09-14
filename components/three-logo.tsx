"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export default function ThreeLogo({
  moving,
  visible,
}: {
  moving: boolean;
  visible: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ moving, visible, spin: 0 });
  useEffect(() => {
    state.current.moving = moving;
    state.current.visible = visible;
  }, [moving, visible]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    renderer.domElement.style.opacity = "0";
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-960, 960, 540, -540, 1, 4000);
    camera.position.z = 1800;
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(-500, 650, 1000);
    scene.add(light);
    const front = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const side = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });
    const geometries: THREE.ExtrudeGeometry[] = [];
    const pointer = new THREE.Vector2();
    const resize = new ResizeObserver(() => {
      const aspect = element.clientWidth / element.clientHeight;
      const width = aspect < 1 ? 1320 : 1920;
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = width / aspect / 2;
      camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, element.clientHeight, false);
      renderer.render(scene, camera);
    });
    resize.observe(element);
    const onPointer = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1,
      );
    };
    const reset = () => pointer.set(0, 0);
    const spin = () => {
      if (state.current.moving) state.current.spin += Math.PI * 2;
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        spin();
      }
    };
    element.addEventListener("pointermove", onPointer);
    element.addEventListener("pointerleave", reset);
    element.addEventListener("click", spin);
    element.addEventListener("keydown", keydown);
    const abort = new AbortController();
    fetch("/media/monogram.svg", { signal: abort.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Logo unavailable");
        return response.text();
      })
      .then((svg) => {
        if (disposed) return;
        const paths = new SVGLoader().parse(svg).paths;
        paths.forEach((path) =>
          path.toShapes().forEach((shape) => {
            const geometry = new THREE.ExtrudeGeometry(shape, {
              depth: 45,
              bevelEnabled: true,
              bevelSegments: 3,
              steps: 1,
              bevelSize: 1.2,
              bevelThickness: 1.2,
              curveSegments: 32,
            });
            geometry.translate(-960, -540, -22.5);
            geometries.push(geometry);
            const mesh = new THREE.Mesh(geometry, [front, side]);
            mesh.scale.y = -1;
            group.add(mesh);
          }),
        );
        renderer.setSize(element.clientWidth, element.clientHeight, false);
        renderer.render(scene, camera);
        renderer.domElement.style.opacity = "1";
        let spinAngle = 0;
        let previousTime = 0;
        let wasMoving = true;
        function render(time: number) {
          if (disposed) return;
          frame = requestAnimationFrame(render);
          if (
            !state.current.visible ||
            document.hidden ||
            time - previousTime < 30
          )
            return;
          previousTime = time;
          const active = state.current.moving;
          if (!active && !wasMoving) return;
          wasMoving = active;
          spinAngle += (state.current.spin - spinAngle) * 0.075;
          const tiltX = active ? pointer.y * 0.13 : 0;
          const tiltY = active
            ? pointer.x * 0.22 + Math.sin(time * 0.00045) * 0.035 + spinAngle
            : 0;
          group.rotation.x += (tiltX - group.rotation.x) * 0.07;
          group.rotation.y += (tiltY - group.rotation.y) * 0.07;
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(render);
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          console.warn("The original cover remains available.");
      });
    return () => {
      disposed = true;
      abort.abort();
      cancelAnimationFrame(frame);
      resize.disconnect();
      element.removeEventListener("pointermove", onPointer);
      element.removeEventListener("pointerleave", reset);
      element.removeEventListener("click", spin);
      element.removeEventListener("keydown", keydown);
      geometries.forEach((geometry) => geometry.dispose());
      front.dispose();
      side.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      ref={host}
      className="three-logo"
      style={{
        opacity: moving ? 1 : 0,
        pointerEvents: moving ? "auto" : "none",
      }}
      role="button"
      tabIndex={moving ? 0 : -1}
      aria-label="Girar o logo tridimensional do Terceiro Espaço"
    />
  );
}
