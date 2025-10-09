"use client";
import { useSession } from "next-auth/react";
import WhiteboardCanvas from "@/components/WhiteboardCanvas";

export default function HomePage() {
  const { data: session } = useSession();

  if (!session) return <div>Please log in to use the whiteboard</div>;

  return (
    <div className="h-screen w-full">
      <WhiteboardCanvas userId={session.user.email} />
    </div>
  );
}
