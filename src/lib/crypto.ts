/**
 * Edge-compatible crypto utilities
 */
export async function digestToHex(digest: ArrayBuffer): Promise<string> {
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
