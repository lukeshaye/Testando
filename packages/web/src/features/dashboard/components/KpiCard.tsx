// packages/web/src/features/dashboard/components/KpiCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading = false,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {isLoading ? <Skeleton className="h-4 w-[100px]" /> : title}
        </CardTitle>
        {isLoading ? (
          <Skeleton className="h-4 w-4 rounded-full" />
        ) : (
          <Icon className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isLoading ? <Skeleton className="h-8 w-[60px] mt-1" /> : value}
        </div>
        {(description || isLoading) && (
          <p className="text-xs text-muted-foreground mt-1">
            {isLoading ? (
              <Skeleton className="h-3 w-[120px]" />
            ) : (
              description
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}