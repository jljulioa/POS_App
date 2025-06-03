
"use client";

import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ArrowRight, FileText } from 'lucide-react';
import Link from 'next/link';

interface ReportOptionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  linkText: string;
}

function ReportOptionCard({ title, description, icon: Icon, link, linkText }: ReportOptionCardProps) {
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

export default function ReportsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Reports Center"
        description="Access various reports to analyze your business performance."
      />
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground">Available Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ReportOptionCard
              title="Sales Summary Report"
              description="Analyze sales revenue, COGS, profit, and item performance over selected periods."
              icon={FileText} // Using FileText as it was used for the report page
              link="/reports/sales-summary"
              linkText="View Sales Summary"
            />
            {/* Future reports can be added here as new ReportOptionCard components */}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
