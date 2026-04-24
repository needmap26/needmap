import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex flex-col gap-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-black text-[#1A1A1A] tracking-tight">NeedMap</h1>
            <p className="text-xl font-bold text-primary mt-2">
              Smart Resource Allocation for Social Impact
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E5E3DB]">
            <p className="text-lg text-text-secondary leading-relaxed font-medium">
              NeedMap is a data-driven platform designed and built to solve real-world coordination gaps between NGOs and volunteers. It leverages AI and real-time mapping to identify urgent needs, optimize resource allocation, and drive measurable social impact at scale.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Created By</h2>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#E5E3DB] flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold text-2xl shrink-0">
              HS
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[#1A1A1A]">Harshil Sanmber</h3>
              <p className="text-primary font-bold mb-4">Founder & Developer</p>
              <div className="flex gap-4">
                <a 
                  href="#" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors font-medium text-sm border border-gray-200"
                >
                  GitHub
                </a>
                <a 
                  href="#" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium text-sm border border-blue-200"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
