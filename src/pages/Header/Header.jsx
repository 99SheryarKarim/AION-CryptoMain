import { Link, useNavigate } from "react-router-dom"
import "./Header.css"
import { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { clearToken, clearAdminToken } from "../../RTK/Slices/AuthSlice"

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  // Get authentication state from Redux
  const { token, adminToken, username, isAdmin } = useSelector((state) => state.Auth)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    dispatch(clearToken())
    closeMenu()
    navigate("/signup")
  }

  const handleAdminLogout = () => {
    dispatch(clearAdminToken())
    closeMenu()
    navigate("/admin/login")
  }

  const handleContactClick = () => {
    closeMenu()
    navigate("/contact")
  }

  return (
    <header className="header">
      <div className="container">
        <div className="logo">
          <Link to="/" onClick={closeMenu} style={{ display: "flex", color: "white", textDecoration: "none" }}>
            <img src="/logoooo.png" alt="TNC CRYPTO" />
            <h2 style={{ marginTop: "8px" }}>AION AI</h2>
          </Link>
        </div>

        <div className={`menu-toggle ${isMenuOpen ? "active" : ""}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <nav className={`nav-menu ${isMenuOpen ? "active" : ""}`}>
          <ul>
            <li className="nav-item">
              <Link to="/" onClick={closeMenu}>
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/about" onClick={closeMenu}>
                About
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/services" onClick={closeMenu}>
                Services
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/coins" onClick={closeMenu}>
                Market
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/predict" onClick={closeMenu}>
                Predict
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/portfolio" onClick={closeMenu}>
                Portfolio
              </Link>
            </li>
            <li className="nav-item no-wrap">
              <Link to="/gopro" onClick={closeMenu}>
                Go Premium
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/info" onClick={closeMenu}>
                Info
              </Link>
            </li>

            {/* User section */}
            {token ? (
              <>
                <li className="nav-item dashboard-link">
                  <Link to="/dashboard" onClick={closeMenu}>
                    Dashboard
                  </Link>
                </li>
                
              </>
            ) : (
              <li className="nav-item">
                <Link to="/signup" onClick={closeMenu}>
                  Signup
                </Link>
              </li>
            )}

          
          </ul>

          <button className="contact-btn" onClick={handleContactClick}>
            Contact Us
          </button>
        </nav>
      </div>
    </header>
  )
}

export default Header