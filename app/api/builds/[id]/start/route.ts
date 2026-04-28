/**
 * POST /api/builds/[id]/start
 * CLI gọi sau khi upload xong → server xử lý Apple cert/profile
 * Chạy async (không block response)
 */

import { NextRequest, NextResponse } from "next/server";
import { startBuild } from "@/lib/build.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  startBuild(id).catch((err) =>
    console.error(`[startBuild ${id}]`, err.message)
  );
  return NextResponse.json({ ok: true, message: "Build started" });
}
