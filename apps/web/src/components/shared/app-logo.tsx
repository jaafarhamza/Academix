import { siteConfig } from "@/lib/constants/site";

type AppLogoProps = {
  className?: string;
};

export function AppLogo({ className }: AppLogoProps) {
  return (
    <span
      className={className}
      aria-label={siteConfig.name}
    >
      {siteConfig.name}
    </span>
  );
}
