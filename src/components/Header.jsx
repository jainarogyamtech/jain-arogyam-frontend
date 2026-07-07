import { Link } from "react-router-dom";
import "../styles/Header.css";

const Header = () => {
  return (
    <header className="header bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg">
      <div className="container mx-auto py-4 flex justify-center">
        <Link to="/llogin" className="flex items-center">
          <img
            src="/ArogyamLogo.jpg"
            alt="Jain Arogyam"
            className="logo w-20 h-20 rounded-full shadow-lg hover:shadow-2xl transition-transform transform hover:scale-110"
          />
        </Link>
      </div>
    </header>
  );
};

export default Header;






  // import { navLinks } from "../consts/navLinks";

        // <nav>
        //   <ul className="nav-links">
        //     {navLinks.map((navLink) => (
        //       <li key={navLink.title}>
        //         <Link className="nav-link" to={navLink.link}>
        //           {navLink.title}
        //         </Link>
        //       </li>
        //     ))}
        //   </ul>
        // </nav>

/**
 * <li>
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="nav-link" to="/about-us">
                About Us
              </Link>
            </li>
            <li>
              <Link className="nav-link" to="/services">
                Services
              </Link>
            </li>
            <li>
              <Link className="nav-link" to="/contact-us">
                Contact Us
              </Link>
            </li>
 * 
 */
