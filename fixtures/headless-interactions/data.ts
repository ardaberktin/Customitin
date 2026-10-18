export interface ChartRow {
  label: string;
  value: number;
}
/** @customitinComplete */
export async function loadHours() {
  return [
    { id: 'design', team: 'Design', hours: 8 },
    { id: 'engineering', team: 'Engineering', hours: 16 },
  ];
}
/** @customitinComplete */
export async function loadBudgets() {
  return [
    { id: 'design', department: 'Design', budget: 120 },
    { id: 'engineering', department: 'Engineering', budget: 240 },
  ];
}
