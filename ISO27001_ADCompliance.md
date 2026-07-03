# ISO 27001 Compliance Guide - Active Directory User Management

## Overview
This document maps Active Directory user management requirements to ISO 27001:2022 control objectives and provides implementation guidelines.

---

## 1. CONTROL FRAMEWORK MAPPING

### A.5 Organizational Controls
#### A.5.1 Policies for Information Security
- **Requirement**: Establish and communicate information security policies
- **AD Implementation**:
  - Document user provisioning and deprovisioning policies
  - Define password requirements and change frequencies
  - Specify access review schedules
  - Document user classification by role/department

#### A.5.2 Information Security Roles and Responsibilities
- **Requirement**: Define security roles and responsibilities
- **AD Implementation**:
  - Assign account managers per OU
  - Document approval workflows for user creation
  - Establish user access review owners
  - Track manager hierarchies in AD

#### A.5.3 Segregation of Duties
- **Requirement**: Separate conflicting responsibilities
- **AD Implementation**:
  - Separate user creation, approval, and access assignment
  - Document approval chains
  - Monitor for conflicting role assignments
  - Track manager-subordinate relationships

---

### A.6 People Controls

#### A.6.1 Screening
- **Requirement**: Screen individuals before granting access
- **AD Implementation**:
  - Verify user employment status before account creation
  - Document screening dates in user description
  - Link to HR verification records

#### A.6.2 Terms and Conditions of Employment
- **Requirement**: Communicate security obligations
- **AD Implementation**:
  - Record acceptable use acknowledgment date
  - Track security training completion
  - Document policy acceptance

#### A.6.3 Removal of Access Rights
- **Requirement**: Remove access upon employment termination
- **AD Implementation**:
  - Automate account deactivation on termination date
  - Document deactivation reason
  - Generate removal audit trail
  - **Critical Fields to Track**:
    - Termination date from HR system
    - Deactivation date in AD
    - Last login before deactivation
    - Groups and permissions removed

---

### A.8 Cryptography

#### A.8.2 Secret Authentication Information
- **Requirement**: Manage authentication credentials securely
- **AD Implementation**:
  - Enforce password complexity requirements
  - Implement password history (24 passwords)
  - Set maximum password age (90 days)
  - Set minimum password length (14+ characters for admins)
  - **Critical Metrics**:
    - Track password change dates
    - Monitor accounts with expired passwords
    - Flag users not complying with 90-day policy

---

## 2. ACCESS CONTROL (A.9)

### A.9.1 Business Requirements of Access Control
- **Requirement**: Implement access control based on business needs
- **AD Implementation**:
  - Define OU structure per department/function
  - Document access requirements per role
  - Create security groups aligned to roles
  - Map groups to resources

#### Operational Implementation:
```powershell
# Example: Group structure for ISO 27001 compliance
OU Structure:
├── Sales
│   ├── Security Group: GRP_Sales_Users
│   ├── Security Group: GRP_Sales_Finance_Access
│   └── Distribution Group: DL_Sales_All
├── Finance
│   ├── Security Group: GRP_Finance_Users
│   ├── Security Group: GRP_Finance_Sensitive
│   └── Distribution Group: DL_Finance_All
└── IT
    ├── Security Group: GRP_IT_Admin
    ├── Security Group: GRP_IT_Users
    └── Distribution Group: DL_IT_All
```

### A.9.2 User Access Management

#### A.9.2.1 User Registration and De-registration
**Requirements**:
- Formal user registration process
- Formal deactivation process
- Track creation and removal dates

**AD Tracking**:
```
User Lifecycle Timeline:
1. Pre-onboarding
   - HR approval recorded
   - Background check date
   
2. Account Creation
   - Created date (automatic in AD)
   - Department assignment
   - Manager assignment
   - Email provisioning
   - Security group assignments

3. Active Lifecycle
   - Last login date (monitored)
   - Password change date (90-day cycle)
   - Group membership changes
   - Access request approvals

4. Termination
   - Termination notification date (from HR)
   - Deactivation date
   - Access removal date
   - Device return verification
   - Email archive/forwarding
```

#### A.9.2.2 User Access Provisioning
**Critical Controls**:
- Documented approval before access grant
- Appropriate access level per role
- Segregation of duties
- Least privilege principle

**Dashboard Monitoring**:
- New user creation last 30 days
- Access requests pending approval
- Users with privileged access
- Users with multiple role assignments (potential SOD conflict)

#### A.9.2.3 Restricting Access to Information
**Requirements**:
- Implement least privilege
- Monitor inappropriate access
- Regular access reviews

