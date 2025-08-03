
"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Bike, LogIn, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import loginBg from '@/components/public/fox-back.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      // AuthContext handles redirection and success toast for successful login
    } catch (error: any) {
      // AuthContext's login function already shows an error toast.
      // No need to show another one here unless for specific page-level feedback.
      console.error("Login page caught error during login attempt:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // isLoading combines the auth context's global loading state and local form submission state
  const isLoading = isAuthLoading || isSubmitting;

  return (
    <div className="flex min-h-screen">
      {/* Left half with background image */}
      <div
        className="hidden md:flex w-1/2 bg-cover bg-center bg-no-repeat filter"
        style={{ backgroundImage: `url(${loginBg.src})` }}
      ></div>

      {/* Right half with login card */}
      <div className="flex w-full md:w-1/2 items-center shadow-2xl justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Bike className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">MotoFox POS</CardTitle>
            <CardDescription>Ingrese sus credenciales para acceder al sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-base"
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base"
                  disabled={isLoading}
                  placeholder="Contraseña"
                />
              </div>
              <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                {isLoading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            <p>Contacte a soporte si tiene problemas para iniciar sesión.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
