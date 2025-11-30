// app/api/pages/[id]/route.js
import { NextResponse } from "next/server";
import connectdb from "@/lib/mgdb";
import Page from "@/models/page.model"; // your Page mongoose model

// DELETE /api/pages/:id
export async function DELETE(request, { params }) {
  const { id } =await params;
  try {
    await connectdb();
    const deleted = await Page.findByIdAndDelete(id).lean();
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/pages/[id] error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// PATCH /api/pages/:id -> rename
export async function PATCH(request, { params }) {
  const { id } =await params;
  try {
    const body = await request.json();
    const title = body.title;
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    await connectdb();
    const updated = await Page.findByIdAndUpdate(id, { title }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      pageId: updated._id.toString(),
      title: updated.title,
      updatedAt: updated.updatedAt,
      createdAt: updated.createdAt
    }, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/pages/[id] error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
