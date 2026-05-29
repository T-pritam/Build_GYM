export function passwordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0–4
}

export const STRENGTH_COLORS = ['#EF4444', '#EF4444', '#F59E0B', '#22C55E', '#22C55E'];
export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
