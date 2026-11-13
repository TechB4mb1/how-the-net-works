/* How the Net Works — page logic. No dependencies. */
(function () {
  "use strict";

  var N = window.NET;
  var SVGNS = "http://www.w3.org/2000/svg";
  var root = document.documentElement;

  /* ---------------- learning level ---------------- */
  var LEVELS = ["beginner", "intermediate", "expert"];
  var LEVEL_NUM = { beginner: 1, intermediate: 2, expert: 3 };
  var levelListeners = [];
  var initialLevel = "intermediate";
  try { var savedLevel = localStorage.getItem("htnw-level"); if (LEVELS.indexOf(savedLevel) >= 0) initialLevel = savedLevel; } catch (e) { /* storage unavailable */ }
  root.setAttribute("data-level", initialLevel);
  function getLevel() { return root.getAttribute("data-level") || "intermediate"; }
  function setLevel(l) {
    if (LEVELS.indexOf(l) < 0) return;
    root.setAttribute("data-level", l);
    try { localStorage.setItem("htnw-level", l); } catch (e) { /* ignore */ }
    syncLevelButtons();
    levelListeners.forEach(function (fn) { fn(l); });
  }
  function syncLevelButtons() {
    var l = getLevel();
    Array.prototype.forEach.call(document.querySelectorAll("[data-set-level]"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-set-level") === l);
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-set-level]");
    if (b) setLevel(b.getAttribute("data-set-level"));
  });
  syncLevelButtons();

  /* Wireshark display filter suggested from a step's packets (expert level) */
  var WS = [[/EAPOL|EAP-/, "eapol"], [/DHCP/, "dhcp"], [/\bARP\b|RARP/, "arp"], [/(SRV|A|MX|TXT)\?|DNS/, "dns"], [/Kerberos|AS-REQ|AS-REP/, "kerberos"],
    [/\bNTP\b/, "ntp"], [/LDAP/, "ldap"], [/SMB2|SMB 3/, "smb2"], [/RADIUS/, "radius"], [/TLS|STARTTLS|HTTPS/, "tls"], [/HTTP\/2/, "http2"],
    [/CONNECT|GET \/|HTTP\/1/, "http"], [/EHLO|SMTP|MAIL FROM/, "smtp"], [/IKE/, "isakmp"], [/\bESP\b/, "esp"], [/iSCSI/, "iscsi"], [/Geneve/, "geneve"], [/VXLAN|8472/, "vxlan"]];
  function wiresharkFilter(pkts) {
    var txt = pkts.map(function (p) { return p.layers.map(function (l) { return l[1]; }).join(" "); }).join(" ");
    var found = [];
    WS.forEach(function (w) { if (w[0].test(txt) && found.indexOf(w[1]) < 0) found.push(w[1]); });
    if (!found.length) {
      var m = txt.match(/(TCP|UDP)[^→]*→\s*(\d{2,5})/);
      if (m) found.push(m[1].toLowerCase() + ".port == " + m[2]);
    }
    if (!found.length) return "";
    return '<p class="only-exp ws"><span class="kicker">Wireshark filter</span> <code>' + found.join(" || ") + "</code></p>";
  }

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
    "Operations": "var(--z-edge)",
    "Virtual & cloud": "var(--z-guest)"
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
  var gFlows = el("g", { class: "flows", "aria-hidden": "true", style: "display:none" }, svg);
  var gLinkHits = el("g", { class: "link-hits" }, svg);
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
    var hit = el("path", { d: ptsToD(linkPts(l)), class: "link-hit" }, gLinkHits);
    el("title", {}, hit).textContent = "Cable: " + nodeById[l.from].label + " ↔ " + nodeById[l.to].label;
    hit.addEventListener("click", function () { if (state.mode === "live") showFlowFilter({ type: "link", a: l.from, b: l.to }); });
    hit.addEventListener("mouseenter", function () { if (state.mode === "live") p.classList.add("hl"); });
    hit.addEventListener("mouseleave", function () {
      var f = state.flowFilter;
      if (state.mode === "live" && !(f && f.type === "link" && ((f.a === l.from && f.b === l.to) || (f.a === l.to && f.b === l.from)))) p.classList.remove("hl");
    });
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

    g.addEventListener("click", function () { activateNode(n.id); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activateNode(n.id); }
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
      if (mapVisible) kickFlows();
    }).observe($(".map-card"));
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && anim.run && !anim.raf) anim.raf = requestAnimationFrame(anim.run);
    if (!document.hidden) kickFlows();
  });

  function pointAt(pts, lens, dist) {
    for (var k = 0; k < lens.length; k++) {
      if (dist <= lens[k] || k === lens.length - 1) {
        var f = lens[k] ? Math.max(0, Math.min(1, dist / lens[k])) : 1;
        return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f];
      }
      dist -= lens[k];
    }
    return pts[pts.length - 1];
  }
  function measure(pts) {
    var lens = [], total = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      lens.push(d); total += d;
    }
    return { lens: lens, total: total };
  }

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
  var state = { mode: "live", sel: null, concept: null, j: null, step: 0, playing: false, timer: 0,
    flowFocus: null, flowFilter: null, flowBack: null, cats: {} };
  N.flowCats.forEach(function (c) { state.cats[c.id] = true; });
  var tabLive = $("#tab-live"), tabExplore = $("#tab-explore"), tabJourney = $("#tab-journey");

  function setTabs() {
    tabLive.setAttribute("aria-selected", state.mode === "live");
    tabExplore.setAttribute("aria-selected", state.mode === "explore");
    tabJourney.setAttribute("aria-selected", state.mode === "journey");
  }
  function activateNode(id) {
    if (state.mode === "live") showFlowFilter({ type: "node", id: id });
    else selectNode(id, true);
  }
  tabLive.addEventListener("click", function () { showLive(); });
  tabExplore.addEventListener("click", function () { showExplore(); });
  tabJourney.addEventListener("click", function () { showJourneyList(); });

  function clearMapState() {
    svg.classList.remove("journey-on", "focus-on");
    stopFlows();
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

  function deepBox(list, title) {
    if (!list || !list.length) return "";
    return '<div class="only-exp deep-box"><p class="kicker">' + esc(title) + "</p><ul>" + list.map(function (d) { return "<li>" + rich(d) + "</li>"; }).join("") + "</ul></div>";
  }
  function conceptBody(c) {
    var html =
      (c.easy ? '<div class="panel-block only-beg analogy"><p class="kicker">In plain words · ' + esc(c.name) + "</p><p>" + rich(c.easy) + "</p></div>" : "") +
      '<div class="panel-block"><p class="kicker">What it is · ' + esc(c.name) + '</p><p>' + rich(c.what) + '</p></div>' +
      '<div class="panel-block min-int"><p class="kicker">How it works</p><ul>' + c.how.map(function (h) { return "<li>" + rich(h) + "</li>"; }).join("") + '</ul></div>';
    var kv = "";
    if (c.ports) kv += "<dt>Ports</dt><dd>" + rich(c.ports) + "</dd>";
    if (c.examples) kv += "<dt>Examples</dt><dd>" + rich(c.examples) + "</dd>";
    if (kv) html += '<dl class="kv min-int">' + kv + "</dl>";
    if (c.breaks) html += '<div class="callout"><strong>When it breaks</strong>' + rich(c.breaks) + "</div>";
    html += deepBox(c.deep, "Going deeper");
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
        '<p class="meta min-int">' + esc(n.ip) + "</p>" +
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
      '<div class="inspector min-int" id="j-insp"></div>' +
      '<p class="meta min-int" id="j-path"></p>' +
      deepBox(j.deep, "Expert notes");

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
      (s.easy ? '<p class="only-beg">' + rich(s.easy) + "</p>" : "") +
      '<p class="only-beg fromto"><span>' + esc(nodeById[s.path[0]].label) + "</span> → <span>" + esc(nodeById[s.path[s.path.length - 1]].label) + "</span></p>" +
      '<p class="' + (s.easy ? "min-int" : "") + '">' + rich(s.text) + "</p>" +
      wiresharkFilter(s.pkts);
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
  /* Live traffic                                                     */
  /* ================================================================ */
  var flowById = {}, catById = {};
  N.flows.forEach(function (f) { flowById[f.id] = f; });
  N.flowCats.forEach(function (c) { catById[c.id] = c; });
  var FLOW_SPEED = 80;           // px per second, in map units
  var flowPaths = [], flowsBuilt = false, flowRaf = 0;
  function flowColor(cat) { return "var(--fl-" + cat + ")"; }

  function buildFlows() {
    if (flowsBuilt) return;
    flowsBuilt = true;
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    N.flows.forEach(function (f) {
      f.paths.forEach(function (path) {
        var pts = pathPoints(path), m = measure(pts);
        var g = el("g", { class: "flow", style: "--fc:" + flowColor(f.cat) }, gFlows);
        var line = el("path", { d: ptsToD(pts), class: "flow-line" }, g);
        var n = Math.max(1, Math.min(4, Math.round(m.total / 210)));
        var dots = [], k;
        for (k = 0; k < n; k++) dots.push({ el: el("circle", { r: 4.4, class: "flow-dot" }, g), off: k * m.total / n, rev: false });
        if (f.reply) for (k = 0; k < n; k++) dots.push({ el: el("circle", { r: 3.5, class: "flow-dot rev" }, g), off: (k + 0.5) * m.total / n, rev: true });
        if (f.dropped) {
          var e = pts[pts.length - 1];
          var x = el("g", { class: "flow-x", transform: "translate(" + (e[0] - 30) + " " + (e[1] - 22) + ")" }, g);
          el("circle", { r: 8.5 }, x);
          el("path", { d: "M-3.6 -3.6L3.6 3.6M3.6 -3.6L-3.6 3.6" }, x);
        }
        flowPaths.push({ f: f, path: path, g: g, line: line, pts: pts, lens: m.lens, total: m.total, dots: dots, phase: rnd() * m.total, vis: true });
      });
    });
  }

  function pathHasLink(path, a, b) {
    for (var i = 1; i < path.length; i++) {
      if ((path[i - 1] === a && path[i] === b) || (path[i - 1] === b && path[i] === a)) return true;
    }
    return false;
  }
  function pathMatches(path, flt) {
    if (!flt) return true;
    if (flt.type === "node") return path.indexOf(flt.id) >= 0;
    if (flt.type === "link") return pathHasLink(path, flt.a, flt.b);
    return true;
  }
  function flowMatches(f, flt) {
    if (!flt) return true;
    if (flt.type === "set") return flt.ids.indexOf(f.id) >= 0;
    return f.paths.some(function (p) { return pathMatches(p, flt); });
  }
  function flowsFor(flt) { return N.flows.filter(function (f) { return flowMatches(f, flt); }); }

  function renderFlowFrame(t) {
    flowPaths.forEach(function (fp) {
      if (!fp.vis) return;
      var T = fp.total;
      fp.dots.forEach(function (d) {
        var s = ((t * FLOW_SPEED + d.off + fp.phase) % T + T) % T;
        var u = s / T;
        var p = pointAt(fp.pts, fp.lens, d.rev ? T - s : s);
        d.el.setAttribute("cx", p[0].toFixed(1));
        d.el.setAttribute("cy", p[1].toFixed(1));
        var o = Math.min(1, u / 0.05, (1 - u) / 0.05);
        if (fp.f.dropped) o = Math.min(o, (1 - u) / 0.3);
        d.el.setAttribute("opacity", Math.max(0, o).toFixed(2));
      });
    });
  }
  function flowTick(ts) {
    flowRaf = 0;
    if (state.mode !== "live" || !mapVisible || document.hidden) return;
    renderFlowFrame(ts / 1000);
    flowRaf = requestAnimationFrame(flowTick);
  }
  function kickFlows() {
    if (state.mode !== "live" || reduceMotion || flowRaf) return;
    flowRaf = requestAnimationFrame(flowTick);
  }
  function applyFlows() {
    var focus = state.flowFocus, flt = state.flowFilter;
    flowPaths.forEach(function (fp) {
      var vis;
      if (focus) vis = fp.f.id === focus;
      else if (flt) vis = flowMatches(fp.f, flt) && (flt.type === "set" || pathMatches(fp.path, flt));
      else vis = !!state.cats[fp.f.cat];
      fp.vis = vis;
      fp.g.style.display = vis ? "" : "none";
      fp.line.classList.toggle("show", !!focus && vis);
      fp.line.classList.toggle("faint", !focus && !!flt && vis);
    });
    // nodes and links
    $$(".node", svg).forEach(function (g) { g.classList.remove("sel", "on", "dim", "here"); });
    $$(".link", svg).forEach(function (p) { p.classList.remove("active", "hl"); });
    svg.classList.remove("focus-on");
    if (focus) {
      var on = {};
      flowById[focus].paths.forEach(function (p) { p.forEach(function (id) { on[id] = true; }); });
      svg.classList.add("focus-on");
      N.nodes.forEach(function (n) { nodeEl[n.id].classList.toggle("dim", !on[n.id]); });
    } else if (flt && flt.type === "node") {
      nodeEl[flt.id].classList.add("sel");
    } else if (flt && flt.type === "link") {
      linkEl[flt.a + "|" + flt.b].classList.add("hl");
    }
    if (reduceMotion) renderFlowFrame(2.6);
    else kickFlows();
  }
  function startFlows() {
    buildFlows();
    svg.classList.add("live-on");
    gFlows.style.display = "";
    applyFlows();
  }
  function stopFlows() {
    if (flowRaf) cancelAnimationFrame(flowRaf);
    flowRaf = 0;
    gFlows.style.display = "none";
    svg.classList.remove("live-on");
  }

  function flowRow(f) {
    return '<button type="button" class="flow-row' + (f.dropped ? " dropped" : "") + (state.cats[f.cat] ? "" : " off") + '" data-flow="' + f.id + '" data-cat-of="' + f.cat + '" style="--fc:' + flowColor(f.cat) + '">' +
      '<i></i><span class="fn">' + esc(f.name) + '</span><span class="fp">' + rich(f.proto) + "</span></button>";
  }
  function bindFlowRows(scope) {
    $$("[data-flow]", scope).forEach(function (b) {
      b.addEventListener("click", function () { focusFlow(b.getAttribute("data-flow")); });
    });
  }

  function showLive() {
    clearMapState();
    state.mode = "live"; state.sel = null; state.j = null;
    state.flowFocus = null; state.flowFilter = null; state.flowBack = null;
    setTabs();
    startFlows();
    var chips = N.flowCats.map(function (c) {
      return '<button type="button" class="chip" aria-pressed="' + !!state.cats[c.id] + '" data-cat="' + c.id + '" style="--fc:' + flowColor(c.id) + '"><span class="dot"></span>' + esc(c.name) + "</button>";
    }).join("");
    var groups = N.flowCats.map(function (c) {
      var fs = N.flows.filter(function (f) { return f.cat === c.id; });
      return '<div class="flow-group"><p class="kicker flow-group-head" style="--fc:' + flowColor(c.id) + '"><i></i>' + esc(c.name) + "</p>" + fs.map(flowRow).join("") + "</div>";
    }).join("");
    panel.innerHTML =
      '<div class="panel-block">' +
        '<p class="kicker">Live traffic</p>' +
        "<h3>A normal Tuesday morning</h3>" +
        "<p>Every stream of dots is one kind of traffic, coloured by what it's for. Solid dots are requests; hollow dots are replies coming back. Streams that end at a red ✕ are being dropped.</p>" +
        "<p>Click a stream below, or any cable or device on the map, to see exactly what crosses it.</p>" +
      "</div>" +
      '<div class="panel-block"><p class="kicker">Show or hide</p><div class="chips cat-chips" id="cat-chips">' + chips + "</div></div>" +
      groups;
    $$("[data-cat]", panel).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-cat");
        state.cats[id] = !state.cats[id];
        b.setAttribute("aria-pressed", state.cats[id]);
        $$('[data-cat-of="' + id + '"]', panel).forEach(function (r) { r.classList.toggle("off", !state.cats[id]); });
        applyFlows();
      });
    });
    bindFlowRows(panel);
  }

  function filterTitle(flt) {
    if (flt.type === "node") return { kicker: "Traffic through this device", title: nodeById[flt.id].label };
    if (flt.type === "link") return { kicker: "Traffic on this cable", title: nodeById[flt.a].label + " ↔ " + nodeById[flt.b].label };
    return { kicker: "Traffic for this service", title: flt.label };
  }

  function showFlowFilter(flt) {
    if (state.mode !== "live") { clearMapState(); state.mode = "live"; setTabs(); startFlows(); }
    state.flowFocus = null; state.flowFilter = flt; state.flowBack = null;
    applyFlows();
    var fs = flowsFor(flt), t = filterTitle(flt);
    var allowed = fs.filter(function (f) { return !f.dropped; }).length;
    panel.innerHTML =
      '<div><button type="button" class="btn-link" id="lv-back">← All traffic</button></div>' +
      '<div class="panel-block"><p class="kicker">' + esc(t.kicker) + "</p><h3>" + esc(t.title) + "</h3>" +
        "<p>" + (fs.length
          ? fs.length + " kind" + (fs.length === 1 ? "" : "s") + " of traffic" + (flt.type === "link" ? " cross this cable" : flt.type === "node" ? " pass through or end here" : "") + (fs.length - allowed ? ", " + (fs.length - allowed) + " of them dropped." : ".")
          : "Nothing in this model uses it.") + "</p>" +
        (flt.type === "node" ? '<div><button type="button" class="btn" id="lv-device">Device details</button></div>' : "") +
      "</div>" +
      '<div class="flow-group">' + fs.map(flowRow).join("") + "</div>";
    $$(".flow-row", panel).forEach(function (r) { r.classList.remove("off"); });
    $("#lv-back").addEventListener("click", showLive);
    if (flt.type === "node") $("#lv-device").addEventListener("click", function () { selectNode(flt.id, false); });
    $$("[data-flow]", panel).forEach(function (b) {
      b.addEventListener("click", function () { focusFlow(b.getAttribute("data-flow"), flt); });
    });
    if (window.innerWidth <= 1080 && flt.type !== "set") panel.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
  }

  function focusFlow(id, back) {
    if (state.mode !== "live") { clearMapState(); state.mode = "live"; setTabs(); startFlows(); }
    var f = flowById[id], c = catById[f.cat];
    state.flowFocus = id; state.flowBack = back || null; state.flowFilter = null;
    applyFlows();
    var paths = f.paths.map(function (p) { return p.map(function (x) { return nodeById[x].label; }).join(" → "); });
    panel.innerHTML =
      '<div><button type="button" class="btn-link" id="lv-back">← ' + (back ? "Back to " + esc(filterTitle(back).title) : "All traffic") + "</button></div>" +
      '<div class="panel-block" style="--zc:' + flowColor(f.cat) + '"><span class="zone-chip">' + esc(c.name) + "</span><h3>" + esc(f.name) + "</h3><p>" + rich(f.why) + "</p></div>" +
      '<dl class="kv">' +
        "<dt>From</dt><dd>" + esc(f.from) + "</dd>" +
        "<dt>To</dt><dd>" + esc(f.to) + "</dd>" +
        '<dt class="min-int">Protocol</dt><dd class="min-int">' + rich(f.proto) + "</dd>" +
        "<dt>Started by</dt><dd>" + esc(f.starts) + (f.reply ? "; replies flow back" : f.dropped ? "" : "; one-way, no replies") + "</dd>" +
        '<dt class="min-int">Rule</dt><dd class="min-int">' + rich(f.rule) + "</dd>" +
      "</dl>" +
      '<div class="callout"><strong>' + (f.dropped ? "Where it stops" : "If it's blocked") + "</strong>" + rich(f.fail) + "</div>" +
      '<div class="panel-block"><p class="kicker">Path' + (paths.length > 1 ? "s" : "") + "</p>" + paths.map(function (p) { return '<p class="meta">' + esc(p) + "</p>"; }).join("") + "</div>" +
      '<div class="chips">' +
        (f.journey ? '<button type="button" class="chip" data-journey-id="' + f.journey + '">▸ Step through it packet by packet</button>' : "") +
        '<button type="button" class="chip" data-open-svc="' + f.concept + '">Read about ' + esc(conceptById[f.concept].name) + "</button>" +
      "</div>";
    $("#lv-back").addEventListener("click", function () { if (back) showFlowFilter(back); else showLive(); });
    $$("[data-journey-id]", panel).forEach(function (b) {
      b.addEventListener("click", function () {
        var id2 = b.getAttribute("data-journey-id");
        startJourney(N.journeys.map(function (j) { return j.id; }).indexOf(id2));
      });
    });
    bindPanelLinks(panel);
  }

  /* ================================================================ */
  /* Service dependency map                                           */
  /* ================================================================ */
  var depSvg = $("#dep-svg"), depPanel = $("#dep-panel");
  var depById = {}, neededBy = {};
  N.deps.forEach(function (d) { depById[d.id] = d; neededBy[d.id] = []; });
  N.deps.forEach(function (d) { d.deps.forEach(function (x) { neededBy[x].push(d.id); }); });
  var ROW_Y = [62, 192, 322, 452, 582], DW = 70, DH = 25;
  var depState = { sel: null, down: null };

  NET.depRows.forEach(function (label, i) {
    el("rect", { x: 8, y: ROW_Y[i] - 52, width: 1284, height: 104, rx: 12, class: "dep-band" }, depSvg).style.opacity = i % 2 ? "0" : "";
    var t = el("text", { x: 22, y: ROW_Y[i] + 4, class: "dep-row" }, depSvg);
    var words = label.split(" ");
    if (words.length > 1 && label.length > 14) {
      var mid = Math.ceil(words.length / 2);
      el("tspan", { x: 22, dy: -7 }, t).textContent = words.slice(0, mid).join(" ");
      el("tspan", { x: 22, dy: 15 }, t).textContent = words.slice(mid).join(" ");
    } else t.textContent = label;
  });
  var gDepEdges = el("g", {}, depSvg), gDepNodes = el("g", {}, depSvg);
  var depEdgeEl = {}, depNodeEl = {};
  N.deps.forEach(function (d) {
    d.deps.forEach(function (x) {
      var b = depById[x];
      var ax = d.x, ay = ROW_Y[d.row] + DH, bx = b.x, by = ROW_Y[b.row] - DH, dy = (by - ay) * 0.5;
      depEdgeEl[d.id + ">" + x] = el("path", { d: "M" + ax + " " + ay + " C" + ax + " " + (ay + dy) + " " + bx + " " + (by - dy) + " " + bx + " " + by, class: "dep-edge" }, gDepEdges);
    });
  });
  N.deps.forEach(function (d) {
    var g = el("g", { class: "dep", transform: "translate(" + d.x + " " + ROW_Y[d.row] + ")", tabindex: "0", role: "button", "aria-label": d.name }, gDepNodes);
    el("rect", { x: -DW, y: -DH, width: DW * 2, height: DH * 2, rx: 9 }, g);
    el("text", { class: "dn", y: -3 }, g).textContent = d.name;
    el("text", { class: "ds", y: 14 }, g).textContent = d.sub;
    g.addEventListener("click", function () { selectDep(d.id); });
    g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectDep(d.id); } });
    depNodeEl[d.id] = g;
  });

  function affected(id) {
    var seen = {}, queue = [id], out = [];
    while (queue.length) {
      var cur = queue.shift();
      neededBy[cur].forEach(function (x) { if (!seen[x] && x !== id) { seen[x] = true; out.push(x); queue.push(x); } });
    }
    return out;
  }
  function selectDep(id) { depState.sel = id; depState.down = null; renderDeps(); }
  function breakDep(id) { depState.sel = id; depState.down = id; renderDeps(); }

  function depChip(id) { return '<button type="button" class="chip" data-dep="' + id + '">' + esc(depById[id].name) + "</button>"; }

  function renderDeps() {
    var sel = depState.sel, down = depState.down;
    N.deps.forEach(function (d) {
      var g = depNodeEl[d.id];
      g.classList.remove("sel", "is-dep", "is-need", "dim", "down", "hit");
      g.style.removeProperty("--d");
    });
    Object.keys(depEdgeEl).forEach(function (k) { depEdgeEl[k].classList.remove("e-dep", "e-need", "hot"); });
    depSvg.classList.toggle("dep-svg-focus", !!sel);

    if (down) {
      var hit = affected(down), hitSet = {};
      hit.forEach(function (x) { hitSet[x] = true; });
      depNodeEl[down].classList.add("down");
      hit.forEach(function (x) {
        depNodeEl[x].classList.add("hit");
        depNodeEl[x].style.setProperty("--d", (Math.abs(depById[down].row - depById[x].row) * 160) + "ms");
      });
      N.deps.forEach(function (d) {
        if (d.id !== down && !hitSet[d.id]) depNodeEl[d.id].classList.add("dim");
        d.deps.forEach(function (x) { if (hitSet[d.id] && (x === down || hitSet[x])) depEdgeEl[d.id + ">" + x].classList.add("hot"); });
      });
      var dd = depById[down];
      var others = N.deps.length - 1;
      hit.sort(function (a, b) { return depById[b].row - depById[a].row; });
      depPanel.innerHTML =
        '<div class="panel-block"><p class="kicker">Outage simulation</p><h3>' + esc(dd.name) + " is down</h3></div>" +
        '<div class="panel-block"><div class="big-stat">' + hit.length + " of " + others + "</div><p>other services fail with it" + (hit.length ? ", working up from the bottom of the stack." : ". It is a leaf: nothing else depends on it.") + "</p></div>" +
        '<ul class="impact"><li class="root"><strong>' + esc(dd.name) + "</strong>" + esc(dd.down) + "</li>" +
          hit.map(function (x) { return "<li><strong>" + esc(depById[x].name) + "</strong>" + esc(depById[x].down) + "</li>"; }).join("") +
        "</ul>" +
        '<div class="quick"><button type="button" class="btn btn-primary" id="dep-restore">Restore ' + esc(dd.name) + "</button></div>";
      $("#dep-restore").addEventListener("click", function () { selectDep(down); });
      return;
    }

    if (!sel) {
      depPanel.innerHTML =
        '<div class="panel-block"><p class="kicker">Start here</p><h3>Pull out a building block</h3>' +
        "<p>Each box is a service; lines run down to what it needs. Click a box to see what it depends on and what depends on it. Or jump straight to an outage:</p></div>" +
        '<div class="quick">' + ["dns", "ntp", "ad", "fw", "isp", "dhcp"].map(function (id) {
          return '<button type="button" class="btn btn-danger" data-break="' + id + '">Break ' + esc(depById[id].name) + "</button>";
        }).join("") + "</div>" +
        '<div class="panel-block"><p class="kicker">Why this matters</p><p>Outages rarely start where users notice them. "Email is down" can really be DNS, an expired certificate or a clock that drifted. Engineers troubleshoot by walking down this stack.</p></div>';
      bindDepPanel();
      return;
    }

    var d = depById[sel];
    depNodeEl[sel].classList.add("sel");
    d.deps.forEach(function (x) { depNodeEl[x].classList.add("is-dep"); depEdgeEl[sel + ">" + x].classList.add("e-dep"); });
    neededBy[sel].forEach(function (x) { depNodeEl[x].classList.add("is-need"); depEdgeEl[x + ">" + sel].classList.add("e-need"); });
    N.deps.forEach(function (o) {
      if (o.id !== sel && d.deps.indexOf(o.id) < 0 && neededBy[sel].indexOf(o.id) < 0) depNodeEl[o.id].classList.add("dim");
    });
    var reach = affected(sel).length;
    depPanel.innerHTML =
      '<div class="panel-block"><p class="kicker">' + esc(NET.depRows[d.row]) + "</p><h3>" + esc(d.name) + "</h3><p>" + esc(d.what) + "</p></div>" +
      '<div class="panel-block"><p class="kicker">Depends on</p>' + (d.deps.length ? '<div class="chips">' + d.deps.map(depChip).join("") + "</div>" : "<p>Nothing below it in this model.</p>") + "</div>" +
      '<div class="panel-block"><p class="kicker">Needed directly by</p>' + (neededBy[sel].length ? '<div class="chips">' + neededBy[sel].map(depChip).join("") + "</div>" : "<p>Nothing. Users deal with it directly.</p>") + "</div>" +
      '<p class="meta">Counting indirect dependents, ' + reach + " service" + (reach === 1 ? "" : "s") + " rely on it.</p>" +
      '<div class="quick"><button type="button" class="btn btn-danger" data-break="' + sel + '">Simulate an outage</button></div>' +
      '<div class="chips">' +
        '<button type="button" class="chip" data-dep-flows="' + sel + '">See its traffic on the map</button>' +
        '<button type="button" class="chip" data-open-svc="' + d.concept + '">Read about ' + esc(conceptById[d.concept].name) + "</button>" +
      "</div>";
    bindDepPanel();
  }
  function bindDepPanel() {
    $$("[data-dep]", depPanel).forEach(function (b) { b.addEventListener("click", function () { selectDep(b.getAttribute("data-dep")); }); });
    $$("[data-break]", depPanel).forEach(function (b) { b.addEventListener("click", function () { breakDep(b.getAttribute("data-break")); }); });
    $$("[data-open-svc]", depPanel).forEach(function (b) { b.addEventListener("click", function () { openService(b.getAttribute("data-open-svc")); }); });
    $$("[data-dep-flows]", depPanel).forEach(function (b) {
      b.addEventListener("click", function () {
        var d = depById[b.getAttribute("data-dep-flows")];
        showFlowFilter({ type: "set", ids: d.flows, label: d.name });
        goToMap();
      });
    });
  }

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
      (l.easy ? '<p class="only-beg analogy-line">' + rich(l.easy) + "</p>" : "") +
      "<p>" + rich(l.what) + "</p>" +
      '<dl class="kv"><dt>Unit</dt><dd>' + esc(l.pdu) + "</dd><dt>Address</dt><dd>" + esc(l.addr) + '</dd><dt class="min-int">Protocols</dt><dd class="min-int">' + esc(l.protocols) + "</dd><dt>Devices</dt><dd>" + esc(l.devices) + '</dd><dt class="min-int">Debug with</dt><dd class="min-int">' + rich(l.debug) + "</dd></dl>" +
      (l.deep ? '<div class="only-exp deep-box"><p class="kicker">Going deeper</p><p>' + rich(l.deep) + "</p></div>" : "") +
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
    var out = rows.map(function (r) { return '<div class="' + (r[0] === "Wildcard (ACLs)" || r[0] === "Total addresses" ? "min-int" : "") + '"><dt>' + r[0] + "</dt><dd>" + r[1] + "</dd></div>"; }).join("");
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
      '<summary><span class="badge">' + esc(c.abbr) + '</span><span class="sname">' + esc(c.name) + '</span><span class="swhat">' +
        (c.easy ? '<span class="only-beg">' + rich(c.easy) + '</span><span class="min-int">' + rich(c.what) + "</span>" : rich(c.what)) + "</span></summary>" +
      '<div class="svc-body">' +
        '<p class="kicker min-int">Layer: ' + esc(c.layer) + "</p>" +
        (c.easy ? '<p class="only-beg">' + rich(c.what) + "</p>" : "") +
        '<ul class="min-int">' + c.how.map(function (h) { return "<li>" + rich(h) + "</li>"; }).join("") + "</ul>" +
        (cols ? '<div class="svc-cols min-int">' + cols + "</div>" : "") +
        (c.breaks ? '<div class="callout"><strong>When it breaks</strong>' + rich(c.breaks) + "</div>" : "") +
        deepBox(c.deep, "Going deeper") +
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
    svcText[c.id] = [c.name, c.abbr, c.what, c.easy || "", c.how.join(" "), c.ports, c.examples, c.breaks, c.layer, (c.deep || []).join(" ")].join(" ").toLowerCase();
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
    return '<tr data-lvl="' + (p[6] || 2) + '" data-text="' + esc((p[0] + " " + p[1] + " " + p[2] + " " + p[3] + " " + p[5]).toLowerCase()) + '">' +
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
  function levelQuiz() { var n = LEVEL_NUM[getLevel()]; return N.quiz.filter(function (q) { return q.lvl === n; }); }
  levelListeners.push(function () { quiz = { i: 0, score: 0, answered: false }; renderQuiz(); });
  function renderQuiz() {
    var QS = levelQuiz();
    var total = QS.length;
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
    var q = QS[quiz.i];
    quizBox.innerHTML =
      '<div class="quiz-top"><p class="kicker">' + getLevel().charAt(0).toUpperCase() + getLevel().slice(1) + " · question " + (quiz.i + 1) + " of " + total + " · score " + quiz.score + '</p><div class="quiz-progress" aria-hidden="true"><i style="width:' + (quiz.i / total * 100) + '%"></i></div></div>' +
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
  showLive();
  renderDeps();

  /* Shared helpers for builder.js */
  window.HTNW = {
    esc: esc, rich: rich, measure: measure, pointAt: pointAt, ptsToD: ptsToD,
    openService: openService, reduceMotion: reduceMotion, conceptById: conceptById,
    wiresharkFilter: wiresharkFilter, getLevel: getLevel, onLevel: function (fn) { levelListeners.push(fn); }
  };
})();
