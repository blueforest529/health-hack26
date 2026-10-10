import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { I18nProvider } from './i18n/i18n';
import { VisionProvider } from './lib/colorVision';
import { ColourCheck } from './pages/ColourCheck';
import { History } from './pages/History';
import { ItemForm, ItemPage, PatientForm } from './pages/ItemPages';
import { LendStart, LendWizard, ReturnPage } from './pages/LendReturn';
import { Register } from './pages/Register';
import { UpdateSheet } from './pages/UpdateSheet';
import { Waitlist, WaitlistAdd } from './pages/Waitlist';
import { StoreProvider } from './store/store';

export default function App() {
  return (
    <VisionProvider>
      <I18nProvider>
        <StoreProvider>
          <HashRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Register />} />
                <Route path="items/new" element={<ItemForm />} />
                <Route path="items/:id" element={<ItemPage />} />
                <Route path="items/:id/edit" element={<ItemForm />} />
                <Route path="patients/new" element={<PatientForm />} />
                <Route path="patients/:id/edit" element={<PatientForm />} />
                <Route path="lend" element={<LendStart />} />
                <Route path="lend/new" element={<LendWizard />} />
                <Route path="return" element={<ReturnPage />} />
                <Route path="waitlist" element={<Waitlist />} />
                <Route path="waitlist/new" element={<WaitlistAdd />} />
                <Route path="history" element={<History />} />
                <Route path="sheet" element={<UpdateSheet />} />
                <Route path="vision" element={<ColourCheck />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </StoreProvider>
      </I18nProvider>
    </VisionProvider>
  );
}
