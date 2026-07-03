import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ADDashboard = ({ initialData = null }) => {
  const [data, setData] = useState(initialData || generateSampleData());
  const [selectedOU, setSelectedOU] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompliance, setSelectedCompliance] = useState('passwordPolicy');

  function normalizeDashboardData(data) {

      // const normalizeUser = (u = {}) => ({
      //     displayName: u.displayName || u.DisplayName || u.Name || "",
      //     samAccountName: u.samAccountName || u.SamAccountName || "",
      //     email: u.email || u.EmailAddress || "",
      //     department: u.department || u.Department || "Not Specified",
      //     ou: u.ou || u.OU || u.DistinguishedName || "",
      //     enabled: u.enabled ?? u.Enabled,
      //     status: u.status || (u.Enabled ? "Active" : "Inactive"),
      //     createdDate: u.createdDate || u.Created,
      //     lastLogonDate: u.lastLogonDate || u.LastLogonDate,
      //     passwordLastSet: u.passwordLastSet || u.PasswordLastSet
      // });

      const parseOuDetails = (ouValue = '') => {
          const ouSegments = (ouValue.match(/OU=([^.,]+)/g) || [])
              .map(segment => segment.replace(/^OU=/, '').trim())
              .filter(Boolean);
          const department = ouSegments[0] || 'Not Specified';
          const city = ouSegments.find(segment => ['Lahore', 'Karachi'].includes(segment)) || ouSegments[1] || 'Not Specified';
          return { department, city };
      };

      const normalizeUser = (u = {}) => {
          const ouValue = u.OU ?? u.ou ?? u.DistinguishedName ?? '';
          const ouDetails = parseOuDetails(ouValue);

          const importedDepartment = [u.Department, u.department, u.DepartmentName].find(
              value => typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'not specified'
          );
          const importedCity = [u.City, u.city].find(
              value => typeof value === 'string' && value.trim()
          );

          const passwordAgeDays = typeof u.PasswordAgeDays === 'number'
              ? u.PasswordAgeDays
              : (u.PasswordLastChanged ? Math.max(0, Math.round((new Date() - new Date(u.PasswordLastChanged)) / (1000 * 60 * 60 * 24))) : null);
          const daysSinceLastLogon = typeof u.DaysSinceLastLogon === 'number'
              ? u.DaysSinceLastLogon
              : (u.LastLogonDate && u.LastLogonDate !== 'Never' ? Math.max(0, Math.round((new Date() - new Date(u.LastLogonDate)) / (1000 * 60 * 60 * 24))) : null);

          return {
              displayName: u.DisplayName ?? u.displayName ?? u.Name ?? "",
              samAccountName: u.SamAccountName ?? u.samAccountName ?? "",
              email: u.EmailAddress ?? u.email ?? "",
              department: importedDepartment ?? ouDetails.department,
              city: importedCity ?? ouDetails.city,
              ou: ouValue,
              createdDate: u.CreatedDate ?? u.createdDate ?? u.Created,
              lastModifiedDate: u.LastModifiedDate ?? u.lastModifiedDate ?? u.Modified,
              lastLogonDate: u.LastLogonDate ?? u.lastLogonDate,
              passwordLastSet: u.PasswordLastChanged ?? u.passwordLastSet ?? u.PasswordLastSet,
              deactivationDate: u.DeactivationDate ?? u.LastModifiedDate ?? u.lastModifiedDate ?? u.Modified ?? "",
              enabled: u.Enabled ?? u.enabled,
              status: u.Status ?? u.status,
              title: u.Title ?? u.title,
              manager: u.Manager ?? u.manager,
              description: u.Description ?? u.description,
              passwordAgeDays,
              daysSinceLastLogon,
              passwordPolicyCompliant: u.PasswordPolicyCompliant ?? (passwordAgeDays == null ? true : passwordAgeDays <= 90),
              loginPolicyCompliant: u.LoginPolicyCompliant ?? (daysSinceLastLogon == null ? true : daysSinceLastLogon <= 180),
              hasPrivilegedAccess: Boolean(u.HasPrivilegedAccess || u.HasPrivilegedGroup),
              privilegedGroups: u.PrivilegedGroups ?? u.PrivilegedGroup ?? '',
              complianceIssues: u.ComplianceIssues ?? u.ComplianceNotes ?? '',
              reviewRequired: Boolean(u.ReviewRequired)
          };
      };

      const flattenUsers = (groups = []) => {
          return groups.flatMap((group) => {
              const users = Array.isArray(group?.users)
                  ? group.users
                  : group?.users
                      ? [group.users]
                      : [];

              return users.map(normalizeUser);
          });
      };

      return {

          ...data,

          summary: {
              totalOUs: data.summary?.totalOUs ?? data.summary?.TotalOUs ?? 0,
              totalUsers: data.summary?.totalUsers ?? data.summary?.TotalUsers ?? 0,
              activeUsers: data.summary?.activeUsers ?? data.summary?.ActiveUsers ?? 0,
              inactiveUsers: data.summary?.inactiveUsers ?? data.summary?.InactiveUsers ?? 0,
              reportGeneratedDate:
                  data.summary?.reportGeneratedDate ??
                  data.summary?.ReportGeneratedDate,
              domain: data.summary?.domain ?? data.summary?.Domain
          },

          allActiveUsers:
              (data.allActiveUsers || []).length > 0
                  ? (data.allActiveUsers || []).map(normalizeUser)
                  : flattenUsers(data.activeUsersByOU || []),

          allInactiveUsers:
              (data.allInactiveUsers || []).length > 0
                  ? (data.allInactiveUsers || []).map(normalizeUser)
                  : flattenUsers(data.inactiveUsersByOU || []),

          activeUsersByOU:
              (data.activeUsersByOU || []).map(ou => ({
                  ...ou,
                  users: Array.isArray(ou.users)
                      ? ou.users.map(normalizeUser)
                      : ou.users
                          ? [normalizeUser(ou.users)]
                          : []
              })),

          inactiveUsersByOU:
              (data.inactiveUsersByOU || []).map(ou => ({
                  ...ou,
                  users: Array.isArray(ou.users)
                      ? ou.users.map(normalizeUser)
                      : ou.users
                          ? [normalizeUser(ou.users)]
                          : []
              })),

          complianceIssues: {
              passwordNotChanged:
                  Array.isArray(data.complianceIssues?.passwordNotChanged)
                      ? data.complianceIssues.passwordNotChanged.length
                      : data.complianceIssues?.passwordNotChanged || 0,

              noRecentLogin:
                  Array.isArray(data.complianceIssues?.noRecentLogin)
                      ? data.complianceIssues.noRecentLogin.length
                      : data.complianceIssues?.noRecentLogin || 0,

              missingDepartment:
                  Array.isArray(data.complianceIssues?.missingDepartment)
                      ? data.complianceIssues.missingDepartment.length
                      : data.complianceIssues?.missingDepartment || 0,

              privilegedAccounts:
                  Array.isArray(data.complianceIssues?.privilegedAccounts)
                      ? data.complianceIssues.privilegedAccounts.length
                      : data.complianceIssues?.privilegedAccounts || 0,

              accountsNeedingReview:
                  Array.isArray(data.complianceIssues?.accountsNeedingReview)
                      ? data.complianceIssues.accountsNeedingReview.length
                      : data.complianceIssues?.accountsNeedingReview || 0
          }

      };
  }
  // Generate sample data for demonstration
  function generateSampleData() {
    const ous = [
      'Sales', 'IT', 'Finance', 'HR', 'Marketing', 'Operations', 'Development'
    ];

    const activeUsers = [];
    const inactiveUsers = [];

    ous.forEach(ou => {
      const activeCount = Math.floor(Math.random() * 50) + 10;
      const inactiveCount = Math.floor(Math.random() * 10) + 1;

      for (let i = 0; i < activeCount; i++) {
        activeUsers.push({
          displayName: `User${i}_${ou}`,
          samAccountName: `user${i}_${ou.toLowerCase()}`,
          ou,
          email: `user${i}@company.com`,
          department: ou,
          city: ou === 'IT' ? 'Lahore' : 'Lahore',
          createdDate: new Date(2023, Math.random() * 12 | 0, Math.random() * 28 + 1).toISOString(),
          lastLogonDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Active'
        });
      }

      for (let i = 0; i < inactiveCount; i++) {
        inactiveUsers.push({
          displayName: `InactiveUser${i}_${ou}`,
          samAccountName: `inactive${i}_${ou.toLowerCase()}`,
          ou,
          createdDate: new Date(2022, Math.random() * 12 | 0, Math.random() * 28 + 1).toISOString(),
          deactivationDate: new Date(2024, Math.random() * 6 | 0, Math.random() * 28 + 1).toISOString(),
          status: 'Inactive'
        });
      }
    });

    return {
      summary: {
        totalOUs: ous.length,
        totalUsers: activeUsers.length + inactiveUsers.length,
        activeUsers: activeUsers.length,
        inactiveUsers: inactiveUsers.length,
        usersWithPasswordIssues: Math.floor((activeUsers.length + inactiveUsers.length) * 0.05),
        usersWithNoRecentLogin: Math.floor(activeUsers.length * 0.08),
        reportGeneratedDate: new Date().toISOString(),
        domain: 'company.local'
      },
      activeUsersByOU: ous.map(ou => ({
        ou,
        count: activeUsers.filter(u => u.ou === ou).length,
        users: activeUsers.filter(u => u.ou === ou).slice(0, 5)
      })),
      inactiveUsersByOU: ous.map(ou => ({
        ou,
        count: inactiveUsers.filter(u => u.ou === ou).length,
        users: inactiveUsers.filter(u => u.ou === ou).slice(0, 5)
      })),
      complianceIssues: {
        passwordNotChanged: Math.floor((activeUsers.length + inactiveUsers.length) * 0.05),
        noRecentLogin: Math.floor(activeUsers.length * 0.08),
        missingDepartment: Math.floor((activeUsers.length + inactiveUsers.length) * 0.02)
      },
      allActiveUsers: activeUsers,
      allInactiveUsers: inactiveUsers,
      ous
    };
  }

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const uploadedData = JSON.parse(e.target.result);
          setData(normalizeDashboardData(uploadedData));
        } catch (error) {
          alert('Invalid JSON file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const departmentOptions = useMemo(() => {
    return Array.from(new Set(
      [...(data.allActiveUsers || []), ...(data.allInactiveUsers || [])]
        .map(user => user.department || user.ou || 'Not Specified')
        .filter(Boolean)
    ));
  }, [data]);

  const cityOptions = useMemo(() => {
    return Array.from(new Set(
      [...(data.allActiveUsers || []), ...(data.allInactiveUsers || [])]
        .map(user => user.city || 'Not Specified')
        .filter(Boolean)
    ));
  }, [data]);

  // Filter and search data
  const filteredActiveUsers = useMemo(() => {
    return data.allActiveUsers?.filter(user => {
      const departmentMatch = selectedOU === 'all' || (user.department || user.ou || 'Not Specified') === selectedOU;
      const cityMatch = selectedCity === 'all' || (user.city || 'Not Specified') === selectedCity;
      const searchMatch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.samAccountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return departmentMatch && cityMatch && searchMatch;
    }) || [];
  }, [data, selectedOU, selectedCity, searchTerm]);

  const filteredInactiveUsers = useMemo(() => {
    return data.allInactiveUsers?.filter(user => {
      const departmentMatch = selectedOU === 'all' || (user.department || user.ou || 'Not Specified') === selectedOU;
      const cityMatch = selectedCity === 'all' || (user.city || 'Not Specified') === selectedCity;
      const searchMatch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.samAccountName.toLowerCase().includes(searchTerm.toLowerCase());
      return departmentMatch && cityMatch && searchMatch;
    }) || [];
  }, [data, selectedOU, selectedCity, searchTerm]);

  // Prepare chart data
  const ouChartData = data.activeUsersByOU?.map(ou => ({
    name: ou.ou,
    active: ou.count,
    inactive: data.inactiveUsersByOU?.find(iu => iu.ou === ou.ou)?.count || 0
  })) || [];

  const complianceData = [
    { name: 'Password Not Changed (90+ days)', value: data.complianceIssues?.passwordNotChanged || 0 },
    { name: 'No Recent Login (180+ days)', value: data.complianceIssues?.noRecentLogin || 0 },
    { name: 'Missing Department', value: data.complianceIssues?.missingDepartment || 0 },
    { name: 'Privileged Accounts', value: data.complianceIssues?.privilegedAccounts || 0 },
    { name: 'Accounts Needing Review', value: data.complianceIssues?.accountsNeedingReview || 0 }
  ];

  const COLORS = ['#e34948', '#eda100', '#1baf7a', '#378ADD', '#fab219'];

  const complianceUsers = useMemo(() => {
    return [...(data.allActiveUsers || []), ...(data.allInactiveUsers || [])].filter(user => {
      return !user.passwordPolicyCompliant || !user.loginPolicyCompliant || !user.department || user.reviewRequired || user.hasPrivilegedAccess;
    });
  }, [data]);

  const complianceSummary = useMemo(() => {
    const allUsers = [...(data.allActiveUsers || []), ...(data.allInactiveUsers || [])];
    return {
      total: allUsers.length,
      compliant: allUsers.filter(user => user.passwordPolicyCompliant && user.loginPolicyCompliant && user.department && !user.hasPrivilegedAccess && !user.reviewRequired).length,
      passwordIssues: allUsers.filter(user => !user.passwordPolicyCompliant).length,
      loginIssues: allUsers.filter(user => !user.loginPolicyCompliant).length,
      missingDepartment: allUsers.filter(user => !user.department || user.department === 'Not Specified').length,
      privilegedAccounts: allUsers.filter(user => user.hasPrivilegedAccess).length,
      reviewRequired: allUsers.filter(user => user.reviewRequired).length
    };
  }, [data]);

  const trendData = useMemo(() => {
    const allUsers = [...(data.allActiveUsers || []), ...(data.allInactiveUsers || [])];
    const bins = [
      { label: '0-30', range: [0, 30] },
      { label: '31-90', range: [31, 90] },
      { label: '91-180', range: [91, 180] },
      { label: '180+', range: [181, Infinity] }
    ];
    return bins.map(bin => ({
      name: bin.label,
      count: allUsers.filter(user => {
        const days = user.passwordAgeDays ?? 0;
        return days >= bin.range[0] && days <= bin.range[1];
      }).length
    }));
  }, [data]);

  const complianceMetrics = [
    {
      key: 'passwordPolicy',
      label: 'Password Policy',
      value: complianceSummary.passwordIssues,
      total: complianceSummary.total,
      color: '#e34948',
      description: 'Users whose passwords are older than the recommended threshold.'
    },
    {
      key: 'loginActivity',
      label: 'Login Activity',
      value: complianceSummary.loginIssues,
      total: complianceSummary.total,
      color: '#fab219',
      description: 'Accounts that have not been used recently and may need review.'
    },
    {
      key: 'departmentAssignment',
      label: 'Department Assignment',
      value: complianceSummary.missingDepartment,
      total: complianceSummary.total,
      color: '#378ADD',
      description: 'Accounts without a clear department assignment for ownership and reporting.'
    },
    {
      key: 'accessReview',
      label: 'Access Review',
      value: complianceSummary.reviewRequired + complianceSummary.privilegedAccounts,
      total: complianceSummary.total,
      color: '#1baf7a',
      description: 'Accounts needing review due to privileged access or review flags.'
    }
  ];

  const activeComplianceMetric = complianceMetrics.find(metric => metric.key === selectedCompliance) || complianceMetrics[0];
  const activeCompliancePercent = Math.max(0, Math.min(100, Math.round(((activeComplianceMetric.total - activeComplianceMetric.value) / Math.max(activeComplianceMetric.total, 1)) * 100)));

  const affectedAccounts = useMemo(() => {
    const allUsers = [...(data.allActiveUsers || []), ...(data.allInactiveUsers || [])];

    switch (selectedCompliance) {
      case 'passwordPolicy':
        return allUsers.filter(user => !user.passwordPolicyCompliant).map((user, index) => ({ ...user, index: index + 1 }));
      case 'loginActivity':
        return allUsers.filter(user => !user.loginPolicyCompliant).map((user, index) => ({ ...user, index: index + 1 }));
      case 'departmentAssignment':
        return allUsers.filter(user => !user.department || user.department === 'Not Specified').map((user, index) => ({ ...user, index: index + 1 }));
      case 'accessReview':
        return allUsers.filter(user => user.reviewRequired || user.hasPrivilegedAccess).map((user, index) => ({ ...user, index: index + 1 }));
      default:
        return allUsers.filter(user => !user.passwordPolicyCompliant).map((user, index) => ({ ...user, index: index + 1 }));
    }
  }, [data, selectedCompliance]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Active Directory User Audit Dashboard</h1>
          <p style={styles.subtitle}>ISO 27001 Compliance & User Management</p>
        </div>
        <div style={styles.headerActions}>
          <label style={styles.uploadLabel}>
            📁 Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={styles.fileInput}
            />
          </label>
          <button onClick={() => setData(generateSampleData())} style={styles.button}>
            🔄 Reload Sample
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <SummaryCard
          label="Total Organizational Units"
          value={data.summary?.totalOUs || 0}
          icon="🏢"
          color="#378ADD"
        />
        <SummaryCard
          label="Total Users"
          value={data.summary?.totalUsers || 0}
          icon="👥"
          color="#1baf7a"
        />
        <SummaryCard
          label="Active Users"
          value={data.summary?.activeUsers || 0}
          icon="✅"
          color="#0ca30c"
        />
        <SummaryCard
          label="Inactive Users"
          value={data.summary?.inactiveUsers || 0}
          icon="🚫"
          color="#e34948"
        />
        <SummaryCard
          label="Compliance Issues"
          value={complianceSummary.reviewRequired + complianceSummary.passwordIssues + complianceSummary.loginIssues + complianceSummary.missingDepartment + complianceSummary.privilegedAccounts}
          icon="⚠️"
          color="#fab219"
        />
        <SummaryCard
          label="Compliant Users"
          value={complianceSummary.compliant || 0}
          icon="🛡️"
          color="#0ca30c"
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {['overview', 'activeUsers', 'inactiveUsers', 'compliance'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              borderBottom: activeTab === tab ? '2px solid #378ADD' : 'none',
              color: activeTab === tab ? '#378ADD' : '#52514e'
            }}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'activeUsers' && `Active Users (${filteredActiveUsers.length})`}
            {tab === 'inactiveUsers' && `Inactive Users (${filteredInactiveUsers.length})`}
            {tab === 'compliance' && 'Compliance'}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      {(activeTab === 'activeUsers' || activeTab === 'inactiveUsers') && (
        <div style={styles.filterBar}>
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={selectedOU}
            onChange={(e) => setSelectedOU(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Departments</option>
            {departmentOptions.map(department => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Cities</option>
            {cityOptions.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Content */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <div>
            <h2 style={styles.sectionTitle}>Users by Organizational Unit</h2>
            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={ouChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="active" fill="#0ca30c" name="Active Users" />
                  <Bar dataKey="inactive" fill="#e34948" name="Inactive Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h2 style={styles.sectionTitle}>Compliance Status Summary</h2>
            <div style={styles.complianceGrid}>
              <div style={styles.complianceCard}>
                <h3 style={styles.complianceCardTitle}>Password Policy</h3>
                <p style={styles.complianceNumber}>{data.complianceIssues?.passwordNotChanged || 0}</p>
                <p style={styles.complianceLabel}>Users with password not changed in 90 days</p>
              </div>
              <div style={styles.complianceCard}>
                <h3 style={styles.complianceCardTitle}>Login Activity</h3>
                <p style={styles.complianceNumber}>{data.complianceIssues?.noRecentLogin || 0}</p>
                <p style={styles.complianceLabel}>Users with no login activity in 180 days</p>
              </div>
              <div style={styles.complianceCard}>
                <h3 style={styles.complianceCardTitle}>User Attributes</h3>
                <p style={styles.complianceNumber}>{data.complianceIssues?.missingDepartment || 0}</p>
                <p style={styles.complianceLabel}>Users missing department assignment</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activeUsers' && (
          <div>
            <h2 style={styles.sectionTitle}>Active Users ({filteredActiveUsers.length})</h2>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>Display Name</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>City</th>
                    <th>Created Date</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveUsers.map((user, idx) => (
                    <tr key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                      <td>{user.displayName}</td>
                      <td style={styles.monospace}>{user.samAccountName}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>{user.department || user.ou || 'N/A'}</td>
                      <td>{user.city || 'N/A'}</td>
                      <td>{user.createdDate ? new Date(user.createdDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{user.lastLogonDate ? new Date(user.lastLogonDate).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inactiveUsers' && (
          <div>
            <h2 style={styles.sectionTitle}>Inactive Users ({filteredInactiveUsers.length})</h2>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>Display Name</th>
                    <th>Username</th>
                    <th>Created Date</th>
                    <th>Last Modified Date</th>
                    <th>Department</th>
                    <th>City</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInactiveUsers.map((user, idx) => (
                    <tr key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                      <td>{user.displayName}</td>
                      <td style={styles.monospace}>{user.samAccountName}</td>
                      <td>{user.createdDate ? new Date(user.createdDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{user.deactivationDate ? new Date(user.deactivationDate).toLocaleDateString() : 'N/A'}</td>
                      <td>{user.department || user.ou || 'N/A'}</td>
                      <td>{user.city || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div>
            <h2 style={styles.sectionTitle}>ISO 27001 Compliance Overview</h2>
            <div style={styles.summaryGrid}>
              <SummaryCard
                label="Compliant Users"
                value={complianceSummary.compliant || 0}
                icon="🛡️"
                color="#0ca30c"
              />
              {complianceMetrics.map(metric => (
                <SummaryCard
                  key={metric.key}
                  label={metric.label}
                  value={metric.value}
                  icon={metric.key === 'passwordPolicy' ? '🔐' : metric.key === 'loginActivity' ? '🕒' : metric.key === 'departmentAssignment' ? '🏷️' : '⚖️'}
                  color={metric.color}
                  onClick={() => setSelectedCompliance(metric.key)}
                  isActive={selectedCompliance === metric.key}
                />
              ))}
            </div>

            <div style={styles.progressSection}>
              <h3 style={styles.sectionTitle}>Compliance Status by Area</h3>
              {complianceMetrics.map(metric => (
                <div key={metric.key} style={styles.progressRow}>
                  <div style={styles.progressHeader}>
                    <span>{metric.label}</span>
                    <span>{Math.max(0, Math.min(100, Math.round(((metric.total - metric.value) / Math.max(metric.total, 1)) * 100)))}%</span>
                  </div>
                  <div style={styles.progressTrack}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${Math.max(0, Math.min(100, Math.round(((metric.total - metric.value) / Math.max(metric.total, 1)) * 100)))}%`,
                        backgroundColor: metric.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.detailCard}>
              <h3 style={styles.detailTitle}>{activeComplianceMetric.label}</h3>
              <p style={styles.detailText}>{activeComplianceMetric.description}</p>
              <p style={styles.detailMeta}>Current score: {activeCompliancePercent}%</p>
              <p style={styles.detailMeta}>Affected accounts: {activeComplianceMetric.value}</p>
            </div>

            <div style={styles.submenuRow}>
              {complianceMetrics.map(metric => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedCompliance(metric.key)}
                  style={{
                    ...styles.submenuButton,
                    backgroundColor: selectedCompliance === metric.key ? '#378ADD' : '#f3f2ee',
                    color: selectedCompliance === metric.key ? 'white' : '#0b0b0b'
                  }}
                >
                  {metric.label}
                </button>
              ))}
            </div>

            <div style={styles.accountListCard}>
              <h3 style={styles.sectionTitle}>Affected Accounts</h3>
              <ol style={styles.accountList}>
                {affectedAccounts.length > 0 ? affectedAccounts.map(account => (
                  <li key={account.samAccountName} style={styles.accountListItem}>
                    <div style={styles.accountListMain}>
                      <strong>{account.index}. {account.displayName}</strong>
                      <span>{account.samAccountName}</span>
                    </div>
                    <div style={styles.accountListMeta}>
                      <span>{account.department || 'Not Specified'}</span>
                      <span>{account.city || 'N/A'}</span>
                    </div>
                  </li>
                )) : <li style={styles.accountListItem}>No affected accounts for this category.</li>}
              </ol>
            </div>

            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={complianceData} dataKey="value" nameKey="name" outerRadius={90} fill="#8884d8" label>
                    {complianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartContainer}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#378ADD" name="Password Age Range" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.complianceDetailGrid}>
              <div style={styles.complianceDetailCard}>
                <h3>Password Policy</h3>
                <ul style={styles.complianceList}>
                  <li>⚠️ Users with password older than 90 days: {complianceSummary.passwordIssues || 0}</li>
                  <li>✓ Password change tracking enabled</li>
                  <li>✓ Password last changed date captured</li>
                </ul>
              </div>
              <div style={styles.complianceDetailCard}>
                <h3>Access Review</h3>
                <ul style={styles.complianceList}>
                  <li>⚠️ Accounts needing review: {complianceSummary.reviewRequired || 0}</li>
                  <li>⚠️ Privileged accounts: {complianceSummary.privilegedAccounts || 0}</li>
                  <li>✓ Manager and ownership fields captured</li>
                </ul>
              </div>
              <div style={styles.complianceDetailCard}>
                <h3>User Lifecycle</h3>
                <ul style={styles.complianceList}>
                  <li>✓ Created date tracked</li>
                  <li>✓ Last modified date tracked</li>
                  <li>⚠️ Disabled/inactive accounts identified</li>
                </ul>
              </div>
              <div style={styles.complianceDetailCard}>
                <h3>Relevant Accounts</h3>
                <ul style={styles.complianceList}>
                  <li>⚠️ Missing department: {complianceSummary.missingDepartment || 0}</li>
                  <li>⚠️ Missing manager/email: {complianceSummary.reviewRequired || 0}</li>
                  <li>✓ Compliance issues exported for review</li>
                </ul>
              </div>
            </div>

            <h3 style={styles.sectionTitle}>Users Requiring Attention</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>Display Name</th>
                    <th>Username</th>
                    <th>Department</th>
                    <th>Issue</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceUsers.slice(0, 50).map((user, idx) => (
                    <tr key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                      <td>{user.displayName}</td>
                      <td style={styles.monospace}>{user.samAccountName}</td>
                      <td>{user.department || 'N/A'}</td>
                      <td>{user.complianceIssues || 'Review required'}</td>
                      <td>{user.lastLogonDate && user.lastLogonDate !== 'Never' ? new Date(user.lastLogonDate).toLocaleDateString() : 'Never'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <p>Last updated: {new Date(data.summary?.reportGeneratedDate).toLocaleString()}</p>
        <p>Domain: {data.summary?.domain}</p>
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ label, value, icon, color, onClick = null, isActive = false }) => (
  <div
    onClick={onClick}
    style={{
      ...styles.card,
      borderTop: `4px solid ${color}`,
      cursor: onClick ? 'pointer' : 'default',
      boxShadow: isActive ? '0 0 0 2px rgba(55, 138, 221, 0.2), 0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
      backgroundColor: isActive ? '#f7fbff' : 'white'
    }}
  >
    <div style={styles.cardIcon}>{icon}</div>
    <div>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{...styles.cardValue, color}}>{value.toLocaleString()}</p>
    </div>
  </div>
);

// Styles
const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f5f4f3',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  title: {
    margin: '0 0 5px 0',
    color: '#0b0b0b',
    fontSize: '28px'
  },
  subtitle: {
    margin: '0',
    color: '#52514e',
    fontSize: '14px'
  },
  headerActions: {
    display: 'flex',
    gap: '10px'
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#378ADD',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  uploadLabel: {
    padding: '8px 16px',
    backgroundColor: '#e1e0d9',
    border: '1px solid #c3c2b7',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center'
  },
  fileInput: {
    display: 'none'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  cardIcon: {
    fontSize: '32px'
  },
  cardLabel: {
    margin: '0',
    fontSize: '13px',
    color: '#52514e'
  },
  cardValue: {
    margin: '5px 0 0 0',
    fontSize: '24px',
    fontWeight: 'bold'
  },
  tabContainer: {
    display: 'flex',
    gap: '20px',
    borderBottom: '1px solid #e1e0d9',
    backgroundColor: 'white',
    padding: '0 20px',
    marginBottom: '20px'
  },
  tab: {
    padding: '15px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500'
  },
  tabContent: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '20px 0 15px 0',
    color: '#0b0b0b'
  },
  chartContainer: {
    backgroundColor: '#fafbf9',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '30px'
  },
  filterBar: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '15px 20px',
    borderRadius: '8px'
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e1e0d9',
    borderRadius: '4px',
    fontSize: '14px'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #e1e0d9',
    borderRadius: '4px',
    fontSize: '14px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  tableHeader: {
    backgroundColor: '#fafbf9',
    borderBottom: '2px solid #e1e0d9'
  },
  tableRowEven: {
    backgroundColor: '#fcfcfb'
  },
  tableRowOdd: {
    backgroundColor: 'white'
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: '12px'
  },
  complianceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    marginBottom: '30px'
  },
  complianceCard: {
    backgroundColor: '#fafbf9',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid #fab219',
    textAlign: 'center'
  },
  complianceCardTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#0b0b0b'
  },
  complianceNumber: {
    margin: '10px 0',
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#fab219'
  },
  complianceLabel: {
    margin: '0',
    fontSize: '12px',
    color: '#52514e'
  },
  progressSection: {
    backgroundColor: '#fafbf9',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  progressRow: {
    marginBottom: '12px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#0b0b0b'
  },
  progressTrack: {
    width: '100%',
    height: '10px',
    backgroundColor: '#e9e7e2',
    borderRadius: '999px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px'
  },
  detailCard: {
    backgroundColor: '#f7fbff',
    border: '1px solid #d6e8f7',
    borderRadius: '8px',
    padding: '16px 18px',
    marginBottom: '20px'
  },
  submenuRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '20px'
  },
  submenuButton: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600'
  },
  accountListCard: {
    backgroundColor: '#fafbf9',
    borderRadius: '8px',
    padding: '16px 18px',
    marginBottom: '20px'
  },
  accountList: {
    paddingLeft: '20px',
    margin: '0'
  },
  accountListItem: {
    padding: '10px 0',
    borderBottom: '1px solid #e9e7e2',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px'
  },
  accountListMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
  },
  accountListMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '3px',
    color: '#52514e',
    fontSize: '12px'
  },
  detailTitle: {
    margin: '0 0 8px 0',
    color: '#0b0b0b'
  },
  detailText: {
    margin: '0 0 8px 0',
    color: '#52514e',
    fontSize: '14px'
  },
  detailMeta: {
    margin: '2px 0',
    color: '#0b0b0b',
    fontSize: '13px',
    fontWeight: '600'
  },
  complianceDetailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  complianceDetailCard: {
    padding: '20px',
    backgroundColor: '#fafbf9',
    borderRadius: '8px',
    borderLeft: '4px solid #378ADD'
  },
  complianceList: {
    margin: '10px 0',
    paddingLeft: '20px'
  },
  footer: {
    marginTop: '30px',
    padding: '15px 20px',
    backgroundColor: 'white',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#52514e',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }
};

export default ADDashboard;
