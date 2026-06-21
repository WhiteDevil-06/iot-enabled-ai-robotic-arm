import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="container py-6">
    <section className="card info-page text-center">
      <p className="text-primary-blue font-semibold">404</p>
      <h1 className="text-3xl">Page not found</h1>
      <p>The page you requested doesn’t exist or has moved.</p>
      <Link to="/" className="btn btn-primary">Return Home</Link>
    </section>
  </div>
);

export default NotFound;
