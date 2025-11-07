import { AchievementsGrid } from './AchievementsGrid';
import { StreakTracker } from './StreakTracker';
import { UserLevelCard } from './UserLevelCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ExpandedAchievementsGrid({ userId, stats }: { userId: string, stats: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Achievements & Loyalty</CardTitle>
      </CardHeader>
      <CardContent>
        <AchievementsGrid userId={userId} />
        <StreakTracker stats={stats} />
        <UserLevelCard stats={stats} />
      </CardContent>
    </Card>
  );
}
