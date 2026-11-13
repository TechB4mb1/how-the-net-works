/* How the Net Works — content data.
   Everything the page shows lives here: the topology of the fictional
   company "Meridian Freight", the concept catalog, packet journeys,
   OSI layers, ports and quiz questions.
   Public addresses use documentation ranges (RFC 5737) and names use
   reserved domains (RFC 2606), so nothing here points at a real network.
   Text may contain `backticks`, which render as inline code. */

var NET = window.NET = {};

/* ------------------------------------------------------------------ */
/* Zones (drawn as dashed regions on the map)                          */
/* ------------------------------------------------------------------ */
NET.zones = [
  { id: "inet",    label: "Internet",        sub: "untrusted",                    x: 20,   y: 14,  w: 1240, h: 140, c: "inet" },
  { id: "perim",   label: "Perimeter",       sub: "203.0.113.0/28", x: 545, y: 178, w: 250, h: 236, c: "core" },
  { id: "dmz",     label: "DMZ",             sub: "VLAN 100 · 172.16.100.0/24",   x: 20,   y: 178, w: 470, h: 330, c: "dmz" },
  { id: "edge",    label: "Edge services",   sub: "VLAN 110 · 172.16.110.0/24",   x: 815,  y: 178, w: 445, h: 236, c: "edge" },
  { id: "core",    label: "Campus core",     sub: "routing between VLANs",        x: 505,  y: 448, w: 400, h: 100, c: "core" },
  { id: "guest",   label: "Guest",           sub: "VLAN 50 · 10.50.0.0/22",       x: 20,   y: 572, w: 190, h: 326, c: "guest" },
  { id: "users",   label: "Users",           sub: "VLAN 10 · 10.10.0.0/22", x: 225, y: 572, w: 330, h: 326, c: "users" },
  { id: "servers", label: "Servers",         sub: "VLAN 20 · 10.20.0.0/24",       x: 570,  y: 572, w: 500, h: 326, c: "servers" },
  { id: "mgmt",    label: "Management",      sub: "VLAN 99",                      x: 1085, y: 572, w: 175, h: 326, c: "mgmt" }
];

/* Zone notes printed inside the region */
NET.zoneNotes = [
  { x: 36, y: 860, c: "guest", lines: ["Internet only.", "Gateway is the firewall,", "not the core switch."] },
  { x: 36, y: 488, c: "dmz",   lines: ["Reachable from the Internet", "on specific ports only."] }
];

/* ------------------------------------------------------------------ */
/* Nodes                                                               */
/* shape: net (switch/router/AP) · sec (security control) · srv        */
/* (server/service) · end (endpoint) · ext (outside our control)       */
/* lp: label position a(bove) b(elow) l(eft) r(ight)                   */
/* ------------------------------------------------------------------ */
NET.nodes = [
  // Internet
  { id: "root-dns", label: "Root & TLD DNS", abbr: "DNS", x: 90, y: 62, zone: "inet", shape: "ext", lp: "r",
    ip: "198.41.0.4 · a.root-servers.net", concepts: ["dns"],
    note: "Thirteen named root server identities (hundreds of anycast copies worldwide) know where every top-level domain lives. The TLD servers for .com, .org or .uk know the name servers of each domain below them. A resolver starts here whenever nothing useful is cached." },
  { id: "remote-mail", label: "Partner mail", abbr: "MX", x: 260, y: 62, zone: "inet", shape: "ext", lp: "r",
    ip: "192.0.2.25 · mx1.partner.example", concepts: ["smtp"],
    note: "Another organisation's mail server. It finds ours through DNS and talks SMTP to it, exactly as ours does in reverse." },
  { id: "website", label: "www.example.com", abbr: "WEB", x: 430, y: 62, zone: "inet", shape: "ext", lp: "r",
    ip: "192.0.2.80", concepts: ["http", "tls"],
    note: "Any public website, usually behind a CDN. It holds a certificate from a public CA, so any browser in the world can verify it is talking to the real site." },
  { id: "isp", label: "ISP · BGP", abbr: "ISP", x: 640, y: 125, zone: "inet", shape: "ext", lp: "a",
    ip: "198.51.100.1 · our upstream", concepts: ["bgp", "router"],
    note: "Our Internet service provider. It gives us a link, a small block of public addresses (203.0.113.0/28) and routes to the rest of the Internet, which it learns from other networks over BGP." },
  { id: "saas", label: "Cloud IdP · SaaS", abbr: "IdP", x: 820, y: 62, zone: "inet", shape: "ext", lp: "r",
    ip: "login.idp.example", concepts: ["mfa", "zero-trust"],
    note: "A cloud identity provider plus the SaaS apps it signs people into (email, CRM, file sharing). Users sign in once with MFA and the IdP vouches for them to every app using SAML or OpenID Connect." },
  { id: "remote", label: "Remote user", abbr: "HOME", x: 990, y: 62, zone: "inet", shape: "ext", lp: "r",
    ip: "198.51.100.77 · home router", concepts: ["vpn", "nat"],
    note: "A remote employee or a customer on a home connection, behind their own NAT router. Everything they reach of ours crosses the public Internet." },
  { id: "attacker", label: "Attacker", abbr: "!", x: 1160, y: 62, zone: "inet", shape: "ext", lp: "r",
    ip: "192.0.2.66", concepts: ["ips", "waf"],
    note: "Automated scanners probe every public IPv4 address within minutes of it going live. Assume every port you expose is being tested all the time." },

  // Perimeter
  { id: "edge", label: "Edge router", abbr: "RTR", x: 640, y: 228, zone: "perim", shape: "net", lp: "r",
    ip: "198.51.100.2 outside · 203.0.113.1 inside", concepts: ["router", "bgp"],
    note: "Where our network meets the ISP. It holds a default route (`0.0.0.0/0`) pointing at the ISP and a route for our public block pointing at the firewall. Larger organisations run BGP here with two ISPs for redundancy. It also drops obviously bogus traffic, such as packets from the Internet claiming private source addresses." },
  { id: "ips", label: "IPS (inline)", abbr: "IPS", x: 640, y: 299, zone: "perim", shape: "sec", lp: "r",
    ip: "transparent bridge, no IP on the data path", concepts: ["ips", "ids"],
    note: "Every packet to or from the Internet passes through it, so it can drop attacks before they arrive. In many networks this is a feature switched on inside the firewall rather than a separate box." },
  { id: "fw", label: "Firewall · NAT", abbr: "FW", x: 640, y: 370, zone: "perim", shape: "sec", lp: "ur",
    ip: "203.0.113.2 outside · zones: DMZ, Edge, Inside, Guest", concepts: ["firewall", "nat", "dmz"],
    note: "The policy enforcement point between zones. It translates private addresses to public ones, publishes DMZ servers to the Internet, and allows only the flows listed in its rule base. Everything else is dropped and logged to the SIEM." },

  // DMZ
  { id: "dmz-sw", label: "DMZ switch", abbr: "SW", x: 440, y: 370, zone: "dmz", shape: "net", lp: "b",
    ip: "VLAN 100", concepts: ["switch", "dmz"],
    note: "Connects the DMZ hosts. Its ports use private VLANs, so DMZ servers can't talk to each other directly. If one is compromised it can't attack its neighbours." },
  { id: "waf", label: "Reverse proxy · WAF", abbr: "WAF", x: 110, y: 280, zone: "dmz", shape: "sec", lp: "a",
    ip: "172.16.100.10 ⇐ 203.0.113.5:443", concepts: ["waf", "tls"],
    note: "Publishes www.meridian.example. It terminates TLS, filters attacks such as SQL injection and cross-site scripting, and load-balances across the web servers, health-checking each every few seconds." },
  { id: "mail-gw", label: "Mail gateway", abbr: "SMTP", x: 290, y: 280, zone: "dmz", shape: "srv", lp: "a",
    ip: "172.16.100.25 ⇐ 203.0.113.6:25", concepts: ["smtp"],
    note: "The only server that accepts mail from the Internet. It filters spam, malware and spoofing before relaying clean mail to Exchange. Many organisations use a cloud service for this instead." },
  { id: "web", label: "Web server", abbr: "WEB", x: 110, y: 440, zone: "dmz", shape: "srv", lp: "r",
    ip: "172.16.100.20", concepts: ["http"],
    note: "Serves the public website. It is reachable only through the WAF, never directly from the Internet. It calls one internal API, and that is the only path inward it is allowed." },
  { id: "ext-dns", label: "Public DNS", abbr: "NS", x: 290, y: 440, zone: "dmz", shape: "srv", lp: "r",
    ip: "172.16.100.53 ⇐ 203.0.113.7:53", concepts: ["dns"],
    note: "Authoritative for our public zone, meridian.example: www, mail and vpn, plus the MX, SPF, DKIM and DMARC records. It refuses recursive lookups for strangers. Many organisations host this with a DNS provider instead." },

  // Edge services
  { id: "es-sw", label: "Edge switch", abbr: "SW", x: 860, y: 370, zone: "edge", shape: "net", lp: "b",
    ip: "VLAN 110", concepts: ["switch"],
    note: "Connects the outbound proxy and the VPN gateway to their own firewall leg, separate from both the DMZ and the inside." },
  { id: "proxy", label: "Web proxy", abbr: "PRX", x: 990, y: 280, zone: "edge", shape: "sec", lp: "a",
    ip: "172.16.110.10:8080", concepts: ["proxy", "tls"],
    note: "All user web traffic leaves through here. It identifies the user, applies URL-category and malware policy, logs every request, and is the only internal host allowed to reach the Internet on 80/443." },
  { id: "vpn", label: "VPN gateway", abbr: "VPN", x: 1150, y: 280, zone: "edge", shape: "sec", lp: "a",
    ip: "172.16.110.20 ⇐ 203.0.113.8 · pool 10.200.0.0/22", concepts: ["vpn", "mfa"],
    note: "Terminates remote-access tunnels. Users sign in with SSO and MFA; their laptops get an address from the VPN pool, and the firewall decides what that pool may reach." },

  // Core
  { id: "core", label: "Core L3 switch", abbr: "L3", x: 640, y: 500, zone: "core", shape: "net", lp: "l",
    ip: "SVIs 10.10.0.1 · 10.20.0.1 · 10.30.0.1 · 10.99.0.1", concepts: ["switch", "router", "vlan"],
    note: "The heart of the campus. It switches frames within each VLAN and routes between VLANs using SVIs: one virtual interface per VLAN, which is each subnet's default gateway. ACLs here control east-west traffic. It also relays DHCP and mirrors traffic to the IDS." },
  { id: "ids", label: "IDS sensor", abbr: "IDS", x: 830, y: 500, zone: "core", shape: "sec", lp: "b",
    ip: "mgmt 10.99.0.30 · fed by SPAN", concepts: ["ids"],
    note: "Receives a copy of traffic from a SPAN (mirror) port on the core switch. It sees inside the network (east-west), where the perimeter IPS can't, but it can only alert. It never blocks." },

  // Users
  { id: "access-sw", label: "Access switch", abbr: "SW", x: 390, y: 630, zone: "users", shape: "net", lp: "r",
    ip: "mgmt 10.99.0.12", concepts: ["switch", "vlan", "nac"],
    note: "48 PoE ports for desks, phones and access points. Each port runs 802.1X and carries a data VLAN and a voice VLAN, protected by DHCP snooping and Dynamic ARP Inspection. A trunk uplink carries every VLAN to the core." },
  { id: "ap", label: "Wi-Fi AP", abbr: "AP", x: 280, y: 630, zone: "users", shape: "net", lp: "b",
    ip: "mgmt 10.99.0.40", concepts: ["wifi", "nac"],
    note: "Broadcasts two networks: Meridian-Corp (WPA3-Enterprise with 802.1X, lands in VLAN 10) and Meridian-Guest (lands in VLAN 50). Powered over PoE from the switch and managed by a cloud controller." },
  { id: "laptop", label: "Laptop LT-0457", abbr: "PC", x: 285, y: 760, zone: "users", shape: "end", lp: "b",
    ip: "10.10.1.57/22 · gw 10.10.0.1", concepts: ["ip", "edr", "dhcp"],
    note: "Jamie Lee's domain-joined laptop. It holds a machine certificate for 802.1X and runs an EDR agent and the host firewall. Its address, DNS, policies and proxy settings all come from network services." },
  { id: "phone", label: "IP phone", abbr: "TEL", x: 390, y: 760, zone: "users", shape: "end", lp: "b",
    ip: "10.30.0.41 · voice VLAN 30", concepts: ["qos"],
    note: "Shares a desk port with the laptop. The switch tells it via LLDP-MED to tag its traffic into the voice VLAN, and QoS marks voice packets DSCP EF so they jump the queue." },
  { id: "printer", label: "Printer", abbr: "PRN", x: 495, y: 760, zone: "users", shape: "end", lp: "b",
    ip: "10.10.3.20 · DHCP reservation", concepts: ["nac"],
    note: "It can't do 802.1X, so the switch authenticates it by MAC address (MAB) and NAC profiles what kind of device it is. Printers are a classic weak spot: patch firmware and restrict who can reach them." },

  // Guest
  { id: "guest", label: "Guest phone", abbr: "GST", x: 115, y: 630, zone: "guest", shape: "end", lp: "b",
    ip: "10.50.1.88/22 · gw 10.50.0.1 (firewall)", concepts: ["wifi", "firewall"],
    note: "A visitor on Meridian-Guest. VLAN 50 is carried at layer 2 straight to the firewall, which is its gateway, so guest traffic never touches internal routing." },

  // Servers
  { id: "server-sw", label: "Server switch", abbr: "SW", x: 625, y: 765, zone: "servers", shape: "net", lp: "b",
    ip: "VLAN 20", concepts: ["switch"],
    note: "Top-of-rack switch for the server VLAN, with redundant uplinks to the core." },
  { id: "dc", label: "Domain controller", abbr: "DC", x: 720, y: 680, zone: "servers", shape: "srv", lp: "a",
    ip: "10.20.0.10 · dc01.corp.meridian.example", concepts: ["ad", "dns", "ntp"],
    note: "Runs Active Directory, internal DNS for corp.meridian.example, and is the time source for the domain. Every logon, policy and name lookup touches it, which is why real networks run at least two." },
  { id: "dhcp", label: "DHCP", abbr: "DHCP", x: 830, y: 680, zone: "servers", shape: "srv", lp: "a",
    ip: "10.20.0.11", concepts: ["dhcp"],
    note: "Holds a scope for each VLAN: 10.10.0.0/22 for Users, 10.30.0.0/23 for Voice, and so on. It picks the scope from the relay agent's address (giaddr) and registers each lease in DNS, so names follow addresses." },
  { id: "ca", label: "Issuing CA", abbr: "CA", x: 940, y: 680, zone: "servers", shape: "srv", lp: "a",
    ip: "10.20.0.12 · Meridian Issuing CA 01", concepts: ["ca", "tls"],
    note: "Subordinate to an offline root CA that stays powered off in a safe. Auto-enrolls certificates for computers (802.1X, VPN), internal web servers and users. Publishes revocation lists and runs an OCSP responder." },
  { id: "file", label: "File server", abbr: "SMB", x: 1035, y: 680, zone: "servers", shape: "srv", lp: "a",
    ip: "10.20.0.13 · files01", concepts: ["file"],
    note: "Department shares and home drives over SMB 3 with signing and encryption. Permissions come from AD groups. Hourly snapshots plus an offline backup copy are the ransomware recovery plan." },
  { id: "exchange", label: "Mail server", abbr: "EXC", x: 720, y: 850, zone: "servers", shape: "srv", lp: "b",
    ip: "10.20.0.14 · mail.corp.meridian.example", concepts: ["smtp"],
    note: "Exchange stores mailboxes and calendars. It accepts mail only from the gateway and sends outbound mail only through it. Clients connect over HTTPS." },
  { id: "nps", label: "RADIUS · NAC", abbr: "NAC", x: 830, y: 850, zone: "servers", shape: "srv", lp: "b",
    ip: "10.20.0.15", concepts: ["nac"],
    note: "Answers RADIUS requests from switches, access points and the VPN. It checks certificates and AD group membership, tells the switch which VLAN to assign, and can send a Change of Authorization to quarantine a port." },
  { id: "siem", label: "SIEM", abbr: "SIEM", x: 940, y: 850, zone: "servers", shape: "srv", lp: "b",
    ip: "10.20.0.16 · syslog 514/6514", concepts: ["siem", "edr"],
    note: "Every device sends its logs here: firewall allows and denies, proxy requests, DNS queries, logon events, IDS alerts and EDR detections. Correlation rules turn scattered events into incidents." },
  { id: "app", label: "Internal app", abbr: "APP", x: 1035, y: 850, zone: "servers", shape: "srv", lp: "b",
    ip: "10.20.0.17 · api.corp.meridian.example", concepts: ["http"],
    note: "A line-of-business API and its database. The public website calls it for shipment tracking. It is the only internal service the DMZ may reach." },

  // Management
  { id: "mgmt-sw", label: "Mgmt switch", abbr: "SW", x: 1172, y: 655, zone: "mgmt", shape: "net", lp: "a",
    ip: "10.99.0.0/24", concepts: ["switch", "nms"],
    note: "Carries the management network. Switch, firewall and server management interfaces live in VLAN 99, never in a user VLAN." },
  { id: "jump", label: "Jump host", abbr: "JMP", x: 1125, y: 760, zone: "mgmt", shape: "srv", lp: "b",
    ip: "10.99.0.10", concepts: ["jump"],
    note: "Admins connect here first, with MFA, then manage switches, firewalls and servers from it. Management interfaces accept SSH and HTTPS only from this host, and sessions are recorded." },
  { id: "nms", label: "NMS · Syslog", abbr: "NMS", x: 1212, y: 850, zone: "mgmt", shape: "srv", lp: "b",
    ip: "10.99.0.20", concepts: ["nms"],
    note: "Polls every device with SNMPv3 for interface errors, CPU and up/down state, collects NetFlow to show who uses bandwidth, backs up device configs nightly and pages on-call when something breaks." }
];

