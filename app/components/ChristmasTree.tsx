'use client';

export default function ChristmasTree() {
  return (
    <div className="fixed bottom-0 right-52 w-[800px] h-auto z-0 pointer-events-none opacity-20 translate-x-1/4 translate-y-10 hidden md:block">
      <svg viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 나무 기둥 */}
        <rect x="42" y="130" width="16" height="20" fill="#5D4037" />
        
        {/* 잎 (3단) */}
        <path d="M50 20 L10 70 H90 L50 20 Z" fill="#2E7D32" />
        <path d="M50 50 L15 95 H85 L50 50 Z" fill="#388E3C" />
        <path d="M50 80 L20 130 H80 L50 80 Z" fill="#43A047" />
        
        {/* 장식 (별) */}
        <path d="M50 10 L53 18 H62 L55 24 L58 32 L50 27 L42 32 L45 24 L38 18 H47 Z" fill="#FFD700" />
        
        {/* 장식 (공) */}
        <circle cx="30" cy="60" r="3" fill="#D32F2F" />
        <circle cx="70" cy="60" r="3" fill="#1976D2" />
        <circle cx="40" cy="90" r="3" fill="#FBC02D" />
        <circle cx="60" cy="90" r="3" fill="#E64A19" />
        <circle cx="35" cy="120" r="3" fill="#7B1FA2" />
        <circle cx="65" cy="120" r="3" fill="#C2185B" />
        <circle cx="50" cy="110" r="3" fill="#FFA000" />
        
        {/* 반짝이는 조명 */}
        <circle cx="25" cy="55" r="2" fill="#FFEB3B" className="animate-twinkle-1" />
        <circle cx="75" cy="55" r="2" fill="#FF5722" className="animate-twinkle-2" />
        <circle cx="45" cy="45" r="2" fill="#E91E63" className="animate-twinkle-3" />
        <circle cx="55" cy="45" r="2" fill="#00BCD4" className="animate-twinkle-1" />
        <circle cx="35" cy="75" r="2" fill="#8BC34A" className="animate-twinkle-2" />
        <circle cx="65" cy="75" r="2" fill="#FFEB3B" className="animate-twinkle-3" />
        <circle cx="50" cy="70" r="2" fill="#FF9800" className="animate-twinkle-1" />
        <circle cx="30" cy="100" r="2" fill="#03A9F4" className="animate-twinkle-2" />
        <circle cx="70" cy="100" r="2" fill="#E91E63" className="animate-twinkle-3" />
        <circle cx="45" cy="95" r="2" fill="#CDDC39" className="animate-twinkle-1" />
        <circle cx="55" cy="95" r="2" fill="#FF5722" className="animate-twinkle-2" />
        <circle cx="28" cy="115" r="2" fill="#9C27B0" className="animate-twinkle-3" />
        <circle cx="72" cy="115" r="2" fill="#00BCD4" className="animate-twinkle-1" />
        <circle cx="42" cy="125" r="2" fill="#FFEB3B" className="animate-twinkle-2" />
        <circle cx="58" cy="125" r="2" fill="#4CAF50" className="animate-twinkle-3" />
      </svg>
      
      {/* 조명 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes twinkle-1 {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes twinkle-2 {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @keyframes twinkle-3 {
          0%, 33% { opacity: 1; }
          66%, 100% { opacity: 0.3; }
        }
        .animate-twinkle-1 {
          animation: twinkle-1 1.5s ease-in-out infinite;
        }
        .animate-twinkle-2 {
          animation: twinkle-2 1.5s ease-in-out infinite;
        }
        .animate-twinkle-3 {
          animation: twinkle-3 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
