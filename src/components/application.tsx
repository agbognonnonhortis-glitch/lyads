"use client";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Screen } from "@/lib/screens";
import { useApp } from "@/lib/store";
import { Shell } from "./shell";
import { Toast } from "./ui";
import { PublicPages } from "./public";
import { Dashboard } from "./dashboard";
import { Agent } from "./agent";
import { Manager } from "./manager";
import { Onboarding } from "./onboarding";
import { Builder } from "./builder";
import { Studio, CreativeAnalysis } from "./creative";
import { Market } from "./market";
import { Reports } from "./reports";
import { Brain, Settings } from "./settings";
import { Rules } from "./rules";
function Content({ screen, publicId }: { screen: Screen; publicId?: string }) {
  const r = screen.ref;
  if (r.startsWith("B")) return <Onboarding screen={screen} />;
  if (r === "C9.5") return <Reports refId={r} publicId={publicId} />;
  if (!r.startsWith("C")) return <PublicPages screen={screen} />;
  const group = r.split(".")[0];
  return (
    <Shell screen={screen}>
      {group === "C1" ? (
        <Dashboard screen={screen} />
      ) : group === "C2" ? (
        <Agent screen={screen} />
      ) : group === "C3" ? (
        <Manager screen={screen} />
      ) : group === "C4" ? (
        <Builder screen={screen} />
      ) : group === "C5" ? (
        <Studio refId={r} />
      ) : group === "C6" ? (
        <CreativeAnalysis refId={r} />
      ) : group === "C7" ? (
        <Rules refId={r} />
      ) : group === "C8" ? (
        <Market refId={r} />
      ) : group === "C9" ? (
        <Reports refId={r} />
      ) : group === "C10" ? (
        <Brain refId={r} />
      ) : (
        <Settings refId={r} />
      )}
    </Shell>
  );
}
export function Application({
  screen,
  publicId,
}: {
  screen: Screen;
  publicId?: string;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60000, retry: false } },
      }),
  );
  const theme = useApp((s) => s.theme);
  useEffect(() => {
    useApp.persist.rehydrate();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <QueryClientProvider client={client}>
      <Content key={screen.ref} screen={screen} publicId={publicId} />
      <Toast />
    </QueryClientProvider>
  );
}