/* ------------------------------------------------------------------ */
/* Links. bend: "hv" = horizontal then vertical, "vh" = vertical then  */
/* horizontal. kind: "span" (mirror copy) or "air" (wireless).         */
/* ------------------------------------------------------------------ */
NET.links = [
  { from: "root-dns", to: "isp", bend: "vh" },
  { from: "remote-mail", to: "isp", bend: "vh" },
  { from: "website", to: "isp", bend: "vh" },
  { from: "saas", to: "isp", bend: "vh" },
  { from: "remote", to: "isp", bend: "vh" },
  { from: "attacker", to: "isp", bend: "vh" },
  { from: "isp", to: "edge" },
  { from: "edge", to: "ips" },
  { from: "ips", to: "fw" },
  { from: "fw", to: "dmz-sw" },
  { from: "dmz-sw", to: "waf", bend: "hv" },
  { from: "dmz-sw", to: "mail-gw", bend: "hv" },
  { from: "dmz-sw", to: "web", bend: "hv" },
  { from: "dmz-sw", to: "ext-dns", bend: "hv" },
  { from: "fw", to: "es-sw" },
  { from: "es-sw", to: "proxy", bend: "hv" },
  { from: "es-sw", to: "vpn", bend: "hv" },
  { from: "fw", to: "core" },
  { from: "core", to: "ids", kind: "span" },
  { from: "core", to: "access-sw" },
  { from: "core", to: "server-sw" },
  { from: "core", to: "mgmt-sw" },
  { from: "access-sw", to: "ap" },
  { from: "access-sw", to: "laptop" },
  { from: "access-sw", to: "phone" },
  { from: "access-sw", to: "printer" },
  { from: "ap", to: "guest", kind: "air" },
  { from: "server-sw", to: "dc", bend: "hv" },
  { from: "server-sw", to: "dhcp", bend: "hv" },
  { from: "server-sw", to: "ca", bend: "hv" },
  { from: "server-sw", to: "file", bend: "hv" },
  { from: "server-sw", to: "exchange", bend: "hv" },
  { from: "server-sw", to: "nps", bend: "hv" },
  { from: "server-sw", to: "siem", bend: "hv" },
  { from: "server-sw", to: "app", bend: "hv" },
  { from: "mgmt-sw", to: "jump" },
  { from: "mgmt-sw", to: "nms" }
];

/* ------------------------------------------------------------------ */
/* Concept catalog                                                     */
/* ------------------------------------------------------------------ */
NET.categories = ["Foundations", "Core services", "Identity & access", "Security", "Operations"];

