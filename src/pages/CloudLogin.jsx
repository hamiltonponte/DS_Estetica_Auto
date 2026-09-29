import React, { useState } from 'react';
import { Cloud, Loader2, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/AuthLayout';
import { useCloudAuth } from '@/lib/cloud/CloudAuthContext';
import { skipCloudLogin } from '@/lib/cloud/cloudConfig';
import { toast } from '@/components/ui/use-toast';

export default function CloudLogin() {
  const { login, syncing } = useCloudAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast({ title: 'Login realizado. Sincronizando dados...' });
    } catch (err) {
      setError(err.message || 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    skipCloudLogin();
    toast({
      title: 'Modo só neste aparelho',
      description: 'Para o link do Instagram funcionar, entre na nuvem depois.',
    });
    window.location.reload();
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="DS Estética Auto"
      subtitle="Entre para sincronizar os dados do seu negócio na nuvem"
      footer={
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Seus dados continuam salvos offline no aparelho. Após o login, o app sincroniza
          automaticamente com o servidor seguro.
        </p>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Senha</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
          />
        </div>
        <Button type="submit" className="w-full h-12" disabled={loading || syncing}>
          {loading || syncing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {syncing ? 'Sincronizando...' : 'Entrando...'}
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 mr-2" />
              Entrar e sincronizar
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={handleSkip}
          disabled={loading || syncing}
        >
          Continuar só neste aparelho
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Cloud className="w-4 h-4 text-accent" />
          Link do Instagram
        </p>
        <p>
          Para clientes agendarem pelo Instagram e o horário aparecer em Agendados,
          entre na nuvem (os dados locais não são apagados).
        </p>
        <p className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Depois do login, cada alteração é enviada para a nuvem quando houver internet.
        </p>
      </div>
    </AuthLayout>
  );
}
