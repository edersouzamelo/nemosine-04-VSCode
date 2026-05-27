export const PRIVATE_MEMORY_SPACES = ["Confessor 2.0", "Porão"] as const;

export function isPrivateMemorySpace(personaId: string): boolean {
    return PRIVATE_MEMORY_SPACES.some((space) =>
        personaId === space
        || personaId.startsWith(`${space} @ `)
        || personaId.endsWith(` @ ${space}`)
    );
}
