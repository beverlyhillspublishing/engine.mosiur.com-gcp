'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await authApi.register(data);
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr?.response?.data?.error || 'Registration failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
            <p className="text-slate-600 mb-6">We&apos;ve sent a verification link to your email address. Click it to activate your account.</p>
            <Link href="/login"><Button className="w-full">Go to Sign in</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl">TechyPark</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Get 1,000 free emails every month, no credit card required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>First name</Label>
                  <Input placeholder="Jane" {...register('firstName')} />
                  {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Last name</Label>
                  <Input placeholder="Smith" {...register('lastName')} />
                  {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" placeholder="you@company.com" {...register('email')} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Password</Label>
                <Input type="password" placeholder="At least 8 characters" {...register('password')} />
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <Label>Organization name</Label>
                <Input placeholder="Acme Corp" {...register('organizationName')} />
                {errors.organizationName && <p className="text-xs text-red-600">{errors.organizationName.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-xs text-slate-500 text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
