(() => {
  const shell = document.getElementById("app-sidebar");
  if (!shell) return;
  const config = JSON.parse(
    document.getElementById("shell-context").textContent,
  );
  const toggle = shell.querySelector("[data-sidebar-toggle]");
  let collapsed = window.innerWidth < 768;
  try {
    const saved = localStorage.getItem("lyads-sidebar-collapsed");
    if (saved !== null) collapsed = saved === "true";
  } catch {}
  function apply() {
    document.body.classList.toggle("app-sidebar-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute(
      "aria-label",
      collapsed ? "Développer le menu" : "Réduire le menu",
    );
  }
  apply();
  const navigation = shell.querySelector(".app-sidebar-nav");
  try {
    navigation.scrollTop = Number(
      sessionStorage.getItem("lyads-sidebar-scroll") || 0,
    );
  } catch {}
  navigation.addEventListener(
    "scroll",
    () => {
      try {
        sessionStorage.setItem(
          "lyads-sidebar-scroll",
          String(navigation.scrollTop),
        );
      } catch {}
    },
    { passive: true },
  );
  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    apply();
    try {
      localStorage.setItem("lyads-sidebar-collapsed", String(collapsed));
    } catch {}
  });
  // Interactive source screens may remount their own old navigation.
  function normalize() {
    for (const frame of document.querySelectorAll("[data-source-width]")) {
      const root = frame.firstElementChild;
      if (root && !root.hasAttribute("data-app-source-layout"))
        root.setAttribute("data-app-source-layout", "");
      for (const candidate of frame.querySelectorAll("div[style]")) {
        const style = candidate.getAttribute("style") || "";
        if (
          /width:\s*(64|240)px/.test(style) &&
          /border-right:/.test(style) &&
          candidate.querySelector(
            ".ph-sparkle,.ph-rocket-launch,.ph-squares-four",
          )
        )
          candidate.remove();
      }
    }
  }
  normalize();
  let queued = false;
  new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        normalize();
      });
    }
  }).observe(document.querySelector("x-dc,#dc-root") || document.body, {
    subtree: true,
    childList: true,
  });
  if (config.ref !== "C1.1")
    fetch(
      `/api/dashboard/context?organization=${encodeURIComponent(config.organization)}`,
    )
      .then(async (r) => {
        if (!r.ok) return;
        const data = await r.json();
        const amount = data.credits?.available;
        if (amount != null)
          shell.querySelector("[data-credit-balance]").textContent =
            new Intl.NumberFormat("fr-FR").format(Number(amount));
      })
      .catch(() => {});
})();
