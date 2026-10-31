import { createFileRoute } from '@tanstack/react-router';
import { MembersIcon, ReportsIcon, UsageIcon } from '@/components/AuthIcons';
import synapseDarkLogo from '@/assets/synapse-logo-dark.svg';
import ThemeSelector from '@/components/ThemeSelector';
import synapseLogo from '@/assets/synapse-logo.svg';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthCard } from '@/components/AuthCard';
import { checkOpenIdFn } from '@/server';
import { useLocalize } from '@/hooks';

const SUPPORT_EMAIL = 'info@bdren.net.bd';
const PANEL_GUTTER = 'px-5 lg:px-[clamp(1.5rem,5vw,4rem)]';
const JOBS = [
  {
    title: 'com_auth_admin_job_members',
    detail: 'com_auth_admin_job_members_desc',
    Icon: MembersIcon,
  },
  { title: 'com_auth_admin_job_usage', detail: 'com_auth_admin_job_usage_desc', Icon: UsageIcon },
  {
    title: 'com_auth_admin_job_reports',
    detail: 'com_auth_admin_job_reports_desc',
    Icon: ReportsIcon,
  },
] as const;

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  loader: async () => {
    const openIdStatus = await checkOpenIdFn();
    return {
      ssoAvailable: openIdStatus.available,
      ssoOnly: openIdStatus.available && openIdStatus.ssoOnly,
    };
  },
  component: LoginPage,
});

function LoginPage() {
  const localize = useLocalize();
  const { resolvedTheme } = useTheme();
  const { redirect } = Route.useSearch();
  const { ssoAvailable, ssoOnly } = Route.useLoaderData();
  const logo = resolvedTheme === 'dark' ? synapseDarkLogo : synapseLogo;

  const help = (
    <p className="text-sm text-(--cui-color-text-muted)">
      {localize('com_auth_admin_help')}{' '}
      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="font-semibold text-(--syn-brand-ink) no-underline hover:underline"
      >
        {SUPPORT_EMAIL}
      </a>
    </p>
  );

  return (
    <div className="relative isolate grid min-h-screen grid-cols-1 bg-(--syn-bg) text-(--cui-color-text-default) lg:grid-cols-2 lg:grid-rows-[minmax(6.5rem,1fr)_auto_auto_minmax(6.5rem,1fr)]">
      <div
        aria-hidden="true"
        className="admin-login-network -z-10 col-start-1 row-start-1 lg:row-[1/5]"
      />
      <section className={`col-start-1 row-start-1 py-6 lg:row-start-2 lg:py-0 ${PANEL_GUTTER}`}>
        <div className="flex items-center gap-3 lg:absolute lg:top-10 lg:left-[clamp(1.5rem,5vw,4rem)]">
          <img
            src={logo}
            alt={localize('com_a11y_logo_alt')}
            className="h-12 w-auto"
            draggable={false}
          />
          <span className="text-lg font-semibold tracking-tight">
            {localize('com_auth_admin_title')}
          </span>
        </div>
        <h1 className="mt-6 max-w-[12em] text-[1.75rem] leading-[1.05] font-bold tracking-[-0.03em] text-balance lg:mt-0 lg:text-[2.75rem]">
          {localize('com_auth_admin_headline')}
        </h1>
        <p className="mt-4 max-w-[32ch] text-base leading-[1.45] text-(--cui-color-text-muted) lg:text-[1.2rem]">
          {localize('com_auth_admin_subtitle')}
        </p>
      </section>
      <dl
        aria-label={localize('com_auth_admin_jobs')}
        className={`col-start-1 row-start-3 m-0 grid content-start gap-6 py-8 lg:pt-10 lg:pb-0 ${PANEL_GUTTER}`}
      >
        {JOBS.map(({ title, detail, Icon }) => (
          <div key={title} className="flex items-center gap-4">
            <Icon className="size-8 shrink-0 text-(--syn-icon)" />
            <div>
              <dt className="text-base leading-[1.4] font-semibold">{localize(title)}</dt>
              <dd className="m-0 text-sm leading-normal text-(--cui-color-text-muted)">
                {localize(detail)}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <main className="col-start-1 row-start-2 flex items-center justify-center bg-(--syn-surface) px-5 py-8 lg:col-start-2 lg:row-[1/5] lg:p-6">
        <AuthCard
          redirectTo={redirect}
          autoRedirectSso={ssoOnly}
          ssoAvailable={ssoAvailable}
          footer={help}
        />
      </main>
      <div className="absolute top-4 right-4 z-10">
        <ThemeSelector returnThemeOnly />
      </div>
    </div>
  );
}
