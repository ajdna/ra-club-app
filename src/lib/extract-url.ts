export function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s)>"]+/);
  return match ? match[0] : "";
}
