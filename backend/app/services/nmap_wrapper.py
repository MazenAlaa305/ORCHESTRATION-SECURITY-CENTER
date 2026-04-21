import logging

logger = logging.getLogger(__name__)

class NmapWrapper:
    def __init__(self):
        import nmap  # lazy — avoids loading python-nmap at startup before any scan runs
        self.nm = nmap.PortScanner()

    def scan_target(self, target, scan_type="quick"):
        """
        Executes Nmap scan.
        scan_type options:
        - quick: Fast port scan
        - full: Detailed service detection
        - deep: OpenVAS-style advanced discovery with NSE scripts
        """
        try:
            logger.info(f"Starting {scan_type} Nmap scan on {target}")
            
            # Detect whether we can use -O (requires root/cap_net_raw)
            import os
            is_root = os.getuid() == 0 if hasattr(os, 'getuid') else False

            if scan_type == "deep":
                args = "-sV -A -T4 --script=vulners,banner,http-enum,smb-os-discovery"
                if is_root:
                    args = "-sV -O -A -T4 --script=vulners,banner,http-enum,smb-os-discovery"
                self.nm.scan(target, arguments=args)
            elif scan_type == "full":
                args = "-sV -T4" if not is_root else "-sV -O -T4"
                self.nm.scan(target, arguments=args)
            else:
                # Quick: service version detection (-sV) on top 100 ports — fast enough, far more informative
                self.nm.scan(target, arguments="-sV -F -T4")

            return self._parse_results()
        except Exception as e:
            logger.error(f"Nmap scan failed: {e}")
            return []

    def _parse_results(self):
        """
        Parses Nmap results into rich format for DB.
        """
        scan_data = []
        
        for host in self.nm.all_hosts():
            # Basic Info
            host_info = {
                "ip": host,
                "status": self.nm[host].state(),
                "hostnames": self.nm[host].hostname(),
                "mac": None,
                "mac_vendor": None,
                "os_name": None,
                "os_accuracy": None,
                "device_type": "unknown",
                "ports": []
            }
            
            # 1. MAC Address & Vendor
            if 'addresses' in self.nm[host]:
                if 'mac' in self.nm[host]['addresses']:
                    host_info['mac'] = self.nm[host]['addresses']['mac']
                    if 'vendor' in self.nm[host] and host_info['mac'] in self.nm[host]['vendor']:
                         host_info['mac_vendor'] = self.nm[host]['vendor'][host_info['mac']]

            # 2. OS Detection
            if 'osmatch' in self.nm[host] and self.nm[host]['osmatch']:
                # Take the first (most likely) match
                best_match = self.nm[host]['osmatch'][0]
                host_info['os_name'] = best_match['name']
                host_info['os_accuracy'] = best_match['accuracy']
                
                # Try to determine device type from OS classes
                if 'osclass' in best_match and best_match['osclass']:
                    host_info['device_type'] = best_match['osclass'][0].get('type', 'unknown')
                    host_info['os_family'] = best_match['osclass'][0].get('osfamily', 'Unknown')
                
                # Heuristic Fallback if family is unknown but name exists
                if (not host_info.get('os_family') or host_info['os_family'] == 'Unknown') and host_info['os_name']:
                    lower_name = host_info['os_name'].lower()
                    if 'windows' in lower_name: host_info['os_family'] = 'Windows'
                    elif 'linux' in lower_name: host_info['os_family'] = 'Linux'
                    elif 'apple' in lower_name or 'ios' in lower_name or 'macos' in lower_name: host_info['os_family'] = 'Apple'
                    elif 'cisco' in lower_name: host_info['os_family'] = 'Cisco'
                    elif 'bsd' in lower_name: host_info['os_family'] = 'BSD'

            # 3. Services & Ports
            for proto in self.nm[host].all_protocols():
                lport = self.nm[host][proto].keys()
                for port in lport:
                    service_info = self.nm[host][proto][port]
                    port_data = {
                        "port": port,
                        "protocol": proto,
                        "state": service_info['state'],
                        "service": service_info.get('name', 'unknown'),
                        "product": service_info.get('product', ''),
                        "version": service_info.get('version', ''),
                        "cpe": service_info.get('cpe', ''),
                        "extra_info": service_info.get('extrainfo', ''),
                        "severity": "info"
                    }

                    # Check for script output (vulnerabilities)
                    if 'script' in service_info:
                        port_data['scripts'] = service_info['script']
                        if any('vuln' in k or 'cve' in k for k in service_info['script']):
                            port_data['severity'] = "high"

                    host_info['ports'].append(port_data)
            
            scan_data.append(host_info)
            
        return scan_data
