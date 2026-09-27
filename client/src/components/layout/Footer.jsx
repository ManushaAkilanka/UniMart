import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant/20 mt-space-3xl">
      <div className="max-w-7xl mx-auto px-margin md:px-margin-md lg:px-margin-lg py-space-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-xl pb-space-xl">
          {/* Brand Info & Safe Meetup Box (2 cols) */}
          <div className="lg:col-span-2 flex flex-col gap-space-sm">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="UniMart Brand Logo" className="h-7 w-auto object-contain" />
              <span className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                UniMart Sri Lanka
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              The verified student-to-student marketplace across Sri Lankan universities. Affordable,
              transparent, and campus-grounded circular economy.
            </p>

            <div className="flex items-center gap-space-xs p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/30 max-w-md shadow-level1">
              <span className="material-symbols-outlined text-secondary text-2xl shrink-0">
                security
              </span>
              <p className="font-body-sm text-body-sm text-on-surface">
                <strong className="font-semibold text-secondary">Safe Campus Meetups:</strong> Trade in
                public campus zones like libraries, student canteens, or faculty hubs during daylight
                hours.
              </p>
            </div>
          </div>

          {/* Campus Hubs */}
          <div className="flex flex-col gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Campus Hubs
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link to="/browse?campus=uoc" className="hover:text-secondary transition-colors">
                  Univ. of Colombo (UOC)
                </Link>
              </li>
              <li>
                <Link to="/browse?campus=uom" className="hover:text-secondary transition-colors">
                  Univ. of Moratuwa (UOM)
                </Link>
              </li>
              <li>
                <Link to="/browse?campus=uop" className="hover:text-secondary transition-colors">
                  Univ. of Peradeniya (UOP)
                </Link>
              </li>
              <li>
                <Link to="/browse?campus=uok" className="hover:text-secondary transition-colors">
                  Univ. of Kelaniya (UOK)
                </Link>
              </li>
              <li>
                <Link to="/browse?campus=sliit" className="hover:text-secondary transition-colors">
                  SLIIT Malabe Campus
                </Link>
              </li>
            </ul>
          </div>

          {/* Marketplace */}
          <div className="flex flex-col gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Marketplace
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link to="/categories/textbooks" className="hover:text-secondary transition-colors">
                  Textbooks & Notes
                </Link>
              </li>
              <li>
                <Link to="/categories/tech" className="hover:text-secondary transition-colors">
                  Laptops & Calculators
                </Link>
              </li>
              <li>
                <Link to="/categories/dorm" className="hover:text-secondary transition-colors">
                  Hostel & Dorm Gear
                </Link>
              </li>
              <li>
                <Link to="/free" className="hover:text-secondary transition-colors">
                  Zero-Cost Peer Pool
                </Link>
              </li>
              <li>
                <Link to="/wanted" className="hover:text-secondary transition-colors">
                  Student Request Board
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Community */}
          <div className="flex flex-col gap-space-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Trust & Community
            </span>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <li>
                <Link to="/safety" className="hover:text-secondary transition-colors">
                  Student Honor Code
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-secondary transition-colors">
                  Campus Safety Rules
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-secondary transition-colors">
                  ac.lk Verification Process
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-secondary transition-colors">
                  Community Pledge
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-secondary transition-colors">
                  Dispute Resolution
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-space-lg border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-space-md font-body-sm text-body-sm text-on-surface-variant">
          <p>© 2025 UniMart Sri Lanka. Dedicated to sustainable higher education.</p>
          <div className="flex items-center gap-space-md">
            <Link to="/privacy" className="hover:text-on-surface transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-on-surface transition-colors">
              Terms of Service
            </Link>
            <Link to="/safety" className="hover:text-on-surface transition-colors">
              Sri Lanka Community Guidelines
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
