/* ========================================
   MENU HAMBURGER — Ouverture / Fermeture
   ======================================== */
(function () {
  const hamburger = document.getElementById("hamburger");
  const sidebar = document.getElementById("sidebar");
  const sidebarClose = document.getElementById("sidebarClose");
  const overlay = document.getElementById("overlay");

  function openMenu() {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    hamburger.classList.add("active");
  }

  function closeMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    hamburger.classList.remove("active");
  }

  hamburger.addEventListener("click", function () {
    if (sidebar.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  sidebarClose.addEventListener("click", closeMenu);
  overlay.addEventListener("click", closeMenu);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sidebar.classList.contains("open")) {
      closeMenu();
    }
  });
})();

/* ========================================
   JETONS — Effets clic et sélection
   ======================================== */
(function () {
  const jetons = document.querySelectorAll(".jeton");
  let selectedJeton = null;

  jetons.forEach(function (jeton) {
    jeton.addEventListener("click", function () {
      if (selectedJeton && selectedJeton !== jeton) {
        selectedJeton.classList.remove("selected");
        selectedJeton.classList.remove("pop");
      }

      if (selectedJeton === jeton) {
        jeton.classList.remove("selected");
        jeton.classList.remove("pop");
        selectedJeton = null;
        return;
      }

      jeton.classList.remove("pop");
      void jeton.offsetWidth;
      jeton.classList.add("pop");
      jeton.classList.add("selected");
      selectedJeton = jeton;
    });
  });
})();

/* ========================================
   FOOTER BOUTONS
   ======================================== */
(function () {
  const trashBtn = document.querySelector(".footer-trash");
  const undoBtn = document.querySelector(".footer-undo");

  trashBtn.addEventListener("click", function () {
    const selected = document.querySelector(".jeton.selected");
    if (selected) {
      selected.classList.remove("selected");
      selected.classList.remove("pop");
    }
    console.log("🗑️ Toutes les mises effacées");
  });

  undoBtn.addEventListener("click", function () {
    console.log("↩️ Répéter les mises précédentes");
  });
})();
