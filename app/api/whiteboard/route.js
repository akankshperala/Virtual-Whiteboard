import { connectDB } from "@/lib/db";
import Whiteboard from "@/models/Whiteboard";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  await connectDB();
  const board = await Whiteboard.findOne({ userId });
  return NextResponse.json(board || { shapes: [] });
}

export async function POST(req) {
  const { userId, shapes } = await req.json();
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  await connectDB();
  const board = await Whiteboard.findOneAndUpdate(
    { userId },
    { shapes },
    { upsert: true, new: true }
  );
  return NextResponse.json(board);
}
