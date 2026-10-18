import useAuth from './hooks/useAuth';
import useActiveView from './hooks/useActiveView';
import useMode from './hooks/useMode';
import Login from './components/Login';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import { TelemetryProvider } from './context/TelemetryContext';
import Consommation from './pages/Consommation';
import BillingCost from './pages/BillingCost';
import LiveMonitoring from './pages/LiveMonitoring';
import ShiftEnergyCorrelation from './pages/ShiftEnergyCorrelation';
import AnalyticsConsommation from './pages/AnalyticsConsommation';
import { ConsoDistribution, ConsoProduction, ConsoRatioCout } from './pages/ConsoSubViews';
import AnalyticsPuissanceSouscrite from './pages/AnalyticsPuissanceSouscrite';
import { PsDepassement, PsAlertes } from './pages/PuissanceSubViews';
import AnalyticsCosPhi from './pages/AnalyticsCosPhi';
import { CpDepassement, CpAlertes } from './pages/CosPhiSubViews';
import { getDefaultView } from './lib/nav';

const PAGES = {
  consommation: Consommation,
  billing: BillingCost,
  live: LiveMonitoring,
  'shift-correlation': ShiftEnergyCorrelation,
  'analytics-consommation': AnalyticsConsommation,
  'conso-distribution': ConsoDistribution,
  'conso-production': ConsoProduction,
  'conso-ratio-cout': ConsoRatioCout,
  'analytics-puissance-souscrite': AnalyticsPuissanceSouscrite,
  'ps-depassement': PsDepassement,
  'ps-alertes': PsAlertes,
  'analytics-cos-phi': AnalyticsCosPhi,
  'cp-depassement': CpDepassement,
  'cp-alertes': CpAlertes
};

/**
 * Resolves the component for a route. A hash that points at a missing or
 * out-of-mode module must degrade to the first module of the active mode rather
 * than rendering `undefined` (which React rejects with an invalid element type).
 */
function resolvePage(view, mode) {
  return PAGES[view] || PAGES[getDefaultView(mode)] || Consommation;
}

export default function App() {
  const { authed, user, signIn, signOut, error, loading } = useAuth();
  const [mode, setMode] = useMode();
  const [view, setView] = useActiveView(mode);

  if (!authed) {
    return <Login onLogin={signIn} error={error} loading={loading} />;
  }

  const Page = resolvePage(view, mode);

  return (
    <TelemetryProvider>
      <AppShell
        view={view}
        onNavigate={setView}
        onLogout={signOut}
        user={user}
        mode={mode}
        onModeChange={setMode}
      >
        {/* A crash in one module stays inside `main`; the shell keeps rendering
            and `resetKey` clears the error as soon as the user navigates. */}
        <ErrorBoundary resetKey={`${mode}:${view}`}>
          <Page user={user} />
        </ErrorBoundary>
      </AppShell>
    </TelemetryProvider>
  );
}
