// app/api/pages/[pageId]/share/route.js
import { NextResponse } from "next/server";
import connectdb from "@/lib/mgdb";
import Page from "@/models/page.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authoptions } from "@/app/api/auth/[...nextauth]/route"; // adjust path if needed

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export async function POST(request, { params }) {
  const pageId =await params.id;
  if (!pageId || !isValidObjectId(pageId)) {
    console.warn("Invalid pageId :", pageId);
    return NextResponse.json({ error: "Invalid pageId" }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error("Invalid JSON body", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const inputUsers = Array.isArray(body.users) ? body.users : [];
  if (!inputUsers.length) {
    return NextResponse.json({ error: "No users provided" }, { status: 400 });
  }

  try {
    // auth
    const session = await getServerSession(authoptions);
    if (!session || !session.user) {
      console.warn("Not authenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // try to robustly get requester id
    let requesterId = session.user.id || session.user?.sub || null;
    // if not present, try to find user by email
    if (!requesterId && session.user.email) {
      await connectdb();
      const u = await User.findOne({ email: session.user.email }).lean();
      if (u) requesterId = String(u._id);
    }
    if (!requesterId) {
      console.warn("requesterId not found in session or DB", session.user);
      return NextResponse.json({ error: "Unable to determine requester id" }, { status: 401 });
    }

    await connectdb();

    const page = await Page.findById(pageId);
    if (!page) {
      console.warn("Page not found:", pageId);
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Owner check: if page.owner is empty, optionally set it to requester (uncomment if desired)
    if (!page.owner) {
      console.info("Page has no owner — setting owner to requester:", requesterId);
      page.owner = mongoose.Types.ObjectId(requesterId);
      await page.save();
    }

    if (String(page.owner) !== String(requesterId)) {
      console.warn("Requester is not owner:", requesterId, "owner:", page.owner);
      return NextResponse.json({ error: "Only owner can share this page" }, { status: 403 });
    }

    const added = [];
    const skipped = [];

    // gather objectIds to add
    const toAddObjectIds = [];

    for (const raw of inputUsers) {
      if (!raw || typeof raw !== "string") {
        skipped.push({ input: raw, reason: "invalid" });
        continue;
      }
      const item = raw.trim();
      // if looks like ObjectId
      if (isValidObjectId(item)) {
        const uid = item;
        const exists = await User.exists({ _id: uid });
        if (!exists) {
          skipped.push({ input: item, reason: "user-not-found" });
          continue;
        }
        toAddObjectIds.push(mongoose.Types.ObjectId(uid));
        added.push(String(uid));
        continue;
      }

      // otherwise treat as email
      const user = await User.findOne({ email: item }).lean();
      if (!user) {
        skipped.push({ input: item, reason: "email-not-found" });
        continue;
      }
      toAddObjectIds.push(new mongoose.Types.ObjectId(user._id));
      added.push(String(user._id));
    }

    if (toAddObjectIds.length === 0) {
      return NextResponse.json({ ok: true, added: [], skipped, users: page.users }, { status: 200 });
    }

    // Atomically add unique objectIds to page.users
    const updated = await Page.findByIdAndUpdate(
      pageId,
      { $addToSet: { users: { $each: toAddObjectIds } } },
      { new: true }
    ).lean();
    

    return NextResponse.json({ ok: true, added, skipped, users: (updated.users || []).map(String) }, { status: 200 });
  } catch (err) {
    console.error("share route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
