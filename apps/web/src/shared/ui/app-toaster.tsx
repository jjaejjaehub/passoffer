'use client';

import {
  Spinner,
  Stack,
  Toaster,
  ToastActionTrigger,
  ToastCloseTrigger,
  ToastDescription,
  ToastIndicator,
  ToastRoot,
  ToastTitle,
  createToaster,
} from '@chakra-ui/react';

export const appToaster = createToaster({
  placement: 'top-end',
  pauseOnPageIdle: true,
});

export function AppToasterHost(): React.JSX.Element {
  return (
    <Toaster toaster={appToaster}>
      {(toast) => (
        <ToastRoot key={toast.id} width={{ base: 'xs', md: 'sm' }}>
          {toast.type === 'loading' ? (
            <Spinner size="sm" color="blue.solid" />
          ) : (
            <ToastIndicator />
          )}
          <Stack gap="1" flex="1" maxW="100%">
            {toast.title ? <ToastTitle>{toast.title}</ToastTitle> : null}
            {toast.description ? (
              <ToastDescription>{toast.description}</ToastDescription>
            ) : null}
          </Stack>
          {toast.action ? (
            <ToastActionTrigger>{toast.action.label}</ToastActionTrigger>
          ) : null}
          {toast.meta?.closable !== false ? <ToastCloseTrigger /> : null}
        </ToastRoot>
      )}
    </Toaster>
  );
}
