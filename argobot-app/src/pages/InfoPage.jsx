import { Link } from 'react-router-dom';

const pageContent = {
  about: ['About AgroBot AI', 'AgroBot AI combines computer vision, conveyor automation, and robotic handling to help food-processing teams sort produce consistently and monitor every decision.'],
  documentation: ['Documentation', 'The system workflow covers camera detection, AI classification, ESP32 communication, robotic sorting, and quality-control history. Use the Live Dashboard to operate the simulation and Reports to review or export records.'],
  integration: ['System Integration', 'Connect the camera and conveyor controller first, verify ESP32 connectivity, then calibrate the robot’s accept and reject positions before starting a production batch.'],
  support: ['Support', 'For system assistance, diagnostics, or deployment guidance, contact support@agrobot.ai. Include the event time and system component shown in the dashboard.'],
  contact: ['Contact Us', 'Reach the AgroBot AI team at hello@agrobot.ai for product, deployment, and partnership enquiries.'],
  privacy: ['Privacy Policy', 'AgroBot AI stores this demonstration’s theme, operating state, statistics, and sorting history locally in your browser. This demo does not transmit that information to a server.'],
};

const InfoPage = ({ page }) => {
  const [title, body] = pageContent[page];
  return (
    <div className="container py-6">
      <article className="card info-page">
        <p className="text-sm text-primary-blue font-medium">AgroBot AI</p>
        <h1 className="text-3xl">{title}</h1>
        <p>{body}</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </article>
    </div>
  );
};

export default InfoPage;
