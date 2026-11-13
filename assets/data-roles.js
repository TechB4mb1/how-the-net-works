/* How the Net Works — audience framing.
   Beginner = management, Intermediate = IT staff, Expert = infrastructure
   architects. Adds a "why it matters to the business" line for management
   (English and German) and the port 666 easter egg. */
(function () {
  var NET = window.NET;

  var M = {
    ip: ["Without working addressing nothing connects. An address plan is cheap to design up front and expensive to change later.", "Ohne funktionierende Adressierung verbindet sich nichts. Ein Adressplan ist anfangs günstig zu entwerfen und später teuer zu ändern."],
    subnet: ["Good subnet planning keeps the network tidy, secure and ready for growth. Poor planning leads to costly renumbering projects.", "Gute Subnetzplanung hält das Netz übersichtlich, sicher und bereit für Wachstum. Schlechte Planung führt zu teuren Umnummerierungsprojekten."],
    "mac-arp": ["Invisible plumbing, but attackers abuse it to eavesdrop on internal traffic if the switches aren't set up to stop them.", "Unsichtbare Technik, die Angreifer aber zum Mithören internen Verkehrs missbrauchen, wenn die Switches das nicht unterbinden."],
    "tcp-udp": ["Firewall rules are written in ports. Every port open to the Internet is a door that needs a reason and someone watching it.", "Firewall-Regeln werden in Ports geschrieben. Jeder zum Internet offene Port ist eine Tür, die einen Grund und eine Überwachung braucht."],
    switch: ["Switches are the floor everyone stands on: if one fails, every desk it serves is offline.", "Switches sind der Boden, auf dem alle stehen: Fällt einer aus, sind alle angeschlossenen Arbeitsplätze offline."],
    vlan: ["Separating networks limits how far an attacker or a fault can spread. It is one of the cheapest security measures there is.", "Getrennte Netze begrenzen, wie weit sich ein Angreifer oder ein Fehler ausbreiten kann. Eine der günstigsten Sicherheitsmaßnahmen überhaupt."],
    router: ["Routers decide whether sites, departments and the Internet can reach each other at all. One failure can cut off a whole location.", "Router entscheiden, ob Standorte, Abteilungen und das Internet einander überhaupt erreichen. Ein Ausfall kann einen ganzen Standort abschneiden."],
    bgp: ["A routing mistake at a provider can make your services unreachable worldwide, even when everything in your own building works.", "Ein Routingfehler bei einem Anbieter kann Ihre Dienste weltweit unerreichbar machen, auch wenn im eigenen Haus alles funktioniert."],
    nat: ["Lets the company run on a handful of public Internet addresses, which are scarce and cost money.", "Lässt die Firma mit einer Handvoll öffentlicher Internetadressen auskommen, die knapp sind und Geld kosten."],
    ipv6: ["Mobile networks and many customers already use IPv6. Ignoring it creates blind spots and future migration costs.", "Mobilfunknetze und viele Kunden nutzen bereits IPv6. Wer es ignoriert, schafft blinde Flecken und spätere Migrationskosten."],
    http: ["Every customer-facing website and most business applications run on it.", "Jede Website für Kunden und die meisten Geschäftsanwendungen laufen darüber."],
    qos: ["Decides whether customer calls and video meetings stay clear when the network is busy.", "Entscheidet, ob Kundengespräche und Videokonferenzen klar bleiben, wenn das Netz ausgelastet ist."],
    dns: ["When DNS fails, it looks as if everything is down: email, websites and logins stop at once.", "Fällt DNS aus, wirkt es, als sei alles kaputt: E-Mail, Websites und Anmeldungen stehen gleichzeitig still."],
    dhcp: ["Lets new staff and devices start working without IT visiting every desk.", "Lässt neue Mitarbeitende und Geräte loslegen, ohne dass die IT jeden Arbeitsplatz besuchen muss."],
    ntp: ["Wrong clocks quietly break logins and make security investigations and audit trails unreliable.", "Falsche Uhren brechen still Anmeldungen und machen Sicherheitsuntersuchungen und Prüfpfade unzuverlässig."],
    smtp: ["Email is a core business channel and the most common way attacks start, through phishing.", "E-Mail ist ein zentraler Geschäftskanal und der häufigste Ausgangspunkt von Angriffen, über Phishing."],
    file: ["Holds much of the company's knowledge and is the main target of ransomware. Backups decide how fast you recover.", "Enthält viel Wissen der Firma und ist das Hauptziel von Ransomware. Sicherungen entscheiden, wie schnell Sie sich erholen."],
    wifi: ["Productivity and the visitor experience depend on it, and badly secured Wi-Fi is an easy way into the network.", "Produktivität und der Eindruck bei Besuchern hängen davon ab, und schlecht gesichertes WLAN ist ein leichter Weg ins Netz."],
    ad: ["The keys to the kingdom: whoever controls it controls every account. Protecting it is a top security priority.", "Der Generalschlüssel: Wer es kontrolliert, kontrolliert jedes Konto. Sein Schutz hat höchste Sicherheitspriorität."],
    ca: ["Expired certificates cause sudden outages, and a compromised CA lets attackers pose as trusted systems.", "Abgelaufene Zertifikate verursachen plötzliche Ausfälle, und eine kompromittierte CA lässt Angreifer sich als vertrauenswürdige Systeme ausgeben."],
    tls: ["Protects customer and company data in transit, and regulators and customers expect it.", "Schützt Kunden- und Firmendaten auf dem Transportweg und wird von Aufsicht und Kunden erwartet."],
    nac: ["Stops strangers and unmanaged devices from simply plugging in, which matters for compliance and cyber insurance.", "Verhindert, dass Fremde und unverwaltete Geräte sich einfach anstecken; wichtig für Compliance und Cyberversicherung."],
    mfa: ["MFA stops the large majority of account takeovers, and cyber insurers often require it.", "MFA stoppt die große Mehrheit aller Kontoübernahmen und wird von Cyberversicherern oft verlangt."],
    firewall: ["The first line of defence and a standard audit requirement. Its rules show exactly what the company exposes.", "Die erste Verteidigungslinie und eine Standardanforderung in Audits. Ihre Regeln zeigen genau, was die Firma nach außen öffnet."],
    dmz: ["Limits the damage if a public-facing server is hacked, keeping an incident small instead of company-wide.", "Begrenzt den Schaden, wenn ein öffentlicher Server gehackt wird, und hält einen Vorfall klein statt firmenweit."],
    ips: ["Blocks known attacks automatically and narrows the window between a published weakness and its patch.", "Blockiert bekannte Angriffe automatisch und verkürzt die Zeit zwischen einer bekannten Schwachstelle und ihrem Patch."],
    ids: ["Gives the security team eyes inside the network, so intrusions are found in days rather than months.", "Gibt dem Sicherheitsteam Augen im Netz, sodass Einbrüche in Tagen statt Monaten entdeckt werden."],
    proxy: ["Reduces infections from malicious websites and keeps an audit trail of web use.", "Verringert Infektionen durch bösartige Websites und führt einen Prüfpfad der Webnutzung."],
    waf: ["Protects the public website and customer data from common attacks that cause outages or data breaches.", "Schützt die öffentliche Website und Kundendaten vor gängigen Angriffen, die zu Ausfällen oder Datenlecks führen."],
    vpn: ["Makes secure remote work possible. An unpatched VPN gateway is one of the most common ways attackers get in.", "Ermöglicht sicheres Arbeiten von unterwegs. Ein ungepatchtes VPN-Gateway ist einer der häufigsten Wege, wie Angreifer eindringen."],
    edr: ["Often the control that stops ransomware on a laptop before it spreads. Insurers increasingly require it.", "Oft die Kontrolle, die Ransomware auf einem Laptop stoppt, bevor sie sich ausbreitet. Versicherer verlangen es zunehmend."],
    "zero-trust": ["Shrinks the impact of one stolen password or infected laptop, and supports remote and cloud work.", "Verringert die Folgen eines gestohlenen Passworts oder infizierten Laptops und unterstützt Remote- und Cloud-Arbeit."],
    siem: ["Turns logs into alerts the security team can act on, and provides evidence for audits and incidents.", "Macht aus Protokollen Alarme, auf die das Sicherheitsteam reagieren kann, und liefert Belege für Audits und Vorfälle."],
    nms: ["Finds problems before staff and customers notice them, which cuts downtime.", "Findet Probleme, bevor Mitarbeitende und Kunden sie bemerken, und verkürzt so Ausfallzeiten."],
    jump: ["Protects the most powerful accounts. Admin accounts are what attackers want most.", "Schützt die mächtigsten Konten. Admin-Konten sind das, was Angreifer am meisten wollen."],
    hypervisor: ["Runs many servers on few machines, cutting hardware, power and data-centre space.", "Betreibt viele Server auf wenigen Maschinen und spart Hardware, Strom und Rechenzentrumsfläche."],
    overlay: ["Lets networks be created by software in minutes instead of weeks, which speeds up projects.", "Lässt Netze per Software in Minuten statt Wochen entstehen und beschleunigt so Projekte."],
    "storage-net": ["When storage is slow or down, every application that relies on it slows down or stops.", "Ist der Speicher langsam oder ausgefallen, werden alle Anwendungen darauf langsam oder stehen still."],
    k8s: ["Helps development teams ship and scale applications faster, but adds a platform that needs its own skills and security.", "Hilft Entwicklungsteams, Anwendungen schneller auszuliefern und zu skalieren, bringt aber eine Plattform mit eigenem Know-how- und Sicherheitsbedarf."],
    "k8s-svc": ["Keeps applications reachable while they are updated or scaled, without downtime.", "Hält Anwendungen erreichbar, während sie aktualisiert oder skaliert werden, ohne Ausfallzeit."],
    ingress: ["Controls how customers reach containerised applications. One misconfiguration can take a site offline.", "Steuert, wie Kunden containerisierte Anwendungen erreichen. Eine Fehlkonfiguration kann eine Seite offline nehmen."],
    netpol: ["Contains a breach to one application instead of the whole platform.", "Begrenzt einen Einbruch auf eine Anwendung statt auf die ganze Plattform."]
  };
  var de = window.LANG === "de" ? 1 : 0;
  NET.concepts.forEach(function (c) { if (M[c.id]) c.matters = M[c.id][de]; });

  /* Easter egg */
  NET.ports.push(["666", "UDP", "Doom",
    de ? "Doom (1993) nutzte UDP 666 für Netzwerk-Deathmatches; offiziell ist der Port für mdqs registriert. Taucht er heute in Ihren Firewall-Protokollen auf, ist es entweder eine sehr nostalgische LAN-Party oder etwas, das Sie untersuchen sollten."
       : "id Software's Doom (1993) used UDP 666 for network deathmatch; IANA lists it as mdqs. If it turns up in your firewall logs today, it's either a very retro LAN party or something to investigate.",
    [], "egg", 1]);
  NET.ports.sort(function (a, b) { return parseInt(a[0], 10) - parseInt(b[0], 10); });
})();
