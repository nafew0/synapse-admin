import { createFileRoute } from '@tanstack/react-router';
import synapseDarkLogo from '@/assets/synapse-logo-dark.svg';
import ThemeSelector from '@/components/ThemeSelector';
import synapseLogo from '@/assets/synapse-logo.svg';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthCard } from '@/components/AuthCard';
import { checkOpenIdFn } from '@/server';
import { useLocalize } from '@/hooks';

const SUPPORT_EMAIL = 'info@bdren.net.bd';
const JOB_KEYS = [
  'com_auth_admin_job_members',
  'com_auth_admin_job_usage',
  'com_auth_admin_job_reports',
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

  return (
    <div className="grid min-h-screen bg-(--syn-surface) text-(--cui-color-text-default) md:grid-cols-2">
      <section className="flex flex-col gap-8 bg-(--syn-brand-tint) px-5 py-6 text-(--syn-brand-ink) md:px-14 md:py-10">
        <img
          src={logo}
          alt={localize('com_a11y_logo_alt')}
          className="h-11 w-auto self-start md:h-14"
          draggable={false}
        />
        <div className="md:my-auto">
          <h1 className="text-[28px] leading-[1.05] font-bold tracking-tight md:text-[40px]">
            {localize('com_auth_admin_title')}
          </h1>
          <p className="mt-3 max-w-[30ch] text-[17px] leading-normal">
            {localize('com_auth_admin_subtitle')}
          </p>
          <ul className="mt-6 flex flex-wrap gap-2.5" aria-label={localize('com_auth_admin_jobs')}>
            {JOB_KEYS.map((key) => (
              <li
                key={key}
                className="rounded-full bg-(--syn-surface) px-3.5 py-1.5 text-sm font-medium"
              >
                {localize(key)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[13px]">
          {localize('com_auth_admin_help')}{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-(--syn-brand-ink) underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>
      <main className="flex items-center justify-center px-5 pt-10 pb-24 md:px-14 md:py-10">
        <AuthCard redirectTo={redirect} autoRedirectSso={ssoOnly} ssoAvailable={ssoAvailable} />
      </main>
      <div className="fixed top-0 right-0 m-4">
        <ThemeSelector returnThemeOnly />
      </div>
    </div>
  );
}
