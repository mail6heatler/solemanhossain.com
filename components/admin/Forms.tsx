"use client";
import { useActionState } from "react";
import { login, changePassword } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action}>
      <label htmlFor="u">username</label>
      <div className="iw"><i className="ti ti-user" /><input id="u" name="username" autoComplete="username" required autoFocus defaultValue={state?.username ?? ""} /></div>
      <label htmlFor="p">password</label>
      <div className="iw"><i className="ti ti-lock" /><input id="p" name="password" type="password" autoComplete="current-password" required placeholder="••••••••••" /></div>
      <details className="forgot">
        <summary>forgot password?</summary>
        <p>The password saved as <b>ADMIN_PASSWORD</b> in your Vercel project settings always works as a recovery key. Use it to log in, then set a new password in Settings.</p>
      </details>
      {state?.error && <p className="err">{state.error}</p>}
      <button disabled={pending}><i className="ti ti-login-2" />{pending ? "signing in…" : "sign in"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="f">
      <div className="f3">
        <div className="fl"><label>Current password</label><input className="inp" name="current" type="password" required autoComplete="current-password" /></div>
        <div className="fl"><label>New password</label><input className="inp" name="next" type="password" required minLength={8} autoComplete="new-password" /></div>
        <div className="fl"><label>Repeat new password</label><input className="inp" name="confirm" type="password" required minLength={8} autoComplete="new-password" /></div>
      </div>
      {state?.error && <div className="err">{state.error}</div>}
      {state?.ok && <div style={{ color: "var(--icon)", fontSize: 12.5 }}>✓ {state.ok}</div>}
      <div><button className="b-dark" disabled={pending}><i className="ti ti-key" />{pending ? "Saving…" : "Change password"}</button></div>
    </form>
  );
}
