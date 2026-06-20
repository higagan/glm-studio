import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";

export default function AvailabilityCalendarWidget() {
  // Mock data for demonstration
  const upcomingShifts = [
    { date: "Nov 15", time: "8:00 AM - 4:00 PM", status: "Confirmed" },
    { date: "Nov 18", time: "2:00 PM - 10:00 PM", status: "Pending" },
    { date: "Nov 22", time: "8:00 AM - 4:00 PM", status: "Confirmed" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            My Availability
          </span>
          <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary hover:text-white">
            Manage Schedule
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingShifts.map((shift, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{shift.date}</p>
                  <p className="text-sm text-muted-foreground">{shift.time}</p>
                </div>
              </div>
              <span
                className={`text-xs font-medium px-2 py-1 rounded ${
                  shift.status === "Confirmed"
                    ? "bg-success/20 text-success"
                    : "bg-yellow-500/20 text-yellow-700"
                }`}
              >
                {shift.status}
              </span>
            </div>
          ))}
        </div>
        {upcomingShifts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No upcoming shifts scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
