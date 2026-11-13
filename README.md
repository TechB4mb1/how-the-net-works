# How the Net Works

An interactive field guide to how the Internet and enterprise networks fit together. It's a single static page with no build step and no dependencies.

The page is built around the complete network of **Meridian Freight**, a fictional 400-person company. It covers the services an enterprise can't run without, the security controls around them, and the Internet beyond.

## What's inside

| Section | What you can do |
| --- | --- |
| **Live traffic** | The map's default view: 30 kinds of traffic flow across the network at once, colour-coded into eight categories (names & time, identity, web, email, files/apps/voice, security monitoring, remote access & admin, denied). Solid dots are requests, hollow dots are replies, and dropped streams end at a red ✕. Click a stream, a cable or a device to see exactly what crosses it: protocol and port, who starts it, the firewall/ACL rule that allows it, and what breaks if it's blocked. |
| **Service dependencies** | A layered map of 19 services from switching and routing up to email, VPN and the public website. Select one to see what it depends on and what needs it, or simulate an outage to watch the failure cascade up the stack (break DNS and 11 of 18 other services fail). |
| **Network map** | Click any of 38 devices: router, firewall, IPS/IDS, DMZ servers, proxy, VPN, core switch, VLANs, AD/DNS, DHCP, CA, RADIUS/NAC, SIEM, jump host and more. Each one explains what it does, how it works, its ports, what breaks without it, and real products. |
| **Follow a packet** | Seven animated journeys with a header-by-header packet inspector: a laptop joining the network (802.1X → DHCP → ARP → DNS SRV → Kerberos → GPO), browsing via proxy with recursive DNS and NAT, inbound email with SPF/DKIM/DMARC, a public website behind a WAF, VPN with SSO + MFA, malware containment (firewall, proxy, IPS, IDS, SIEM, NAC quarantine), and guest Wi-Fi. |
| **Layers** | The OSI and TCP/IP models side by side, plus a real frame you can unwrap header by header (Ethernet, 802.1Q, IPv4, TCP, TLS, HTTP, FCS). |
| **Addressing** | A subnet calculator with a binary view, address classification and subnet splitting, plus the company's full VLAN/address plan. |
| **Services** | A searchable catalog of 35 concepts across foundations, core services, identity, security and operations. |
| **Ports** | A filterable reference of the ports you'll meet in firewall rules and packet captures. |
| **Quiz** | Twelve help-desk troubleshooting questions, each with an explanation. |

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

It also works as-is on GitHub Pages (Settings → Pages → deploy from branch, root folder).

## Files

```
index.html        page structure
assets/styles.css design tokens (light and dark), layout, components
assets/data.js    all content: topology, flows, dependencies, concepts, journeys, layers, ports, quiz
assets/app.js     rendering and interaction (no libraries)
```

To change the content, edit `assets/data.js`. Nodes reference concepts by id. Journeys and traffic flows are lists of node ids that must follow drawn links. A missing link makes the packet cut straight across the map.

## Notes

Public addresses use the documentation ranges from RFC 5737 (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and domain names use reserved example names (RFC 2606), so nothing on the page points at a real network.
