import { createFileRoute } from '@tanstack/react-router';
import synapseLogo from '@/assets/synapse-logo-dark.svg';
import ThemeSelector from '@/components/ThemeSelector';
import { AuthCard } from '@/components/AuthCard';
import { checkOpenIdFn } from '@/server';
import { useLocalize } from '@/hooks';

const SUPPORT_EMAIL = 'info@bdren.net.bd';

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
  const { redirect } = Route.useSearch();
  const { ssoAvailable, ssoOnly } = Route.useLoaderData();

  return (
    <div className="flex min-h-screen flex-col bg-(--syn-bg) text-(--cui-color-text-default)">
      <header className="bg-(--syn-band) px-4 pt-10 pb-36 text-center text-(--syn-on-band) sm:pt-16 sm:pb-40">
        <img
          src={synapseLogo}
          alt={localize('com_a11y_logo_alt')}
          className="mx-auto h-16 w-auto sm:h-20"
          draggable={false}
        />
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-balance sm:text-[28px]">
          {localize('com_auth_admin_title')}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-balance text-(--syn-on-band-muted)">
          {localize('com_auth_admin_subtitle')}
        </p>
      </header>
      <main className="-mt-28 flex flex-1 flex-col items-center px-4 pb-20">
        <AuthCard redirectTo={redirect} autoRedirectSso={ssoOnly} ssoAvailable={ssoAvailable} />
        <p className="mt-5 text-center text-[13px] text-(--cui-color-text-muted)">
          {localize('com_auth_admin_help')}{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-semibold text-(--cui-color-text-link) underline-offset-2 hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </main>
      <div className="fixed bottom-0 left-0 m-4">
        <ThemeSelector returnThemeOnly />
      </div>
    </div>
  );
}
