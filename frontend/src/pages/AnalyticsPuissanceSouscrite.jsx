import ModulePlaceholder from '../components/ModulePlaceholder';
import { PUISSANCE_SUB_MODULES } from '../lib/puissanceSubModules';
import { PsDepassement, PsAlertes } from './PuissanceSubViews';

/**
 * Puissance souscrite is a group, not a view of its own: the parent route opens
 * its first sub-section, and the sidebar tree handles navigation between them,
 * each item being a real route.
 *
 * The sub-section is resolved by id rather than assumed, so reordering the
 * registry cannot leave this route opening a different screen than the sidebar
 * highlights. The placeholder fallback only applies to a sub-section that is
 * still reserved.
 */
const SUB_VIEWS = {
  'ps-depassement': PsDepassement,
  'ps-alertes': PsAlertes
};

const [firstSub] = PUISSANCE_SUB_MODULES;
const FirstSubView = SUB_VIEWS[firstSub.id];

export default function AnalyticsPuissanceSouscrite() {
  if (FirstSubView) return <FirstSubView />;

  return (
    <ModulePlaceholder
      icon={firstSub.icon}
      title={firstSub.label}
      subtitle={firstSub.subtitle}
      scope={firstSub.scope}
      accent={firstSub.accent}
      surface={firstSub.surface}
      ink={firstSub.ink}
    />
  );
}
