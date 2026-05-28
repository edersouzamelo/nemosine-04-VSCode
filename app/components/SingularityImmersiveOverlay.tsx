"use client";

import React, { useEffect, useState, useRef } from "react";
import { useLanguage } from "./LanguageProvider";

export default function SingularityImmersiveOverlay({ children }: { children: React.ReactNode }) {
    const { singularity } = useLanguage();
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
    const [touchGlow, setTouchGlow] = useState<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
    const [ritualActive, setRitualActive] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ritualAudioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Track mouse for lantern effect
    useEffect(() => {
        if (singularity !== "on") return;
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [singularity]);

    // Track touches for mobile glow
    useEffect(() => {
        if (singularity !== "on") return;
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                setTouchGlow({
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    active: true,
                });
            }
        };
        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                setTouchGlow({
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    active: true,
                });
            }
        };
        const handleTouchEnd = () => {
            setTimeout(() => setTouchGlow(prev => ({ ...prev, active: false })), 300);
        };
        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", handleTouchEnd);
        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("touchend", handleTouchEnd);
        };
    }, [singularity]);

    // Handle Ambient Sound
    useEffect(() => {
        if (singularity === "on") {
            // Create audio element if not exists
            if (!audioRef.current) {
                audioRef.current = new Audio("https://www.soundjay.com/nature/sounds/wind-soft-01.mp3");
                audioRef.current.loop = true;
                audioRef.current.volume = 0.02; // Extremely low, very subtle
            }
            audioRef.current.play().catch(() => {
                // Autoplay block fallback
                console.log("Audio autoplay was prevented. Will play on user interaction.");
            });
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [singularity]);

    // Handle Entrance Ritual
    const prevSingularity = useRef(singularity);
    useEffect(() => {
        if (prevSingularity.current === "off" && singularity === "on") {
            // Check if we've already done the ritual in this session
            const hasRitualized = sessionStorage.getItem("nemosine-singularity-ritualized");
            if (!hasRitualized) {
                setRitualActive(true);
                sessionStorage.setItem("nemosine-singularity-ritualized", "true");

                // Play entrance deep chime/sound
                if (!ritualAudioRef.current) {
                    ritualAudioRef.current = new Audio("https://www.soundjay.com/buttons/sounds/button-10.mp3");
                    ritualAudioRef.current.volume = 0.15;
                }
                ritualAudioRef.current.play().catch(() => {});

                // Auto-fade out after 3.2 seconds
                setTimeout(() => {
                    setRitualActive(false);
                }, 3200);
            }
        }
        prevSingularity.current = singularity;
    }, [singularity]);

    // Subtle Live Background Particles (Canvas)
    useEffect(() => {
        if (singularity !== "on") return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", handleResize);

        // Particle Class
        class Particle {
            x: number;
            y: number;
            size: number;
            speedY: number;
            speedX: number;
            opacity: number;
            fadeSpeed: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = height + Math.random() * 100;
                this.size = Math.random() * 1.5 + 0.5; // very tiny
                this.speedY = -(Math.random() * 0.4 + 0.1); // very slow upward
                this.speedX = Math.random() * 0.2 - 0.1;
                this.opacity = Math.random() * 0.3 + 0.05;
                this.fadeSpeed = 0.0005 + Math.random() * 0.0005;
            }

            update() {
                this.y += this.speedY;
                this.x += this.speedX;
                if (this.y < -10) {
                    this.y = height + 10;
                    this.x = Math.random() * width;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(197, 160, 89, ${this.opacity})`;
                ctx.shadowBlur = 4;
                ctx.shadowColor = "rgba(197, 160, 89, 0.4)";
                ctx.fill();
            }
        }

        const particles: Particle[] = Array.from({ length: 30 }, () => new Particle());

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            particles.forEach((p) => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(render);
        };
        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [singularity]);

    return (
        <>
            {/* Immersive Audio/Canvas elements */}
            {singularity === "on" && (
                <>
                    {/* Live Background Canvas */}
                    <canvas
                        ref={canvasRef}
                        className="fixed inset-0 pointer-events-none z-0 w-full h-full mix-blend-screen opacity-60"
                    />

                    {/* Desktop Lantern Overlay */}
                    <div
                        className="pointer-events-none fixed z-[9999] w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.05)_0%,rgba(197,160,89,0.01)_40%,transparent_70%)] -translate-x-1/2 -translate-y-1/2 hidden md:block"
                        style={{
                            left: `${mousePos.x}px`,
                            top: `${mousePos.y}px`,
                        }}
                    />

                    {/* Mobile Touch Glow */}
                    {touchGlow.active && (
                        <div
                            className="pointer-events-none fixed z-[9999] w-24 h-24 rounded-full bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.1)_0%,transparent_70%)] -translate-x-1/2 -translate-y-1/2 animate-ping"
                            style={{
                                left: `${touchGlow.x}px`,
                                top: `${touchGlow.y}px`,
                            }}
                        />
                    )}
                </>
            )}

            {/* Entrance Ritual Screen */}
            {ritualActive && (
                <div className="fixed inset-0 z-[100000] bg-black flex flex-col items-center justify-center animate-fade-in text-center p-6">
                    <div className="animate-pulse space-y-6">
                        <img
                            src="/assets/nemosine-logo.png"
                            alt="Nemosine Crest"
                            className="h-28 w-auto object-contain mx-auto drop-shadow-[0_0_30px_rgba(197,160,89,0.5)]"
                        />
                        <h2 className="font-display text-2xl uppercase tracking-widest text-[#c5a059]">
                            Entrando no Castelo
                        </h2>
                        <div className="h-0.5 w-16 bg-[#c5a059]/40 mx-auto" />
                    </div>
                </div>
            )}

            {/* Wrap children */}
            <div className={`relative ${singularity === "on" ? "is-singularity-active" : ""}`}>
                {children}
            </div>
        </>
    );
}
