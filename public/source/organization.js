(() => {
  const { current, canSwitch = false } = JSON.parse(
    document.getElementById("company-context").textContent,
  );
  const pickerPath = JSON.parse(
    document.getElementById("source-config").textContent,
  ).paths["C1.2"];
  // The supplied prototype can remount its sidebar. Reapply only the business
  // identity, leaving its layout and unrelated controls intact.
  const bind = () => {
    for (const el of document.querySelectorAll("div,span"))
      if (
        !el.children.length &&
        !el.hasAttribute("data-company-name") &&
        el.textContent.trim() === "Kola Distribution"
      ) {
        el.textContent = current.name;
        el.dataset.companyName = "";
        const card = el.parentElement?.parentElement;
        if (card?.getAttribute("style")?.includes("border-radius:12px")) {
          card.dataset.companyPicker = "";
          card.setAttribute("role", "button");
          card.tabIndex = 0;
          const avatar = card.firstElementChild;
          if (avatar?.textContent.trim() === "KD")
            avatar.textContent = current.name.slice(0, 2).toUpperCase();
        }
      }
    for (const avatar of document.querySelectorAll("div,span")) {
      if (
        !avatar.children.length &&
        avatar.textContent.trim() === "KD" &&
        !avatar.matches("[data-company-picker], [data-company-static]")
      ) {
        avatar.textContent = current.name.slice(0, 2).toUpperCase();
        avatar.setAttribute("aria-label", current.name);
        avatar.setAttribute("title", current.name);
        avatar.dataset.companyPicker = "";
        avatar.setAttribute("role", "button");
        avatar.tabIndex = 0;
      }
    }
    if (!canSwitch) {
      for (const picker of document.querySelectorAll("[data-company-picker]")) {
        picker.removeAttribute("role");
        picker.removeAttribute("tabindex");
        picker.dataset.companyStatic = "";
        delete picker.dataset.companyPicker;
        picker.style.cursor = "default";
        picker.querySelector(".ph-caret-up-down")?.remove();
      }
    }
    for (const frame of document.querySelectorAll("[data-source-width]"))
      if (!frame.querySelector("[data-company-name]")) {
        const heading = [...frame.querySelectorAll("div,span,h1")]
          .filter(
            (e) =>
              !e.children.length && e.textContent.trim() === "Tableau de bord",
          )
          .at(-1);
        if (heading) {
          const label = document.createElement("span");
          label.dataset.companyName = "";
          label.textContent = current.name;
          label.style.cssText =
            "font:500 12px Figtree,sans-serif;color:#6E6862";
          heading.parentElement.append(label);
        }
      }
  };
  bind();
  new MutationObserver(bind).observe(document.body, {
    subtree: true,
    childList: true,
  });
  let busy = false;
  document.addEventListener(
    "click",
    async (e) => {
      const row = e.target.closest("[data-company-id]");
      const picker = e.target.closest(
        "[data-company-picker], [data-company-static]",
      );
      if (!row && !picker) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!canSwitch) return;
      if (picker) {
        location.assign(pickerPath);
        return;
      }
      if (busy) return;
      busy = true;
      try {
        const r = await fetch("/api/organizations/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: row.dataset.companyId }),
        });
        const data = await r.json();
        if (!r.ok)
          throw new Error(
            data.error?.message ||
              "Réessayez la sélection de votre entreprise.",
          );
        location.assign("/app/tableau-de-bord");
      } catch (error) {
        window.alert(error.message);
        busy = false;
      }
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (
      ["Enter", " "].includes(e.key) &&
      e.target.matches("[data-company-picker]")
    ) {
      e.preventDefault();
      e.target.click();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.matches("[data-company-search]"))
      e.target
        .closest("[data-source-width]")
        .querySelectorAll("[data-company-id]")
        .forEach((row) => {
          row.style.display = row.textContent
            .toLocaleLowerCase("fr")
            .includes(e.target.value.toLocaleLowerCase("fr"))
            ? ""
            : "none";
        });
  });
})();
