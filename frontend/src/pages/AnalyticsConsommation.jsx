import ModulePlaceholder from '../components/ModulePlaceholder';
import { CONSO_SUB_MODULES } from '../lib/consoSubModules';
import { ConsoDistribution, ConsoProduction, ConsoRatioCout } from './ConsoSubViews';

/**
 * Consommation is a group, not a view of its own: the parent route opens its
 * first sub-section, and the sidebar tree handles navigation between them, each
 * item being a real route.
 *
 * The sub-section is resolved by id rather than assumed, so reordering the
 * registry cannot leave this route opening a different screen than the sidebar
 * highlights. The placeholder fallback only applies to a sub-section that is
 * still reserved.
 */
const SUB_VIEWS = {
  'conso-distribution': ConsoDistribution,
  'conso-production': ConsoProduction,
  'conso-ratio-cout': ConsoRatioCout
};

const [firstSub] = CONSO_SUB_MODULES;
const FirstSubView = SUB_VIEWS[firstSub.id];

export default function AnalyticsConsommation() {
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
