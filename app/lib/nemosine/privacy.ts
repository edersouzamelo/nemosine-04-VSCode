export const PRIVATE_MEMORY_SPACES = ["Confessor 2.0", "Porão"] as const;

export function isPrivateMemorySpace(personaId: string): boolean {
    return PRIVATE_MEMORY_SPACES.includes(personaId as (typeof PRIVATE_MEMORY_SPACES)[number]);
}
