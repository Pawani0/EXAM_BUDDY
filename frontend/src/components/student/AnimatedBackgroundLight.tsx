import { useMemo } from "react";
import * as THREE from "three";

// Generate random bubble data
const generateBubbles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 100 + 20, // 20-120px
    left: Math.random() * 100, // 0-100vw
    top: Math.random() * 100, // 0-100vh
    opacity: Math.random() * 0.6 + 0.2, // 0.2-0.8
    scale: (Math.random() * 200 + 50) * 0.01, // 0.5-2.5
    duration: 30 + i * 0.02, // 30-30.6s
    delay: Math.random() * 5, // 0-5s delay
    moveX: (Math.random() - 0.5) * 200, // -100 to 100
    moveY: (Math.random() - 0.5) * 200, // -100 to 100
    keyframePercent: Math.random() * 30 + 30, // 30-60%
  }));
};

const Bubble = ({ bubble }: { bubble: any }) => {
  const animationStyle = useMemo(() => {
    const keyframes = `
      @keyframes bubble-move-${bubble.id} {
        0% {
          transform: translate(0, 0) scale(${bubble.scale});
        }
        ${bubble.keyframePercent}% {
          transform: translate(${bubble.moveX}vw, ${bubble.moveY}vh) scale(${bubble.scale * 1.5});
        }
        100% {
          transform: translate(0, 0) scale(${bubble.scale});
        }
      }
    `;
    
    // Inject keyframes into document
    const styleSheet = document.createElement("style");
    styleSheet.textContent = keyframes;
    document.head.appendChild(styleSheet);
    
    return {
      left: `${bubble.left}vw`,
      top: `${bubble.top}vh`,
      width: `${bubble.size}px`,
      height: `${bubble.size}px`,
      opacity: bubble.opacity,
      animation: `bubble-move-${bubble.id} ${bubble.duration}s infinite ease-in-out`,
      animationDelay: `${bubble.delay}s`,
    };
  }, [bubble]);

  return (
    <div
      className="absolute rounded-full"
      style={{
        ...animationStyle,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(2px)',
        boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
      }}
    />
  );
};

export const AnimatedBackgroundLight = () => {
    const bubbles = useMemo(() => generateBubbles(40), []);
    
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            {/* Beautiful gradient background */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(45deg, rgba(255,255,255,1) 0%, rgba(187,147,252,0.8) 26%, rgba(148,237,255,1) 50%, rgba(255,182,255,0.7) 75%, rgba(255,255,255,1) 100%)',
              }}
            />
            
            {/* Animated bubbles */}
            <div className="absolute inset-0">
              {bubbles.map((bubble) => (
                <Bubble key={bubble.id} bubble={bubble} />
              ))}
            </div>
            
            {/* Soft overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none" />
        </div>
    );
};
