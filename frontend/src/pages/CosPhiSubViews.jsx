import SuiviDepassementCosPhi from './SuiviDepassementCosPhi';
import AlertesCosPhi from './AlertesCosPhi';

/**
 * Each sub-section of Cos Phi is a real route with its own sidebar item and its own
 * concern: Suivi de dépassement owns the curve and the KPIs, Alertes owns the
 * register of the days that fell under the 0.80 floor. Neither renders the other's
 * content, so the two screens cannot drift into showing the same thing.
 */
export const CpDepassement = SuiviDepassementCosPhi;
export const CpAlertes = AlertesCosPhi;
