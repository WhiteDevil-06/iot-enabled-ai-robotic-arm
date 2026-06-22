import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-content grid grid-cols-2 gap-8">
        <div className="footer-brand flex-col gap-4">
          <div className="flex items-center gap-2">
            <img src="/image.png" alt="AgroBot AI Logo" className="logo-image" />
            <span className="font-bold text-xl text-white">AgroBot AI</span>
          </div>
          <p className="text-sm text-gray-400">
            AI-Powered Robotic Produce Sorting System
          </p>
        </div>

        <div className="footer-links flex-col gap-4">
          <h4 className="text-white text-sm">Product</h4>
          <ul className="flex-col gap-2">
            <li><Link to="/" className="text-sm text-gray-400 hover:text-white">Home</Link></li>
            <li><Link to="/dashboard" className="text-sm text-gray-400 hover:text-white">Live Dashboard</Link></li>
            <li><Link to="/reports" className="text-sm text-gray-400 hover:text-white">History & Reports</Link></li>
            <li><Link to="/control-center" className="text-sm text-gray-400 hover:text-white">Control Center</Link></li>
          </ul>
        </div>
      </div>
      <div className="container footer-bottom flex justify-between items-center mt-12 pt-6 border-t border-gray-800">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} AgroBot AI. All rights reserved.</p>
        <div className="footer-social-links flex gap-4">
          <a 
            href="https://github.com/WhiteDevil-06/iot-enabled-ai-robotic-arm" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors"
            title="View Project Repository on GitHub"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
              <path d="M9 18c-4.51 2-5-2-7-2"/>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
