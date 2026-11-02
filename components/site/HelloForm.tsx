"use client";
import { useActionState } from "react";
import { sendHello } from "@/app/actions";

export default function HelloForm({ title }: { title: string }) {
  const [state, action, pending] = useActionState(sendHello, undefined);
  if (state?.ok)
    return (
      <div className="hello">
        <h3>Message received ✨</h3>
        <p className="ok">Thanks for saying hello. I read every one of these.</p>
      </div>
    );
  return (
    <form action={action} className="hello">
      <h3>{title}</h3>
      <input name="name" placeholder="Your name" required maxLength={80} autoComplete="name" defaultValue={state?.values?.name} />
      <input name="email" type="email" placeholder="Email (optional, if you'd like a reply)" maxLength={160} autoComplete="email" defaultValue={state?.values?.email} />
      <textarea name="message" placeholder="What's on your mind?" required maxLength={2000} defaultValue={state?.values?.message} />
      <div className="hp" aria-hidden><input name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="chk"><input type="checkbox" name="public" /> Show my note on the public wall (after I approve it)</label>
      {state?.error && <p className="err">{state.error}</p>}
      <button className="btn-mint" disabled={pending} style={{ alignSelf: "flex-start" }}>
        <i className="ti ti-send" />{pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
