"use client";

import React, { useState, useEffect, useRef } from "react";

interface RetractablePanelProps {
    title: string;
    children: React.ReactNode;
    secondaryAction?: React.ReactNode;
}

export default function RetractablePanel({ title, children, secondaryAction }: RetractablePanelProps) {
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
                style={{
                    top: position.y,
                    left: position.x,
                    position: 'fixed'
                }}
                className={`z-40 flex w-16 flex-col items-stretch gap-2 transition-transform duration-75 ${isOpen ? 'translate-x-[100%] opacity-0' : 'translate-x-0 opacity-100'}`}
            >
                <div
                    onMouseDown={handleMouseDown}
                    onClick={(e) => {
                        if (hasDragged.current) {
                            e.preventDefault();
                            e.stopPropagation();
                            hasDragged.current = false;
                            return;
                        }
                        setIsOpen(true);
                    }}
                    className="flex min-h-32 w-16 cursor-move items-center justify-center rounded-lg bg-[#c5a059] px-2 py-3 text-black shadow-[0_0_15px_rgba(197,160,89,0.3)] active:cursor-grabbing hover:scale-105"
                >
                    <div className="writing-vertical-rl pointer-events-none select-none text-[10px] font-bold uppercase tracking-widest text-orientation-mixed">
                        {title}
                    </div>
                </div>
                {secondaryAction}
                {/* Drag Handle Icon (Optional visual cue) */}
                <div className="absolute -top-2 -left-2 text-[#c5a059] bg-black rounded-full p-1 opacity-0 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                </div>
            </div>

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-[400px] bg-[#050507]/95 backdrop-blur-xl border-l border-[#c5a059]/30 shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

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
