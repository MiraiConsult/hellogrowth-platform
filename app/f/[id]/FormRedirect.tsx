'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FormRedirect({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/?form=${id}`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Carregando formulário...</p>
      </div>
    </div>
  );
}
