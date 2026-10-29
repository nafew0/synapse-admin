import { createFileRoute } from '@tanstack/react-router';
import synapseDarkLogo from '@/assets/synapse-logo-dark.svg';
import ThemeSelector from '@/components/ThemeSelector';
import synapseLogo from '@/assets/synapse-logo.svg';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthCard } from '@/components/AuthCard';
import { checkOpenIdFn } from '@/server';
import { useLocalize } from '@/hooks';

const SUPPORT_EMAIL = 'info@bdren.net.bd';
const JOBS = [
  { title: 'com_auth_admin_job_members', detail: 'com_auth_admin_job_members_desc' },
  { title: 'com_auth_admin_job_usage', detail: 'com_auth_admin_job_usage_desc' },
  { title: 'com_auth_admin_job_reports', detail: 'com_auth_admin_job_reports_desc' },
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
    <div className="min-h-screen bg-(--syn-bg) text-(--cui-color-text-default)">
      <div className="mx-auto flex min-h-screen w-full max-w-300 flex-col px-5 sm:px-8 lg:px-12">
        <header className="flex h-18 shrink-0 items-center justify-between lg:h-22">
          <div className="flex items-center gap-2.5">
            <img
              src={logo}
              alt={localize('com_a11y_logo_alt')}
              className="h-10 w-auto"
              draggable={false}
            />
            <span className="text-lg font-semibold tracking-tight">
              {localize('com_auth_admin_title')}
            </span>
          </div>
          <ThemeSelector returnThemeOnly />
        </header>
        <div className="grid flex-1 grid-cols-1 content-start gap-8 pt-2 pb-12 [grid-template-areas:'intro'_'card'_'jobs'] lg:grid-cols-[minmax(0,1fr)_28rem] lg:content-center lg:items-start lg:gap-x-[clamp(3rem,7vw,7rem)] lg:gap-y-10 lg:pt-6 lg:pb-28 lg:[grid-template-areas:'intro_card'_'jobs_card']">
          <div className="[grid-area:intro]">
            <h1 className="max-w-[20ch] text-[28px] leading-[1.05] font-bold tracking-tight text-balance sm:text-[34px] lg:text-[44px]">
              {localize('com_auth_admin_headline')}
            </h1>
            <p className="mt-3 max-w-[38ch] text-base leading-normal text-(--cui-color-text-muted) lg:mt-5 lg:text-[17px]">
              {localize('com_auth_admin_subtitle')}
            </p>
          </div>
          <dl
            aria-label={localize('com_auth_admin_jobs')}
            className="m-0 grid max-w-[44ch] gap-6 [grid-area:jobs]"
          >
            {JOBS.map((job) => (
              <div key={job.title} className="grid gap-1">
                <dt className="text-base font-semibold">{localize(job.title)}</dt>
                <dd className="m-0 text-[15px] leading-normal text-(--cui-color-text-muted)">
                  {localize(job.detail)}
                </dd>
              </div>
            ))}
          </dl>
          <main className="w-full max-w-140 [grid-area:card] lg:max-w-none">
            <AuthCard
              redirectTo={redirect}
              autoRedirectSso={ssoOnly}
              ssoAvailable={ssoAvailable}
              footer={help}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
