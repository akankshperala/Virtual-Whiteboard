// app/api/pages/route.js
import { NextResponse } from "next/server";
import { createNewPage, getAllPages } from "@/app/actions/useractions";
import { getServerSession } from "next-auth";
import { authoptions } from "../auth/[...nextauth]/route";

export async function GET(request) {
  try {
     const userId = request.headers.get("user-id");
  if (!userId) {
    return NextResponse.json({ error: "No uid supplied" }, { status: 401 });
  }

    const pages = await getAllPages(userId);
    return NextResponse.json(pages, { status: 200 });
  } catch (err) {
    console.error("GET /api/pages error", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = body.title || "Untitled Page";
    const created = await createNewPage(title,body.owner);
    // createNewPage returns { pageId, title, createdAt }
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/pages error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
