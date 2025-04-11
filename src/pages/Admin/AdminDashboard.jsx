"use client"

import { useState, useEffect } from "react"
import "./Admin.css"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { setToastMessage, setToastStatus, setShowToast, clearAdminToken } from "../../RTK/Slices/AuthSlice"

const AdminDashboard = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { showToast, toastMessage, toastStatus, adminToken } = useSelector((state) => state.Auth || {})

  const [activeTab, setActiveTab] = useState("users")
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [trades, setTrades] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Check admin token on mount
  useEffect(() => {
    if (!adminToken) {
      navigate("/admin/login")
      return
    }

    // Load mock data
    fetchMockData()
  }, [adminToken, navigate])

  // Fetch mock data - replace with actual API calls
  const fetchMockData = () => {
    setLoading(true)

    // Mock users data
    const mockUsers = [
      {
        id: 1,
        username: "trader1",
        lastLogin: "2023-06-15 14:30:22",
        status: "active",
        trades: 12,
        balance: "2.45 BTC",
      },
      {
        id: 2,
        username: "cryptoking",
        lastLogin: "2023-06-15 10:15:43",
        status: "active",
        trades: 8,
        balance: "0.78 BTC",
      },
      {
        id: 3,
        username: "hodler99",
        lastLogin: "2023-06-14 22:05:11",
        status: "inactive",
        trades: 3,
        balance: "1.23 BTC",
      },
      {
        id: 4,
        username: "satoshi2023",
        lastLogin: "2023-06-14 18:45:30",
        status: "active",
        trades: 21,
        balance: "5.67 BTC",
      },
      {
        id: 5,
        username: "blockchainmaster",
        lastLogin: "2023-06-13 09:20:15",
        status: "suspended",
        trades: 0,
        balance: "0.12 BTC",
      },
    ]

    // Mock trades data
    const mockTrades = [
      {
        id: 101,
        userId: 1,
        type: "buy",
        asset: "BTC",
        amount: "0.25",
        price: "28,450.75",
        timestamp: "2023-06-15 13:45:22",
        status: "completed",
      },
      {
        id: 102,
        userId: 4,
        type: "sell",
        asset: "ETH",
        amount: "2.5",
        price: "1,845.30",
        timestamp: "2023-06-15 12:30:15",
        status: "completed",
      },
      {
        id: 103,
        userId: 2,
        type: "buy",
        asset: "SOL",
        amount: "15",
        price: "78.25",
        timestamp: "2023-06-15 11:20:45",
        status: "pending",
      },
      {
        id: 104,
        userId: 3,
        type: "sell",
        asset: "BTC",
        amount: "0.15",
        price: "28,350.50",
        timestamp: "2023-06-14 22:00:10",
        status: "completed",
      },
      {
        id: 105,
        userId: 4,
        type: "buy",
        asset: "ETH",
        amount: "1.8",
        price: "1,840.75",
        timestamp: "2023-06-14 18:30:22",
        status: "completed",
      },
      {
        id: 106,
        userId: 1,
        type: "buy",
        asset: "BTC",
        amount: "0.1",
        price: "28,500.25",
        timestamp: "2023-06-14 15:15:30",
        status: "completed",
      },
      {
        id: 107,
        userId: 2,
        type: "sell",
        asset: "SOL",
        amount: "10",
        price: "77.50",
        timestamp: "2023-06-14 10:45:12",
        status: "failed",
      },
      {
        id: 108,
        userId: 5,
        type: "buy",
        asset: "BTC",
        amount: "0.05",
        price: "28,200.00",
        timestamp: "2023-06-13 09:10:05",
        status: "completed",
      },
    ]

    setTimeout(() => {
      setUsers(mockUsers)
      setTrades(mockTrades)
      setLoading(false)
    }, 1000)
  }

  // Handle logout
  const handleLogout = () => {
    dispatch(clearAdminToken())
    dispatch(setToastMessage("Admin logged out successfully"))
    dispatch(setToastStatus("success"))
    dispatch(setShowToast(true))
    navigate("/admin/login")
  }

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Filter trades based on search term
  const filteredTrades = trades.filter(
    (trade) =>
      trade.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Get user trades
  const getUserTrades = (userId) => {
    return trades.filter((trade) => trade.userId === userId)
  }

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedUser(null)
  }

  // Handle user status change
  const changeUserStatus = (userId, newStatus) => {
    setUsers(users.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)))

    dispatch(setToastMessage(`User status updated to ${newStatus}`))
    dispatch(setToastStatus("success"))
    dispatch(setShowToast(true))

    setTimeout(() => {
      dispatch(setShowToast(false))
    }, 3000)
  }

  // View user details
  const viewUserDetails = (user) => {
    setSelectedUser(user)
    setIsModalOpen(true)
  }

  return (
    <div className="admin-dashboard-container">
      {showToast && <div className={`toast-notification ${toastStatus}`}>{toastMessage}</div>}

      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo-small">
            <div className="logo-circle"></div>
            <div className="logo-line"></div>
          </div>
          <h3>Admin Panel</h3>
        </div>

        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <span className="nav-icon">👥</span>
            Users
          </button>
          <button
            className={`admin-nav-item ${activeTab === "trades" ? "active" : ""}`}
            onClick={() => setActiveTab("trades")}
          >
            <span className="nav-icon">📊</span>
            Trades
          </button>
          <button
            className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span className="nav-icon">⚙️</span>
            Settings
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-logout-button" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-main">
        <div className="admin-header-bar">
          <h2>
            {activeTab === "users" && "User Management"}
            {activeTab === "trades" && "Trade Activity"}
            {activeTab === "settings" && "Admin Settings"}
          </h2>
          <div className="admin-search">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="admin-content">
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Loading data...</p>
            </div>
          ) : (
            <>
              {activeTab === "users" && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Last Login</th>
                        <th>Status</th>
                        <th>Trades</th>
                        <th>Balance</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.username}</td>
                            <td>{user.lastLogin}</td>
                            <td>
                              <span className={`status-badge ${user.status}`}>{user.status}</span>
                            </td>
                            <td>{user.trades}</td>
                            <td>{user.balance}</td>
                            <td>
                              <div className="action-buttons">
                                <button className="view-button" onClick={() => viewUserDetails(user)}>
                                  View
                                </button>
                                <button
                                  className="status-button"
                                  onClick={() =>
                                    changeUserStatus(user.id, user.status === "active" ? "suspended" : "active")
                                  }
                                >
                                  {user.status === "active" ? "Suspend" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="no-data">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "trades" && (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User ID</th>
                        <th>Type</th>
                        <th>Asset</th>
                        <th>Amount</th>
                        <th>Price (USD)</th>
                        <th>Timestamp</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrades.length > 0 ? (
                        filteredTrades.map((trade) => (
                          <tr key={trade.id}>
                            <td>{trade.id}</td>
                            <td>{trade.userId}</td>
                            <td>
                              <span className={`trade-type ${trade.type}`}>{trade.type}</span>
                            </td>
                            <td>{trade.asset}</td>
                            <td>{trade.amount}</td>
                            <td>${trade.price}</td>
                            <td>{trade.timestamp}</td>
                            <td>
                              <span className={`status-badge ${trade.status}`}>{trade.status}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="no-data">
                            No trades found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="admin-settings">
                  <div className="settings-card">
                    <h3>Admin Profile</h3>
                    <div className="settings-form">
                      <div className="form-group">
                        <label>Admin Username</label>
                        <input type="text" value="admin" disabled />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" value="admin@cryptoplatform.com" disabled />
                      </div>
                      <button className="admin-submit-button">Update Profile</button>
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>Security Settings</h3>
                    <div className="settings-form">
                      <div className="form-group">
                        <label>Change Password</label>
                        <input type="password" placeholder="Current password" />
                      </div>
                      <div className="form-group">
                        <input type="password" placeholder="New password" />
                      </div>
                      <div className="form-group">
                        <input type="password" placeholder="Confirm new password" />
                      </div>
                      <button className="admin-submit-button">Update Password</button>
                    </div>
                  </div>

                  <div className="settings-card">
                    <h3>System Settings</h3>
                    <div className="settings-form">
                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="notifications" checked />
                        <label htmlFor="notifications">Email Notifications</label>
                      </div>
                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="twoFactor" />
                        <label htmlFor="twoFactor">Two-Factor Authentication</label>
                      </div>
                      <div className="form-group checkbox-group">
                        <input type="checkbox" id="maintenance" />
                        <label htmlFor="maintenance">Maintenance Mode</label>
                      </div>
                      <button className="admin-submit-button">Save Settings</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isModalOpen && selectedUser && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details: {selectedUser.username}</h3>
              <button className="close-modal" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="user-details">
                <div className="detail-group">
                  <span className="detail-label">User ID:</span>
                  <span className="detail-value">{selectedUser.id}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${selectedUser.status}`}>{selectedUser.status}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Last Login:</span>
                  <span className="detail-value">{selectedUser.lastLogin}</span>
                </div>
                <div className="detail-group">
                  <span className="detail-label">Balance:</span>
                  <span className="detail-value">{selectedUser.balance}</span>
                </div>
              </div>

              <h4>User Trades</h4>
              <div className="user-trades">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getUserTrades(selectedUser.id).length > 0 ? (
                      getUserTrades(selectedUser.id).map((trade) => (
                        <tr key={trade.id}>
                          <td>{trade.id}</td>
                          <td>
                            <span className={`trade-type ${trade.type}`}>{trade.type}</span>
                          </td>
                          <td>{trade.asset}</td>
                          <td>{trade.amount}</td>
                          <td>${trade.price}</td>
                          <td>
                            <span className={`status-badge ${trade.status}`}>{trade.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">
                          No trades found for this user
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions">
                <button
                  className="admin-submit-button"
                  onClick={() => {
                    changeUserStatus(selectedUser.id, selectedUser.status === "active" ? "suspended" : "active")
                    closeModal()
                  }}
                >
                  {selectedUser.status === "active" ? "Suspend User" : "Activate User"}
                </button>
                <button className="admin-cancel-button" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
