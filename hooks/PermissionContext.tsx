// hooks/PermissionContext.tsx
import { createContext, useContext } from 'react';

export type PermissionContextType = {
  canAccess: (module: string) => boolean;
  hasPermission: (perm: string) => boolean;
  isSuperuser: boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
};

export const PermissionContext = createContext<PermissionContextType>({
  canAccess: () => false,
  hasPermission: () => false,
  isSuperuser: false,
  loading: true,
  refreshPermissions: async () => {},
});

export function usePermissionContext() {
  return useContext(PermissionContext);
}