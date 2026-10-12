export interface Entry { id: string; title: string; available: boolean; score: number }
/** @customitinComplete */
export async function loadEntries(): Promise<Entry[]> { return []; }
