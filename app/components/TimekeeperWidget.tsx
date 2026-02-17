"use client";

import React, { useState, useEffect } from 'react';

export default function TimekeeperWidget() {
    const [time, setTime] = useState(new Date());
    const [position, setPosition] = useState({ x: -1, y: 96 }); // Initial position (handled in useEffect for window.width)
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Set initial position to right side if not set
        if (position.x === -1) {
            setPosition({ x: window.innerWidth - 200, y: 96 });
        }
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Drag Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault();
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    if (!mounted) return null;

    const hours = time.getHours();
    const minutes = time.getMinutes();
    const seconds = time.getSeconds();

    // Calculate angles
    const hourAngle = (hours % 12) * 30 + minutes * 0.5;
    const minuteAngle = minutes * 6;
    const secondAngle = seconds * 6;

    // Date formatting
    const dayName = time.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayNum = time.getDate();
    const monthName = time.toLocaleDateString('pt-BR', { month: 'long' });
    const year = time.getFullYear();

    return (
        <div
            className="fixed z-30 flex flex-col items-center gap-4 animate-fade-in select-none cursor-move active:cursor-grabbing"
            style={{
                left: position.x,
                top: position.y
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Clock Container */}
            <div className="relative w-40 h-40 rounded-full bg-[#0a0a0c] border-[4px] border-[#c5a059] shadow-[0_0_30px_rgba(197,160,89,0.3)] box-border">
                {/* Inner Face Background */}
                <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_center,_#2a2a2e_0%,_#000_100%)] opacity-80"></div>

                {/* Decorative Ring */}
                <div className="absolute inset-3 rounded-full border border-[#c5a059]/30"></div>

                {/* Hour Marks */}
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-full h-full left-0 top-0"
                        style={{ transform: `rotate(${i * 30}deg)` }}
                    >
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-[#c5a059]"></div>
                    </div>
                ))}

                {/* Roman Numerals (Simplified for 12, 3, 6, 9) */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[#c5a059] font-serif text-xs font-bold">XII</div>
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[#c5a059] font-serif text-xs font-bold">VI</div>
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[#c5a059] font-serif text-xs font-bold">IX</div>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[#c5a059] font-serif text-xs font-bold">III</div>

                {/* Hands */}
                {/* Hour Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-1 h-10 bg-[#c5a059] origin-bottom -translate-x-1/2 -translate-y-full rounded-full shadow-lg"
                    style={{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)`, height: '30%' }}
                ></div>

                {/* Minute Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-0.5 h-14 bg-[#e1e1e6] origin-bottom -translate-x-1/2 -translate-y-full rounded-full shadow-lg opacity-80"
                    style={{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)`, height: '40%' }}
                ></div>

                {/* Second Hand */}
                <div
                    className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-red-900/80 origin-bottom -translate-x-1/2 -translate-y-full rounded-full"
                    style={{ transform: `translate(-50%, -100%) rotate(${secondAngle}deg)`, height: '45%' }}
                ></div>

                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-[#c5a059] rounded-full -translate-x-1/2 -translate-y-1/2 shadow-md"></div>
            </div>

            {/* Calendar Container */}
            <div className="bg-black/80 backdrop-blur-md border border-[#c5a059]/40 p-3 rounded-lg text-center shadow-lg w-40">
                <div className="text-[#c5a059] text-[10px] uppercase tracking-widest border-b border-[#c5a059]/20 pb-1 mb-1 font-bold">
                    {dayName}
                </div>
                <div className="text-3xl text-white font-serif font-bold leading-none my-1 text-shadow-gold">
                    {dayNum}
                </div>
                <div className="text-[#c5a059]/80 text-xs font-serif uppercase tracking-widest">
                    {monthName} {year}
                </div>
            </div>

            {/* Hanging Chain Effect (CSS visual trick) */}
            <div className="absolute -top-24 left-1/2 w-[1px] h-24 bg-gradient-to-b from-transparent via-[#c5a059]/50 to-[#c5a059]"></div>
        </div>
    );
}

// Add strict types if needed, or keeping it simple for this component as it has no props.
