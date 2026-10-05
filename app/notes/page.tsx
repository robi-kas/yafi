import NotesBoard from "@/components/notes/NotesBoard";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function NotesPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <NotesBoard />
      </div>
    </DashboardLayout>
  );
}
