import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Gift, Sparkles } from 'lucide-react';

interface Prize {
  name: string;
  probability: number;
  color: string;
}

interface SpinWheelProps {
  prizes: Prize[];
  gameId: string;
  campaignId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  customMessage?: string;
  onComplete: (prizeCode: string, prizeName: string) => void;
}

// Gerar código único de prêmio
const generatePrizeCode = (name: string): string => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${initials}${random}`;
};

// Cores vibrantes para a roleta
const WHEEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#FF8C42', '#6C5CE7', '#00B894', '#FD79A8', '#74B9FF', '#A29BFE',
  '#55EFC4', '#FF7675', '#FDCB6E', '#E17055', '#00CEC9', '#6C5CE7'
];


const SpinWheel: React.FC<SpinWheelProps> = ({ 
  prizes, 
  gameId, 
  campaignId,
  clientName, 
  clientEmail, 
  clientPhone,
  customMessage,
  onComplete 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [prizeCode, setPrizeCode] = useState('');
  const [currentRotation, setCurrentRotation] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const animationRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  // Desenhar a roleta no Canvas
  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 12;
    const segmentAngle = (2 * Math.PI) / prizes.length;

    // Limpar canvas
    ctx.clearRect(0, 0, size, size);

    // Sombra externa da roleta
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#2D3436';
    ctx.fill();
    ctx.restore();

    // Borda externa dourada
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, 2 * Math.PI);
    const borderGrad = ctx.createLinearGradient(0, 0, size, size);
    borderGrad.addColorStop(0, '#FFD700');
    borderGrad.addColorStop(0.3, '#FFA500');
    borderGrad.addColorStop(0.5, '#FFD700');
    borderGrad.addColorStop(0.7, '#FFA500');
    borderGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = borderGrad;
    ctx.fill();

    // Desenhar segmentos
    prizes.forEach((prize, i) => {
      const startAngle = rotation + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const color = prize.color || WHEEL_COLORS[i % WHEEL_COLORS.length];

      // Segmento
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      // Gradiente radial para dar profundidade
      const midAngle = startAngle + segmentAngle / 2;
      const gradX = center + Math.cos(midAngle) * radius * 0.5;
      const gradY = center + Math.sin(midAngle) * radius * 0.5;
      const grad = ctx.createRadialGradient(gradX, gradY, 0, center, center, radius);
      grad.addColorStop(0, lightenColor(color, 30));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Borda do segmento
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto do prêmio
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(midAngle);

      // Configurar texto
      const maxTextWidth = radius * 0.6;
      const fontSize = Math.min(14, Math.max(10, 160 / prizes.length));
      ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Sombra do texto
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // Quebrar texto em linhas se necessário
      const words = prize.name.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);

      // Posicionar texto no meio do segmento
      const textX = radius * 0.6;
      const lineHeight = fontSize + 2;
      const totalHeight = lines.length * lineHeight;
      const startY = -totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, lineIdx) => {
        ctx.fillText(line, textX, startY + lineIdx * lineHeight);
      });

      ctx.restore();
    });

    // Círculo central decorativo
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(center - 5, center - 5, 0, center, center, radius * 0.15);
    centerGrad.addColorStop(0, '#FFD700');
    centerGrad.addColorStop(0.5, '#FFA500');
    centerGrad.addColorStop(1, '#FF8C00');
    ctx.fillStyle = centerGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Borda do círculo central
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Estrela no centro
    drawStar(ctx, center, center, 5, radius * 0.08, radius * 0.04);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Pontos decorativos na borda (como LEDs)
    const dotCount = prizes.length * 3;
    for (let i = 0; i < dotCount; i++) {
      const dotAngle = (i / dotCount) * 2 * Math.PI + rotation;
      const dotX = center + Math.cos(dotAngle) * (radius + 2);
      const dotY = center + Math.sin(dotAngle) * (radius + 2);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#FFFFFF';
      ctx.fill();
    }
  }, [prizes]);

  // Desenhar estrela
  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  };

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Suporte a telas de alta resolução
    const dpr = window.devicePixelRatio || 1;
    const displaySize = 320;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      // Resetar dimensões para desenho
      canvas.width = displaySize;
      canvas.height = displaySize;
    }
    
    drawWheel(0);
  }, [drawWheel]);

  const handleSpin = async () => {
    if (isSpinning || hasSpun) return;
    setIsSpinning(true);

    // Selecionar prêmio baseado em probabilidade
    const random = Math.random();
    let cumulative = 0;
    let selectedPrize = prizes[0];
    let selectedIndex = 0;

    for (let i = 0; i < prizes.length; i++) {
      cumulative += prizes[i].probability / 100;
      if (random <= cumulative) {
        selectedPrize = prizes[i];
        selectedIndex = i;
        break;
      }
    }

    setWonPrize(selectedPrize);

    // Gerar código único
    const code = generatePrizeCode(clientName);
    setPrizeCode(code);

    // Salvar participação no banco ANTES da animação
    try {
      const response = await fetch('/api/game-participations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          campaign_id: campaignId || null,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          prize_won: selectedPrize.name,
          prize_code: code
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao salvar participação:', response.status, errorText);
      } else {
        console.log('Participação salva com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar participação:', error);
    }

    // Calcular ângulo alvo (a seta está no topo = -PI/2)
    const segmentAngle = (2 * Math.PI) / prizes.length;
    // O prêmio selecionado deve parar na posição da seta (topo)
    // A seta aponta para -PI/2 (topo), então precisamos que o meio do segmento selecionado fique em -PI/2
    const targetAngle = -(selectedIndex * segmentAngle + segmentAngle / 2) - Math.PI / 2;
    
    // Adicionar voltas extras (8-12 voltas para efeito dramático)
    const extraSpins = (8 + Math.random() * 4) * 2 * Math.PI;
    const totalRotation = extraSpins + targetAngle - rotationRef.current;

    // Animação suave com easing
    const startTime = performance.now();
    const duration = 5000; // 5 segundos
    const startRotation = rotationRef.current;
    const endRotation = startRotation + totalRotation;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: cubic ease-out para desaceleração natural
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const newRotation = startRotation + totalRotation * eased;
      rotationRef.current = newRotation;
      
      drawWheel(newRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = endRotation;
        setIsSpinning(false);
        setHasSpun(true);
        setShowConfetti(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const handleContinue = () => {
    onComplete(prizeCode, wonPrize?.name || '');
  };

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {Array.from({length: 50}).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              <div
                className="w-2 h-3 rounded-sm"
                style={{
                  backgroundColor: WHEEL_COLORS[i % WHEEL_COLORS.length],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full relative z-10">
        {!hasSpun ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center border border-white/20">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30">
                <Gift className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-2">Roleta da Sorte!</h2>
              <p className="text-white/70">{customMessage || 'Gire a roleta e ganhe um prêmio especial!'}</p>
            </div>

            {/* Roleta Canvas */}
            <div className="relative w-80 h-80 mx-auto mb-8">
              {/* Seta indicadora no topo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div className="relative">
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <defs>
                      <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FF4757" />
                        <stop offset="100%" stopColor="#C0392B" />
                      </linearGradient>
                      <filter id="arrowShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.3"/>
                      </filter>
                    </defs>
                    <polygon points="18,30 6,6 30,6" fill="url(#arrowGrad)" filter="url(#arrowShadow)" stroke="#FFD700" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>

              {/* Canvas da roleta */}
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full h-full"
                style={{ filter: isSpinning ? 'brightness(1.1)' : 'brightness(1)' }}
              />

              {/* Glow effect quando girando */}
              {isSpinning && (
                <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse pointer-events-none"></div>
              )}
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-2xl font-extrabold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSpinning ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Girando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>GIRAR ROLETA!</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center border border-white/20 animate-in zoom-in duration-500">
            <div className="mb-6">
              <div className="w-28 h-28 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/40 animate-bounce">
                <Gift className="text-white" size={56} />
              </div>
              <h2 className="text-4xl font-extrabold text-white mb-3">Parabéns! 🎉</h2>
              <p className="text-white/70 text-lg mb-4">Você ganhou:</p>
              <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 text-transparent bg-clip-text text-4xl font-black mb-6 leading-tight">
                {wonPrize?.name}
              </div>
              <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
                <p className="text-white/80 text-sm">
                  Seu código de resgate será enviado por <strong className="text-yellow-400">WhatsApp</strong> ou <strong className="text-yellow-400">Email</strong> após sua avaliação no Google.
                </p>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-2xl font-extrabold text-lg shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <span>Continuar</span>
              <ArrowIcon />
            </button>
          </div>
        )}
      </div>


    </div>
  );
};

// Componente de seta
const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Clarear cor
function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export default SpinWheel;
