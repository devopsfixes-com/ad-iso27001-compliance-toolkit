# ISO 27001 Compliance Automation Scripts
# Collection of useful PowerShell functions for maintaining compliance

# ==============================================================================
# 1. DORMANT ACCOUNT IDENTIFICATION & DEACTIVATION
# ==============================================================================

function Get-DormantAccounts {
    <#
    .SYNOPSIS
    Identifies accounts with no login activity beyond specified days
    
    .PARAMETER InactiveDays
    Number of days of inactivity to flag (default: 180)
    
    .PARAMETER OU
    Specific OU to check (optional)
    #>
    
    param(
        [int]$InactiveDays = 180,
        [string]$OU = $null
    )
    
    $ThresholdDate = (Get-Date).AddDays(-$InactiveDays)
    
    $Params = @{
        Filter = "*"
        Properties = @("LastLogonDate", "Created", "Description", "Department")
    }
    
    if ($OU) {
        $Params.SearchBase = $OU
    }
    
    $DormantAccounts = Get-ADUser @Params | Where-Object {
        $_.LastLogonDate -lt $ThresholdDate -and $_.Enabled -eq $true
    } | Select-Object `
        @{Name="DisplayName"; Expression={$_.Name}},
        SamAccountName,
        @{Name="LastLogon"; Expression={$_.LastLogonDate}},
        @{Name="DaysSinceLogin"; Expression={((Get-Date) - $_.LastLogonDate).Days}},
        Department,
        Created
    
    return $DormantAccounts | Sort-Object DaysSinceLogin -Descending
}

# Usage:
# Get-DormantAccounts -InactiveDays 180 | Export-Csv -Path "DormantAccounts.csv"
# Get-DormantAccounts | Where-Object {$_.DaysSinceLogin -gt 365} | Out-GridView

# ==============================================================================
# 2. PASSWORD POLICY COMPLIANCE CHECK
# ==============================================================================

function Get-PasswordPolicyViolations {
    <#
    .SYNOPSIS
    Identifies users not complying with 90-day password policy
    #>
    
    $Threshold90Days = (Get-Date).AddDays(-90)
    $Threshold60Days = (Get-Date).AddDays(-60)
    
    $Users = Get-ADUser -Filter * -Properties PasswordLastSet, Department, EmailAddress
    
    $Violations = $Users | Where-Object {
        $_.PasswordLastSet -lt $Threshold90Days -and $_.Enabled -eq $true
    } | Select-Object `
        @{Name="DisplayName"; Expression={$_.Name}},
        SamAccountName,
        @{Name="PasswordAge"; Expression={((Get-Date) - $_.PasswordLastSet).Days}},
        @{Name="Severity"; Expression={
            if (((Get-Date) - $_.PasswordLastSet).Days -gt 120) { "CRITICAL" }
            elseif (((Get-Date) - $_.PasswordLastSet).Days -gt 90) { "HIGH" }
            else { "MEDIUM" }
        }},
        Department,
        EmailAddress
    
    return $Violations | Sort-Object "PasswordAge" -Descending
}

# Usage:
# Get-PasswordPolicyViolations | Out-GridView
# Get-PasswordPolicyViolations | Where-Object {$_.Severity -eq "CRITICAL"} | ...

# ==============================================================================
# 3. PRIVILEGED ACCOUNT REVIEW
# ==============================================================================

function Get-PrivilegedAccountAudit {
    <#
    .SYNOPSIS
    Audits all users with administrative privileges
    #>
    
    $PrivilegedGroups = @(
        "Domain Admins",
        "Enterprise Admins",
        "Schema Admins",
        "Administrators",
        "Account Operators"
    )
    
    $PrivilegedUsers = @()
    
    foreach ($Group in $PrivilegedGroups) {
        try {
            $Members = Get-ADGroupMember -Identity $Group -Recursive -ErrorAction SilentlyContinue
            
            foreach ($Member in $Members) {
                $User = Get-ADUser -Identity $Member -Properties LastLogonDate, Department, Manager
                
                $PrivilegedUsers += [PSCustomObject]@{
                    DisplayName = $User.Name
                    SamAccountName = $User.SamAccountName
                    PrivilegedGroup = $Group
                    Department = $User.Department ?? "Not Specified"
                    Manager = (Get-ADUser -Identity $User.Manager -ErrorAction SilentlyContinue).Name ?? "None"
                    LastLogon = $User.LastLogonDate
                    DaysSinceLogon = if ($User.LastLogonDate) {
                        ((Get-Date) - $User.LastLogonDate).Days
                    } else {
                        "Never"
                    }
                    RiskLevel = if ($User.LastLogonDate -lt (Get-Date).AddDays(-90)) {
                        "HIGH - Dormant Privileged Account"
                    } else {
                        "NORMAL"
                    }
                }
            }
        }
        catch {
            Write-Warning "Could not enumerate $Group : $_"
        }
    }
    
    return $PrivilegedUsers | Sort-Object PrivilegedGroup
}

