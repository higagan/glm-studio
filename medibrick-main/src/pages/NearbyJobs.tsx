import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HospitalSignupForm } from "@/components/location/HospitalSignupForm";
import { DoctorDiscoveryList } from "@/components/location/DoctorDiscoveryList";
import Navigation from "@/components/Navigation";
import { Building2, Stethoscope } from "lucide-react";

export default function NearbyJobs() {
  const [activeTab, setActiveTab] = useState("discover");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 max-w-5xl">
        <div className="mb-6 md:mb-8">
          <h1 className="font-bold text-2xl md:text-3xl font-heading">Shifts Near You</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
            Browse active marketplace shifts, then enable location for personalized nearby results.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-8 max-w-md">
            <TabsTrigger value="discover" className="flex items-center gap-2 text-xs sm:text-sm">
              <Stethoscope className="h-4 w-4" />
              Find Shifts
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-2 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              Register Hospital
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            <DoctorDiscoveryList />
          </TabsContent>

          <TabsContent value="register">
            <HospitalSignupForm onSuccess={() => setActiveTab("discover")} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
