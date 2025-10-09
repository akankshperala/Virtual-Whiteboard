import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import cookie from "cookie";
import jwt from "jsonwebtoken";

export async function POST(req) {
  const { name, email, password } = await req.json();
  await connectDB();

  const existingUser = await User.findOne({ email });
  if (existingUser) return new Response(JSON.stringify({ error: "User already exists" }), { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return new Response(JSON.stringify({ message: "Signup successful" }), {
    status: 201,
    headers: {
      "Set-Cookie": cookie.serialize("token", token, {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }),
    },
  });
}