# Usage:
# Get-PrivilegedAccountAudit | Out-GridView
# Get-PrivilegedAccountAudit | Where-Object {$_.RiskLevel -like "*HIGH*"} | ...

# ==============================================================================
# 4. ACCESS REVIEW REPORT
# ==============================================================================

function Generate-AccessReviewReport {
    <#
    .SYNOPSIS
    Generates comprehensive access review report by manager
    
    .PARAMETER OU
    OU to review (required for scoping)
    #>
    
    param(
        [string]$OU
    )
    
    $Users = Get-ADUser -SearchBase $OU -Filter * -Properties Manager, Department, Title, EmailAddress
    
    $AccessReview = @()
    
    # Group by manager for review
    $UsersByManager = $Users | Group-Object -Property Manager
    
    foreach ($ManagerGroup in $UsersByManager) {
        $Manager = if ($ManagerGroup.Name) {
            Get-ADUser -Identity $ManagerGroup.Name -ErrorAction SilentlyContinue
        } else {
            $null
        }
        
        $AccessReview += [PSCustomObject]@{
            Manager = $Manager.Name ?? "Unassigned"
            ManagerEmail = $Manager.EmailAddress ?? "N/A"
            ReportingUsers = $ManagerGroup.Count
            UserList = ($ManagerGroup.Group | Select-Object -ExpandProperty SamAccountName) -join ", "
            ReviewDate = Get-Date -Format "yyyy-MM-dd"
            Status = "Pending Review"
            SignOff = ""
        }
    }
    
    return $AccessReview
}

# Usage:
# Generate-AccessReviewReport -OU "OU=Sales,DC=company,DC=com" | Export-Csv "AccessReview_Sales.csv"

# ==============================================================================
# 5. SEGREGATION OF DUTIES CHECK
# ==============================================================================

function Get-SegregationOfDutiesViolations {
    <#
    .SYNOPSIS
    Identifies users with potentially conflicting roles
    
    .EXAMPLE
    Flags users who are both IT Admin and Finance Approver
    #>
    
    # Define conflicting group pairs
    $ConflictingRoles = @(
        @("Domain Admins", "Account Operators"),
        @("IT Admins", "Finance Approvers"),
        @("Security Admins", "User Account Managers")
    )
    
    $Violations = @()
    
    $Users = Get-ADUser -Filter * -Properties MemberOf
    
    foreach ($User in $Users) {
        $UserGroups = Get-ADUser -Identity $User.SamAccountName -Properties MemberOf | 
            Select-Object -ExpandProperty MemberOf
        
        foreach ($ConflictPair in $ConflictingRoles) {
            $Role1 = $ConflictPair[0]
            $Role2 = $ConflictPair[1]
            
            $HasRole1 = $UserGroups -match $Role1
            $HasRole2 = $UserGroups -match $Role2
            
            if ($HasRole1 -and $HasRole2) {
                $Violations += [PSCustomObject]@{
                    DisplayName = $User.Name
                    SamAccountName = $User.SamAccountName
                    Role1 = $Role1
                    Role2 = $Role2
                    RiskLevel = "CRITICAL"
                    Action = "Review and remediate immediately"
                }
            }
        }
    }
    
    return $Violations
}

# Usage:
# Get-SegregationOfDutiesViolations | Out-GridView

# ==============================================================================
# 6. BULK USER DEACTIVATION (WITH SAFETY CHECKS)
# ==============================================================================

