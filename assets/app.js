/* How the Net Works — page logic. No dependencies. */
(function () {
  "use strict";

  var N = window.NET;
  var SVGNS = "http://www.w3.org/2000/svg";
  var root = document.documentElement;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  var nodeById = {}, conceptById = {}, zoneById = {};
  N.nodes.forEach(function (n) { nodeById[n.id] = n; });
  N.concepts.forEach(function (c) { conceptById[c.id] = c; });
  N.zones.forEach(function (z) { zoneById[z.id] = z; });

  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function rich(s) { return esc(s).replace(/`([^`]+)`/g, "<code>$1</code>"); }
  function zoneColor(zoneId) { return "var(--z-" + zoneById[zoneId].c + ")"; }

  var CAT_COLOR = {
    "Foundations": "var(--z-servers)",
    "Core services": "var(--z-users)",
    "Identity & access": "var(--z-mgmt)",
    "Security": "var(--z-dmz)",
    "Operations": "var(--z-edge)"
  };
  var TAG_COLOR = {
    L1: "var(--z-inet)", L2: "var(--z-users)", L3: "var(--z-servers)", L4: "var(--z-edge)",
    TLS: "var(--z-guest)", L7: "var(--z-mgmt)", CHK: "var(--ok)", DROP: "var(--bad)"
  };
  var TAG_TEXT = { CHK: "CHECK", DROP: "DROP" };
  var LAYER_COLOR = { 7: "var(--z-mgmt)", 6: "var(--z-guest)", 5: "var(--z-guest)", 4: "var(--z-edge)", 3: "var(--z-servers)", 2: "var(--z-users)", 1: "var(--z-inet)" };

  function zoneTitle(n) {
    var z = zoneById[n.zone];
    return z.label + (z.sub ? " · " + z.sub.split(" · ")[0] : "");
  }

  /* ================================================================ */
  /* Theme                                                            */
  /* ================================================================ */
  try {
    var savedTheme = localStorage.getItem("htnw-theme");
    if (savedTheme && !root.hasAttribute("data-theme")) root.setAttribute("data-theme", savedTheme);
  } catch (e) { /* storage unavailable */ }

  function effectiveTheme() {
    var t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  $("#theme-btn").addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("htnw-theme", next); } catch (e) { /* ignore */ }
  });

  /* ================================================================ */
  /* Map                                                              */
  /* ================================================================ */
  var svg = $("#net-svg");
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  var SHAPE = {
    net: { hw: 23, hh: 15 },
    sec: { hw: 24, hh: 17 },
    srv: { hw: 20, hh: 20 },
    end: { hw: 20, hh: 20 },
    ext: { hw: 20, hh: 20 }
  };
  function drawShape(shape, pad, cls, parent) {
    var s = SHAPE[shape], w = s.hw + pad, h = s.hh + pad;
    if (shape === "net") return el("rect", { x: -w, y: -h, width: w * 2, height: h * 2, rx: 6 + pad / 2, class: cls }, parent);
    if (shape === "srv") return el("rect", { x: -w, y: -h, width: w * 2, height: h * 2, rx: 7 + pad / 2, class: cls }, parent);
    if (shape === "sec") {
      var k = 11 + pad * 0.4;
      return el("polygon", { points: [[-w, 0], [-k, -h], [k, -h], [w, 0], [k, h], [-k, h]].map(function (p) { return p.join(","); }).join(" "), class: cls }, parent);
    }
    return el("circle", { r: s.hw + pad, class: cls }, parent);
  }

  function linkPts(l) {
    var a = nodeById[l.from], b = nodeById[l.to];
    if (l.bend === "hv") return [[a.x, a.y], [b.x, a.y], [b.x, b.y]];
    if (l.bend === "vh") return [[a.x, a.y], [a.x, b.y], [b.x, b.y]];
    return [[a.x, a.y], [b.x, b.y]];
  }
  function ptsToD(pts) { return pts.map(function (p, i) { return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(" "); }

  var gZones = el("g", { class: "zones" }, svg);
  var gLinks = el("g", { class: "links" }, svg);
  var gZoneText = el("g", { class: "zone-text", "aria-hidden": "true" }, svg);
  var gNodes = el("g", { class: "nodes" }, svg);
  var gPacket = el("g", { class: "packet", visibility: "hidden", "aria-hidden": "true" }, svg);
  el("circle", { r: 12, class: "packet-halo" }, gPacket);
  el("circle", { r: 6.5, class: "packet-dot" }, gPacket);

  N.zones.forEach(function (z) {
    var g = el("g", { class: "zone", style: "--zc: var(--z-" + z.c + ")" }, gZones);
    el("rect", { x: z.x, y: z.y, width: z.w, height: z.h, rx: 14, class: "zone-rect" }, g);
    var tg = el("g", { style: "--zc: var(--z-" + z.c + ")" }, gZoneText);
    var t = el("text", { x: z.x + 12, y: z.y + 20 }, tg);
    var t1 = el("tspan", { class: "zone-label" }, t); t1.textContent = z.label;
    if (z.sub) {
      if (z.w < 220) {
        var t2 = el("text", { x: z.x + 12, y: z.y + 34, class: "zone-sub" }, tg);
        t2.textContent = z.sub;
      } else {
        var t3 = el("tspan", { class: "zone-sub", dx: 8 }, t);
        t3.textContent = z.sub;
      }
    }
  });
  N.zoneNotes.forEach(function (zn) {
    var t = el("text", { x: zn.x, y: zn.y, class: "zone-note" }, gZoneText);
    zn.lines.forEach(function (line, i) {
      var ts = el("tspan", { x: zn.x, dy: i ? 13 : 0 }, t);
      ts.textContent = line;
    });
  });

  var linkEl = {};      // "a|b" -> path element (both directions)
  var adj = {};         // id -> [neighbour ids]
  N.nodes.forEach(function (n) { adj[n.id] = []; });
  N.links.forEach(function (l) {
    var p = el("path", { d: ptsToD(linkPts(l)), class: "link" + (l.kind ? " " + l.kind : "") }, gLinks);
    linkEl[l.from + "|" + l.to] = p;
    linkEl[l.to + "|" + l.from] = p;
    adj[l.from].push(l.to);
    adj[l.to].push(l.from);
  });

  var nodeEl = {};
  N.nodes.forEach(function (n) {
    var s = SHAPE[n.shape];
    var g = el("g", {
      class: "node " + n.shape,
      transform: "translate(" + n.x + " " + n.y + ")",
      tabindex: "0",
      role: "button",
      "aria-label": n.label + ", " + zoneById[n.zone].label,
      "data-id": n.id,
      style: "--zc: " + zoneColor(n.zone)
    }, gNodes);
    drawShape(n.shape, 5, "ring", g);
    drawShape(n.shape, 0, "shape", g);
    var ab = el("text", { class: "abbr" }, g); ab.textContent = n.abbr;
    var lx = 0, ly = 0, anchor = "middle";
    if (n.lp === "b") { ly = s.hh + 16; }
    else if (n.lp === "a") { ly = -s.hh - 9; }
    else if (n.lp === "r") { lx = s.hw + 8; ly = 4.5; anchor = "start"; }
    else if (n.lp === "l") { lx = -s.hw - 8; ly = 4.5; anchor = "end"; }
    else if (n.lp === "ur") { lx = s.hw - 2; ly = -s.hh - 4; anchor = "start"; }
    var lb = el("text", { class: "label", x: lx, y: ly, "text-anchor": anchor }, g);
    lb.textContent = n.label;
    nodeEl[n.id] = g;

    g.addEventListener("click", function () { selectNode(n.id, true); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNode(n.id, true); }
    });
    g.addEventListener("mouseenter", function () { if (state.mode === "explore") hoverLinks(n.id, true); });
    g.addEventListener("mouseleave", function () { if (state.mode === "explore") hoverLinks(n.id, false); });
  });

  function hoverLinks(id, on) {
    adj[id].forEach(function (nb) {
      var p = linkEl[id + "|" + nb];
      if (p && !(state.sel === id)) p.classList.toggle("hl", on);
    });
    if (!on && state.sel) markSelectionLinks(state.sel);
  }
  function markSelectionLinks(id) {
    $$(".link.hl", svg).forEach(function (p) { p.classList.remove("hl"); });
    if (!id) return;
    adj[id].forEach(function (nb) { linkEl[id + "|" + nb].classList.add("hl"); });
  }

  /* ---------------- packet animation ---------------- */
  var anim = { raf: 0, run: null };
  var mapVisible = true;
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      mapVisible = entries[0].isIntersecting;
      if (mapVisible && anim.run && !anim.raf) anim.raf = requestAnimationFrame(anim.run);
    }).observe($(".map-card"));
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && anim.run && !anim.raf) anim.raf = requestAnimationFrame(anim.run);
  });

  function segPts(a, b) {
    var l = N.links.filter(function (x) { return (x.from === a && x.to === b) || (x.from === b && x.to === a); })[0];
    if (!l) return [[nodeById[a].x, nodeById[a].y], [nodeById[b].x, nodeById[b].y]];
    var pts = linkPts(l);
    return l.from === a ? pts : pts.slice().reverse();
  }
  function pathPoints(ids) {
    var pts = [[nodeById[ids[0]].x, nodeById[ids[0]].y]];
    for (var i = 1; i < ids.length; i++) pts = pts.concat(segPts(ids[i - 1], ids[i]).slice(1));
    return pts;
  }
  function stopPacket() {
    if (anim.raf) cancelAnimationFrame(anim.raf);
    anim.raf = 0; anim.run = null;
    gPacket.setAttribute("visibility", "hidden");
    gPacket.classList.remove("pulse");
  }
  function placePacket(p) { gPacket.setAttribute("transform", "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ")"); }

  function playPath(ids) {
    stopPacket();
    var pts = pathPoints(ids);
    gPacket.setAttribute("visibility", "visible");
    if (pts.length < 2) { placePacket(pts[0]); gPacket.classList.add("pulse"); return; }
    if (reduceMotion) { placePacket(pts[pts.length - 1]); gPacket.classList.add("pulse"); return; }

    var lens = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lens.push(d); total += d;
    }
    var dur = Math.min(5600, Math.max(1300, total / 0.3));
    var hold = 1000, start = 0;
    function at(dist) {
      for (var k = 0; k < lens.length; k++) {
        if (dist <= lens[k] || k === lens.length - 1) {
          var f = lens[k] ? Math.min(1, dist / lens[k]) : 1;
          return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
        }
        dist -= lens[k];
      }
      return pts[pts.length - 1];
    }
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    anim.run = function (ts) {
      anim.raf = 0;
      if (!mapVisible || document.hidden) return;
      if (!start) start = ts;
      var e = (ts - start) % (dur + hold);
      var t = Math.min(1, e / dur);
      placePacket(at(ease(t) * total));
      gPacket.classList.toggle("pulse", t >= 1);
      anim.raf = requestAnimationFrame(anim.run);
    };
    anim.raf = requestAnimationFrame(anim.run);
  }

  /* ================================================================ */
  /* Panel state                                                      */
  /* ================================================================ */
  var panel = $("#panel");
  var state = { mode: "explore", sel: null, concept: null, j: null, step: 0, playing: false, timer: 0 };
  var tabExplore = $("#tab-explore"), tabJourney = $("#tab-journey");

  function setTabs() {
    tabExplore.setAttribute("aria-selected", state.mode === "explore");
    tabJourney.setAttribute("aria-selected", state.mode === "journey");
  }
  tabExplore.addEventListener("click", function () { showExplore(); });
  tabJourney.addEventListener("click", function () { showJourneyList(); });

  function clearMapState() {
    svg.classList.remove("journey-on");
    $$(".node", svg).forEach(function (g) { g.classList.remove("sel", "on", "dim", "here"); });
    $$(".link", svg).forEach(function (p) { p.classList.remove("active", "hl"); });
    stopPacket();
    stopAutoplay();
  }

  function journeysWith(id) {
    return N.journeys.map(function (j, i) { return { j: j, i: i }; })
      .filter(function (x) { return x.j.steps.some(function (s) { return s.path.indexOf(id) >= 0; }); });
  }

  function journeyCards() {
    return '<div class="journey-list">' + N.journeys.map(function (j, i) {
      return '<button type="button" class="jcard" data-journey="' + i + '">' +
        '<span class="jn">' + String(i + 1).padStart(2, "0") + '</span>' +
        '<span class="jt">' + esc(j.title) + '</span>' +
        '<span class="jb">' + esc(j.blurb) + ' <span class="mono">' + j.steps.length + ' steps</span></span></button>';
    }).join("") + "</div>";
  }

  function showExplore() {
    clearMapState();
    state.mode = "explore"; state.sel = null; state.j = null;
    setTabs();
    panel.innerHTML =
      '<div class="panel-block">' +
        '<p class="kicker">Start here</p>' +
        '<h3>Meridian Freight\'s network</h3>' +
        '<p>One head office, about 400 staff, a public website and people working from home. Each coloured region is a security zone; inside the building, each one is a VLAN with its own subnet. Lines are cables, or paths across the Internet.</p>' +
        '<p>Click any device on the map to see what it does, how it works and what breaks without it.</p>' +
      '</div>' +
      '<div class="panel-block"><p class="kicker">Or follow a packet</p>' + journeyCards() + '</div>';
    bindJourneyCards();
  }

  function showJourneyList() {
    clearMapState();
    state.mode = "journey"; state.sel = null; state.j = null;
    setTabs();
    panel.innerHTML =
      '<div class="panel-block"><p class="kicker">Follow a packet</p>' +
      '<h3>Pick a journey</h3>' +
      '<p>Each journey animates real traffic across the map, step by step, and shows what is inside the packet at each stage. Use the arrow keys to step.</p></div>' +
      journeyCards();
    bindJourneyCards();
  }

  function bindJourneyCards() {
    $$("[data-journey]", panel).forEach(function (b) {
      b.addEventListener("click", function () { startJourney(+b.getAttribute("data-journey")); });
    });
  }

  /* ---------------- explore: node detail ---------------- */
  function selectNode(id, fromMap) {
    var n = nodeById[id];
    if (state.mode !== "explore") { clearMapState(); state.mode = "explore"; setTabs(); }
    state.sel = id;
    state.concept = n.concepts[0];
    $$(".node.sel", svg).forEach(function (g) { g.classList.remove("sel"); });
    nodeEl[id].classList.add("sel");
    markSelectionLinks(id);
    renderNodePanel();
    if (fromMap && window.innerWidth <= 1080) panel.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function conceptBody(c) {
    var html =
      '<div class="panel-block"><p class="kicker">What it is · ' + esc(c.name) + '</p><p>' + rich(c.what) + '</p></div>' +
      '<div class="panel-block"><p class="kicker">How it works</p><ul>' + c.how.map(function (h) { return "<li>" + rich(h) + "</li>"; }).join("") + '</ul></div>';
    var kv = "";
    if (c.ports) kv += "<dt>Ports</dt><dd>" + rich(c.ports) + "</dd>";
    if (c.examples) kv += "<dt>Examples</dt><dd>" + rich(c.examples) + "</dd>";
    if (kv) html += '<dl class="kv">' + kv + "</dl>";
    if (c.breaks) html += '<div class="callout"><strong>When it breaks</strong>' + rich(c.breaks) + "</div>";
    html += '<div><button type="button" class="btn-link" data-open-svc="' + c.id + '">Open ' + esc(c.name) + ' in the catalog</button></div>';
    return html;
  }

  function renderNodePanel() {
    var n = nodeById[state.sel];
    var c = conceptById[state.concept];
    var tabs = n.concepts.length > 1
      ? '<div class="concept-tabs" role="group" aria-label="Topics for this device">' + n.concepts.map(function (cid) {
          return '<button type="button" class="chip" aria-pressed="' + (cid === state.concept) + '" data-concept="' + cid + '">' + esc(conceptById[cid].name) + "</button>";
        }).join("") + "</div>"
      : "";
    var nbs = adj[n.id].map(function (nb) {
      var m = nodeById[nb];
      return '<button type="button" class="chip" data-node="' + nb + '" style="--zc:' + zoneColor(m.zone) + '"><span class="dot"></span>' + esc(m.label) + "</button>";
    }).join("");
    var js = journeysWith(n.id).map(function (x) {
      return '<button type="button" class="chip" data-journey="' + x.i + '">▸ ' + esc(x.j.title) + "</button>";
    }).join("");

    panel.innerHTML =
      '<div class="panel-block" style="--zc:' + zoneColor(n.zone) + '">' +
        '<span class="zone-chip">' + esc(zoneTitle(n)) + "</span>" +
        "<h3>" + esc(n.label) + "</h3>" +
        '<p class="meta">' + esc(n.ip) + "</p>" +
        "<p>" + rich(n.note) + "</p>" +
      "</div>" +
      tabs +
      '<div class="concept-body" id="concept-body">' + conceptBody(c) + "</div>" +
      '<div class="panel-block"><p class="kicker">Connected to</p><div class="chips">' + nbs + "</div></div>" +
      (js ? '<div class="panel-block"><p class="kicker">See it in action</p><div class="chips">' + js + "</div></div>" : "");

    $$("[data-concept]", panel).forEach(function (b) {
      b.addEventListener("click", function () {
        state.concept = b.getAttribute("data-concept");
        $$("[data-concept]", panel).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        $("#concept-body").innerHTML = conceptBody(conceptById[state.concept]);
        bindPanelLinks($("#concept-body"));
      });
    });
    bindPanelLinks(panel);
  }

  function bindPanelLinks(scope) {
    $$("[data-node]", scope).forEach(function (b) {
      b.addEventListener("click", function () { selectNode(b.getAttribute("data-node"), false); });
    });
    $$("[data-journey]", scope).forEach(function (b) {
      b.addEventListener("click", function () { startJourney(+b.getAttribute("data-journey")); });
    });
    $$("[data-open-svc]", scope).forEach(function (b) {
      b.addEventListener("click", function () { openService(b.getAttribute("data-open-svc")); });
    });
  }

  /* ---------------- journeys ---------------- */
  function startJourney(i) {
    clearMapState();
    state.mode = "journey"; state.j = i; state.step = 0; state.sel = null;
    setTabs();
    var j = N.journeys[i];
    panel.innerHTML =
      '<div class="player-head">' +
        '<div><button type="button" class="btn-link" id="j-back">← All journeys</button></div>' +
        '<p class="kicker">Journey ' + (i + 1) + " of " + N.journeys.length + "</p>" +
        "<h3>" + esc(j.title) + "</h3>" +
      "</div>" +
      '<div class="dots" id="j-dots" role="group" aria-label="Steps">' + j.steps.map(function (s, k) {
        return '<button type="button" aria-label="Step ' + (k + 1) + ": " + esc(s.title) + '" data-step="' + k + '"></button>';
      }).join("") + "</div>" +
      '<div class="controls">' +
        '<button type="button" class="btn" id="j-prev"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9.5 2 4 7l5.5 5z"/></svg>Back</button>' +
        '<button type="button" class="btn" id="j-play" aria-pressed="false"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 2v10L12 7z"/></svg><span>Play</span></button>' +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn-primary" id="j-next">Next<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4.5 2 10 7l-5.5 5z"/></svg></button>' +
      "</div>" +
      '<div class="panel-block" id="j-step"></div>' +
      '<div class="inspector" id="j-insp"></div>' +
      '<p class="meta" id="j-path"></p>';

    $("#j-back").addEventListener("click", showJourneyList);
    $("#j-prev").addEventListener("click", function () { stopAutoplay(); goStep(state.step - 1); });
    $("#j-next").addEventListener("click", function () {
      stopAutoplay();
      if (state.step === j.steps.length - 1) { startJourney((i + 1) % N.journeys.length); return; }
      goStep(state.step + 1);
    });
    $("#j-play").addEventListener("click", function () { state.playing ? stopAutoplay() : startAutoplay(); });
    $$("[data-step]", panel).forEach(function (b) {
      b.addEventListener("click", function () { stopAutoplay(); goStep(+b.getAttribute("data-step")); });
    });
    svg.classList.add("journey-on");
    goStep(0);
  }

  function goStep(k) {
    var j = N.journeys[state.j];
    if (k < 0 || k >= j.steps.length) return;
    state.step = k;
    var s = j.steps[k];

    // map
    var onSet = {};
    s.path.forEach(function (id) { onSet[id] = true; });
    N.nodes.forEach(function (n) {
      var g = nodeEl[n.id];
      g.classList.toggle("on", !!onSet[n.id]);
      g.classList.toggle("dim", !onSet[n.id]);
      g.classList.toggle("here", n.id === s.path[s.path.length - 1]);
      g.classList.remove("sel");
    });
    $$(".link", svg).forEach(function (p) { p.classList.remove("active", "hl"); });
    for (var i = 1; i < s.path.length; i++) {
      var p = linkEl[s.path[i - 1] + "|" + s.path[i]];
      if (p) p.classList.add("active");
    }
    playPath(s.path);

    // panel
    $$("[data-step]", panel).forEach(function (b, idx) {
      b.classList.toggle("cur", idx === k);
      b.classList.toggle("done", idx < k);
      b.setAttribute("aria-current", idx === k ? "step" : "false");
    });
    $("#j-prev").disabled = k === 0;
    var last = k === j.steps.length - 1;
    $("#j-next").firstChild.textContent = last ? "Next journey" : "Next";

    $("#j-step").innerHTML =
      '<p class="step-count">Step ' + (k + 1) + " of " + j.steps.length + "</p>" +
      "<h4>" + esc(s.title) + "</h4>" +
      "<p>" + rich(s.text) + "</p>";
    $("#j-insp").innerHTML = '<p class="kicker">On the wire</p>' + s.pkts.map(function (pk) {
      return '<div class="pkt"><div class="pkt-label">' + esc(pk.label) + "</div>" + pk.layers.map(function (ly) {
        return '<div class="pkt-row t-' + ly[0] + '" style="--tc:' + TAG_COLOR[ly[0]] + '"><span class="pkt-tag">' + (TAG_TEXT[ly[0]] || ly[0]) + '</span><span class="pkt-val">' + rich(ly[1]) + "</span></div>";
      }).join("") + "</div>";
    }).join("");
    $("#j-path").textContent = "Path: " + s.path.map(function (id) { return nodeById[id].label; }).join(" → ");
  }

  function startAutoplay() {
    state.playing = true;
    var b = $("#j-play");
    if (b) { b.setAttribute("aria-pressed", "true"); b.querySelector("span").textContent = "Pause"; b.querySelector("path").setAttribute("d", "M3 2h3v10H3zM8 2h3v10H8z"); }
    clearInterval(state.timer);
    state.timer = setInterval(function () {
      var j = N.journeys[state.j];
      if (!j || state.step >= j.steps.length - 1) { stopAutoplay(); return; }
      goStep(state.step + 1);
    }, 8000);
  }
  function stopAutoplay() {
    state.playing = false;
    clearInterval(state.timer);
    var b = $("#j-play");
    if (b) { b.setAttribute("aria-pressed", "false"); b.querySelector("span").textContent = "Play"; b.querySelector("path").setAttribute("d", "M3.5 2v10L12 7z"); }
  }

  document.addEventListener("keydown", function (e) {
    if (state.mode !== "journey" || state.j === null) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
    var r = $("#map").getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    if (e.key === "ArrowRight") { e.preventDefault(); stopAutoplay(); goStep(state.step + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); stopAutoplay(); goStep(state.step - 1); }
  });

  function goToMap() { $("#map").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }); }

  /* ================================================================ */
  /* Layers                                                           */
  /* ================================================================ */
  var osi = $("#osi");
  var layerState = { n: 3, seg: "ip" };
  osi.innerHTML = N.layers.map(function (l, i) {
    return '<button type="button" class="osi-btn" role="option" style="grid-row:' + (i + 1) + ";--lc:" + LAYER_COLOR[l.n] + '" data-layer="' + l.n + '">' +
      '<span class="ln">L' + l.n + '</span><span class="lname">' + esc(l.name) + '</span><span class="lpdu">' + esc(l.pdu.split(" (")[0].split(" /")[0]) + "</span></button>";
  }).join("") +
    '<div class="tcpip" style="grid-row:1 / span 3">Application</div>' +
    '<div class="tcpip" style="grid-row:4">Transport</div>' +
    '<div class="tcpip" style="grid-row:5">Internet</div>' +
    '<div class="tcpip" style="grid-row:6 / span 2">Link</div>';

  var strip = $("#encap-strip");
  var SEG_FLEX = { pre: 1, eth: 1.7, vlan: 1.1, ip: 1.8, tcp: 1.8, tls: 1.3, data: 3.6, fcs: 1 };
  strip.innerHTML = N.encap.map(function (s) {
    return '<button type="button" class="seg" data-seg="' + s.id + '" style="flex:' + SEG_FLEX[s.id] + ";--lc:" + LAYER_COLOR[s.layer] + '">' +
      '<span class="sn">' + esc(s.name) + '</span><span class="sb">L' + s.layer + " · " + s.bytes + (s.id === "data" ? "+ B" : " B") + "</span></button>";
  }).join("");

  function renderLayers() {
    var l = N.layers.filter(function (x) { return x.n === layerState.n; })[0];
    $$(".osi-btn", osi).forEach(function (b) { b.setAttribute("aria-selected", +b.getAttribute("data-layer") === l.n); });
    var chips = l.nodes.map(function (id) {
      var m = nodeById[id];
      return '<button type="button" class="chip" data-node="' + id + '" style="--zc:' + zoneColor(m.zone) + '"><span class="dot"></span>' + esc(m.label) + "</button>";
    }).join("");
    var d = $("#layer-detail");
    d.style.setProperty("--lc", LAYER_COLOR[l.n]);
    d.innerHTML =
      '<div class="layer-title"><span class="big">' + l.n + "</span><div><h3>" + esc(l.name) + '</h3><p class="kicker">TCP/IP: ' + esc(l.tcpip) + " layer</p></div></div>" +
      "<p>" + rich(l.what) + "</p>" +
      '<dl class="kv"><dt>Unit</dt><dd>' + esc(l.pdu) + "</dd><dt>Address</dt><dd>" + esc(l.addr) + "</dd><dt>Protocols</dt><dd>" + esc(l.protocols) + "</dd><dt>Devices</dt><dd>" + esc(l.devices) + "</dd><dt>Debug with</dt><dd>" + rich(l.debug) + "</dd></dl>" +
      '<div class="panel-block"><p class="kicker">On the map</p><div class="chips">' + chips + "</div></div>";
    $$("[data-node]", d).forEach(function (b) {
      b.addEventListener("click", function () { selectNode(b.getAttribute("data-node"), false); goToMap(); });
    });

    $$(".seg", strip).forEach(function (b) {
      var seg = N.encap.filter(function (s) { return s.id === b.getAttribute("data-seg"); })[0];
      var match = seg.layer === l.n || (l.n === 5 && seg.layer === 6);
      b.classList.toggle("sel", seg.id === layerState.seg);
      b.classList.toggle("dimmed", !match);
    });
    var seg = N.encap.filter(function (s) { return s.id === layerState.seg; })[0];
    $("#encap-fields").innerHTML = seg
      ? seg.fields.map(function (f) { return "<div><dt>" + esc(seg.name) + " · " + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>"; }).join("")
      : "";
  }
  osi.addEventListener("click", function (e) {
    var b = e.target.closest(".osi-btn");
    if (!b) return;
    layerState.n = +b.getAttribute("data-layer");
    var first = N.encap.filter(function (s) { return s.layer === layerState.n; })[0];
    if (!first && layerState.n === 5) first = N.encap.filter(function (s) { return s.layer === 6; })[0];
    layerState.seg = first ? first.id : null;
    renderLayers();
  });
  strip.addEventListener("click", function (e) {
    var b = e.target.closest(".seg");
    if (!b) return;
    var seg = N.encap.filter(function (s) { return s.id === b.getAttribute("data-seg"); })[0];
    layerState.seg = seg.id;
    layerState.n = seg.layer;
    renderLayers();
  });
  renderLayers();

  /* ================================================================ */
  /* Subnet calculator                                                */
  /* ================================================================ */
  var ipIn = $("#calc-ip"), cidrIn = $("#calc-cidr"), cidrOut = $("#calc-cidr-out"), splitIn = $("#calc-split");

  function parseIp(s) {
    var m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    var o = m.slice(1).map(Number);
    if (o.some(function (x) { return x > 255; })) return null;
    return ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
  }
  function ipStr(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
  function maskOf(c) { return c === 0 ? 0 : (0xffffffff << (32 - c)) >>> 0; }
  function inRange(ip, base, c) { return ((ip & maskOf(c)) >>> 0) === (parseIp(base) >>> 0); }

  function classify(ip) {
    var R = [
      ["10.0.0.0", 8, "Private (RFC 1918). Free to use internally; never routed on the Internet."],
      ["172.16.0.0", 12, "Private (RFC 1918). Free to use internally; never routed on the Internet."],
      ["192.168.0.0", 16, "Private (RFC 1918). The usual home-router range."],
      ["100.64.0.0", 10, "Shared address space (RFC 6598), used by ISPs for carrier-grade NAT."],
      ["127.0.0.0", 8, "Loopback: the device itself."],
      ["169.254.0.0", 16, "Link-local (APIPA). A host gives itself one when DHCP fails."],
      ["192.0.2.0", 24, "Documentation range TEST-NET-1 (RFC 5737)."],
      ["198.51.100.0", 24, "Documentation range TEST-NET-2 (RFC 5737)."],
      ["203.0.113.0", 24, "Documentation range TEST-NET-3 (RFC 5737). Meridian's \"public\" block lives here."],
      ["198.18.0.0", 15, "Benchmarking range (RFC 2544)."],
      ["224.0.0.0", 4, "Multicast: one sender, many subscribed receivers."],
      ["240.0.0.0", 4, "Reserved for future use."],
      ["0.0.0.0", 8, "\"This network\". 0.0.0.0 means \"no address yet\" in a DHCP Discover."]
    ];
    for (var i = 0; i < R.length; i++) if (inRange(ip, R[i][0], R[i][1])) return R[i][2];
    return "Public. Globally routable on the Internet.";
  }

  function renderCalc() {
    var c = +cidrIn.value;
    cidrOut.textContent = "/" + c;
    var ip = parseIp(ipIn.value);
    $("#calc-error").hidden = ip !== null;
    if (ip === null) return;
    var mask = maskOf(c);
    var net = (ip & mask) >>> 0;
    var bc = (net | (~mask >>> 0)) >>> 0;
    var total = Math.pow(2, 32 - c);
    var usable, first, last;
    if (c === 32) { usable = 1; first = last = net; }
    else if (c === 31) { usable = 2; first = net; last = bc; }
    else { usable = total - 2; first = net + 1; last = bc - 1; }

    // bits
    var bits = "";
    for (var o = 0; o < 4; o++) {
      var octet = (ip >>> (24 - o * 8)) & 255;
      bits += '<div class="octet"><div class="octet-bits">';
      for (var b = 0; b < 8; b++) {
        var idx = o * 8 + b;
        bits += '<span class="bit' + (idx < c ? " net" : "") + '">' + ((octet >> (7 - b)) & 1) + "</span>";
      }
      bits += '</div><div class="octet-dec">' + octet + "</div></div>";
    }
    bits += '<div class="bits-key"><span><i class="net"></i>Network bits (' + c + ')</span><span><i></i>Host bits (' + (32 - c) + ")</span></div>";
    $("#calc-bits").innerHTML = bits;

    var plan = N.plan.filter(function (p) {
      var pr = p.cidr.split("/");
      return inRange(ip, pr[0], +pr[1]);
    })[0];

    var rows = [
      ["Network", ipStr(net) + "/" + c],
      ["Subnet mask", ipStr(mask)],
      ["Broadcast", c >= 31 ? "none" : ipStr(bc)],
      ["Wildcard (ACLs)", ipStr(~mask >>> 0)],
      ["First host", ipStr(first)],
      ["Last host", ipStr(last)],
      ["Usable hosts", usable.toLocaleString("en-US")],
      ["Total addresses", total.toLocaleString("en-US")]
    ];
    var out = rows.map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
    out += '<div class="wide"><dt>What kind of address</dt><dd>' + esc(classify(ip)) +
      (plan ? " In Meridian's plan: <strong>" + esc(plan.name) + (plan.vlan !== "—" ? " (VLAN " + plan.vlan + ")" : "") + "</strong>, " + esc(plan.cidr) + "." : "") + "</dd></div>";
    $("#calc-out").innerHTML = out;

    var extra = +splitIn.value;
    var nc = Math.min(32, c + extra);
    var count = Math.pow(2, nc - c);
    var size = Math.pow(2, 32 - nc);
    var list = "";
    for (var k = 0; k < Math.min(count, 16); k++) {
      var sn = net + k * size;
      var h = nc >= 31 ? (nc === 32 ? 1 : 2) : size - 2;
      list += "<li>" + ipStr(sn) + "/" + nc + "<span>" + h.toLocaleString("en-US") + " hosts</span></li>";
    }
    $("#calc-split-list").innerHTML = c + extra > 32 ? "<li>Can't split a /" + c + " that far.</li>" : list;

    $$("#plan-table tbody tr").forEach(function (tr) {
      tr.classList.toggle("cur", tr.getAttribute("data-cidr") === ipStr(net) + "/" + c);
    });
  }
  ipIn.addEventListener("input", renderCalc);
  cidrIn.addEventListener("input", renderCalc);
  splitIn.addEventListener("change", renderCalc);

  var planBody = $("#plan-table tbody");
  planBody.innerHTML = N.plan.map(function (p) {
    return '<tr tabindex="0" data-cidr="' + p.cidr + '" style="--zc: var(--z-' + p.zone + ')">' +
      '<td class="mono">' + esc(p.vlan) + "</td><td>" + esc(p.name) + '</td><td class="mono">' + esc(p.cidr) + '</td><td class="mono">' + esc(p.gw) + "</td><td>" + esc(p.use) + "</td></tr>";
  }).join("");
  function loadPlanRow(tr) {
    var pr = tr.getAttribute("data-cidr").split("/");
    ipIn.value = pr[0];
    cidrIn.value = pr[1];
    renderCalc();
  }
  $$("tr", planBody).forEach(function (tr) {
    tr.addEventListener("click", function () { loadPlanRow(tr); });
    tr.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadPlanRow(tr); } });
  });
  renderCalc();

  /* ================================================================ */
  /* Services catalog                                                 */
  /* ================================================================ */
  var svcGrid = $("#svc-grid"), svcSearch = $("#svc-search"), svcCats = $("#svc-cats");
  var svcCat = "All";
  function nodesWith(cid) { return N.nodes.filter(function (n) { return n.concepts.indexOf(cid) >= 0; }); }

  svcGrid.innerHTML = N.concepts.map(function (c) {
    var onMap = nodesWith(c.id).map(function (n) {
      return '<button type="button" class="chip" data-node="' + n.id + '" style="--zc:' + zoneColor(n.zone) + '"><span class="dot"></span>' + esc(n.label) + "</button>";
    }).join("");
    var rel = c.related.map(function (r) {
      return '<button type="button" class="chip" data-open-svc="' + r + '">' + esc(conceptById[r].name) + "</button>";
    }).join("");
    var cols = "";
    if (c.ports) cols += "<div><h4>Ports</h4><p>" + rich(c.ports) + "</p></div>";
    if (c.examples) cols += "<div><h4>In the real world</h4><p>" + rich(c.examples) + "</p></div>";
    return '<details class="svc" id="svc-' + c.id + '" data-cat="' + esc(c.cat) + '" style="--cc:' + CAT_COLOR[c.cat] + '">' +
      '<summary><span class="badge">' + esc(c.abbr) + '</span><span class="sname">' + esc(c.name) + '</span><span class="swhat">' + rich(c.what) + "</span></summary>" +
      '<div class="svc-body">' +
        '<p class="kicker">Layer: ' + esc(c.layer) + "</p>" +
        "<ul>" + c.how.map(function (h) { return "<li>" + rich(h) + "</li>"; }).join("") + "</ul>" +
        (cols ? '<div class="svc-cols">' + cols + "</div>" : "") +
        (c.breaks ? '<div class="callout"><strong>When it breaks</strong>' + rich(c.breaks) + "</div>" : "") +
        (onMap ? '<div class="panel-block"><h4>On the map</h4><div class="chips">' + onMap + "</div></div>" : "") +
        (rel ? '<div class="panel-block"><h4>Related</h4><div class="chips">' + rel + "</div></div>" : "") +
      "</div></details>";
  }).join("");

  svcCats.innerHTML = ["All"].concat(N.categories).map(function (cat) {
    return '<button type="button" class="chip" aria-pressed="' + (cat === "All") + '" data-cat="' + esc(cat) + '">' +
      (cat !== "All" ? '<span class="dot" style="--zc:' + CAT_COLOR[cat] + '"></span>' : "") + esc(cat) + "</button>";
  }).join("");

  var svcText = {};
  N.concepts.forEach(function (c) {
    svcText[c.id] = [c.name, c.abbr, c.what, c.how.join(" "), c.ports, c.examples, c.breaks, c.layer].join(" ").toLowerCase();
  });
  function filterSvc() {
    var q = svcSearch.value.trim().toLowerCase();
    var shown = 0;
    N.concepts.forEach(function (c) {
      var ok = (svcCat === "All" || c.cat === svcCat) && (!q || q.split(/\s+/).every(function (w) { return svcText[c.id].indexOf(w) >= 0; }));
      $("#svc-" + c.id).hidden = !ok;
      if (ok) shown++;
    });
    $("#svc-empty").hidden = shown > 0;
  }
  svcSearch.addEventListener("input", filterSvc);
  svcCats.addEventListener("click", function (e) {
    var b = e.target.closest("[data-cat]");
    if (!b) return;
    svcCat = b.getAttribute("data-cat");
    $$("[data-cat]", svcCats).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
    filterSvc();
  });
  svcGrid.addEventListener("click", function (e) {
    var nb = e.target.closest("[data-node]");
    if (nb) { selectNode(nb.getAttribute("data-node"), false); goToMap(); return; }
    var sb = e.target.closest("[data-open-svc]");
    if (sb) openService(sb.getAttribute("data-open-svc"));
  });

  function openService(id) {
    svcSearch.value = "";
    svcCat = "All";
    $$("[data-cat]", svcCats).forEach(function (x) { x.setAttribute("aria-pressed", x.getAttribute("data-cat") === "All"); });
    filterSvc();
    var d = $("#svc-" + id);
    d.open = true;
    d.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* ================================================================ */
  /* Ports                                                            */
  /* ================================================================ */
  var portBody = $("#ports-table tbody");
  portBody.innerHTML = N.ports.map(function (p) {
    var chips = p[4].map(function (id) {
      var m = nodeById[id];
      return '<button type="button" class="chip" data-node="' + id + '" style="--zc:' + zoneColor(m.zone) + '"><span class="dot"></span>' + esc(m.label) + "</button>";
    }).join("");
    var tag = p[5] ? ' <span class="tag tag-' + p[5] + '">' + p[5] + "</span>" : "";
    return '<tr data-text="' + esc((p[0] + " " + p[1] + " " + p[2] + " " + p[3] + " " + p[5]).toLowerCase()) + '">' +
      '<td class="mono">' + esc(p[0]) + '</td><td class="mono">' + esc(p[1]) + '</td><td class="svcname">' + esc(p[2]) + tag + "</td><td>" + esc(p[3]) + "</td><td>" + chips + "</td></tr>";
  }).join("");
  $("#port-search").addEventListener("input", function (e) {
    var q = e.target.value.trim().toLowerCase();
    $$("tr", portBody).forEach(function (tr) { tr.hidden = !!q && tr.getAttribute("data-text").indexOf(q) < 0; });
  });
  portBody.addEventListener("click", function (e) {
    var b = e.target.closest("[data-node]");
    if (b) { selectNode(b.getAttribute("data-node"), false); goToMap(); }
  });

  /* ================================================================ */
  /* Quiz                                                             */
  /* ================================================================ */
  var quizBox = $("#quiz-box");
  var quiz = { i: 0, score: 0, answered: false };
  function renderQuiz() {
    var total = N.quiz.length;
    if (quiz.i >= total) {
      var pct = Math.round(quiz.score / total * 100);
      var verdict = pct === 100 ? "Perfect. You could run this network." :
        pct >= 75 ? "Strong. A couple of services worth a second look." :
        pct >= 50 ? "Good start. Follow the journeys on the map, then try again." :
        "Start with the journeys on the map; they cover every answer here.";
      quizBox.innerHTML =
        '<p class="kicker">Result</p><div class="score">' + quiz.score + " / " + total + "</div><p>" + verdict + '</p><div><button type="button" class="btn btn-primary" id="quiz-restart">Try again</button></div>';
      $("#quiz-restart").addEventListener("click", function () { quiz = { i: 0, score: 0, answered: false }; renderQuiz(); });
      return;
    }
    var q = N.quiz[quiz.i];
    quizBox.innerHTML =
      '<div class="quiz-top"><p class="kicker">Question ' + (quiz.i + 1) + " of " + total + " · score " + quiz.score + '</p><div class="quiz-progress" aria-hidden="true"><i style="width:' + (quiz.i / total * 100) + '%"></i></div></div>' +
      '<p class="q">' + rich(q.q) + "</p>" +
      '<div class="answers">' + q.a.map(function (a, k) {
        return '<button type="button" class="answer" data-a="' + k + '"><span class="letter">' + "ABCD"[k] + "</span><span>" + rich(a) + "</span></button>";
      }).join("") + "</div>" +
      '<div id="quiz-after"></div>';
    $$(".answer", quizBox).forEach(function (b) {
      b.addEventListener("click", function () {
        if (quiz.answered) return;
        quiz.answered = true;
        var k = +b.getAttribute("data-a");
        var right = k === q.c;
        if (right) quiz.score++;
        $$(".answer", quizBox).forEach(function (x, idx) {
          x.disabled = true;
          if (idx === q.c) x.classList.add("right");
          else if (idx === k) x.classList.add("wrong");
        });
        $("#quiz-after").innerHTML =
          '<p class="why' + (right ? "" : " miss") + '"><strong>' + (right ? "Correct" : "Not quite. The answer is " + "ABCD"[q.c]) + "</strong>" + rich(q.why) + "</p>" +
          '<div style="margin-top:14px"><button type="button" class="btn btn-primary" id="quiz-next">' + (quiz.i === total - 1 ? "See your score" : "Next question") + "</button></div>";
        var nx = $("#quiz-next");
        nx.addEventListener("click", function () { quiz.i++; quiz.answered = false; renderQuiz(); });
        nx.focus({ preventScroll: true });
      });
    });
  }
  renderQuiz();

  /* ================================================================ */
  /* Start                                                            */
  /* ================================================================ */
  showExplore();
})();
