# ════════════════════════════════════════════════════════════════════════════
# Host-level egress deny rules for the lab subnets (Windows / netsh advfirewall).
#
# Phase 5.1 remediation of F-04 — No host-level egress deny rule.
#
# Idempotent: safe to run multiple times. Windows Firewall persists rules
# across reboots by default, so one apply is sufficient.
#
# Run from an elevated PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 apply
#   powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 verify
#   powershell -ExecutionPolicy Bypass -File .\infra\isolation\lab_isolation.ps1 remove
# ════════════════════════════════════════════════════════════════════════════
param(
    [ValidateSet('apply','verify','remove')]
    [string]$Action = 'apply'
)

$ErrorActionPreference = 'Stop'

$LabSubnets  = @('10.10.10.0/24','10.10.20.0/24','10.10.30.0/24')
$RulePrefix  = 'LAB_ISOLATION'
$AllowName   = "$RulePrefix`_ALLOW_INTRA"
$DenyName    = "$RulePrefix`_DENY_EGRESS"

function Remove-IsolationRules {
    Get-NetFirewallRule -DisplayName "$RulePrefix*" -ErrorAction SilentlyContinue |
        Remove-NetFirewallRule -Confirm:$false
}

function Add-IsolationRules {
    Remove-IsolationRules

    # Allow intra-lab traffic (DMZ ⇄ CORP ⇄ DATA).
    New-NetFirewallRule -DisplayName $AllowName `
        -Direction Outbound -Action Allow `
        -Profile Any `
        -LocalAddress $LabSubnets -RemoteAddress $LabSubnets `
        -Description 'Lab isolation — allow intra-lab subnet traffic (phase 5.1)' | Out-Null

    # Deny everything else originating from a lab subnet.
    New-NetFirewallRule -DisplayName $DenyName `
        -Direction Outbound -Action Block `
        -Profile Any `
        -LocalAddress $LabSubnets -RemoteAddress Any `
        -Description 'Lab isolation — deny egress from lab subnets to host/LAN/internet (phase 5.1)' | Out-Null
}

function Show-IsolationRules {
    $rules = Get-NetFirewallRule -DisplayName "$RulePrefix*" -ErrorAction SilentlyContinue
    if (-not $rules) {
        Write-Output '(no LAB_ISOLATION rules installed)'
        return
    }
    $rules | Select-Object DisplayName, Direction, Action, Enabled, Profile | Format-Table -AutoSize
}

switch ($Action) {
    'apply'  { Add-IsolationRules;    Show-IsolationRules }
    'verify' { Show-IsolationRules }
    'remove' { Remove-IsolationRules; Show-IsolationRules }
}