**Metrics to Track**:
```
1. Dormant Accounts (No login > 180 days)
   - Count by OU
   - Days since last login
   - Business justification
   - Recommend: Disable or remove

2. Privileged Access
   - Users in Domain Admins
   - Users in Enterprise Admins
   - Users with admin privileges per server
   - Compare to approved list

3. Inactive but Enabled
   - Created date vs last login
   - Recommend deactivation if > 6 months inactive
```

#### A.9.2.4 Access Rights Review
**Frequency**: Minimum quarterly (ISO 27001 requirement)

**Review Scope**:
- All active user accounts
- Privileged accounts (monthly minimum)
- Third-party/contractor accounts (before each renewal)
- Inactive accounts > 90 days

**Review Process**:
1. Manager reviews subordinate access
2. Access owner confirms appropriateness
3. Document findings and actions
4. Remove inappropriate access immediately

**Dashboard Support**:
```
Access Review Checklist:
☐ All accounts reviewed
☐ Terminated users removed
☐ Inactive users addressed
☐ Privileged access validated
☐ Segregation of duties verified
☐ Approval dates documented
☐ Exceptions approved
☐ Review date recorded
```

#### A.9.2.5 Access Rights Removal or Adjustment
**Deactivation Requirements**:
- Immediate removal upon termination
- Disable account within 24 hours
- Remove from groups within 24 hours
- Archive email within 30 days
- Document access removal
- Verify manager acknowledgment

**Audit Trail Requirements**:
```
Mandatory Deactivation Data Points:
- Termination date (from HR)
- Deactivation date/time
- Deactivated by (administrator)
- Groups removed
- Privileges revoked
- Email status (archived/forwarded)
- Device return status
- Final access audit
```

---

## 3. LOGGING AND MONITORING (A.12)

### A.12.4 Recording User Activities
**Requirements**:
- Log successful and failed authentication
- Log access control changes
- Log security-relevant activities

**AD Events to Monitor**:
```
Event IDs to Enable Audit:
- 4720: User account created
- 4722: User account enabled
- 4725: User account disabled
- 4726: User account deleted
- 4738: User account changed
- 4767: User account unlocked
- 4723: User password changed (failed)
- 4724: User password changed (successful)
- 4740: User account locked out
- 4781: Account renamed
- 4728: Member added to security group
- 4729: Member removed from security group
- 4730: Security group deleted
```

**Retention Requirements**:
- Minimum 1 year for all events
- Minimum 7 years for critical security events
- Quarterly export and archive

### A.12.5 Restrictions on Access to Logs
**Requirements**:
- Restrict log access to authorized personnel
- Prevent log modification by unprivileged users
- Centralize log storage for integrity

**Implementation**:
- Store logs on centralized SIEM
- Restrict write access to Domain Admins only
- Generate monthly access reports
- Monitor log deletion attempts

---

## 4. COMPLIANCE METRICS DASHBOARD

### Automated Checks (Daily/Weekly)
```
1. Deactivation Compliance
   - Accounts created > 1 year with no login: Immediate action
   - Accounts disabled but not removed: 90-day max
   - Terminated users still enabled: Critical violation

2. Password Policy Compliance
   - Password age > 90 days: Alert
   - Users not changing password: 30-day notice
   - Weak passwords: Immediate reset (if detected)

3. Access Control Compliance
   - New privileged accounts: Daily review
   - Access changes not approved: Alert
   - Dormant privileged accounts: Weekly review

4. Audit Logging
   - Failed authentication rate: Alert if > 5% per user
   - Successful authentication gaps: Alert
   - Log file integrity: Daily verification
```

### Quarterly Access Reviews
**Automated Report Generation**:
```powershell
Report Sections:
1. User Lifecycle Summary
   - New users created (with approval verification)
   - Users deactivated (with termination verification)
   - Accounts moved between OUs

2. Access Compliance
   - Privileged account review
   - Inactive account identification
   - Segregation of duties assessment
   - Group membership validation

3. Findings and Recommendations
   - Non-compliant accounts
   - Recommended actions
   - Risk assessment
   - Remediation timeline

4. Sign-off and Certification
   - Manager approval
   - Access control owner approval
   - CISO acknowledgment
```

---

## 5. IMPLEMENTATION CHECKLIST

### Phase 1: Audit & Documentation (Week 1-2)
- [ ] Run initial AD audit using Get-ADUserAudit.ps1
- [ ] Document all OUs and security groups
- [ ] Identify all privileged accounts
- [ ] Review current deactivation process
- [ ] Document current audit logging

