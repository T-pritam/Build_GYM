/**
 * Returns true if the given date-of-birth string represents someone
 * who is at least 16 years old today.
 *
 * Accepts:
 *   "YYYY-MM-DD"     (ISO, from API / TextInput)
 *   "DD / MM / YYYY" (display format used by the DOB picker in OnboardingScreen)
 */
export function isAtLeast16(dobString) {
  if (!dobString || typeof dobString !== 'string') return false;

  let year, month, day;

  const trimmed = dobString.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // ISO format: YYYY-MM-DD
    [year, month, day] = trimmed.split('-').map(Number);
  } else if (/^\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*\d{4}$/.test(trimmed)) {
    // Display format: DD / MM / YYYY
    const parts = trimmed.split('/').map((p) => Number(p.trim()));
    [day, month, year] = parts;
  } else {
    return false;
  }

  if (!year || !month || !day) return false;

  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return false;

  const today = new Date();
  const sixteenthBirthday = new Date(year + 16, month - 1, day);
  return sixteenthBirthday <= today;
}
