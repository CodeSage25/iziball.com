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

  // Clic sur le hamburger
  hamburger.addEventListener("click", function () {
    if (sidebar.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Clic sur le bouton X dans la sidebar
  sidebarClose.addEventListener("click", closeMenu);

  // Clic sur l'overlay (en dehors du menu)
  overlay.addEventListener("click", closeMenu);

  // Fermer avec Echap
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
      // Désélectionner le jeton précédent
      if (selectedJeton && selectedJeton !== jeton) {
        selectedJeton.classList.remove("selected");
        selectedJeton.classList.remove("pop");
      }

      // Toggle sélection sur le jeton cliqué
      if (selectedJeton === jeton) {
        jeton.classList.remove("selected");
        jeton.classList.remove("pop");
        selectedJeton = null;
        return;
      }

      // Appliquer l'animation pop
      jeton.classList.remove("pop");
      // Force reflow pour relancer l'animation
      void jeton.offsetWidth;
      jeton.classList.add("pop");
      jeton.classList.add("selected");
      selectedJeton = jeton;
    });

    // Retirer la classe pop à la fin de l'animation
    jeton.addEventListener("animationend", function () {
      // On garde 'selected' mais on peut retirer 'pop' si on veut
      // pour permettre de relancer l'animation au prochain clic
    });
  });
})();

/* ========================================
   FOOTER BOUTONS — Effets visuels
   ======================================== */
(function () {
  const trashBtn = document.querySelector(".footer-trash");
  const undoBtn = document.querySelector(".footer-undo");

  trashBtn.addEventListener("click", function () {
    // Désélectionner le jeton courant
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
