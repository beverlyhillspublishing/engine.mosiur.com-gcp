import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Zap, Users, Mail, Shield, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Nav */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl">TechyPark</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link href="/register"><Button>Start for free</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-200">The Email Marketing Revolution</Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
          Email marketing that
          <span className="text-primary block mt-2">actually converts</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          Build beautiful campaigns, automate your sequences, and grow your audience with the platform
          that puts deliverability and analytics first.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/register"><Button size="lg" className="text-base px-8">Get started free</Button></Link>
          <Link href="/login"><Button size="lg" variant="outline" className="text-base px-8">Sign in</Button></Link>
        </div>
        <p className="text-sm text-slate-500 mt-4">No credit card required. 1,000 emails free every month.</p>
      </section>

      {/* Stats */}
      <section className="bg-primary text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '99.9%', label: 'Uptime SLA' },
            { value: '98%', label: 'Deliverability Rate' },
            { value: '<100ms', label: 'API Response Time' },
            { value: '250K+', label: 'Emails/Day' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-4xl font-extrabold">{stat.value}</div>
              <div className="text-blue-200 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <h2 className="text-4xl font-bold text-center text-slate-900 mb-4">Everything you need to dominate email</h2>
        <p className="text-slate-600 text-center mb-16 max-w-xl mx-auto">
          From crafting the perfect campaign to measuring every click — we&apos;ve got it all covered.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: Mail, title: 'Visual Campaign Builder', desc: 'Drag-and-drop email editor with responsive templates and merge tags. Build professional emails in minutes.' },
            { icon: Zap, title: 'Automation Sequences', desc: 'Set up drip campaigns with unlimited steps, delays, conditions, and triggers. Nurture leads on autopilot.' },
            { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Open rates, click maps, bounce tracking, and subscriber growth — every metric you need, live.' },
            { icon: Users, title: 'Advanced Segmentation', desc: 'Build dynamic audience segments with complex AND/OR rules. Target the right people every time.' },
            { icon: Shield, title: 'A/B Testing', desc: 'Test subject lines and content variants. Automatically send the winner to the rest of your audience.' },
            { icon: Globe, title: 'Multi-Provider Support', desc: 'Send via SMTP, SendGrid, AWS SES, or Mailgun. Switch providers without touching your campaigns.' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-slate-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-600 text-center mb-16">Start free. Scale as you grow.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '$9', emails: '1,000 emails/mo', features: ['Basic analytics', 'Email support', 'API access'], popular: false },
              { name: 'Growth', price: '$29', emails: '25,000 emails/mo', features: ['Advanced analytics', 'A/B testing', 'Automations', 'Priority support'], popular: true },
              { name: 'Pro', price: '$79', emails: '250,000 emails/mo', features: ['All features', 'Webhooks', 'Dedicated support', 'Custom domain'], popular: false },
            ].map((plan) => (
              <Card key={plan.name} className={plan.popular ? 'border-primary shadow-lg scale-105' : ''}>
                <CardContent className="pt-6">
                  {plan.popular && <Badge className="mb-3 bg-primary text-white">Most Popular</Badge>}
                  <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                  <div className="text-4xl font-extrabold text-primary mt-2">{plan.price}<span className="text-base font-normal text-slate-500">/mo</span></div>
                  <p className="text-slate-600 mt-1 text-sm">{plan.emails}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-4 h-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block mt-6">
                    <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                      Get started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} TechyPark. Built to disrupt email marketing.</p>
      </footer>
    </div>
  );
}