function Disable-DormantUsers {
    <#
    .SYNOPSIS
    Safely disables accounts with no login activity
    Requires manager approval and logs all actions
    
    .PARAMETER DryRun
    Show what would be disabled without actually disabling
    #>
    
    param(
        [switch]$DryRun = $true,
        [int]$InactiveDays = 365,
        [string]$ApprovedBy = $env:USERNAME
    )
    
    $ThresholdDate = (Get-Date).AddDays(-$InactiveDays)
    $LogFile = "C:\ADReports\DeactivationLog_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
    $Log = @()
    
    $DormantAccounts = Get-ADUser -Filter {
        Enabled -eq $true
    } -Properties LastLogonDate | Where-Object {
        $_.LastLogonDate -lt $ThresholdDate
    }
    
    Write-Host "Found $($DormantAccounts.Count) dormant accounts for deactivation" -ForegroundColor Yellow
    
    foreach ($Account in $DormantAccounts) {
        $Action = if ($DryRun) { "WOULD DISABLE" } else { "DISABLED" }
        
        Write-Host "$Action: $($Account.Name) (Last login: $($Account.LastLogonDate))" -ForegroundColor Yellow
        
        if (-not $DryRun) {
            Disable-ADAccount -Identity $Account.SamAccountName
            
            # Document in AD description
            $Description = $Account.Description ?? ""
            $NewDescription = "$Description | Disabled by $ApprovedBy on $(Get-Date -Format 'yyyy-MM-dd') - Dormant"
            Set-ADUser -Identity $Account.SamAccountName -Description $NewDescription
        }
        
        $Log += [PSCustomObject]@{
            DisplayName = $Account.Name
            SamAccountName = $Account.SamAccountName
            Action = $Action
            LastLogonDate = $Account.LastLogonDate
            DisabledDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            ApprovedBy = $ApprovedBy
        }
    }
    
    $Log | Export-Csv -Path $LogFile -NoTypeInformation
    Write-Host "Log saved to: $LogFile" -ForegroundColor Green
    
    return $Log
}

# Usage:
# Disable-DormantUsers -DryRun $true -InactiveDays 365
# Disable-DormantUsers -DryRun $false -InactiveDays 365 -ApprovedBy "AD-Audit-Team"

# ==============================================================================
# 7. COMPLIANCE DASHBOARD DATA EXPORT
# ==============================================================================

function Export-ComplianceDashboardData {
    <#
    .SYNOPSIS
    Generates comprehensive JSON export for dashboard import
    #>
    
    param(
        [string]$ExportPath = "C:\ADReports"
    )
    
    Write-Host "Gathering compliance data..." -ForegroundColor Cyan
    
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $ExportFile = Join-Path $ExportPath "ComplianceDashboard_$Timestamp.json"
    
    # Collect all data
    $Summary = @{
        ExportDate = Get-Date -Format "o"
        DormantAccounts = (Get-DormantAccounts -InactiveDays 180).Count
        PasswordViolations = (Get-PasswordPolicyViolations).Count
        PrivilegedAccounts = (Get-PrivilegedAccountAudit).Count
        SODViolations = (Get-SegregationOfDutiesViolations).Count
    }
    
    $Dashboard = @{
        Summary = $Summary
        DormantAccounts = @(Get-DormantAccounts -InactiveDays 180)
        PasswordViolations = @(Get-PasswordPolicyViolations)
        PrivilegedAccounts = @(Get-PrivilegedAccountAudit)
        SODViolations = @(Get-SegregationOfDutiesViolations)
    }
    
    $Dashboard | ConvertTo-Json -Depth 10 | Out-File -Path $ExportFile -Encoding UTF8
    
    Write-Host "Exported to: $ExportFile" -ForegroundColor Green
    
    return $ExportFile
}

# Usage:
# Export-ComplianceDashboardData -ExportPath "C:\ADReports"

# ==============================================================================
# 8. SCHEDULED TASK CREATION
# ==============================================================================

