import { Navigate, Route, Routes } from 'react-router-dom';
import { TabLayout } from './components/TabLayout/TabLayout';
import { ToastProvider } from './components/Toast/Toast';
import { AddFilamentScreen } from './screens/AddFilament/AddFilamentScreen';
import { FilamentScreen } from './screens/Filament/FilamentScreen';

export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<TabLayout />}>
          <Route path="/filament" element={<FilamentScreen />} />
        </Route>
        <Route path="/filament/new" element={<AddFilamentScreen />} />
        <Route path="*" element={<Navigate to="/filament" replace />} />
      </Routes>
    </ToastProvider>
  );
}
