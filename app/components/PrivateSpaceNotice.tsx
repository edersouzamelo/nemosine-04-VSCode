"use client";

import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";

interface PrivateSpaceNoticeProps {
    spaceName: string;
}

export default function PrivateSpaceNotice({ spaceName }: PrivateSpaceNoticeProps) {
    const [mounted, setMounted] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const [position, setPosition] = useState({ x: -1, y: 92 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setMounted(true);
        setPosition({
            x: Math.max(16, window.innerWidth - 388),
            y: 92,
        });
    }, []);

    useEffect(() => {
        const handleMouseMove = (event: globalThis.MouseEvent) => {
            if (!isDragging) return;

            const width = collapsed ? 260 : 372;
            const maxX = Math.max(16, window.innerWidth - width - 16);
            const maxY = Math.max(16, window.innerHeight - 80);

            setPosition({
                x: Math.min(Math.max(16, event.clientX - dragOffset.x), maxX),
                y: Math.min(Math.max(16, event.clientY - dragOffset.y), maxY),
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [collapsed, dragOffset, isDragging]);

    if (!mounted) return null;

    const handleMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setDragOffset({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        });
        setIsDragging(true);
    };

    return (
        <aside
            className="fixed z-40 rounded-lg border border-amber-500/60 bg-[#140f0b]/95 shadow-[0_0_32px_rgba(180,83,9,0.28)] backdrop-blur-md text-[#efe4d1]"
            style={{ left: position.x, top: position.y, width: collapsed ? 260 : 372 }}
            role="alert"
            aria-label={`Aviso de privacidade para ${spaceName}`}
        >
            <div
                className="flex cursor-move select-none items-start justify-between gap-3 border-b border-amber-500/20 px-4 py-3 active:cursor-grabbing"
                onMouseDown={handleMouseDown}
            >
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-400">
                        Aviso de privacidade
                    </p>
                    <p className="mt-1 text-sm font-serif text-amber-100">
                        {spaceName}: proteção em desenvolvimento
                    </p>
                </div>
                <button
                    type="button"
                    className="mt-0.5 rounded border border-amber-500/30 px-2 py-1 text-[10px] uppercase tracking-widest text-amber-300 hover:bg-amber-500/10"
                    onClick={() => setCollapsed((value) => !value)}
                    onMouseDown={(event) => event.stopPropagation()}
                    aria-expanded={!collapsed}
                >
                    {collapsed ? "Abrir" : "Recolher"}
                </button>
            </div>

            {!collapsed && (
                <div className="space-y-3 px-4 py-4 text-xs leading-relaxed text-[#e4d3bc]">
                    <p className="font-semibold text-amber-200">
                        Não insira dados sensíveis, segredos pessoais ou informações confidenciais de terceiros neste módulo.
                    </p>
                    <p>
                        O isolamento técnico prometido para este espaço ainda não foi implementado e validado.
                        Nesta versão, mensagens podem ser processadas por serviços de IA e persistidas pelo sistema.
                    </p>
                    <p>
                        O nome e a função simbólica deste ambiente não constituem garantia de sigilo,
                        confidencialidade profissional ou atendimento protegido pela LGPD.
                    </p>
                    <p className="border-t border-amber-500/20 pt-3 text-amber-100/80">
                        Use apenas para experimentação sem conteúdo sensível até a liberação formal do modo privado.
                    </p>
                </div>
            )}
        </aside>
    );
}
