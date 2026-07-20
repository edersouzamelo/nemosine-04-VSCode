"use client";

export default function RemovePersonaAction({
    personaId,
    disabled,
    devOnly = false,
    onRemove,
}: {
    personaId: string;
    disabled?: boolean;
    devOnly?: boolean;
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
            className={`absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-md border border-black/45 bg-black/70 opacity-0 transition-opacity hover:bg-red-950/80 disabled:cursor-not-allowed disabled:opacity-20 group-hover/presence:opacity-100 ${devOnly ? "text-[#8fb3ff]" : "text-[#ecd49c]"}`}
        >
            <span className="material-icons text-[14px] leading-none">close</span>
        </button>
    );
}
