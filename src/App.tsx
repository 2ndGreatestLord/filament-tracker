import { Navigate, Route, Routes } from 'react-router-dom';
import { TabLayout } from './components/TabLayout/TabLayout';
import { ToastProvider } from './components/Toast/Toast';
import { AddFilamentScreen } from './screens/AddFilament/AddFilamentScreen';
import { AddPrintFlow } from './screens/AddPrint/AddPrintFlow';
import { StepGrams } from './screens/AddPrint/StepGrams';
import { StepPhoto } from './screens/AddPrint/StepPhoto';
import { StepSlots } from './screens/AddPrint/StepSlots';
import { FilamentScreen } from './screens/Filament/FilamentScreen';
import { PrintsScreen } from './screens/Prints/PrintsScreen';

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
        <Route path="*" element={<Navigate to="/filament" replace />} />
      </Routes>
    </ToastProvider>
  );
}
