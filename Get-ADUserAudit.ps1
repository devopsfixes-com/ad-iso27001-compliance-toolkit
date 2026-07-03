# Active Directory User Audit Script for ISO 27001 Compliance
# This script collects comprehensive user information from Active Directory
# including creation dates, deactivation status, and compliance metadata

param(
    [string]$ExportPath = "C:\ADReports",
    [string]$Domain = $env:USERDOMAIN
)

# Ensure export path exists
if (-not (Test-Path $ExportPath)) {
    New-Item -ItemType Directory -Path $ExportPath | Out-Null
}

# Function to get OU path
function Get-OUPath {
    param([string]$DistinguishedName)
    $OUPath = $DistinguishedName -replace '^CN=.*?,', '' -replace 'DC=', '' -replace ',', '.'
    return $OUPath
}

# Function to determine if user is active
function Test-UserActive {
    param([object]$UserObject)
    
    $userAccountControl = $UserObject.UserAccountControl
    $disabled = [bool]($userAccountControl -band 2)
    
    return -not $disabled
}

function Get-UserComplianceStatus {
    param(
        [object]$UserObject,
        [bool]$IsActive,
        [string]$OUPath
    )

    $now = Get-Date
    $passwordLastSet = $UserObject.PasswordLastSet
    $lastLogonDate = $UserObject.LastLogonDate

    $passwordAgeDays = if ($passwordLastSet -and $passwordLastSet -ne [datetime]::MinValue) {
        [math]::Round(($now - $passwordLastSet).TotalDays, 1)
    }
    else {
        [double]::PositiveInfinity
    }

    $daysSinceLastLogon = if ($lastLogonDate -and $lastLogonDate -ne [datetime]::MinValue) {
        [math]::Round(($now - $lastLogonDate).TotalDays, 1)
    }
    else {
        [double]::PositiveInfinity
    }

    $memberOf = @()
    try {
        $memberOf = @(Get-ADPrincipalGroupMembership -Identity $UserObject.DistinguishedName -ErrorAction Stop | Select-Object -ExpandProperty Name)
    }
    catch {
        $memberOf = @()
    }

    $privilegedGroups = @($memberOf | Where-Object { $_ -in @('Domain Admins','Enterprise Admins','Schema Admins','Account Operators','Server Operators','Backup Operators') })

    $issues = @()
    if ($passwordAgeDays -gt 90) { $issues += 'Password not changed in 90 days' }
    if ($daysSinceLastLogon -gt 180) { $issues += 'No login activity in 180 days' }
    if ([string]::IsNullOrWhiteSpace($UserObject.Department)) { $issues += 'Department not assigned' }
    if ([string]::IsNullOrWhiteSpace($UserObject.Manager)) { $issues += 'Manager not assigned' }
    if ([string]::IsNullOrWhiteSpace($UserObject.EmailAddress) -or $UserObject.EmailAddress -eq 'Not Assigned') { $issues += 'Email not assigned' }
    if ($privilegedGroups.Count -gt 0) { $issues += 'Privileged access assigned' }
    if (-not $IsActive) { $issues += 'Disabled/inactive account' }

    return [PSCustomObject]@{
        PasswordAgeDays = $passwordAgeDays
        DaysSinceLastLogon = $daysSinceLastLogon
        PasswordPolicyCompliant = $passwordAgeDays -le 90
        LoginPolicyCompliant = $daysSinceLastLogon -le 180
        HasPrivilegedAccess = $privilegedGroups.Count -gt 0
        PrivilegedGroups = ($privilegedGroups -join ';')
        ComplianceIssues = ($issues -join ';')
        ReviewRequired = ($issues.Count -gt 0)
    }
}

# Main data collection
Write-Host "Starting Active Directory Audit..." -ForegroundColor Green

# Get all OUs
$OUs = @()
$RootDSE = Get-ADRootDSE
$ADDomain = Get-ADDomain

# Get all OUs recursively
#Get-ADOrganizationalUnit -Filter * -SearchBase $ADDomain.DistinguishedName -SearchScope Subtree | ForEach-Object {
#    $OUs += @{
#        "OU" = $_.Name
#        "DistinguishedName" = $_.DistinguishedName
#        "Description" = $_.Description
#        "CreatedDate" = $_.Created
#    }
#}

$OUs = Get-ADOrganizationalUnit -Filter * -SearchBase $ADDomain.DistinguishedName -SearchScope Subtree |
    ForEach-Object {
        [PSCustomObject]@{
            OU                = $_.Name
            DistinguishedName = $_.DistinguishedName
            Description       = $_.Description
            CreatedDate       = $_.Created
        }
    }

