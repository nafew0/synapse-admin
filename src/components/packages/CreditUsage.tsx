import type * as t from '@/types';
import { Card, EmptyState } from '@/components/shared';
import { cn, formatTaka } from '@/utils';
import { useLocalize } from '@/hooks';

function share(meter: t.CreditMeter): number {
  if (meter.limit == null || meter.limit <= 0) return 0;
  return Math.min(meter.used / meter.limit, 1);
}

function MeterValue({ meter }: { meter: t.CreditMeter }) {
  const localize = useLocalize();
  if (meter.limit == null) {
    return (
      <span>{localize('com_credit_used_unlimited', { used: formatTaka(meter.usedBdt ?? 0) })}</span>
    );
  }
  return (
    <span className={cn(meter.blocked && 'font-medium text-(--syn-danger-fg)')}>
      {localize('com_credit_used_of', {
        used: formatTaka(meter.usedBdt ?? 0),
        limit: formatTaka(meter.limitBdt ?? 0),
      })}
    </span>
  );
}

function MeterBar({ meter, label }: { meter: t.CreditMeter; label: string }) {
  const percent = Math.round(share(meter) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-(--cui-color-background-muted)"
    >
      <div
        className={cn(
          'h-full rounded-full',
          meter.blocked ? 'bg-(--syn-danger-fg)' : 'bg-(--cui-color-text-default)',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function WindowMeter({ title, meter }: { title: string; meter: t.CreditMeter }) {
  const localize = useLocalize();
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-(--cui-color-stroke-default) p-4">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-(--cui-color-text-default)">{title}</span>
        <MeterValue meter={meter} />
      </div>
      <MeterBar meter={meter} label={title} />
      <span className="text-xs text-(--cui-color-text-muted)">
        {localize('com_credit_resets', { date: new Date(meter.resetsAt).toLocaleString() })}
      </span>
    </div>
  );
}

/** An institution on usage packages: its pooled allowance and its busiest members, in taka. */
export function CreditUsage({ credits }: { credits: t.CreditConsole }) {
  const localize = useLocalize();
  return (
    <div className="flex flex-col gap-4">
      <Card
        title={localize('com_credit_institution_title')}
        description={localize('com_credit_institution_description', {
          pool: credits.institutionPackage ?? localize('com_credit_none'),
          member: credits.defaultMemberPackage ?? localize('com_credit_none'),
        })}
      >
        {!credits.enforced && (
          <p className="m-0 text-[13px] text-(--cui-color-text-muted)">
            {localize('com_credit_not_enforced')}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <WindowMeter title={localize('com_credit_this_week')} meter={credits.institution.week} />
          <WindowMeter
            title={localize('com_credit_this_month')}
            meter={credits.institution.month}
          />
        </div>
      </Card>
      <Card
        title={localize('com_credit_members_title')}
        description={localize('com_credit_members_description')}
      >
        {credits.members.length === 0 ? (
          <EmptyState message={localize('com_credit_members_empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--cui-color-stroke-default)">
                  {(
                    [
                      'com_credit_col_member',
                      'com_credit_col_package',
                      'com_credit_this_week',
                      'com_credit_this_month',
                    ] as const
                  ).map((key) => (
                    <th key={key} className="px-3 py-2 font-medium text-(--cui-color-text-muted)">
                      {localize(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {credits.members.map((member) => (
                  <tr
                    key={member.userId}
                    className="border-b border-(--cui-color-stroke-default) last:border-b-0"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-(--cui-color-text-default)">
                          {member.name ?? member.email ?? member.userId}
                        </span>
                        {member.name && member.email ? (
                          <span className="text-xs text-(--cui-color-text-muted)">
                            {member.email}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-(--cui-color-text-default)">
                      {member.package?.name ?? localize('com_credit_none')}
                      {member.ownPackage ? (
                        <span className="ml-2 text-xs text-(--cui-color-text-muted)">
                          {localize('com_credit_own_package')}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      <MeterValue meter={member.week} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      <MeterValue meter={member.month} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
