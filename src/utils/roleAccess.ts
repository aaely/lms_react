// Roles that may only open the Live Sheet and Next Shift. Any other page they
// try is sent to the Live Sheet, and the nav shows them just those two.
// (Which columns they see is separate: usePermissions' TRIMMED_SHEET_ROLES.
// VAA and Universal keep the full sheet, since they set Status OX and Stat.)
const SHEET_ONLY_ROLES = new Set(['dock', 'security', 'vaa', 'univ'])

export const SHEET_ONLY_HOME = '/live'

export const isSheetOnly = (role: string): boolean => SHEET_ONLY_ROLES.has(role)
