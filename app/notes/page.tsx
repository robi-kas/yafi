import NotesBoard from "@/components/notes/NotesBoard";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Page } from "@/components/kit";

export default function NotesPage() {
  return (
    <DashboardLayout>
      <Page>
        <NotesBoard />
      </Page>
    </DashboardLayout>
  );
}