NET.concepts = [
  /* ---------------- Foundations ---------------- */
  { id: "ip", name: "IP addressing", abbr: "IP", cat: "Foundations", layer: "L3 Network",
    what: "Every network interface gets an IP address: a logical address that says which network a device is on and which device it is. IPv4 addresses are 32 bits written as four numbers (`10.10.1.57`).",
    how: [
      "An address always travels with a prefix length, such as `/22`. The prefix splits it into a network part and a host part.",
      "Private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, RFC 1918) are free to use inside any organisation but are never routed on the Internet.",
      "Public addresses are allocated by regional registries to ISPs and organisations. IPv4 ran out years ago, which is why NAT is everywhere.",
      "Special ranges: `127.0.0.1` is the device itself (loopback); `169.254.x.x` (link-local) is what Windows assigns itself when DHCP fails.",
      "Devices get addresses either statically (servers, network gear) or dynamically from DHCP (laptops, phones)."
    ],
    ports: "", breaks: "A wrong mask or gateway gives the classic half-working network: the device reaches some hosts but not others. An address starting with 169.254 means DHCP failed.",
    examples: "Check yours: `ipconfig /all` (Windows), `ip addr` (Linux), `ifconfig` (macOS).",
    related: ["subnet", "nat", "dhcp", "ipv6", "mac-arp"] },

  { id: "subnet", name: "Subnets & CIDR", abbr: "/24", cat: "Foundations", layer: "L3 Network",
    what: "A subnet is a block of addresses sharing the same network prefix. Hosts in the same subnet reach each other directly; to reach anything outside it, they send traffic to a router.",
    how: [
      "CIDR notation gives the size: a `/24` has 2^(32−24) = 256 addresses, of which 254 are usable hosts.",
      "The first address is the network ID and the last is the broadcast address. Neither can be assigned to a host.",
      "In an enterprise each VLAN gets one subnet, sized for the devices it will hold plus growth. Meridian's users get a `/22` (1,022 hosts); its server VLAN gets a `/24`.",
      "By convention the default gateway is the first usable address (`.1`).",
      "Variable-length subnet masks (VLSM) let you carve one big block into differently sized pieces, such as a `/30` for a two-router link."
    ],
    ports: "", breaks: "Overlapping subnets cause routing ambiguity. A classic case: a remote worker whose home router uses the same 192.168.1.0/24 as an office network can't reach that office over VPN.",
    examples: "Try the subnet calculator further down the page.",
    related: ["ip", "vlan", "router"] },

  { id: "mac-arp", name: "MAC addresses & ARP", abbr: "ARP", cat: "Foundations", layer: "L2 Data link",
    what: "A MAC address is the 48-bit hardware address of a network card (`3c:52:82:1a:9f:04`). It is only meaningful on the local segment. ARP (Address Resolution Protocol) finds the MAC address that belongs to an IP address.",
    how: [
      "To send to an IP in its own subnet, a host ARPs for that host's MAC. To send anywhere else, it ARPs for the default gateway's MAC.",
      "The ARP request is a broadcast (\"Who has 10.10.0.1? Tell 10.10.1.57\"). The owner replies with a unicast, and the answer is cached for a few minutes (`arp -a`).",
      "Switches learn which MAC lives on which port by reading source addresses, and store it in a MAC (CAM) table.",
      "At every router hop the MAC addresses are rewritten, while the IP addresses stay the same end to end (unless NAT changes them).",
      "IPv6 replaces ARP with Neighbor Discovery (NDP)."
    ],
    ports: "", breaks: "ARP spoofing: an attacker answers for the gateway's IP with their own MAC and silently sits in the middle. Switch features such as DHCP snooping and Dynamic ARP Inspection stop it.",
    examples: "",
    related: ["switch", "ip", "vlan"] },

  { id: "tcp-udp", name: "TCP, UDP & ports", abbr: "L4", cat: "Foundations", layer: "L4 Transport",
    what: "Transport protocols let many conversations share one IP address. Port numbers say which application a packet is for: 443 for HTTPS, 53 for DNS.",
    how: [
      "TCP is connection-oriented: a three-way handshake (SYN, SYN-ACK, ACK), sequence numbers, acknowledgements and retransmission make delivery reliable and ordered. Web, email, file sharing and logins use it.",
      "UDP is fire-and-forget: no handshake and no retransmission, so it's fast. DNS, DHCP, NTP, voice and video use it, as does QUIC (HTTP/3), which rebuilds reliability on top.",
      "Well-known ports are 0–1023. Clients pick a random ephemeral source port (49152–65535 on Windows).",
      "A connection is identified by its 5-tuple: protocol, source IP, source port, destination IP and destination port. Stateful firewalls and NAT track exactly this.",
      "A TCP reset (RST) means \"nothing is listening\". Silence usually means a firewall dropped the packet."
    ],
    ports: "See the ports reference below.", breaks: "\"Connection refused\" usually means the service is down. A timeout usually means a firewall is dropping the traffic.",
    examples: "Test a port: `Test-NetConnection host -Port 443` (PowerShell) or `nc -vz host 443`.",
    related: ["firewall", "nat"] },

  { id: "switch", name: "Switches", abbr: "SW", cat: "Foundations", layer: "L2 Data link (L3 on multilayer switches)",
    what: "Switches connect devices inside a LAN and forward Ethernet frames to the right port based on MAC address. A layer-3 switch can also route between VLANs.",
    how: [
      "The switch learns the source MAC of every frame against the port it arrived on. Frames for known MACs go out one port; broadcasts and unknown destinations are flooded within the VLAN.",
      "Access ports carry one VLAN untagged, for an end device. Trunk ports carry many VLANs tagged with 802.1Q, between switches and to access points.",
      "Spanning Tree Protocol (STP) blocks redundant paths so frames can't loop forever.",
      "Campus designs are layered: access switches at the desks, a distribution or core layer that routes between VLANs, and redundant links between them.",
      "Port-level security: 802.1X, port security, DHCP snooping, Dynamic ARP Inspection, BPDU guard. PoE powers phones, access points and cameras."
    ],
    ports: "", breaks: "A loop without STP creates a broadcast storm that can take down the whole LAN in seconds. A port in the wrong VLAN puts a device in the wrong subnet.",
    examples: "Cisco Catalyst, Aruba CX, Juniper EX, Arista, Ubiquiti UniFi.",
    related: ["vlan", "mac-arp", "router", "nac"] },

  { id: "vlan", name: "VLANs", abbr: "VLAN", cat: "Foundations", layer: "L2 Data link",
    what: "A VLAN splits one physical switch network into several isolated broadcast domains. Users, servers, phones, guests and management each get their own, as if they were on separate switches.",
    how: [
      "Each VLAN maps to one IP subnet: VLAN 10 is `10.10.0.0/22`, VLAN 20 is `10.20.0.0/24`.",
      "802.1Q inserts a 4-byte tag into the Ethernet frame carrying a 12-bit VLAN ID (1–4094) on trunk links. Access ports strip it.",
      "Traffic between VLANs must pass through a router, a layer-3 switch or a firewall. That is the point: it's where you apply ACLs and inspection.",
      "A voice VLAN lets a phone and a PC share one cable while landing in different subnets with different QoS.",
      "VLANs can be assigned statically per port, or dynamically by 802.1X/RADIUS based on who or what authenticated."
    ],
    ports: "", breaks: "VLAN hopping (double-tagging, or a rogue device negotiating a trunk) lets an attacker jump VLANs. Disable auto-trunking on access ports and don't use the native VLAN for users.",
    examples: "",
    related: ["switch", "subnet", "router", "firewall"] },

  { id: "router", name: "Routers & routing", abbr: "RTR", cat: "Foundations", layer: "L3 Network",
    what: "Routers forward packets between different networks using a routing table. The default gateway is simply the router a host sends to when the destination isn't in its own subnet.",
    how: [
      "For each packet the router finds the most specific matching route (longest prefix match) and sends it out of that interface towards the next hop.",
      "Routes come from three places: directly connected networks, static routes typed by an admin, and dynamic routing protocols.",
      "Inside an organisation, OSPF or EIGRP share routes between internal routers. Between organisations and ISPs, BGP does.",
      "A default route (`0.0.0.0/0`) catches everything not matched more specifically, normally pointing towards the Internet.",
      "Each hop decrements the packet's TTL. At zero the packet is discarded, which stops loops and is how `traceroute` works.",
      "Routers can filter with ACLs. Enterprise firewalls are routers with much richer policy."
    ],
    ports: "OSPF is IP protocol 89; BGP uses TCP 179.", breaks: "A missing return route gives one-way traffic: the packet arrives but the reply has nowhere to go. Asymmetric routing (replies coming back a different way) breaks stateful firewalls.",
    examples: "Check routes: `route print`, `ip route`, `traceroute` / `tracert`.",
    related: ["bgp", "subnet", "nat", "firewall"] },

  { id: "bgp", name: "ISPs & BGP", abbr: "BGP", cat: "Foundations", layer: "L3 Network (runs over TCP 179)",
    what: "The Internet is roughly 75,000 independent networks, called autonomous systems (ASes), that agree to carry each other's traffic. BGP is the protocol they use to tell each other which addresses they can reach.",
    how: [
      "Every AS has a number (ASN) and announces the address blocks (prefixes) it owns to its neighbours.",
      "Routers choose between paths with policy: preferred providers, cost and AS-path length.",
      "A small organisation usually just has a default route to its single ISP. A larger one gets its own ASN and address block and peers with two ISPs, so either can fail.",
      "Big content providers and CDNs peer directly with ISPs at Internet exchange points (IXPs).",
      "RPKI cryptographically signs which AS may announce which prefix, to stop hijacks."
    ],
    ports: "TCP 179", breaks: "A BGP leak or hijack can black-hole traffic for a whole country or company. Several famous outages were a single bad announcement.",
    examples: "",
    related: ["router", "ip"] },

  { id: "nat", name: "NAT & PAT", abbr: "NAT", cat: "Foundations", layer: "L3/L4",
    what: "Network Address Translation rewrites addresses as packets cross a boundary. Its most common job is letting thousands of private devices share a handful of public IPv4 addresses.",
    how: [
      "Source NAT with port translation (PAT, or \"NAT overload\"): outbound `10.10.1.57:52811` becomes `203.0.113.2:61044`. The firewall remembers the mapping in a translation table.",
      "Return traffic to `203.0.113.2:61044` is translated back and delivered to the original host.",
      "Destination NAT (\"port forwarding\" or a static NAT) publishes an internal server: traffic to `203.0.113.6:25` is sent to the mail gateway at `172.16.100.25`.",
      "ISPs often run carrier-grade NAT (`100.64.0.0/10`), so a home user may be behind two layers of NAT.",
      "IPv6 has enough addresses that NAT isn't needed, though a firewall still is."
    ],
    ports: "", breaks: "NAT hides who did what: to trace an incident to a user, you need the NAT logs with timestamps. Running out of ports in the translation table breaks new connections.",
    examples: "",
    related: ["firewall", "ip", "tcp-udp"] },

  { id: "ipv6", name: "IPv6", abbr: "v6", cat: "Foundations", layer: "L3 Network",
    what: "The successor to IPv4, with 128-bit addresses (`2001:db8:10::57`). There are enough addresses for every device to have a globally unique one.",
    how: [
      "A typical LAN is a `/64`. Hosts can configure themselves (SLAAC) from router advertisements, or use DHCPv6.",
      "Neighbor Discovery (NDP over ICMPv6) replaces ARP, and ICMPv6 must not be blocked wholesale.",
      "Every interface also has a link-local `fe80::` address.",
      "Most enterprises run dual-stack: IPv4 and IPv6 side by side.",
      "No NAT means firewall policy matters even more."
    ],
    ports: "", breaks: "IPv6 is enabled by default on Windows. If you ignore it, it can be an unmonitored path: attackers can advertise themselves as an IPv6 router or DNS server (e.g. mitm6).",
    examples: "",
    related: ["ip", "router"] },

  { id: "http", name: "HTTP & web apps", abbr: "HTTP", cat: "Foundations", layer: "L7 Application",
    what: "HTTP is the request/response protocol of the web and of most APIs. A client sends a method and path, and the server replies with a status code and content.",
    how: [
      "Methods: `GET` reads, `POST` creates, `PUT`/`PATCH` update, `DELETE` removes.",
      "Status codes: 2xx success, 3xx redirect, 4xx client error (403 forbidden, 404 not found), 5xx server error.",
      "HTTP/1.1 and HTTP/2 run over TCP; HTTP/3 runs over QUIC on UDP 443. In practice it's almost always wrapped in TLS (HTTPS).",
      "Typical layout: load balancer or WAF → web servers → application servers or APIs → database.",
      "Headers such as `Host`, `Cookie`, `Authorization` and `X-Forwarded-For` carry context between tiers."
    ],
    ports: "TCP 80, 443 · UDP 443 (HTTP/3)", breaks: "502/504 from a proxy means the server behind it is down or slow. Injection flaws (SQLi, XSS) are application bugs that a WAF can only partly mask.",
    examples: "Web servers: NGINX, Apache, IIS. Inspect with `curl -v https://...`.",
    related: ["tls", "waf", "proxy"] },

  { id: "qos", name: "Voice & QoS", abbr: "QoS", cat: "Foundations", layer: "L2/L3",
    what: "Quality of Service lets the network prioritise latency-sensitive traffic, such as voice and video, over bulk transfers when links are congested.",
    how: [
      "Packets are marked with a DSCP value in the IP header: voice is EF (46), video AF41, best-effort 0.",
      "Switches and routers place marked traffic into priority queues.",
      "Phones get their own voice VLAN and learn it automatically via LLDP-MED, and are powered by PoE.",
      "SIP (5060/5061) sets up calls; RTP on high UDP ports carries the actual audio.",
      "Voice needs under ~150 ms one-way latency, low jitter and under 1% loss."
    ],
    ports: "SIP 5060/5061 · RTP UDP 16384–32767", breaks: "Robotic or choppy audio during big file copies means QoS is missing or not trusted end to end.",
    examples: "",
    related: ["vlan", "switch"] },

  /* ---------------- Core services ---------------- */
  { id: "dns", name: "DNS", abbr: "DNS", cat: "Core services", layer: "L7 Application",
    what: "The Domain Name System translates names into addresses (`www.example.com` → `192.0.2.80`). It also tells the world where your mail goes, how clients find domain controllers, and which servers may send email for your domain.",
    how: [
      "Your laptop's stub resolver asks a recursive resolver: internal DNS on a domain controller, or your ISP's or a public one.",
      "If it isn't cached, the resolver asks a root server, which refers it to the TLD servers (.com), which refer it to the domain's authoritative servers, which give the answer.",
      "Record types: A/AAAA (IPv4/IPv6 address), CNAME (alias), MX (mail server), TXT (SPF, DKIM, verification), SRV (service location), PTR (reverse lookup), NS and SOA (zone delegation).",
      "Each record has a TTL that says how long it may be cached. Lower it before a migration.",
      "Split-horizon: the internal zone `corp.meridian.example` is answered only inside. The public zone `meridian.example` is hosted on the Internet.",
      "Active Directory depends on DNS: clients find domain controllers through SRV records such as `_ldap._tcp.dc._msdcs`."
    ],
    ports: "UDP/TCP 53 · DoT 853 · DoH 443", breaks: "\"The Internet is down\" is very often DNS. Stale caches, missing records, expired domains and DNS hijacking all cause trouble. Attackers also tunnel data out through DNS queries.",
    examples: "Windows DNS, BIND, Infoblox, Unbound, Cloudflare, Route 53. Test with `nslookup` or `dig`.",
    related: ["ad", "dhcp", "smtp"] },

  { id: "dhcp", name: "DHCP", abbr: "DHCP", cat: "Core services", layer: "L7 Application (over UDP)",
    what: "DHCP hands out IP configuration automatically, so nobody types addresses into thousands of laptops and phones.",
    how: [
      "DORA: the client broadcasts a Discover; the server makes an Offer; the client sends a Request; the server confirms with an Acknowledge.",
      "The lease includes the address and mask plus options: router/gateway (option 3), DNS servers (6), domain name (15), lease time (51), NTP (42), and PXE boot or AP-controller settings.",
      "Clients renew at 50% of the lease. Reservations pin an address to a MAC, for printers.",
      "Broadcasts don't cross routers, so the gateway runs a DHCP relay (`ip helper-address`). It forwards the request to the server and stamps it with its own address (giaddr) so the server picks the right scope.",
      "Production DHCP runs as a failover pair."
    ],
    ports: "UDP 67 (server) · UDP 68 (client)", breaks: "Scope exhausted or server down: new devices give themselves 169.254.x.x and can't reach anything. A rogue DHCP server (even a misplaced home router) hands out a bad gateway. DHCP snooping on switches blocks it.",
    examples: "Windows Server DHCP, ISC Kea, Infoblox, firewall/router built-in.",
    related: ["ip", "dns", "switch"] },

  { id: "ntp", name: "NTP (time)", abbr: "NTP", cat: "Core services", layer: "L7 Application (over UDP)",
    what: "Network Time Protocol keeps every clock in sync to within milliseconds. Security depends on it more than people expect.",
    how: [
      "Time flows down a hierarchy of strata: atomic and GPS clocks (stratum 0) → stratum-1 servers → your servers → clients.",
      "In Active Directory, one domain controller (the PDC emulator) syncs from an external source and every other machine syncs from the domain.",
      "Kerberos rejects tickets if clocks differ by more than 5 minutes.",
      "Certificates have validity dates, TOTP codes use time, and SIEM correlation needs logs in the right order."
    ],
    ports: "UDP 123", breaks: "Clock skew: logons fail with \"clock skew too great\", certificates appear not yet valid, and incident timelines become impossible to reconstruct.",
    examples: "Windows Time service, chrony, ntpd, GPS appliances.",
    related: ["ad", "siem", "ca"] },

  { id: "smtp", name: "Email (SMTP)", abbr: "SMTP", cat: "Core services", layer: "L7 Application",
    what: "SMTP moves mail between servers. Users read mail with other protocols (MAPI/HTTPS, IMAP, Graph), but every message between organisations travels by SMTP.",
    how: [
      "A sender's server looks up the recipient domain's MX record and connects to that server on TCP 25.",
      "Commands: `EHLO`, `STARTTLS`, `MAIL FROM`, `RCPT TO`, `DATA`. Clients submit outgoing mail on 587 with authentication.",
      "A mail gateway (in the DMZ or in the cloud) filters inbound mail: reputation, anti-spam, antivirus, attachment sandboxing and link rewriting.",
      "SPF: a TXT record listing which IPs may send for your domain.",
      "DKIM: the sender signs messages; receivers verify with a public key published in DNS.",
      "DMARC: tells receivers what to do when SPF/DKIM fail (none, quarantine, reject) and where to send reports."
    ],
    ports: "TCP 25 (relay) · 587 (submission) · 465 (implicit TLS) · IMAPS 993", breaks: "An open relay gets you blacklisted within hours. Missing SPF/DKIM/DMARC sends your mail to spam and lets attackers spoof your CEO (business email compromise).",
    examples: "Exchange, Microsoft 365, Google Workspace, Postfix, Proofpoint, Mimecast.",
    related: ["dns", "tls", "dmz"] },

  { id: "file", name: "File sharing (SMB)", abbr: "SMB", cat: "Core services", layer: "L7 Application",
    what: "File servers hold shared drives and home folders. On Windows networks they speak SMB.",
    how: [
      "Clients connect to `\\\\server\\share` on TCP 445 and authenticate with Kerberos.",
      "Share and NTFS permissions are granted to AD groups, never to individuals.",
      "DFS namespaces give stable paths (`\\\\corp\\dept`) even when servers move.",
      "SMB 3 supports signing and encryption. SMBv1 should be disabled everywhere.",
      "Snapshots and offline or immutable backups are the ransomware safety net."
    ],
    ports: "TCP 445", breaks: "Ransomware encrypts every share a user can write to. Never expose 445 to the Internet; WannaCry spread exactly that way.",
    examples: "Windows File Server, NetApp, Samba, SharePoint/OneDrive as cloud alternatives.",
    related: ["ad"] },

  { id: "wifi", name: "Wi-Fi", abbr: "Wi-Fi", cat: "Core services", layer: "L1–L2",
    what: "Access points bridge wireless clients onto the wired network. Each wireless network (SSID) maps to a VLAN.",
    how: [
      "Corporate SSID: WPA3-Enterprise (802.1X) with certificates. Each device and user is authenticated individually and can be assigned a VLAN.",
      "Guest SSID: WPA2/3-Personal or open with a captive portal, landing in an isolated guest VLAN with client isolation.",
      "A controller (on-premises or cloud) manages channels, transmit power, roaming and firmware for all APs.",
      "Bands: 2.4 GHz (range), 5 GHz (capacity) and 6 GHz (Wi-Fi 6E/7, clean spectrum).",
      "APs connect to switches on trunk ports and are usually PoE powered."
    ],
    ports: "CAPWAP UDP 5246/5247 (controller tunnels)", breaks: "Rogue APs and \"evil twin\" networks impersonate your SSID to harvest credentials. Wireless intrusion prevention detects them.",
    examples: "Cisco Meraki/Catalyst, HPE Aruba, Juniper Mist, Ubiquiti.",
    related: ["nac", "vlan", "switch"] },

  /* ---------------- Identity & access ---------------- */
  { id: "ad", name: "Active Directory", abbr: "AD", cat: "Identity & access", layer: "L7 Application",
    what: "Active Directory is the central directory of users, computers, groups and policies in most enterprises. It is the identity backbone: who you are, what you're in, and what your machine must do.",
    how: [
      "Domain controllers hold and replicate the directory database. Run at least two.",
      "LDAP is the query protocol: \"which groups is jlee in?\".",
      "Kerberos is the logon protocol. The DC's Key Distribution Center issues a Ticket-Granting Ticket at logon, then service tickets for each server. Passwords never cross the network.",
      "Group Policy (GPO) pushes settings to every machine: security baselines, drive maps, proxy settings, trusted certificates, software.",
      "Objects live in OUs (organizational units). Domains form forests that can trust each other.",
      "Hybrid setups sync identities to a cloud IdP (Entra ID) for SaaS sign-in."
    ],
    ports: "Kerberos 88 · LDAP 389 / LDAPS 636 · SMB 445 · RPC 135 + dynamic · Global Catalog 3268/3269 · kpasswd 464", breaks: "If DCs are unreachable, nobody can log on (except with cached credentials) or open shares. Compromise of AD hands an attacker the whole company, so admin accounts are tiered and protected.",
    examples: "Windows Server AD DS, Samba AD. Cloud: Microsoft Entra ID.",
    related: ["dns", "ntp", "mfa", "nac", "ca"] },

  { id: "ca", name: "Certificate Authority & PKI", abbr: "CA", cat: "Identity & access", layer: "Supports L5–L7",
    what: "A Certificate Authority issues digital certificates: signed documents that bind a name (a server, computer or user) to a public key. Anyone who trusts the CA can verify that identity.",
    how: [
      "Hierarchy: an offline root CA signs one or more issuing CAs, which sign end-entity certificates. If an issuing CA is compromised, the root can revoke it.",
      "Trust: devices only trust certificates that chain to a root in their trust store. Group Policy pushes the internal root to every domain machine.",
      "Uses inside: internal HTTPS, 802.1X and Wi-Fi (EAP-TLS), VPN, LDAPS, S/MIME email, smart cards, code signing, TLS inspection on the proxy.",
      "Uses outside: Internet-facing sites need certificates from a public CA (via ACME, e.g. Let's Encrypt), which browsers trust by default.",
      "Revocation: CRLs and OCSP let clients check that a certificate hasn't been cancelled.",
      "Auto-enrollment issues and renews machine certificates silently."
    ],
    ports: "HTTP 80 for CRL/OCSP · RPC/DCOM for AD CS enrollment", breaks: "An expired certificate is one of the most common causes of outages. A compromised or misconfigured CA (vulnerable AD CS templates are a well-known attack path) lets an attacker impersonate anyone.",
    examples: "Microsoft AD CS, EJBCA, HashiCorp Vault PKI, smallstep. Public: Let's Encrypt, DigiCert, Sectigo.",
    related: ["tls", "nac", "vpn", "ad"] },

  { id: "tls", name: "TLS & HTTPS", abbr: "TLS", cat: "Identity & access", layer: "L5–L6 (between transport and app)",
    what: "TLS encrypts a connection and proves the server's identity. HTTPS is HTTP inside TLS; LDAPS, SMTPS, IMAPS and many VPNs use it too.",
    how: [
      "TLS 1.3 handshake: the client sends a ClientHello with the server name (SNI) and a key share; the server replies with its key share, certificate chain and a signature.",
      "The client verifies the chain leads to a trusted root CA, that the name matches the certificate's SAN, and that the certificate is in date and not revoked.",
      "Both sides derive session keys with (EC)DHE, which gives forward secrecy: a stolen server key can't decrypt recorded past sessions.",
      "Bulk data is then encrypted with AES-GCM or ChaCha20-Poly1305.",
      "TLS inspection: an enterprise proxy can decrypt traffic by presenting certificates signed by the internal CA, which managed devices trust."
    ],
    ports: "Usually 443; also 636, 993, 465, 853", breaks: "Certificate warnings (expired, wrong name, untrusted issuer). Apps that pin certificates break under TLS inspection and need bypass rules.",
    examples: "Inspect: `openssl s_client -connect host:443 -servername host`.",
    related: ["ca", "proxy", "http"] },

  { id: "nac", name: "802.1X, RADIUS & NAC", abbr: "NAC", cat: "Identity & access", layer: "L2 (802.1X) · L7 (RADIUS)",
    what: "Network Access Control decides who and what may connect to a switch port or Wi-Fi network, and which VLAN or policy they get.",
    how: [
      "Three roles: the supplicant (laptop), the authenticator (switch or AP) and the authentication server (RADIUS).",
      "Until authentication succeeds, the port passes only EAPOL frames. The switch relays EAP inside RADIUS to the server.",
      "EAP-TLS uses machine and user certificates from the internal CA. It's the strongest common method.",
      "Devices that can't do 802.1X (printers, cameras) use MAC Authentication Bypass (MAB) plus profiling.",
      "RADIUS replies can assign a VLAN or a downloadable ACL. Posture checks can demand patched, encrypted, EDR-protected devices.",
      "Change of Authorization (CoA) lets the server re-authenticate or quarantine a port at any time."
    ],
    ports: "RADIUS UDP 1812 (auth) / 1813 (accounting) · TACACS+ TCP 49 (device admin)", breaks: "If RADIUS is unreachable, nobody can connect. Configure a critical VLAN or fail-open policy. MAB alone is easy to spoof by copying a printer's MAC.",
    examples: "Cisco ISE, HPE Aruba ClearPass, Windows NPS, FreeRADIUS, Forescout.",
    related: ["switch", "wifi", "ca", "ad"] },

  { id: "mfa", name: "Identity provider, SSO & MFA", abbr: "IdP", cat: "Identity & access", layer: "L7 Application",
    what: "A cloud identity provider (IdP) lets people sign in once, with multi-factor authentication, and vouches for them to every app. Single sign-on (SSO) keeps passwords out of hundreds of apps.",
    how: [
      "The app redirects the browser to the IdP. The IdP authenticates the user and returns a signed SAML assertion or an OpenID Connect token.",
      "MFA factors range from SMS codes (weak), to TOTP codes and push approvals, to FIDO2/passkeys (phishing-resistant).",
      "Conditional access adds context: is the device managed and compliant, where is the user, what is the risk score?",
      "Identities are usually synced from Active Directory, and SCIM provisions and removes accounts in each app.",
      "VPNs, SaaS apps and admin portals should all go through the IdP."
    ],
    ports: "HTTPS 443", breaks: "MFA fatigue (spamming push requests until the user taps Approve) and adversary-in-the-middle phishing kits are the main bypasses. Number matching and FIDO2 counter them.",
    examples: "Microsoft Entra ID, Okta, Ping Identity, Google Workspace, Duo.",
    related: ["ad", "vpn", "zero-trust"] },

  /* ---------------- Security ---------------- */
  { id: "firewall", name: "Firewalls", abbr: "FW", cat: "Security", layer: "L3–L7",
    what: "A firewall enforces which traffic may pass between zones. Every flow that isn't explicitly allowed is denied.",
    how: [
      "Rules match source zone/address, destination zone/address and service/port, and are evaluated top to bottom. First match wins, with an implicit deny at the end.",
      "Stateful: once an outbound connection is allowed, the firewall tracks it, and replies are allowed automatically. No inbound rule is needed for return traffic.",
      "Zones mirror trust levels: outside (Internet), DMZ, inside, guest, management.",
      "Next-generation firewalls (NGFW) add application identification, user identity from AD, URL filtering, TLS decryption and built-in IPS/anti-malware.",
      "Firewalls also do NAT and often terminate VPNs.",
      "Host firewalls on every laptop and server limit east-west movement inside a VLAN, where the network firewall can't see."
    ],
    ports: "", breaks: "Overly broad \"any/any\" rules added to fix an outage and never removed. Rule bases with thousands of stale entries. Dropped packets look like timeouts, so check the firewall logs first.",
    examples: "Palo Alto Networks, Fortinet FortiGate, Check Point, Cisco Secure Firewall, pfSense/OPNsense.",
    related: ["dmz", "nat", "ips", "vlan", "zero-trust"] },

  { id: "dmz", name: "DMZ", abbr: "DMZ", cat: "Security", layer: "Network design",
    what: "A demilitarised zone is a separate network for servers that must accept connections from the Internet. If one is compromised, the attacker is still outside the internal network.",
    how: [
      "Classic \"three-legged\" firewall: one interface each for outside, DMZ and inside.",
      "Internet → DMZ: only the published ports (443 to the WAF, 25 to the mail gateway, 53 to public DNS).",
      "DMZ → inside: as few, as narrow as possible (mail gateway → Exchange on 25; web server → one API).",
      "Inside → DMZ: management only, from the jump host.",
      "DMZ hosts are hardened, minimal, patched first and heavily logged.",
      "Today many organisations replace parts of the DMZ with cloud services (email security, CDN/WAF, hosted DNS)."
    ],
    ports: "", breaks: "A DMZ with broad rules into the inside network is a DMZ in name only.",
    examples: "",
    related: ["firewall", "waf", "smtp"] },

  { id: "ips", name: "IPS (Intrusion Prevention)", abbr: "IPS", cat: "Security", layer: "L3–L7",
    what: "An Intrusion Prevention System sits inline, so every packet passes through it. It inspects traffic for attacks and drops them in real time.",
    how: [
      "Signature detection matches known exploit patterns, often tied to specific CVEs.",
      "Anomaly and behavioural detection flags port scans, protocol violations, DNS tunnelling and floods.",
      "Actions: drop the packet, reset the connection, block the source for a while, or alert only.",
      "It can only see inside encrypted traffic if TLS is decrypted first.",
      "Commonly delivered as a feature of the NGFW. Tuning is essential: a false positive blocks real business traffic."
    ],
    ports: "", breaks: "Fail-closed IPS hardware that dies takes the link with it. Untuned signatures block legitimate apps; overly loose ones are just expensive cables.",
    examples: "Suricata or Snort inline, Palo Alto Threat Prevention, Cisco Secure Firewall (Snort 3), FortiGate IPS.",
    related: ["ids", "firewall", "siem"] },

  { id: "ids", name: "IDS (Intrusion Detection)", abbr: "IDS", cat: "Security", layer: "L3–L7",
    what: "An Intrusion Detection System watches a copy of traffic and raises alerts. It is passive and never blocks anything.",
    how: [
      "Traffic is copied to it by a SPAN/mirror port on a switch or by a network TAP.",
      "Because it's out of band, it can't break production traffic and can be placed deep inside the network to see east-west movement.",
      "Signature rules plus network metadata (Zeek-style logs of every connection, DNS query, HTTP request and TLS handshake).",
      "Alerts go to the SIEM, where analysts correlate them with other evidence.",
      "IDS vs IPS: IDS is a copy that watches and alerts; IPS is inline and can drop. Many networks use both."
    ],
    ports: "", breaks: "SPAN ports drop packets under heavy load, and encrypted traffic hides payloads. Without someone triaging alerts, an IDS achieves nothing.",
    examples: "Suricata, Zeek, Snort, Security Onion, Corelight, Vectra, Darktrace.",
    related: ["ips", "siem"] },

  { id: "proxy", name: "Forward proxy / web gateway", abbr: "PRX", cat: "Security", layer: "L7 Application",
    what: "A forward proxy makes web requests on behalf of internal users. Policy, logging and malware scanning happen in one place, and internal machines never talk to the Internet directly.",
    how: [
      "Explicit mode: browsers are configured (by GPO, PAC file or WPAD) to send requests to `proxy:8080`. HTTPS uses `CONNECT host:443` to build a tunnel.",
      "Transparent mode: the firewall silently redirects web traffic to the proxy.",
      "Authenticates users (Kerberos/NTLM), so logs and policy work per person and group.",
      "URL category filtering, reputation, file-type blocking, antivirus and sandboxing, data loss prevention.",
      "Optional TLS inspection, re-signing sites with the internal CA. Banking and health sites are usually exempt.",
      "Cloud versions (secure web gateways) protect laptops wherever they are."
    ],
    ports: "TCP 8080 / 3128 (explicit) · 80/443 (transparent)", breaks: "Proxy down feels like \"the Internet is down\". Apps that ignore system proxy settings fail until they get a bypass or firewall rule.",
    examples: "Squid, Zscaler Internet Access, Netskope, Symantec/Broadcom ProxySG, Palo Alto Prisma Access.",
    related: ["firewall", "tls", "ca", "dns"] },

  { id: "waf", name: "Reverse proxy, WAF & load balancer", abbr: "WAF", cat: "Security", layer: "L4–L7",
    what: "A reverse proxy sits in front of servers and accepts connections on their behalf. A web application firewall (WAF) inspects those requests for attacks; a load balancer spreads them across healthy servers.",
    how: [
      "Terminates TLS with the public certificate, so internal servers stay hidden.",
      "WAF rules catch SQL injection, cross-site scripting, path traversal and other OWASP Top 10 patterns.",
      "Rate limiting and bot management slow down credential stuffing and scraping.",
      "Load-balancing algorithms (round robin, least connections) with active health checks remove dead servers automatically.",
      "Adds `X-Forwarded-For` so servers still know the real client IP.",
      "A CDN in front adds global caching and absorbs DDoS attacks."
    ],
    ports: "TCP 443 / 80", breaks: "A WAF in detect-only mode protects nothing. Blocking mode needs tuning so it doesn't reject real customers.",
    examples: "F5 BIG-IP, NGINX, HAProxy, Cloudflare, Akamai, AWS ALB + WAF, Azure Front Door.",
    related: ["dmz", "tls", "http"] },

  { id: "vpn", name: "VPN", abbr: "VPN", cat: "Security", layer: "L3 (IPsec) or L4–L7 (TLS)",
    what: "A VPN builds an encrypted tunnel across the Internet so that private traffic can travel safely between a remote device and the office, or between sites.",
    how: [
      "Remote-access VPN: a client on the laptop connects to a gateway. Site-to-site VPN: two routers or firewalls link whole networks.",
      "Protocols: IPsec with IKEv2 (UDP 500/4500), TLS-based \"SSL VPN\" (443), WireGuard (UDP 51820).",
      "Users authenticate through the IdP with MFA, often plus a device certificate.",
      "The client receives an address from the VPN pool plus DNS servers and routes.",
      "Split tunnel sends only corporate subnets through the tunnel; full tunnel sends everything.",
      "Zero Trust Network Access (ZTNA) is the modern alternative: per-application access instead of a route into the whole network."
    ],
    ports: "UDP 500/4500 (IKE/NAT-T) · TCP/UDP 443 · UDP 51820 (WireGuard)", breaks: "VPN appliances are among the most exploited edge devices, so patch them within days. Overlapping home and office subnets break routing.",
    examples: "Cisco Secure Client, Palo Alto GlobalProtect, FortiClient, WireGuard, Zscaler Private Access, Tailscale.",
    related: ["mfa", "firewall", "ca", "zero-trust"] },

  { id: "edr", name: "Endpoint security (EDR)", abbr: "EDR", cat: "Security", layer: "On the device",
    what: "Endpoint Detection and Response agents run on every laptop and server. They watch processes, files, logons and network connections, and can stop or isolate a machine.",
    how: [
      "Behavioural detection catches what signatures miss: Office spawning PowerShell, credential dumping, mass file encryption.",
      "Telemetry goes to a cloud console and the SIEM.",
      "Responders can isolate a host from the network with one click, while keeping its connection to the EDR console.",
      "Pairs with disk encryption, the host firewall, patching and application control."
    ],
    ports: "HTTPS 443 to the vendor cloud", breaks: "Agents that are missing, outdated or tampered with leave blind spots. Attackers try to disable EDR first.",
    examples: "Microsoft Defender for Endpoint, CrowdStrike Falcon, SentinelOne, Sophos.",
    related: ["siem", "nac"] },

  { id: "zero-trust", name: "Zero Trust & segmentation", abbr: "ZT", cat: "Security", layer: "Architecture",
    what: "Zero Trust drops the idea that being \"inside the network\" means being trusted. Every request is checked for identity, device health and need, wherever it comes from.",
    how: [
      "Strong identity everywhere: SSO with phishing-resistant MFA.",
      "Device posture: managed, patched, encrypted, EDR running.",
      "Least privilege per application rather than broad network access (ZTNA instead of full VPN).",
      "Segmentation and micro-segmentation: VLANs, firewall zones and host firewalls limit how far an attacker can move.",
      "Assume breach: log everything, detect fast, contain fast."
    ],
    ports: "", breaks: "Zero Trust is a direction, not a product. A flat network with one big VLAN is its opposite.",
    examples: "",
    related: ["mfa", "firewall", "vpn", "vlan"] },

  /* ---------------- Operations ---------------- */
  { id: "siem", name: "SIEM & logging", abbr: "SIEM", cat: "Operations", layer: "Monitoring",
    what: "A Security Information and Event Management system collects logs from everything, normalises them and correlates them, so a security team can spot and investigate attacks.",
    how: [
      "Sources: firewall and proxy logs, DNS queries, domain controller security events (4624 logon, 4625 failed logon, 4720 user created), EDR, IDS, VPN, cloud apps.",
      "Transport: syslog (UDP/TCP 514, TLS on 6514), agents, and API connectors for cloud services.",
      "Correlation rules join weak signals into strong ones, such as one host hitting a firewall deny, a proxy block and an IDS alert within 10 minutes.",
      "Retention for investigations and compliance, often a year or more.",
      "SOAR playbooks automate the response: enrich, ticket, isolate host, disable account."
    ],
    ports: "Syslog 514 UDP/TCP · 6514 TLS", breaks: "Logs that aren't collected can't be investigated. Wrong clocks make timelines lie. Alert fatigue buries the real incident.",
    examples: "Splunk, Microsoft Sentinel, Elastic Security, IBM QRadar, Google SecOps, Wazuh.",
    related: ["ids", "edr", "ntp", "nms"] },

  { id: "nms", name: "Network monitoring & management", abbr: "NMS", cat: "Operations", layer: "Monitoring",
    what: "Monitoring tells you a link is failing before users do. Management keeps device configs controlled, backed up and reachable only by admins.",
    how: [
      "SNMP polling (UDP 161, use v3 with authentication) and traps (UDP 162) report interface status, errors, CPU and temperature.",
      "Syslog collects device events. NetFlow/IPFIX/sFlow show who talks to whom and how much.",
      "A management VLAN or an out-of-band network keeps admin access separate from user traffic.",
      "Admin logins use SSH/HTTPS via the jump host, authenticated by TACACS+ or RADIUS so every command is attributable.",
      "Nightly configuration backups and change tracking."
    ],
    ports: "SNMP 161/162 · syslog 514 · SSH 22 · NetFlow UDP 2055 · TACACS+ 49", breaks: "SNMPv1/v2c with the community string \"public\" leaks configuration. Management interfaces reachable from user VLANs are a gift to attackers.",
    examples: "LibreNMS, Zabbix, PRTG, SolarWinds, Grafana + Prometheus, Oxidized/RANCID for config backups.",
    related: ["jump", "siem"] },

  { id: "jump", name: "Jump host & privileged access", abbr: "JMP", cat: "Operations", layer: "Access design",
    what: "A jump host (bastion) is the single, hardened path into management interfaces. Admins connect to it first, then onward to network gear and servers.",
    how: [
      "MFA to reach the jump host, and only from admin workstations.",
      "Firewall rules allow SSH, RDP and HTTPS to management interfaces only from the jump host.",
      "Privileged access management (PAM) vaults admin passwords, rotates them after use and records sessions.",
      "Tiered administration: accounts that manage domain controllers never log on to ordinary workstations."
    ],
    ports: "SSH 22 · RDP 3389 · HTTPS 443", breaks: "Admins who bypass the jump host \"just this once\" create the paths attackers use.",
    examples: "CyberArk, BeyondTrust, Delinea, Teleport, Azure Bastion.",
    related: ["nms", "ad", "mfa"] }
];

