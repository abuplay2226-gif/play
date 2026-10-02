import { getCurrentUser, type UserRole } from "@/lib/auth-guard";
import { SiteShellClient } from "@/components/site-shell-client";

export async function SiteShell({
  title,
  children,
  userRole,
  userName,
}: {
  title: string;
  children: React.ReactNode;
  userRole?: UserRole;
  userName?: string | null;
}) {
  // قراءة جلسة المستخدم من السيرفر مباشرة (يتجاوز حماية httpOnly)
  const sessionUser = await getCurrentUser();
  const activeRole: UserRole = userRole || sessionUser?.role || "STAFF";
  const activeName: string = userName || sessionUser?.name || "مستخدم مسجل";

  return (
    <SiteShellClient
      title={title}
      userRole={activeRole}
      userName={activeName}
    >
      {children}
    </SiteShellClient>
  );
}