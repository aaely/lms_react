// Roles that may only open the Live Sheet and Next Shift. Any other page they
// try is sent to the Live Sheet, and the nav shows them just those two.
const SHEET_ONLY_ROLES = new Set(['dock', 'security'])

export const SHEET_ONLY_HOME = '/live'

export const isSheetOnly = (role: string): boolean => SHEET_ONLY_ROLES.has(role)
