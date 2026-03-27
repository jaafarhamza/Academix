export const siteConfig = {
  name: "Academix",
  description:
    "Academic center management platform for scheduling, finance, and operations.",
  publicNavLinks: [
    { href: "/", label: "Home" },
    { href: "/center/register", label: "Register Center" },
    { href: "/center/login", label: "Center Login" },
    { href: "/super-admin/login", label: "Super Admin" },
  ],
  footerLinkGroups: [
    {
      title: "Authentication",
      links: [
        { href: "/center/register", label: "Create Center Account" },
        { href: "/center/login", label: "Center Sign In" },
        { href: "/super-admin/login", label: "Super Admin Sign In" },
      ],
    },
    {
      title: "Workspace",
      links: [
        { href: "/center", label: "Center Dashboard" },
        { href: "/super-admin", label: "Super Admin Dashboard" },
      ],
    },
  ],
} as const;
