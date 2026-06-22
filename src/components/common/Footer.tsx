import React from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-black">
      <div className="container mx-auto px-4 py-8 flex justify-center items-center">
        <p className="text-sm text-white/40">
          © {currentYear} Hoot-Hoot. All rights reserved.
        </p>
      </div>
    </footer>
  );
}