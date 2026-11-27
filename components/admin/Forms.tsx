"use client";
import { useActionState } from "react";
import { login, changePassword } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  // two-step login: after the password, the code from the authenticator app (or a recovery code)
  if (state?.step === "code") return (
    <form action={action}>
      <input type="hidden" name="ticket" value={state.ticket ?? ""} />
      <input type="hidden" name="username" value={state.username ?? ""} />
      <label htmlFor="c">6-digit code from your authenticator app</label>
      <div className="iw"><i className="ti ti-shield-lock" /><input id="c" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus placeholder="123 456" maxLength={20} /></div>
      <details className="forgot">
        <summary>lost your phone?</summary>
        <p>Type one of the recovery codes you saved when you set up two-step login. Each works once.</p>
      </details>
      {state?.error && <p className="err">{state.error}</p>}
      <button disabled={pending}><i className="ti ti-login-2" />{pending ? "checking…" : "sign in"}</button>
    </form>
  );
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
