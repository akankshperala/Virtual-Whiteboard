import { verifySession } from "@/lib/auth";

export async function GET() {
  const user = await verifySession();
  if (!user) {
    return new Response(JSON.stringify({ loggedIn: false }), { status: 401 });
  }
  return new Response(JSON.stringify({ loggedIn: true, user }), { status: 200 });
}
