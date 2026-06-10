export function parseTT(text: string) {
  const tt = text.match(/tt[:\s]*([0-9]+)/i);
  const name = text.match(/name[:\s]*(.+)/i);
  const desc = text.match(/desc[:\s]*(.+)/i);

  if (!tt) return null;

  return {
    ttNumber: tt[1],
    name: name ? name[1] : "",
    description: desc ? desc[1] : "",
  };
}