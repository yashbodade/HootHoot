'use client';

import { useEffect, useState } from 'react';
import { Database, Server, Table, Lock, Check, AlertCircle } from 'lucide-react';

interface ConnectionInfo {
  host: string;
  port: string;
  database: string;
  user: string;
  region: string;
  sslMode: string;
  accountId: string;
  resourceArn: string;
  roleArn: string;
  hasIamToken: boolean;
}

interface TableInfo {
  name: string;
  description: string;
}

interface TablesBySchema {
  [key: string]: TableInfo[];
}

interface DashboardData {
  status: string;
  connection: ConnectionInfo;
  tables: TablesBySchema;
  statistics: {
    totalTables: number;
    totalSchemas: number;
    tablesBySchema: { [key: string]: number };
  };
  timestamp: string;
}

export function DatabaseDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSchema, setExpandedSchema] = useState<string | null>('public');

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/admin/database');
        if (!response.ok) throw new Error('Failed to fetch database info');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading database info...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive">Database Error</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Server className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AWS Aurora PostgreSQL</h2>
              <p className="text-sm text-muted-foreground">Connection Status</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">Connected</span>
          </div>
        </div>

        {/* Environment Variables Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_PGHOST</p>
              <p className="font-medium text-white break-all">{data.connection.host}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_PGUSER</p>
              <p className="font-medium text-white">{data.connection.user}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_PGDATABASE</p>
              <p className="font-medium text-white">{data.connection.database}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_PGPORT</p>
              <p className="font-medium text-white">{data.connection.port}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_AWS_REGION</p>
              <p className="font-medium text-white">{data.connection.region}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_PGSSLMODE</p>
              <p className="font-medium text-white">{data.connection.sslMode}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS Auth</p>
              <div className="flex items-center gap-2 mt-1">
                <Lock className="w-4 h-4 text-amber-500" />
                <p className="font-medium text-white">
                  {data.connection.hasIamToken ? 'IAM Token Active' : 'IAM Auth Configured'}
                </p>
              </div>
            </div>
            <div>
              <p className="font-mono text-xs text-muted-foreground">AWS_APG_AWS_ACCOUNT_ID</p>
              <p className="font-medium text-white text-xs">{data.connection.accountId}</p>
            </div>
          </div>
        </div>

        {/* ARN & Role */}
        <div className="mt-4 pt-4 border-t space-y-3 text-sm">
          <div>
            <p className="font-mono text-xs text-muted-foreground">AWS_APG_AWS_RESOURCE_ARN</p>
            <p className="font-medium text-white text-xs break-all">{data.connection.resourceArn}</p>
          </div>
          <div>
            <p className="font-mono text-xs text-muted-foreground">AWS_APG_AWS_ROLE_ARN</p>
            <p className="font-medium text-white text-xs break-all">{data.connection.roleArn}</p>
          </div>
        </div>
      </div>

      {/* Database Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-2">Total Tables</p>
          <p className="text-2xl font-bold">{data.statistics.totalTables}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-2">Schemas</p>
          <p className="text-2xl font-bold">{data.statistics.totalSchemas}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-2">Last Updated</p>
          <p className="text-xs font-mono">
            {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Tables by Schema */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Table className="w-5 h-5" />
          Database Tables
        </h3>

        {Object.entries(data.tables).map(([schema, tables]) => (
          <div key={schema} className="rounded-lg border overflow-hidden">
            <button
              onClick={() =>
                setExpandedSchema(expandedSchema === schema ? null : schema)
              }
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="px-2 py-1 rounded bg-primary/10 text-xs font-mono text-primary">
                  {schema}
                </div>
                <span className="text-sm font-medium">{tables.length} tables</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {expandedSchema === schema ? '▼' : '▶'}
              </div>
            </button>

            {expandedSchema === schema && (
              <div className="border-t divide-y max-h-96 overflow-y-auto">
                {tables.map((table, idx) => (
                  <div
                    key={idx}
                    className="px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-1 rounded bg-emerald-500/10 mt-0.5">
                        <Table className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-semibold">{table.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {table.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Schema Breakdown */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-4">Schema Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(data.statistics.tablesBySchema).map(([schema, count]) => (
            <div key={schema} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-mono text-sm">{schema}</span>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Details Table */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          AWS Configuration Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-mono text-xs font-semibold text-muted-foreground">
                  Environment Variable
                </th>
                <th className="text-left py-2 px-3 font-mono text-xs font-semibold text-muted-foreground">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_PGHOST
                </td>
                <td className="py-2 px-3 font-mono text-xs break-all">{data.connection.host}</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_PGUSER
                </td>
                <td className="py-2 px-3 font-mono text-xs">{data.connection.user}</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_PGDATABASE
                </td>
                <td className="py-2 px-3 font-mono text-xs">{data.connection.database}</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_PGPORT
                </td>
                <td className="py-2 px-3 font-mono text-xs">{data.connection.port}</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_AWS_REGION
                </td>
                <td className="py-2 px-3 font-mono text-xs">{data.connection.region}</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_PGSSLMODE
                </td>
                <td className="py-2 px-3 font-mono text-xs">{data.connection.sslMode}</td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">
                  AWS_APG_AWS_ACCOUNT_ID
                </td>
                <td className="py-2 px-3 font-mono text-xs">{data.connection.accountId}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
