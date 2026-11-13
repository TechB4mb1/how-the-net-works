/* How the Net Works — virtual networks: a virtualization host pair and a
   Kubernetes cluster. Each diagram has groups, nodes, links and scenarios.
   Every text field comes in three depths: easy (beginner), text
   (intermediate) and deep (expert). Loaded after data.js. */
(function () {
  var NET = window.NET;

  /* ---------------- new concepts ---------------- */
  NET.categories.push("Virtual & cloud");
  NET.concepts.push(
    { id: "hypervisor", name: "Hypervisors & virtual switches", abbr: "HV", cat: "Virtual & cloud", layer: "L2 (virtual)",
      easy: "A hypervisor lets one physical server run many virtual computers. A virtual switch inside it connects them, just like a real switch would.",
      what: "A hypervisor runs many virtual machines (VMs) on one physical server. Each VM has virtual NICs that plug into a virtual switch inside the host, which reaches the physical network through the server's real NICs.",
      how: [
        "Type 1 (bare-metal) hypervisors run directly on the hardware: VMware ESXi, Microsoft Hyper-V, KVM (Proxmox, OpenStack, Nutanix AHV).",
        "Virtual switches (vSphere Standard or Distributed Switch, Hyper-V Virtual Switch, Linux bridge, Open vSwitch) forward frames between VMs and out to the uplinks.",
        "Port groups map VMs to VLANs. The host's physical uplinks are 802.1Q trunks to the top-of-rack switches.",
        "Host interfaces (VMkernel ports on ESXi) carry the host's own traffic on separate VLANs: management, live migration and storage.",
        "Traffic between VMs on the same host and port group never touches the physical network.",
        "Live migration (vMotion, Hyper-V Live Migration) moves running VMs between hosts; the VM keeps its IP and MAC addresses."
      ],
      ports: "ESXi management 443/902 · vMotion 8000 · Hyper-V Live Migration 6600",
      breaks: "One wrong VLAN on an uplink trunk cuts off that network for every VM on the host. Traffic inside a host is invisible to physical security tools unless you add virtual ones.",
      examples: "VMware vSphere, Microsoft Hyper-V, Proxmox VE, Nutanix AHV, OpenStack.",
      deep: [
        "Virtual switches never forward between uplinks, so they don't need spanning tree. Set port-group security (promiscuous mode, MAC changes, forged transmits) to Reject unless an appliance needs it.",
        "Teaming policies: route by originating virtual port (no switch config), IP hash (needs a static port channel), or LACP on a distributed switch.",
        "SR-IOV and DPDK bypass the virtual switch for performance, at the cost of losing vSwitch features such as live migration or the distributed firewall."
      ],
      related: ["vlan", "switch", "overlay", "storage-net"] },
    { id: "overlay", name: "Overlay networks (VXLAN, Geneve)", abbr: "VXLAN", cat: "Virtual & cloud", layer: "L2 over L3",
      easy: "An overlay builds virtual networks on top of the real one by putting each message inside a second envelope addressed between servers.",
      what: "An overlay carries virtual layer-2 networks across a routed layer-3 underlay. Tunnel endpoints (TEPs or VTEPs) on hypervisors or switches wrap each frame in UDP.",
      how: [
        "VXLAN has a 24-bit segment ID (16 million networks) on UDP 4789. Geneve, used by NSX and OVN, adds extensible options on UDP 6081.",
        "The underlay only needs IP reachability between tunnel endpoints, plus a larger MTU.",
        "Software-defined networking (VMware NSX, OVN/OpenStack, cloud VPCs, Kubernetes CNIs) uses overlays so networks can be created by API in seconds.",
        "Distributed routing and firewalling run in every host, so traffic doesn't have to hairpin to a central router and policy follows the VM.",
        "Data-centre switch fabrics use VXLAN with BGP EVPN as the control plane."
      ],
      ports: "VXLAN UDP 4789 · Geneve UDP 6081 · Flannel VXLAN UDP 8472",
      breaks: "If the underlay MTU is too small, small packets work but large ones silently vanish. Troubleshooting needs both the inner and the outer view of each packet.",
      examples: "VMware NSX, Cisco ACI, EVPN-VXLAN fabrics (Arista, Juniper, Cisco), OVN, cloud VPCs, Calico/Flannel/Cilium overlays.",
      deep: [
        "VXLAN overhead is 50 bytes: outer Ethernet 14, IP 20, UDP 8, VXLAN 8. Geneve options make it variable, so plan an underlay MTU of at least 1600, usually 9000.",
        "BGP EVPN route type 2 carries MAC/IP bindings and type 5 carries IP prefixes, which removes flood-and-learn and enables ARP suppression.",
        "The outer UDP source port is a hash of the inner flow, so the underlay's ECMP still spreads overlay traffic across links."
      ],
      related: ["hypervisor", "vlan", "k8s", "netpol"] },
    { id: "storage-net", name: "Storage networks (iSCSI, NFS, FC)", abbr: "SAN", cat: "Virtual & cloud", layer: "L2–L7",
      easy: "Virtual machines' hard drives usually live on a shared storage system, reached over its own very fast network lane.",
      what: "Shared storage lets any host run any VM and makes live migration possible. Hosts reach it over block protocols (iSCSI, Fibre Channel, NVMe-oF) or file protocols (NFS, SMB 3).",
      how: [
        "iSCSI carries SCSI commands over TCP 3260; NFS v3 and v4.1 use TCP 2049.",
        "Dedicated storage VLANs, or a separate fabric, keep storage away from user traffic.",
        "Jumbo frames (MTU 9000) end to end reduce per-packet overhead.",
        "Multipathing uses two independent paths for redundancy and throughput.",
        "Fibre Channel is its own lossless network, with zoning on the FC switches by WWN."
      ],
      ports: "iSCSI 3260 · NFS 2049 · SMB 445",
      breaks: "Storage latency makes every VM on it feel frozen. An MTU mismatch anywhere on the path causes hangs on large I/O.",
      examples: "NetApp, Pure Storage, Dell PowerStore, VMware vSAN, Storage Spaces Direct, Ceph.",
      deep: [
        "iSCSI port binding: two VMkernel ports, each bound to one uplink, with round-robin path selection.",
        "Test jumbo frames end to end without fragmentation: `vmkping -d -s 8972 <target>`.",
        "Hyperconverged storage (vSAN, S2D) replicates over the host network, so east-west bandwidth and latency directly limit write performance."
      ],
      related: ["hypervisor", "file", "switch"] },
    { id: "k8s", name: "Kubernetes networking", abbr: "K8s", cat: "Virtual & cloud", layer: "L3–L7",
      easy: "Kubernetes runs apps in containers spread across many servers. Every pod gets its own address, and the cluster keeps track of where everything is running.",
      what: "Kubernetes schedules containers, grouped in pods, across a cluster of nodes. Its network model says every pod gets its own IP and can reach every other pod without NAT. A CNI plugin makes that true.",
      how: [
        "The control plane is the API server (6443), etcd, the scheduler and controllers. Each node runs the kubelet and a container runtime.",
        "Each node gets a slice of the pod CIDR. Pods connect through veth pairs to a bridge or an eBPF dataplane.",
        "CNI plugins (Calico, Cilium, Flannel, cloud CNIs) connect nodes with an overlay (VXLAN/Geneve) or native routing (BGP, cloud route tables).",
        "Services give a set of pods one stable virtual IP and DNS name. CoreDNS answers cluster names.",
        "Ingress or the Gateway API, plus LoadBalancer Services, bring outside traffic in. NetworkPolicy controls pod-to-pod traffic."
      ],
      ports: "API server 6443 · etcd 2379–2380 · kubelet 10250 · NodePort 30000–32767",
      breaks: "Pod or Service CIDRs that overlap corporate ranges break routing to on-prem systems. An overloaded CoreDNS makes every service call slow.",
      examples: "Kubernetes (EKS, AKS, GKE, OpenShift, Rancher, k3s). CNIs: Calico, Cilium, Flannel, Antrea.",
      deep: [
        "Pods on a node share the node's kernel; each pod has its own network namespace. All containers in a pod share one IP and localhost.",
        "eBPF dataplanes (Cilium) replace iptables and bridges with programs on each veth and NIC, giving identity-aware policy and flow visibility (Hubble).",
        "Each node's pod block (a /24 by default) caps pods per node (110 by default). Size the cluster CIDR for nodes × block."
      ],
      related: ["k8s-svc", "ingress", "netpol", "overlay"] },
    { id: "k8s-svc", name: "Kubernetes Services & kube-proxy", abbr: "SVC", cat: "Virtual & cloud", layer: "L3/L4",
      easy: "Pods come and go all the time, so a Service gives a group of them one permanent name and address, and spreads requests across them.",
      what: "A Service is a stable virtual IP (ClusterIP) and DNS name in front of a changing set of pods. kube-proxy or an eBPF dataplane on every node rewrites traffic for that IP to a healthy pod.",
      how: [
        "Label selectors choose the pods behind a Service; EndpointSlices list their current IPs.",
        "Types: ClusterIP (internal), NodePort (a port on every node), LoadBalancer (an external load balancer), and headless (DNS returns pod IPs directly).",
        "kube-proxy modes: iptables (random DNAT), IPVS (real load-balancing algorithms), or replaced entirely by an eBPF CNI.",
        "DNS names follow service.namespace.svc.cluster.local.",
        "Readiness probes decide which pods receive traffic."
      ],
      ports: "Service ports are arbitrary; NodePorts use 30000–32767",
      breaks: "A typo in the selector leaves a Service with no endpoints, so connections fail. Pods failing readiness quietly drop out of the pool.",
      examples: "kube-proxy, Cilium kube-proxy replacement, MetalLB, cloud load balancers.",
      deep: [
        "externalTrafficPolicy: Local preserves the client's source IP and avoids a second hop, but only nodes running a matching pod receive traffic.",
        "Topology-aware routing keeps Service traffic within a zone to cut latency and cross-zone cost.",
        "Session affinity (ClientIP) pins clients to a pod via connection tracking; it's no substitute for stateless services."
      ],
      related: ["k8s", "ingress", "nat", "dns"] },
    { id: "ingress", name: "Ingress & Gateway API", abbr: "ING", cat: "Virtual & cloud", layer: "L7 Application",
      easy: "The ingress is the front door of a Kubernetes cluster: it reads which website was asked for and sends visitors to the right app.",
      what: "Ingress controllers, and the newer Gateway API, are reverse proxies running inside the cluster. They terminate TLS and route HTTP requests to Services by hostname and path.",
      how: [
        "An external load balancer or NodePort brings traffic to the ingress controller's pods.",
        "Routing rules match hostname and path: shop.example/ to the web Service, /api to the api Service.",
        "TLS certificates are stored as Secrets, often issued automatically by cert-manager over ACME.",
        "The Gateway API separates the infrastructure (Gateway) from each team's routes (HTTPRoute).",
        "Many controllers add WAF rules, rate limiting and authentication."
      ],
      ports: "TCP 80 / 443",
      breaks: "A missing or expired certificate Secret breaks HTTPS for every host using it. A wrong ingress class means the rules are silently ignored.",
      examples: "ingress-nginx, Traefik, HAProxy, Envoy Gateway, Istio gateway, cloud application gateways.",
      deep: [
        "MetalLB in L2 mode answers ARP for the VIP from one node and fails over with gratuitous ARP; in BGP mode it advertises the VIP to routers for ECMP.",
        "TLS passthrough keeps encryption end to end to the pod, but then the ingress can only route on SNI.",
        "Service meshes (Istio, Linkerd) add mutual TLS between pods, retries and L7 authorization behind the ingress."
      ],
      related: ["waf", "k8s-svc", "tls"] },
    { id: "netpol", name: "NetworkPolicy & micro-segmentation", abbr: "POL", cat: "Virtual & cloud", layer: "L3/L4",
      easy: "Network policies are firewall rules for individual apps or virtual machines, so one compromised app can't reach everything else.",
      what: "Micro-segmentation applies firewall policy per workload instead of per subnet. In Kubernetes, NetworkPolicy selects pods by label; in virtualization, a distributed firewall enforces rules at every VM's virtual NIC.",
      how: [
        "By default Kubernetes allows all pod-to-pod traffic. Once a policy selects a pod, that direction becomes deny-by-default for it.",
        "Rules allow traffic from pod selectors, namespace selectors or IP blocks, on specific ports.",
        "The CNI plugin enforces policy (Calico, Cilium, Antrea). Flannel on its own doesn't.",
        "Hypervisor distributed firewalls (NSX, Azure NSGs, AWS security groups) apply rules by VM tag and follow live migration.",
        "Start in monitor mode, map real flows, then enforce."
      ],
      ports: "",
      breaks: "A default-deny egress policy that forgets DNS breaks every lookup. Rules written with IPs instead of labels break when pods move.",
      examples: "Kubernetes NetworkPolicy, Calico, Cilium, Antrea, VMware NSX, Illumio, Azure NSGs, AWS security groups.",
      deep: [
        "Policies are additive (a union of allows); there's no deny rule in core NetworkPolicy. Calico and Cilium add ordered deny rules and cluster-wide policies.",
        "Core NetworkPolicy is L3/L4 only; Cilium adds L7 (HTTP method and path, DNS names) and identity-based enforcement.",
        "Remember egress to kube-dns on UDP/TCP 53 whenever you add default-deny egress."
      ],
      related: ["zero-trust", "firewall", "k8s"] }
  );

  /* ---------------- new ports ---------------- */
  NET.ports.push(
    ["902", "TCP", "ESXi host agent", "vCenter manages ESXi hosts over 902 and 443.", [], "", 3],
    ["2049", "TCP", "NFS", "File storage for hypervisors and Linux servers.", [], "", 2],
    ["3260", "TCP", "iSCSI", "Block storage over IP.", [], "", 2],
    ["4789", "UDP", "VXLAN", "Overlay encapsulation between tunnel endpoints.", [], "", 2],
    ["6081", "UDP", "Geneve", "Overlay encapsulation used by NSX and OVN.", [], "", 3],
    ["8000", "TCP", "vMotion", "VMware live migration of running VMs.", [], "", 3],
    ["6443", "TCP", "Kubernetes API", "kubectl, kubelets and controllers talk to the API server.", [], "", 2],
    ["2379–2380", "TCP", "etcd", "Kubernetes cluster database (client and peer). Never expose.", [], "risky", 3],
    ["10250", "TCP", "kubelet API", "API server to node for logs and exec. Must require authentication.", [], "risky", 3],
    ["30000–32767", "TCP/UDP", "NodePort", "Kubernetes NodePort Services, open on every node.", [], "", 3],
    ["8472", "UDP", "Flannel VXLAN", "Linux kernel default VXLAN port, used by Flannel.", [], "", 3]
  );

  /* ================================================================== */
  /* Virtualization host diagram                                         */
  /* ================================================================== */
  var host = {
    id: "host", title: "Virtualization host", viewBox: "0 0 1100 650",
    groups: [
      { x: 20, y: 12, w: 1060, h: 150, c: "core", label: "Physical network", sub: "trunks carry VLANs 20, 30, 40, 99, 100" },
      { x: 30, y: 180, w: 500, h: 456, c: "servers", label: "Host 1 · esx01", sub: "2 × 25 GbE" },
      { x: 570, y: 180, w: 500, h: 456, c: "servers", label: "Host 2 · esx02", sub: "2 × 25 GbE" }
    ],
    nodes: [
      { id: "core", label: "Core router / firewall", abbr: "L3", shape: "net", x: 550, y: 50, c: "core", lp: "r", concept: "router",
        meta: "Gateways for VLAN 20 (servers) and VLAN 100 (DMZ)",
        easy: "The physical router that connects the different network segments, and the rest of the company, to these servers.",
        text: "The same core router and firewall as on the main map. Hypervisors only switch; routing between VLANs, and the firewall policy, happen here unless an overlay with distributed routing is used.",
        deep: ["Inter-VLAN traffic between VMs on the same host still trombones through here. Watch uplink utilisation.", "With EVPN-VXLAN fabrics, the gateway can be anycast on every leaf switch instead."] },
      { id: "torA", label: "ToR switch A", abbr: "ToR", shape: "net", x: 330, y: 118, c: "core", lp: "l", concept: "switch",
        meta: "25 GbE trunk ports to each host · MLAG peer of B",
        easy: "One of two physical switches in the server rack. Every server plugs into both, so one switch can fail without anything going offline.",
        text: "Top-of-rack switch. Host uplinks are 802.1Q trunks allowing the server, DMZ, vMotion, storage and management VLANs. A and B form an MLAG pair so they behave as one switch.",
        deep: ["Host-facing ports should be edge ports (PortFast) with BPDU guard, since vSwitches never send BPDUs.", "Allow only the VLANs the hosts need on each trunk; a stray VLAN is an attack path and a failure domain."] },
      { id: "torB", label: "ToR switch B", abbr: "ToR", shape: "net", x: 770, y: 118, c: "core", lp: "r", concept: "switch",
        meta: "25 GbE trunk ports to each host · MLAG peer of A",
        easy: "The second rack switch, for redundancy.",
        text: "The other half of the switch pair. Each host has one uplink to A and one to B; if either switch fails, VMs keep running on the remaining uplink.",
        deep: ["Uplink failover relies on link-state tracking or beacon probing; a switch that stays up but loses its uplinks needs link-state tracking to trigger it."] },
      { id: "san", label: "Storage array", abbr: "SAN", shape: "srv", x: 1000, y: 118, c: "mgmt", lp: "b", concept: "storage-net",
        meta: "iSCSI 10.40.0.50 · VLAN 40 · MTU 9000",
        easy: "A central storage system where the virtual machines' disks are kept, so any host can run any VM.",
        text: "Shared block storage over iSCSI on a dedicated VLAN with jumbo frames. Because both hosts see the same disks, VMs can move between hosts and restart elsewhere if a host dies.",
        deep: ["Use two storage VLANs or subnets mapped to separate uplinks for true multipathing.", "Storage latency above a few milliseconds shows up as slow VMs long before anything logs an error."] },

      { id: "h1nic0", label: "vmnic0", abbr: "NIC", shape: "net", x: 170, y: 222, c: "servers", lp: "l", concept: "hypervisor",
        meta: "Physical uplink to ToR A · trunk",
        easy: "One of the server's real network ports, cabled to switch A.",
        text: "A physical NIC used as an uplink by the virtual switch. It carries tagged traffic for every port group on the host.",
        deep: ["Uplink teaming policy decides which VM uses which NIC; 'route based on originating virtual port' needs no switch configuration."] },
      { id: "h1nic1", label: "vmnic1", abbr: "NIC", shape: "net", x: 390, y: 222, c: "servers", lp: "r", concept: "hypervisor",
        meta: "Physical uplink to ToR B · trunk",
        easy: "The server's second real network port, cabled to switch B.",
        text: "The second uplink. vMotion and storage are pinned to this NIC by default, and fail over to vmnic0.",
        deep: ["Active/standby per port group separates heavy vMotion bursts from VM traffic without needing QoS."] },
      { id: "h1vs", label: "Virtual switch", abbr: "", shape: "bar", w: 440, x: 280, y: 312, c: "users", concept: "hypervisor",
        sub: "port groups: Servers v20 · DMZ v100 · vMotion v30 · Storage v40 · Mgmt v99",
        meta: "vSphere Distributed Switch · MTU 9000",
        easy: "A switch made of software inside the server. Virtual machines plug into it, and it connects them to each other and to the real network.",
        text: "The distributed virtual switch. Port groups put each VM's virtual NIC in a VLAN; frames between VMs in the same port group on this host are delivered in memory, and everything else goes out an uplink with an 802.1Q tag.",
        deep: ["A distributed switch is configured once in vCenter and pushed to every host, so port groups are identical cluster-wide.", "Features: NetFlow/IPFIX export, port mirroring (incl. ERSPAN), LACP, Network I/O Control, private VLANs."] },
      { id: "h1vmk", label: "VMkernel ports", abbr: "vmk", shape: "net", x: 105, y: 452, c: "mgmt", concept: "hypervisor",
        meta: "vmk0 mgmt 10.99.0.11 · vmk1 vMotion 10.30.0.11 · vmk2 iSCSI 10.40.0.11",
        easy: "The host's own network connections, used for managing the host, moving VMs and reaching storage.",
        text: "Interfaces for the hypervisor itself: management, vMotion and storage, each in its own VLAN and subnet so the traffic types can't interfere with each other or with VMs.",
        deep: ["Use separate TCP/IP stacks (the vMotion stack) so vMotion can have its own default gateway.", "Management VMkernel ports belong in a restricted management network: ESXi has been a ransomware target."] },
      { id: "dc01", label: "DC01 VM", abbr: "VM", shape: "srv", x: 215, y: 452, c: "servers", concept: "ad",
        meta: "10.20.0.10 · port group Servers (VLAN 20)",
        easy: "A virtual machine running the domain controller: a whole server, but in software.",
        text: "The domain controller from the main map runs as a VM. Its virtual NIC is in the Servers port group, VLAN 20.",
        deep: ["Keep domain controllers on separate hosts with anti-affinity rules, and protect the hypervisor accordingly: whoever controls the host controls the DC."] },
      { id: "app01", label: "APP01 VM", abbr: "VM", shape: "srv", x: 325, y: 452, c: "servers", concept: "http",
        meta: "10.20.0.17 · port group Servers (VLAN 20)",
        easy: "A virtual machine running the internal business app.",
        text: "The internal API server. Same port group as DC01, so their traffic stays inside the host.",
        deep: ["Moving APP01 with vMotion keeps its IP and MAC; the network learns its new location from a RARP sent by the destination host."] },
      { id: "web01", label: "WEB01 VM", abbr: "VM", shape: "srv", x: 435, y: 452, c: "dmz", concept: "dmz",
        meta: "172.16.100.20 · port group DMZ (VLAN 100)",
        easy: "The public web server, also a virtual machine, but on a separate, more exposed network segment.",
        text: "The DMZ web server running on the same physical host as internal servers. Its port group is VLAN 100, so it's still separated at layer 2, and all its traffic to the inside goes via the firewall.",
        deep: ["Mixing DMZ and internal VMs on one host is common but means a hypervisor escape crosses zones; high-security designs use dedicated DMZ clusters."] },
      { id: "h1hv", label: "Hypervisor (ESXi · Hyper-V · KVM)", abbr: "", shape: "bar", w: 440, x: 280, y: 586, c: "core", concept: "hypervisor",
        meta: "esx01 · 64 cores · 1 TB RAM",
        easy: "The software layer that turns one physical server into many virtual ones, sharing its processors, memory and network.",
        text: "The type-1 hypervisor schedules CPU and memory for every VM and runs the virtual switch in its kernel.",
        deep: ["Hypervisor CVEs (VM escape) are rare but critical; patch hosts on a schedule and restrict management access to a dedicated network."] },

      { id: "h2nic0", label: "vmnic0", abbr: "NIC", shape: "net", x: 680, y: 222, c: "servers", lp: "l", concept: "hypervisor",
        meta: "Physical uplink to ToR A · trunk", easy: "Host 2's first real network port.", text: "Uplink from host 2 to ToR A.", deep: [] },
      { id: "h2nic1", label: "vmnic1", abbr: "NIC", shape: "net", x: 930, y: 222, c: "servers", lp: "r", concept: "hypervisor",
        meta: "Physical uplink to ToR B · trunk", easy: "Host 2's second real network port.", text: "Uplink from host 2 to ToR B.", deep: [] },
      { id: "h2vs", label: "Virtual switch", abbr: "", shape: "bar", w: 440, x: 820, y: 312, c: "users", concept: "hypervisor",
        sub: "same distributed switch and port groups as host 1",
        meta: "vSphere Distributed Switch · MTU 9000",
        easy: "Host 2's built-in software switch, set up exactly like host 1's.",
        text: "The same distributed switch spans both hosts, so a VM finds identical port groups wherever it runs.",
        deep: ["Consistency is what makes live migration possible: if a port group is missing on the target host, vMotion is refused."] },
      { id: "h2vmk", label: "VMkernel ports", abbr: "vmk", shape: "net", x: 645, y: 452, c: "mgmt", concept: "hypervisor",
        meta: "vmk0 10.99.0.12 · vmk1 10.30.0.12 · vmk2 10.40.0.12",
        easy: "Host 2's own network connections.", text: "Management, vMotion and storage interfaces of host 2.", deep: [] },
      { id: "file01", label: "FILE01 VM", abbr: "VM", shape: "srv", x: 755, y: 452, c: "servers", concept: "file",
        meta: "10.20.0.13 · port group Servers (VLAN 20)",
        easy: "The file server, running as a virtual machine on the second host.",
        text: "The file server VM. Same VLAN as DC01 and APP01, but on another host, so traffic to it crosses the physical switches.",
        deep: ["Large SMB transfers between hosts are a classic cause of uplink congestion; Network I/O Control shares bandwidth by priority."] },
      { id: "k8sw", label: "K8S-W1 VM", abbr: "VM", shape: "srv", x: 865, y: 452, c: "servers", concept: "k8s",
        meta: "10.20.1.11 · Kubernetes worker node",
        easy: "A virtual machine that is itself part of a Kubernetes cluster. Containers run inside it.",
        text: "Kubernetes nodes are often VMs. This one is node 1 in the Kubernetes tab, so pods inside it sit behind two layers of virtual networking: the pod network on top of the VM's virtual NIC.",
        deep: ["Nested overlays (pod VXLAN inside an NSX Geneve segment) stack MTU overheads; set pod MTU accordingly or use native routing."] },
      { id: "fwvm", label: "FW-VM", abbr: "FW", shape: "sec", x: 975, y: 452, c: "guest", concept: "firewall",
        meta: "Virtual firewall appliance",
        easy: "A firewall that runs as a virtual machine instead of a physical box.",
        text: "Firewalls, load balancers and routers also come as virtual appliances. Some designs insert one between port groups to filter VM-to-VM traffic without leaving the cluster.",
        deep: ["Service insertion steers traffic through a virtual appliance; distributed firewalls avoid the bottleneck by enforcing at each vNIC instead."] },
      { id: "h2hv", label: "Hypervisor (ESXi · Hyper-V · KVM)", abbr: "", shape: "bar", w: 440, x: 820, y: 586, c: "core", concept: "hypervisor",
        meta: "esx02", easy: "Host 2's hypervisor.", text: "The second host in the cluster. If host 1 fails, HA restarts its VMs here.", deep: [] }
    ],
    links: [
      { from: "core", to: "torA" }, { from: "core", to: "torB" }, { from: "torA", to: "torB", kind: "span" },
      { from: "torB", to: "san" },
      { from: "torA", to: "h1nic0" }, { from: "torB", to: "h1nic1" },
      { from: "torA", to: "h2nic0" }, { from: "torB", to: "h2nic1" },
      { from: "h1vs", to: "h1nic0", kind: "drop" }, { from: "h1vs", to: "h1nic1", kind: "drop" },
      { from: "h1vs", to: "h1vmk", kind: "drop" }, { from: "h1vs", to: "dc01", kind: "drop" },
      { from: "h1vs", to: "app01", kind: "drop" }, { from: "h1vs", to: "web01", kind: "drop" },
      { from: "h2vs", to: "h2nic0", kind: "drop" }, { from: "h2vs", to: "h2nic1", kind: "drop" },
      { from: "h2vs", to: "h2vmk", kind: "drop" }, { from: "h2vs", to: "file01", kind: "drop" },
      { from: "h2vs", to: "k8sw", kind: "drop" }, { from: "h2vs", to: "fwvm", kind: "drop" }
    ],
    scenarios: [
      { id: "same-host", title: "Two VMs on the same host", blurb: "Switched in memory, invisible to the physical network.",
        deep: ["Virtual switches don't run spanning tree: they never forward between uplinks, so loops are impossible by design.", "Port-group security: set promiscuous mode, MAC changes and forged transmits to Reject unless an appliance needs them.", "For east-west visibility use vSwitch IPFIX, ERSPAN to a sensor, or distributed firewall logs."],
        steps: [
          { path: ["app01", "h1vs", "dc01"], title: "Switched inside the host",
            easy: "Two virtual machines on the same physical server talk through the server's built-in virtual switch. The traffic never leaves the box.",
            text: "APP01 asks DC01 for a DNS lookup. Both VMs are in the Servers port group (VLAN 20) on the same host, so the virtual switch copies the frame from one virtual NIC to the other in memory. It never touches a cable.",
            pkts: [{ label: "Frame inside the vSwitch", layers: [["L2", "00:50:56:a1:20:17 → 00:50:56:a1:20:10 · untagged at the vNIC"], ["L3", "10.20.0.17 → 10.20.0.10"], ["L4", "UDP 50331 → 53"], ["L7", "A? files01.corp.meridian.example"]] }] },
          { path: ["app01", "h1vs", "dc01"], title: "Invisible to the physical network",
            easy: "Because the traffic never leaves the server, the company's network security tools can't see it. Virtual networks need their own security built in.",
            text: "The physical IDS, the firewall and the switch counters never see this conversation. That's why virtual environments add their own controls: a distributed firewall at each virtual NIC, port mirroring on the virtual switch, and flow logs from the hypervisor.",
            pkts: [{ label: "Who sees it", layers: [["CHK", "Physical IDS: no · ToR counters: no · core firewall: no"], ["CHK", "vSwitch port mirror / IPFIX: yes · distributed firewall: yes"]] }] }
        ] },
      { id: "cross-vlan", title: "A VM reaches another VLAN", blurb: "Tagged on the uplink, routed outside the host, and back again.",
        deep: ["Port groups usually tag in the vSwitch (VST). VLAN 4095 passes tags through to the guest (VGT); EST tags at the physical switch.", "Teaming with IP hash needs a static port channel on the switch; LACP needs a distributed switch.", "Distributed logical routing (NSX, OVN) puts the gateway in every hypervisor, so routed east-west traffic never trombones."],
        steps: [
          { path: ["web01", "h1vs", "h1nic0"], title: "Tagged on the way out",
            easy: "A virtual machine needs to reach a machine on a different network segment, so its traffic leaves the server labelled with its segment number.",
            text: "WEB01 sits in the DMZ port group (VLAN 100). APP01 is in another subnet, so the frame goes to WEB01's default gateway. The virtual switch adds an 802.1Q tag for VLAN 100 and sends it up a physical trunk.",
            pkts: [{ label: "On the uplink", layers: [["L2", "00:50:56:a1:64:14 → gateway MAC · 802.1Q VLAN 100"], ["L3", "172.16.100.20 → 10.20.0.17"], ["L4", "TCP 50101 → 443"]] }] },
          { path: ["h1nic0", "torA", "core"], title: "Routed and filtered outside the host",
            easy: "The physical router and firewall decide whether this is allowed, exactly as they would for physical servers.",
            text: "The ToR switch carries the tagged frame to the core router and firewall, which routes from VLAN 100 to VLAN 20 and applies the DMZ policy. The host only switches; it doesn't route.",
            pkts: [{ label: "At the core", layers: [["CHK", "Firewall: DMZ web → 10.20.0.17 tcp/443 allow"], ["L3", "Routed VLAN 100 → VLAN 20 · TTL 64 → 63"]] }] },
          { path: ["core", "torA", "h1nic0", "h1vs", "app01"], title: "Back to the same host",
            easy: "The traffic comes all the way back to the server it started on. Modern virtual networking can avoid this detour.",
            text: "APP01 lives on the same host, so the packet goes straight back down the trunk it came up, now tagged VLAN 20. This hairpin (or trombone) doubles uplink traffic. Overlays with distributed routing fix it by routing inside each host.",
            pkts: [{ label: "Down the trunk", layers: [["L2", "gateway MAC → 00:50:56:a1:20:17 · 802.1Q VLAN 20"], ["L3", "172.16.100.20 → 10.20.0.17"]] }] }
        ] },
      { id: "vmotion", title: "Live migration (vMotion)", blurb: "Moving a running VM to another host with no downtime.",
        deep: ["Requirements: the VM's port groups on both hosts, shared (or migrated) storage, and compatible CPUs (EVC).", "Encrypt vMotion on untrusted networks: it streams raw memory, including secrets.", "Long-distance vMotion needs about 150 ms RTT or less and layer 2 for the VM, usually provided by an overlay rather than stretched VLANs."],
        steps: [
          { path: ["h1vmk", "h1vs", "h1nic1", "torB", "h2nic1", "h2vs", "h2vmk"], title: "Copy the running memory",
            easy: "A running virtual machine is moved to another physical server without switching it off, by copying its memory across the network.",
            text: "An admin moves APP01 to host 2. Host 1's vMotion interface streams the VM's memory to host 2 over the dedicated vMotion VLAN, then re-sends pages that changed, again and again, until what's left is tiny.",
            pkts: [{ label: "vMotion stream", layers: [["L2", "802.1Q VLAN 30 (vMotion)"], ["L3", "10.30.0.11 → 10.30.0.12"], ["L4", "TCP 8000"], ["L7", "Memory pre-copy: 16 GB, pass 1 → pass 4 (dirty pages only)"]] }] },
          { path: ["h2vs", "h2nic0", "torA"], title: "Switch over and announce the move",
            easy: "The VM pauses for a split second, wakes up on the new server, and announces \"I'm over here now\" so the network sends its traffic to the right place.",
            text: "APP01 pauses for well under a second while the last pages and CPU state move, then resumes on host 2. Host 2 immediately sends a RARP for APP01's MAC address so the physical switches update their MAC tables and traffic follows the VM.",
            pkts: [{ label: "Announcement", layers: [["L2", "RARP · src 00:50:56:a1:20:17 → ff:ff:ff:ff:ff:ff · VLAN 20"], ["CHK", "ToR A MAC table: 00:50:56:a1:20:17 now on Eth1/7 (host 2)"]] }] }
        ] },
      { id: "storage", title: "Storage traffic (iSCSI)", blurb: "VM disks over a dedicated, jumbo-frame network.",
        deep: ["Bind two VMkernel ports to separate uplinks for multipathing, with the round-robin path policy.", "Test end-to-end jumbo frames without fragmentation: `vmkping -d -s 8972 10.40.0.50`.", "NVMe over TCP or RoCE lowers latency further, but RoCE needs a lossless network (PFC, ECN)."],
        steps: [
          { path: ["h1vmk", "h1vs", "h1nic1", "torB", "san"], title: "Disks over the network",
            easy: "The virtual machines' hard drives are really stored on a central storage system, reached over its own dedicated lane.",
            text: "VM disks live on the shared array so any host can run any VM. The hypervisor reaches it through its storage interface on VLAN 40, with jumbo frames (MTU 9000) end to end and a second path for redundancy.",
            pkts: [{ label: "iSCSI write", layers: [["L2", "802.1Q VLAN 40 (storage) · MTU 9000"], ["L3", "10.40.0.11 → 10.40.0.50"], ["L4", "TCP 51023 → 3260"], ["L7", "iSCSI SCSI WRITE(10) · LUN 3 · 64 KB"]] }] }
        ] },
      { id: "overlay", title: "Overlay network & distributed firewall", blurb: "A virtual network on top of the physical one, with policy at every VM.",
        deep: ["VXLAN adds 50 bytes and Geneve more; set the underlay MTU to at least 1600, usually 9000.", "BGP EVPN distributes MAC/IP reachability (route types 2 and 5) instead of flood-and-learn.", "Roll out micro-segmentation by tagging applications, running rules in monitor mode, then enforcing default deny per application."],
        steps: [
          { path: ["app01", "h1vs", "h1nic0", "torA", "core", "torB", "h2nic1", "h2vs", "file01"], title: "A virtual network on top of the physical one",
            easy: "Software builds virtual networks on top of the physical one by wrapping each message in an outer envelope addressed to the right server.",
            text: "With an overlay (VMware NSX, OVN, Hyper-V SDN), APP01 and FILE01 share a logical segment even though the physical network only routes between hosts. Host 1's tunnel endpoint wraps APP01's whole Ethernet frame in UDP addressed to host 2, which unwraps it and delivers it to FILE01.",
            pkts: [
              { label: "Outer packet (underlay)", layers: [["L3", "TEP 10.50.0.11 → TEP 10.50.0.12"], ["L4", "UDP 61001 → 6081 (Geneve) or 4789 (VXLAN)"], ["L2", "Segment ID (VNI) 71001"]] },
              { label: "Inner frame (overlay)", layers: [["L2", "00:50:56:a1:20:17 → 00:50:56:a2:20:13"], ["L3", "10.20.0.17 → 10.20.0.13"], ["L4", "TCP 50544 → 445"]] }
            ] },
          { path: ["web01", "h1vs"], title: "Blocked at the virtual NIC",
            easy: "A firewall built into each virtual machine's network connection blocks the attempt straight away, and the rules move with the VM.",
            text: "WEB01 in the DMZ tries to reach FILE01. The distributed firewall runs in the hypervisor at every virtual NIC, so the packet is dropped before it even reaches the virtual switch. Rules are written by VM tag, not IP, and follow the VM when it moves.",
            pkts: [{ label: "Attempt", layers: [["L3", "172.16.100.20 → 10.20.0.13"], ["L4", "TCP 51200 → 445"]] }, { label: "Verdict", layers: [["DROP", "Distributed firewall at WEB01's vNIC: tag:dmz → tag:file-servers any · deny"]] }] }
        ] }
    ]
  };

  /* ================================================================== */
  /* Kubernetes cluster diagram                                          */
  /* ================================================================== */
  var k8s = {
    id: "k8s", title: "Kubernetes cluster", viewBox: "0 0 1100 650",
    groups: [
      { x: 20, y: 12, w: 1060, h: 92, c: "inet", label: "Outside the cluster", sub: "" },
      { x: 20, y: 116, w: 1060, h: 524, c: "core", label: "Kubernetes cluster", sub: "pods 10.244.0.0/16 · services 10.96.0.0/12" },
      { x: 760, y: 136, w: 308, h: 192, c: "mgmt", label: "Control plane", sub: "" },
      { x: 32, y: 344, w: 340, h: 284, c: "servers", label: "Node 1", sub: "10.20.1.11 · pods 10.244.1.0/24" },
      { x: 386, y: 344, w: 340, h: 284, c: "servers", label: "Node 2", sub: "10.20.1.12 · pods 10.244.2.0/24" },
      { x: 740, y: 344, w: 328, h: 284, c: "servers", label: "Node 3", sub: "10.20.1.13 · pods 10.244.3.0/24" }
    ],
    nodes: [
      { id: "user", label: "Customer", abbr: "USR", shape: "ext", x: 110, y: 56, c: "inet", lp: "r", concept: "http",
        meta: "198.51.100.77", easy: "Someone on the Internet visiting the shop website.", text: "An external user of the shop website, which runs on this cluster.", deep: [] },
      { id: "lb", label: "Load balancer", abbr: "LB", shape: "sec", x: 360, y: 56, c: "dmz", lp: "r", concept: "ingress",
        meta: "VIP 203.0.113.40 · Service type LoadBalancer",
        easy: "The single public entry point that spreads visitors across the cluster.",
        text: "A Service of type LoadBalancer. In the cloud the provider creates the LB; on-premises MetalLB (or a hardware LB) announces the virtual IP and forwards to the ingress controller.",
        deep: ["MetalLB L2 mode answers ARP from one node and fails over with gratuitous ARP; BGP mode advertises the VIP for ECMP across nodes.", "externalTrafficPolicy: Local keeps the client IP but only sends to nodes running an ingress pod."] },
      { id: "admin", label: "Admin (kubectl)", abbr: "CLI", shape: "end", x: 940, y: 56, c: "mgmt", lp: "r", concept: "k8s",
        meta: "kubeconfig with OIDC or a client certificate",
        easy: "An engineer telling the cluster what to run.", text: "Admins and CI pipelines change the cluster only through the API server, using kubectl or GitOps tools.",
        deep: ["Prefer short-lived OIDC tokens over long-lived client certificates, which can't be revoked without rotating the CA."] },

      { id: "underlay", label: "Node network", abbr: "SW", shape: "net", x: 555, y: 196, c: "core", lp: "l", concept: "switch",
        meta: "10.20.1.0/24 (VLAN or VM network)",
        easy: "The ordinary network connecting the cluster's servers. It only knows the servers' addresses, not the pods'.",
        text: "The network between nodes. It can be physical switches or, as here, the virtual switch on the hypervisors (the K8S-W1 VM in the other tab is node 1). It routes node IPs; the CNI makes pod IPs work on top.",
        deep: ["With BGP-mode CNIs (Calico, Cilium), nodes peer with the ToR switches and advertise pod CIDRs, so no overlay is needed."] },
      { id: "apiserver", label: "API server", abbr: "API", shape: "srv", x: 840, y: 196, c: "mgmt", concept: "k8s",
        meta: "https://10.20.1.10:6443",
        easy: "The cluster's front desk and brain: every change and every question goes through it.",
        text: "The only component everything talks to. It authenticates requests, checks RBAC, runs admission control, and stores the desired state in etcd. Nodes and controllers watch it for changes.",
        deep: ["Expose it only to admin and node networks; public API servers are scanned constantly.", "Audit logs from the API server are the most valuable Kubernetes security log source."] },
      { id: "etcd", label: "etcd", abbr: "DB", shape: "srv", x: 990, y: 196, c: "mgmt", concept: "k8s",
        meta: "2379 client · 2380 peer · mTLS",
        easy: "The cluster's database, where it writes down everything that should be running.",
        text: "A consistent key-value store holding all cluster state. Only the API server talks to it.",
        deep: ["Run 3 or 5 members for quorum. Encrypt Secrets at rest and back up etcd: losing it means losing the cluster."] },
      { id: "sched", label: "Scheduler", abbr: "SCH", shape: "srv", x: 840, y: 286, c: "mgmt", concept: "k8s",
        meta: "kube-scheduler", easy: "Decides which server each new app copy should run on.",
        text: "Watches for pods without a node and binds each to a node with enough resources, honouring affinity, taints and topology spread.", deep: [] },
      { id: "ctrl", label: "Controllers", abbr: "CTL", shape: "srv", x: 990, y: 286, c: "mgmt", concept: "k8s",
        meta: "kube-controller-manager", easy: "Robots that keep checking reality matches what was asked for, and fix it when it doesn't.",
        text: "Reconciliation loops: the Deployment controller creates ReplicaSets and pods, the EndpointSlice controller tracks which pods back each Service, and so on.", deep: [] },

      { id: "svcweb", label: "Service: web", abbr: "VIP", shape: "vip", x: 250, y: 284, c: "edge", lp: "r", concept: "k8s-svc",
        meta: "ClusterIP 10.96.0.20:80 → web pods :8080",
        easy: "A permanent name and address for the website's pods. It's virtual: no machine actually has this address.",
        text: "A ClusterIP Service selecting app=web. Its virtual IP exists only as rules programmed on every node; the dashed lines show its current endpoints.",
        deep: ["EndpointSlices update within seconds as pods become ready or not; clients never need to know pod IPs."] },
      { id: "svcapi", label: "Service: api", abbr: "VIP", shape: "vip", x: 690, y: 300, c: "edge", lp: "l", concept: "k8s-svc",
        meta: "ClusterIP 10.96.0.30:80 → api pods :8080 · api.shop.svc.cluster.local",
        easy: "A permanent name and address for the api pods, which may be running on any server.",
        text: "A ClusterIP Service for the api pods on nodes 2 and 3. Callers use the DNS name api; kube-proxy picks a pod for each connection.",
        deep: ["Headless Services (clusterIP: None) skip the VIP and return pod IPs from DNS, as stateful sets and some databases need."] },

      { id: "n1nic", label: "eth0", abbr: "NIC", shape: "net", x: 200, y: 392, c: "servers", lp: "r", concept: "k8s",
        meta: "10.20.1.11", easy: "Node 1's network connection.", text: "The node's own interface on the node network. Pod traffic to other nodes leaves here, encapsulated or natively routed.", deep: [] },
      { id: "n1br", label: "cni0 bridge · kube-proxy rules", abbr: "", shape: "bar", w: 300, x: 200, y: 470, c: "users", concept: "k8s",
        meta: "veth pairs to each pod · iptables/IPVS or eBPF",
        easy: "The software inside the server that connects its pods to each other and to the rest of the cluster.",
        text: "Each pod's eth0 is one end of a veth pair whose other end sits on this bridge (or an eBPF hook). The node's routing table and kube-proxy rules live here too.",
        deep: ["Inspect with `ip netns`, `ip route`, `iptables -t nat -L KUBE-SERVICES`, or `cilium bpf lb list`."] },
      { id: "ingress", label: "Ingress controller", abbr: "ING", shape: "pod", x: 100, y: 566, c: "dmz", concept: "ingress",
        meta: "pod 10.244.1.4 · ingress-nginx",
        easy: "The cluster's front door, running as a pod. It reads which website and page was asked for and forwards the visitor.",
        text: "A reverse proxy running in the cluster. It terminates TLS for shop.example and routes by host and path to Services.",
        deep: ["The Gateway API is replacing Ingress, with separate Gateway and HTTPRoute resources for platform and app teams."] },
      { id: "weba", label: "web pod", abbr: "POD", shape: "pod", x: 200, y: 566, c: "users", concept: "k8s",
        meta: "10.244.1.7 · app=web", easy: "One copy of the website, running as a pod.", text: "A web front-end pod. It calls the api Service for data.", deep: [] },
      { id: "dns", label: "CoreDNS", abbr: "DNS", shape: "pod", x: 300, y: 566, c: "users", concept: "dns",
        meta: "pod 10.244.1.3 · Service kube-dns 10.96.0.10",
        easy: "The cluster's own phone book, answering for names like api.",
        text: "Answers cluster DNS names (service.namespace.svc.cluster.local) from the API and forwards everything else upstream.",
        deep: ["ndots:5 in pod resolv.conf causes several lookups for external names; use FQDNs with a trailing dot or tune ndots.", "NodeLocal DNSCache cuts latency and conntrack pressure on busy clusters."] },

      { id: "n2nic", label: "eth0", abbr: "NIC", shape: "net", x: 555, y: 392, c: "servers", lp: "r", concept: "k8s",
        meta: "10.20.1.12", easy: "Node 2's network connection.", text: "Node 2's interface on the node network.", deep: [] },
      { id: "n2br", label: "cni0 bridge · kube-proxy rules", abbr: "", shape: "bar", w: 300, x: 555, y: 470, c: "users", concept: "k8s",
        meta: "veth pairs · policy enforcement", easy: "Node 2's software connector for its pods.", text: "Node 2's pod networking and Service rules.", deep: [] },
      { id: "webb", label: "web pod", abbr: "POD", shape: "pod", x: 455, y: 566, c: "users", concept: "k8s",
        meta: "10.244.2.6 · app=web", easy: "A second copy of the website.", text: "Another replica of the web Deployment, so the site survives losing a node.", deep: [] },
      { id: "apia", label: "api pod", abbr: "POD", shape: "pod", x: 555, y: 566, c: "users", concept: "k8s",
        meta: "10.244.2.9 · app=api", easy: "One copy of the app's back end.", text: "An api replica behind the api Service.", deep: [] },
      { id: "debug", label: "debug pod (dev)", abbr: "POD", shape: "pod", x: 655, y: 566, c: "guest", concept: "netpol",
        meta: "10.244.2.12 · namespace dev",
        easy: "A pod from a different team that shouldn't be talking to the database.",
        text: "A troubleshooting pod in another namespace. Without network policy it could reach every pod in the cluster.", deep: [] },

      { id: "n3nic", label: "eth0", abbr: "NIC", shape: "net", x: 905, y: 392, c: "servers", lp: "r", concept: "k8s",
        meta: "10.20.1.13", easy: "Node 3's network connection.", text: "Node 3's interface on the node network.", deep: [] },
      { id: "n3br", label: "cni0 bridge · kube-proxy rules", abbr: "", shape: "bar", w: 290, x: 905, y: 470, c: "users", concept: "k8s",
        meta: "veth pairs · policy enforcement", easy: "Node 3's software connector for its pods.", text: "Node 3's pod networking. NetworkPolicy for the db pod is enforced here.", deep: [] },
      { id: "apib", label: "api pod", abbr: "POD", shape: "pod", x: 835, y: 566, c: "users", concept: "k8s",
        meta: "10.244.3.5 · app=api", easy: "Another copy of the app's back end.", text: "A second api replica.", deep: [] },
      { id: "db", label: "db pod", abbr: "DB", shape: "pod", x: 975, y: 566, c: "servers", concept: "netpol",
        meta: "10.244.3.8 · app=db · port 5432",
        easy: "The database, running as a pod and protected by a network policy.",
        text: "PostgreSQL in a StatefulSet. A NetworkPolicy allows ingress only from pods labelled app=api on port 5432.", deep: [] }
    ],
    links: [
      { from: "user", to: "lb" }, { from: "lb", to: "underlay" }, { from: "admin", to: "apiserver" },
      { from: "underlay", to: "apiserver" }, { from: "apiserver", to: "etcd" }, { from: "apiserver", to: "sched" }, { from: "apiserver", to: "ctrl" },
      { from: "underlay", to: "n1nic" }, { from: "underlay", to: "n2nic" }, { from: "underlay", to: "n3nic" },
      { from: "n1br", to: "n1nic", kind: "drop" }, { from: "n1br", to: "ingress", kind: "drop" }, { from: "n1br", to: "weba", kind: "drop" }, { from: "n1br", to: "dns", kind: "drop" },
      { from: "n2br", to: "n2nic", kind: "drop" }, { from: "n2br", to: "webb", kind: "drop" }, { from: "n2br", to: "apia", kind: "drop" }, { from: "n2br", to: "debug", kind: "drop" },
      { from: "n3br", to: "n3nic", kind: "drop" }, { from: "n3br", to: "apib", kind: "drop" }, { from: "n3br", to: "db", kind: "drop" },
      { from: "svcweb", to: "weba", kind: "virtual" }, { from: "svcweb", to: "webb", kind: "virtual" },
      { from: "svcapi", to: "apia", kind: "virtual" }, { from: "svcapi", to: "apib", kind: "virtual" }
    ],
    scenarios: [
      { id: "pod2pod", title: "Pod to pod across nodes", blurb: "Every pod has its own IP; the CNI connects the nodes.",
        deep: ["The Kubernetes network model: all pods reach all pods and nodes without NAT. How is up to the CNI.", "eBPF dataplanes attach programs to veth and NIC hooks, skipping iptables and giving identity-based policy and flow logs.", "Plan pod and service CIDRs so they don't overlap corporate or VPN ranges, or on-prem systems become unreachable."],
        steps: [
          { path: ["weba", "n1br", "n1nic"], title: "Out of the pod",
            easy: "In Kubernetes every pod has its own address and can talk to any other pod directly.",
            text: "The web pod (10.244.1.7) calls the api pod (10.244.2.9) directly: Kubernetes requires pods to reach each other without NAT. The packet leaves the pod's network namespace through a veth pair onto the node's bridge, and node 1's routing table says 10.244.2.0/24 is on node 2.",
            pkts: [{ label: "Inside node 1", layers: [["L3", "10.244.1.7 → 10.244.2.9"], ["L4", "TCP 41822 → 8080"], ["CHK", "Route: 10.244.2.0/24 via 10.20.1.12 (programmed by the CNI)"]] }] },
          { path: ["n1nic", "underlay", "n2nic"], title: "Across the node network",
            easy: "The message travels between the servers, wrapped so the ordinary network can carry it.",
            text: "The node network only knows node addresses. So the CNI either wraps the pod packet in VXLAN (Flannel, or Calico in overlay mode) or advertises pod routes with BGP so the network routes them natively (Calico, Cilium native routing).",
            pkts: [{ label: "Outer (VXLAN mode)", layers: [["L3", "10.20.1.11 → 10.20.1.12"], ["L4", "UDP → 8472 (Flannel) or 4789"]] }, { label: "Inner", layers: [["L3", "10.244.1.7 → 10.244.2.9"], ["L4", "TCP 41822 → 8080"]] }] },
          { path: ["n2nic", "n2br", "apia"], title: "Into the destination pod",
            easy: "The second server unwraps the message and hands it to the right pod.",
            text: "Node 2 unwraps it, and its bridge delivers it through the api pod's veth into its namespace. The api pod sees the real source pod IP; nothing was NATed.",
            pkts: [{ label: "Delivered", layers: [["L2", "veth → eth0 inside the pod"], ["L3", "10.244.1.7 → 10.244.2.9"]] }] }
        ] },
      { id: "service", title: "Calling a Service", blurb: "Cluster DNS, a virtual IP, and DNAT to a real pod.",
        deep: ["Service types: ClusterIP, NodePort (30000–32767 on every node), LoadBalancer, ExternalName; headless Services return pod IPs.", "kube-proxy iptables mode chooses endpoints randomly via statistic rules; IPVS has real algorithms; EndpointSlices scale to thousands of pods.", "Connection tracking holds the DNAT for each flow; conntrack table exhaustion on busy nodes drops new connections."],
        steps: [
          { path: ["weba", "n1br", "dns"], title: "Look up the Service name",
            easy: "The pod asks the cluster's own phone book for the address of the api service.",
            text: "The web pod calls http://api. Its resolv.conf points at CoreDNS, which answers from the cluster's own records: api.shop.svc.cluster.local is 10.96.0.30, the Service's stable ClusterIP.",
            pkts: [{ label: "Query", layers: [["L3", "10.244.1.7 → 10.96.0.10 (kube-dns Service)"], ["L4", "UDP 53"], ["L7", "A? api.shop.svc.cluster.local → 10.96.0.30"]] }] },
          { path: ["weba", "svcapi"], title: "Aim at the virtual IP",
            easy: "It sends its request to the service's address, which is virtual: no real machine has it.",
            text: "The web pod connects to 10.96.0.30:80. No machine owns that address. It exists only as rules that kube-proxy (iptables or IPVS) or an eBPF dataplane has programmed on every node.",
            pkts: [{ label: "As sent", layers: [["L3", "10.244.1.7 → 10.96.0.30"], ["L4", "TCP 41900 → 80"]] }] },
          { path: ["weba", "n1br", "n1nic", "underlay", "n3nic", "n3br", "apib"], title: "Rewritten to a real pod",
            easy: "The node quietly swaps the virtual address for a real pod's address, picking one of the healthy copies, and sends it on.",
            text: "On node 1, before the packet even leaves, the Service rule picks a healthy endpoint (the api pod on node 3) and DNATs the destination to 10.244.3.5:8080. Connection tracking reverses it on the reply, so the web pod only ever sees the Service IP.",
            pkts: [{ label: "After DNAT", layers: [["L3", "10.244.1.7 → 10.244.3.5"], ["L4", "TCP 41900 → 8080"], ["CHK", "Endpoints: 10.244.2.9 (node 2), 10.244.3.5 (node 3) → chose node 3"]] }] }
        ] },
      { id: "ingress", title: "A customer reaches the website", blurb: "Load balancer, ingress controller, Service, pod.",
        deep: ["Gateway API (Gateway, HTTPRoute) is the successor to Ingress, with role separation and richer matching.", "cert-manager automates certificates over ACME; TLS passthrough keeps encryption to the pod but limits routing to SNI.", "Preserve the client IP with externalTrafficPolicy: Local or the PROXY protocol, or every request appears to come from a node."],
        steps: [
          { path: ["user", "lb", "underlay", "n1nic", "n1br", "ingress"], title: "Load balancer to ingress",
            easy: "The customer reaches a load balancer at the edge of the cluster, which passes them to the ingress, the cluster's front door.",
            text: "shop.example resolves to the load balancer's address. A Service of type LoadBalancer (a cloud LB, or MetalLB on-premises) forwards the connection to the ingress controller pods.",
            pkts: [{ label: "Inbound", layers: [["L3", "198.51.100.77 → 203.0.113.40 (LB VIP)"], ["L4", "TCP 443"], ["TLS", "SNI shop.example"]] }] },
          { path: ["ingress", "n1br", "n1nic", "underlay", "n2nic", "n2br", "webb"], title: "Ingress routes by host and path",
            easy: "The ingress reads which website and page was asked for and forwards the request to a web pod.",
            text: "The ingress controller terminates TLS with the site's certificate, matches Host: shop.example and path /, and proxies to an endpoint of the web Service: here, the web pod on node 2.",
            pkts: [{ label: "Proxied", layers: [["L3", "10.244.1.4 → 10.244.2.6"], ["L4", "TCP → 8080"], ["L7", "GET / · Host: shop.example · X-Forwarded-For: 198.51.100.77"]] }] }
        ] },
      { id: "netpol", title: "A network policy blocks a pod", blurb: "Labels, not IPs, decide who may reach the database.",
        deep: ["A pod becomes isolated for a direction once any policy selects it; start with a default-deny policy per namespace.", "Allow egress to kube-dns (UDP/TCP 53) whenever you add default-deny egress.", "Core NetworkPolicy is L3/L4 only; Cilium and service meshes add L7 rules and mutual-TLS identity."],
        steps: [
          { path: ["debug", "n2br", "n2nic", "underlay", "n3nic", "n3br", "db"], title: "Denied by NetworkPolicy",
            easy: "A pod that shouldn't talk to the database tries anyway. A network policy, a firewall rule for pods, blocks it.",
            text: "A debug pod in the dev namespace tries the database on 5432. Kubernetes allows all pod traffic by default, but a NetworkPolicy says only pods labelled app=api may reach app=db on 5432. The CNI on node 3 enforces it and drops the connection.",
            pkts: [{ label: "Attempt", layers: [["L3", "10.244.2.12 → 10.244.3.8"], ["L4", "TCP 50012 → 5432 · SYN"]] }, { label: "Verdict", layers: [["DROP", "NetworkPolicy db-allow-api: podSelector app=db · ingress only from app=api :5432"]] }] },
          { path: ["apib", "n3br", "db"], title: "The allowed path",
            easy: "The api pod is on the allowed list, so it gets through.",
            text: "The api pod matches the policy's allowed selector and connects normally. Policies select by label, not IP, so they keep working as pods are rescheduled.",
            pkts: [{ label: "Allowed", layers: [["L3", "10.244.3.5 → 10.244.3.8"], ["L4", "TCP 5432"], ["CHK", "Matches ingress rule: from podSelector app=api ✓"]] }] }
        ] },
      { id: "apply", title: "kubectl apply: a pod is born", blurb: "API server, etcd, scheduler and kubelet.",
        deep: ["Everything goes through the API server; nodes never talk to etcd directly.", "Admission control (Pod Security Admission, Kyverno, OPA Gatekeeper) can reject or mutate objects before they're stored.", "Control-plane HA: 3 or 5 etcd members for quorum and several API servers behind a load balancer."],
        steps: [
          { path: ["admin", "apiserver", "etcd"], title: "Desired state recorded",
            easy: "An admin tells the cluster what should run. The cluster's brain checks they're allowed, and writes it down in its database.",
            text: "kubectl authenticates to the API server over HTTPS (6443) with an OIDC token or client certificate. RBAC checks permission, admission controllers validate the object, and the Deployment is stored in etcd.",
            pkts: [{ label: "API call", layers: [["L4", "TCP 6443"], ["TLS", "Server cert from the cluster CA · bearer token (OIDC)"], ["L7", "PATCH /apis/apps/v1/namespaces/shop/deployments/api"]] }, { label: "Stored", layers: [["L4", "TCP 2379 · mutual TLS"]] }] },
          { path: ["sched", "apiserver"], title: "The scheduler picks a node",
            easy: "The scheduler decides which server has room to run the new pod.",
            text: "Controllers create the new pod objects. The scheduler, watching the API server, sees an unscheduled pod and binds it to the node with enough free CPU and memory: node 3.",
            pkts: [{ label: "Watch and bind", layers: [["L7", "WATCH pods (spec.nodeName empty) → POST …/pods/api-7c9/binding {node3}"]] }] },
          { path: ["apiserver", "underlay", "n3nic"], title: "The kubelet starts it",
            easy: "The chosen server downloads the app, gives the new pod an address, and starts it.",
            text: "Node 3's kubelet watches for pods bound to it. It pulls the image, asks the CNI plugin for a pod IP and network, and starts the containers. Once the readiness probe passes, the pod is added to the api Service's endpoints.",
            pkts: [{ label: "kubelet", layers: [["L4", "TCP 6443 (kubelet → API watch) · 10250 (API → kubelet for logs and exec)"], ["CHK", "CNI ADD → pod IP 10.244.3.9 assigned"]] }] }
        ] }
    ]
  };

  NET.virt = [host, k8s];
})();
