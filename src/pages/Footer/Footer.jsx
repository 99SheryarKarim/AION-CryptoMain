"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faFacebookF,
  faTwitter,
  faPinterest,
  faWhatsapp,
  faLinkedinIn,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons"
import "./Footer.css"

function Footer() {
  const currentYear = new Date().getFullYear()
  const navigate = useNavigate()

  // Admin access state
  const [adminClickCount, setAdminClickCount] = useState(0)
  const [showAdminLink, setShowAdminLink] = useState(false)
  const [lastClickTime, setLastClickTime] = useState(0)

  // Reset click counter after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (adminClickCount > 0 && !showAdminLink) {
        setAdminClickCount(0)
      }
    }, 3000) // Reset after 3 seconds of inactivity

    return () => clearTimeout(timer)
  }, [adminClickCount, showAdminLink])

  // Handle the secret click on copyright text
  const handleCopyrightClick = () => {
    const currentTime = new Date().getTime()

    // If clicks are more than 1 second apart, reset counter
    if (currentTime - lastClickTime > 1000 && adminClickCount > 0) {
      setAdminClickCount(1)
    } else {
      setAdminClickCount(adminClickCount + 1)
    }

    setLastClickTime(currentTime)

    // After 5 rapid clicks, show admin link
    if (adminClickCount >= 4) {
      setShowAdminLink(true)
      setTimeout(() => {
        setShowAdminLink(false)
        setAdminClickCount(0)
      }, 5000) // Hide after 5 seconds
    }
  }

  // Navigate to admin login
  const goToAdminLogin = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate("/admin/login")
    setShowAdminLink(false)
    setAdminClickCount(0)
  }

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Logo and Description */}
        <div className="footer-brand">
          <div className="footer-logo">
            <img src="/logoooo.png" alt="SAIGE AI" className="logo" />
            <h3>AION AI</h3>
          </div>
          <p className="footer-description">
            Embrace the world of digital currencys and redefine your investment strategies with us.
          </p>
        </div>

        {/* Explore Links */}
        <div className="footer-links">
          <h3>Explore</h3>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/services">Services</Link>
            </li>
            <li>
              <Link to="/coins">Market</Link>
            </li>
            <li>
              <Link to="/predict">Predict</Link>
            </li>
            <li>
              <Link to="/gopro">Go Premium</Link>
            </li>
            <li>
              <Link to="/contact">Contact Us</Link>
            </li>
          </ul>
        </div>

        {/* Social Links */}
        <div className="footer-links">
          <h3>Follow us:</h3>
          <ul>
            <li>
              <a href="https://twitter.com/AION_AI" target="_blank" rel="noopener noreferrer">
                Twitter: @AION_AI
              </a>
            </li>
            <li>
              <a href="https://linkedin.com/company/aion-ai" target="_blank" rel="noopener noreferrer">
                LinkedIn: AION AI Official
              </a>
            </li>
            <li>
              <a href="https://github.com/AION-AI-Dev" target="_blank" rel="noopener noreferrer">
                GitHub: AION-AI-Dev
              </a>
            </li>
          </ul>
        </div>

        {/* Newsletter & Social Media */}
        <div className="footer-newsletter">
          <h3>AION AI Newsletter</h3>
          <p>Subscribe to our newsletter for weekly updates, market insights, and special offers.</p>
          <div className="newsletter-form">
            <input type="email" placeholder="Your Email Here" />
            <button type="submit">Subscribe</button>
          </div>
          <div className="social-links">
            <a href="#" className="social-icon">
              <FontAwesomeIcon icon={faFacebookF} />
            </a>
            <a href="#" className="social-icon">
              <FontAwesomeIcon icon={faTwitter} />
            </a>
            <a href="#" className="social-icon">
              <FontAwesomeIcon icon={faPinterest} />
            </a>
            <a href="#" className="social-icon">
              <FontAwesomeIcon icon={faWhatsapp} />
            </a>
            <a href="#" className="social-icon">
              <FontAwesomeIcon icon={faLinkedinIn} />
            </a>
            <a href="#" className="social-icon">
              <FontAwesomeIcon icon={faYoutube} />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright with hidden admin access */}
      <div className="footer-bottom">
        <p onClick={handleCopyrightClick} className="copyright-text">
          Copyright © {currentYear} AION AI
          {showAdminLink && (
            <span className="admin-access-link">
              <a href="#" onClick={goToAdminLogin}>
                Admin Access
              </a>
            </span>
          )}
        </p>
      </div>
    </footer>
  )
}

export default Footer
