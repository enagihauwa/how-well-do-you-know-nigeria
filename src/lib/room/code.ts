/** No 0/O, 1/I/L, 5/S or 2/Z, so codes read out over the phone or WhatsApp are not misheard. */
const ALPHABET = "ABCDEFGHJKMNPQRTUVWXY346789";
export const ROOM_CODE_LENGTH = 5;

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ALPHABET[Math.floor(rng() * ALPHABET.length)];
  return code;
}

/** Uppercases and strips spaces and dashes, so "abc-de" works. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));
}
