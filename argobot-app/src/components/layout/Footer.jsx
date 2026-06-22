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
      <div className="container footer-bottom flex justify-between items-center mt-12">
        <p className="text-sm text-gray-500">© {new Date().getFullYear()} AgroBot AI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
