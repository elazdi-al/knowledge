export function IdeaBreak() {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className="my-10 flex w-full items-center justify-center gap-1"
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-0.5 w-4 rounded-full bg-gray-400" />
      ))}
    </div>
  );
}
