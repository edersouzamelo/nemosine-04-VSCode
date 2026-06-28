"use client";

export default function RemovePersonaAction({
    personaId,
    disabled,
    onRemove,
}: {
    personaId: string;
    disabled?: boolean;
    onRemove: (personaId: string) => void;
}) {
    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onRemove(personaId);
            }}
            disabled={disabled}
            title={`Desconvidar ${personaId}`}
            aria-label={`Desconvidar ${personaId}`}
            className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-md border border-black/45 bg-black/70 text-[#ecd49c] opacity-0 transition-opacity hover:bg-red-950/80 disabled:cursor-not-allowed disabled:opacity-20 group-hover/presence:opacity-100"
        >
            <span className="material-icons text-[14px] leading-none">close</span>
        </button>
    );
}
