'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trash2, PenLine } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSignatureChange, width = 600, height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getCanvas = () => canvasRef.current;
  const getCtx = () => canvasRef.current?.getContext('2d');

  const getPos = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const canvas = getCanvas();
    if (!canvas) return;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    lastPos.current = pos;
    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
    }
  }, []);

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    lastPos.current = pos;
    setIsEmpty(false);
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
    const canvas = getCanvas();
    if (canvas && !isEmpty) {
      onSignatureChange(canvas.toDataURL('image/png'));
    }
  }, [isEmpty, onSignatureChange]);

  useEffect(() => {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  const clearSignature = () => {
    const canvas = getCanvas();
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative border-2 border-dashed border-violet-300 rounded-xl bg-white overflow-hidden"
           style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full cursor-crosshair block"
          style={{ height: '180px', touchAction: 'none' }}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <PenLine size={28} className="text-violet-300 mb-2" />
            <p className="text-sm text-violet-400 font-medium">Assine aqui com o dedo ou mouse</p>
          </div>
        )}
        {/* Linha de base */}
        <div className="absolute bottom-10 left-8 right-8 border-b border-gray-200 pointer-events-none" />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-400">
          {isEmpty ? 'Nenhuma assinatura registrada' : '✓ Assinatura registrada'}
        </p>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 size={12} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
};

export default SignaturePad;
