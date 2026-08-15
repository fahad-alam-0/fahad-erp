export interface StoreBranch {
  id: string;
  name: string;
  code: string;
  isMainBranch: boolean;
}

export const tenantConfig = {
  isMultiStoreEnabled: false,
  defaultStoreId: 'store_main_01',
  branches: [
    {
      id: 'store_main_01',
      name: 'Fahad Electronics - Main Branch',
      code: 'FEM01',
      isMainBranch: true,
    },
    {
      id: 'store_branch_02',
      name: 'Fahad Electronics - Westside Branch',
      code: 'FEW02',
      isMainBranch: false,
    },
  ] as StoreBranch[],
};
