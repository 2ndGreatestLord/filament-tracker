import { Navigate, Route, Routes } from 'react-router-dom';
import { TabLayout } from './components/TabLayout/TabLayout';
import { ToastProvider } from './components/Toast/Toast';
import { AddFilamentScreen } from './screens/AddFilament/AddFilamentScreen';
import { AddPrintFlow } from './screens/AddPrint/AddPrintFlow';
import { StepGrams } from './screens/AddPrint/StepGrams';
import { StepPhoto } from './screens/AddPrint/StepPhoto';
import { StepSlots } from './screens/AddPrint/StepSlots';
import { EditFilamentScreen } from './screens/EditFilament/EditFilamentScreen';
import { FilamentScreen } from './screens/Filament/FilamentScreen';
import { PrintDetailScreen } from './screens/PrintDetail/PrintDetailScreen';
import { PrintsScreen } from './screens/Prints/PrintsScreen';
import { SettingsScreen } from './screens/Settings/SettingsScreen';
import { SpoolDetailScreen } from './screens/SpoolDetail/SpoolDetailScreen';

export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/filament" element={<FilamentScreen />} />
          <Route path="/prints" element={<PrintsScreen />} />
        </Route>
        <Route path="/filament/new" element={<AddFilamentScreen />} />
        <Route path="/prints/new" element={<AddPrintFlow />}>
          <Route index element={<StepSlots />} />
          <Route path="grams/:index" element={<StepGrams />} />
          <Route path="photo" element={<StepPhoto />} />
        </Route>
        <Route path="/prints/:id" element={<PrintDetailScreen />} />
        <Route path="/filament/:id" element={<SpoolDetailScreen />} />
        <Route path="/filament/:id/edit" element={<EditFilamentScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/filament" replace />} />
      </Routes>
    </ToastProvider>
  );
}
