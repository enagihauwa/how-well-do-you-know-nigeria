import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomEntry } from "@/components/room/RoomEntry";

export const metadata: Metadata = {
  title: "Play with friends · How Well Do You Know Nigeria?",
};

export default function Page() {
  // RoomEntry reads ?mode= (a game picked on the home screen) with useSearchParams.
  return (
    <Suspense>
      <RoomEntry />
    </Suspense>
  );
}
