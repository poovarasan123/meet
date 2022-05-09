import type { MutableRefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { requireUserId } from "~/utils/auth.server";
import { getToken } from "~/utils";
import ParticipantVideo from "~/components/participant";
import Video from "twilio-video";
import CallFooter from "~/components/call-footer";
import { useRoomContext } from "~/context/RoomContext";

export const loader: LoaderFunction = async ({ params, request }) => {
  return json({
    roomId: params.roomId,
    user: await requireUserId(request),
  });
};

export default function RoomCall() {
  const panel = useRef<HTMLDivElement | null>(null);
  const { room, setRoom, participantConnected, participants } =
    useRoomContext();
  const { roomId, user } = useLoaderData();

  const [windowSize, setWindowSize] = useState<{
    width: null | number;
    height: null | number;
  }>({
    width: null,
    height: null,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      function handleResize() {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight - 96,
        });
      }

      window.addEventListener("resize", handleResize);

      handleResize();

      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  function area(increment: number) {
    let i = 0;
    let w = 0;
    let h = (increment * 9) / 16 + 10 * 2;
    if (panel && panel.current && windowSize.width && windowSize.height) {
      while (i < panel.current?.children.length) {
        if (w + increment > windowSize.width) {
          w = 0;
          h = h + (increment * 9) / 16 + 10 * 2;
        }
        w = w + increment + 10 * 2;
        i++;
      }
      if (h > windowSize.height || increment > windowSize.width) return false;
      else return increment;
    }
  }

  useEffect(() => {
    let max = 0;
    let i = 1;
    while (i < 5000) {
      let area2 = area(i);
      if (area2 === false) {
        max = i - 1;
        break;
      }
      i++;
    }

    max = max - 10 * 2;

    for (var s = 0; s < panel.current!.children.length; s++) {
      let element = panel.current!.children[s] as HTMLDivElement;
      element.style.margin = 10 + "px";
      element.style.width = max + "px";
      element.style.height = (max * 9) / 16 + "px";
    }
  }, [windowSize, participantConnected]);

  useEffect(() => {
    getToken(roomId, user).then((token) => {
      Video.connect(token, {
        name: roomId,
      }).then((room) => {
        setRoom(room);
      });
    });
  }, []);

  useEffect(() => {
    if (room) {
      room.on("participantConnected", participantConnected);
      room.participants.forEach(participantConnected);
    }
  }, [room]);

  const remoteParticipants = participants?.map((participant) => (
    <ParticipantVideo key={participant.sid} participant={participant} />
  ));

  return (
    <div className="bg-gray-900 h-screen grid grid-rows-[auto_min-content]">
      <div
        ref={panel}
        className="overflow-hidden flex content-center flex-wrap items-center justify-center align-middle flex-1"
      >
        {room && (
          <>
            <ParticipantVideo participant={room?.localParticipant} />
            {remoteParticipants}
          </>
        )}
        {/* {[...Array(10)].map(() => (
          <div className="relative align-middle self-center overflow-hidden inline-block">
            <video
              className="absolute right-0 object-cover bottom-0 w-full h-full overflow-hidden left-0 top-0 background-cover bg-black"
              playsInline
              autoPlay
              loop
              src="/demo.mp4"
            />
          </div>
        ))} */}
      </div>
      <CallFooter />
    </div>
  );
}
