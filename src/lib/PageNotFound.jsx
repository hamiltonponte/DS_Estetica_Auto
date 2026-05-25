import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/brand/BrandLogo';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <BrandLogo size="xl" className="mx-auto mb-6" />
        <h1 className="text-6xl font-brand font-bold text-foreground mb-2">404</h1>
        <p className="text-muted-foreground mb-8">Página não encontrada</p>
        <Link to="/">
          <Button className="btn-brand">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao início
          </Button>
        </Link>
      </div>
    </div>
  );
}
