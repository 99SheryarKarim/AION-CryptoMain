import { useState, useEffect } from "react"
import "./ScrollTop.css" // Import the CSS file

const ScrollTop = () => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener("scroll", toggleVisibility)
    return () => window.removeEventListener("scroll", toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    isVisible && (
      <button className="scroll-to-top" onClick={scrollToTop}>
        ▲
      </button>
    )
  )
}

export default ScrollTop
