# ============================================================
# OSC -- Full Lab Scan + Topology Generator
# Scans all 4 lab subnets and regenerates the network map.
# Usage:  .\scan-lab.ps1
#         .\scan-lab.ps1 -ScanType deep        (slower, more vulns)
#         .\scan-lab.ps1 -SkipScan             (topology only)
# ============================================================
param(
    [ValidateSet("quick","standard","full","deep")]
    [string]$ScanType = "full",
    [switch]$SkipScan
)

$BASE  = "http://localhost:8000/api/v1"
$ADMIN = "admin@local"
$PASS  = "Admin#159"

function Ok   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green  }
function Info { param($m) Write-Host "  [..] $m" -ForegroundColor Cyan   }
function Warn { param($m) Write-Host "  [!!] $m" -ForegroundColor Yellow }
function Hdr  { param($m) Write-Host "`n=== $m ===" -ForegroundColor Magenta }
function Bail { param($m) Write-Host "  [ERROR] $m" -ForegroundColor Red; exit 1 }

# curl.exe wrapper -- follows redirects and keeps auth header (-L --no-location-fail)
function Api-Get {
    param([string]$Path, [string]$Token)
    $r = curl.exe -s -L --max-time 30 -H "Authorization: Bearer $Token" "$BASE$Path"
    return $r | ConvertFrom-Json
}
function Api-Post {
    param([string]$Path, [string]$Token, [object]$Body)
    $json = $Body | ConvertTo-Json -Depth 5
    $tmp  = [System.IO.Path]::GetTempFileName()
    $json | Out-File -FilePath $tmp -Encoding utf8 -NoNewline
    $r = curl.exe -s -L --max-time 30 -X POST `
        -H "Authorization: Bearer $Token" `
        -H "Content-Type: application/json" `
        --data-binary "@$tmp" "$BASE$Path"
    Remove-Item $tmp -Force
    return $r | ConvertFrom-Json
}

# ── 1. Login ──────────────────────────────────────────────────────────────────
Hdr "Authenticating"
$loginBody = @{ email=$ADMIN; password=$PASS } | ConvertTo-Json
$loginFile  = [System.IO.Path]::GetTempFileName()
$loginBody | Out-File -FilePath $loginFile -Encoding utf8 -NoNewline
$loginJson  = curl.exe -s -X POST -H "Content-Type: application/json" --data-binary "@$loginFile" "$BASE/auth/login"
Remove-Item $loginFile -Force
$auth = $loginJson | ConvertFrom-Json
if (-not $auth.access_token) { Bail "Login failed: $loginJson" }
$T = $auth.access_token
Ok "Logged in as $ADMIN (role: $($auth.role))"

# ── 2. Topology only? ─────────────────────────────────────────────────────────
if (-not $SkipScan) {

    # ── 3. Lab subnets ────────────────────────────────────────────────────────
    $SUBNETS = @(
        @{ name="DMZ 10.10.10.0/24";  cidr="10.10.10.0/24" },
        @{ name="CORP 10.10.20.0/24"; cidr="10.10.20.0/24" },
        @{ name="DATA 10.10.30.0/24"; cidr="10.10.30.0/24" },
        @{ name="MGMT 10.10.40.0/24"; cidr="10.10.40.0/24" }
    )

    # ── 4. Create targets ─────────────────────────────────────────────────────
    Hdr "Creating / verifying targets"
    $existingRaw = curl.exe -s -L -H "Authorization: Bearer $T" "$BASE/targets/"
    $existing = $existingRaw | ConvertFrom-Json
    $targetMap = @{}

    foreach ($s in $SUBNETS) {
        $found = $existing | Where-Object { $_.base_url -eq $s.cidr }
        if ($found) {
            Ok "$($s.name) -- already exists (id=$($found.id))"
            $targetMap[$s.cidr] = $found.id
        } else {
            $body = @{ name=$s.name; base_url=$s.cidr }
            $res = Api-Post -Path "/targets/" -Token $T -Body $body
            if ($res.id) {
                Ok "$($s.name) -- created (id=$($res.id))"
                $targetMap[$s.cidr] = $res.id
            } else {
                Warn "$($s.name) -- failed: $($res | ConvertTo-Json -Compress)"
            }
        }
    }

    # ── 5. Launch scans ───────────────────────────────────────────────────────
    Hdr "Launching scans (type=$ScanType)"
    $scanIds = @()

    foreach ($s in $SUBNETS) {
        $tid = $targetMap[$s.cidr]
        if (-not $tid) { Warn "No target for $($s.cidr) -- skipping"; continue }
        $body = @{
            target_id    = $tid
            scan_type    = $ScanType
            tools        = @("nmap")
            auto_report  = $false
            siem_forward = $false
        }
        $scan = Api-Post -Path "/scans/" -Token $T -Body $body
        if ($scan.id) {
            Ok "$($s.name) -- scan queued (id=$($scan.id))"
            $scanIds += $scan.id
        } else {
            Warn "$($s.name) -- scan failed: $($scan | ConvertTo-Json -Compress)"
        }
    }

    if ($scanIds.Count -eq 0) { Bail "No scans were started." }

    # ── 6. Wait for completion ────────────────────────────────────────────────
    Hdr "Waiting for scans to complete (timeout 15 min)"
    $timeout  = 900
    $interval = 15
    $elapsed  = 0
    $done     = @{}

    while ($done.Count -lt $scanIds.Count -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds $interval
        $elapsed += $interval

        foreach ($sid in $scanIds) {
            if ($done.ContainsKey($sid)) { continue }
            $sc = Api-Get -Path "/scans/$sid" -Token $T
            $st = $sc.status.ToUpper()
            if ($st -in @("COMPLETED","FAILED","CANCELLED")) {
                $done[$sid] = $st
                $vc = if ($sc.vulnerability_count) { $sc.vulnerability_count } else { 0 }
                if ($st -eq "COMPLETED") { Ok "Scan $sid -- COMPLETED ($vc findings)" }
                else                     { Warn "Scan $sid -- $st" }
            } else {
                Info "Scan $sid -- $st (${elapsed}s elapsed)"
            }
        }
    }

    if ($elapsed -ge $timeout) { Warn "Timeout reached -- some scans may still be running." }
}

# ── 7. Force topology ─────────────────────────────────────────────────────────
Hdr "Generating network topology"
$topo = Api-Get -Path "/network/assets/topology/mermaid?force=true" -Token $T
if ($topo.mermaid) {
    $len = $topo.mermaid.Length
    Ok "Topology regenerated ($len chars)"
    Write-Host ""
    Write-Host $topo.mermaid.Substring(0, [Math]::Min(600, $len)) -ForegroundColor DarkGray
} else {
    Warn "Topology returned empty"
}

# ── 8. Network inventory ──────────────────────────────────────────────────────
Hdr "Network inventory"
$assets = Api-Get -Path "/network/assets" -Token $T
if ($assets.Count -eq 0) {
    Warn "No assets yet -- scans may still be running."
} else {
    $fmt = "{0,-18} {1,-14} {2,-24} {3,-10} {4}"
    Write-Host ($fmt -f "IP","Device","OS","Status","Vulns") -ForegroundColor White
    Write-Host ("-" * 80) -ForegroundColor DarkGray
    foreach ($a in ($assets | Sort-Object ip_address)) {
        $clr = if ($a.vuln_count -gt 0) { "Red" } elseif ($a.status -eq "active") { "Green" } else { "Gray" }
        $os  = if ($a.os_name)     { $a.os_name }     else { "--" }
        $dt  = if ($a.device_type) { $a.device_type } else { "unknown" }
        Write-Host ($fmt -f $a.ip_address, $dt, $os, $a.status, $a.vuln_count) -ForegroundColor $clr
    }
    Ok "Total: $($assets.Count) asset(s)"
}

# ── 9. Vulnerability summary ─────────────────────────────────────────────────
Hdr "Vulnerability summary"
$resp  = Api-Get -Path "/vulnerabilities/?limit=500" -Token $T
$items = if ($resp.PSObject.Properties.Name -contains 'items') { $resp.items } else { $resp }

if ($items.Count -eq 0) {
    Info "No vulnerabilities found yet."
} else {
    $order = @{ CRITICAL=0; HIGH=1; MEDIUM=2; LOW=3; INFO=4 }
    $grouped = $items | Group-Object severity | Sort-Object {
        $k = $_.Name.ToUpper()
        if ($order.ContainsKey($k)) { $order[$k] } else { 9 }
    }
    foreach ($g in $grouped) {
        $clr = switch ($g.Name.ToUpper()) {
            "CRITICAL" { "Red" }; "HIGH" { "DarkRed" }
            "MEDIUM"   { "Yellow" }; "LOW" { "Cyan" }; default { "Gray" }
        }
        Write-Host "  [$($g.Name.ToUpper())] $($g.Count) finding(s)" -ForegroundColor $clr
        foreach ($v in ($g.Group | Select-Object -First 8)) {
            $hname = if ($v.host)  { $v.host }  else { $v.url }
            $title = if ($v.title) { $v.title } else { $v.type }
            Write-Host "      * $hname  --  $title" -ForegroundColor DarkGray
        }
        if ($g.Count -gt 8) { Write-Host "      ... and $($g.Count - 8) more" -ForegroundColor DarkGray }
    }
    $hosts = ($items | ForEach-Object { $_.host } | Sort-Object -Unique | Where-Object { $_ }).Count
    Ok "Total: $($items.Count) vulnerabilities across $hosts host(s)"
}

# ── 10. Done ──────────────────────────────────────────────────────────────────
Hdr "Done"
Write-Host ""
Ok "Dashboard  : https://localhost/dashboard/network"
Ok "Topology   : https://localhost/dashboard/network (topology tab)"
Ok "API docs   : http://localhost:8000/docs"
Write-Host ""
