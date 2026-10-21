import { useState } from 'react'
import {
  ArrowRight,
  Compass,
  Gem,
  Headphones,
  ShieldCheck,
  Truck,
  Phone,
  Mail,
  MapPin,
  Search,
  Heart
} from 'lucide-react'
import { type Tile } from './catalog'

interface HomePageProps {
  onOpenCatalog: (favorites?: boolean, surface?: 'All' | 'Floor' | 'Wall') => void
  featuredTiles: Tile[]
  sampleUrl: (tile: Tile) => string
}

export function HomePage({
  onOpenCatalog,
  featuredTiles,
  sampleUrl,
}: HomePageProps) {
  const [activeSlide, setActiveSlide] = useState(0)

  // 5 Signature Categories matching the reference design image
  const collectionCategories = [
    {
      id: 'floor',
      title: 'Floor Tiles',
      surface: 'Floor' as const,
      image: '/showcase/col_floor_tiles_1791974119845.jpg',
    },
    {
      id: 'wall',
      title: 'Wall Tiles',
      surface: 'Wall' as const,
      image: '/showcase/col_wall_tiles_1791974142885.jpg',
    },
    {
      id: 'outdoor',
      title: 'Outdoor Tiles',
      surface: 'Floor' as const,
      image: '/showcase/col_outdoor_tiles_1791974173001.jpg',
    },
    {
      id: 'porcelain',
      title: 'Porcelain Tiles',
      surface: 'All' as const,
      image: '/showcase/col_porcelain_tiles_1791974193518.jpg',
    },
    {
      id: 'wooden',
      title: 'Wooden Finish Tiles',
      surface: 'Floor' as const,
      image: '/showcase/col_wood_tiles_1791974219134.jpg',
    },
  ]

  // Default fallback tiles for the 5-card row matching reference design names
  const defaultTiles = [
    {
      name: 'Carrara White Marble',
      category: 'Floor Tile',
      image: '/tiles/marble_tiles.jpg',
      code: 'MJP-CW-01',
    },
    {
      name: 'Urban Grey',
      category: 'Wall Tile',
      image: '/tiles/stone_tiles.jpg',
      code: 'MJP-UG-02',
    },
    {
      name: 'Beige Stone',
      category: 'Floor Tile',
      image: '/tiles/stone_floor.jpg',
      code: 'MJP-BS-03',
    },
    {
      name: 'Wood Oak',
      category: 'Wooden Finish Tile',
      image: '/tiles/wood_floor.jpg',
      code: 'MJP-WO-04',
    },
    {
      name: 'Black Stone',
      category: 'Porcelain Tile',
      image: '/tiles/granite_tile.jpg',
      code: 'MJP-BS-05',
    },
  ]

  // Prepare display items from actual catalog tiles if available
  const displayTiles = featuredTiles.slice(0, 5).map((t, idx) => ({
    name: t.name || defaultTiles[idx].name,
    category: t.surface === 'Wall' ? 'Wall Tile' : t.family === 'Pattern' ? 'Porcelain Tile' : 'Floor Tile',
    image: sampleUrl(t) || defaultTiles[idx].image,
    code: t.id,
  }))

  const finalFeaturedList = displayTiles.length >= 5 ? displayTiles : defaultTiles

  return (
    <div className="home-page-container">
      {/* ------------------------------------------------------------------
          1. HERO SECTION (Living Room with Marble Tiles & Mountains)
          ------------------------------------------------------------------ */}
      <section className="tv-hero-section" id="hero">
        <div className="tv-hero-bg-wrapper">
          <img
            src="/showcase/hero_living_room_tiles_1791974097796.jpg"
            alt="MJP Ceramics Luxury Living Room with Marble Floor"
            className="tv-hero-bg-img"
          />
          <div className="tv-hero-overlay" />
        </div>

        <div className="tv-hero-content-box">
          <p className="tv-hero-pretitle">PREMIUM TILES SHOWROOM</p>
          <h1 className="tv-hero-heading">
            Transform Your<br />
            Space with<br />
            <span className="tv-gold-accent">Beautiful Tiles</span>
          </h1>
          <p className="tv-hero-subtitle">
            Modern designs, Lasting quality, Perfect for<br />
            your home and commercial spaces.
          </p>

          <button
            type="button"
            className="tv-hero-btn"
            onClick={() => onOpenCatalog(false, 'All')}
          >
            <span>Explore Our Collection</span>
            <ArrowRight size={17} />
          </button>

          {/* Slider Indicators */}
          <div className="tv-slider-indicators">
            <span
              className={`tv-slider-bar ${activeSlide === 0 ? 'active' : ''}`}
              onClick={() => setActiveSlide(0)}
            />
            <span
              className={`tv-slider-bar ${activeSlide === 1 ? 'active' : ''}`}
              onClick={() => setActiveSlide(1)}
            />
            <span
              className={`tv-slider-bar ${activeSlide === 2 ? 'active' : ''}`}
              onClick={() => setActiveSlide(2)}
            />
          </div>
        </div>

        {/* Cursive Handwriting Accent Watermark on Floor */}
        <div className="tv-hero-floor-script">
          <span>Better Tiles</span>
          <span className="tv-script-indent">Brighter Spaces</span>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          2. EXPLORE OUR TILE COLLECTIONS (5 Category Cards)
          ------------------------------------------------------------------ */}
      <section className="tv-collections-section" id="collections">
        <div className="tv-collections-header">
          <div>
            <p className="tv-section-tag">EXPLORE OUR</p>
            <h2 className="tv-section-title">Tile Collections</h2>
          </div>
          <button
            type="button"
            className="tv-view-all-link"
            onClick={() => onOpenCatalog(false, 'All')}
          >
            <span>View All Collections</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="tv-collections-grid">
          {collectionCategories.map((cat) => (
            <div
              key={cat.id}
              className="tv-category-card"
              onClick={() => onOpenCatalog(false, cat.surface)}
              role="button"
              tabIndex={0}
            >
              <div className="tv-cat-img-box">
                <img
                  src={cat.image}
                  alt={cat.title}
                  className="tv-cat-img"
                  loading="lazy"
                />
              </div>
              <div className="tv-cat-footer">
                <span className="tv-cat-name">{cat.title}</span>
                <span className="tv-cat-arrow">
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          3. VALUE PROPOSITION STRIP (5 Trust Pillars with Icons)
          ------------------------------------------------------------------ */}
      <section className="tv-trust-bar-section" id="why-us">
        <div className="tv-trust-bar-container">
          <div className="tv-trust-item">
            <div className="tv-trust-icon-box">
              <Gem size={26} strokeWidth={1.75} />
            </div>
            <h4>Premium Quality</h4>
            <p>Only the best, always.</p>
          </div>

          <div className="tv-trust-item">
            <div className="tv-trust-icon-box">
              <Compass size={26} strokeWidth={1.75} />
            </div>
            <h4>Wide Range of Designs</h4>
            <p>Modern to classic styles.</p>
          </div>

          <div className="tv-trust-item">
            <div className="tv-trust-icon-box">
              <ShieldCheck size={26} strokeWidth={1.75} />
            </div>
            <h4>Trusted Brand</h4>
            <p>Built on quality &amp; trust.</p>
          </div>

          <div className="tv-trust-item">
            <div className="tv-trust-icon-box">
              <Truck size={26} strokeWidth={1.75} />
            </div>
            <h4>On-Time Delivery</h4>
            <p>Your space, our priority.</p>
          </div>

          <div className="tv-trust-item">
            <div className="tv-trust-icon-box">
              <Headphones size={26} strokeWidth={1.75} />
            </div>
            <h4>Expert Guidance</h4>
            <p>Help at every step.</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          4. BRAND STORY / LIFESTYLE ("More Than Just Tiles, It's a Lifestyle")
          ------------------------------------------------------------------ */}
      <section className="tv-about-section" id="about">
        <div className="tv-about-container">
          {/* Left Showroom Visual */}
          <div className="tv-about-visual-box">
            <img
              src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80"
              alt="MJP Ceramics Flagship Showroom Interior"
              className="tv-about-img"
              loading="lazy"
            />
            {/* Showroom Wall Script Art */}
            <div className="tv-about-wall-script">
              <span>Tiles</span>
              <span className="tv-wall-script-line2">Inspire</span>
              <span className="tv-wall-script-line3">Better</span>
              <span className="tv-wall-script-line4">Living</span>
            </div>
          </div>

          {/* Right Text Column */}
          <div className="tv-about-text-box">
            <p className="tv-section-tag">ABOUT MJP CERAMICS</p>
            <h2 className="tv-about-heading">
              More Than Just Tiles,<br />
              <span className="tv-gold-accent">It’s a Lifestyle</span>
            </h2>
            <p className="tv-about-desc">
              At MJP Ceramics, we bring you a curated collection of premium tiles to help you create spaces that inspire. Whether it’s your home, office or commercial space, we offer stylish, durable and high-quality tiles for every need.
            </p>
            <button
              type="button"
              className="tv-about-btn"
              onClick={() => onOpenCatalog(false, 'All')}
            >
              <span>Know More</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          5. FEATURED TILES ROW (5 Tile Swatch Cards)
          ------------------------------------------------------------------ */}
      <section className="tv-featured-section" id="gallery">
        <div className="tv-featured-header">
          <div>
            <h2 className="tv-section-title">Featured Tiles</h2>
            <p className="tv-section-subtitle">Handpicked designs for your dream spaces.</p>
          </div>
          <button
            type="button"
            className="tv-view-all-link"
            onClick={() => onOpenCatalog(false, 'All')}
          >
            <span>View All Tiles</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="tv-featured-grid">
          {finalFeaturedList.map((tile, i) => (
            <div
              key={tile.code + i}
              className="tv-tile-card"
              onClick={() => onOpenCatalog(false, 'All')}
              role="button"
              tabIndex={0}
            >
              <div className="tv-tile-swatch-box">
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="tv-tile-swatch-img"
                  loading="lazy"
                />
              </div>
              <div className="tv-tile-card-footer">
                <div className="tv-tile-info">
                  <h4 className="tv-tile-name">{tile.name}</h4>
                  <span className="tv-tile-type">{tile.category}</span>
                </div>
                <div className="tv-tile-circle-btn">
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          6. LUXURY DARK FOOTER
          ------------------------------------------------------------------ */}
      <footer className="tv-footer" id="contact">
        <div className="tv-footer-top">
          {/* Brand Info */}
          <div className="tv-footer-col tv-footer-brand-col">
            <div className="tv-footer-logo-row">
              <div className="tv-footer-logo-icon">
                <div className="tv-diamond-grid">
                  <span className="d1" />
                  <span className="d2" />
                  <span className="d3" />
                  <span className="d4" />
                </div>
              </div>
              <div className="tv-footer-brand-text">
                <span className="tv-footer-brand-name">MJP CERAMICS</span>
                <span className="tv-footer-brand-tag">TILES &amp; MORE</span>
              </div>
            </div>
            <p className="tv-footer-tagline">
              Curating South India&apos;s finest architectural porcelain, luxury granites, and handcrafted wall surfaces.
            </p>
          </div>

          {/* Quick Links */}
          <div className="tv-footer-col">
            <h4 className="tv-footer-heading">Quick Links</h4>
            <ul className="tv-footer-nav-list">
              <li><a href="#hero">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#collections">Collections</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          {/* Contact Us */}
          <div className="tv-footer-col">
            <h4 className="tv-footer-heading">Contact Us</h4>
            <div className="tv-footer-contact-list">
              <div className="tv-footer-contact-row">
                <Phone size={15} className="tv-footer-icon" />
                <span>+91 90000 00000</span>
              </div>
              <div className="tv-footer-contact-row">
                <Mail size={15} className="tv-footer-icon" />
                <span>info@mjpceramics.example</span>
              </div>
              <div className="tv-footer-contact-row">
                <MapPin size={15} className="tv-footer-icon tv-icon-pin" />
                <span>Shri Erumbeeswarar Temple, State Highway 49, Malaikoil, Thiruverumbur, Tamil Nadu - 620013</span>
              </div>
            </div>
          </div>

          {/* Follow Us */}
          <div className="tv-footer-col">
            <h4 className="tv-footer-heading">Follow Us</h4>
            <div className="tv-footer-social-row">
              <a href="#" aria-label="Facebook" className="tv-social-btn" title="Facebook">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className="tv-social-btn" title="Instagram">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" aria-label="YouTube" className="tv-social-btn" title="YouTube">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33zM9.75 15.02V8.48l5.75 3.27-5.75 3.27z" />
                </svg>
              </a>
              <a href="#" aria-label="Pinterest" className="tv-social-btn" title="Pinterest">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.546.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="tv-footer-bottom">
          <p className="tv-footer-copy">
            © {new Date().getFullYear()} MJP Ceramics, All Rights Reserved.
          </p>
          <div className="tv-footer-motto">
            <span className="tv-motto-line" />
            <span>Tiles for a Better Tomorrow</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
