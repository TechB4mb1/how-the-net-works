/* How the Net Works — language and short forms.
   1. Picks the language (English or German), remembered per browser.
   2. Post-processes every text node the page renders:
      - translates interface text into German (content itself comes
        from the German data files),
      - writes out every short form (DNS, VLAN, …) beside itself in a
        span that is only visible at beginner level.
   Loaded before every other script. */
(function () {
  "use strict";

  /* ---------------- language ---------------- */
  var LANG = "en";
  try {
    var saved = localStorage.getItem("htnw-lang");
    if (saved === "en" || saved === "de") LANG = saved;
    else if (/htnw-lang=(en|de)/.test(window.name)) LANG = RegExp.$1;
    else if (/^de\b/i.test(navigator.language || "")) LANG = "de";
  } catch (e) {
    if (/htnw-lang=(en|de)/.test(window.name)) LANG = RegExp.$1;
  }
  window.LANG = LANG;
  document.documentElement.lang = LANG;

  function setLang(l) {
    if (l === LANG) return;
    try { localStorage.setItem("htnw-lang", l); } catch (e) { /* ignore */ }
    window.name = "htnw-lang=" + l;
    location.reload();
  }

  /* ---------------- German interface dictionary ---------------- */
  var EXACT = {
    // masthead, intro, navigation
    "How the Net Works": "Wie das Netz funktioniert",
    "How the Net Works, back to top": "Wie das Netz funktioniert, zurück nach oben",
    "Sections": "Abschnitte", "Map": "Karte", "Dependencies": "Abhängigkeiten", "Builder": "Baukasten", "Virtual": "Virtuell",
    "Layers": "Schichten", "Addressing": "Adressierung", "Services": "Dienste", "Ports": "Ports", "Quiz": "Quiz",
    "Learning depth": "Lerntiefe", "Beginner": "Einsteiger", "Intermediate": "Fortgeschritten", "Expert": "Experte",
    "Switch colour theme": "Farbschema wechseln", "Language": "Sprache",
    "A field guide to the Internet and enterprise networks": "Ein Leitfaden durch das Internet und Unternehmensnetzwerke",
    "Every login, web page and email crosses a dozen machines before you see it. Here they all are.": "Jede Anmeldung, jede Webseite und jede E-Mail passiert ein Dutzend Geräte, bevor Sie sie sehen. Hier sind sie alle.",
    "This is the whole computer network of Meridian Freight, a made-up company with 400 staff. Every coloured dot is a message moving between computers. Click anything to find out what it is, in plain language, then follow one message from start to finish.":
      "Das ist das gesamte Computernetzwerk von Meridian Freight, einer erfundenen Firma mit 400 Mitarbeitenden. Jeder farbige Punkt ist eine Nachricht zwischen Computern. Klicken Sie auf irgendetwas, um in einfachen Worten zu erfahren, was es ist, und verfolgen Sie dann eine Nachricht von Anfang bis Ende.",
    "Below is the complete network of Meridian Freight, a fictional 400-person company: the services it can't run without, the security controls around them, and the Internet beyond. Watch the traffic that flows through it on a normal working day, click any stream, cable or device to see what it carries, then follow single packets step by step.":
      "Unten sehen Sie das komplette Netzwerk von Meridian Freight, einer fiktiven Firma mit 400 Mitarbeitenden: die Dienste, ohne die nichts läuft, die Sicherheitskontrollen drumherum und das Internet dahinter. Beobachten Sie den Verkehr an einem normalen Arbeitstag, klicken Sie auf einen Datenstrom, ein Kabel oder ein Gerät, um zu sehen, was es transportiert, und verfolgen Sie dann einzelne Pakete Schritt für Schritt.",
    "Choose your depth. Everything on the page adapts, and you can switch at any time.": "Wählen Sie Ihre Tiefe. Die ganze Seite passt sich an, und Sie können jederzeit wechseln.",
    "New to networking. Every term in plain words: what it is, what it does and what it depends on. Short forms are written out.": "Neu im Thema Netzwerk. Jeder Begriff in einfachen Worten: was er ist, was er tut und wovon er abhängt. Abkürzungen werden ausgeschrieben.",
    "IT generalist. Protocols, ports, firewall rules and packet headers, and how the pieces fit.": "IT-Allrounder. Protokolle, Ports, Firewall-Regeln und Paket-Header, und wie alles zusammenpasst.",
    "Network or security engineer. Protocol internals, attack paths, design trade-offs and Wireshark filters.": "Netzwerk- oder Security-Engineer. Protokoll-Interna, Angriffswege, Design-Abwägungen und Wireshark-Filter.",

    // map section
    "The network map": "Die Netzwerkkarte", "Map mode": "Kartenmodus", "Live traffic": "Live-Verkehr", "Explore devices": "Geräte erkunden", "Follow a packet": "Paket verfolgen",
    "Network diagram of Meridian Freight": "Netzwerkdiagramm von Meridian Freight",
    "Switch, router, AP": "Switch, Router, AP", "Security control": "Sicherheitskontrolle", "Server or service": "Server oder Dienst", "Endpoint": "Endgerät",
    "Outside our control": "Außerhalb unserer Kontrolle", "Mirror copy or wireless": "Spiegelkopie oder Funk", "Request · reply": "Anfrage · Antwort", "Dropped": "Verworfen",
    "Scroll sideways on small screens": "Auf kleinen Bildschirmen seitlich scrollen",
    "Start here": "Hier anfangen", "Meridian Freight's network": "Das Netzwerk von Meridian Freight",
    "One head office, about 400 staff, a public website and people working from home. Each coloured region is a security zone; inside the building, each one is a VLAN with its own subnet. Lines are cables, or paths across the Internet.":
      "Eine Zentrale, rund 400 Mitarbeitende, eine öffentliche Website und Leute im Homeoffice. Jeder farbige Bereich ist eine Sicherheitszone; im Gebäude ist jede davon ein VLAN mit eigenem Subnetz. Linien sind Kabel oder Wege durch das Internet.",
    "Click any device on the map to see what it does, how it works and what breaks without it.": "Klicken Sie auf ein Gerät in der Karte, um zu sehen, was es tut, wie es funktioniert und was ohne es kaputtgeht.",
    "Or follow a packet": "Oder verfolgen Sie ein Paket", "Pick a journey": "Wählen Sie eine Paketreise",
    "Each journey animates real traffic across the map, step by step, and shows what is inside the packet at each stage. Use the arrow keys to step.":
      "Jede Paketreise animiert echten Verkehr über die Karte, Schritt für Schritt, und zeigt, was in jedem Moment im Paket steckt. Mit den Pfeiltasten geht es vor und zurück.",
    "What it is": "Was es ist", "What it does": "Was es tut", "What it depends on": "Wovon es abhängt",
    "How it works": "Wie es funktioniert", "Examples": "Beispiele", "When it breaks": "Wenn es ausfällt", "Going deeper": "Für Fortgeschrittene", "Expert notes": "Expertenhinweise",
    "Connected to": "Verbunden mit", "See it in action": "In Aktion sehen", "← All journeys": "← Alle Paketreisen", "Back": "Zurück", "Play": "Abspielen", "Pause": "Pause",
    "Next": "Weiter", "Next journey": "Nächste Paketreise", "Next scenario": "Nächstes Szenario", "On the wire": "Auf der Leitung", "Path": "Pfad", "Paths": "Pfade",
    "Wireshark filter": "Wireshark-Filter", "Short forms on this map": "Abkürzungen in dieser Karte", "Short forms in this diagram": "Abkürzungen in diesem Diagramm",
    // live traffic
    "A normal Tuesday morning": "Ein ganz normaler Dienstagmorgen",
    "Every stream of dots is one kind of traffic, coloured by what it's for. Solid dots are requests; hollow dots are replies coming back. Streams that end at a red ✕ are being dropped.":
      "Jeder Punktestrom ist eine Art von Verkehr, gefärbt nach seinem Zweck. Volle Punkte sind Anfragen, hohle Punkte die Antworten. Ströme, die an einem roten ✕ enden, werden verworfen.",
    "Click a stream below, or any cable or device on the map, to see exactly what crosses it.": "Klicken Sie unten auf einen Datenstrom oder in der Karte auf ein Kabel oder Gerät, um genau zu sehen, was darüber läuft.",
    "Show or hide": "Ein- oder ausblenden", "← All traffic": "← Gesamter Verkehr", "Traffic through this device": "Verkehr durch dieses Gerät", "Traffic on this cable": "Verkehr auf diesem Kabel",
    "Traffic for this service": "Verkehr dieses Dienstes", "Device details": "Gerätedetails", "Nothing in this model uses it.": "In diesem Modell nutzt nichts diesen Weg.",
    "From": "Von", "To": "Nach", "Protocol": "Protokoll", "Started by": "Gestartet von", "Rule": "Regel", "If it's blocked": "Wenn es blockiert wird", "Where it stops": "Wo es endet",
    "▸ Step through it packet by packet": "▸ Paket für Paket durchgehen",
    "Names, addresses & time": "Namen, Adressen & Zeit", "Identity & access": "Identität & Zugriff", "Web": "Web", "Email": "E-Mail", "Files, apps & voice": "Dateien, Apps & Telefonie",
    "Security & monitoring": "Sicherheit & Überwachung", "Remote access & admin": "Fernzugriff & Administration", "Denied traffic": "Abgelehnter Verkehr",
    // dependencies
    "What depends on what": "Was hängt wovon ab",
    "Services are stacked on top of each other. Users only see the top row, but each item there quietly depends on the rows beneath it. Pick a service to see its dependencies, then simulate an outage to watch how far the failure spreads.":
      "Dienste bauen aufeinander auf. Nutzer sehen nur die oberste Reihe, aber alles dort hängt still von den Reihen darunter ab. Wählen Sie einen Dienst, um seine Abhängigkeiten zu sehen, und simulieren Sie dann einen Ausfall, um zu sehen, wie weit er sich ausbreitet.",
    "Service dependency map": "Karte der Dienstabhängigkeiten", "Depends on": "Hängt ab von", "Needed by": "Benötigt von", "Outage": "Ausfall", "Fails as a result": "Fällt dadurch aus",
    "Upper rows depend on lower rows": "Obere Reihen hängen von unteren ab", "Pull out a building block": "Ziehen Sie einen Baustein heraus",
    "Each box is a service; lines run down to what it needs. Click a box to see what it depends on and what depends on it. Or jump straight to an outage:":
      "Jedes Kästchen ist ein Dienst; Linien führen nach unten zu dem, was er braucht. Klicken Sie auf ein Kästchen, um zu sehen, wovon es abhängt und was von ihm abhängt. Oder springen Sie direkt zu einem Ausfall:",
    "Why this matters": "Warum das wichtig ist",
    "Outages rarely start where users notice them. \"Email is down\" can really be DNS, an expired certificate or a clock that drifted. Engineers troubleshoot by walking down this stack.":
      "Ausfälle beginnen selten dort, wo Nutzer sie bemerken. „E-Mail geht nicht“ kann in Wahrheit DNS sein, ein abgelaufenes Zertifikat oder eine falsch gehende Uhr. Fachleute suchen Fehler, indem sie diesen Stapel von oben nach unten durchgehen.",
    "Needed directly by": "Direkt benötigt von", "Nothing below it in this model.": "In diesem Modell liegt nichts darunter.", "Nothing. Users deal with it directly.": "Nichts. Nutzer haben direkt damit zu tun.",
    "Simulate an outage": "Ausfall simulieren", "See its traffic on the map": "Seinen Verkehr in der Karte zeigen", "Outage simulation": "Ausfallsimulation",
    "other services fail with it, working up from the bottom of the stack.": "weitere Dienste fallen mit aus, von unten nach oben durch den Stapel.",
    "other services fail with it. It is a leaf: nothing else depends on it.": "weitere Dienste fallen mit aus. Es ist ein Blatt: Nichts hängt davon ab.",
    "What users notice": "Was Nutzer bemerken", "Platform services": "Plattformdienste", "Identity & policy": "Identität & Richtlinien", "Core services": "Kerndienste", "Foundation": "Fundament",
    // builder
    "Build your own network": "Bauen Sie Ihr eigenes Netzwerk",
    "Add and remove components and see what happens. The map redraws itself, the traffic that works starts flowing, risky paths show in red, and the report scores what works, how secure it is and where a single failure would hurt. Click an empty slot to add something, or a component to see what removing it would change.":
      "Fügen Sie Komponenten hinzu oder entfernen Sie sie und sehen Sie, was passiert. Die Karte zeichnet sich neu, funktionierender Verkehr beginnt zu fließen, riskante Wege werden rot, und der Bericht bewertet, was funktioniert, wie sicher es ist und wo ein einzelner Ausfall wehtun würde. Klicken Sie auf einen leeren Platz, um etwas hinzuzufügen, oder auf eine Komponente, um zu sehen, was ihr Entfernen ändern würde.",
    "Start from": "Starten mit", "Presets": "Vorlagen", "Separate VLANs for users, servers and guests": "Getrennte VLANs für Nutzer, Server und Gäste", "Components": "Komponenten",
    "Network builder canvas": "Zeichenfläche des Netzwerk-Baukastens", "Empty slot: click to add": "Leerer Platz: klicken zum Hinzufügen", "Working traffic": "Funktionierender Verkehr",
    "Traffic that should be blocked": "Verkehr, der blockiert sein sollte",
    "Home router": "Heimrouter", "Small office": "Kleines Büro", "Flat and exposed": "Flach und ungeschützt", "Enterprise": "Unternehmen", "Just laptops": "Nur Laptops",
    "Internet edge": "Internet-Rand", "Network": "Netzwerk", "Applications": "Anwendungen", "Security & operations": "Sicherheit & Betrieb",
    "Internet link": "Internetanschluss", "Second ISP link": "Zweiter ISP-Anschluss", "Edge router": "Edge-Router", "IPS": "IPS", "Firewall": "Firewall",
    "Core switch": "Core-Switch", "Access switch": "Access-Switch", "Wi-Fi access point": "WLAN-Access-Point", "Wi-Fi AP": "WLAN-AP", "Staff laptops": "Mitarbeiter-Laptops", "Guest devices": "Gastgeräte", "Guests": "Gäste",
    "DHCP server": "DHCP-Server", "Internal DNS": "Interner DNS", "Domain controller": "Domänencontroller", "Domain ctrl": "Domänen-Ctrl", "Second domain controller": "Zweiter Domänencontroller",
    "Second DC": "Zweiter DC", "Certificate authority": "Zertifizierungsstelle", "RADIUS / NAC": "RADIUS / NAC", "RADIUS": "RADIUS", "File server": "Dateiserver", "Mail server": "Mailserver",
    "Mail gateway": "Mail-Gateway", "Public web server": "Öffentlicher Webserver", "Web server": "Webserver", "WAF / reverse proxy": "WAF / Reverse Proxy", "Web proxy": "Web-Proxy",
    "VPN gateway": "VPN-Gateway", "IDS sensor": "IDS-Sensor", "EDR on laptops": "EDR auf Laptops", "Jump host": "Jump-Host", "ISP 2": "ISP 2", "ISP": "ISP",
    "Your connection to the rest of the Internet, from an ISP.": "Ihre Verbindung zum Rest des Internets, von einem ISP.",
    "A backup connection from a different provider, so one ISP outage doesn't cut you off.": "Eine Ersatzverbindung von einem anderen Anbieter, damit ein ISP-Ausfall Sie nicht abschneidet.",
    "Routes between your network and the ISPs. With two links it can fail over between them.": "Routet zwischen Ihrem Netzwerk und den ISPs. Mit zwei Anschlüssen kann er zwischen ihnen umschalten.",
    "Sits inline on the Internet link and drops known attacks before they reach anything.": "Sitzt direkt in der Internetleitung und verwirft bekannte Angriffe, bevor sie etwas erreichen.",
    "Enforces what may cross between the Internet, the DMZ, the inside and guests, and does NAT.": "Setzt durch, was zwischen Internet, DMZ, internem Netz und Gästen fließen darf, und übernimmt NAT.",
    "A layer-3 switch that connects everything inside and routes between VLANs.": "Ein Layer-3-Switch, der intern alles verbindet und zwischen VLANs routet.",
    "The switch the desks plug into. Without a core switch it uplinks straight to the firewall or router.": "Der Switch, an dem die Arbeitsplätze hängen. Ohne Core-Switch ist er direkt mit Firewall oder Router verbunden.",
    "Wireless for staff, and for guests if you add them.": "WLAN für Mitarbeitende und, falls hinzugefügt, für Gäste.",
    "The people the network exists for. They can't be removed.": "Die Menschen, für die es das Netzwerk gibt. Sie lassen sich nicht entfernen.",
    "Visitors' phones and laptops on Wi-Fi.": "Handys und Laptops von Besuchern im WLAN.",
    "Hands out addresses, gateways and DNS settings, with reservations, failover and DNS registration.": "Vergibt Adressen, Gateways und DNS-Einstellungen, mit Reservierungen, Ausfallsicherheit und DNS-Registrierung.",
    "Resolves internal names and forwards Internet lookups. (A domain controller also runs DNS.)": "Löst interne Namen auf und leitet Internet-Anfragen weiter. (Ein Domänencontroller betreibt auch DNS.)",
    "Active Directory: one account per person, groups, Kerberos logons and Group Policy. Also runs DNS.": "Active Directory: ein Konto pro Person, Gruppen, Kerberos-Anmeldung und Gruppenrichtlinien. Betreibt auch DNS.",
    "A replica of the directory and DNS, so logons survive one server failing.": "Eine Kopie von Verzeichnis und DNS, damit Anmeldungen den Ausfall eines Servers überstehen.",
    "Issues certificates for Wi-Fi/802.1X, VPN and internal HTTPS.": "Stellt Zertifikate für WLAN/802.1X, VPN und internes HTTPS aus.",
    "Authenticates every device on wired ports and Wi-Fi before it gets on the network.": "Authentifiziert jedes Gerät an Kabel-Ports und im WLAN, bevor es ins Netz darf.",
    "Shared drives and home folders.": "Gemeinsame Laufwerke und persönliche Ordner.", "Mailboxes and calendars, hosted on-premises.": "Postfächer und Kalender, im eigenen Haus betrieben.",
    "Receives Internet mail in the DMZ and filters spam, malware and spoofing before relaying it inside.": "Nimmt E-Mails aus dem Internet in der DMZ an und filtert Spam, Schadsoftware und Fälschungen, bevor sie nach innen weitergehen.",
    "Hosts your public website.": "Hostet Ihre öffentliche Website.", "Fronts the website: terminates TLS, filters attacks and load-balances.": "Steht vor der Website: beendet TLS, filtert Angriffe und verteilt die Last.",
    "Users browse through it, so web access is filtered, scanned and logged.": "Nutzer surfen darüber, sodass Webzugriffe gefiltert, geprüft und protokolliert werden.",
    "Lets home workers reach internal systems over an encrypted tunnel.": "Ermöglicht Homeoffice-Nutzern den Zugriff auf interne Systeme über einen verschlüsselten Tunnel.",
    "Collects and correlates logs from every device so attacks get noticed.": "Sammelt und verknüpft Protokolle aller Geräte, damit Angriffe auffallen.",
    "Watches a mirror copy of internal traffic for lateral movement. Needs a core switch to mirror from.": "Beobachtet eine Spiegelkopie des internen Verkehrs auf seitliche Bewegungen. Braucht einen Core-Switch als Quelle.",
    "An agent on every laptop that detects and stops malware and can isolate the machine.": "Ein Agent auf jedem Laptop, der Schadsoftware erkennt und stoppt und das Gerät isolieren kann.",
    "The only machine allowed to manage network gear and servers. Admins connect through it with MFA.": "Der einzige Rechner, von dem aus Netzwerkgeräte und Server verwaltet werden dürfen. Admins verbinden sich darüber mit MFA.",
    "untrusted": "nicht vertrauenswürdig", "own firewall leg": "eigener Firewall-Zweig", "Exposed": "Ungeschützt", "no firewall in front": "keine Firewall davor", "Edge": "Edge",
    "Users": "Nutzer", "Guest": "Gast", "Servers": "Server", "Flat network": "Flaches Netzwerk", "one subnet: everything can reach everything": "ein Subnetz: alles erreicht alles",
    "not connected": "nicht verbunden", "services working": "Dienste funktionieren", "security score": "Sicherheitswert", "single points of failure": "Single Points of Failure",
    "Last change": "Letzte Änderung", "Remove it": "Entfernen", "Add it": "Hinzufügen", "If you remove it": "Wenn Sie es entfernen", "If you add it": "Wenn Sie es hinzufügen",
    "What works": "Was funktioniert", "Security checks": "Sicherheitsprüfungen", "Resilience": "Ausfallsicherheit",
    "Works": "Funktioniert", "Caveat": "Mit Einschränkung", "Broken": "Defekt", "Not set up": "Nicht eingerichtet", "Fix: turn on VLANs": "Lösung: VLANs einschalten",
    "No change to what works, security or resilience.": "Keine Änderung bei Funktion, Sicherheit oder Ausfallsicherheit.",
    "Staff connect to the network": "Mitarbeitende kommen ins Netz", "Automatic addresses": "Automatische Adressen", "Name resolution": "Namensauflösung", "Central logons": "Zentrale Anmeldung",
    "Web browsing": "Surfen im Web", "File sharing": "Dateifreigabe", "Public website": "Öffentliche Website", "Remote access": "Fernzugriff", "Staff Wi-Fi": "Mitarbeiter-WLAN", "Guest Wi-Fi": "Gäste-WLAN", "Internal certificates": "Interne Zertifikate",
    "Wired desks and Wi-Fi.": "Kabel-Arbeitsplätze und WLAN.", "Wired only. Add a Wi-Fi access point for wireless.": "Nur Kabel. Fügen Sie für Funk einen WLAN-Access-Point hinzu.",
    "The laptops have nothing to plug into. Add an access switch.": "Die Laptops haben nichts zum Anschließen. Fügen Sie einen Access-Switch hinzu.",
    "The DHCP server hands out addresses, gateway and DNS settings.": "Der DHCP-Server vergibt Adressen, Gateway und DNS-Einstellungen.",
    "Nothing hands out addresses: every device needs one typed in by hand, and new devices end up with 169.254.x.x.": "Niemand vergibt Adressen: Jedes Gerät braucht eine von Hand eingetragene Adresse, neue Geräte landen bei 169.254.x.x.",
    "There's no network to hand addresses out on.": "Es gibt kein Netzwerk, in dem Adressen vergeben werden könnten.",
    "Internal DNS resolves both internal names and the Internet.": "Der interne DNS löst interne Namen und Internetnamen auf.",
    "Internal names resolve. Internet names fail without an Internet link.": "Interne Namen werden aufgelöst. Internetnamen scheitern ohne Internetanschluss.",
    "Using the ISP's DNS: websites resolve, but internal names like files01 don't, and Active Directory can't work.": "Es wird der DNS des ISPs genutzt: Websites werden aufgelöst, interne Namen wie files01 nicht, und Active Directory kann nicht funktionieren.",
    "Nothing can resolve names.": "Nichts kann Namen auflösen.",
    "One account per person; Group Policy manages every laptop.": "Ein Konto pro Person; Gruppenrichtlinien verwalten jeden Laptop.",
    "No directory: every laptop has its own local accounts, and leavers keep access until someone visits each machine.": "Kein Verzeichnis: Jeder Laptop hat eigene lokale Konten, und Ausgeschiedene behalten Zugriff, bis jemand jedes Gerät besucht.",
    "No Internet link.": "Kein Internetanschluss.", "No path from the laptops to the Internet. Something between them is missing.": "Kein Weg von den Laptops ins Internet. Dazwischen fehlt etwas.",
    "Filtered, scanned and logged through the web proxy.": "Über den Web-Proxy gefiltert, geprüft und protokolliert.", "Direct and unfiltered.": "Direkt und ungefiltert.",
    "No file server (or files live in the cloud).": "Kein Dateiserver (oder die Dateien liegen in der Cloud).", "The laptops can't reach the file server.": "Die Laptops erreichen den Dateiserver nicht.",
    "Permissions are granted to directory groups.": "Berechtigungen werden an Verzeichnisgruppen vergeben.", "Works, but with local accounts on the server and shared passwords.": "Funktioniert, aber mit lokalen Konten auf dem Server und geteilten Passwörtern.",
    "No mail server. Many organisations use Microsoft 365 or Google Workspace instead.": "Kein Mailserver. Viele Organisationen nutzen stattdessen Microsoft 365 oder Google Workspace.",
    "The mail server has no route to the Internet, so no mail comes in or goes out.": "Der Mailserver hat keinen Weg ins Internet, es kommen also keine E-Mails an oder gehen raus.",
    "Works, but the mail server takes connections straight from the Internet with no spam or malware filtering.": "Funktioniert, aber der Mailserver nimmt Verbindungen direkt aus dem Internet an, ohne Spam- oder Malwarefilter.",
    "Inbound mail is filtered by the gateway before it reaches mailboxes.": "Eingehende E-Mails werden vom Gateway gefiltert, bevor sie in den Postfächern landen.",
    "No website hosted here.": "Hier wird keine Website betrieben.", "The web server has no route to the Internet.": "Der Webserver hat keinen Weg ins Internet.",
    "Published through the WAF, which filters attacks and hides the server.": "Über die WAF veröffentlicht, die Angriffe filtert und den Server verbirgt.",
    "Published directly: every request, hostile or not, hits the server.": "Direkt veröffentlicht: Jede Anfrage, ob feindlich oder nicht, trifft den Server.",
    "No VPN. Home workers can't reach internal systems.": "Kein VPN. Homeoffice-Nutzer erreichen keine internen Systeme.", "The VPN gateway can't be reached from the Internet.": "Das VPN-Gateway ist aus dem Internet nicht erreichbar.",
    "Remote staff sign in with their directory account.": "Mitarbeitende von außen melden sich mit ihrem Verzeichniskonto an.", "Works, but with separate accounts kept on the VPN gateway.": "Funktioniert, aber mit separaten Konten auf dem VPN-Gateway.",
    "No wireless.": "Kein WLAN.", "The access point has no switch to plug into.": "Der Access Point hat keinen Switch zum Anschließen.",
    "WPA3-Enterprise: each device proves itself with a certificate.": "WPA3-Enterprise: Jedes Gerät weist sich mit einem Zertifikat aus.", "WPA3-Enterprise with personal usernames and passwords.": "WPA3-Enterprise mit persönlichen Benutzernamen und Passwörtern.",
    "One shared password for everyone, which rarely changes when people leave.": "Ein gemeinsames Passwort für alle, das sich selten ändert, wenn jemand geht.",
    "No guest access.": "Kein Gastzugang.", "Guests have no access point to join.": "Gäste haben keinen Access Point zum Verbinden.", "Guests can join, but there's no Internet to give them.": "Gäste können sich verbinden, aber es gibt kein Internet für sie.",
    "An isolated guest VLAN with Internet access only.": "Ein isoliertes Gäste-VLAN nur mit Internetzugang.",
    "A separate VLAN, but with no firewall nothing stops the router sending guests to internal subnets.": "Ein eigenes VLAN, aber ohne Firewall hindert nichts den Router daran, Gäste in interne Subnetze zu leiten.",
    "Guests share the staff network and can reach every laptop, printer and server.": "Gäste teilen das Mitarbeiternetz und erreichen jeden Laptop, Drucker und Server.",
    "No internal CA: internal sites need bought certificates or show warnings.": "Keine interne CA: Interne Seiten brauchen gekaufte Zertifikate oder zeigen Warnungen.",
    "Machines enroll and renew automatically through Active Directory.": "Geräte beantragen und erneuern Zertifikate automatisch über Active Directory.", "Certificates must be requested and installed by hand.": "Zertifikate müssen von Hand beantragt und installiert werden.",
    "Firewall at the Internet edge": "Firewall am Internet-Rand", "Intrusion prevention": "Angriffsabwehr (IPS)", "Public servers isolated in a DMZ": "Öffentliche Server in einer DMZ isoliert",
    "Network segmented into VLANs": "Netzwerk in VLANs aufgeteilt", "Guests kept off the inside": "Gäste vom internen Netz ferngehalten", "Only known devices get on": "Nur bekannte Geräte kommen ins Netz",
    "Endpoint protection": "Endgeräteschutz", "Web traffic filtered": "Webverkehr gefiltert", "Email filtered before delivery": "E-Mails vor der Zustellung gefiltert", "Website behind a WAF": "Website hinter einer WAF",
    "Central logging": "Zentrale Protokollierung", "Internal traffic watched": "Interner Verkehr überwacht", "Admin access through a jump host": "Admin-Zugriff über einen Jump-Host",
    "Only the flows you allow cross between the Internet and the inside.": "Nur erlaubte Verbindungen gelangen zwischen Internet und internem Netz.",
    "Anything on the Internet can try to connect to your devices directly. This is the biggest gap there is.": "Alles im Internet kann direkt versuchen, Ihre Geräte zu erreichen. Das ist die größte Lücke überhaupt.",
    "Known exploits are dropped at the edge.": "Bekannte Exploits werden am Rand verworfen.", "Attacks hidden inside allowed traffic go straight through.": "Angriffe, die in erlaubtem Verkehr versteckt sind, gehen direkt durch.",
    "Internet-facing servers sit in their own zone with narrow rules inward.": "Server mit Internetzugang sitzen in einer eigenen Zone mit engen Regeln nach innen.",
    "The mail server accepts Internet connections from inside the LAN. Add a mail gateway in the DMZ.": "Der Mailserver nimmt Internetverbindungen mitten im LAN an. Fügen Sie ein Mail-Gateway in der DMZ hinzu.",
    "Public servers share the network with everything else, so one compromise exposes it all.": "Öffentliche Server teilen das Netz mit allem anderen, ein einziger Einbruch legt also alles offen.",
    "Users, servers and guests are in separate subnets, filtered where they meet.": "Nutzer, Server und Gäste sind in getrennten Subnetzen und werden an den Übergängen gefiltert.",
    "VLANs need a core switch or firewall to route and filter between them.": "VLANs brauchen einen Core-Switch oder eine Firewall, um zwischen ihnen zu routen und zu filtern.",
    "A flat network: malware on one laptop can reach every other device directly.": "Ein flaches Netz: Schadsoftware auf einem Laptop erreicht jedes andere Gerät direkt.",
    "The guest VLAN only reaches the Internet.": "Das Gäste-VLAN erreicht nur das Internet.", "Guests can reach internal devices.": "Gäste erreichen interne Geräte.",
    "802.1X / RADIUS authenticates every port and Wi-Fi connection.": "802.1X / RADIUS authentifiziert jeden Port und jede WLAN-Verbindung.", "Anyone who plugs into a wall port is on the network.": "Wer eine Netzwerkdose benutzt, ist im Netz.",
    "Every laptop can detect, stop and be isolated from malware.": "Jeder Laptop kann Schadsoftware erkennen, stoppen und isoliert werden.", "Malware on a laptop runs unnoticed.": "Schadsoftware auf einem Laptop läuft unbemerkt.",
    "Malicious sites are blocked and every request is logged.": "Schädliche Seiten werden blockiert, jede Anfrage wird protokolliert.", "Users can reach any site, including malware downloads.": "Nutzer erreichen jede Seite, auch Malware-Downloads.",
    "Spam, malware and spoofed senders are stopped at the gateway.": "Spam, Schadsoftware und gefälschte Absender werden am Gateway gestoppt.", "Phishing arrives straight in the inbox.": "Phishing landet direkt im Posteingang.",
    "Injection and scripting attacks are filtered before they reach the server.": "Injection- und Scripting-Angriffe werden gefiltert, bevor sie den Server erreichen.", "The web server takes every attack head-on.": "Der Webserver bekommt jeden Angriff direkt ab.",
    "Logs from every device are collected and correlated.": "Protokolle aller Geräte werden gesammelt und verknüpft.", "No central logs: you'd only discover a breach when the damage shows.": "Keine zentralen Protokolle: Einen Einbruch bemerken Sie erst, wenn der Schaden sichtbar wird.",
    "An IDS sees lateral movement inside the network.": "Ein IDS sieht seitliche Bewegungen im Netz.", "The IDS needs a core switch to mirror traffic from.": "Das IDS braucht einen Core-Switch, von dem es Verkehr gespiegelt bekommt.",
    "Nobody would notice an attacker moving between internal machines.": "Niemand würde bemerken, wie sich ein Angreifer zwischen internen Rechnern bewegt.",
    "Device management only happens from one hardened, recorded machine.": "Geräteverwaltung geschieht nur von einem gehärteten, aufgezeichneten Rechner aus.",
    "Admins manage devices from everyday laptops; one phished admin owns the network.": "Admins verwalten Geräte von normalen Laptops aus; ein einziger gephishter Admin beherrscht das Netz.",
    "One Internet link: an ISP outage takes down browsing, email, the website and remote access.": "Ein Internetanschluss: Ein ISP-Ausfall legt Surfen, E-Mail, Website und Fernzugriff lahm.",
    "Two ISP links but nothing to fail over between them. Add an edge router.": "Zwei ISP-Anschlüsse, aber nichts, das zwischen ihnen umschaltet. Fügen Sie einen Edge-Router hinzu.",
    "One domain controller: if it fails, nobody can log on, and with DNS on it, names stop resolving too.": "Ein Domänencontroller: Fällt er aus, kann sich niemand anmelden, und da DNS darauf läuft, werden auch keine Namen mehr aufgelöst.",
    "One DNS server: if it fails, almost everything appears broken.": "Ein DNS-Server: Fällt er aus, wirkt fast alles kaputt.",
    "Servers and users share one access switch: it's both the busiest and most critical box.": "Server und Nutzer teilen sich einen Access-Switch: Er ist das meistbelastete und kritischste Gerät zugleich.",
    "No single points of failure among the components modelled here. Real networks also pair firewalls, switches and power supplies.": "Unter den hier modellierten Komponenten gibt es keinen Single Point of Failure. Echte Netze doppeln auch Firewalls, Switches und Netzteile.",
    "Split the network into VLANs": "Netzwerk in VLANs aufgeteilt", "Flattened the network into one subnet": "Netzwerk zu einem Subnetz abgeflacht",
    // virtual
    "Virtual networks": "Virtuelle Netzwerke", "Virtual network diagram": "Diagramm virtueller Netzwerke", "Virtualization host": "Virtualisierungshost", "Kubernetes": "Kubernetes",
    "Most \"servers\" today are virtual: software computers running on shared physical machines. And many apps run in containers managed by Kubernetes. Both build whole networks out of software. Click around to see how.":
      "Die meisten „Server“ sind heute virtuell: Computer aus Software, die auf gemeinsam genutzten physischen Maschinen laufen. Und viele Apps laufen in Containern, die Kubernetes verwaltet. Beide bauen ganze Netzwerke aus Software. Klicken Sie sich durch, um zu sehen, wie.",
    "Most of Meridian's servers are virtual machines, and newer apps run on Kubernetes. Both build networks in software on top of the physical one: virtual switches and port groups inside hypervisors, overlays between hosts, pod networks, Services and ingress inside the cluster.":
      "Die meisten Server von Meridian sind virtuelle Maschinen, neuere Apps laufen auf Kubernetes. Beide bauen Netzwerke in Software auf dem physischen Netz auf: virtuelle Switches und Portgruppen in Hypervisoren, Overlays zwischen Hosts, Pod-Netze, Services und Ingress im Cluster.",
    "Software switch / bridge": "Software-Switch / Bridge", "Pod": "Pod", "Virtual IP (no real machine)": "Virtuelle IP (kein echter Rechner)", "Logical link": "Logische Verbindung",
    "Inside the virtualization hosts": "In den Virtualisierungshosts", "Inside a Kubernetes cluster": "In einem Kubernetes-Cluster",
    "Click any component on the diagram, or follow a scenario.": "Klicken Sie auf eine Komponente im Diagramm oder folgen Sie einem Szenario.",
    "Scenarios": "Szenarien", "← Overview": "← Übersicht", "← All scenarios": "← Alle Szenarien",
    // layers
    "Layers: who handles what": "Schichten: wer erledigt was",
    "Networking is split into layers so each job can be solved separately. Cables don't care about email, and email doesn't care about cables. The OSI model has seven layers; the TCP/IP model the Internet actually runs on folds them into four. Pick a layer, or click part of the packet below.":
      "Netzwerktechnik ist in Schichten aufgeteilt, damit jede Aufgabe für sich gelöst werden kann. Kabeln ist E-Mail egal, und E-Mail sind Kabel egal. Das OSI-Modell hat sieben Schichten; das TCP/IP-Modell, mit dem das Internet tatsächlich läuft, fasst sie zu vier zusammen. Wählen Sie eine Schicht oder klicken Sie unten auf einen Teil des Pakets.",
    "OSI layers": "OSI-Schichten", "One real packet, unwrapped": "Ein echtes Paket, ausgepackt",
    "The laptop's request to the proxy, as it crosses the trunk between the access switch and the core. Each layer wraps the one above it in its own header. Click a header to read it.":
      "Die Anfrage des Laptops an den Proxy, während sie über den Trunk zwischen Access-Switch und Core läuft. Jede Schicht verpackt die darüberliegende in ihren eigenen Header. Klicken Sie auf einen Header, um ihn zu lesen.",
    "Unit": "Einheit", "Address": "Adresse", "Protocols": "Protokolle", "Devices": "Geräte", "Debug with": "Fehlersuche mit", "On the map": "In der Karte",
    "Application": "Anwendung", "Transport": "Transport", "Internet": "Internet", "Link": "Netzzugang",
    // addressing
    "Addressing & subnets": "Adressierung & Subnetze", "Think of it like street addresses": "Stellen Sie es sich wie Straßenadressen vor",
    "An IP address such as 10.10.1.57 has two parts: the street (the network) and the house number (the device). The number after the slash says how much of the address is the street. Devices on the same street talk directly; anything else goes via the router, like a post office.":
      "Eine IP-Adresse wie 10.10.1.57 hat zwei Teile: die Straße (das Netzwerk) und die Hausnummer (das Gerät). Die Zahl nach dem Schrägstrich sagt, wie viel der Adresse die Straße ist. Geräte in derselben Straße sprechen direkt miteinander; alles andere geht über den Router, wie über eine Post.",
    "An IPv4 address is 32 bits. The prefix length (the number after the slash) says how many of those bits name the network; the rest number the hosts inside it. Each VLAN in the map is one subnet. Pick a row from Meridian's address plan, or type your own.":
      "Eine IPv4-Adresse hat 32 Bit. Die Präfixlänge (die Zahl nach dem Schrägstrich) sagt, wie viele dieser Bits das Netzwerk benennen; die übrigen nummerieren die Hosts darin. Jedes VLAN in der Karte ist ein Subnetz. Wählen Sie eine Zeile aus Meridians Adressplan oder geben Sie eine eigene Adresse ein.",
    "IPv4 address": "IPv4-Adresse", "Prefix": "Präfix", "Enter four numbers from 0 to 255 separated by dots, like 192.168.1.10.": "Geben Sie vier Zahlen von 0 bis 255 ein, getrennt durch Punkte, zum Beispiel 192.168.1.10.",
    "Address in binary": "Adresse in Binärdarstellung", "Split this subnet into": "Dieses Subnetz aufteilen in", "2 subnets": "2 Subnetze", "4 subnets": "4 Subnetze", "8 subnets": "8 Subnetze", "16 subnets": "16 Subnetze",
    "Meridian's address plan": "Meridians Adressplan", "VLAN": "VLAN", "Name": "Name", "Subnet": "Subnetz", "Gateway": "Gateway", "Used for": "Verwendet für",
    "Private vs public": "Privat oder öffentlich",
    "Inside, Meridian uses private ranges (10/8, 172.16/12), which any organisation can reuse and the Internet won't route. On the way out, the firewall's NAT swaps them for one of the 16 public addresses in 203.0.113.0/28.":
      "Intern nutzt Meridian private Bereiche (10/8, 172.16/12), die jede Organisation wiederverwenden darf und die im Internet nicht geroutet werden. Auf dem Weg nach draußen tauscht die NAT der Firewall sie gegen eine der 16 öffentlichen Adressen in 203.0.113.0/28.",
    "And in IPv6": "Und bei IPv6",
    "Every LAN is a /64 (SLAAC needs it), sites usually get a /48, and there's no NAT or broadcast. Meridian would use something like 2001:db8:10:10::/64 for VLAN 10, with ULA (fd00::/8) only where addresses must never be routed.":
      "Jedes LAN ist ein /64 (SLAAC braucht das), Standorte bekommen meist ein /48, und es gibt weder NAT noch Broadcast. Meridian würde für VLAN 10 etwa 2001:db8:10:10::/64 nutzen, ULA (fd00::/8) nur dort, wo Adressen nie geroutet werden dürfen.",
    "Same subnet or not?": "Gleiches Subnetz oder nicht?",
    "A host compares the destination with its own address under its mask. Same network bits: ARP for the host directly. Different: send the frame to the default gateway and let it route.":
      "Ein Host vergleicht das Ziel unter seiner Maske mit der eigenen Adresse. Gleiche Netzwerkbits: direkt per ARP ansprechen. Unterschiedlich: den Frame an das Standard-Gateway schicken und routen lassen.",
    "Network": "Netzwerk", "Subnet mask": "Subnetzmaske", "Broadcast": "Broadcast", "Wildcard (ACLs)": "Wildcard (ACLs)", "First host": "Erster Host", "Last host": "Letzter Host",
    "Usable hosts": "Nutzbare Hosts", "Total addresses": "Adressen gesamt", "What kind of address": "Was für eine Adresse", "none": "keine",
    // services, ports, quiz, footer
    "Services & concepts": "Dienste & Konzepte",
    "Every building block on the map, in one place: what it does, how it works, the ports it uses, what breaks when it fails, and the products you'll meet in real networks.":
      "Jeder Baustein der Karte an einem Ort: was er tut, wie er funktioniert, welche Ports er nutzt, was ausfällt, wenn er ausfällt, und welche Produkte Ihnen in echten Netzen begegnen.",
    "Search: kerberos, 802.1Q, MX, NAT…": "Suche: Kerberos, 802.1Q, MX, NAT …", "Search services and concepts": "Dienste und Konzepte durchsuchen", "Filter by category": "Nach Kategorie filtern",
    "Nothing matches that search. Try a protocol name or a port number.": "Nichts passt zu dieser Suche. Versuchen Sie einen Protokollnamen oder eine Portnummer.",
    "All": "Alle", "Foundations": "Grundlagen", "Security": "Sicherheit", "Operations": "Betrieb", "Virtual & cloud": "Virtualisierung & Cloud", "In the real world": "In der Praxis", "Related": "Verwandt",
    "Ports worth knowing": "Wichtige Ports",
    "Firewall rules, packet captures and troubleshooting all come down to port numbers. Rows marked": "Firewall-Regeln, Paketmitschnitte und Fehlersuche laufen alle auf Portnummern hinaus. Mit",
    "risky": "riskant", "should never be reachable from the Internet;": "markierte Zeilen dürfen nie aus dem Internet erreichbar sein; als", "legacy": "veraltet", "ones should be retired.": "markierte sollten abgeschafft werden.",
    "Filter by port, protocol or service": "Nach Port, Protokoll oder Dienst filtern", "Filter ports": "Ports filtern", "Port": "Port", "Service": "Dienst", "What it's for": "Wofür",
    "Troubleshooting quiz": "Quiz zur Fehlersuche", "Real problems from real help desks. Each answer explains the reasoning.": "Echte Probleme aus echten Helpdesks. Jede Antwort erklärt die Begründung.",
    "Correct": "Richtig", "Next question": "Nächste Frage", "See your score": "Ergebnis anzeigen", "Result": "Ergebnis", "Try again": "Noch einmal",
    "Perfect. You could run this network.": "Perfekt. Sie könnten dieses Netzwerk betreiben.", "Strong. A couple of services worth a second look.": "Stark. Ein paar Dienste lohnen einen zweiten Blick.",
    "Good start. Follow the journeys on the map, then try again.": "Guter Anfang. Folgen Sie den Paketreisen in der Karte und versuchen Sie es dann erneut.",
    "Start with the journeys on the map; they cover every answer here.": "Beginnen Sie mit den Paketreisen in der Karte; sie decken jede Antwort hier ab.",
    "Meridian Freight is fictional. Public addresses come from the documentation ranges (RFC 5737) and domain names from the reserved example names (RFC 2606), so nothing here points at a real network.":
      "Meridian Freight ist erfunden. Öffentliche Adressen stammen aus den Dokumentationsbereichen (RFC 5737) und Domainnamen aus den reservierten Beispielnamen (RFC 2606), nichts hier zeigt also auf ein echtes Netzwerk.",
    "Built as a single static page: no tracking, no build step.": "Gebaut als einzelne statische Seite: kein Tracking, kein Build-Schritt.",
    "Why it matters": "Warum es wichtig ist", "Architecture notes": "Architekturhinweise", "Notes for architects": "Hinweise für Architekten",
    "Overview": "Übersicht", "Detail": "Detail", "Diagram size": "Diagrammgröße", "Scroll sideways, or tap Overview": "Seitlich scrollen oder auf Übersicht tippen",
    "For management": "Für das Management", "For IT staff": "Für IT-Fachleute", "For infrastructure architects": "Für Infrastruktur-Architekten",
    "Beginner (management)": "Einsteiger (Management)", "Intermediate (IT staff)": "Fortgeschritten (IT-Fachleute)", "Expert (infrastructure architects)": "Experte (Infrastruktur-Architekten)",
    "Understand what your IT teams are talking about. Every term in plain words: what it is, what it does, what it depends on and why it matters to the business. Short forms are written out.":
      "Verstehen, worüber Ihre IT-Teams sprechen. Jeder Begriff in einfachen Worten: was er ist, was er tut, wovon er abhängt und warum er für das Geschäft wichtig ist. Abkürzungen werden ausgeschrieben.",
    "Protocols, ports, firewall rules and packet headers, and how the pieces fit together day to day.": "Protokolle, Ports, Firewall-Regeln und Paket-Header, und wie alles im Alltag zusammenspielt.",
    "Design trade-offs, redundancy and scaling, attack paths, protocol internals and Wireshark filters.": "Design-Abwägungen, Redundanz und Skalierung, Angriffswege, Protokoll-Interna und Wireshark-Filter.",
    "easter egg": "Easter Egg", "Secret found: port 666. Rip and tear, but keep it off the firewall.": "Geheimnis gefunden: Port 666. Rip and tear – aber bitte nicht durch die Firewall."
  };

  var PHRASES = [
    ["Private (RFC 1918). Free to use internally; never routed on the Internet.", "Privat (RFC 1918). Intern frei nutzbar; wird im Internet nie geroutet."],
    ["Private (RFC 1918). The usual home-router range.", "Privat (RFC 1918). Der übliche Bereich von Heimroutern."],
    ["Shared address space (RFC 6598), used by ISPs for carrier-grade NAT.", "Gemeinsamer Adressraum (RFC 6598), von ISPs für Carrier-Grade-NAT genutzt."],
    ["Loopback: the device itself.", "Loopback: das Gerät selbst."],
    ["Link-local (APIPA). A host gives itself one when DHCP fails.", "Link-lokal (APIPA). Ein Host gibt sich selbst so eine, wenn DHCP scheitert."],
    ["Documentation range TEST-NET-1 (RFC 5737).", "Dokumentationsbereich TEST-NET-1 (RFC 5737)."],
    ["Documentation range TEST-NET-2 (RFC 5737).", "Dokumentationsbereich TEST-NET-2 (RFC 5737)."],
    ["Documentation range TEST-NET-3 (RFC 5737). Meridian's \"public\" block lives here.", "Dokumentationsbereich TEST-NET-3 (RFC 5737). Hier liegt Meridians „öffentlicher“ Block."],
    ["Benchmarking range (RFC 2544).", "Benchmark-Bereich (RFC 2544)."],
    ["Multicast: one sender, many subscribed receivers.", "Multicast: ein Sender, viele angemeldete Empfänger."],
    ["Reserved for future use.", "Für künftige Nutzung reserviert."],
    ["\"This network\". 0.0.0.0 means \"no address yet\" in a DHCP Discover.", "„Dieses Netzwerk“. 0.0.0.0 bedeutet in einem DHCP Discover „noch keine Adresse“."],
    ["Public. Globally routable on the Internet.", "Öffentlich. Im Internet weltweit routbar."],
    [" In Meridian's plan: ", " In Meridians Plan: "],
    ["; replies flow back", "; Antworten fließen zurück"], ["; one-way, no replies", "; nur eine Richtung, keine Antworten"]
  ];

  var LEVEL_DE = { Beginner: "Einsteiger", Intermediate: "Fortgeschritten", Expert: "Experte" };
  var PATTERNS = [
    [/^Step (\d+) of (\d+)$/, "Schritt $1 von $2"],
    [/^Journey (\d+) of (\d+)$/, "Paketreise $1 von $2"],
    [/^(.*) · scenario (\d+) of (\d+)$/, "$1 · Szenario $2 von $3"],
    [/^(\d+) step$/, "$1 Schritt"], [/^(\d+) steps$/, "$1 Schritte"],
    [/^Step (\d+): /, "Schritt $1: "],
    [/^Path: /, "Pfad: "],
    [/^Read about (.+) in the catalog$/, function (m, a) { return "„" + a + "“ im Katalog lesen"; }],
    [/^Read about (.+)$/, function (m, a) { return "Mehr über " + a; }],
    [/^Open (.+) in the catalog$/, function (m, a) { return "„" + a + "“ im Katalog öffnen"; }],
    [/^← Back to (.+)$/, "← Zurück zu $1"],
    [/^What it is · /, "Was es ist · "], [/^In plain words · /, "In einfachen Worten · "],
    [/^(\d+) kinds? of traffic( cross this cable| pass through or end here)?(?:, (\d+) of them dropped)?\.$/, function (m, n, where, d) {
      var s = n + (n === "1" ? " Art von Verkehr" : " Arten von Verkehr");
      if (where === " cross this cable") s += (n === "1" ? " läuft über dieses Kabel" : " laufen über dieses Kabel");
      else if (where) s += (n === "1" ? " läuft hier durch oder endet hier" : " laufen hier durch oder enden hier");
      return s + (d ? ", davon " + d + " verworfen." : ".");
    }],
    [/^Counting indirect dependents, (\d+) services? rel(?:y|ies) on it\.$/, function (m, n) { return "Mit indirekten Abhängigkeiten " + (n === "1" ? "verlässt sich 1 Dienst" : "verlassen sich " + n + " Dienste") + " darauf."; }],
    [/^(.+) is down$/, "$1 ist ausgefallen"],
    [/^(\d+) of (\d+)$/, "$1 von $2"],
    [/^Restore (.+)$/, function (m, a) { return a.replace(/^.*$/, tr1) + " wiederherstellen"; }],
    [/^Break (.+)$/, function (m, a) { return tr1(a) + " ausfallen lassen"; }],
    [/^(Beginner|Intermediate|Expert) · question (\d+) of (\d+) · score (\d+)$/, function (m, l, a, b, c) { return LEVEL_DE[l] + " · Frage " + a + " von " + b + " · Punkte " + c; }],
    [/^Not quite\. The answer is ([A-D])$/, "Nicht ganz. Richtig ist $1"],
    [/^Added (.+)$/, function (m, a) { return tr1(a) + " hinzugefügt"; }],
    [/^Removed (.+)$/, function (m, a) { return tr1(a) + " entfernt"; }],
    [/^Loaded the (.+) preset$/, function (m, a) { return "Vorlage „" + tr1(a) + "“ geladen"; }],
    [/^Fix: add (.+)$/, function (m, a) { return "Lösung: " + tr1(a) + " hinzufügen"; }],
    [/^Not connected: it needs (.+) to plug into\.$/, function (m, a) { return "Nicht verbunden: Es braucht " + a.split(" or ").map(tr1).join(" oder ") + " zum Anschließen."; }],
    [/^Security ([+-]\d+)$/, "Sicherheit $1"],
    [/^([+-]?\d+) working services?$/, function (m, n) { return n + (Math.abs(+n) === 1 ? " funktionierender Dienst" : " funktionierende Dienste"); }],
    [/^([+-]?\d+) single points? of failure$/, function (m, n) { return n + (Math.abs(+n) === 1 ? " Single Point of Failure" : " Single Points of Failure"); }],
    [/^The (firewall|router) hands out addresses\. Fine for a small office, but there's no failover and no DNS registration\.$/, function (m, w) {
      return (w === "firewall" ? "Die Firewall" : "Der Router") + " vergibt die Adressen. Für ein kleines Büro in Ordnung, aber ohne Ausfallsicherheit und ohne DNS-Registrierung.";
    }],
    [/^Network bits \((\d+)\)$/, "Netzwerkbits ($1)"], [/^Host bits \((\d+)\)$/, "Hostbits ($1)"],
    [/^([\d,.]+) hosts$/, "$1 Hosts"],
    [/^Can't split a \/(\d+) that far\.$/, "Ein /$1 lässt sich nicht so weit aufteilen."],
    [/^TCP\/IP: (.+) layer$/, function (m, a) { return "TCP/IP: Schicht " + tr1(a); }],
    [/^Layer: /, "Schicht: "], [/^Cable: /, "Kabel: "],
    [/^Kubernetes cluster$/, "Kubernetes-Cluster"],
    [/^(Virtualization host|Kubernetes cluster) · /, function (m, a) { return (a === "Kubernetes cluster" ? "Kubernetes-Cluster" : "Virtualisierungshost") + " · "; }]
  ];

  var LOWER = {};
  Object.keys(EXACT).forEach(function (k) { LOWER[k.toLowerCase()] = EXACT[k]; });
  function tr1(s) {
    if (EXACT.hasOwnProperty(s)) return EXACT[s];
    var low = s.toLowerCase();
    if (LOWER.hasOwnProperty(low)) return LOWER[low];
    return s;
  }
  function translate(text) {
    var k = text.trim();
    if (!k || !/[A-Za-z]/.test(k)) return text;
    var out = null;
    if (EXACT.hasOwnProperty(k)) out = EXACT[k];
    else {
      for (var i = 0; i < PATTERNS.length; i++) {
        if (PATTERNS[i][0].test(k)) { out = k.replace(PATTERNS[i][0], PATTERNS[i][1]); break; }
      }
      if (out === null) {
        var t = k, hit = false;
        PHRASES.forEach(function (p) { if (t.indexOf(p[0]) >= 0) { t = t.split(p[0]).join(p[1]); hit = true; } });
        if (hit) out = t;
      }
    }
    if (out === null) return text;
    var lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0];
    return lead + out + trail;
  }

  /* ---------------- short-form expansion ---------------- */
  var expRe = null, gl = null;
  function glossary() {
    if (gl) return gl;
    gl = window.NET && window.NET.GLOSSARY || {};
    var keys = Object.keys(gl).sort(function (a, b) { return b.length - a.length; });
    expRe = new RegExp("(^|[^A-Za-z0-9_\\-/.])(" + keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")(s?)(?![A-Za-z0-9_\\-/])", "g");
    return gl;
  }
  function fullForm(key) { var g = glossary()[key]; return g ? g[LANG === "de" ? 1 : 0] : null; }

  var BLOCK = "p, li, dd, dt, h1, h2, h3, h4, td, th, button, label, summary, figcaption, .swhat, .callout";
  var NOXP = "code, pre, svg, script, style, textarea, .xp, [data-noxp], .mono, .pkt-val, .bit, .octet-dec, .calc-out dd, .encap-fields dd, .split-list, .zone-chip, .kicker, .tag, .pill, .badge, .lc-bars";
  var seenInBlock = new WeakMap();
  var done = new WeakMap();

  function expandNode(node) {
    var parent = node.parentElement;
    if (!parent || parent.closest(NOXP)) return;
    glossary();
    var text = node.nodeValue;
    expRe.lastIndex = 0;
    if (!expRe.test(text)) return;
    var block = parent.closest(BLOCK) || parent;
    var seen = seenInBlock.get(block);
    if (!seen) { seen = {}; seenInBlock.set(block, seen); }
    var frag = document.createDocumentFragment(), last = 0, changed = false, m;
    expRe.lastIndex = 0;
    while ((m = expRe.exec(text))) {
      var key = m[2], start = m.index + m[1].length, end = start + key.length + m[3].length;
      var after = text.slice(end, end + 2);
      if (seen[key] || /^\s?\(/.test(after)) continue;
      seen[key] = true;
      var full = fullForm(key);
      if (!full || full === key) continue;
      frag.appendChild(mark(document.createTextNode(text.slice(last, end))));
      var sp = document.createElement("span");
      sp.className = "xp only-beg";
      sp.textContent = " (" + full + ")";
      frag.appendChild(sp);
      last = end; changed = true;
    }
    if (!changed) return;
    frag.appendChild(mark(document.createTextNode(text.slice(last))));
    parent.replaceChild(frag, node);
  }
  function mark(n) { done.set(n, n.nodeValue); return n; }

  var ATTRS = ["placeholder", "aria-label", "title"];
  function processText(node) {
    if (done.get(node) === node.nodeValue) return;
    var p = node.parentElement;
    if (!p || p.closest("script, style, code, pre, textarea")) { done.set(node, node.nodeValue); return; }
    if (LANG === "de") {
      var t = translate(node.nodeValue);
      if (t !== node.nodeValue) node.nodeValue = t;
    }
    done.set(node, node.nodeValue);
    expandNode(node);
  }
  function processEl(el) {
    if (LANG === "de") {
      ATTRS.forEach(function (a) {
        var v = el.getAttribute && el.getAttribute(a);
        if (v) { var t = translate(v); if (t !== v) el.setAttribute(a, t); }
      });
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { processText(root); return; }
    if (root.nodeType !== 1) return;
    processEl(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    var list = [], n;
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(function (x) { if (x.nodeType === 3) processText(x); else processEl(x); });
  }

  var obs = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.type === "characterData") processText(m.target);
      else m.addedNodes.forEach(function (n) { if (n.isConnected) walk(n); });
    });
  });

  function start() {
    if (LANG === "de") document.title = translate(document.title);
    walk(document.body);
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* ---------------- glossary block for diagrams ---------------- */
  function glossaryHTML(abbrs, title) {
    glossary();
    var B = (window.NET && window.NET.BADGES) || {}, i = LANG === "de" ? 1 : 0, seen = {}, rows = [];
    abbrs.forEach(function (a) {
      if (!a || seen[a]) return;
      seen[a] = true;
      var full = gl[a] ? gl[a][i] : B[a] ? B[a][i] : null;
      if (full) rows.push("<div><dt>" + a.replace(/</g, "&lt;") + "</dt><dd>" + full.replace(/</g, "&lt;") + "</dd></div>");
    });
    if (!rows.length) return "";
    return '<div class="glossary only-beg" data-noxp><p class="kicker">' + (title || "Short forms on this map") + "</p><dl>" + rows.join("") + "</dl></div>";
  }

  /* language switch */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-set-lang]");
    if (b) setLang(b.getAttribute("data-set-lang"));
  });

  window.I18N = { lang: LANG, setLang: setLang, translate: translate, glossaryHTML: glossaryHTML, start: start };
})();
