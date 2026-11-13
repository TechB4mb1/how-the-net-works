/* How the Net Works — network builder.
   Add and remove components; the topology, traffic and a live report
   (what works, security score, single points of failure) update from
   the rules below. Depends on helpers exported by app.js (window.HTNW). */
(function () {
  "use strict";

  var U = window.HTNW;
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

  /* ---------------------------------------------------------------- */
  /* Components                                                        */
  /* up: candidate uplinks in order of preference (first present wins) */
  /* bus: drawn on the server bus when attached to the core switch     */
  /* ---------------------------------------------------------------- */
  var GROUPS = ["Internet edge", "Network", "Core services", "Applications", "Security & operations"];
  var COMPS = [
    { id: "isp", name: "Internet link", lp: "r", label: "ISP", abbr: "ISP", shape: "ext", x: 480, y: 52, up: [], group: "Internet edge", concept: "bgp",
      what: "Your connection to the rest of the Internet, from an ISP." },
    { id: "isp2", name: "Second ISP link", lp: "r", label: "ISP 2", abbr: "ISP2", shape: "ext", x: 650, y: 52, up: [], group: "Internet edge", concept: "bgp",
      what: "A backup connection from a different provider, so one ISP outage doesn't cut you off." },
    { id: "router", name: "Edge router", lp: "r", label: "Edge router", abbr: "RTR", shape: "net", x: 480, y: 140, up: ["isp", "isp2"], group: "Internet edge", concept: "router",
      what: "Routes between your network and the ISPs. With two links it can fail over between them." },
    { id: "ips", name: "IPS", lp: "r", label: "IPS", abbr: "IPS", shape: "sec", x: 480, y: 220, up: ["router", "isp", "isp2"], group: "Internet edge", concept: "ips",
      what: "Sits inline on the Internet link and drops known attacks before they reach anything." },
    { id: "fw", name: "Firewall", lp: "r", label: "Firewall", abbr: "FW", shape: "sec", x: 480, y: 302, up: ["ips", "router", "isp", "isp2"], group: "Internet edge", concept: "firewall",
      what: "Enforces what may cross between the Internet, the DMZ, the inside and guests, and does NAT." },

    { id: "core", name: "Core switch", lp: "r", label: "Core switch", abbr: "L3", shape: "net", x: 480, y: 420, up: ["fw", "ips", "router", "isp", "isp2"], group: "Network", concept: "vlan",
      what: "A layer-3 switch that connects everything inside and routes between VLANs." },
    { id: "access", name: "Access switch", label: "Access switch", abbr: "SW", shape: "net", x: 290, y: 530, up: ["core", "fw", "ips", "router", "isp", "isp2"], group: "Network", concept: "switch",
      what: "The switch the desks plug into. Without a core switch it uplinks straight to the firewall or router." },
    { id: "ap", name: "Wi-Fi access point", label: "Wi-Fi AP", abbr: "AP", shape: "net", x: 170, y: 530, up: ["access"], group: "Network", concept: "wifi",
      what: "Wireless for staff, and for guests if you add them." },
    { id: "laptops", name: "Staff laptops", label: "Staff laptops", abbr: "PCs", shape: "end", x: 290, y: 640, up: ["access"], group: "Network", concept: "ip", fixed: true,
      what: "The people the network exists for. They can't be removed." },
    { id: "guests", name: "Guest devices", label: "Guests", abbr: "GST", shape: "end", x: 70, y: 640, up: ["ap"], kind: "air", group: "Network", concept: "wifi",
      what: "Visitors' phones and laptops on Wi-Fi." },

    { id: "dhcp", name: "DHCP server", label: "DHCP", abbr: "DHCP", shape: "srv", x: 565, y: 548, up: ["core", "access"], bus: true, group: "Core services", concept: "dhcp",
      what: "Hands out addresses, gateways and DNS settings, with reservations, failover and DNS registration." },
    { id: "dns", name: "Internal DNS", label: "DNS", abbr: "DNS", shape: "srv", x: 655, y: 548, up: ["core", "access"], bus: true, group: "Core services", concept: "dns",
      what: "Resolves internal names and forwards Internet lookups. (A domain controller also runs DNS.)" },
    { id: "dc", name: "Domain controller", label: "Domain ctrl", abbr: "DC", shape: "srv", x: 745, y: 548, up: ["core", "access"], bus: true, group: "Core services", concept: "ad",
      what: "Active Directory: one account per person, groups, Kerberos logons and Group Policy. Also runs DNS." },
    { id: "dc2", name: "Second domain controller", label: "Second DC", abbr: "DC2", shape: "srv", x: 835, y: 548, up: ["core", "access"], bus: true, group: "Core services", concept: "ad",
      what: "A replica of the directory and DNS, so logons survive one server failing." },
    { id: "ca", name: "Certificate authority", label: "CA", abbr: "CA", shape: "srv", x: 925, y: 548, up: ["core", "access"], bus: true, group: "Core services", concept: "ca",
      what: "Issues certificates for Wi-Fi/802.1X, VPN and internal HTTPS." },
    { id: "nac", name: "RADIUS / NAC", label: "RADIUS", abbr: "NAC", shape: "srv", x: 1015, y: 548, up: ["core", "access"], bus: true, group: "Core services", concept: "nac",
      what: "Authenticates every device on wired ports and Wi-Fi before it gets on the network." },

    { id: "file", name: "File server", label: "File server", abbr: "SMB", shape: "srv", x: 610, y: 648, up: ["core", "access"], bus: true, group: "Applications", concept: "file",
      what: "Shared drives and home folders." },
    { id: "mail", name: "Mail server", label: "Mail server", abbr: "EXC", shape: "srv", x: 700, y: 648, up: ["core", "access"], bus: true, group: "Applications", concept: "smtp",
      what: "Mailboxes and calendars, hosted on-premises." },
    { id: "mailgw", name: "Mail gateway", label: "Mail gateway", abbr: "SMTP", shape: "srv", x: 280, y: 352, up: ["fw", "ips", "router", "isp", "isp2"], group: "Applications", concept: "smtp",
      what: "Receives Internet mail in the DMZ and filters spam, malware and spoofing before relaying it inside." },
    { id: "web", name: "Public web server", label: "Web server", abbr: "WEB", shape: "srv", x: 120, y: 262, up: ["waf", "fw", "ips", "router", "isp", "isp2"], group: "Applications", concept: "http",
      what: "Hosts your public website." },
    { id: "waf", name: "WAF / reverse proxy", label: "WAF", abbr: "WAF", shape: "sec", x: 280, y: 262, up: ["fw", "ips", "router", "isp", "isp2"], group: "Applications", concept: "waf",
      what: "Fronts the website: terminates TLS, filters attacks and load-balances." },
    { id: "proxy", name: "Web proxy", label: "Web proxy", abbr: "PRX", shape: "sec", x: 690, y: 262, up: ["fw", "ips", "router"], group: "Applications", concept: "proxy",
      what: "Users browse through it, so web access is filtered, scanned and logged." },
    { id: "vpn", name: "VPN gateway", label: "VPN", abbr: "VPN", shape: "sec", x: 690, y: 352, up: ["fw", "ips", "router", "isp", "isp2"], group: "Applications", concept: "vpn",
      what: "Lets home workers reach internal systems over an encrypted tunnel." },

    { id: "siem", name: "SIEM", label: "SIEM", abbr: "SIEM", shape: "srv", x: 790, y: 648, up: ["core", "access"], bus: true, group: "Security & operations", concept: "siem",
      what: "Collects and correlates logs from every device so attacks get noticed." },
    { id: "ids", name: "IDS sensor", label: "IDS", abbr: "IDS", shape: "sec", x: 300, y: 420, up: ["core"], kind: "span", group: "Security & operations", concept: "ids",
      what: "Watches a mirror copy of internal traffic for lateral movement. Needs a core switch to mirror from." },
    { id: "edr", name: "EDR on laptops", label: "EDR", abbr: "EDR", shape: "sec", x: 400, y: 640, up: ["laptops"], kind: "span", group: "Security & operations", concept: "edr",
      what: "An agent on every laptop that detects and stops malware and can isolate the machine." },
    { id: "jump", name: "Jump host", label: "Jump host", abbr: "JMP", shape: "srv", x: 880, y: 648, up: ["core", "access"], bus: true, group: "Security & operations", concept: "jump",
      what: "The only machine allowed to manage network gear and servers. Admins connect through it with MFA." }
  ];
  var comp = {};
  COMPS.forEach(function (c) { comp[c.id] = c; });
  var BUS_Y = 492;
  var ISPS = { isp: true, isp2: true };

  var PRESETS = [
    { id: "home", name: "Home router", vlans: false, has: ["isp", "router", "access", "ap", "laptops"] },
    { id: "small", name: "Small office", vlans: true, has: ["isp", "fw", "access", "ap", "laptops", "guests", "dc", "file", "edr"] },
    { id: "flat", name: "Flat and exposed", vlans: false, has: ["isp", "router", "access", "ap", "laptops", "guests", "dc", "file", "mail", "web"] },
    { id: "ent", name: "Enterprise", vlans: true, has: COMPS.map(function (c) { return c.id; }) },
    { id: "empty", name: "Just laptops", vlans: false, has: ["laptops"] }
  ];

  /* ---------------------------------------------------------------- */
  /* Topology from the current state                                   */
  /* ---------------------------------------------------------------- */
  function buildGraph(S) {
    var edges = [], adj = {}, unconnected = {};
    COMPS.forEach(function (c) { if (S.has[c.id]) adj[c.id] = []; });
    COMPS.forEach(function (c) {
      if (!S.has[c.id] || !c.up.length) return;
      var parents = [];
      if (c.id === "router") parents = c.up.filter(function (u) { return S.has[u]; });
      else {
        var first = c.up.filter(function (u) { return S.has[u]; })[0];
        if (first && ISPS[first]) parents = ["isp", "isp2"].filter(function (u) { return S.has[u]; });
        else if (first) parents = [first];
      }
      if (!parents.length && c.id !== "access" && c.id !== "core") unconnected[c.id] = true;
      parents.forEach(function (p) {
        edges.push({ a: c.id, b: p, kind: c.kind || "", pts: edgePts(c, comp[p]) });
        adj[c.id].push(p); adj[p].push(c.id);
      });
    });
    return { edges: edges, adj: adj, unconnected: unconnected };
  }
  function edgePts(c, p) {
    if (c.bus && p.id === "core") return [[p.x, p.y], [p.x, BUS_Y], [c.x, BUS_Y], [c.x, c.y]];
    return [[p.x, p.y], [c.x, c.y]];
  }
  function route(g, a, b) {
    if (!g.adj[a] || !g.adj[b]) return null;
    var prev = {}, q = [a], seen = {}; seen[a] = true;
    while (q.length) {
      var cur = q.shift();
      if (cur === b) break;
      g.adj[cur].forEach(function (n) { if (!seen[n]) { seen[n] = true; prev[n] = cur; q.push(n); } });
    }
    if (!seen[b]) return null;
    var path = [b];
    while (path[0] !== a) path.unshift(prev[path[0]]);
    return path;
  }

  /* ---------------------------------------------------------------- */
  /* Evaluation                                                        */
  /* ---------------------------------------------------------------- */
  function evaluate(S) {
    var g = buildGraph(S);
    function has(id) { return !!S.has[id]; }
    function conn(a, b) { return !!route(g, a, b); }
    var ispX = has("isp") ? "isp" : has("isp2") ? "isp2" : null;
    function fromNet(id) { return has(id) && ((has("isp") && conn("isp", id)) || (has("isp2") && conn("isp2", id))); }
    var lan = has("access");
    var inet = fromNet("laptops");
    var dcId = conn("laptops", "dc") ? "dc" : conn("laptops", "dc2") ? "dc2" : null;
    var dnsId = conn("laptops", "dns") ? "dns" : dcId;

    var caps = [];
    function cap(id, name, status, detail) { caps.push({ id: id, name: name, status: status, detail: detail }); }

    cap("lan", "Staff connect to the network", lan ? "ok" : "bad",
      lan ? (has("ap") ? "Wired desks and Wi-Fi." : "Wired only. Add a Wi-Fi access point for wireless.") : "The laptops have nothing to plug into. Add an access switch.");

    if (conn("laptops", "dhcp")) cap("dhcp", "Automatic addresses", "ok", "The DHCP server hands out addresses, gateway and DNS settings.");
    else if (lan && (conn("laptops", "fw") || conn("laptops", "router"))) cap("dhcp", "Automatic addresses", "warn", "The " + (conn("laptops", "fw") ? "firewall" : "router") + " hands out addresses. Fine for a small office, but there's no failover and no DNS registration.");
    else cap("dhcp", "Automatic addresses", "bad", lan ? "Nothing hands out addresses: every device needs one typed in by hand, and new devices end up with 169.254.x.x." : "There's no network to hand addresses out on.");

    if (dnsId) cap("dns", "Name resolution", "ok", inet ? "Internal DNS resolves both internal names and the Internet." : "Internal names resolve. Internet names fail without an Internet link.");
    else if (inet) cap("dns", "Name resolution", "warn", "Using the ISP's DNS: websites resolve, but internal names like files01 don't, and Active Directory can't work.");
    else cap("dns", "Name resolution", "bad", "Nothing can resolve names.");

    cap("logon", "Central logons", dcId ? "ok" : "bad",
      dcId ? "One account per person; Group Policy manages every laptop." : "No directory: every laptop has its own local accounts, and leavers keep access until someone visits each machine.");

    if (!inet) cap("web", "Web browsing", "bad", !ispX ? "No Internet link." : "No path from the laptops to the Internet. Something between them is missing.");
    else if (has("proxy") && conn("laptops", "proxy")) cap("web", "Web browsing", "ok", "Filtered, scanned and logged through the web proxy.");
    else cap("web", "Web browsing", "ok", "Direct and unfiltered.");

    if (!has("file")) cap("files", "File sharing", "off", "No file server (or files live in the cloud).");
    else if (!conn("laptops", "file")) cap("files", "File sharing", "bad", "The laptops can't reach the file server.");
    else if (dcId) cap("files", "File sharing", "ok", "Permissions are granted to directory groups.");
    else cap("files", "File sharing", "warn", "Works, but with local accounts on the server and shared passwords.");

    if (!has("mail")) cap("mail", "Email", "off", "No mail server. Many organisations use Microsoft 365 or Google Workspace instead.");
    else if (!fromNet("mail")) cap("mail", "Email", "bad", "The mail server has no route to the Internet, so no mail comes in or goes out.");
    else if (!has("mailgw")) cap("mail", "Email", "warn", "Works, but the mail server takes connections straight from the Internet with no spam or malware filtering.");
    else cap("mail", "Email", "ok", "Inbound mail is filtered by the gateway before it reaches mailboxes.");

    if (!has("web")) cap("site", "Public website", "off", "No website hosted here.");
    else if (!fromNet("web")) cap("site", "Public website", "bad", "The web server has no route to the Internet.");
    else if (has("waf")) cap("site", "Public website", "ok", "Published through the WAF, which filters attacks and hides the server.");
    else cap("site", "Public website", "warn", "Published directly: every request, hostile or not, hits the server.");

    if (!has("vpn")) cap("remote", "Remote access", "off", "No VPN. Home workers can't reach internal systems.");
    else if (!fromNet("vpn")) cap("remote", "Remote access", "bad", "The VPN gateway can't be reached from the Internet.");
    else if (conn("vpn", "dc") || conn("vpn", "dc2")) cap("remote", "Remote access", "ok", "Remote staff sign in with their directory account.");
    else cap("remote", "Remote access", "warn", "Works, but with separate accounts kept on the VPN gateway.");

    if (!has("ap")) cap("wifi", "Staff Wi-Fi", "off", "No wireless.");
    else if (!has("access")) cap("wifi", "Staff Wi-Fi", "bad", "The access point has no switch to plug into.");
    else if (conn("ap", "nac") && has("ca")) cap("wifi", "Staff Wi-Fi", "ok", "WPA3-Enterprise: each device proves itself with a certificate.");
    else if (conn("ap", "nac")) cap("wifi", "Staff Wi-Fi", "ok", "WPA3-Enterprise with personal usernames and passwords.");
    else cap("wifi", "Staff Wi-Fi", "warn", "One shared password for everyone, which rarely changes when people leave.");

    if (!has("guests")) cap("guest", "Guest Wi-Fi", "off", "No guest access.");
    else if (!conn("guests", "ap")) cap("guest", "Guest Wi-Fi", "bad", "Guests have no access point to join.");
    else if (!fromNet("guests")) cap("guest", "Guest Wi-Fi", "bad", "Guests can join, but there's no Internet to give them.");
    else if (S.vlans && has("fw")) cap("guest", "Guest Wi-Fi", "ok", "An isolated guest VLAN with Internet access only.");
    else if (S.vlans) cap("guest", "Guest Wi-Fi", "warn", "A separate VLAN, but with no firewall nothing stops the router sending guests to internal subnets.");
    else cap("guest", "Guest Wi-Fi", "warn", "Guests share the staff network and can reach every laptop, printer and server.");

    if (!has("ca")) cap("certs", "Internal certificates", "off", "No internal CA: internal sites need bought certificates or show warnings.");
    else if (conn("laptops", "ca") && dcId) cap("certs", "Internal certificates", "ok", "Machines enroll and renew automatically through Active Directory.");
    else cap("certs", "Internal certificates", "warn", "Certificates must be requested and installed by hand.");

    /* Security checks */
    var pubSrv = has("web") || has("mail") || has("mailgw") || has("waf");
    var sec = [];
    function chk(id, name, weight, applies, pass, okText, failText, fix) {
      sec.push({ id: id, name: name, weight: weight, applies: applies, pass: applies && pass, detail: pass ? okText : failText, fix: fix });
    }
    chk("fw", "Firewall at the Internet edge", 20, !!ispX, has("fw"),
      "Only the flows you allow cross between the Internet and the inside.",
      "Anything on the Internet can try to connect to your devices directly. This is the biggest gap there is.", "fw");
    chk("ips", "Intrusion prevention", 8, !!ispX, has("ips"),
      "Known exploits are dropped at the edge.", "Attacks hidden inside allowed traffic go straight through.", "ips");
    chk("dmz", "Public servers isolated in a DMZ", 12, pubSrv, has("fw") && !(has("mail") && !has("mailgw")),
      "Internet-facing servers sit in their own zone with narrow rules inward.",
      has("fw") ? "The mail server accepts Internet connections from inside the LAN. Add a mail gateway in the DMZ." : "Public servers share the network with everything else, so one compromise exposes it all.",
      has("fw") ? "mailgw" : "fw");
    chk("seg", "Network segmented into VLANs", 12, lan, S.vlans && (has("core") || has("fw")),
      "Users, servers and guests are in separate subnets, filtered where they meet.",
      S.vlans ? "VLANs need a core switch or firewall to route and filter between them." : "A flat network: malware on one laptop can reach every other device directly.",
      S.vlans ? "core" : "vlans");
    chk("guest", "Guests kept off the inside", 6, has("guests"), S.vlans && has("fw"),
      "The guest VLAN only reaches the Internet.", "Guests can reach internal devices.", S.vlans ? "fw" : "vlans");
    chk("nac", "Only known devices get on", 8, lan, has("nac"),
      "802.1X / RADIUS authenticates every port and Wi-Fi connection.", "Anyone who plugs into a wall port is on the network.", "nac");
    chk("edr", "Endpoint protection", 10, true, has("edr"),
      "Every laptop can detect, stop and be isolated from malware.", "Malware on a laptop runs unnoticed.", "edr");
    chk("proxy", "Web traffic filtered", 6, inet, has("proxy"),
      "Malicious sites are blocked and every request is logged.", "Users can reach any site, including malware downloads.", "proxy");
    chk("mailgw", "Email filtered before delivery", 6, has("mail"), has("mailgw"),
      "Spam, malware and spoofed senders are stopped at the gateway.", "Phishing arrives straight in the inbox.", "mailgw");
    chk("waf", "Website behind a WAF", 6, has("web"), has("waf"),
      "Injection and scripting attacks are filtered before they reach the server.", "The web server takes every attack head-on.", "waf");
    chk("siem", "Central logging", 10, true, has("siem"),
      "Logs from every device are collected and correlated.", "No central logs: you'd only discover a breach when the damage shows.", "siem");
    chk("ids", "Internal traffic watched", 4, lan, has("ids") && has("core"),
      "An IDS sees lateral movement inside the network.", has("ids") ? "The IDS needs a core switch to mirror traffic from." : "Nobody would notice an attacker moving between internal machines.", has("ids") ? "core" : "ids");
    chk("jump", "Admin access through a jump host", 4, lan, has("jump"),
      "Device management only happens from one hardened, recorded machine.", "Admins manage devices from everyday laptops; one phished admin owns the network.", "jump");
    var tot = 0, got = 0;
    sec.forEach(function (c) { if (c.applies) { tot += c.weight; if (c.pass) got += c.weight; } });
    var score = tot ? Math.round(got / tot * 100) : 0;

    /* Single points of failure */
    var spof = [];
    if (ispX && !(has("isp") && has("isp2"))) spof.push({ text: "One Internet link: an ISP outage takes down browsing, email, the website and remote access.", fix: has("isp") ? "isp2" : "isp" });
    else if (has("isp") && has("isp2") && !has("router") && !(has("fw") || has("ips"))) spof.push({ text: "Two ISP links but nothing to fail over between them. Add an edge router.", fix: "router" });
    if ((has("dc") ? 1 : 0) + (has("dc2") ? 1 : 0) === 1) spof.push({ text: "One domain controller: if it fails, nobody can log on, and with DNS on it, names stop resolving too.", fix: has("dc") ? "dc2" : "dc" });
    if (has("dns") && !has("dc") && !has("dc2")) spof.push({ text: "One DNS server: if it fails, almost everything appears broken.", fix: "dc" });
    if (!has("core") && has("access") && COMPS.some(function (c) { return c.bus && has(c.id); })) spof.push({ text: "Servers and users share one access switch: it's both the busiest and most critical box.", fix: "core" });

    /* Traffic to draw */
    var flows = [];
    function addFlow(cat, stops, opts) {
      var path = [];
      for (var i = 1; i < stops.length; i++) {
        var seg = route(g, stops[i - 1], stops[i]);
        if (!seg) return;
        path = path.length ? path.concat(seg.slice(1)) : seg;
      }
      if (path.length < 2) return;
      flows.push({ cat: cat, path: path, reply: !(opts && opts.oneway), risky: !!(opts && opts.risky) });
    }
    var ispIn = has("isp") && fromNet("laptops") ? "isp" : "isp2";
    if (conn("laptops", "dhcp")) addFlow("naming", ["laptops", "dhcp"]);
    if (dnsId) addFlow("naming", ["laptops", dnsId]);
    if (dcId) addFlow("identity", ["laptops", dcId]);
    if (conn("access", "nac")) addFlow("identity", ["access", "nac"]);
    if (conn("laptops", "ca")) addFlow("identity", ["laptops", "ca"]);
    if (conn("laptops", "file")) addFlow("apps", ["laptops", "file"]);
    if (conn("laptops", "mail")) addFlow("mail", ["laptops", "mail"]);
    if (inet) addFlow("web", has("proxy") && conn("laptops", "proxy") ? ["laptops", "proxy", ispIn] : ["laptops", ispIn]);
    if (has("mail") && fromNet("mail")) addFlow("mail", has("mailgw") && fromNet("mailgw") ? [ispIn, "mailgw", "mail"] : [ispIn, "mail"]);
    if (has("web") && fromNet("web")) addFlow("web", [ispIn, "web"]);
    if (has("vpn") && fromNet("vpn")) addFlow("admin", [ispIn, "vpn"].concat(conn("vpn", "file") ? ["file"] : []));
    if (has("guests") && fromNet("guests")) addFlow("web", ["guests", ispIn]);
    if (has("siem")) ["fw", "proxy", "dc", "mailgw"].forEach(function (s) { if (conn(s, "siem")) addFlow("sec", [s, "siem"], { oneway: true }); });
    if (has("ids") && conn("core", "ids")) addFlow("sec", ["core", "ids"], { oneway: true });
    if (has("jump")) ["fw", "access"].forEach(function (t) { if (conn("jump", t)) addFlow("admin", ["jump", t]); });
    // risky paths that a sound design would block
    if (inet && !has("fw")) addFlow("denied", [ispIn, "laptops"], { risky: true, oneway: true });
    if (has("guests") && !(S.vlans && has("fw"))) {
      var tgt = has("file") ? "file" : "laptops";
      if (conn("guests", tgt)) addFlow("denied", ["guests", tgt], { risky: true, oneway: true });
    }
    if (pubSrv && !has("fw") && (has("file") || has("dc"))) {
      var from = has("web") ? "web" : has("mail") ? "mail" : null, to = has("dc") ? "dc" : "file";
      if (from && from !== to && conn(from, to)) addFlow("denied", [from, to], { risky: true, oneway: true });
    }

    var applicable = caps.filter(function (c) { return c.status !== "off"; });
    var working = applicable.filter(function (c) { return c.status === "ok" || c.status === "warn"; }).length;
    return { g: g, caps: caps, sec: sec, score: score, spof: spof, flows: flows, working: working, total: applicable.length };
  }

  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */
  var S = { has: {}, vlans: true };
  var sel = null, lastChange = null, current = null;

  function loadPreset(id) {
    var p = PRESETS.filter(function (x) { return x.id === id; })[0];
    var before = current;
    S.has = {}; p.has.forEach(function (c) { S.has[c] = true; });
    S.vlans = p.vlans;
    sel = null;
    update(before ? { title: "Loaded the " + p.name + " preset", before: before } : null);
    $$("[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-preset") === id); });
  }
  function toggleComp(id) {
    var c = comp[id];
    if (c.fixed) return;
    var before = current;
    S.has[id] = !S.has[id];
    sel = id;
    update({ title: (S.has[id] ? "Added " : "Removed ") + c.name, before: before });
    clearPreset();
  }
  function setVlans(on) {
    var before = current;
    S.vlans = on;
    update({ title: on ? "Split the network into VLANs" : "Flattened the network into one subnet", before: before });
    clearPreset();
  }
  function applyFix(fix) {
    if (fix === "vlans") setVlans(true);
    else if (!S.has[fix]) toggleComp(fix);
  }
  function clearPreset() { $$("[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", "false"); }); }

  /* ---------------------------------------------------------------- */
  /* Rendering: canvas                                                 */
  /* ---------------------------------------------------------------- */
  var svg = $("#b-svg"), panel = $("#b-panel");
  var SH = { net: { hw: 23, hh: 15 }, sec: { hw: 24, hh: 17 }, srv: { hw: 20, hh: 20 }, end: { hw: 20, hh: 20 }, ext: { hw: 20, hh: 20 } };
  function shape(c, pad, cls, parent) {
    var s = SH[c.shape], w = s.hw + pad, h = s.hh + pad;
    if (c.shape === "net" || c.shape === "srv") return el("rect", { x: -w, y: -h, width: w * 2, height: h * 2, rx: (c.shape === "net" ? 6 : 7) + pad / 2, class: cls }, parent);
    if (c.shape === "sec") {
      var k = 11 + pad * 0.4;
      return el("polygon", { points: [[-w, 0], [-k, -h], [k, -h], [w, 0], [k, h], [-k, h]].map(function (p) { return p.join(","); }).join(" "), class: cls }, parent);
    }
    return el("circle", { r: s.hw + pad, class: cls }, parent);
  }
  function region(x, y, w, h, color, label, sub, cls) {
    var g = el("g", { class: "b-zone " + (cls || ""), style: "--zc:" + color }, svg);
    el("rect", { x: x, y: y, width: w, height: h, rx: 12, class: "zone-rect" }, g);
    var t = el("text", { x: x + 10, y: y + 17 }, g);
    el("tspan", { class: "zone-label" }, t).textContent = label;
    if (sub) { var ts = el("tspan", { class: "zone-sub", dx: 7 }, t); ts.textContent = sub; }
  }

  var flowDots = [], flowRaf = 0, visible = true;
  function drawCanvas(R) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    function has(id) { return !!S.has[id]; }
    var pub = has("web") || has("waf") || has("mailgw");

    // zones
    region(20, 14, 1060, 80, "var(--z-inet)", "Internet", "untrusted");
    if (pub) {
      if (has("fw")) region(40, 222, 320, 170, "var(--z-dmz)", "DMZ", "own firewall leg");
      else region(40, 222, 320, 170, "var(--bad)", "Exposed", "no firewall in front", "danger");
    }
    if ((has("proxy") || has("vpn")) && has("fw")) region(610, 222, 170, 170, "var(--z-edge)", "Edge", "");
    var inside = COMPS.some(function (c) { return has(c.id) && (c.y >= 500); });
    if (inside) {
      if (S.vlans) {
        region(130, 500, 330, 196, "var(--z-users)", "Users", "VLAN 10");
        if (has("guests")) region(20, 590, 105, 106, "var(--z-guest)", "Guest", "");
        if (COMPS.some(function (c) { return c.bus && has(c.id); })) region(520, 506, 560, 190, "var(--z-servers)", "Servers", "VLAN 20");
      } else {
        region(20, 500, 1060, 196, "var(--z-dmz)", "Flat network", "one subnet: everything can reach everything", "flat");
      }
    }

    // links
    var gl = el("g", {}, svg);
    R.g.edges.forEach(function (e) {
      el("path", { d: U.ptsToD(e.pts), class: "link" + (e.kind ? " " + e.kind : "") }, gl);
    });

    // flows
    var gf = el("g", { class: "flows", "aria-hidden": "true" }, svg);
    flowDots = [];
    R.flows.forEach(function (f, i) {
      var pts = [];
      for (var k = 1; k < f.path.length; k++) {
        var seg = segPts(R.g, f.path[k - 1], f.path[k]);
        pts = pts.length ? pts.concat(seg.slice(1)) : seg;
      }
      var m = U.measure(pts);
      var g = el("g", { class: "flow" + (f.risky ? " risky" : ""), style: "--fc:var(--fl-" + f.cat + ")" }, gf);
      el("path", { d: U.ptsToD(pts), class: "flow-line " + (f.risky ? "show" : "faint") }, g);
      var n = Math.max(1, Math.min(4, Math.round(m.total / 200)));
      for (var j = 0; j < n; j++) {
        flowDots.push({ el: el("circle", { r: 4.2, class: "flow-dot" }, g), pts: pts, m: m, off: j * m.total / n + i * 37, rev: false });
        if (f.reply) flowDots.push({ el: el("circle", { r: 3.4, class: "flow-dot rev" }, g), pts: pts, m: m, off: (j + 0.5) * m.total / n + i * 37, rev: true });
      }
    });

    // nodes (ghosts first)
    var gn = el("g", {}, svg);
    COMPS.forEach(function (c) {
      var on = has(c.id);
      var s = SH[c.shape];
      var zc = zoneColor(c);
      var g = el("g", {
        class: "node b-node " + c.shape + (on ? "" : " ghost") + (sel === c.id ? " sel" : "") + (on && R.g.unconnected[c.id] ? " orphan" : ""),
        transform: "translate(" + c.x + " " + c.y + ")", tabindex: "0", role: "button",
        "aria-label": on ? c.name + (c.fixed ? "" : ", added. Select for details.") : "Add " + c.name,
        style: "--zc:" + zc
      }, gn);
      shape(c, 5, "ring", g);
      shape(c, 0, "shape", g);
      el("text", { class: "abbr" }, g).textContent = on ? c.abbr : "+";
      var ly = s.hh + 15;
      var lb = c.lp === "r"
        ? el("text", { class: "label", x: s.hw + 8, y: 5, "text-anchor": "start" }, g)
        : el("text", { class: "label", y: ly, "text-anchor": "middle" }, g);
      lb.textContent = c.label;
      if (on && R.g.unconnected[c.id]) {
        var w = el("text", { class: "b-warn", y: ly + 14, "text-anchor": "middle" }, g);
        w.textContent = "not connected";
      }
      g.addEventListener("click", function () { onNode(c.id); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNode(c.id); } });
    });
    renderDots(performance.now() / 1000);
    kick();
  }
  function zoneColor(c) {
    if (c.y < 100) return "var(--z-inet)";
    if (c.id === "router" || c.id === "ips" || c.id === "fw" || c.id === "core") return "var(--z-core)";
    if (c.id === "web" || c.id === "waf" || c.id === "mailgw") return "var(--z-dmz)";
    if (c.id === "proxy" || c.id === "vpn") return "var(--z-edge)";
    if (c.id === "guests") return "var(--z-guest)";
    if (c.bus) return "var(--z-servers)";
    if (c.id === "ids" || c.id === "edr") return "var(--z-mgmt)";
    return "var(--z-users)";
  }
  function segPts(g, a, b) {
    var e = g.edges.filter(function (x) { return (x.a === a && x.b === b) || (x.a === b && x.b === a); })[0];
    var pts = e.pts.slice();
    // e.pts run parent -> child; parent is e.b
    return e.b === a ? pts : pts.reverse();
  }
  function renderDots(t) {
    flowDots.forEach(function (d) {
      var T = d.m.total;
      var s = ((t * 75 + d.off) % T + T) % T, u = s / T;
      var p = U.pointAt(d.pts, d.m.lens, d.rev ? T - s : s);
      d.el.setAttribute("cx", p[0].toFixed(1));
      d.el.setAttribute("cy", p[1].toFixed(1));
      d.el.setAttribute("opacity", Math.max(0, Math.min(1, u / 0.06, (1 - u) / 0.06)).toFixed(2));
    });
  }
  function tick(ts) {
    flowRaf = 0;
    if (!visible || document.hidden) return;
    renderDots(ts / 1000);
    flowRaf = requestAnimationFrame(tick);
  }
  function kick() { if (!U.reduceMotion && !flowRaf && visible) flowRaf = requestAnimationFrame(tick); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe($("#b-card"));
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });

  /* ---------------------------------------------------------------- */
  /* Rendering: report panel                                           */
  /* ---------------------------------------------------------------- */
  var STATUS = { ok: "Works", warn: "Caveat", bad: "Broken", off: "Not set up" };
  var RANK = { off: 0, bad: 1, warn: 2, ok: 3 };

  function diff(a, b) {
    var out = [];
    b.caps.forEach(function (c) {
      var p = a.caps.filter(function (x) { return x.id === c.id; })[0];
      if (p && p.status !== c.status) out.push({ name: c.name, from: p.status, to: c.status, better: RANK[c.status] > RANK[p.status] });
    });
    return out;
  }
  function diffHtml(d, scoreDelta, wDelta, spofDelta) {
    var parts = [];
    if (scoreDelta) parts.push('<span class="delta ' + (scoreDelta > 0 ? "up" : "down") + '">Security ' + (scoreDelta > 0 ? "+" : "") + scoreDelta + "</span>");
    if (wDelta) parts.push('<span class="delta ' + (wDelta > 0 ? "up" : "down") + '">' + (wDelta > 0 ? "+" : "") + wDelta + " working service" + (Math.abs(wDelta) === 1 ? "" : "s") + "</span>");
    if (spofDelta) parts.push('<span class="delta ' + (spofDelta < 0 ? "up" : "down") + '">' + (spofDelta > 0 ? "+" : "") + spofDelta + " single point" + (Math.abs(spofDelta) === 1 ? "" : "s") + " of failure</span>");
    var list = d.map(function (x) {
      return '<li class="' + (x.better ? "up" : "down") + '"><b>' + esc(x.name) + '</b><span class="pill s-' + x.from + '">' + STATUS[x.from] + '</span> → <span class="pill s-' + x.to + '">' + STATUS[x.to] + "</span></li>";
    }).join("");
    if (!parts.length && !list) return "<p>No change to what works, security or resilience.</p>";
    return (parts.length ? '<div class="deltas">' + parts.join("") + "</div>" : "") + (list ? '<ul class="changes">' + list + "</ul>" : "");
  }

  function update(change) {
    var R = evaluate(S);
    if (change && change.before) {
      lastChange = { title: change.title, html: diffHtml(diff(change.before, R), R.score - change.before.score, R.working - change.before.working, R.spof.length - change.before.spof.length) };
    }
    current = R;
    drawCanvas(R);
    renderPalette();
    renderPanel(R);
  }

  function renderPalette() {
    $$("[data-comp]", $("#b-palette")).forEach(function (b) {
      var id = b.getAttribute("data-comp");
      b.setAttribute("aria-pressed", !!S.has[id]);
    });
    $("#b-vlans").checked = S.vlans;
  }

  function renderPanel(R) {
    var spofN = R.spof.length;
    var html =
      '<div class="b-stats">' +
        '<div class="b-stat"><span class="sv">' + R.working + "<small>/" + R.total + '</small></span><span class="sl">services working</span></div>' +
        '<div class="b-stat ' + (R.score >= 80 ? "good" : R.score >= 50 ? "mid" : "low") + '"><span class="sv">' + R.score + '</span><span class="sl">security score</span><span class="meter"><i style="width:' + R.score + '%"></i></span></div>' +
        '<div class="b-stat ' + (spofN ? "low" : "good") + '"><span class="sv">' + spofN + '</span><span class="sl">single points of failure</span></div>' +
      "</div>";

    if (lastChange) html += '<div class="b-change panel-block"><p class="kicker">Last change</p><h4>' + esc(lastChange.title) + "</h4>" + lastChange.html + "</div>";

    if (sel) {
      var c = comp[sel], on = !!S.has[sel];
      var preview = Object.assign({}, S.has); preview[sel] = !on;
      var R2 = evaluate({ has: preview, vlans: S.vlans });
      var d = diff(R, R2);
      html += '<div class="b-sel panel-block"><p class="kicker">' + esc(c.group) + "</p><h3>" + esc(c.name) + "</h3><p>" + esc(c.what) + "</p>" +
        (on && R.g.unconnected[sel] ? '<p class="b-orphan">Not connected: it needs ' + esc(c.up.map(function (u) { return comp[u].name; }).slice(0, 2).join(" or ")) + " to plug into.</p>" : "") +
        '<div class="quick">' +
          (c.fixed ? "" : '<button type="button" class="btn ' + (on ? "" : "btn-primary") + '" data-toggle="' + sel + '">' + (on ? "Remove it" : "Add it") + "</button>") +
          '<button type="button" class="chip" data-svc="' + c.concept + '">Read about ' + esc(U.conceptById[c.concept].name) + "</button>" +
        "</div>" +
        (c.fixed ? "" : '<p class="kicker" style="margin-top:6px">If you ' + (on ? "remove" : "add") + " it</p>" + diffHtml(d, R2.score - R.score, R2.working - R.working, R2.spof.length - R.spof.length)) +
        "</div>";
    }

    html += '<div class="panel-block"><p class="kicker">What works</p><ul class="caps">' + R.caps.map(function (c) {
      return '<li class="s-' + c.status + '"><span class="pill s-' + c.status + '">' + STATUS[c.status] + "</span><b>" + esc(c.name) + "</b><span>" + esc(c.detail) + "</span></li>";
    }).join("") + "</ul></div>";

    var checks = R.sec.filter(function (c) { return c.applies; });
    checks.sort(function (a, b) { return (a.pass - b.pass) || (b.weight - a.weight); });
    html += '<div class="panel-block"><p class="kicker">Security checks</p><ul class="checks">' + checks.map(function (c) {
      return '<li class="' + (c.pass ? "pass" : "fail") + '"><span class="mark" aria-hidden="true">' + (c.pass ? "✓" : "✕") + "</span><div><b>" + esc(c.name) + '</b> <span class="w min-int">' + c.weight + " pts</span><p>" + esc(c.detail) + "</p>" +
        (!c.pass && c.fix ? '<button type="button" class="btn-link" data-fix="' + c.fix + '">Fix: ' + (c.fix === "vlans" ? "turn on VLANs" : "add " + esc(comp[c.fix].name.toLowerCase())) + "</button>" : "") +
        "</div></li>";
    }).join("") + "</ul></div>";

    html += '<div class="panel-block"><p class="kicker">Resilience</p>' + (R.spof.length
      ? '<ul class="checks">' + R.spof.map(function (s) {
          return '<li class="fail"><span class="mark" aria-hidden="true">!</span><div><p>' + esc(s.text) + '</p><button type="button" class="btn-link" data-fix="' + s.fix + '">Fix: add ' + esc(comp[s.fix].name.toLowerCase()) + "</button></div></li>";
        }).join("") + "</ul>"
      : "<p>No single points of failure among the components modelled here. Real networks also pair firewalls, switches and power supplies.</p>") + "</div>";

    panel.innerHTML = html;
    $$("[data-toggle]", panel).forEach(function (b) { b.addEventListener("click", function () { toggleComp(b.getAttribute("data-toggle")); }); });
    $$("[data-fix]", panel).forEach(function (b) { b.addEventListener("click", function () { applyFix(b.getAttribute("data-fix")); }); });
    $$("[data-svc]", panel).forEach(function (b) { b.addEventListener("click", function () { U.openService(b.getAttribute("data-svc")); }); });
  }

  function onNode(id) {
    if (!S.has[id]) { toggleComp(id); return; }
    sel = sel === id ? null : id;
    drawCanvas(current);
    renderPanel(current);
  }

  /* ---------------------------------------------------------------- */
  /* Toolbar                                                           */
  /* ---------------------------------------------------------------- */
  $("#b-presets").innerHTML = PRESETS.map(function (p) {
    return '<button type="button" class="chip" aria-pressed="false" data-preset="' + p.id + '">' + esc(p.name) + "</button>";
  }).join("");
  $("#b-presets").addEventListener("click", function (e) {
    var b = e.target.closest("[data-preset]");
    if (b) loadPreset(b.getAttribute("data-preset"));
  });
  $("#b-palette").innerHTML = GROUPS.map(function (gname) {
    return '<div class="b-group"><p class="kicker">' + esc(gname) + '</p><div class="chips">' +
      COMPS.filter(function (c) { return c.group === gname; }).map(function (c) {
        return '<button type="button" class="chip b-chip" data-comp="' + c.id + '"' + (c.fixed ? " disabled" : "") + ">" + esc(c.name) + "</button>";
      }).join("") + "</div></div>";
  }).join("");
  $("#b-palette").addEventListener("click", function (e) {
    var b = e.target.closest("[data-comp]");
    if (b && !b.disabled) toggleComp(b.getAttribute("data-comp"));
  });
  $("#b-vlans").addEventListener("change", function (e) { setVlans(e.target.checked); });
  var pal = $("#b-pal");
  if (pal && window.innerWidth < 760) pal.open = false;

  if (window.I18N) $("#b-card").insertAdjacentHTML("beforeend", window.I18N.glossaryHTML(COMPS.map(function (c) { return c.abbr; }), "Short forms on this map"));
  loadPreset("small");
})();
