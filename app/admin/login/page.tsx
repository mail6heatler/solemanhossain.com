import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { LoginForm } from "@/components/admin/Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin sign in", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const s = await getSettings();
  return (
    <main className="adm-login">
      <div className="box">
        <div className="logo">{(s.nickname || s.fullName).slice(0, 1)}</div>
        <h1>{(s.nickname || s.fullName).split(" ")[0]} admin</h1>
        <div className="tag">sign in to manage {s.fullName}</div>
        <LoginForm />
        <div className="foot">single admin account · <a href="/">back to site</a></div>
      </div>
    </main>
  );
}
