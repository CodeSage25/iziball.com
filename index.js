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
    FILL_DURATION: 20000, // durée du remplissage (20 secondes)
    SPIN_DURATION: 7500, // durée de la rotation
    GLOW_DURATION: 3000, // durée de la lueur gagnante
    PAUSE_AFTER_FILL: 200, // pause entre remplissage et rotation
    FADE_OUT_FILL: 500, // durée du fondu de disparition du remplissage
    AUTO_SPIN_INTERVAL: 1400, // intervalle entre tours auto
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
    { id: "boule-4", index: 2, number: 4, color: "#e30613", type: "rouge" }, // ← remonté
    { id: "boule-3", index: 3, number: 3, color: "#000000", type: "noire" }, // ← descendu
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
    balance: 50000,
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

  // ===== SON DE ROULETTE PRÉ-CHARGÉ =====
  var rouletteSound = null;

  function preloadRouletteSound() {
    rouletteSound = new Audio("./assets/son/roulette.mp3");
    rouletteSound.loop = true;
    rouletteSound.volume = 0.6;
    rouletteSound.preload = "auto";
    rouletteSound.load();
  }

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

  // Décélération exponentielle : démarre très vite, ralentit fortement en fin de course
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
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
    //=======Changement couleur
    refs.fillArcEl.setAttribute("fill", "rgb(143, 155, 16");
    refs.fillArcEl.setAttribute("opacity", "0");
    refs.fillArcEl.setAttribute("d", "");
    refs.fillArcEl.setAttribute("clip-path", "url(#arc-bottom-clip)");

    // Insérer entre zone-interieure et texte-zebal
    // zone-interieure est déjà juste avant texte-zebal grâce à reorganizeZOrder()
    var svg = refs.svgLogo;
    svg.insertBefore(refs.fillArcEl, refs.texteZebal);

    // Extraire l'icône de zone-interieure et la remettre AU-DESSUS du fill
    var startIcon = document.getElementById("start-icon");
    if (startIcon) {
      var iconParentG = startIcon.parentNode; // le <g clip-path="...">
      if (iconParentG && iconParentG.parentNode === refs.zoneInterieure) {
        refs.zoneInterieure.removeChild(iconParentG);
        svg.insertBefore(iconParentG, refs.texteZebal);
      }
    }
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
    var fillCX = 155.67;
    var fillCY = 184.41; // bas de la zone — le camembert part d'ici
    var fillRadius = 115; // assez grand pour atteindre le sommet de l'arc

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

      // Rendre visible (on n'utilise plus fillArcEl pour le remplissage visuel,
      // mais on le garde pour la compatibilité)
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
   * Fait disparaître le remplissage (balayeur) en fondu.
   *
   * @returns {Promise}
   */
  function fadeOutFill() {
    return new Promise(function (resolve) {
      var sweepOverlay = document.getElementById("sweep-overlay");
      var loadingIndicator = document.getElementById("loading-indicator");
      var loadingArc = document.getElementById("loading-arc");
      var startIcon = document.getElementById("start-icon");

      if (!sweepOverlay) {
        resolve();
        return;
      }

      var startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var elapsed = timestamp - startTime;
        var progress = Math.min(elapsed / CONFIG.FADE_OUT_FILL, 1);

        var opacity = (1 - progress).toFixed(3);
        sweepOverlay.setAttribute("opacity", opacity);

        if (loadingIndicator) {
          loadingIndicator.style.opacity = opacity;
        }

        if (refs.fillArcEl) {
          refs.fillArcEl.setAttribute("opacity", "0");
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          // Nettoyer
          sweepOverlay.setAttribute("opacity", "0");

          if (loadingIndicator) {
            loadingIndicator.style.opacity = "0";
          }
          if (loadingArc) {
            loadingArc.setAttribute("stroke-dashoffset", "113.1");
          }
          if (startIcon) {
            startIcon.style.opacity = "0.6";
          }
          if (refs.fillArcEl) {
            refs.fillArcEl.setAttribute("d", "");
            refs.fillArcEl.setAttribute("opacity", "0");
          }

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
      var spacing = 180 / (CONFIG.BOULE_COUNT - 1);
      var cycle = CONFIG.BOULE_COUNT * spacing;

      // === SON : DÉMARRER IMMÉDIATEMENT (déjà préchargé) ===
      if (rouletteSound) {
        rouletteSound.currentTime = 0;
        rouletteSound.volume = 0.6;
        rouletteSound.loop = true;
        try {
          rouletteSound.play().catch(function () {
            console.log("🔇 Son bloqué par le navigateur");
          });
        } catch (e) {}
      }

      // Fonction pour arrêter le son proprement avec un fondu
      function stopSound() {
        if (!rouletteSound) return;

        var fadeStart = rouletteSound.volume;
        var fadeDuration = 500;
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
            rouletteSound.volume = 0.6;
          }
        }

        requestAnimationFrame(fadeStep);
      }

      // === CALCUL DU SWEEP ===
      var totalSweep = totalSteps * spacing;

      var startAngles = [];
      for (var i = 0; i < CONFIG.BOULE_COUNT; i++) {
        var posIdx = startOrder.indexOf(i);
        startAngles.push(getPositionAngle(posIdx));
      }

      var endAngles = [];
      for (var j = 0; j < CONFIG.BOULE_COUNT; j++) {
        var endPosIdx = endOrder.indexOf(j);
        endAngles.push(getPositionAngle(endPosIdx));
      }

      var winnerIdx = endOrder[4];
      var winnerStart = startAngles[winnerIdx];
      var winnerEnd = endAngles[winnerIdx];

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

        var eased = easeOutExpo(rawProgress);

        if (rawProgress >= 1) {
          stopSound();

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

    // ← MODIFIÉ : 3 tours complets au lieu de 1 (était + CONFIG.BOULE_COUNT)
    var totalSteps = directShift + CONFIG.BOULE_COUNT * 10;

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
   * La fenêtre de mise est OUVERTE pendant le remplissage,
   * et FERMÉE dès que la rotation commence.
   *
   * @param {number} winnerDataIndex - index de la boule gagnante
   * @returns {Promise<object>}
   */
  function runFillAndSpin(winnerDataIndex) {
    return new Promise(function (resolve) {
      var result = computeEndOrder(winnerDataIndex);
      var endOrder = result.endOrder;
      var totalSteps = result.totalSteps;

      // OUVRIR les mises pendant le remplissage
      openBetting();

      // ÉTAPE 1 : Remplissage progressif
      animateFill()
        .then(function () {
          // FERMER les mises à la fin du remplissage
          closeBetting();

          // ÉTAPE 2 : Pause
          return new Promise(function (r) {
            setTimeout(r, CONFIG.PAUSE_AFTER_FILL);
          });
        })
        .then(function () {
          // ÉTAPE 3 : Fondu du remplissage
          return fadeOutFill();
        })
        .then(function () {
          // ÉTAPE 4 : Rotation
          return animateRotation(
            state.currentOrder.slice(),
            endOrder,
            totalSteps,
          );
        })
        .then(function () {
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
      glowCircle.setAttribute("stroke", "#FAFAFA");
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

    clearHighlight();

    var number = winnerData.number;
    var type = winnerData.type; // "rouge" | "noire" | "jaune"

    // ── Cas JAUNE ──────────────────────────────────────────────
    if (type === "jaune") {
      var tdJaune =
        document.querySelector(".losange-jaune") &&
        document.querySelector(".losange-jaune").closest("td");
      if (tdJaune) {
        tdJaune.classList.add("cell-winner-highlight");
        var lj = tdJaune.querySelector(".losange-jaune");
        if (lj) lj.classList.add("losange-winner-highlight");
      }
      // OVER / UNDER highlight
      if (number >= 5 && number <= 8) {
        var overCell = document.querySelector('[data-bet="over"]');
        if (overCell && miseState.bets.has(overCell)) {
          overCell.classList.add("cell-winner-highlight");
        }
      } else if (number >= 1 && number <= 4) {
        var underCell = document.querySelector('[data-bet="under"]');
        if (underCell && miseState.bets.has(underCell)) {
          underCell.classList.add("cell-winner-highlight");
        }
      }
      scheduleHighlightClear();
      return;
    }

    // ── Cas ROUGE ou NOIRE ────────────────────────────────────

    // 1. Case numéro de la boule
    var numCell = findWinnerCell(number);
    if (numCell) numCell.classList.add("cell-winner-highlight");

    // 2. Losange selon couleur
    if (type === "rouge") {
      var tdRouge =
        document.querySelector(".losange-rouge") &&
        document.querySelector(".losange-rouge").closest("td");
      if (tdRouge) {
        tdRouge.classList.add("cell-winner-highlight");
        var lr = tdRouge.querySelector(".losange-rouge");
        if (lr) lr.classList.add("losange-winner-highlight");
      }
    } else if (type === "noire") {
      var tdGris =
        document.querySelector(".losange-gris") &&
        document.querySelector(".losange-gris").closest("td");
      if (tdGris) {
        tdGris.classList.add("cell-winner-highlight");
        var lg = tdGris.querySelector(".losange-gris");
        if (lg) lg.classList.add("losange-winner-highlight");
      }
    }

    // 3. Parité (number 0 = jaune, déjà traité plus haut)
    if (number > 0) {
      var isEven = number % 2 === 0;
      var betSide = isEven ? "pair" : "impair";
      var pariteCell = document.querySelector('[data-bet="' + betSide + '"]');
      if (pariteCell) pariteCell.classList.add("cell-winner-highlight");
    }

    scheduleHighlightClear();
  }

  /** Programme le nettoyage automatique du highlight après 5 s. */
  function scheduleHighlightClear() {
    setTimeout(clearHighlight, 5000);
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
  // ===== MISES — ÉTAT ET FENÊTRE =====

  /**
   * État des mises pour le tour en cours.
   *
   * bets : Map< HTMLElement (la cellule td), { amount: number, chipEl: HTMLElement } >
   * bettingOpen : true pendant le remplissage progressif, false sinon
   * lockedLosange : null | "rouge" | "gris" — verrouillage mutuel des losanges
   * selectedJetonValue : number | null — valeur du jeton actuellement sélectionné
   * messageEl : HTMLElement — élément du message "mises fermées"
   */
  var miseState = {
    bets: new Map(),
    bettingOpen: false,
    lockedGroups: {
      losange: null,
      overunder: null,
      parite: null,
    },
    selectedJetonValue: null,
    selectedJetonImg: null,
    messageEl: null,
    messageTimeout: null,
    MAX_BET_PER_CELL: 10000,
  };
  // ===== SOLDE — AFFICHAGE ET ANIMATION =====

  function formatBalance(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function updateBalanceDisplay() {
    var el = document.getElementById("solde-display");
    if (!el) return;
    el.textContent = formatBalance(state.balance);
  }

  function shakeBalance() {
    var el = document.getElementById("solde-display");
    if (!el) return;
    // Flash rouge + secousse
    el.setAttribute("fill", "#ff4444");
    var shakeAnim = [
      { offset: 0, value: "246" },
      { offset: 0.15, value: "249" },
      { offset: 0.3, value: "243" },
      { offset: 0.45, value: "248" },
      { offset: 0.6, value: "244" },
      { offset: 0.75, value: "247" },
      { offset: 1, value: "246" },
    ];
    var startTime = null;
    var duration = 400;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      // Interpolation simple
      for (var i = 0; i < shakeAnim.length - 1; i++) {
        if (
          progress >= shakeAnim[i].offset &&
          progress <= shakeAnim[i + 1].offset
        ) {
          var t =
            (progress - shakeAnim[i].offset) /
            (shakeAnim[i + 1].offset - shakeAnim[i].offset);
          var x =
            parseFloat(shakeAnim[i].value) +
            t *
              (parseFloat(shakeAnim[i + 1].value) -
                parseFloat(shakeAnim[i].value));
          el.setAttribute("x", x.toFixed(1));
          break;
        }
      }
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.setAttribute("x", "246");
        el.setAttribute("fill", "#fff");
      }
    }
    requestAnimationFrame(step);
  }
  /**
   * Ouvre la fenêtre de mise (appelé quand le remplissage commence).
   */
  function openBetting() {
    miseState.bettingOpen = true;
    miseState.lockedLosange = null;
    hideClosedMessage();

    // Ajouter un indicateur visuel que les mises sont ouvertes
    var table = document.querySelector(".table-outer-border");
    if (table) {
      table.classList.add("betting-open");
    }
  }

  /**
   * Ferme la fenêtre de mise (appelé quand le remplissage se termine).
   */
  function closeBetting() {
    miseState.bettingOpen = false;

    var table = document.querySelector(".table-outer-border");
    if (table) {
      table.classList.remove("betting-open");
    }
  }

  /**
   * Nettoie toutes les mises visuelles et l'état après un tour.
   * Déverrouille aussi tous les losanges.
   */
  // APRÈS
  function clearAllBets() {
    // Rembourser toutes les mises au solde
    miseState.bets.forEach(function (betData, cell) {
      state.balance += betData.amount;
      if (betData.chipEl && betData.chipEl.parentNode) {
        betData.chipEl.parentNode.removeChild(betData.chipEl);
      }
    });
    updateBalanceDisplay();
    miseState.bets.clear();
    // ... reste inchangé
    miseState.lockedGroups.losange = null;
    miseState.lockedGroups.overunder = null;
    miseState.lockedGroups.parite = null;
    miseState.selectedJetonValue = null;
    miseState.selectedJetonImg = null;

    // Déverrouiller TOUS les losanges
    var allLocked = document.querySelectorAll(".cell-locked");
    for (var i = 0; i < allLocked.length; i++) {
      allLocked[i].classList.remove("cell-locked");
    }
  }
  /**
   * Affiche le message "mises fermées".
   */
  function showClosedMessage() {
    if (miseState.messageEl) {
      hideClosedMessage();
    }

    var msg = document.createElement("div");
    msg.className = "mises-fermees-message";
    msg.innerHTML =
      '<span class="mises-fermees-icon">🚫</span> Les mises sont fermées, le tirage se termine dans moins d\'une seconde.';
    document.body.appendChild(msg);
    miseState.messageEl = msg;

    // Animation d'apparition
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        msg.classList.add("visible");
      });
    });

    // Auto-disparition après 3 secondes
    miseState.messageTimeout = setTimeout(function () {
      hideClosedMessage();
    }, 3000);
  }

  /**
   * Cache le message "mises fermées".
   */
  function hideClosedMessage() {
    if (miseState.messageTimeout) {
      clearTimeout(miseState.messageTimeout);
      miseState.messageTimeout = null;
    }
    if (miseState.messageEl) {
      if (miseState.messageEl.parentNode) {
        miseState.messageEl.parentNode.removeChild(miseState.messageEl);
      }
      miseState.messageEl = null;
    }
  }

  /**
   * Récupère la valeur du jeton actuellement sélectionné dans le footer.
   * Retourne null si aucun jeton n'est sélectionné.
   */
  function getSelectedJeton() {
    var selected = document.querySelector(".jeton.selected");
    if (!selected) return null;

    return {
      value: parseInt(selected.getAttribute("data-value"), 10),
      src: selected.getAttribute("src"),
    };
  }

  // --- FIN PARTIE M1 ---
  // ===== MISES — PLACEMENT VISUEL =====

  /**
   * Crée ou met à jour le visuel d'un jeton sur une case du tableau.
   *
   * @param {HTMLElement} cell - la cellule <td> ciblée
   * @param {number} totalAmount - montant total sur cette case
   * @param {string} chipImgSrc - src de l'image du dernier jeton placé
   */
  function renderChipOnCell(cell, totalAmount, chipImgSrc) {
    var existing = miseState.bets.get(cell);
    var chipEl;

    if (existing && existing.chipEl) {
      // Mettre à jour l'élément existant
      chipEl = existing.chipEl;
      var amountLabel = chipEl.querySelector(".chip-amount");
      if (amountLabel)
        amountLabel.textContent = totalAmount.toLocaleString() + " FCFA";
      // Animation de "bump" pour montrer l'ajout
      chipEl.classList.remove("chip-bump");
      void chipEl.offsetWidth;
      chipEl.classList.add("chip-bump");
    } else {
      // Créer un nouvel élément de jeton
      chipEl = document.createElement("div");
      chipEl.className = "table-chip";

      var img = document.createElement("img");
      img.src = chipImgSrc;
      img.className = "table-chip-img";
      img.alt = totalAmount.toString();
      chipEl.appendChild(img);

      var label = document.createElement("span");
      label.className = "chip-amount";
      label.textContent = totalAmount.toLocaleString() + " FCFA";
      chipEl.appendChild(label);

      // Positionner sur la cellule
      cell.style.position = "relative";
      cell.appendChild(chipEl);

      // Animation d'apparition
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          chipEl.classList.add("chip-visible");
        });
      });
    }

    return chipEl;
  }

  /**
   * Tente de placer un jeton sur une case.
   * Gère toutes les validations : fenêtre ouverte, jeton sélectionné,
   * limite 10000, contrainte losanges.
   *
   * @param {HTMLElement} cell - la cellule <td> cliquée
   */
  function placeBet(cell) {
    // 1. Vérifier que les mises sont ouvertes
    if (!miseState.bettingOpen) {
      showClosedMessage();
      return;
    }

    // 2. Vérifier qu'un jeton est sélectionné
    var jeton = getSelectedJeton();
    if (!jeton) return;

    // 3. Vérifier les contraintes exclusives (losanges, over/under, impair/pair)
    var exclusiveInfo = getExclusiveGroup(cell);
    if (exclusiveInfo) {
      var currentLock = miseState.lockedGroups[exclusiveInfo.group];
      if (currentLock && currentLock !== exclusiveInfo.side) {
        shakeCell(cell);
        return;
      }
    }

    // APRÈS
    // 4. Vérifier la limite de mise
    var currentBet = miseState.bets.get(cell);
    var currentAmount = currentBet ? currentBet.amount : 0;
    var newAmount = currentAmount + jeton.value;

    if (newAmount > miseState.MAX_BET_PER_CELL) {
      shakeCell(cell);
      return;
    }

    // 4b. Vérifier le solde disponible
    if (jeton.value > state.balance) {
      shakeBalance();
      shakeCell(cell);
      return;
    }

    // 5. Placer la mise + déduire du solde
    var chipEl = renderChipOnCell(cell, newAmount, jeton.src);
    miseState.bets.set(cell, { amount: newAmount, chipEl: chipEl });
    state.balance -= jeton.value;
    updateBalanceDisplay();
    // ===== NOUVEAU : Son de placement =====
    try {
      var betSound = new Audio("./assets/son/bet.mp3");
      betSound.volume = 0.7;
      betSound.play().catch(function () {
        // Autoplay bloqué — silencieux
      });
    } catch (e) {}
    // ===== FIN NOUVEAU =====

    // 6. Verrouiller l'opposé si c'est une paire exclusive
    if (exclusiveInfo) {
      miseState.lockedGroups[exclusiveInfo.group] = exclusiveInfo.side;
      updateAllLocks();
    }
  }

  /**
   * Identifie à quel groupe exclusif appartient une cellule.
   *
   * @param {HTMLElement} cell
   * @returns {{ group: string, side: string } | null}
   */
  function getExclusiveGroup(cell) {
    // Losanges
    if (cell.querySelector(".losange-rouge"))
      return { group: "losange", side: "rouge" };
    if (cell.querySelector(".losange-gris"))
      return { group: "losange", side: "gris" };

    // Over/Under et Impair/Pair via data-bet
    var dataBet = cell.getAttribute("data-bet");
    if (dataBet) {
      switch (dataBet) {
        case "over":
          return { group: "overunder", side: "over" };
        case "under":
          return { group: "overunder", side: "under" };
        case "impair":
          return { group: "parite", side: "impair" };
        case "pair":
          return { group: "parite", side: "pair" };
      }
    }

    return null;
  }

  /**
   * Met à jour le verrouillage visuel de toutes les paires exclusives.
   */
  function updateAllLocks() {
    var groups = ["losange", "overunder", "parite"];
    var allCells = document.querySelectorAll(".table-outer-border td");

    for (var g = 0; g < groups.length; g++) {
      var groupName = groups[g];
      var lockedSide = miseState.lockedGroups[groupName];

      for (var i = 0; i < allCells.length; i++) {
        var info = getExclusiveGroup(allCells[i]);
        if (info && info.group === groupName) {
          if (lockedSide && info.side !== lockedSide) {
            allCells[i].classList.add("cell-locked");
          } else {
            allCells[i].classList.remove("cell-locked");
          }
        }
      }
    }
  }

  /**
   * Animation de "shake" sur une cellule pour indiquer un refus.
   */
  function shakeCell(cell) {
    cell.classList.remove("cell-shake");
    void cell.offsetWidth;
    cell.classList.add("cell-shake");
    setTimeout(function () {
      cell.classList.remove("cell-shake");
    }, 600);
  }

  // --- FIN PARTIE M2 ---
  // ===== MISES — ÉCOUTEURS TABLEAU =====

  /**
   * Initialise les écouteurs de clic sur toutes les cellules du tableau.
   * Appelé une seule fois dans init().
   */
  function initTableListeners() {
    var cells = document.querySelectorAll(".table-outer-border td");

    cells.forEach(function (cell) {
      // Ignorer les cellules vides
      if (cell.classList.contains("cell-empty")) return;

      cell.style.cursor = "pointer";

      cell.addEventListener("click", function (e) {
        e.stopPropagation();
        placeBet(cell);
      });
    });

    // Intercepter les clics sur les jetons quand les mises sont fermées
    var jetons = document.querySelectorAll(".jeton");
    jetons.forEach(function (jeton) {
      jeton.addEventListener("click", function () {
        if (state.isSpinning && !miseState.bettingOpen) {
          showClosedMessage();
        }
      });
    });

    // Bouton poubelle : effacer toutes les mises
    var trashBtn = document.querySelector(".footer-trash");
    if (trashBtn) {
      trashBtn.addEventListener("click", function () {
        clearAllBets();
        updateAllLocks();
      });
    }
    // Bouton undo : rejouer les mises précédentes
    var undoBtn = document.querySelector(".footer-undo");
    if (undoBtn) {
      // Supprimer l'ancien listener (celui du bloc FOOTER BOUTONS en haut du fichier)
      // en le remplaçant par le nouveau
      var newUndoBtn = undoBtn.cloneNode(true);
      undoBtn.parentNode.replaceChild(newUndoBtn, undoBtn);

      newUndoBtn.addEventListener("click", function () {
        replayPreviousBets();
      });
    }
  }

  // --- FIN PARTIE M3 ---
  // ===== MISES — REJEU DES MISES PRÉCÉDENTES =====

  /**
   * Sauvegarde des mises du tour précédent.
   * Stocke un tableau de { cellIndex: number, amount: number, chipSrc: string }
   * où cellIndex est l'index de la cellule parmi toutes les <td> du tableau.
   */
  var previousBets = [];

  /**
   * Sauvegarde les mises actuelles pour pouvoir les rejouer au tour suivant.
   * Appelé AVANT clearAllBets() dans playRound().
   */
  function saveBetsForReplay() {
    previousBets = [];
    var allCells = document.querySelectorAll(".table-outer-border td");

    miseState.bets.forEach(function (betData, cell) {
      // Trouver l'index de cette cellule
      var cellIndex = -1;
      for (var i = 0; i < allCells.length; i++) {
        if (allCells[i] === cell) {
          cellIndex = i;
          break;
        }
      }

      if (cellIndex >= 0) {
        // Récupérer le src de l'image du jeton
        var chipSrc = "";
        if (betData.chipEl) {
          var img = betData.chipEl.querySelector(".table-chip-img");
          if (img) chipSrc = img.src;
        }

        previousBets.push({
          cellIndex: cellIndex,
          amount: betData.amount,
          chipSrc: chipSrc,
        });
      }
    });
  }

  /**
   * Rejoue les mises du tour précédent.
   * Place automatiquement les mêmes jetons sur les mêmes cases.
   * Ne fonctionne que si les mises sont ouvertes.
   */
  function replayPreviousBets() {
    if (!miseState.bettingOpen) {
      showClosedMessage();
      return;
    }

    if (previousBets.length === 0) {
      console.log("ℹ️ Aucune mise précédente à rejouer");
      return;
    }

    // D'abord nettoyer les mises actuelles
    clearAllBets();

    var allCells = document.querySelectorAll(".table-outer-border td");

    for (var i = 0; i < previousBets.length; i++) {
      var bet = previousBets[i];

      if (bet.cellIndex < 0 || bet.cellIndex >= allCells.length) continue;

      var cell = allCells[bet.cellIndex];

      // Vérifier la limite
      if (bet.amount > miseState.MAX_BET_PER_CELL) continue;

      // Déterminer le src de l'image — utiliser le chipSrc sauvegardé
      // ou trouver le jeton le plus proche de la valeur
      var chipSrc = bet.chipSrc;
      if (!chipSrc) {
        // Fallback : utiliser le premier jeton disponible
        var firstJeton = document.querySelector(".jeton");
        if (firstJeton) chipSrc = firstJeton.src;
      }

      // Placer visuellement
      var chipEl = renderChipOnCell(cell, bet.amount, chipSrc);
      miseState.bets.set(cell, { amount: bet.amount, chipEl: chipEl });

      // Gérer le verrouillage losange
      var exclusiveInfo = getExclusiveGroup(cell);
      if (exclusiveInfo) {
        miseState.lockedGroups[exclusiveInfo.group] = exclusiveInfo.side;
      }
    }

    // Mettre à jour le verrouillage visuel
    updateAllLocks();

    console.log(
      "🔄 Mises précédentes rejouées (" + previousBets.length + " cases)",
    );
  }

  // --- FIN PARTIE M4 (rejeu) ---
  // ===== PARTIE H — SÉQUENCE COMPLÈTE + INITIALISATION =====

  /**
   * Séquence complète d'un tour de roulette.
   * Sauvegarde les mises avant de les nettoyer pour permettre le rejeu.
   */
  function playRound() {
    if (state.isSpinning) return;
    state.isSpinning = true;

    // Nettoyer le tour précédent
    clearHighlight();

    // Sauvegarder les mises du tour en cours AVANT de les effacer
    saveBetsForReplay();
    clearAllBets();

    var winnerIndex = pickWinner();

    runFillAndSpin(winnerIndex)
      .then(function (winnerData) {
        // Sauvegarder les mises de CE tour (celles placées pendant le remplissage)
        saveBetsForReplay();

        addToHistorique(winnerData);
        highlightWinnerCell(winnerData);
        return animateGlow(winnerData);
      })
      .then(function () {
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
    // === PRÉCHARGER LE SON IMMÉDIATEMENT ===
    preloadRouletteSound();

    saveOriginalPositions();
    reorganizeZOrder();
    createFillArc();

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
    // 6b. Initialiser les écouteurs de mise sur le tableau
    initTableListeners();

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
