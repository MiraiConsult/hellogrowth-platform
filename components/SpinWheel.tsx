import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Gift, Sparkles, Phone, Clock, Shield, CheckCircle, AlertCircle } from 'lucide-react';

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
  participationPolicy?: string;
  prizeValidityDays?: number;
  customMessage?: string;
  source?: 'pre-sale' | 'post-sale';
  onComplete: (prizeCode: string, prizeName: string) => void;
  onPhoneChange?: (phone: string) => void;
}

// Gerar código único de prêmio
const generatePrizeCode = (name: string): string => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${initials}${random}`;
};

const WHEEL_COLORS = [
  '#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1',
  '#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1',
  '#0D9488', '#10B981', '#14B8A6', '#059669', '#0EA5E9', '#6366F1'
];

const POLICY_LABELS: Record<string, string> = {
  unlimited: 'Participação ilimitada',
  once_per_day: 'Uma vez por dia',
  once_per_week: 'Uma vez por semana',
  once_per_month: 'Uma vez por mês',
  once_forever: 'Uma vez na vida',
};

const SpinWheel: React.FC<SpinWheelProps> = ({
  prizes,
  gameId,
  campaignId,
  clientName,
  clientEmail,
  clientPhone: initialPhone,
  participationPolicy = 'unlimited',
  prizeValidityDays = 7,
  customMessage,
  source,
  onComplete,
  onPhoneChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [prizeCode, setPrizeCode] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const animationRef = useRef<number | null>(null);
  const rotationRef = useRef(0);

  // Estado do telefone (obrigatório quando policy !== unlimited)
  const [phone, setPhone] = useState(initialPhone || '');
  const [phoneConfirmed, setPhoneConfirmed] = useState(participationPolicy === 'unlimited' && !!initialPhone);
  const [phoneError, setPhoneError] = useState('');
  const [checkingPhone, setCheckingPhone] = useState(false);

  // Estado de "já participou"
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [previousParticipation, setPreviousParticipation] = useState<{
    prize_won: string;
    prize_code: string;
    played_at: string;
    expires_at: string | null;
    status: string;
  } | null>(null);
  const [nextAvailable, setNextAvailable] = useState<string | null>(null);

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

    ctx.clearRect(0, 0, size, size);

    // Sombra externa
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.shadowColor = 'rgba(13, 148, 136, 0.25)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#F9FAFB';
    ctx.fill();
    ctx.restore();

    // Borda externa
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

    // Segmentos
    prizes.forEach((prize, i) => {
      const startAngle = rotation + i * segmentAngle;
      const endAngle = startAngle + segmentAngle;
      const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const midAngle = startAngle + segmentAngle / 2;
      const gradX = center + Math.cos(midAngle) * radius * 0.5;
      const gradY = center + Math.sin(midAngle) * radius * 0.5;
      const grad = ctx.createRadialGradient(gradX, gradY, 0, center, center, radius);
      grad.addColorStop(0, lightenColor(color, 40));
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texto
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(midAngle);
      const maxTextWidth = radius * 0.6;
      const fontSize = Math.min(14, Math.max(10, 160 / prizes.length));
      ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const words = prize.name.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach(word => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      });
      if (currentLine) lines.push(currentLine);

      const textX = radius * 0.6;
      const lineHeight = fontSize + 2;
      const totalHeight = lines.length * lineHeight;
      const startY = -totalHeight / 2 + lineHeight / 2;
      lines.forEach((line, lineIdx) => {
        ctx.fillText(line, textX, startY + lineIdx * lineHeight);
      });
      ctx.restore();
    });

    // Centro
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

    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, 2 * Math.PI);
    ctx.strokeStyle = '#0D9488';
    ctx.lineWidth = 3;
    ctx.stroke();

    drawStar(ctx, center, center, 5, radius * 0.08, radius * 0.04);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Pontos decorativos
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const displaySize = 320;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      canvas.width = displaySize;
      canvas.height = displaySize;
    }
    drawWheel(0);
  }, [drawWheel]);

  // Verificar participação por telefone
  const handleConfirmPhone = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setPhoneError('Digite um número de telefone válido com DDD');
      return;
    }

    if (participationPolicy === 'unlimited') {
      setPhoneConfirmed(true);
      onPhoneChange?.(cleanPhone);
      return;
    }

    setCheckingPhone(true);
    setPhoneError('');

    try {
      const response = await fetch(`/api/game-participations/check?game_id=${gameId}&phone=${cleanPhone}`);
      const data = await response.json();

      if (!data.can_play) {
        setAlreadyPlayed(true);
        setPreviousParticipation(data.previous_participation);
        setNextAvailable(data.next_available);
      } else {
        setPhoneConfirmed(true);
        onPhoneChange?.(cleanPhone);
      }
    } catch (error) {
      // Em caso de erro na verificação, permitir jogar (fail open)
      setPhoneConfirmed(true);
      onPhoneChange?.(cleanPhone);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSpin = async () => {
    if (isSpinning || hasSpun) return;
    setIsSpinning(true);

    const random = Math.random();
    let cumulative = 0;
    let selectedIndex = 0;
    for (let i = 0; i < prizes.length; i++) {
      cumulative += prizes[i].probability / 100;
      if (random <= cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const segmentAngle = (2 * Math.PI) / prizes.length;
    const code = generatePrizeCode(clientName);
    const cleanPhone = phone.replace(/\D/g, '');

    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.4;
    const targetRotation = -(Math.PI / 2) - (selectedIndex * segmentAngle) - (segmentAngle / 2) + randomOffset;
    const normalizedTarget = ((targetRotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const normalizedCurrent = ((rotationRef.current % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    let angleDiff = normalizedTarget - normalizedCurrent;
    if (angleDiff <= 0) angleDiff += 2 * Math.PI;

    const extraSpins = (8 + Math.floor(Math.random() * 5)) * 2 * Math.PI;
    const totalRotation = extraSpins + angleDiff;
    const startRotation = rotationRef.current;
    const endRotation = startRotation + totalRotation;

    const arrowAngleInWheel = ((-Math.PI / 2 - endRotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const actualIndex = Math.floor(arrowAngleInWheel / segmentAngle) % prizes.length;
    const selectedPrize = prizes[actualIndex];

    // Calcular data de expiração do prêmio
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (prizeValidityDays || 7));

    // Salvar participação
    try {
      await fetch('/api/game-participations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          campaign_id: campaignId || null,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: cleanPhone || initialPhone,
          prize_won: selectedPrize.name,
          prize_code: code,
          source: source || 'post-sale',
          expires_at: expiresAt.toISOString(),
        })
      });
    } catch (error) {
      console.error('Erro ao salvar participação:', error);
    }

    // Animar
    const startTime = performance.now();
    const duration = 5000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ─── TELA: JÁ PARTICIPOU ────────────────────────────────────────────────────
  if (alreadyPlayed && previousParticipation) {
    const playedDate = new Date(previousParticipation.played_at).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const isExpired = previousParticipation.expires_at && new Date(previousParticipation.expires_at) < new Date();
    const expiresDate = previousParticipation.expires_at
      ? new Date(previousParticipation.expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    let nextText = '';
    if (nextAvailable) {
      const nextDate = new Date(nextAvailable);
      if (participationPolicy === 'once_per_day') {
        nextText = `Você poderá jogar novamente amanhã, ${nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.`;
      } else if (participationPolicy === 'once_per_week') {
        nextText = `Você poderá jogar novamente na próxima semana.`;
      } else if (participationPolicy === 'once_per_month') {
        nextText = `Você poderá jogar novamente no próximo mês.`;
      }
    } else if (participationPolicy === 'once_forever') {
      nextText = 'Esta roleta permite apenas uma participação por pessoa.';
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="text-teal-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Você já participou!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Encontramos uma participação anterior com este número de telefone.
            </p>

            {/* Prêmio anterior */}
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4 text-left">
              <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-2">Seu prêmio anterior</p>
              <p className="text-xl font-bold text-teal-700 mb-1">{previousParticipation.prize_won}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-mono bg-teal-100 text-teal-800 px-2 py-1 rounded font-bold tracking-wider">
                  {previousParticipation.prize_code}
                </span>
                {isExpired ? (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-medium">Expirado</span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded font-medium">Válido</span>
                )}
              </div>
              {expiresDate && !isExpired && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock size={12} />
                  Válido até {expiresDate}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">Participou em {playedDate}</p>
            </div>

            {/* Quando pode jogar de novo */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-start gap-2 text-left">
              <Shield size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-amber-700">{POLICY_LABELS[participationPolicy] || 'Participação controlada'}</p>
                <p className="text-xs text-amber-600 mt-0.5">{nextText}</p>
              </div>
            </div>

            {!isExpired && (
              <p className="text-sm text-gray-600">
                Apresente o código <strong className="text-teal-600">{previousParticipation.prize_code}</strong> para resgatar seu prêmio.
              </p>
            )}
          </div>

          <div className="text-center mt-4">
            <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Ambiente Seguro • Powered by HelloGrowth
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── TELA: CONFIRMAR TELEFONE (quando policy !== unlimited e telefone não confirmado) ──
  if (!phoneConfirmed && participationPolicy !== 'unlimited') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-100">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-md">
              <Phone className="text-white" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirme seu telefone</h2>
            <p className="text-gray-500 text-sm mb-6">
              Para garantir uma participação justa, precisamos verificar seu número de telefone antes de liberar a roleta.
            </p>

            <div className="mb-4 text-left">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirmPhone()}
                placeholder="(47) 99999-9999"
                className={`w-full px-4 py-3 border rounded-xl text-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  phoneError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {phoneError && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {phoneError}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 flex items-start gap-2 text-left">
              <Shield size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>{POLICY_LABELS[participationPolicy] || 'Participação controlada'}.</strong>{' '}
                Cada número pode participar apenas dentro do período permitido.
              </p>
            </div>

            <button
              onClick={handleConfirmPhone}
              disabled={checkingPhone || !phone.trim()}
              className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-md hover:shadow-lg hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {checkingPhone ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>Continuar para a Roleta</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-4">
            <p className="text-gray-400 text-xs flex items-center justify-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              Ambiente Seguro • Powered by HelloGrowth
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── TELA PRINCIPAL: ROLETA ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {Array.from({ length: 50 }).map((_, i) => (
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
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <defs>
                    <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0D9488" />
                      <stop offset="100%" stopColor="#0F766E" />
                    </linearGradient>
                    <filter id="arrowShadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
                    </filter>
                  </defs>
                  <polygon points="18,30 6,6 30,6" fill="url(#arrowGrad)" filter="url(#arrowShadow)" stroke="#FFFFFF" strokeWidth="1.5" />
                </svg>
              </div>

              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="w-full h-full"
                style={{ filter: isSpinning ? 'brightness(1.05)' : 'brightness(1)' }}
              />

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
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
              <div className="text-3xl font-bold text-teal-600 mb-4 leading-tight">
                {wonPrize?.name}
              </div>

              {/* Código do prêmio */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-teal-600 font-semibold uppercase tracking-wide mb-1">Seu código de resgate</p>
                <p className="text-2xl font-mono font-bold text-teal-700 tracking-wider">{prizeCode}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
                  <Clock size={11} />
                  Válido por {prizeValidityDays} dias
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                <p className="text-gray-600 text-sm">
                  {source === 'pre-sale'
                    ? 'Apresente este código para resgatar seu prêmio.'
                    : <>Seu código também será enviado por <strong className="text-teal-600">WhatsApp</strong> ou <strong className="text-teal-600">Email</strong> após sua avaliação no Google.</>
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

const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

export default SpinWheel;
