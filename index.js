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

/* ========================================
   ROULETTE ZEBAL — Animation complète (v2)
   ========================================
   Séquence :
   1. Remplissage progressif de la zone intérieure (droite → gauche)
   2. Rotation des 9 boules sur l'arc (1 demi-tour = 180° sur le demi-cercle)
   3. Boule gagnante arrive en position centrale (boule-5, sous la flèche)
   4. Lueur + insertion historique
   ======================================== */
(function () {
  "use strict";

  // ===== CONFIGURATION =====
  var CONFIG = {
    // Durées (ms)
    FILL_DURATION: 3000, // durée du remplissage
    SPIN_DURATION: 4000, // durée de la rotation
    GLOW_DURATION: 2500, // durée de la lueur gagnante
    PAUSE_AFTER_FILL: 400, // pause entre remplissage et rotation
    FADE_OUT_FILL: 600, // durée du fondu de disparition du remplissage
    AUTO_SPIN_INTERVAL: 14000, // intervalle entre tours auto
    FIRST_SPIN_DELAY: 1500, // délai avant le premier tour

    // Géométrie du demi-cercle (tirée du SVG original)
    CENTER_X: 155.67,
    CENTER_Y: 159.41,
    ARC_RADIUS: 120, // rayon de l'arc sur lequel tournent les boules
    BOULE_RADIUS: 23.1, // rayon de chaque boule (identique à l'original)
    BOULE_COUNT: 9,

    // Rotation
    // Les boules font 1 "tour" = parcourent 180° sur le demi-cercle
    // (puisque c'est un demi-cercle, 180° = un passage complet)
    ROTATION_AMOUNT: 180, // degrés de rotation par tour
  };

  // ===== DONNÉES DES 9 BOULES =====
  // Correspondance exacte avec le SVG original (id, data-number, couleur)
  var BOULES_DATA = [
    { id: "boule-1", index: 0, number: 2, color: "#e30613", type: "rouge" },
    { id: "boule-2", index: 1, number: 1, color: "#000000", type: "noire" },
    { id: "boule-3", index: 2, number: 3, color: "#e30613", type: "rouge" },
    { id: "boule-4", index: 3, number: 4, color: "#000000", type: "noire" },
    { id: "boule-5", index: 4, number: 0, color: "#fed700", type: "jaune" },
    { id: "boule-6", index: 5, number: 7, color: "#e30613", type: "rouge" },
    { id: "boule-7", index: 6, number: 6, color: "#000000", type: "noire" },
    { id: "boule-8", index: 7, number: 5, color: "#e30613", type: "rouge" },
    { id: "boule-9", index: 8, number: 8, color: "#000000", type: "noire" },
  ];

  // ===== ÉTAT GLOBAL =====
  var state = {
    isSpinning: false, // animation en cours ?
    currentOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8], // ordre actuel des boules sur les 9 positions
    winnerBouleId: null, // id de la boule gagnante (ex: "boule-3"), paramétrable
    spinCounter: 0, // compteur de tours pour l'historique
  };

  // ===== RÉFÉRENCES SVG =====
  var refs = {
    svgLogo: null, // le <svg class="middle-logo">
    zoneInterieure: null, // #zone-interieure
    texteZebal: null, // #texte-zebal
    fillArcEl: null, // élément de remplissage progressif
    boulesGroups: [], // les <g> originaux des boules (boule-1 à boule-9)
    arrowPolygon: null, // le triangle/flèche fixe au sommet (dans boule-5)
  };

  var svgNS = "http://www.w3.org/2000/svg";

  // ===== FONCTION PUBLIQUE : setWinner =====
  // Appeler setWinner("boule-3") pour que la boule 3 arrive au centre
  // Si non appelée ou null, une boule aléatoire est choisie
  window.setWinner = function (bouleId) {
    state.winnerBouleId = bouleId || null;
  };

  // --- FIN PARTIE A ---
  // ===== PARTIE B — FONCTIONS UTILITAIRES =====

  // Les 9 positions sur le demi-cercle sont réparties uniformément.
  // Position 0 = extrémité gauche (180°)
  // Position 4 = sommet central (90°) — sous la flèche
  // Position 8 = extrémité droite (0°)
  //
  // Convention d'angles : 0° = droite, 90° = haut, 180° = gauche
  // (comme le cercle trigonométrique, Y inversé pour le SVG)

  /**
   * Retourne l'angle (en degrés) de la position n° posIndex sur l'arc.
   * posIndex : 0 (gauche) à 8 (droite)
   */
  function getPositionAngle(posIndex) {
    // 9 positions, de 180° à 0°, espacées de 22.5° chacune
    // spacing = 180 / (CONFIG.BOULE_COUNT - 1) = 22.5°
    var spacing = 180 / (CONFIG.BOULE_COUNT - 1);
    return 180 - posIndex * spacing;
  }

  /**
   * Convertit un angle (degrés) en coordonnées (x, y) sur l'arc.
   */
  function angleToXY(angleDeg) {
    var rad = (angleDeg * Math.PI) / 180;
    return {
      x: CONFIG.CENTER_X + CONFIG.ARC_RADIUS * Math.cos(rad),
      y: CONFIG.CENTER_Y - CONFIG.ARC_RADIUS * Math.sin(rad),
    };
  }

  /**
   * Place un groupe <g> de boule SVG à la position angulaire donnée.
   * Met à jour cx/cy du cercle, du contour, et x/y du texte.
   */
  function placeBouleAtAngle(bouleGroup, angleDeg) {
    var pos = angleToXY(angleDeg);

    // Cercle principal (premier <circle>)
    var circles = bouleGroup.querySelectorAll("circle");
    var mainCircle = circles[0];
    if (mainCircle) {
      mainCircle.setAttribute("cx", pos.x.toFixed(2));
      mainCircle.setAttribute("cy", pos.y.toFixed(2));
    }

    // Contour blanc (second <circle> dans le <path> de bordure)
    // Note : dans le SVG original, la bordure est un <path>, pas un 2e circle.
    // On va déplacer tout le groupe via transform à la place.

    // En fait, les boules originales ont des positions codées en dur dans leurs paths.
    // On va utiliser transform translate pour les déplacer.
  }

  /**
   * Calcule le décalage (dx, dy) entre la position actuelle d'une boule
   * et une position cible sur l'arc.
   *
   * @param {number} bouleIndex - index dans BOULES_DATA (0-8)
   * @param {number} targetAngleDeg - angle cible en degrés
   * @returns {{ dx: number, dy: number }}
   */
  function getBouleOffset(bouleIndex, targetAngleDeg) {
    var data = BOULES_DATA[bouleIndex];
    var originalGroup = document.getElementById(data.id);
    if (!originalGroup) return { dx: 0, dy: 0 };

    // Position originale : lire le cx/cy du premier <circle>
    var circle = originalGroup.querySelector("circle");
    if (!circle) return { dx: 0, dy: 0 };

    var origX = parseFloat(circle.getAttribute("cx"));
    var origY = parseFloat(circle.getAttribute("cy"));

    // Position cible
    var target = angleToXY(targetAngleDeg);

    return {
      dx: target.x - origX,
      dy: target.y - origY,
    };
  }

  /**
   * Applique un transform translate sur un groupe <g> de boule.
   */
  function setBouleTransform(bouleGroup, dx, dy) {
    bouleGroup.setAttribute(
      "transform",
      "translate(" + dx.toFixed(2) + ", " + dy.toFixed(2) + ")",
    );
  }

  /**
   * Place une boule (par son index dans BOULES_DATA) à une position
   * donnée sur l'arc (posIndex 0-8), en utilisant transform translate.
   */
  function placeBouleAtPosition(bouleIndex, posIndex) {
    var angle = getPositionAngle(posIndex);
    var offset = getBouleOffset(bouleIndex, angle);
    var group = document.getElementById(BOULES_DATA[bouleIndex].id);
    if (group) {
      setBouleTransform(group, offset.dx, offset.dy);
    }
  }

  /**
   * Place toutes les boules selon l'ordre actuel (state.currentOrder).
   * state.currentOrder[posIndex] = bouleIndex
   * Exemple : currentOrder = [0,1,2,3,4,5,6,7,8] → chaque boule à sa position d'origine
   */
  function placeAllBoules() {
    for (var posIndex = 0; posIndex < CONFIG.BOULE_COUNT; posIndex++) {
      var bouleIndex = state.currentOrder[posIndex];
      placeBouleAtPosition(bouleIndex, posIndex);
    }
  }

  /**
   * Retourne les positions originales (cx, cy) de chaque boule
   * telles que définies dans le SVG HTML.
   */
  function getOriginalPositions() {
    var positions = [];
    for (var i = 0; i < BOULES_DATA.length; i++) {
      var group = document.getElementById(BOULES_DATA[i].id);
      if (group) {
        var circle = group.querySelector("circle");
        positions.push({
          x: parseFloat(circle.getAttribute("cx")),
          y: parseFloat(circle.getAttribute("cy")),
        });
      } else {
        positions.push({ x: 0, y: 0 });
      }
    }
    return positions;
  }

  /**
   * Easing ease-out quart : décélération naturelle
   */
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  /**
   * Easing ease-in-out quad
   */
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // --- FIN PARTIE B ---
  // ===== PARTIE C — INITIALISATION SVG =====

  /**
   * Récupère toutes les références SVG nécessaires.
   * Retourne false si un élément critique est manquant.
   */
  function grabRefs() {
    refs.svgLogo = document.querySelector(".middle-logo");
    refs.zoneInterieure = document.getElementById("zone-interieure");
    refs.texteZebal = document.getElementById("texte-zebal");

    if (!refs.svgLogo || !refs.zoneInterieure || !refs.texteZebal) {
      console.warn("ZeBall: éléments SVG introuvables.");
      return false;
    }

    // Récupérer les groupes originaux des 9 boules
    refs.boulesGroups = [];
    for (var i = 0; i < BOULES_DATA.length; i++) {
      var g = document.getElementById(BOULES_DATA[i].id);
      if (!g) {
        console.warn("ZeBall: " + BOULES_DATA[i].id + " introuvable.");
        return false;
      }
      refs.boulesGroups.push(g);
    }

    // La flèche triangulaire est dans boule-5 (le <polygon>)
    var boule5 = document.getElementById("boule-5");
    if (boule5) {
      refs.arrowPolygon = boule5.querySelector("polygon");
    }

    return true;
  }

  /**
   * Crée le bloc <defs> avec le filtre de lueur (glow) pour la boule gagnante.
   */
  function createDefs() {
    var defs = refs.svgLogo.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS(svgNS, "defs");
      refs.svgLogo.insertBefore(defs, refs.svgLogo.firstChild);
    }

    // Vérifier si le filtre existe déjà
    if (document.getElementById("glow-winner")) return;

    // Filtre lueur dorée
    var filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "glow-winner");
    filter.setAttribute("x", "-50%");
    filter.setAttribute("y", "-50%");
    filter.setAttribute("width", "200%");
    filter.setAttribute("height", "200%");

    var feGaussian = document.createElementNS(svgNS, "feGaussianBlur");
    feGaussian.setAttribute("stdDeviation", "4");
    feGaussian.setAttribute("result", "blur");

    var feMerge = document.createElementNS(svgNS, "feMerge");
    var mergeNode1 = document.createElementNS(svgNS, "feMergeNode");
    mergeNode1.setAttribute("in", "blur");
    var mergeNode2 = document.createElementNS(svgNS, "feMergeNode");
    mergeNode2.setAttribute("in", "SourceGraphic");
    feMerge.appendChild(mergeNode1);
    feMerge.appendChild(mergeNode2);

    filter.appendChild(feGaussian);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
  }

  /**
   * Réorganise l'ordre z (ordre d'empilement) dans le SVG pour que :
   *
   *   1. #zebal               (fond vert — tout en bas)
   *   2. #zone-interieure      (zone intérieure vert foncé)
   *   3. fillArcEl             (le remplissage progressif — sera créé en Partie D)
   *   4. #texte-zebal          (texte "Zebal")
   *   5. boule-1 à boule-9    (les boules — au-dessus de tout sauf la flèche)
   *   6. flèche fixe          (tout en haut)
   *
   * Les éléments SVG sont empilés dans l'ordre du DOM :
   * le dernier enfant est dessiné au-dessus.
   */
  function reorganizeZOrder() {
    var svg = refs.svgLogo;
    var zebal = document.getElementById("zebal");

    // On va réappliquer l'ordre en réinsérant les éléments dans le bon ordre.
    // D'abord, on détache la flèche de boule-5 et on la met dans son propre groupe.

    // --- Extraire la flèche de boule-5 ---
    // La flèche est le <polygon> dans le groupe boule-5.
    // On la sort de boule-5 et on la place dans un groupe indépendant.
    var arrowContainer = document.createElementNS(svgNS, "g");
    arrowContainer.setAttribute("id", "pointer-arrow-fixed");

    if (refs.arrowPolygon) {
      // Cloner la flèche (pour ne pas casser boule-5 pendant la réorg)
      var arrowClone = refs.arrowPolygon.cloneNode(true);
      arrowContainer.appendChild(arrowClone);

      // Supprimer l'original de boule-5
      refs.arrowPolygon.parentNode.removeChild(refs.arrowPolygon);
      refs.arrowPolygon = arrowClone;
    }

    // --- Réinsérer dans l'ordre z correct ---
    // On garde #zebal en premier (il y est déjà normalement)

    // 1. #zebal — déjà en place, on s'assure qu'il est premier
    if (zebal && zebal.parentNode === svg) {
      svg.removeChild(zebal);
      svg.insertBefore(zebal, svg.firstChild);
    }

    // 2. #zone-interieure — juste après zebal
    if (refs.zoneInterieure.parentNode === svg) {
      svg.removeChild(refs.zoneInterieure);
    }
    svg.insertBefore(refs.zoneInterieure, zebal.nextSibling);

    // 3. (fillArcEl sera inséré ici en Partie D, après zone-interieure)

    // 4. #texte-zebal — après zone-interieure (fillArcEl s'intercalera entre les deux)
    if (refs.texteZebal.parentNode === svg) {
      svg.removeChild(refs.texteZebal);
    }
    svg.insertBefore(refs.texteZebal, refs.zoneInterieure.nextSibling);

    // 5. Les 9 boules — après texte-zebal, dans l'ordre boule-1 à boule-9
    var insertAfter = refs.texteZebal;
    for (var i = 0; i < refs.boulesGroups.length; i++) {
      var g = refs.boulesGroups[i];
      if (g.parentNode === svg) {
        svg.removeChild(g);
      }
      // Insérer après l'élément précédent
      if (insertAfter.nextSibling) {
        svg.insertBefore(g, insertAfter.nextSibling);
      } else {
        svg.appendChild(g);
      }
      insertAfter = g;
    }

    // 6. Flèche fixe — tout à la fin (au-dessus de tout)
    svg.appendChild(arrowContainer);
  }

  /**
   * Sauvegarde les positions originales de chaque boule (cx, cy du premier circle).
   * On en a besoin pour calculer les transforms.
   */
  var originalPositions = [];

  function saveOriginalPositions() {
    originalPositions = [];
    for (var i = 0; i < refs.boulesGroups.length; i++) {
      var circle = refs.boulesGroups[i].querySelector("circle");
      if (circle) {
        originalPositions.push({
          x: parseFloat(circle.getAttribute("cx")),
          y: parseFloat(circle.getAttribute("cy")),
        });
      } else {
        originalPositions.push({ x: 0, y: 0 });
      }
    }
  }

  // --- FIN PARTIE C ---
  // ===== PARTIE D — ARC DE REMPLISSAGE PROGRESSIF =====

  /**
   * Crée l'élément SVG <path> qui servira au remplissage progressif.
   * Il est inséré entre #zone-interieure et #texte-zebal dans le z-order.
   *
   * Le remplissage est un arc qui part de la DROITE du demi-cercle
   * et progresse vers la GAUCHE, en se synchronisant avec la rotation.
   *
   * Visuellement, il apparaît SOUS les boules et SOUS le texte "Zebal",
   * mais AU-DESSUS de la zone intérieure verte foncée.
   */
  function createFillArc() {
    refs.fillArcEl = document.createElementNS(svgNS, "path");
    refs.fillArcEl.setAttribute("id", "fill-arc-progress");
    refs.fillArcEl.setAttribute("fill", "rgba(0, 180, 80, 0.35)");
    refs.fillArcEl.setAttribute("opacity", "0");
    refs.fillArcEl.setAttribute("d", "");

    // Insérer entre zone-interieure et texte-zebal
    // zone-interieure est déjà juste avant texte-zebal grâce à reorganizeZOrder()
    var svg = refs.svgLogo;
    svg.insertBefore(refs.fillArcEl, refs.texteZebal);
  }

  /**
   * Dessine l'arc de remplissage selon la progression (0 → 1).
   *
   * Le remplissage part de l'extrémité DROITE (0°) du demi-cercle
   * et progresse vers la GAUCHE (180°).
   *
   * On utilise la géométrie de la zone intérieure (#zone-interieure)
   * qui est un demi-cercle plus petit (rayon ~91.91 selon le path original).
   *
   * @param {number} progress - entre 0 (vide) et 1 (plein)
   */
  function setFillProgress(progress) {
    if (!refs.fillArcEl) return;

    if (progress <= 0.001) {
      refs.fillArcEl.setAttribute("d", "");
      return;
    }

    // Rayon de la zone intérieure (extrait du path original)
    // Le path original : demi-cercle de rayon ~91.91, centré sur (155.61, 151.02)
    // On utilise les mêmes dimensions pour que le remplissage couvre exactement la zone
    var fillCX = 155.61;
    var fillCY = 151.02;
    var fillRadius = 91.91;

    // L'arc part de la DROITE (angle 0°) et va vers la GAUCHE (angle 180°)
    // À progress=0 : rien n'est rempli
    // À progress=1 : tout le demi-cercle est rempli
    var sweepDeg = progress * 180;

    // Point de départ : extrémité droite (0°)
    var startAngleDeg = 0;
    // Point d'arrivée : progresse vers la gauche
    var endAngleDeg = sweepDeg;

    var startRad = (startAngleDeg * Math.PI) / 180;
    var endRad = (endAngleDeg * Math.PI) / 180;

    // Coordonnées sur l'arc
    // Convention SVG : x = cx + r*cos(angle), y = cy - r*sin(angle)
    var x1 = fillCX + fillRadius * Math.cos(startRad);
    var y1 = fillCY - fillRadius * Math.sin(startRad);
    var x2 = fillCX + fillRadius * Math.cos(endRad);
    var y2 = fillCY - fillRadius * Math.sin(endRad);

    // Flag large-arc : si l'arc couvre plus de 180°, on met 1
    var largeArc = sweepDeg > 180 ? 1 : 0;

    // Construction du path :
    // - Partir du centre
    // - Aller au point de départ (droite)
    // - Tracer l'arc jusqu'au point d'arrivée (vers la gauche)
    // - Revenir au centre
    // Le sweep-flag=0 signifie sens anti-horaire (droite → haut → gauche)
    var d =
      "M " +
      fillCX +
      " " +
      fillCY +
      " L " +
      x1.toFixed(2) +
      " " +
      y1.toFixed(2) +
      " A " +
      fillRadius +
      " " +
      fillRadius +
      " 0 " +
      largeArc +
      " 0 " +
      x2.toFixed(2) +
      " " +
      y2.toFixed(2) +
      " Z";

    refs.fillArcEl.setAttribute("d", d);
  }

  /**
   * Anime le remplissage de 0 à 1 sur CONFIG.FILL_DURATION ms.
   * Le remplissage part de la droite et progresse vers la gauche.
   * Utilise un easing ease-in-out pour un mouvement naturel.
   *
   * @returns {Promise} résolu quand le remplissage est complet
   */
  function animateFill() {
    return new Promise(function (resolve) {
      if (!refs.fillArcEl) {
        resolve();
        return;
      }

      // Rendre visible
      refs.fillArcEl.setAttribute("opacity", "1");

      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var rawProgress = Math.min(elapsed / CONFIG.FILL_DURATION, 1);

        // Easing ease-in-out quad
        var eased = easeInOutQuad(rawProgress);

        setFillProgress(eased);

        if (rawProgress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  /**
   * Fait disparaître le remplissage en fondu (opacity → 0),
   * puis nettoie le path.
   *
   * @returns {Promise} résolu quand le fondu est terminé
   */
  function fadeOutFill() {
    return new Promise(function (resolve) {
      if (!refs.fillArcEl) {
        resolve();
        return;
      }

      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / CONFIG.FADE_OUT_FILL, 1);

        refs.fillArcEl.setAttribute("opacity", (1 - progress).toFixed(3));

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Nettoyer
          refs.fillArcEl.setAttribute("d", "");
          refs.fillArcEl.setAttribute("opacity", "0");
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  // --- FIN PARTIE D ---
  // ===== PARTIE E — PLACEMENT ET DÉPLACEMENT DES BOULES =====

  /**
   * Place toutes les boules à leurs positions selon state.currentOrder.
   *
   * state.currentOrder est un tableau de 9 éléments.
   * state.currentOrder[posIndex] = bouleDataIndex
   *
   * posIndex 0 = position gauche (180°)
   * posIndex 4 = position sommet (90°) — sous la flèche
   * posIndex 8 = position droite (0°)
   *
   * On déplace chaque boule en appliquant un transform="translate(dx, dy)"
   * sur son groupe <g> original. Cela préserve tous les éléments internes
   * (paths, cercles, textes, bordures, data-attributes).
   */
  function positionAllBoules() {
    for (var posIndex = 0; posIndex < CONFIG.BOULE_COUNT; posIndex++) {
      var bouleDataIndex = state.currentOrder[posIndex];
      positionBouleAt(bouleDataIndex, posIndex);
    }
  }

  /**
   * Place une boule spécifique à une position spécifique sur l'arc.
   *
   * Utilise la MÊME logique que la fin de animateRotation() :
   * - Calcule l'angle via getPositionAngle(posIndex)
   * - Calcule les coordonnées via angleToXY()
   * - Calcule le translate par rapport à originalPositions[]
   *
   * Cela garantit une cohérence parfaite entre le placement statique
   * et la fin de l'animation (pas de saut).
   *
   * @param {number} bouleDataIndex - index dans BOULES_DATA (0-8)
   * @param {number} posIndex - position sur l'arc (0-8)
   */
  function positionBouleAt(bouleDataIndex, posIndex) {
    var group = refs.boulesGroups[bouleDataIndex];
    if (!group || !originalPositions[bouleDataIndex]) return;

    var targetAngle = getPositionAngle(posIndex);
    var targetPos = angleToXY(targetAngle);
    var origPos = originalPositions[bouleDataIndex];

    var dx = targetPos.x - origPos.x;
    var dy = targetPos.y - origPos.y;

    group.setAttribute(
      "transform",
      "translate(" + dx.toFixed(2) + ", " + dy.toFixed(2) + ")",
    );
    group.style.opacity = "1";
  }

  /**
   * Calcule la position interpolée d'une boule pendant la rotation.
   *
   * Pendant l'animation, chaque boule se déplace le long de l'arc
   * de sa position actuelle vers sa position cible.
   *
   * @param {number} bouleDataIndex - index dans BOULES_DATA (0-8)
   * @param {number} fromPosIndex - position de départ (0-8)
   * @param {number} toPosIndex - position d'arrivée (0-8)
   * @param {number} progress - 0 à 1 (progression de l'animation)
   */
  function interpolateBoulePosition(
    bouleDataIndex,
    fromPosIndex,
    toPosIndex,
    progress,
  ) {
    var group = refs.boulesGroups[bouleDataIndex];
    if (!group) return;

    var fromAngle = getPositionAngle(fromPosIndex);
    var toAngle = getPositionAngle(toPosIndex);

    // Interpolation angulaire le long de l'arc
    // Les boules se déplacent le long du demi-cercle, pas en ligne droite
    var currentAngle = fromAngle + (toAngle - fromAngle) * progress;

    var currentPos = angleToXY(currentAngle);
    var origPos = originalPositions[bouleDataIndex];

    var dx = currentPos.x - origPos.x;
    var dy = currentPos.y - origPos.y;

    group.setAttribute(
      "transform",
      "translate(" + dx.toFixed(2) + ", " + dy.toFixed(2) + ")",
    );
  }

  /**
   * Gère la visibilité des boules pendant la rotation.
   *
   * Quand une boule sort du demi-cercle par un côté (angle < 0° ou > 180°),
   * elle doit réapparaître de l'autre côté. On gère ça en calculant
   * l'angle modulo et en masquant/affichant la boule.
   *
   * @param {number} bouleDataIndex - index dans BOULES_DATA
   * @param {number} angleDeg - angle actuel de la boule
   */
  function updateBouleVisibility(bouleDataIndex, angleDeg) {
    var group = refs.boulesGroups[bouleDataIndex];
    if (!group) return;

    // La boule est visible si elle est dans le demi-cercle (0° à 180°)
    // On ajoute une petite marge pour éviter les clignotements
    var margin = 2;
    var visible = angleDeg >= 0 - margin && angleDeg <= 180 + margin;

    group.style.opacity = visible ? "1" : "0";
  }

  /**
   * Anime la rotation des boules en BLOC RIGIDE avec son.
   *
   * PRINCIPE :
   * - Les 9 boules forment un bloc rigide (espacement constant 22.5°)
   * - UN SEUL décalage angulaire global pour toutes les boules
   * - Son de roulette joué pendant la rotation, arrêté à la fin
   * - À la fin, chaque boule est placée à sa position EXACTE sur l'arc
   *   en recalculant depuis endOrder (pas de flottement)
   *
   * @param {number[]} startOrder - ordre de départ
   * @param {number[]} endOrder - ordre d'arrivée
   * @param {number} totalSteps - nombre total de positions à parcourir
   * @returns {Promise}
   */
  function animateRotation(startOrder, endOrder, totalSteps) {
    return new Promise(function (resolve) {
      var startTime = null;
      var spacing = 180 / (CONFIG.BOULE_COUNT - 1); // 22.5°
      var cycle = CONFIG.BOULE_COUNT * spacing; // 202.5°

      // === SON DE ROULETTE ===
      var rouletteSound = new Audio("./assets/son/roulette.mp3");
      rouletteSound.loop = true;
      rouletteSound.volume = 0.6;

      // Démarrer le son (avec gestion du autoplay bloqué par le navigateur)
      var soundStarted = false;
      try {
        var playPromise = rouletteSound.play();
        if (playPromise !== undefined) {
          playPromise
            .then(function () {
              soundStarted = true;
            })
            .catch(function () {
              // Autoplay bloqué — on ignore silencieusement
              console.log(
                "🔇 Son bloqué par le navigateur (interaction requise)",
              );
            });
        }
      } catch (e) {
        // Fallback silencieux
      }

      // Fonction pour arrêter le son proprement avec un fondu
      function stopSound() {
        if (!rouletteSound) return;

        var fadeStart = rouletteSound.volume;
        var fadeDuration = 500; // 500ms de fondu
        var fadeStartTime = performance.now();

        function fadeStep() {
          var elapsed = performance.now() - fadeStartTime;
          var progress = Math.min(elapsed / fadeDuration, 1);

          rouletteSound.volume = fadeStart * (1 - progress);

          if (progress < 1) {
            requestAnimationFrame(fadeStep);
          } else {
            rouletteSound.pause();
            rouletteSound.currentTime = 0;
            rouletteSound.volume = fadeStart;
          }
        }

        requestAnimationFrame(fadeStep);
      }

      // === CALCUL DU SWEEP ===
      var totalSweep = totalSteps * spacing;

      // Angles de départ pour chaque boule
      var startAngles = [];
      for (var i = 0; i < CONFIG.BOULE_COUNT; i++) {
        var posIdx = startOrder.indexOf(i);
        startAngles.push(getPositionAngle(posIdx));
      }

      // Angles d'arrivée EXACTS depuis endOrder
      var endAngles = [];
      for (var j = 0; j < CONFIG.BOULE_COUNT; j++) {
        var endPosIdx = endOrder.indexOf(j);
        endAngles.push(getPositionAngle(endPosIdx));
      }

      // Correction du sweep pour cohérence avec la boule gagnante
      var winnerIdx = endOrder[4];
      var winnerStart = startAngles[winnerIdx];
      var winnerEnd = endAngles[winnerIdx]; // = 90° (position 4)

      var baseDiff = winnerEnd - winnerStart;
      var correctedSweep = baseDiff;
      while (correctedSweep < totalSweep - cycle / 2) {
        correctedSweep += cycle;
      }
      totalSweep = correctedSweep;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var rawProgress = Math.min(elapsed / CONFIG.SPIN_DURATION, 1);

        var eased = easeOutQuart(rawProgress);

        if (rawProgress >= 1) {
          // === FIN : ARRÊTER LE SON ===
          stopSound();

          // === FIN : POSITIONS FINALES EXACTES ===
          // Recalculer chaque position proprement depuis endOrder
          // pour garantir un placement parfait sur l'arc
          for (var b = 0; b < CONFIG.BOULE_COUNT; b++) {
            var finalPosIdx = endOrder.indexOf(b);
            var finalAngle = getPositionAngle(finalPosIdx);
            var finalPos = angleToXY(finalAngle);
            var origPos = originalPositions[b];

            refs.boulesGroups[b].setAttribute(
              "transform",
              "translate(" +
                (finalPos.x - origPos.x).toFixed(2) +
                ", " +
                (finalPos.y - origPos.y).toFixed(2) +
                ")",
            );
            refs.boulesGroups[b].style.opacity = "1";
          }

          state.currentOrder = endOrder.slice();
          resolve();
          return;
        }

        // === PENDANT LA ROTATION ===
        var currentSweep = totalSweep * eased;

        for (var b = 0; b < CONFIG.BOULE_COUNT; b++) {
          var rawAngle = startAngles[b] + currentSweep;
          var wrapped = ((rawAngle % cycle) + cycle) % cycle;
          var isVisible = wrapped <= 180;

          if (isVisible) {
            var pos = angleToXY(wrapped);
            var origPos = originalPositions[b];
            refs.boulesGroups[b].setAttribute(
              "transform",
              "translate(" +
                (pos.x - origPos.x).toFixed(2) +
                ", " +
                (pos.y - origPos.y).toFixed(2) +
                ")",
            );
            refs.boulesGroups[b].style.opacity = "1";
          } else {
            refs.boulesGroups[b].setAttribute(
              "transform",
              "translate(-9999, -9999)",
            );
            refs.boulesGroups[b].style.opacity = "0";
          }
        }

        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });
  }
  // /**
  //  * Fait "rebondir" un angle pour qu'il reste dans [0, 180].
  //  * Comme une balle de ping-pong entre deux murs.
  //  *
  //  * 0 → 180 → 0 → 180 → ...
  //  *
  //  * @param {number} angle - angle brut (peut dépasser 180 ou être négatif)
  //  * @returns {number} angle entre 0 et 180
  //  */
  // function pingPongAngle(angle) {
  //   var a = Math.abs(angle);
  //   var period = 180;
  //   var cycles = Math.floor(a / period);
  //   var remainder = a - cycles * period;

  //   if (cycles % 2 === 0) {
  //     return remainder;
  //   } else {
  //     return period - remainder;
  //   }
  // }
  // --- FIN PARTIE E ---
  // ===== PARTIE F — CALCUL ORDRE FINAL + LANCEMENT SYNCHRONISÉ =====

  /**
   * Détermine quelle boule est la gagnante.
   *
   * Si state.winnerBouleId est défini (via setWinner("boule-3")),
   * on utilise cette boule.
   * Sinon, on en choisit une au hasard.
   *
   * @returns {number} index dans BOULES_DATA (0-8) de la boule gagnante
   */
  function pickWinner() {
    if (state.winnerBouleId) {
      // Chercher l'index correspondant à l'id
      for (var i = 0; i < BOULES_DATA.length; i++) {
        if (BOULES_DATA[i].id === state.winnerBouleId) {
          return i;
        }
      }
      // Id invalide → aléatoire
      console.warn(
        "ZeBall: id gagnant '" +
          state.winnerBouleId +
          "' non trouvé, choix aléatoire.",
      );
    }

    // Choix aléatoire
    return Math.floor(Math.random() * CONFIG.BOULE_COUNT);
  }

  /**
   * Calcule le nouvel ordre d'arrivée pour que la boule gagnante
   * soit en position 4 (sommet, sous la flèche).
   *
   * Les 8 autres boules sont redistribuées autour, dans l'ordre cohérent
   * de rotation (elles gardent leur ordre relatif circulaire).
   *
   * Logique :
   * - On prend l'ordre actuel (state.currentOrder) comme séquence circulaire
   * - On trouve la position actuelle de la boule gagnante
   * - On calcule combien de "pas" (shifts) il faut pour l'amener en position 4
   * - On applique ce décalage circulaire pour obtenir le nouvel ordre
   *
   * @param {number} winnerDataIndex - index dans BOULES_DATA de la boule gagnante
   * @returns {{ endOrder: number[], totalSteps: number }}
   */
  function computeEndOrder(winnerDataIndex) {
    var currentOrder = state.currentOrder;

    // Position actuelle de la boule gagnante dans l'ordre
    var currentPosOfWinner = currentOrder.indexOf(winnerDataIndex);

    // Position cible : 4 (sommet)
    var targetPos = 4;

    // Nombre de pas pour aller de la position actuelle à la position cible.
    //
    // Les boules tournent vers la gauche (positions augmentent : droite → gauche).
    // Donc si la boule est en position 2 et doit aller en position 4,
    // elle doit avancer de 2 pas.
    //
    // Pour faire au moins 1 tour complet (9 positions = 1 tour),
    // on ajoute CONFIG.BOULE_COUNT au décalage.
    var directShift =
      (((targetPos - currentPosOfWinner) % CONFIG.BOULE_COUNT) +
        CONFIG.BOULE_COUNT) %
      CONFIG.BOULE_COUNT;

    // Ajouter 1 tour complet minimum pour que la rotation soit visible
    var totalSteps = directShift + CONFIG.BOULE_COUNT;

    // Construire le nouvel ordre par décalage circulaire
    // Un shift de N signifie : chaque boule avance de N positions
    // (position i → position i + N, modulo 9)
    // Donc l'inverse : la boule en position (i - N + 9) % 9 va en position i
    var endOrder = [];
    for (var i = 0; i < CONFIG.BOULE_COUNT; i++) {
      var sourcePos =
        (((i - totalSteps) % CONFIG.BOULE_COUNT) + CONFIG.BOULE_COUNT) %
        CONFIG.BOULE_COUNT;
      endOrder.push(currentOrder[sourcePos]);
    }

    // Vérification : la boule gagnante doit être en position 4
    if (endOrder[targetPos] !== winnerDataIndex) {
      // Fallback : forcer la position
      console.warn("ZeBall: recalcul ordre — forçage position gagnante.");

      // Retirer le gagnant de endOrder
      var filtered = [];
      for (var f = 0; f < endOrder.length; f++) {
        if (endOrder[f] !== winnerDataIndex) {
          filtered.push(endOrder[f]);
        }
      }
      // Réinsérer à la position 4
      filtered.splice(targetPos, 0, winnerDataIndex);
      endOrder = filtered;
    }

    return {
      endOrder: endOrder,
      totalSteps: totalSteps,
    };
  }

  /**
   * Lance la séquence : remplissage D'ABORD, puis rotation ENSUITE.
   *
   * Ordre strict :
   * 1. Le remplissage progressif se déclenche (droite → gauche)
   * 2. Quand le remplissage est terminé → petite pause
   * 3. Le remplissage disparaît en fondu
   * 4. La rotation des boules démarre
   * 5. La rotation se termine avec la boule gagnante au sommet
   *
   * Ce cycle se répète à chaque tour.
   *
   * @param {number} winnerDataIndex - index de la boule gagnante
   * @returns {Promise<object>} résolu avec les données de la boule gagnante
   */
  function runFillAndSpin(winnerDataIndex) {
    return new Promise(function (resolve) {
      // Calculer l'ordre d'arrivée
      var result = computeEndOrder(winnerDataIndex);
      var endOrder = result.endOrder;
      var totalSteps = result.totalSteps;

      // ÉTAPE 1 : Remplissage progressif (droite → gauche)
      animateFill()
        .then(function () {
          // ÉTAPE 2 : Pause après remplissage complet
          return new Promise(function (r) {
            setTimeout(r, CONFIG.PAUSE_AFTER_FILL);
          });
        })
        .then(function () {
          // ÉTAPE 3 : Faire disparaître le remplissage en fondu
          return fadeOutFill();
        })
        .then(function () {
          // ÉTAPE 4 : Lancer la rotation des boules
          return animateRotation(
            state.currentOrder.slice(),
            endOrder,
            totalSteps,
          );
        })
        .then(function () {
          // ÉTAPE 5 : Rotation terminée, résoudre avec les données du gagnant
          resolve(BOULES_DATA[winnerDataIndex]);
        });
    });
  }

  // --- FIN PARTIE F ---
  // ===== PARTIE G — LUEUR GAGNANTE + HISTORIQUE =====

  /**
   * Anime une lueur dorée pulsante autour de la boule gagnante.
   *
   * On ajoute un cercle lumineux temporaire autour de la boule,
   * avec un filtre glow et une animation de pulsation.
   * Le cercle est supprimé à la fin de l'animation.
   *
   * @param {object} winnerData - élément de BOULES_DATA de la boule gagnante
   * @returns {Promise} résolu quand la lueur est terminée
   */
  function animateGlow(winnerData) {
    return new Promise(function (resolve) {
      if (!winnerData) {
        resolve();
        return;
      }

      // Trouver le groupe SVG de la boule gagnante
      var winnerGroup = document.getElementById(winnerData.id);
      if (!winnerGroup) {
        resolve();
        return;
      }

      // Lire la position actuelle du cercle principal de la boule
      var mainCircle = winnerGroup.querySelector("circle");
      if (!mainCircle) {
        resolve();
        return;
      }

      var cx = mainCircle.getAttribute("cx");
      var cy = mainCircle.getAttribute("cy");

      // Créer le cercle de lueur
      var glowCircle = document.createElementNS(svgNS, "circle");
      glowCircle.setAttribute("cx", cx);
      glowCircle.setAttribute("cy", cy);
      glowCircle.setAttribute("r", (CONFIG.BOULE_RADIUS + 6).toString());
      glowCircle.setAttribute("fill", "none");
      glowCircle.setAttribute("stroke", "#FFD700");
      glowCircle.setAttribute("stroke-width", "4");
      glowCircle.setAttribute("opacity", "0");
      glowCircle.setAttribute("filter", "url(#glow-winner)");

      // Le cercle de lueur suit le transform du groupe parent
      // (il est ajouté à l'intérieur du groupe, donc le translate s'applique)
      winnerGroup.appendChild(glowCircle);

      // Animation pulsante
      var startTime = null;
      var pulseCount = 3; // nombre de pulsations

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / CONFIG.GLOW_DURATION, 1);

        // Sinusoïde pour la pulsation
        var pulse = Math.sin(progress * Math.PI * pulseCount * 2);
        var opacity = 0.3 + 0.7 * Math.max(0, pulse);
        var radius = CONFIG.BOULE_RADIUS + 4 + 4 * Math.max(0, pulse);

        glowCircle.setAttribute("opacity", opacity.toFixed(3));
        glowCircle.setAttribute("r", radius.toFixed(1));

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Supprimer le cercle de lueur
          if (glowCircle.parentNode) {
            glowCircle.parentNode.removeChild(glowCircle);
          }
          resolve();
        }
      }

      requestAnimationFrame(step);
    });
  }

  /**
   * Ajoute une entrée dans la colonne historique (à gauche).
   *
   * Crée un bloc .historique-entry avec :
   * - L'ID du tour (#307470, #307471, ...)
   * - Un SVG de boule avec la bonne couleur et le bon numéro
   * - Une animation d'apparition (fondu + slide)
   *
   * L'entrée est insérée en haut de la liste (juste après le <h2>).
   *
   * @param {object} winnerData - élément de BOULES_DATA de la boule gagnante
   */
  function addToHistorique(winnerData) {
    if (!winnerData) return;

    state.spinCounter++;

    var historique = document.getElementById("historique");
    if (!historique) return;

    var h2 = historique.querySelector("h2");

    // Générer l'ID du tour
    var tourId = "#" + (307460 + state.spinCounter + 9);

    // Déterminer les couleurs pour l'historique
    var fillColor, strokeColor;
    switch (winnerData.type) {
      case "jaune":
        fillColor = "#DAA520";
        strokeColor = "#B8860B";
        break;
      case "rouge":
        fillColor = "#CC0000";
        strokeColor = "#990000";
        break;
      default: // noire
        fillColor = "#111111";
        strokeColor = "#333333";
        break;
    }

    // Créer le conteneur de l'entrée
    var entry = document.createElement("div");
    entry.classList.add("historique-entry");

    // ID du tour
    var spanId = document.createElement("span");
    spanId.classList.add("historique-id");
    spanId.textContent = tourId;
    entry.appendChild(spanId);

    // SVG de la boule
    var svgEl = document.createElementNS(svgNS, "svg");
    svgEl.classList.add("boule");
    svgEl.setAttribute("viewBox", "0 0 40 40");

    var circleEl = document.createElementNS(svgNS, "circle");
    circleEl.setAttribute("cx", "20");
    circleEl.setAttribute("cy", "20");
    circleEl.setAttribute("r", "18");
    circleEl.setAttribute("fill", fillColor);
    circleEl.setAttribute("stroke", strokeColor);
    circleEl.setAttribute("stroke-width", "1");
    svgEl.appendChild(circleEl);

    // Numéro (sauf pour la boule jaune n°0)
    if (winnerData.number !== 0) {
      var textEl = document.createElementNS(svgNS, "text");
      textEl.setAttribute("x", "20");
      textEl.setAttribute("y", "25");
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("fill", "white");
      textEl.setAttribute("font-size", "14");
      textEl.setAttribute("font-weight", "bold");
      textEl.textContent = winnerData.number.toString();
      svgEl.appendChild(textEl);
    }

    entry.appendChild(svgEl);

    // Style initial pour l'animation d'apparition
    entry.style.opacity = "0";
    entry.style.transform = "translateY(-10px)";
    entry.style.transition = "opacity 0.5s ease, transform 0.5s ease";

    // Insérer en haut de la liste (après le <h2>)
    if (h2 && h2.nextSibling) {
      historique.insertBefore(entry, h2.nextSibling);
    } else {
      historique.appendChild(entry);
    }

    // Déclencher l'animation d'apparition au prochain frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        entry.style.opacity = "1";
        entry.style.transform = "translateY(0)";
      });
    });

    // Log console
    console.log(
      "🎱 Résultat : Boule n°" +
        winnerData.number +
        " (" +
        winnerData.type +
        ") — Tour " +
        tourId,
    );
  }

  // --- FIN PARTIE G ---
  // ===== CORRECTION 3 — HIGHLIGHT CASE GAGNANTE DANS LE TABLEAU =====

  /**
   * Mapping numéro de boule → sélecteur CSS de la case dans le tableau.
   *
   * Les numéros 1-8 correspondent aux <td class="cell-num"> dont le contenu
   * textuel est le numéro.
   *
   * Le numéro 0 (boule jaune) correspond au losange jaune :
   * <td class="cell-losange-container" rowspan="2" colspan="2">
   *   <div class="losange losange-jaune"></div>
   * </td>
   *
   * Les deux autres losanges (rouge et gris) ne sont reliés à aucune boule.
   */

  /**
   * Trouve la cellule <td> du tableau correspondant au numéro gagnant.
   *
   * @param {number} winnerNumber - le numéro de la boule gagnante (0-8)
   * @returns {HTMLElement|null} l'élément à highlighter
   */
  function findWinnerCell(winnerNumber) {
    // Cas spécial : boule jaune (n°0) → losange jaune
    if (winnerNumber === 0) {
      var losangeJaune = document.querySelector(".losange-jaune");
      if (losangeJaune) {
        // On highlight le <td> parent (cell-losange-container)
        return losangeJaune.closest("td");
      }
      return null;
    }

    // Numéros 1-8 : chercher le <td class="cell-num"> dont le texte est le numéro
    var allCells = document.querySelectorAll(".cell-num");
    for (var i = 0; i < allCells.length; i++) {
      var cellText = allCells[i].textContent.trim();
      if (cellText === winnerNumber.toString()) {
        return allCells[i];
      }
    }

    return null;
  }

  /**
   * Met en évidence la case gagnante dans le tableau.
   *
   * Applique une animation de highlight (flash lumineux) sur la cellule,
   * puis la retire après quelques secondes.
   *
   * Si une case était déjà highlightée d'un tour précédent, on la nettoie d'abord.
   *
   * @param {object} winnerData - élément de BOULES_DATA de la boule gagnante
   */
  function highlightWinnerCell(winnerData) {
    if (!winnerData) return;

    // Nettoyer le highlight précédent
    clearHighlight();

    // Trouver la cellule
    var cell = findWinnerCell(winnerData.number);
    if (!cell) return;

    // Ajouter la classe de highlight
    cell.classList.add("cell-winner-highlight");

    // Pour le losange jaune, on ajoute aussi une classe sur le losange lui-même
    if (winnerData.number === 0) {
      var losange = cell.querySelector(".losange-jaune");
      if (losange) {
        losange.classList.add("losange-winner-highlight");
      }
    }

    // Retirer le highlight après 5 secondes (assez pour être visible,
    // mais nettoyé avant le prochain tour)
    setTimeout(function () {
      clearHighlight();
    }, 5000);
  }

  /**
   * Supprime tous les highlights de cases gagnantes.
   */
  function clearHighlight() {
    // Retirer la classe des cellules
    var highlighted = document.querySelectorAll(".cell-winner-highlight");
    for (var i = 0; i < highlighted.length; i++) {
      highlighted[i].classList.remove("cell-winner-highlight");
    }

    // Retirer la classe des losanges
    var highlightedLosanges = document.querySelectorAll(
      ".losange-winner-highlight",
    );
    for (var j = 0; j < highlightedLosanges.length; j++) {
      highlightedLosanges[j].classList.remove("losange-winner-highlight");
    }
  }

  // --- FIN CORRECTION 3 (fonctions) ---
  // ===== PARTIE H — SÉQUENCE COMPLÈTE + INITIALISATION =====

  /**
   * Séquence complète d'un tour de roulette :
   *
   * 1. Nettoyer le highlight précédent
   * 2. Choisir la boule gagnante (setWinner ou aléatoire)
   * 3. Remplissage D'ABORD, puis rotation
   * 4. Animer la lueur autour de la boule gagnante
   * 5. Ajouter le résultat à l'historique
   * 6. Mettre en évidence la case gagnante dans le tableau
   * 7. Réinitialiser le winnerBouleId pour le prochain tour
   *
   * Ne fait rien si une animation est déjà en cours.
   */
  function playRound() {
    if (state.isSpinning) return;
    state.isSpinning = true;

    // Étape 1 : Nettoyer le highlight du tour précédent
    clearHighlight();

    // Étape 2 : Choisir le gagnant
    var winnerIndex = pickWinner();

    // Étape 3 : Remplissage puis Rotation (séquentiel)
    runFillAndSpin(winnerIndex)
      .then(function (winnerData) {
        // Étape 4 : Ajouter à l'historique
        addToHistorique(winnerData);

        // Étape 5 : Mettre en évidence la case dans le tableau
        highlightWinnerCell(winnerData);

        // Étape 6 : Lueur sur la boule gagnante
        return animateGlow(winnerData);
      })
      .then(function () {
        // Étape 7 : Nettoyage
        state.winnerBouleId = null;
        state.isSpinning = false;
      })
      .catch(function (err) {
        console.error("ZeBall: erreur pendant le tour", err);
        state.isSpinning = false;
      });
  }

  /**
   * Initialisation complète de la roulette ZeBall.
   *
   * Séquence d'init :
   * 1. Récupérer les références SVG
   * 2. Créer les defs (filtre glow)
   * 3. Sauvegarder les positions originales des boules
   * 4. Réorganiser le z-order du SVG
   * 5. Créer l'arc de remplissage
   * 6. Placer les boules à leurs positions initiales
   * 7. Rendre le SVG cliquable
   * 8. Lancer le premier tour après un délai
   * 9. Programmer les tours automatiques
   */
  function init() {
    // 1. Références
    if (!grabRefs()) {
      console.error(
        "ZeBall: initialisation impossible — éléments SVG manquants.",
      );
      return;
    }

    // 2. Defs (filtre glow)
    createDefs();

    // 3. Sauvegarder les positions originales AVANT de réorganiser
    saveOriginalPositions();

    // 4. Réorganiser le z-order
    reorganizeZOrder();

    // 5. Créer l'arc de remplissage
    createFillArc();

    // 6. Placer les boules à leurs positions initiales
    // L'ordre initial est [0,1,2,3,4,5,6,7,8] — chaque boule à sa position d'origine
    // Donc les transforms sont tous (0, 0) au départ
    state.currentOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    positionAllBoules();

    // 7. Rendre le SVG cliquable pour lancer un tour manuellement
    refs.svgLogo.style.pointerEvents = "auto";
    refs.svgLogo.style.cursor = "pointer";

    refs.svgLogo.addEventListener("click", function () {
      if (!state.isSpinning) {
        playRound();
      }
    });

    // 8. Premier tour après un délai
    setTimeout(function () {
      playRound();
    }, CONFIG.FIRST_SPIN_DELAY);

    // 9. Tours automatiques
    setInterval(function () {
      if (!state.isSpinning) {
        playRound();
      }
    }, CONFIG.AUTO_SPIN_INTERVAL);

    console.log(
      "🎰 ZeBall initialisé — cliquez sur le logo pour lancer un tour",
    );
    console.log(
      "💡 Utilisez setWinner('boule-3') pour forcer une boule gagnante",
    );
  }

  // ===== LANCEMENT =====
  // Attendre que le DOM soit prêt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
// Les parties suivantes seront collées ICI, avant la fermeture })();
