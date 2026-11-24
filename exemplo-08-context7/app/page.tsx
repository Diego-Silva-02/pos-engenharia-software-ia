"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 fill-current"
    >
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.68-3.76-1.32-3.76-1.32-.5-1.29-1.24-1.64-1.24-1.64-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1.76 2.45 3.92 1.73.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.05 1.15a10.6 10.6 0 0 1 5.55 0c2.11-1.45 3.04-1.15 3.04-1.15.61 1.54.23 2.68.12 2.96.71.78 1.14 1.78 1.14 3 0 4.29-2.61 5.23-5.1 5.51.4.35.75 1.02.75 2.06v3.05c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  );
}

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signInWithGitHub() {
    setErrorMessage("");
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });

    if (error) {
      setErrorMessage(error.message ?? "Não foi possível iniciar o login.");
    }
  }

  async function signOut() {
    setErrorMessage("");
    setIsSigningOut(true);
    const { error } = await authClient.signOut();
    setIsSigningOut(false);

    if (error) {
      setErrorMessage(error.message ?? "Não foi possível encerrar a sessão.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 sm:p-10">
        <div className="mb-8 inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-700">
          <GitHubIcon />
        </div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-700">
          Demo de autenticação
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-950">
          Hello World
        </h1>

        <div
          aria-live="polite"
          className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-700"
        >
          {isPending ? (
            <p>Verificando sessão...</p>
          ) : session ? (
            <>
              <div className="flex items-center gap-3">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={`Foto de ${session.user.name || session.user.email}`}
                    className="h-12 w-12 shrink-0 rounded-full bg-slate-200 object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600"
                  >
                    {(session.user.name || session.user.email)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Logado como</p>
                  <p className="truncate font-semibold text-slate-950">
                    {session.user.name || session.user.email}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {session.user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                disabled={isSigningOut}
                className="mt-5 w-full rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-wait disabled:opacity-60"
              >
                {isSigningOut ? "Saindo..." : "Sair"}
              </button>
            </>
          ) : (
            <p>Você não está logado.</p>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div className="mt-7">
          {!isPending && !session && (
            <button
              type="button"
              onClick={signInWithGitHub}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-900 px-5 py-3.5 font-semibold text-white transition hover:bg-slate-700"
            >
              <GitHubIcon />
              Entrar com GitHub
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Autenticação com Better Auth e sessão persistida localmente em SQLite.
        </p>
      </section>
    </main>
  );
}
