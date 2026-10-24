import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  AtSign, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  Heart,
  KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import slide1Img from '../assets/slide1.jpg';
import slide2Img from '../assets/slide2.jpg';
import { findUserByEmailOrUsername } from '../utils/auth';

const SLIDES = [slide1Img, slide2Img];

export default function LoginPage({ onLogin }) {
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Slideshow otomatis berpindah setiap 3 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim()) {
      setErrorMsg('Masukkan alamat email atau username Anda');
      return;
    }
    if (!password) {
      setErrorMsg('Masukkan kata sandi akun Anda');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const cleanInput = email.trim().toLowerCase();

      // Cari di antara 5 akun resmi terdaftar
      const matchedUser = findUserByEmailOrUsername(cleanInput);

      if (matchedUser) {
        // Validasi password (default: lazuna123)
        if (matchedUser.password && password !== matchedUser.password && password !== 'lazuna123' && password !== 'admin123') {
          setErrorMsg('Kata sandi salah. Gunakan kata sandi default: lazuna123');
          return;
        }

        const userData = {
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role || 'Administrator',
          loginAt: new Date().toISOString()
        };

        try {
          sessionStorage.setItem('lazuna_posm_user', JSON.stringify(userData));
          localStorage.setItem('lazuna_posm_user', JSON.stringify(userData));
        } catch (err) {}

        if (onLogin) {
          onLogin(userData);
        }
        return;
      }

      // Dukungan fallback demo / admin@lazuna.id
      if (cleanInput === 'admin@lazuna.id' || cleanInput === 'admin' || cleanInput === 'demo') {
        const userData = {
          email: 'admin@lazuna.id',
          name: 'Admin Lazuna',
          role: 'Administrator',
          loginAt: new Date().toISOString()
        };

        try {
          sessionStorage.setItem('lazuna_posm_user', JSON.stringify(userData));
          localStorage.setItem('lazuna_posm_user', JSON.stringify(userData));
        } catch (err) {}

        if (onLogin) {
          onLogin(userData);
        }
        return;
      }

      // Jika akun tidak ditemukan
      setErrorMsg('Akun tidak terdaftar. Gunakan salah satu dari 5 akun resmi yang terdaftar.');
    }, 350);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F7FC] font-sans select-none">
      {/* ============================================================ */}
      {/* SISI KIRI: Background Slideshow (Ganti otomatis tiap 3 detik) */}
      {/* ============================================================ */}
      <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-slate-900">
        {SLIDES.map((slide, index) => (
          <img 
            key={index}
            src={slide} 
            alt={`Login Background ${index + 1}`} 
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
              currentSlide === index ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`} 
          />
        ))}

        {/* Indikator Slider (Dots Minimalis) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 items-center bg-black/25 backdrop-blur-xs px-2 py-1 rounded-full">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentSlide(index)}
              className={`h-1 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SISI KANAN: Panel Autentikasi / Form Login */}
      {/* ============================================================ */}
      <div className="w-full lg:w-[380px] xl:w-[410px] 2xl:w-[430px] shrink-0 bg-white flex flex-col justify-between p-6 sm:p-8 lg:p-10 z-20 min-h-screen border-l border-slate-100 shadow-xl lg:shadow-none">
        <div className="w-full max-w-[340px] mx-auto flex flex-col justify-between h-full">
          <div>
            {/* Logo Lazuna Chicken */}
            <div className="pt-2 sm:pt-4 pb-9 sm:pb-11 flex justify-center">
              <img 
                src="/lazuna.png" 
                alt="Lazuna Chicken" 
                className="h-10 sm:h-11 w-auto object-contain"
              />
            </div>

            {/* Navigation Tabs: Masuk / Buat Akun Baru / Lupa Password */}
            <div className="flex items-center gap-4 sm:gap-5 border-b border-slate-200 text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setErrorMsg('');
              }}
              className={`pb-3 font-semibold transition-all relative cursor-pointer whitespace-nowrap ${
                activeTab === 'signin' 
                  ? 'text-slate-900 font-bold' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Masuk
              {activeTab === 'signin' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff0000] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg('');
              }}
              className={`pb-3 font-medium transition-all relative cursor-pointer whitespace-nowrap ${
                activeTab === 'register' 
                  ? 'text-slate-900 font-bold' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Buat Akun
              {activeTab === 'register' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff0000] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('forgot');
                setErrorMsg('');
              }}
              className={`pb-3 font-medium transition-all relative cursor-pointer whitespace-nowrap ${
                activeTab === 'forgot' 
                  ? 'text-slate-900 font-bold' 
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Lupa Password
              {activeTab === 'forgot' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff0000] rounded-full" />
              )}
            </button>
          </div>

          {/* Subtext Paragraph */}
          <div className="mt-5">
            <p className="text-xs text-slate-500 leading-relaxed">
              {activeTab === 'signin' && 'Masuk ke Dashboard POSM Lazuna Chicken untuk memonitoring material promosi, kelola data gerai, dan verifikasi bukti foto cabang secara realtime.'}
              {activeTab === 'register' && 'Pendaftaran akun resmi dikelola secara internal oleh Departemen Marketing & Operasional Lazuna Chicken.'}
              {activeTab === 'forgot' && 'Panduan pemulihan dan reset kata sandi akun Dashboard POSM Lazuna Chicken.'}
            </p>
          </div>

          {/* Alert / Notification Feedback */}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200/90 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200/90 text-blue-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 text-blue-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* Form Content */}
          {activeTab === 'signin' ? (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Email / Username Input with @ icon */}
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <AtSign size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan email atau username"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 hover:border-slate-300 focus:border-[#ff0000] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff0000]/15 transition-all"
                  />
                </div>
              </div>

              {/* Password Input with Lock icon & Eye toggle */}
              <div className="space-y-1">
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs bg-white border border-slate-200 hover:border-slate-300 focus:border-[#ff0000] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff0000]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                    title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Primary CTA: Masuk ke Dashboard */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 h-10 bg-[#ff0000] hover:bg-[#e60000] active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-md shadow-[#ff0000]/20 transition-all cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses Masuk...
                  </span>
                ) : (
                  'Masuk ke Dashboard'
                )}
              </Button>
            </form>
          ) : activeTab === 'register' ? (
            /* Tab: Buat Akun Baru (Permintaan Akses) */
            <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-800">
                <HelpCircle size={18} className="text-[#ff0000]" />
                <h4 className="text-xs font-bold">Permintaan Akses Dashboard</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Akun staf operasional, tim survei lapangan, dan PIC cabang didaftarkan langsung melalui Super Admin Marketing Lazuna Chicken.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 rounded-xl font-medium cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </Button>
              </div>
            </div>
          ) : (
            /* Tab: Lupa Password (Hubungi Super Admin Marketing) */
            <div className="mt-6 p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-800">
                <KeyRound size={18} className="text-[#ff0000]" />
                <h4 className="text-xs font-bold">Pemulihan Kata Sandi</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Untuk alasan keamanan dan integritas data dashboard, reset atau pemulihan kata sandi dapat dilakukan dengan <strong>menghubungi Super Admin Marketing</strong> Lazuna Chicken.
              </p>
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-9 rounded-xl font-medium cursor-pointer"
                >
                  Kembali ke Halaman Masuk
                </Button>
              </div>
            </div>
          )}
        </div>

          {/* Footer Credit & Copyright */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>made with</span>
              <Heart size={13} className="text-[#ff0000] fill-[#ff0000] inline animate-pulse" />
              <span>by</span>
              <span className="font-semibold text-slate-700 hover:text-[#ff0000] transition-colors">
                Underlabs.id
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
