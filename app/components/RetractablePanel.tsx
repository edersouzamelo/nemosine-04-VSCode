"use client";

import React, { useState, useEffect, useRef } from "react";

interface RetractablePanelProps {
    title: string;
    children: React.ReactNode;
}

export default function RetractablePanel({ title, children }: RetractablePanelProps) {
    const [position, setPosition] = useState({ x: 0, y: 192 }); // Initial top-48
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const hasDragged = useRef(false);

    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        hasDragged.current = false; // Reset flag
        setStartPos({ x: e.clientX, y: e.clientY }); // Track start for threshold check

        // Calculate offset from the button's top-left
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            // Check threshold (e.g. 5px) to consider it a drag
            const moveX = Math.abs(e.clientX - startPos.x);
            const moveY = Math.abs(e.clientY - startPos.y);

            if (moveX > 5 || moveY > 5) {
                hasDragged.current = true;
            }

            // Calculate new position
            let newX = e.clientX - dragOffset.x;
            let newY = e.clientY - dragOffset.y;

            // Constrain to window bounds
            const maxX = window.innerWidth - 60; // Button width approx
            const maxY = window.innerHeight - 100;

            if (newX < 0) newX = 0;
            if (newX > maxX) newX = maxX;
            if (newY < 0) newY = 0;
            if (newY > maxY) newY = maxY;

            setPosition({ x: newX, y: newY });
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

    return (
        <>
            {/* Draggable Toggle Button */}
            <div
                onMouseDown={handleMouseDown}
                onMouseUp={() => {
                    // Calculate distance moved
                    // We need to track where we started vs where we ended
                    // Better approach: toggle 'isDragging' only after movement threshold.
                    // But simple fix for now:
                    // The onClick below fires AFTER mouseUp. 
                    // We need to ensure 'onClick' knows if we dragged.
                    // Current logic relies on 'hasDragged' ref which is set in MouseMove.
                    // But MouseUp sets isDragging=false.
                    // Let's rely on a small timeout or just ensure hasDragged is checked correctly.
                }}
                onClick={(e) => {
                    // If we moved significantly, it's a drag.
                    // We can check if 'hasDragged.current' is true. 
                    // ISSUE: hasDragged might be getting reset? 
                    // Let's look at useEffect: it doesn't reset hasDragged.
                    // Ah, handleMouseDown should reset it.
                    if (hasDragged.current) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Reset for next time
                        hasDragged.current = false;
                        return;
                    }
                    setIsOpen(true);
                }}
                style={{
                    top: position.y,
                    left: position.x,
                    position: 'fixed'
                }}
                className={`z-40 bg-[#c5a059] text-black p-3 rounded-lg shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-transform duration-75 cursor-move active:cursor-grabbing hover:scale-105 ${isOpen ? 'translate-x-[100%] opacity-0' : 'translate-x-0 opacity-100'}`}
            >
                <div className="writing-vertical-rl text-[10px] uppercase font-bold tracking-widest text-orientation-mixed pointer-events-none select-none">
                    {title}
                </div>
                {/* Drag Handle Icon (Optional visual cue) */}
                <div className="absolute -top-2 -left-2 text-[#c5a059] bg-black rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                </div>
            </div>

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-[400px] bg-[#050507]/95 backdrop-blur-xl border-l border-[#c5a059]/30 shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Close Button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-6 left-6 text-[#c5a059] hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content Container */}
                <div className="h-full overflow-y-auto p-8 pt-20">
                    <h2 className="text-2xl font-serif text-[#c5a059] mb-8 border-b border-[#c5a059]/20 pb-4">{title}</h2>
                    <div className="space-y-6 text-[#e1e1e6]">
                        {children}
                    </div>
                </div>
            </div>

            {/* Overlay (Optional, click to close) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
