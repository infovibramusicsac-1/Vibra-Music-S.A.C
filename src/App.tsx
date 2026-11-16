/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CoordinatorView } from './ui/components/coordinator/CoordinatorView';
import { CreatorView } from './ui/components/creator/CreatorView';
import { FloatingBottomBar } from './ui/components/layout/FloatingBottomBar';
import { TopHeader } from './ui/components/layout/TopHeader';
import { ManagerView } from './ui/components/manager/ManagerView';
import { PieceEditorSheet } from './ui/components/studio/PieceEditorSheet';
import {
  VibraServicesProvider,
  useVibraServices,
} from './ui/context/VibraServicesContext';

const WorkspaceShell: React.FC = () => {
  const { activeRole } = useVibraServices();

  return (
    <div className="vibra-ambient-bg min-h-screen flex flex-col transition-colors duration-200">
      <TopHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
        {activeRole === 'coordinador' && <CoordinatorView />}
        {activeRole === 'manager' && <ManagerView />}
        {activeRole === 'creador' && <CreatorView />}
      </main>

      <FloatingBottomBar />
      <PieceEditorSheet />
    </div>
  );
};

export default function App() {
  return (
    <VibraServicesProvider>
      <WorkspaceShell />
    </VibraServicesProvider>
  );
}
