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
    <div className="relative isolate flex min-h-screen items-center justify-center bg-(--syn-auth-ground) px-4 py-8 text-(--cui-color-text-default) sm:px-6 lg:py-14">
      <div aria-hidden="true" className="admin-login-network fixed inset-0 -z-10" />
      <div className="grid w-full max-w-md overflow-hidden rounded-2xl border border-(--syn-auth-edge) bg-(--syn-surface) shadow-[0_18px_44px_var(--syn-auth-shadow)] lg:min-h-152 lg:max-w-5xl lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
        <section className="flex flex-col items-center justify-center border-b border-(--syn-auth-edge) bg-(--syn-auth-panel) px-6 py-7 lg:border-r lg:border-b-0 lg:px-12 lg:py-12">
          <img
            src={logo}
            alt={localize('com_a11y_logo_alt')}
            className="h-20 w-auto lg:h-36"
            draggable={false}
          />
          <h1 className="mt-4 max-w-[16em] text-center text-lg leading-snug font-semibold tracking-tight text-balance lg:mt-7 lg:text-2xl">
            {localize('com_auth_admin_headline')}
          </h1>
          <dl
            aria-label={localize('com_auth_admin_jobs')}
            className="m-0 mt-9 hidden w-full max-w-sm gap-5 lg:grid"
          >
            {JOBS.map(({ title, detail, Icon }) => (
              <div key={title} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-6 shrink-0 text-(--syn-icon)" />
                <div>
                  <dt className="text-sm font-semibold">{localize(title)}</dt>
                  <dd className="m-0 mt-0.5 text-[13px] leading-normal text-(--cui-color-text-muted)">
                    {localize(detail)}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
        <main className="flex items-center justify-center px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <AuthCard
            redirectTo={redirect}
            autoRedirectSso={ssoOnly}
            ssoAvailable={ssoAvailable}
            footer={help}
          />
        </main>
      </div>
      <div className="fixed bottom-0 left-0 m-3">
        <ThemeSelector returnThemeOnly />
      </div>
    </div>
  );
}
