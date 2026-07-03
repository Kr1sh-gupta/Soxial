import soxialLogo from "src/assets/logo.png";

type AppLogoProps = {
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
  iconClassName?: string;
};

export function AppLogo({
  className = "",
  showLabel = true,
  labelClassName = "",
  iconClassName = "",
}: AppLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src={soxialLogo}
        alt="Soxial"
        className={`shrink-0 rounded-2xl object-contain ${iconClassName}`.trim()}
        draggable={false}
      />
      {showLabel && (
        <div className="min-w-0">
          <div className={`text-sm font-semibold tracking-tight text-foreground ${labelClassName}`.trim()}>
            Soxial
          </div>
          <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground/45">
            Social AI studio
          </div>
        </div>
      )}
    </div>
  );
}
