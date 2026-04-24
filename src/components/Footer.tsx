import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E3DB] mt-auto w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          <p className="text-sm text-text-secondary font-medium">
            © {new Date().getFullYear()} NeedMap
          </p>
          <div className="flex space-x-6 text-sm text-text-secondary font-medium">
            <Link href="/about" className="hover:text-primary transition-colors">About</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
