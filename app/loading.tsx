import React from 'react';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="relative w-24 h-24 mb-8">
                {/* Mystical rings */}
                <div className="absolute inset-0 rounded-full border-t-2 border-amber-500/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-amber-400/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                <div className="absolute inset-4 rounded-full border-b-2 border-amber-300/80 animate-spin" style={{ animationDuration: '1.5s' }}></div>

                {/* Center glowing orb */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 bg-amber-200 rounded-full animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.8)]"></div>
                </div>
            </div>

            <p className="font-cinzel text-amber-500/80 tracking-widest text-sm animate-pulse">
                Compondo o espaço-tempo...
            </p>
        </div>
    );
}
