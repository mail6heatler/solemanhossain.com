"use client";
import { useState } from "react";

/** a password box with an eye button that shows what's typed, and hides it again */
export default function PasswordInput({ className = "inp", wrap = "pw-wrap", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { wrap?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className={wrap}>
      <input {...props} className={className} type={show ? "text" : "password"} />
      <button type="button" className="pw-eye" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} title={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
        <i className={`ti ti-${show ? "eye-off" : "eye"}`} aria-hidden />
      </button>
    </span>
  );
}
