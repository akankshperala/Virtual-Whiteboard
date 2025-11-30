"use client";

export const dynamic = "force-dynamic";

import { useSearchParams } from "next/navigation";

export default function Page() {
  // const params = useSearchParams();
  const error =  "Unknown error";

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-semibold">Authentication Error</h1>
      <p className="mt-2 text-sm text-gray-400">{error}</p>
    </div>
  );
}
