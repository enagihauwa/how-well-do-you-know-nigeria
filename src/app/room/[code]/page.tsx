import { Suspense } from "react";
import { RoomScreen } from "@/components/room/RoomScreen";

// The room code is read on the client with useParams. Passing the params promise down instead
// would hand RoomScreen a new promise whenever the page re-renders, remounting it and dropping
// the player's live connection.
export default function Page() {
  return (
    <Suspense>
      <RoomScreen />
    </Suspense>
  );
}
