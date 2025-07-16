import { MainWorkspace } from "../components/workspace/main-workspace";

interface WorkspaceProps {
  user?: any;
  workspaces?: any[];
  onLogout?: () => void;
}

export function Workspace({ user, workspaces, onLogout }: WorkspaceProps) {
  // This will be passed from the main App component
  if (!user || !workspaces || !onLogout) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return <MainWorkspace user={user} workspaces={workspaces} onLogout={onLogout} />;
}