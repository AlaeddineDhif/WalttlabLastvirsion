import SurveillanceDepassement from './SurveillanceDepassement';
import AlertesDepassement from './AlertesDepassement';

/**
 * Each sub-section of Puissance souscrite is a real route with its own sidebar
 * item and its own concern: Surveillance du dépassement owns the curve and the
 * KPIs, Alertes owns the register of the days that crossed Ps. Neither renders the
 * other's content, so the two screens cannot drift into showing the same thing.
 */
export const PsDepassement = SurveillanceDepassement;
export const PsAlertes = AlertesDepassement;
