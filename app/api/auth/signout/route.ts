import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = await cookies();

  // حذف الكوكي من جهة السيرفر
  cookieStore.delete("play_session");

  // تجهيز رابط العودة للرئيسية
  const url = new URL("/", request.url);
  const response = NextResponse.redirect(url);

  // إجبار المتصفح على تصفير الكوكي وحذفه فوراً
  response.cookies.delete("play_session");
  response.cookies.set("play_session", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
