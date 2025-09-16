// app/components/ui/PasswordField.tsx
"use client";

import React from "react";

type PasswordFieldProps = {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
  disabled?: boolean;
  inputClassName?: string; // opsional, untuk override kelas input
};

export default function PasswordField({
  label = "Password",
  value,
  onChange,
  id,
  name,
  placeholder = "kata sandi",
  minLength = 6,
  required = true,
  autoComplete = "current-password",
  disabled = false,
  inputClassName = "",
}: PasswordFieldProps) {
  const [show, setShow] = React.useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          minLength={minLength}
          required={required}
          autoComplete={autoComplete}
          disabled={disabled}
          className={[
            "mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-900",
            "pr-10", // ruang untuk tombol eye
            inputClassName,
          ].join(" ")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-2 my-1 grid place-items-center rounded-md px-2 text-gray-500 hover:text-gray-700"
          aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          title={show ? "Sembunyikan" : "Tampilkan"}
        >
          {show ? (
            // eye-off
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3l18 18M9.88 9.88A3 3 0 0012 15a3 3 0 002.12-.88M6.53 6.53C4.63 7.76 3.11 9.59 2 12c2.73 6 9.27 6 12 6 1.52 0 2.94-.22 4.24-.63M14.12 9.88A3 3 0 019 12"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.47 6.53C15.75 5.9 13.92 5.5 12 5.5 9.27 5.5 2.73 5.5 0 12c.66 1.46 1.55 2.67 2.62 3.6" className="hidden" />
            </svg>
          ) : (
            // eye
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
