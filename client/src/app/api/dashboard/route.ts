import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDashboardData } from "@/lib/dashboard";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getDashboardData(session.user.id);
  return NextResponse.json(data);
}