export default function SplashScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-noris-500">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-16 h-16">
            <path d="M50 22 C33 22 20 33 20 48 C20 54 22 60 26 64 L22 78 L38 74 C42 76 46 76 50 76 C67 76 80 65 80 50 C80 35 67 22 50 22 Z" fill="white"/>
            <circle cx="38" cy="48" r="4" fill="#0088cc"/>
            <circle cx="50" cy="48" r="4" fill="#0088cc"/>
            <circle cx="62" cy="48" r="4" fill="#0088cc"/>
          </svg>
        </div>
        <div className="text-white text-3xl font-bold tracking-tight">Noris</div>
        <div className="text-white/60 text-sm">Secure messaging</div>
      </div>
    </div>
  );
}
