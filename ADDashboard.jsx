import React, { useState, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ADDashboard = ({ initialData = null }) => {
  const [data, setData] = useState(initialData || generateSampleData());
  const [selectedOU, setSelectedOU] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

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

      const normalizeUser = (u = {}) => ({
          displayName: u.DisplayName ?? "",
          samAccountName: u.SamAccountName ?? "",
          email: u.EmailAddress ?? "",
          department: u.Department ?? "",
          ou: u.OU ?? "",
          createdDate: u.CreatedDate,
          lastModifiedDate: u.LastModifiedDate,
          lastLogonDate: u.LastLogonDate,
          passwordLastSet: u.PasswordLastChanged,
          deactivationDate: u.DeactivationDate,
          enabled: u.Enabled,
          status: u.Status,
          title: u.Title,
          manager: u.Manager,
          description: u.Description
      });

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
              (data.allActiveUsers || []).map(normalizeUser),

          allInactiveUsers:
              (data.allInactiveUsers || []).map(normalizeUser),

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
                      : data.complianceIssues?.missingDepartment || 0
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
          // const uploadedData = JSON.parse(e.target.result);
          // setData(uploadedData);
          const uploadedData = JSON.parse(e.target.result);
          setData(normalizeDashboardData(uploadedData));
        } catch (error) {
          alert('Invalid JSON file format');
        }
      };
      reader.readAsText(file);
    }
  };

  // Filter and search data
  const filteredActiveUsers = useMemo(() => {
    return data.allActiveUsers?.filter(user => {
      const ouMatch = selectedOU === 'all' || user.ou === selectedOU;
      const searchMatch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.samAccountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return ouMatch && searchMatch;
    }) || [];
  }, [data, selectedOU, searchTerm]);

  const filteredInactiveUsers = useMemo(() => {
    return data.allInactiveUsers?.filter(user => {
      const ouMatch = selectedOU === 'all' || user.ou === selectedOU;
      const searchMatch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.samAccountName.toLowerCase().includes(searchTerm.toLowerCase());
      return ouMatch && searchMatch;
    }) || [];
  }, [data, selectedOU, searchTerm]);

  // Prepare chart data
  const ouChartData = data.activeUsersByOU?.map(ou => ({
    name: ou.ou,
    active: ou.count,
    inactive: data.inactiveUsersByOU?.find(iu => iu.ou === ou.ou)?.count || 0
  })) || [];

  const complianceData = [
    { name: 'Password Not Changed (90+ days)', value: data.complianceIssues?.passwordNotChanged || 0 },
    { name: 'No Recent Login (180+ days)', value: data.complianceIssues?.noRecentLogin || 0 },
    { name: 'Missing Department', value: data.complianceIssues?.missingDepartment || 0 }
  ];

  const COLORS = ['#e34948', '#eda100', '#1baf7a'];

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
          value={(data.complianceIssues?.passwordNotChanged || 0) + 
                  (data.complianceIssues?.noRecentLogin || 0) +
                  (data.complianceIssues?.missingDepartment || 0)}
          icon="⚠️"
          color="#fab219"
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
            {/* {data.ous?.map(ou => (
              <option key={ou} value={ou}>{ou}</option>
            ))} */}
            {[...new Set(data.ous || [])].map(ou => (
                <option key={ou} value={ou}>
                    {ou}
                </option>
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
                    <th>Created Date</th>
                    <th>Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActiveUsers.slice(0, 50).map((user, idx) => (
                    <tr key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                      <td>{user.displayName}</td>
                      <td style={styles.monospace}>{user.samAccountName}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>{user.department || 'N/A'}</td>
                      <td>{new Date(user.createdDate).toLocaleDateString()}</td>
                      <td>{new Date(user.lastLogonDate).toLocaleDateString()}</td>
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
                    <th>Deactivation Date</th>
                    <th>Department</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInactiveUsers.slice(0, 50).map((user, idx) => (
                    <tr key={idx} style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                      <td>{user.displayName}</td>
                      <td style={styles.monospace}>{user.samAccountName}</td>
                      <td>{new Date(user.createdDate).toLocaleDateString()}</td>
                      <td>{new Date(user.deactivationDate).toLocaleDateString()}</td>
                      <td>{user.ou}</td>
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
            <div style={styles.complianceDetailGrid}>
              <div style={styles.complianceDetailCard}>
                <h3>User Lifecycle Management</h3>
                <ul style={styles.complianceList}>
                  <li>✓ Account creation tracking</li>
                  <li>✓ Deactivation date logging</li>
                  <li>✓ Last login monitoring</li>
                  <li>⚠️ Orphaned accounts: {filteredInactiveUsers.filter(u => 
                    new Date() - new Date(u.deactivationDate) > 365 * 24 * 60 * 60 * 1000
                  ).length}</li>
                </ul>
              </div>
              <div style={styles.complianceDetailCard}>
                <h3>Access Control</h3>
                <ul style={styles.complianceList}>
                  <li>✓ User status tracking (Active/Inactive)</li>
                  <li>✓ Department assignment</li>
                  <li>✓ Manager hierarchy</li>
                  <li>⚠️ Users without department: {data.complianceIssues?.missingDepartment || 0}</li>
                </ul>
              </div>
              <div style={styles.complianceDetailCard}>
                <h3>Password Policy</h3>
                <ul style={styles.complianceList}>
                  <li>✓ Password change tracking</li>
                  <li>✓ 90-day password policy</li>
                  <li>✓ Password history</li>
                  <li>⚠️ Non-compliant users: {data.complianceIssues?.passwordNotChanged || 0}</li>
                </ul>
              </div>
              <div style={styles.complianceDetailCard}>
                <h3>Logging & Monitoring</h3>
                <ul style={styles.complianceList}>
                  <li>✓ Login activity tracking</li>
                  <li>✓ Account modifications logged</li>
                  <li>✓ Deactivation records</li>
                  <li>⚠️ Inactive (180+ days): {data.complianceIssues?.noRecentLogin || 0}</li>
                </ul>
              </div>
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
const SummaryCard = ({ label, value, icon, color }) => (
  <div style={{...styles.card, borderTop: `4px solid ${color}`}}>
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
