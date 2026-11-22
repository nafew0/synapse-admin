import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePlatformInstitutionBdrenOrganizationFn } from '@/server';
import { FormDialog } from '@/components/shared';
import { notifySuccess } from '@/utils';
import { useLocalize } from '@/hooks';

interface BdrenLinkProps {
  tenantId: string;
  organizationId?: string | null;
}

/** The bdren.ai organization an institution is mapped to, with an editor to set, change or clear it. */
export function BdrenLink({ tenantId, organizationId }: BdrenLinkProps) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const mutation = useMutation({
    mutationFn: (next: string | null) =>
      updatePlatformInstitutionBdrenOrganizationFn({
        data: { tenantId, bdrenOrganizationId: next },
      }),
    onSuccess: (result) => {
      notifySuccess(
        localize(result.bdrenOrganizationId ? 'com_inst_bdren_saved' : 'com_inst_bdren_cleared'),
      );
      queryClient.invalidateQueries({ queryKey: ['platformInstitution', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platformInstitutions'] });
      setOpen(false);
    },
  });

  const openEditor = () => {
    mutation.reset();
    setValue(organizationId ?? '');
    setOpen(true);
  };

  return (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{organizationId ?? localize('com_inst_detail_bdren_org_none')}</span>
        <button
          type="button"
          onClick={openEditor}
          className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-(--cui-color-text-link)"
        >
          {localize('com_inst_bdren_edit')}
        </button>
      </span>
      <FormDialog
        open={open}
        title={localize('com_inst_bdren_title')}
        submitLabel={localize('com_inst_bdren_save')}
        saving={mutation.isPending}
        error={mutation.error?.message}
        onSubmit={() => mutation.mutate(value.trim() || null)}
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="bdren-organization-id"
            className="text-sm font-medium text-(--cui-color-text-default)"
          >
            {localize('com_inst_bdren_label')}
          </label>
          <input
            id="bdren-organization-id"
            type="text"
            value={value}
            maxLength={100}
            onChange={(event) => setValue(event.target.value)}
            className="rounded-lg border border-(--cui-color-stroke-default) bg-(--cui-color-background-default) px-3 py-2 text-sm text-(--cui-color-text-default)"
          />
          <p className="m-0 text-xs text-(--cui-color-text-muted)">
            {localize('com_inst_bdren_help')}
          </p>
        </div>
      </FormDialog>
    </>
  );
}