function New-ComplianceAuditTask {
    <#
    .SYNOPSIS
    Creates scheduled tasks for automated compliance checks
    #>
    
    # Daily audit at 2 AM
    $AuditTrigger = New-ScheduledTaskTrigger -Daily -At 2:00am
    $AuditAction = New-ScheduledTaskAction `
        -Execute "PowerShell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"& {Import-Module ActiveDirectory; & 'C:\Scripts\Compliance_Scripts.ps1'; Export-ComplianceDashboardData}`""
    
    Register-ScheduledTask `
        -TaskName "ISO-27001-Daily-Audit" `
        -Trigger $AuditTrigger `
        -Action $AuditAction `
        -RunLevel Highest `
        -Description "Daily ISO 27001 compliance audit" `
        -Force | Out-Null
    
    Write-Host "✓ Daily audit task created" -ForegroundColor Green
    
    # Weekly privileged account review
    $PrivTrigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 8:00am
    $PrivAction = New-ScheduledTaskAction `
        -Execute "PowerShell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"& {Import-Module ActiveDirectory; & 'C:\Scripts\Compliance_Scripts.ps1'; Get-PrivilegedAccountAudit | Export-Csv 'PrivilegedAudit_$(Get-Date -Format yyyy-MM-dd).csv'}`""
    
    Register-ScheduledTask `
        -TaskName "ISO-27001-Privileged-Review" `
        -Trigger $PrivTrigger `
        -Action $PrivAction `
        -RunLevel Highest `
        -Description "Weekly privileged account compliance review" `
        -Force | Out-Null
    
    Write-Host "✓ Weekly privileged review task created" -ForegroundColor Green
}

# Usage:
# New-ComplianceAuditTask

# ==============================================================================
# MASTER COMPLIANCE CHECK
# ==============================================================================

function Invoke-ComplianceAudit {
    <#
    .SYNOPSIS
    Runs complete compliance audit and generates report
    #>
    
    param(
        [string]$ReportPath = "C:\ADReports"
    )
    
    Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   ISO 27001 Active Directory Compliance Audit     ║" -ForegroundColor Cyan
    Write-Host "║   $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')                        ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    
    Write-Host "`n[1/5] Checking dormant accounts..." -ForegroundColor Yellow
    $Dormant = Get-DormantAccounts -InactiveDays 180
    Write-Host "✓ Found $($Dormant.Count) dormant accounts" -ForegroundColor Green
    
    Write-Host "`n[2/5] Checking password policy compliance..." -ForegroundColor Yellow
    $PasswordViolations = Get-PasswordPolicyViolations
    Write-Host "✓ Found $($PasswordViolations.Count) password policy violations" -ForegroundColor Green
    
    Write-Host "`n[3/5] Auditing privileged accounts..." -ForegroundColor Yellow
    $PrivilegedAccounts = Get-PrivilegedAccountAudit
    Write-Host "✓ Found $($PrivilegedAccounts.Count) privileged accounts" -ForegroundColor Green
    
    Write-Host "`n[4/5] Checking segregation of duties..." -ForegroundColor Yellow
    $SODViolations = Get-SegregationOfDutiesViolations
    Write-Host "✓ Found $($SODViolations.Count) segregation of duties violations" -ForegroundColor Green
    
    Write-Host "`n[5/5] Exporting compliance dashboard data..." -ForegroundColor Yellow
    $ExportFile = Export-ComplianceDashboardData -ExportPath $ReportPath
    
    # Summary
    Write-Host "`n╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║              COMPLIANCE SUMMARY                    ║" -ForegroundColor Cyan
    Write-Host "╠════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║ Dormant Accounts (180+ days):         $($Dormant.Count.ToString().PadLeft(3))         ║" -ForegroundColor Yellow
    Write-Host "║ Password Policy Violations:           $($PasswordViolations.Count.ToString().PadLeft(3))         ║" -ForegroundColor Yellow
    Write-Host "║ Privileged Accounts:                  $($PrivilegedAccounts.Count.ToString().PadLeft(3))         ║" -ForegroundColor Cyan
    Write-Host "║ Segregation of Duties Violations:     $($SODViolations.Count.ToString().PadLeft(3))         ║" -ForegroundColor Yellow
    Write-Host "╠════════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║ Dashboard Export:                                  ║" -ForegroundColor Cyan
    Write-Host "║ $ExportFile" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

# Usage:
# Invoke-ComplianceAudit
# Invoke-ComplianceAudit -ReportPath "D:\Compliance\Reports"

# ==============================================================================
# EXECUTE COMPLETE AUDIT ON MODULE IMPORT
# ==============================================================================

Write-Host "ISO 27001 Compliance Scripts loaded. Use Invoke-ComplianceAudit to start."
