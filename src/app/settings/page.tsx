
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Settings as SettingsIcon, ArrowRight, UserCog, DollarSign, ShoppingCart, Percent } from 'lucide-react';
import Link from 'next/link';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  linkText: string;
}

function SettingsOptionCard({ title, description, icon: Icon, link, linkText }: SettingsCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={link}>
            {linkText} <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Application Settings"
        description="Manage general settings, POS preferences, and invoice customization."
      />
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Customization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SettingsOptionCard
              title="Invoice Customization"
              description="Personalize your invoice appearance and company details that appear on receipts."
              icon={FileText}
              link="/settings/invoice"
              linkText="Configure Invoice Details"
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">User & Access Control</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SettingsOptionCard
              title="User Management"
              description="Manage application users, roles, and permissions."
              icon={UserCog}
              link="/users"
              linkText="Manage Users"
            />
            <Card className="shadow-md opacity-50 cursor-not-allowed">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                 <div className="p-3 rounded-full bg-muted text-muted-foreground">
                  <SettingsIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Roles & Permissions</CardTitle>
                  <CardDescription>Define user roles and access levels (Not implemented)</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled className="w-full sm:w-auto">
                    Configure Roles <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
         <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Point of Sale Settings</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SettingsOptionCard
              title="Currency Settings"
              description="Set the default currency for the POS and financial reports."
              icon={DollarSign}
              link="/settings/currency"
              linkText="Configure Currency"
            />
            {/* Tax Configuration card removed */}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Store & General Settings</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <Card className="shadow-md opacity-50 cursor-not-allowed">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                 <div className="p-3 rounded-full bg-muted text-muted-foreground">
                  <SettingsIcon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Store Details</CardTitle>
                  <CardDescription>Configure store name, contact (Not implemented)</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" disabled className="w-full sm:w-auto">
                    Configure Store <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
