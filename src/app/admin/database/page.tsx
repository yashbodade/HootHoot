import { Metadata } from 'next';
import { DatabaseDashboard } from '@/components/admin/DatabaseDashboard';

export const metadata: Metadata = {
  title: 'Database Admin Dashboard',
  description: 'AWS Aurora PostgreSQL database administration and monitoring',
};

export default function DatabaseAdminPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Database Administration</h1>
          <p className="text-muted-foreground">
            AWS Aurora PostgreSQL connection status, configuration, and all database tables
          </p>
        </div>

        {/* Dashboard */}
        <DatabaseDashboard />
      </div>
    </main>
  );
}
