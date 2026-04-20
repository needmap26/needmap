import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E3DB] mt-auto w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Logo & Product Description */}
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-black text-[#1A1A1A] tracking-tight">NeedMap</h3>
              <p className="text-sm font-bold text-primary mt-1">
                Smart Resource Allocation for Social Impact
              </p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed max-w-md font-medium">
              NeedMap is a data-driven platform I designed and built to solve real-world coordination gaps between NGOs and volunteers. It leverages AI and real-time mapping to identify urgent needs, optimize resource allocation, and drive measurable social impact at scale.
            </p>
          </div>

          {/* Founder Info & Links */}
          <div className="flex flex-col md:items-end space-y-4">
            <div className="md:text-right">
              <h4 className="text-base font-bold text-[#1A1A1A]">Harshil Sanmber</h4>
              <p className="text-sm text-primary font-bold">Founder & Developer</p>
            </div>
            
            <div className="flex gap-4">
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors text-sm font-bold"
              >
                GitHub
              </a>
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-primary transition-colors text-sm font-bold"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#E5E3DB] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-text-secondary font-medium">
            © {new Date().getFullYear()} NeedMap. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-text-secondary font-medium">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
