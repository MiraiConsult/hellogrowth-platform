import React, { useState } from 'react';
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

// Gerar código único de prêmio (ex: DG10X, FR15Y)
const generatePrizeCode = (name: string): string => {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${initials}${random}`;
};

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
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [prizeCode, setPrizeCode] = useState('');

  const handleSpin = async () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);

    // Selecionar prêmio baseado em probabilidade
    const random = Math.random();
    let cumulative = 0;
    let selectedPrize = prizes[0];

    for (const p of prizes) {
      cumulative += p.probability / 100; // Converter % para decimal
      if (random <= cumulative) {
        selectedPrize = p;
        break;
      }
    }

    // Calcular rotação (5 voltas completas + ângulo do prêmio)
    const prizeIndex = prizes.indexOf(selectedPrize);
    const segmentAngle = 360 / prizes.length;
    const targetAngle = prizeIndex * segmentAngle;
    const spins = 5; // número de voltas completas
    const finalRotation = spins * 360 + targetAngle;

    setRotation(finalRotation);
    setWonPrize(selectedPrize);

    // Gerar código único
    const code = generatePrizeCode(clientName);
    setPrizeCode(code);

    // Salvar participação no banco
    try {
      const response = await fetch('/api/game-participations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          campaign_id: campaignId,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          prize_won: selectedPrize.name,
          prize_code: code
        })
      });

      if (!response.ok) {
        console.error('Erro ao salvar participação:', await response.text());
      }
    } catch (error) {
      console.error('Erro ao salvar participação:', error);
    }

    // Após a animação (3s), mostrar resultado
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
    }, 3000);
  };

  const handleContinue = () => {
    onComplete(prizeCode, wonPrize?.name || '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
        {!hasSpun ? (
          <>
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
                <Gift className="text-white" size={40} />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Roleta da Sorte!</h2>
              <p className="text-gray-600">{customMessage || 'Gire a roleta e ganhe um prêmio especial'}</p>
            </div>

            {/* Roleta */}
            <div className="relative w-64 h-64 mx-auto mb-8">
              {/* Indicador (seta) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-red-500"></div>
              </div>

              {/* Círculo da roleta */}
              <div
                className="w-full h-full rounded-full border-8 border-gray-200 shadow-xl relative overflow-hidden transition-transform duration-[3000ms] ease-out"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  background: `conic-gradient(
                    ${prizes.map((p, i) => {
                      const start = (i / prizes.length) * 360;
                      const end = ((i + 1) / prizes.length) * 360;
                      return `${p.color} ${start}deg ${end}deg`;
                    }).join(', ')}
                  )`
                }}
              >
                {/* Labels dos prêmios */}
                {prizes.map((p, i) => {
                  const angle = (i / prizes.length) * 360 + (360 / prizes.length / 2);
                  return (
                    <div
                      key={i}
                      className="absolute top-1/2 left-1/2 origin-left"
                      style={{
                        transform: `rotate(${angle}deg) translateX(60px)`,
                        width: '80px'
                      }}
                    >
                      <span className="text-white font-bold text-sm block -rotate-90 whitespace-nowrap">
                        {p.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSpinning ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                  Girando...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Girar Roleta
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <Gift className="text-white" size={48} />
              </div>
              <h2 className="text-4xl font-bold text-gray-800 mb-2">Parabéns! 🎉</h2>
              <p className="text-gray-600 mb-4">Você ganhou:</p>
              <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-4">
                {wonPrize?.name}
              </div>
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Seu código de prêmio:</p>
                <p className="text-2xl font-mono font-bold text-gray-800">{prizeCode}</p>
                <p className="text-xs text-gray-500 mt-2">Guarde este código para resgatar seu prêmio</p>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
            >
              Continuar →
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default SpinWheel;
