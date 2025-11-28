'use client';

import { useEffect, useState } from 'react';

export default function PlayingAnimation() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-72 left-96 z-20 pointer-events-none select-none">
      <div className="relative w-48 h-32">
        {/* 아이와 강아지 컨테이너 - 좌우로 이동 */}
        <div className="animate-move-horizontal absolute bottom-3">
          {/* 아이 */}
          <div className="relative animate-bounce-gentle">
            {/* 머리 */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-200 rounded-full border-2 border-amber-300">
              {/* 머리카락 */}
              <div className="absolute -top-1 left-1 w-6 h-3 bg-amber-900 rounded-t-full" />
              {/* 눈 */}
              <div className="absolute top-3 left-1.5 w-1.5 h-1.5 bg-zinc-800 rounded-full animate-blink" />
              <div className="absolute top-3 right-1.5 w-1.5 h-1.5 bg-zinc-800 rounded-full animate-blink" />
              {/* 볼 홍조 */}
              <div className="absolute top-4 left-0.5 w-1.5 h-1 bg-pink-300 rounded-full opacity-70" />
              <div className="absolute top-4 right-0.5 w-1.5 h-1 bg-pink-300 rounded-full opacity-70" />
              {/* 입 - 웃는 모양 */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-1 border-b-2 border-zinc-700 rounded-b-full" />
            </div>
            
            {/* 몸통 */}
            <div className="absolute top-7 left-1/2 -translate-x-1/2 w-7 h-10 bg-rose-400 rounded-lg border-2 border-rose-500">
              {/* 옷 무늬 */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-rose-300 rounded-full" />
            </div>
            
            {/* 왼팔 */}
            <div className="absolute top-8 -left-1 w-2 h-6 bg-amber-200 rounded-full border border-amber-300 origin-top animate-arm-swing" />
            
            {/* 오른팔 */}
            <div className="absolute top-8 right-1 w-2 h-6 bg-amber-200 rounded-full border border-amber-300 origin-top animate-arm-swing-reverse" />
            
            {/* 왼다리 */}
            <div className="absolute top-16 left-1 w-2.5 h-7 bg-sky-400 rounded-full border border-sky-500 origin-top animate-leg-swing" />
            
            {/* 오른다리 */}
            <div className="absolute top-16 right-1 w-2.5 h-7 bg-sky-400 rounded-full border border-sky-500 origin-top animate-leg-swing-reverse" />
            
            {/* 신발 */}
            <div className="absolute bottom-0 left-0 w-3.5 h-2 bg-zinc-700 rounded-full animate-leg-swing origin-top" style={{ top: '88px', left: '-1px' }} />
            <div className="absolute bottom-0 right-0 w-3.5 h-2 bg-zinc-700 rounded-full animate-leg-swing-reverse origin-top" style={{ top: '88px', right: '-1px' }} />
          </div>
          
          {/* 강아지 */}
          <div className="absolute left-14 top-8 animate-bounce-dog">
            {/* 몸통 */}
            <div className="relative w-10 h-6 bg-amber-600 rounded-full border-2 border-amber-700">
              {/* 무늬 */}
              <div className="absolute top-1 left-2 w-3 h-2 bg-amber-500 rounded-full" />
            </div>
            
            {/* 머리 */}
            <div className="absolute -top-3 -left-2 w-6 h-5 bg-amber-600 rounded-full border-2 border-amber-700">
              {/* 귀 왼쪽 */}
              <div className="absolute -top-1 -left-1 w-2.5 h-4 bg-amber-700 rounded-full origin-bottom animate-ear-flop" />
              {/* 귀 오른쪽 */}
              <div className="absolute -top-1 right-0 w-2.5 h-4 bg-amber-700 rounded-full origin-bottom animate-ear-flop-reverse" />
              {/* 눈 */}
              <div className="absolute top-1.5 left-1 w-1.5 h-1.5 bg-zinc-800 rounded-full" />
              <div className="absolute top-1.5 right-1 w-1.5 h-1.5 bg-zinc-800 rounded-full" />
              {/* 코 */}
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-1.5 bg-zinc-800 rounded-full" />
              {/* 혀 */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-pink-400 rounded-b-full animate-tongue" />
            </div>
            
            {/* 꼬리 */}
            <div className="absolute -right-1 -top-1 w-1.5 h-5 bg-amber-600 rounded-full origin-bottom animate-tail-wag border border-amber-700" />
            
            {/* 앞다리 */}
            <div className="absolute bottom-0 left-1 w-1.5 h-4 bg-amber-600 rounded-b-full border border-amber-700 origin-top animate-dog-leg" style={{ top: '16px' }} />
            <div className="absolute bottom-0 left-3.5 w-1.5 h-4 bg-amber-600 rounded-b-full border border-amber-700 origin-top animate-dog-leg-reverse" style={{ top: '16px' }} />
            
            {/* 뒷다리 */}
            <div className="absolute bottom-0 right-1 w-1.5 h-4 bg-amber-600 rounded-b-full border border-amber-700 origin-top animate-dog-leg-reverse" style={{ top: '16px' }} />
            <div className="absolute bottom-0 right-3.5 w-1.5 h-4 bg-amber-600 rounded-b-full border border-amber-700 origin-top animate-dog-leg" style={{ top: '16px' }} />
          </div>
        </div>
        
        {/* 움직이는 먼지/발자국 효과 */}
        <div className="absolute bottom-2 left-8 animate-dust">
          <div className="w-1 h-1 bg-amber-300/50 rounded-full" />
        </div>
        <div className="absolute bottom-2 left-12 animate-dust" style={{ animationDelay: '0.2s' }}>
          <div className="w-1.5 h-1.5 bg-amber-300/40 rounded-full" />
        </div>
      </div>
      
      {/* 커스텀 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes move-horizontal {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(80px);
          }
        }
        
        @keyframes bounce-gentle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        
        @keyframes bounce-dog {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        @keyframes arm-swing {
          0%, 100% {
            transform: rotate(-20deg);
          }
          50% {
            transform: rotate(20deg);
          }
        }
        
        @keyframes arm-swing-reverse {
          0%, 100% {
            transform: rotate(20deg);
          }
          50% {
            transform: rotate(-20deg);
          }
        }
        
        @keyframes leg-swing {
          0%, 100% {
            transform: rotate(-15deg);
          }
          50% {
            transform: rotate(15deg);
          }
        }
        
        @keyframes leg-swing-reverse {
          0%, 100% {
            transform: rotate(15deg);
          }
          50% {
            transform: rotate(-15deg);
          }
        }
        
        @keyframes tail-wag {
          0%, 100% {
            transform: rotate(-30deg);
          }
          50% {
            transform: rotate(30deg);
          }
        }
        
        @keyframes ear-flop {
          0%, 100% {
            transform: rotate(-5deg);
          }
          50% {
            transform: rotate(5deg);
          }
        }
        
        @keyframes ear-flop-reverse {
          0%, 100% {
            transform: rotate(5deg);
          }
          50% {
            transform: rotate(-5deg);
          }
        }
        
        @keyframes dog-leg {
          0%, 100% {
            transform: rotate(-20deg);
          }
          50% {
            transform: rotate(20deg);
          }
        }
        
        @keyframes dog-leg-reverse {
          0%, 100% {
            transform: rotate(20deg);
          }
          50% {
            transform: rotate(-20deg);
          }
        }
        
        @keyframes tongue {
          0%, 100% {
            transform: translateX(-50%) scaleY(1);
          }
          50% {
            transform: translateX(-50%) scaleY(0.7);
          }
        }
        
        @keyframes blink {
          0%, 90%, 100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }
        
        @keyframes dust {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.5);
          }
          50% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: translateY(-10px) scale(1.5);
          }
        }
        
        .animate-move-horizontal {
          animation: move-horizontal 4s ease-in-out infinite;
        }
        
        .animate-bounce-gentle {
          animation: bounce-gentle 0.5s ease-in-out infinite;
        }
        
        .animate-bounce-dog {
          animation: bounce-dog 0.35s ease-in-out infinite;
        }
        
        .animate-arm-swing {
          animation: arm-swing 0.5s ease-in-out infinite;
        }
        
        .animate-arm-swing-reverse {
          animation: arm-swing-reverse 0.5s ease-in-out infinite;
        }
        
        .animate-leg-swing {
          animation: leg-swing 0.25s ease-in-out infinite;
        }
        
        .animate-leg-swing-reverse {
          animation: leg-swing-reverse 0.25s ease-in-out infinite;
        }
        
        .animate-tail-wag {
          animation: tail-wag 0.2s ease-in-out infinite;
        }
        
        .animate-ear-flop {
          animation: ear-flop 0.35s ease-in-out infinite;
        }
        
        .animate-ear-flop-reverse {
          animation: ear-flop-reverse 0.35s ease-in-out infinite;
        }
        
        .animate-dog-leg {
          animation: dog-leg 0.25s ease-in-out infinite;
        }
        
        .animate-dog-leg-reverse {
          animation: dog-leg-reverse 0.25s ease-in-out infinite;
        }
        
        .animate-tongue {
          animation: tongue 0.5s ease-in-out infinite;
        }
        
        .animate-blink {
          animation: blink 3s ease-in-out infinite;
        }
        
        .animate-dust {
          animation: dust 0.8s ease-out infinite;
        }
      `}</style>
    </div>
  );
}

