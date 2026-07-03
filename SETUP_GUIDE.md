# Active Directory Audit Dashboard - Setup & Usage Guide

## 🚀 Quick Start

This solution provides:
- **PowerShell automation** for collecting AD user data
- **React dashboard** for visualizing compliance metrics
- **ISO 27001 compliance mapping** for security audits

---

## 📋 Prerequisites

### Required
- **Windows Server with Active Directory** (or DC access)
- **PowerShell 7.6 or above** ([download](https://github.com/PowerShell/PowerShell/releases)) — `Get-ADUserAudit.ps1` uses the `??` null-coalescing operator, which requires PowerShell 7.0+. Windows PowerShell 5.1 (the built-in version) will fail with a parser error.
- **Active Directory PowerShell Module** (RSAT tools) — works from PowerShell 7.x once imported
- **Domain Admin** or **Account Operator** credentials for AD queries

Verify your version before running the script:
```powershell
$PSVersionTable.PSVersion
# Must report 7.6.0 or higher
```

### For Dashboard
- **Node.js 16+** (for React dashboard)
- **NPM or Yarn**
- **Modern web browser** (Chrome, Edge, Firefox)

### Recommended
- **Centralized Logging** (Splunk, ELK, Windows Event Collector)
- **SIEM solution** for audit logs
- **Scheduled task runner** for automation

---

## 📦 Installation

### Step 1: Enable Active Directory PowerShell Module

```powershell
# Run on Domain Controller or management machine with RSAT tools

# Install RSAT if not present (Windows 10/11)
Get-WindowsOptionalFeature -Online | Where-Object {$_.FeatureName -like "*RSAT*"} |  Enable-WindowsOptionalFeature -Online

# Or install directly on Server
Install-WindowsFeature RSAT-AD-PowerShell

# Verify
Import-Module ActiveDirectory -Verbose
Get-ADDomain
```

### Step 2: Prepare Audit Script

1. Copy `Get-ADUserAudit.ps1` to a secure location:
   ```
   C:\Scripts\Get-ADUserAudit.ps1
   ```

2. Create export directory:
   ```powershell
   New-Item -ItemType Directory -Path "C:\ADReports" -Force
   Set-Acl -Path "C:\ADReports" -AclObject (Get-Acl "C:\Windows")
   ```

3. Set execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
   ```

### Step 3: Dashboard Setup

#### Option A: Web-based React Dashboard

1. Create React app:
   ```bash
   npx create-react-app ad-dashboard
   cd ad-dashboard
   npm install recharts
   ```

2. Replace `src/App.js` with `ADDashboard.jsx` content

3. Install dependencies:
   ```bash
   npm install recharts
   ```

4. Run dashboard:
   ```bash
   npm start
   ```

#### Option B: Standalone HTML Version

```html
<!DOCTYPE html>
<html>
<head>
    <title>AD Dashboard</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/react.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/react-dom.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/recharts/2.5.0/Recharts.js"></script>
</head>
<body>
    <div id="root"></div>
    <!-- Include your dashboard component -->
</body>
</html>
```

---

## ⚙️ Configuration

### Edit Get-ADUserAudit.ps1

```powershell
# Line 3-4: Customize paths and domain
param(
    [string]$ExportPath = "C:\ADReports",     # Change if needed
    [string]$Domain = $env:USERDOMAIN         # Auto-detects, can override
)

# Line 132-138: Customize compliance rules
if ($user.PasswordLastSet -eq $null -or $user.PasswordLastSet -lt (Get-Date).AddDays(-90)) {
    $notes += "Password not changed in 90 days"
}
```

### PowerShell Execution Policy

```powershell
# For current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# For all users (requires admin)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

---

## 🔄 Running the Audit

### Manual Execution

Run with `pwsh` (PowerShell 7.6+), not the built-in `powershell.exe` (5.1) — the script's `??` operator requires 7.0+.

```powershell
# Basic run
pwsh -File "C:\Scripts\Get-ADUserAudit.ps1"

# With custom export path
pwsh -File "C:\Scripts\Get-ADUserAudit.ps1" -ExportPath "D:\Audits\AD"

# Capture output to variable (from within a pwsh session)
$auditResults = & "C:\Scripts\Get-ADUserAudit.ps1"

# View results
$auditResults.Summary
$auditResults.ActiveUsers | Out-GridView
```

### Scheduled Automation

#### Create Windows Scheduled Task

```powershell
# Define task parameters
$TaskName = "AD-Daily-Audit"
$TaskPath = "\Microsoft\Windows\ADDailyAudit\"
$ScriptPath = "C:\Scripts\Get-ADUserAudit.ps1"
$LogFile = "C:\ADReports\Audit.log"

# Create task trigger (2 AM daily)
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00am

# Create action - use pwsh.exe (PowerShell 7.6+), not powershell.exe (5.1)
$Action = New-ScheduledTaskAction `
    -Execute "pwsh.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" >> `"$LogFile`" 2>&1"

# Create task
Register-ScheduledTask `
    -TaskName $TaskName `
    -Trigger $Trigger `
    -Action $Action `
    -RunLevel Highest `
    -Description "Daily Active Directory user audit for compliance"

# Verify
Get-ScheduledTask -TaskName $TaskName
```

#### Schedule Python Script to Refresh Dashboard

```python
# refresh_dashboard.py
import json
import subprocess
import datetime
from pathlib import Path

def run_audit():
    """Execute PowerShell audit script"""
    result = subprocess.run(
        ["powershell", "-ExecutionPolicy", "Bypass", 
         "-File", "C:\\Scripts\\Get-ADUserAudit.ps1"],
        capture_output=True,
        text=True
    )
    return result.stdout

def load_latest_report():
    """Load most recent JSON report"""
    reports = sorted(
        Path("C:\\ADReports").glob("DashboardData_*.json"),
        reverse=True
    )
    if reports:
        with open(reports[0]) as f:
            return json.load(f)
    return None

if __name__ == "__main__":
    print(f"[{datetime.datetime.now()}] Running AD audit...")
    output = run_audit()
    print(output)
    
    # Verify latest report
    data = load_latest_report()
    print(f"Report generated: {data.get('summary', {}).get('reportGeneratedDate')}")
```

---

## 📊 Dashboard Usage

### Accessing the Dashboard

1. **Local Development**:
   ```bash
   npm start
   # Opens http://localhost:3000
   ```

2. **Production Deployment**:
   ```bash
   npm run build
   # Deploy 'build' folder to web server
   ```

3. **Import Audit Data**:
   - Click **"📁 Import JSON"** button
   - Select `DashboardData_*.json` from `C:\ADReports`
   - Dashboard updates automatically

### Dashboard Tabs

#### 🎯 Overview Tab
- Summary KPIs (Total OUs, Active Users, etc.)
- Bar chart of users by OU
- Compliance status cards
- Compliance issues summary

#### ✅ Active Users Tab
- Searchable table of all active users
- Filter by department/OU
- Sort by created date, last login, etc.
- Export as CSV

#### ❌ Inactive Users Tab
- Deactivated/disabled user accounts
- Deactivation dates tracked
- Recommendations for cleanup
- Search and filter options

#### 🔒 Compliance Tab
- ISO 27001 control mapping
- User lifecycle requirements
- Access control checks
- Password policy status
- Audit logging verification

### Key Metrics Explained

| Metric | Purpose | Action |
|--------|---------|--------|
| **Active Users** | Current enabled accounts | Monitor and approve changes |
| **Inactive Users** | Disabled/deactivated accounts | Review for deletion if > 1 year |
| **Password Issues** | Users with old passwords | Force password reset |
| **No Recent Login** | Dormant accounts (180+ days) | Contact owner for verification |
| **Compliance Issues** | Policy violations | Generate remediation tasks |

---

## 🔐 Security Hardening

### Restrict Audit Script Access

```powershell
# Grant read-only access to AD auditors
$AuditGroup = "AD-Auditors"
$ScriptPath = "C:\Scripts\Get-ADUserAudit.ps1"

# Create group if not exists
New-ADGroup -Name $AuditGroup -GroupScope Global

# Grant group read permissions to reports
$Acl = Get-Acl "C:\ADReports"
$Ace = New-Object System.Security.AccessControl.FileSystemAccessRule(
    "DOMAIN\$AuditGroup",
    "ReadAndExecute",
    "Allow"
)
$Acl.AddAccessRule($Ace)
Set-Acl -Path "C:\ADReports" -AclObject $Acl
```

### Protect Exported Data

```powershell
# Encrypt exported CSV files
# Add after export section in script:

$ReportFiles = Get-ChildItem "C:\ADReports\*.csv" -File
foreach ($File in $ReportFiles) {
    # Encrypt for current user
    Cipher /e "$($File.FullName)" /s:$false
}
```

### Centralized Logging

```powershell
# Forward AD events to central logger
# Edit audit script to send JSON to SIEM

$Endpoint = "https://siem.company.com/api/events"
$Headers = @{
    "Authorization" = "Bearer $ApiKey"
    "Content-Type" = "application/json"
}

# After generating $dashboardData, send to SIEM:
$JsonData = $dashboardData | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri $Endpoint -Method Post -Headers $Headers -Body $JsonData
```

---

## 🐛 Troubleshooting

### PowerShell Module Issues

```powershell
# Error: "Import-Module : The specified module 'ActiveDirectory' was not loaded"
# Solution:
Add-WindowsFeature RSAT-AD-PowerShell -IncludeAllSubFeature

# Error: "Access Denied"
# Solution: Run PowerShell as Administrator
# Use: runas /user:DOMAIN\AdminAccount powershell
```

### Script Execution Errors

```powershell
# Error: "Cannot bind argument to parameter 'Filter'"
# Cause: Old AD module version
# Solution: Update Windows/Server OS

# Error: "The term 'Get-ADUser' is not recognized"
# Solution: Ensure running on Domain Controller or machine with RSAT
Get-Module ActiveDirectory
# If empty, install RSAT tools
```

### Dashboard Import Issues

```javascript
// Error: "Invalid JSON format"
// Solution: Verify file from C:\ADReports\DashboardData_*.json
// Check file integrity:
Get-Content "C:\ADReports\DashboardData_*.json" | ConvertFrom-Json

// Error: "CSV columns mismatch"
// Solution: Ensure Get-ADUserAudit.ps1 hasn't been modified
```

---

## 📈 Advanced Usage

### Custom Reports from Exported Data

```powershell
# Load audit data
$AllUsers = Import-Csv "C:\ADReports\AllUsers_20240101_120000.csv"

# Find dormant accounts (180+ days)
$DormantDays = 180
$ThresholdDate = (Get-Date).AddDays(-$DormantDays)

$DormantAccounts = $AllUsers | Where-Object {
    [DateTime]$_.LastLogonDate -lt $ThresholdDate -and $_.Status -eq "Active"
}

# Generate report
$DormantAccounts | 
    Sort-Object LastLogonDate |
    Select-Object DisplayName, SamAccountName, OU, LastLogonDate |
    Export-Csv -Path "C:\ADReports\DormantAccounts_Report.csv" -NoTypeInformation
```

### Integration with Active Directory

```powershell
# Automate disabling of dormant accounts (with approval)
$DormantDays = 365
$ThresholdDate = (Get-Date).AddDays(-$DormantDays)

$ToDisable = $AllUsers | Where-Object {
    [DateTime]$_.LastLogonDate -lt $ThresholdDate -and $_.Status -eq "Active"
}

foreach ($User in $ToDisable) {
    # Log action
    Write-Host "Would disable: $($User.DisplayName)" -ForegroundColor Yellow
    
    # Actual disabling (commented for safety)
    # Disable-ADAccount -Identity $User.SamAccountName
}
```

### Email Notifications

```powershell
# Send daily compliance summary
$MailParams = @{
    From = "ad-audit@company.com"
    To = "ciso@company.com"
    Subject = "Daily AD Compliance Report - $(Get-Date -Format 'yyyy-MM-dd')"
    Body = @"
Active Users: $($auditResults.Summary.ActiveUsers)
Inactive Users: $($auditResults.Summary.InactiveUsers)
Compliance Issues: $($auditResults.Summary.UsersWithPasswordIssues + $auditResults.Summary.UsersWithNoRecentLogin)

Critical Items:
- Users exceeding 90-day password policy: $(($auditResults.ActiveUsers | Where-Object PasswordAge -gt 90).Count)
- Accounts inactive 180+ days: $(($auditResults.ActiveUsers | Where-Object LastLoginDays -gt 180).Count)

Dashboard: https://ad-dashboard.company.com
"@
    SmtpServer = "smtp.company.com"
}

Send-MailMessage @MailParams
```

---

## 📚 Learning Resources

### PowerShell AD Administration
- Microsoft Docs: Active Directory PowerShell
- Course: "Managing Active Directory with PowerShell"
- Lab: Set up test AD environment

### ISO 27001 Compliance
- Free online course: ISO 27001 Fundamentals
- Audit framework: NIST Cybersecurity Framework
- Practice: Review your organization's current compliance posture

### Dashboard Development
- React documentation
- Recharts charting library
- Web application security best practices

---

## ✅ Compliance Checklist

- [ ] Audit script deployed to production
- [ ] Dashboard accessible to authorized personnel
- [ ] Scheduled daily execution configured
- [ ] Export data protected with encryption
- [ ] SIEM integration verified
- [ ] Quarterly access reviews scheduled
- [ ] Audit logs retained for 1+ year
- [ ] Privileged account review weekly
- [ ] Terminated user process automated
- [ ] Password policy enforced via GPO
- [ ] Deactivation procedure documented
- [ ] Compliance evidence repository established

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review PowerShell logs: `Get-EventLog -LogName Application`
3. Check AD audit logs: Event Viewer → Windows Logs → Security
4. Verify domain connectivity: `nltest /dclist:domain.com`

---

## 📝 Changelog

### v1.0 (Initial Release)
- PowerShell audit script for user data collection
- React dashboard for visualization
- ISO 27001 compliance mapping
- Setup and deployment guides

### Future Features
- Real-time dashboard updates
- Advanced threat detection
- Machine learning anomaly detection
- Mobile dashboard app
- API for third-party integrations

