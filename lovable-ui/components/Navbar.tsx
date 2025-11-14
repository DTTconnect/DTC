import React from "react";
import { createClient } from "@/lib/supabase/server";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
      {/* Logo & main navigation */}
      <div className="flex items-center gap-10">
        <a
          href="/"
          className="flex items-center gap-2 text-2xl font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {/* Simple gradient square to mimic Lovable logo */}
          <span className="inline-block w-6 h-6 rounded-sm bg-gradient-to-br from-orange-400 via-pink-500 to-blue-500" />
          Lovable
        </a>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          {user && (
            <a href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </a>
          )}
          <a href="#" className="hover:text-white transition-colors">
            Community
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Enterprise
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Learn
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Shipped
          </a>
        </div>
      </div>

      {/* Auth buttons */}
      <div className="flex items-center gap-4 text-sm">
        {user ? (
          <>
            <span className="text-gray-400">{user.email}</span>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Dashboard
            </a>
          </>
        ) : (
          <>
            <a
              href="/auth/login"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Log in
            </a>
            <a
              href="/auth/signup"
              className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get started
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
