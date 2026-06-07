"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function CastleScene3D() {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        let disposed = false;
        let frame = 0;
        let renderer: THREE.WebGLRenderer | null = null;
        let scene: THREE.Scene | null = null;
        let controls: OrbitControls | null = null;

        const disposeScene = () => {
            window.cancelAnimationFrame(frame);
            controls?.dispose();
            scene?.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                object.geometry?.dispose();
                const material = object.material;
                if (Array.isArray(material)) material.forEach((item) => item.dispose());
                else material?.dispose();
            });
            renderer?.dispose();
            if (renderer?.domElement.parentElement === host) {
                host.removeChild(renderer.domElement);
            }
        };

        try {
            scene = new THREE.Scene();
            scene.background = null;
            scene.fog = new THREE.FogExp2(0x050507, 0.055);

            const camera = new THREE.PerspectiveCamera(38, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 100);
            camera.position.set(2.8, 2.1, 3.8);

            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
            renderer.setSize(host.clientWidth, Math.max(host.clientHeight, 1));
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.08;
            host.appendChild(renderer.domElement);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 1.65;
            controls.maxDistance = 6.2;
            controls.maxPolarAngle = Math.PI * 0.48;
            controls.minPolarAngle = Math.PI * 0.18;
            controls.target.set(0, 0.36, 0);

            scene.add(new THREE.HemisphereLight(0xf0dfbd, 0x050507, 1.55));

            const key = new THREE.DirectionalLight(0xffe0a3, 2.25);
            key.position.set(3.5, 4.6, 2.8);
            scene.add(key);

            const rim = new THREE.DirectionalLight(0x7dd3fc, 1.05);
            rim.position.set(-3.2, 2.8, -2.4);
            scene.add(rim);

            const loader = new GLTFLoader();
            loader.load(
                "/assets/models/nemosine-castle.glb",
                (gltf) => {
                    if (disposed || !scene) return;

                    try {
                        const model = gltf.scene;
                        const box = new THREE.Box3().setFromObject(model);
                        const size = new THREE.Vector3();
                        const center = new THREE.Vector3();
                        box.getSize(size);
                        box.getCenter(center);

                        model.position.sub(center);
                        const largest = Math.max(size.x, size.y, size.z) || 1;
                        model.scale.setScalar(2.12 / largest);
                        model.position.y = 0.12;
                        model.rotation.y = THREE.MathUtils.degToRad(0);

                        model.traverse((child) => {
                            if (!(child instanceof THREE.Mesh)) return;
                            child.frustumCulled = true;
                            child.castShadow = false;
                            child.receiveShadow = false;
                            const material = child.material;
                            if (Array.isArray(material)) {
                                material.forEach((item) => {
                                    item.side = THREE.FrontSide;
                                });
                            } else if (material) {
                                material.side = THREE.FrontSide;
                            }
                        });

                        scene.add(model);
                        setLoading(false);
                    } catch (modelError) {
                        console.error(modelError);
                        setError("Nao foi possivel preparar o castelo 3D.");
                        setLoading(false);
                    }
                },
                undefined,
                (loadError) => {
                    console.error(loadError);
                    setError("Nao foi possivel carregar o arquivo 3D.");
                    setLoading(false);
                }
            );

            const handleResize = () => {
                if (!renderer) return;
                const width = host.clientWidth;
                const height = Math.max(host.clientHeight, 1);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            };
            window.addEventListener("resize", handleResize);

            const animate = () => {
                if (disposed || !renderer || !scene) return;
                controls?.update();
                renderer.render(scene, camera);
                frame = window.requestAnimationFrame(animate);
            };
            animate();

            return () => {
                disposed = true;
                window.removeEventListener("resize", handleResize);
                disposeScene();
            };
        } catch (setupError) {
            console.error(setupError);
            setError("O visualizador 3D nao iniciou neste navegador.");
            setLoading(false);
            disposeScene();
        }

        return () => {
            disposed = true;
            disposeScene();
        };
    }, []);

    return (
        <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-[#050507]">
            <div ref={hostRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent,rgba(0,0,0,0.1)_48%,rgba(0,0,0,0.52)_100%)]" />
            {loading && (
                <div className="absolute inset-0 grid place-items-center bg-black/35 text-center">
                    <div className="rounded-xl border border-[#c5a059]/20 bg-black/60 px-5 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9b865] backdrop-blur-md">
                        Carregando castelo 3D...
                    </div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 grid place-items-center bg-black/55 text-center">
                    <div className="max-w-xs rounded-xl border border-rose-400/25 bg-black/70 px-5 py-4 text-sm text-rose-200 backdrop-blur-md">
                        {error}
                    </div>
                </div>
            )}
        </div>
    );
}
