export type AdminNavigationItem = {
  href: string;
  label: string;
  subtitle?: string;
  icon: string;
};

export function getAdminDropdownLinks(isAdmin: boolean): AdminNavigationItem[] {
  if (!isAdmin) return [];
  return [
    {
      href: "/admin",
      label: "Painel do Criador",
      icon: "crown",
    },
    {
      href: "/admin/sala-de-maquinas",
      label: "Sala de Máquinas",
      subtitle: "Observabilidade do Runtime Cognitivo",
      icon: "precision_manufacturing",
    },
    {
      href: "/admin/observatorio-do-criador",
      label: "Observatório do Criador",
      subtitle: "Diagnóstico sanitário do sistema",
      icon: "health_and_safety",
    },
    {
      href: "/developer/messages",
      label: "Mensagens ao desenvolvedor",
      icon: "mark_email_unread",
    },
  ];
}

export function getAdminDashboardCards(isAdmin: boolean): AdminNavigationItem[] {
  if (!isAdmin) return [];
  return [
    {
      href: "/admin/sala-de-maquinas",
      label: "Sala de Máquinas",
      subtitle: "Observabilidade do Runtime Cognitivo",
      icon: "precision_manufacturing",
    },
    {
      href: "/admin/observatorio-do-criador",
      label: "Observatório do Criador",
      subtitle: "Diagnóstico sanitário do sistema",
      icon: "health_and_safety",
    },
  ];
}
