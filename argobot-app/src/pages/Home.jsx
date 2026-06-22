import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Eye, CheckCircle, Cpu, Zap, ChevronLeft, ChevronRight, X, Sparkles, Database, TrendingUp, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Home.css';

const galleryImages = [
  { id: 1, src: '/gallery_img1.jpg', alt: 'Manual Control Interface & Joystick Calibration' },
  { id: 2, src: '/gallery_img2.jpg', alt: 'ESP32 Controller Box & Electronics Integration' },
  { id: 3, src: '/gallery_img3.jpg', alt: 'Robotic Arm Base Assembly & Alignment' },
  { id: 4, src: '/gallery_img4.jpg', alt: 'System Integration & Project Team Collaboration' },
  { id: 5, src: '/gallery_img5.jpg', alt: 'Conveyor & Sorting Logic Field Calibration' },
  { id: 6, src: '/gallery_img6.jpg', alt: 'Robotic Gripper Actuation & Object Grasping Test' },
  { id: 7, src: '/gallery_img7.jpg', alt: '4-DOF Robotic Arm Structural Profiling' },
  { id: 8, src: '/gallery_img8.jpg', alt: 'Closed-Loop Object Sorting Operation Test' },
  { id: 9, src: '/gallery_img9.jpg', alt: 'Sensitive Object Grasping Calibration (Grape)' },
  { id: 10, src: '/gallery_img10.jpg', alt: 'Placement Calibration & Bin Destination Routing' }
];

