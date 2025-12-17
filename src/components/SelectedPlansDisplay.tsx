import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface Plan {
  _id: string;
  _creationTime: number;
  title: string;
  description?: string;
  status: "active" | "completed" | "paused" | "selected" | "";
  progress?: number;
  activities?: Array<{
    title: string;
    completed?: boolean;
    done?: boolean;
  }>;
}

interface SelectedPlansDisplayProps {
  plans: Plan[];
}

export function SelectedPlansDisplay({ plans }: SelectedPlansDisplayProps) {
  // Filter for active and selected plans
  const activePlans = plans.filter(
    (p) => p.status === "active" || p.status === "selected"
  );

  const completedCount = activePlans.reduce((count, plan) => {
    const activities = plan.activities || [];
    const completed = activities.filter(
      (a) => a.completed === true || a.done === true
    ).length;
    return count + (completed === activities.length && activities.length > 0 ? 1 : 0);
  }, 0);

  return (
    <Card className="p-6 border-0 shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold tracking-tight">Selected Plans</h3>
        <Badge variant="secondary" className="text-sm">
          {activePlans.length} {activePlans.length === 1 ? "Plan" : "Plans"}
        </Badge>
      </div>

      {activePlans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No plans selected yet</p>
          <p className="text-xs mt-1">Select a course from My Learning to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">In Progress</div>
              <div className="text-2xl font-bold">{activePlans.length - completedCount}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Completed</div>
              <div className="text-2xl font-bold text-emerald-600">{completedCount}</div>
            </div>
          </div>

          {/* Plans List */}
          <div className="space-y-2">
            {activePlans.map((plan, index) => {
              const activities = plan.activities || [];
              const completedActivities = activities.filter(
                (a) => a.completed === true || a.done === true
              ).length;
              const progressPercent = activities.length > 0
                ? Math.round((completedActivities / activities.length) * 100)
                : 0;

              return (
                <motion.div
                  key={plan._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{plan.title}</h4>
                        {progressPercent === 100 ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {completedActivities}/{activities.length} activities
                        </span>
                        <Badge
                          variant={progressPercent === 100 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {progressPercent}%
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
