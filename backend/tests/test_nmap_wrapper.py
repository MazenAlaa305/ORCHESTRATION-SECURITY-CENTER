"""
Tests for NmapWrapper.

The wrapper depends on python-nmap's PortScanner which shells out to the real
nmap binary. We do NOT execute scans here — instead we test the result-parsing
path by injecting a fake `nm` (PortScanner-shaped object) into the wrapper.
"""


class _FakePortScanner:
    """Mimics the subset of python-nmap's PortScanner the wrapper consumes."""

    def __init__(self, hosts_data):
        self._hosts_data = hosts_data
        self._called_with = None

    def scan(self, target, arguments=""):
        self._called_with = (target, arguments)

    def all_hosts(self):
        return list(self._hosts_data.keys())

    def __getitem__(self, host):
        return self._hosts_data[host]


def _build_host(*, ip="10.0.0.10", state="up", ports=None, mac=None, vendor=None):
    h = {
        "addresses": {"ipv4": ip},
        "vendor": {},
        "tcp": {},
    }
    if mac:
        h["addresses"]["mac"] = mac
        if vendor:
            h["vendor"][mac] = vendor
    if ports:
        for p in ports:
            h["tcp"][p["port"]] = {
                "state": p.get("state", "open"),
                "name": p.get("name", "unknown"),
                "product": p.get("product", ""),
                "version": p.get("version", ""),
                "cpe": p.get("cpe", ""),
                "extrainfo": "",
            }

    class _HostView(dict):
        def state(self): return state
        def hostname(self): return ""
        def all_protocols(self): return ["tcp"] if h.get("tcp") else []
        def __getitem__(self, key): return h[key]
        def __contains__(self, key): return key in h
    return _HostView(h)


def test_parse_results_extracts_ports_and_services():
    from app.services.nmap_wrapper import NmapWrapper
    fake = _FakePortScanner({
        "10.0.0.10": _build_host(ip="10.0.0.10", ports=[
            {"port": 22, "name": "ssh"},
            {"port": 445, "name": "smb"},
        ])
    })
    w = NmapWrapper.__new__(NmapWrapper)  # bypass __init__ which imports python-nmap
    w.nm = fake
    result = w._parse_results()
    assert len(result) == 1
    host = result[0]
    assert host["ip"] == "10.0.0.10"
    ports = {p["port"]: p["service"] for p in host["ports"]}
    assert ports[22] == "ssh"
    assert ports[445] == "smb"


def test_parse_results_handles_empty_scan():
    from app.services.nmap_wrapper import NmapWrapper
    w = NmapWrapper.__new__(NmapWrapper)
    w.nm = _FakePortScanner({})
    assert w._parse_results() == []


def test_parse_results_attaches_mac_vendor_when_present():
    from app.services.nmap_wrapper import NmapWrapper
    fake = _FakePortScanner({
        "10.0.0.20": _build_host(
            ip="10.0.0.20",
            mac="AA:BB:CC:DD:EE:FF",
            vendor="ACME Networks",
            ports=[{"port": 80, "name": "http"}],
        )
    })
    w = NmapWrapper.__new__(NmapWrapper)
    w.nm = fake
    host = w._parse_results()[0]
    assert host["mac"] == "AA:BB:CC:DD:EE:FF"
    assert host["mac_vendor"] == "ACME Networks"
