/* How the Net Works — virtual networks section (virtualization host and
   Kubernetes). Clickable components and animated scenarios, with text at
   three depths handled by the level classes (only-beg, min-int, only-exp). */
(function () {
  "use strict";

  var U = window.HTNW, N = window.NET;
  var SVGNS = "http://www.w3.org/2000/svg";
  var esc = U.esc, rich = U.rich;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  var svg = $("#v-svg"), panel = $("#v-panel");
  var SH = { net: { hw: 23, hh: 15 }, sec: { hw: 24, hh: 17 }, srv: { hw: 20, hh: 20 }, end: { hw: 20, hh: 20 }, ext: { hw: 20, hh: 20 }, pod: { hw: 19, hh: 19 }, vip: { hw: 22, hh: 18 }, bar: { hw: 0, hh: 12 } };
  var TAG_COLOR = { L1: "var(--z-inet)", L2: "var(--z-users)", L3: "var(--z-servers)", L4: "var(--z-edge)", TLS: "var(--z-guest)", L7: "var(--z-mgmt)", CHK: "var(--ok)", DROP: "var(--bad)" };
  var TAG_TEXT = { CHK: "CHECK", DROP: "DROP" };

  var D = null, byId = {}, linkEl = {}, nodeEl = {};
  var st = { tab: 0, sel: null, scen: null, step: 0 };
  var gPacket, anim = { raf: 0, run: null }, visible = true;

  /* ---------------- geometry ---------------- */
  function linkPts(l) {
    var a = byId[l.from], b = byId[l.to];
    if (l.kind === "drop") return [[b.x, a.y], [b.x, b.y]];
    return [[a.x, a.y], [b.x, b.y]];
  }
  function ptsToD(p) { return p.map(function (q, i) { return (i ? "L" : "M") + q[0] + " " + q[1]; }).join(" "); }
  function segPts(a, b) {
    var l = D.links.filter(function (x) { return (x.from === a && x.to === b) || (x.from === b && x.to === a); })[0];
    if (!l) return [[byId[a].x, byId[a].y], [byId[b].x, byId[b].y]];
    var p = linkPts(l);
    return l.from === a ? p : p.slice().reverse();
  }
  function pathPoints(ids) {
    var pts = [];
    function push(p) {
      var last = pts[pts.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
    }
    if (ids.length === 1) return [[byId[ids[0]].x, byId[ids[0]].y]];
    for (var i = 1; i < ids.length; i++) {
      var seg = segPts(ids[i - 1], ids[i]);
      // a bar is entered/left at the attachment point, not its centre
      if (i === 1 && byId[ids[0]].shape !== "bar") push([byId[ids[0]].x, byId[ids[0]].y]);
      seg.forEach(function (p, k) { if (k > 0 || byId[ids[i - 1]].shape === "bar") push(p); });
    }
    return pts;
  }

  /* ---------------- drawing ---------------- */
  function shape(n, pad, cls, parent) {
    var s = SH[n.shape], w = s.hw + pad, h = s.hh + pad;
    if (n.shape === "bar") return el("rect", { x: -n.w / 2 - pad, y: -h, width: n.w + pad * 2, height: h * 2, rx: 6, class: cls }, parent);
    if (n.shape === "net" || n.shape === "srv" || n.shape === "vip") return el("rect", { x: -w, y: -h, width: w * 2, height: h * 2, rx: (n.shape === "net" ? 6 : 8) + pad / 2, class: cls }, parent);
    if (n.shape === "sec") {
      var k = 11 + pad * 0.4;
      return el("polygon", { points: [[-w, 0], [-k, -h], [k, -h], [w, 0], [k, h], [-k, h]].map(function (p) { return p.join(","); }).join(" "), class: cls }, parent);
    }
    return el("circle", { r: s.hw + pad, class: cls }, parent);
  }

  function draw() {
    D = N.virt[st.tab];
    byId = {}; linkEl = {}; nodeEl = {};
    D.nodes.forEach(function (n) { byId[n.id] = n; });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute("viewBox", D.viewBox);
    svg.setAttribute("aria-label", D.title + " diagram");

    var gz = el("g", {}, svg), gl = el("g", {}, svg), gzt = el("g", { "aria-hidden": "true" }, svg);
    D.groups.forEach(function (g) {
      var gg = el("g", { class: "zone", style: "--zc: var(--z-" + g.c + ")" }, gz);
      el("rect", { x: g.x, y: g.y, width: g.w, height: g.h, rx: 14, class: "zone-rect" }, gg);
      var tg = el("g", { style: "--zc: var(--z-" + g.c + ")" }, gzt);
      var t = el("text", { x: g.x + 12, y: g.y + 19 }, tg);
      el("tspan", { class: "zone-label" }, t).textContent = g.label;
      if (g.sub) { var ts = el("tspan", { class: "zone-sub", dx: 8 }, t); ts.textContent = g.sub; }
    });
    D.links.forEach(function (l) {
      var p = el("path", { d: ptsToD(linkPts(l)), class: "link" + (l.kind && l.kind !== "drop" ? " " + l.kind : "") }, gl);
      linkEl[l.from + "|" + l.to] = p; linkEl[l.to + "|" + l.from] = p;
    });
    var gn = el("g", {}, svg);
    D.nodes.forEach(function (n) {
      var s = SH[n.shape];
      var g = el("g", {
        class: "node v-node " + n.shape, transform: "translate(" + n.x + " " + n.y + ")", tabindex: "0", role: "button",
        "aria-label": n.label, style: "--zc: var(--z-" + n.c + ")"
      }, gn);
      shape(n, 5, "ring", g);
      shape(n, 0, "shape", g);
      if (n.shape === "bar") {
        el("text", { class: "bar-label", y: 4.5 }, g).textContent = n.label;
        if (n.sub) el("text", { class: "bar-sub", y: s.hh + 15 }, g).textContent = n.sub;
      } else {
        el("text", { class: "abbr" }, g).textContent = n.abbr;
        var lx = 0, ly = s.hh + 16, anchor = "middle";
        if (n.lp === "r") { lx = s.hw + 8; ly = 5; anchor = "start"; }
        else if (n.lp === "l") { lx = -s.hw - 8; ly = 5; anchor = "end"; }
        el("text", { class: "label", x: lx, y: ly, "text-anchor": anchor }, g).textContent = n.label;
      }
      g.addEventListener("click", function () { selectNode(n.id); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNode(n.id); } });
      nodeEl[n.id] = g;
    });
    gPacket = el("g", { class: "packet", visibility: "hidden", "aria-hidden": "true" }, svg);
    el("circle", { r: 12, class: "packet-halo" }, gPacket);
    el("circle", { r: 6.5, class: "packet-dot" }, gPacket);
  }

  /* ---------------- packet animation ---------------- */
  function stopPacket() {
    if (anim.raf) cancelAnimationFrame(anim.raf);
    anim.raf = 0; anim.run = null;
    if (gPacket) { gPacket.setAttribute("visibility", "hidden"); gPacket.classList.remove("pulse"); }
  }
  function place(p) { gPacket.setAttribute("transform", "translate(" + p[0].toFixed(1) + " " + p[1].toFixed(1) + ")"); }
  function play(ids) {
    stopPacket();
    var pts = pathPoints(ids);
    gPacket.setAttribute("visibility", "visible");
    if (pts.length < 2 || U.reduceMotion) { place(pts[pts.length - 1]); gPacket.classList.add("pulse"); return; }
    var m = U.measure(pts), dur = Math.min(5000, Math.max(1200, m.total / 0.3)), hold = 900, start = 0;
    function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
    anim.run = function (ts) {
      anim.raf = 0;
      if (!visible || document.hidden) return;
      if (!start) start = ts;
      var t = Math.min(1, ((ts - start) % (dur + hold)) / dur);
      place(U.pointAt(pts, m.lens, ease(t) * m.total));
      gPacket.classList.toggle("pulse", t >= 1);
      anim.raf = requestAnimationFrame(anim.run);
    };
    anim.raf = requestAnimationFrame(anim.run);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible && anim.run && !anim.raf) anim.raf = requestAnimationFrame(anim.run);
    }).observe($("#v-card"));
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && anim.run && !anim.raf) anim.raf = requestAnimationFrame(anim.run); });

  /* ---------------- map state ---------------- */
  function clearMarks() {
    svg.classList.remove("journey-on");
    D.nodes.forEach(function (n) { nodeEl[n.id].classList.remove("sel", "on", "dim", "here"); });
    $$(".link", svg).forEach(function (p) { p.classList.remove("active", "hl"); });
  }

  /* ---------------- panels ---------------- */
  function depthBlock(o) {
    return '<p class="only-beg">' + rich(o.easy || o.text) + "</p>" +
      '<p class="min-int">' + rich(o.text) + "</p>" +
      (o.deep && o.deep.length ? '<div class="only-exp deep-box"><p class="kicker">Going deeper</p><ul>' + o.deep.map(function (d) { return "<li>" + rich(d) + "</li>"; }).join("") + "</ul></div>" : "");
  }
  function scenarioCards() {
    return '<div class="journey-list">' + D.scenarios.map(function (s, i) {
      return '<button type="button" class="jcard" data-scen="' + i + '"><span class="jn">' + String(i + 1).padStart(2, "0") + '</span><span class="jt">' + esc(s.title) + '</span><span class="jb">' + esc(s.blurb) + ' <span class="mono">' + s.steps.length + " step" + (s.steps.length > 1 ? "s" : "") + "</span></span></button>";
    }).join("") + "</div>";
  }
  function bindCards() {
    $$("[data-scen]", panel).forEach(function (b) { b.addEventListener("click", function () { startScen(+b.getAttribute("data-scen")); }); });
  }

  var INTRO = N.VINTRO || [
    { easy: "One physical server can run dozens of virtual machines. Inside it, a software switch connects them, just as a real switch connects real computers. Two servers here share the work and can pass running machines between them.",
      text: "Two hypervisor hosts run the company's servers as VMs. Each host has a distributed virtual switch with port groups mapped to VLANs, two physical uplinks trunked to a pair of top-of-rack switches, and VMkernel interfaces for management, live migration and storage.",
      deep: ["Watch for traffic that stays inside a host (invisible to physical tools) and traffic that hairpins through the core.", "Overlays (NSX, OVN) decouple VM networks from VLANs and add distributed routing and firewalling."] },
    { easy: "Kubernetes runs apps as small containers spread across several servers (nodes). Each copy of an app, a pod, gets its own address, and the cluster gives each app one permanent name.",
      text: "A three-node cluster with its control plane. Pods get IPs from each node's slice of 10.244.0.0/16; Services provide stable virtual IPs from 10.96.0.0/12; an ingress controller behind a load balancer brings customers in; NetworkPolicy restricts who may reach the database. Node 1 is the K8S-W1 VM from the virtualization tab.",
      deep: ["Three layers of addressing coexist: node IPs (routable), pod IPs (routable inside the cluster via the CNI), and Service IPs (virtual, implemented by rules on every node).", "Trace with `kubectl get endpointslices`, `ip route` on nodes, and Hubble or tcpdump on the veth."] }
  ];

  function showIntro() {
    stopPacket(); clearMarks();
    st.sel = null; st.scen = null;
    var it = INTRO[st.tab];
    panel.innerHTML =
      '<div class="panel-block"><p class="kicker">' + esc(D.title) + "</p><h3>" + (st.tab ? "Inside a Kubernetes cluster" : "Inside the virtualization hosts") + "</h3>" + depthBlock(it) +
      "<p>Click any component on the diagram, or follow a scenario.</p></div>" +
      '<div class="panel-block"><p class="kicker">Scenarios</p>' + scenarioCards() + "</div>";
    bindCards();
  }

  function scenariosWith(id) {
    return D.scenarios.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) {
      return x.s.steps.some(function (st2) { return st2.path.indexOf(id) >= 0; });
    });
  }

  function selectNode(id) {
    stopPacket(); clearMarks();
    st.sel = id; st.scen = null;
    var n = byId[id], c = U.conceptById[n.concept];
    nodeEl[id].classList.add("sel");
    D.links.forEach(function (l) { if (l.from === id || l.to === id) linkEl[l.from + "|" + l.to].classList.add("hl"); });
    var nbs = D.links.filter(function (l) { return l.from === id || l.to === id; }).map(function (l) { return l.from === id ? l.to : l.from; });
    var sc = scenariosWith(id);
    panel.innerHTML =
      '<div><button type="button" class="btn-link" id="v-back">← Overview</button></div>' +
      '<div class="panel-block" style="--zc: var(--z-' + n.c + ')"><span class="zone-chip">' + esc(D.title) + "</span><h3>" + esc(n.label) + "</h3>" +
        (n.meta ? '<p class="meta min-int">' + esc(n.meta) + "</p>" : "") + depthBlock(n) + "</div>" +
      (nbs.length ? '<div class="panel-block"><p class="kicker">Connected to</p><div class="chips">' + nbs.map(function (x) {
        return '<button type="button" class="chip" data-vnode="' + x + '" style="--zc: var(--z-' + byId[x].c + ')"><span class="dot"></span>' + esc(byId[x].label) + "</button>";
      }).join("") + "</div></div>" : "") +
      (sc.length ? '<div class="panel-block"><p class="kicker">See it in action</p><div class="chips">' + sc.map(function (x) {
        return '<button type="button" class="chip" data-scen="' + x.i + '">▸ ' + esc(x.s.title) + "</button>";
      }).join("") + "</div></div>" : "") +
      (c ? '<div><button type="button" class="btn-link" data-open-svc="' + c.id + '">Read about ' + esc(c.name) + " in the catalog</button></div>" : "");
    $("#v-back").addEventListener("click", showIntro);
    $$("[data-vnode]", panel).forEach(function (b) { b.addEventListener("click", function () { selectNode(b.getAttribute("data-vnode")); }); });
    $$("[data-open-svc]", panel).forEach(function (b) { b.addEventListener("click", function () { U.openService(b.getAttribute("data-open-svc")); }); });
    bindCards();
    if (window.innerWidth <= 1080) panel.scrollIntoView({ block: "start", behavior: U.reduceMotion ? "auto" : "smooth" });
  }

  function startScen(i) {
    stopPacket(); clearMarks();
    st.sel = null; st.scen = i; st.step = 0;
    var s = D.scenarios[i];
    panel.innerHTML =
      '<div class="player-head"><div><button type="button" class="btn-link" id="v-back">← All scenarios</button></div>' +
        '<p class="kicker">' + esc(D.title) + " · scenario " + (i + 1) + " of " + D.scenarios.length + "</p><h3>" + esc(s.title) + "</h3></div>" +
      '<div class="dots" id="v-dots">' + s.steps.map(function (x, k) { return '<button type="button" data-vstep="' + k + '" aria-label="Step ' + (k + 1) + ": " + esc(x.title) + '"></button>'; }).join("") + "</div>" +
      '<div class="controls"><button type="button" class="btn" id="v-prev"><svg viewBox="0 0 14 14" aria-hidden="true"><path d="M9.5 2 4 7l5.5 5z"/></svg>Back</button><span class="spacer"></span>' +
        '<button type="button" class="btn btn-primary" id="v-next">Next<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M4.5 2 10 7l-5.5 5z"/></svg></button></div>' +
      '<div class="panel-block" id="v-step"></div><div class="inspector min-int" id="v-insp"></div>' +
      '<p class="meta min-int" id="v-path"></p>' +
      (s.deep ? '<div class="only-exp deep-box"><p class="kicker">Expert notes</p><ul>' + s.deep.map(function (d) { return "<li>" + rich(d) + "</li>"; }).join("") + "</ul></div>" : "");
    $("#v-back").addEventListener("click", showIntro);
    $("#v-prev").addEventListener("click", function () { goStep(st.step - 1); });
    $("#v-next").addEventListener("click", function () {
      if (st.step === s.steps.length - 1) { startScen((i + 1) % D.scenarios.length); return; }
      goStep(st.step + 1);
    });
    $$("[data-vstep]", panel).forEach(function (b) { b.addEventListener("click", function () { goStep(+b.getAttribute("data-vstep")); }); });
    svg.classList.add("journey-on");
    goStep(0);
  }

  function goStep(k) {
    var s = D.scenarios[st.scen];
    if (k < 0 || k >= s.steps.length) return;
    st.step = k;
    var step = s.steps[k], on = {};
    step.path.forEach(function (id) { on[id] = true; });
    D.nodes.forEach(function (n) {
      var g = nodeEl[n.id];
      g.classList.toggle("on", !!on[n.id]);
      g.classList.toggle("dim", !on[n.id]);
      g.classList.toggle("here", n.id === step.path[step.path.length - 1]);
    });
    $$(".link", svg).forEach(function (p) { p.classList.remove("active"); });
    for (var i = 1; i < step.path.length; i++) {
      var p = linkEl[step.path[i - 1] + "|" + step.path[i]];
      if (p) p.classList.add("active");
    }
    play(step.path);
    $$("[data-vstep]", panel).forEach(function (b, idx) { b.classList.toggle("cur", idx === k); b.classList.toggle("done", idx < k); });
    $("#v-prev").disabled = k === 0;
    $("#v-next").firstChild.textContent = k === s.steps.length - 1 ? "Next scenario" : "Next";
    $("#v-step").innerHTML = '<p class="step-count">Step ' + (k + 1) + " of " + s.steps.length + "</p><h4>" + esc(step.title) + "</h4>" +
      '<p class="only-beg">' + rich(step.easy) + '</p><p class="only-beg fromto"><span>' + esc(byId[step.path[0]].label) + "</span> → <span>" + esc(byId[step.path[step.path.length - 1]].label) + '</span></p><p class="min-int">' + rich(step.text) + "</p>" +
      (U.wiresharkFilter ? U.wiresharkFilter(step.pkts) : "");
    $("#v-insp").innerHTML = '<p class="kicker">On the wire</p>' + step.pkts.map(function (pk) {
      return '<div class="pkt"><div class="pkt-label">' + esc(pk.label) + "</div>" + pk.layers.map(function (ly) {
        return '<div class="pkt-row t-' + ly[0] + '" style="--tc:' + TAG_COLOR[ly[0]] + '"><span class="pkt-tag">' + (TAG_TEXT[ly[0]] || ly[0]) + '</span><span class="pkt-val">' + rich(ly[1]) + "</span></div>";
      }).join("") + "</div>";
    }).join("");
    $("#v-path").textContent = "Path: " + step.path.map(function (id) { return byId[id].label; }).join(" → ");
  }

  /* ---------------- tabs ---------------- */
  function setTab(i) {
    st.tab = i;
    $$("[data-vtab]").forEach(function (b) { b.setAttribute("aria-selected", +b.getAttribute("data-vtab") === i); });
    stopPacket();
    draw();
    showIntro();
    var g = $("#v-gloss");
    if (g && window.I18N) {
      var abbrs = D.nodes.map(function (n) { return n.abbr; });
      Object.keys(N.GLOSSARY || {}).forEach(function (k) {
        D.nodes.forEach(function (n) { if (n.label.split(/[^A-Za-z0-9.]+/).indexOf(k) >= 0) abbrs.push(k); });
      });
      g.innerHTML = window.I18N.glossaryHTML(abbrs, "Short forms in this diagram");
    }
  }
  $$("[data-vtab]").forEach(function (b) { b.addEventListener("click", function () { setTab(+b.getAttribute("data-vtab")); }); });
  setTab(0);
})();
