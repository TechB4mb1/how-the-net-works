# How the Net Works

An interactive field guide to how the Internet and enterprise networks fit together. It's a single static page with no build step and no dependencies.

The page is built around the complete network of **Meridian Freight**, a fictional 400-person company. It covers the services an enterprise can't run without, the security controls around them, and the Internet beyond.

## Three learning levels

A switch in the header and the intro sets the depth for the whole page (remembered per browser):

- **Beginner:** plain-language analogies for every concept, simplified step text with a from → to summary, and only essential ports. Packet headers, IPs, protocol fields and jargon are hidden, and the quiz uses beginner questions.
- **Intermediate:** the full working detail: protocols, ports, firewall rules, packet inspector, address plan.
- **Expert:** adds "Going deeper" notes to every concept, layer and device (protocol internals, attack paths, design trade-offs), expert notes per journey and scenario, an auto-generated Wireshark display filter on every packet step, expert-only ports and an expert quiz.

## What's inside

| Section | What you can do |
| --- | --- |
| **Live traffic** | The map's default view: 30 kinds of traffic flow across the network at once, colour-coded into eight categories (names & time, identity, web, email, files/apps/voice, security monitoring, remote access & admin, denied). Solid dots are requests, hollow dots are replies, and dropped streams end at a red ✕. Click a stream, a cable or a device to see exactly what crosses it: protocol and port, who starts it, the firewall/ACL rule that allows it, and what breaks if it's blocked. |
| **Service dependencies** | A layered map of 19 services from switching and routing up to email, VPN and the public website. Select one to see what it depends on and what needs it, or simulate an outage to watch the failure cascade up the stack (break DNS and 11 of 18 other services fail). |
| **Network builder** | Add and remove 27 components (ISP links, router, IPS, firewall, switches, Wi-Fi, DHCP, DNS, domain controllers, CA, RADIUS/NAC, file and mail servers, mail gateway, web server, WAF, proxy, VPN, SIEM, IDS, EDR, jump host) and toggle VLAN segmentation, or start from a preset (home router, small office, flat and exposed, enterprise). The canvas redraws the topology, animates the traffic that works, and shows risky paths in red, such as the Internet reaching laptops with no firewall or guests reaching the file server. A live report covers 12 capabilities, a weighted security score with one-click fixes, and single points of failure. A diff shows what each change did, and selecting a component previews what removing it would break. |
| **Virtual networks** | Two interactive diagrams with clickable components and animated scenarios. **Virtualization host:** two hypervisors with distributed virtual switches, port groups, VMkernel ports, uplinks to a ToR pair and shared iSCSI storage, plus VM-to-VM traffic inside a host, inter-VLAN hairpinning, vMotion, storage traffic and a VXLAN/Geneve overlay with a distributed firewall. **Kubernetes:** a control plane, three nodes with CNI bridges, pods, ClusterIP Services, CoreDNS, ingress and a load balancer, plus pod-to-pod across nodes, Service DNAT, ingress routing, NetworkPolicy and how `kubectl apply` becomes a running pod. |
| **Network map** | Click any of 38 devices: router, firewall, IPS/IDS, DMZ servers, proxy, VPN, core switch, VLANs, AD/DNS, DHCP, CA, RADIUS/NAC, SIEM, jump host and more. Each one explains what it does, how it works, its ports, what breaks without it, and real products. |
| **Follow a packet** | Seven animated journeys with a header-by-header packet inspector: a laptop joining the network (802.1X → DHCP → ARP → DNS SRV → Kerberos → GPO), browsing via proxy with recursive DNS and NAT, inbound email with SPF/DKIM/DMARC, a public website behind a WAF, VPN with SSO + MFA, malware containment (firewall, proxy, IPS, IDS, SIEM, NAC quarantine), and guest Wi-Fi. |
| **Layers** | The OSI and TCP/IP models side by side, plus a real frame you can unwrap header by header (Ethernet, 802.1Q, IPv4, TCP, TLS, HTTP, FCS). |
| **Addressing** | A subnet calculator with a binary view, address classification and subnet splitting, plus the company's full VLAN/address plan. |
| **Services** | A searchable catalog of 42 concepts across foundations, core services, identity, security, operations, and virtual & cloud (hypervisors, overlays, storage networks, Kubernetes, Services, ingress, NetworkPolicy). |
| **Ports** | A filterable reference of the ports you'll meet in firewall rules and packet captures. |
| **Quiz** | A separate question set per level (8 beginner, 14 intermediate, 8 expert), each with an explanation. |

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
assets/data.js         base content: topology, flows, dependencies, concepts, journeys, layers, ports, quiz
assets/data-depth.js   beginner and expert material layered onto data.js, plus level-tagged ports and quiz
assets/data-virtual.js virtualization and Kubernetes diagrams, scenarios and concepts
assets/virtual.js      the virtual networks section
assets/app.js     rendering and interaction (no libraries)
assets/builder.js the network builder: component catalog, rules and report
```

To change the content, edit `assets/data.js`. Nodes reference concepts by id. Journeys and traffic flows are lists of node ids that must follow drawn links. A missing link makes the packet cut straight across the map.

## Notes

Public addresses use the documentation ranges from RFC 5737 (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`), and domain names use reserved example names (RFC 2606), so nothing on the page points at a real network.
