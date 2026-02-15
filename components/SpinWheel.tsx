import React, { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';

interface SpinWheelProps {
  onComplete: (prize: string) => void;
}

const SpinWheel: React.FC<SpinWheelProps> = ({ onComplete }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState('');

  const prizes = [
    { label: '10% OFF', color: '#10b981', probability: 0.3 },
    { label: '5% OFF', color: '#3b82f6', probability: 0.4 },
    { label: '15% OFF', color: '#f59e0b', probability: 0.2 },
    { label: 'Brinde', color: '#8b5cf6', probability: 0.1 }
  ];

  const handleSpin = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);

    // Selecionar prêmio baseado em probabilidade
    const random = Math.random();
    let cumulative = 0;
    let selectedPrize = prizes[0];

    for (const p of prizes) {
      cumulative += p.probability;
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
    setPrize(selectedPrize.label);

    // Após a animação (3s), mostrar resultado
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
    }, 3000);
  };

  const handleContinue = () => {
    onComplete(prize);
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
              <p className="text-gray-600">Gire a roleta e ganhe um prêmio especial</p>
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
                        {p.label}
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
              <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 mb-6">
                {prize}
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
