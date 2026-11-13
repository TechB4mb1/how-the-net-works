/* How the Net Works — German content, part 3: virtual networks
   (concepts, virtualization host and Kubernetes diagrams). */
(function () {
  if (window.LANG !== "de") return;
  var NET = window.NET;

  /* ---------------- concepts ---------------- */
  var C = {
    hypervisor: { name: "Hypervisoren & virtuelle Switches", layer: "L2 (virtuell)",
      easy: "Ein Hypervisor lässt einen physischen Server viele virtuelle Computer betreiben. Ein virtueller Switch darin verbindet sie, genau wie ein echter Switch.",
      what: "Ein Hypervisor betreibt viele virtuelle Maschinen (VMs) auf einem physischen Server. Jede VM hat virtuelle Netzwerkkarten, die an einem virtuellen Switch im Host hängen, der über die echten Netzwerkkarten des Servers das physische Netz erreicht.",
      how: ["Typ-1-Hypervisoren (Bare Metal) laufen direkt auf der Hardware: VMware ESXi, Microsoft Hyper-V, KVM (Proxmox, OpenStack, Nutanix AHV).", "Virtuelle Switches (vSphere Standard oder Distributed Switch, Hyper-V Virtual Switch, Linux Bridge, Open vSwitch) leiten Frames zwischen VMs und zu den Uplinks.", "Portgruppen ordnen VMs VLANs zu. Die physischen Uplinks des Hosts sind 802.1Q-Trunks zu den Top-of-Rack-Switches.", "Host-Schnittstellen (VMkernel-Ports bei ESXi) tragen den eigenen Verkehr des Hypervisors in getrennten VLANs: Management, Live-Migration und Storage.", "Verkehr zwischen VMs auf demselben Host in derselben Portgruppe berührt das physische Netz nie.", "Live-Migration (vMotion, Hyper-V Live Migration) verschiebt laufende VMs zwischen Hosts; die VM behält ihre IP- und MAC-Adressen."],
      ports: "ESXi-Verwaltung 443/902 · vMotion 8000 · Hyper-V Live Migration 6600",
      breaks: "Ein falsches VLAN auf einem Uplink-Trunk schneidet dieses Netz für jede VM auf dem Host ab. Verkehr innerhalb eines Hosts ist für physische Sicherheitswerkzeuge unsichtbar, sofern man keine virtuellen ergänzt.",
      examples: "VMware vSphere, Microsoft Hyper-V, Proxmox VE, Nutanix AHV, OpenStack.",
      deep: ["Virtuelle Switches leiten nie zwischen Uplinks weiter und brauchen daher kein Spanning Tree. Die Sicherheit der Portgruppen (Promiscuous Mode, MAC-Änderungen, Forged Transmits) auf Ablehnen stellen, außer eine Appliance braucht es.", "Teaming-Richtlinien: nach ursprünglichem virtuellem Port (keine Switch-Konfiguration), IP-Hash (braucht einen statischen Port-Channel) oder LACP auf einem Distributed Switch.", "SR-IOV und DPDK umgehen den virtuellen Switch für mehr Leistung, um den Preis von vSwitch-Funktionen wie Live-Migration oder der verteilten Firewall."],
      b: { is: "Software, die einen physischen Server in viele virtuelle Computer (VMs) verwandelt.", does: "Teilt Prozessoren, Speicher und Netzwerk des Servers zwischen den VMs auf. Ein virtueller Switch verbindet sie.", needs: "Einen physischen Server mit Netzwerkkarten und meist gemeinsamen Speicher." } },
    overlay: { name: "Overlay-Netze (VXLAN, Geneve)", layer: "L2 über L3",
      easy: "Ein Overlay baut virtuelle Netze auf dem echten Netz auf, indem es jede Nachricht in einen zweiten Umschlag steckt, adressiert zwischen Servern.",
      what: "Ein Overlay trägt virtuelle Layer-2-Netze über ein geroutetes Layer-3-Underlay. Tunnelendpunkte (TEPs oder VTEPs) auf Hypervisoren oder Switches verpacken jeden Frame in UDP.",
      how: ["VXLAN hat eine 24-Bit-Segment-ID (16 Millionen Netze) auf UDP 4789. Geneve, genutzt von NSX und OVN, ergänzt erweiterbare Optionen auf UDP 6081.", "Das Underlay braucht nur IP-Erreichbarkeit zwischen den Tunnelendpunkten und eine größere MTU.", "Software-defined Networking (VMware NSX, OVN/OpenStack, Cloud-VPCs, Kubernetes-CNIs) nutzt Overlays, damit Netze per API in Sekunden entstehen.", "Verteiltes Routing und verteilte Firewalls laufen in jedem Host, sodass Verkehr nicht zu einem zentralen Router umgeleitet werden muss und Regeln der VM folgen.", "Switch-Fabrics im Rechenzentrum nutzen VXLAN mit BGP EVPN als Steuerungsebene."],
      ports: "VXLAN UDP 4789 · Geneve UDP 6081 · Flannel-VXLAN UDP 8472",
      breaks: "Ist die MTU im Underlay zu klein, funktionieren kleine Pakete, große verschwinden aber stillschweigend. Fehlersuche braucht die innere und die äußere Sicht auf jedes Paket.",
      examples: "VMware NSX, Cisco ACI, EVPN-VXLAN-Fabrics (Arista, Juniper, Cisco), OVN, Cloud-VPCs, Overlays von Calico/Flannel/Cilium.",
      deep: ["VXLAN kostet 50 Byte: äußeres Ethernet 14, IP 20, UDP 8, VXLAN 8. Geneve-Optionen machen es variabel, also eine Underlay-MTU von mindestens 1600 planen, meist 9000.", "BGP-EVPN-Routentyp 2 trägt MAC/IP-Bindungen, Typ 5 IP-Präfixe; das ersetzt Flood-and-Learn und ermöglicht ARP-Unterdrückung.", "Der äußere UDP-Quellport ist ein Hash des inneren Flows, sodass ECMP im Underlay auch Overlay-Verkehr über die Leitungen verteilt."],
      b: { is: "Ein virtuelles Netz, das auf dem echten Netz aufgebaut ist.", does: "Steckt jede Nachricht in einen zusätzlichen Umschlag, damit sich virtuelle Netze über viele Server erstrecken können.", needs: "Ein funktionierendes Netz zwischen den Servern, das etwas größere Pakete erlaubt." } },
    "storage-net": { name: "Speichernetze (iSCSI, NFS, FC)", layer: "L2–L7",
      easy: "Die Festplatten virtueller Maschinen liegen meist auf einem gemeinsamen Speichersystem, das über eine eigene, sehr schnelle Netzwerkspur erreicht wird.",
      what: "Gemeinsamer Speicher lässt jeden Host jede VM betreiben und macht Live-Migration erst möglich. Hosts erreichen ihn über Blockprotokolle (iSCSI, Fibre Channel, NVMe-oF) oder Dateiprotokolle (NFS, SMB 3).",
      how: ["iSCSI transportiert SCSI-Befehle über TCP 3260; NFS v3 und v4.1 nutzen TCP 2049.", "Eigene Storage-VLANs oder ein separates Fabric halten Speicherverkehr vom Nutzerverkehr fern.", "Jumbo Frames (MTU 9000) durchgängig verringern den Aufwand pro Paket.", "Multipathing nutzt zwei unabhängige Wege für Redundanz und Durchsatz.", "Fibre Channel ist ein eigenes verlustfreies Netz, mit Zoning per WWN auf den FC-Switches."],
      ports: "iSCSI 3260 · NFS 2049 · SMB 445",
      breaks: "Speicherlatenz lässt jede VM darauf eingefroren wirken. Eine MTU-Abweichung irgendwo auf dem Weg führt zu Hängern bei großen Zugriffen.",
      examples: "NetApp, Pure Storage, Dell PowerStore, VMware vSAN, Storage Spaces Direct, Ceph.",
      deep: ["iSCSI-Port-Binding: zwei VMkernel-Ports, jeder an einen Uplink gebunden, mit Round-Robin-Pfadauswahl.", "Jumbo Frames ohne Fragmentierung durchgängig testen: `vmkping -d -s 8972 <ziel>`.", "Hyperkonvergenter Speicher (vSAN, S2D) repliziert über das Host-Netz, Ost-West-Bandbreite und -Latenz begrenzen also direkt die Schreibleistung."],
      b: { is: "Ein eigenes Netz zu einem zentralen Speicher.", does: "Lässt jeden Server dieselben Festplatten erreichen, damit VMs zwischen Servern umziehen können.", needs: "Ein Speichersystem, ein schnelles Netz (oft ein eigenes VLAN) und Server, die daran angeschlossen sind." } },
    k8s: { name: "Kubernetes-Networking", layer: "L3–L7",
      easy: "Kubernetes betreibt Apps in Containern, verteilt auf viele Server. Jeder Pod bekommt eine eigene Adresse, und der Cluster behält den Überblick, wo was läuft.",
      what: "Kubernetes verteilt Container, gruppiert in Pods, über einen Cluster von Nodes. Sein Netzwerkmodell besagt: Jeder Pod bekommt eine eigene IP und kann jeden anderen Pod ohne NAT erreichen. Ein CNI-Plugin macht das wahr.",
      how: ["Die Steuerungsebene besteht aus API-Server (6443), etcd, Scheduler und Controllern. Jeder Node betreibt das Kubelet und eine Container-Runtime.", "Jeder Node bekommt einen Teil des Pod-CIDR. Pods hängen über veth-Paare an einer Bridge oder einer eBPF-Datenebene.", "CNI-Plugins (Calico, Cilium, Flannel, Cloud-CNIs) verbinden Nodes per Overlay (VXLAN/Geneve) oder nativem Routing (BGP, Cloud-Routingtabellen).", "Services geben einer Gruppe von Pods eine feste virtuelle IP und einen DNS-Namen. CoreDNS beantwortet Clusternamen.", "Ingress oder die Gateway API sowie LoadBalancer-Services holen Verkehr von außen herein. NetworkPolicy regelt den Verkehr zwischen Pods."],
      ports: "API-Server 6443 · etcd 2379–2380 · Kubelet 10250 · NodePort 30000–32767",
      breaks: "Pod- oder Service-CIDRs, die mit Firmennetzen überlappen, brechen das Routing zu lokalen Systemen. Ein überlastetes CoreDNS macht jeden Service-Aufruf langsam.",
      examples: "Kubernetes (EKS, AKS, GKE, OpenShift, Rancher, k3s). CNIs: Calico, Cilium, Flannel, Antrea.",
      deep: ["Pods auf einem Node teilen den Kernel des Nodes; jeder Pod hat einen eigenen Netzwerk-Namespace. Alle Container eines Pods teilen sich eine IP und localhost.", "eBPF-Datenebenen (Cilium) ersetzen iptables und Bridges durch Programme an jedem veth und NIC und bringen identitätsbasierte Richtlinien und Flow-Sichtbarkeit (Hubble).", "Der Pod-Block jedes Nodes (standardmäßig ein /24) begrenzt die Pods pro Node (standardmäßig 110). Den Cluster-CIDR nach Nodes × Block bemessen."],
      b: { is: "Kubernetes: ein System, das Apps in Containern auf vielen Servern betreibt.", does: "Startet, stoppt und verschiebt die Pods einer App und gibt jedem Pod eine eigene Adresse.", needs: "Mehrere Server (Nodes), ein Netz dazwischen und ein CNI-Plugin, das das Pod-Netz baut." } },
    "k8s-svc": { name: "Kubernetes-Services & kube-proxy", layer: "L3/L4",
      easy: "Pods kommen und gehen ständig, also gibt ein Service einer Gruppe von ihnen einen festen Namen und eine feste Adresse und verteilt die Anfragen auf sie.",
      what: "Ein Service ist eine feste virtuelle IP (ClusterIP) und ein DNS-Name vor einer wechselnden Menge von Pods. kube-proxy oder eine eBPF-Datenebene auf jedem Node schreibt Verkehr an diese IP auf einen gesunden Pod um.",
      how: ["Label-Selektoren wählen die Pods hinter einem Service; EndpointSlices listen ihre aktuellen IPs.", "Typen: ClusterIP (intern), NodePort (ein Port auf jedem Node), LoadBalancer (ein externer Load Balancer) und Headless (DNS liefert direkt Pod-IPs).", "kube-proxy-Modi: iptables (zufälliges DNAT), IPVS (echte Lastverteilungsverfahren) oder vollständig durch ein eBPF-CNI ersetzt.", "DNS-Namen folgen dem Muster service.namespace.svc.cluster.local.", "Readiness-Probes entscheiden, welche Pods Verkehr bekommen."],
      ports: "Service-Ports sind frei wählbar; NodePorts nutzen 30000–32767",
      breaks: "Ein Tippfehler im Selektor lässt einen Service ohne Endpunkte zurück, Verbindungen scheitern. Pods, die die Readiness-Prüfung nicht bestehen, fallen still aus dem Pool.",
      examples: "kube-proxy, Cilium als kube-proxy-Ersatz, MetalLB, Cloud-Load-Balancer.",
      deep: ["externalTrafficPolicy: Local erhält die Quell-IP des Clients und spart einen zweiten Hop, aber nur Nodes mit passendem Pod bekommen Verkehr.", "Topologiebewusstes Routing hält Service-Verkehr innerhalb einer Zone und spart Latenz und zonenübergreifende Kosten.", "Session Affinity (ClientIP) bindet Clients per Connection Tracking an einen Pod; kein Ersatz für zustandslose Dienste."],
      b: { is: "Ein fester Name und eine feste Adresse für eine Gruppe von Pods.", does: "Verteilt Anfragen auf die Pods, auch während Pods kommen und gehen.", needs: "Pods mit passenden Labels und Regeln auf jedem Node (kube-proxy oder das CNI)." } },
    ingress: { name: "Ingress & Gateway API", layer: "L7 Anwendung",
      easy: "Der Ingress ist die Haustür eines Kubernetes-Clusters: Er liest, welche Website angefragt wurde, und schickt Besucher zur richtigen App.",
      what: "Ingress-Controller und die neuere Gateway API sind Reverse Proxys, die im Cluster laufen. Sie beenden TLS und leiten HTTP-Anfragen anhand von Hostname und Pfad an Services.",
      how: ["Ein externer Load Balancer oder NodePort bringt Verkehr zu den Pods des Ingress-Controllers.", "Routingregeln prüfen Hostname und Pfad: shop.example/ zum web-Service, /api zum api-Service.", "TLS-Zertifikate liegen als Secrets vor, oft automatisch von cert-manager per ACME ausgestellt.", "Die Gateway API trennt die Infrastruktur (Gateway) von den Routen jedes Teams (HTTPRoute).", "Viele Controller ergänzen WAF-Regeln, Ratenbegrenzung und Authentifizierung."],
      ports: "TCP 80 / 443",
      breaks: "Ein fehlendes oder abgelaufenes Zertifikats-Secret bricht HTTPS für jeden Host, der es nutzt. Eine falsche Ingress-Klasse heißt: Die Regeln werden still ignoriert.",
      examples: "ingress-nginx, Traefik, HAProxy, Envoy Gateway, Istio-Gateway, Cloud-Application-Gateways.",
      deep: ["MetalLB im L2-Modus beantwortet ARP für die VIP von einem Node und schwenkt per Gratuitous ARP um; im BGP-Modus kündigt es die VIP Routern für ECMP an.", "TLS-Passthrough erhält die Verschlüsselung bis zum Pod, dann kann der Ingress aber nur anhand der SNI routen.", "Service Meshes (Istio, Linkerd) ergänzen hinter dem Ingress Mutual TLS zwischen Pods, Wiederholungen und L7-Autorisierung."],
      b: { is: "Die Haustür eines Kubernetes-Clusters für Webverkehr.", does: "Liest, welche Website angefragt wurde, und schickt Besucher zur richtigen App.", needs: "Einen Load Balancer davor, Services dahinter und Zertifikate für HTTPS." } },
    netpol: { name: "NetworkPolicy & Mikrosegmentierung", layer: "L3/L4",
      easy: "Network Policies sind Firewall-Regeln für einzelne Apps oder virtuelle Maschinen, damit eine kompromittierte App nicht alles andere erreicht.",
      what: "Mikrosegmentierung wendet Firewall-Regeln pro Workload statt pro Subnetz an. In Kubernetes wählt NetworkPolicy Pods per Label aus; in der Virtualisierung setzt eine verteilte Firewall Regeln an der virtuellen Netzwerkkarte jeder VM durch.",
      how: ["Standardmäßig erlaubt Kubernetes jeden Verkehr zwischen Pods. Sobald eine Policy einen Pod auswählt, gilt für diese Richtung ein Standardverbot.", "Regeln erlauben Verkehr von Pod-Selektoren, Namespace-Selektoren oder IP-Blöcken, auf bestimmten Ports.", "Das CNI-Plugin setzt Policies durch (Calico, Cilium, Antrea). Flannel allein tut das nicht.", "Verteilte Firewalls im Hypervisor (NSX, Azure NSGs, AWS Security Groups) wenden Regeln per VM-Tag an und folgen der Live-Migration.", "Im Beobachtungsmodus starten, echte Flüsse erfassen, dann durchsetzen."],
      ports: "",
      breaks: "Eine Standardverbot-Policy für ausgehenden Verkehr, die DNS vergisst, bricht jede Namensauflösung. Regeln mit IPs statt Labels brechen, wenn Pods umziehen.",
      examples: "Kubernetes NetworkPolicy, Calico, Cilium, Antrea, VMware NSX, Illumio, Azure NSGs, AWS Security Groups.",
      deep: ["Policies sind additiv (eine Vereinigung von Erlaubnissen); Core-NetworkPolicy kennt keine Verbotsregel. Calico und Cilium ergänzen geordnete Verbotsregeln und clusterweite Policies.", "Core-NetworkPolicy wirkt nur auf L3/L4; Cilium ergänzt L7 (HTTP-Methode und Pfad, DNS-Namen) und identitätsbasierte Durchsetzung.", "Bei Standardverbot für ausgehenden Verkehr immer kube-dns auf UDP/TCP 53 erlauben."],
      b: { is: "Firewall-Regeln für einzelne Apps oder VMs statt für ganze Netze.", does: "Verhindert, dass eine kompromittierte App alles andere erreicht.", needs: "Ein CNI oder einen Hypervisor, der die Regeln durchsetzt, und Apps, die mit Labels oder Tags markiert sind." } }
  };
  NET.concepts.forEach(function (c) { var d = C[c.id]; if (d) Object.keys(d).forEach(function (k) { c[k] = d[k]; }); });

  var PK = NET.DE_PK || {};
  function apply(D, groups, nodes, scen) {
    D.title = D.id === "host" ? "Virtualisierungshost" : "Kubernetes-Cluster";
    D.groups.forEach(function (g, i) { if (groups[i]) { g.label = groups[i][0]; g.sub = groups[i][1]; } });
    D.nodes.forEach(function (n) {
      var t = nodes[n.id];
      if (!t) return;
      if (t[0]) n.label = t[0];
      if (t[1] !== undefined && t[1] !== null) n.meta = t[1];
      if (t[2]) n.easy = t[2];
      if (t[3]) n.text = t[3];
      if (t[4]) n.deep = t[4];
      if (t[5]) n.sub = t[5];
    });
    D.scenarios.forEach(function (s) {
      var t = scen[s.id];
      if (!t) return;
      s.title = t.title; s.blurb = t.blurb; s.deep = t.deep;
      s.steps.forEach(function (st, i) {
        var x = t.steps[i];
        if (x) { st.title = x[0]; st.text = x[1]; st.easy = x[2]; }
        st.pkts.forEach(function (p) { if (PK[p.label]) p.label = PK[p.label]; });
      });
    });
  }

  /* ---------------- virtualization host ---------------- */
  var host = NET.virt[0];
  apply(host,
    [["Physisches Netz", "Trunks tragen die VLANs 20, 30, 40, 99, 100"], ["Host 1 · esx01", "2 × 25 GbE"], ["Host 2 · esx02", "2 × 25 GbE"]],
    {
      core: ["Core-Router / Firewall", "Gateways für VLAN 20 (Server) und VLAN 100 (DMZ)", "Der physische Router, der die verschiedenen Netzsegmente und den Rest der Firma mit diesen Servern verbindet.",
        "Derselbe Core-Router und dieselbe Firewall wie in der Hauptkarte. Hypervisoren switchen nur; Routing zwischen VLANs und die Firewall-Regeln passieren hier, außer es wird ein Overlay mit verteiltem Routing genutzt.",
        ["Verkehr zwischen VLANs von VMs auf demselben Host läuft trotzdem hierüber. Uplink-Auslastung im Blick behalten.", "Bei EVPN-VXLAN-Fabrics kann das Gateway stattdessen als Anycast auf jedem Leaf-Switch liegen."]],
      torA: ["ToR-Switch A", "25-GbE-Trunk-Ports zu jedem Host · MLAG-Partner von B", "Einer von zwei physischen Switches im Serverschrank. Jeder Server hängt an beiden, damit ein Switch ausfallen kann, ohne dass etwas offline geht.",
        "Top-of-Rack-Switch. Die Uplinks der Hosts sind 802.1Q-Trunks für die VLANs Server, DMZ, vMotion, Storage und Management. A und B bilden ein MLAG-Paar und verhalten sich wie ein Switch.",
        ["Ports zu Hosts sollten Edge-Ports (PortFast) mit BPDU Guard sein, da vSwitches nie BPDUs senden.", "Auf jedem Trunk nur die VLANs erlauben, die die Hosts brauchen; ein überflüssiges VLAN ist ein Angriffsweg und eine Fehlerdomäne."]],
      torB: ["ToR-Switch B", "25-GbE-Trunk-Ports zu jedem Host · MLAG-Partner von A", "Der zweite Switch im Schrank, für Redundanz.",
        "Die andere Hälfte des Switch-Paars. Jeder Host hat einen Uplink zu A und einen zu B; fällt einer aus, laufen die VMs über den verbleibenden Uplink weiter.",
        ["Das Umschalten der Uplinks hängt an Link-State-Tracking oder Beacon Probing; ein Switch, der läuft, aber seine Uplinks verliert, braucht Link-State-Tracking."]],
      san: ["Speicher-Array", "iSCSI 10.40.0.50 · VLAN 40 · MTU 9000", "Ein zentrales Speichersystem, auf dem die Festplatten der virtuellen Maschinen liegen, damit jeder Host jede VM betreiben kann.",
        "Gemeinsamer Blockspeicher per iSCSI in einem eigenen VLAN mit Jumbo Frames. Weil beide Hosts dieselben Festplatten sehen, können VMs zwischen Hosts umziehen und woanders neu starten, wenn ein Host ausfällt.",
        ["Für echtes Multipathing zwei Storage-VLANs oder -Subnetze auf getrennten Uplinks nutzen.", "Speicherlatenz über ein paar Millisekunden zeigt sich als langsame VMs, lange bevor irgendetwas einen Fehler protokolliert."]],
      h1nic0: ["vmnic0", "Physischer Uplink zu ToR A · Trunk", "Einer der echten Netzwerkanschlüsse des Servers, mit Switch A verkabelt.", "Eine physische Netzwerkkarte, die der virtuelle Switch als Uplink nutzt. Sie trägt markierten Verkehr für jede Portgruppe des Hosts.",
        ["Die Teaming-Richtlinie entscheidet, welche VM welche Karte nutzt; „nach ursprünglichem virtuellem Port“ braucht keine Switch-Konfiguration."]],
      h1nic1: ["vmnic1", "Physischer Uplink zu ToR B · Trunk", "Der zweite echte Netzwerkanschluss des Servers, mit Switch B verkabelt.", "Der zweite Uplink. vMotion und Storage sind standardmäßig an diese Karte gebunden und schwenken auf vmnic0 um.",
        ["Aktiv/Standby pro Portgruppe trennt große vMotion-Schübe vom VM-Verkehr, ohne QoS zu brauchen."]],
      h1vs: ["Virtueller Switch", "vSphere Distributed Switch · MTU 9000", "Ein Switch aus Software im Server. Virtuelle Maschinen stecken darin, und er verbindet sie miteinander und mit dem echten Netz.",
        "Der verteilte virtuelle Switch. Portgruppen stecken die virtuelle Netzwerkkarte jeder VM in ein VLAN; Frames zwischen VMs derselben Portgruppe auf diesem Host werden im Arbeitsspeicher zugestellt, alles andere geht mit 802.1Q-Markierung über einen Uplink hinaus.",
        ["Ein Distributed Switch wird einmal in vCenter konfiguriert und an jeden Host verteilt, sodass Portgruppen im ganzen Cluster identisch sind.", "Funktionen: NetFlow/IPFIX-Export, Port Mirroring (inkl. ERSPAN), LACP, Network I/O Control, Private VLANs."],
        "Portgruppen: Server v20 · DMZ v100 · vMotion v30 · Storage v40 · Mgmt v99"],
      h1vmk: ["VMkernel-Ports", "vmk0 Mgmt 10.99.0.11 · vmk1 vMotion 10.30.0.11 · vmk2 iSCSI 10.40.0.11", "Die eigenen Netzwerkverbindungen des Hosts, zum Verwalten des Hosts, zum Verschieben von VMs und für den Speicher.",
        "Schnittstellen für den Hypervisor selbst: Management, vMotion und Storage, jede im eigenen VLAN und Subnetz, damit sich die Verkehrsarten weder gegenseitig noch die VMs stören.",
        ["Getrennte TCP/IP-Stacks (den vMotion-Stack) nutzen, damit vMotion ein eigenes Standard-Gateway haben kann.", "Management-VMkernel-Ports gehören in ein abgeschottetes Managementnetz: ESXi ist ein Ransomware-Ziel geworden."]],
      dc01: ["DC01-VM", "10.20.0.10 · Portgruppe Server (VLAN 20)", "Eine virtuelle Maschine, auf der der Domänencontroller läuft: ein ganzer Server, aber aus Software.",
        "Der Domänencontroller aus der Hauptkarte läuft als VM. Seine virtuelle Netzwerkkarte steckt in der Portgruppe Server, VLAN 20.",
        ["Domänencontroller per Anti-Affinitätsregel auf getrennte Hosts legen und den Hypervisor entsprechend schützen: Wer den Host beherrscht, beherrscht den DC."]],
      app01: ["APP01-VM", "10.20.0.17 · Portgruppe Server (VLAN 20)", "Eine virtuelle Maschine mit der internen Geschäftsanwendung.", "Der interne API-Server. Gleiche Portgruppe wie DC01, ihr Verkehr bleibt also im Host.",
        ["Beim Verschieben per vMotion behält APP01 IP und MAC; das Netz erfährt den neuen Ort durch ein RARP vom Zielhost."]],
      web01: ["WEB01-VM", "172.16.100.20 · Portgruppe DMZ (VLAN 100)", "Der öffentliche Webserver, ebenfalls eine virtuelle Maschine, aber in einem getrennten, exponierteren Netzsegment.",
        "Der DMZ-Webserver läuft auf demselben physischen Host wie interne Server. Seine Portgruppe ist VLAN 100, er ist also auf Layer 2 getrennt, und sein ganzer Verkehr nach innen läuft über die Firewall.",
        ["DMZ- und interne VMs auf einem Host zu mischen ist üblich, bedeutet aber, dass ein Ausbruch aus dem Hypervisor Zonen überschreitet; Hochsicherheitsdesigns nutzen eigene DMZ-Cluster."]],
      h1hv: ["Hypervisor (ESXi · Hyper-V · KVM)", "esx01 · 64 Kerne · 1 TB RAM", "Die Softwareschicht, die einen physischen Server in viele virtuelle verwandelt und Prozessoren, Speicher und Netzwerk teilt.",
        "Der Typ-1-Hypervisor teilt jeder VM CPU und Speicher zu und betreibt den virtuellen Switch in seinem Kernel.",
        ["Hypervisor-CVEs (VM-Ausbruch) sind selten, aber kritisch; Hosts planmäßig patchen und den Verwaltungszugriff auf ein eigenes Netz beschränken."]],
      h2nic0: ["vmnic0", "Physischer Uplink zu ToR A · Trunk", "Der erste echte Netzwerkanschluss von Host 2.", "Uplink von Host 2 zu ToR A."],
      h2nic1: ["vmnic1", "Physischer Uplink zu ToR B · Trunk", "Der zweite echte Netzwerkanschluss von Host 2.", "Uplink von Host 2 zu ToR B."],
      h2vs: ["Virtueller Switch", "vSphere Distributed Switch · MTU 9000", "Der eingebaute Software-Switch von Host 2, genauso eingerichtet wie der von Host 1.",
        "Derselbe Distributed Switch umfasst beide Hosts, sodass eine VM überall identische Portgruppen vorfindet.",
        ["Diese Einheitlichkeit macht Live-Migration erst möglich: Fehlt eine Portgruppe auf dem Zielhost, wird vMotion verweigert."],
        "derselbe Distributed Switch und dieselben Portgruppen wie bei Host 1"],
      h2vmk: ["VMkernel-Ports", "vmk0 10.99.0.12 · vmk1 10.30.0.12 · vmk2 10.40.0.12", "Die eigenen Netzwerkverbindungen von Host 2.", "Management-, vMotion- und Storage-Schnittstellen von Host 2."],
      file01: ["FILE01-VM", "10.20.0.13 · Portgruppe Server (VLAN 20)", "Der Dateiserver, als virtuelle Maschine auf dem zweiten Host.",
        "Die Dateiserver-VM. Gleiches VLAN wie DC01 und APP01, aber auf einem anderen Host, Verkehr dorthin läuft also über die physischen Switches.",
        ["Große SMB-Übertragungen zwischen Hosts sind eine klassische Ursache für volle Uplinks; Network I/O Control teilt Bandbreite nach Priorität."]],
      k8sw: ["K8S-W1-VM", "10.20.1.11 · Kubernetes-Worker-Node", "Eine virtuelle Maschine, die selbst Teil eines Kubernetes-Clusters ist. Darin laufen Container.",
        "Kubernetes-Nodes sind oft VMs. Diese ist Node 1 im Kubernetes-Tab, Pods darin sitzen also hinter zwei Schichten virtueller Netze: dem Pod-Netz auf der virtuellen Netzwerkkarte der VM.",
        ["Verschachtelte Overlays (Pod-VXLAN in einem NSX-Geneve-Segment) addieren den MTU-Aufwand; die Pod-MTU entsprechend setzen oder natives Routing nutzen."]],
      fwvm: ["FW-VM", "Virtuelle Firewall-Appliance", "Eine Firewall, die als virtuelle Maschine läuft statt als eigenes Gerät.",
        "Firewalls, Load Balancer und Router gibt es auch als virtuelle Appliances. Manche Designs schalten eine zwischen Portgruppen, um VM-zu-VM-Verkehr zu filtern, ohne den Cluster zu verlassen.",
        ["Service Insertion lenkt Verkehr durch eine virtuelle Appliance; verteilte Firewalls vermeiden den Engpass, indem sie an jeder vNIC durchsetzen."]],
      h2hv: ["Hypervisor (ESXi · Hyper-V · KVM)", "esx02", "Der Hypervisor von Host 2.", "Der zweite Host im Cluster. Fällt Host 1 aus, startet HA dessen VMs hier neu."]
    },
    {
      "same-host": { title: "Zwei VMs auf demselben Host", blurb: "Im Arbeitsspeicher geswitcht, für das physische Netz unsichtbar.",
        deep: ["Virtuelle Switches nutzen kein Spanning Tree: Sie leiten nie zwischen Uplinks weiter, Schleifen sind also konstruktionsbedingt unmöglich.", "Sicherheit der Portgruppen: Promiscuous Mode, MAC-Änderungen und Forged Transmits auf Ablehnen stellen, außer eine Appliance braucht es.", "Für Ost-West-Sichtbarkeit vSwitch-IPFIX, ERSPAN zu einem Sensor oder Protokolle der verteilten Firewall nutzen."],
        steps: [
          ["Im Host geswitcht", "APP01 fragt DC01 nach einer DNS-Auflösung. Beide VMs sind in der Portgruppe Server (VLAN 20) auf demselben Host, also kopiert der virtuelle Switch den Frame im Arbeitsspeicher von einer virtuellen Netzwerkkarte zur anderen. Er berührt nie ein Kabel.", "Zwei virtuelle Maschinen auf demselben physischen Server reden über den eingebauten virtuellen Switch. Der Verkehr verlässt das Gerät nie."],
          ["Für das physische Netz unsichtbar", "Das physische IDS, die Firewall und die Switch-Zähler sehen dieses Gespräch nie. Deshalb ergänzen virtuelle Umgebungen eigene Kontrollen: eine verteilte Firewall an jeder virtuellen Netzwerkkarte, Port Mirroring am virtuellen Switch und Flow-Protokolle aus dem Hypervisor.", "Weil der Verkehr den Server nie verlässt, sehen ihn die Sicherheitswerkzeuge im Firmennetz nicht. Virtuelle Netze brauchen eigene, eingebaute Sicherheit."]
        ] },
      "cross-vlan": { title: "Eine VM erreicht ein anderes VLAN", blurb: "Auf dem Uplink markiert, außerhalb des Hosts geroutet und wieder zurück.",
        deep: ["Portgruppen markieren meist im vSwitch (VST). VLAN 4095 reicht Tags an das Gastsystem durch (VGT); bei EST markiert der physische Switch.", "Teaming mit IP-Hash braucht einen statischen Port-Channel am Switch; LACP braucht einen Distributed Switch.", "Verteiltes logisches Routing (NSX, OVN) legt das Gateway in jeden Hypervisor, sodass gerouteter Ost-West-Verkehr nie den Umweg nimmt."],
        steps: [
          ["Auf dem Weg nach draußen markiert", "WEB01 sitzt in der Portgruppe DMZ (VLAN 100). APP01 liegt in einem anderen Subnetz, also geht der Frame an das Standard-Gateway von WEB01. Der virtuelle Switch fügt eine 802.1Q-Markierung für VLAN 100 hinzu und schickt ihn über einen physischen Trunk hinaus.", "Eine virtuelle Maschine muss eine Maschine in einem anderen Netzsegment erreichen, also verlässt ihr Verkehr den Server, beschriftet mit der Segmentnummer."],
          ["Außerhalb des Hosts geroutet und gefiltert", "Der ToR-Switch trägt den markierten Frame zum Core-Router und zur Firewall, die von VLAN 100 nach VLAN 20 routen und die DMZ-Regeln anwenden. Der Host switcht nur; er routet nicht.", "Der physische Router und die Firewall entscheiden, ob das erlaubt ist, genau wie bei physischen Servern."],
          ["Zurück zum selben Host", "APP01 läuft auf demselben Host, also geht das Paket denselben Trunk wieder hinunter, jetzt als VLAN 20 markiert. Dieser Hairpin (oder Trombone) verdoppelt den Uplink-Verkehr. Overlays mit verteiltem Routing beheben das, indem sie in jedem Host routen.", "Der Verkehr kommt den ganzen Weg zurück zum Server, auf dem er gestartet ist. Moderne virtuelle Netze können diesen Umweg vermeiden."]
        ] },
      vmotion: { title: "Live-Migration (vMotion)", blurb: "Eine laufende VM ohne Ausfallzeit auf einen anderen Host verschieben.",
        deep: ["Voraussetzungen: die Portgruppen der VM auf beiden Hosts, gemeinsamer (oder mitmigrierter) Speicher und kompatible CPUs (EVC).", "vMotion in nicht vertrauenswürdigen Netzen verschlüsseln: Es überträgt rohen Arbeitsspeicher samt Geheimnissen.", "Langstrecken-vMotion braucht etwa 150 ms RTT oder weniger und Layer 2 für die VM, meist über ein Overlay statt gestreckter VLANs."],
        steps: [
          ["Den laufenden Speicher kopieren", "Ein Admin verschiebt APP01 auf Host 2. Die vMotion-Schnittstelle von Host 1 überträgt den Arbeitsspeicher der VM über das eigene vMotion-VLAN zu Host 2 und schickt geänderte Seiten immer wieder neu, bis der Rest winzig ist.", "Eine laufende virtuelle Maschine wird auf einen anderen physischen Server verschoben, ohne sie auszuschalten, indem ihr Arbeitsspeicher über das Netz kopiert wird."],
          ["Umschalten und den Umzug ankündigen", "APP01 pausiert deutlich unter einer Sekunde, während die letzten Seiten und der CPU-Zustand übergehen, und läuft dann auf Host 2 weiter. Host 2 sendet sofort ein RARP für die MAC-Adresse von APP01, damit die physischen Switches ihre MAC-Tabellen aktualisieren und der Verkehr der VM folgt.", "Die VM pausiert einen Augenblick, wacht auf dem neuen Server auf und ruft „Ich bin jetzt hier“, damit das Netz ihren Verkehr an den richtigen Ort schickt."]
        ] },
      storage: { title: "Speicherverkehr (iSCSI)", blurb: "VM-Festplatten über ein eigenes Netz mit Jumbo Frames.",
        deep: ["Für Multipathing zwei VMkernel-Ports an getrennte Uplinks binden, mit Round-Robin-Pfadrichtlinie.", "Jumbo Frames durchgängig ohne Fragmentierung testen: `vmkping -d -s 8972 10.40.0.50`.", "NVMe over TCP oder RoCE senken die Latenz weiter, RoCE braucht aber ein verlustfreies Netz (PFC, ECN)."],
        steps: [
          ["Festplatten über das Netz", "VM-Festplatten liegen auf dem gemeinsamen Array, damit jeder Host jede VM betreiben kann. Der Hypervisor erreicht es über seine Storage-Schnittstelle in VLAN 40, mit Jumbo Frames (MTU 9000) durchgängig und einem zweiten Weg für Redundanz.", "Die Festplatten der virtuellen Maschinen liegen eigentlich auf einem zentralen Speichersystem, erreicht über eine eigene Spur."]
        ] },
      overlay: { title: "Overlay-Netz & verteilte Firewall", blurb: "Ein virtuelles Netz auf dem physischen, mit Regeln an jeder VM.",
        deep: ["VXLAN fügt 50 Byte hinzu, Geneve mehr; die Underlay-MTU auf mindestens 1600 setzen, meist 9000.", "BGP EVPN verteilt MAC/IP-Erreichbarkeit (Routentypen 2 und 5) statt Flood-and-Learn.", "Mikrosegmentierung einführen, indem Anwendungen getaggt, Regeln im Beobachtungsmodus betrieben und dann ein Standardverbot pro Anwendung durchgesetzt wird."],
        steps: [
          ["Ein virtuelles Netz auf dem physischen", "Mit einem Overlay (VMware NSX, OVN, Hyper-V SDN) teilen APP01 und FILE01 ein logisches Segment, obwohl das physische Netz nur zwischen Hosts routet. Der Tunnelendpunkt von Host 1 verpackt den ganzen Ethernet-Frame von APP01 in UDP an Host 2, der ihn auspackt und an FILE01 zustellt.", "Software baut virtuelle Netze auf dem physischen auf, indem sie jede Nachricht in einen äußeren Umschlag steckt, adressiert an den richtigen Server."],
          ["An der virtuellen Netzwerkkarte blockiert", "WEB01 in der DMZ versucht, FILE01 zu erreichen. Die verteilte Firewall läuft im Hypervisor an jeder virtuellen Netzwerkkarte, also wird das Paket verworfen, bevor es überhaupt den virtuellen Switch erreicht. Regeln werden per VM-Tag geschrieben, nicht per IP, und folgen der VM, wenn sie umzieht.", "Eine Firewall in der Netzwerkverbindung jeder virtuellen Maschine blockiert den Versuch sofort, und die Regeln ziehen mit der VM um."]
        ] }
    });

  /* ---------------- Kubernetes ---------------- */
  var k8s = NET.virt[1];
  apply(k8s,
    [["Außerhalb des Clusters", ""], ["Kubernetes-Cluster", "Pods 10.244.0.0/16 · Services 10.96.0.0/12"], ["Steuerungsebene", ""],
     ["Node 1", "10.20.1.11 · Pods 10.244.1.0/24"], ["Node 2", "10.20.1.12 · Pods 10.244.2.0/24"], ["Node 3", "10.20.1.13 · Pods 10.244.3.0/24"]],
    {
      user: ["Kunde", "198.51.100.77", "Jemand im Internet, der die Shop-Website besucht.", "Ein externer Nutzer der Shop-Website, die auf diesem Cluster läuft."],
      lb: ["Load Balancer", "VIP 203.0.113.40 · Service vom Typ LoadBalancer", "Der einzige öffentliche Eingang, der Besucher auf den Cluster verteilt.",
        "Ein Service vom Typ LoadBalancer. In der Cloud legt der Anbieter den LB an; vor Ort kündigt MetalLB (oder ein Hardware-LB) die virtuelle IP an und leitet an den Ingress-Controller weiter.",
        ["MetalLB im L2-Modus beantwortet ARP von einem Node und schwenkt per Gratuitous ARP um; im BGP-Modus kündigt es die VIP für ECMP über die Nodes an.", "externalTrafficPolicy: Local erhält die Client-IP, schickt aber nur an Nodes mit einem Ingress-Pod."]],
      admin: ["Admin (kubectl)", "kubeconfig mit OIDC oder einem Client-Zertifikat", "Eine Fachkraft, die dem Cluster sagt, was laufen soll.", "Admins und CI-Pipelines ändern den Cluster nur über den API-Server, mit kubectl oder GitOps-Werkzeugen.",
        ["Kurzlebige OIDC-Tokens langlebigen Client-Zertifikaten vorziehen, die sich nicht widerrufen lassen, ohne die CA zu wechseln."]],
      underlay: ["Node-Netz", "10.20.1.0/24 (VLAN oder VM-Netz)", "Das gewöhnliche Netz zwischen den Servern des Clusters. Es kennt nur die Adressen der Server, nicht die der Pods.",
        "Das Netz zwischen den Nodes. Es kann aus physischen Switches bestehen oder, wie hier, aus dem virtuellen Switch der Hypervisoren (die VM K8S-W1 im anderen Tab ist Node 1). Es routet Node-IPs; das CNI lässt Pod-IPs darauf funktionieren.",
        ["Mit BGP-fähigen CNIs (Calico, Cilium) peeren Nodes mit den ToR-Switches und kündigen Pod-CIDRs an, sodass kein Overlay nötig ist."]],
      apiserver: ["API-Server", "https://10.20.1.10:6443", "Empfang und Gehirn des Clusters: Jede Änderung und jede Frage läuft darüber.",
        "Die einzige Komponente, mit der alle sprechen. Sie authentifiziert Anfragen, prüft RBAC, führt Admission Control aus und speichert den Sollzustand in etcd. Nodes und Controller beobachten sie auf Änderungen.",
        ["Nur für Admin- und Node-Netze erreichbar machen; öffentliche API-Server werden ständig gescannt.", "Audit-Protokolle des API-Servers sind die wertvollste Sicherheitsquelle in Kubernetes."]],
      etcd: ["etcd", "2379 Client · 2380 Peer · mTLS", "Die Datenbank des Clusters, in der er aufschreibt, was laufen soll.", "Ein konsistenter Key-Value-Speicher mit dem gesamten Clusterzustand. Nur der API-Server spricht mit ihm.",
        ["3 oder 5 Mitglieder für ein Quorum betreiben. Secrets im Ruhezustand verschlüsseln und etcd sichern: Ohne etcd ist der Cluster verloren."]],
      sched: ["Scheduler", "kube-scheduler", "Entscheidet, auf welchem Server jede neue App-Kopie laufen soll.", "Beobachtet Pods ohne Node und weist jeden einem Node mit genug Ressourcen zu, unter Beachtung von Affinität, Taints und Topologieverteilung."],
      ctrl: ["Controller", "kube-controller-manager", "Roboter, die ständig prüfen, ob die Wirklichkeit dem Gewünschten entspricht, und es korrigieren, wenn nicht.",
        "Abgleichschleifen: Der Deployment-Controller legt ReplicaSets und Pods an, der EndpointSlice-Controller verfolgt, welche Pods hinter jedem Service stehen, und so weiter."],
      svcweb: ["Service: web", "ClusterIP 10.96.0.20:80 → web-Pods :8080", "Ein fester Name und eine feste Adresse für die Pods der Website. Sie ist virtuell: Kein Rechner hat diese Adresse wirklich.",
        "Ein ClusterIP-Service, der app=web auswählt. Seine virtuelle IP existiert nur als Regeln auf jedem Node; die gestrichelten Linien zeigen seine aktuellen Endpunkte.",
        ["EndpointSlices aktualisieren sich binnen Sekunden, wenn Pods bereit werden oder nicht; Clients müssen nie Pod-IPs kennen."]],
      svcapi: ["Service: api", "ClusterIP 10.96.0.30:80 → api-Pods :8080 · api.shop.svc.cluster.local", "Ein fester Name und eine feste Adresse für die api-Pods, die auf irgendeinem Server laufen können.",
        "Ein ClusterIP-Service für die api-Pods auf Node 2 und 3. Aufrufer nutzen den DNS-Namen api; kube-proxy wählt für jede Verbindung einen Pod.",
        ["Headless-Services (clusterIP: None) lassen die VIP weg und liefern Pod-IPs per DNS, wie StatefulSets und manche Datenbanken es brauchen."]],
      n1nic: ["eth0", "10.20.1.11", "Die Netzwerkverbindung von Node 1.", "Die eigene Schnittstelle des Nodes im Node-Netz. Pod-Verkehr zu anderen Nodes geht hier hinaus, gekapselt oder nativ geroutet."],
      n1br: ["cni0-Bridge · kube-proxy-Regeln", "veth-Paare zu jedem Pod · iptables/IPVS oder eBPF", "Die Software im Server, die seine Pods miteinander und mit dem Rest des Clusters verbindet.",
        "Das eth0 jedes Pods ist ein Ende eines veth-Paars, dessen anderes Ende an dieser Bridge (oder einem eBPF-Hook) hängt. Hier liegen auch die Routingtabelle des Nodes und die kube-proxy-Regeln.",
        ["Untersuchen mit `ip netns`, `ip route`, `iptables -t nat -L KUBE-SERVICES` oder `cilium bpf lb list`."]],
      ingress: ["Ingress-Controller", "Pod 10.244.1.4 · ingress-nginx", "Die Haustür des Clusters, als Pod. Sie liest, welche Website und Seite angefragt wurde, und leitet den Besucher weiter.",
        "Ein Reverse Proxy im Cluster. Er beendet TLS für shop.example und leitet anhand von Host und Pfad an Services weiter.",
        ["Die Gateway API löst Ingress ab, mit getrennten Gateway- und HTTPRoute-Ressourcen für Plattform- und App-Teams."]],
      weba: ["web-Pod", "10.244.1.7 · app=web", "Eine Kopie der Website, als Pod.", "Ein Web-Frontend-Pod. Er ruft für Daten den api-Service auf."],
      dns: ["CoreDNS", "Pod 10.244.1.3 · Service kube-dns 10.96.0.10", "Das eigene Telefonbuch des Clusters, das für Namen wie api antwortet.",
        "Beantwortet Cluster-DNS-Namen (service.namespace.svc.cluster.local) aus der API und leitet alles andere nach oben weiter.",
        ["ndots:5 in der resolv.conf der Pods erzeugt mehrere Abfragen für externe Namen; FQDNs mit abschließendem Punkt nutzen oder ndots anpassen.", "NodeLocal DNSCache senkt Latenz und Conntrack-Last auf vollen Clustern."]],
      n2nic: ["eth0", "10.20.1.12", "Die Netzwerkverbindung von Node 2.", "Die Schnittstelle von Node 2 im Node-Netz."],
      n2br: ["cni0-Bridge · kube-proxy-Regeln", "veth-Paare · Durchsetzung der Policies", "Die Software, die die Pods von Node 2 verbindet.", "Pod-Netz und Service-Regeln von Node 2."],
      webb: ["web-Pod", "10.244.2.6 · app=web", "Eine zweite Kopie der Website.", "Ein weiteres Replikat des web-Deployments, damit die Seite den Verlust eines Nodes übersteht."],
      apia: ["api-Pod", "10.244.2.9 · app=api", "Eine Kopie des App-Backends.", "Ein api-Replikat hinter dem api-Service."],
      debug: ["Debug-Pod (dev)", "10.244.2.12 · Namespace dev", "Ein Pod eines anderen Teams, der nicht mit der Datenbank reden sollte.", "Ein Fehlersuch-Pod in einem anderen Namespace. Ohne Network Policy könnte er jeden Pod im Cluster erreichen."],
      n3nic: ["eth0", "10.20.1.13", "Die Netzwerkverbindung von Node 3.", "Die Schnittstelle von Node 3 im Node-Netz."],
      n3br: ["cni0-Bridge · kube-proxy-Regeln", "veth-Paare · Durchsetzung der Policies", "Die Software, die die Pods von Node 3 verbindet.", "Das Pod-Netz von Node 3. Die NetworkPolicy für den db-Pod wird hier durchgesetzt."],
      apib: ["api-Pod", "10.244.3.5 · app=api", "Eine weitere Kopie des App-Backends.", "Ein zweites api-Replikat."],
      db: ["db-Pod", "10.244.3.8 · app=db · Port 5432", "Die Datenbank, als Pod, geschützt durch eine Network Policy.", "PostgreSQL in einem StatefulSet. Eine NetworkPolicy erlaubt Eingang nur von Pods mit dem Label app=api auf Port 5432."]
    },
    {
      pod2pod: { title: "Pod zu Pod über Nodes hinweg", blurb: "Jeder Pod hat eine eigene IP; das CNI verbindet die Nodes.",
        deep: ["Das Kubernetes-Netzwerkmodell: Alle Pods erreichen alle Pods und Nodes ohne NAT. Wie, entscheidet das CNI.", "eBPF-Datenebenen hängen Programme an veth- und NIC-Hooks, umgehen iptables und bringen identitätsbasierte Policies und Flow-Protokolle.", "Pod- und Service-CIDRs so planen, dass sie nicht mit Firmen- oder VPN-Bereichen überlappen, sonst werden lokale Systeme unerreichbar."],
        steps: [
          ["Aus dem Pod heraus", "Der web-Pod (10.244.1.7) ruft den api-Pod (10.244.2.9) direkt auf: Kubernetes verlangt, dass Pods einander ohne NAT erreichen. Das Paket verlässt den Netzwerk-Namespace des Pods über ein veth-Paar zur Bridge des Nodes, und die Routingtabelle von Node 1 sagt: 10.244.2.0/24 liegt auf Node 2.", "In Kubernetes hat jeder Pod eine eigene Adresse und kann jeden anderen Pod direkt erreichen."],
          ["Über das Node-Netz", "Das Node-Netz kennt nur Node-Adressen. Also verpackt das CNI das Pod-Paket entweder in VXLAN (Flannel oder Calico im Overlay-Modus) oder kündigt Pod-Routen per BGP an, damit das Netz sie nativ routet (Calico, natives Routing bei Cilium).", "Die Nachricht reist zwischen den Servern, verpackt, damit das gewöhnliche Netz sie transportieren kann."],
          ["In den Ziel-Pod", "Node 2 packt es aus, und seine Bridge stellt es über das veth des api-Pods in dessen Namespace zu. Der api-Pod sieht die echte Quell-Pod-IP; nichts wurde per NAT übersetzt.", "Der zweite Server packt die Nachricht aus und übergibt sie dem richtigen Pod."]
        ] },
      service: { title: "Einen Service aufrufen", blurb: "Cluster-DNS, eine virtuelle IP und DNAT auf einen echten Pod.",
        deep: ["Service-Typen: ClusterIP, NodePort (30000–32767 auf jedem Node), LoadBalancer, ExternalName; Headless-Services liefern Pod-IPs.", "kube-proxy im iptables-Modus wählt Endpunkte zufällig über Statistikregeln; IPVS hat echte Verfahren; EndpointSlices skalieren auf Tausende Pods.", "Connection Tracking hält das DNAT für jeden Flow; ist die Conntrack-Tabelle auf vollen Nodes erschöpft, werden neue Verbindungen verworfen."],
        steps: [
          ["Den Service-Namen nachschlagen", "Der web-Pod ruft http://api auf. Seine resolv.conf zeigt auf CoreDNS, das aus den eigenen Einträgen des Clusters antwortet: api.shop.svc.cluster.local ist 10.96.0.30, die feste ClusterIP des Service.", "Der Pod fragt das eigene Telefonbuch des Clusters nach der Adresse des api-Service."],
          ["Die virtuelle IP anpeilen", "Der web-Pod verbindet sich mit 10.96.0.30:80. Kein Rechner besitzt diese Adresse. Sie existiert nur als Regeln, die kube-proxy (iptables oder IPVS) oder eine eBPF-Datenebene auf jedem Node angelegt hat.", "Er schickt seine Anfrage an die Adresse des Service, und die ist virtuell: Kein echter Rechner hat sie."],
          ["Auf einen echten Pod umgeschrieben", "Auf Node 1, noch bevor das Paket ihn verlässt, wählt die Service-Regel einen gesunden Endpunkt (den api-Pod auf Node 3) und setzt das Ziel per DNAT auf 10.244.3.5:8080. Connection Tracking kehrt das bei der Antwort um, sodass der web-Pod immer nur die Service-IP sieht.", "Der Node tauscht unbemerkt die virtuelle Adresse gegen die Adresse eines echten Pods, wählt eine der gesunden Kopien und schickt es weiter."]
        ] },
      ingress: { title: "Ein Kunde erreicht die Website", blurb: "Load Balancer, Ingress-Controller, Service, Pod.",
        deep: ["Die Gateway API (Gateway, HTTPRoute) löst Ingress ab, mit Rollentrennung und reicheren Regeln.", "cert-manager automatisiert Zertifikate per ACME; TLS-Passthrough erhält die Verschlüsselung bis zum Pod, beschränkt das Routing aber auf SNI.", "Die Client-IP mit externalTrafficPolicy: Local oder dem PROXY-Protokoll erhalten, sonst scheint jede Anfrage von einem Node zu kommen."],
        steps: [
          ["Vom Load Balancer zum Ingress", "shop.example wird auf die Adresse des Load Balancers aufgelöst. Ein Service vom Typ LoadBalancer (ein Cloud-LB oder MetalLB vor Ort) leitet die Verbindung an die Pods des Ingress-Controllers.", "Der Kunde erreicht einen Load Balancer am Rand des Clusters, der ihn an den Ingress weitergibt, die Haustür des Clusters."],
          ["Der Ingress leitet nach Host und Pfad", "Der Ingress-Controller beendet TLS mit dem Zertifikat der Seite, erkennt Host: shop.example und den Pfad / und leitet an einen Endpunkt des web-Service weiter: hier den web-Pod auf Node 2.", "Der Ingress liest, welche Website und Seite angefragt wurde, und leitet die Anfrage an einen web-Pod weiter."]
        ] },
      netpol: { title: "Eine Network Policy blockiert einen Pod", blurb: "Labels, nicht IPs, entscheiden, wer die Datenbank erreicht.",
        deep: ["Ein Pod wird für eine Richtung isoliert, sobald eine Policy ihn auswählt; mit einer Standardverbot-Policy pro Namespace beginnen.", "Bei Standardverbot für ausgehenden Verkehr kube-dns (UDP/TCP 53) erlauben.", "Core-NetworkPolicy wirkt nur auf L3/L4; Cilium und Service Meshes ergänzen L7-Regeln und Identität per Mutual TLS."],
        steps: [
          ["Von der NetworkPolicy verboten", "Ein Debug-Pod im Namespace dev versucht die Datenbank auf 5432. Kubernetes erlaubt standardmäßig jeden Pod-Verkehr, aber eine NetworkPolicy sagt: Nur Pods mit dem Label app=api dürfen app=db auf 5432 erreichen. Das CNI auf Node 3 setzt das durch und verwirft die Verbindung.", "Ein Pod, der nicht mit der Datenbank reden soll, versucht es trotzdem. Eine Network Policy, eine Firewall-Regel für Pods, blockiert ihn."],
          ["Der erlaubte Weg", "Der api-Pod passt zum erlaubten Selektor der Policy und verbindet sich normal. Policies wählen per Label, nicht per IP, und funktionieren deshalb weiter, wenn Pods neu verteilt werden.", "Der api-Pod steht auf der Erlaubnisliste und kommt durch."]
        ] },
      apply: { title: "kubectl apply: ein Pod entsteht", blurb: "API-Server, etcd, Scheduler und Kubelet.",
        deep: ["Alles läuft über den API-Server; Nodes sprechen nie direkt mit etcd.", "Admission Control (Pod Security Admission, Kyverno, OPA Gatekeeper) kann Objekte vor dem Speichern ablehnen oder verändern.", "Hochverfügbarkeit der Steuerungsebene: 3 oder 5 etcd-Mitglieder für ein Quorum und mehrere API-Server hinter einem Load Balancer."],
        steps: [
          ["Der Sollzustand wird festgehalten", "kubectl authentifiziert sich per HTTPS (6443) mit einem OIDC-Token oder Client-Zertifikat beim API-Server. RBAC prüft die Berechtigung, Admission Controller validieren das Objekt, und das Deployment wird in etcd gespeichert.", "Ein Admin sagt dem Cluster, was laufen soll. Das Gehirn des Clusters prüft, ob das erlaubt ist, und schreibt es in seine Datenbank."],
          ["Der Scheduler wählt einen Node", "Controller legen die neuen Pod-Objekte an. Der Scheduler beobachtet den API-Server, sieht einen Pod ohne Node und weist ihn dem Node mit genug freier CPU und genug Speicher zu: Node 3.", "Der Scheduler entscheidet, welcher Server Platz für den neuen Pod hat."],
          ["Das Kubelet startet ihn", "Das Kubelet von Node 3 beobachtet die ihm zugewiesenen Pods. Es lädt das Image, holt sich vom CNI-Plugin eine Pod-IP und ein Netz und startet die Container. Sobald die Readiness-Probe besteht, wird der Pod zu den Endpunkten des api-Service hinzugefügt.", "Der gewählte Server lädt die App herunter, gibt dem neuen Pod eine Adresse und startet ihn."]
        ] }
    });

  /* Overview text in the virtual networks panel */
  NET.VINTRO = [
    { easy: "Ein physischer Server kann Dutzende virtuelle Maschinen betreiben. Darin verbindet ein Software-Switch sie, genau wie ein echter Switch echte Computer verbindet. Zwei Server teilen sich hier die Arbeit und können laufende Maschinen untereinander weiterreichen.",
      text: "Zwei Hypervisor-Hosts betreiben die Server der Firma als VMs. Jeder Host hat einen verteilten virtuellen Switch mit Portgruppen, die VLANs zugeordnet sind, zwei physische Uplinks als Trunks zu einem Paar Top-of-Rack-Switches und VMkernel-Schnittstellen für Management, Live-Migration und Storage.",
      deep: ["Achten Sie auf Verkehr, der in einem Host bleibt (für physische Werkzeuge unsichtbar), und auf Verkehr, der den Umweg über den Core nimmt.", "Overlays (NSX, OVN) entkoppeln VM-Netze von VLANs und bringen verteiltes Routing und verteilte Firewalls."] },
    { easy: "Kubernetes betreibt Apps als kleine Container, verteilt auf mehrere Server (Nodes). Jede Kopie einer App, ein Pod, bekommt eine eigene Adresse, und der Cluster gibt jeder App einen festen Namen.",
      text: "Ein Cluster mit drei Nodes und seiner Steuerungsebene. Pods bekommen IPs aus dem Anteil jedes Nodes an 10.244.0.0/16; Services liefern feste virtuelle IPs aus 10.96.0.0/12; ein Ingress-Controller hinter einem Load Balancer holt Kunden herein; NetworkPolicy begrenzt, wer die Datenbank erreichen darf. Node 1 ist die VM K8S-W1 aus dem Virtualisierungs-Tab.",
      deep: ["Drei Adressierungsebenen existieren nebeneinander: Node-IPs (routbar), Pod-IPs (im Cluster über das CNI routbar) und Service-IPs (virtuell, umgesetzt durch Regeln auf jedem Node).", "Nachverfolgen mit `kubectl get endpointslices`, `ip route` auf den Nodes und Hubble oder tcpdump am veth."] }
  ];
})();