Write-Host "Found $($OUs.Count) Organizational Units" -ForegroundColor Yellow

# Get all users across all OUs
$AllUsers = @()
$AllUsers += Get-ADUser -Filter * -SearchBase $ADDomain.DistinguishedName -SearchScope Subtree `
    -Properties Created, Modified, LastLogonDate, UserAccountControl, Description, Department, Title, Manager, PasswordLastSet

Write-Host "Found $($AllUsers.Count) total users" -ForegroundColor Yellow

# Process and categorize users
$ActiveUsers = @()
$InactiveUsers = @()
$LoginHistory = @()
$ComplianceUsers = @()

foreach ($user in $AllUsers) {
    $isActive = Test-UserActive -UserObject $user
    $ouPath = Get-OUPath -DistinguishedName $user.DistinguishedName
    $managerName = if ($user.Manager) { (Get-ADUser -Identity $user.Manager -ErrorAction SilentlyContinue).Name } else { 'None' }
    $complianceStatus = Get-UserComplianceStatus -UserObject $user -IsActive $isActive -OUPath $ouPath

    $userData = [PSCustomObject]@{
        "SamAccountName" = $user.SamAccountName
        "DisplayName" = $user.Name
        "OU" = $ouPath
        "Department" = $user.Department ?? 'Not Specified'
        "Title" = $user.Title ?? 'Not Specified'
        "Manager" = $managerName
        "EmailAddress" = $user.EmailAddress ?? 'Not Assigned'
        "CreatedDate" = $user.Created
        "LastModifiedDate" = $user.Modified
        "LastLogonDate" = $user.LastLogonDate ?? 'Never'
        "PasswordLastChanged" = $user.PasswordLastSet ?? 'Never'
        "Status" = if ($isActive) { 'Active' } else { 'Disabled' }
        "UserAccountControl" = $user.UserAccountControl
        "Enabled" = $user.Enabled
        "UserPrincipalName" = $user.UserPrincipalName
        "AccountExpirationDate" = $user.AccountExpirationDate
        "PasswordNeverExpires" = $user.PasswordNeverExpires
        "PasswordNotRequired" = $user.PasswordNotRequired
        "Description" = $user.Description ?? ''
        "PasswordAgeDays" = $complianceStatus.PasswordAgeDays
        "DaysSinceLastLogon" = $complianceStatus.DaysSinceLastLogon
        "PasswordPolicyCompliant" = $complianceStatus.PasswordPolicyCompliant
        "LoginPolicyCompliant" = $complianceStatus.LoginPolicyCompliant
        "HasPrivilegedAccess" = $complianceStatus.HasPrivilegedAccess
        "PrivilegedGroups" = $complianceStatus.PrivilegedGroups
        "ComplianceIssues" = $complianceStatus.ComplianceIssues
        "ReviewRequired" = $complianceStatus.ReviewRequired
        "ComplianceNotes" = $complianceStatus.ComplianceIssues
    }

    if ($isActive) {
        $ActiveUsers += $userData
    }
    else {
        $userData | Add-Member -NotePropertyName 'DeactivationDate' -NotePropertyValue $(
            if ($user.Modified -lt $user.Created) { $user.Created } else { $user.Modified }
        )
        $InactiveUsers += $userData
    }

    $ComplianceUsers += $userData

    # Capture login info for reporting
    $LoginHistory += [PSCustomObject]@{
        "SamAccountName" = $user.SamAccountName
        "DisplayName" = $user.Name
        "LastLogonDate" = $user.LastLogonDate
        "OU" = $ouPath
        "Status" = if ($isActive) { 'Active' } else { 'Disabled' }
    }
}

# Function to generate compliance notes
function Get-ComplianceNotes {
    param([object]$User)
    $notes = @()
    
    # ISO 27001 compliance checks
    if ($user.PasswordLastSet -eq $null -or $user.PasswordLastSet -lt (Get-Date).AddDays(-90)) {
        $notes += "Password not changed in 90 days"
    }
    
    if ($user.LastLogonDate -eq $null -or $user.LastLogonDate -lt (Get-Date).AddDays(-180)) {
        $notes += "No login activity in 180 days"
    }
    
    if ([string]::IsNullOrEmpty($user.Department)) {
        $notes += "Department not assigned"
    }
    
    return [string]::Join("; ", $notes)
}

# Summary statistics
$summary = [PSCustomObject]@{
    "TotalOUs" = $OUs.Count
    "TotalUsers" = $ComplianceUsers.Count
    "ActiveUsers" = $ActiveUsers.Count
    "InactiveUsers" = $InactiveUsers.Count
    "UsersWithPasswordIssues" = @($ComplianceUsers | Where-Object { -not $_.PasswordPolicyCompliant }).Count
    "UsersWithNoRecentLogin" = @($ComplianceUsers | Where-Object { -not $_.LoginPolicyCompliant }).Count
    "UsersNeedingReview" = @($ComplianceUsers | Where-Object { $_.ReviewRequired }).Count
    "PrivilegedAccounts" = @($ComplianceUsers | Where-Object { $_.HasPrivilegedAccess }).Count
    "UsersMissingManager" = @($ComplianceUsers | Where-Object { [string]::IsNullOrWhiteSpace($_.Manager) -or $_.Manager -eq 'None' }).Count
    "UsersMissingEmail" = @($ComplianceUsers | Where-Object { [string]::IsNullOrWhiteSpace($_.EmailAddress) -or $_.EmailAddress -eq 'Not Assigned' }).Count
    "ReportGeneratedDate" = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "Domain" = $ADDomain.Name
}

# Export data to CSV files
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$ComplianceUsers | Export-Csv -Path "$ExportPath\AllUsers_$timestamp.csv" -NoTypeInformation -Encoding UTF8
$ActiveUsers | Export-Csv -Path "$ExportPath\ActiveUsers_$timestamp.csv" -NoTypeInformation -Encoding UTF8
$InactiveUsers | Export-Csv -Path "$ExportPath\InactiveUsers_$timestamp.csv" -NoTypeInformation -Encoding UTF8
$LoginHistory | Export-Csv -Path "$ExportPath\LoginHistory_$timestamp.csv" -NoTypeInformation -Encoding UTF8
$OUs | Export-Csv -Path "$ExportPath\OUs_$timestamp.csv" -NoTypeInformation -Encoding UTF8
$ComplianceUsers | Export-Csv -Path "$ExportPath\ComplianceUsers_$timestamp.csv" -NoTypeInformation -Encoding UTF8

# Create summary JSON for dashboard
$dashboardData = @{
    "summary" = $summary
    "activeUsersByOU" = $ActiveUsers | Group-Object -Property OU | ForEach-Object {
        @{
            "ou" = $_.Name
            "count" = $_.Count
            # "users" = $_.Group | Select-Object DisplayName, SamAccountName, EmailAddress, Department
            "users" = $_.Group | Select-Object DisplayName, SamAccountName, EmailAddress, Department, OU, CreatedDate, LastModifiedDate, LastLogonDate, PasswordLastChanged, Status, Enabled, Title, Manager, Description
        }
    }
    "inactiveUsersByOU" = $InactiveUsers | Group-Object -Property OU | ForEach-Object {
        @{
            "ou" = $_.Name
            "count" = $_.Count
            # "users" = $_.Group | Select-Object DisplayName, SamAccountName, DeactivationDate
            "users" = $_.Group | Select-Object DisplayName, SamAccountName, EmailAddress, Department, OU, CreatedDate, LastModifiedDate, LastLogonDate, PasswordLastChanged, Status, Enabled, Title, Manager, Description
        }
    }
    # "ous" = $OUs.OU
    "ous" = @(
    ($ActiveUsers + $InactiveUsers) |
        Select-Object -ExpandProperty OU |
        Sort-Object -Unique
    )
    "complianceIssues" = @{
        "passwordNotChanged" = @($ComplianceUsers | Where-Object { -not $_.PasswordPolicyCompliant })
        "noRecentLogin" = @($ComplianceUsers | Where-Object { -not $_.LoginPolicyCompliant })
        "missingDepartment" = @($ComplianceUsers | Where-Object { [string]::IsNullOrWhiteSpace($_.Department) -or $_.Department -eq 'Not Specified' })
        "privilegedAccounts" = @($ComplianceUsers | Where-Object { $_.HasPrivilegedAccess })
        "accountsNeedingReview" = @($ComplianceUsers | Where-Object { $_.ReviewRequired })
    }
}

$dashboardData | ConvertTo-Json -Depth 10 | Out-File -Path "$ExportPath\DashboardData_$timestamp.json" -Encoding UTF8

# Display summary
Write-Host "`n========== AUDIT SUMMARY ==========" -ForegroundColor Cyan
$summary | Format-Table -AutoSize
Write-Host "Files exported to: $ExportPath" -ForegroundColor Green
Write-Host "Latest JSON: $ExportPath\DashboardData_$timestamp.json" -ForegroundColor Green

# Return data for pipeline usage
[PSCustomObject]@{
    "Summary" = $summary
    "ActiveUsers" = $ActiveUsers
    "InactiveUsers" = $InactiveUsers
    "OUs" = $OUs
    "LoginHistory" = $LoginHistory
}
