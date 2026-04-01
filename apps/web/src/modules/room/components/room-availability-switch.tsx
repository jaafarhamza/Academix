"use client";

type RoomAvailabilitySwitchProps = {
  checked: boolean;
  disabled?: boolean;
  roomName: string;
  onCheckedChange: (checked: boolean) => void;
};

export function RoomAvailabilitySwitch({
  checked,
  disabled = false,
  roomName,
  onCheckedChange,
}: RoomAvailabilitySwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`Set availability for ${roomName}`}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          return;
        }
        onCheckedChange(!checked);
      }}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors",
        checked
          ? "border-emerald-500/40 bg-emerald-500/30"
          : "border-rose-500/40 bg-rose-500/30",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute left-0.5 size-4 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
      <span className="sr-only">{checked ? "Available" : "Unavailable"}</span>
    </button>
  );
}
