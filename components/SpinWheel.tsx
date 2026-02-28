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
  source?: 'pre-sale' | 'post-sale'; // Origem da participação
  onComplete: (prizeCode: string, prizeName: string) => void;
}

// Gerar código único de prêmio
const generatePrizeCode = (name: string): string => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${initials}${random}`;
};

// Cores no padrão HelloGrowth - verde esmeralda, teal e tons complementares
const WHEEL_COLORS = [
  '#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1',
  '#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1',
  '#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1'
];


const SpinWheel: React.FC<SpinWheelProps> = ({ 
  prizes, 
  gameId, 
  campaignId,
  clientName, 
  clientEmail, 
  clientPhone,
  customMessage,
  source,
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
    ctx.shadowColor = 'rgba(13, 148, 136, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#F9FAFB';
    ctx.fill();
    ctx.restore();

    // Borda externa - verde esmeralda elegante
    ctx.beginPath();
    ctx.arc(center, center, radius + 6, 0, 2 * Math.PI);
    const borderGrad = ctx.createLinearGradient(0, 0, size, size);
    borderGrad.addColorStop(0, '#0D9488');
    borderGrad.addColorStop(0.3, '#14B8A6');
    borderGrad.addColorStop(0.5, '#0D9488');
    borderGrad.addColorStop(0.7, '#14B8A6');
    borderGrad.addColorStop(1, '#0D9488');
    ctx.fillStyle = borderGrad;
    ctx.fill();

    // Desenhar segmentos
    prizes.forEach((prize, i) => {
      const startAngle = rotation + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

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
      grad.addColorStop(0, lightenColor(color, 40));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Borda do segmento
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
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
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
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

    // Círculo central decorativo - verde esmeralda
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(center - 5, center - 5, 0, center, center, radius * 0.15);
    centerGrad.addColorStop(0, '#14B8A6');
    centerGrad.addColorStop(0.5, '#0D9488');
    centerGrad.addColorStop(1, '#0F766E');
    ctx.fillStyle = centerGrad;
    ctx.shadowColor = 'rgba(13, 148, 136, 0.3)';
    ctx.shadowBlur = 5;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Borda do círculo central
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, 2 * Math.PI);
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Estrela no centro
    drawStar(ctx, center, center, 5, radius * 0.08, radius * 0.04);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Pontos decorativos na borda
    const dotCount = prizes.length * 3;
    for (let i = 0; i < dotCount; i++) {
      const dotAngle = (i / dotCount) * 2 * Math.PI + rotation;
      const dotX = center + Math.cos(dotAngle) * (radius + 2);
      const dotY = center + Math.sin(dotAngle) * (radius + 2);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#A7F3D0';
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

    // Não setar wonPrize aqui - apenas após animação terminar
    // Gerar código único
    const code = generatePrizeCode(clientName);
    // setPrizeCode será setado após animação

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
          prize_code: code,
          source: source || 'post-sale'
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

    // ===== CÁLCULO DO ÂNGULO ALVO (CORRIGIDO) =====
    // A seta está no TOPO da roleta (posição -PI/2 ou 270° no sistema Canvas).
    // Os segmentos são desenhados a partir do ângulo 0 (direita), no sentido horário.
    // O segmento i ocupa de: rotation + i*segAngle até rotation + (i+1)*segAngle
    // Para que o CENTRO do segmento selectedIndex fique sob a seta (topo = -PI/2),
    // precisamos que: finalRotation + selectedIndex*segAngle + segAngle/2 ≡ -PI/2 (mod 2PI)
    // Ou seja: finalRotation = -PI/2 - selectedIndex*segAngle - segAngle/2
    const segmentAngle = (2 * Math.PI) / prizes.length;
    const desiredFinalRotation = -(Math.PI / 2) - (selectedIndex * segmentAngle) - (segmentAngle / 2);
    
    // Normalizar para valor positivo
    const normalizedDesired = ((desiredFinalRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const normalizedCurrent = ((rotationRef.current % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Diferença angular necessária (sempre positiva, sentido horário)
    let angleDiff = normalizedDesired - normalizedCurrent;
    if (angleDiff <= 0) angleDiff += 2 * Math.PI;
    
    // Adicionar voltas extras (8-12 voltas para efeito dramático)
    const extraSpins = (8 + Math.random() * 4) * 2 * Math.PI;
    const totalRotation = extraSpins + angleDiff;
    
    console.log('[SpinWheel DEBUG] Prêmio:', selectedPrize.name, '| Index:', selectedIndex);
    console.log('[SpinWheel DEBUG] Ângulo desejado:', (normalizedDesired * 180 / Math.PI).toFixed(1) + '°');
    console.log('[SpinWheel DEBUG] Rotação total:', (totalRotation * 180 / Math.PI).toFixed(1) + '°');

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
        // Setar wonPrize e prizeCode APENAS quando animação terminar
        setWonPrize(selectedPrize);
        setPrizeCode(code);
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
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
                  backgroundColor: ['#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1', '#F59E0B', '#EF4444'][i % 8],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full relative z-10">
        {!hasSpun ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                <Gift className="text-white" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Roleta da Sorte!</h2>
              <p className="text-gray-500 text-sm">{customMessage || 'Gire a roleta e ganhe um prêmio especial!'}</p>
            </div>

            {/* Roleta Canvas */}
            <div className="relative w-80 h-80 mx-auto mb-8">
              {/* Seta indicadora no topo */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div className="relative">
                  <svg width="36" height="36" viewBox="0 0 36 36">
                    <defs>
                      <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0D9488" />
                        <stop offset="100%" stopColor="#0F766E" />
                      </linearGradient>
                      <filter id="arrowShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15"/>
                      </filter>
                    </defs>
                    <polygon points="18,30 6,6 30,6" fill="url(#arrowGrad)" filter="url(#arrowShadow)" stroke="#FFFFFF" strokeWidth="1.5"/>
                  </svg>
                </div>
              </div>

              {/* Canvas da roleta */}
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full h-full"
                style={{ filter: isSpinning ? 'brightness(1.05)' : 'brightness(1)' }}
              />

              {/* Glow effect quando girando */}
              {isSpinning && (
                <div className="absolute inset-0 rounded-full bg-teal-500/5 animate-pulse pointer-events-none"></div>
              )}
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSpinning ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Girando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={22} />
                  <span>Girar Roleta</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-md animate-bounce">
                <Gift className="text-white" size={48} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Parabéns!</h2>
              <p className="text-gray-500 text-base mb-4">Você ganhou:</p>
              <div className="text-3xl font-bold text-teal-600 mb-6 leading-tight">
                {wonPrize?.name}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <p className="text-gray-600 text-sm">
                  {source === 'pre-sale' 
                    ? 'Seu código de resgate será enviado por WhatsApp ou Email'
                    : <>Seu código de resgate será enviado por <strong className="text-teal-600">WhatsApp</strong> ou <strong className="text-teal-600">Email</strong> após sua avaliação no Google.</>
                  }
                </p>
              </div>
            </div>

            {source === 'post-sale' && (
              <button
                onClick={handleContinue}
                className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <span>Continuar</span>
                <ArrowIcon />
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            Ambiente Seguro • Powered by HelloGrowth
          </p>
        </div>
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