### Phase 2: Policy Development (Week 3-4)
- [ ] Create user provisioning policy
- [ ] Create user deprovisioning policy
- [ ] Define password policy (90-day, 14+ char, complexity)
- [ ] Create access review procedure
- [ ] Define privileged access management policy

### Phase 3: Technical Implementation (Week 5-8)
- [ ] Enable AD audit logging for all required events
- [ ] Configure centralized logging (SIEM)
- [ ] Deploy AD password policy via GPO
- [ ] Automate deactivation workflow
- [ ] Implement quarterly review workflow
- [ ] Deploy dashboard for real-time monitoring

### Phase 4: Monitoring & Optimization (Ongoing)
- [ ] Schedule weekly privileged account reviews
- [ ] Execute monthly compliance reports
- [ ] Conduct quarterly access reviews
- [ ] Update policies based on findings
- [ ] Conduct annual security training

---

## 6. CRITICAL NON-COMPLIANCE INDICATORS

🔴 **CRITICAL** - Address within 24 hours:
- Terminated user with active account
- Password older than 365 days
- Privileged account with no recent login > 90 days
- Disabled account still in privileged groups
- Security group membership change without approval

🟠 **HIGH** - Address within 7 days:
- Password older than 120 days (within final 30 days of 90-day policy)
- Account inactive > 180 days but still enabled
- New privileged account without documented approval
- Segregation of duties conflict (same user with conflicting roles)

🟡 **MEDIUM** - Address within 30 days:
- User without department assignment
- No manager assigned to user
- Deactivated account not removed from groups
- Access review overdue by < 30 days

---

## 7. AUTOMATION SCRIPTS

### Scheduled Tasks
```powershell
# Run daily at 2 AM
Task: Get-ADUserAudit.ps1
Frequency: Daily
Retention: 90 days of daily reports

# Verify at weekly at Monday 8 AM
Task: Get-PrivilegedAccountAudit.ps1
Frequency: Weekly
Action: Email report to CISO

# Generate monthly compliance report on first of month
Task: Generate-ComplianceReport.ps1
Frequency: Monthly
Distribution: Board, Management, CISO
```

### Alert Thresholds
```powershell
Password Policy Violations:
- Alert when: Count > 10% of user population
- Escalate when: Count > 25% of user population

Inactive Accounts:
- Alert when: Count > 5% of user population
- Review when: Exceeds 180 days inactive

Privileged Account Changes:
- Alert always for additions
- Alert for removals > 48 hours overdue
```

---

## 8. COMPLIANCE EVIDENCE COLLECTION

### Quarterly Review Package
- Automated audit report (from dashboard)
- Access review sign-off sheet
- Non-compliance summary
- Remediation evidence
- Policy updates applied

### Annual Compliance Certification
- 52-week review of all metrics
- Trend analysis
- Lessons learned
- Policy effectiveness assessment
- Auditor recommendations

---

## 9. REGULATORY REQUIREMENTS

### GDPR Impact
- Right to be forgotten: Deactivation vs. deletion policy
- Data residency: Ensure AD hosted in compliant region
- Consent: Document access approval process
- Breach notification: Track unauthorized access

### SOC 2 Type II
- Time-bound evidence (6-12 months)
- Consistent access control
- Logging of all changes
- Incident response documentation

### HIPAA (if applicable)
- Access must be limited to job functions
- Terminate access immediately upon role change
- Quarterly access reviews mandatory
- Log all PHI access attempts

---

## 10. DASHBOARD CONFIGURATION

### Required Fields for ISO 27001 Compliance
```
User Record:
✓ SamAccountName (unique identifier)
✓ DisplayName
✓ Department (required field)
✓ Manager (approval chain)
✓ EmailAddress
✓ Created (auto-tracked)
✓ Modified (auto-tracked)
✓ LastLogonDate (for dormancy)
✓ PasswordLastSet (for 90-day policy)
✓ Enabled (status)
✓ Description (use case: compliance notes)
✓ UserAccountControl (flags)

OU Structure:
✓ Organizational hierarchy
✓ Ownership (manager)
✓ Purpose/Function
✓ Compliance classification
✓ Backup contact
```

### Dashboard Views
1. **Compliance Overview**: Red/Amber/Green status
2. **Risk Assessment**: Critical issues by type
3. **Audit Trail**: Changes and approvals
4. **Remediation Tracking**: Issues and resolution
5. **Trend Analysis**: 12-month compliance history

---

## References
- ISO/IEC 27001:2022 - Information Security Management Systems
- ISO/IEC 27002:2022 - Code of Practice for Information Security Controls
- NIST Cybersecurity Framework - Identity & Access Management
- CIS Controls - Access Control
- COBIT 2019 - Governance Framework

