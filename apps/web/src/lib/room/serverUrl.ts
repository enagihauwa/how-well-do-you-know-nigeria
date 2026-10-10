/**
 * The room server's address. With NEXT_PUBLIC_ROOM_SERVER_URL set (every deployment), rooms and
 * accounts live on the real server and work across phones. Without it (local development only),
 * rooms run between tabs on one device and there are no accounts.
 */
export const ROOM_SERVER_URL = process.env.NEXT_PUBLIC_ROOM_SERVER_URL ?? "";
export const usingLocalRooms = ROOM_SERVER_URL === "";
