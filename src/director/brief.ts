export const needsNarration = (text: string) => {
  const clean = text.trim();
  if (!clean) return false;
  const words = clean.split(/\s+/).filter(Boolean);
  const lines = clean.split(/\n/).map((line) => line.trim()).filter(Boolean);
  const bullets = lines.filter((line) => /^([-*•]|\d+[.)])\s+/.test(line)).length;
  if (bullets >= 2) return true;
  if (words.length < 45) return true;
  const spoken = (clean.match(/[.!?](\s|$)/g) ?? []).length;
  return spoken < 3;
};