const Home = () => {
  const scrollRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);
  const cooldownTimerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [activeImageIndex, setActiveImageIndex] = useState(null);

  // Auto-scroll loop
  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let lastTime = performance.now();
    const speed = 0.6; // speed variable

    const animateScroll = (time) => {
      if (!isHovered && !isCooldown) {
        const delta = time - lastTime;
        const cappedDelta = Math.min(delta, 32);
        
        scrollContainer.scrollLeft += speed * (cappedDelta / 16.67);

        if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
          scrollContainer.scrollLeft -= scrollContainer.scrollWidth / 2;
        }
      }
      lastTime = time;
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    };

    animationFrameRef.current = requestAnimationFrame(animateScroll);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered, isCooldown]);

  // Manual navigation using left/right arrows
  const handleManualScroll = (direction) => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    setIsCooldown(true);
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = setTimeout(() => {
      setIsCooldown(false);
    }, 5000);

    const itemWidth = 340; // card size + gap
    const scrollOffset = direction === 'left' ? -itemWidth : itemWidth;

    scrollContainer.scrollBy({
      left: scrollOffset,
      behavior: 'smooth'
    });

    // Wrap-around bounds checks
    setTimeout(() => {
      if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
        scrollContainer.scrollLeft -= scrollContainer.scrollWidth / 2;
      } else if (scrollContainer.scrollLeft <= 0) {
        scrollContainer.scrollLeft += scrollContainer.scrollWidth / 2;
      }
    }, 350);
  };

  const openLightbox = (index) => {
    setActiveImageIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setActiveImageIndex(null);
    document.body.style.overflow = '';
  };

  const navigateLightbox = useCallback((direction) => {
    setActiveImageIndex((prevIndex) => {
      if (prevIndex === null) return null;
      if (direction === 'next') {
        return (prevIndex + 1) % galleryImages.length;
      } else {
        return (prevIndex - 1 + galleryImages.length) % galleryImages.length;
      }
    });
  }, []);

  // Keyboard handlers
  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        navigateLightbox('next');
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox('prev');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImageIndex, navigateLightbox]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero container grid grid-cols-2 gap-12 items-center mt-12 mb-16">
        <div className="hero-content flex-col gap-6">
          <h1 className="text-4xl font-bold">IoT-Enabled AI Robotic Arm for Object Classification & Sorting</h1>
          <p className="text-lg text-secondary">
            AI-powered inspection, robotic sorting, and conveyor automation for food-processing operations.
          </p>
          <div className="hero-actions flex gap-4 mt-4">
            <Link to="/dashboard" className="btn btn-primary">
              View Live Dashboard <ArrowRight size={18} />
            </Link>
            <Link to="/control-center" className="btn btn-outline">
              Control Center <ArrowRight size={18} />
            </Link>
          </div>
        </div>
        <div className="hero-image-wrapper">
          <img 
            src="/hero_image.png" 
            alt="Robotic arm and conveyor sorting fruit" 
            className="hero-image"
          />
        </div>
      </section>

      {/* Section 2: Key Benefits (Value Prop) */}
      <section className="benefits-section container mb-16">
        <div className="text-center mb-10 max-w-2xl mx-auto flex-col items-center">
          <span className="badge-pill mb-2">Value Proposition</span>
          <h2 className="text-3xl font-bold text-white mb-3">Optimize Robotic Sorting & Telemetry</h2>
          <p className="text-secondary text-base">AgroBot AI integrates IoT controls and web telemetry to configure conveyor automation, coordinate sequences, and run responsive mechanical sorting.</p>
        </div>
        <div className="grid grid-cols-4 gap-6">
          <div className="benefit-card card flex-col gap-4">
            <div className="benefit-icon-wrapper bg-blue-light">
              <Eye size={24} className="text-primary-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white">Joystick Overrides</h3>
            <p className="text-sm text-secondary">Adjust Base, Shoulder, Elbow, and Claw angles manually with smooth, real-time response from twin joysticks.</p>
          </div>
          <div className="benefit-card card flex-col gap-4">
            <div className="benefit-icon-wrapper bg-blue-light">
              <Sparkles size={24} className="text-primary-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white">Sequence Playback</h3>
            <p className="text-sm text-secondary">Record specific coordinate paths and replay them for targeted Bin A and Bin B sorting operations.</p>
          </div>
          <div className="benefit-card card flex-col gap-4">
            <div className="benefit-icon-wrapper bg-blue-light">
              <Bot size={24} className="text-primary-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white">Conveyor Control</h3>
            <p className="text-sm text-secondary">Start, stop, reverse, and dynamically adjust speed (PWM) directly from the dashboard.</p>
          </div>
          <div className="benefit-card card flex-col gap-4">
            <div className="benefit-icon-wrapper bg-blue-light">
              <TrendingUp size={24} className="text-primary-blue" />
            </div>
            <h3 className="text-lg font-semibold text-white">Live Monitoring</h3>
            <p className="text-sm text-secondary">Track active conveyor speed, check board connection reachability, and monitor session statistics locally.</p>
          </div>
        </div>
      </section>

      {/* Section 3: How AgroBot Works (Merged 5-Step Flow) */}
      <section className="how-it-works-section container mb-16">
        <div className="text-center mb-10 max-w-2xl mx-auto flex-col items-center">
          <span className="badge-pill mb-2">Operation Flow</span>
          <h2 className="text-3xl font-bold text-white mb-3">How AgroBot Works</h2>
          <p className="text-secondary text-base">A manual and recorded produce lifecycle from local wireless control to bin routing.</p>
        </div>
        <div className="grid grid-cols-5 gap-4 relative">
          <div className="step-flow-card card flex-col items-start gap-3">
            <div className="step-badge">01</div>
            <h3 className="text-base font-semibold text-white mt-2">Connect Wifi</h3>
            <p className="text-xs text-secondary leading-relaxed">Power the ESP32 controller and connect the laptop/dashboard to its Access Point.</p>
          </div>
          <div className="step-flow-card card flex-col items-start gap-3">
            <div className="step-badge">02</div>
            <h3 className="text-base font-semibold text-white mt-2">Camera Setup</h3>
            <p className="text-xs text-secondary leading-relaxed">Mount the USB webcam to feed live video telemetry directly into the dashboard console.</p>
          </div>
          <div className="step-flow-card card flex-col items-start gap-3">
            <div className="step-badge">03</div>
            <h3 className="text-base font-semibold text-white mt-2">Run Conveyor</h3>
            <p className="text-xs text-secondary leading-relaxed">Start the conveyor belt manually and slide the PWM control to feed produce.</p>
          </div>
          <div className="step-flow-card card flex-col items-start gap-3">
            <div className="step-badge">04</div>
            <h3 className="text-base font-semibold text-white mt-2">Record Bins</h3>
            <p className="text-xs text-secondary leading-relaxed">Save target pick-and-place coordinate paths for Bin A (Accept) and Bin B (Reject).</p>
          </div>
          <div className="step-flow-card card flex-col items-start gap-3">
            <div className="step-badge">05</div>
            <h3 className="text-base font-semibold text-white mt-2">Sort Produce</h3>
            <p className="text-xs text-secondary leading-relaxed">Trigger saved bin sequences or steer joysticks manually to route fruits into place.</p>
          </div>
        </div>
      </section>

      {/* Section 4: System Architecture Diagram */}
      <section className="architecture-section container mb-16">
        <div className="text-center mb-10 max-w-2xl mx-auto flex-col items-center">
          <span className="badge-pill mb-2">Technical Pipeline</span>
          <h2 className="text-3xl font-bold text-white mb-3">System Architecture</h2>
          <p className="text-secondary text-base">Real-time data flow connecting web browser telemetry, controller servers, and actuators.</p>
        </div>
        <div className="architecture-diagram card p-8">
          <div className="architecture-grid">
            <div className="arch-node">
              <div className="arch-icon bg-blue-light"><Eye className="text-primary-blue" size={24} /></div>
              <span className="arch-node-title">USB Webcam</span>
              <span className="arch-node-desc">Captures Live Telemetry</span>
            </div>
            <div className="arch-connector">
              <div className="connector-line"></div>
              <ChevronRight size={16} className="connector-arrow text-secondary" />
            </div>
            <div className="arch-node highlighted">
              <div className="arch-icon bg-blue-light"><Cpu className="text-primary-blue" size={24} /></div>
              <span className="arch-node-title">Browser Telemetry</span>
              <span className="arch-node-desc">Renders Control UI</span>
            </div>
            <div className="arch-connector">
              <div className="connector-line"></div>
              <ChevronRight size={16} className="connector-arrow text-secondary" />
            </div>
            <div className="arch-node">
              <div className="arch-icon bg-blue-light"><Zap className="text-primary-blue" size={24} /></div>
              <span className="arch-node-title">ESP32 Server</span>
              <span className="arch-node-desc">IoT Action Dispatcher</span>
            </div>
            <div className="arch-connector">
              <div className="connector-line"></div>
              <ChevronRight size={16} className="connector-arrow text-secondary" />
            </div>
            <div className="arch-node highlighted">
              <div className="arch-icon bg-blue-light"><Bot className="text-primary-blue" size={24} /></div>
              <span className="arch-node-title">4-DOF Robotic Arm</span>
              <span className="arch-node-desc">Actuates Servo Angles</span>
            </div>
            <div className="arch-connector">
              <div className="connector-line"></div>
              <ChevronRight size={16} className="connector-arrow text-secondary" />
            </div>
            <div className="arch-node">
              <div className="arch-icon bg-blue-light"><Database className="text-primary-blue" size={24} /></div>
              <span className="arch-node-title">Local Session Logs</span>
              <span className="arch-node-desc">Stores Activity History</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Key Features & Model Performance side-by-side */}
      <section className="features-performance container mb-16 grid grid-cols-2 gap-8 items-stretch">
        {/* Features Column */}
        <div className="key-features-col h-full flex-col">
          <div className="mb-6 flex-col">
            <span className="badge-pill mb-2">Capabilities</span>
            <h2 className="text-2xl font-bold text-white">System Features</h2>
          </div>
          <div className="card flex-grow flex-col justify-between p-8">
            <ul className="flex-col gap-5 p-0 m-0">
              <li className="flex items-start gap-3">
                <div className="check-bullet mt-0.5"><CheckCircle size={18} className="text-success" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Smooth Servo Interpolation</h4>
                  <p className="text-xs text-secondary mt-1">Firmware-level time-based interpolation loop prevents voltage brownouts and sudden resets.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="check-bullet mt-0.5"><CheckCircle size={18} className="text-success" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Twin Controller Compatibility</h4>
                  <p className="text-xs text-secondary mt-1">Seamlessly hand off command flow between physical analog joysticks and the browser dashboard interface.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="check-bullet mt-0.5"><CheckCircle size={18} className="text-success" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Dynamic Speed Controls</h4>
                  <p className="text-xs text-secondary mt-1">Configure active servo write intervals (8ms for quick joystick tracking, 16ms for smooth cinematic playback).</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="check-bullet mt-0.5"><CheckCircle size={18} className="text-success" /></div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Local Storage Memory</h4>
                  <p className="text-xs text-secondary mt-1">Store individual coordinate steps and record full pick-and-place sequence maps directly in local memory.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>


        {/* Model Performance Column */}
        <div className="model-performance-col h-full flex-col">
          <div className="mb-6 flex-col">
            <span className="badge-pill mb-2">Validation Scores</span>
            <h2 className="text-2xl font-bold text-white">Model Performance</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-grow">
            <div className="metric-card card text-center p-6 justify-center">
              <span className="text-secondary text-sm font-medium">Accuracy</span>
              <div className="text-3xl font-bold mt-2">90.0%</div>
            </div>
            <div className="metric-card card text-center p-6 justify-center">
              <span className="text-secondary text-sm font-medium">Precision</span>
              <div className="text-3xl font-bold mt-2">90.0%</div>
            </div>
            <div className="metric-card card text-center p-6 justify-center">
              <span className="text-secondary text-sm font-medium">Recall</span>
              <div className="text-3xl font-bold mt-2">90.0%</div>
            </div>
            <div className="metric-card card text-center p-6 justify-center">
              <span className="text-secondary text-sm font-medium">F1-Score</span>
              <div className="text-3xl font-bold mt-2">90.0%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Project Gallery Slider */}
      <section className="project-gallery container mb-16">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-col">
            <span className="badge-pill mb-2">Media Gallery</span>
            <h2 className="text-2xl font-bold m-0 text-white">Development & System Gallery</h2>
          </div>
          <div className="gallery-arrows flex gap-2">
            <button 
              className="gallery-arrow-btn" 
              onClick={() => handleManualScroll('left')}
              aria-label="Scroll gallery left"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className="gallery-arrow-btn" 
              onClick={() => handleManualScroll('right')}
              aria-label="Scroll gallery right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div 
          className="gallery-slider-container"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="gallery-track" ref={scrollRef}>
            {[...galleryImages, ...galleryImages].map((img, idx) => (
              <div 
                key={`${img.id}-${idx}`} 
                className="gallery-frame cursor-pointer"
                onClick={() => openLightbox(idx % galleryImages.length)}
              >
                <img src={img.src} alt={img.alt} className="gallery-img" />
                <div className="gallery-img-overlay">
                  <span className="text-xs text-white font-medium">{img.alt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {activeImageIndex !== null && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close-btn" onClick={closeLightbox} aria-label="Close image lightbox">
            <X size={24} color="#fff" />
          </button>
          
          <button 
            className="lightbox-arrow-btn prev" 
            onClick={(e) => { e.stopPropagation(); navigateLightbox('prev'); }}
            aria-label="Previous image"
          >
            <ChevronLeft size={36} color="#fff" />
          </button>

          <div className="lightbox-content-wrapper" onClick={(e) => e.stopPropagation()}>
            <img 
              src={galleryImages[activeImageIndex].src} 
              alt={galleryImages[activeImageIndex].alt} 
              className="lightbox-img" 
            />
            <div className="lightbox-caption">
              <span className="text-sm text-white font-semibold">{galleryImages[activeImageIndex].alt}</span>
              <span className="text-xs text-gray-400 font-medium">Image {activeImageIndex + 1} of {galleryImages.length}</span>
            </div>
          </div>

          <button 
            className="lightbox-arrow-btn next" 
            onClick={(e) => { e.stopPropagation(); navigateLightbox('next'); }}
            aria-label="Next image"
          >
            <ChevronRight size={36} color="#fff" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
