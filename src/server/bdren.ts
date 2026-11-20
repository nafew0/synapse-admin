import { createServerFn } from '@tanstack/react-start';
import { getBdrenAdminUrl } from './utils/url';

/** The bdren.ai superadmin panel, where institutions and invitations are managed. */
export const getBdrenAdminUrlFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string> => getBdrenAdminUrl(),
);