/* ------------------------------------------------------------------ */
/* Packet journeys                                                     */
/* Each step: path (node ids, in order), title, text, pkts            */
/* pkts: [{ label, layers: [[tag, text], ...] }]                      */
/* tags: L1 L2 L3 L4 TLS L7 CHK DROP                                   */
/* ------------------------------------------------------------------ */
NET.journeys = [
  {
    id: "join", title: "A laptop joins the network",
    blurb: "From plugging in a cable to the user's drives being mapped: 802.1X, DHCP, ARP, DNS, Kerberos and Group Policy.",
    steps: [
      { path: ["laptop", "access-sw", "core", "server-sw", "nps"],
        title: "The port asks who you are",
        text: "Jamie plugs into port Gi1/0/14. The access switch keeps the port closed to everything except 802.1X (EAPOL) frames. The laptop presents its machine certificate; the switch wraps that EAP conversation in RADIUS and sends it to NPS. NPS checks the certificate was issued by our CA and that the computer exists in Active Directory, then replies Access-Accept with an instruction: put this port in VLAN 10.",
        pkts: [
          { label: "Laptop → switch", layers: [["L2", "EAPOL · src 3c:52:82:1a:9f:04 → 01:80:c2:00:00:03"], ["L7", "EAP-TLS ClientHello with machine certificate LT-0457"]] },
          { label: "Switch → NPS", layers: [["L3", "10.99.0.12 → 10.20.0.15"], ["L4", "UDP 49230 → 1812"], ["L7", "RADIUS Access-Request · User-Name host/LT-0457.corp.meridian.example"]] },
          { label: "NPS → switch", layers: [["L7", "Access-Accept · Tunnel-Private-Group-ID = 10"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "dhcp"],
        title: "Shout for an address",
        text: "With no address yet, the laptop broadcasts a DHCP Discover. Broadcasts stop at the edge of a VLAN, and the DHCP server is in VLAN 20. So the core switch, which is VLAN 10's gateway, acts as a DHCP relay (`ip helper-address 10.20.0.11`). It forwards the request as unicast and stamps it with giaddr 10.10.0.1, so the server knows which scope to hand out from.",
        pkts: [
          { label: "Laptop broadcast", layers: [["L2", "3c:52:82:1a:9f:04 → ff:ff:ff:ff:ff:ff · 802.1Q VLAN 10 on the trunk"], ["L3", "0.0.0.0 → 255.255.255.255"], ["L4", "UDP 68 → 67"], ["L7", "DHCPDISCOVER · hostname LT-0457"]] },
          { label: "Relayed by the core", layers: [["L3", "10.10.0.1 → 10.20.0.11"], ["L4", "UDP 67 → 67"], ["L7", "DHCPDISCOVER · giaddr 10.10.0.1"]] }
        ] },
      { path: ["dhcp", "server-sw", "core", "access-sw", "laptop"],
        title: "Offer, request, acknowledge",
        text: "The server offers 10.10.1.57 from the Users scope; the laptop requests it; the server acknowledges. Those four messages are DORA. The lease brings everything else the laptop needs: mask, default gateway, DNS server and domain name. The laptop will try to renew at half the lease time.",
        pkts: [
          { label: "DHCPACK to the laptop", layers: [["L3", "10.20.0.11 → 10.10.0.1 (relay) → 10.10.1.57"], ["L4", "UDP 67 → 68"], ["L7", "yiaddr 10.10.1.57 · opt 1 mask 255.255.252.0 · opt 3 router 10.10.0.1 · opt 6 DNS 10.20.0.10 · opt 15 corp.meridian.example · opt 51 lease 8 days"]] }
        ] },
      { path: ["laptop", "access-sw", "core"],
        title: "Find the gateway's MAC (ARP)",
        text: "Anything outside 10.10.0.0/22 must go via the default gateway. IP addresses don't deliver frames, MAC addresses do. So the laptop broadcasts an ARP request for 10.10.0.1. The gateway is a virtual interface (SVI) on the core switch, which answers with its MAC. The laptop caches that for a few minutes.",
        pkts: [
          { label: "ARP request (broadcast)", layers: [["L2", "3c:52:82:1a:9f:04 → ff:ff:ff:ff:ff:ff · EtherType 0x0806"], ["L2", "Who has 10.10.0.1? Tell 10.10.1.57"]] },
          { label: "ARP reply (unicast)", layers: [["L2", "00:1c:73:aa:10:01 → 3c:52:82:1a:9f:04"], ["L2", "10.10.0.1 is at 00:1c:73:aa:10:01"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "dc"],
        title: "Ask DNS where a domain controller is",
        text: "Windows finds a domain controller by asking DNS for an SRV record. AD-integrated DNS on the DC answers: dc01, port 389. Notice the frame goes to the gateway's MAC, but the IP destination is the DC. The core switch routes the packet from VLAN 10 to VLAN 20, rewriting the MAC addresses and leaving the IPs alone.",
        pkts: [
          { label: "Query", layers: [["L2", "3c:52:82:1a:9f:04 → 00:1c:73:aa:10:01 (gateway)"], ["L3", "10.10.1.57 → 10.20.0.10"], ["L4", "UDP 53124 → 53"], ["L7", "SRV? _ldap._tcp.dc._msdcs.corp.meridian.example"]] },
          { label: "Answer", layers: [["L7", "SRV 0 100 389 dc01.corp.meridian.example · A 10.20.0.10"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "dc"],
        title: "Sync the clock, then log on (Kerberos)",
        text: "Kerberos breaks if clocks differ by more than five minutes, so the laptop syncs time from the DC first. Then Jamie types their password. It is never sent across the network. Instead the laptop proves it knows the password by encrypting a timestamp, and the DC's Key Distribution Center returns a Ticket-Granting Ticket (TGT). From now on, the TGT is exchanged for a service ticket for each server Jamie uses.",
        pkts: [
          { label: "Time", layers: [["L3", "10.10.1.57 → 10.20.0.10"], ["L4", "UDP 123 → 123"], ["L7", "NTP client request · offset 0.004 s"]] },
          { label: "Logon", layers: [["L4", "TCP 50211 → 88"], ["L7", "Kerberos AS-REQ jlee@CORP.MERIDIAN.EXAMPLE (pre-auth: encrypted timestamp)"], ["L7", "AS-REP → TGT valid 10 hours"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "dc"],
        title: "Apply Group Policy",
        text: "Group Policy objects linked to the laptop's and Jamie's OUs are found over LDAP and downloaded from the SYSVOL share over SMB. Here they set the web proxy (a PAC file), install the internal root CA certificate into the trust store, enforce BitLocker and the host firewall, and map the H: drive.",
        pkts: [
          { label: "Find policies", layers: [["L4", "TCP 50240 → 389"], ["L7", "LDAP search gPLink for OU=Laptops,OU=Head Office"]] },
          { label: "Download them", layers: [["L4", "TCP 50241 → 445"], ["L7", "SMB2 READ \\\\corp.meridian.example\\SYSVOL\\…\\Registry.pol"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "file"],
        title: "Map the home drive",
        text: "The drive mapping connects to the file server over SMB 3, authenticating with a Kerberos service ticket, so there is no second password prompt. On the way, the core switch checks its inter-VLAN ACL: Users → Servers on 445 is allowed; Users → Management is not. Jamie is ready to work, about 20 seconds after plugging in.",
        pkts: [
          { label: "Connect", layers: [["L3", "10.10.1.57 → 10.20.0.13"], ["L4", "TCP 51022 → 445"], ["L7", "SMB2 TREE_CONNECT \\\\files01\\home$\\jlee · Kerberos ticket cifs/files01"]] },
          { label: "Core ACL", layers: [["CHK", "permit tcp 10.10.0.0/22 → 10.20.0.0/24 eq 445 ✓"]] }
        ] }
    ]
  },

  {
    id: "browse", title: "Opening https://www.example.com",
    blurb: "Proxy discovery, recursive DNS from the root down, NAT, a TLS handshake and the stateful return path.",
    steps: [
      { path: ["laptop", "access-sw", "core", "server-sw", "dc"],
        title: "Find the proxy",
        text: "Group Policy configured the browser with a PAC file. It says: internal names go direct, everything else goes to proxy.corp.meridian.example port 8080. First the laptop needs the proxy's address, so it asks internal DNS.",
        pkts: [
          { label: "Query", layers: [["L3", "10.10.1.57 → 10.20.0.10"], ["L4", "UDP 53311 → 53"], ["L7", "A? proxy.corp.meridian.example → 172.16.110.10"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "fw", "es-sw", "proxy"],
        title: "Ask the proxy to connect",
        text: "The browser opens a TCP connection to the proxy and sends `CONNECT www.example.com:443`. The firewall allows Users → proxy on 8080 and blocks users from going straight out on 80/443. That is what forces every web request through the proxy. The proxy identifies Jamie with Kerberos, so its logs show a person, not just an IP.",
        pkts: [
          { label: "Request", layers: [["L3", "10.10.1.57 → 172.16.110.10"], ["L4", "TCP 52811 → 8080"], ["L7", "CONNECT www.example.com:443 HTTP/1.1 · Proxy-Authorization: Negotiate …"]] },
          { label: "Firewall rule", layers: [["CHK", "Inside-Users → Edge proxy tcp/8080 allow ✓"]] }
        ] },
      { path: ["proxy", "es-sw", "fw", "core", "server-sw", "dc", "server-sw", "core", "fw", "ips", "edge", "isp", "root-dns"],
        title: "Resolve the name, from the root down",
        text: "The proxy asks internal DNS for www.example.com. The DC isn't authoritative for example.com and has nothing cached, so it resolves recursively. A root server refers it to the .com TLD servers. Those refer it to example.com's authoritative servers, which return the address. Every answer carries a TTL, so the next request is served from cache in under a millisecond.",
        pkts: [
          { label: "To a root server (after NAT)", layers: [["L3", "203.0.113.2 → 198.41.0.4"], ["L4", "UDP 40871 → 53"], ["L7", "A? www.example.com → referral: com. NS a.gtld-servers.net"]] },
          { label: "Then .com, then example.com", layers: [["L7", "→ referral: example.com NS a.iana-servers.net"], ["L7", "→ answer: www.example.com A 192.0.2.80 TTL 3600"]] }
        ] },
      { path: ["dc", "server-sw", "core", "fw", "es-sw", "proxy"],
        title: "Answer, then policy check",
        text: "With the address in hand, the proxy checks policy: URL category, reputation, Jamie's group and the time of day. This site is allowed. Many proxies also decrypt and re-encrypt HTTPS (TLS inspection) with a certificate from our internal CA, which laptops trust because Group Policy installed it. Banking and healthcare categories are usually exempted.",
        pkts: [
          { label: "DNS answer", layers: [["L3", "10.20.0.10 → 172.16.110.10"], ["L7", "www.example.com A 192.0.2.80"]] },
          { label: "Proxy policy", layers: [["CHK", "Category: Computers & Internet · Reputation: low risk · Group: Staff → allow ✓"]] }
        ] },
      { path: ["proxy", "es-sw", "fw", "ips", "edge", "isp", "website"],
        title: "Out through NAT to the Internet",
        text: "The proxy opens its own connection to the website. The firewall rewrites the private source address to our public one (PAT) and records the mapping in its state table. The IPS scans the stream for exploit signatures. The edge router has one route that matters, 0.0.0.0/0 to the ISP. From there, routers across the Internet forward it hop by hop using BGP-learned routes.",
        pkts: [
          { label: "Before NAT", layers: [["L3", "172.16.110.10 → 192.0.2.80"], ["L4", "TCP 40112 → 443 · SYN"]] },
          { label: "After NAT", layers: [["L3", "203.0.113.2 → 192.0.2.80 · TTL 63"], ["L4", "TCP 61044 → 443 · SYN"]] }
        ] },
      { path: ["website", "isp", "edge", "ips", "fw", "es-sw", "proxy", "es-sw", "fw", "core", "access-sw", "laptop"],
        title: "TLS handshake: is this really example.com?",
        text: "Inside the CONNECT tunnel, the browser and the server do a TLS 1.3 handshake. The server presents its certificate chain. The browser checks that the chain leads to a root CA in its trust store, that the name matches www.example.com, and that the certificate is in date and not revoked. Both sides derive session keys with ECDHE, so even someone recording the traffic can't decrypt it later.",
        pkts: [
          { label: "ServerHello", layers: [["L4", "TCP 443 → 61044"], ["TLS", "TLS 1.3 · cipher TLS_AES_128_GCM_SHA256 · key share x25519"], ["TLS", "Certificate: CN=www.example.com ← Public Intermediate CA ← Public Root CA (trusted)"]] }
        ] },
      { path: ["website", "isp", "edge", "ips", "fw", "es-sw", "proxy", "es-sw", "fw", "core", "access-sw", "laptop"],
        title: "The page arrives",
        text: "Responses flow back the same way. The firewall needs no inbound rule for them: it matches each returning packet against the state table it built on the way out, reverses the NAT and passes it on. The whole round trip, from DNS lookup to the first byte of the page, usually takes under 200 milliseconds.",
        pkts: [
          { label: "Return through NAT", layers: [["L3", "192.0.2.80 → 203.0.113.2 ⇒ 172.16.110.10"], ["CHK", "State table hit: tcp 172.16.110.10:40112 ↔ 192.0.2.80:443 ESTABLISHED"]] },
          { label: "Inside the tunnel", layers: [["TLS", "Application data (encrypted)"], ["L7", "HTTP/2 200 OK · content-type: text/html"]] }
        ] }
    ]
  },

  {
    id: "mail", title: "An email arrives from a partner",
    blurb: "MX lookup, SMTP into the DMZ, SPF/DKIM/DMARC checks, a narrow relay inside and the signed reply.",
    steps: [
      { path: ["remote-mail", "isp", "edge", "ips", "fw", "dmz-sw", "ext-dns"],
        title: "Where does mail for meridian.example go?",
        text: "ops@partner.example writes to jlee@meridian.example. Their mail server asks DNS for meridian.example's MX record. Our authoritative public DNS server in the DMZ answers: deliver to mail.meridian.example at 203.0.113.6. It also publishes our SPF, DKIM and DMARC records. It only answers for our own zone and won't do lookups for strangers.",
        pkts: [
          { label: "Query", layers: [["L3", "192.0.2.25 → 203.0.113.7 ⇒ 172.16.100.53"], ["L4", "UDP 33012 → 53"], ["L7", "MX? meridian.example"]] },
          { label: "Answer", layers: [["L7", "MX 10 mail.meridian.example · A 203.0.113.6"]] }
        ] },
      { path: ["remote-mail", "isp", "edge", "ips", "fw", "dmz-sw", "mail-gw"],
        title: "SMTP into the DMZ",
        text: "The firewall has one inbound rule for this: any → 203.0.113.6 on TCP 25, translated to the mail gateway in the DMZ. The two servers upgrade the session to TLS with STARTTLS, then exchange envelope commands.",
        pkts: [
          { label: "Connection", layers: [["L3", "192.0.2.25 → 203.0.113.6 ⇒ 172.16.100.25"], ["L4", "TCP 41522 → 25"]] },
          { label: "SMTP", layers: [["L7", "EHLO mx1.partner.example"], ["TLS", "STARTTLS → TLS 1.3"], ["L7", "MAIL FROM:<ops@partner.example> · RCPT TO:<jlee@meridian.example> · DATA"]] }
        ] },
      { path: ["mail-gw"],
        title: "Is this mail genuine and safe?",
        text: "Before accepting, the gateway asks three questions. SPF: is this IP allowed to send for partner.example? DKIM: does the signature verify with the public key in partner.example's DNS? DMARC: what does partner.example want done if those fail? Then come spam scoring, antivirus, detonating attachments in a sandbox, and rewriting links so they can be checked again when clicked.",
        pkts: [
          { label: "Authentication", layers: [["CHK", "SPF pass · 192.0.2.25 is listed in v=spf1 ip4:192.0.2.0/27 -all"], ["CHK", "DKIM pass · d=partner.example s=sel1"], ["CHK", "DMARC pass · policy p=reject"]] },
          { label: "Content", layers: [["CHK", "Spam score 0.4 / 5 · AV clean · invoice.pdf detonated in sandbox: benign"]] }
        ] },
      { path: ["mail-gw", "dmz-sw", "fw", "core", "server-sw", "exchange"],
        title: "Relay inside through a narrow rule",
        text: "The gateway relays the clean message to Exchange. This is one of very few DMZ → inside rules on the firewall, and it's as narrow as possible: one source, one destination, one port. If the gateway were compromised, the attacker still couldn't reach anything else inside.",
        pkts: [
          { label: "Relay", layers: [["L3", "172.16.100.25 → 10.20.0.14"], ["L4", "TCP 50877 → 25"], ["CHK", "DMZ mail-gw → Exchange tcp/25 allow ✓ (only DMZ → inside SMTP rule)"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "exchange"],
        title: "Jamie reads it",
        text: "Outlook talks to Exchange over HTTPS. The server's certificate was issued by our internal CA, which the laptop trusts because Group Policy installed the root. Authentication is Kerberos again, so there's no password prompt.",
        pkts: [
          { label: "Client", layers: [["L3", "10.10.1.57 → 10.20.0.14"], ["L4", "TCP 52990 → 443"], ["TLS", "Certificate mail.corp.meridian.example ← Meridian Issuing CA 01 ← Meridian Root CA"], ["L7", "MAPI over HTTP · Authorization: Negotiate (Kerberos)"]] }
        ] },
      { path: ["exchange", "server-sw", "core", "fw", "dmz-sw", "mail-gw", "dmz-sw", "fw", "ips", "edge", "isp", "remote-mail"],
        title: "The reply goes out, signed",
        text: "Replies travel the reverse route. Exchange hands outbound mail to the gateway (its smart host), which signs it with our DKIM private key and sends it from 203.0.113.6, the address our SPF record lists. The partner's gateway runs the same checks we just did.",
        pkts: [
          { label: "Outbound", layers: [["L3", "172.16.100.25 ⇒ 203.0.113.6 → 192.0.2.25"], ["L4", "TCP 60311 → 25"], ["L7", "DKIM-Signature: v=1; d=meridian.example; s=mx2026; …"]] }
        ] }
    ]
  },

  {
    id: "public", title: "Customers visit our website",
    blurb: "Inbound traffic: public DNS, TLS at the WAF, load balancing, a narrow path to an internal API, and attacks stopped at the edge.",
    steps: [
      { path: ["remote", "isp", "edge", "ips", "fw", "dmz-sw", "ext-dns"],
        title: "A customer looks us up",
        text: "A customer tracking a shipment types www.meridian.example. Their resolver walks the chain down to our authoritative DNS server, which returns the public address of the WAF.",
        pkts: [
          { label: "Answer", layers: [["L7", "www.meridian.example A 203.0.113.5 TTL 300"]] }
        ] },
      { path: ["remote", "isp", "edge", "ips", "fw", "dmz-sw", "waf"],
        title: "TLS ends at the reverse proxy",
        text: "The firewall translates 203.0.113.5:443 to the WAF. The WAF holds the public certificate (from a public CA via ACME, renewed automatically every 60 days) and terminates TLS. The web servers are never exposed directly.",
        pkts: [
          { label: "Inbound", layers: [["L3", "198.51.100.77 → 203.0.113.5 ⇒ 172.16.100.10"], ["L4", "TCP 55120 → 443"], ["TLS", "Certificate www.meridian.example ← public CA"]] }
        ] },
      { path: ["waf", "dmz-sw", "web"],
        title: "Inspect, then load-balance",
        text: "The WAF inspects the decrypted request. It's clean, so it forwards it to a healthy web server, chosen by least connections, over a new TLS connection. It adds X-Forwarded-For so the server still sees the customer's real IP.",
        pkts: [
          { label: "To the backend", layers: [["L3", "172.16.100.10 → 172.16.100.20"], ["L4", "TCP 41020 → 8443"], ["L7", "GET /track?id=MF-20931 · X-Forwarded-For: 198.51.100.77"]] }
        ] },
      { path: ["web", "dmz-sw", "fw", "core", "server-sw", "app"],
        title: "One narrow path inward",
        text: "The web server needs shipment data, so it calls the internal API. The firewall permits exactly this flow: web server → API on 443, nothing else. Databases stay inside, never in the DMZ.",
        pkts: [
          { label: "API call", layers: [["L3", "172.16.100.20 → 10.20.0.17"], ["L4", "TCP 50101 → 443"], ["CHK", "DMZ web → Inside api tcp/443 allow ✓"]] }
        ] },
      { path: ["attacker", "isp", "edge", "ips", "fw", "dmz-sw", "waf"],
        title: "An attacker tries SQL injection",
        text: "The same URL arrives with `' OR '1'='1` stuffed into the parameter. It's valid HTTPS, so the firewall and IPS can't see inside it. The WAF, which sees the decrypted request, matches its SQL-injection rules and returns 403. The attempt is logged to the SIEM.",
        pkts: [
          { label: "Request", layers: [["L3", "192.0.2.66 → 203.0.113.5 ⇒ 172.16.100.10"], ["L7", "GET /track?id=1'%20OR%20'1'='1"]] },
          { label: "Verdict", layers: [["DROP", "WAF rule 942100 SQL injection detected → 403 Forbidden"]] }
        ] },
      { path: ["attacker", "isp", "edge", "ips"],
        title: "And then scans for open doors",
        text: "Next the attacker sweeps our public block for RDP, SMB and SSH, and fires a known exploit at the VPN gateway's login page. The IPS recognises the scan pattern and the exploit signature, drops the packets and blocks the source for an hour. Anything it missed would still hit the firewall's default deny: none of those ports are published.",
        pkts: [
          { label: "Scan", layers: [["L3", "192.0.2.66 → 203.0.113.1–14"], ["L4", "TCP SYN → 22, 445, 3389, 8443"]] },
          { label: "Verdict", layers: [["DROP", "IPS: TCP port sweep · exploit signature (VPN path traversal) → drop, block source 60 min"]] }
        ] }
    ]
  },

  {
    id: "vpn", title: "Working from home over VPN",
    blurb: "Gateway certificate, SSO with MFA, tunnel parameters, encapsulation and split tunnelling.",
    steps: [
      { path: ["remote", "isp", "edge", "ips", "fw", "es-sw", "vpn"],
        title: "Reach the VPN gateway",
        text: "Jamie's VPN client connects to vpn.meridian.example (203.0.113.8). The gateway presents a certificate from a public CA, and the client checks it just like a browser would. IKEv2 negotiates encryption over UDP 500, then moves to 4500 because there's NAT at both ends.",
        pkts: [
          { label: "IKE", layers: [["L3", "198.51.100.77 → 203.0.113.8 ⇒ 172.16.110.20"], ["L4", "UDP 500 → 500, then 4500 → 4500 (NAT-T)"], ["L7", "IKE_SA_INIT · AES-256-GCM · DH group 19"]] }
        ] },
      { path: ["remote", "isp", "saas"],
        title: "Prove it's really Jamie (SSO + MFA)",
        text: "The gateway sends Jamie to the cloud identity provider. The IdP checks the password (synced from AD), sends a push to Jamie's phone with a number to match, and confirms the laptop is managed and compliant. It hands back a signed SAML assertion, which the gateway trusts.",
        pkts: [
          { label: "Sign-in", layers: [["TLS", "HTTPS to login.idp.example"], ["CHK", "Password ✓ · MFA push, number match 47 ✓ · Device compliant ✓"], ["L7", "SAMLResponse (signed) → vpn.meridian.example"]] }
        ] },
      { path: ["vpn", "es-sw", "fw", "ips", "edge", "isp", "remote"],
        title: "The tunnel comes up",
        text: "The gateway assigns Jamie an inside address from the VPN pool, internal DNS servers and a list of routes. Split tunnel: only corporate subnets go through the tunnel. The firewall treats the VPN pool as its own zone with its own rules.",
        pkts: [
          { label: "Config", layers: [["L7", "Address 10.200.1.23/22 · DNS 10.20.0.10 · search corp.meridian.example"], ["L3", "Routes via tunnel: 10.0.0.0/8, 172.16.0.0/12"]] }
        ] },
      { path: ["remote", "isp", "edge", "ips", "fw", "es-sw", "vpn", "es-sw", "fw", "core", "server-sw", "file"],
        title: "Open a file share through the tunnel",
        text: "Jamie opens H:. The SMB packet is wrapped in an encrypted ESP packet addressed to the gateway. That's encapsulation: a whole packet inside another. The gateway unwraps it and forwards the inner packet. The firewall checks the inner packet against the VPN-pool rules: file servers yes, management VLAN no.",
        pkts: [
          { label: "Outer packet (on the Internet)", layers: [["L3", "198.51.100.77 → 203.0.113.8"], ["L4", "UDP 4500 → 4500"], ["TLS", "ESP SPI 0x8f21a0c4 · encrypted payload"]] },
          { label: "Inner packet (after decryption)", layers: [["L3", "10.200.1.23 → 10.20.0.13"], ["L4", "TCP 50331 → 445"], ["L7", "SMB2 TREE_CONNECT \\\\files01\\home$\\jlee"]] }
        ] },
      { path: ["remote", "isp", "website"],
        title: "Everything else goes direct",
        text: "With split tunnelling, traffic to public sites goes straight out of Jamie's home connection, which is faster and saves office bandwidth. The trade-off is that the office proxy no longer sees it, which is why many companies add a cloud web gateway on the laptop. Zero Trust Network Access goes further and grants access per application instead of to whole subnets.",
        pkts: [
          { label: "Direct", layers: [["L3", "192.168.1.20 ⇒ 198.51.100.77 (home NAT) → 192.0.2.80"], ["L4", "TCP 62001 → 443"]] }
        ] }
    ]
  },

  {
    id: "malware", title: "Malware tries to phone home",
    blurb: "Defence in depth: firewall, proxy, IPS, IDS, SIEM correlation and automatic quarantine.",
    steps: [
      { path: ["laptop", "access-sw", "core", "fw"],
        title: "Direct connection: dropped",
        text: "Jamie opened a booby-trapped attachment, and the malware tries to reach its command-and-control server directly on 443. The firewall's policy says users may only reach the web through the proxy, so the packet hits the default deny. The drop is logged.",
        pkts: [
          { label: "Attempt", layers: [["L3", "10.10.1.57 → 192.0.2.66"], ["L4", "TCP 53002 → 443 · SYN"]] },
          { label: "Verdict", layers: [["DROP", "Firewall: Inside-Users → Outside tcp/443 · default deny · logged"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "fw", "es-sw", "proxy"],
        title: "Via the proxy: blocked",
        text: "Smarter malware reads the system proxy settings and tries again through the proxy. The proxy looks up the destination's reputation: c2.bad.example is on a threat-intelligence feed as malware infrastructure. It returns 403, and logs the user, host and URL.",
        pkts: [
          { label: "Attempt", layers: [["L7", "CONNECT c2.bad.example:443 · user jlee · host LT-0457"]] },
          { label: "Verdict", layers: [["DROP", "Proxy: category Malware/C2 → 403 Blocked"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "server-sw", "dc", "server-sw", "core", "fw", "ips"],
        title: "DNS tunnelling: caught at the edge",
        text: "As a last resort, the malware hides data inside DNS queries: long, random-looking subdomains of a domain the attacker controls. The DC dutifully forwards them outwards. The IPS spots the pattern (high entropy, long labels, high TXT query rate) and drops them.",
        pkts: [
          { label: "Queries", layers: [["L7", "TXT? aGVsbG8gZnJvbSBMVC0wNDU3.x7.t.bad.example (×300/min)"]] },
          { label: "Verdict", layers: [["DROP", "IPS: DNS tunnelling heuristic · drop + alert"]] }
        ] },
      { path: ["laptop", "access-sw", "core", "ids"],
        title: "Lateral movement: seen inside",
        text: "Blocked outbound, the malware starts probing neighbours for SMB to spread. That traffic never reaches the perimeter, but the core switch mirrors it to the IDS. The IDS can't block it, but it raises an alert that the laptop is scanning 40 hosts on port 445.",
        pkts: [
          { label: "Scan", layers: [["L3", "10.10.1.57 → 10.10.0.0/22, 10.20.0.0/24"], ["L4", "TCP SYN → 445"]] },
          { label: "Alert", layers: [["CHK", "IDS: internal SMB sweep, 40 hosts in 30 s · severity high"]] }
        ] },
      { path: ["ids", "core", "server-sw", "siem"],
        title: "The SIEM joins the dots",
        text: "Individually these are four noisy events from four systems. The SIEM sees they share one host within ten minutes, adds the EDR detection on the laptop, and raises a single critical incident for the security team with the full timeline. Synchronised clocks are what make this timeline trustworthy.",
        pkts: [
          { label: "Correlation", layers: [["CHK", "09:41:07 FW deny · 09:41:12 proxy block · 09:42:30 IPS DNS tunnel · 09:44:02 IDS SMB sweep · 09:44:05 EDR suspicious process"], ["CHK", "→ Incident #4127, host 10.10.1.57 / LT-0457 / jlee · CRITICAL"]] }
        ] },
      { path: ["siem", "server-sw", "nps", "server-sw", "core", "access-sw", "laptop"],
        title: "Contain: quarantine the port",
        text: "A playbook acts within seconds. EDR isolates the laptop, and NAC sends a RADIUS Change of Authorization to the access switch, which moves port Gi1/0/14 to a quarantine VLAN that can only reach the remediation server. Jamie's account is forced to reset its password. Damage: one laptop to reimage.",
        pkts: [
          { label: "CoA", layers: [["L3", "10.20.0.15 → 10.99.0.12"], ["L4", "UDP 3799"], ["L7", "RADIUS CoA-Request · Gi1/0/14 → VLAN 666 (quarantine)"]] }
        ] }
    ]
  },

  {
    id: "guest", title: "A visitor joins guest Wi-Fi",
    blurb: "SSID-to-VLAN mapping, a firewall as gateway, inside blocked and Internet allowed.",
    steps: [
      { path: ["guest", "ap"],
        title: "Join Meridian-Guest",
        text: "A visitor joins the guest SSID with the password from reception (WPA3-Personal). The AP maps this SSID to VLAN 50 and turns on client isolation, so guests can't reach each other's devices either.",
        pkts: [
          { label: "Association", layers: [["L1", "5 GHz, channel 36, 80 MHz"], ["L2", "802.11 association · SSID Meridian-Guest · WPA3-SAE"], ["L2", "AP tags frames into VLAN 50 on its trunk"]] }
        ] },
      { path: ["guest", "ap", "access-sw", "core", "fw"],
        title: "Get an address from the firewall",
        text: "VLAN 50 is carried at layer 2 through the switches straight to the firewall, which is the guest gateway and DHCP server. The core switch has no IP interface in VLAN 50, so it can't route guest traffic anywhere inside, even by mistake.",
        pkts: [
          { label: "DHCP", layers: [["L3", "0.0.0.0 → 255.255.255.255"], ["L4", "UDP 68 → 67"], ["L7", "ACK 10.50.1.88/22 · router 10.50.0.1 · DNS 10.50.0.1"]] }
        ] },
      { path: ["guest", "ap", "access-sw", "core", "fw"],
        title: "Try to reach a file server: denied",
        text: "Curious, the visitor tries \\\\10.20.0.13. The firewall's guest zone policy denies every internal destination. The packet is dropped and logged.",
        pkts: [
          { label: "Attempt", layers: [["L3", "10.50.1.88 → 10.20.0.13"], ["L4", "TCP 50022 → 445"]] },
          { label: "Verdict", layers: [["DROP", "Firewall: Guest → Inside any · deny"]] }
        ] },
      { path: ["guest", "ap", "access-sw", "core", "fw", "ips", "edge", "isp", "website"],
        title: "Browse the Internet: allowed",
        text: "Web traffic is allowed out, NATed to a separate public address (203.0.113.3), so if a guest misbehaves, our main address keeps its good reputation. Each guest is rate-limited to 10 Mbit/s so a visitor's video call can't starve the office.",
        pkts: [
          { label: "After NAT", layers: [["L3", "10.50.1.88 ⇒ 203.0.113.3 → 192.0.2.80"], ["L4", "TCP 51200 → 443"], ["CHK", "Guest → Outside web allow · shaped 10 Mbit/s"]] }
        ] }
    ]
  }
];

/* ------------------------------------------------------------------ */
/* OSI layers                                                          */
/* ------------------------------------------------------------------ */
NET.layers = [
  { n: 7, name: "Application", tcpip: "Application", pdu: "Data", addr: "Names, URLs, mailboxes",
    what: "The protocols applications speak to each other: fetching a web page, resolving a name, sending mail, logging on.",
    protocols: "HTTP, DNS, SMTP, IMAP, LDAP, Kerberos, SMB, SSH, SNMP, DHCP, NTP, RADIUS",
    devices: "Servers, proxies, WAFs, mail gateways, NGFW app inspection",
    nodes: ["proxy", "waf", "mail-gw", "dc", "exchange"],
    debug: "`nslookup`, `dig`, `curl -v`, browser developer tools" },
  { n: 6, name: "Presentation", tcpip: "Application", pdu: "Data", addr: "—",
    what: "How data is represented: character encoding, compression, serialization and, in most teaching models, encryption.",
    protocols: "TLS (often placed here), MIME, JSON, ASN.1, UTF-8",
    devices: "TLS-terminating proxies and load balancers",
    nodes: ["waf", "proxy", "ca"],
    debug: "`openssl s_client`, checking certificate chains" },
  { n: 5, name: "Session", tcpip: "Application", pdu: "Data", addr: "Session IDs",
    what: "Setting up, maintaining and tearing down conversations between applications. In practice it's blended into the application and TLS.",
    protocols: "RPC, NetBIOS sessions, SMB sessions, TLS session resumption, SOCKS",
    devices: "—",
    nodes: ["file", "dc"],
    debug: "Application logs, session timeouts" },
  { n: 4, name: "Transport", tcpip: "Transport", pdu: "Segment (TCP) / Datagram (UDP)", addr: "Port numbers",
    what: "Gets data between the right two applications on two hosts: ports, reliability (TCP) or speed (UDP), flow control.",
    protocols: "TCP, UDP, QUIC",
    devices: "Stateful firewalls, L4 load balancers, NAT (port translation)",
    nodes: ["fw", "waf"],
    debug: "`Test-NetConnection -Port`, `nc -vz`, `ss -tan`, `netstat -an`" },
  { n: 3, name: "Network", tcpip: "Internet", pdu: "Packet", addr: "IP addresses",
    what: "Moves packets between networks: addressing, routing, fragmentation, TTL.",
    protocols: "IPv4, IPv6, ICMP, IPsec, OSPF, BGP",
    devices: "Routers, layer-3 switches, firewalls",
    nodes: ["edge", "core", "fw", "isp"],
    debug: "`ping`, `traceroute`/`tracert`, `route print`, `ip route`" },
  { n: 2, name: "Data link", tcpip: "Link", pdu: "Frame", addr: "MAC addresses",
    what: "Moves frames between devices on the same local segment: MAC addressing, VLAN tags, error detection.",
    protocols: "Ethernet (802.3), Wi-Fi (802.11), 802.1Q VLANs, ARP, STP, 802.1X, LLDP",
    devices: "Switches, access points, network cards",
    nodes: ["access-sw", "server-sw", "ap", "dmz-sw"],
    debug: "`arp -a`, `show mac address-table`, `show vlan`" },
  { n: 1, name: "Physical", tcpip: "Link", pdu: "Bits", addr: "—",
    what: "Signals on the medium: voltages on copper, light in fibre, radio waves. Connectors, cables, speed and duplex.",
    protocols: "1000BASE-T, 10GBASE-SR, 802.11 radio, PoE (802.3af/at/bt)",
    devices: "Cables, transceivers, patch panels, repeaters, the radios in APs",
    nodes: ["ap", "laptop"],
    debug: "Link lights, cable testers, interface error counters. Is it plugged in?" }
];

/* Encapsulation of one real packet: the laptop's CONNECT to the proxy */
NET.encap = [
  { id: "pre", name: "Preamble", bytes: 8, layer: 1, fields: [["Preamble + SFD", "10101010 ×7 + 10101011"], ["Purpose", "Lets the receiver lock on to the signal"]] },
  { id: "eth", name: "Ethernet", bytes: 14, layer: 2, fields: [["Destination MAC", "00:1c:73:aa:10:01 (gateway SVI)"], ["Source MAC", "3c:52:82:1a:9f:04 (laptop)"], ["EtherType", "0x0800 (IPv4)"]] },
  { id: "vlan", name: "802.1Q", bytes: 4, layer: 2, fields: [["TPID", "0x8100"], ["Priority (PCP)", "0"], ["VLAN ID", "10 (added on the trunk between access and core)"]] },
  { id: "ip", name: "IPv4", bytes: 20, layer: 3, fields: [["Source", "10.10.1.57"], ["Destination", "172.16.110.10"], ["TTL", "128"], ["Protocol", "6 (TCP)"], ["DSCP", "0 (best effort)"]] },
  { id: "tcp", name: "TCP", bytes: 20, layer: 4, fields: [["Source port", "52811 (ephemeral)"], ["Destination port", "8080 (proxy)"], ["Flags", "PSH, ACK"], ["Sequence", "1 (relative)"], ["Window", "64240"]] },
  { id: "tls", name: "TLS record", bytes: 5, layer: 6, fields: [["Content type", "23 (application data)"], ["Version", "0x0303"], ["Length", "517"], ["Note", "Inside the CONNECT tunnel, the browser's TLS session with the website"]] },
  { id: "data", name: "HTTP data", bytes: 512, layer: 7, fields: [["Request", "CONNECT www.example.com:443 HTTP/1.1"], ["Host", "www.example.com:443"], ["Proxy-Authorization", "Negotiate YIIGhgYJKoZIhvcSAQIC…"]] },
  { id: "fcs", name: "FCS", bytes: 4, layer: 2, fields: [["Frame check sequence", "CRC-32 0x5D3A91C2"], ["Purpose", "The receiver drops frames whose checksum doesn't match"]] }
];

/* ------------------------------------------------------------------ */
/* Address plan                                                        */
/* ------------------------------------------------------------------ */
NET.plan = [
  { vlan: "10",  name: "Users",          cidr: "10.10.0.0/22",    gw: "10.10.0.1 (core)",  zone: "users",   use: "Wired desks and corporate Wi-Fi" },
  { vlan: "20",  name: "Servers",        cidr: "10.20.0.0/24",    gw: "10.20.0.1 (core)",  zone: "servers", use: "DC, DHCP, CA, files, mail, SIEM" },
  { vlan: "30",  name: "Voice",          cidr: "10.30.0.0/23",    gw: "10.30.0.1 (core)",  zone: "users",   use: "IP phones, QoS-marked" },
  { vlan: "50",  name: "Guest",          cidr: "10.50.0.0/22",    gw: "10.50.0.1 (firewall)", zone: "guest", use: "Visitors, Internet only" },
  { vlan: "99",  name: "Management",     cidr: "10.99.0.0/24",    gw: "10.99.0.1 (core)",  zone: "mgmt",    use: "Device management, jump host" },
  { vlan: "100", name: "DMZ",            cidr: "172.16.100.0/24", gw: "172.16.100.1 (firewall)", zone: "dmz", use: "Internet-facing servers" },
  { vlan: "110", name: "Edge services",  cidr: "172.16.110.0/24", gw: "172.16.110.1 (firewall)", zone: "edge", use: "Proxy, VPN gateway" },
  { vlan: "—",   name: "VPN pool",       cidr: "10.200.0.0/22",   gw: "VPN gateway",       zone: "edge",    use: "Remote-access clients" },
  { vlan: "—",   name: "Core ↔ firewall", cidr: "10.255.0.0/30",  gw: "point-to-point",    zone: "core",    use: "Transit link, 2 usable" },
  { vlan: "—",   name: "Public block",   cidr: "203.0.113.0/28",  gw: "203.0.113.1 (edge)", zone: "inet",   use: "NAT and published services" }
];

/* ------------------------------------------------------------------ */
/* Ports reference                                                     */
/* ------------------------------------------------------------------ */
NET.ports = [
  ["20–21", "TCP", "FTP", "Legacy file transfer, cleartext. Replace with SFTP.", [], "legacy"],
  ["22", "TCP", "SSH / SFTP", "Remote admin of network gear and Linux. Only from the jump host.", ["jump"], ""],
  ["23", "TCP", "Telnet", "Cleartext admin. Should be disabled everywhere.", [], "risky"],
  ["25", "TCP", "SMTP", "Server-to-server mail relay.", ["mail-gw", "exchange"], ""],
  ["49", "TCP", "TACACS+", "Admin authentication and command accounting for network devices.", ["nps"], ""],
  ["53", "UDP/TCP", "DNS", "Name resolution. TCP for large answers and zone transfers.", ["dc", "ext-dns"], ""],
  ["67–68", "UDP", "DHCP", "Server 67, client 68. Relayed across VLANs.", ["dhcp"], ""],
  ["69", "UDP", "TFTP", "Boot images and phone configs. Unauthenticated.", [], "legacy"],
  ["80", "TCP", "HTTP", "Cleartext web, CRL/OCSP, ACME challenges, redirects to 443.", ["website", "ca"], ""],
  ["88", "TCP/UDP", "Kerberos", "AD logon and service tickets.", ["dc"], ""],
  ["110 / 995", "TCP", "POP3 / POP3S", "Legacy mail retrieval.", [], "legacy"],
  ["123", "UDP", "NTP", "Time sync. Kerberos needs it.", ["dc"], ""],
  ["135", "TCP", "MS-RPC endpoint mapper", "Windows management and AD replication, plus dynamic high ports.", ["dc"], "risky"],
  ["137–139", "UDP/TCP", "NetBIOS", "Legacy Windows name and session services. Disable where possible.", [], "legacy"],
  ["143 / 993", "TCP", "IMAP / IMAPS", "Mail client access. Use 993 (TLS).", ["exchange"], ""],
  ["161 / 162", "UDP", "SNMP / traps", "Device monitoring. Use v3.", ["nms"], ""],
  ["179", "TCP", "BGP", "Routing between ISPs and autonomous systems.", ["edge", "isp"], ""],
  ["389 / 636", "TCP", "LDAP / LDAPS", "Directory queries against AD.", ["dc"], ""],
  ["443", "TCP/UDP", "HTTPS / QUIC", "Web, APIs, SSL VPN, cloud everything.", ["website", "waf", "exchange", "app"], ""],
  ["445", "TCP", "SMB", "File shares and SYSVOL. Never expose to the Internet.", ["file", "dc"], "risky"],
  ["464", "TCP/UDP", "Kerberos kpasswd", "Password changes.", ["dc"], ""],
  ["465 / 587", "TCP", "SMTP submission", "Authenticated client mail sending.", ["exchange"], ""],
  ["500 / 4500", "UDP", "IKE / IPsec NAT-T", "IPsec VPN negotiation and tunnelled traffic.", ["vpn"], ""],
  ["514 / 6514", "UDP/TCP", "Syslog / syslog-TLS", "Log forwarding to SIEM and NMS.", ["siem", "nms"], ""],
  ["546–547", "UDP", "DHCPv6", "IPv6 address and option assignment.", [], ""],
  ["853", "TCP", "DNS over TLS", "Encrypted DNS.", [], ""],
  ["1194", "UDP", "OpenVPN", "Open-source VPN.", [], ""],
  ["1433", "TCP", "Microsoft SQL", "Database. Keep internal.", ["app"], "risky"],
  ["1812 / 1813", "UDP", "RADIUS", "802.1X, Wi-Fi and VPN authentication / accounting.", ["nps"], ""],
  ["2055", "UDP", "NetFlow", "Traffic flow records to the collector.", ["nms"], ""],
  ["3128 / 8080", "TCP", "Web proxy", "Explicit forward proxy.", ["proxy"], ""],
  ["3268 / 3269", "TCP", "Global Catalog", "Forest-wide AD searches.", ["dc"], ""],
  ["3306 / 5432", "TCP", "MySQL / PostgreSQL", "Databases. Keep internal.", ["app"], "risky"],
  ["3389", "TCP/UDP", "RDP", "Remote desktop. Never expose to the Internet; via jump host or VPN only.", ["jump"], "risky"],
  ["3799", "UDP", "RADIUS CoA", "Change of Authorization: re-auth or quarantine a port.", ["nps"], ""],
  ["5060 / 5061", "UDP/TCP", "SIP / SIPS", "VoIP call signalling.", ["phone"], ""],
  ["5246–5247", "UDP", "CAPWAP", "AP to wireless controller tunnels.", ["ap"], ""],
  ["5985 / 5986", "TCP", "WinRM", "PowerShell remoting.", [], ""],
  ["9100", "TCP", "Raw printing", "JetDirect print jobs.", ["printer"], ""],
  ["16384–32767", "UDP", "RTP", "Voice and video media streams.", ["phone"], ""],
  ["49152–65535", "TCP/UDP", "Ephemeral", "Client source ports picked per connection (Windows range).", ["laptop"], ""],
  ["51820", "UDP", "WireGuard", "Modern lightweight VPN.", [], ""]
];

/* ------------------------------------------------------------------ */
/* Quiz                                                                */
/* ------------------------------------------------------------------ */
NET.quiz = [
  { q: "A laptop shows the address 169.254.23.9. Which service most likely failed?",
    a: ["DNS", "DHCP", "NTP", "The proxy"], c: 1,
    why: "169.254.0.0/16 is link-local. Windows gives itself one when no DHCP server answers. Check the DHCP server, the scope, and the relay (ip helper-address) on the VLAN's gateway." },
  { q: "Users can open \\\\10.20.0.13 but not \\\\files01. What's broken?",
    a: ["SMB", "Routing between VLANs", "DNS", "The firewall"], c: 2,
    why: "Reaching it by IP proves routing, firewall and SMB all work. Only the name lookup is failing, so DNS is the culprit." },
  { q: "Which of these can stop an exploit in real time, before it reaches the server?",
    a: ["An IDS on a SPAN port", "An inline IPS", "The SIEM", "An SNMP monitor"], c: 1,
    why: "Only an inline device sees packets before they're forwarded, so only the IPS can drop them. An IDS receives a copy and can only alert." },
  { q: "One laptop's logons fail with \"clock skew too great\". Which service do you check?",
    a: ["NTP", "DHCP", "RADIUS", "SMTP"], c: 0,
    why: "Kerberos rejects tickets if clocks differ by more than 5 minutes. The laptop isn't syncing time from the domain." },
  { q: "10.10.1.57 and 10.10.3.200 are both in 10.10.0.0/22. Do they need a router to talk?",
    a: ["Yes, they're in different /24s", "No, they're in the same subnet", "Only if they're in different VLANs", "Only for TCP"], c: 1,
    why: "A /22 spans 10.10.0.0 to 10.10.3.255, so both are in the same subnet and talk directly at layer 2 after an ARP." },
  { q: "Which DNS record tells other mail servers where to deliver email for your domain?",
    a: ["A", "PTR", "MX", "SRV"], c: 2,
    why: "MX records name the mail servers for a domain, with a preference number. A records then give their addresses." },
  { q: "Why doesn't the firewall need an inbound rule for a website's reply?",
    a: ["Replies use UDP", "It's stateful and matches the reply to the outbound connection", "The proxy opens a port", "NAT disables filtering"], c: 1,
    why: "A stateful firewall records each allowed connection in its state table and automatically allows packets that belong to it." },
  { q: "A brand-new laptop that isn't domain-joined gets certificate warnings only on internal sites. Why?",
    a: ["Its clock is wrong", "It doesn't trust the internal root CA", "Internal sites use HTTP", "DNS is broken"], c: 1,
    why: "Internal certificates chain to Meridian's private root CA. Domain machines receive that root through Group Policy; this laptop doesn't have it." },
  { q: "How does a DHCP Discover broadcast in VLAN 10 reach a DHCP server in VLAN 20?",
    a: ["Broadcasts cross VLANs automatically", "The trunk forwards it", "A DHCP relay on the gateway forwards it as unicast", "The client already knows the server's IP"], c: 2,
    why: "Routers don't forward broadcasts. The VLAN's gateway runs a DHCP relay (ip helper-address) that forwards the request to the server and fills in giaddr so the right scope is used." },
  { q: "Which prefix gives exactly 62 usable host addresses?",
    a: ["/25", "/26", "/27", "/28"], c: 1,
    why: "A /26 has 2^6 = 64 addresses, minus the network and broadcast addresses = 62 hosts." },
  { q: "Why is the mail gateway in the DMZ rather than the server VLAN?",
    a: ["SMTP doesn't work in VLANs", "So a compromise of an Internet-facing server doesn't land the attacker inside", "DMZs are faster", "So it can use public DNS"], c: 1,
    why: "Anything that accepts connections from the Internet is the most likely thing to be compromised. The DMZ limits it to a few narrow rules inward." },
  { q: "A RADIUS server tells a switch to move a port into another VLAN mid-session. What is that called?",
    a: ["Change of Authorization (CoA)", "Spanning Tree", "VLAN hopping", "DHCP relay"], c: 0,
    why: "RADIUS CoA (UDP 3799) lets NAC re-authenticate, re-VLAN or shut a port at any time. It's how automatic quarantine works." }
];

/* ------------------------------------------------------------------ */
/* Live traffic: the standing data flows of a normal working day.      */
/* Each path is a list of node ids that follows drawn links.           */
/* reply: replies flow back (hollow dots). dropped: stopped at the end. */
/* ------------------------------------------------------------------ */
NET.flowCats = [
  { id: "naming",   name: "Names, addresses & time" },
  { id: "identity", name: "Identity & access" },
  { id: "web",      name: "Web" },
  { id: "mail",     name: "Email" },
  { id: "apps",     name: "Files, apps & voice" },
  { id: "sec",      name: "Security & monitoring" },
  { id: "admin",    name: "Remote access & admin" },
  { id: "denied",   name: "Denied traffic" }
];

NET.flows = [
  /* names, addresses & time */
  { id: "dns-int", cat: "naming", name: "Internal DNS lookups", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "dc"], ["proxy", "es-sw", "fw", "core", "server-sw", "dc"]],
    proto: "UDP 53 (TCP 53 for large answers)", from: "Every client and server", to: "Domain controller (DNS)", starts: "The client",
    rule: "Core ACL and firewall: internal zones → 10.20.0.10 udp/tcp 53",
    why: "Every connection starts with a name. Clients ask internal DNS for internal names such as dc01, files01 and proxy, and through it for Internet names too.",
    fail: "Almost everything looks broken even though the network is fine. Access by IP address still works.",
    concept: "dns", journey: "join" },
  { id: "dns-out", cat: "naming", name: "Recursive DNS to the Internet", reply: true,
    paths: [["dc", "server-sw", "core", "fw", "ips", "edge", "isp", "root-dns"]],
    proto: "UDP/TCP 53", from: "Domain controller", to: "Root, TLD and authoritative name servers", starts: "The DC, acting as resolver",
    rule: "Firewall: DCs → Outside udp/tcp 53 allow. Nothing else inside may use port 53 outbound.",
    why: "When an answer isn't cached, the DC walks the DNS tree from the root. Only the DCs may query the Internet, so malware can't quietly use its own resolver.",
    fail: "Internal names still work; every Internet name fails.",
    concept: "dns", journey: "browse" },
  { id: "dns-pub", cat: "naming", name: "Public lookups of our domain", reply: true,
    paths: [["remote", "isp", "edge", "ips", "fw", "dmz-sw", "ext-dns"], ["remote-mail", "isp", "edge", "ips", "fw", "dmz-sw", "ext-dns"]],
    proto: "UDP/TCP 53 (DNAT 203.0.113.7)", from: "Resolvers anywhere on the Internet", to: "Public DNS in the DMZ", starts: "Remote resolvers",
    rule: "Firewall: any → 203.0.113.7 udp/tcp 53 allow",
    why: "This is how the world finds www, mail and vpn.meridian.example, plus our MX, SPF, DKIM and DMARC records.",
    fail: "Nobody can find our website, VPN or mail server. Inbound email stops.",
    concept: "dns", journey: "mail" },
  { id: "dhcp", cat: "naming", name: "DHCP leases", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "dhcp"], ["phone", "access-sw", "core", "server-sw", "dhcp"]],
    proto: "UDP 67/68, relayed by the core", from: "Laptops, phones, printers", to: "DHCP server", starts: "A client broadcast, relayed as unicast by the core",
    rule: "Core: `ip helper-address 10.20.0.11` on each user VLAN interface",
    why: "Devices get their address, gateway and DNS servers, then renew at half the lease time.",
    fail: "New devices give themselves 169.254.x.x addresses and can't reach anything.",
    concept: "dhcp", journey: "join" },
  { id: "ntp", cat: "naming", name: "Time sync", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "dc"], ["dc", "server-sw", "core", "fw", "ips", "edge", "isp"]],
    proto: "UDP 123", from: "Domain machines; the DC itself", to: "The DC; Internet time servers", starts: "The client",
    rule: "Firewall: DC → Outside udp 123 allow",
    why: "Kerberos, certificate validity and log correlation all need clocks that agree to within seconds.",
    fail: "Clocks drift. Once they are five minutes apart, logons fail.",
    concept: "ntp" },

  /* identity */
  { id: "kerberos", cat: "identity", name: "Logons & Group Policy", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "dc"]],
    proto: "Kerberos 88, LDAP 389, SMB 445 (SYSVOL), RPC 135", from: "Domain-joined laptops and servers", to: "Domain controller", starts: "The client",
    rule: "Core ACL: Users → DCs on the Active Directory ports",
    why: "Logons, service tickets for every server, group lookups and policy downloads.",
    fail: "No logons beyond cached credentials, no drive mappings, no policy updates.",
    concept: "ad", journey: "join" },
  { id: "radius", cat: "identity", name: "802.1X authentication", reply: true,
    paths: [["access-sw", "core", "server-sw", "nps"], ["ap", "access-sw", "core", "server-sw", "nps"]],
    proto: "RADIUS UDP 1812/1813, CoA UDP 3799", from: "Switches and access points", to: "NPS (RADIUS)", starts: "The network device, on behalf of a user or machine",
    rule: "Management VLAN → NPS udp 1812–1813",
    why: "Every port and Wi-Fi connection is authenticated before it is given a VLAN.",
    fail: "Nobody new can connect, unless a fail-open \"critical VLAN\" is configured.",
    concept: "nac", journey: "join" },
  { id: "nps-ad", cat: "identity", name: "NAC checks the directory", reply: true,
    paths: [["nps", "server-sw", "dc"]],
    proto: "LDAP 389, Kerberos 88", from: "NPS", to: "Domain controller", starts: "NPS",
    rule: "Same VLAN: no router or firewall in between",
    why: "NPS confirms the computer or user exists, is enabled, and is in the right group.",
    fail: "Every 802.1X authentication fails.",
    concept: "nac" },
  { id: "certs", cat: "identity", name: "Certificate enrollment & revocation", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "ca"]],
    proto: "RPC/DCOM (enrollment), HTTP 80 (CRL and OCSP)", from: "Domain machines", to: "Issuing CA", starts: "The client (auto-enrollment)",
    rule: "Core ACL: Users → CA tcp 135, 80 and dynamic RPC",
    why: "Machines get and renew certificates for 802.1X, VPN and internal HTTPS, and check revocation lists.",
    fail: "Nothing happens at first. Weeks later certificates expire, and 802.1X, VPN and internal HTTPS start failing.",
    concept: "ca" },
  { id: "sso", cat: "identity", name: "Cloud sign-in (SSO + MFA)", reply: true,
    paths: [["laptop", "access-sw", "core", "fw", "es-sw", "proxy", "es-sw", "fw", "ips", "edge", "isp", "saas"], ["remote", "isp", "saas"]],
    proto: "HTTPS 443 (SAML / OpenID Connect)", from: "Users' browsers", to: "Cloud identity provider", starts: "The browser, redirected by an app",
    rule: "Proxy: identity providers allowed and exempt from TLS inspection",
    why: "One sign-in with MFA unlocks every SaaS app and the VPN.",
    fail: "SaaS apps and VPN sign-in fail. Existing sessions last until their tokens expire.",
    concept: "mfa", journey: "vpn" },

  /* web */
  { id: "web-proxy", cat: "web", name: "Browsing via the proxy", reply: true,
    paths: [["laptop", "access-sw", "core", "fw", "es-sw", "proxy"]],
    proto: "TCP 8080 (HTTP CONNECT)", from: "Users", to: "Web proxy", starts: "The browser",
    rule: "Firewall: Users → proxy tcp 8080 allow. Users → Outside 80/443 deny.",
    why: "All web traffic is funnelled through one place for policy, logging and malware scanning.",
    fail: "Users say \"the Internet is down\" while email and servers work fine.",
    concept: "proxy", journey: "browse" },
  { id: "web-out", cat: "web", name: "Proxy to websites", reply: true,
    paths: [["proxy", "es-sw", "fw", "ips", "edge", "isp", "website"]],
    proto: "TCP 443/80, source NAT to 203.0.113.2", from: "Web proxy", to: "Internet websites", starts: "The proxy",
    rule: "Firewall: proxy → Outside tcp 80/443 allow, PAT to 203.0.113.2",
    why: "The proxy fetches pages on behalf of users.",
    fail: "Nobody inside can reach the web.",
    concept: "proxy", journey: "browse" },
  { id: "web-in", cat: "web", name: "Customers to our website", reply: true,
    paths: [["remote", "isp", "edge", "ips", "fw", "dmz-sw", "waf"]],
    proto: "TCP 443 (DNAT 203.0.113.5 → WAF)", from: "Customers on the Internet", to: "Reverse proxy / WAF", starts: "The customer's browser",
    rule: "Firewall: any → 203.0.113.5 tcp 443 allow",
    why: "The only inbound web flow. TLS ends at the WAF, which inspects every request.",
    fail: "The public website is offline.",
    concept: "waf", journey: "public" },
  { id: "waf-web", cat: "web", name: "WAF to web servers", reply: true,
    paths: [["waf", "dmz-sw", "web"]],
    proto: "TCP 8443 (re-encrypted)", from: "WAF", to: "Web servers", starts: "The WAF",
    rule: "DMZ private VLAN: WAF ↔ web servers only",
    why: "Clean requests are load-balanced across healthy web servers.",
    fail: "Customers see 502 or 503 errors.",
    concept: "waf", journey: "public" },
  { id: "guest-web", cat: "web", name: "Guest Internet", reply: true,
    paths: [["guest", "ap", "access-sw", "core", "fw", "ips", "edge", "isp", "website"]],
    proto: "TCP/UDP 443, NAT to 203.0.113.3", from: "Guest devices", to: "The Internet", starts: "The guest",
    rule: "Firewall: Guest → Outside web allow, shaped to 10 Mbit/s per client",
    why: "Visitors get the Internet and nothing else. VLAN 50 is carried untouched to the firewall.",
    fail: "Guests have no Internet.",
    concept: "wifi", journey: "guest" },

  /* email */
  { id: "smtp-in", cat: "mail", name: "Inbound mail", reply: true,
    paths: [["remote-mail", "isp", "edge", "ips", "fw", "dmz-sw", "mail-gw"]],
    proto: "SMTP TCP 25 with STARTTLS", from: "Other organisations' mail servers", to: "Mail gateway (DMZ)", starts: "The sending server",
    rule: "Firewall: any → 203.0.113.6 tcp 25 allow",
    why: "Mail from the Internet lands on the gateway to be filtered before it gets anywhere near a mailbox.",
    fail: "Inbound mail queues at the senders and bounces after a few days.",
    concept: "smtp", journey: "mail" },
  { id: "smtp-relay", cat: "mail", name: "Gateway ↔ Exchange", reply: true,
    paths: [["mail-gw", "dmz-sw", "fw", "core", "server-sw", "exchange"]],
    proto: "SMTP TCP 25", from: "Mail gateway", to: "Exchange (and back)", starts: "Either side",
    rule: "Firewall: 172.16.100.25 ↔ 10.20.0.14 tcp 25, the only DMZ ↔ inside mail rule",
    why: "Clean mail goes in. Outbound mail comes back out to be DKIM-signed and sent.",
    fail: "Mail stalls between the DMZ and the mailboxes.",
    concept: "smtp", journey: "mail" },
  { id: "mapi", cat: "mail", name: "Outlook to Exchange", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "exchange"]],
    proto: "HTTPS 443 (MAPI over HTTP)", from: "Users", to: "Exchange", starts: "Outlook",
    rule: "Core ACL: Users → Exchange tcp 443",
    why: "Mailboxes, calendars and contacts.",
    fail: "Outlook shows \"Disconnected\".",
    concept: "smtp", journey: "mail" },

  /* files, apps & voice */
  { id: "smb", cat: "apps", name: "File shares", reply: true,
    paths: [["laptop", "access-sw", "core", "server-sw", "file"]],
    proto: "SMB 3, TCP 445", from: "Users", to: "File server", starts: "The client",
    rule: "Core ACL: Users → files01 tcp 445",
    why: "Home drives and department shares. Routed between VLANs by the core switch.",
    fail: "Mapped drives show a red cross.",
    concept: "file", journey: "join" },
  { id: "web-api", cat: "apps", name: "Website to internal API", reply: true,
    paths: [["web", "dmz-sw", "fw", "core", "server-sw", "app"]],
    proto: "HTTPS 443", from: "Web server (DMZ)", to: "Internal API", starts: "The web server",
    rule: "Firewall: DMZ web → 10.20.0.17 tcp 443 allow, the only DMZ → inside web rule",
    why: "Shipment-tracking data comes from the internal app. The rule is narrow by design.",
    fail: "The website loads, but tracking lookups fail.",
    concept: "dmz", journey: "public" },
  { id: "print", cat: "apps", name: "Printing (same VLAN)", reply: true,
    paths: [["laptop", "access-sw", "printer"]],
    proto: "TCP 9100 or IPP 631", from: "Users", to: "Printer", starts: "The laptop",
    rule: "None needed: same VLAN and subnet, switched at layer 2",
    why: "The laptop and the printer share a subnet, so frames go straight through the access switch. No router, no firewall.",
    fail: "Print jobs sit in the queue.",
    concept: "switch" },
  { id: "voice", cat: "apps", name: "Phone calls (SIP trunk)", reply: true,
    paths: [["phone", "access-sw", "core", "fw", "ips", "edge", "isp"]],
    proto: "SIP TLS 5061, RTP UDP 16384–32767", from: "IP phones", to: "SIP provider via the ISP", starts: "Either side",
    rule: "Firewall: Voice VLAN ↔ SIP provider. DSCP EF priority end to end.",
    why: "Voice uses little bandwidth but is very sensitive to delay, so it is marked for priority queues.",
    fail: "No outside calls, or one-way audio if only the RTP media is blocked.",
    concept: "qos" },

  /* security & monitoring */
  { id: "syslog", cat: "sec", name: "Logs to the SIEM", reply: false,
    paths: [["fw", "core", "server-sw", "siem"], ["proxy", "es-sw", "fw", "core", "server-sw", "siem"], ["dc", "server-sw", "siem"], ["mail-gw", "dmz-sw", "fw", "core", "server-sw", "siem"], ["ids", "core", "server-sw", "siem"]],
    proto: "Syslog over TLS, TCP 6514; agents over HTTPS", from: "Firewall, proxy, DCs, mail gateway, IDS", to: "SIEM", starts: "Each source (one-way)",
    rule: "Firewall: all zones → SIEM tcp 6514 allow",
    why: "Every device reports what it allowed, denied and noticed. It's one-way: the SIEM never needs to reply.",
    fail: "The security team goes blind and attacks go unnoticed.",
    concept: "siem", journey: "malware" },
  { id: "span", cat: "sec", name: "Traffic copy to the IDS", reply: false,
    paths: [["core", "ids"]],
    proto: "SPAN mirror port, raw frames", from: "Core switch", to: "IDS sensor", starts: "The switch, as a copy",
    rule: "`monitor session 1 source vlan 10,20 destination Te1/0/48`",
    why: "A copy of internal traffic, so the IDS can spot lateral movement the perimeter never sees.",
    fail: "East-west attacks go unseen.",
    concept: "ids", journey: "malware" },
  { id: "snmp", cat: "sec", name: "Monitoring polls", reply: true,
    paths: [["nms", "mgmt-sw", "core", "access-sw"], ["nms", "mgmt-sw", "core", "fw"], ["nms", "mgmt-sw", "core", "server-sw"]],
    proto: "SNMPv3 UDP 161, NetFlow UDP 2055", from: "Monitoring server", to: "Every switch, router and firewall", starts: "The monitoring server",
    rule: "Device management interfaces accept SNMP only from 10.99.0.20",
    why: "Up/down state, interface errors, bandwidth and temperatures, every minute.",
    fail: "Outages are discovered by users instead of by the on-call engineer.",
    concept: "nms" },

  /* remote access & admin */
  { id: "vpn", cat: "admin", name: "VPN tunnels", reply: true,
    paths: [["remote", "isp", "edge", "ips", "fw", "es-sw", "vpn"], ["vpn", "es-sw", "fw", "core", "server-sw", "file"]],
    proto: "IPsec UDP 4500 outside; ordinary traffic once inside", from: "Remote workers", to: "VPN gateway, then internal servers", starts: "The VPN client",
    rule: "Firewall: any → 203.0.113.8 udp 500/4500. VPN pool → file and app servers only.",
    why: "An encrypted tunnel from home. Decrypted traffic continues inside under its own firewall rules.",
    fail: "Remote workers are cut off from internal systems.",
    concept: "vpn", journey: "vpn" },
  { id: "admin", cat: "admin", name: "Admin sessions from the jump host", reply: true,
    paths: [["jump", "mgmt-sw", "core", "access-sw"], ["jump", "mgmt-sw", "core", "fw"], ["jump", "mgmt-sw", "core", "server-sw", "dc"]],
    proto: "SSH 22, HTTPS 443, RDP 3389", from: "Jump host", to: "Switches, firewall, servers", starts: "An administrator",
    rule: "Management interfaces accept connections only from 10.99.0.10",
    why: "All administration comes from one hardened, recorded host.",
    fail: "Admins can't make changes. That's what an out-of-band console line is for.",
    concept: "jump" },

  /* denied */
  { id: "scan", cat: "denied", name: "Internet scans", dropped: true,
    paths: [["attacker", "isp", "edge", "ips"]],
    proto: "TCP SYN to 22, 445, 3389, 8443…", from: "Scanners and attackers", to: "Our public addresses", starts: "The attacker",
    rule: "IPS: scan and exploit signatures → drop and block the source. Firewall default deny behind it.",
    why: "Constant background noise that hits every public address on the Internet.",
    fail: "Dropped at the IPS. Anything that slipped past would still hit the firewall's default deny.",
    concept: "ips", journey: "public" },
  { id: "c2", cat: "denied", name: "Users straight to the Internet", dropped: true,
    paths: [["laptop", "access-sw", "core", "fw"]],
    proto: "TCP 443 direct, bypassing the proxy", from: "Laptops (or malware on them)", to: "Anywhere on the Internet", starts: "An app or malware ignoring the proxy",
    rule: "Firewall: Users → Outside 80/443 deny",
    why: "This forces web traffic through the proxy and stops most malware calling home directly.",
    fail: "Dropped and logged by the firewall. A burst of these from one laptop is a classic SIEM alert.",
    concept: "firewall", journey: "malware" },
  { id: "guest-deny", cat: "denied", name: "Guests → internal network", dropped: true,
    paths: [["guest", "ap", "access-sw", "core", "fw"]],
    proto: "Anything", from: "Guest devices", to: "Internal VLANs", starts: "The guest",
    rule: "Firewall: Guest → Inside deny all",
    why: "Guests are untrusted. Because the firewall is their gateway, it sees and blocks every attempt.",
    fail: "Dropped at the firewall.",
    concept: "firewall", journey: "guest" }
];

/* ------------------------------------------------------------------ */
/* Service dependencies. Rows: 0 user-facing … 4 foundation.           */
/* deps: what this service needs to work. down: what users experience. */
/* ------------------------------------------------------------------ */
NET.depRows = ["What users notice", "Platform services", "Identity & policy", "Core services", "Foundation"];

NET.deps = [
  { id: "access", name: "Network access", sub: "wired + Wi-Fi", row: 0, x: 235, deps: ["nac", "dhcp"], concept: "nac", node: "access-sw", flows: ["dhcp", "radius"],
    what: "Getting a laptop or phone onto a switch port or Wi-Fi network with a working address.",
    down: "Laptops and phones can't join the network at all." },
  { id: "browsing", name: "Web browsing", sub: "users → Internet", row: 0, x: 395, deps: ["proxy", "dns"], concept: "http", node: "laptop", flows: ["web-proxy", "web-out"],
    what: "Users reaching websites and SaaS apps.",
    down: "Websites won't load. The help desk hears \"the Internet is down\"." },
  { id: "files", name: "File shares", sub: "SMB", row: 0, x: 555, deps: ["ad", "dns"], concept: "file", node: "file", flows: ["smb"],
    what: "Mapped drives and department folders.",
    down: "Mapped drives disconnect: \"network path not found\" or \"access denied\"." },
  { id: "email", name: "Email", sub: "in, out, Outlook", row: 0, x: 715, deps: ["ad", "ca", "fw", "dns", "isp"], concept: "smtp", node: "exchange", flows: ["smtp-in", "smtp-relay", "mapi"],
    what: "Sending, receiving and reading mail.",
    down: "Mail stops flowing. Senders queue it and retry for a few days before bouncing." },
  { id: "vpn", name: "Remote access", sub: "VPN", row: 0, x: 875, deps: ["idp", "ca", "fw", "isp"], concept: "vpn", node: "vpn", flows: ["vpn", "sso"],
    what: "Home workers reaching internal systems.",
    down: "Remote workers can't connect to anything internal." },
  { id: "website", name: "Public website", sub: "customers", row: 0, x: 1035, deps: ["fw", "dns", "isp"], concept: "waf", node: "waf", flows: ["web-in", "waf-web", "web-api", "dns-pub"],
    what: "Customers tracking shipments on www.meridian.example.",
    down: "Customers can't reach the site, and the phones start ringing." },
  { id: "siem", name: "Security monitoring", sub: "SIEM", row: 0, x: 1195, deps: ["ntp", "fw"], concept: "siem", node: "siem", flows: ["syslog", "span"],
    what: "Collecting logs and alerts so attacks get noticed.",
    down: "The security team goes blind. Logs arrive late, out of order, or not at all." },

  { id: "nac", name: "RADIUS / NAC", sub: "802.1X", row: 1, x: 280, deps: ["ad", "ca"], concept: "nac", node: "nps", flows: ["radius", "nps-ad"],
    what: "Deciding who and what may connect, and which VLAN they get.",
    down: "No new 802.1X or Wi-Fi authentications succeed, unless ports fail open into a critical VLAN." },
  { id: "ca", name: "Certificates", sub: "internal CA", row: 1, x: 520, deps: ["ad"], concept: "ca", node: "ca", flows: ["certs"],
    what: "Issuing and revoking the certificates that prove identity for machines, servers and users.",
    down: "Existing certificates keep working, but new devices can't enroll and revocation checks eventually fail." },
  { id: "proxy", name: "Web proxy", sub: "secure web gateway", row: 1, x: 760, deps: ["dns", "ad", "fw", "isp"], concept: "proxy", node: "proxy", flows: ["web-proxy", "web-out"],
    what: "Fetching the web on users' behalf, with policy and logging.",
    down: "All user web access stops, while servers, email and internal apps work fine." },
  { id: "idp", name: "Cloud IdP", sub: "SSO + MFA", row: 1, x: 1000, deps: ["ad", "isp"], concept: "mfa", node: "saas", flows: ["sso"],
    what: "Signing users into SaaS apps and the VPN with MFA.",
    down: "Sign-in to SaaS apps and the VPN fails. Existing sessions last until their tokens expire." },

  { id: "ad", name: "Active Directory", sub: "Kerberos, LDAP, GPO", row: 2, x: 520, deps: ["dns", "ntp"], concept: "ad", node: "dc", flows: ["kerberos", "nps-ad"],
    what: "Who everyone is, which groups they're in, and the policies their machines follow.",
    down: "No new logons (cached ones only), no Kerberos tickets for servers, no Group Policy." },
  { id: "fw", name: "Firewall & NAT", sub: "between zones", row: 2, x: 880, deps: ["routing"], concept: "firewall", node: "fw", flows: ["web-out", "smtp-in", "web-in", "vpn", "c2", "guest-deny"],
    what: "Enforcing what may cross between the Internet, DMZ, inside and guest zones.",
    down: "Traffic between zones stops: no Internet, no DMZ, no VPN. Traffic within a VLAN still works." },

  { id: "dhcp", name: "DHCP", sub: "UDP 67/68", row: 3, x: 300, deps: ["routing"], concept: "dhcp", node: "dhcp", flows: ["dhcp"],
    what: "Handing out IP addresses and network settings.",
    down: "New and rebooted devices get 169.254.x.x and reach nothing. Devices with a current lease carry on until it expires." },
  { id: "dns", name: "DNS", sub: "UDP/TCP 53", row: 3, x: 560, deps: ["routing"], concept: "dns", node: "dc", flows: ["dns-int", "dns-out", "dns-pub"],
    what: "Turning names into addresses, and telling clients where domain controllers and mail servers are.",
    down: "Names stop resolving. Almost everything appears broken even though the network itself is fine." },
  { id: "ntp", name: "Time (NTP)", sub: "UDP 123", row: 3, x: 820, deps: ["routing"], concept: "ntp", node: "dc", flows: ["ntp"],
    what: "Keeping every clock in agreement.",
    down: "Clocks drift. Past five minutes of skew, Kerberos logons fail and log timelines can't be trusted." },

  { id: "switching", name: "Switching & VLANs", sub: "layer 2", row: 4, x: 400, deps: [], concept: "vlan", node: "access-sw", flows: ["print", "span"],
    what: "Moving frames between devices inside each VLAN.",
    down: "Nothing on the LAN can talk. Link lights may glow, but frames go nowhere." },
  { id: "routing", name: "Routing", sub: "core L3 switch", row: 4, x: 700, deps: ["switching"], concept: "router", node: "core", flows: ["smb", "kerberos", "dhcp"],
    what: "Moving packets between VLANs and subnets.",
    down: "Every VLAN becomes an island: users can't reach servers, and nothing reaches the firewall." },
  { id: "isp", name: "Internet link", sub: "ISP + edge router", row: 4, x: 1000, deps: [], concept: "bgp", node: "isp", flows: ["web-out", "smtp-in", "web-in", "vpn", "dns-out", "voice"],
    what: "Our connection to everyone else.",
    down: "Everything external goes dark: web, SaaS, inbound email, the VPN and the public website. Internal services keep working." }
];
