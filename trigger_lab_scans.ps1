$base_url = "http://localhost:8000/api/v1"
$loginBody = @{ email="admin@local"; password="Admin#159" } | ConvertTo-Json
$loginRes = Invoke-RestMethod -Uri "$base_url/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginRes.access_token

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "Fetching targets..."
$res = Invoke-RestMethod -Uri "$base_url/targets/" -Method GET -Headers $headers
$targets = $res

$scan_ids = @{}

Write-Host "Target count: $($targets.Count)"

# Trigger scans
foreach ($target in $targets) {
    Write-Host "Triggering scan for $($target.name) ($($target.base_url))"
    $scan_data = @{
        "target_id" = [string]$target.id
        "scan_type" = "full"
    }
    $body = $scan_data | ConvertTo-Json
    $scan = Invoke-RestMethod -Uri "$base_url/scans/" -Method POST -Headers $headers -Body $body
    $scan_ids[$target.name] = @{
        "id" = $scan.id
        "status" = "pending"
    }
}

Write-Host "`nWaiting 10 seconds before polling...`n"
Start-Sleep -Seconds 10

$iteration = 0
while ($true) {
    $iteration++
    $all_done = $true
    Write-Host "--- Poll Iteration $iteration ---"
    
    foreach ($name in $scan_ids.Keys) {
        $s = $scan_ids[$name]
        if ($s.status -in @("completed", "failed")) {
            continue
        }
        
        $all_done = $false
        $scan_id = $s.id
        try {
            $current_scan = Invoke-RestMethod -Uri "$base_url/scans/$scan_id" -Method GET -Headers $headers
            $status = $current_scan.status
            if (-not $status) { $status = "unknown" }
            
            Write-Host "[$name] Status: $status"
            $s.data = $current_scan
            if ($status -in @("completed", "failed")) {
                $s.status = $status
            }
        } catch {
            Write-Host "Error polling $name : $_"
        }
    }
    
    if ($all_done) {
        break
    }
    Start-Sleep -Seconds 15
}

Write-Host "`n=============================="
Write-Host "--- Execution Analysis Summary ---"
Write-Host "=============================="

foreach ($name in $scan_ids.Keys) {
    $s = $scan_ids[$name]
    Write-Host "`nTarget: $name"
    Write-Host "Final Status: $($s.status)"
    
    $scan_id = $s.id
    $risk = $s.data.risk_score
    $health = ""
    if ($s.data.agent_thoughts) {
        if ($s.data.agent_thoughts.health_score) {
            $health = $s.data.agent_thoughts.health_score
        } else {
            $health = $s.data.agent_thoughts
        }
    }
    
    Write-Host "Risk Score: $risk"
    Write-Host "Health Score (Thoughts): $health"
    
    if ($s.status -eq "completed") {
        try {
            $vulns = Invoke-RestMethod -Uri "$base_url/vulnerabilities/?scan_id=$scan_id" -Method GET -Headers $headers
            if ($vulns) {
                Write-Host "Vulnerabilities Found: $($vulns.Count)"
                foreach ($v in $vulns) {
                    $title = if ($v.title) { $v.title } else { $v.type }
                    Write-Host "  -> [$($v.severity)] $title"
                }
            } else {
                Write-Host "Vulnerabilities Found: 0"
            }
        } catch {
            Write-Host "  [ERROR] Failed to fetch vulnerabilities: $_"
        }
        
        try {
            $logs = Invoke-RestMethod -Uri "$base_url/scans/$scan_id/logs" -Method GET -Headers $headers
            if ($logs) {
                Write-Host "`nExecution Logs ($($logs.Count) steps):"
                foreach ($log in $logs) {
                    $agent = if ($log.agent_name) { $log.agent_name } else { "System" }
                    Write-Host "  [$agent] $($log.message)"
                }
            }
        } catch {
            Write-Host "  [ERROR] Failed to fetch logs: $_"
        }
    }
    Write-Host ("-" * 40)
}
