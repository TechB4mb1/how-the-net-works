/* How the Net Works — learning depth.
   Adds beginner ("easy") and expert ("deep") material to the content in
   data.js. Intermediate is the base content. Loaded after data.js. */
(function () {
  var NET = window.NET;

  /* ---------------- concepts: analogy (easy) + deep dive ---------------- */
  var C = {
    ip: { easy: "An IP address is like a postal address for a device: it says which network (street) it lives on and which house on that street it is.",
      deep: ["The IPv4 header is 20 bytes minimum: TTL, protocol, DSCP/ECN, identification and fragment offset. With Don't Fragment set, path MTU discovery avoids fragmentation.", "The special-purpose registry (RFC 6890) gives 0/8, 100.64/10, 169.254/16, 192.0.0/24, 198.18/15 and 240/4 defined meanings, so never reuse them casually.", "Duplicate address detection: Windows sends an ARP probe for a new address; any reply means a conflict and the address is not used."] },
    subnet: { easy: "A subnet is one street of addresses. Devices on the same street talk directly; to reach another street, they go through a router, like a post office.",
      deep: ["Mask arithmetic: network = IP AND mask; broadcast = network OR NOT mask. A /31 has no network or broadcast address (RFC 3021) and suits point-to-point links.", "Summarisation: contiguous blocks aggregate (10.10.0.0/22 + 10.10.4.0/22 = 10.10.0.0/21), keeping routing tables small and convergence fast.", "Plan address space per site and function with room to grow. Renumbering later is one of the most expensive network changes there is."] },
    "mac-arp": { easy: "A MAC address is the name tag built into a network card. ARP is shouting across the room: \"Who has this IP address? Tell me your name tag.\"",
      deep: ["ARP packet: hardware type 1, protocol type 0x0800, opcode 1 (request) or 2 (reply). Caches age out after minutes; Windows uses neighbour unreachability detection.", "Gratuitous ARP announces or moves an address. Failover pairs and VM live migration use it to update every neighbour's cache at once.", "Proxy ARP lets a router answer for hosts on other segments. Seeing it unexpectedly usually means a host has the wrong mask."] },
    "tcp-udp": { easy: "Ports are like apartment numbers: the IP address gets you to the building, the port to the right application inside. TCP is a phone call with confirmations; UDP is a postcard.",
      deep: ["TCP states: SYN_SENT, ESTABLISHED, FIN_WAIT, TIME_WAIT (2×MSL). Thousands of TIME_WAIT sockets on a proxy is normal; running out of ephemeral ports isn't.", "Congestion control (CUBIC, BBR) and window scaling set throughput on long, fast links. The bandwidth-delay product tells you how big the window must be.", "Tunnels shrink the usable MTU. Clamping the TCP MSS on the tunnel interface avoids fragmentation and black holes."] },
    switch: { easy: "A switch is a smart power strip for network cables: it learns which device is on which socket and sends each message only where it needs to go.",
      deep: ["Spanning tree variants: RSTP (802.1w) converges in seconds, and MSTP maps VLANs to instances. Place the root bridge deliberately and protect it with root guard and BPDU guard.", "MLAG, vPC or stacking lets two switches act as one for LACP bundles, so no uplink sits idle in a blocked state.", "Shallow buffers drop packets under microbursts and incast (storage, backups). Watch output drops, not just average utilisation."] },
    vlan: { easy: "VLANs split one physical switch into several separate virtual switches, so the guest network and the finance network never mix even though they share the same box.",
      deep: ["802.1Q tag: TPID 0x8100, 3-bit PCP (priority), 1-bit DEI and a 12-bit VLAN ID. QinQ (802.1ad) stacks two tags for service providers.", "Private VLANs (isolated and community ports) restrict traffic inside one VLAN. They're common in DMZs and hosting.", "Beyond 4094 VLANs, or to stretch layer 2 across routed networks, overlays such as VXLAN (24-bit VNI) take over."] },
    router: { easy: "A router is a post office: it reads the destination address and decides which road to send the package down next.",
      deep: ["Administrative distance chooses between route sources (connected 0, static 1, eBGP 20, OSPF 110); the metric chooses within one protocol.", "OSPF is link-state: routers flood LSAs describing the topology and each runs the SPF algorithm. Areas limit flooding, and area 0 is the backbone.", "First-hop redundancy (VRRP, HSRP) shares one virtual gateway IP and MAC between two routers, so hosts never notice one failing."] },
    bgp: { easy: "The Internet is tens of thousands of separate networks. BGP is how they tell each other \"I can deliver to these addresses\": a huge, constantly updated map of routes.",
      deep: ["Best-path order (simplified): weight, local preference, locally originated, AS-path length, origin, MED, eBGP over iBGP, IGP cost, router ID.", "Inbound traffic engineering: AS-path prepending, more-specific prefixes and communities that ask upstreams to change preference.", "Protect sessions with prefix filters (built from IRR data), max-prefix limits, RPKI origin validation and TCP-AO or the TTL security hack."] },
    nat: { easy: "NAT is the company receptionist: outsiders only see the main phone number, and the receptionist remembers which internal extension each call belongs to.",
      deep: ["Mapping behaviour (endpoint-independent vs address- or port-dependent) decides whether peer-to-peer apps can traverse NAT with STUN, TURN and ICE.", "Hairpin NAT lets inside hosts reach a published service by its public address.", "NAT64/DNS64 lets IPv6-only clients reach IPv4 services. CGNAT operators must log port blocks to attribute abuse."] },
    ipv6: { easy: "IPv6 is the bigger address system the Internet is moving to. There are so many addresses that every device can have its own public one.",
      deep: ["Address types: global unicast 2000::/3, unique local fc00::/7 (private), link-local fe80::/10, multicast ff00::/8. There's no broadcast; NDP uses solicited-node multicast.", "RA Guard and DHCPv6 Guard on switches stop rogue router advertisements; privacy addresses rotate the interface identifier.", "Only the source fragments. Firewalls must pass ICMPv6 Packet Too Big, or path MTU discovery breaks."] },
    http: { easy: "HTTP is the language browsers and websites speak: \"please give me this page\" and \"here it is\".",
      deep: ["HTTP/2 multiplexes streams on one TCP connection with HPACK header compression. HTTP/3 moves to QUIC over UDP to avoid TCP head-of-line blocking.", "Caching semantics: Cache-Control, ETag with If-None-Match, Vary. Security headers: HSTS, Content-Security-Policy, X-Content-Type-Options.", "Behind proxies, trust X-Forwarded-For only from known proxy addresses, or use the PROXY protocol."] },
    qos: { easy: "QoS is a priority lane: when the road is busy, phone calls and video get waved through first while big downloads wait.",
      deep: ["Classify and mark at the edge, set trust boundaries at access ports, then queue (LLQ/CBWFQ) and shape or police on congested links.", "DSCP survives routing but ISPs usually reset it, so across the Internet QoS is best effort.", "Wi-Fi maps DSCP to WMM access categories (voice, video, best effort, background)."] },
    dns: { easy: "DNS is the Internet's phone book: you look up a name like example.com and it tells you the number (IP address) to call.",
      deep: ["DNSSEC signs zones (RRSIG, DNSKEY, with DS records chaining to the root) so validating resolvers reject forged answers. It authenticates but doesn't encrypt.", "Negative caching (the SOA minimum TTL), EDNS0 for larger UDP answers, and TCP fallback when the TC bit is set.", "Response Policy Zones let resolvers block malicious domains; anycast spreads authoritative load and absorbs DDoS."] },
    dhcp: { easy: "DHCP is a hotel front desk: a device arrives, asks for a room, and gets a room number (IP address) plus directions to the exit and the information desk (gateway and DNS).",
      deep: ["Option 82 (relay agent information) tells the server which switch and port a request came from. DHCP snooping builds the binding table that DAI and IP Source Guard rely on.", "Failover (load-balance or hot-standby) shares lease state between two servers; split scopes are the low-tech alternative.", "Tune lease times: short for guest Wi-Fi, long for desktops. DHCPv6 prefix delegation hands whole prefixes to routers."] },
    ntp: { easy: "NTP keeps every computer's clock showing the same time. That matters more than you'd think: logins and security certificates depend on it.",
      deep: ["NTP estimates offset and delay from four timestamps. It slews small offsets gradually and steps large ones. Stratum is the distance from a reference clock.", "Use at least four sources so one wrong clock is outvoted. NTS (Network Time Security) authenticates public time servers.", "PTP (IEEE 1588) gives sub-microsecond accuracy for trading, broadcast and 5G networks."] },
    smtp: { easy: "SMTP is the postal service between mail servers. MX records are the sorting office's address, and SPF, DKIM and DMARC are the stamps that prove a letter is genuine.",
      deep: ["SPF checks the envelope MAIL FROM (with a 10-DNS-lookup limit). DKIM signs headers and body for a d= domain. DMARC requires one of them to align with the visible From: domain.", "MTA-STS and DANE enforce TLS between mail servers; ARC preserves authentication results through forwarders and mailing lists.", "4xx replies are temporary (retry later), 5xx permanent. Accepting mail and bouncing it later creates backscatter and gets you blocklisted."] },
    file: { easy: "A file server is a shared filing cabinet on the network. Your account decides which drawers you can open.",
      deep: ["SMB 3.x adds AES-GCM encryption, pre-authentication integrity and multichannel. Require signing to stop NTLM relay attacks.", "Access-based enumeration hides folders a user can't open; DFS Replication keeps namespace targets in sync.", "Ransomware defence: immutable snapshots, least-privilege share permissions and canary files that trigger alerts when touched."] },
    wifi: { easy: "Wi-Fi is a network over radio. An access point is a small radio tower for your building, and each network name (SSID) leads to a different part of the network.",
      deep: ["802.11r (fast transition) and 802.11k/v (neighbour reports, BSS transition) make roaming smooth enough for voice calls.", "WPA3-SAE resists offline password guessing. Protected Management Frames (802.11w) stop spoofed deauthentication attacks.", "Channel planning: non-overlapping 1/6/11 at 2.4 GHz, DFS channels at 5 GHz. 6 GHz requires WPA3."] },
    ad: { easy: "Active Directory is the company's master list of people and computers. It checks your password once in the morning and then vouches for you all day.",
      deep: ["Kerberos internals: the TGT is encrypted with the krbtgt account's key, and the PAC carries group SIDs. Constrained and resource-based delegation control impersonation.", "Common attack paths: Kerberoasting (cracking service tickets offline), AS-REP roasting, DCSync, Golden and Silver tickets, NTLM relay.", "Defences: tiered administration, LAPS for local admin passwords, the Protected Users group, and removing NTLM and unconstrained delegation."] },
    ca: { easy: "A certificate authority is like a passport office: it issues digital ID cards that computers trust because they trust the office that signed them.",
      deep: ["X.509 fields that matter: subject and SANs, key usage and extended key usage, basic constraints (CA:TRUE, path length), CRL distribution points and AIA.", "Certificate Transparency logs make public CA issuance auditable. Monitor CT for certificates issued for your domains.", "AD CS abuse (the ESC1–ESC15 family): templates that allow enrollee-supplied subjects, dangerous EKUs or weak ACLs let ordinary users mint admin certificates."] },
    tls: { easy: "TLS is the padlock in your browser: it scrambles the conversation so others can't read it, and checks you're talking to the real website.",
      deep: ["TLS 1.3 removed RSA key exchange and CBC suites. 0-RTT resumption can be replayed, so use it only for idempotent requests.", "Encrypted Client Hello (ECH) hides the server name, which defeats SNI-based filtering on proxies and firewalls.", "Mutual TLS authenticates both ends with certificates. It's standard in service meshes and machine-to-machine APIs."] },
    nac: { easy: "Network access control is a bouncer at every door: before a device can join the network, it must prove who it is.",
      deep: ["EAP methods: EAP-TLS (certificates both sides), PEAP-MSCHAPv2 (passwords; crackable if clients don't validate the server certificate), TEAP (chains machine and user).", "Dynamic VLAN attributes: Tunnel-Type=13, Tunnel-Medium-Type=6, Tunnel-Private-Group-ID=<VLAN>. Filter-Id or a downloadable ACL applies policy.", "MACsec (802.1AE) can encrypt the cable from desk to switch once 802.1X has succeeded."] },
    mfa: { easy: "Single sign-on means one login unlocks all your apps. MFA adds a second proof, like a tap on your phone, so a stolen password alone isn't enough.",
      deep: ["OIDC: authorization code flow with PKCE. Tokens are JWTs signed with keys the IdP publishes at its JWKS endpoint.", "Session cookie and token theft bypasses MFA entirely. Counter it with short lifetimes, device binding and continuous access evaluation.", "FIDO2/WebAuthn binds each credential to the real site's origin, so a phishing site receives nothing it can use."] },
    firewall: { easy: "A firewall is a security guard at the border between networks, checking every connection against a list of what's allowed.",
      deep: ["State tracking includes TCP sequence checks and idle timeouts. Asymmetric routing breaks it unless both firewalls share state.", "Rule hygiene: object groups, hit counters, expiry dates on temporary rules, and regular recertification by rule owners.", "Application-based rules (\"allow Microsoft 365\") beat port-based ones, but need TLS decryption or reliable SNI to be accurate."] },
    dmz: { easy: "A DMZ is a building's lobby: visitors can come into the lobby, but they can't wander into the offices.",
      deep: ["Back-to-back firewalls from different vendors were the classic design. Today a single zone-based firewall plus micro-segmentation is common.", "Manage DMZ hosts from the inside via a jump host. Never allow admin protocols from the DMZ inward.", "Outbound-only connectors (ZTNA, cloud tunnels) can publish services with no inbound firewall rules at all."] },
    ips: { easy: "An IPS is a guard standing in the doorway who inspects everyone coming through and stops troublemakers on the spot.",
      deep: ["Suricata and Snort rules match flow state, content, PCRE and parsed protocol fields (sticky buffers such as http.uri).", "Evasion uses fragmentation, overlapping TCP segments and odd encodings; stream reassembly and normalisation defeat most of it.", "Hardware bypass on failure (fail-open) versus fail-closed is a business trade-off between availability and protection."] },
    ids: { easy: "An IDS is a security camera: it watches a copy of the traffic and raises an alarm, but it can't stop anyone.",
      deep: ["TAPs are lossless and invisible; SPAN ports can drop packets and change timing. Packet brokers aggregate, filter and de-duplicate feeds.", "Zeek turns traffic into rich logs (conn, dns, x509, smb_files) that are ideal for threat hunting.", "Detection engineering: tune rules to your environment, measure true and false positive rates, map coverage to MITRE ATT&CK."] },
    proxy: { easy: "A web proxy is a middleman that fetches websites for you, checking each one for danger and keeping a record.",
      deep: ["PAC files are JavaScript (FindProxyForURL). WPAD auto-discovery via DHCP option 252 or DNS can be hijacked, so disable it if unused.", "Kerberos proxy authentication needs an SPN for HTTP/proxy.fqdn; without it clients fall back to NTLM.", "TLS inspection breaks certificate pinning and mutual TLS. Keep bypass lists current and plan for ECH."] },
    waf: { easy: "A reverse proxy is a shop counter: customers deal with the counter, never the stockroom. The WAF checks every order for tricks.",
      deep: ["The OWASP Core Rule Set uses anomaly scoring; higher paranoia levels catch more but produce more false positives.", "Load balancers add session persistence (cookies, source IP), slow-start and outlier detection to keep users on healthy servers.", "Protect the origin: allow only the CDN or WAF addresses to reach it, or require authenticated origin pulls with mTLS."] },
    vpn: { easy: "A VPN is a private, armoured tunnel across the public Internet between your laptop and the office.",
      deep: ["IKEv2: IKE_SA_INIT (Diffie-Hellman, nonces), IKE_AUTH (identities, certificates or EAP), then CHILD_SA for the ESP keys. Rekey before lifetimes expire.", "WireGuard uses static Curve25519 keys and the Noise framework, with no cipher negotiation and a tiny code base.", "ESP adds roughly 50–70 bytes. Clamp TCP MSS or lower the tunnel MTU to avoid fragmentation black holes."] },
    edr: { easy: "EDR is antivirus that also watches behaviour, so it can spot and stop attacks even when the malware is brand new.",
      deep: ["Telemetry comes from kernel callbacks, ETW and AMSI. Attackers try to blind it, for example by loading a vulnerable signed driver (BYOVD).", "Network containment blocks all traffic on the host firewall except the channel to the EDR console.", "Tamper protection and alerts on agent health matter as much as the detections themselves."] },
    "zero-trust": { easy: "Zero trust means never assuming someone is safe just because they're inside the building: everyone is checked, every time.",
      deep: ["NIST SP 800-207 describes a policy engine and decision point, enforcement points, and continuous diagnostics feeding them.", "Identity-aware proxies and ZTNA connectors replace inbound VPN with per-application, per-session access.", "Micro-segmentation applies the same idea east-west: host firewalls, hypervisor distributed firewalls, Kubernetes NetworkPolicy."] },
    siem: { easy: "A SIEM is the security team's control room: every device sends its logs there so analysts can see the whole picture.",
      deep: ["Normalise to a common schema (ECS, OCSF, CIM) so one query covers every source.", "Detection as code: rules in version control, unit-tested with sample logs, with ATT&CK coverage tracked.", "Control cost by tiering storage, filtering noisy sources at the edge, and sampling high-volume flow data."] },
    nms: { easy: "Network monitoring is a dashboard of health lights for every device, so problems are spotted before people complain.",
      deep: ["Use SNMPv3 with authPriv (SHA and AES). Streaming telemetry (gNMI, OpenConfig) replaces polling for high-frequency counters.", "Flow export uses sampling (1:N) and IPFIX templates; enrich flows with ASN and application metadata.", "Configuration management: golden configs, drift detection and automation (Ansible, Nornir) tested in CI."] },
    jump: { easy: "A jump host is the single, guarded door admins must use to reach important systems, so every admin action passes one checkpoint.",
      deep: ["Privileged Access Workstations for tier-0 admins: no email, no browsing, nothing else.", "Just-in-time access grants privileges for a time window after approval, then removes them.", "Session recording with keystrokes and video; a protocol break means the client never connects to the target directly."] }
  };
  NET.concepts.forEach(function (c) {
    if (C[c.id]) { c.easy = C[c.id].easy; c.deep = C[c.id].deep; }
  });

  /* ---------------- journeys: plain-language steps + expert notes ---------------- */
  var J = {
    join: {
      easy: [
        "The laptop plugs in, and the switch asks it to prove who it is before letting it on the network.",
        "With no address yet, the laptop shouts \"I need an address!\" and the core switch passes the message to the DHCP server.",
        "The DHCP server replies with an address (10.10.1.57), the way out of the network (the gateway) and who to ask for names (DNS).",
        "To send anything beyond its own street, the laptop needs the gateway's hardware address, so it asks \"who has 10.10.0.1?\"",
        "The laptop asks DNS where the domain controller is: the server that checks passwords.",
        "The clocks are synced, then Jamie's password is checked without ever being sent. The laptop gets a ticket that proves who Jamie is.",
        "The laptop downloads company settings: the web proxy, security rules and which drives to show.",
        "Jamie's home drive appears. The ticket from earlier means there's no second password prompt."
      ],
      deep: ["802.1X uses EAPOL (EtherType 0x888E). Multi-auth ports allow a phone (MAB) and a PC (EAP-TLS) on the same port, each in its own VLAN.", "After the lease, Windows registers its A and PTR records with secure dynamic DNS in the AD-integrated zone.", "Kerberos pre-authentication uses PA-ENC-TIMESTAMP. Accounts with pre-auth disabled can be AS-REP roasted.", "Group Policy applies in LSDOU order (local, site, domain, OU); loopback processing changes user policy on shared machines."]
    },
    browse: {
      easy: [
        "The browser's settings say \"send web traffic via the company proxy\", so first it looks up the proxy's address.",
        "The browser asks the proxy to connect to example.com. The firewall only lets laptops browse via the proxy.",
        "The proxy needs example.com's address, so DNS asks the Internet's directory, starting from the very top.",
        "The proxy checks the site is allowed, like a librarian checking a book isn't restricted.",
        "The proxy goes out to the Internet. The firewall swaps its private address for the company's public one.",
        "The website proves it really is example.com with its certificate, and both sides agree on encryption.",
        "The page travels back the same way and appears on screen, usually in well under a second."
      ],
      deep: ["With an explicit proxy, the client never resolves external names; only the proxy does. A transparent proxy needs the client to resolve and the firewall to redirect.", "QUIC (UDP 443) bypasses most proxies. Block UDP 443 outbound if you depend on inspection, so browsers fall back to TCP.", "Idle timeouts on stateful firewalls (often an hour) silently kill long-lived connections unless keepalives are used."]
    },
    mail: {
      easy: [
        "The partner's mail server looks up where to deliver mail for meridian.example.",
        "It connects to our mail gateway, the only server that accepts mail from outside.",
        "The gateway checks the email really is from the partner and isn't spam or a virus.",
        "Clean mail is passed inside to the mail server along one narrow, approved path.",
        "Jamie opens Outlook and reads the email over an encrypted connection.",
        "The reply goes back out through the gateway, digitally signed so the partner can trust it."
      ],
      deep: ["The envelope (MAIL FROM, RCPT TO) and the headers (From:, To:) are different things; DMARC alignment compares them.", "Greylisting, connection reputation and recipient validation reject most spam before the DATA command.", "Send bulk and transactional mail from different IPs or subdomains so one can't damage the other's reputation."]
    },
    public: {
      easy: [
        "A customer types our website's name, and DNS tells them where to go.",
        "They connect to the WAF, the guarded front desk of our website.",
        "The WAF checks the request is safe and passes it to one of the web servers.",
        "The web server asks an internal system for the shipment details, along one tightly limited path.",
        "An attacker tries to trick the website with a malicious request. The WAF recognises it and blocks it.",
        "The attacker scans for open doors. The IPS spots the pattern and blocks them."
      ],
      deep: ["Pass the client IP to backends with X-Forwarded-For or PROXY protocol v2, and log it at both the WAF and the app.", "Health checks should hit an endpoint that tests the app's dependencies, not just whether TCP 443 answers.", "Per-IP rate limits are weak against botnets; combine them with fingerprinting and challenges."]
    },
    vpn: {
      easy: [
        "Jamie's laptop at home contacts the company's VPN gateway and checks it's genuine.",
        "Jamie proves who they are with a password and a tap on their phone.",
        "The tunnel opens and the laptop gets an office address, as if it were sitting at a desk.",
        "Jamie opens a work file. It travels inside the encrypted tunnel across the Internet.",
        "Everything else, like news sites, goes straight out of Jamie's home Internet connection."
      ],
      deep: ["NAT-T wraps ESP in UDP 4500 because NAT devices can't track ESP (IP protocol 50) by port.", "Always-on VPN with a pre-logon (device) tunnel lets machines get policy before anyone signs in.", "Split DNS sends corporate domains to tunnel DNS. Leaking internal names to home resolvers is a privacy risk."]
    },
    malware: {
      easy: [
        "Malware tries to call its owner directly. The firewall blocks it: laptops may only browse via the proxy.",
        "It tries again via the proxy. The proxy knows the destination is malicious and blocks it.",
        "It tries to hide messages inside DNS lookups. The IPS spots the odd pattern.",
        "It tries to spread to other computers. The IDS sees it and raises the alarm.",
        "The SIEM links the four alarms to one laptop and alerts the security team.",
        "The laptop is automatically moved into a quarantine network until it's cleaned."
      ],
      deep: ["Beacon detection looks for regular intervals with jitter, small consistent payloads and rare destinations.", "DNS tunnelling indicators: high-entropy labels, long query names, and high NXDOMAIN or TXT ratios per client.", "Contain before you eradicate: capture memory and disk images for forensics before reimaging."]
    },
    guest: {
      easy: [
        "A visitor joins the guest Wi-Fi, which is kept separate from the staff network.",
        "The firewall gives the visitor an address on the guest network.",
        "The visitor tries to open a company file share and is blocked.",
        "The visitor browses the Internet normally, with a speed limit so they can't slow the office down."
      ],
      deep: ["Captive portals intercept HTTP and DNS until terms are accepted. HSTS sites can't be redirected, so operating systems probe a known plain-HTTP URL.", "Client isolation on the AP stops guests attacking each other on the same SSID.", "A separate public NAT address for guests keeps abuse complaints and blocklisting off the corporate address."]
    }
  };
  NET.journeys.forEach(function (j) {
    var d = J[j.id];
    if (!d) return;
    j.deep = d.deep;
    j.steps.forEach(function (s, i) { s.easy = d.easy[i]; });
  });

  /* ---------------- OSI layers ---------------- */
  var L = {
    7: { easy: "The apps themselves: browsers, email, logins. This is the letter you write.",
      deep: "Most enterprise troubleshooting ends here: certificate errors, authentication failures, wrong DNS answers. Captures with TLS keys (SSLKEYLOGFILE) show layer 7 inside encrypted sessions." },
    6: { easy: "Making data readable at both ends: formats and encryption. Like translating the letter and sealing it in a tamper-proof envelope.",
      deep: "TLS doesn't map neatly onto OSI: it runs over TCP and under HTTP. QUIC merges transport, TLS and multiplexing into one protocol over UDP." },
    5: { easy: "Keeping a conversation going: starting it, pausing it and ending it.",
      deep: "Session ideas now live inside applications: SMB sessions, TLS session tickets, HTTP cookies. Load balancers implement session persistence at layer 4 or 7." },
    4: { easy: "Making sure the right app gets the data and nothing goes missing. Like apartment numbers and tracked delivery.",
      deep: "TCP options (MSS, SACK, window scale, timestamps) are negotiated in the SYN; middleboxes that strip them hurt performance. Stateful firewalls and NAT work on the 5-tuple." },
    3: { easy: "Getting data across different networks to the right address. Like the postal system routing letters between cities.",
      deep: "IP is connectionless, best-effort delivery. ICMP carries the errors (unreachable, TTL exceeded, packet too big); blocking all ICMP breaks path MTU discovery." },
    2: { easy: "Getting data to the next device on the same local network. Like a courier inside one building.",
      deep: "Ethernet MTU is 1500 bytes (9000 with jumbo frames in data centres) and the FCS detects corruption. 802.1Q tags carry VLAN IDs; overlays tunnel layer 2 over layer 3." },
    1: { easy: "The physical stuff: copper cables, light in fibre, radio waves.",
      deep: "Encoding (PAM4 at 100G and above), optic reach (SR, LR), duplex mismatches and CRC errors live here. Check interface counters for input errors, runts and giants." }
  };
  NET.layers.forEach(function (l) { if (L[l.n]) { l.easy = L[l.n].easy; l.deep = L[l.n].deep; } });

  /* ---------------- ports: 1 = beginner essentials, 3 = expert only ---------------- */
  var PL = {
    "22": 1, "25": 1, "53": 1, "67–68": 1, "80": 1, "123": 1, "443": 1, "445": 1, "3389": 1, "143 / 993": 1,
    "135": 3, "137–139": 3, "179": 3, "464": 3, "546–547": 3, "853": 3, "1194": 3, "2055": 3, "3268 / 3269": 3,
    "3799": 3, "5246–5247": 3, "5985 / 5986": 3, "16384–32767": 3, "49152–65535": 3, "69": 3, "110 / 995": 3
  };
  NET.ports.forEach(function (p) { p[6] = PL[p[0]] || 2; });

  /* ---------------- quiz levels ---------------- */
  NET.quiz.forEach(function (q) { q.lvl = 2; });
  NET.quiz = [
    { lvl: 1, q: "What does DNS do?", a: ["Encrypts your traffic", "Turns names like example.com into IP addresses", "Hands out IP addresses", "Blocks viruses"], c: 1,
      why: "DNS is the Internet's phone book. Computers connect using numeric IP addresses; DNS translates the names people type into those numbers." },
    { lvl: 1, q: "Which device decides what traffic may cross between the Internet and your network?", a: ["A switch", "A firewall", "A Wi-Fi access point", "A printer"], c: 1,
      why: "A firewall sits at the border and checks every connection against rules. Switches just move traffic around inside the network." },
    { lvl: 1, q: "What gives your laptop its IP address automatically when it joins a network?", a: ["DHCP", "DNS", "A VPN", "Email"], c: 0,
      why: "DHCP hands out addresses, along with the gateway and DNS settings, so nobody has to type them in by hand." },
    { lvl: 1, q: "What does the padlock in your browser's address bar mean?", a: ["The site can't contain viruses", "The connection is encrypted and the site's identity was checked", "The site loads faster", "You're connected to a VPN"], c: 1,
      why: "HTTPS (TLS) encrypts the connection and verifies the site's certificate. It says nothing about whether the site itself is trustworthy." },
    { lvl: 1, q: "Why do companies put visitors on a separate guest Wi-Fi?", a: ["It's faster", "So visitors can't reach company computers and files", "Guests need different websites", "To save electricity"], c: 1,
      why: "The guest network is isolated: Internet only, with no path to internal systems." },
    { lvl: 1, q: "What does a VPN do for someone working from home?", a: ["Speeds up their Internet", "Creates an encrypted tunnel to the office network", "Blocks adverts", "Replaces their home Wi-Fi"], c: 1,
      why: "A VPN builds a private, encrypted tunnel across the Internet, so the laptop can reach office systems as if it were in the building." },
    { lvl: 1, q: "On one physical server running several virtual machines, what connects the VMs to each other?", a: ["A virtual switch inside the server", "A USB cable", "The printer", "DNS"], c: 0,
      why: "The hypervisor includes a virtual switch. VMs plug their virtual network cards into it, just like real computers plug into a real switch." },
    { lvl: 1, q: "In Kubernetes, what is a pod?", a: ["A physical server", "The smallest unit that runs one or more containers, with its own IP address", "A kind of firewall", "A backup"], c: 1,
      why: "Pods are where containers run. Each pod gets its own IP address, and Kubernetes starts and stops pods across many servers." }
  ].concat(NET.quiz).concat([
    { lvl: 2, q: "Two VMs on the same host and the same port group talk to each other. Where does their traffic go?", a: ["Out to the physical switch and back", "It stays inside the host's virtual switch", "Through the firewall", "Across the Internet"], c: 1,
      why: "The virtual switch delivers it in memory. That also means physical firewalls and IDS sensors never see it, so virtual environments need their own controls." },
    { lvl: 2, q: "A pod connects to a Service's ClusterIP, 10.96.0.30. What turns that into a real pod address?", a: ["CoreDNS", "kube-proxy rules (iptables/IPVS) or the CNI's eBPF dataplane on the node", "etcd", "The ingress controller"], c: 1,
      why: "The ClusterIP is virtual. Rules on every node DNAT it to a healthy endpoint pod, and connection tracking reverses it on the reply." },

    { lvl: 3, q: "Over the VPN, small pages load but one site hangs during the TLS handshake. Most likely cause?", a: ["DNS", "MTU: the tunnel shrinks the path MTU and MSS isn't clamped, so large packets vanish", "An expired certificate", "NTP drift"], c: 1,
      why: "Large packets (the server's certificate chain) exceed the tunnel MTU. If ICMP Packet Too Big is blocked and MSS isn't clamped, they're silently dropped." },
    { lvl: 3, q: "Which attack is possible against accounts that have Kerberos pre-authentication disabled?", a: ["Kerberoasting", "AS-REP roasting", "Pass-the-hash", "DCSync"], c: 1,
      why: "Without pre-auth, anyone can request an AS-REP for the account, part of which is encrypted with the user's key and can be cracked offline." },
    { lvl: 3, q: "You introduce a VXLAN overlay between hypervisors. What must change on the physical underlay?", a: ["Nothing", "The MTU: VXLAN adds 50 bytes, so allow at least 1550, typically 9000", "Spanning tree on every port", "Disable IPv6"], c: 1,
      why: "Encapsulation adds outer Ethernet, IP, UDP and VXLAN headers. If the underlay MTU isn't raised, full-size inner frames are dropped." },
    { lvl: 3, q: "Two BGP paths to one prefix: one has a higher LOCAL_PREF, the other a shorter AS_PATH. Weights are equal. Which wins?", a: ["The shorter AS_PATH", "The higher LOCAL_PREF", "The lower router ID", "The lower MED"], c: 1,
      why: "Local preference is evaluated before AS-path length in the best-path algorithm." },
    { lvl: 3, q: "A NetworkPolicy selects the db pods and allows ingress only from app=api. What happens to traffic from other pods to db?", a: ["Still allowed", "Denied: once a pod is selected by a policy for ingress, unlisted ingress is dropped", "Logged only", "Allowed only within the same namespace"], c: 1,
      why: "Selected pods become isolated for that direction, and only traffic matching some policy's rules is allowed." },
    { lvl: 3, q: "When does a message pass DMARC?", a: ["When SPF passes", "When DKIM passes", "When SPF or DKIM passes and its domain aligns with the From: header", "Only when both SPF and DKIM pass"], c: 2,
      why: "DMARC needs at least one authenticated identifier (SPF's envelope domain or DKIM's d= domain) that aligns with the visible From: domain." },
    { lvl: 3, q: "After a vMotion, how do the physical switches learn the VM's new location immediately?", a: ["They wait for MAC aging", "The destination host sends a RARP or gratuitous ARP for the VM's MAC", "Spanning tree reconverges", "The VM renews its DHCP lease"], c: 1,
      why: "The announcement updates every switch's MAC table on the path, so traffic follows the VM within milliseconds." },
    { lvl: 3, q: "Why can asymmetric routing break a stateful firewall?", a: ["It can't", "Return packets reach a firewall that never saw the SYN, so they match no state and are dropped", "It exhausts NAT ports", "TTL expires"], c: 1,
      why: "State is per firewall. Unless the pair shares state (or routing is symmetric), the return half of the conversation looks like unsolicited traffic." }
  ]);
})();
