let _latestPermissions: { module: string, action: string }[] = []

export function updateLatestPermissions(perms: { module: string, action: string }[]) {
  _latestPermissions = perms
}

const PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: {
    pos: ['sell'],
    products: ['view', 'create', 'edit'],
    clients: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    sales: ['view', 'edit'],
    purchases: ['view', 'create', 'receive'],
    dashboard: ['view'],
    cashRegister: ['open', 'close', 'movements'],
    users: ['view', 'create', 'edit', 'delete'],
    vehicles: ['view', 'create', 'edit', 'delete'],
    credit: ['view', 'pay'],
    exports: ['view'],
    taxes: ['create', 'edit', 'view'],
    currencies: ['create', 'edit', 'view'],
    permissions: ['edit'],
    returns: ['view', 'edit'],
    loyalty: ['view', 'edit', 'redeem'],
    storeConfig: ['view', 'edit'],
    expenses: ['view', 'edit'],
  },
  supervisor: {
    pos: ['sell'],
    products: ['view', 'create', 'edit'],
    clients: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    sales: ['view', 'edit'],
    purchases: ['view', 'create', 'receive'],
    dashboard: ['view'],
    cashRegister: ['open', 'close', 'movements'],
    users: [],
    vehicles: ['view', 'create', 'edit', 'delete'],
    credit: ['view', 'pay'],
    exports: ['view'],
    taxes: ['view'],
    currencies: ['view'],
    permissions: [],
    returns: ['view', 'edit'],
    loyalty: ['view', 'redeem'],
    storeConfig: [],
    expenses: ['view'],
  },
  cashier: {
    pos: ['sell'],
    products: ['view'],
    clients: ['view'],
    suppliers: [],
    sales: ['view'],
    purchases: [],
    dashboard: [],
    cashRegister: [],
    users: [],
    vehicles: [],
    credit: [],
    exports: [],
    taxes: [],
    currencies: [],
    permissions: [],
    returns: [],
    loyalty: ['redeem'],
  },
  seller: {
    pos: ['sell'],
    products: ['view'],
    clients: ['view', 'create', 'edit'],
    suppliers: [],
    sales: ['view'],
    purchases: [],
    dashboard: [],
    cashRegister: [],
    users: [],
    vehicles: [],
    credit: ['view'],
    exports: [],
    taxes: [],
    currencies: [],
    returns: [],
    loyalty: ['view', 'redeem'],
    storeConfig: [],
  },
}

export function can(role: string | undefined, module: string, action: string): boolean {
  if (_latestPermissions.length > 0) {
    return _latestPermissions.some(p => p.module === module && p.action === action)
  }
  const r = role || 'cashier'
  const perms = PERMISSIONS[r]
  if (!perms) return false
  const actions = perms[module]
  if (!actions) return false
  return actions.includes(action)
}

export function usePermissions(userRole: string | undefined) {
  return {
    can: (module: string, action: string) => can(userRole, module, action),
    isAdmin: userRole === 'admin',
    isSupervisor: userRole === 'supervisor',
    isCashier: userRole === 'cashier',
    isSeller: userRole === 'seller',
  }
}